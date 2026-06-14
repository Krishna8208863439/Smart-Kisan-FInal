import mongoose from "mongoose";
import { PostMock } from "../config/memoryDb.js";

const replySchema = new mongoose.Schema(
  {
    author: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    content: String,
    createdAt: { type: Date, default: Date.now }
  },
  { _id: false }
);

const postSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    content: { type: String, required: true },
    author: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    replies: [replySchema]
  },
  { timestamps: true }
);

const PostModel = mongoose.model("Post", postSchema);

const dynamicPostExport = new Proxy(PostModel, {
  get(target, prop) {
    if (global.useMemoryDB) {
      return PostMock[prop];
    }
    return target[prop];
  }
});

export default dynamicPostExport;
