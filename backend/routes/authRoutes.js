/**
 * Auth Routes — Smart Kisan
 * Supports: Email/Password, Google OAuth2, Phone OTP (stub — needs Twilio/Firebase)
 * Security: JWT access tokens (15m) + Redis-backed refresh token rotation (7d)
 * Multi-device session management via per-device refresh tokens
 */
import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { OAuth2Client } from "google-auth-library";
import User from "../models/User.js";
import AuditLog from "../models/AuditLog.js";
import { protect } from "../middleware/authMiddleware.js";
import { requireRole, ROLES } from "../middleware/rbacMiddleware.js";
import { getRedis } from "../config/redis.js";
import { z } from "zod";

const router = express.Router();

// ── Token helpers ──────────────────────────────────────────────────────────

const ACCESS_TOKEN_TTL = "15m";
const REFRESH_TOKEN_TTL_SECONDS = 7 * 24 * 60 * 60; // 7 days

const generateAccessToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: ACCESS_TOKEN_TTL });

const generateRefreshToken = () => crypto.randomBytes(64).toString("hex");

const hashToken = (token) =>
  crypto.createHash("sha256").update(token).digest("hex");

const storeRefreshToken = async (userId, rawToken, device = "unknown") => {
  const redis = getRedis();
  const hashed = hashToken(rawToken);
  const key = `refresh:${userId}:${hashed}`;
  await redis.set(key, JSON.stringify({ userId, device, createdAt: Date.now() }), "EX", REFRESH_TOKEN_TTL_SECONDS);
};

const validateRefreshToken = async (userId, rawToken) => {
  const redis = getRedis();
  const hashed = hashToken(rawToken);
  const key = `refresh:${userId}:${hashed}`;
  const data = await redis.get(key);
  return data ? JSON.parse(data) : null;
};

const revokeRefreshToken = async (userId, rawToken) => {
  const redis = getRedis();
  const hashed = hashToken(rawToken);
  const key = `refresh:${userId}:${hashed}`;
  await redis.del(key);
};

const revokeAllRefreshTokens = async (userId) => {
  const redis = getRedis();
  const keys = await redis.keys(`refresh:${userId}:*`);
  for (const key of keys) {
    await redis.del(key);
  }
};

// ── Validation Schemas (Zod) ───────────────────────────────────────────────

const registerSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  password: z.string().min(6).max(128),
  role: z.enum(["farmer", "expert", "seller", "buyer", "merchant"]).optional().default("farmer")
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});

const forgotSchema = z.object({ email: z.string().email() });

const resetSchema = z.object({
  email: z.string().email(),
  code: z.string().length(6),
  newPassword: z.string().min(6)
});

// ── Audit helper ──────────────────────────────────────────────────────────

const audit = async (req, action, userId, meta = {}) => {
  try {
    await AuditLog.create({
      userId,
      userEmail: meta.email,
      userRole: meta.role,
      action,
      resource: "user",
      method: req.method,
      path: req.path,
      ip: req.ip,
      userAgent: req.get("User-Agent"),
      meta
    });
  } catch (_) {
    // Never let audit failure crash a request
  }
};

// ── Unified success response helper ──────────────────────────────────────

const ok = (res, data, status = 200) =>
  res.status(status).json({ success: true, data, error: null });

const fail = (res, code, message, details = []) =>
  res.status(code).json({ success: false, data: null, error: { code, message, details } });

// ── In-memory OTP store (for password reset) ─────────────────────────────

