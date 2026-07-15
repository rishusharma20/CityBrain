// ============================================================================
// CityBrains — Complaint Helpers
// Business logic utilities for the complaint lifecycle.
// Separated from controllers for testability and reuse.
// ============================================================================

import Complaint from "../models/Complaint.js";
import Counter from "../models/Counter.js";
import User from "../models/User.js";
import {
  CATEGORY_TO_DEPARTMENT,
  HIGH_PRIORITY_CATEGORIES,
  DUPLICATE_CONFIG,
  STATUS_TRANSITIONS,
} from "../constants/complaintConstants.js";

// ---------------------------------------------------------------------------
// 1. Generate Complaint ID (CB-000001, CB-000002, ...)
// Uses atomic findOneAndUpdate to guarantee uniqueness under concurrency.
// ---------------------------------------------------------------------------
export const generateComplaintId = async () => {
  const counter = await Counter.findOneAndUpdate(
    { name: "complaintId" },
    { $inc: { sequence: 1 } },
    { new: true, upsert: true }
  );

  const paddedNumber = String(counter.sequence).padStart(6, "0");
  return `CB-${paddedNumber}`;
};

// ---------------------------------------------------------------------------
// 2. Detect Duplicate Complaints
// Finds open complaints within a geographic radius with the same category.
// Returns array of potential duplicate complaints.
// ---------------------------------------------------------------------------
export const detectDuplicates = async (category, longitude, latitude) => {
  const { RADIUS_METERS, TIME_WINDOW_DAYS } = DUPLICATE_CONFIG;

  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - TIME_WINDOW_DAYS);

  try {
    const duplicates = await Complaint.find({
      location: {
        $near: {
          $geometry: {
            type: "Point",
            coordinates: [longitude, latitude],
          },
          $maxDistance: RADIUS_METERS,
        },
      },
      category,
      status: { $nin: ["RESOLVED", "COMPLETED", "CLOSED"] },
      createdAt: { $gte: cutoffDate },
    })
      .select("complaintId title status priority wardNumber createdAt")
      .limit(10)
      .lean();

    return duplicates;
  } catch (error) {
    // If 2dsphere index is not ready, log and return empty
    console.error("Duplicate detection query failed:", error.message);
    return [];
  }
};

// ---------------------------------------------------------------------------
// 3. Assign Priority
// Rules:
//   - Sewage/Drainage → default HIGH
//   - If duplicate count in same ward > ESCALATION_THRESHOLD → CRITICAL
//   - Otherwise → MEDIUM
// ---------------------------------------------------------------------------
export const assignPriority = async (category, wardNumber) => {
  // High-risk categories start at HIGH
  if (HIGH_PRIORITY_CATEGORIES.includes(category)) {
    // Check for duplicate volume escalation
    const wardDuplicateCount = await Complaint.countDocuments({
      category,
      wardNumber,
      status: { $nin: ["RESOLVED", "COMPLETED", "CLOSED"] },
    });

    if (wardDuplicateCount >= DUPLICATE_CONFIG.ESCALATION_THRESHOLD) {
      return "CRITICAL";
    }

    return "HIGH";
  }

  // Standard categories — check ward duplicate volume
  const wardDuplicateCount = await Complaint.countDocuments({
    category,
    wardNumber,
    status: { $nin: ["RESOLVED", "COMPLETED", "CLOSED"] },
  });

  if (wardDuplicateCount >= DUPLICATE_CONFIG.ESCALATION_THRESHOLD) {
    return "CRITICAL";
  }

  return "MEDIUM";
};

// ---------------------------------------------------------------------------
// 4. Auto-Assign Officer
// Finds officers matching department + ward, picks the one with the least
// active (non-resolved/completed/closed) complaints.
// Returns officer _id or null if no match found.
// ---------------------------------------------------------------------------
export const autoAssignOfficer = async (department, wardNumber) => {
  try {
    // Map new department names to the existing User model department values
    const deptMapping = {
      Sanitation: "Garbage",
      Roads: "Road",
      Electrical: "Streetlight",
      Water: "Water Supply",
      General: null, // No department match for General
    };

    const userDept = deptMapping[department];

    if (!userDept) {
      return null; // No officer mapping for General department
    }

    // Find all officers in the matching department and ward
    const officers = await User.find({
      role: "Officer",
      department: userDept,
      ward: String(wardNumber),
      isBlocked: false,
      isVerified: true,
    }).select("_id fullName");

    if (officers.length === 0) {
      return null;
    }

    // For each officer, count their active complaints
    const officerWorkloads = await Promise.all(
      officers.map(async (officer) => {
        const activeCount = await Complaint.countDocuments({
          assignedOfficer: officer._id,
          status: { $nin: ["RESOLVED", "COMPLETED", "CLOSED"] },
        });
        return { officer, activeCount };
      })
    );

    // Sort by ascending workload, pick the least loaded
    officerWorkloads.sort((a, b) => a.activeCount - b.activeCount);

    return officerWorkloads[0].officer._id;
  } catch (error) {
    console.error("Auto-assign officer failed:", error.message);
    return null;
  }
};

// ---------------------------------------------------------------------------
// 5. Validate Status Transition
// Checks the state machine to ensure the transition is legal.
// Returns { valid: boolean, message: string }
// ---------------------------------------------------------------------------
export const validateStatusTransition = (currentStatus, newStatus) => {
  const allowedTransitions = STATUS_TRANSITIONS[currentStatus];

  if (!allowedTransitions) {
    return {
      valid: false,
      message: `Unknown current status: ${currentStatus}`,
    };
  }

  if (!allowedTransitions.includes(newStatus)) {
    return {
      valid: false,
      message: `Invalid status transition: ${currentStatus} → ${newStatus}. Allowed transitions from ${currentStatus}: ${allowedTransitions.length > 0 ? allowedTransitions.join(", ") : "None (terminal state)"}`,
    };
  }

  return { valid: true, message: "Transition valid" };
};

// ---------------------------------------------------------------------------
// 6. Build Pagination Response
// Standardised pagination metadata for frontend consumption.
// ---------------------------------------------------------------------------
export const buildPaginationMeta = (page, limit, totalResults) => {
  const totalPages = Math.ceil(totalResults / limit);

  return {
    currentPage: page,
    totalPages,
    totalResults,
    limit,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1,
  };
};
