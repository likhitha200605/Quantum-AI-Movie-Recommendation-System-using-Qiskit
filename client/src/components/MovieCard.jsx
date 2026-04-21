import { motion } from "framer-motion";
import { Star } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";

export default function MovieCard({ movie }) {
  const { user } = useAuth();
  const [averageRating, setAverageRating] = useState(Number(movie?.ratingAvg || 0));
  const [totalRatings, setTotalRatings] = useState(0);
  const [yourRating, setYourRating] = useState(null);
  const [hoverRating, setHoverRating] = useState(0);
  const [saving, setSaving] = useState(false);

  const activeRating = useMemo(() => hoverRating || yourRating || 0, [hoverRating, yourRating]);

  useEffect(() => {
    let alive = true;
    async function loadRating() {
      if (!movie?._id || String(movie._id).startsWith("tmdb-")) return;
      try {
        const { data } = await api.get(`/ratings/${movie._id}`);
        if (!alive) return;
        setAverageRating(Number(data?.averageRating || 0));
        setTotalRatings(Number(data?.totalRatings || 0));
        setYourRating(data?.yourRating ?? null);
      } catch {
        if (!alive) return;
        setAverageRating(Number(movie?.ratingAvg || 0));
        setTotalRatings(0);
        setYourRating(null);
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
    if (!movie?._id || String(movie._id).startsWith("tmdb-")) return;

    const previousRating = yourRating;
    const previousTotal = totalRatings;
    const previousAverage = averageRating;
    const hadPrevious = typeof previousRating === "number" && previousRating > 0;
    const optimisticTotal = hadPrevious ? previousTotal : previousTotal + 1;
    const optimisticAverage = hadPrevious
      ? (previousAverage * previousTotal - previousRating + score) / Math.max(previousTotal, 1)
      : (previousAverage * previousTotal + score) / Math.max(previousTotal + 1, 1);

    setSaving(true);
    setYourRating(score);
    setTotalRatings(optimisticTotal);
    setAverageRating(optimisticAverage);

    try {
      const { data } = await api.post("/ratings", { movieId: movie._id, rating: score });
      setAverageRating(Number(data?.averageRating || optimisticAverage));
      setTotalRatings(Number(data?.totalRatings || optimisticTotal));
      setYourRating(data?.yourRating ?? score);
    } catch {
      setYourRating(previousRating);
      setTotalRatings(previousTotal);
      setAverageRating(previousAverage);
      alert("Unable to save your rating right now.");
    } finally {
      setSaving(false);
      setHoverRating(0);
    }
  }

  return (
    <motion.div whileHover={{ y: -4, scale: 1.02 }} className="glass overflow-hidden rounded-2xl">
      <img src={movie.posterUrl} alt={movie.title} className="h-60 w-full object-cover" />
      <div className="space-y-2 p-3">
        <h3 className="font-semibold">{movie.title}</h3>
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
                disabled={saving}
                className="rounded p-0.5 disabled:opacity-60"
                aria-label={`Rate ${score} stars`}
              >
                <Star size={16} className={active ? "fill-amber-400 text-amber-400" : "text-slate-400"} />
              </motion.button>
            );
          })}
        </div>
        <p className="text-xs text-slate-300">Your rating: {yourRating ?? "Not rated yet"}</p>
        <Link className="inline-block rounded-lg bg-gradient-to-r from-violet-600 to-fuchsia-600 px-3 py-1 text-sm" to={`/movies/${movie._id}`}>View Details</Link>
      </div>
    </motion.div>
  );
}
