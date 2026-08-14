/**
 * Farm Routes — Smart Kisan
 * Endpoints for farm/field management, GIS boundary storage, and $near queries.
 * All routes require authentication (JWT).
 *
 * @swagger
 * tags:
 *   name: Farms
 *   description: Farm/field management & GIS polygon operations
 */
import express from "express";
import Farm from "../models/Farm.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

// All farm routes require authentication
router.use(protect);

// ── Response helpers ──────────────────────────────────────────────────────
const ok = (res, data, status = 200) =>
  res.status(status).json({ success: true, data, error: null });
const fail = (res, code, message, details = []) =>
  res.status(code).json({ success: false, data: null, error: { code, message, details } });

// ── Acreage calculation from GeoJSON polygon ──────────────────────────────

/**
 * Shoelace formula for spherical coordinates.
 * Approximates area in square metres, then converts to hectares and acres.
 * @param {Array} coords - [[lng, lat], ...] ring coordinates
 * @returns {{ hectares: number, acres: number }}
 */
function calculateArea(coords) {
  const EARTH_RADIUS_M = 6371000;
  const toRad = (deg) => (deg * Math.PI) / 180;

  let area = 0;
  const n = coords.length;

  for (let i = 0; i < n - 1; i++) {
    const [lng1, lat1] = coords[i];
    const [lng2, lat2] = coords[i + 1];
    area +=
      toRad(lng2 - lng1) *
      (2 + Math.sin(toRad(lat1)) + Math.sin(toRad(lat2)));
  }

  const squareMeters = Math.abs((area * EARTH_RADIUS_M * EARTH_RADIUS_M) / 2);
  return {
    hectares: Math.round((squareMeters / 10000) * 100) / 100,
    acres: Math.round((squareMeters / 4047) * 100) / 100
  };
}

// ──────────────────────────────────────────────────────────────────────────
// GET /api/farms — List all farms for authenticated user
// ──────────────────────────────────────────────────────────────────────────
/**
 * @swagger
 * /api/farms:
 *   get:
 *     tags: [Farms]
 *     summary: List user's farms
 *     security: [{ BearerAuth: [] }]
 *     responses:
 *       200:
 *         description: List of farms
 */
router.get("/", async (req, res) => {
  try {
    const farms = await Farm.find({ owner: req.user._id, isActive: true })
      .sort({ createdAt: -1 });
    return ok(res, { farms, count: farms.length });
  } catch (err) {
    console.error("[Farms] List error:", err);
    return fail(res, 500, "Failed to retrieve farms.");
  }
});

// ──────────────────────────────────────────────────────────────────────────
// POST /api/farms — Create a new farm with polygon boundary
// ──────────────────────────────────────────────────────────────────────────
/**
 * @swagger
 * /api/farms:
 *   post:
 *     tags: [Farms]
 *     summary: Create farm with GeoJSON boundary polygon
 *     security: [{ BearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, boundary]
 *             properties:
 *               name: { type: string }
 *               boundary:
 *                 type: object
 *                 properties:
 *                   type: { type: string, enum: [Polygon] }
 *                   coordinates: { type: array }
 *               soil: { type: object }
 *               state: { type: string }
 *               district: { type: string }
 */
router.post("/", async (req, res) => {
  try {
    const {
      name,
      boundary,
      soil,
      waterSource,
      irrigationMethod,
      currentCrop,
      state,
      district,
      village,
      location
    } = req.body;

    if (!name || !boundary || !boundary.coordinates) {
      return fail(res, 400, "name and boundary.coordinates are required.");
    }

    // Validate polygon ring
    const ring = boundary.coordinates[0];
    if (!ring || ring.length < 4) {
      return fail(res, 400, "Polygon must have at least 3 distinct points (4 with closing point).");
    }

    // Calculate acreage from polygon
    const { hectares, acres } = calculateArea(ring);

    // Derive a centroid point for $near queries
    const centroidLng = ring.reduce((s, c) => s + c[0], 0) / (ring.length - 1);
    const centroidLat = ring.reduce((s, c) => s + c[1], 0) / (ring.length - 1);

    const farm = await Farm.create({
      owner: req.user._id,
      name,
      boundary: {
        type: "Polygon",
        coordinates: boundary.coordinates
      },
      areaHectares: hectares,
      areaAcres: acres,
      location: {
        type: "Point",
        coordinates: [centroidLng, centroidLat]
      },
      soil,
      waterSource,
      irrigationMethod,
      currentCrop,
      state,
      district,
      village
    });

    return ok(res, { farm, areaHectares: hectares, areaAcres: acres }, 201);
  } catch (err) {
    console.error("[Farms] Create error:", err);
    return fail(res, 500, "Failed to create farm.");
  }
});

