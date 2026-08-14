import mongoose from "mongoose";
import { OrderMock } from "../config/memoryDb.js";

const orderSchema = new mongoose.Schema(
  {
    orderId: { type: String, required: true, unique: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    userEmail: { type: String, required: true },
    items: [
      {
        productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
        name: { type: String, required: true },
        price: { type: Number, required: true },
        quantity: { type: Number, required: true },
        unit: { type: String, required: true },
        image: { type: String }
      }
    ],
    totalAmount: { type: Number, required: true },
    status: { type: String, default: "Processing" }
  },
  { timestamps: true }
);

const OrderModel = mongoose.model("Order", orderSchema);

const dynamicOrderExport = new Proxy(OrderModel, {
  get(target, prop) {
    if (global.useMemoryDB) {
      return OrderMock[prop];
    }
    return target[prop];
  }
});

export default dynamicOrderExport;
