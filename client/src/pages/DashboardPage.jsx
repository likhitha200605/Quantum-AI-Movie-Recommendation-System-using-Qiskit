import { ArcElement, Chart as ChartJS, Legend, Tooltip } from "chart.js";
import { Doughnut } from "react-chartjs-2";
import { useEffect, useState } from "react";
import LoadingSkeleton from "../components/LoadingSkeleton";
import api from "../services/api";

ChartJS.register(ArcElement, Tooltip, Legend);

export default function DashboardPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    async function run() {
      setLoading(true);
      setError("");
      try {
        const res = await api.get("/dashboard");
        if (alive) setData(res.data);
      } catch (err) {
        if (alive) setError(err?.response?.data?.message || "Failed to load dashboard.");
      } finally {
        if (alive) setLoading(false);
      }
    }
    run();
    return () => {
      alive = false;
    };
  }, []);

  const chartData = {
    labels: Object.keys(data?.genreDistribution || {}),
    datasets: [{ data: Object.values(data?.genreDistribution || {}), backgroundColor: ["#8b5cf6", "#06b6d4", "#22c55e", "#eab308"] }],
  };

  if (loading) return <LoadingSkeleton rows={6} />;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Dashboard</h1>
      {error && <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-3 text-red-200">{error}</div>}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="glass rounded-2xl p-4">Watch Time: {data?.watchTimeMinutes || 0} mins</div>
        <div className="glass rounded-2xl p-4">Movies Watched: {data?.moviesWatched || 0}</div>
        <div className="glass rounded-2xl p-4">Favorite Genres: {(data?.favoriteGenres || []).join(", ") || "N/A"}</div>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="glass rounded-2xl p-4">Average Rating Given: {(data?.avgRatingGiven || 0).toFixed(2)}</div>
        <div className="glass rounded-2xl p-4">User Personalization Score: {((data?.personalizationScore || 0) * 100).toFixed(0)}%</div>
      </div>
      <div className="glass rounded-2xl p-4">
        <h3 className="mb-2 font-semibold">Genre Distribution</h3>
        <Doughnut data={chartData} />
      </div>
      <div className="glass rounded-2xl p-4">
        <h3 className="mb-2 font-semibold">AI Insights</h3>
        <ul className="list-disc space-y-1 pl-5 text-slate-300">{(data?.aiInsights || []).map((i) => <li key={i}>{i}</li>)}</ul>
      </div>
    </div>
  );
}
