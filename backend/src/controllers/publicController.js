import Complaint from "../models/Complaint.js";

// =========================================================================
// 1. Resolved Complaints Counter
// =========================================================================
// GET /api/public/resolved
export const getPublicResolvedCount = async (req, res) => {
  try {
    const count = await Complaint.countDocuments({ status: "Resolved" });
    res.status(200).json({
      success: true,
      resolvedCount: count,
    });
  } catch (error) {
    console.error("Public Resolved Count Error:", error);
    res.status(500).json({
      success: false,
      message: "Error loading resolved count.",
    });
  }
};

// =========================================================================
// 2. Pending Complaints Counter
// =========================================================================
// GET /api/public/pending
export const getPublicPendingCount = async (req, res) => {
  try {
    const count = await Complaint.countDocuments({
      status: { $in: ["Pending", "Accepted", "In_Progress"] },
    });
    res.status(200).json({
      success: true,
      pendingCount: count,
    });
  } catch (error) {
    console.error("Public Pending Count Error:", error);
    res.status(500).json({
      success: false,
      message: "Error loading pending count.",
    });
  }
};

// =========================================================================
// 3. Ward Statistics (Transparency Breakdown)
// =========================================================================
// GET /api/public/ward-stats
export const getPublicWardStats = async (req, res) => {
  try {
    const stats = await Complaint.aggregate([
      {
        $group: {
          _id: "$ward",
          total: { $sum: 1 },
          resolved: {
            $sum: { $cond: [{ $eq: ["$status", "Resolved"] }, 1, 0] },
          },
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
      { $sort: { resolutionRatePercentage: -1 } },
    ]);

    res.status(200).json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error("Public Ward Stats Error:", error);
    res.status(500).json({
      success: false,
      message: "Error loading public ward stats.",
    });
  }
};

// =========================================================================
// 4. Global Transparency Scorecard Report
// =========================================================================
// GET /api/public/transparency-report
export const getPublicTransparencyReport = async (req, res) => {
  try {
    const totalComplaints = await Complaint.countDocuments();
    const resolved = await Complaint.countDocuments({ status: "Resolved" });

    const resolvedComplaints = await Complaint.find({ status: "Resolved" });
    let totalMs = 0;
    resolvedComplaints.forEach((comp) => {
      if (comp.resolvedAt) {
        totalMs += new Date(comp.resolvedAt) - new Date(comp.createdAt);
      }
    });

    const avgTimeHours =
      resolved > 0 ? parseFloat((totalMs / (resolved * 1000 * 60 * 60)).toFixed(2)) : 0;

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
    res.status(500).json({
      success: false,
      message: "Error loading global transparency scorecard.",
    });
  }
};
