import { useEffect, useState } from "react";
import { Star } from "lucide-react";
import { useParams } from "react-router-dom";
import ExplainabilityPanel from "../components/ExplainabilityPanel";
import LoadingSkeleton from "../components/LoadingSkeleton";
import api from "../services/api";

export default function MovieDetailsPage() {
  const { id } = useParams();
  const [movie, setMovie] = useState(null);
  const [myRating, setMyRating] = useState(0);
  const [error, setError] = useState("");
  const [savingWatchlist, setSavingWatchlist] = useState(false);

  useEffect(() => {
    let alive = true;
    async function loadDetails() {
      setError("");
      try {
        const { data } = await api.get(`/movies/${id}`);
        if (alive) setMovie(data);
      } catch (err) {
        if (alive) setError(err?.response?.data?.message || "Failed to load movie.");
      }
    }
    loadDetails();
    return () => {
      alive = false;
    };
  }, [id]);

  async function addToWatchlist() {
    setSavingWatchlist(true);
    try {
      await api.post("/movies/watchlist", { movieId: id });
      alert("Added to watchlist");
    } catch (err) {
      alert(err?.response?.data?.message || "Failed to update watchlist");
    } finally {
      setSavingWatchlist(false);
    }
  }

  async function submitRating(score) {
    setMyRating(score);
    try {
      const { data } = await api.post("/movies/rate", { movieId: id, score });
      setMovie((prev) => (prev ? { ...prev, ratingAvg: data.avg } : prev));
    } catch {
      setMyRating(0);
      alert("Failed to submit rating");
    }
  }

  if (!movie && !error) return <LoadingSkeleton rows={4} />;
  if (error) return <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-3 text-red-200">{error}</div>;

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <img src={movie.posterUrl} className="rounded-2xl" />
      <div className="space-y-3">
        <h1 className="text-3xl font-bold">{movie.title}</h1>
        <p>{movie.description}</p>
        <p>Cast: {(movie.cast || []).join(", ")}</p>
        <p>Average Rating: {movie.ratingAvg?.toFixed?.(1) || "N/A"} / 5</p>
        <div className="flex items-center gap-2">
          {[1, 2, 3, 4, 5].map((score) => (
            <button key={score} onClick={() => submitRating(score)} className="rounded p-1 hover:bg-white/10">
              <Star size={18} className={score <= myRating ? "fill-yellow-400 text-yellow-400" : "text-slate-300"} />
            </button>
          ))}
        </div>
        <button disabled={savingWatchlist} onClick={addToWatchlist} className="rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-4 py-2 disabled:opacity-60">
          {savingWatchlist ? "Updating..." : "Add to Watchlist"}
        </button>
        <div className="aspect-video overflow-hidden rounded-2xl">
          <iframe src={movie.trailerUrl} className="h-full w-full" allowFullScreen title="Trailer" />
        </div>
        <ExplainabilityPanel item={movie} />
      </div>
    </div>
  );
}
