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
  const watched = new Set(ratings.map((r) => String(r.movie?._id)));

  const scored = [];
  for (const movie of movies) {
    if (watched.has(String(movie._id))) continue;
    const movieVector = genreVector(movie.genres || [], allGenres);
    const classicalScore = userVector.reduce((acc, u, i) => acc + u * movieVector[i], 0);
    const quantum = await scoreQuantumSimilarity(userVector, movieVector, knobs);
    const hybrid = (1 - (knobs.exploration ?? 0.35)) * quantum.similarity + (knobs.exploration ?? 0.35) * classicalScore;
    scored.push({
      ...movie,
      score: hybrid,
      classicalScore,
      quantumScore: quantum.similarity,
      explainability: `Because you watched ${Object.keys(likedGenres).slice(0, 2).join(" and ")} content.`,
      quantumMeta: quantum,
    });
  }
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, 16);
}