const resetCodes = new Map();

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// ============================================================
// POST /api/auth/register
// ============================================================
router.post("/register", async (req, res) => {
  try {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
      return fail(res, 400, "Validation error", parsed.error.errors.map(e => e.message));
    }

    const { name, email, password, role } = parsed.data;

    // Check for existing user
    const exists = await User.findOne({ email });
    if (exists) {
      return fail(res, 409, "An account with this email already exists.");
    }

    const hashed = await bcrypt.hash(password, 12);

    const user = await User.create({
      name,
      email,
      password: hashed,
      role,
      emailVerified: false  // Email verification required in production
    });

    // Generate tokens
    const accessToken = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken();
    await storeRefreshToken(user._id, refreshToken, req.get("User-Agent") || "web");

    await audit(req, "USER_REGISTER", user._id, { email, role });

    return ok(res, {
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        emailVerified: user.emailVerified
      },
      accessToken,
      refreshToken
    }, 201);
  } catch (err) {
    console.error("[Auth] Register error:", err);
    // Handle MongoDB/MemoryDB duplicate key error
    if (err.code === 11000 || (err.message && err.message.includes("duplicate"))) {
      return fail(res, 409, "An account with this email already exists.");
    }
    return fail(res, 500, "Registration failed. Please try again.");
  }
});

// ============================================================
// POST /api/auth/login
// ============================================================
router.post("/login", async (req, res) => {
  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      return fail(res, 400, "Validation error", parsed.error.errors.map(e => e.message));
    }

    const { email, password } = parsed.data;

    // Must explicitly select password since it's `select: false`
    const user = await User.findOne({ email }).select("+password");

    if (!user) {
      return fail(res, 401, "Invalid email or password.");
    }

    if (!user.password) {
      // Google-only account trying to use email/password
      return fail(res, 401, "This account uses Google Sign-In. Please login with Google.");
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return fail(res, 401, "Invalid email or password.");
    }

    if (!user.isActive) {
      return fail(res, 403, "This account has been deactivated. Contact support.");
    }

    // Update login metadata
    await User.findByIdAndUpdate(user._id, {
      lastLogin: new Date(),
      $inc: { loginCount: 1 }
    });

    const accessToken = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken();
    await storeRefreshToken(user._id, refreshToken, req.get("User-Agent") || "web");

    await audit(req, "USER_LOGIN", user._id, { email, role: user.role });

    return ok(res, {
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        emailVerified: user.emailVerified
      },
      accessToken,
      refreshToken
    });
  } catch (err) {
    console.error("[Auth] Login error:", err);
    return fail(res, 500, "Login failed. Please try again.");
  }
});

// ============================================================
// POST /api/auth/google
// ============================================================
router.post("/google", async (req, res) => {
  try {
    const { idToken, credential } = req.body;
    const token = idToken || credential;

    if (!token) {
      return fail(res, 400, "Google ID token is required.");
    }

    let payload;

    const clientIsPlaceholder =
      !process.env.GOOGLE_CLIENT_ID ||
      process.env.GOOGLE_CLIENT_ID.includes("1234567890") ||
      process.env.GOOGLE_CLIENT_ID.includes("YOUR_");

    if (token.startsWith("mock_google_token") || clientIsPlaceholder) {
      // Demo mode: allow simulated Google login for local testing
      payload = {
        sub: "google_demo_001",
        email: "google.demo@smartkisan.com",
        name: "Google Demo User"
      };
    } else {
      const ticket = await googleClient.verifyIdToken({
        idToken: token,
        audience: process.env.GOOGLE_CLIENT_ID
      });
      payload = ticket.getPayload();
    }

    const { sub, email, name } = payload;
    if (!email) {
      return fail(res, 400, "Google account has no associated email address.");
    }

    let user = await User.findOne({ $or: [{ email }, { googleId: sub }] });

    if (!user) {
      user = await User.create({
        name: name || "Google User",
        email,
        googleId: sub,
        role: "farmer",
        emailVerified: true  // Google accounts are pre-verified
      });
    } else if (!user.googleId) {
      // Link Google ID to existing account
      await User.findByIdAndUpdate(user._id, { googleId: sub, emailVerified: true });
    }

    const accessToken = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken();
    await storeRefreshToken(user._id, refreshToken, req.get("User-Agent") || "web");

    await audit(req, "USER_LOGIN_GOOGLE", user._id, { email, role: user.role });

    return ok(res, {
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        emailVerified: user.emailVerified
      },
      accessToken,
      refreshToken
    });
  } catch (err) {
    console.error("[Auth] Google login error:", err.message);
    return fail(res, 500, "Google sign-in failed. Please try again.");
  }
});

