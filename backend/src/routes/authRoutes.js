import express from "express";
import {
  registerUser,
  loginUser,
  getUserProfile,
  updateUserProfile,
} from "../controllers/authController.js";
import { protect } from "../middleware/authMiddleware.js";
import { authorizeRoles } from "../middleware/roleMiddleware.js";

const router = express.Router();

// ==========================================
// Public Routes
// ==========================================
router.post("/register", registerUser);
router.post("/login", loginUser);

// ==========================================
// Protected Routes (Required Authentication)
// ==========================================
router.get("/profile", protect, getUserProfile);
router.put("/profile", protect, updateUserProfile);

// ==========================================
// Role Protected Test Routes
// ==========================================
router.get(
  "/officer-dashboard",
  protect,
  authorizeRoles("Officer", "Admin"),
  (req, res) => {
    res.status(200).json({
      success: true,
      message: `Welcome to the Officer Dashboard, ${req.user.fullName}. Department: ${req.user.department}`,
    });
  }
);

router.get(
  "/admin-dashboard",
  protect,
  authorizeRoles("Admin"),
  (req, res) => {
    res.status(200).json({
      success: true,
      message: `Welcome to the Admin Dashboard, Admin ${req.user.fullName}.`,
    });
  }
);

export default router;