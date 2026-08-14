import mongoose from "mongoose";
import { FarmMock } from "../config/memoryDb.js";

/**
 * Farm Schema — Smart Kisan
 * Stores farm/field boundary (GeoJSON polygon), soil data, crop history.
 * 2dsphere index enables $geoIntersects / $near queries.
 */
const farmSchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200
    },

    // ── GeoJSON Polygon boundary (for map drawing) ──
    boundary: {
      type: {
        type: String,
        enum: ["Polygon"],
        required: true,
        default: "Polygon"
      },
      coordinates: {
        type: [[[Number]]],  // Array of rings (each ring: array of [lng, lat] pairs)
        required: true
      }
    },

    // ── Derived: Acreage calculated from polygon (hectares) ──
    areaHectares: { type: Number, default: 0 },
    areaAcres: { type: Number, default: 0 },

    // ── Soil Data ──
    soil: {
      type: { type: String, enum: ["sandy", "loamy", "clay", "peaty", "silt", "chalky", "mixed"], default: "loamy" },
      ph: { type: Number, min: 0, max: 14 },
      nitrogen: Number,    // kg/ha
      phosphorus: Number,  // kg/ha
      potassium: Number,   // kg/ha
      organicMatter: Number, // %
      lastTested: Date
    },

    // ── Water Availability ──
    waterSource: {
      type: String,
      enum: ["rain_fed", "canal", "borewell", "river", "tank", "drip_irrigation"],
      default: "rain_fed"
    },
    irrigationMethod: {
      type: String,
      enum: ["flood", "drip", "sprinkler", "furrow", "none"],
      default: "none"
    },

    // ── Crop History (last 5 seasons) ──
    cropHistory: [
      {
        cropName: String,
        season: String,        // kharif | rabi | zaid
        year: Number,
        yieldKgPerAcre: Number,
        notes: String
      }
    ],

    // ── Current season crop ──
    currentCrop: String,
    sowingDate: Date,
    expectedHarvestDate: Date,

    // ── Location (for $near queries) ──
    location: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point"
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        default: [0, 0]
      }
    },
    state: String,
    district: String,
    village: String,

    // ── Machinery Inventory ──
    machinery: [
      {
        name: String,
        type: String,
        owned: Boolean,
        lastServiced: Date
      }
    ],

    isActive: { type: Boolean, default: true }
  },
  { timestamps: true }
);

// ── Geospatial Indexes ──
farmSchema.index({ boundary: "2dsphere" });
farmSchema.index({ location: "2dsphere" });

// ── Other indexes ──
farmSchema.index({ owner: 1, createdAt: -1 });
farmSchema.index({ state: 1, district: 1 });

const FarmModel = mongoose.model("Farm", farmSchema);

const Farm = new Proxy(FarmModel, {
  get(target, prop, receiver) {
    if (global.useMemoryDB && prop in FarmMock) {
      const mockProp = FarmMock[prop];
      return typeof mockProp === "function" ? mockProp.bind(FarmMock) : mockProp;
    }
    const value = Reflect.get(target, prop, receiver);
    if (typeof value === "function") return value.bind(target);
    return value;
  }
});

export default Farm;

