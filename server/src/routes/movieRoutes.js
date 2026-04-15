import { Router } from "express";
import { listMovies, movieDetails, rateMovie, suggestions, toggleWatchlist } from "../controllers/movieController.js";
import { auth } from "../middleware/auth.js";

const router = Router();

router.get("/", listMovies);
router.get("/suggestions", suggestions);
router.get("/:id", movieDetails);
router.post("/rate", auth, rateMovie);
router.post("/watchlist", auth, toggleWatchlist);

export default router;
