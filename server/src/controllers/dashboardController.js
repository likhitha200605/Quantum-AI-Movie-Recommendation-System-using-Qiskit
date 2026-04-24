import Rating from "../models/Rating.js";
import UserBehavior from "../models/UserBehavior.js";
import { getTmdbMovie } from "../utils/tmdb.js";

function buildDefaultDashboard() {
  return {
    watchTime: 0,
    moviesWatched: 0,
    favoriteGenres: "N/A",
    avgRating: 0,
    personalizationScore: 0,
    genreDistribution: {},
  };
}

async function computeDashboardForUser(userId) {
  const [behavior, ratingDocs] = await Promise.all([
    UserBehavior.findOne({ userId }).lean(),
    Rating.find({ user: userId }).select("score").lean(),
  ]);

  if (!behavior) return buildDefaultDashboard();

  const watchlist = Array.isArray(behavior.watchlist) ? behavior.watchlist : [];
  const trailerClicks = Array.isArray(behavior.trailerClicks) ? behavior.trailerClicks : [];
  const moviesWatched = watchlist.length + trailerClicks.length;
  const watchTime = trailerClicks.length * 2;

  const watchedIds = [...new Set([...watchlist, ...trailerClicks].map((id) => String(id)))];
  
  // Use TMDB API instead of local DB
  const watchedMovies = watchedIds.length
    ? (await Promise.all(watchedIds.map(id => getTmdbMovie(id)))).filter(Boolean)
    : [];

  const genreMap = {};
  for (const movie of watchedMovies) {
    for (const genre of movie.genres || []) {
      genreMap[genre] = (genreMap[genre] || 0) + 1;
    }
  }

  const favoriteGenreEntry = Object.entries(genreMap).sort((a, b) => b[1] - a[1])[0];
  const favoriteGenres = favoriteGenreEntry?.[0] || "N/A";

  const ratings = ratingDocs.map((item) => Number(item.score || 0)).filter((score) => score > 0);
  const avgRating = ratings.length
    ? ratings.reduce((acc, score) => acc + score, 0) / ratings.length
    : 0;

  return {
    watchTime,
    moviesWatched,
    favoriteGenres,
    avgRating,
    personalizationScore: Math.min(100, moviesWatched * 10),
    genreDistribution: genreMap,
  };
}

export async function dashboard(req, res) {
  try {
    const data = await computeDashboardForUser(req.user.id);
    return res.json(data);
  } catch (err) {
    return res.status(500).json({ message: "Failed to load dashboard", detail: err.message });
  }
}

export async function userDashboard(req, res) {
  try {
    const { userId } = req.params;
    if (!userId) return res.status(400).json({ message: "userId is required" });
    if (String(req.user.id) !== String(userId)) {
      return res.status(403).json({ message: "Forbidden to access another user's dashboard" });
    }

    const data = await computeDashboardForUser(userId);
    return res.json(data);
  } catch (err) {
    return res.status(500).json({ message: "Failed to load user dashboard", detail: err.message });
  }
}
