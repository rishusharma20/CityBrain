import User from "../models/User.js";
import Complaint from "../models/Complaint.js";
import { sendSystemNotification } from "../utils/notificationHelper.js";

// =========================================================================
// 1. Admin Dashboard Overview
// =========================================================================
// GET /api/admin/dashboard
export const getAdminDashboard = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments({ role: "Citizen" });
    const totalOfficers = await User.countDocuments({ role: "Officer" });
    const totalComplaints = await Complaint.countDocuments();
    const resolvedComplaints = await Complaint.countDocuments({ status: "Resolved" });

    const latestComplaints = await Complaint.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .populate("citizen", "fullName email")
      .populate("assignedOfficer", "fullName");

    res.status(200).json({
      success: true,
      data: {
        counters: {
          totalCitizens: totalUsers,
          totalOfficers,
          totalComplaints,
          resolvedCount: resolvedComplaints,
          resolutionRatePercentage: totalComplaints > 0 ? Math.round((resolvedComplaints / totalComplaints) * 100) : 100,
        },
        latestComplaints,
      },
    });
  } catch (error) {
    console.error("Admin Dashboard Error:", error);
    res.status(500).json({
      success: false,
      message: "Internal Server Error loading admin dashboard.",
    });
  }
};

// =========================================================================
// 2. Get Citizens List
// =========================================================================
// GET /api/admin/users
export const getAllCitizens = async (req, res) => {
  try {
    const citizens = await User.find({ role: "Citizen" }).sort({ createdAt: -1 });
    res.status(200).json({
      success: true,
      count: citizens.length,
      data: citizens,
    });
  } catch (error) {
    console.error("Get Citizens Error:", error);
    res.status(500).json({
      success: false,
      message: "Internal Server Error loading citizen records.",
    });
  }
};

// =========================================================================
// 3. Get Officers List
// =========================================================================
// GET /api/admin/officers
export const getAllOfficers = async (req, res) => {
  try {
    const officers = await User.find({ role: "Officer" }).sort({ createdAt: -1 });
    res.status(200).json({
      success: true,
      count: officers.length,
      data: officers,
    });
  } catch (error) {
    console.error("Get Officers Error:", error);
    res.status(500).json({
      success: false,
      message: "Internal Server Error loading officer records.",
    });
  }
};

// =========================================================================
// 4. Filtered Complaints List
// =========================================================================
// GET /api/admin/complaints
export const monitorComplaints = async (req, res) => {
  try {
    const { status, department, ward, citizenId } = req.query;
    const filter = {};

    if (status) filter.status = status;
    if (department) filter.department = department;
    if (ward) filter.ward = ward;
    if (citizenId) filter.citizen = citizenId;

    const complaints = await Complaint.find(filter)
      .sort({ createdAt: -1 })
      .populate("citizen", "fullName email")
      .populate("assignedOfficer", "fullName department");

    res.status(200).json({
      success: true,
      count: complaints.length,
      data: complaints,
    });
  } catch (error) {
    console.error("Monitor Complaints Error:", error);
    res.status(500).json({
      success: false,
      message: "Internal Server Error loading complaints.",
    });
  }
};

// =========================================================================
// 5. Toggle Block User
// =========================================================================
// PUT /api/admin/block-user/:id
export const toggleBlockUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    if (user.role === "Admin") {
      return res.status(400).json({
        success: false,
        message: "Administrators cannot be blocked.",
      });
    }

    user.isBlocked = !user.isBlocked;
    await user.save();

    res.status(200).json({
      success: true,
      message: `User is successfully ${user.isBlocked ? "blocked" : "unblocked"}.`,
      data: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        isBlocked: user.isBlocked,
      },
    });
  } catch (error) {
    console.error("Toggle Block Error:", error);
    res.status(500).json({
      success: false,
      message: "Internal Server Error blocking/unblocking user.",
    });
  }
};

