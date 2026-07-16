// ============================================================================
// CityBrains — Complaint Controller
// 10 production-grade API handlers for the Complaint Management Module.
//
// Every handler follows:
//   1. Consistent { success, message, data, pagination? } response shape
//   2. Proper HTTP status codes (200, 201, 400, 403, 404, 500)
//   3. Role-based access enforcement
//   4. Populated references for frontend-ready responses
//   5. Comprehensive error handling
// ============================================================================

import Complaint from "../models/Complaint.js";
import {
  generateComplaintId,
  detectDuplicates,
  assignPriority,
  autoAssignOfficer,
  validateStatusTransition,
  buildPaginationMeta,
} from "../utils/complaintHelpers.js";
import { sendSystemNotification } from "../utils/notificationHelper.js";
import { CATEGORY_TO_DEPARTMENT } from "../constants/complaintConstants.js";

// ---------------------------------------------------------------------------
// Population fields — reused across handlers for consistency
// ---------------------------------------------------------------------------
const POPULATE_CREATED_BY = { path: "createdBy", select: "fullName email phone profileImage" };
const POPULATE_OFFICER = { path: "assignedOfficer", select: "fullName email phone department ward" };
const POPULATE_DUPLICATE = { path: "duplicateOf", select: "complaintId title status" };
const POPULATE_HISTORY_USER = { path: "statusHistory.changedBy", select: "fullName role" };

// =========================================================================
// 1. CREATE COMPLAINT
// =========================================================================
// POST /api/complaints
// Role: Citizen
// Flow: Create → Geo Tag → Duplicate Detection → Priority → Department →
//       Officer Assigned → Notifications
// =========================================================================
export const createComplaint = async (req, res) => {
  try {
    const {
      title,
      description,
      category,
      latitude,
      longitude,
      address,
      wardNumber,
      images,
    } = req.body;

    // Step 1: Generate unique complaint ID
    const complaintId = await generateComplaintId();

    // Step 2: Auto-derive department from category
    const department = CATEGORY_TO_DEPARTMENT[category] || "General";

    // Step 3: Duplicate detection
    const duplicates = await detectDuplicates(category, longitude, latitude);
    let duplicateOf = null;

    if (duplicates.length > 0) {
      // Link to the earliest open duplicate
      duplicateOf = duplicates[0]._id;

      // Increment upvote count on the parent complaint
      await Complaint.findByIdAndUpdate(duplicates[0]._id, {
        $inc: { upvoteCount: 1 },
      });
    }

    // Step 4: Auto-assign priority
    const priority = await assignPriority(category, wardNumber);

    // Step 5: Auto-assign officer
    const assignedOfficer = await autoAssignOfficer(department, wardNumber);
    const initialStatus = assignedOfficer ? "ASSIGNED" : "PENDING";

    // Step 6: Create the complaint
    const complaint = await Complaint.create({
      complaintId,
      title: title.trim(),
      description: description.trim(),
      images: images || [],
      category,
      priority,
      status: initialStatus,
      department,
      location: {
        type: "Point",
        coordinates: [longitude, latitude],
      },
      address: address.trim(),
      wardNumber,
      createdBy: req.user._id,
      assignedOfficer,
      duplicateOf,
      statusHistory: [
        {
          status: initialStatus,
          changedBy: req.user._id,
          remarks: assignedOfficer
            ? "Complaint created and auto-assigned to officer"
            : "Complaint created, awaiting officer assignment",
        },
      ],
    });

    // Step 7: Populate for response
    await complaint.populate([POPULATE_CREATED_BY, POPULATE_OFFICER]);

    // Step 8: Send notifications (fire-and-forget)
    if (assignedOfficer) {
      sendSystemNotification({
        recipient: assignedOfficer,
        sender: req.user._id,
        type: "Assignment",
        title: "New Complaint Assigned",
        message: `Complaint "${title}" (${complaintId}) has been auto-assigned to you. Category: ${category}, Priority: ${priority}`,
        complaint: complaint._id,
      });
    }

    // Build response
    const responseData = {
      complaint,
      duplicateDetection: {
        isDuplicate: duplicates.length > 0,
        duplicateCount: duplicates.length,
        linkedTo: duplicateOf ? duplicates[0].complaintId : null,
      },
      autoAssignment: {
        officerAssigned: !!assignedOfficer,
        department,
        priority,
      },
    };

    return res.status(201).json({
      success: true,
      message: duplicates.length > 0
        ? `Complaint registered successfully. ${duplicates.length} similar complaint(s) found in this area — linked as duplicate.`
        : "Complaint registered successfully.",
      data: responseData,
    });
  } catch (error) {
    console.error("Create Complaint Error:", error);

    // Handle Mongoose validation errors
    if (error.name === "ValidationError") {
      const errors = {};
      for (const field in error.errors) {
        errors[field] = error.errors[field].message;
      }
      return res.status(400).json({
        success: false,
        message: "Validation failed.",
        errors,
      });
    }

    return res.status(500).json({
      success: false,
      message: "Internal Server Error creating complaint.",
    });
  }
};

