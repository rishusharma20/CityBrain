import express from "express";
import {
  getMyNotifications,
  getMyUnreadNotifications,
  markNotificationRead,
  markAllRead,
  deleteNotification,
  deleteAllNotifications,
} from "../controllers/notificationController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

// All notification routes are protected (Any logged in user role)
router.use(protect);

router.get("/", getMyNotifications);
router.get("/unread", getMyUnreadNotifications);
router.put("/read-all", markAllRead);
router.put("/:id/read", markNotificationRead);
router.delete("/", deleteAllNotifications);
router.delete("/:id", deleteNotification);

export default router;
