import Movie from "../models/Movie.js";
import Rating from "../models/Rating.js";
import WatchHistory from "../models/WatchHistory.js";
import { scoreQuantumSimilarity } from "./quantumService.js";

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
  if (!userId) {
    const trending = await Movie.find().sort({ trendingScore: -1, createdAt: -1 }).limit(16).lean();
    return trending.map((movie, idx) => ({
      ...movie,
      score: 1 - idx * 0.01,
      classicalScore: 1 - idx * 0.01,
      quantumScore: 1 - idx * 0.01,
      explainability: "Trending now based on global watch behavior.",
      quantumMeta: { similarity: 1 - idx * 0.01 },
    }));
  }

  const [movies, ratings, history] = await Promise.all([
    Movie.find().lean(),
    Rating.find({ user: userId }).populate("movie").lean(),
    WatchHistory.find({ user: userId }).populate("movie").lean(),
  ]);

  const allGenres = [...new Set(movies.flatMap((m) => m.genres || []))];
  const likedGenres = {};
  for (const r of ratings) {
    for (const g of r.movie?.genres || []) likedGenres[g] = (likedGenres[g] || 0) + r.score;
  }
  for (const h of history) {
    for (const g of h.movie?.genres || []) likedGenres[g] = (likedGenres[g] || 0) + h.minutesWatched / 60;
  }

  const userVector = normalize(allGenres.map((g) => likedGenres[g] || 0));
  const watched = new Set([
    ...ratings.map((r) => String(r.movie?._id)),
    ...history.map((h) => String(h.movie?._id)),
  ]);
  const watchedTitles = [
    ...new Set([...ratings.map((r) => r.movie?.title), ...history.map((h) => h.movie?.title)].filter(Boolean)),
  ];
  const hasPreferenceSignal = userVector.some((value) => value > 0);

  const scored = [];
  for (const movie of movies) {
    if (watched.has(String(movie._id))) continue;
    const movieVector = genreVector(movie.genres || [], allGenres);
    const preferenceScore = userVector.reduce((acc, u, i) => acc + u * movieVector[i], 0);
    // If user has no behavior signal yet, classical model falls back to popularity.
    const popularityScore = ((movie.trendingScore || 0) / 100) * 0.7 + ((movie.ratingAvg || 0) / 5) * 0.3;
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

  // Fallback for small catalogs: still return ranked items so UI never appears "stuck".
  return movies
    .slice()
    .sort((a, b) => (b.trendingScore || 0) - (a.trendingScore || 0))
    .slice(0, 16)
    .map((movie, idx) => ({
      ...movie,
      score: 1 - idx * 0.01,
      classicalScore: 1 - idx * 0.01,
      quantumScore: 1 - idx * 0.01,
      explainability: "No unseen items left; showing strongest matches from your catalog.",
      quantumMeta: { similarity: 1 - idx * 0.01, fallback: true },
    }));
}
