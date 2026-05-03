import { motion } from "framer-motion";
import { Star, Heart, XCircle } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useRatings } from "../context/RatingsContext";
import { useWatchlist } from "../context/WatchlistContext";
import api from "../services/api";

export default function MovieCard({ movie }) {
  const { user } = useAuth();
  const { ratingsByMovieId, loadingRatings, saveRating, removeRating } = useRatings();
  const { watchlist, addMovieToWatchlist, removeMovieFromWatchlist } = useWatchlist();
  const [averageRating, setAverageRating] = useState(Number(movie?.averageRating || movie?.ratingAvg || movie?.vote_average || 0));
  const [totalRatings, setTotalRatings] = useState(Number(movie?.totalRatings || 0));
  const [hoverRating, setHoverRating] = useState(0);
  const [saving, setSaving] = useState(false);
  
  const movieId = movie?._id || movie?.id || movie?.tmdbId;
  const formattedId = movieId ? `tmdb_${String(movieId).replace(/^tmdb[-_]/, "")}` : null;
  const yourRating = formattedId ? ratingsByMovieId[formattedId] ?? null : null;

  const isAddedToWatchlist = useMemo(() => {
    if (!formattedId) return false;
    return watchlist.some(m => {
      const mId = m._id || m.id || m.tmdbId;
      return `tmdb_${String(mId).replace(/^tmdb[-_]/, "")}` === formattedId;
    });
  }, [watchlist, formattedId]);

  const activeRating = useMemo(() => hoverRating || yourRating || 0, [hoverRating, yourRating]);

  useEffect(() => {
    let alive = true;
    async function loadRating() {
      if (!movie?._id) return;
      try {
        const { data } = await api.get(`/ratings/${movie._id}`);
        if (!alive) return;
        setAverageRating(Number(data?.averageRating || 0));
        setTotalRatings(Number(data?.totalRatings || 0));
      } catch {
        if (!alive) return;
        setAverageRating(Number(movie?.averageRating || movie?.ratingAvg || movie?.vote_average || 0));
        setTotalRatings(Number(movie?.totalRatings || 0));
      }
    }
    loadRating();
    return () => {
      alive = false;
    };
  }, [movie?._id, movie?.ratingAvg]);

  async function rate(score) {
    if (!user) {
      alert("Please login to rate movies.");
      return;
    }
    if (!movie?._id) return;

    const previousRating = ratingsByMovieId[movie._id] ?? null;
    const previousTotal = totalRatings;
    const previousAverage = averageRating;
    const hadPrevious = typeof previousRating === "number" && previousRating > 0;
    const optimisticTotal = hadPrevious ? previousTotal : previousTotal + 1;
    const optimisticAverage = hadPrevious
      ? (previousAverage * previousTotal - previousRating + score) / Math.max(previousTotal, 1)
      : (previousAverage * previousTotal + score) / Math.max(previousTotal + 1, 1);

    setSaving(true);
    setTotalRatings(optimisticTotal);
    setAverageRating(optimisticAverage);

    try {
      const data = await saveRating(formattedId, score);
      setAverageRating(Number(data?.averageRating || optimisticAverage));
      setTotalRatings(Number(data?.totalRatings || optimisticTotal));
    } catch {
      setTotalRatings(previousTotal);
      setAverageRating(previousAverage);
      alert("Unable to save your rating right now.");
    } finally {
      setSaving(false);
      setHoverRating(0);
    }
  }

  const handleToggleWatchlist = async (e) => {
    e.preventDefault();
    if (!user) {
      alert("Please login to manage your watchlist.");
      return;
    }
    if (!formattedId) return;
    
    if (isAddedToWatchlist) {
      await removeMovieFromWatchlist(formattedId);
    } else {
      await addMovieToWatchlist(movie);
    }
  };

  const handleRemoveRating = async (e) => {
    e.preventDefault();
    if (!formattedId) return;
    setSaving(true);
    try {
      await removeRating(formattedId);
      // Wait for rating load to re-sync average rating, or approximate it here
      const previousTotal = totalRatings;
      const previousAverage = averageRating;
      if (previousTotal > 1 && yourRating) {
        setTotalRatings(previousTotal - 1);
        setAverageRating((previousAverage * previousTotal - yourRating) / (previousTotal - 1));
      } else {
        setTotalRatings(0);
        setAverageRating(0);
      }
    } catch {
      // Handled in context
    } finally {
      setSaving(false);
      setHoverRating(0);
    }
  };

  return (
    <motion.div whileHover={{ y: -4, scale: 1.02 }} className="glass overflow-hidden rounded-2xl">
      <img src={movie.posterUrl || movie.backdropUrl} alt={movie.title} className="h-60 w-full object-cover" />
      <div className="space-y-2 p-3">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold leading-tight line-clamp-2">{movie.title}</h3>
          <button 
            onClick={handleToggleWatchlist} 
            className="text-slate-400 hover:text-red-500 transition-colors shrink-0"
            title={isAddedToWatchlist ? "Remove from Watchlist" : "Add to Watchlist"}
          >
            <Heart size={20} className={isAddedToWatchlist ? "fill-red-500 text-red-500" : ""} />
          </button>
        </div>
        <p className="text-xs text-slate-300">{(movie.genres || []).join(" • ")}</p>
        <div className="text-xs text-slate-300">
          <span className="font-medium text-amber-400">★ {averageRating.toFixed(1)}</span>
          <span className="ml-2">({totalRatings} ratings)</span>
        </div>
        <div className="flex items-center gap-1" onMouseLeave={() => setHoverRating(0)}>
          {[1, 2, 3, 4, 5].map((score) => {
            const active = score <= activeRating;
            return (
              <motion.button
                key={score}
                type="button"
                whileHover={{ scale: 1.12 }}
                whileTap={{ scale: 0.95 }}
                transition={{ duration: 0.15 }}
                onMouseEnter={() => setHoverRating(score)}
                onClick={() => rate(score)}
                disabled={saving || loadingRatings}
                className="rounded p-0.5 disabled:opacity-60"
                aria-label={`Rate ${score} stars`}
              >
                <Star size={16} className={active ? "fill-amber-400 text-amber-400" : "text-slate-400"} />
              </motion.button>
            );
          })}
        </div>
        <div className="flex items-center justify-between">
          <p className="text-xs text-slate-300">Your rating: {loadingRatings ? "..." : yourRating ?? "Not rated"}</p>
          {yourRating && (
            <button onClick={handleRemoveRating} disabled={saving} className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1" title="Remove Rating">
              <XCircle size={14} /> Remove
            </button>
          )}
        </div>
        <Link className="inline-block rounded-lg bg-gradient-to-r from-violet-600 to-fuchsia-600 px-3 py-1 text-sm mt-1" to={`/movies/${formattedId}`}>View Details</Link>
      </div>
    </motion.div>
  );
}
