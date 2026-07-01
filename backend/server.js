import "./config/proxySetup.js";
import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import { connectDB } from "./config/db.js";

import authRoutes from "./routes/authRoutes.js";
import recommendationRoutes from "./routes/recommendationRoutes.js";
import weatherRoutes from "./routes/weatherRoutes.js";
import marketRoutes from "./routes/marketRoutes.js";
import learningRoutes from "./routes/learningRoutes.js";
import forumRoutes from "./routes/forumRoutes.js";
import cropDiseaseRoutes from "./routes/cropDiseaseRoutes.js";
import aiRoutes from "./routes/aiRoutes.js";
import cropCalendarRoutes from "./routes/cropCalendarRoutes.js";
import marketplaceRoutes from "./routes/marketplaceRoutes.js";

dotenv.config();

// connect to database
await connectDB();

const app = express();

// ES module path helpers
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// middleware
app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// serve uploaded images
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// base route
app.get("/", (req, res) => {
  res.send("Smart Kisan API running");
});

// API routes
app.use("/api/auth", authRoutes);
app.use("/api/recommendations", recommendationRoutes);
app.use("/api/weather", weatherRoutes);
app.use("/api/market", marketRoutes);
app.use("/api/learning", learningRoutes);
app.use("/api/forum", forumRoutes);
app.use("/api/crop-disease", cropDiseaseRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/crop-calendar", cropCalendarRoutes);
app.use("/api/marketplace", marketplaceRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
