import { BarElement, CategoryScale, Chart as ChartJS, Legend, LinearScale, Tooltip } from "chart.js";
import { Bar } from "react-chartjs-2";

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

export default function QuantumComparisonChart({ items = [] }) {
  const labels = items.map((m) => m.title);
  const data = {
    labels,
    datasets: [
      { label: "Quantum", data: items.map((m) => m.quantumScore || 0), backgroundColor: "#8b5cf6" },
      { label: "Classical", data: items.map((m) => m.classicalScore || 0), backgroundColor: "#22d3ee" },
    ],
  };
  return (
    <div className="glass rounded-2xl p-4">
      <h4 className="mb-3 font-semibold">Quantum vs Classical Comparison Graph</h4>
      <Bar data={data} />
    </div>
  );
}
