// ============================================================================
// CityBrains — Counter Model
// Provides atomic auto-increment sequences for generating human-readable IDs.
// Used by complaintHelpers.generateComplaintId() to produce CB-000001, etc.
// ============================================================================

import mongoose from "mongoose";

const counterSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  sequence: {
    type: Number,
    default: 0,
  },
});

const Counter = mongoose.model("Counter", counterSchema);

export default Counter;
