import User from "../models/User.js";
import generateToken from "../utils/generateToken.js";

// ==========================================
// Helper: Format Mongoose Validation Errors
// ==========================================
const formatValidationError = (error) => {
  if (error.name === "ValidationError") {
    const messages = Object.values(error.errors).map((err) => err.message);
    return messages.join(", ");
  }
  return error.message;
};

// ==========================================
// 1. Register User
// ==========================================
// POST /api/auth/register
// Public Access
export const registerUser = async (req, res) => {
  console.log("===== REGISTER API HIT =====");
  console.log(req.body);

  try {
    const {
      fullName,
      email,
      password,
      phone,
      role,
      department,
      ward,
    } = req.body;

    // A. Check for missing required fields
    if (!fullName || !email || !password || !phone) {
      return res.status(400).json({
        success: false,
        message: "Please fill all required fields: fullName, email, password, and phone.",
      });
    }

    // B. Check if email already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "User already exists with this email.",
      });
    }

    // C. Check if phone number is already registered (if uniqueness is desired for UX)
    const existingPhone = await User.findOne({ phone });
    if (existingPhone) {
      return res.status(409).json({
        success: false,
        message: "User already exists with this phone number.",
      });
    }

    // D. Create User
    const user = await User.create({
      fullName,
      email,
      password,
      phone,
      role,
      department,
      ward,
    });

    // E. Generate JWT Token
    const token = generateToken(user._id, user.role);

    // F. Set HTTP-Only Cookie for Security
    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      sameSite: "strict",
    });

    res.status(201).json({
      success: true,
      message: "Registration Successful",
      token,
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        phone: user.phone,
        role: user.role,
        department: user.department,
        ward: user.ward,
      },
    });
  } catch (error) {
    console.error("Register Error:", error);

    // Mongoose Validation Error (e.g. invalid phone/email format, password too short)
    if (error.name === "ValidationError") {
      return res.status(400).json({
        success: false,
        message: formatValidationError(error),
      });
    }

    // Handle MongoDB duplicate key error (11000)
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Duplicate field value entered. User already exists.",
      });
    }

    res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

// ==========================================
// 2. Login User
// ==========================================
// POST /api/auth/login
// Public Access
export const loginUser = async (req, res) => {
  console.log("===== LOGIN API HIT =====");
  try {
    const { email, password } = req.body;

    // A. Check for missing fields
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Please fill all required fields: email and password.",
      });
    }

    // B. Find User & Select Password (essential since password has select: false)
    const user = await User.findOne({ email }).select("+password");

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password.",
      });
    }

    // C. Check if User is Blocked
    if (user.isBlocked) {
      return res.status(403).json({
        success: false,
        message: "Your account is blocked. Please contact the administrator.",
      });
    }

    // D. Verify Password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password.",
      });
    }

    // E. Generate JWT Token
    const token = generateToken(user._id, user.role);

    // F. Set HTTP-Only Cookie
    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      sameSite: "strict",
    });

    res.status(200).json({
      success: true,
      message: "Login successful",
      token,
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        phone: user.phone,
        role: user.role,
        department: user.department,
        ward: user.ward,
      },
    });
  } catch (error) {
    console.error("Login Error:", error);
    res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

// ==========================================
// 3. Get User Profile
// ==========================================
// GET /api/auth/profile
// Private Access (Requires protect middleware)
export const getUserProfile = async (req, res) => {
  try {
    // req.user has already been populated in protect middleware
    res.status(200).json({
      success: true,
      user: {
        id: req.user._id,
        fullName: req.user.fullName,
        email: req.user.email,
        phone: req.user.phone,
        role: req.user.role,
        department: req.user.department,
        ward: req.user.ward,
        isVerified: req.user.isVerified,
        createdAt: req.user.createdAt,
      },
    });
  } catch (error) {
    console.error("Profile Fetch Error:", error);
    res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

// ==========================================
// 4. Update User Profile
// ==========================================
// PUT /api/auth/profile
// Private Access (Requires protect middleware)
export const updateUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    const { fullName, phone, password, department, ward } = req.body;

    // A. Apply Updates
    if (fullName) user.fullName = fullName;
    if (phone) user.phone = phone;
    
    // If password is changed, assign it so pre-save hook triggers hashing
    if (password) user.password = password;

    if (department !== undefined) user.department = department;
    if (ward !== undefined) user.ward = ward;

    // B. Save User (Runs validators and pre-save hooks)
    const updatedUser = await user.save();

    res.status(200).json({
      success: true,
      message: "Profile updated successfully.",
      user: {
        id: updatedUser._id,
        fullName: updatedUser.fullName,
        email: updatedUser.email,
        phone: updatedUser.phone,
        role: updatedUser.role,
        department: updatedUser.department,
        ward: updatedUser.ward,
      },
    });
  } catch (error) {
    console.error("Profile Update Error:", error);

    // Mongoose Validation Error (e.g. invalid phone format, password too short)
    if (error.name === "ValidationError") {
      return res.status(400).json({
        success: false,
        message: formatValidationError(error),
      });
    }

    res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};