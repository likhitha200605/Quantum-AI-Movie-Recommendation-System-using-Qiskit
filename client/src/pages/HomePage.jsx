import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Play, Info } from "lucide-react";
import MovieRow from "../components/MovieRow";
import api from "../services/api";
import { Link } from "react-router-dom";

export default function HomePage() {
  const [hero, setHero] = useState(null);

  useEffect(() => {
    async function loadHero() {
      try {
        const { data } = await api.get("/movies/trending");
        if (data?.movies?.length > 0) {
          // Select a movie with a backdrop if possible
          const withBackdrop = data.movies.find(m => m.backdropUrl) || data.movies[0];
          setHero(withBackdrop);
        }
      } catch (err) {
        console.error("Hero failed", err);
      }
    }
    loadHero();
  }, []);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full pb-16">
      {hero && (
        <motion.section 
          initial={{ opacity: 0 }} 
          animate={{ opacity: 1 }} 
          className="relative w-full aspect-[21/9] min-h-[480px] md:h-[45vw] overflow-hidden"
        >
          {/* Backdrop Image */}
          <img 
            src={hero.backdropUrl || hero.posterUrl} 
            className="absolute inset-0 h-full w-full object-cover" 
            alt={hero.title} 
          />
          
          {/* Obsidian Layered Vignettes */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#07080a] via-transparent to-black/20 z-10" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#07080a] via-[#07080a]/50 to-transparent z-10 md:w-3/5" />
          
          {/* Content Overlay */}
          <div className="absolute inset-x-0 bottom-0 z-20 w-full h-full flex flex-col justify-end">
            <div className="max-w-7xl mx-auto w-full px-4 md:px-8 pb-12 md:pb-20">
              <div className="max-w-2xl space-y-4">
                {/* Custom Graphical Title Logo */}
                <h1 className="text-4xl md:text-6xl lg:text-7xl font-black tracking-tighter uppercase bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent drop-shadow-2xl select-none filter contrast-125 font-sans leading-none">
                  {hero.title}
                </h1>
                
                {/* Widescreen Inline Metadata */}
                <div className="flex flex-wrap items-center gap-3 text-xs md:text-sm font-semibold tracking-wide text-slate-300">
                  <span className="text-white bg-indigo-600 px-1.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider shadow-sm">
                    Trending
                  </span>
                  <span>{hero.year || "2026"}</span>
                  <span className="w-1.5 h-1.5 bg-slate-500 rounded-full"></span>
                  <span className="border border-white/25 px-1.5 py-0.2 rounded text-[10px] uppercase font-bold text-white bg-white/5">
                    4K Ultra HD
                  </span>
                  <span className="w-1.5 h-1.5 bg-slate-500 rounded-full"></span>
                  <span>5.1 Audio</span>
                  <span className="w-1.5 h-1.5 bg-slate-500 rounded-full"></span>
                  <span className="text-[#00f2fe] font-extrabold text-xs">Dolby Vision</span>
                </div>
                
                {/* Description */}
                <p className="text-slate-300 text-sm md:text-base leading-relaxed line-clamp-3 max-w-xl font-medium drop-shadow-md">
                  {hero.description}
                </p>
                
                {/* Glassmorphic Play & More Info Buttons */}
                <div className="pt-2 flex flex-wrap gap-4">
                  <Link 
                    to={`/movies/${hero._id}`} 
                    className="flex items-center justify-center gap-2 bg-white text-black px-6 md:px-8 py-3 rounded-lg font-bold hover:bg-white/90 active:scale-95 transition-all shadow-lg text-sm md:text-base duration-200"
                  >
                    <Play size={18} className="fill-black" />
                    Play
                  </Link>
                  <Link 
                    to={`/movies/${hero._id}`} 
                    className="flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 text-white px-6 md:px-8 py-3 rounded-lg font-bold border border-white/10 backdrop-blur-md active:scale-95 transition-all shadow-lg text-sm md:text-base duration-200"
                  >
                    <Info size={18} />
                    More Info
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </motion.section>
      )}
      
      {/* Carriages Container */}
      <div className="max-w-7xl mx-auto px-4 md:px-8 space-y-12 pb-24 relative z-20 -mt-6 md:-mt-12">
        <MovieRow 
          title="Trending Now" 
          endpoint="/movies/trending" 
          cardType="horizontal"
        />
        
        <MovieRow 
          title="Top Rated Movies" 
          endpoint="/movies/top-rated" 
          cardType="vertical"
        />
        
        <MovieRow 
          title="Popular Movies" 
          endpoint="/movies/popular" 
          cardType="vertical"
        />
        
        <MovieRow 
          title="Action Thrills" 
          endpoint="/movies/genre/28" 
          cardType="vertical"
        />
        
        <MovieRow 
          title="Sci-Fi & Fantasy" 
          endpoint="/movies/genre/878" 
          cardType="vertical"
        />
      </div>
    </motion.div>
  );
}
