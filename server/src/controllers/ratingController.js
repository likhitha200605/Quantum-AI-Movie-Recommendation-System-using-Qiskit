import mongoose from "mongoose";

import Rating from "../models/Rating.js";
import { getTmdbMovie } from "../utils/tmdb.js";

async function getMergedRatingStats(movieId) {
  const ratings = await Rating.find({ movie: movieId });
  const totalRatings = ratings.length;
  const dbAverageRating = totalRatings > 0 
    ? ratings.reduce((sum, r) => sum + r.score, 0) / totalRatings 
    : 0;

  const tmdbMovie = await getTmdbMovie(movieId);
  const tmdbRating = tmdbMovie ? tmdbMovie.ratingAvg : 0;

  let finalRating = tmdbRating;
  if (totalRatings > 0) {
    finalRating = (tmdbRating + dbAverageRating) / 2;
  }

  return { averageRating: finalRating, totalRatings, dbAverageRating };
}

export async function upsertRating(req, res) {
  try {
    let { movieId, rating } = req.body;
    const score = Number(rating);

    if (!movieId || score < 1 || score > 5) {
      return res.status(400).json({ message: "movieId and rating (1-5) are required" });
    }

    movieId = String(movieId).replace(/^tmdb[-_]/, "");
    movieId = `tmdb_${movieId}`;

    await Rating.findOneAndUpdate(
      { user: req.user.id, movie: movieId },
      { score },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    const stats = await getMergedRatingStats(movieId);

    return res.json({
      success: true,
      movieId,
      averageRating: stats.averageRating,
      totalRatings: stats.totalRatings,
      yourRating: score,
      userRating: score, // Added to match requirements explicitly
    });
  } catch (err) {
    return res.status(500).json({ message: "Failed to save rating", detail: err.message });
  }
}

export async function getUserRatings(req, res) {
  try {
    const ratings = await Rating.find({ user: req.user.id })
      .select("movie score updatedAt")
      .lean();

    const mapped = ratings.reduce((acc, item) => {
      acc[String(item.movie)] = item.score;
      return acc;
    }, {});

    return res.json({ ratings: mapped });
  } catch (err) {
    return res.status(500).json({ message: "Failed to fetch user ratings", detail: err.message });
  }
}

export async function getMovieRatings(req, res) {
  try {
    const { movieId } = req.params;
    const stats = await getMergedRatingStats(movieId);

    let yourRating = null;
    if (req.user?.id) {
      const userRating = await Rating.findOne({ user: req.user.id, movie: movieId }).select("score");
      yourRating = userRating?.score ?? null;
    }

    return res.json({ 
      movieId, 
      averageRating: stats.averageRating, 
      totalRatings: stats.totalRatings, 
      yourRating,
      userRating: yourRating
    });
  } catch (err) {
    return res.status(500).json({ message: "Failed to fetch movie ratings", detail: err.message });
  }
}

export async function removeRating(req, res) {
  try {
    let { movieId } = req.params;
    if (!movieId) {
      return res.status(400).json({ message: "movieId is required" });
    }

    const rawId = String(movieId).replace(/^tmdb[-_]/, "");
    const idUnderscore = `tmdb_${rawId}`;
    const idDash = `tmdb-${rawId}`;

    await Rating.findOneAndDelete({ 
      user: req.user.id, 
      movie: { $in: [idUnderscore, idDash, rawId] } 
    });

    const stats = await getMergedRatingStats(idUnderscore);

    return res.json({
      success: true,
      movieId: idUnderscore,
      averageRating: stats.averageRating,
      totalRatings: stats.totalRatings,
      yourRating: null,
      userRating: null,
      message: "Rating removed successfully",
    });
  } catch (err) {
    return res.status(500).json({ message: "Failed to remove rating", detail: err.message });
  }
}
