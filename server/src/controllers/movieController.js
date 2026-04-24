import Rating from "../models/Rating.js";
import Watchlist from "../models/Watchlist.js";
import { cache } from "../utils/cache.js";
import { fetchFromTmdb, formatTmdbMovie, tmdbClient, getTmdbMovie, getGenreMap } from "../utils/tmdb.js";

export async function trendingMovies(req, res) {
  try {
    const page = Math.max(Number(req.query.page) || 1, 1);
    const [data, genreMap] = await Promise.all([
      fetchFromTmdb("/trending/movie/week", { page }),
      getGenreMap()
    ]);
    
    return res.json({
      movies: data.results.map(m => formatTmdbMovie(m, genreMap)),
      currentPage: data.page,
      totalPages: data.total_pages,
    });
  } catch (err) {
    return res.status(500).json({ message: "Failed to load trending movies", detail: err.message });
  }
}

export async function popularMovies(req, res) {
  try {
    const page = Math.max(Number(req.query.page) || 1, 1);
    const [data, genreMap] = await Promise.all([
      fetchFromTmdb("/movie/popular", { page }),
      getGenreMap()
    ]);
    
    return res.json({
      movies: data.results.map(m => formatTmdbMovie(m, genreMap)),
      currentPage: data.page,
      totalPages: data.total_pages,
    });
  } catch (err) {
    return res.status(500).json({ message: "Failed to load popular movies", detail: err.message });
  }
}

export async function topRatedMovies(req, res) {
  try {
    const page = Math.max(Number(req.query.page) || 1, 1);
    const [data, genreMap] = await Promise.all([
      fetchFromTmdb("/movie/top_rated", { page }),
      getGenreMap()
    ]);
    
    return res.json({
      movies: data.results.map(m => formatTmdbMovie(m, genreMap)),
      currentPage: data.page,
      totalPages: data.total_pages,
    });
  } catch (err) {
    return res.status(500).json({ message: "Failed to load top rated movies", detail: err.message });
  }
}

export async function genresList(req, res) {
  try {
    const data = await fetchFromTmdb("/genre/movie/list", {}, 86400); // cache genres for 24h
    return res.json(data.genres || []);
  } catch (err) {
    return res.status(500).json({ message: "Failed to load genres", detail: err.message });
  }
}

export async function genreMovies(req, res) {
  try {
    const page = Math.max(Number(req.query.page) || 1, 1);
    const genreId = req.params.id;
    const [data, genreMap] = await Promise.all([
      fetchFromTmdb("/discover/movie", { with_genres: genreId, page }),
      getGenreMap()
    ]);
    
    return res.json({
      movies: data.results.map(m => formatTmdbMovie(m, genreMap)),
      currentPage: data.page,
      totalPages: data.total_pages,
    });
  } catch (err) {
    return res.status(500).json({ message: "Failed to load genre movies", detail: err.message });
  }
}

export async function searchMovies(req, res) {
  try {
    const query = String(req.query.q || req.query.query || "").trim();
    if (!query) return res.json([]);

    const page = Math.max(Number(req.query.page) || 1, 1);
    const [data, genreMap] = await Promise.all([
      fetchFromTmdb("/search/movie", { query, page }),
      getGenreMap()
    ]);

    // Since search might be called without pagination in suggestions
    if (req.query.page) {
      return res.json({
        movies: data.results.map(m => formatTmdbMovie(m, genreMap)),
        currentPage: data.page,
        totalPages: data.total_pages,
      });
    }

    return res.json(data.results.map(m => formatTmdbMovie(m, genreMap)));
  } catch (err) {
    return res.status(500).json({ message: "Failed to search movies", detail: err.message });
  }
}

