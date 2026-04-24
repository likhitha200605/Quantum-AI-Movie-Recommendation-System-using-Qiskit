import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import LoadingSkeleton from "../components/LoadingSkeleton";
import MovieCard from "../components/MovieCard";
import api from "../services/api";

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function highlightMatch(title, query) {
  if (!query) return title;
  const pattern = new RegExp(`(${escapeRegex(query)})`, "ig");
  const parts = String(title).split(pattern);
  return parts.map((part, idx) =>
    part.toLowerCase() === query.toLowerCase() ? (
      <mark key={`${part}-${idx}`} className="rounded bg-violet-500/40 px-1 text-white">
        {part}
      </mark>
    ) : (
      <span key={`${part}-${idx}`}>{part}</span>
    )
  );
}

export default function SearchResultsPage() {
  const [searchParams] = useSearchParams();
  const q = useMemo(() => (searchParams.get("q") || "").trim(), [searchParams]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    let debounceTimer;

    async function run() {
      if (!q) {
        setItems([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError("");
      try {
        console.log("[search] requesting query:", q);
        const { data } = await api.get("/movies/search", { params: { q } });
        console.log("[search] response count:", Array.isArray(data) ? data.length : 0);
        if (alive) {
          setItems(data || []);
        }
      } catch (err) {
        if (alive) {
          setItems([]);
          setError(err?.response?.data?.message || "Unable to load search results.");
        }
      } finally {
        if (alive) setLoading(false);
      }
    }
    debounceTimer = setTimeout(() => {
      run();
    }, 300);

    return () => {
      alive = false;
      clearTimeout(debounceTimer);
    };
  }, [q]);

  if (loading) return <LoadingSkeleton rows={6} />;

  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-bold">Search Results</h1>
      <p className="text-slate-300">
        Query: <span className="font-semibold text-white">{q || "N/A"}</span>
      </p>
      {error && <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-200">{error}</div>}
      {!error && q && items.length === 0 && <div className="rounded-xl bg-white/5 p-4 text-slate-300">No results found.</div>}
      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {items.map((movie) => (
          <MovieCard key={movie._id} movie={movie} />
        ))}
      </div>
    </div>
  );
}
