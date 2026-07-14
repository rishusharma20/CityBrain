import express from "express";
import {
  getTopOfficers,
  getTopWards,
  getBestDepartments,
} from "../controllers/leaderboardController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

// Leaderboard APIs protected for general authenticated access
router.use(protect);

router.get("/officers", getTopOfficers);
router.get("/wards", getTopWards);
router.get("/departments", getBestDepartments);

export default router;
