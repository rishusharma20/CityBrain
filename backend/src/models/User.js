import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import validator from "validator";

const userSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: [true, "Full name is required"],
      trim: true,
      minlength: [3, "Full name must be at least 3 characters"],
      maxlength: [50, "Full name cannot exceed 50 characters"],
    },

    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      validate: [validator.isEmail, "Please enter a valid email"],
    },

    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [6, "Password must be at least 6 characters"],
      select: false,
    },

    phone: {
      type: String,
      required: [true, "Phone number is required"],
      trim: true,
      match: [/^[6-9]\d{9}$/, "Please enter a valid 10-digit phone number"],
    },

    role: {
      type: String,
      enum: ["Citizen", "Officer", "Admin"],
      default: "Citizen",
    },

    department: {
      type: String,
      enum: {
        values: [
          "Sanitation",
          "Roads",
          "Electrical",
          "Water",
          "General",
          "Road",
          "Garbage",
          "Drainage",
          "Streetlight",
          "Water Supply"
        ],
        message: "{VALUE} is not a valid department",
      },
      default: null,
      validate: {
        validator: function (v) {
          if (this.role === "Officer" && !v) {
            return false;
          }
          return true;
        },
        message: "Department is required for Officers",
      },
    },

    ward: {
      type: String,
      default: null,
      validate: {
        validator: function (v) {
          if (this.role === "Officer" && !v) {
            return false;
          }
          return true;
        },
        message: "Ward is required for Officers",
      },
    },

    profileImage: {
      type: String,
      default: "",
    },

    isVerified: {
      type: Boolean,
      default: false,
    },

    isBlocked: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Hash password before saving
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) {
    return next();
  }

  this.password = await bcrypt.hash(this.password, 10);
  next();
});

// Compare entered password with hashed password
userSchema.methods.comparePassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

const User = mongoose.model("User", userSchema);

export default User;