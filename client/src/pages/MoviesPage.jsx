import { motion } from "framer-motion";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import LoadingSkeleton from "../components/LoadingSkeleton";
import MovieCard from "../components/MovieCard";
import api from "../services/api";

const PAGE_LIMIT = 8;
const SECTION_GENRES = ["Action", "Sci-Fi", "Drama", "Comedy"];

export default function MoviesPage() {
  const [movies, setMovies] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [selectedGenre, setSelectedGenre] = useState("All");
  const [genreSections, setGenreSections] = useState({});
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadingSections, setLoadingSections] = useState(true);
  const [error, setError] = useState("");
  const observerRef = useRef(null);
  const sentinelRef = useRef(null);
  const fetchedPageKeysRef = useRef(new Set());

  const genreParam = useMemo(() => (selectedGenre === "All" ? "" : selectedGenre), [selectedGenre]);

  const fetchPage = useCallback(
    async (targetPage, append = true) => {
      const pageKey = `${genreParam || "all"}:${targetPage}`;
      if (fetchedPageKeysRef.current.has(pageKey)) return;

      fetchedPageKeysRef.current.add(pageKey);
      if (targetPage === 1) setLoadingInitial(true);
      else setLoadingMore(true);

      try {
        const { data } = await api.get("/movies", {
          params: {
            page: targetPage,
            limit: PAGE_LIMIT,
            ...(genreParam ? { genre: genreParam } : {}),
          },
        });

        const incomingMovies = data?.movies || [];
        const currentPage = Number(data?.currentPage || targetPage);
        const pages = Number(data?.totalPages || 1);

        setMovies((prev) => (append ? [...prev, ...incomingMovies] : incomingMovies));
        setPage(currentPage);
        setTotalPages(pages);
        setHasMore(currentPage < pages);
      } catch (err) {
        setError(err?.response?.data?.message || "Failed to load movies.");
      } finally {
        setLoadingInitial(false);
        setLoadingMore(false);
      }
    },
    [genreParam]
  );

  useEffect(() => {
    fetchedPageKeysRef.current = new Set();
    setMovies([]);
    setError("");
    setPage(1);
    setTotalPages(1);
    setHasMore(true);
    fetchPage(1, false);
  }, [fetchPage, selectedGenre]);

  useEffect(() => {
    let alive = true;

    async function loadSections() {
      setLoadingSections(true);
      try {
        const responses = await Promise.all(
          SECTION_GENRES.map((genre) =>
            api.get("/movies", {
              params: { page: 1, limit: 10, genre },
            })
          )
        );
        if (!alive) return;

        const nextSections = SECTION_GENRES.reduce((acc, genre, idx) => {
          acc[genre] = responses[idx]?.data?.movies || [];
          return acc;
        }, {});
        setGenreSections(nextSections);
      } catch {
        if (!alive) return;
        setGenreSections({});
      } finally {
        if (alive) setLoadingSections(false);
      }
    }

    loadSections();
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (!sentinelRef.current) return;
    if (observerRef.current) observerRef.current.disconnect();

    observerRef.current = new IntersectionObserver(
      (entries) => {
        const first = entries[0];
        if (!first?.isIntersecting) return;
        if (loadingMore || loadingInitial || !hasMore) return;
        fetchPage(page + 1, true);
      },
      { root: null, rootMargin: "300px", threshold: 0 }
    );

    observerRef.current.observe(sentinelRef.current);
    return () => observerRef.current?.disconnect();
  }, [fetchPage, hasMore, loadingInitial, loadingMore, page]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="mb-4 text-3xl font-bold">Movies</h1>
        <div className="flex flex-wrap items-center gap-2">
          {["All", ...SECTION_GENRES].map((genre) => (
            <button
              key={genre}
              type="button"
              onClick={() => setSelectedGenre(genre)}
              className={`rounded-full px-4 py-1.5 text-sm ${
                selectedGenre === genre ? "bg-violet-600 text-white" : "bg-white/10 text-slate-200"
              }`}
            >
              {genre}
            </button>
          ))}
        </div>
      </div>

      {error && <div className="mb-4 rounded-xl border border-red-500/40 bg-red-500/10 p-3 text-red-200">{error}</div>}

      <section className="space-y-3">
        <h2 className="text-2xl font-semibold">{selectedGenre === "All" ? "Trending" : `${selectedGenre} Picks`}</h2>
        {loadingInitial ? (
          <LoadingSkeleton rows={4} />
        ) : movies.length === 0 ? (
          <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-slate-300">No movies found for this section.</div>
        ) : (
          <motion.div initial={{ opacity: 0.95 }} animate={{ opacity: 1 }} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {movies.map((m) => (
              <MovieCard key={m._id} movie={m} />
            ))}
          </motion.div>
        )}
        {loadingMore && <LoadingSkeleton rows={2} />}
        <div ref={sentinelRef} className="h-4" />
        {!hasMore && movies.length > 0 && <p className="text-sm text-slate-400">You have reached the end.</p>}
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Browse by Genre</h2>
        {loadingSections ? (
          <LoadingSkeleton rows={3} />
        ) : (
          SECTION_GENRES.map((genre) => (
            <div key={genre} className="space-y-2">
              <h3 className="text-lg font-medium">{genre}</h3>
              <div className="flex gap-4 overflow-x-auto pb-2">
                {(genreSections[genre] || []).map((movie) => (
                  <div key={`${genre}-${movie._id}`} className="min-w-[240px] flex-shrink-0">
                    <MovieCard movie={movie} />
                  </div>
                ))}
                {(genreSections[genre] || []).length === 0 && <p className="text-sm text-slate-400">No movies yet.</p>}
              </div>
            </div>
          ))
        )}
      </section>
    </div>
  );
}