// =========================================================================
// 6. Manual Officer Assignment
// =========================================================================
// PUT /api/admin/assign-officer/:id (where :id is the Complaint ID)
export const assignComplaintToOfficer = async (req, res) => {
  try {
    const { officerId } = req.body;

    if (!officerId) {
      return res.status(400).json({
        success: false,
        message: "officerId is required in request body.",
      });
    }

    const officer = await User.findOne({ _id: officerId, role: "Officer" });
    if (!officer) {
      return res.status(404).json({
        success: false,
        message: "Officer not found or user is not an officer.",
      });
    }

    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) {
      return res.status(404).json({
        success: false,
        message: "Complaint not found.",
      });
    }

    if (complaint.department !== officer.department) {
      return res.status(400).json({
        success: false,
        message: `Department mismatch. Complaint is in '${complaint.department}' but Officer is in '${officer.department}'.`,
      });
    }

    complaint.assignedOfficer = officer._id;
    complaint.status = "Accepted";
    complaint.remarks.push({
      officer: req.user._id,
      text: `Complaint manually assigned to Officer ${officer.fullName} by Admin.`,
    });

    await complaint.save();

    // Notify Officer
    await sendSystemNotification({
      recipient: officer._id,
      sender: req.user._id,
      type: "Assignment",
      title: "New Complaint Assigned",
      message: `Admin has assigned complaint "${complaint.title}" to you.`,
      complaint: complaint._id,
    });

    // Notify Citizen
    await sendSystemNotification({
      recipient: complaint.citizen,
      sender: req.user._id,
      type: "Assignment",
      title: "Officer Assigned",
      message: `Your complaint "${complaint.title}" has been assigned to Officer ${officer.fullName}.`,
      complaint: complaint._id,
    });

    res.status(200).json({
      success: true,
      message: "Complaint assigned successfully.",
      data: complaint,
    });
  } catch (error) {
    console.error("Assign Complaint Error:", error);
    res.status(500).json({
      success: false,
      message: "Internal Server Error assigning complaint.",
    });
  }
};

// =========================================================================
// 7. System-wide Statistics
// =========================================================================
// GET /api/admin/statistics
export const getSystemStatistics = async (req, res) => {
  try {
    const totalComplaints = await Complaint.countDocuments();
    const resolved = await Complaint.countDocuments({ status: "Resolved" });
    const pending = await Complaint.countDocuments({ status: { $in: ["Pending", "Accepted", "In_Progress"] } });
    const rejected = await Complaint.countDocuments({ status: "Rejected" });
    const escalated = await Complaint.countDocuments({
      $or: [
        { status: "Escalated" },
        {
          status: { $ne: "Resolved" },
          slaDeadline: { $lt: new Date() },
        },
      ],
    });

    res.status(200).json({
      success: true,
      data: {
        totalComplaints,
        resolved,
        pending,
        rejected,
        escalated,
        overallSlaCompliancePercentage: totalComplaints > 0 ? Math.round((resolved / totalComplaints) * 100) : 100,
      },
    });
  } catch (error) {
    console.error("System Stats Error:", error);
    res.status(500).json({
      success: false,
      message: "Internal Server Error compiling statistics.",
    });
  }
};

// =========================================================================
// 8. Departmental SLA Performance Monitoring
// =========================================================================
// GET /api/admin/performance
export const monitorDepartmentalPerformance = async (req, res) => {
  try {
    const stats = await Complaint.aggregate([
      {
        $group: {
          _id: "$department",
          totalResolved: {
            $sum: { $cond: [{ $eq: ["$status", "Resolved"] }, 1, 0] },
          },
          slaCompliant: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ["$status", "Resolved"] },
                    { $lte: ["$resolvedAt", "$slaDeadline"] },
                  ],
                },
                1,
                0,
              ],
            },
          },
        },
      },
      {
        $project: {
          department: "$_id",
          totalResolved: 1,
          slaCompliant: 1,
          slaCompliancePercentage: {
            $cond: [
              { $gt: ["$totalResolved", 0] },
              { $round: [{ $multiply: [{ $divide: ["$slaCompliant", "$totalResolved"] }, 100] }] },
              100,
            ],
          },
        },
      },
      { $sort: { slaCompliancePercentage: -1 } },
    ]);

    res.status(200).json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error("Performance Stats Error:", error);
    res.status(500).json({
      success: false,
      message: "Internal Server Error compiling performance stats.",
    });
  }
};
