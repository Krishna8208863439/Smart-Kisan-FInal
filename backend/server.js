import "./config/proxySetup.js";
import { startCronJobs } from "./services/cronReminders.js";
import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import helmet from "helmet";
import compression from "compression";
import rateLimit from "express-rate-limit";
import swaggerUi from "swagger-ui-express";
import { connectDB } from "./config/db.js";
import { swaggerSpec } from "./config/swagger.js";
import { getRedis } from "./config/redis.js";

// ── Route imports ──────────────────────────────────────────────────────────
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
import yieldRoutes from "./routes/yieldRoutes.js";
import livestockRoutes from "./routes/livestockRoutes.js";
import farmRoutes from "./routes/farmRoutes.js";
import schemesRoutes from "./routes/schemesRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import chatbotRoutes from "./routes/chatbotRoutes.js";
import cropDiagnosticsRoutes from "./routes/cropDiagnosticsRoutes.js";
import paymentRoutes from "./routes/paymentRoutes.js";


dotenv.config();

// ── Connect to database ────────────────────────────────────────────────────
await connectDB();

// ── Initialise Redis (non-blocking — fallback if unavailable) ─────────────
getRedis();

const app = express();
app.set("trust proxy", true);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ──────────────────────────────────────────────────────────────────────────
// SECURITY MIDDLEWARE
// ──────────────────────────────────────────────────────────────────────────

// Helmet: sets secure HTTP headers
app.use(
  helmet({
    crossOriginEmbedderPolicy: false,
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        imgSrc: ["'self'", "data:", "https:", "blob:"],
        scriptSrc: ["'self'", "'unsafe-inline'"] // Needed for Swagger UI
      }
    }
  })
);

// CORS — whitelist driven with fallback for deployment environments
const allowedOrigins = (process.env.CORS_ORIGINS || "http://localhost:5173,http://127.0.0.1:5173,https://krishna3114.pythonanywhere.com,http://krishna3114.pythonanywhere.com")
  .split(",")
  .map(o => o.trim());

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin or matching domain
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin) || origin.includes("pythonanywhere.com")) return callback(null, true);
      callback(null, true);
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "x-gemini-key"]
  })
);

// Compression (gzip/br)
app.use(compression());

// ──────────────────────────────────────────────────────────────────────────
// RATE LIMITING
// ──────────────────────────────────────────────────────────────────────────

// Global rate limiter: 200 requests per 15 minutes per IP
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  validate: { trustProxy: false, xForwardedForHeader: false },
  message: {
    success: false,
    data: null,
    error: {
      code: 429,
      message: "Too many requests. Please try again later.",
      details: []
    }
  }
});

// Stricter limiter for auth endpoints: 20 requests per 15 minutes per IP
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  validate: { trustProxy: false, xForwardedForHeader: false },
  message: {
    success: false,
    data: null,
    error: {
      code: 429,
      message: "Too many authentication attempts. Please wait 15 minutes.",
      details: []
    }
  }
});

// Strict limiter for AI/ML inference (expensive operations)
const aiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  validate: { trustProxy: false, xForwardedForHeader: false },
  message: {
    success: false,
    data: null,
    error: {
      code: 429,
      message: "AI inference rate limit reached. Please wait 1 minute.",
      details: []
    }
  }
});

app.use(globalLimiter);

// ──────────────────────────────────────────────────────────────────────────
// BODY PARSING
// ──────────────────────────────────────────────────────────────────────────
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// ──────────────────────────────────────────────────────────────────────────
// REQUEST LOGGING
// ──────────────────────────────────────────────────────────────────────────
app.use((req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    const duration = Date.now() - start;
    const level = res.statusCode >= 500 ? "ERROR" : res.statusCode >= 400 ? "WARN" : "INFO";
    console.log(
      `[${level}] ${req.method} ${req.path} → ${res.statusCode} (${duration}ms) [${req.ip}]`
    );
  });
  next();
});

