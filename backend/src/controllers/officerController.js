import Complaint from "../models/Complaint.js";

// =========================================================================
// Helper: Helper to construct scope query filter for the officer
// An officer can see complaints assigned directly to them, OR unassigned
// complaints in their matching department and ward.
// =========================================================================
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
// Private Access (Officer & Admin Only)
export const getOfficerDashboard = async (req, res) => {
  try {
    const scopeFilter = getOfficerScopeFilter(req.user);

    // Run parallel aggregation for dashboard statistics
    const statsPromise = Complaint.aggregate([
      { $match: scopeFilter },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          pending: {
            $sum: {
              $cond: [
                {
                  $in: ["$status", ["Pending", "Accepted", "In_Progress"]],
                },
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

    // Fetch the 5 latest complaints within scope
    const complaintsPromise = Complaint.find(scopeFilter)
      .sort({ createdAt: -1 })
      .limit(5)
      .populate("citizen", "fullName email phone");

    const [statsResult, latestComplaints] = await Promise.all([
      statsPromise,
      complaintsPromise,
    ]);

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
      message: "Internal Server Error while loading dashboard statistics.",
    });
  }
};

// =========================================================================
// 2. View Assigned Complaints
// =========================================================================
// GET /api/officer/assigned
// Private Access
export const getAssignedComplaints = async (req, res) => {
  try {
    // Returns complaints explicitly assigned to the logged-in officer
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
      message: "Internal Server Error while retrieving assigned complaints.",
    });
  }
};

// =========================================================================
// 3. View Complaint Details
// =========================================================================
// GET /api/officer/complaints/:id
// Private Access
export const getComplaintDetails = async (req, res) => {
  try {
    const complaint = await Complaint.findById(req.params.id)
      .populate("citizen", "fullName email phone")
      .populate("remarks.officer", "fullName role department");

    if (!complaint) {
      return res.status(404).json({
        success: false,
        message: "Complaint not found.",
      });
    }

    // Security Check: Verify complaint matches officer's assignment or department/ward
    const isAssigned =
      complaint.assignedOfficer &&
      complaint.assignedOfficer.toString() === req.user._id.toString();
    
    const isDepartmentMatch =
      complaint.department === req.user.department &&
      complaint.ward === req.user.ward;

    if (!isAssigned && !isDepartmentMatch) {
      return res.status(403).json({
        success: false,
        message: "Access Denied: This complaint is out of your department/ward scope.",
      });
    }

    res.status(200).json({
      success: true,
      data: complaint,
    });
  } catch (error) {
    console.error("Get Complaint Details Error:", error);
    res.status(500).json({
      success: false,
      message: "Internal Server Error while loading complaint details.",
    });
  }
};

// =========================================================================
// 4. Accept Complaint
// =========================================================================
// PUT /api/officer/accept/:id
// Private Access
export const acceptComplaint = async (req, res) => {
  try {
    const complaint = await Complaint.findById(req.params.id);

    if (!complaint) {
      return res.status(404).json({
        success: false,
        message: "Complaint not found.",
      });
    }

    // Security Check: Match department & ward
    if (
      complaint.department !== req.user.department ||
      complaint.ward !== req.user.ward
    ) {
      return res.status(403).json({
        success: false,
        message: "Forbidden: You cannot accept complaints outside your department/ward.",
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

    res.status(200).json({
      success: true,
      message: "Complaint accepted successfully.",
      data: complaint,
    });
  } catch (error) {
    console.error("Accept Complaint Error:", error);
    res.status(500).json({
      success: false,
      message: "Internal Server Error while accepting the complaint.",
    });
  }
};

// =========================================================================
// 5. Reject Complaint
// =========================================================================
// PUT /api/officer/reject/:id
// Private Access
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

    // Security Check: Must be assigned or unassigned but matching scope
    const isAssigned =
      complaint.assignedOfficer &&
      complaint.assignedOfficer.toString() === req.user._id.toString();
    const isScopeMatch =
      complaint.department === req.user.department &&
      complaint.ward === req.user.ward;

    if (!isAssigned && !isScopeMatch) {
      return res.status(403).json({
        success: false,
        message: "Forbidden: You are not authorized to access this complaint.",
      });
    }

    // Reset assigned officer to allow others to claim it, change status to Rejected
    complaint.assignedOfficer = null;
    complaint.status = "Rejected";
    complaint.remarks.push({
      officer: req.user._id,
      text: `Rejected by Officer ${req.user.fullName}. Reason: ${reason}`,
    });

    await complaint.save();

    res.status(200).json({
      success: true,
      message: "Complaint rejected and returned to queue.",
      data: complaint,
    });
  } catch (error) {
    console.error("Reject Complaint Error:", error);
    res.status(500).json({
      success: false,
      message: "Internal Server Error while rejecting the complaint.",
    });
  }
};

// =========================================================================
// 6. Update Status
// =========================================================================
// PUT /api/officer/status/:id
// Private Access
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

    // Match assigned officer
    if (
      !complaint.assignedOfficer ||
      complaint.assignedOfficer.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({
        success: false,
        message: "Forbidden: You must accept the complaint before updating its status.",
      });
    }

    // If marking resolved, direct to complete flow or check rules
    if (status === "Resolved") {
      if (!complaint.resolutionImage) {
        return res.status(400).json({
          success: false,
          message: "Please upload a resolution image before marking as Resolved.",
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

    res.status(200).json({
      success: true,
      message: `Status updated to ${status} successfully.`,
      data: complaint,
    });
  } catch (error) {
    console.error("Update Status Error:", error);
    res.status(500).json({
      success: false,
      message: "Internal Server Error while updating complaint status.",
    });
  }
};

// =========================================================================
// 7. Add Remarks
// =========================================================================
// PUT /api/officer/remarks/:id
// Private Access
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

    // Match scope
    const isAssigned =
      complaint.assignedOfficer &&
      complaint.assignedOfficer.toString() === req.user._id.toString();
    const isScopeMatch =
      complaint.department === req.user.department &&
      complaint.ward === req.user.ward;

    if (!isAssigned && !isScopeMatch) {
      return res.status(403).json({
        success: false,
        message: "Forbidden: You are not authorized to comment on this complaint.",
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
      message: "Internal Server Error while adding remarks.",
    });
  }
};

// =========================================================================
// 8. Upload Resolution Image
// =========================================================================
// PUT /api/officer/resolution-image/:id
// Private Access
export const uploadResolutionImage = async (req, res) => {
  try {
    const { resolutionImage } = req.body;

    if (!resolutionImage || resolutionImage.trim() === "") {
      return res.status(400).json({
        success: false,
        message: "Resolution image URL is required.",
      });
    }

    const complaint = await Complaint.findById(req.params.id);

    if (!complaint) {
      return res.status(404).json({
        success: false,
        message: "Complaint not found.",
      });
    }

    // Verify assignment
    if (
      !complaint.assignedOfficer ||
      complaint.assignedOfficer.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({
        success: false,
        message: "Forbidden: You are not the assigned officer for this complaint.",
      });
    }

    complaint.resolutionImage = resolutionImage;
    complaint.remarks.push({
      officer: req.user._id,
      text: `Resolution image uploaded by Officer ${req.user.fullName}.`,
    });

    await complaint.save();

    res.status(200).json({
      success: true,
      message: "Resolution image uploaded successfully.",
      data: complaint,
    });
  } catch (error) {
    console.error("Resolution Image Upload Error:", error);
    res.status(500).json({
      success: false,
      message: "Internal Server Error while uploading resolution image.",
    });
  }
};

// =========================================================================
// 9. Mark Complaint Completed
// =========================================================================
// PUT /api/officer/complete/:id
// Private Access
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

    // Verify assignment
    if (
      !complaint.assignedOfficer ||
      complaint.assignedOfficer.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({
        success: false,
        message: "Forbidden: Only the assigned officer can mark this complaint completed.",
      });
    }

    // Require resolution image
    const finalImage = resolutionImage || complaint.resolutionImage;
    if (!finalImage || finalImage.trim() === "") {
      return res.status(400).json({
        success: false,
        message: "Resolution image is required to mark the complaint resolved.",
      });
    }

    complaint.status = "Resolved";
    complaint.resolvedAt = Date.now();
    complaint.resolutionImage = finalImage;

    const finalRemarkText = remarks || "Complaint marked resolved and completed.";
    complaint.remarks.push({
      officer: req.user._id,
      text: `Completed: ${finalRemarkText}`,
    });

    await complaint.save();

    res.status(200).json({
      success: true,
      message: "Complaint marked as Resolved and completed.",
      data: complaint,
    });
  } catch (error) {
    console.error("Complete Complaint Error:", error);
    res.status(500).json({
      success: false,
      message: "Internal Server Error while completing the complaint.",
    });
  }
};

// =========================================================================
// 10. View Officer History
// =========================================================================
// GET /api/officer/history
// Private Access
export const getOfficerHistory = async (req, res) => {
  try {
    // Find all complaints touched by this officer (assigned or commented on)
    // that are resolved or rejected.
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
      message: "Internal Server Error while retrieving officer history.",
    });
  }
};

