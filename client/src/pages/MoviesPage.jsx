import { useEffect, useState } from "react";
import LoadingSkeleton from "../components/LoadingSkeleton";
import MovieCard from "../components/MovieCard";
import api from "../services/api";

export default function MoviesPage() {
  const [movies, setMovies] = useState([]);
  const [genre, setGenre] = useState("");
  const [year, setYear] = useState("");
  const [minRating, setMinRating] = useState("0");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [matchType, setMatchType] = useState("");
  const hasActiveFilters = Boolean(genre.trim() || year.trim() || Number(minRating) > 0);

  useEffect(() => {
    let alive = true;
    async function loadMovies() {
      setLoading(true);
      setError("");
      try {
        const response = await api.get("/movies", { params: { genre, year, minRating } });
        if (alive) {
          setMovies(response.data || []);
          setMatchType(response.headers["x-match-type"] || "");
        }
      } catch (err) {
        if (alive) {
          setMovies([]);
          setMatchType("");
          setError(err?.response?.data?.message || "Failed to load movies.");
        }
      } finally {
        if (alive) setLoading(false);
      }
    }

    loadMovies();
    return () => {
      alive = false;
    };
  }, [genre, year, minRating]);

  return (
    <div>
      <h1 className="mb-4 text-3xl font-bold">Movies</h1>
      <div className="mb-4 grid gap-3 md:grid-cols-3">
        <input placeholder="Genre" className="rounded-xl bg-white/10 p-2" value={genre} onChange={(e) => setGenre(e.target.value)} />
        <input placeholder="Year" className="rounded-xl bg-white/10 p-2" value={year} onChange={(e) => setYear(e.target.value)} />
        <input placeholder="Min Rating" className="rounded-xl bg-white/10 p-2" value={minRating} onChange={(e) => setMinRating(e.target.value)} />
      </div>
      {!error && movies.length > 0 && matchType === "related" && (
        <div className="mb-4 rounded-xl border border-yellow-500/30 bg-yellow-500/10 p-3 text-yellow-100">
          Showing related matches (closest genre/year results from database).
        </div>
      )}
      {!error && movies.length > 0 && matchType === "strict" && hasActiveFilters && (
        <div className="mb-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-emerald-100">
          Showing exact matches for selected genre/year filters.
        </div>
      )}
      {error && <div className="mb-4 rounded-xl border border-red-500/40 bg-red-500/10 p-3 text-red-200">{error}</div>}
      {loading ? (
        <LoadingSkeleton rows={6} />
      ) : movies.length === 0 ? (
        <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-slate-300">
          {hasActiveFilters
            ? "No related movies found for this genre/year filter. Try another combination."
            : "No movies available right now."}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{movies.map((m) => <MovieCard key={m._id} movie={m} />)}</div>
      )}
    </div>
  );
}
