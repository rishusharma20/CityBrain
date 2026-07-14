import express from "express";
import {
  getOfficerDashboard,
  getAssignedComplaints,
  getComplaintDetails,
  acceptComplaint,
  rejectComplaint,
  updateComplaintStatus,
  addRemarks,
  uploadResolutionImage,
  markComplaintCompleted,
  getOfficerHistory,
  getOfficerStatistics,
  getPendingComplaints,
  getResolvedComplaints,
  getEscalatedComplaints,
} from "../controllers/officerController.js";
import { protect } from "../middleware/authMiddleware.js";
import { authorizeRoles } from "../middleware/roleMiddleware.js";

const router = express.Router();

// =========================================================================
// Protect all routes: Require Authentication & Role authorization (Officer or Admin)
// =========================================================================
router.use(protect);
router.use(authorizeRoles("Officer", "Admin"));

// =========================================================================
// Route Definitions
// =========================================================================

// Dashboard & Analytics
router.get("/dashboard", getOfficerDashboard);
router.get("/statistics", getOfficerStatistics);
router.get("/history", getOfficerHistory);

// List Complaints by Status & Assignment
router.get("/assigned", getAssignedComplaints);
router.get("/pending", getPendingComplaints);
router.get("/resolved", getResolvedComplaints);
router.get("/escalated", getEscalatedComplaints);

// Individual Complaint Operations
router.get("/complaints/:id", getComplaintDetails);
router.put("/accept/:id", acceptComplaint);
router.put("/reject/:id", rejectComplaint);
router.put("/status/:id", updateComplaintStatus);
router.put("/remarks/:id", addRemarks);
router.put("/resolution-image/:id", uploadResolutionImage);
router.put("/complete/:id", markComplaintCompleted);

export default router;
