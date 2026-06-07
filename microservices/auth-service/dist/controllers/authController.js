"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logout = exports.refresh = exports.login = exports.register = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const uuid_1 = require("uuid"); // We will add uuid to dependencies
const redis_1 = __importDefault(require("../config/redis"));
const db_1 = __importDefault(require("../config/db"));
const ACCESS_TOKEN_SECRET = process.env.JWT_ACCESS_SECRET || 'access_secret_123_change_in_prod';
const REFRESH_TOKEN_SECRET = process.env.JWT_REFRESH_SECRET || 'refresh_secret_123_change_in_prod';
// Helper to generate access token
const generateAccessToken = (userId, role) => {
    return jsonwebtoken_1.default.sign({ userId, role }, ACCESS_TOKEN_SECRET, { expiresIn: '15m' });
};
// Helper to generate refresh token and register in Redis
const generateRefreshToken = async (userId) => {
    const tokenId = (0, uuid_1.v4)();
    const refreshToken = jsonwebtoken_1.default.sign({ userId, tokenId }, REFRESH_TOKEN_SECRET, { expiresIn: '7d' });
    // Store active refresh token in Redis (expires in 7 days to match token expiry)
    // Format: active_refresh_token:userId => tokenId
    // This enables simple active session mapping and revocation
    await redis_1.default.setEx(`active_refresh_token:${userId}:${tokenId}`, 7 * 24 * 60 * 60, 'active');
    return refreshToken;
};
const register = async (req, res) => {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
        return res.status(400).json({ message: 'Missing required fields' });
    }
    try {
        // Check if user already exists
        const userExistsResult = await db_1.default.query('SELECT id FROM users WHERE email = $1', [email]);
        if (userExistsResult.rows.length > 0) {
            return res.status(409).json({ message: 'User already registered' });
        }
        const salt = await bcryptjs_1.default.genSalt(10);
        const passwordHash = await bcryptjs_1.default.hash(password, salt);
        // Save user to PostgreSQL
        const insertResult = await db_1.default.query('INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, $4) RETURNING id, name, email, role', [name, email, passwordHash, 'user']);
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
    }
    catch (error) {
        console.error('Registration error:', error);
        return res.status(500).json({ message: 'Internal server error', detail: error.message });
    }
};
exports.register = register;
const login = async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ message: 'Email and password required' });
    }
    try {
        const userResult = await db_1.default.query('SELECT * FROM users WHERE email = $1', [email]);
        if (userResult.rows.length === 0) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }
        const user = userResult.rows[0];
        const isMatch = await bcryptjs_1.default.compare(password, user.password_hash);
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
    }
    catch (error) {
        console.error('Login error:', error);
        return res.status(500).json({ message: 'Internal server error', detail: error.message });
    }
};
exports.login = login;
const refresh = async (req, res) => {
    const cookieToken = req.cookies?.refreshToken;
    if (!cookieToken) {
        return res.status(401).json({ message: 'Refresh token required' });
    }
    try {
        // Decode the token (ignoring expiration for breach detection verification)
        const decoded = jsonwebtoken_1.default.decode(cookieToken);
        if (!decoded || !decoded.userId || !decoded.tokenId) {
            return res.status(401).json({ message: 'Invalid refresh token' });
        }
        const { userId, tokenId } = decoded;
        // Verify token signature & expiration
        try {
            jsonwebtoken_1.default.verify(cookieToken, REFRESH_TOKEN_SECRET);
        }
        catch (err) {
            // Signature expired or corrupted. Check if it's already deleted in Redis (which signifies reuse attempt or expired)
            const tokenStatus = await redis_1.default.get(`active_refresh_token:${userId}:${tokenId}`);
            if (!tokenStatus) {
                // Potential Token Reuse/Theft: someone tried to use an expired or already rotated token!
                // Revoke ALL active sessions for this user as a security safeguard.
                const keys = await redis_1.default.keys(`active_refresh_token:${userId}:*`);
                if (keys.length > 0) {
                    await redis_1.default.del(keys);
                }
                res.clearCookie('refreshToken');
                return res.status(403).json({ message: 'Security Breach Detected: Session Revoked.' });
            }
            return res.status(401).json({ message: 'Session expired. Please log in again.' });
        }
        // Check if the token is active in Redis
        const tokenExists = await redis_1.default.get(`active_refresh_token:${userId}:${tokenId}`);
        if (!tokenExists) {
            // Refresh token is valid cryptographically, but NOT active in Redis.
            // This is a clear case of Token Reuse (Replay attack).
            const keys = await redis_1.default.keys(`active_refresh_token:${userId}:*`);
            if (keys.length > 0) {
                await redis_1.default.del(keys);
            }
            res.clearCookie('refreshToken');
            return res.status(403).json({ message: 'Security Breach Detected: Reused Token Revoked.' });
        }
        // Invalidate the old refresh token in Redis (delete it to enforce rotation)
        await redis_1.default.del(`active_refresh_token:${userId}:${tokenId}`);
        // Fetch user details for role mapping
        const userResult = await db_1.default.query('SELECT role FROM users WHERE id = $1', [userId]);
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
    }
    catch (error) {
        console.error('Refresh token error:', error);
        return res.status(500).json({ message: 'Internal server error', detail: error.message });
    }
};
exports.refresh = refresh;
const logout = async (req, res) => {
    const cookieToken = req.cookies?.refreshToken;
    if (!cookieToken) {
        res.clearCookie('refreshToken');
        return res.status(200).json({ message: 'Logged out successfully' });
    }
    try {
        const decoded = jsonwebtoken_1.default.decode(cookieToken);
        if (decoded && decoded.userId && decoded.tokenId) {
            // Revoke the token from Redis
            await redis_1.default.del(`active_refresh_token:${decoded.userId}:${decoded.tokenId}`);
        }
    }
    catch (err) {
        console.error('Error invalidating token during logout:', err);
    }
    res.clearCookie('refreshToken');
    return res.status(200).json({ message: 'Logged out successfully' });
};
exports.logout = logout;
//# sourceMappingURL=authController.js.map