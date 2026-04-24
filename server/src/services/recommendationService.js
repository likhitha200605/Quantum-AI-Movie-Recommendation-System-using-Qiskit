import Rating from "../models/Rating.js";
import WatchHistory from "../models/WatchHistory.js";
import { scoreQuantumSimilarity } from "./quantumService.js";
import { fetchFromTmdb, formatTmdbMovie, getTmdbMovie, getGenreMap } from "../utils/tmdb.js";

function normalize(vec) {
  const sum = Math.sqrt(vec.reduce((acc, v) => acc + v * v, 0));
  if (!sum) return vec.map(() => 0);
  return vec.map((v) => v / sum);
}

function genreVector(genres, allGenres) {
  const set = new Set(genres);
  return normalize(allGenres.map((g) => (set.has(g) ? 1 : 0)));
}

export async function computeRecommendations(userId, knobs = {}) {
  // Fetch popular movies from TMDB as our candidate pool
  const [pop1, pop2, genreMap] = await Promise.all([
    fetchFromTmdb("/movie/popular", { page: 1 }),
    fetchFromTmdb("/movie/popular", { page: 2 }),
    getGenreMap()
  ]);
  const candidates = [...pop1.results, ...pop2.results].map(m => formatTmdbMovie(m, genreMap)).filter(Boolean);

  if (!userId || userId === "guest") {
    // Return top popular
    return candidates.slice(0, 16).map((movie, idx) => ({
      ...movie,
      score: 1 - idx * 0.01,
      classicalScore: 1 - idx * 0.01,
      quantumScore: 1 - idx * 0.01,
      explainability: "Trending now based on global watch behavior.",
      quantumMeta: { similarity: 1 - idx * 0.01 },
    }));
  }

  const [ratings, history] = await Promise.all([
    Rating.find({ user: userId }).lean(),
    WatchHistory.find({ user: userId }).lean(),
  ]);

  // Fetch full details for user's watched/rated movies
  const watchedIds = new Set([
    ...ratings.map(r => r.movie),
    ...history.map(h => h.movie)
  ]);
  
  const watchedMovies = (await Promise.all(
    [...watchedIds].map(id => getTmdbMovie(id))
  )).filter(Boolean);

  const watchedMap = new Map(watchedMovies.map(m => [m._id, m]));

  const allGenres = [...new Set([...candidates, ...watchedMovies].flatMap((m) => m.genres || []))];
  
  const likedGenres = {};
  for (const r of ratings) {
    const m = watchedMap.get(r.movie);
    for (const g of m?.genres || []) likedGenres[g] = (likedGenres[g] || 0) + r.score;
  }
  for (const h of history) {
    const m = watchedMap.get(h.movie);
    for (const g of m?.genres || []) likedGenres[g] = (likedGenres[g] || 0) + h.minutesWatched / 60;
  }

  const userVector = normalize(allGenres.map((g) => likedGenres[g] || 0));
  const watchedTitles = watchedMovies.map(m => m.title);
  const hasPreferenceSignal = userVector.some((value) => value > 0);

  const scored = [];
  for (const movie of candidates) {
    if (watchedIds.has(String(movie._id))) continue;
    const movieVector = genreVector(movie.genres || [], allGenres);
    const preferenceScore = userVector.reduce((acc, u, i) => acc + u * movieVector[i], 0);
    
    const popularityScore = (movie.ratingAvg || 0) / 5;
    const classicalScore = hasPreferenceSignal ? preferenceScore : popularityScore;
    let quantum = { similarity: classicalScore };
    try {
      quantum = await scoreQuantumSimilarity(userVector, movieVector, knobs);
    } catch {
      quantum = { similarity: classicalScore };
    }
    const hybrid = (1 - (knobs.exploration ?? 0.35)) * quantum.similarity + (knobs.exploration ?? 0.35) * classicalScore;
    scored.push({
      ...movie,
      score: hybrid,
      classicalScore,
      quantumScore: quantum.similarity,
      explainability: watchedTitles.length
        ? `Because you watched ${watchedTitles.slice(0, 2).join(" and ")}.`
        : "Because your recent behavior matches this movie profile.",
      quantumMeta: quantum,
    });
  }
  scored.sort((a, b) => b.score - a.score);
  if (scored.length > 0) {
    return scored.slice(0, 16);
  }

  return candidates.slice(0, 16).map((movie, idx) => ({
      ...movie,
      score: 1 - idx * 0.01,
      classicalScore: 1 - idx * 0.01,
      quantumScore: 1 - idx * 0.01,
      explainability: "No unseen items left; showing strongest matches from our popular catalog.",
      quantumMeta: { similarity: 1 - idx * 0.01, fallback: true },
  }));
}
