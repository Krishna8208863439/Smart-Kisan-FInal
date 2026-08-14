import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import Post from "../models/Post.js";

const router = express.Router();

// GET /api/forum/posts
router.get("/posts", async (req, res) => {
  const posts = await Post.find()
    .populate("author", "name")
    .sort({ createdAt: -1 });
  res.json(posts);
});

// POST /api/forum/posts
router.post("/posts", protect, async (req, res) => {
  const { title, content } = req.body;
  const post = await Post.create({
    title,
    content,
    author: req.user._id
  });
  const populated = await post.populate("author", "name");
  res.json(populated);
});

// POST /api/forum/posts/:id/replies
router.post("/posts/:id/replies", protect, async (req, res) => {
  const { content } = req.body;
  const post = await Post.findById(req.params.id);
  if (!post) return res.status(404).json({ message: "Post not found" });

  post.replies.push({
    author: req.user._id,
    content,
    createdAt: new Date()
  });
  await post.save();
  const populated = await Post.findById(post._id)
    .populate("author", "name")
    .populate("replies.author", "name");
  res.json(populated);
});

export default router;
