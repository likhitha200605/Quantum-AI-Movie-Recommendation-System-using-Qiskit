import { Router } from "express";
import { getMovieRatings, getUserRatings, upsertRating, removeRating } from "../controllers/ratingController.js";
import { auth, optionalAuth } from "../middleware/auth.js";

const router = Router();

router.post("/", auth, upsertRating);
router.get("/user", auth, getUserRatings);
router.get("/:movieId", optionalAuth, getMovieRatings);
router.delete("/:movieId", auth, removeRating);

export default router;
