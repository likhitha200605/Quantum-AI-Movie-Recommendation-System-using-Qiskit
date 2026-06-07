import { Router } from "express";
import {
  popularMovies,
  topRatedMovies,
  trendingMovies,
  genreMovies,
  searchMovies,
  movieDetails,
  rateMovie,
  genresList,
} from "../controllers/movieController.js";
import { auth } from "../middleware/auth.js";

const router = Router();

// TMDB Native Endpoints
router.get("/trending", trendingMovies);
router.get("/popular", popularMovies);
router.get("/top-rated", topRatedMovies);
router.get("/genre/list", genresList);
router.get("/genre/:id", genreMovies);
router.get("/search", searchMovies);

// Movie details & interactions
router.get("/:id", movieDetails);
router.post("/rate", auth, rateMovie);

export default router;
