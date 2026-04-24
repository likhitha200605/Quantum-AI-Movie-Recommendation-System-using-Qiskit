import { useEffect, useRef, useState } from "react";
import MovieCard from "./MovieCard";
import api from "../services/api";
import LoadingSkeleton from "./LoadingSkeleton";

export default function MovieRow({ title, endpoint, params = {} }) {
  const [movies, setMovies] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  
  const scrollRef = useRef(null);
  const observerRef = useRef(null);
  const endOfRowRef = useRef(null);

  // Initial fetch
  useEffect(() => {
    let alive = true;
    async function fetchInitial() {
      setLoading(true);
      try {
        const { data } = await api.get(endpoint, { params: { ...params, page: 1 } });
        if (!alive) return;
        setMovies(data.movies || []);
        setPage(1);
        setTotalPages(data.totalPages || 1);
      } catch (err) {
        if (alive) setError(err?.response?.data?.message || "Failed to load movies.");
      } finally {
        if (alive) setLoading(false);
      }
    }
    fetchInitial();
    return () => {
      alive = false;
    };
  }, [endpoint]); // only run on mount or endpoint change

  // Infinite scroll observer
  useEffect(() => {
    if (loading) return;
    
    if (observerRef.current) observerRef.current.disconnect();

    observerRef.current = new IntersectionObserver(
      async (entries) => {
        const first = entries[0];
        if (first.isIntersecting && page < totalPages) {
          const nextPage = page + 1;
          setLoading(true);
          try {
            const { data } = await api.get(endpoint, { params: { ...params, page: nextPage } });
            setMovies((prev) => {
              const newMovies = data.movies || [];
              const seen = new Set(prev.map(m => m._id));
              return [...prev, ...newMovies.filter(m => !seen.has(m._id))];
            });
            setPage(nextPage);
            setTotalPages(data.totalPages || totalPages);
          } catch (err) {
            console.error(err);
          } finally {
            setLoading(false);
          }
        }
      },
      { root: scrollRef.current, threshold: 0.1, rootMargin: "400px" }
    );

    if (endOfRowRef.current) {
      observerRef.current.observe(endOfRowRef.current);
    }

    return () => observerRef.current?.disconnect();
  }, [loading, page, totalPages, endpoint]);

  return (
    <div className="mb-10">
      <h2 className="mb-4 text-2xl font-bold">{title}</h2>
      {error && <p className="text-red-400">{error}</p>}
      
      <div className="relative group">
        <div 
          ref={scrollRef}
          className="flex gap-4 overflow-x-auto pb-6 pt-2 px-1 scrollbar-hide snap-x"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {movies.map((movie) => (
            <div key={movie._id} className="w-[240px] flex-none snap-start">
              <MovieCard movie={movie} />
            </div>
          ))}
          
          {loading && (
            <div className="w-[240px] flex-none flex flex-col gap-4">
              <LoadingSkeleton rows={1} />
            </div>
          )}
          
          {/* Sentinel element to trigger next page load */}
          <div ref={endOfRowRef} className="w-4 flex-none" />
        </div>
      </div>
    </div>
  );
}
