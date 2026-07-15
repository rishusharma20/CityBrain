// ============================================================================
// CityBrains — User Complaint Routes
// Separate router for citizen-scoped complaint endpoints.
// Mounted on /api/user to keep the /api/complaints router clean.
// ============================================================================

import { Router } from "express";
import { protect } from "../middleware/authMiddleware.js";
import { authorizeRoles } from "../middleware/roleMiddleware.js";
import { validateQueryParams } from "../validators/complaintValidator.js";
import { getUserComplaints } from "../controllers/complaintController.js";

const router = Router();

// ---------------------------------------------------------------------------
// GET /api/user/complaints — User's complaint history
// Access: Citizen only
// ---------------------------------------------------------------------------
router.get(
  "/complaints",
  protect,
  authorizeRoles("Citizen"),
  validateQueryParams,
  getUserComplaints
);

export default router;
