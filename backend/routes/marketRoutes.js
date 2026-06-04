import express from "express";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

// GET /api/market?crop=wheat
router.get("/", protect, (req, res) => {
  const { crop } = req.query;

  // Dummy data
  const prices = [
    { market: "Local Mandi A", crop: crop || "Wheat", pricePerQuintal: 2100 },
    { market: "Local Mandi B", crop: crop || "Wheat", pricePerQuintal: 2200 }
  ];

  return res.json({ crop: crop || "Wheat", prices });
});

export default router;
