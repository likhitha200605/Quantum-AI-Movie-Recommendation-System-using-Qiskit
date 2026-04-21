import { useState } from "react";
import QuantumComparisonChart from "../components/QuantumComparisonChart";
import api from "../services/api";

export default function QuantumLabPage() {
  const [noise, setNoise] = useState(0.02);
  const [entanglement, setEntanglement] = useState(0.5);
  const [exploration, setExploration] = useState(0.35);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [hasRun, setHasRun] = useState(false);

  async function run() {
    setLoading(true);
    setError("");
    try {
      console.log("[quantum-lab] run with knobs:", { noise, entanglement, exploration });
      const { data } = await api.get("/recommendations", { params: { noise, entanglement, exploration } });
      setResults(Array.isArray(data) ? data : []);
      console.log("[quantum-lab] received results:", Array.isArray(data) ? data.length : 0);
    } catch (err) {
      setResults([]);
      setError(err?.response?.data?.message || "Failed to run quantum recommendation.");
    } finally {
      setHasRun(true);
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Quantum Lab</h1>
      <div className="glass grid gap-4 rounded-2xl p-4 md:grid-cols-3">
        <label>Quantum Noise ({noise.toFixed(2)})<input className="w-full" type="range" min="0" max="0.3" step="0.01" value={noise} onChange={(e) => setNoise(Number(e.target.value))} /></label>
        <label>Entanglement Level ({entanglement.toFixed(2)})<input className="w-full" type="range" min="0" max="1" step="0.01" value={entanglement} onChange={(e) => setEntanglement(Number(e.target.value))} /></label>
        <label>Exploration ({exploration.toFixed(2)})<input className="w-full" type="range" min="0" max="1" step="0.01" value={exploration} onChange={(e) => setExploration(Number(e.target.value))} /></label>
      </div>
      <button onClick={run} className="rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-5 py-3">
        {loading ? "Running..." : "Run Quantum Recommendation"}
      </button>
      {error && <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-3 text-red-200">{error}</div>}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="glass rounded-xl p-4">
          <h3 className="mb-2 font-semibold">Quantum Recommendation Output</h3>
          <ul className="space-y-1 text-sm text-slate-300">
            {results.slice(0, 5).map((item) => (
              <li key={`q-${item._id}`}>{item.title} - {(item.quantumScore || 0).toFixed(3)}</li>
            ))}
          </ul>
          {hasRun && !loading && results.length === 0 && <p className="text-sm text-slate-300">No recommendations generated for current data.</p>}
        </div>
        <div className="glass rounded-xl p-4">
          <h3 className="mb-2 font-semibold">Classical Recommendation Output</h3>
          <ul className="space-y-1 text-sm text-slate-300">
            {results
              .slice(0, 5)
              .sort((a, b) => (b.classicalScore || 0) - (a.classicalScore || 0))
              .map((item) => (
                <li key={`c-${item._id}`}>{item.title} - {(item.classicalScore || 0).toFixed(3)}</li>
              ))}
          </ul>
          {hasRun && !loading && results.length === 0 && <p className="text-sm text-slate-300">No recommendations generated for current data.</p>}
        </div>
      </div>
      <QuantumComparisonChart items={results.slice(0, 8)} />
    </div>
  );
}
