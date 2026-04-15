import { useState } from "react";
import QuantumComparisonChart from "../components/QuantumComparisonChart";
import api from "../services/api";

export default function QuantumLabPage() {
  const [noise, setNoise] = useState(0.02);
  const [entanglement, setEntanglement] = useState(0.5);
  const [exploration, setExploration] = useState(0.35);
  const [results, setResults] = useState([]);

  async function run() {
    const { data } = await api.get("/recommendations", { params: { noise, entanglement, exploration } });
    setResults(data);
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Quantum Lab</h1>
      <div className="glass grid gap-4 rounded-2xl p-4 md:grid-cols-3">
        <label>Quantum Noise ({noise.toFixed(2)})<input className="w-full" type="range" min="0" max="0.3" step="0.01" value={noise} onChange={(e) => setNoise(Number(e.target.value))} /></label>
        <label>Entanglement Level ({entanglement.toFixed(2)})<input className="w-full" type="range" min="0" max="1" step="0.01" value={entanglement} onChange={(e) => setEntanglement(Number(e.target.value))} /></label>
        <label>Exploration ({exploration.toFixed(2)})<input className="w-full" type="range" min="0" max="1" step="0.01" value={exploration} onChange={(e) => setExploration(Number(e.target.value))} /></label>
      </div>
      <button onClick={run} className="rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-5 py-3">Run Quantum Recommendation</button>
      <QuantumComparisonChart items={results.slice(0, 8)} />
    </div>
  );
}
