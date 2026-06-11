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
  ],
  Mustard: [
    { title: "Land Prep & Sowing Seeds", dayOffset: 0, category: "Sowing" },
    { title: "First Irrigation & Weeding", dayOffset: 25, category: "Weed Control" },
    { title: "Nitrogen Fertilizer Top Dressing", dayOffset: 35, category: "Fertilizer" },
    { title: "Thinning & Flowering Stage Water management", dayOffset: 50, category: "Irrigation" },
    { title: "Pod Formation (Siliqua stage) Pest check", dayOffset: 75, category: "Pest/Nutrition" },
    { title: "Harvesting & Threshing", dayOffset: 110, category: "Harvest" }
  ],
  Chilli: [
    { title: "Nursery Sowing", dayOffset: 0, category: "Sowing" },
    { title: "Seedling Transplanting", dayOffset: 30, category: "Transplanting" },
    { title: "First Weeding & Earthing Up", dayOffset: 45, category: "Weed Control" },
    { title: "First Top Dressing (NPK)", dayOffset: 55, category: "Fertilizer" },
    { title: "Flowering & Fruiting Spray (Boron)", dayOffset: 75, category: "Pest/Nutrition" },
    { title: "First Picking of Green Chilli", dayOffset: 90, category: "Harvest" },
    { title: "Multiple Pickings & Liquid Manure boost", dayOffset: 115, category: "Harvest" }
  ],
  Cotton: [
    { title: "Field Prep & Sowing Cotton Seeds", dayOffset: 0, category: "Sowing" },
    { title: "Thinning & Gap Filling", dayOffset: 15, category: "Weed Control" },
    { title: "First Hand Weeding & Interculture", dayOffset: 30, category: "Weed Control" },
    { title: "Square Formation (Buds stage) NPK Spray", dayOffset: 50, category: "Fertilizer" },
    { title: "Flowering & Boll Development Pest check", dayOffset: 75, category: "Pest/Nutrition" },
    { title: "First Cotton Picking", dayOffset: 110, category: "Harvest" },
    { title: "Final Picking & Cotton stalks clearance", dayOffset: 140, category: "Harvest" }
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

// POST /api/crop-calendar/:id/custom-task (Add a custom task to a calendar)
router.post("/:id/custom-task", protect, async (req, res) => {
  try {
    const { title, dayOffset, category } = req.body;
    if (!title) {
      return res.status(400).json({ message: "Task title is required" });
    }

    const calendar = await CropCalendar.findOne({ _id: req.params.id, user: req.user._id });
    if (!calendar) {
      return res.status(404).json({ message: "Crop calendar not found" });
    }

    const offsetVal = Number(dayOffset) || 0;
    const targetDate = new Date(calendar.sowingDate);
    targetDate.setDate(targetDate.getDate() + offsetVal);

    calendar.tasks.push({
      title,
      dayOffset: offsetVal,
      targetDate,
      status: "pending",
      category: category || "custom"
    });

    // Sort tasks by dayOffset
    calendar.tasks.sort((a, b) => a.dayOffset - b.dayOffset);

    await calendar.save();
    return res.status(201).json(calendar);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Failed to add custom task" });
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
