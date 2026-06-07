import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { CacheService } from '../services/cacheService';

const prisma = new PrismaClient();

export const getTrending = async (_req: Request, res: Response) => {
  try {
    const movies = await CacheService.getTrendingMovies(async () => {
      console.log('Cache Miss: Fetching trending movies from PostgreSQL...');
      return await prisma.movie.findMany({
        orderBy: { trendingScore: 'desc' },
        take: 20,
      });
    });

    return res.json(movies);
  } catch (error: any) {
    console.error('Error fetching trending movies:', error);
    return res.status(500).json({ message: 'Error retrieving trending movies', error: error.message });
  }
};

export const getPopular = async (_req: Request, res: Response) => {
  try {
    const movies = await CacheService.getPopularMovies(async () => {
      console.log('Cache Miss: Fetching popular movies from PostgreSQL...');
      return await prisma.movie.findMany({
        orderBy: { popularityScore: 'desc' },
        take: 20,
      });
    });

    return res.json(movies);
  } catch (error: any) {
    console.error('Error fetching popular movies:', error);
    return res.status(500).json({ message: 'Error retrieving popular movies', error: error.message });
  }
};

export const getMovieById = async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const movie = await CacheService.getOrSet(`catalog:movie:${id}`, 3600, async () => {
      console.log(`Cache Miss: Fetching movie ${id} from PostgreSQL...`);
      return await prisma.movie.findUnique({
        where: { id },
      });
    });

    if (!movie) {
      return res.status(404).json({ message: 'Movie not found' });
    }

    return res.json(movie);
  } catch (error: any) {
    console.error(`Error fetching movie ${id}:`, error);
    return res.status(500).json({ message: 'Error retrieving movie details', error: error.message });
  }
};

export const createMovie = async (req: Request, res: Response) => {
  const { title, year, genres, tags, poster, trailer, cast, trendingScore, popularityScore, streamUrl } = req.body;

  if (!title || !year) {
    return res.status(400).json({ message: 'Title and year are required' });
  }

  try {
    const newMovie = await prisma.movie.create({
      data: {
        title,
        year: parseInt(year),
        genres: genres || [],
        tags: tags || [],
        poster,
        trailer,
        cast: cast || [],
        trendingScore: parseFloat(trendingScore || 0),
        popularityScore: parseFloat(popularityScore || 0),
        streamUrl,
      },
    });

    // Invalidate cached lists so next requests get the fresh collection
    await CacheService.invalidateCatalogCache();

    return res.status(212).json({
      message: 'Movie created successfully',
      movie: newMovie,
    });
  } catch (error: any) {
    console.error('Error creating movie:', error);
    return res.status(500).json({ message: 'Error creating movie entry', error: error.message });
  }
};
