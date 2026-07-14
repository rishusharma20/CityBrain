import mongoose from "mongoose";

const remarkSchema = new mongoose.Schema(
  {
    officer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    text: {
      type: String,
      required: true,
      trim: true,
    },
    date: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const complaintSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Complaint title is required"],
      trim: true,
      minlength: [3, "Title must be at least 3 characters"],
      maxlength: [100, "Title cannot exceed 100 characters"],
    },

    description: {
      type: String,
      required: [true, "Complaint description is required"],
      trim: true,
    },

    citizen: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Citizen reference is required"],
    },

    department: {
      type: String,
      required: [true, "Department is required"],
      enum: {
        values: ["Road", "Garbage", "Drainage", "Streetlight", "Water Supply"],
        message: "{VALUE} is not a valid department",
      },
    },

    ward: {
      type: String,
      required: [true, "Ward is required"],
      trim: true,
    },

    assignedOfficer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    status: {
      type: String,
      enum: {
        values: [
          "Pending",
          "Accepted",
          "Rejected",
          "In_Progress",
          "Resolved",
          "Escalated",
        ],
        message: "{VALUE} is not a valid status",
      },
      default: "Pending",
    },

    remarks: [remarkSchema],

    resolutionImage: {
      type: String,
      default: "",
    },

    slaDeadline: {
      type: Date,
    },

    resolvedAt: {
      type: Date,
      default: null,
    },

    escalatedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Pre-save hook: Automatically calculate SLA Deadline (e.g., 72 hours from creation)
complaintSchema.pre("save", function (next) {
  if (!this.slaDeadline) {
    const hoursToResolve = 72; // 3 Days SLA
    this.slaDeadline = new Date(Date.now() + hoursToResolve * 60 * 60 * 1000);
  }
  next();
});

const Complaint = mongoose.model("Complaint", complaintSchema);

export default Complaint;
