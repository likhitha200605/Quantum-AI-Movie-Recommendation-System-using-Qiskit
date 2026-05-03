import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useAuth } from "./AuthContext";
import api from "../services/api";
import { trackWatchlistAction } from "../services/tracking";

const WatchlistContext = createContext(null);

export function WatchlistProvider({ children }) {
  const { user } = useAuth();
  const [watchlist, setWatchlist] = useState([]);
  const [loadingWatchlist, setLoadingWatchlist] = useState(false);

  const refreshWatchlist = useCallback(async () => {
    if (!user) {
      setWatchlist([]);
      return;
    }

    setLoadingWatchlist(true);
    try {
      const { data } = await api.get("/watchlist");
      setWatchlist(data?.watchlist || []);
    } catch {
      setWatchlist([]);
    } finally {
      setLoadingWatchlist(false);
    }
  }, [user]);

  useEffect(() => {
    refreshWatchlist();
  }, [refreshWatchlist]);

  const addMovieToWatchlist = useCallback(async (movie) => {
    const movieId = movie._id || movie.tmdbId || movie.id;
    const formattedId = `tmdb_${String(movieId).replace(/^tmdb[-_]/, "")}`;
    console.log("Sending watchlist:", formattedId);
    
    setWatchlist((prev) => {
      if (prev.some(m => m._id === formattedId || m.id === formattedId)) return prev;
      return [...prev, { ...movie, _id: formattedId }];
    });

    try {
      await api.post("/watchlist", { movieId: formattedId });
      trackWatchlistAction({ userId: user?._id, movieId: formattedId });
    } catch (err) {
      console.error(err);
      alert("Action failed");
      refreshWatchlist();
      throw err;
    }
  }, [user?._id, refreshWatchlist]);

  const removeMovieFromWatchlist = useCallback(async (movieId) => {
    const formattedId = `tmdb_${String(movieId).replace(/^tmdb[-_]/, "")}`;

    try {
      await api.delete(`/watchlist/${formattedId}`);
      
      setWatchlist((prev) => prev.filter(m => {
        const mId = m._id || m.id || m.tmdbId;
        const mFormattedId = `tmdb_${String(mId).replace(/^tmdb[-_]/, "")}`;
        return mFormattedId !== formattedId;
      }));
    } catch (err) {
      console.error(err);
      alert("Action failed");
      refreshWatchlist();
      throw err;
    }
  }, [refreshWatchlist]);

  const value = useMemo(
    () => ({
      watchlist,
      loadingWatchlist,
      refreshWatchlist,
      addMovieToWatchlist,
      removeMovieFromWatchlist,
    }),
    [watchlist, loadingWatchlist, refreshWatchlist, addMovieToWatchlist, removeMovieFromWatchlist]
  );

  return <WatchlistContext.Provider value={value}>{children}</WatchlistContext.Provider>;
}

export function useWatchlist() {
  return useContext(WatchlistContext);
}
