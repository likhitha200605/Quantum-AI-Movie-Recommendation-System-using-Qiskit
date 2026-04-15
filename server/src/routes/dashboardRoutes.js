import { Router } from "express";
import { dashboard } from "../controllers/dashboardController.js";
import { auth } from "../middleware/auth.js";

const router = Router();
router.get("/", auth, dashboard);

export default router;
