// ============================================================================
// CityBrains — Complaint Validators
// Express middleware functions for request validation.
// Returns 400 with field-level error messages on validation failure.
// ============================================================================

import {
  CATEGORIES,
  PRIORITY_LEVELS,
  STATUSES,
} from "../constants/complaintConstants.js";

// ---------------------------------------------------------------------------
// Helper: Collect validation errors
// ---------------------------------------------------------------------------
const collectErrors = (checks) => {
  const errors = {};
  for (const [field, message] of checks) {
    if (message) {
      errors[field] = message;
    }
  }
  return errors;
};

// ---------------------------------------------------------------------------
// 1. Validate Create Complaint
// ---------------------------------------------------------------------------
export const validateCreateComplaint = (req, res, next) => {
  const { title, description, category, latitude, longitude, address, wardNumber, images } = req.body;

  const checks = [
    [
      "title",
      !title || typeof title !== "string"
        ? "Title is required"
        : title.trim().length < 5
          ? "Title must be at least 5 characters"
          : title.trim().length > 150
            ? "Title cannot exceed 150 characters"
            : null,
    ],
    [
      "description",
      !description || typeof description !== "string"
        ? "Description is required"
        : description.trim().length < 20
          ? "Description must be at least 20 characters"
          : description.trim().length > 2000
            ? "Description cannot exceed 2000 characters"
            : null,
    ],
    [
      "category",
      !category
        ? "Category is required"
        : !CATEGORIES.includes(category)
          ? `Invalid category. Valid options: ${CATEGORIES.join(", ")}`
          : null,
    ],
    [
      "latitude",
      latitude === undefined || latitude === null
        ? "Latitude is required"
        : typeof latitude !== "number" || latitude < -90 || latitude > 90
          ? "Latitude must be a number between -90 and 90"
          : null,
    ],
    [
      "longitude",
      longitude === undefined || longitude === null
        ? "Longitude is required"
        : typeof longitude !== "number" || longitude < -180 || longitude > 180
          ? "Longitude must be a number between -180 and 180"
          : null,
    ],
    [
      "address",
      !address || typeof address !== "string"
        ? "Address is required"
        : address.trim().length > 500
          ? "Address cannot exceed 500 characters"
          : null,
    ],
    [
      "wardNumber",
      wardNumber === undefined || wardNumber === null
        ? "Ward number is required"
        : typeof wardNumber !== "number" || !Number.isInteger(wardNumber) || wardNumber < 1 || wardNumber > 100
          ? "Ward number must be an integer between 1 and 100"
          : null,
    ],
    [
      "images",
      images !== undefined && !Array.isArray(images)
        ? "Images must be an array of URLs"
        : Array.isArray(images) && images.length > 5
          ? "Maximum 5 images allowed"
          : Array.isArray(images) && images.some((img) => typeof img !== "string" || img.trim() === "")
            ? "Each image must be a non-empty URL string"
            : null,
    ],
  ];

  const errors = collectErrors(checks);

  if (Object.keys(errors).length > 0) {
    return res.status(400).json({
      success: false,
      message: "Validation failed. Please fix the following errors.",
      errors,
    });
  }

  next();
};

// ---------------------------------------------------------------------------
// 2. Validate Update Complaint
// ---------------------------------------------------------------------------
export const validateUpdateComplaint = (req, res, next) => {
  const { status, priority, resolutionRemarks, completionRemarks } = req.body;
  const errors = {};

  if (status !== undefined && !STATUSES.includes(status)) {
    errors.status = `Invalid status. Valid options: ${STATUSES.join(", ")}`;
  }

  if (priority !== undefined && !PRIORITY_LEVELS.includes(priority)) {
    errors.priority = `Invalid priority. Valid options: ${PRIORITY_LEVELS.join(", ")}`;
  }

  if (resolutionRemarks !== undefined && typeof resolutionRemarks !== "string") {
    errors.resolutionRemarks = "Resolution remarks must be a string";
  }

  if (completionRemarks !== undefined && typeof completionRemarks !== "string") {
    errors.completionRemarks = "Completion remarks must be a string";
  }

  if (Object.keys(errors).length > 0) {
    return res.status(400).json({
      success: false,
      message: "Validation failed. Please fix the following errors.",
      errors,
    });
  }

  next();
};

// ---------------------------------------------------------------------------
// 3. Validate Query Parameters
// ---------------------------------------------------------------------------
export const validateQueryParams = (req, res, next) => {
  const { page, limit, status, category, priority } = req.query;
  const errors = {};

  if (page !== undefined) {
    const pageNum = parseInt(page, 10);
    if (isNaN(pageNum) || pageNum < 1) {
      errors.page = "Page must be a positive integer";
    }
  }

  if (limit !== undefined) {
    const limitNum = parseInt(limit, 10);
    if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
      errors.limit = "Limit must be an integer between 1 and 100";
    }
  }

  if (status !== undefined && !STATUSES.includes(status)) {
    errors.status = `Invalid status filter. Valid options: ${STATUSES.join(", ")}`;
  }

  if (category !== undefined && !CATEGORIES.includes(category)) {
    errors.category = `Invalid category filter. Valid options: ${CATEGORIES.join(", ")}`;
  }

  if (priority !== undefined && !PRIORITY_LEVELS.includes(priority)) {
    errors.priority = `Invalid priority filter. Valid options: ${PRIORITY_LEVELS.join(", ")}`;
  }

  if (Object.keys(errors).length > 0) {
    return res.status(400).json({
      success: false,
      message: "Invalid query parameters.",
      errors,
    });
  }

  next();
};
