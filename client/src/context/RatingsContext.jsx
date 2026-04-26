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
    const formattedId = `tmdb_${String(movieId).replace(/^tmdb[-_]/, "")}`;
    const previous = ratingsByMovieId[formattedId];
    setRatingsByMovieId((prev) => ({ ...prev, [formattedId]: score }));
    try {
      const { data } = await api.post("/ratings", { movieId: formattedId, rating: score });
      setRatingsByMovieId((prev) => ({ ...prev, [formattedId]: data?.yourRating ?? score }));
      return data;
    } catch (err) {
      console.error(err);
      alert("Action failed");
      setRatingsByMovieId((prev) => {
        const next = { ...prev };
        if (typeof previous === "number") next[formattedId] = previous;
        else delete next[formattedId];
        return next;
      });
      throw err;
    }
  }, [ratingsByMovieId]);

  const removeRating = useCallback(async (movieId) => {
    const formattedId = `tmdb_${String(movieId).replace(/^tmdb[-_]/, "")}`;
    const previous = ratingsByMovieId[formattedId];
    setRatingsByMovieId((prev) => {
      const next = { ...prev };
      delete next[formattedId];
      return next;
    });
    try {
      const { data } = await api.delete(`/ratings/${formattedId}`);
      return data;
    } catch (err) {
      console.error(err);
      alert("Action failed");
      setRatingsByMovieId((prev) => ({ ...prev, [formattedId]: previous }));
      throw err;
    }
  }, [ratingsByMovieId]);

  const value = useMemo(
    () => ({
      ratingsByMovieId,
      loadingRatings,
      refreshRatings,
      saveRating,
      removeRating,
    }),
    [ratingsByMovieId, loadingRatings, refreshRatings, saveRating, removeRating]
  );

  return <RatingsContext.Provider value={value}>{children}</RatingsContext.Provider>;
}

export function useRatings() {
  return useContext(RatingsContext);
}
