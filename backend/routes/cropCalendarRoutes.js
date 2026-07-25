import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import CropCalendar from "../models/CropCalendar.js";

const router = express.Router();

// Preset milestones and dynamic schedule generator for crops
const CROP_TEMPLATES = {
  Tomato: [
    { title: "Deep Ploughing & Soil Solarization", dayOffset: -10, category: "Land Preparation" },
    { title: "Nursery Sowing & Seedling Bed Care", dayOffset: 0, category: "Sowing" },
    { title: "Drip Irrigation Setup & Field Beds", dayOffset: 15, category: "Irrigation" },
    { title: "Transplanting Seedlings & Root Drenching", dayOffset: 25, category: "Sowing" },
    { title: "First Pre-Emergence Weeding & Mulching", dayOffset: 35, category: "Weed Control" },
    { title: "First Top Dressing (Basal NPK + Organic Manure)", dayOffset: 45, category: "Fertilizer Schedule" },
    { title: "Staking & Trellising Tomato Vines", dayOffset: 55, category: "Land Preparation" },
    { title: "Preventive Spray against Early Blight & Whiteflies", dayOffset: 65, category: "Disease Prevention" },
    { title: "Fruiting Micronutrient Foliar Spray (Boron + Calcium)", dayOffset: 75, category: "Fertilizer Schedule" },
    { title: "First Harvest of Ripe Tomatoes", dayOffset: 95, category: "Harvest Time" },
    { title: "Post-Harvest Cleaning, Grading & Cold Storage", dayOffset: 110, category: "Storage Recommendations" }
  ],
  Paddy: [
    { title: "Puddling, Summer Ploughing & Bunding", dayOffset: -15, category: "Land Preparation" },
    { title: "Seed Treatment & Wet Bed Nursery Sowing", dayOffset: 0, category: "Sowing" },
    { title: "Main Field Flooding & Levelling", dayOffset: 15, category: "Land Preparation" },
    { title: "Pulling Seedlings & System of Rice Intensification (SRI) Transplanting", dayOffset: 25, category: "Sowing" },
    { title: "Controlled Standing Water Irrigation (3-5cm)", dayOffset: 35, category: "Irrigation" },
    { title: "First Tillering Urea Top Dressing + Zinc Sulfate", dayOffset: 45, category: "Fertilizer Schedule" },
    { title: "Mid-Season Mechanical Weeding (Cono-Weeder)", dayOffset: 60, category: "Weed Control" },
    { title: "Panicle Initiation Top Dressing (NPK 19:19:19) & Blast Prevention", dayOffset: 80, category: "Disease Prevention" },
    { title: "Terminal Irrigation Drainage before Harvest", dayOffset: 110, category: "Irrigation" },
    { title: "Harvesting & Threshing Paddy Grains", dayOffset: 125, category: "Harvest Time" },
    { title: "Drying to 12% Moisture & Air-Tight Silo Storage", dayOffset: 135, category: "Storage Recommendations" }
  ],
  Rice: [
    { title: "Puddling, Summer Ploughing & Bunding", dayOffset: -15, category: "Land Preparation" },
    { title: "Seed Treatment & Wet Bed Nursery Sowing", dayOffset: 0, category: "Sowing" },
    { title: "Main Field Flooding & Levelling", dayOffset: 15, category: "Land Preparation" },
    { title: "Pulling Seedlings & SRI Transplanting", dayOffset: 25, category: "Sowing" },
    { title: "Controlled Standing Water Irrigation (3-5cm)", dayOffset: 35, category: "Irrigation" },
    { title: "First Tillering Urea Top Dressing + Zinc Sulfate", dayOffset: 45, category: "Fertilizer Schedule" },
    { title: "Mid-Season Mechanical Weeding", dayOffset: 60, category: "Weed Control" },
    { title: "Panicle Initiation Top Dressing & Blast Prevention", dayOffset: 80, category: "Disease Prevention" },
    { title: "Terminal Irrigation Drainage", dayOffset: 110, category: "Irrigation" },
    { title: "Harvesting & Threshing Paddy Grains", dayOffset: 125, category: "Harvest Time" },
    { title: "Drying to 12% Moisture & Air-Tight Silo Storage", dayOffset: 135, category: "Storage Recommendations" }
  ],
  Wheat: [
    { title: "Disc Harrowing & Field Leveling", dayOffset: -7, category: "Land Preparation" },
    { title: "Line Sowing with Seed-cum-Fertilizer Drill", dayOffset: 0, category: "Sowing" },
    { title: "First Irrigation at Crown Root Initiation (CRI Stage)", dayOffset: 21, category: "Irrigation" },
    { title: "First Top Dressing (Urea Application)", dayOffset: 30, category: "Fertilizer Schedule" },
    { title: "Post-Emergence Herbicide Spray against Phalaris minor", dayOffset: 40, category: "Weed Control" },
    { title: "Second Irrigation at Jointing Stage & Rust Inspection", dayOffset: 60, category: "Disease Prevention" },
    { title: "Third Irrigation at Flowering & Grain Filling Stage", dayOffset: 85, category: "Irrigation" },
    { title: "Crop Maturity Drying & Combine Harvesting", dayOffset: 125, category: "Harvest Time" },
    { title: "Sun Drying to <10% Moisture & Metal Bin Storage", dayOffset: 135, category: "Storage Recommendations" }
  ],
  Cotton: [
    { title: "Deep Summer Tillage & FYM Application", dayOffset: -15, category: "Land Preparation" },
    { title: "Dibbling Treated Bt-Cotton Seeds on Ridges", dayOffset: 0, category: "Sowing" },
    { title: "Gap Filling & Thinning", dayOffset: 15, category: "Land Preparation" },
    { title: "First Inter-Culture & Hand Weeding", dayOffset: 30, category: "Weed Control" },
    { title: "Square Formation Stage Irrigation & NPK Top Dressing", dayOffset: 50, category: "Fertilizer Schedule" },
    { title: "Bollworm & Whitefly Monitoring & Neem Oil Spray", dayOffset: 70, category: "Disease Prevention" },
    { title: "Peak Flowering & Boll Development Drip Irrigation", dayOffset: 90, category: "Irrigation" },
    { title: "First Cotton Fiber Picking", dayOffset: 120, category: "Harvest Time" },
    { title: "Final Picking, Drying & Dry Storage in Bales", dayOffset: 150, category: "Storage Recommendations" }
  ],
  Sugarcane: [
    { title: "Trench/Furrow Digging & Heavy Manuring", dayOffset: -15, category: "Land Preparation" },
    { title: "Sett Treatment in Fungicide & Planting in Furrows", dayOffset: 0, category: "Sowing" },
    { title: "First Irrigation & Light Weeding", dayOffset: 20, category: "Irrigation" },
    { title: "Sprouting Top Dressing & Inter-cultivation", dayOffset: 45, category: "Fertilizer Schedule" },
    { title: "First Earthing Up & Weed Removal", dayOffset: 75, category: "Weed Control" },
    { title: "Red Rot & Smut Prophylactic Fungicide Spray", dayOffset: 105, category: "Disease Prevention" },
    { title: "Grand Growth Stage Trash Mulching & Drip Irrigation", dayOffset: 150, category: "Irrigation" },
    { title: "Cane Propping/Tying against Lodging", dayOffset: 210, category: "Land Preparation" },
    { title: "Harvesting Mature Sugarcane Stalks", dayOffset: 330, category: "Harvest Time" },
    { title: "Immediate Mill Dispatch & Ratoon Management", dayOffset: 345, category: "Storage Recommendations" }
  ],
  Maize: [
    { title: "Ploughing & Raised Bed Preparation", dayOffset: -7, category: "Land Preparation" },
    { title: "Ridge & Furrow Sowing of Hybrid Maize Seeds", dayOffset: 0, category: "Sowing" },
    { title: "Pre-Emergence Atrazine Spray for Weed Control", dayOffset: 5, category: "Weed Control" },
    { title: "Knee-High Stage First Top Dressing (Urea)", dayOffset: 30, category: "Fertilizer Schedule" },
    { title: "Fall Armyworm Inspection & Whorl Drenching", dayOffset: 40, category: "Disease Prevention" },
    { title: "Tasseling & Silking Stage Drip Irrigation", dayOffset: 60, category: "Irrigation" },
    { title: "Cob Development Potassium Micronutrient Spray", dayOffset: 75, category: "Fertilizer Schedule" },
    { title: "Harvesting Dry Maize Cobs", dayOffset: 105, category: "Harvest Time" },
    { title: "Cob De-husking, Shelling & Dry Storage", dayOffset: 115, category: "Storage Recommendations" }
  ],
  Soybean: [
    { title: "Tillage & Rhizobium Inoculation", dayOffset: -5, category: "Land Preparation" },
    { title: "Line Sowing at Optimum Soil Moisture", dayOffset: 0, category: "Sowing" },
    { title: "First Irrigation / Rain Water Management", dayOffset: 15, category: "Irrigation" },
    { title: "Inter-culture & Weed Removal at 25 Days", dayOffset: 25, category: "Weed Control" },
    { title: "Flowering Stage DAP + Sulfur Application", dayOffset: 45, category: "Fertilizer Schedule" },
    { title: "Yellow Mosaic Virus & Caterpillar Bio-Spray", dayOffset: 55, category: "Disease Prevention" },
    { title: "Pod Filling Stage Moisture Maintenance", dayOffset: 70, category: "Irrigation" },
    { title: "Harvesting when 85% Pods Turn Brown", dayOffset: 95, category: "Harvest Time" },
    { title: "Threshing & Storage in Ventilated Bags", dayOffset: 105, category: "Storage Recommendations" }
  ],
  Groundnut: [
    { title: "Fine Seed Bed Prep & Gypsum Incorporation", dayOffset: -10, category: "Land Preparation" },
    { title: "Sowing Kernel Seeds treated with Trichoderma", dayOffset: 0, category: "Sowing" },
    { title: "Pre-Emergence Weed Management", dayOffset: 10, category: "Weed Control" },
    { title: "Pegging Stage Gypsum Application & Earthing Up", dayOffset: 40, category: "Fertilizer Schedule" },
    { title: "Tikka Leaf Spot & Stem Rot Fungicidal Spray", dayOffset: 50, category: "Disease Prevention" },
    { title: "Pod Development Stage Critical Irrigation", dayOffset: 65, category: "Irrigation" },
    { title: "Harvesting / Pod Pulling at Maturity", dayOffset: 105, category: "Harvest Time" },
    { title: "Sun Curing Pods & Dry Moisture Control", dayOffset: 115, category: "Storage Recommendations" }
  ],
  Onion: [
    { title: "Nursery Bed Prep & Organic FYM Blending", dayOffset: -40, category: "Land Preparation" },
    { title: "Nursery Seed Sowing", dayOffset: -35, category: "Sowing" },
    { title: "Transplanting 6-Week Seedlings to Main Field", dayOffset: 0, category: "Sowing" },
    { title: "Drip Irrigation & Pre-Emergence Herbicide", dayOffset: 10, category: "Weed Control" },
    { title: "First Split Top Dressing (NPK 19:19:19)", dayOffset: 30, category: "Fertilizer Schedule" },
    { title: "Purple Blotch & Thrips Insecticidal Spray", dayOffset: 45, category: "Disease Prevention" },
    { title: "Bulb Enlargement Stage Potassium Boost & Irrigation", dayOffset: 65, category: "Irrigation" },
    { title: "Withhold Water 15 Days Before Harvest", dayOffset: 90, category: "Irrigation" },
    { title: "Harvesting & Neck Cutting (Topping)", dayOffset: 105, category: "Harvest Time" },
    { title: "Field Curing & Ventilated Wooden Storage Crates", dayOffset: 120, category: "Storage Recommendations" }
  ],
  Potato: [
    { title: "Deep Ploughing & Organic Compost Bed Prep", dayOffset: -10, category: "Land Preparation" },
    { title: "Planting Sprouted Disease-Free Seed Tubers", dayOffset: 0, category: "Sowing" },
    { title: "First Irrigation & Light Soil Covering", dayOffset: 12, category: "Irrigation" },
    { title: "First Earthing Up & NPK Top Dressing", dayOffset: 25, category: "Fertilizer Schedule" },
    { title: "Hand Weeding & Inter-row Tillage", dayOffset: 35, category: "Weed Control" },
    { title: "Late Blight Prophylactic Copper Spray", dayOffset: 50, category: "Disease Prevention" },
    { title: "Tuber Initiation Drip Irrigation", dayOffset: 65, category: "Irrigation" },
    { title: "Haulm Cutting (Dehalming) to Harden Skins", dayOffset: 90, category: "Harvest Time" },
    { title: "Tuber Digging & Sorting", dayOffset: 105, category: "Harvest Time" },
    { title: "Curing at 15°C & Cold Storage Placement", dayOffset: 115, category: "Storage Recommendations" }
  ],
  Chilli: [
    { title: "Nursery Bed Preparation & Solarization", dayOffset: -30, category: "Land Preparation" },
    { title: "Nursery Seed Sowing", dayOffset: -25, category: "Sowing" },
    { title: "Seedling Transplanting on Raised Beds", dayOffset: 0, category: "Sowing" },
    { title: "First Weeding & Earthing Up", dayOffset: 20, category: "Weed Control" },
    { title: "First Split NPK Fertilizer & Bio-Stimulant", dayOffset: 35, category: "Fertilizer Schedule" },
    { title: "Drip Irrigation Maintenance", dayOffset: 45, category: "Irrigation" },
    { title: "Chilli Leaf Curl & Mite Prevention Spray", dayOffset: 60, category: "Disease Prevention" },
    { title: "First Green Chilli Picking", dayOffset: 85, category: "Harvest Time" },
    { title: "Sun Drying Red Chillies on Clean Tarpaulins & Storage", dayOffset: 120, category: "Storage Recommendations" }
  ],
  Banana: [
    { title: "Pit Digging (60x60x60 cm) & FYM Drenching", dayOffset: -20, category: "Land Preparation" },
    { title: "Planting Tissue Culture Banana Plantlets", dayOffset: 0, category: "Sowing" },
    { title: "Immediate Drip Irrigation & Basin Mulching", dayOffset: 5, category: "Irrigation" },
    { title: "Desuckering & Weeding around Stems", dayOffset: 45, category: "Weed Control" },
    { title: "Monthly NPK + Fertigation Split Schedule", dayOffset: 90, category: "Fertilizer Schedule" },
    { title: "Sigatoka Leaf Spot & Stem Weevil Inspection/Spray", dayOffset: 150, category: "Disease Prevention" },
    { title: "Bunch Emergence & Bunch Sleeving", dayOffset: 240, category: "Land Preparation" },
    { title: "Bunch Propping & Drip Fertigation Boost", dayOffset: 280, category: "Irrigation" },
    { title: "Bunch Harvesting at 75% Maturity", dayOffset: 350, category: "Harvest Time" },
    { title: "De-handing, Washing in Alum Water & Cold Chain Storage", dayOffset: 360, category: "Storage Recommendations" }
  ],
  Mango: [
    { title: "Orchard Pit Preparation & Basin Leveling", dayOffset: -30, category: "Land Preparation" },
    { title: "Planting Grafted Mango Saplings", dayOffset: 0, category: "Sowing" },
    { title: "Basin Irrigation & Weed Ring Cleaning", dayOffset: 15, category: "Irrigation" },
    { title: "Intercropping Weeding & Organic Manuring", dayOffset: 60, category: "Weed Control" },
    { title: "Post-Monsoon NPK & Micronutrient Drenching", dayOffset: 120, category: "Fertilizer Schedule" },
    { title: "Powdery Mildew & Hopper Spray during Flowering", dayOffset: 180, category: "Disease Prevention" },
    { title: "Fruit Drop Control & Foliar Potassium Spray", dayOffset: 210, category: "Fertilizer Schedule" },
    { title: "Fruit Harvesting with Pedicel Intact", dayOffset: 300, category: "Harvest Time" },
    { title: "Desapment, Hot Water Treatment & Crating", dayOffset: 310, category: "Storage Recommendations" }
  ],
  Grapes: [
    { title: "Trellis Structure Alignment & Foundation Pruning", dayOffset: -20, category: "Land Preparation" },
    { title: "Rootstock Planting / Field Grafting", dayOffset: 0, category: "Sowing" },
    { title: "Drip Fertigation & Shoot Training", dayOffset: 30, category: "Irrigation" },
    { title: "Canopy Weeding & Sucker Removal", dayOffset: 60, category: "Weed Control" },
    { title: "October Forward Pruning & NPK Drench", dayOffset: 120, category: "Fertilizer Schedule" },
    { title: "Downy Mildew & Flea Beetle Protection Spray", dayOffset: 150, category: "Disease Prevention" },
    { title: "GA3 Berry Elongation Spray & Irrigation Control", dayOffset: 180, category: "Fertilizer Schedule" },
    { title: "Harvesting Sweet Grape Bunches", dayOffset: 250, category: "Harvest Time" },
    { title: "Pre-Cooling & SO2 Sheet Packaging in Cold Storage", dayOffset: 260, category: "Storage Recommendations" }
  ]
};

