import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { runCropDiagnosticsPipeline } from "../services/cropDiagnosticsService.js";

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const uploadDir = path.join(__dirname, "..", "uploads");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const base = path.basename(file.originalname, ext).replace(/\s+/g, "_");
    const unique = Date.now() + "-" + Math.round(Math.random() * 1e6);
    cb(null, `${base}-${unique}${ext}`);
  }
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const allowed = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (allowed.includes(file.mimetype) || file.mimetype.startsWith("image/")) {
      return cb(null, true);
    }
    return cb(new Error("Only image files (JPG, PNG, WEBP) are allowed"), false);
  },
  limits: { fileSize: 5 * 1024 * 1024 } // 5 MB limit
});

const handleAnalyze = async (req, res) => {
  try {
    let base64Image = "";
    let mimeType = "image/jpeg";
    let cropTypeHint = req.body.crop || req.body.cropHint || "";

    if (req.file) {
      const buffer = fs.readFileSync(req.file.path);
      base64Image = buffer.toString("base64");
      mimeType = req.file.mimetype || "image/jpeg";
    } else if (req.body.image && typeof req.body.image === "object" && req.body.image.data) {
      base64Image = req.body.image.data;
      mimeType = req.body.image.mimeType || "image/jpeg";
    } else if (req.body.base64Image) {
      base64Image = req.body.base64Image;
      mimeType = req.body.mimeType || "image/jpeg";
    } else if (typeof req.body.image === "string" && req.body.image.startsWith("data:")) {
      const parts = req.body.image.split(";base64,");
      mimeType = parts[0].replace("data:", "");
      base64Image = parts[1];
    } else {
      return res.status(400).json({
        success: false,
        isAgriculturalImage: false,
        error: "No crop image file or base64 data provided."
      });
    }

    const result = await runCropDiagnosticsPipeline({
      base64Image,
      mimeType,
      cropTypeHint
    });

    if (result.isAgriculturalImage === false || result.isPlant === false) {
      return res.status(200).json({
        success: false,
        isAgriculturalImage: false,
        error: result.error || result.message || "Please upload a clear crop, plant, or leaf image for agricultural diagnosis.",
        message: result.message || result.error || "Please upload a clear crop, plant, or leaf image for agricultural diagnosis."
      });
    }

    return res.json({
      success: true,
      isAgriculturalImage: true,
      provider: result.provider || "AgriExpert AI Vision",
      crop: result.crop || "Crop / Plant",
      diagnosis: result.diagnosis,
      certaintyPercent: result.certaintyPercent ?? (result.confidence ? Math.round(result.confidence * 100) : 85),
      confidence: result.confidence ?? 0.85,
      symptoms: result.symptoms || [],
      treatment: result.treatment || [],
      fertilizerAdvice: result.fertilizerAdvice || [],
      irrigationAdvice: result.irrigationAdvice || "Maintain recommended watering schedule.",
      prevention: result.prevention || [],
      severity: result.severity || "Medium",
      disclaimer: result.disclaimer || "AI-based assessment; consult an agricultural expert for confirmation."
    });
  } catch (err) {
    console.error("[CropDiagnostics] Route error:", err.message);
    return res.status(502).json({
      success: false,
      error: err.message || "Diagnosis failed. Please check your image and try again."
    });
  }
};

router.post("/analyze", upload.single("image"), handleAnalyze);
router.post("/crop-diagnosis", upload.single("image"), handleAnalyze);
router.post("/", upload.single("image"), handleAnalyze);

export default router;
