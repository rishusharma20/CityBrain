import express from "express";
import {
  getAdminDashboard,
  getAllCitizens,
  getAllOfficers,
  toggleBlockUser,
  monitorComplaints,
  assignComplaintToOfficer,
  getSystemStatistics,
  monitorDepartmentalPerformance,
} from "../controllers/adminController.js";
import { protect } from "../middleware/authMiddleware.js";
import { authorizeRoles } from "../middleware/roleMiddleware.js";

const router = express.Router();

// Route Protection: Admin Only
router.use(protect);
router.use(authorizeRoles("Admin"));

router.get("/dashboard", getAdminDashboard);
router.get("/users", getAllCitizens);
router.get("/officers", getAllOfficers);
router.get("/complaints", monitorComplaints);
router.get("/statistics", getSystemStatistics);
router.get("/performance", monitorDepartmentalPerformance);

router.put("/block-user/:id", toggleBlockUser);
router.put("/assign-officer/:id", assignComplaintToOfficer);

export default router;
