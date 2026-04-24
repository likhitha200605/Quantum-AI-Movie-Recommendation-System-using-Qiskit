import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import api from "../services/api";
import MovieRow from "../components/MovieRow";

export default function MoviesPage() {
  const [genres, setGenres] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchGenres() {
      try {
        const { data } = await api.get("/movies/genre/list");
        setGenres(data);
      } catch (err) {
        console.error("Failed to load genres", err);
      } finally {
        setLoading(false);
      }
    }
    fetchGenres();
  }, []);

  if (loading) {
    return <div className="p-8 text-center">Loading Genres...</div>;
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6 pb-12">
      <h1 className="text-3xl font-bold mb-8">Browse by Genre</h1>
      
      {genres.map((g) => (
        <MovieRow 
          key={g.id}
          title={g.name} 
          endpoint={`/movies/genre/${g.id}`} 
        />
      ))}
    </motion.div>
  );
}