// =========================================================================
// 11. View Officer Statistics & SLA Analytics
// =========================================================================
// GET /api/officer/statistics
// Private Access
export const getOfficerStatistics = async (req, res) => {
  try {
    const officerId = req.user._id;

    // Find all complaints involving this officer
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
      // If currently assigned or was resolving it
      if (
        comp.assignedOfficer &&
        comp.assignedOfficer.toString() === officerId.toString()
      ) {
        totalAssigned++;
      }

      if (comp.status === "Resolved") {
        resolvedCount++;
        // SLA check
        if (comp.resolvedAt && comp.slaDeadline) {
          if (new Date(comp.resolvedAt) <= new Date(comp.slaDeadline)) {
            onTimeResolutions++;
          }
          // Avg resolution time Calculation
          const durationMs = new Date(comp.resolvedAt) - new Date(comp.createdAt);
          totalResolutionTimeHours += durationMs / (1000 * 60 * 60);
        }
      } else if (comp.status === "Escalated") {
        escalatedCount++;
      } else if (["Pending", "Accepted", "In_Progress"].includes(comp.status)) {
        pendingCount++;
        // Auto escalate flag in stats if past deadline
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
      message: "Internal Server Error while calculating statistics.",
    });
  }
};

// =========================================================================
// 12. View Pending Complaints
// =========================================================================
// GET /api/officer/pending
// Private Access
export const getPendingComplaints = async (req, res) => {
  try {
    const scopeFilter = getOfficerScopeFilter(req.user);
    
    const complaints = await Complaint.find({
      ...scopeFilter,
      status: { $in: ["Pending", "Accepted", "In_Progress"] },
    })
      .sort({ createdAt: 1 }) // First-in, first-out priority
      .populate("citizen", "fullName email phone");

    res.status(200).json({
      success: true,
      count: complaints.length,
      data: complaints,
    });
  } catch (error) {
    console.error("Get Pending Complaints Error:", error);
    res.status(500).json({
      success: false,
      message: "Internal Server Error while fetching pending complaints.",
    });
  }
};

// =========================================================================
// 13. View Resolved Complaints
// =========================================================================
// GET /api/officer/resolved
// Private Access
export const getResolvedComplaints = async (req, res) => {
  try {
    const scopeFilter = getOfficerScopeFilter(req.user);

    const complaints = await Complaint.find({
      ...scopeFilter,
      status: "Resolved",
    })
      .sort({ resolvedAt: -1 })
      .populate("citizen", "fullName email phone");

    res.status(200).json({
      success: true,
      count: complaints.length,
      data: complaints,
    });
  } catch (error) {
    console.error("Get Resolved Complaints Error:", error);
    res.status(500).json({
      success: false,
      message: "Internal Server Error while fetching resolved complaints.",
    });
  }
};

// =========================================================================
// 14. View Escalated Complaints
// =========================================================================
// GET /api/officer/escalated
// Private Access
export const getEscalatedComplaints = async (req, res) => {
  try {
    const scopeFilter = getOfficerScopeFilter(req.user);

    // Escalated complaints are either marked status: "Escalated" OR
    // unresolved complaints whose SLA deadline has passed
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
      .sort({ slaDeadline: 1 }) // Sort by most overdue first
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
      message: "Internal Server Error while fetching escalated complaints.",
    });
  }
};
