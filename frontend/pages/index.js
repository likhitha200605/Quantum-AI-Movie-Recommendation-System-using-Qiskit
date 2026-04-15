import { useEffect, useState } from "react";

import MovieCard from "../components/MovieCard";
import QuantumCharts from "../components/QuantumCharts";
import { fetchAnalytics, fetchQuantumCircuit, fetchRecommendations, login, rateMovie } from "../services/api";

export default function HomePage() {
  const [darkMode, setDarkMode] = useState(true);
  const [username, setUsername] = useState("alice");
  const [password, setPassword] = useState("quantum123");
  const [userId, setUserId] = useState(null);
  const [noise, setNoise] = useState(0.02);
  const [exploration, setExploration] = useState(0.35);
  const [recommendations, setRecommendations] = useState([]);
  const [superposition, setSuperposition] = useState([]);
  const [entangledUsers, setEntangledUsers] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [circuit, setCircuit] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    document.documentElement.classList.toggle("dark", darkMode);
  }, [darkMode]);

  async function handleLogin() {
    try {
      setError("");
      const res = await login(username, password);
      setUserId(res.user_id);
    } catch (err) {
      setError(err?.message || "Login failed. Check backend connectivity.");
    }
  }

  async function recompute() {
    if (!userId) return;
    try {
      setError("");
      setLoading(true);
      const [recs, circ, stats] = await Promise.all([
        fetchRecommendations(userId, noise, exploration),
        fetchQuantumCircuit(userId),
        fetchAnalytics(userId),
      ]);
      setRecommendations(recs.recommendations || []);
      setSuperposition(recs.superposition_states || []);
      setEntangledUsers(recs.entangled_users || []);
      setAnalytics(stats || recs.analytics);
      setCircuit(circ);
    } catch (err) {
      setError(
        err?.response?.data?.detail ||
          err?.message ||
          "Could not contact backend. Start FastAPI on port 8000 and retry."
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleRate(movieId, stars) {
    try {
      await rateMovie(userId, movieId, stars);
      await recompute();
    } catch (err) {
      setError(err?.message || "Failed to submit rating.");
    }
  }

  return (
    <main className="mx-auto max-w-7xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-bold">Quantum AI Movie Recommender</h1>
        <button className="rounded bg-slate-800 px-3 py-2 text-sm text-white dark:bg-slate-200 dark:text-slate-900" onClick={() => setDarkMode((v) => !v)}>
          Toggle {darkMode ? "Light" : "Dark"} Mode
        </button>
      </div>

      <section className="mb-6 rounded-2xl bg-white p-4 shadow dark:bg-slate-900">
        <h2 className="mb-3 text-xl font-semibold">Login / Signup</h2>
        <div className="grid gap-3 md:grid-cols-4">
          <input className="rounded border p-2 text-black" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Username" />
          <input className="rounded border p-2 text-black" value={password} onChange={(e) => setPassword(e.target.value)} type="password" placeholder="Password" />
          <button className="rounded bg-primary px-3 py-2 font-semibold text-white" onClick={handleLogin}>
            Authenticate
          </button>
          <div className="rounded border border-dashed p-2 text-sm">User ID: {userId || "Not logged in"}</div>
        </div>
      </section>

      {error && (
        <div className="mb-6 rounded-2xl border border-red-300 bg-red-50 p-4 text-sm text-red-700 dark:border-red-700 dark:bg-red-900/30 dark:text-red-300">
          {error}
        </div>
      )}

      <section className="mb-6 rounded-2xl bg-white p-4 shadow dark:bg-slate-900">
        <h2 className="mb-3 text-xl font-semibold">Quantum Controls</h2>
        <div className="grid gap-4 md:grid-cols-3">
          <label className="text-sm">
            Quantum Noise ({noise.toFixed(2)})
            <input className="w-full" type="range" min="0" max="0.3" step="0.01" value={noise} onChange={(e) => setNoise(Number(e.target.value))} />
          </label>
          <label className="text-sm">
            Exploration vs Exploitation ({exploration.toFixed(2)})
            <input className="w-full" type="range" min="0" max="1" step="0.01" value={exploration} onChange={(e) => setExploration(Number(e.target.value))} />
          </label>
          <button className="h-fit rounded bg-primary px-4 py-2 font-semibold text-white" onClick={recompute}>
            Recompute Recommendations
          </button>
        </div>
      </section>

      {loading && (
        <div className="mb-6 rounded-2xl bg-indigo-600 p-4 text-white shadow animate-pulse">
          Quantum processor is evaluating superposition states...
        </div>
      )}

      {!!recommendations.length && (
        <>
          <section className="mb-6 grid gap-4 md:grid-cols-3">
            {recommendations.map((movie) => (
              <MovieCard key={movie.movie_id} movie={movie} onRate={handleRate} />
            ))}
          </section>

          <section className="mb-6">
            <QuantumCharts recommendations={recommendations} analytics={analytics} />
          </section>

          <section className="mb-6 grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl bg-white p-4 shadow dark:bg-slate-900">
              <h3 className="mb-2 font-semibold">Quantum Superposition States</h3>
              <ul className="space-y-1 text-sm">
                {superposition.map((s) => (
                  <li key={s.movie_id}>
                    {s.title}: <strong>{(s.probability * 100).toFixed(2)}%</strong>
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-2xl bg-white p-4 shadow dark:bg-slate-900">
              <h3 className="mb-2 font-semibold">Entangled Preferences</h3>
              <ul className="space-y-1 text-sm">
                {entangledUsers.map((u) => (
                  <li key={u.user_id}>
                    User {u.user_id}: entanglement score <strong>{u.entanglement_score.toFixed(3)}</strong>
                  </li>
                ))}
              </ul>
            </div>
          </section>

          {circuit && (
            <section className="rounded-2xl bg-white p-4 shadow dark:bg-slate-900">
              <h3 className="mb-2 font-semibold">Quantum Explainability</h3>
              <p className="mb-2 text-sm text-slate-500">Why recommended? High overlap in swap-test probability and stable Hadamard basis response.</p>
              <pre className="max-h-80 overflow-auto rounded bg-slate-950 p-3 text-xs text-green-300">{circuit.hadamard_circuit_ascii}</pre>
            </section>
          )}
        </>
      )}
    </main>
  );
}
