import Rating from "../models/Rating.js";
import WatchHistory from "../models/WatchHistory.js";
import Movie from "../models/Movie.js";
import User from "../models/User.js";

export async function dashboard(req, res) {
  try {
    const [history, ratings, user] = await Promise.all([
      WatchHistory.find({ user: req.user.id }).populate("movie"),
      Rating.find({ user: req.user.id }).populate("movie"),
      User.findById(req.user.id),
    ]);

    const watchTime = history.reduce((acc, h) => acc + h.minutesWatched, 0);
    const genreMap = {};
    for (const h of history) {
      for (const g of h.movie?.genres || []) genreMap[g] = (genreMap[g] || 0) + h.minutesWatched;
    }

    const favoriteGenres = Object.entries(genreMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([genre]) => genre);

    const recent = await Movie.find().sort({ trendingScore: -1 }).limit(8);
    return res.json({
      watchTimeMinutes: watchTime,
      moviesWatched: history.length,
      favoriteGenres,
      genreDistribution: genreMap,
      avgRatingGiven: ratings.reduce((a, r) => a + r.score, 0) / Math.max(ratings.length, 1),
      personalizationScore: user?.personalizationScore ?? 0.5,
      aiInsights: [
        "You prefer cerebral Sci-Fi and high tension Drama.",
        "Your recommendation confidence increases with low-noise quantum settings.",
      ],
      trending: recent,
    });
  } catch (err) {
    return res.status(500).json({ message: "Failed to load dashboard", detail: err.message });
  }
}
