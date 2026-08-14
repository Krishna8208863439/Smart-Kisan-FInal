import express from "express";
import { getAgriExpertReply } from "../services/agriExpertService.js";

const router = express.Router();

const handleChatbotMessage = async (req, res) => {
  const { message, text, history, chatHistory, context, language, gps, weather, waterAvailability } = req.body;

  const userMsg = message || text || "";

  if (!userMsg || typeof userMsg !== "string" || !userMsg.trim()) {
    return res.status(400).json({
      success: false,
      error: "message is required and cannot be empty"
    });
  }

  const mergedContext = {
    location: gps || context?.location,
    weather: weather || context?.weather,
    waterSource: waterAvailability || context?.waterSource,
    language: language || context?.language || "English"
  };

  try {
    const reply = await getAgriExpertReply({
      message: userMsg.trim(),
      history: history || chatHistory || [],
      context: mergedContext
    });

    return res.json({
      success: true,
      reply,
      response: reply,
      source: process.env.OPENAI_API_KEY ? "chatgpt" : "agriexpert"
    });
  } catch (err) {
    console.error("AgriExpert API error:", err);
    return res.status(502).json({
      success: false,
      error: err.message || "AgriExpert is temporarily unavailable. Please try again."
    });
  }
};

router.post("/", handleChatbotMessage);
router.post("/chat", handleChatbotMessage);
router.post("/message", handleChatbotMessage);

export default router;

