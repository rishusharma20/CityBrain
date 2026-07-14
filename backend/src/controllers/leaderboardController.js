import Complaint from "../models/Complaint.js";

// =========================================================================
// 1. Top Officers
// =========================================================================
// GET /api/leaderboards/officers
export const getTopOfficers = async (req, res) => {
  try {
    const leaderboard = await Complaint.aggregate([
      { $match: { assignedOfficer: { $ne: null } } },
      {
        $group: {
          _id: "$assignedOfficer",
          totalAssigned: { $sum: 1 },
          resolvedCount: {
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
          resolvedCount: 1,
          totalAssigned: 1,
          slaCompliancePercentage: {
            $cond: [
              { $gt: ["$resolvedCount", 0] },
              { $round: [{ $multiply: [{ $divide: ["$slaCompliant", "$resolvedCount"] }, 100] }] },
              100,
            ],
          },
        },
      },
      { $sort: { slaCompliancePercentage: -1, resolvedCount: -1 } },
    ]);

    res.status(200).json({
      success: true,
      data: leaderboard,
    });
  } catch (error) {
    console.error("Top Officers Error:", error);
    res.status(500).json({
      success: false,
      message: "Error generating top officers leaderboard.",
    });
  }
};

// =========================================================================
// 2. Top Wards
// =========================================================================
// GET /api/leaderboards/wards
export const getTopWards = async (req, res) => {
  try {
    const leaderboard = await Complaint.aggregate([
      {
        $group: {
          _id: "$ward",
          total: { $sum: 1 },
          resolved: { $sum: { $cond: [{ $eq: ["$status", "Resolved"] }, 1, 0] } },
        },
      },
      {
        $project: {
          ward: "$_id",
          totalComplaints: "$total",
          resolvedComplaints: "$resolved",
          resolutionRatePercentage: {
            $cond: [
              { $gt: ["$total", 0] },
              { $round: [{ $multiply: [{ $divide: ["$resolved", "$total"] }, 100] }] },
              100,
            ],
          },
        },
      },
      { $sort: { resolutionRatePercentage: -1, totalComplaints: -1 } },
    ]);

    res.status(200).json({
      success: true,
      data: leaderboard,
    });
  } catch (error) {
    console.error("Top Wards Error:", error);
    res.status(500).json({
      success: false,
      message: "Error generating top wards leaderboard.",
    });
  }
};

// =========================================================================
// 3. Best Departments
// =========================================================================
// GET /api/leaderboards/departments
export const getBestDepartments = async (req, res) => {
  try {
    const leaderboard = await Complaint.aggregate([
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
          totalComplaints: "$total",
          resolvedComplaints: "$resolved",
          resolutionRatePercentage: {
            $cond: [
              { $gt: ["$total", 0] },
              { $round: [{ $multiply: [{ $divide: ["$resolved", "$total"] }, 100] }] },
              100,
            ],
          },
        },
      },
      { $sort: { resolutionRatePercentage: -1, totalComplaints: -1 } },
    ]);

    res.status(200).json({
      success: true,
      data: leaderboard,
    });
  } catch (error) {
    console.error("Best Departments Error:", error);
    res.status(500).json({
      success: false,
      message: "Error loading department rankings.",
    });
  }
};
