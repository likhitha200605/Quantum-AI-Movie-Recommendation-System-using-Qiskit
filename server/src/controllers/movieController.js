import Movie from "../models/Movie.js";
import Rating from "../models/Rating.js";
import Watchlist from "../models/Watchlist.js";
import { cache } from "../utils/cache.js";
import axios from "axios";

function escapeRegex(value = "") {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function normalizeText(value = "") {
  return String(value).toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
}

function scoreSearchRelevance(movie, query) {
  const q = normalizeText(query);
  const title = normalizeText(movie?.title || "");
  const genres = Array.isArray(movie?.genres) ? movie.genres.map((g) => normalizeText(g)).join(" ") : "";
  const tags = Array.isArray(movie?.tags) ? movie.tags.map((t) => normalizeText(t)).join(" ") : "";
  const haystack = `${title} ${genres} ${tags}`.trim();
  const terms = [...new Set(q.split(" ").filter(Boolean))];

  let score = 0;
  if (!q) return score;
  if (title === q) score += 1000;
  else if (title.startsWith(q)) score += 700;
  else if (title.includes(q)) score += 450;
  if (haystack.includes(q)) score += 120;

  for (const term of terms) {
    if (!term) continue;
    if (title === term) score += 150;
    else if (title.startsWith(term)) score += 100;
    else if (title.includes(term)) score += 60;
    if (genres.includes(term)) score += 35;
    if (tags.includes(term)) score += 25;
    if (haystack.includes(term)) score += 10;
  }

  score += Number(movie?.trendingScore || 0) * 0.1;
  score += Number(movie?.ratingAvg || 0) * 2;
  return score;
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

async function fetchYtsMovies({ page = 1, limit = 20, genre = "", query = "" } = {}) {
  const params = {
    page: Math.max(Number(page) || 1, 1),
    limit: Math.min(Math.max(Number(limit) || 1, 1), 50),
    sort_by: "download_count",
    order_by: "desc",
  };
  if (genre) params.genre = String(genre).toLowerCase();
  if (query) params.query_term = query;

  const { data } = await axios.get("https://yts.mx/api/v2/list_movies.json", { params, timeout: 10000 });
  const movies = (data?.data?.movies || []).map((item) => ({
    _id: `yts-${item.id}`,
    ytsId: item.id,
    title: item.title,
    year: item.year,
    genres: item.genres || [],
    posterUrl: item.medium_cover_image || item.large_cover_image || "",
    trailerUrl: item.yt_trailer_code ? `https://www.youtube.com/embed/${item.yt_trailer_code}` : "",
    description: item.summary || "",
    ratingAvg: Number(item.rating || 0) / 2,
    source: "yts",
  }));

  return {
    movies,
    totalPages: Math.max(Number(data?.data?.movie_count || 0) > 0 ? Math.ceil(Number(data.data.movie_count) / params.limit) : 0, 1),
  };
}

async function fetchYtsMovieDetails(ytsId) {
  const { data } = await axios.get("https://yts.mx/api/v2/movie_details.json", {
    params: { movie_id: ytsId, with_images: true, with_cast: true },
    timeout: 10000,
  });
  const movie = data?.data?.movie;
  if (!movie) return null;
  return {
    _id: `yts-${movie.id}`,
    ytsId: movie.id,
    title: movie.title,
    year: movie.year,
    genres: movie.genres || [],
    posterUrl: movie.large_cover_image || movie.medium_cover_image || "",
    trailerUrl: movie.yt_trailer_code ? `https://www.youtube.com/embed/${movie.yt_trailer_code}` : "",
    description: movie.description_full || movie.summary || "",
    ratingAvg: Number(movie.rating || 0) / 2,
    cast: Array.isArray(movie.cast) ? movie.cast.map((c) => c.name).filter(Boolean) : [],
    source: "yts",
  };
}

async function fetchTmdbPopularPage(page = 1, limit = 12) {
  const tmdbApiKey = process.env.TMDB_API_KEY;
  if (!tmdbApiKey) return { movies: [], totalPages: 0 };

  const safePage = Math.max(Number(page) || 1, 1);
  const { data } = await axios.get("https://api.themoviedb.org/3/movie/popular", {
    params: { api_key: tmdbApiKey, page: safePage },
  });

  const movies = (data?.results || []).slice(0, limit).map((item) => ({
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

  return {
    movies,
    totalPages: Number(data?.total_pages || 0),
  };
}

async function fetchTmdbMovieDetails(tmdbId) {
  const tmdbApiKey = process.env.TMDB_API_KEY;
  if (!tmdbApiKey) return null;

  const { data } = await axios.get(`https://api.themoviedb.org/3/movie/${tmdbId}`, {
    params: { api_key: tmdbApiKey },
  });

  return {
    _id: `tmdb-${data.id}`,
    tmdbId: data.id,
    title: data.title,
    year: data.release_date ? Number(data.release_date.slice(0, 4)) : undefined,
    genres: Array.isArray(data.genres) ? data.genres.map((g) => g.name) : [],
    posterUrl: data.poster_path ? `https://image.tmdb.org/t/p/w500${data.poster_path}` : "",
    trailerUrl: "",
    description: data.overview || "",
    ratingAvg: Number(data.vote_average || 0) / 2,
    cast: [],
    source: "tmdb",
  };
}

export async function listMovies(req, res) {
  try {
    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(Number(req.query.limit) || 12, 1), 50);
    const genre = String(req.query.genre || "").trim();

    const filter = genre
      ? { genres: { $elemMatch: { $regex: `^${escapeRegex(genre)}$`, $options: "i" } } }
      : {};

    const totalItems = await Movie.countDocuments(filter);
    const totalPagesFromDb = Math.max(Math.ceil(totalItems / limit), 1);
    const safePage = Math.min(page, totalPagesFromDb);
    const skip = (safePage - 1) * limit;

    const dbMovies = await Movie.find(filter)
      .sort({ trendingScore: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit);

    let movies = dbMovies;
    let totalPages = totalPagesFromDb;

    // Expand catalog with dynamic providers so scrolling keeps loading new movies.
    {
      try {
        const yts = await fetchYtsMovies({ page, limit, genre });
        const tmdb = await fetchTmdbPopularPage(page, limit);
        const seen = new Set();
        movies = [...dbMovies, ...tmdb.movies, ...yts.movies].filter((item) => {
          const key = `${String(item.title || "").toLowerCase()}-${item.year || ""}`;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
        totalPages = Math.max(totalPagesFromDb, tmdb.totalPages || 1, yts.totalPages || 1);
      } catch {
        movies = dbMovies;
        totalPages = totalPagesFromDb;
      }
    }

    return res.json({
      movies,
      currentPage: page,
      totalPages,
    });
  } catch (err) {
    return res.status(500).json({ message: "Failed to load movies", detail: err.message });
  }
}

export async function searchMovies(req, res) {
  try {
    const query = String(req.query.q || "").trim();
    if (!query) return res.json([]);

    const cleanedQuery = query.toLowerCase().replace("movie", "").replace("film", "").trim();
    const effectiveQuery = cleanedQuery || query.toLowerCase();
    const terms = [...new Set(effectiveQuery.split(/\s+/).filter(Boolean))];

    console.log("[movies/search] query:", query, "cleaned:", effectiveQuery);

    const orFilters = [
      { title: { $regex: effectiveQuery, $options: "i" } },
      { genres: { $elemMatch: { $regex: effectiveQuery, $options: "i" } } },
      { tags: { $elemMatch: { $regex: effectiveQuery, $options: "i" } } },
      ...terms.flatMap((term) => [
        { title: { $regex: term, $options: "i" } },
        { genres: { $elemMatch: { $regex: term, $options: "i" } } },
        { tags: { $elemMatch: { $regex: term, $options: "i" } } },
      ]),
    ];

    const dbMovies = await Movie.find({ $or: orFilters }).sort({ trendingScore: -1, createdAt: -1 });

    let tmdbMovies = [];
    let ytsMovies = [];
    try {
      tmdbMovies = await fetchTmdbMovies(query);
    } catch {
      tmdbMovies = [];
    }
    try {
      ytsMovies = (await fetchYtsMovies({ page: 1, limit: 20, query })).movies;
    } catch {
      ytsMovies = [];
    }

    const seen = new Set();
    const merged = [...dbMovies, ...tmdbMovies, ...ytsMovies].filter((item) => {
      const key = `${String(item.title || "").toLowerCase()}-${item.year || ""}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    merged.sort((a, b) => scoreSearchRelevance(b, query) - scoreSearchRelevance(a, query));

    console.log("[movies/search] result_count:", merged.length);
    return res.json(merged);
  } catch (err) {
    return res.status(500).json({ message: "Failed to search movies", detail: err.message });
  }
}

export async function movieDetails(req, res) {
  try {
    if (String(req.params.id).startsWith("yts-")) {
      const ytsId = String(req.params.id).replace("yts-", "");
      const ytsMovie = await fetchYtsMovieDetails(ytsId);
      if (!ytsMovie) return res.status(404).json({ message: "Movie not found" });
      return res.json(ytsMovie);
    }

    if (String(req.params.id).startsWith("tmdb-")) {
      const tmdbId = String(req.params.id).replace("tmdb-", "");
      const tmdbMovie = await fetchTmdbMovieDetails(tmdbId);
      if (!tmdbMovie) return res.status(404).json({ message: "Movie not found" });
      return res.json(tmdbMovie);
    }

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
    const raw = String(q).trim();
    const cleaned = raw.toLowerCase().replace("movie", "").replace("film", "").trim();
    const effective = cleaned || raw.toLowerCase();
    const terms = [...new Set(effective.split(/\s+/).filter(Boolean))];
    const parsed = parseSearchIntent(effective);
    const intents = parsed.genres;

    const queryOr = [
      { title: { $regex: escapeRegex(effective), $options: "i" } },
      { genres: { $elemMatch: { $regex: escapeRegex(effective), $options: "i" } } },
      { tags: { $elemMatch: { $regex: escapeRegex(effective), $options: "i" } } },
      ...terms.flatMap((kw) => [
        { title: { $regex: escapeRegex(kw), $options: "i" } },
        { genres: { $elemMatch: { $regex: escapeRegex(kw), $options: "i" } } },
        { tags: { $elemMatch: { $regex: escapeRegex(kw), $options: "i" } } },
      ]),
      ...(intents.length ? [{ genres: { $in: intents.map((g) => new RegExp(`^${escapeRegex(g)}$`, "i")) } }] : []),
    ];

    const dbMovies = await Movie.find({ $or: queryOr })
      .select("_id title year posterUrl")
      .sort({ trendingScore: -1 })
      .limit(10);

    let tmdbMovies = [];
    try {
      tmdbMovies = (await fetchTmdbMovies(raw)).map((item) => ({
        _id: item._id,
        title: item.title,
        year: item.year,
        posterUrl: item.posterUrl,
      }));
    } catch {
      tmdbMovies = [];
    }

    const seen = new Set();
    const merged = [...dbMovies, ...tmdbMovies].filter((item) => {
      const key = `${String(item.title || "").toLowerCase()}-${item.year || ""}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    merged.sort((a, b) => scoreSearchRelevance(b, raw) - scoreSearchRelevance(a, raw));

    return res.json(merged.slice(0, 10));
  } catch (err) {
    return res.status(500).json({ message: "Failed to load suggestions", detail: err.message });
  }
}
