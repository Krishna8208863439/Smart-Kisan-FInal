import mongoose from "mongoose";
import { YieldPredictionMock } from "../config/memoryDb.js";

const yieldPredictionSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    cropName: { type: String, required: true },
    soilType: { type: String, required: true },
    pH: { type: Number, required: true },
    n: { type: Number, required: true },
    p: { type: Number, required: true },
    k: { type: Number, required: true },
    area: { type: Number, required: true },
    historicalYield: { type: Number },
    predictedYield: { type: Number, required: true }, // tons/acre
    totalPredictedYield: { type: Number, required: true }, // tons
    predictedProfit: { type: Number, required: true }, // Rupees
    irrigationSchedule: [
      {
        stage: { type: String, required: true },
        frequencyDays: { type: Number, required: true },
        runTimeMinutes: { type: Number, required: true },
        notes: { type: String }
      }
    ],
    fertilizerSchedule: [
      {
        stage: { type: String, required: true },
        ureaKg: { type: Number, default: 0 },
        dapKg: { type: Number, default: 0 },
        mopKg: { type: Number, default: 0 },
        organicCompostTons: { type: Number, default: 0 },
        notes: { type: String }
      }
    ],
    region: { type: String, default: "Global" }
  },
  { timestamps: true }
);

const YieldPredictionModel = mongoose.model("YieldPrediction", yieldPredictionSchema);

const dynamicYieldPredictionExport = new Proxy(YieldPredictionModel, {
  get(target, prop) {
    if (global.useMemoryDB) {
      return YieldPredictionMock[prop];
    }
    return target[prop];
  }
});

export default dynamicYieldPredictionExport;
