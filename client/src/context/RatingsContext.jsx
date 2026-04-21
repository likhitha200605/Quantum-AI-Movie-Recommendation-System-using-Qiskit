import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useAuth } from "./AuthContext";
import api from "../services/api";

const RatingsContext = createContext(null);

export function RatingsProvider({ children }) {
  const { user } = useAuth();
  const [ratingsByMovieId, setRatingsByMovieId] = useState({});
  const [loadingRatings, setLoadingRatings] = useState(false);

  const refreshRatings = useCallback(async () => {
    if (!user) {
      setRatingsByMovieId({});
      return;
    }

    setLoadingRatings(true);
    try {
      const { data } = await api.get("/ratings/user");
      setRatingsByMovieId(data?.ratings || {});
    } catch {
      setRatingsByMovieId({});
    } finally {
      setLoadingRatings(false);
    }
  }, [user]);

  useEffect(() => {
    refreshRatings();
  }, [refreshRatings]);

  const saveRating = useCallback(async (movieId, score) => {
    const previous = ratingsByMovieId[movieId];
    setRatingsByMovieId((prev) => ({ ...prev, [movieId]: score }));
    try {
      const { data } = await api.post("/ratings", { movieId, rating: score });
      setRatingsByMovieId((prev) => ({ ...prev, [movieId]: data?.yourRating ?? score }));
      return data;
    } catch (err) {
      setRatingsByMovieId((prev) => {
        const next = { ...prev };
        if (typeof previous === "number") next[movieId] = previous;
        else delete next[movieId];
        return next;
      });
      throw err;
    }
  }, [ratingsByMovieId]);

  const value = useMemo(
    () => ({
      ratingsByMovieId,
      loadingRatings,
      refreshRatings,
      saveRating,
    }),
    [ratingsByMovieId, loadingRatings, refreshRatings, saveRating]
  );

  return <RatingsContext.Provider value={value}>{children}</RatingsContext.Provider>;
}

export function useRatings() {
  return useContext(RatingsContext);
}
