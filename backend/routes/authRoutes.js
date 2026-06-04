import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { OAuth2Client } from "google-auth-library";
import User from "../models/User.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

const generateToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: "7d" });

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// ========== EMAIL/PASSWORD REGISTER ==========
router.post("/register", async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    const exists = await User.findOne({ email });
    if (exists) {
      return res.status(400).json({ message: "User already exists" });
    }
    const hashed = await bcrypt.hash(password, 10);
    const user = await User.create({ name, email, password: hashed, role: role || "farmer" });
    return res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      token: generateToken(user._id)
    });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

// ========== EMAIL/PASSWORD LOGIN ==========
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    // Auto-create demo users if they don't exist for easy trial
    if (email === "farmer@smartkisan.com" || email === "merchant@smartkisan.com") {
      let demoUser = await User.findOne({ email });
      if (!demoUser) {
        const hashed = await bcrypt.hash(password || "demo123", 10);
        demoUser = await User.create({
          name: email === "farmer@smartkisan.com" ? "Ram Singh (Farmer)" : "Rajesh Agro (Merchant)",
          email,
          password: hashed,
          role: email === "farmer@smartkisan.com" ? "farmer" : "merchant"
        });
      }
    }

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "Invalid credentials" });
    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(400).json({ message: "Invalid credentials" });

    return res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      token: generateToken(user._id)
    });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

// ========== GOOGLE LOGIN ==========
router.post("/google", async (req, res) => {
  try {
    const { idToken } = req.body;
    if (!idToken) {
      return res.status(400).json({ message: "idToken is required" });
    }

    // Support simulated Google login for trial/offline testing
    const clientIsPlaceholder = !process.env.GOOGLE_CLIENT_ID || process.env.GOOGLE_CLIENT_ID.includes("1234567890") || process.env.GOOGLE_CLIENT_ID.includes("YOUR_");
    if (idToken.startsWith("mock_google_token") || clientIsPlaceholder || global.useMemoryDB) {
      let user = await User.findOne({ email: "google.simulated@smartkisan.com" });
      if (!user) {
        user = await User.create({
          name: "Suresh Kumar (Google User)",
          email: "google.simulated@smartkisan.com",
          password: "google_mock_password_123",
          role: "farmer"
        });
      }
      return res.json({
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        token: generateToken(user._id)
      });
    }

    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID
    });

    const payload = ticket.getPayload();
    const { sub, email, name } = payload;

    if (!email) {
      return res
        .status(400)
        .json({ message: "Google account has no email address" });
    }

    let user = await User.findOne({ email });

    // If user does not exist, create one automatically
    if (!user) {
      const randomPassword = sub + Date.now();
      const hashed = await bcrypt.hash(randomPassword, 10);

      user = await User.create({
        name: name || "Google User",
        email,
        password: hashed, // not actually used; just to satisfy schema
        role: "farmer"
      });
    }

    return res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      token: generateToken(user._id)
    });
  } catch (err) {
    console.error("Google login error:", err.message);
    return res.status(500).json({ message: "Google login failed" });
  }
});

// ========== CURRENT USER ==========
router.get("/me", protect, async (req, res) => {
  return res.json(req.user);
});

export default router;
