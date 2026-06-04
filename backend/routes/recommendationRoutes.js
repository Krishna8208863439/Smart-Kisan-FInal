import express from "express";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

// POST /api/recommendations/crop
router.post("/crop", protect, (req, res) => {
  const { soilType, region, season, irrigationAvailable } = req.body;

  const recommendations = [];

  if (soilType === "loamy" && season === "kharif") {
    recommendations.push({
      crop: "Paddy",
      reason: "Loamy soil with good water retention suits paddy in kharif."
    });
  }
  if (soilType === "sandy" && irrigationAvailable) {
    recommendations.push({
      crop: "Groundnut",
      reason: "Sandy soil with irrigation is suitable for groundnut."
    });
  }
  if (season === "rabi") {
    recommendations.push({
      crop: "Wheat",
      reason: "Rabi season is ideal for wheat in many regions."
    });
  }

  if (recommendations.length === 0) {
    recommendations.push({
      crop: "Millets",
      reason:
        "Millets are climate-resilient and perform well under varied conditions."
    });
  }

  // simple fertilizer suggestion
  const fertilizerPlan = [
    {
      stage: "Basal",
      recommendation: "Apply FYM + NPK as per local agri officer guidelines."
    },
    {
      stage: "Top dressing",
      recommendation:
        "Split application of nitrogen based on crop growth and rainfall."
    }
  ];

  return res.json({ recommendations, fertilizerPlan });
});

export default router;