// ──────────────────────────────────────────────────────────────────────────
// STATIC FILES
// ──────────────────────────────────────────────────────────────────────────
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// ──────────────────────────────────────────────────────────────────────────
// SWAGGER UI  (available at /api/docs)
// ──────────────────────────────────────────────────────────────────────────
app.use(
  "/api/docs",
  swaggerUi.serve,
  swaggerUi.setup(swaggerSpec, {
    customSiteTitle: "Smart Kisan API Docs",
    customfavIcon: "",
    swaggerOptions: {
      persistAuthorization: true,
      displayRequestDuration: true,
      filter: true
    }
  })
);

// Raw OpenAPI JSON spec
app.get("/api/docs.json", (req, res) => {
  res.setHeader("Content-Type", "application/json");
  res.send(swaggerSpec);
});

// ──────────────────────────────────────────────────────────────────────────
// HEALTH CHECK
// ──────────────────────────────────────────────────────────────────────────
app.get("/", (req, res) => {
  res.json({
    success: true,
    data: {
      service: "Smart Kisan API",
      version: "1.0.0",
      status: "healthy",
      timestamp: new Date().toISOString(),
      docs: "/api/docs"
    },
    error: null
  });
});

app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    data: { status: "healthy", uptime: process.uptime() },
    error: null
  });
});

// ──────────────────────────────────────────────────────────────────────────
// API ROUTES
// ──────────────────────────────────────────────────────────────────────────
app.use("/api/auth", authLimiter, authRoutes);
app.use("/api/recommendations", recommendationRoutes);
app.use("/api/weather", weatherRoutes);
app.use("/api/market", marketRoutes);
app.use("/api/learning", learningRoutes);
app.use("/api/forum", forumRoutes);
app.use("/api/crop-disease", aiLimiter, cropDiseaseRoutes);
app.use("/api/ai", aiLimiter, aiRoutes);
app.use("/api/crop-calendar", cropCalendarRoutes);
app.use("/api/marketplace", marketplaceRoutes);
app.use("/api/payment", paymentRoutes);
app.use("/api/yield", yieldRoutes);
app.use("/api/livestock", livestockRoutes);
app.use("/api/farms", farmRoutes);
app.use("/api/schemes", schemesRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/chat", aiLimiter, chatbotRoutes);
app.use("/api/chatbot", aiLimiter, chatbotRoutes);
app.use("/api/crop-diagnosis", aiLimiter, cropDiagnosticsRoutes);
app.use("/api/crop-diagnostics", aiLimiter, cropDiagnosticsRoutes);
app.use(chatbotRoutes);

// ── Start scheduled cron jobs (reminders, etc.) ────────────────────────────
try { startCronJobs(); } catch (e) { console.warn("[cron] Failed to start:", e.message); }


// ──────────────────────────────────────────────────────────────────────────
// 404 HANDLER
// ──────────────────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({
    success: false,
    data: null,
    error: {
      code: 404,
      message: `Route not found: ${req.method} ${req.path}`,
      details: []
    }
  });
});

// ──────────────────────────────────────────────────────────────────────────
// GLOBAL ERROR HANDLER
// ──────────────────────────────────────────────────────────────────────────
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error("[ERROR] Unhandled:", err.message, err.stack);

  if (err.message && err.message.startsWith("CORS:")) {
    return res.status(403).json({
      success: false,
      data: null,
      error: { code: 403, message: err.message, details: [] }
    });
  }

  res.status(500).json({
    success: false,
    data: null,
    error: {
      code: 500,
      message: process.env.NODE_ENV === "production"
        ? "An internal server error occurred."
        : err.message,
      details: process.env.NODE_ENV === "production" ? [] : [err.stack]
    }
  });
});

// ──────────────────────────────────────────────────────────────────────────
// START SERVER
// ──────────────────────────────────────────────────────────────────────────
const PORT = parseInt(process.env.PORT) || 5000;
app.listen(PORT, () => {
  console.log(`\n🌾 Smart Kisan API running on port ${PORT}`);
  console.log(`📖 Swagger Docs: http://localhost:${PORT}/api/docs`);
  console.log(`🏥 Health:       http://localhost:${PORT}/api/health`);
  console.log(`🌍 Environment:  ${process.env.NODE_ENV || "development"}\n`);
});