// Helper function to build dynamic schedules for any crop
function generateDynamicCropSchedule(cropName, customCropName) {
  let templateKey = Object.keys(CROP_TEMPLATES).find(
    k => k.toLowerCase() === (cropName || "").toLowerCase()
  );

  let baseTemplate = templateKey ? CROP_TEMPLATES[templateKey] : null;

  if (!baseTemplate) {
    const dispName = customCropName || cropName || "Crop";
    baseTemplate = [
      { title: `Land Tillage & Soil Preparation for ${dispName}`, dayOffset: -7, category: "Land Preparation" },
      { title: `Sowing / Planting ${dispName} Seeds`, dayOffset: 0, category: "Sowing" },
      { title: `First Irrigation & Germination Check`, dayOffset: 7, category: "Irrigation" },
      { title: `First Weeding & Hoeing`, dayOffset: 20, category: "Weed Control" },
      { title: `Basal Top Dressing (NPK 19:19:19)`, dayOffset: 35, category: "Fertilizer Schedule" },
      { title: `Prophylactic Disease & Pest Spray`, dayOffset: 50, category: "Disease Prevention" },
      { title: `Vegetative & Flowering Stage Irrigation`, dayOffset: 65, category: "Irrigation" },
      { title: `Harvesting Mature ${dispName}`, dayOffset: 95, category: "Harvest Time" },
      { title: `Drying, Cleaning & Safe Granary Storage`, dayOffset: 105, category: "Storage Recommendations" }
    ];
  }

  return baseTemplate;
}

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
    const { cropName, customCropName, sowingDate } = req.body;
    if (!cropName || !sowingDate) {
      return res.status(400).json({ message: "Crop name and sowing date are required" });
    }

    const startDate = new Date(sowingDate);
    const template = generateDynamicCropSchedule(cropName, customCropName);

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
      customCropName: customCropName || "",
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

// PATCH /api/crop-calendar/:id (Update sowing date)
router.patch("/:id", protect, async (req, res) => {
  try {
    const { sowingDate } = req.body;
    if (!sowingDate) {
      return res.status(400).json({ message: "Sowing date is required" });
    }

    const calendar = await CropCalendar.findOne({ _id: req.params.id, user: req.user._id });
    if (!calendar) {
      return res.status(404).json({ message: "Crop calendar not found" });
    }

    const newSowingDate = new Date(sowingDate);
    calendar.sowingDate = newSowingDate;

    // Recalculate targetDate for all tasks based on their dayOffset
    calendar.tasks.forEach((task) => {
      const newTarget = new Date(newSowingDate);
      newTarget.setDate(newTarget.getDate() + task.dayOffset);
      task.targetDate = newTarget;
    });

    await calendar.save();
    return res.json(calendar);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Failed to update sowing date" });
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
