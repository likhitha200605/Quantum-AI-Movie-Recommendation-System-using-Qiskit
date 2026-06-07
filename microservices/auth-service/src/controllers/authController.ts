import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid'; // We will add uuid to dependencies
import redisClient from '../config/redis';
import pool from '../config/db';

const ACCESS_TOKEN_SECRET = process.env.JWT_ACCESS_SECRET || 'access_secret_123_change_in_prod';
const REFRESH_TOKEN_SECRET = process.env.JWT_REFRESH_SECRET || 'refresh_secret_123_change_in_prod';

// Helper to generate access token
const generateAccessToken = (userId: string, role: string): string => {
  return jwt.sign({ userId, role }, ACCESS_TOKEN_SECRET, { expiresIn: '15m' });
};

// Helper to generate refresh token and register in Redis
const generateRefreshToken = async (userId: string): Promise<string> => {
  const tokenId = uuidv4();
  const refreshToken = jwt.sign({ userId, tokenId }, REFRESH_TOKEN_SECRET, { expiresIn: '7d' });

  // Store active refresh token in Redis (expires in 7 days to match token expiry)
  // Format: active_refresh_token:userId => tokenId
  // This enables simple active session mapping and revocation
  await redisClient.setEx(`active_refresh_token:${userId}:${tokenId}`, 7 * 24 * 60 * 60, 'active');

  return refreshToken;
};

export const register = async (req: Request, res: Response) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ message: 'Missing required fields' });
  }

  try {
    // Check if user already exists
    const userExistsResult = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (userExistsResult.rows.length > 0) {
      return res.status(409).json({ message: 'User already registered' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Save user to PostgreSQL
    const insertResult = await pool.query(
      'INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, $4) RETURNING id, name, email, role',
      [name, email, passwordHash, 'user']
    );

    const newUser = insertResult.rows[0];
    const accessToken = generateAccessToken(newUser.id, newUser.role);
    const refreshToken = await generateRefreshToken(newUser.id);

    // Set Refresh Token in secure HTTP-only Cookie
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    return res.status(211).json({
      message: 'Registration successful',
      accessToken,
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role
      }
    });
  } catch (error: any) {
    console.error('Registration error:', error);
    return res.status(500).json({ message: 'Internal server error', detail: error.message });
  }
};

export const login = async (req: Request, res: Response) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password required' });
  }

  try {
    const userResult = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (userResult.rows.length === 0) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const user = userResult.rows[0];
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const accessToken = generateAccessToken(user.id, user.role);
    const refreshToken = await generateRefreshToken(user.id);

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    return res.json({
      message: 'Login successful',
      accessToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error: any) {
    console.error('Login error:', error);
    return res.status(500).json({ message: 'Internal server error', detail: error.message });
  }
};

export const refresh = async (req: Request, res: Response) => {
  const cookieToken = req.cookies?.refreshToken;

  if (!cookieToken) {
    return res.status(401).json({ message: 'Refresh token required' });
  }

  try {
    // Decode the token (ignoring expiration for breach detection verification)
    const decoded = jwt.decode(cookieToken) as { userId: string; tokenId: string } | null;

    if (!decoded || !decoded.userId || !decoded.tokenId) {
      return res.status(401).json({ message: 'Invalid refresh token' });
    }

    const { userId, tokenId } = decoded;

    // Verify token signature & expiration
    try {
      jwt.verify(cookieToken, REFRESH_TOKEN_SECRET);
    } catch (err: any) {
      // Signature expired or corrupted. Check if it's already deleted in Redis (which signifies reuse attempt or expired)
      const tokenStatus = await redisClient.get(`active_refresh_token:${userId}:${tokenId}`);
      if (!tokenStatus) {
        // Potential Token Reuse/Theft: someone tried to use an expired or already rotated token!
        // Revoke ALL active sessions for this user as a security safeguard.
        const keys = await redisClient.keys(`active_refresh_token:${userId}:*`);
        if (keys.length > 0) {
          await redisClient.del(keys);
        }
        res.clearCookie('refreshToken');
        return res.status(403).json({ message: 'Security Breach Detected: Session Revoked.' });
      }
      return res.status(401).json({ message: 'Session expired. Please log in again.' });
    }

    // Check if the token is active in Redis
    const tokenExists = await redisClient.get(`active_refresh_token:${userId}:${tokenId}`);
    if (!tokenExists) {
      // Refresh token is valid cryptographically, but NOT active in Redis.
      // This is a clear case of Token Reuse (Replay attack).
      const keys = await redisClient.keys(`active_refresh_token:${userId}:*`);
      if (keys.length > 0) {
        await redisClient.del(keys);
      }
      res.clearCookie('refreshToken');
      return res.status(403).json({ message: 'Security Breach Detected: Reused Token Revoked.' });
    }

    // Invalidate the old refresh token in Redis (delete it to enforce rotation)
    await redisClient.del(`active_refresh_token:${userId}:${tokenId}`);

    // Fetch user details for role mapping
    const userResult = await pool.query('SELECT role FROM users WHERE id = $1', [userId]);
    if (userResult.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }
    const role = userResult.rows[0].role;

    // Generate new Access and Refresh tokens (Rotation)
    const newAccessToken = generateAccessToken(userId, role);
    const newRefreshToken = await generateRefreshToken(userId);

    // Update the refresh cookie
    res.cookie('refreshToken', newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    return res.json({
      accessToken: newAccessToken
    });
  } catch (error: any) {
    console.error('Refresh token error:', error);
    return res.status(500).json({ message: 'Internal server error', detail: error.message });
  }
};

export const logout = async (req: Request, res: Response) => {
  const cookieToken = req.cookies?.refreshToken;

  if (!cookieToken) {
    res.clearCookie('refreshToken');
    return res.status(200).json({ message: 'Logged out successfully' });
  }

  try {
    const decoded = jwt.decode(cookieToken) as { userId: string; tokenId: string } | null;
    if (decoded && decoded.userId && decoded.tokenId) {
      // Revoke the token from Redis
      await redisClient.del(`active_refresh_token:${decoded.userId}:${decoded.tokenId}`);
    }
  } catch (err) {
    console.error('Error invalidating token during logout:', err);
  }

  res.clearCookie('refreshToken');
  return res.status(200).json({ message: 'Logged out successfully' });
};
