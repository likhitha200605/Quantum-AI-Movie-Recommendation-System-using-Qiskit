import Movie from "../models/Movie.js";
import Rating from "../models/Rating.js";
import Watchlist from "../models/Watchlist.js";
import { cache } from "../utils/cache.js";
import axios from "axios";

function escapeRegex(value = "") {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const KNOWN_GENRES = [
  "action",
  "adventure",
  "animation",
  "comedy",
  "crime",
  "documentary",
  "drama",
  "family",
  "fantasy",
  "history",
  "horror",
  "music",
  "mystery",
  "romance",
  "romantic",
  "sci-fi",
  "science fiction",
  "thriller",
  "war",
  "western",
];

function normalizeGenre(value = "") {
  if (value === "romantic") return "romance";
  if (value === "science fiction") return "sci-fi";
  return value;
}

function parseSearchIntent(query = "") {
  const clean = String(query).toLowerCase().replace(/\s+/g, " ").trim();
  if (!clean) return { genres: [], keywords: [] };

  const tokens = clean
    .split(" ")
    .map((token) => token.trim())
    .filter(Boolean)
    .filter((token) => !["movie", "movies", "film", "show", "series"].includes(token));

  const genres = [];
  const keywords = [];
  for (const token of tokens) {
    const normalized = normalizeGenre(token);
    if (KNOWN_GENRES.includes(token) || KNOWN_GENRES.includes(normalized)) genres.push(normalized);
    else keywords.push(token);
  }

  return { genres: [...new Set(genres)], keywords: [...new Set(keywords)] };
}

async function fetchTmdbMovies(query) {
  const tmdbApiKey = process.env.TMDB_API_KEY;
  if (!tmdbApiKey) return [];

  const endpoint = query ? "search/movie" : "movie/popular";
  const params = query ? { api_key: tmdbApiKey, query } : { api_key: tmdbApiKey };
  const { data } = await axios.get(`https://api.themoviedb.org/3/${endpoint}`, { params });
  return (data?.results || []).map((item) => ({
    _id: `tmdb-${item.id}`,
    tmdbId: item.id,
    title: item.title,
    year: item.release_date ? Number(item.release_date.slice(0, 4)) : undefined,
    genres: [],
    posterUrl: item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : "",
    trailerUrl: "",
    description: item.overview || "",
    ratingAvg: Number(item.vote_average || 0) / 2,
    source: "tmdb",
  }));
}

export async function listMovies(req, res) {
  try {
    const { q = "", genre = "", year = "", minRating = 0 } = req.query;
    const cleanQuery = String(q).trim();
    const cleanGenre = String(genre).trim();
    const cleanYear = Number(year) || null;
    const minRatingNum = Number(minRating) || 0;

    const parsed = parseSearchIntent(cleanQuery);
    const intentGenres = parsed.genres;
    const keywords = parsed.keywords;

    const baseFilter = { ratingAvg: { $gte: minRatingNum } };
    const explicitGenreFilter = cleanGenre
      ? { genres: { $elemMatch: { $regex: `^${escapeRegex(cleanGenre)}$`, $options: "i" } } }
      : null;
    const intentGenreFilter = intentGenres.length
      ? { genres: { $in: intentGenres.map((g) => new RegExp(`^${escapeRegex(g)}$`, "i")) } }
      : null;
    const yearFilter = cleanYear ? { year: cleanYear } : null;

    const keywordOr = cleanQuery
      ? [
          { title: { $regex: escapeRegex(cleanQuery), $options: "i" } },
          { genres: { $elemMatch: { $regex: escapeRegex(cleanQuery), $options: "i" } } },
          { tags: { $elemMatch: { $regex: escapeRegex(cleanQuery), $options: "i" } } },
          ...keywords.flatMap((kw) => [
            { title: { $regex: escapeRegex(kw), $options: "i" } },
            { genres: { $elemMatch: { $regex: escapeRegex(kw), $options: "i" } } },
            { tags: { $elemMatch: { $regex: escapeRegex(kw), $options: "i" } } },
          ]),
        ]
      : [];
    const queryFilter = keywordOr.length ? { $or: keywordOr } : {};

    // 1) Strict match: apply exact requested filters (genre + year)
    const strictFilter = {
      ...baseFilter,
      ...queryFilter,
      ...(explicitGenreFilter || intentGenreFilter || {}),
      ...(yearFilter || {}),
    };
    let matchType = "strict";
    let movies = await Movie.find(strictFilter).sort({ trendingScore: -1, createdAt: -1 });

    // 2) Related DB results: if strict is empty, relax to "genre OR year" while keeping title/minRating.
    if (!movies.length && (explicitGenreFilter || intentGenreFilter || yearFilter)) {
      matchType = "related";
      const relatedFilter = {
        ...baseFilter,
        ...queryFilter,
        $or: [explicitGenreFilter, intentGenreFilter, yearFilter].filter(Boolean),
      };
      movies = await Movie.find(relatedFilter).sort({ trendingScore: -1, createdAt: -1 }).limit(24);
    }

    // Always attempt TMDB for dynamic catalog expansion when API key exists.
    let tmdbMovies = [];
    try {
      tmdbMovies = await fetchTmdbMovies(cleanQuery);
    } catch {
      tmdbMovies = [];
    }

    // Merge without duplicates by title+year so local curated items still appear first.
    const seen = new Set();
    const merged = [...movies, ...tmdbMovies].filter((item) => {
      const key = `${String(item.title || "").toLowerCase()}-${item.year || ""}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    if (merged.length > 0) {
      res.set("x-match-type", matchType);
      return res.json(merged);
    }

    // 3) Final fallback only when no genre/year was requested.
    if (!cleanGenre && !cleanYear && !cleanQuery) {
      const fallback = await Movie.find(baseFilter).sort({ trendingScore: -1, createdAt: -1 }).limit(24);
      res.set("x-match-type", "fallback");
      return res.json(fallback);
    }

    // With genre/year filters, return empty so frontend can show "no related movies".
    res.set("x-match-type", "none");
    return res.json([]);
  } catch (err) {
    return res.status(500).json({ message: "Failed to load movies", detail: err.message });
  }
}

export async function movieDetails(req, res) {
  try {
    const cacheKey = `movie:${req.params.id}`;
    if (cache.has(cacheKey)) return res.json(cache.get(cacheKey));
    const movie = await Movie.findById(req.params.id);
    if (!movie) return res.status(404).json({ message: "Movie not found" });
    cache.set(cacheKey, movie);
    return res.json(movie);
  } catch (err) {
    return res.status(500).json({ message: "Failed to load movie details", detail: err.message });
  }
}

export async function rateMovie(req, res) {
  try {
    const { movieId, score } = req.body;
    if (!movieId || Number(score) < 1 || Number(score) > 5) {
      return res.status(400).json({ message: "movieId and score (1-5) are required" });
    }

    await Rating.findOneAndUpdate(
      { user: req.user.id, movie: movieId },
      { score: Number(score) },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    const ratings = await Rating.find({ movie: movieId });
    const avg = ratings.reduce((acc, r) => acc + r.score, 0) / Math.max(ratings.length, 1);
    await Movie.findByIdAndUpdate(movieId, { ratingAvg: avg });
    return res.json({ message: "Rating saved", avg, totalRatings: ratings.length });
  } catch (err) {
    return res.status(500).json({ message: "Failed to save rating", detail: err.message });
  }
}

export async function addToWatchlist(req, res) {
  try {
    const { movieId } = req.body;
    if (!movieId) return res.status(400).json({ message: "movieId is required" });

    const watchlist = await Watchlist.findOneAndUpdate(
      { user: req.user.id },
      { $addToSet: { movies: movieId } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    ).populate("movies");

    return res.json({ watchlist: watchlist.movies });
  } catch (err) {
    return res.status(500).json({ message: "Failed to add to watchlist", detail: err.message });
  }
}

export async function removeFromWatchlist(req, res) {
  try {
    const { movieId } = req.body;
    if (!movieId) return res.status(400).json({ message: "movieId is required" });

    const watchlist = await Watchlist.findOneAndUpdate(
      { user: req.user.id },
      { $pull: { movies: movieId } },
      { new: true }
    ).populate("movies");

    return res.json({ watchlist: watchlist?.movies || [] });
  } catch (err) {
    return res.status(500).json({ message: "Failed to remove from watchlist", detail: err.message });
  }
}

export async function getWatchlist(req, res) {
  try {
    const watchlist = await Watchlist.findOne({ user: req.user.id }).populate("movies");
    return res.json({ watchlist: watchlist?.movies || [] });
  } catch (err) {
    return res.status(500).json({ message: "Failed to load watchlist", detail: err.message });
  }
}

export async function suggestions(req, res) {
  try {
    const { q = "" } = req.query;
    if (!q.trim()) return res.json([]);
    const parsed = parseSearchIntent(q);
    const intents = parsed.genres;
    const keywords = parsed.keywords;
    const queryOr = [
      { title: { $regex: escapeRegex(q), $options: "i" } },
      { genres: { $elemMatch: { $regex: escapeRegex(q), $options: "i" } } },
      { tags: { $elemMatch: { $regex: escapeRegex(q), $options: "i" } } },
      ...keywords.flatMap((kw) => [
        { title: { $regex: escapeRegex(kw), $options: "i" } },
        { genres: { $elemMatch: { $regex: escapeRegex(kw), $options: "i" } } },
        { tags: { $elemMatch: { $regex: escapeRegex(kw), $options: "i" } } },
      ]),
      ...(intents.length ? [{ genres: { $in: intents.map((g) => new RegExp(`^${escapeRegex(g)}$`, "i")) } }] : []),
    ];
    const movies = await Movie.find({ $or: queryOr })
      .select("_id title year posterUrl")
      .sort({ trendingScore: -1 })
      .limit(10);
    return res.json(movies);
  } catch (err) {
    return res.status(500).json({ message: "Failed to load suggestions", detail: err.message });
  }
}
