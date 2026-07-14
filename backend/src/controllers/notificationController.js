import Notification from "../models/Notification.js";

// =========================================================================
// 1. Get All Notifications for User
// =========================================================================
// GET /api/notifications
// Private Access (All Roles)
export const getMyNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({ recipient: req.user._id })
      .sort({ createdAt: -1 })
      .populate("sender", "fullName role");

    res.status(200).json({
      success: true,
      count: notifications.length,
      data: notifications,
    });
  } catch (error) {
    console.error("Get Notifications Error:", error);
    res.status(500).json({
      success: false,
      message: "Internal Server Error while retrieving notifications.",
    });
  }
};

// =========================================================================
// 2. Get Unread Notifications
// =========================================================================
// GET /api/notifications/unread
// Private Access (All Roles)
export const getMyUnreadNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({
      recipient: req.user._id,
      isRead: false,
    })
      .sort({ createdAt: -1 })
      .populate("sender", "fullName role");

    res.status(200).json({
      success: true,
      count: notifications.length,
      data: notifications,
    });
  } catch (error) {
    console.error("Get Unread Notifications Error:", error);
    res.status(500).json({
      success: false,
      message: "Internal Server Error while retrieving unread notifications.",
    });
  }
};

// =========================================================================
// 3. Mark Notification as Read
// =========================================================================
// PUT /api/notifications/:id/read
// Private Access (All Roles)
export const markNotificationRead = async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, recipient: req.user._id },
      { isRead: true },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: "Notification not found or access denied.",
      });
    }

    res.status(200).json({
      success: true,
      message: "Notification marked as read.",
      data: notification,
    });
  } catch (error) {
    console.error("Mark Read Error:", error);
    res.status(500).json({
      success: false,
      message: "Internal Server Error while updating notification.",
    });
  }
};

// =========================================================================
// 4. Mark All Notifications as Read
// =========================================================================
// PUT /api/notifications/read-all
// Private Access (All Roles)
export const markAllRead = async (req, res) => {
  try {
    const result = await Notification.updateMany(
      { recipient: req.user._id, isRead: false },
      { isRead: true }
    );

    res.status(200).json({
      success: true,
      message: `Marked ${result.modifiedCount} notifications as read.`,
    });
  } catch (error) {
    console.error("Mark All Read Error:", error);
    res.status(500).json({
      success: false,
      message: "Internal Server Error while updating notifications.",
    });
  }
};

// =========================================================================
// 5. Delete Specific Notification
// =========================================================================
// DELETE /api/notifications/:id
// Private Access (All Roles)
export const deleteNotification = async (req, res) => {
  try {
    const notification = await Notification.findOneAndDelete({
      _id: req.params.id,
      recipient: req.user._id,
    });

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: "Notification not found or access denied.",
      });
    }

    res.status(200).json({
      success: true,
      message: "Notification deleted successfully.",
    });
  } catch (error) {
    console.error("Delete Notification Error:", error);
    res.status(500).json({
      success: false,
      message: "Internal Server Error while deleting notification.",
    });
  }
};

// =========================================================================
// 6. Delete All Notifications
// =========================================================================
// DELETE /api/notifications
// Private Access (All Roles)
export const deleteAllNotifications = async (req, res) => {
  try {
    const result = await Notification.deleteMany({ recipient: req.user._id });

    res.status(200).json({
      success: true,
      message: `Cleared ${result.deletedCount} notifications.`,
    });
  } catch (error) {
    console.error("Clear Notifications Error:", error);
    res.status(500).json({
      success: false,
      message: "Internal Server Error while clearing notifications.",
    });
  }
};