// =========================================================================
// 2. GET ALL COMPLAINTS
// =========================================================================
// GET /api/complaints?page=1&limit=10&search=pothole&sortBy=createdAt&order=desc
// Role: Admin, Officer
// =========================================================================
export const getAllComplaints = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const skip = (page - 1) * limit;
    const { search, sortBy = "createdAt", order = "desc" } = req.query;

    // Build filter
    const filter = {};

    // If officer, scope to their department
    if (req.user.role === "Officer") {
      const deptMapping = {
        Garbage: "Sanitation",
        Road: "Roads",
        Streetlight: "Electrical",
        "Water Supply": "Water",
        Drainage: "Water",
      };
      const mappedDept = deptMapping[req.user.department] || req.user.department;
      if (mappedDept) {
        filter.department = mappedDept;
      }
    }

    // Text search on title and description
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
        { complaintId: { $regex: search, $options: "i" } },
      ];
    }

    // Sort configuration
    const sortConfig = {};
    const validSortFields = ["createdAt", "updatedAt", "priority", "status", "category"];
    sortConfig[validSortFields.includes(sortBy) ? sortBy : "createdAt"] = order === "asc" ? 1 : -1;

    const [complaints, totalResults] = await Promise.all([
      Complaint.find(filter)
        .sort(sortConfig)
        .skip(skip)
        .limit(limit)
        .populate(POPULATE_CREATED_BY)
        .populate(POPULATE_OFFICER)
        .lean(),
      Complaint.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      message: "Complaints retrieved successfully.",
      data: complaints,
      pagination: buildPaginationMeta(page, limit, totalResults),
    });
  } catch (error) {
    console.error("Get All Complaints Error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error retrieving complaints.",
    });
  }
};

