// ============================================================================
// CityBrains — Complaint Constants
// Single source of truth for all complaint-related enums and mappings.
// Used across models, controllers, validators, and helpers.
// ============================================================================

/**
 * Priority Levels
 * Determines SLA deadlines and complaint urgency.
 */
export const PRIORITY_LEVELS = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];

/**
 * Complaint Categories
 * Every complaint must belong to exactly one category.
 */
export const CATEGORIES = [
  "Garbage",
  "Potholes",
  "Street Lights",
  "Water Supply",
  "Drainage",
  "Sewage",
  "Infrastructure",
  "Others",
];

/**
 * Complaint Statuses
 * Represents the full lifecycle of a complaint from creation to closure.
 */
export const STATUSES = [
  "PENDING",
  "ASSIGNED",
  "ACCEPTED",
  "IN_PROGRESS",
  "UNDER_REVIEW",
  "ESCALATED",
  "RESOLVED",
  "COMPLETED",
  "CLOSED",
];

/**
 * Departments
 * Derived automatically from category — never set manually.
 */
export const DEPARTMENTS = ["Sanitation", "Roads", "Electrical", "Water", "General"];

/**
 * Category → Department Mapping
 * Used in pre-save hook to auto-derive the responsible department.
 */
export const CATEGORY_TO_DEPARTMENT = {
  Garbage: "Sanitation",
  Potholes: "Roads",
  "Street Lights": "Electrical",
  "Water Supply": "Water",
  Drainage: "Water",
  Sewage: "Sanitation",
  Infrastructure: "Roads",
  Others: "General",
};

/**
 * Status Transition State Machine
 * Defines which statuses are valid transitions from a given current status.
 * Prevents invalid lifecycle jumps (e.g., PENDING → COMPLETED).
 */
export const STATUS_TRANSITIONS = {
  PENDING: ["ASSIGNED", "ESCALATED", "CLOSED"],
  ASSIGNED: ["ACCEPTED", "ESCALATED", "PENDING"],
  ACCEPTED: ["IN_PROGRESS", "ESCALATED"],
  IN_PROGRESS: ["UNDER_REVIEW", "ESCALATED"],
  UNDER_REVIEW: ["RESOLVED", "IN_PROGRESS", "ESCALATED"],
  ESCALATED: ["ASSIGNED", "IN_PROGRESS", "CLOSED"],
  RESOLVED: ["COMPLETED", "IN_PROGRESS"],
  COMPLETED: ["CLOSED"],
  CLOSED: [], // Terminal state — no further transitions
};

/**
 * Priority → SLA Deadline (in hours)
 * Used to auto-calculate slaDeadline on complaint creation.
 */
export const PRIORITY_SLA_HOURS = {
  LOW: 168,      // 7 days
  MEDIUM: 72,    // 3 days
  HIGH: 24,      // 1 day
  CRITICAL: 6,   // 6 hours
};

/**
 * Categories that default to HIGH priority due to public health/safety impact.
 */
export const HIGH_PRIORITY_CATEGORIES = ["Sewage", "Drainage"];

/**
 * Duplicate detection configuration.
 */
export const DUPLICATE_CONFIG = {
  RADIUS_METERS: 500,          // Geo-radius for duplicate search
  TIME_WINDOW_DAYS: 30,        // Only check complaints from last N days
  ESCALATION_THRESHOLD: 5,     // Duplicate count to escalate to CRITICAL
};
