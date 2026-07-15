import User from "../models/User.js";
import Complaint from "../models/Complaint.js";
import { sendSystemNotification } from "../utils/notificationHelper.js";

const ACTIVE_STATUSES = ["PENDING", "ASSIGNED", "ACCEPTED", "IN_PROGRESS", "UNDER_REVIEW", "ESCALATED"];
const RESOLVED_STATUSES = ["RESOLVED", "COMPLETED", "CLOSED"];

// =========================================================================
// 1. Admin Dashboard Overview
// =========================================================================
// GET /api/admin/dashboard
export const getAdminDashboard = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments({ role: "Citizen" });
    const totalOfficers = await User.countDocuments({ role: "Officer" });
    const totalComplaints = await Complaint.countDocuments();
    const resolvedComplaints = await Complaint.countDocuments({ status: { $in: RESOLVED_STATUSES } });

    const latestComplaints = await Complaint.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .populate("createdBy", "fullName email")
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
    res.status(500).json({ success: false, message: "Internal Server Error loading admin dashboard." });
  }
};

// =========================================================================
// 2. Get Citizens List
// =========================================================================
export const getAllCitizens = async (req, res) => {
  try {
    const citizens = await User.find({ role: "Citizen" }).sort({ createdAt: -1 });
    res.status(200).json({ success: true, count: citizens.length, data: citizens });
  } catch (error) {
    console.error("Get Citizens Error:", error);
    res.status(500).json({ success: false, message: "Internal Server Error loading citizen records." });
  }
};

// =========================================================================
// 3. Get Officers List
// =========================================================================
export const getAllOfficers = async (req, res) => {
  try {
    const officers = await User.find({ role: "Officer" }).sort({ createdAt: -1 });
    res.status(200).json({ success: true, count: officers.length, data: officers });
  } catch (error) {
    console.error("Get Officers Error:", error);
    res.status(500).json({ success: false, message: "Internal Server Error loading officer records." });
  }
};

// =========================================================================
// 4. Filtered Complaints List
// =========================================================================
export const monitorComplaints = async (req, res) => {
  try {
    const { status, department, wardNumber, citizenId } = req.query;
    const filter = {};

    if (status) filter.status = status;
    if (department) filter.department = department;
    if (wardNumber) filter.wardNumber = parseInt(wardNumber);
    if (citizenId) filter.createdBy = citizenId;

    const complaints = await Complaint.find(filter)
      .sort({ createdAt: -1 })
      .populate("createdBy", "fullName email")
      .populate("assignedOfficer", "fullName department");

    res.status(200).json({ success: true, count: complaints.length, data: complaints });
  } catch (error) {
    console.error("Monitor Complaints Error:", error);
    res.status(500).json({ success: false, message: "Internal Server Error loading complaints." });
  }
};

// =========================================================================
// 5. Toggle Block User
// =========================================================================
export const toggleBlockUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: "User not found." });
    if (user.role === "Admin") return res.status(400).json({ success: false, message: "Administrators cannot be blocked." });

    user.isBlocked = !user.isBlocked;
    await user.save();

    res.status(200).json({
      success: true,
      message: `User is successfully ${user.isBlocked ? "blocked" : "unblocked"}.`,
      data: { id: user._id, fullName: user.fullName, email: user.email, isBlocked: user.isBlocked },
    });
  } catch (error) {
    console.error("Toggle Block Error:", error);
    res.status(500).json({ success: false, message: "Internal Server Error blocking/unblocking user." });
  }
};

// =========================================================================
// 6. Manual Officer Assignment
// =========================================================================
export const assignComplaintToOfficer = async (req, res) => {
  try {
    const { officerId } = req.body;
    if (!officerId) return res.status(400).json({ success: false, message: "officerId is required in request body." });

    const officer = await User.findOne({ _id: officerId, role: "Officer" });
    if (!officer) return res.status(404).json({ success: false, message: "Officer not found or user is not an officer." });

    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) return res.status(404).json({ success: false, message: "Complaint not found." });

    complaint.assignedOfficer = officer._id;
    complaint.status = "ASSIGNED";
    complaint.statusHistory.push({
      status: "ASSIGNED",
      changedBy: req.user._id,
      remarks: `Complaint manually assigned to Officer ${officer.fullName} by Admin.`,
    });

    await complaint.save();

    await sendSystemNotification({ recipient: officer._id, sender: req.user._id, type: "Assignment", title: "New Complaint Assigned", message: `Admin has assigned complaint "${complaint.title}" to you.`, complaint: complaint._id });
    await sendSystemNotification({ recipient: complaint.createdBy, sender: req.user._id, type: "Assignment", title: "Officer Assigned", message: `Your complaint "${complaint.title}" has been assigned to Officer ${officer.fullName}.`, complaint: complaint._id });

    res.status(200).json({ success: true, message: "Complaint assigned successfully.", data: complaint });
  } catch (error) {
    console.error("Assign Complaint Error:", error);
    res.status(500).json({ success: false, message: "Internal Server Error assigning complaint." });
  }
};

// =========================================================================
// 7. System-wide Statistics
// =========================================================================
export const getSystemStatistics = async (req, res) => {
  try {
    const totalComplaints = await Complaint.countDocuments();
    const resolved = await Complaint.countDocuments({ status: { $in: RESOLVED_STATUSES } });
    const pending = await Complaint.countDocuments({ status: { $in: ACTIVE_STATUSES } });
    const escalated = await Complaint.countDocuments({ status: "ESCALATED" });

    res.status(200).json({
      success: true,
      data: {
        totalComplaints,
        resolved,
        pending,
        escalated,
        overallSlaCompliancePercentage: totalComplaints > 0 ? Math.round((resolved / totalComplaints) * 100) : 100,
      },
    });
  } catch (error) {
    console.error("System Stats Error:", error);
    res.status(500).json({ success: false, message: "Internal Server Error compiling statistics." });
  }
};

// =========================================================================
// 8. Departmental SLA Performance Monitoring
// =========================================================================
export const monitorDepartmentalPerformance = async (req, res) => {
  try {
    const stats = await Complaint.aggregate([
      {
        $group: {
          _id: "$department",
          totalResolved: { $sum: { $cond: [{ $in: ["$status", RESOLVED_STATUSES] }, 1, 0] } },
          slaCompliant: {
            $sum: {
              $cond: [
                { $and: [{ $in: ["$status", RESOLVED_STATUSES] }, { $lte: ["$resolvedAt", "$slaDeadline"] }] },
                1, 0,
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

    res.status(200).json({ success: true, data: stats });
  } catch (error) {
    console.error("Performance Stats Error:", error);
    res.status(500).json({ success: false, message: "Internal Server Error compiling performance stats." });
  }
};
