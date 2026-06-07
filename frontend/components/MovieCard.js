export default function MovieCard({ movie, onRate }) {
  return (
    <div className="rounded-2xl bg-white p-4 shadow dark:bg-slate-900">
      <h3 className="text-lg font-semibold">{movie.title}</h3>
      <p className="mt-1 text-sm text-slate-500">{movie.genres}</p>
      <p className="mt-2 text-sm">
        Quantum: <strong>{movie.quantum_score.toFixed(3)}</strong> | Classical:{" "}
        <strong>{movie.classical_score.toFixed(3)}</strong>
      </p>
      <p className="mt-2 text-xs text-slate-500">{movie.explainability}</p>
      <div className="mt-3 flex gap-2">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            onClick={() => onRate(movie.movie_id, star)}
            className="rounded bg-primary px-2 py-1 text-xs text-white hover:opacity-90"
          >
            {star}★
          </button>
        ))}
      </div>
    </div>
  );
}
