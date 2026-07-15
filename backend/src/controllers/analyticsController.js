import Complaint from "../models/Complaint.js";

const RESOLVED_STATUSES = ["RESOLVED", "COMPLETED", "CLOSED"];

// =========================================================================
// 1. Complaint Breakdown
// =========================================================================
export const getComplaintBreakdown = async (req, res) => {
  try {
    const statusStats = await Complaint.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]);
    const deptStats = await Complaint.aggregate([{ $group: { _id: "$department", count: { $sum: 1 } } }]);
    const categoryStats = await Complaint.aggregate([{ $group: { _id: "$category", count: { $sum: 1 } } }]);

    res.status(200).json({
      success: true,
      data: { byStatus: statusStats, byDepartment: deptStats, byCategory: categoryStats },
    });
  } catch (error) {
    console.error("Complaint Breakdown Error:", error);
    res.status(500).json({ success: false, message: "Error loading complaint breakdown analytics." });
  }
};

// =========================================================================
// 2. Officer Analytics
// =========================================================================
export const getOfficerAnalytics = async (req, res) => {
  try {
    const stats = await Complaint.aggregate([
      { $match: { assignedOfficer: { $ne: null } } },
      {
        $group: {
          _id: "$assignedOfficer",
          assignedCount: { $sum: 1 },
          resolvedCount: { $sum: { $cond: [{ $in: ["$status", RESOLVED_STATUSES] }, 1, 0] } },
          slaCompliant: {
            $sum: {
              $cond: [{ $and: [{ $in: ["$status", RESOLVED_STATUSES] }, { $lte: ["$resolvedAt", "$slaDeadline"] }] }, 1, 0],
            },
          },
        },
      },
      { $lookup: { from: "users", localField: "_id", foreignField: "_id", as: "officer" } },
      { $unwind: "$officer" },
      {
        $project: {
          officerName: "$officer.fullName",
          department: "$officer.department",
          assignedCount: 1, resolvedCount: 1,
          slaCompliancePercentage: {
            $cond: [{ $gt: ["$resolvedCount", 0] }, { $round: [{ $multiply: [{ $divide: ["$slaCompliant", "$resolvedCount"] }, 100] }] }, 100],
          },
        },
      },
    ]);
    res.status(200).json({ success: true, data: stats });
  } catch (error) {
    console.error("Officer Analytics Error:", error);
    res.status(500).json({ success: false, message: "Error loading officer analytics." });
  }
};

// =========================================================================
// 3. Monthly Trend
// =========================================================================
export const getMonthlyTrend = async (req, res) => {
  try {
    const stats = await Complaint.aggregate([
      {
        $group: {
          _id: { year: { $year: "$createdAt" }, month: { $month: "$createdAt" } },
          totalCreated: { $sum: 1 },
          totalResolved: { $sum: { $cond: [{ $in: ["$status", RESOLVED_STATUSES] }, 1, 0] } },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
    ]);
    res.status(200).json({ success: true, data: stats });
  } catch (error) {
    console.error("Monthly Trend Error:", error);
    res.status(500).json({ success: false, message: "Error loading monthly trends." });
  }
};

// =========================================================================
// 4. Response Time Analytics
// =========================================================================
export const getResponseTimeAnalytics = async (req, res) => {
  try {
    const resolvedComplaints = await Complaint.find({ status: { $in: RESOLVED_STATUSES }, resolvedAt: { $ne: null } });
    let cumulativeMs = 0;
    resolvedComplaints.forEach((comp) => {
      cumulativeMs += new Date(comp.resolvedAt) - new Date(comp.createdAt);
    });
    const count = resolvedComplaints.length;
    res.status(200).json({
      success: true,
      data: {
        resolvedCount: count,
        avgResolutionTimeHours: count > 0 ? parseFloat((cumulativeMs / (count * 3600000)).toFixed(2)) : 0,
      },
    });
  } catch (error) {
    console.error("Response Time Analytics Error:", error);
    res.status(500).json({ success: false, message: "Error loading response time analytics." });
  }
};

// =========================================================================
// 5. Department Analytics
// =========================================================================
export const getDepartmentAnalytics = async (req, res) => {
  try {
    const stats = await Complaint.aggregate([
      { $group: { _id: "$department", total: { $sum: 1 }, resolved: { $sum: { $cond: [{ $in: ["$status", RESOLVED_STATUSES] }, 1, 0] } } } },
      {
        $project: {
          department: "$_id", total: 1, resolved: 1,
          resolutionRatePercentage: { $cond: [{ $gt: ["$total", 0] }, { $round: [{ $multiply: [{ $divide: ["$resolved", "$total"] }, 100] }] }, 100] },
        },
      },
    ]);
    res.status(200).json({ success: true, data: stats });
  } catch (error) {
    console.error("Department Analytics Error:", error);
    res.status(500).json({ success: false, message: "Error loading department analytics." });
  }
};
