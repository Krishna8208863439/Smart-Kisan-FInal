import mongoose from "mongoose";
import { ContractMock } from "../config/memoryDb.js";

const contractSchema = new mongoose.Schema(
  {
    cropName: { type: String, required: true },
    quantity: { type: Number, required: true },
    unit: { type: String, required: true },
    price: { type: Number, required: true },
    sellerName: { type: String, required: true },
    buyerName: { type: String, required: true },
    buyerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    status: { type: String, enum: ["Pending", "Approved", "In Transit", "Completed"], default: "Pending" }
  },
  { timestamps: true }
);

const ContractModel = mongoose.model("Contract", contractSchema);

const dynamicContractExport = new Proxy(ContractModel, {
  get(target, prop) {
    if (global.useMemoryDB) {
      return ContractMock[prop];
    }
    return target[prop];
  }
});

export default dynamicContractExport;
