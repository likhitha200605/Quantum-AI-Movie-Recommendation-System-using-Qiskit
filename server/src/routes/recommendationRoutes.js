import { Router } from "express";
import { recommendations } from "../controllers/recommendationController.js";
import { auth } from "../middleware/auth.js";

const router = Router();
router.get("/", auth, recommendations);

export default router;
