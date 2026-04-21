import { motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import MovieCard from "../components/MovieCard";
import api from "../services/api";
import LoadingSkeleton from "../components/LoadingSkeleton";

const PAGE_LIMIT = 8;

export default function HomePage() {
  const [movies, setMovies] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const sentinelRef = useRef(null);
  const observerRef = useRef(null);

  useEffect(() => {
    let alive = true;
    async function run() {
      setLoading(true);
      setError("");
      try {
        const { data } = await api.get("/movies", { params: { page: 1, limit: PAGE_LIMIT } });
        if (!alive) return;
        const firstPageMovies = data?.movies || [];
        const pages = Number(data?.totalPages || 1);
        setMovies(firstPageMovies);
        setPage(1);
        setTotalPages(pages);
        setHasMore(1 < pages);
      } catch (err) {
        if (!alive) return;
        setMovies([]);
        setError(err?.response?.data?.message || "Failed to load homepage movies.");
      } finally {
        if (alive) setLoading(false);
      }
    }
    run();
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (!sentinelRef.current) return;
    if (observerRef.current) observerRef.current.disconnect();

    observerRef.current = new IntersectionObserver(
      async (entries) => {
        const first = entries[0];
        if (!first?.isIntersecting || loading || loadingMore || !hasMore) return;
        const nextPage = page + 1;
        if (nextPage > totalPages) {
          setHasMore(false);
          return;
        }

        setLoadingMore(true);
        try {
          const { data } = await api.get("/movies", { params: { page: nextPage, limit: PAGE_LIMIT } });
          const nextMovies = data?.movies || [];
          setMovies((prev) => [...prev, ...nextMovies]);
          setPage(nextPage);
          setHasMore(nextPage < Number(data?.totalPages || totalPages));
        } catch (err) {
          setError(err?.response?.data?.message || "Failed to load more movies.");
        } finally {
          setLoadingMore(false);
        }
      },
      { root: null, rootMargin: "300px", threshold: 0 }
    );

    observerRef.current.observe(sentinelRef.current);
    return () => observerRef.current?.disconnect();
  }, [hasMore, loading, loadingMore, page, totalPages]);

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
        {loading ? (
          <LoadingSkeleton rows={4} />
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">{movies.map((m) => <MovieCard key={m._id} movie={m} />)}</div>
            {loadingMore && <LoadingSkeleton rows={2} />}
            <div ref={sentinelRef} className="h-4" />
          </>
        )}
      </section>
    </div>
  );
}