// ============================================================
// POST /api/auth/refresh
// Rotate refresh token — old token is revoked, new pair issued
// ============================================================
router.post("/refresh", async (req, res) => {
  try {
    const { refreshToken, userId } = req.body;

    if (!refreshToken || !userId) {
      return fail(res, 400, "refreshToken and userId are required.");
    }

    const stored = await validateRefreshToken(userId, refreshToken);
    if (!stored) {
      return fail(res, 401, "Invalid or expired refresh token. Please login again.");
    }

    const user = await User.findById(userId);
    if (!user || !user.isActive) {
      return fail(res, 401, "Account not found or deactivated.");
    }

    // Revoke old token and issue new pair (rotation)
    await revokeRefreshToken(userId, refreshToken);

    const newAccessToken = generateAccessToken(user._id);
    const newRefreshToken = generateRefreshToken();
    await storeRefreshToken(user._id, newRefreshToken, stored.device);

    return ok(res, {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken
    });
  } catch (err) {
    console.error("[Auth] Refresh error:", err);
    return fail(res, 500, "Token refresh failed.");
  }
});

// ============================================================
// POST /api/auth/logout
// Revoke specific device refresh token
// ============================================================
router.post("/logout", protect, async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (refreshToken) {
      await revokeRefreshToken(req.user._id.toString(), refreshToken);
    }
    await audit(req, "USER_LOGOUT", req.user._id, { email: req.user.email });
    return ok(res, { message: "Logged out successfully." });
  } catch (err) {
    console.error("[Auth] Logout error:", err);
    return fail(res, 500, "Logout failed.");
  }
});

// ============================================================
// POST /api/auth/logout-all
// Revoke all sessions for this user (all devices)
// ============================================================
router.post("/logout-all", protect, async (req, res) => {
  try {
    await revokeAllRefreshTokens(req.user._id.toString());
    await audit(req, "USER_LOGOUT_ALL", req.user._id, { email: req.user.email });
    return ok(res, { message: "All sessions revoked." });
  } catch (err) {
    console.error("[Auth] Logout-all error:", err);
    return fail(res, 500, "Failed to revoke all sessions.");
  }
});

