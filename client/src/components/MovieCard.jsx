import { motion } from "framer-motion";
import { Link } from "react-router-dom";

export default function MovieCard({ movie }) {
  return (
    <motion.div whileHover={{ y: -4, scale: 1.02 }} className="glass overflow-hidden rounded-2xl">
      <img src={movie.posterUrl} alt={movie.title} className="h-60 w-full object-cover" />
      <div className="space-y-2 p-3">
        <h3 className="font-semibold">{movie.title}</h3>
        <p className="text-xs text-slate-300">{(movie.genres || []).join(" • ")}</p>
        <Link className="inline-block rounded-lg bg-gradient-to-r from-violet-600 to-fuchsia-600 px-3 py-1 text-sm" to={`/movies/${movie._id}`}>View Details</Link>
      </div>
    </motion.div>
  );
}
