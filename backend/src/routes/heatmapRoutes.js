import express from "express";
import {
  getComplaintDensity,
  getWardHeatmap,
  getHotspots,
} from "../controllers/heatmapController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

// Heatmap APIs protected for general authenticated access
router.use(protect);

router.get("/complaint-density", getComplaintDensity);
router.get("/wards", getWardHeatmap);
router.get("/hotspots", getHotspots);

export default router;
