import { useEffect, useState } from "react";
import ExplainabilityPanel from "../components/ExplainabilityPanel";
import LoadingSkeleton from "../components/LoadingSkeleton";
import MovieCard from "../components/MovieCard";
import QuantumComparisonChart from "../components/QuantumComparisonChart";
import api from "../services/api";

export default function RecommendationsPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    async function run() {
      setLoading(true);
      setError("");
      try {
        const { data } = await api.get("/recommendations");
        if (alive) setItems(data || []);
      } catch (err) {
        if (alive) {
          setItems([]);
          setError(err?.response?.data?.message || "Failed to load recommendations.");
        }
      } finally {
        if (alive) setLoading(false);
      }
    }
    run();
    return () => {
      alive = false;
    };
  }, []);

  if (loading) return <LoadingSkeleton rows={6} />;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Recommended for You</h1>
      {error && <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-3 text-red-200">{error}</div>}
      <QuantumComparisonChart items={items.slice(0, 6)} />
      <div className="grid gap-4 md:grid-cols-3">
        {items.map((m) => (
          <div key={m._id} className="space-y-3">
            <MovieCard movie={m} />
            <ExplainabilityPanel item={m} />
          </div>
        ))}
      </div>
    </div>
  );
}
