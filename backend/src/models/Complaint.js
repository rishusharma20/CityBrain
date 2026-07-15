// ============================================================================
// CityBrains — Complaint Model
// The CENTRAL schema of the entire CityBrains project.
//
// This model is consumed by:
//   - Complaint Module (CRUD + lifecycle)
//   - Officer Module (accept, update, resolve)
//   - Admin Module (monitor, assign, statistics)
//   - Analytics Module (department/ward/time-series aggregations)
//   - Heatmap Module (geo-spatial queries via 2dsphere index)
//   - Leaderboard Module (officer performance rankings)
//   - Public Dashboard (category/status distributions)
//   - Notification Module (status change triggers)
//
// Design Decisions:
//   1. GeoJSON `location` field with 2dsphere index for heatmaps + duplicate detection
//   2. Full `statusHistory` audit trail for analytics and accountability
//   3. `duplicateOf` self-reference for duplicate complaint linking
//   4. `complaintId` human-readable ID (CB-XXXXXX) for citizen-facing communication
//   5. Category → Department auto-mapping via pre-save hook
//   6. Priority-based SLA deadline calculation
// ============================================================================

import mongoose from "mongoose";
import {
  PRIORITY_LEVELS,
  CATEGORIES,
  STATUSES,
  DEPARTMENTS,
  CATEGORY_TO_DEPARTMENT,
  PRIORITY_SLA_HOURS,
} from "../constants/complaintConstants.js";

