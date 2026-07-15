// ============================================================================
// CityBrains — Complaint Routes
// Maps all 9 complaint API endpoints (the 10th is in userComplaintRoutes.js).
//
// IMPORTANT: Static routes (/status, /category, /duplicates, /priority) are
// registered BEFORE the /:id param route to prevent Express from treating
// those path segments as an ObjectId.
// ============================================================================

import { Router } from "express";
import { protect } from "../middleware/authMiddleware.js";
import { authorizeRoles } from "../middleware/roleMiddleware.js";
import {
  validateCreateComplaint,
  validateUpdateComplaint,
  validateQueryParams,
} from "../validators/complaintValidator.js";
import {
  createComplaint,
  getAllComplaints,
  getComplaintById,
  updateComplaint,
  deleteComplaint,
  getComplaintsByStatus,
  getComplaintsByCategory,
  getDuplicateComplaints,
  getComplaintsByPriority,
} from "../controllers/complaintController.js";

const router = Router();

// ---------------------------------------------------------------------------
// POST /api/complaints — Create a new complaint
// Access: Citizen only
// ---------------------------------------------------------------------------
router.post(
  "/",
  protect,
  authorizeRoles("Citizen"),
  validateCreateComplaint,
  createComplaint
);

// ---------------------------------------------------------------------------
// GET /api/complaints — Get all complaints (paginated, searchable)
// Access: Admin, Officer
// ---------------------------------------------------------------------------
router.get(
  "/",
  protect,
  authorizeRoles("Admin", "Officer"),
  validateQueryParams,
  getAllComplaints
);

// ---------------------------------------------------------------------------
// STATIC ROUTES — Must come BEFORE /:id to avoid path conflicts
// ---------------------------------------------------------------------------

// GET /api/complaints/status?status=PENDING
router.get(
  "/status",
  protect,
  authorizeRoles("Admin", "Officer"),
  validateQueryParams,
  getComplaintsByStatus
);

// GET /api/complaints/category?category=Potholes
router.get(
  "/category",
  protect,
  authorizeRoles("Admin", "Officer"),
  validateQueryParams,
  getComplaintsByCategory
);

// GET /api/complaints/duplicates
router.get(
  "/duplicates",
  protect,
  authorizeRoles("Admin", "Officer"),
  getDuplicateComplaints
);

// GET /api/complaints/priority?priority=CRITICAL
router.get(
  "/priority",
  protect,
  authorizeRoles("Admin", "Officer"),
  validateQueryParams,
  getComplaintsByPriority
);

// ---------------------------------------------------------------------------
// DYNAMIC ROUTES — /:id parameter
// ---------------------------------------------------------------------------

// GET /api/complaints/:id — Get complaint details
// Access: Any authenticated user (citizens scoped to own)
router.get(
  "/:id",
  protect,
  getComplaintById
);

// PUT /api/complaints/:id — Update complaint
// Access: Officer, Admin
router.put(
  "/:id",
  protect,
  authorizeRoles("Officer", "Admin"),
  validateUpdateComplaint,
  updateComplaint
);

// DELETE /api/complaints/:id — Delete complaint
// Access: Admin only
router.delete(
  "/:id",
  protect,
  authorizeRoles("Admin"),
  deleteComplaint
);

export default router;
