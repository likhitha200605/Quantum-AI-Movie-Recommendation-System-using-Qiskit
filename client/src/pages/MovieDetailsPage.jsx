import { useEffect, useState } from "react";
import { Star } from "lucide-react";
import { useParams } from "react-router-dom";
import ExplainabilityPanel from "../components/ExplainabilityPanel";
import LoadingSkeleton from "../components/LoadingSkeleton";
import { useAuth } from "../context/AuthContext";
import { useRatings } from "../context/RatingsContext";
import { useWatchlist } from "../context/WatchlistContext";
import api from "../services/api";
import { trackTrailerAction } from "../services/tracking";

export default function MovieDetailsPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const { ratingsByMovieId, loadingRatings, saveRating } = useRatings();
  const { watchlist, addMovieToWatchlist } = useWatchlist();
  const [movie, setMovie] = useState(null);
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
      await addMovieToWatchlist(id);
      alert("Added to watchlist");
    } catch (err) {
      alert(err?.response?.data?.message || "Failed to update watchlist");
    } finally {
      setSavingWatchlist(false);
    }
  }

  async function submitRating(score) {
    try {
      const data = await saveRating(id, score);
      setMovie((prev) => (prev ? { ...prev, ratingAvg: data?.averageRating || prev.ratingAvg } : prev));
    } catch {
      alert("Failed to submit rating");
    }
  }

  function openTrailer() {
    trackTrailerAction({ userId: user?._id, movieId: id });
    if (movie?.trailerUrl) window.open(movie.trailerUrl, "_blank", "noopener,noreferrer");
  }

  const myRating = ratingsByMovieId[id] ?? 0;
  const inWatchlist = watchlist.some((item) => String(item._id) === String(id));

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
        {loadingRatings && <p className="text-xs text-slate-300">Loading your rating...</p>}
        <button disabled={savingWatchlist} onClick={addToWatchlist} className="rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-4 py-2 disabled:opacity-60">
          {savingWatchlist ? "Updating..." : inWatchlist ? "In Watchlist" : "Add to Watchlist"}
        </button>
        <button onClick={openTrailer} className="rounded-xl bg-white/10 px-4 py-2">
          Watch Trailer
        </button>
        <div className="aspect-video overflow-hidden rounded-2xl">
          <iframe src={movie.trailerUrl} className="h-full w-full" allowFullScreen title="Trailer" />
        </div>
        <ExplainabilityPanel item={movie} />
      </div>
    </div>
  );
}