// ---------------------------------------------------------------------------
// Sub-Schema: Status History Entry
// Records every status change with who changed it, when, and why.
// ---------------------------------------------------------------------------
const statusHistorySchema = new mongoose.Schema(
  {
    status: {
      type: String,
      required: true,
      enum: STATUSES,
    },
    changedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    remarks: {
      type: String,
      trim: true,
      default: "",
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

// ---------------------------------------------------------------------------
// Main Schema: Complaint
// ---------------------------------------------------------------------------
const complaintSchema = new mongoose.Schema(
  {
    // Human-readable complaint ID (CB-000001, CB-000002, ...)
    complaintId: {
      type: String,
      unique: true,
      index: true,
    },

    // ---- Core Details ----
    title: {
      type: String,
      required: [true, "Complaint title is required"],
      trim: true,
      minlength: [5, "Title must be at least 5 characters"],
      maxlength: [150, "Title cannot exceed 150 characters"],
    },

    description: {
      type: String,
      required: [true, "Complaint description is required"],
      trim: true,
      minlength: [20, "Description must be at least 20 characters"],
      maxlength: [2000, "Description cannot exceed 2000 characters"],
    },

    images: {
      type: [String],
      validate: {
        validator: function (arr) {
          return arr.length <= 5;
        },
        message: "A maximum of 5 images are allowed per complaint",
      },
      default: [],
    },

    // ---- Classification ----
    category: {
      type: String,
      required: [true, "Complaint category is required"],
      enum: {
        values: CATEGORIES,
        message: "{VALUE} is not a valid complaint category",
      },
    },

    priority: {
      type: String,
      enum: {
        values: PRIORITY_LEVELS,
        message: "{VALUE} is not a valid priority level",
      },
      default: "MEDIUM",
    },

    status: {
      type: String,
      enum: {
        values: STATUSES,
        message: "{VALUE} is not a valid complaint status",
      },
      default: "PENDING",
    },

    department: {
      type: String,
      enum: {
        values: DEPARTMENTS,
        message: "{VALUE} is not a valid department",
      },
    },

    // ---- Location (GeoJSON for 2dsphere queries) ----
    location: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point",
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        required: [true, "Location coordinates are required"],
        validate: {
          validator: function (coords) {
            if (!Array.isArray(coords) || coords.length !== 2) return false;
            const [lng, lat] = coords;
            return lng >= -180 && lng <= 180 && lat >= -90 && lat <= 90;
          },
          message: "Invalid coordinates. Must be [longitude, latitude] within valid ranges",
        },
      },
    },

    address: {
      type: String,
      required: [true, "Address is required"],
      trim: true,
      maxlength: [500, "Address cannot exceed 500 characters"],
    },

    wardNumber: {
      type: Number,
      required: [true, "Ward number is required"],
      min: [1, "Ward number must be at least 1"],
      max: [100, "Ward number cannot exceed 100"],
    },

    // ---- Relationships ----
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Creator reference is required"],
    },

    assignedOfficer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    // ---- Resolution ----
    resolutionRemarks: {
      type: String,
      trim: true,
      default: "",
    },

    completionRemarks: {
      type: String,
      trim: true,
      default: "",
    },

    // ---- Audit Trail ----
    statusHistory: [statusHistorySchema],

    // ---- Duplicate Detection ----
    duplicateOf: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Complaint",
      default: null,
    },

    upvoteCount: {
      type: Number,
      default: 1,
      min: 1,
    },

    // ---- SLA ----
    slaDeadline: {
      type: Date,
    },

    resolvedAt: {
      type: Date,
      default: null,
    },

    closedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ---------------------------------------------------------------------------
// Virtuals — Convenience getters for frontend consumption
// ---------------------------------------------------------------------------
complaintSchema.virtual("latitude").get(function () {
  return this.location?.coordinates?.[1] ?? null;
});

complaintSchema.virtual("longitude").get(function () {
  return this.location?.coordinates?.[0] ?? null;
});

// ---------------------------------------------------------------------------
// Indexes — Optimised for all consuming modules
// ---------------------------------------------------------------------------

// Geo-spatial index: Heatmaps, duplicate detection, proximity queries
complaintSchema.index({ location: "2dsphere" });

// Compound: Status-based filtering with department (Admin dashboard, analytics)
complaintSchema.index({ status: 1, department: 1 });

// User complaint history (Citizen dashboard)
complaintSchema.index({ createdBy: 1, createdAt: -1 });

// Category filtering (Analytics, public dashboard)
complaintSchema.index({ category: 1 });

// Priority filtering (Officer triage, admin escalation view)
complaintSchema.index({ priority: 1 });

// Officer workload queries (Leaderboard, auto-assignment)
complaintSchema.index({ assignedOfficer: 1, status: 1 });

// Ward-based queries (Ward-level analytics)
complaintSchema.index({ wardNumber: 1, status: 1 });

// Duplicate linkage queries
complaintSchema.index({ duplicateOf: 1 });

// SLA deadline monitoring (Escalation cron, admin alerts)
complaintSchema.index({ slaDeadline: 1, status: 1 });

// ---------------------------------------------------------------------------
// Pre-save Hook — Auto-derive department and SLA deadline
// ---------------------------------------------------------------------------
complaintSchema.pre("save", function (next) {
  // Auto-derive department from category
  if (this.isModified("category") || this.isNew) {
    this.department = CATEGORY_TO_DEPARTMENT[this.category] || "General";
  }

  // Auto-calculate SLA deadline based on priority (only on creation)
  if (this.isNew && !this.slaDeadline) {
    const hoursToResolve = PRIORITY_SLA_HOURS[this.priority] || 72;
    this.slaDeadline = new Date(Date.now() + hoursToResolve * 60 * 60 * 1000);
  }

  // Record initial status in history on creation
  if (this.isNew && this.statusHistory.length === 0) {
    this.statusHistory.push({
      status: this.status,
      changedBy: this.createdBy,
      remarks: "Complaint created",
      timestamp: new Date(),
    });
  }

  next();
});

// ---------------------------------------------------------------------------
// Static Methods — Reusable query helpers for other modules
// ---------------------------------------------------------------------------

/**
 * Find complaints within a geo-radius.
 * Used by: Heatmap Module, Duplicate Detection
 */
complaintSchema.statics.findNearby = function (longitude, latitude, radiusMeters, additionalFilter = {}) {
  return this.find({
    location: {
      $near: {
        $geometry: {
          type: "Point",
          coordinates: [longitude, latitude],
        },
        $maxDistance: radiusMeters,
      },
    },
    ...additionalFilter,
  });
};

/**
 * Get status distribution counts.
 * Used by: Analytics Module, Admin Dashboard, Public Dashboard
 */
complaintSchema.statics.getStatusDistribution = function (filter = {}) {
  return this.aggregate([
    { $match: filter },
    {
      $group: {
        _id: "$status",
        count: { $sum: 1 },
      },
    },
    { $sort: { count: -1 } },
  ]);
};

/**
 * Get category distribution counts.
 * Used by: Analytics Module, Public Dashboard
 */
complaintSchema.statics.getCategoryDistribution = function (filter = {}) {
  return this.aggregate([
    { $match: filter },
    {
      $group: {
        _id: "$category",
        count: { $sum: 1 },
      },
    },
    { $sort: { count: -1 } },
  ]);
};

/**
 * Get department workload.
 * Used by: Admin Dashboard, Leaderboard Module
 */
complaintSchema.statics.getDepartmentWorkload = function () {
  return this.aggregate([
    {
      $group: {
        _id: "$department",
        total: { $sum: 1 },
        pending: {
          $sum: {
            $cond: [{ $in: ["$status", ["PENDING", "ASSIGNED", "ACCEPTED", "IN_PROGRESS"]] }, 1, 0],
          },
        },
        resolved: {
          $sum: {
            $cond: [{ $in: ["$status", ["RESOLVED", "COMPLETED", "CLOSED"]] }, 1, 0],
          },
        },
      },
    },
    { $sort: { total: -1 } },
  ]);
};

const Complaint = mongoose.model("Complaint", complaintSchema);

export default Complaint;
