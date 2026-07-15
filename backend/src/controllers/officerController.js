import Complaint from "../models/Complaint.js";
import { sendSystemNotification } from "../utils/notificationHelper.js";

// Helper: Construct scope query filter for the officer
const getOfficerScopeFilter = (user) => {
  return {
    $or: [
      { assignedOfficer: user._id },
      {
        department: getDeptMapping(user.department),
        wardNumber: parseInt(user.ward) || 0,
        assignedOfficer: null,
      },
    ],
  };
};

// Map User department values to new Complaint department values
const getDeptMapping = (userDept) => {
  const map = {
    Garbage: "Sanitation",
    Road: "Roads",
    Streetlight: "Electrical",
    "Water Supply": "Water",
    Drainage: "Water",
  };
  return map[userDept] || userDept;
};

// Active (non-terminal) statuses
const ACTIVE_STATUSES = ["PENDING", "ASSIGNED", "ACCEPTED", "IN_PROGRESS", "UNDER_REVIEW", "ESCALATED"];
const RESOLVED_STATUSES = ["RESOLVED", "COMPLETED", "CLOSED"];

// =========================================================================
// 1. Officer Dashboard
// =========================================================================
// GET /api/officer/dashboard
export const getOfficerDashboard = async (req, res) => {
  try {
    const scopeFilter = getOfficerScopeFilter(req.user);

    const statsResult = await Complaint.aggregate([
      { $match: scopeFilter },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          pending: {
            $sum: {
              $cond: [
                { $in: ["$status", ACTIVE_STATUSES] },
                1,
                0,
              ],
            },
          },
          resolved: {
            $sum: { $cond: [{ $in: ["$status", RESOLVED_STATUSES] }, 1, 0] },
          },
          escalated: {
            $sum: { $cond: [{ $eq: ["$status", "ESCALATED"] }, 1, 0] },
          },
        },
      },
    ]);

    const latestComplaints = await Complaint.find(scopeFilter)
      .sort({ createdAt: -1 })
      .limit(5)
      .populate("createdBy", "fullName email phone");

    const stats = statsResult[0] || {
      total: 0,
      pending: 0,
      resolved: 0,
      escalated: 0,
    };

    res.status(200).json({
      success: true,
      data: {
        summary: {
          totalAssigned: stats.total,
          pending: stats.pending,
          resolved: stats.resolved,
          escalated: stats.escalated,
        },
        latestComplaints,
      },
    });
  } catch (error) {
    console.error("Dashboard Error:", error);
    res.status(500).json({
      success: false,
      message: "Internal Server Error loading dashboard.",
    });
  }
};

// =========================================================================
// 2. View Assigned Complaints
// =========================================================================
// GET /api/officer/assigned
export const getAssignedComplaints = async (req, res) => {
  try {
    const complaints = await Complaint.find({ assignedOfficer: req.user._id })
      .sort({ updatedAt: -1 })
      .populate("createdBy", "fullName email phone");

    res.status(200).json({
      success: true,
      count: complaints.length,
      data: complaints,
    });
  } catch (error) {
    console.error("Get Assigned Complaints Error:", error);
    res.status(500).json({
      success: false,
      message: "Internal Server Error retrieving assigned complaints.",
    });
  }
};

// =========================================================================
// 3. Officer Statistics & SLA Analytics
// =========================================================================
// GET /api/officer/statistics
export const getOfficerStatistics = async (req, res) => {
  try {
    const officerId = req.user._id;

    const complaints = await Complaint.find({
      assignedOfficer: officerId,
    });

    let totalAssigned = complaints.length;
    let resolvedCount = 0;
    let pendingCount = 0;
    let escalatedCount = 0;
    let onTimeResolutions = 0;
    let totalResolutionTimeHours = 0;

    complaints.forEach((comp) => {
      if (RESOLVED_STATUSES.includes(comp.status)) {
        resolvedCount++;
        if (comp.resolvedAt && comp.slaDeadline) {
          if (new Date(comp.resolvedAt) <= new Date(comp.slaDeadline)) {
            onTimeResolutions++;
          }
          const durationMs = new Date(comp.resolvedAt) - new Date(comp.createdAt);
          totalResolutionTimeHours += durationMs / (1000 * 60 * 60);
        }
      } else if (comp.status === "ESCALATED") {
        escalatedCount++;
      } else if (ACTIVE_STATUSES.includes(comp.status)) {
        pendingCount++;
        if (comp.slaDeadline && new Date() > new Date(comp.slaDeadline)) {
          escalatedCount++;
        }
      }
    });

    const slaComplianceRate =
      resolvedCount > 0 ? Math.round((onTimeResolutions / resolvedCount) * 100) : 100;
    
    const avgResolutionTimeHours =
      resolvedCount > 0 ? parseFloat((totalResolutionTimeHours / resolvedCount).toFixed(2)) : 0;

    res.status(200).json({
      success: true,
      data: {
        totalAssigned,
        resolved: resolvedCount,
        pending: pendingCount,
        escalated: escalatedCount,
        slaAnalytics: {
          slaComplianceRatePercentage: slaComplianceRate,
          onTimeResolutions,
          breachedResolutions: resolvedCount - onTimeResolutions,
          avgResolutionTimeHours,
        },
      },
    });
  } catch (error) {
    console.error("Get Officer Statistics Error:", error);
    res.status(500).json({
      success: false,
      message: "Internal Server Error calculating statistics.",
    });
  }
};