export async function movieDetails(req, res) {
  try {
    let movieId = req.params.id;
    // Handle our custom "tmdb-" prefix if it exists
    if (movieId.startsWith("tmdb-")) {
      movieId = movieId.replace("tmdb-", "");
    }

    const cacheKey = `movieDetails:${movieId}`;
    let tmdbMovie;
    
    if (cache.has(cacheKey)) {
      tmdbMovie = cache.get(cacheKey);
    } else {
      const { data } = await tmdbClient.get(`/movie/${movieId}`, {
        params: { append_to_response: "videos,credits" }
      });
      tmdbMovie = data;
      cache.set(cacheKey, tmdbMovie, 300);
    }

    // Convert to standard format
    const movie = {
      _id: `tmdb-${tmdbMovie.id}`,
      tmdbId: tmdbMovie.id,
      title: tmdbMovie.title,
      year: tmdbMovie.release_date ? Number(tmdbMovie.release_date.slice(0, 4)) : null,
      genres: Array.isArray(tmdbMovie.genres) ? tmdbMovie.genres.map(g => g.name) : [],
      posterUrl: tmdbMovie.poster_path ? `https://image.tmdb.org/t/p/w500${tmdbMovie.poster_path}` : "",
      backdropUrl: tmdbMovie.backdrop_path ? `https://image.tmdb.org/t/p/original${tmdbMovie.backdrop_path}` : "",
      description: tmdbMovie.overview || "",
      ratingAvg: Number(tmdbMovie.vote_average || 0) / 2, // TMDB rating
      runtime: tmdbMovie.runtime,
      cast: tmdbMovie.credits?.cast ? tmdbMovie.credits.cast.slice(0, 10).map(c => c.name) : [],
      trailerUrl: "",
      source: "tmdb",
    };

    // Find YouTube trailer
    if (tmdbMovie.videos?.results) {
      const trailer = tmdbMovie.videos.results.find(v => v.type === "Trailer" && v.site === "YouTube");
      if (trailer) {
        movie.trailerUrl = `https://www.youtube.com/embed/${trailer.key}`;
      }
    }

    // Merge with User Ratings from MongoDB
    const ratings = await Rating.find({ movie: movie._id });
    if (ratings.length > 0) {
      // Calculate local DB average rating
      const localAvg = ratings.reduce((acc, r) => acc + r.score, 0) / ratings.length;
      // We can blend TMDB rating with our local rating, or just use ours. 
      // We'll prefer local if there are enough votes, or blend 50/50.
      movie.ratingAvg = (movie.ratingAvg + localAvg) / 2;
      movie.totalRatings = ratings.length;
    }

    return res.json(movie);
  } catch (err) {
    if (err.response && err.response.status === 404) {
      return res.status(404).json({ message: "Movie not found" });
    }
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
    
    // We don't update a local Movie document anymore, we just return the rating
    const ratings = await Rating.find({ movie: movieId });
    const avg = ratings.reduce((acc, r) => acc + r.score, 0) / Math.max(ratings.length, 1);
    
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
    );

    return res.json({ watchlist: watchlist.movies });
  } catch (err) {
    return res.status(500).json({ message: "Failed to add to watchlist", detail: err.message });
  }
}

export async function removeFromWatchlist(req, res) {
  try {
    const { movieId } = req.params;
    if (!movieId) return res.status(400).json({ message: "movieId is required" });

    const watchlist = await Watchlist.findOneAndUpdate(
      { user: req.user.id },
      { $pull: { movies: movieId } },
      { new: true }
    );

    return res.json({ watchlist: watchlist?.movies || [] });
  } catch (err) {
    return res.status(500).json({ message: "Failed to remove from watchlist", detail: err.message });
  }
}

export async function getWatchlist(req, res) {
  try {
    const watchlist = await Watchlist.findOne({ user: req.user.id });
    if (!watchlist || watchlist.movies.length === 0) {
      return res.json({ watchlist: [] });
    }

    const moviePromises = watchlist.movies.map(async (movieId) => {
      return getTmdbMovie(movieId);
    });

    const movies = (await Promise.all(moviePromises)).filter(Boolean);
    return res.json({ watchlist: movies });
  } catch (err) {
    return res.status(500).json({ message: "Failed to load watchlist", detail: err.message });
  }
}
