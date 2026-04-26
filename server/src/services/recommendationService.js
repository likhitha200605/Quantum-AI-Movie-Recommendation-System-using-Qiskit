import Rating from "../models/Rating.js";
import WatchHistory from "../models/WatchHistory.js";
import Watchlist from "../models/Watchlist.js";
import { fetchFromTmdb, formatTmdbMovie, getTmdbMovie, getGenreMap } from "../utils/tmdb.js";

// Quantum-Inspired Scoring Simulator
function quantumScoreFeatures(features, knobs = {}) {
  // Map features [0,1] to probability amplitudes using RY rotation: RY(theta)|0>
  // theta = pi * score. Amplitude of |1> is sin(pi/2 * score)
  const fLang = Math.sin((Math.PI / 2) * features.language);
  const fGenre = Math.sin((Math.PI / 2) * features.genre);
  const fCast = Math.sin((Math.PI / 2) * features.cast);
  const fRating = Math.sin((Math.PI / 2) * features.rating);
  
  // Superposition (Hadamard-like combination)
  const amplitudeSum = (fLang + fGenre + fCast + fRating) / 4;
  const quantumPart = Math.pow(amplitudeSum, 2); // Interference pattern
  
  // Classical weighted probability
  const classicalPart = 0.3 * fLang * fLang + 0.4 * fGenre * fGenre + 0.2 * fCast * fCast + 0.1 * fRating * fRating;
  
  const entanglement = knobs.entanglement ?? 0.5;
  return (1 - entanglement) * classicalPart + entanglement * quantumPart;
}

