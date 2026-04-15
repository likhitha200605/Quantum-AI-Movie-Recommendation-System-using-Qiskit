import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import ExplainabilityPanel from "../components/ExplainabilityPanel";
import api from "../services/api";

export default function MovieDetailsPage() {
  const { id } = useParams();
  const [movie, setMovie] = useState(null);

  useEffect(() => {
    api.get(`/movies/${id}`).then(({ data }) => setMovie(data));
  }, [id]);

  async function addToWatchlist() {
    await api.post("/movies/watchlist", { movieId: id });
    alert("Watchlist updated");
  }

  if (!movie) return <div>Loading...</div>;
  return (
    <div className="grid gap-6 md:grid-cols-2">
      <img src={movie.posterUrl} className="rounded-2xl" />
      <div className="space-y-3">
        <h1 className="text-3xl font-bold">{movie.title}</h1>
        <p>{movie.description}</p>
        <p>Cast: {(movie.cast || []).join(", ")}</p>
        <p>Rating: {movie.ratingAvg?.toFixed?.(1) || "N/A"}</p>
        <button onClick={addToWatchlist} className="rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-4 py-2">Add to Watchlist</button>
        <div className="aspect-video overflow-hidden rounded-2xl">
          <iframe src={movie.trailerUrl} className="h-full w-full" allowFullScreen title="Trailer" />
        </div>
        <ExplainabilityPanel item={movie} />
      </div>
    </div>
  );
}
