import Notification from "../models/Notification.js";

/**
 * Decoupled utility to create notifications in the background.
 * Failures in notification delivery will be logged but will not disrupt core transactions.
 * 
 * @param {Object} params
 * @param {string} params.recipient - ObjectId of the user receiving the notification
 * @param {string} [params.sender] - ObjectId of the user initiating it (optional)
 * @param {string} params.type - Enum: Info, Status_Update, Assignment, Escalation, Completion
 * @param {string} params.title - Title text
 * @param {string} params.message - Body text
 * @param {string} [params.complaint] - Linked complaint ID (optional)
 */
export const sendSystemNotification = async ({
  recipient,
  sender = null,
  type = "Info",
  title,
  message,
  complaint = null,
}) => {
  try {
    const notification = await Notification.create({
      recipient,
      sender,
      type,
      title,
      message,
      complaint,
    });
    console.log(`🔔 Notification Created: [Type: ${type}] recipient: ${recipient}`);
    return notification;
  } catch (error) {
    // Log error, do not throw to prevent disrupting core operations
    console.error("❌ Failed to create notification:", error.message);
    return null;
  }
};