export async function computeRecommendations(userId, knobs = {}) {
  const genreMap = await getGenreMap();

  if (!userId || userId === "guest") {
    // Fallback for guests
    const [pop1, pop2] = await Promise.all([
      fetchFromTmdb("/movie/popular", { page: 1 }),
      fetchFromTmdb("/movie/popular", { page: 2 })
    ]);
    const candidates = [...pop1.results, ...pop2.results].map(m => formatTmdbMovie(m, genreMap)).filter(Boolean);
    return candidates.slice(0, 16).map((movie, idx) => ({
      ...movie,
      score: 1 - idx * 0.01,
      classicalScore: 1 - idx * 0.01,
      quantumScore: 1 - idx * 0.01,
      explainability: "Trending now based on global watch behavior.",
      quantumMeta: { similarity: 1 - idx * 0.01 },
    }));
  }

  // 1. User Preference Extraction
  const [ratings, history, watchlist] = await Promise.all([
    Rating.find({ user: userId }).lean(),
    WatchHistory.find({ user: userId }).lean(),
    Watchlist.findOne({ user: userId }).lean(),
  ]);

  const watchedIds = new Set([
    ...ratings.map(r => r.movie),
    ...history.map(h => h.movie),
    ...(watchlist?.movies || [])
  ]);

  const watchedMovies = (await Promise.all(
    [...watchedIds].map(id => getTmdbMovie(id))
  )).filter(Boolean);

  const preferredLanguages = {};
  const preferredGenres = {};
  const preferredCast = {};

  for (const m of watchedMovies) {
    if (m.language) preferredLanguages[m.language] = (preferredLanguages[m.language] || 0) + 1;
    for (const g of m.genres || []) preferredGenres[g] = (preferredGenres[g] || 0) + 1;
    for (const actor of m.cast || []) preferredCast[actor] = (preferredCast[actor] || 0) + 1;
  }

  const topLanguages = Object.entries(preferredLanguages).sort((a,b)=>b[1]-a[1]).slice(0, 3).map(x=>x[0]);
  const topGenres = Object.entries(preferredGenres).sort((a,b)=>b[1]-a[1]).slice(0, 5).map(x=>x[0]);
  const topActors = new Set(Object.entries(preferredCast).sort((a,b)=>b[1]-a[1]).slice(0, 10).map(x=>x[0]));

  // 2. TMDB Data Fetching (Unbiased)
  const tmdbGenreIds = Object.entries(genreMap).reduce((acc, [id, name]) => { acc[name] = id; return acc; }, {});
  const preferredGenreIds = topGenres.map(g => tmdbGenreIds[g]).filter(Boolean);
  
  const languagesToFetch = topLanguages.length > 0 ? topLanguages : ["en", "te", "hi"];
  if (!languagesToFetch.includes("en")) languagesToFetch.push("en");

  const discoveryPromises = [];
  for (const lang of languagesToFetch.slice(0, 4)) {
    // Fetch by language + genre
    discoveryPromises.push(
      fetchFromTmdb("/discover/movie", {
        with_original_language: lang,
        with_genres: preferredGenreIds.slice(0, 2).join(","),
        sort_by: "popularity.desc",
        page: 1
      })
    );
    // Fetch broadly by language for diversity
    discoveryPromises.push(
      fetchFromTmdb("/discover/movie", {
        with_original_language: lang,
        sort_by: "popularity.desc",
        page: 1
      })
    );
  }

  const discoveryResults = await Promise.all(discoveryPromises);
  const candidatesMap = new Map();
  for (const res of discoveryResults) {
    if (!res || !res.results) continue;
    for (const raw of res.results) {
      if (!watchedIds.has(`tmdb-${raw.id}`) && !candidatesMap.has(raw.id)) {
        candidatesMap.set(raw.id, raw);
      }
    }
  }

  let initialPool = Array.from(candidatesMap.values()).map(c => formatTmdbMovie(c, genreMap));
  initialPool.sort((a,b) => b.ratingAvg - a.ratingAvg); // Initial trim
  const topTrimmed = initialPool.slice(0, 40);

  // Fetch full details with cast
  const fullCandidates = (await Promise.all(
    topTrimmed.map(m => getTmdbMovie(m.tmdbId))
  )).filter(Boolean);

  // 3. & 4. Feature Engineering and Quantum-Inspired Scoring
  const scored = fullCandidates.map(movie => {
    // Language score
    const langScore = topLanguages.includes(movie.language) ? 1.0 : (movie.language === 'en' ? 0.5 : 0.2);
    
    // Genre score
    let genreOverlap = 0;
    if (movie.genres && movie.genres.length > 0) {
      for (const g of movie.genres) {
        if (preferredGenres[g]) genreOverlap += 1;
      }
      genreOverlap = genreOverlap / movie.genres.length;
    }
    const genreScore = Math.min(1, genreOverlap * 1.5); // Boost genre slightly

    // Cast score
    let castOverlap = 0;
    if (movie.cast && movie.cast.length > 0) {
      for (const c of movie.cast) {
        if (topActors.has(c)) castOverlap += 1;
      }
    }
    const castScore = Math.min(1, castOverlap / 2);

    // Rating score
    const ratingScore = Math.min(1, movie.ratingAvg / 5);

    const features = { language: langScore, genre: genreScore, cast: castScore, rating: ratingScore };
    const quantumScore = quantumScoreFeatures(features, knobs);

    return {
      ...movie,
      score: quantumScore,
      classicalScore: (langScore + genreScore + castScore + ratingScore) / 4,
      quantumScore: quantumScore,
      explainability: castOverlap > 0 
        ? "Features your favorite actors and matches your preferred genres."
        : "Strong match based on your language and genre preferences.",
      quantumMeta: { features, similarity: quantumScore }
    };
  });

  // 5. Final Ranking and Diversity Enforcement
  scored.sort((a, b) => b.score - a.score);
  const finalRecommendations = [];
  const recentActors = new Set();
  const recentGenres = new Map();

  while(finalRecommendations.length < 16 && scored.length > 0) {
    const movie = scored.shift();
    finalRecommendations.push(movie);
    
    for (const a of movie.cast || []) recentActors.add(a);
    for (const g of movie.genres || []) {
      recentGenres.set(g, (recentGenres.get(g) || 0) + 1);
    }

    // Apply diversity penalty to remaining candidates
    for (const c of scored) {
      let penalty = 0;
      for (const a of c.cast || []) if (recentActors.has(a)) penalty += 0.05;
      for (const g of c.genres || []) {
        const count = recentGenres.get(g) || 0;
        if (count > 2) penalty += 0.02 * count;
      }
      c.score -= penalty;
    }
    scored.sort((a, b) => b.score - a.score);
  }

  // Fallback if not enough recommendations
  if (finalRecommendations.length === 0) {
    const [pop1] = await Promise.all([fetchFromTmdb("/movie/popular", { page: 1 })]);
    return pop1.results.map(m => formatTmdbMovie(m, genreMap)).slice(0, 16);
  }

  return finalRecommendations;
}
