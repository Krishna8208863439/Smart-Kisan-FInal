import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";

const DEFAULT_OPENAI_MODEL = "gpt-4o-mini";

const AGRI_EXPERT_SYSTEM_PROMPT = `You are AgriExpert, an elite agricultural advisor and digital farming assistant embedded in the Smart Kisan platform for Indian farmers.

CONTEXT YOU RECEIVE PER REQUEST:
- Location / GPS coordinates
- Live weather conditions (temperature, forecast)
- Water availability / Irrigation source (borewell, canal, rainfed, drip)
- Selected language (English, Marathi, Hindi)

CORE GOAL & SCOPE:
1. Provide practical, actionable, easy-to-understand guidance on agriculture, crops, diseases, pests, fertilizers (NPK dosages), irrigation schedules, soil health, farming practices, government schemes, crop sowing, and marketplace transactions.
2. Answer the farmer's SPECIFIC question about their SPECIFIC crop or situation. NEVER default to Tomato or any example crop unless the farmer explicitly asked about Tomato.
3. If exact chemical dosages or site-specific diagnosis is needed, tell the farmer to confirm with their local Krishi Vigyan Kendra (KVK) or district agricultural officer rather than inventing precise figures.
4. STRICT RULES:
   - Do not fabricate false mandi market prices, fake scheme rupee amounts, or unsafe chemical dosages.
   - Reply in the language requested by the user (English, Marathi, or Hindi).
   - Format responses using clean Markdown (short paragraphs, bullet points, bold key terms) so it is easy to read on mobile screens.
   - Maintain context from previous turns in the conversation.`;

/**
 * Generate AI response for AgriExpert chatbot using OpenAI ChatGPT API
 * (or Anthropic Claude as secondary fallback).
 *
 * Throws an Error if no valid API key is configured — the route handler will
 * surface this as HTTP 502 so failures are visible and never disguised as
 * valid advice.
 */
