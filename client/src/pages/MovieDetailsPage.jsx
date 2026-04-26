import { useEffect, useState } from "react";
import { Star, Heart, XCircle, Calendar, Globe, Clock } from "lucide-react";
import { useParams } from "react-router-dom";
import ExplainabilityPanel from "../components/ExplainabilityPanel";
import LoadingSkeleton from "../components/LoadingSkeleton";
import { useAuth } from "../context/AuthContext";
import { useRatings } from "../context/RatingsContext";
import { useWatchlist } from "../context/WatchlistContext";
import api from "../services/api";
import { trackTrailerAction } from "../services/tracking";

const LANGUAGE_MAP = {
  te: "Telugu",
  kn: "Kannada",
  hi: "Hindi",
  en: "English",
  ta: "Tamil",
  ml: "Malayalam",
  mr: "Marathi",
  ko: "Korean",
  ja: "Japanese",
  fr: "French",
  es: "Spanish",
  de: "German",
  it: "Italian",
  ru: "Russian",
  zh: "Chinese",
};

export default function MovieDetailsPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const { ratingsByMovieId, loadingRatings, saveRating, removeRating } = useRatings();
  const { watchlist, addMovieToWatchlist, removeMovieFromWatchlist } = useWatchlist();
  const [movie, setMovie] = useState(null);
  const [error, setError] = useState("");
  const [savingWatchlist, setSavingWatchlist] = useState(false);
  const [savingRating, setSavingRating] = useState(false);
  
  const formattedId = id ? `tmdb_${String(id).replace(/^tmdb[-_]/, "")}` : null;
  const myRating = formattedId ? ratingsByMovieId[formattedId] ?? 0 : 0;
  
  const inWatchlist = watchlist.some((item) => {
    const mId = item._id || item.id || item.tmdbId;
    return `tmdb_${String(mId).replace(/^tmdb[-_]/, "")}` === formattedId;
  });

  useEffect(() => {
    let alive = true;
    async function loadDetails() {
      setError("");
      try {
        const { data } = await api.get(`/movies/${formattedId}`);
        if (alive) setMovie(data);
      } catch (err) {
        if (alive) setError(err?.response?.data?.message || "Failed to load movie.");
      }
    }
    if (formattedId) loadDetails();
    return () => {
      alive = false;
    };
  }, [formattedId]);

  async function handleToggleWatchlist() {
    if (!user) return alert("Please log in to manage your watchlist.");
    setSavingWatchlist(true);
    try {
      if (inWatchlist) {
        await removeMovieFromWatchlist(formattedId);
      } else {
        await addMovieToWatchlist(movie || { _id: formattedId });
      }
    } catch {
      // Handled in context
    } finally {
      setSavingWatchlist(false);
    }
  }

  async function submitRating(score) {
    if (!user) return alert("Please log in to rate movies.");
    setSavingRating(true);
    try {
      const data = await saveRating(formattedId, score);
      setMovie((prev) => (prev ? { ...prev, ratingAvg: data?.averageRating || prev.ratingAvg, totalRatings: data?.totalRatings || prev.totalRatings } : prev));
    } catch {
      // Handled in context
    } finally {
      setSavingRating(false);
    }
  }

  async function handleRemoveRating() {
    setSavingRating(true);
    try {
      await removeRating(formattedId);
      setMovie((prev) => {
        if (!prev) return prev;
        const total = Math.max((prev.totalRatings || 1) - 1, 0);
        return { ...prev, totalRatings: total }; // simplistic optimistic approximation
      });
    } catch {
      // Handled
    } finally {
      setSavingRating(false);
    }
  }

  function openTrailer() {
    trackTrailerAction({ userId: user?._id, movieId: formattedId });
    if (movie?.trailerUrl) window.open(movie.trailerUrl, "_blank", "noopener,noreferrer");
  }

  if (!movie && !error) return <LoadingSkeleton rows={6} />;
  if (error) return <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-4 text-red-200">{error}</div>;

  const displayLanguage = LANGUAGE_MAP[movie.language] || movie.language || "Unknown";

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Hero Section */}
      <div className="relative overflow-hidden rounded-3xl bg-slate-900 border border-white/10 shadow-2xl">
        <div 
          className="absolute inset-0 bg-cover bg-center opacity-30" 
          style={{ backgroundImage: `url(${movie.backdropUrl || movie.posterUrl})` }} 
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/60 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-slate-900 via-slate-900/80 to-transparent md:w-3/4" />
        
        <div className="relative z-10 flex flex-col md:flex-row gap-8 p-6 md:p-12 items-center md:items-stretch">
          <img 
            src={movie.posterUrl || movie.backdropUrl} 
            alt={movie.title} 
            className="w-64 shrink-0 rounded-2xl shadow-2xl border border-white/10"
          />
          <div className="flex flex-col justify-end space-y-4 max-w-2xl">
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-white">{movie.title}</h1>
            
            <div className="flex flex-wrap items-center gap-4 text-sm font-medium text-slate-300">
              <span className="flex items-center gap-1.5"><Globe size={16} className="text-violet-400" /> {displayLanguage}</span>
              {movie.release_date && <span className="flex items-center gap-1.5"><Calendar size={16} className="text-violet-400" /> {movie.release_date}</span>}
              {movie.runtime > 0 && <span className="flex items-center gap-1.5"><Clock size={16} className="text-violet-400" /> {movie.runtime} min</span>}
              <span className="flex items-center gap-1 text-amber-400">
                <Star size={16} className="fill-amber-400" /> 
                <span className="text-white">{movie.ratingAvg?.toFixed?.(1) || "N/A"}</span> <span className="text-slate-400 font-normal">/ 5</span>
              </span>
            </div>

            <div className="flex flex-wrap gap-2">
              {(movie.genres || []).map((g) => (
                <span key={g} className="rounded-full bg-white/10 px-3 py-1 text-xs text-white border border-white/5 backdrop-blur-md">
                  {g}
                </span>
              ))}
            </div>

            <p className="text-slate-200 leading-relaxed text-sm md:text-base line-clamp-4 md:line-clamp-none">
              {movie.description || "No overview available."}
            </p>

            <div className="pt-4 flex flex-wrap items-center gap-4">
              <button 
                disabled={savingWatchlist} 
                onClick={handleToggleWatchlist} 
                className={`flex items-center gap-2 rounded-xl px-5 py-2.5 font-semibold transition-all shadow-lg ${
                  inWatchlist 
                    ? "bg-red-500/20 text-red-400 border border-red-500/50 hover:bg-red-500/30" 
                    : "bg-white text-slate-900 hover:bg-slate-200"
                } disabled:opacity-50`}
              >
                <Heart size={20} className={inWatchlist ? "fill-red-400" : ""} />
                {savingWatchlist ? "..." : inWatchlist ? "In Watchlist" : "Add to Watchlist"}
              </button>
              
              {movie.trailerUrl && (
                <button onClick={openTrailer} className="rounded-xl bg-white/10 px-5 py-2.5 font-semibold hover:bg-white/20 transition-all border border-white/5 backdrop-blur-md shadow-lg">
                  Watch Trailer
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-8">
          {/* Cast Section */}
          <section className="space-y-4">
            <h2 className="text-2xl font-bold">Top Cast</h2>
            <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-thin scrollbar-track-slate-800 scrollbar-thumb-slate-600 snap-x">
              {movie.cast && movie.cast.length > 0 ? (
                movie.cast.map((actor, idx) => (
                  <div key={idx} className="shrink-0 w-32 space-y-2 snap-start">
                    <div className="aspect-[2/3] overflow-hidden rounded-xl bg-slate-800 border border-white/5 shadow-md relative">
                      {actor.profileUrl ? (
                        <img src={actor.profileUrl} alt={actor.name} className="h-full w-full object-cover transition-transform hover:scale-105" />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center text-slate-500 bg-slate-800/50">No Image</div>
                      )}
                    </div>
                    <p className="text-sm font-medium leading-tight text-center truncate px-1" title={actor.name}>{actor.name}</p>
                  </div>
                ))
              ) : (
                <p className="text-slate-400">No cast information available.</p>
              )}
            </div>
          </section>

          {movie.trailerUrl && (
            <section className="space-y-4">
              <h2 className="text-2xl font-bold">Trailer</h2>
              <div className="aspect-video overflow-hidden rounded-2xl border border-white/10 shadow-xl bg-slate-900">
                <iframe src={movie.trailerUrl} className="h-full w-full" allowFullScreen title="Trailer" />
              </div>
            </section>
          )}
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          <div className="glass rounded-2xl p-6 space-y-5 border border-white/10">
            <h3 className="text-lg font-semibold">Your Rating</h3>
            
            <div className="flex items-center gap-1.5">
              {[1, 2, 3, 4, 5].map((score) => (
                <button 
                  key={score} 
                  onClick={() => submitRating(score)} 
                  disabled={savingRating}
                  className="rounded-lg p-1.5 transition-transform hover:scale-110 hover:bg-white/5 disabled:opacity-50"
                >
                  <Star size={24} className={score <= myRating ? "fill-amber-400 text-amber-400" : "text-slate-500"} />
                </button>
              ))}
            </div>
            
            <div className="flex items-center justify-between text-sm">
              <p className="text-slate-300">
                {loadingRatings ? "Loading..." : myRating ? `You rated ${myRating} / 5` : "Not rated yet"}
              </p>
              {myRating > 0 && (
                <button 
                  onClick={handleRemoveRating} 
                  disabled={savingRating} 
                  className="flex items-center gap-1 text-red-400 hover:text-red-300 transition-colors disabled:opacity-50"
                >
                  <XCircle size={16} /> Remove
                </button>
              )}
            </div>
          </div>

          <ExplainabilityPanel item={movie} />
        </div>
      </div>
    </div>
  );
}
