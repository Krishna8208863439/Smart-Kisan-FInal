import mongoose from "mongoose";
import { BuyRequestMock } from "../config/memoryDb.js";

const buyRequestSchema = new mongoose.Schema(
  {
    cropName: { type: String, required: true },
    quantity: { type: Number, required: true },
    unit: { type: String, required: true },
    targetPrice: { type: Number, required: true },
    merchant: { type: String, required: true },
    merchantId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    description: { type: String }
  },
  { timestamps: true }
);

const BuyRequestModel = mongoose.model("BuyRequest", buyRequestSchema);

const dynamicBuyRequestExport = new Proxy(BuyRequestModel, {
  get(target, prop) {
    if (global.useMemoryDB) {
      return BuyRequestMock[prop];
    }
    return target[prop];
  }
});

export default dynamicBuyRequestExport;