export async function getAgriExpertReply({ message, history = [], context = {} }) {
  const openAiApiKey = process.env.OPENAI_API_KEY;
  const anthropicApiKey = process.env.ANTHROPIC_API_KEY;

  // ── Diagnostic logging (always on) ─────────────────────────────────────────
  console.log(`[AgriExpert] Received message: "${message}"`);
  console.log(`[AgriExpert] OPENAI_API_KEY set: ${Boolean(openAiApiKey && openAiApiKey.trim() && !openAiApiKey.includes("your_api_key_here"))}`);
  console.log(`[AgriExpert] ANTHROPIC_API_KEY set: ${Boolean(anthropicApiKey && anthropicApiKey.trim() && !anthropicApiKey.includes("xxxxxxxx"))}`);

  // Format context details
  const locationStr = typeof context.location === "object" && context.location !== null
    ? `Lat ${context.location.lat}, Lon ${context.location.lon}`
    : (context.location || "unknown");
  const weatherStr = typeof context.weather === "object" && context.weather !== null
    ? `${context.weather.temp ? context.weather.temp + "°C" : ""} ${context.weather.forecast || context.weather.conditions || ""}`.trim()
    : (context.weather || "unknown");

  const contextBlock = [
    `[Live Field Context]`,
    `Location: ${locationStr}`,
    `Weather: ${weatherStr}`,
    `Water source: ${context.waterSource || "not selected"}`,
    `Language: ${context.language || "English"}`
  ].join("\n");

  const rawHistory = Array.isArray(history) ? history.slice(-10) : [];

  // ──────────────────────────────────────────────────────────────────────────
  // 1. OPENAI CHATGPT API INTEGRATION (PRIMARY)
  // ──────────────────────────────────────────────────────────────────────────
  if (openAiApiKey && openAiApiKey.trim() !== "" && !openAiApiKey.includes("your_api_key_here")) {
    try {
      const openai = new OpenAI({ apiKey: openAiApiKey.trim() });
      const modelToUse = process.env.OPENAI_MODEL || DEFAULT_OPENAI_MODEL;

      const openAiMessages = [
        { role: "system", content: AGRI_EXPERT_SYSTEM_PROMPT }
      ];

      for (const item of rawHistory) {
        const role = item.role === "assistant" || item.sender === "ai" ? "assistant" : "user";
        const content = typeof item.content === "string" ? item.content : (item.text || "");
        if (content && content.trim()) {
          openAiMessages.push({ role, content: content.trim() });
        }
      }

      openAiMessages.push({
        role: "user",
        content: `${contextBlock}\n\nFarmer's question: ${message}`
      });

      console.log(`[AgriExpert] Sending to OpenAI (${modelToUse}), messages count: ${openAiMessages.length}`);
      console.log(`[AgriExpert] User content: ${openAiMessages[openAiMessages.length - 1].content.slice(0, 200)}`);

      const completion = await openai.chat.completions.create({
        model: modelToUse,
        messages: openAiMessages,
        max_tokens: 1024,
        temperature: 0.7,
      });

      const reply = completion.choices[0]?.message?.content;
      if (reply && reply.trim()) {
        console.log(`[AgriExpert] OpenAI reply received (${reply.length} chars)`);
        return reply.trim();
      }
    } catch (err) {
      console.error("[AgriExpert] OpenAI API Error:", err.message);
      // Fall through to Anthropic if OpenAI fails
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 2. ANTHROPIC CLAUDE API INTEGRATION (SECONDARY FALLBACK)
  // ──────────────────────────────────────────────────────────────────────────
  if (anthropicApiKey && anthropicApiKey.trim() !== "" && !anthropicApiKey.includes("xxxxxxxx")) {
    try {
      const anthropic = new Anthropic({ apiKey: anthropicApiKey.trim() });
      const primaryModel = process.env.CLAUDE_MODEL || "claude-haiku-4-5-20251001";
      const fallbackModels = [primaryModel, "claude-3-5-haiku-20241022", "claude-3-haiku-20240307"];

      const formattedHistory = [];
      for (const item of rawHistory) {
        const role = item.role === "assistant" || item.sender === "ai" ? "assistant" : "user";
        const content = typeof item.content === "string" ? item.content : (item.text || "");
        if (content && content.trim()) {
          formattedHistory.push({ role, content: content.trim() });
        }
      }

      const claudeMessages = [];
      for (const msg of formattedHistory) {
        if (claudeMessages.length === 0) {
          if (msg.role === "user") claudeMessages.push(msg);
        } else {
          const prevRole = claudeMessages[claudeMessages.length - 1].role;
          if (msg.role !== prevRole) {
            claudeMessages.push(msg);
          } else {
            claudeMessages[claudeMessages.length - 1].content += "\n\n" + msg.content;
          }
        }
      }

      const userContent = `${contextBlock}\n\nFarmer's question: ${message}`;
      if (claudeMessages.length > 0 && claudeMessages[claudeMessages.length - 1].role === "user") {
        claudeMessages[claudeMessages.length - 1].content += "\n\n" + userContent;
      } else {
        claudeMessages.push({ role: "user", content: userContent });
      }

      console.log(`[AgriExpert] Sending to Anthropic Claude, messages count: ${claudeMessages.length}`);
      console.log(`[AgriExpert] User content: ${claudeMessages[claudeMessages.length - 1].content.slice(0, 200)}`);

      for (const modelToUse of [...new Set(fallbackModels)]) {
        try {
          const response = await anthropic.messages.create({
            model: modelToUse,
            max_tokens: 1024,
            system: AGRI_EXPERT_SYSTEM_PROMPT,
            messages: claudeMessages,
          });
          const textBlock = response.content.find((b) => b.type === "text");
          if (textBlock && textBlock.text) {
            console.log(`[AgriExpert] Anthropic (${modelToUse}) reply received (${textBlock.text.length} chars)`);
            return textBlock.text;
          }
        } catch (err) {
          console.warn(`[AgriExpert] Anthropic Model '${modelToUse}' failed:`, err.message);
        }
      }
    } catch (err) {
      console.error("[AgriExpert] Anthropic Client Error:", err.message);
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 3. NO API KEY CONFIGURED — surface as a real error (never disguise as advice)
  // ──────────────────────────────────────────────────────────────────────────
  console.error("[AgriExpert] No valid OPENAI_API_KEY or ANTHROPIC_API_KEY configured. Returning error — check your .env file.");
  throw new Error(
    "AgriExpert AI service is not configured. Please set OPENAI_API_KEY or ANTHROPIC_API_KEY in the backend .env file."
  );
}
