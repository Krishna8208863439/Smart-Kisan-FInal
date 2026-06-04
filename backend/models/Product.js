import mongoose from "mongoose";
import { ProductMock } from "../config/memoryDb.js";

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    category: { type: String, required: true },
    seller: { type: String, required: true },
    sellerId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    price: { type: Number, required: true },
    unit: { type: String, required: true },
    stock: { type: String, default: "In Stock" },
    rating: { type: Number, default: 4.5 },
    reviews: { type: Number, default: 0 },
    image: { type: String },
    description: { type: String }
  },
  { timestamps: true }
);

const ProductModel = mongoose.model("Product", productSchema);

const dynamicProductExport = new Proxy(ProductModel, {
  get(target, prop) {
    if (global.useMemoryDB) {
      return ProductMock[prop];
    }
    return target[prop];
  }
});

export default dynamicProductExport;
