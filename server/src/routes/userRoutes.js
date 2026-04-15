import { Router } from "express";
import { me } from "../controllers/userController.js";
import { auth } from "../middleware/auth.js";

const router = Router();
router.get("/me", auth, me);

export default router;
