/**
 * Middleware to restrict access based on user roles.
 * Must be used AFTER protect middleware as it relies on req.user.
 * 
 * @param {...string} roles - The list of allowed roles (e.g., 'Citizen', 'Officer', 'Admin')
 */
export const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Not authorized, user data is missing.",
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Forbidden: Role '${req.user.role}' is not authorized to access this resource.`,
      });
    }

    next();
  };
};
