import { useEffect, useState } from "react";
import ExplainabilityPanel from "../components/ExplainabilityPanel";
import MovieCard from "../components/MovieCard";
import QuantumComparisonChart from "../components/QuantumComparisonChart";
import api from "../services/api";

export default function RecommendationsPage() {
  const [items, setItems] = useState([]);

  useEffect(() => {
    api.get("/recommendations").then(({ data }) => setItems(data)).catch(() => setItems([]));
  }, []);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Recommended for You</h1>
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
