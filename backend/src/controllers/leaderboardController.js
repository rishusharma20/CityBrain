import Complaint from "../models/Complaint.js";

const RESOLVED_STATUSES = ["RESOLVED", "COMPLETED", "CLOSED"];

// =========================================================================
// 1. Top Officers
// =========================================================================
export const getTopOfficers = async (req, res) => {
  try {
    const leaderboard = await Complaint.aggregate([
      { $match: { assignedOfficer: { $ne: null } } },
      {
        $group: {
          _id: "$assignedOfficer",
          totalAssigned: { $sum: 1 },
          resolvedCount: { $sum: { $cond: [{ $in: ["$status", RESOLVED_STATUSES] }, 1, 0] } },
          slaCompliant: {
            $sum: { $cond: [{ $and: [{ $in: ["$status", RESOLVED_STATUSES] }, { $lte: ["$resolvedAt", "$slaDeadline"] }] }, 1, 0] },
          },
        },
      },
      { $lookup: { from: "users", localField: "_id", foreignField: "_id", as: "officer" } },
      { $unwind: "$officer" },
      {
        $project: {
          officerName: "$officer.fullName", department: "$officer.department",
          resolvedCount: 1, totalAssigned: 1,
          slaCompliancePercentage: { $cond: [{ $gt: ["$resolvedCount", 0] }, { $round: [{ $multiply: [{ $divide: ["$slaCompliant", "$resolvedCount"] }, 100] }] }, 100] },
        },
      },
      { $sort: { slaCompliancePercentage: -1, resolvedCount: -1 } },
    ]);
    res.status(200).json({ success: true, data: leaderboard });
  } catch (error) {
    console.error("Top Officers Error:", error);
    res.status(500).json({ success: false, message: "Error generating top officers leaderboard." });
  }
};

// =========================================================================
// 2. Top Wards
// =========================================================================
export const getTopWards = async (req, res) => {
  try {
    const leaderboard = await Complaint.aggregate([
      {
        $group: {
          _id: "$wardNumber",
          total: { $sum: 1 },
          resolved: { $sum: { $cond: [{ $in: ["$status", RESOLVED_STATUSES] }, 1, 0] } },
        },
      },
      {
        $project: {
          ward: { $concat: ["Ward ", { $toString: "$_id" }] },
          wardNumber: "$_id",
          totalComplaints: "$total", resolvedComplaints: "$resolved",
          resolutionRatePercentage: { $cond: [{ $gt: ["$total", 0] }, { $round: [{ $multiply: [{ $divide: ["$resolved", "$total"] }, 100] }] }, 100] },
        },
      },
      { $sort: { resolutionRatePercentage: -1, totalComplaints: -1 } },
    ]);
    res.status(200).json({ success: true, data: leaderboard });
  } catch (error) {
    console.error("Top Wards Error:", error);
    res.status(500).json({ success: false, message: "Error generating top wards leaderboard." });
  }
};

// =========================================================================
// 3. Best Departments
// =========================================================================
export const getBestDepartments = async (req, res) => {
  try {
    const leaderboard = await Complaint.aggregate([
      {
        $group: {
          _id: "$department",
          total: { $sum: 1 },
          resolved: { $sum: { $cond: [{ $in: ["$status", RESOLVED_STATUSES] }, 1, 0] } },
        },
      },
      {
        $project: {
          department: "$_id", totalComplaints: "$total", resolvedComplaints: "$resolved",
          resolutionRatePercentage: { $cond: [{ $gt: ["$total", 0] }, { $round: [{ $multiply: [{ $divide: ["$resolved", "$total"] }, 100] }] }, 100] },
        },
      },
      { $sort: { resolutionRatePercentage: -1, totalComplaints: -1 } },
    ]);
    res.status(200).json({ success: true, data: leaderboard });
  } catch (error) {
    console.error("Best Departments Error:", error);
    res.status(500).json({ success: false, message: "Error loading department rankings." });
  }
};
