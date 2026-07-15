import Complaint from "../models/Complaint.js";

const ACTIVE_STATUSES = ["PENDING", "ASSIGNED", "ACCEPTED", "IN_PROGRESS", "UNDER_REVIEW", "ESCALATED"];
const RESOLVED_STATUSES = ["RESOLVED", "COMPLETED", "CLOSED"];

// GET /api/public/resolved
export const getPublicResolvedCount = async (req, res) => {
  try {
    const count = await Complaint.countDocuments({ status: { $in: RESOLVED_STATUSES } });
    res.status(200).json({ success: true, resolvedCount: count });
  } catch (error) {
    console.error("Public Resolved Count Error:", error);
    res.status(500).json({ success: false, message: "Error loading resolved count." });
  }
};

// GET /api/public/pending
export const getPublicPendingCount = async (req, res) => {
  try {
    const count = await Complaint.countDocuments({ status: { $in: ACTIVE_STATUSES } });
    res.status(200).json({ success: true, pendingCount: count });
  } catch (error) {
    console.error("Public Pending Count Error:", error);
    res.status(500).json({ success: false, message: "Error loading pending count." });
  }
};

// GET /api/public/ward-stats
export const getPublicWardStats = async (req, res) => {
  try {
    const stats = await Complaint.aggregate([
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
      { $sort: { resolutionRatePercentage: -1 } },
    ]);
    res.status(200).json({ success: true, data: stats });
  } catch (error) {
    console.error("Public Ward Stats Error:", error);
    res.status(500).json({ success: false, message: "Error loading public ward stats." });
  }
};

// GET /api/public/transparency-report
export const getPublicTransparencyReport = async (req, res) => {
  try {
    const totalComplaints = await Complaint.countDocuments();
    const resolved = await Complaint.countDocuments({ status: { $in: RESOLVED_STATUSES } });
    const resolvedComplaints = await Complaint.find({ status: { $in: RESOLVED_STATUSES }, resolvedAt: { $ne: null } });
    let totalMs = 0;
    resolvedComplaints.forEach((comp) => { totalMs += new Date(comp.resolvedAt) - new Date(comp.createdAt); });
    const avgTimeHours = resolved > 0 ? parseFloat((totalMs / (resolved * 3600000)).toFixed(2)) : 0;

    res.status(200).json({
      success: true,
      scorecard: {
        totalIssuesReported: totalComplaints,
        totalIssuesResolved: resolved,
        citizenSatisfactionPercentage: totalComplaints > 0 ? Math.round((resolved / totalComplaints) * 100) : 100,
        averageResolutionTimeHours: avgTimeHours,
      },
    });
  } catch (error) {
    console.error("Transparency Report Error:", error);
    res.status(500).json({ success: false, message: "Error loading global transparency scorecard." });
  }
};
