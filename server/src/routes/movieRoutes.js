import { Router } from "express";
import {
  addToWatchlist,
  getWatchlist,
  listMovies,
  movieDetails,
  rateMovie,
  removeFromWatchlist,
  searchMovies,
  suggestions,
} from "../controllers/movieController.js";
import { auth } from "../middleware/auth.js";

const router = Router();

router.get("/", listMovies);
router.get("/search", searchMovies);
router.get("/suggestions", suggestions);
router.get("/watchlist", auth, getWatchlist);
router.get("/:id", movieDetails);
router.post("/rate", auth, rateMovie);
router.post("/watchlist", auth, addToWatchlist);
router.delete("/watchlist", auth, removeFromWatchlist);

export default router;
