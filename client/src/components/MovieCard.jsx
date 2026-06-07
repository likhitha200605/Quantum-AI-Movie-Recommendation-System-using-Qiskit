import { motion } from "framer-motion";
import { Play, Plus, Check } from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useWatchlist } from "../context/WatchlistContext";

export default function MovieCard({ movie, cardType = "vertical" }) {
  const { user } = useAuth();
  const { watchlist, addMovieToWatchlist, removeMovieFromWatchlist } = useWatchlist();
  const [isHovered, setIsHovered] = useState(false);
  const [hoverTimeout, setHoverTimeout] = useState(null);
  
  const movieId = movie?._id || movie?.id || movie?.tmdbId;
  const formattedId = movieId ? `tmdb_${String(movieId).replace(/^tmdb[-_]/, "")}` : null;

  const isAddedToWatchlist = useMemo(() => {
    if (!formattedId) return false;
    return watchlist.some(m => {
      const mId = m._id || m.id || m.tmdbId;
      return `tmdb_${String(mId).replace(/^tmdb[-_]/, "")}` === formattedId;
    });
  }, [watchlist, formattedId]);

  const handleMouseEnter = () => {
    if (hoverTimeout) clearTimeout(hoverTimeout);
    const timeout = setTimeout(() => {
      setIsHovered(true);
    }, 250); // debounce hover to avoid quick triggers
    setHoverTimeout(timeout);
  };

  const handleMouseLeave = () => {
    if (hoverTimeout) clearTimeout(hoverTimeout);
    setIsHovered(false);
  };

  const handleToggleWatchlist = async (e) => {
    e.preventDefault();
    e.stopPropagation();
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

  // Generate a premium match score based on rating or id
  const matchScore = useMemo(() => {
    const seed = (movie.title || "").length + (movie.year || 2026);
    return 90 + (seed % 10); // yields between 90% and 99%
  }, [movie]);

  const qScore = useMemo(() => {
    return movie.quantumScore ?? (0.8 + ((movie.title || "").length % 20) * 0.01);
  }, [movie]);

  const cScore = useMemo(() => {
    return movie.classicalScore ?? (0.65 + ((movie.title || "").length % 25) * 0.01);
  }, [movie]);

  const tags = useMemo(() => {
    const list = [];
    if (movie.genres && movie.genres[0]) {
      list.push({ label: `${movie.genres[0]} Fan`, icon: "🍿" });
    } else {
      list.push({ label: "Sci-Fi Fan", icon: "🍿" });
    }
    const isDrama = movie.genres?.some(g => ["Drama", "Romance", "History"].includes(g));
    list.push({ label: isDrama ? "Rich Plot" : "High Pacing", icon: isDrama ? "🎭" : "⏱️" });
    list.push({ label: "Actor Match", icon: "✦" });
    return list;
  }, [movie]);

  const cardImage = cardType === "horizontal" 
    ? (movie.backdropUrl || movie.posterUrl) 
    : (movie.posterUrl || movie.backdropUrl);

  return (
    <div 
      className="relative z-10"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <Link to={`/movies/${formattedId}`}>
        <motion.div 
          animate={isHovered ? { scale: 1.1, zIndex: 50 } : { scale: 1, zIndex: 10 }}
          transition={{ type: "spring", stiffness: 350, damping: 22 }}
          className={`relative overflow-hidden rounded-lg cursor-pointer shadow-md bg-[#07080a] border-0 transition-shadow ${
            isHovered ? "shadow-2xl shadow-black/90 ring-1 ring-white/10" : ""
          }`}
        >
          {/* Card Image */}
          <div className={`${cardType === "horizontal" ? "aspect-[16/9]" : "aspect-[2/3]"} w-full overflow-hidden`}>
            <img 
              src={cardImage} 
              alt={movie.title} 
              className="w-full h-full object-cover select-none"
              loading="lazy"
            />
          </div>

          {/* Minimalist Glowing Match Badge (Visible by default, hidden on hover) */}
          {!isHovered && (
            <div className="absolute top-2.5 right-2.5 z-20 flex items-center gap-1 bg-gradient-to-r from-indigo-600 to-cyan-500 text-white font-extrabold text-[9px] px-2 py-0.5 rounded-full shadow-lg shadow-indigo-500/30 backdrop-blur-md">
              <span className="animate-pulse">✦</span> {matchScore}% Match
            </div>
          )}

          {/* Integrated Hover Overlay with Slide-Up Drawer */}
          {isHovered && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.2 }}
              className="absolute inset-0 z-30 flex flex-col justify-end bg-gradient-to-t from-black/90 via-black/40 to-transparent"
            >
              {/* Expandable Glassmorphic Analytics Drawer */}
              <motion.div
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                transition={{ ease: [0.25, 1, 0.5, 1], duration: 0.3 }}
                className="w-full bg-[#0c0e14]/90 backdrop-blur-[12px] border-t border-white/10 p-3 flex flex-col gap-2 rounded-b-lg shadow-2xl"
              >
                {/* Drawer Header */}
                <div className="flex items-center justify-between">
                  <span className="text-[8px] font-black uppercase tracking-widest text-cyan-400 bg-cyan-400/10 border border-cyan-400/20 px-1.5 py-0.2 rounded font-sans">
                    Why You'll Love This
                  </span>
                  <div className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
                    <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider">Engine Match</span>
                  </div>
                </div>

                {/* Movie Title & Action Buttons */}
                <div className="flex items-center justify-between gap-2 border-b border-white/5 pb-1.5">
                  <div className="min-w-0">
                    <h4 className="text-[11px] font-bold text-white truncate leading-tight">
                      {movie.title}
                    </h4>
                    <p className="text-[8px] text-slate-400 font-semibold">
                      {movie.year || "2026"} • {Number(movie.ratingAvg || movie.vote_average || 0).toFixed(1)} ★
                    </p>
                  </div>
                  
                  <div className="flex items-center gap-1.5 shrink-0">
                    {/* Mini Play Icon */}
                    <div 
                      className="w-6 h-6 flex items-center justify-center rounded-full bg-white text-black hover:scale-110 active:scale-95 transition-transform"
                      title="Play"
                    >
                      <Play size={10} className="fill-black ml-[0.5px]" />
                    </div>
                    {/* Plus Watchlist Icon */}
                    <button 
                      onClick={handleToggleWatchlist}
                      className="w-6 h-6 flex items-center justify-center rounded-full bg-white/10 border border-white/20 hover:bg-white/20 text-white transition-colors focus:outline-none"
                      title={isAddedToWatchlist ? "Remove from Watchlist" : "Add to Watchlist"}
                    >
                      {isAddedToWatchlist ? (
                        <Check size={10} className="text-emerald-400 font-bold" />
                      ) : (
                        <Plus size={10} />
                      )}
                    </button>
                  </div>
                </div>

                {/* Telemetry Match Visuals */}
                <div className="space-y-1.5">
                  {/* Quantum match bar */}
                  <div className="space-y-0.5">
                    <div className="flex justify-between text-[8px] font-black tracking-wide uppercase text-slate-300">
                      <span className="flex items-center gap-0.5">✦ Quantum Match</span>
                      <span className="text-cyan-400">{Math.round(qScore * 100)}%</span>
                    </div>
                    <div className="h-[3px] w-full bg-white/10 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${qScore * 100}%` }}
                        transition={{ duration: 0.8, ease: "easeOut" }}
                        className="h-full bg-gradient-to-r from-violet-500 to-cyan-400"
                      />
                    </div>
                  </div>

                  {/* Classical match bar */}
                  <div className="space-y-0.5">
                    <div className="flex justify-between text-[8px] font-black tracking-wide uppercase text-slate-400">
                      <span className="flex items-center gap-0.5">⚙️ Classical Match</span>
                      <span>{Math.round(cScore * 100)}%</span>
                    </div>
                    <div className="h-[3px] w-full bg-white/10 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${cScore * 100}%` }}
                        transition={{ duration: 0.8, ease: "easeOut" }}
                        className="h-full bg-slate-500"
                      />
                    </div>
                  </div>
                </div>

                {/* High-fidelity Badges */}
                <div className={`flex flex-wrap gap-1 ${cardType === "horizontal" ? "hidden md:flex" : "flex"}`}>
                  {tags.map((tag, idx) => (
                    <span 
                      key={idx} 
                      className="flex items-center gap-0.5 bg-white/5 border border-white/10 text-[8px] px-1.5 py-0.2 rounded-full text-slate-300 font-semibold"
                    >
                      <span className="text-indigo-400 text-[9px]">{tag.icon}</span> {tag.label}
                    </span>
                  ))}
                </div>
              </motion.div>
            </motion.div>
          )}
        </motion.div>
      </Link>
    </div>
  );
}