// =========================================================================
// 4. View Officer History
// =========================================================================
// GET /api/officer/history
export const getOfficerHistory = async (req, res) => {
  try {
    const complaints = await Complaint.find({
      assignedOfficer: req.user._id,
      status: { $in: RESOLVED_STATUSES },
    })
      .sort({ resolvedAt: -1, updatedAt: -1 })
      .populate("createdBy", "fullName email phone");

    res.status(200).json({
      success: true,
      count: complaints.length,
      data: complaints,
    });
  } catch (error) {
    console.error("Get Officer History Error:", error);
    res.status(500).json({
      success: false,
      message: "Internal Server Error retrieving history.",
    });
  }
};

// =========================================================================
// 5. Accept Complaint
// =========================================================================
// PUT /api/officer/accept/:id
export const acceptComplaint = async (req, res) => {
  try {
    const complaint = await Complaint.findById(req.params.id);

    if (!complaint) {
      return res.status(404).json({
        success: false,
        message: "Complaint not found.",
      });
    }

    if (complaint.assignedOfficer && complaint.assignedOfficer.toString() !== req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: "This complaint is already accepted by another officer.",
      });
    }

    complaint.assignedOfficer = req.user._id;
    complaint.status = "ACCEPTED";
    complaint.statusHistory.push({
      status: "ACCEPTED",
      changedBy: req.user._id,
      remarks: `Complaint accepted by Officer ${req.user.fullName}.`,
    });

    await complaint.save();

    await sendSystemNotification({
      recipient: complaint.createdBy,
      sender: req.user._id,
      type: "Assignment",
      title: "Complaint Claimed",
      message: `Your complaint "${complaint.title}" has been accepted by Officer ${req.user.fullName}.`,
      complaint: complaint._id,
    });

    res.status(200).json({
      success: true,
      message: "Complaint accepted successfully.",
      data: complaint,
    });
  } catch (error) {
    console.error("Accept Complaint Error:", error);
    res.status(500).json({
      success: false,
      message: "Internal Server Error accepting complaint.",
    });
  }
};

// =========================================================================
// 6. Reject Complaint
// =========================================================================
// PUT /api/officer/reject/:id
export const rejectComplaint = async (req, res) => {
  try {
    const { reason } = req.body;

    if (!reason) {
      return res.status(400).json({
        success: false,
        message: "A rejection reason is required.",
      });
    }

    const complaint = await Complaint.findById(req.params.id);

    if (!complaint) {
      return res.status(404).json({
        success: false,
        message: "Complaint not found.",
      });
    }

    const isAssigned =
      complaint.assignedOfficer &&
      complaint.assignedOfficer.toString() === req.user._id.toString();

    if (!isAssigned) {
      return res.status(403).json({
        success: false,
        message: "Forbidden: Action not authorized.",
      });
    }

    complaint.assignedOfficer = null;
    complaint.status = "PENDING";
    complaint.statusHistory.push({
      status: "PENDING",
      changedBy: req.user._id,
      remarks: `Rejected by Officer ${req.user.fullName}. Reason: ${reason}`,
    });

    await complaint.save();

    await sendSystemNotification({
      recipient: complaint.createdBy,
      sender: req.user._id,
      type: "Status_Update",
      title: "Complaint Reverted",
      message: `Your complaint "${complaint.title}" has been returned to the department queue.`,
      complaint: complaint._id,
    });

    res.status(200).json({
      success: true,
      message: "Complaint rejected and returned to queue.",
      data: complaint,
    });
  } catch (error) {
    console.error("Reject Complaint Error:", error);
    res.status(500).json({
      success: false,
      message: "Internal Server Error rejecting complaint.",
    });
  }
};

