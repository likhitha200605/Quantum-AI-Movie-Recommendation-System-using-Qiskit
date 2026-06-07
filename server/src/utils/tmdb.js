import axios from "axios";
import { cache } from "./cache.js";

function getApiKey() {
  return process.env.TMDB_API_KEY || "4e44d9029b1270a757cddc766a1bcb63";
}

const TMDB_BASE_URL = "https://api.tmdb.org/3";

export const tmdbClient = axios.create({
  baseURL: TMDB_BASE_URL,
  timeout: 10000,
});

tmdbClient.interceptors.request.use((config) => {
  config.params = { ...config.params, api_key: getApiKey() };
  return config;
});

// Fetch and cache the TMDB genre list
export async function getGenreMap() {
  const cacheKey = "tmdb:genreMap";
  if (cache.has(cacheKey)) return cache.get(cacheKey);

  try {
    const { data } = await tmdbClient.get("/genre/movie/list");
    const map = {};
    if (data && data.genres) {
      for (const g of data.genres) {
        map[g.id] = g.name;
      }
    }
    cache.set(cacheKey, map, 86400); // cache for 24h
    return map;
  } catch (err) {
    return {};
  }
}

export function formatTmdbMovie(item, genreMap = {}) {
  if (!item) return null;
  
  // Resolve genres from raw numeric IDs or existing names
  let resolvedGenres = [];
  if (item.genre_ids && item.genre_ids.length > 0) {
    resolvedGenres = item.genre_ids.map(id => genreMap[id] || String(id));
  } else if (Array.isArray(item.genres)) {
    resolvedGenres = item.genres.map(g => g.name || g.id);
  }

  let topCast = [];
  if (item.credits && item.credits.cast) {
    topCast = item.credits.cast.slice(0, 5).map(c => c.name);
  }

  return {
    _id: `tmdb-${item.id}`,
    tmdbId: item.id,
    title: item.title,
    year: item.release_date ? Number(item.release_date.slice(0, 4)) : null,
    genres: resolvedGenres,
    posterUrl: item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : "",
    backdropUrl: item.backdrop_path ? `https://image.tmdb.org/t/p/original${item.backdrop_path}` : "",
    description: item.overview || "",
    ratingAvg: Number(item.vote_average || 0) / 2, // Scale 10 to 5
    language: item.original_language || "en",
    cast: topCast,
    source: "tmdb",
  };
}

export async function fetchFromTmdb(endpoint, params = {}, cacheTtl = 300) {
  const cacheKey = `${endpoint}:${JSON.stringify(params)}`;
  if (cache.has(cacheKey)) {
    return cache.get(cacheKey);
  }
  
  const { data } = await tmdbClient.get(endpoint, { params });
  cache.set(cacheKey, data, cacheTtl);
  return data;
}

// Fetch a single movie by ID with cache
export async function getTmdbMovie(movieId) {
  let tmdbId = String(movieId).replace(/^tmdb[-_]/, "");

  // If the ID is a legacy MongoDB ObjectId (24 char hex), skip it.
  // This prevents TMDB from using parseInt and returning movie 69 ("Walk the Line")
  // for IDs starting with "69..."
  if (/^[0-9a-fA-F]{24}$/.test(tmdbId)) {
    return null;
  }

  const cacheKey = `movieBasic:${tmdbId}`;
  if (cache.has(cacheKey)) return cache.get(cacheKey);

  try {
    const { data } = await tmdbClient.get(`/movie/${tmdbId}`, {
      params: { append_to_response: "credits" }
    });
    const genreMap = await getGenreMap();
    const formatted = formatTmdbMovie(data, genreMap);
    cache.set(cacheKey, formatted, 3600);
    return formatted;
  } catch (err) {
    return null;
  }
}
