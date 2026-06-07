import { Router } from "express";
import { recommendations } from "../controllers/recommendationController.js";
import { optionalAuth } from "../middleware/auth.js";

const router = Router();
router.get("/", optionalAuth, recommendations);

export default router;
