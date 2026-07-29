import jwt from "jsonwebtoken";
import User from "../models/User.js";

/**
 * protect — JWT authentication middleware
 * Verifies Bearer token, loads user, attaches to req.user
 * Returns unified { success, data, error } response shape on failure
 */
export const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    try {
      token = req.headers.authorization.split(" ")[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Fetch user — password and refresh tokens excluded
      req.user = await User.findById(decoded.id).select("-password -refreshTokens");

      if (!req.user) {
        return res.status(401).json({
          success: false,
          data: null,
          error: { code: 401, message: "Not authorized. User not found.", details: [] }
        });
      }

      return next();
    } catch (err) {
      return res.status(401).json({
        success: false,
        data: null,
        error: {
          code: 401,
          message: err.name === "TokenExpiredError"
            ? "Access token expired. Please refresh your session."
            : "Not authorized, token failed",
          details: []
        }
      });
    }
  }

  return res.status(401).json({
    success: false,
    data: null,
    error: { code: 401, message: "Not authorized, no token", details: [] }
  });
};
