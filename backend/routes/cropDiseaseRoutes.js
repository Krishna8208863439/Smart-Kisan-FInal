// backend/routes/cropDiseaseRoutes.js
import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const router = express.Router();

// path helpers
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ensure uploads folder exists
const uploadDir = path.join(__dirname, "..", "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const base = path.basename(file.originalname, ext);
    const unique = Date.now() + "-" + Math.round(Math.random() * 1e6);
    cb(null, `${base}-${unique}${ext}`);
  }
});

const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith("image/")) cb(null, true);
  else cb(new Error("Only image files are allowed"), false);
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB
});

// fake model for now
function fakeDiseaseModel(imagePath, cropHint) {
  const samples = [
    {
      crop: "Tomato",
      disease: "Early Blight",
      severity: "medium",
      confidence: 0.87,
      advice:
        "Remove affected leaves, avoid overhead irrigation, and apply a fungicide with chlorothalonil or copper as per local guidelines."
    },
    {
      crop: "Tomato",
      disease: "Leaf Curl (Viral)",
      severity: "high",
      confidence: 0.92,
      advice:
        "Remove and destroy infected plants, control whiteflies, and avoid using infected seedlings."
    },
    {
      crop: "Rice (Paddy)",
      disease: "Leaf Blast",
      severity: "medium",
      confidence: 0.81,
      advice:
        "Maintain proper water level, avoid excess nitrogen, and apply recommended fungicides if needed."
    },
    {
      crop: "Wheat",
      disease: "Rust",
      severity: "low",
      confidence: 0.73,
      advice:
        "Use resistant varieties and apply fungicides only if disease spread increases."
    }
  ];

  const idx = imagePath.length % samples.length;
  const result = samples[idx];
  if (cropHint) return { ...result, crop: cropHint };
  return result;
}

// POST /api/crop-disease/analyze
router.post("/analyze", upload.single("image"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "No image uploaded" });
    }

    const { crop } = req.body;
    const imagePath = req.file.path;

    const prediction = fakeDiseaseModel(imagePath, crop);
    const imageUrl = `/uploads/${path.basename(imagePath)}`;

    return res.json({
      success: true,
      imageUrl,
      ...prediction
    });
  } catch (err) {
    console.error("Disease detection error:", err);
    return res
      .status(500)
      .json({ success: false, message: "Error analyzing image" });
  }
});

export default router;
