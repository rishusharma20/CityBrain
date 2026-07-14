import Complaint from "../models/Complaint.js";
import { sendSystemNotification } from "../utils/notificationHelper.js";

// Helper: Construct scope query filter for the officer (assigned directly or matches dept/ward and is unassigned)
const getOfficerScopeFilter = (user) => {
  return {
    $or: [
      { assignedOfficer: user._id },
      {
        department: user.department,
        ward: user.ward,
        assignedOfficer: null,
      },
    ],
  };
};

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
                { $in: ["$status", ["Pending", "Accepted", "In_Progress"]] },
                1,
                0,
              ],
            },
          },
          resolved: {
            $sum: { $cond: [{ $eq: ["$status", "Resolved"] }, 1, 0] },
          },
          escalated: {
            $sum: {
              $cond: [
                {
                  $or: [
                    { $eq: ["$status", "Escalated"] },
                    {
                      $and: [
                        { $ne: ["$status", "Resolved"] },
                        { $lt: ["$slaDeadline", new Date()] },
                      ],
                    },
                  ],
                },
                1,
                0,
              ],
            },
          },
        },
      },
    ]);

    const latestComplaints = await Complaint.find(scopeFilter)
      .sort({ createdAt: -1 })
      .limit(5)
      .populate("citizen", "fullName email phone");

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
      .populate("citizen", "fullName email phone");

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
      $or: [
        { assignedOfficer: officerId },
        { "remarks.officer": officerId },
      ],
    });

    let totalAssigned = 0;
    let resolvedCount = 0;
    let pendingCount = 0;
    let escalatedCount = 0;
    let onTimeResolutions = 0;
    let totalResolutionTimeHours = 0;

    complaints.forEach((comp) => {
      if (
        comp.assignedOfficer &&
        comp.assignedOfficer.toString() === officerId.toString()
      ) {
        totalAssigned++;
      }

      if (comp.status === "Resolved") {
        resolvedCount++;
        if (comp.resolvedAt && comp.slaDeadline) {
          if (new Date(comp.resolvedAt) <= new Date(comp.slaDeadline)) {
            onTimeResolutions++;
          }
          const durationMs = new Date(comp.resolvedAt) - new Date(comp.createdAt);
          totalResolutionTimeHours += durationMs / (1000 * 60 * 60);
        }
      } else if (comp.status === "Escalated") {
        escalatedCount++;
      } else if (["Pending", "Accepted", "In_Progress"].includes(comp.status)) {
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
    const historyFilter = {
      $or: [
        { assignedOfficer: req.user._id },
        { "remarks.officer": req.user._id },
      ],
      status: { $in: ["Resolved", "Rejected"] },
    };

    const complaints = await Complaint.find(historyFilter)
      .sort({ resolvedAt: -1, updatedAt: -1 })
      .populate("citizen", "fullName email phone");

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

    if (
      complaint.department !== req.user.department ||
      complaint.ward !== req.user.ward
    ) {
      return res.status(403).json({
        success: false,
        message: "Forbidden: Complaint out of your department/ward scope.",
      });
    }

    if (complaint.assignedOfficer) {
      return res.status(400).json({
        success: false,
        message: "This complaint is already accepted by another officer.",
      });
    }

    complaint.assignedOfficer = req.user._id;
    complaint.status = "Accepted";
    complaint.remarks.push({
      officer: req.user._id,
      text: `Complaint accepted by Officer ${req.user.fullName}.`,
    });

    await complaint.save();

    await sendSystemNotification({
      recipient: complaint.citizen,
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
    const isScopeMatch =
      complaint.department === req.user.department &&
      complaint.ward === req.user.ward;

    if (!isAssigned && !isScopeMatch) {
      return res.status(403).json({
        success: false,
        message: "Forbidden: Action not authorized.",
      });
    }

    complaint.assignedOfficer = null;
    complaint.status = "Rejected";
    complaint.remarks.push({
      officer: req.user._id,
      text: `Rejected by Officer ${req.user.fullName}. Reason: ${reason}`,
    });

    await complaint.save();

    await sendSystemNotification({
      recipient: complaint.citizen,
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
    const validStatuses = ["Accepted", "In_Progress", "Resolved", "Escalated"];

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

    if (status === "Resolved") {
      if (!complaint.resolutionImage) {
        return res.status(400).json({
          success: false,
          message: "A resolution image is required before marking as Resolved.",
        });
      }
      complaint.resolvedAt = Date.now();
    }

    complaint.status = status;
    complaint.remarks.push({
      officer: req.user._id,
      text: `Status updated to ${status} by Officer ${req.user.fullName}.`,
    });

    await complaint.save();

    await sendSystemNotification({
      recipient: complaint.citizen,
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
    const isScopeMatch =
      complaint.department === req.user.department &&
      complaint.ward === req.user.ward;

    if (!isAssigned && !isScopeMatch) {
      return res.status(403).json({
        success: false,
        message: "Forbidden: Not authorized.",
      });
    }

    complaint.remarks.push({
      officer: req.user._id,
      text: remarks,
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

    const finalImage = resolutionImage || complaint.resolutionImage;
    if (!finalImage || finalImage.trim() === "") {
      return res.status(400).json({
        success: false,
        message: "Resolution image URL is required for completion.",
      });
    }

    complaint.status = "Resolved";
    complaint.resolvedAt = Date.now();
    complaint.resolutionImage = finalImage;

    const finalRemarkText = remarks || "Resolved and completed.";
    complaint.remarks.push({
      officer: req.user._id,
      text: `Completed: ${finalRemarkText}`,
    });

    await complaint.save();

    await sendSystemNotification({
      recipient: complaint.citizen,
      sender: req.user._id,
      type: "Completion",
      title: "Complaint Resolved",
      message: `Your complaint "${complaint.title}" has been resolved. Proof: ${finalImage}`,
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
    const scopeFilter = getOfficerScopeFilter(req.user);

    const complaints = await Complaint.find({
      ...scopeFilter,
      $or: [
        { status: "Escalated" },
        {
          status: { $ne: "Resolved" },
          slaDeadline: { $lt: new Date() },
        },
      ],
    })
      .sort({ slaDeadline: 1 })
      .populate("citizen", "fullName email phone");

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
