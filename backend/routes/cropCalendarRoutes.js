import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import CropCalendar from "../models/CropCalendar.js";

const router = express.Router();

// Preset milestones for different crops
const CROP_TEMPLATES = {
  Tomato: [
    { title: "Nursery Sowing", dayOffset: 0, category: "Sowing" },
    { title: "Nursery Weeding & Thinning", dayOffset: 12, category: "Weed Control" },
    { title: "Transplanting Seedlings to Main Field", dayOffset: 25, category: "Transplanting" },
    { title: "First Top Dressing (Apply NPK + Weeding)", dayOffset: 45, category: "Fertilizer" },
    { title: "Staking & Trellising Tomato Vines", dayOffset: 60, category: "Support" },
    { title: "Fruiting Spray (Micronutrients / Boron)", dayOffset: 75, category: "Pest/Nutrition" },
    { title: "First Harvest of Ripe Tomatoes", dayOffset: 95, category: "Harvest" }
  ],
  Paddy: [
    { title: "Seed Treatment & Nursery Bed Preparation", dayOffset: 0, category: "Sowing" },
    { title: "Pulling Seedlings & Transplanting", dayOffset: 25, category: "Transplanting" },
    { title: "First Tillering Phase Fertilizer (Urea)", dayOffset: 45, category: "Fertilizer" },
    { title: "Mid-Tillering Weeding & Water Management", dayOffset: 60, category: "Irrigation" },
    { title: "Panicle Initiation Top Dressing (NPK)", dayOffset: 85, category: "Fertilizer" },
    { title: "Drain Field Prior to Harvest", dayOffset: 110, category: "Irrigation" },
    { title: "Harvesting & Threshing", dayOffset: 125, category: "Harvest" }
  ],
  Wheat: [
    { title: "Field Preparation & Basal Fertilizer sowing", dayOffset: 0, category: "Sowing" },
    { title: "First Irrigation (Crown Root Initiation stage)", dayOffset: 21, category: "Irrigation" },
    { title: "First Top Dressing (Urea Application)", dayOffset: 35, category: "Fertilizer" },
    { title: "Second Irrigation & Hand Weeding", dayOffset: 45, category: "Irrigation" },
    { title: "Jointing Stage Irrigation", dayOffset: 65, category: "Irrigation" },
    { title: "Flowering & Grain Filling Irrigation", dayOffset: 95, category: "Irrigation" },
    { title: "Crop Maturity Drying & Harvesting", dayOffset: 130, category: "Harvest" }
  ],
  Potato: [
    { title: "Planting Sprouted Seed Tubers", dayOffset: 0, category: "Sowing" },
    { title: "First Earthing Up & Fertilizer application", dayOffset: 25, category: "Fertilizer" },
    { title: "Tuber Initiation Stage Irrigation", dayOffset: 45, category: "Irrigation" },
    { title: "Second Earthing Up & Weeding", dayOffset: 55, category: "Weed Control" },
    { title: "Late Blight Disease Check & Spray", dayOffset: 70, category: "Pest/Nutrition" },
    { title: "Haulm Cutting (Dehalming)", dayOffset: 90, category: "Harvest" },
    { title: "Harvesting & Curing Tubers", dayOffset: 105, category: "Harvest" }
  ]
};

// GET /api/crop-calendar
router.get("/", protect, async (req, res) => {
  try {
    const calendars = await CropCalendar.find({ user: req.user._id }).sort({ createdAt: -1 });
    return res.json(calendars);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Failed to fetch crop calendars" });
  }
});

// POST /api/crop-calendar
router.post("/", protect, async (req, res) => {
  try {
    const { cropName, sowingDate } = req.body;
    if (!cropName || !sowingDate) {
      return res.status(400).json({ message: "Crop name and sowing date are required" });
    }

    const startDate = new Date(sowingDate);
    const template = CROP_TEMPLATES[cropName] || CROP_TEMPLATES["Tomato"];

    const tasks = template.map(t => {
      const targetDate = new Date(startDate);
      targetDate.setDate(targetDate.getDate() + t.dayOffset);
      return {
        title: t.title,
        dayOffset: t.dayOffset,
        targetDate: targetDate,
        status: "pending",
        category: t.category
      };
    });

    const calendar = await CropCalendar.create({
      user: req.user._id,
      cropName,
      sowingDate: startDate,
      tasks
    });

    return res.status(201).json(calendar);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Failed to create crop calendar" });
  }
});

// PATCH /api/crop-calendar/:id/task
router.patch("/:id/task", protect, async (req, res) => {
  try {
    const { taskId, status } = req.body;
    if (!taskId || !status) {
      return res.status(400).json({ message: "Task ID and status are required" });
    }

    const calendar = await CropCalendar.findOne({ _id: req.params.id, user: req.user._id });
    if (!calendar) {
      return res.status(404).json({ message: "Crop calendar not found" });
    }

    const task = calendar.tasks.id(taskId);
    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    task.status = status;
    await calendar.save();

    return res.json(calendar);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Failed to update task status" });
  }
});

// DELETE /api/crop-calendar/:id
router.delete("/:id", protect, async (req, res) => {
  try {
    const calendar = await CropCalendar.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    if (!calendar) {
      return res.status(404).json({ message: "Crop calendar not found" });
    }
    return res.json({ message: "Crop calendar deleted successfully" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Failed to delete crop calendar" });
  }
});

export default router;
