/**
 * Admin Routes — Smart Kisan
 * Phase 11: Admin dashboard, live stats, user management, audit logs
 * RBAC: admin role required for all routes
 */
import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import { requireRole } from "../middleware/rbacMiddleware.js";
import User from "../models/User.js";
import Product from "../models/Product.js";
import Order from "../models/Order.js";
import Post from "../models/Post.js";

const router = express.Router();

// All admin routes require admin role
router.use(protect, requireRole("admin"));

// ── GET /api/admin/stats — live dashboard counts ────────────────────────────
router.get("/stats", async (req, res) => {
  try {
    const [
      totalUsers,
      farmerCount,
      expertCount,
      merchantCount,
      adminCount,
      totalProducts,
      totalOrders,
      totalPosts
    ] = await Promise.all([
      User.countDocuments({}),
      User.countDocuments({ role: "farmer" }),
      User.countDocuments({ role: "expert" }),
      User.countDocuments({ role: "merchant" }),
      User.countDocuments({ role: "admin" }),
      Product.countDocuments(),
      Order.countDocuments ? Order.countDocuments() : Promise.resolve(0),
      Post.countDocuments ? Post.countDocuments() : Promise.resolve(0)
    ]);

    return res.json({
      success: true,
      data: {
        users: {
          total: totalUsers,
          byRole: {
            farmer: farmerCount,
            expert: expertCount,
            merchant: merchantCount,
            admin: adminCount
          }
        },
        marketplace: { products: totalProducts, orders: totalOrders },
        forum: { posts: totalPosts },
        timestamp: new Date().toISOString()
      }
    });
  } catch (err) {
    console.error("Admin stats error:", err);
    return res.status(500).json({ success: false, error: { message: err.message } });
  }
});

// ── GET /api/admin/users — paginated user list ─────────────────────────────
router.get("/users", async (req, res) => {
  try {
    const { page = 1, limit = 20, role, search } = req.query;
    const filter = {};
    if (role) filter.role = role;
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } }
      ];
    }

    const users = await User.find(filter);
    const total = users.length;
    const start = (parseInt(page) - 1) * parseInt(limit);
    const paginated = users.slice(start, start + parseInt(limit));

    return res.json({
      success: true,
      data: {
        users: paginated.map(u => ({
          _id: u._id,
          name: u.name,
          email: u.email,
          role: u.role,
          isActive: u.isActive,
          emailVerified: u.emailVerified,
          loginCount: u.loginCount,
          createdAt: u.createdAt
        })),
        total,
        page: parseInt(page),
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (err) {
    console.error("Admin users error:", err);
    return res.status(500).json({ success: false, error: { message: err.message } });
  }
});

// ── PUT /api/admin/users/:id/role — change a user's role ─────────────────
router.put("/users/:id/role", async (req, res) => {
  try {
    const { role } = req.body;
    const allowed = ["farmer", "expert", "merchant", "admin"];
    if (!allowed.includes(role)) {
      return res.status(400).json({ success: false, error: { message: `Role must be one of: ${allowed.join(", ")}` } });
    }

    const user = await User.findByIdAndUpdate(req.params.id, { role }, { new: true });
    if (!user) return res.status(404).json({ success: false, error: { message: "User not found" } });

    return res.json({ success: true, data: { userId: user._id, role: user.role } });
  } catch (err) {
    return res.status(500).json({ success: false, error: { message: err.message } });
  }
});

// ── PUT /api/admin/users/:id/toggle — activate/deactivate user ─────────────
router.put("/users/:id/toggle", async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, error: { message: "User not found" } });

    // Prevent deactivating own admin account
    if (String(user._id) === String(req.user._id)) {
      return res.status(400).json({ success: false, error: { message: "Cannot deactivate your own account" } });
    }

    const updated = await User.findByIdAndUpdate(
      req.params.id,
      { isActive: !user.isActive },
      { new: true }
    );

    return res.json({ success: true, data: { userId: updated._id, isActive: updated.isActive } });
  } catch (err) {
    return res.status(500).json({ success: false, error: { message: err.message } });
  }
});

// ── GET /api/admin/products — all products with seller info ─────────────────
router.get("/products", async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const all = await Product.find({});
    const total = all.length;
    const start = (parseInt(page) - 1) * parseInt(limit);
    const paginated = all.slice(start, start + parseInt(limit));

    return res.json({
      success: true,
      data: { products: paginated, total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) }
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: { message: err.message } });
  }
});

// ── DELETE /api/admin/products/:id — remove a product ─────────────────────
router.delete("/products/:id", async (req, res) => {
  try {
    const product = await Product.findOneAndDelete({ _id: req.params.id });
    if (!product) return res.status(404).json({ success: false, error: { message: "Product not found" } });
    return res.json({ success: true, data: { message: "Product removed", productId: req.params.id } });
  } catch (err) {
    return res.status(500).json({ success: false, error: { message: err.message } });
  }
});

// ── GET /api/admin/system — system info ───────────────────────────────────
router.get("/system", (req, res) => {
  return res.json({
    success: true,
    data: {
      uptime: process.uptime(),
      memoryMB: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
      nodeVersion: process.version,
      env: process.env.NODE_ENV || "development",
      timestamp: new Date().toISOString()
    }
  });
});

export default router;
