import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import MovieCard from "./MovieCard";
import api from "../services/api";
import LoadingSkeleton from "./LoadingSkeleton";

export default function MovieRow({ title, endpoint, cardType = "vertical", params = {} }) {
  const [movies, setMovies] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  
  const scrollRef = useRef(null);
  const observerRef = useRef(null);
  const endOfRowRef = useRef(null);

  // Scroll handler for carousel buttons
  const scroll = (direction) => {
    if (scrollRef.current) {
      const { scrollLeft, clientWidth } = scrollRef.current;
      const scrollAmount = clientWidth * 0.75;
      const targetScroll = direction === "left" 
        ? scrollLeft - scrollAmount 
        : scrollLeft + scrollAmount;
      
      scrollRef.current.scrollTo({
        left: targetScroll,
        behavior: "smooth"
      });
    }
  };

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
    <div className="mb-12 row-gradient relative z-10">
      <h2 className="mb-5 text-xl md:text-2xl font-extrabold text-white tracking-tight">{title}</h2>
      {error && <p className="text-red-400 text-sm">{error}</p>}
      
      <div className="relative group/row">
        {/* Left Floating Arrow */}
        <button 
          onClick={() => scroll("left")}
          className="absolute left-2 top-1/2 -translate-y-1/2 z-40 w-10 h-10 flex items-center justify-center rounded-full bg-black/60 hover:bg-black/90 text-white border border-white/10 backdrop-blur-md opacity-0 group-hover/row:opacity-100 transition-all duration-300 shadow-xl focus:outline-none hover:scale-105 active:scale-95"
          aria-label="Scroll Left"
        >
          <ChevronLeft size={20} />
        </button>

        {/* Right Floating Arrow */}
        <button 
          onClick={() => scroll("right")}
          className="absolute right-2 top-1/2 -translate-y-1/2 z-40 w-10 h-10 flex items-center justify-center rounded-full bg-black/60 hover:bg-black/90 text-white border border-white/10 backdrop-blur-md opacity-0 group-hover/row:opacity-100 transition-all duration-300 shadow-xl focus:outline-none hover:scale-105 active:scale-95"
          aria-label="Scroll Right"
        >
          <ChevronRight size={20} />
        </button>

        <div 
          ref={scrollRef}
          className="flex gap-4 overflow-x-auto pb-6 pt-2 px-1 scrollbar-hide snap-x"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {movies.map((movie) => (
            <div 
              key={movie._id} 
              className={`flex-none snap-start ${
                cardType === "horizontal" ? "w-[260px] md:w-[320px]" : "w-[150px] md:w-[200px]"
              }`}
            >
              <MovieCard movie={movie} cardType={cardType} />
            </div>
          ))}
          
          {loading && (
            <div className={`flex-none ${
              cardType === "horizontal" ? "w-[260px] md:w-[320px]" : "w-[150px] md:w-[200px]"
            }`}>
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
