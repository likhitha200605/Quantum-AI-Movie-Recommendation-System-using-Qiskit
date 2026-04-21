import { Router } from "express";
import { userDashboard } from "../controllers/dashboardController.js";
import { auth } from "../middleware/auth.js";

const router = Router();

router.get("/dashboard/:userId", auth, userDashboard);

export default router;
