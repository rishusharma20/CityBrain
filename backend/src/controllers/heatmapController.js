import Complaint from "../models/Complaint.js";

// Ward coordinates configuration
const WARD_GEO_MAPPING = {
  "Ward 1": { lat: 12.9716, lng: 77.5946 },
  "Ward 2": { lat: 12.9216, lng: 77.5846 },
  "Ward 3": { lat: 12.9816, lng: 77.6046 },
  "Ward 4": { lat: 12.9516, lng: 77.5746 },
  "Ward 5": { lat: 12.9916, lng: 77.6146 },
  "Ward 12": { lat: 12.9416, lng: 77.5646 },
  "Ward 15": { lat: 12.9316, lng: 77.5546 },
};

const getCoords = (ward) => WARD_GEO_MAPPING[ward] || { lat: 12.9716, lng: 77.5946 };

// =========================================================================
// 1. Complaint Density (Coordinate list with weights)
// =========================================================================
// GET /api/heatmaps/complaint-density
export const getComplaintDensity = async (req, res) => {
  try {
    const rawData = await Complaint.aggregate([
      { $group: { _id: "$ward", weight: { $sum: 1 } } }
    ]);

    const formattedData = rawData.map((item) => {
      const coords = getCoords(item._id);
      return {
        ward: item._id,
        lat: coords.lat,
        lng: coords.lng,
        weight: item.weight,
      };
    });

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
      { $group: { _id: "$ward", count: { $sum: 1 } } }
    ]);

    const formatted = rawData.map((w) => ({
      ward: w._id,
      coordinates: getCoords(w._id),
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
// 3. Hotspots
// =========================================================================
// GET /api/heatmaps/hotspots
export const getHotspots = async (req, res) => {
  try {
    const hotspots = await Complaint.aggregate([
      { $match: { status: { $ne: "Resolved" } } },
      { $group: { _id: "$ward", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 },
    ]);

    const formatted = hotspots.map((item) => ({
      ward: item._id,
      coordinates: getCoords(item._id),
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
