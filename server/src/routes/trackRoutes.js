import { Router } from "express";
import { trackSearch, trackTrailer, trackWatchlist } from "../controllers/trackController.js";
import { auth } from "../middleware/auth.js";

const router = Router();

router.post("/watchlist", auth, trackWatchlist);
router.post("/trailer", auth, trackTrailer);
router.post("/search", auth, trackSearch);

export default router;