// ============================================================
// POST /api/auth/forgot-password
// ============================================================
router.post("/forgot-password", async (req, res) => {
  try {
    const parsed = forgotSchema.safeParse(req.body);
    if (!parsed.success) {
      return fail(res, 400, "A valid email address is required.");
    }

    const { email } = parsed.data;
    const user = await User.findOne({ email });

    // Always return 200 to prevent email enumeration attacks
    if (!user) {
      return ok(res, {
        message: "If an account with this email exists, a reset code has been sent."
      });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    resetCodes.set(email.toLowerCase(), {
      code: otp,
      expires: Date.now() + 10 * 60 * 1000  // 10 minutes
    });

    // In production: send via email. For demo, include in response.
    console.log(`[Auth] Password reset OTP for ${email}: ${otp}`);

    return ok(res, {
      message: "If an account with this email exists, a reset code has been sent.",
      // ⚠️  Remove `otp` from response in production
      otp: process.env.NODE_ENV !== "production" ? otp : undefined
    });
  } catch (err) {
    console.error("[Auth] Forgot password error:", err);
    return fail(res, 500, "Password reset request failed.");
  }
});

// ============================================================
// POST /api/auth/reset-password
// ============================================================
router.post("/reset-password", async (req, res) => {
  try {
    const parsed = resetSchema.safeParse(req.body);
    if (!parsed.success) {
      return fail(res, 400, "Validation error", parsed.error.errors.map(e => e.message));
    }

    const { email, code, newPassword } = parsed.data;
    const key = email.toLowerCase();
    const activeCode = resetCodes.get(key);

    if (!activeCode) {
      return fail(res, 400, "No active password reset request for this email.");
    }

    if (activeCode.expires < Date.now()) {
      resetCodes.delete(key);
      return fail(res, 400, "The reset code has expired. Please request a new one.");
    }

    if (activeCode.code !== String(code).trim()) {
      return fail(res, 400, "Invalid verification code. Please try again.");
    }

    const user = await User.findOne({ email });
    if (!user) {
      return fail(res, 404, "User not found.");
    }

    const hashed = await bcrypt.hash(newPassword, 12);
    await User.findByIdAndUpdate(user._id, { password: hashed });
    resetCodes.delete(key);

    // Revoke all active sessions after password reset
    await revokeAllRefreshTokens(user._id.toString());

    await audit(req, "USER_PASSWORD_RESET", user._id, { email });

    return ok(res, {
      message: "Password reset successfully. Please login with your new password."
    });
  } catch (err) {
    console.error("[Auth] Reset password error:", err);
    return fail(res, 500, "Password reset failed.");
  }
});

// ============================================================
// GET /api/auth/me — Current authenticated user
// ============================================================
router.get("/me", protect, async (req, res) => {
  return ok(res, { user: req.user });
});

// ============================================================
// PATCH /api/auth/profile — Update own profile
// ============================================================
router.patch("/profile", protect, async (req, res) => {
  try {
    const allowedFields = ["name", "location", "avatar"];
    const updates = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    }

    const updated = await User.findByIdAndUpdate(req.user._id, updates, { new: true });
    return ok(res, { user: updated });
  } catch (err) {
    console.error("[Auth] Profile update error:", err);
    return fail(res, 500, "Profile update failed.");
  }
});

// ============================================================
// GET /api/auth/sessions — List active sessions (devices)
// ============================================================
router.get("/sessions", protect, async (req, res) => {
  try {
    const redis = getRedis();
    const keys = await redis.keys(`refresh:${req.user._id}:*`);
    const sessions = [];

    for (const key of keys) {
      const data = await redis.get(key);
      if (data) {
        const parsed = JSON.parse(data);
        sessions.push({
          device: parsed.device,
          createdAt: new Date(parsed.createdAt)
        });
      }
    }

    return ok(res, { sessions, count: sessions.length });
  } catch (err) {
    console.error("[Auth] Sessions error:", err);
    return fail(res, 500, "Failed to retrieve sessions.");
  }
});

// ============================================================
// [ADMIN ONLY] GET /api/auth/users — Paginated user list
// ============================================================
router.get("/users", protect, requireRole(ROLES.ADMIN), async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, parseInt(req.query.limit) || 20);
    const { role, search } = req.query;

    const filter = {};
    if (role) filter.role = role;
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } }
      ];
    }

    const [users, total] = await Promise.all([
      User.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      User.countDocuments(filter)
    ]);

    return ok(res, {
      users,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (err) {
    console.error("[Auth] Users list error:", err);
    return fail(res, 500, "Failed to retrieve users.");
  }
});

// ============================================================
// [ADMIN ONLY] PATCH /api/auth/users/:id/role — Update user role
// ============================================================
router.patch("/users/:id/role", protect, requireRole(ROLES.ADMIN), async (req, res) => {
  try {
    const { role } = req.body;
    const validRoles = ["farmer", "expert", "admin", "govt_officer", "seller", "buyer", "merchant"];

    if (!validRoles.includes(role)) {
      return fail(res, 400, `Invalid role. Must be one of: ${validRoles.join(", ")}`);
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { role },
      { new: true }
    );

    if (!user) return fail(res, 404, "User not found.");

    await audit(req, "ADMIN_ROLE_UPDATE", req.user._id, {
      targetUserId: req.params.id,
      newRole: role
    });

    return ok(res, { user });
  } catch (err) {
    console.error("[Auth] Role update error:", err);
    return fail(res, 500, "Failed to update user role.");
  }
});

export default router;
