import { useEffect, useState } from "react";
import MovieCard from "../components/MovieCard";
import api from "../services/api";

export default function MoviesPage() {
  const [movies, setMovies] = useState([]);
  const [genre, setGenre] = useState("");
  const [year, setYear] = useState("");
  const [minRating, setMinRating] = useState("0");

  useEffect(() => {
    const params = new URLSearchParams({ genre, year, minRating }).toString();
    api.get(`/movies?${params}`).then(({ data }) => setMovies(data));
  }, [genre, year, minRating]);

  return (
    <div>
      <h1 className="mb-4 text-3xl font-bold">Movies</h1>
      <div className="mb-4 grid gap-3 md:grid-cols-3">
        <input placeholder="Genre" className="rounded-xl bg-white/10 p-2" value={genre} onChange={(e) => setGenre(e.target.value)} />
        <input placeholder="Year" className="rounded-xl bg-white/10 p-2" value={year} onChange={(e) => setYear(e.target.value)} />
        <input placeholder="Min Rating" className="rounded-xl bg-white/10 p-2" value={minRating} onChange={(e) => setMinRating(e.target.value)} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{movies.map((m) => <MovieCard key={m._id} movie={m} />)}</div>
    </div>
  );
}
