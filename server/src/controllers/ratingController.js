import mongoose from "mongoose";

import Rating from "../models/Rating.js";

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

    const stats = await Rating.aggregate([
      { $match: { movie: movieId } },
      {
        $group: {
          _id: "$movie",
          averageRating: { $avg: "$score" },
          totalRatings: { $sum: 1 },
        },
      },
    ]);
    const averageRating = stats[0]?.averageRating || 0;
    const totalRatings = stats[0]?.totalRatings || 0;

    return res.json({
      success: true,
      movieId,
      averageRating,
      totalRatings,
      yourRating: score,
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
    const stats = await Rating.aggregate([
      { $match: { movie: movieId } },
      {
        $group: {
          _id: "$movie",
          averageRating: { $avg: "$score" },
          totalRatings: { $sum: 1 },
        },
      },
    ]);
    const averageRating = stats[0]?.averageRating || 0;
    const totalRatings = stats[0]?.totalRatings || 0;

    let yourRating = null;
    if (req.user?.id) {
      const userRating = await Rating.findOne({ user: req.user.id, movie: movieId }).select("score");
      yourRating = userRating?.score ?? null;
    }

    return res.json({ movieId, averageRating, totalRatings, yourRating });
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

    movieId = String(movieId).replace(/^tmdb[-_]/, "");
    movieId = `tmdb_${movieId}`;

    await Rating.findOneAndDelete({ user: req.user.id, movie: movieId });

    const stats = await Rating.aggregate([
      { $match: { movie: movieId } },
      {
        $group: {
          _id: "$movie",
          averageRating: { $avg: "$score" },
          totalRatings: { $sum: 1 },
        },
      },
    ]);
    const averageRating = stats[0]?.averageRating || 0;
    const totalRatings = stats[0]?.totalRatings || 0;

    return res.json({
      success: true,
      movieId,
      averageRating,
      totalRatings,
      yourRating: null,
      message: "Rating removed successfully",
    });
  } catch (err) {
    return res.status(500).json({ message: "Failed to remove rating", detail: err.message });
  }
}
