import Movie from "../models/Movie.js";
import Rating from "../models/Rating.js";
import Watchlist from "../models/Watchlist.js";
import { cache } from "../utils/cache.js";

export async function listMovies(req, res) {
  const { q = "", genre, year, minRating = 0 } = req.query;
  const filter = {
    ...(q ? { $text: { $search: q } } : {}),
    ...(genre ? { genres: genre } : {}),
    ...(year ? { year: Number(year) } : {}),
    ratingAvg: { $gte: Number(minRating) },
  };
  const movies = await Movie.find(filter).limit(100);
  res.json(movies);
}

export async function movieDetails(req, res) {
  const cacheKey = `movie:${req.params.id}`;
  if (cache.has(cacheKey)) return res.json(cache.get(cacheKey));
  const movie = await Movie.findById(req.params.id);
  if (!movie) return res.status(404).json({ message: "Movie not found" });
  cache.set(cacheKey, movie);
  res.json(movie);
}

export async function rateMovie(req, res) {
  const { movieId, score } = req.body;
  await Rating.findOneAndUpdate(
    { user: req.user.id, movie: movieId },
    { score },
    { upsert: true, new: true }
  );
  const ratings = await Rating.find({ movie: movieId });
  const avg = ratings.reduce((acc, r) => acc + r.score, 0) / Math.max(ratings.length, 1);
  await Movie.findByIdAndUpdate(movieId, { ratingAvg: avg });
  res.json({ message: "Rating saved", avg });
}

export async function toggleWatchlist(req, res) {
  const { movieId } = req.body;
  const watchlist = (await Watchlist.findOne({ user: req.user.id })) || (await Watchlist.create({ user: req.user.id, movies: [] }));
  const idx = watchlist.movies.findIndex((id) => String(id) === movieId);
  if (idx >= 0) watchlist.movies.splice(idx, 1);
  else watchlist.movies.push(movieId);
  await watchlist.save();
  res.json(watchlist);
}

export async function suggestions(req, res) {
  const { q = "" } = req.query;
  const movies = await Movie.find({ title: { $regex: q, $options: "i" } })
    .select("_id title year")
    .limit(8);
  res.json(movies);
}
