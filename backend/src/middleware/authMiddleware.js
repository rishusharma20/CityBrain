import jwt from "jsonwebtoken";
import User from "../models/User.js";

/**
 * Middleware to protect routes with JWT authentication.
 * Extracts token from Authorization header or cookies, verifies it,
 * checks if the user is blocked, and attaches user object to req.user.
 */
export const protect = async (req, res, next) => {
  let token;

  // 1. Check for token in Authorization header (Bearer <token>)
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
  }
  // 2. Fallback to token in cookies
  else if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  }

  // If no token is found
  if (!token) {
    return res.status(401).json({
      success: false,
      message: "Not authorized, login token is missing.",
    });
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Fetch user details, excluding the password field
    const user = await User.findById(decoded.id).select("-password");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "The user belonging to this token no longer exists.",
      });
    }

    // Check if user is blocked
    if (user.isBlocked) {
      return res.status(403).json({
        success: false,
        message: "Your account is blocked. Please contact the administrator.",
      });
    }

    // Attach user to request object
    req.user = user;
    next();
  } catch (error) {
    console.error("JWT Verification Error:", error.message);
    
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        message: "Not authorized, your session has expired. Please login again.",
      });
    }

    return res.status(401).json({
      success: false,
      message: "Not authorized, invalid token.",
    });
  }
};
