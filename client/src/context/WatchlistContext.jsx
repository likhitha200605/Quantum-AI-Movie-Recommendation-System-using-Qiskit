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
      const { data } = await api.get("/movies/watchlist");
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

  const addMovieToWatchlist = useCallback(async (movieId) => {
    const { data } = await api.post("/movies/watchlist", { movieId });
    setWatchlist(data?.watchlist || []);
    trackWatchlistAction({ userId: user?._id, movieId });
    return data;
  }, [user?._id]);

  const value = useMemo(
    () => ({
      watchlist,
      loadingWatchlist,
      refreshWatchlist,
      addMovieToWatchlist,
    }),
    [watchlist, loadingWatchlist, refreshWatchlist, addMovieToWatchlist]
  );

  return <WatchlistContext.Provider value={value}>{children}</WatchlistContext.Provider>;
}

export function useWatchlist() {
  return useContext(WatchlistContext);
}