// =========================================================================
// 7. Update Status
// =========================================================================
// PUT /api/officer/status/:id
export const updateComplaintStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = ["ACCEPTED", "IN_PROGRESS", "UNDER_REVIEW", "RESOLVED", "ESCALATED"];

    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Choose from: ${validStatuses.join(", ")}`,
      });
    }

    const complaint = await Complaint.findById(req.params.id);

    if (!complaint) {
      return res.status(404).json({
        success: false,
        message: "Complaint not found.",
      });
    }

    if (
      !complaint.assignedOfficer ||
      complaint.assignedOfficer.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({
        success: false,
        message: "Forbidden: You are not assigned to this complaint.",
      });
    }

    if (status === "RESOLVED") {
      complaint.resolvedAt = Date.now();
    }

    complaint.status = status;
    complaint.statusHistory.push({
      status,
      changedBy: req.user._id,
      remarks: `Status updated to ${status} by Officer ${req.user.fullName}.`,
    });

    await complaint.save();

    await sendSystemNotification({
      recipient: complaint.createdBy,
      sender: req.user._id,
      type: "Status_Update",
      title: "Status Update",
      message: `Your complaint "${complaint.title}" status is now "${status}".`,
      complaint: complaint._id,
    });

    res.status(200).json({
      success: true,
      message: `Status updated to ${status} successfully.`,
      data: complaint,
    });
  } catch (error) {
    console.error("Update Status Error:", error);
    res.status(500).json({
      success: false,
      message: "Internal Server Error updating status.",
    });
  }
};

// =========================================================================
// 8. Add Remarks
// =========================================================================
// PUT /api/officer/remarks/:id
export const addRemarks = async (req, res) => {
  try {
    const { remarks } = req.body;

    if (!remarks || remarks.trim() === "") {
      return res.status(400).json({
        success: false,
        message: "Remarks text is required.",
      });
    }

    const complaint = await Complaint.findById(req.params.id);

    if (!complaint) {
      return res.status(404).json({
        success: false,
        message: "Complaint not found.",
      });
    }

    const isAssigned =
      complaint.assignedOfficer &&
      complaint.assignedOfficer.toString() === req.user._id.toString();

    if (!isAssigned) {
      return res.status(403).json({
        success: false,
        message: "Forbidden: Not authorized.",
      });
    }

    complaint.statusHistory.push({
      status: complaint.status,
      changedBy: req.user._id,
      remarks,
    });

    await complaint.save();

    res.status(200).json({
      success: true,
      message: "Remarks added successfully.",
      data: complaint,
    });
  } catch (error) {
    console.error("Add Remarks Error:", error);
    res.status(500).json({
      success: false,
      message: "Internal Server Error adding remarks.",
    });
  }
};

// =========================================================================
// 9. Mark Completed
// =========================================================================
// PUT /api/officer/complete/:id
export const markComplaintCompleted = async (req, res) => {
  try {
    const { remarks, resolutionImage } = req.body;

    const complaint = await Complaint.findById(req.params.id);

    if (!complaint) {
      return res.status(404).json({
        success: false,
        message: "Complaint not found.",
      });
    }

    if (
      !complaint.assignedOfficer ||
      complaint.assignedOfficer.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({
        success: false,
        message: "Forbidden: Not authorized.",
      });
    }

    complaint.status = "RESOLVED";
    complaint.resolvedAt = Date.now();
    complaint.resolutionRemarks = remarks || "Resolved and completed.";

    complaint.statusHistory.push({
      status: "RESOLVED",
      changedBy: req.user._id,
      remarks: `Completed: ${remarks || "Resolved and completed."}`,
    });

    await complaint.save();

    await sendSystemNotification({
      recipient: complaint.createdBy,
      sender: req.user._id,
      type: "Completion",
      title: "Complaint Resolved",
      message: `Your complaint "${complaint.title}" has been resolved.`,
      complaint: complaint._id,
    });

    res.status(200).json({
      success: true,
      message: "Complaint marked completed successfully.",
      data: complaint,
    });
  } catch (error) {
    console.error("Complete Complaint Error:", error);
    res.status(500).json({
      success: false,
      message: "Internal Server Error completing complaint.",
    });
  }
};

// =========================================================================
// 10. View Escalated Complaints
// =========================================================================
// GET /api/officer/escalated
export const getEscalatedComplaints = async (req, res) => {
  try {
    const complaints = await Complaint.find({
      $or: [
        { assignedOfficer: req.user._id, status: "ESCALATED" },
        {
          assignedOfficer: req.user._id,
          status: { $nin: RESOLVED_STATUSES },
          slaDeadline: { $lt: new Date() },
        },
      ],
    })
      .sort({ slaDeadline: 1 })
      .populate("createdBy", "fullName email phone");

    res.status(200).json({
      success: true,
      count: complaints.length,
      data: complaints,
    });
  } catch (error) {
    console.error("Get Escalated Complaints Error:", error);
    res.status(500).json({
      success: false,
      message: "Internal Server Error retrieving escalated complaints.",
    });
  }
};
