import api from "./api";

function isMongoObjectId(value) {
  return /^[a-f\d]{24}$/i.test(String(value || ""));
}

export async function trackWatchlistAction({ userId, movieId }) {
  if (!userId || !isMongoObjectId(movieId)) return;
  try {
    await api.post("/track/watchlist", { userId, movieId });
  } catch (err) {
    console.error("track watchlist failed", err?.response?.data || err.message);
  }
}

export async function trackTrailerAction({ userId, movieId }) {
  if (!userId || !isMongoObjectId(movieId)) return;
  try {
    await api.post("/track/trailer", { userId, movieId });
  } catch (err) {
    console.error("track trailer failed", err?.response?.data || err.message);
  }
}

export async function trackSearchAction({ userId, query }) {
  const clean = String(query || "").trim();
  if (!userId || clean.length < 2) return;
  try {
    await api.post("/track/search", { userId, query: clean });
  } catch (err) {
    console.error("track search failed", err?.response?.data || err.message);
  }
}
