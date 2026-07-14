import express from "express";
import {
  getComplaintBreakdown,
  getOfficerAnalytics,
  getMonthlyTrend,
  getResponseTimeAnalytics,
  getDepartmentAnalytics,
} from "../controllers/analyticsController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

// Protect all routes
router.use(protect);

router.get("/complaints", getComplaintBreakdown);
router.get("/officers", getOfficerAnalytics);
router.get("/monthly", getMonthlyTrend);
router.get("/response-time", getResponseTimeAnalytics);
router.get("/departments", getDepartmentAnalytics);

export default router;
