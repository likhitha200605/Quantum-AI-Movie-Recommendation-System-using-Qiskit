import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import MovieCard from "../components/MovieCard";
import api from "../services/api";
import LoadingSkeleton from "../components/LoadingSkeleton";

export default function HomePage() {
  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    async function run() {
      setLoading(true);
      setError("");
      try {
        const { data } = await api.get("/movies");
        if (alive) setMovies(data || []);
      } catch (err) {
        if (alive) {
          setMovies([]);
          setError(err?.response?.data?.message || "Failed to load homepage movies.");
        }
      } finally {
        if (alive) setLoading(false);
      }
    }
    run();
    return () => {
      alive = false;
    };
  }, []);

  const featured = movies.find((m) => m.featured) || movies[0];
  return (
    <div className="space-y-8">
      {featured && (
        <motion.section initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="relative overflow-hidden rounded-3xl">
          <img src={featured.posterUrl} className="h-[380px] w-full object-cover opacity-60" />
          <div className="absolute inset-0 bg-gradient-to-r from-black to-transparent p-8">
            <h1 className="text-4xl font-bold">{featured.title}</h1>
            <p className="mt-2 max-w-xl text-slate-200">{featured.description}</p>
          </div>
        </motion.section>
      )}
      <section>
        <h2 className="mb-4 text-2xl font-semibold">Trending Movies</h2>
        {error && <div className="mb-3 rounded-xl border border-red-500/40 bg-red-500/10 p-3 text-red-200">{error}</div>}
        {loading ? <LoadingSkeleton rows={4} /> : <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">{movies.map((m) => <MovieCard key={m._id} movie={m} />)}</div>}
      </section>
    </div>
  );
}
