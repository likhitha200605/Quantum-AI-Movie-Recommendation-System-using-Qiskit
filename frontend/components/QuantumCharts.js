import {
  ArcElement,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  Tooltip,
} from "chart.js";
import { Bar, Doughnut } from "react-chartjs-2";

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend);

export default function QuantumCharts({ recommendations, analytics }) {
  const probabilityData = {
    labels: recommendations.map((r) => r.title),
    datasets: [
      {
        label: "Quantum Score",
        data: recommendations.map((r) => r.quantum_score),
        backgroundColor: "rgba(124, 58, 237, 0.8)",
      },
      {
        label: "Classical Score",
        data: recommendations.map((r) => r.classical_score),
        backgroundColor: "rgba(59, 130, 246, 0.7)",
      },
    ],
  };

  const genreData = {
    labels: Object.keys(analytics?.genre_distribution || {}),
    datasets: [
      {
        data: Object.values(analytics?.genre_distribution || {}),
        backgroundColor: [
          "#8b5cf6",
          "#06b6d4",
          "#22c55e",
          "#f97316",
          "#ec4899",
          "#eab308",
          "#ef4444",
        ],
      },
    ],
  };

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="rounded-2xl bg-white p-4 shadow dark:bg-slate-900">
        <h4 className="mb-2 font-semibold">Quantum vs Classical Confidence</h4>
        <Bar data={probabilityData} />
      </div>
      <div className="rounded-2xl bg-white p-4 shadow dark:bg-slate-900">
        <h4 className="mb-2 font-semibold">Recommended Genre Distribution</h4>
        <Doughnut data={genreData} />
      </div>
    </div>
  );
}
