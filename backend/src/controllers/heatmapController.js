import Complaint from "../models/Complaint.js";

// =========================================================================
// 1. Complaint Density (Coordinate list with weights)
// =========================================================================
// GET /api/heatmaps/complaint-density
export const getComplaintDensity = async (req, res) => {
  try {
    // Use GeoJSON location data from the new Complaint schema
    const rawData = await Complaint.aggregate([
      { $match: { location: { $exists: true } } },
      {
        $group: {
          _id: "$wardNumber",
          weight: { $sum: 1 },
          // Pick representative coordinates from the first complaint in each ward
          lat: { $first: { $arrayElemAt: ["$location.coordinates", 1] } },
          lng: { $first: { $arrayElemAt: ["$location.coordinates", 0] } },
        },
      },
    ]);

    const formattedData = rawData.map((item) => ({
      ward: `Ward ${item._id}`,
      wardNumber: item._id,
      lat: item.lat,
      lng: item.lng,
      weight: item.weight,
    }));

    res.status(200).json({
      success: true,
      data: formattedData,
    });
  } catch (error) {
    console.error("Complaint Density Error:", error);
    res.status(500).json({
      success: false,
      message: "Error generating complaint density maps.",
    });
  }
};

// =========================================================================
// 2. Ward Heatmaps
// =========================================================================
// GET /api/heatmaps/wards
export const getWardHeatmap = async (req, res) => {
  try {
    const rawData = await Complaint.aggregate([
      { $match: { location: { $exists: true } } },
      {
        $group: {
          _id: "$wardNumber",
          count: { $sum: 1 },
          lat: { $first: { $arrayElemAt: ["$location.coordinates", 1] } },
          lng: { $first: { $arrayElemAt: ["$location.coordinates", 0] } },
          // Category breakdown for each ward
          categories: { $push: "$category" },
        },
      },
    ]);

    const formatted = rawData.map((w) => ({
      ward: `Ward ${w._id}`,
      wardNumber: w._id,
      coordinates: { lat: w.lat, lng: w.lng },
      intensity: w.count,
    }));

    res.status(200).json({
      success: true,
      data: formatted,
    });
  } catch (error) {
    console.error("Ward Heatmap Error:", error);
    res.status(500).json({
      success: false,
      message: "Error generating ward heatmaps.",
    });
  }
};

// =========================================================================
// 3. Hotspots (Top 5 wards with most unresolved complaints)
// =========================================================================
// GET /api/heatmaps/hotspots
export const getHotspots = async (req, res) => {
  try {
    const hotspots = await Complaint.aggregate([
      { $match: { status: { $nin: ["RESOLVED", "COMPLETED", "CLOSED"] } } },
      {
        $group: {
          _id: "$wardNumber",
          count: { $sum: 1 },
          lat: { $first: { $arrayElemAt: ["$location.coordinates", 1] } },
          lng: { $first: { $arrayElemAt: ["$location.coordinates", 0] } },
        },
      },
      { $sort: { count: -1 } },
      { $limit: 5 },
    ]);

    const formatted = hotspots.map((item) => ({
      ward: `Ward ${item._id}`,
      wardNumber: item._id,
      coordinates: { lat: item.lat, lng: item.lng },
      unresolvedCount: item.count,
    }));

    res.status(200).json({
      success: true,
      data: formatted,
    });
  } catch (error) {
    console.error("Hotspots Error:", error);
    res.status(500).json({
      success: false,
      message: "Error generating hotspot details.",
    });
  }
};
