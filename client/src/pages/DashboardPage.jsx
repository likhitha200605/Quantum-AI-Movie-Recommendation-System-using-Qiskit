import { ArcElement, Chart as ChartJS, Legend, Tooltip } from "chart.js";
import { Doughnut } from "react-chartjs-2";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import LoadingSkeleton from "../components/LoadingSkeleton";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";

ChartJS.register(ArcElement, Tooltip, Legend);

export default function DashboardPage() {
  const { user, loadingUser } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user) {
      setData(null);
      setLoading(false);
      return;
    }

    let alive = true;
    async function run() {
      setLoading(true);
      setError("");
      try {
        const res = await api.get(`/user/dashboard/${user._id}`);
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
  }, [user]);

  const chartData = {
    labels: Object.keys(data?.genreDistribution || {}),
    datasets: [{ data: Object.values(data?.genreDistribution || {}), backgroundColor: ["#8b5cf6", "#06b6d4", "#22c55e", "#eab308"] }],
  };

  if (loadingUser || loading) return <LoadingSkeleton rows={6} />;

  if (!user) {
    return (
      <div className="space-y-4">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <div className="glass rounded-2xl p-4 text-slate-300">
          Please <Link to="/profile" className="text-violet-400 underline">login</Link> to view your personalized dashboard.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Dashboard</h1>
      {error && <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-3 text-red-200">{error}</div>}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="glass rounded-2xl p-4">Watch Time: {data?.watchTime || 0} mins</div>
        <div className="glass rounded-2xl p-4">Movies Watched: {data?.moviesWatched || 0}</div>
        <div className="glass rounded-2xl p-4">Favorite Genres: {data?.favoriteGenres || "N/A"}</div>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="glass rounded-2xl p-4">Average Rating Given: {(data?.avgRating || 0).toFixed(2)}</div>
        <div className="glass rounded-2xl p-4">User Personalization Score: {(data?.personalizationScore || 0).toFixed(0)}%</div>
      </div>
      <div className="glass rounded-2xl p-4">
        <h3 className="mb-2 font-semibold">Genre Distribution</h3>
        {Object.keys(data?.genreDistribution || {}).length ? (
          <Doughnut data={chartData} />
        ) : (
          <p className="text-slate-300">Start exploring movies 🎬</p>
        )}
      </div>
      {(data?.moviesWatched || 0) === 0 && <div className="glass rounded-2xl p-4 text-slate-300">Start exploring movies 🎬</div>}
    </div>
  );
}
