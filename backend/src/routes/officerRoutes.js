import express from "express";
import {
  getOfficerDashboard,
  getAssignedComplaints,
  getOfficerStatistics,
  getOfficerHistory,
  acceptComplaint,
  rejectComplaint,
  updateComplaintStatus,
  addRemarks,
  markComplaintCompleted,
  getEscalatedComplaints,
} from "../controllers/officerController.js";
import { protect } from "../middleware/authMiddleware.js";
import { authorizeRoles } from "../middleware/roleMiddleware.js";

const router = express.Router();

// Protect all routes
router.use(protect);
router.use(authorizeRoles("Officer", "Admin"));

router.get("/dashboard", getOfficerDashboard);
router.get("/assigned", getAssignedComplaints);
router.get("/statistics", getOfficerStatistics);
router.get("/history", getOfficerHistory);
router.get("/escalated", getEscalatedComplaints);

router.put("/accept/:id", acceptComplaint);
router.put("/reject/:id", rejectComplaint);
router.put("/status/:id", updateComplaintStatus);
router.put("/remarks/:id", addRemarks);
router.put("/complete/:id", markComplaintCompleted);

export default router;
