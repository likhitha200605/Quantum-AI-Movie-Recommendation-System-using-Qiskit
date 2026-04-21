import { BarElement, CategoryScale, Chart as ChartJS, Legend, LinearScale, Tooltip } from "chart.js";
import { Bar } from "react-chartjs-2";

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

export default function QuantumComparisonChart({ items = [] }) {
  const safeItems = Array.isArray(items) ? items : [];
  const labels = safeItems.map((m) => m.title || "Untitled");
  const data = {
    labels,
    datasets: [
      { label: "Quantum", data: safeItems.map((m) => m.quantumScore || 0), backgroundColor: "#8b5cf6" },
      { label: "Classical", data: safeItems.map((m) => m.classicalScore || 0), backgroundColor: "#22d3ee" },
    ],
  };
  return (
    <div className="glass rounded-2xl p-4">
      <h4 className="mb-3 font-semibold">Quantum vs Classical Comparison Graph</h4>
      {safeItems.length ? <Bar data={data} /> : <p className="text-sm text-slate-300">Run recommendation to see comparison graph.</p>}
    </div>
  );
}
