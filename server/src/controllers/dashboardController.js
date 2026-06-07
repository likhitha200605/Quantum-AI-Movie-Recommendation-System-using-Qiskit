import Rating from "../models/Rating.js";
import Watchlist from "../models/Watchlist.js";
import { getTmdbMovie } from "../utils/tmdb.js";

function buildDefaultDashboard() {
  return {
    watchTime: 0,
    moviesWatched: 0,
    favoriteGenres: "N/A",
    avgRating: 0,
    personalizationScore: 0,
    genreDistribution: [],
  };
}

async function computeDashboardForUser(userId) {
  const [ratingDocs, watchlistDoc] = await Promise.all([
    Rating.find({ user: userId }).select("movie score").lean(),
    Watchlist.findOne({ user: userId }).lean(),
  ]);

  const ratedMovieIds = ratingDocs.map((r) => r.movie);
  const watchlistMovieIds = watchlistDoc?.movies || [];
  
  const watchedIds = [...new Set([...ratedMovieIds, ...watchlistMovieIds].map(String))];

  if (watchedIds.length === 0) {
    return buildDefaultDashboard();
  }

  // Use TMDB API instead of local DB
  const watchedMovies = (await Promise.all(watchedIds.map(id => getTmdbMovie(id)))).filter(Boolean);

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

  const genreDistributionArray = Object.entries(genreMap).map(([name, value]) => ({
    name,
    value,
  }));

  return {
    watchTime: watchedIds.length * 2,
    moviesWatched: watchedIds.length,
    favoriteGenres,
    avgRating,
    personalizationScore: Math.min(100, watchedIds.length * 10),
    genreDistribution: genreDistributionArray,
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
