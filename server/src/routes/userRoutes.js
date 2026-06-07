import { Router } from "express";
import { me, updateProfile } from "../controllers/userController.js";
import { auth } from "../middleware/auth.js";

const router = Router();
router.get("/me", auth, me);
router.put("/me", auth, updateProfile);

export default router;
