import axios from "axios";

function resolveBaseUrl() {
  if (process.env.NEXT_PUBLIC_API_URL) return process.env.NEXT_PUBLIC_API_URL;
  if (typeof window !== "undefined") {
    const host = window.location.hostname || "127.0.0.1";
    return `http://${host}:8000`;
  }
  return "http://127.0.0.1:8000";
}

const api = axios.create({
  baseURL: resolveBaseUrl(),
  timeout: 10000,
});

export async function login(username, password) {
  const res = await api.post("/login", { username, password });
  return res.data;
}

export async function fetchRecommendations(userId, noise, exploration) {
  const res = await api.get(`/recommendations/${userId}`, {
    params: { noise, exploration },
  });
  return res.data;
}

export async function fetchQuantumCircuit(userId) {
  const res = await api.get(`/quantum-circuit/${userId}`);
  return res.data;
}

export async function rateMovie(userId, movieId, rating) {
  const res = await api.post("/rate-movie", { user_id: userId, movie_id: movieId, rating });
  return res.data;
}

export async function fetchAnalytics(userId) {
  const res = await api.get("/analytics", { params: { user_id: userId } });
  return res.data;
}
