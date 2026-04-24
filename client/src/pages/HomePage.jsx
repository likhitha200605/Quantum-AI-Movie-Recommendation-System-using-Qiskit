import { useEffect, useState } from "react";
import { motion } from "framer-motion";
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
          setHero(data.movies[0]);
        }
      } catch (err) {
        console.error("Hero failed", err);
      }
    }
    loadHero();
  }, []);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8 pb-12">
      {hero && (
        <motion.section initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="relative overflow-hidden rounded-3xl mb-8">
          <img src={hero.backdropUrl || hero.posterUrl} className="h-[50vh] w-full object-cover opacity-60" alt={hero.title} />
          <div className="absolute inset-0 bg-gradient-to-r from-black via-black/60 to-transparent p-12 flex flex-col justify-end">
            <h1 className="text-5xl font-extrabold text-white mb-4 drop-shadow-md">{hero.title}</h1>
            <p className="max-w-2xl text-slate-200 text-lg line-clamp-3 mb-6 drop-shadow">{hero.description}</p>
            <div className="flex gap-4">
              <Link to={`/movies/${hero._id}`} className="bg-white text-black px-8 py-3 rounded-xl font-bold hover:bg-slate-200 transition">
                Play Now
              </Link>
            </div>
          </div>
        </motion.section>
      )}
      
      <MovieRow 
        title="Trending Now" 
        endpoint="/movies/trending" 
      />
      
      <MovieRow 
        title="Top Rated Movies" 
        endpoint="/movies/top-rated" 
      />
      
      <MovieRow 
        title="Popular Movies" 
        endpoint="/movies/popular" 
      />
      
      <MovieRow 
        title="Action Thrills" 
        endpoint="/movies/genre/28" // 28 is Action in TMDB
      />
      
      <MovieRow 
        title="Sci-Fi & Fantasy" 
        endpoint="/movies/genre/878" // 878 is Sci-Fi in TMDB
      />
    </motion.div>
  );
}
