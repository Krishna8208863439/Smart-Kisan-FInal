import express from "express";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

// GET /api/weather?location=...
router.get("/", protect, (req, res) => {
  const { location } = req.query;

  // Dummy response
  return res.json({
    location: location || "Unknown",
    current: {
      temperature: 30,
      humidity: 60,
      condition: "Partly cloudy"
    },
    forecast: [
      { day: "Day 1", temp: 29, chanceOfRain: 40 },
      { day: "Day 2", temp: 31, chanceOfRain: 20 },
      { day: "Day 3", temp: 28, chanceOfRain: 60 }
    ]
  });
});

export default router;
