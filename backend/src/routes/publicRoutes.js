import express from "express";
import {
  getPublicResolvedCount,
  getPublicPendingCount,
  getPublicWardStats,
  getPublicTransparencyReport,
} from "../controllers/publicController.js";

const router = express.Router();

// Public routes do NOT require protect middleware
router.get("/resolved", getPublicResolvedCount);
router.get("/pending", getPublicPendingCount);
router.get("/ward-stats", getPublicWardStats);
router.get("/transparency-report", getPublicTransparencyReport);

export default router;
