import Complaint from "../models/Complaint.js";

// =========================================================================
// 1. Complaint Breakdown
// =========================================================================
// GET /api/analytics/complaints
export const getComplaintBreakdown = async (req, res) => {
  try {
    const statusStats = await Complaint.aggregate([
      { $group: { _id: "$status", count: { $sum: 1 } } }
    ]);
    const deptStats = await Complaint.aggregate([
      { $group: { _id: "$department", count: { $sum: 1 } } }
    ]);

    res.status(200).json({
      success: true,
      data: {
        byStatus: statusStats,
        byDepartment: deptStats,
      },
    });
  } catch (error) {
    console.error("Complaint Breakdown Error:", error);
    res.status(500).json({
      success: false,
      message: "Error loading complaint breakdown analytics.",
    });
  }
};

// =========================================================================
// 2. Officer Analytics
// =========================================================================
// GET /api/analytics/officers
export const getOfficerAnalytics = async (req, res) => {
  try {
    const stats = await Complaint.aggregate([
      { $match: { assignedOfficer: { $ne: null } } },
      {
        $group: {
          _id: "$assignedOfficer",
          assignedCount: { $sum: 1 },
          resolvedCount: { $sum: { $cond: [{ $eq: ["$status", "Resolved"] }, 1, 0] } },
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
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "officer",
        },
      },
      { $unwind: "$officer" },
      {
        $project: {
          officerName: "$officer.fullName",
          department: "$officer.department",
          assignedCount: 1,
          resolvedCount: 1,
          slaCompliantRatePercentage: {
            $cond: [
              { $gt: ["$resolvedCount", 0] },
              { $round: [{ $multiply: [{ $divide: ["$slaCompliant", "$resolvedCount"] }, 100] }] },
              100,
            ],
          },
        },
      },
    ]);

    res.status(200).json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error("Officer Analytics Error:", error);
    res.status(500).json({
      success: false,
      message: "Error loading officer analytics.",
    });
  }
};

// =========================================================================
// 3. Monthly Trend
// =========================================================================
// GET /api/analytics/monthly
export const getMonthlyTrend = async (req, res) => {
  try {
    const stats = await Complaint.aggregate([
      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" },
          },
          totalCreated: { $sum: 1 },
          totalResolved: {
            $sum: { $cond: [{ $eq: ["$status", "Resolved"] }, 1, 0] },
          },
        },
      },
      { $sort: { "_id.year": -1, "_id.month": -1 } },
    ]);

    res.status(200).json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error("Monthly Trend Error:", error);
    res.status(500).json({
      success: false,
      message: "Error loading monthly trends.",
    });
  }
};

// =========================================================================
// 4. Response Time Analytics
// =========================================================================
// GET /api/analytics/response-time
export const getResponseTimeAnalytics = async (req, res) => {
  try {
    const resolvedComplaints = await Complaint.find({ status: "Resolved" });

    let cumulativeResolutionTimeMs = 0;

    resolvedComplaints.forEach((comp) => {
      if (comp.resolvedAt) {
        const duration = new Date(comp.resolvedAt) - new Date(comp.createdAt);
        cumulativeResolutionTimeMs += duration;
      }
    });

    const totalResolvedCount = resolvedComplaints.length;
    const avgResolutionTimeHours =
      totalResolvedCount > 0
        ? parseFloat((cumulativeResolutionTimeMs / (totalResolvedCount * 1000 * 60 * 60)).toFixed(2))
        : 0;

    res.status(200).json({
      success: true,
      data: {
        resolvedCount: totalResolvedCount,
        avgResolutionTimeHours,
      },
    });
  } catch (error) {
    console.error("Response Time Analytics Error:", error);
    res.status(500).json({
      success: false,
      message: "Error loading response time analytics.",
    });
  }
};

// =========================================================================
// 5. Department Analytics
// =========================================================================
// GET /api/analytics/departments
export const getDepartmentAnalytics = async (req, res) => {
  try {
    const stats = await Complaint.aggregate([
      {
        $group: {
          _id: "$department",
          total: { $sum: 1 },
          resolved: { $sum: { $cond: [{ $eq: ["$status", "Resolved"] }, 1, 0] } },
        },
      },
      {
        $project: {
          department: "$_id",
          total: 1,
          resolved: 1,
          resolutionRatePercentage: {
            $cond: [
              { $gt: ["$total", 0] },
              { $round: [{ $multiply: [{ $divide: ["$resolved", "$total"] }, 100] }] },
              100,
            ],
          },
        },
      },
    ]);

    res.status(200).json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error("Department Analytics Error:", error);
    res.status(500).json({
      success: false,
      message: "Error loading department analytics.",
    });
  }
};
