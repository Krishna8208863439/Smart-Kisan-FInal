import mongoose from "mongoose";
import { CropCalendarMock } from "../config/memoryDb.js";

const calendarTaskSchema = new mongoose.Schema({
  title: { type: String, required: true },
  dayOffset: { type: Number, required: true },
  targetDate: { type: Date, required: true },
  status: { type: String, enum: ["pending", "completed"], default: "pending" },
  category: { type: String, default: "general" }
});

const cropCalendarSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    cropName: { type: String, required: true },
    customCropName: { type: String, default: "" },
    sowingDate: { type: Date, required: true },
    tasks: [calendarTaskSchema]
  },
  { timestamps: true }
);

const CropCalendarModel = mongoose.model("CropCalendar", cropCalendarSchema);

const dynamicCropCalendarExport = new Proxy(CropCalendarModel, {
  get(target, prop) {
    if (global.useMemoryDB) {
      return CropCalendarMock[prop];
    }
    return target[prop];
  }
});

export default dynamicCropCalendarExport;
