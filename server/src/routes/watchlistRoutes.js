import { Router } from "express";
import { addToWatchlist, getWatchlist, removeFromWatchlist } from "../controllers/movieController.js";
import { auth } from "../middleware/auth.js";

const router = Router();

router.get("/", auth, getWatchlist);
router.post("/", auth, addToWatchlist);
router.delete("/:movieId", auth, removeFromWatchlist);

export default router;
