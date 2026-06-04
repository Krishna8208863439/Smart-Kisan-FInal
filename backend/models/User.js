import mongoose from "mongoose";
import { UserMock } from "../config/memoryDb.js";

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, enum: ["farmer", "merchant"], default: "farmer" }
  },
  { timestamps: true }
);

const UserModel = mongoose.model("User", userSchema);

const dynamicUserExport = new Proxy(UserModel, {
  get(target, prop) {
    if (global.useMemoryDB) {
      return UserMock[prop];
    }
    return target[prop];
  }
});

export default dynamicUserExport;