// =========================================================================
// 3. GET COMPLAINT BY ID
// =========================================================================
// GET /api/complaints/:id
// Role: Any authenticated user
// Citizens can only view their own complaints.
// =========================================================================
export const getComplaintById = async (req, res) => {
  try {
    const complaint = await Complaint.findById(req.params.id)
      .populate(POPULATE_CREATED_BY)
      .populate(POPULATE_OFFICER)
      .populate(POPULATE_DUPLICATE)
      .populate(POPULATE_HISTORY_USER);

    if (!complaint) {
      return res.status(404).json({
        success: false,
        message: "Complaint not found.",
      });
    }

    // Citizens can only view their own complaints
    if (
      req.user.role === "Citizen" &&
      complaint.createdBy._id.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({
        success: false,
        message: "Forbidden: You can only view your own complaints.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Complaint details retrieved successfully.",
      data: complaint,
    });
  } catch (error) {
    console.error("Get Complaint By ID Error:", error);

    // Handle invalid MongoDB ObjectId
    if (error.kind === "ObjectId") {
      return res.status(400).json({
        success: false,
        message: "Invalid complaint ID format.",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Internal Server Error retrieving complaint.",
    });
  }
};

// =========================================================================
// 4. UPDATE COMPLAINT
// =========================================================================
// PUT /api/complaints/:id
// Role: Officer, Admin
// Handles: Status transitions, resolution remarks, officer reassignment,
//          priority changes. Enforces the status state machine.
// =========================================================================
export const updateComplaint = async (req, res) => {
  try {
    const complaint = await Complaint.findById(req.params.id);

    if (!complaint) {
      return res.status(404).json({
        success: false,
        message: "Complaint not found.",
      });
    }

    const {
      status,
      priority,
      resolutionRemarks,
      completionRemarks,
      assignedOfficer,
      remarks,
    } = req.body;

    // --- Status Transition ---
    if (status && status !== complaint.status) {
      const transition = validateStatusTransition(complaint.status, status);

      if (!transition.valid) {
        return res.status(400).json({
          success: false,
          message: transition.message,
        });
      }

      // Business rules for specific transitions
      if (status === "RESOLVED" && !resolutionRemarks && !complaint.resolutionRemarks) {
        return res.status(400).json({
          success: false,
          message: "Resolution remarks are required when resolving a complaint.",
        });
      }

      if (status === "COMPLETED" && !completionRemarks && !complaint.completionRemarks) {
        return res.status(400).json({
          success: false,
          message: "Completion remarks are required when completing a complaint.",
        });
      }

      complaint.status = status;

      // Record timestamps for specific statuses
      if (status === "RESOLVED") {
        complaint.resolvedAt = new Date();
      }
      if (status === "CLOSED") {
        complaint.closedAt = new Date();
      }

      // Add to status history
      complaint.statusHistory.push({
        status,
        changedBy: req.user._id,
        remarks: remarks || `Status updated to ${status}`,
        timestamp: new Date(),
      });

      // Notify citizen of status change
      sendSystemNotification({
        recipient: complaint.createdBy,
        sender: req.user._id,
        type: status === "RESOLVED" ? "Completion" : status === "ESCALATED" ? "Escalation" : "Status_Update",
        title: `Complaint ${status}`,
        message: `Your complaint "${complaint.title}" (${complaint.complaintId}) status has been updated to ${status}.${remarks ? ` Remarks: ${remarks}` : ""}`,
        complaint: complaint._id,
      });
    }

    // --- Priority Update ---
    if (priority && priority !== complaint.priority) {
      complaint.priority = priority;
    }

    // --- Resolution Remarks ---
    if (resolutionRemarks) {
      complaint.resolutionRemarks = resolutionRemarks;
    }

    // --- Completion Remarks ---
    if (completionRemarks) {
      complaint.completionRemarks = completionRemarks;
    }

    // --- Officer Reassignment (Admin only) ---
    if (assignedOfficer && req.user.role === "Admin") {
      complaint.assignedOfficer = assignedOfficer;

      if (complaint.status === "PENDING") {
        complaint.status = "ASSIGNED";
        complaint.statusHistory.push({
          status: "ASSIGNED",
          changedBy: req.user._id,
          remarks: "Officer assigned by Admin",
          timestamp: new Date(),
        });
      }

      // Notify newly assigned officer
      sendSystemNotification({
        recipient: assignedOfficer,
        sender: req.user._id,
        type: "Assignment",
        title: "Complaint Assigned to You",
        message: `Admin has assigned complaint "${complaint.title}" (${complaint.complaintId}) to you.`,
        complaint: complaint._id,
      });
    }

    await complaint.save();

    // Populate for response
    await complaint.populate([POPULATE_CREATED_BY, POPULATE_OFFICER, POPULATE_HISTORY_USER]);

    return res.status(200).json({
      success: true,
      message: "Complaint updated successfully.",
      data: complaint,
    });
  } catch (error) {
    console.error("Update Complaint Error:", error);

    if (error.kind === "ObjectId") {
      return res.status(400).json({
        success: false,
        message: "Invalid complaint ID format.",
      });
    }

    if (error.name === "ValidationError") {
      const errors = {};
      for (const field in error.errors) {
        errors[field] = error.errors[field].message;
      }
      return res.status(400).json({
        success: false,
        message: "Validation failed.",
        errors,
      });
    }

    return res.status(500).json({
      success: false,
      message: "Internal Server Error updating complaint.",
    });
  }
};

// =========================================================================
// 5. DELETE COMPLAINT
// =========================================================================
// DELETE /api/complaints/:id
// Role: Admin
// Only PENDING complaints can be deleted.
// =========================================================================
export const deleteComplaint = async (req, res) => {
  try {
    const complaint = await Complaint.findById(req.params.id);

    if (!complaint) {
      return res.status(404).json({
        success: false,
        message: "Complaint not found.",
      });
    }

    if (complaint.status !== "PENDING") {
      return res.status(400).json({
        success: false,
        message: `Cannot delete complaint with status "${complaint.status}". Only PENDING complaints can be deleted.`,
      });
    }

    await Complaint.findByIdAndDelete(req.params.id);

    // Notify citizen
    sendSystemNotification({
      recipient: complaint.createdBy,
      type: "Info",
      title: "Complaint Removed",
      message: `Your complaint "${complaint.title}" (${complaint.complaintId}) has been removed by the administrator.`,
    });

    return res.status(200).json({
      success: true,
      message: "Complaint deleted successfully.",
      data: {
        complaintId: complaint.complaintId,
        title: complaint.title,
      },
    });
  } catch (error) {
    console.error("Delete Complaint Error:", error);

    if (error.kind === "ObjectId") {
      return res.status(400).json({
        success: false,
        message: "Invalid complaint ID format.",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Internal Server Error deleting complaint.",
    });
  }
};

// =========================================================================
// 6. GET COMPLAINTS BY STATUS
// =========================================================================
// GET /api/complaints/status?status=PENDING&page=1&limit=10
// Role: Admin, Officer
// =========================================================================
export const getComplaintsByStatus = async (req, res) => {
  try {
    const { status } = req.query;
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const skip = (page - 1) * limit;

    if (!status) {
      return res.status(400).json({
        success: false,
        message: "Status query parameter is required. Example: ?status=PENDING",
      });
    }

    const filter = { status };

    // Scope officers to their department
    if (req.user.role === "Officer") {
      const deptMapping = {
        Garbage: "Sanitation",
        Road: "Roads",
        Streetlight: "Electrical",
        "Water Supply": "Water",
      };
      const mappedDept = deptMapping[req.user.department] || req.user.department;
      if (mappedDept) filter.department = mappedDept;
    }

    const [complaints, totalResults] = await Promise.all([
      Complaint.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate(POPULATE_CREATED_BY)
        .populate(POPULATE_OFFICER)
        .lean(),
      Complaint.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      message: `Complaints with status "${status}" retrieved successfully.`,
      data: complaints,
      pagination: buildPaginationMeta(page, limit, totalResults),
    });
  } catch (error) {
    console.error("Get Complaints By Status Error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error filtering by status.",
    });
  }
};

// =========================================================================
// 7. GET COMPLAINTS BY CATEGORY
// =========================================================================
// GET /api/complaints/category?category=Potholes&page=1&limit=10
// Role: Admin, Officer
// =========================================================================
export const getComplaintsByCategory = async (req, res) => {
  try {
    const { category } = req.query;
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const skip = (page - 1) * limit;

    if (!category) {
      return res.status(400).json({
        success: false,
        message: "Category query parameter is required. Example: ?category=Potholes",
      });
    }

    const filter = { category };

    const [complaints, totalResults] = await Promise.all([
      Complaint.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate(POPULATE_CREATED_BY)
        .populate(POPULATE_OFFICER)
        .lean(),
      Complaint.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      message: `Complaints in category "${category}" retrieved successfully.`,
      data: complaints,
      pagination: buildPaginationMeta(page, limit, totalResults),
    });
  } catch (error) {
    console.error("Get Complaints By Category Error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error filtering by category.",
    });
  }
};

// =========================================================================
// 8. GET USER COMPLAINT HISTORY
// =========================================================================
// GET /api/user/complaints?page=1&limit=10
// Role: Citizen
// Returns only the authenticated citizen's complaints.
// =========================================================================
export const getUserComplaints = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const skip = (page - 1) * limit;

    const filter = { createdBy: req.user._id };

    const [complaints, totalResults] = await Promise.all([
      Complaint.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate(POPULATE_OFFICER)
        .populate(POPULATE_DUPLICATE)
        .lean(),
      Complaint.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      message: "Your complaint history retrieved successfully.",
      data: complaints,
      pagination: buildPaginationMeta(page, limit, totalResults),
    });
  } catch (error) {
    console.error("Get User Complaints Error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error retrieving your complaints.",
    });
  }
};