// ──────────────────────────────────────────────────────────────────────────
// GET /api/farms/nearby — Find nearby experts/shops/markets via $near
// ──────────────────────────────────────────────────────────────────────────
/**
 * @swagger
 * /api/farms/nearby:
 *   get:
 *     tags: [Farms]
 *     summary: Find nearby entities (experts, shops, markets)
 *     security: [{ BearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: lat
 *         schema: { type: number }
 *         required: true
 *       - in: query
 *         name: lng
 *         schema: { type: number }
 *         required: true
 *       - in: query
 *         name: radiusKm
 *         schema: { type: number, default: 50 }
 */
router.get("/nearby", async (req, res) => {
  try {
    const lat = parseFloat(req.query.lat);
    const lng = parseFloat(req.query.lng);
    const radiusKm = Math.min(500, parseFloat(req.query.radiusKm) || 50);

    if (isNaN(lat) || isNaN(lng)) {
      return fail(res, 400, "lat and lng query parameters are required.");
    }

    // Find other farms near this point (can be extended to experts/markets collections)
    const nearbyFarms = await Farm.find({
      location: {
        $near: {
          $geometry: { type: "Point", coordinates: [lng, lat] },
          $maxDistance: radiusKm * 1000
        }
      },
      isActive: true
    })
      .limit(20)
      .select("name state district currentCrop areaAcres location owner");

    return ok(res, { nearby: nearbyFarms, count: nearbyFarms.length, radiusKm });
  } catch (err) {
    console.error("[Farms] Nearby error:", err);
    return fail(res, 500, "Failed to find nearby farms.");
  }
});

// ──────────────────────────────────────────────────────────────────────────
// GET /api/farms/:id — Get single farm
// ──────────────────────────────────────────────────────────────────────────
router.get("/:id", async (req, res) => {
  try {
    const farm = await Farm.findOne({ _id: req.params.id, owner: req.user._id });
    if (!farm) return fail(res, 404, "Farm not found.");
    return ok(res, { farm });
  } catch (err) {
    console.error("[Farms] Get error:", err);
    return fail(res, 500, "Failed to retrieve farm.");
  }
});

// ──────────────────────────────────────────────────────────────────────────
// PATCH /api/farms/:id — Update farm (soil, crop, machinery)
// ──────────────────────────────────────────────────────────────────────────
router.patch("/:id", async (req, res) => {
  try {
    const allowedFields = [
      "name", "soil", "waterSource", "irrigationMethod",
      "currentCrop", "sowingDate", "expectedHarvestDate",
      "machinery", "state", "district", "village"
    ];

    const updates = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    }

    const farm = await Farm.findOneAndUpdate(
      { _id: req.params.id, owner: req.user._id },
      updates,
      { new: true }
    );
    if (!farm) return fail(res, 404, "Farm not found or unauthorized.");
    return ok(res, { farm });
  } catch (err) {
    console.error("[Farms] Update error:", err);
    return fail(res, 500, "Failed to update farm.");
  }
});

// ──────────────────────────────────────────────────────────────────────────
// POST /api/farms/:id/crop-history — Add crop history entry
// ──────────────────────────────────────────────────────────────────────────
router.post("/:id/crop-history", async (req, res) => {
  try {
    const { cropName, season, year, yieldKgPerAcre, notes } = req.body;
    if (!cropName || !season || !year) {
      return fail(res, 400, "cropName, season, and year are required.");
    }

    const farm = await Farm.findOneAndUpdate(
      { _id: req.params.id, owner: req.user._id },
      {
        $push: {
          cropHistory: {
            $each: [{ cropName, season, year, yieldKgPerAcre, notes }],
            $slice: -10 // Keep last 10 history entries
          }
        }
      },
      { new: true }
    );

    if (!farm) return fail(res, 404, "Farm not found.");
    return ok(res, { farm });
  } catch (err) {
    console.error("[Farms] Crop history error:", err);
    return fail(res, 500, "Failed to add crop history.");
  }
});

// ──────────────────────────────────────────────────────────────────────────
// DELETE /api/farms/:id — Soft-delete farm
// ──────────────────────────────────────────────────────────────────────────
router.delete("/:id", async (req, res) => {
  try {
    const farm = await Farm.findOneAndUpdate(
      { _id: req.params.id, owner: req.user._id },
      { isActive: false },
      { new: true }
    );
    if (!farm) return fail(res, 404, "Farm not found.");
    return ok(res, { message: "Farm deleted successfully." });
  } catch (err) {
    console.error("[Farms] Delete error:", err);
    return fail(res, 500, "Failed to delete farm.");
  }
});

export default router;
