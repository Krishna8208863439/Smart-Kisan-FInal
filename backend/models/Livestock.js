import mongoose from "mongoose";
import { LivestockMock } from "../config/memoryDb.js";

const milkRecordSchema = new mongoose.Schema({
  date: { type: Date, required: true },
  morningYield: { type: Number, required: true }, // in Liters
  eveningYield: { type: Number, required: true }, // in Liters
  fatPercentage: { type: Number }
});

const vaccinationSchema = new mongoose.Schema({
  name: { type: String, required: true },
  dateAdministered: { type: Date },
  nextDueDate: { type: Date, required: true },
  status: { type: String, enum: ["pending", "completed"], default: "pending" }
});

const feedingSchema = new mongoose.Schema({
  feedType: { type: String, required: true }, // e.g. "Green Fodder", "Dry Fodder", "Concentrates"
  quantityKg: { type: Number, required: true },
  frequencyPerDay: { type: Number, default: 2 },
  notes: { type: String }
});

const livestockSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    tagNumber: { type: String, required: true }, // unique cattle ID tag
    name: { type: String, required: true },
    type: { type: String, required: true, enum: ["Cow", "Buffalo", "Goat", "Sheep", "Other"] },
    breed: { type: String, required: true },
    ageYears: { type: Number, required: true },
    healthStatus: { type: String, required: true, enum: ["Healthy", "Sick", "Under Treatment", "Pregnant", "Dry"], default: "Healthy" },
    imageUrl: { type: String },
    milkRecords: [milkRecordSchema],
    vaccinations: [vaccinationSchema],
    feedingSchedules: [feedingSchema]
  },
  { timestamps: true }
);

const LivestockModel = mongoose.model("Livestock", livestockSchema);

const dynamicLivestockExport = new Proxy(LivestockModel, {
  get(target, prop) {
    if (global.useMemoryDB) {
      return LivestockMock[prop];
    }
    return target[prop];
  }
});

export default dynamicLivestockExport;
