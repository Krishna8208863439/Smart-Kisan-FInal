import express from "express";

const router = express.Router();

// GET /api/learning
router.get("/", (req, res) => {
  const lessons = [
    {
      id: 1,
      title: "Basics of Soil Health",
      category: "Soil",
      url: "https://example.com/soil-health"
    },
    {
      id: 2,
      title: "Efficient Irrigation Techniques",
      category: "Irrigation",
      url: "https://example.com/irrigation"
    },
    {
      id: 3,
      title: "Understanding MSP & Market Prices",
      category: "Market",
      url: "https://example.com/msp"
    }
  ];

  return res.json(lessons);
});

export default router;