// =========================================================================
// 9. GET DUPLICATE COMPLAINTS
// =========================================================================
// GET /api/complaints/duplicates?page=1&limit=10
// Role: Admin, Officer
// Returns all complaints that have been flagged as duplicates.
// =========================================================================
export const getDuplicateComplaints = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const skip = (page - 1) * limit;

    const filter = { duplicateOf: { $ne: null } };

    const [complaints, totalResults] = await Promise.all([
      Complaint.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate(POPULATE_CREATED_BY)
        .populate(POPULATE_OFFICER)
        .populate(POPULATE_DUPLICATE)
        .lean(),
      Complaint.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      message: "Duplicate complaints retrieved successfully.",
      data: complaints,
      pagination: buildPaginationMeta(page, limit, totalResults),
    });
  } catch (error) {
    console.error("Get Duplicate Complaints Error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error retrieving duplicate complaints.",
    });
  }
};

// =========================================================================
// 10. GET COMPLAINTS BY PRIORITY
// =========================================================================
// GET /api/complaints/priority?priority=CRITICAL&page=1&limit=10
// Role: Admin, Officer
// =========================================================================
export const getComplaintsByPriority = async (req, res) => {
  try {
    const { priority } = req.query;
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const skip = (page - 1) * limit;

    if (!priority) {
      return res.status(400).json({
        success: false,
        message: "Priority query parameter is required. Example: ?priority=CRITICAL",
      });
    }

    const filter = { priority };

    // Scope officers to their department
    if (req.user.role === "Officer") {
      const deptMapping = {
        Garbage: "Sanitation",
        Road: "Roads",
        Streetlight: "Electrical",
        "Water Supply": "Water",
      };
      const mappedDept = deptMapping[req.user.department] || req.user.department;
      if (mappedDept) filter.department = mappedDept;
    }

    const [complaints, totalResults] = await Promise.all([
      Complaint.find(filter)
        .sort({ slaDeadline: 1 }) // Urgency sort: soonest deadline first
        .skip(skip)
        .limit(limit)
        .populate(POPULATE_CREATED_BY)
        .populate(POPULATE_OFFICER)
        .lean(),
      Complaint.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      message: `Complaints with priority "${priority}" retrieved successfully.`,
      data: complaints,
      pagination: buildPaginationMeta(page, limit, totalResults),
    });
  } catch (error) {
    console.error("Get Complaints By Priority Error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error filtering by priority.",
    });
  }
};
