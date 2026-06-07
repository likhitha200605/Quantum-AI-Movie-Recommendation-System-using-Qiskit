import axios from "axios";

const quantumApi = axios.create({
  baseURL: process.env.QUANTUM_SERVICE_URL || "http://127.0.0.1:8001",
  timeout: 10000,
});

export async function scoreQuantumSimilarity(userVector, movieVector, knobs = {}) {
  const { data } = await quantumApi.post("/quantum/similarity", {
    user_vector: userVector,
    movie_vector: movieVector,
    noise: knobs.noise ?? 0.02,
    entanglement: knobs.entanglement ?? 0.5,
    exploration: knobs.exploration ?? 0.35,
  });
  return data;
}
