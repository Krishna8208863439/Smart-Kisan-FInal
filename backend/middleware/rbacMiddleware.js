/**
 * Smart Kisan — RBAC Middleware
 * Role-Based Access Control guard factory.
 * Usage: router.get('/admin-only', protect, requireRole('admin'), handler)
 */

/**
 * requireRole(...roles)
 * Returns Express middleware that rejects any request whose authenticated
 * user does not have one of the permitted roles.
 *
 * @param {...string} roles - Permitted role names
 */
export const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        data: null,
        error: {
          code: 401,
          message: "Not authenticated. Token required.",
          details: []
        }
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        data: null,
        error: {
          code: 403,
          message: `Access denied. Required role(s): ${roles.join(", ")}. Your role: ${req.user.role}`,
          details: []
        }
      });
    }

    next();
  };
};

/**
 * ROLE CONSTANTS — import these in routes for type safety
 */
export const ROLES = Object.freeze({
  FARMER: "farmer",
  EXPERT: "expert",
  ADMIN: "admin",
  GOVT_OFFICER: "govt_officer",
  SELLER: "seller",
  BUYER: "buyer",
  MERCHANT: "merchant"
});
