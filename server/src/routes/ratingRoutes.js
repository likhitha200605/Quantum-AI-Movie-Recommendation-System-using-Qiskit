import { Router } from "express";
import { getMovieRatings, getUserRatings, upsertRating } from "../controllers/ratingController.js";
import { auth, optionalAuth } from "../middleware/auth.js";

const router = Router();

router.post("/", auth, upsertRating);
router.get("/user", auth, getUserRatings);
router.get("/:movieId", optionalAuth, getMovieRatings);

export default router;
