import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";

const DEFAULT_HAIKU_MODEL = "claude-haiku-4-5-20251001";
const DEFAULT_SONNET_MODEL = "claude-sonnet-5";

const STAGE_A_MODELS = [
  process.env.CLAUDE_MODEL || DEFAULT_HAIKU_MODEL,
  "claude-3-5-haiku-20241022",
  "claude-3-haiku-20240307",
];

const STAGE_B_MODELS = [
  DEFAULT_SONNET_MODEL,
  "claude-3-5-sonnet-20241022",
  process.env.CLAUDE_MODEL || DEFAULT_HAIKU_MODEL,
  "claude-3-5-haiku-20241022",
];

// ─────────────────────────────────────────────────────────────────────────────
//  Stage A — Plant/Not-Plant Validation Gate
// ─────────────────────────────────────────────────────────────────────────────
const STAGE_A_SYSTEM_PROMPT = `You are an image validation gate for a crop diagnostics tool.
Your ONLY job: determine whether the image is a usable photograph of a plant, crop leaf, or agricultural field.

Respond with strict JSON ONLY — no markdown, no other text:
{"is_plant": true or false, "reason": "one concise sentence describing what you see"}

Examples:
- Clear tomato leaf with brown spots → {"is_plant": true, "reason": "Clear photograph of a tomato leaf with visible brown lesions."}
- Person's face → {"is_plant": false, "reason": "Image shows a human face, not a plant or crop."}
- Car on a road → {"is_plant": false, "reason": "Image shows a motor vehicle on a road, not a plant or crop."}
- Blurry dark image → {"is_plant": false, "reason": "Image is too dark and blurry to confirm any plant material."}

Be strict and honest — do not pass an image that is ambiguous or not a plant.`;

// ─────────────────────────────────────────────────────────────────────────────
//  Stage B — Tool Definition for Structured, Non-Generic Diagnosis
// ─────────────────────────────────────────────────────────────────────────────
const DIAGNOSIS_TOOL = {
  name: "submit_diagnosis_report",
  description: "Submit a structured crop diagnosis based strictly on the image actually analyzed.",
  input_schema: {
    type: "object",
    properties: {
      crop_or_plant: {
        type: "string",
        description: "Specific crop/plant identified, e.g. 'Tomato', 'Wheat', 'Paddy', 'Cotton', 'Chilli', 'Potato', or 'Unknown Crop' if ambiguous."
      },
      disease_or_problem: {
        type: "string",
        description: "Specific disease/pest/deficiency name (e.g. 'Early Blight', 'Leaf Blast', 'Powdery Mildew'), or 'No significant issue detected (Healthy Crop)' if healthy, or 'Inconclusive / Too Unclear to Diagnose' if blurry."
      },
      certainty_percent: {
        type: "integer",
        description: "Honest confidence 0-100 based on image clarity and symptom distinctiveness — do NOT default to a fixed constant number like 75."
      },
      severity: {
        type: "string",
        enum: ["Low", "Medium", "High", "None"],
        description: "Severity level of observed condition."
      },
      visible_symptoms: {
        type: "array",
        items: { type: "string" },
        description: "Specific visual symptoms actually observed in THIS image (e.g. concentric brown rings on lower leaves, yellow chlorotic margins, powdery white fungal patches) — NEVER use generic boilerplate."
      },
      recommended_treatment: {
        type: "array",
        items: { type: "string" },
        description: "Actionable management steps specific to the identified problem. Defer exact brand/dosage in ml/kg to local Krishi Vigyan Kendra (KVK)."
      },
      recommended_fertilizer: {
        type: "string",
        description: "Specific nutrient or fertilizer recommendations tailored to this crop's observed deficiency or growth stage — not a generic phrase."
      },
      irrigation_care_advice: {
        type: "string",
        description: "Watering and environmental care advice tailored to this specific crop and diagnosed issue."
      },
      prevention_tips: {
        type: "array",
        items: { type: "string" },
        description: "Preventative practices specific to avoiding recurrences of this disease in future cycles."
      }
    },
    required: [
      "crop_or_plant",
      "disease_or_problem",
      "certainty_percent",
      "severity",
      "visible_symptoms",
      "recommended_treatment",
      "recommended_fertilizer",
      "irrigation_care_advice",
      "prevention_tips"
    ]
  }
};

const DIAGNOSIS_SYSTEM_PROMPT = `You are AgriExpert's crop diagnostics module analyzing a real photograph of a plant or crop for Indian farmers.

CRITICAL INSTRUCTIONS:
- Base every single field strictly on what is directly visible in THIS specific image.
- NEVER use generic boilerplate placeholder phrases like "leaf visual patterns detected", "inspect crop regularly", or "apply balanced NPK".
- Describe actual observed symptoms, actual specific disease/deficiency, and tailored guidance.
- If the image is healthy with no disease symptoms, set disease_or_problem to "No significant issue detected (Healthy Crop)", severity to "None" or "Low", and certainty_percent >= 90.
- If the image is blurry, distant, or ambiguous, lower certainty_percent (e.g. <= 40), set disease_or_problem to "Inconclusive / Too Unclear to Diagnose", and note why in visible_symptoms.`;

// Helper: strip JSON markdown formatting
function stripJsonFences(raw) {
  let s = (raw || "").trim();
  if (s.includes("```")) {
    const parts = s.split("```");
    s = parts[1] || parts[0];
    if (s.startsWith("json")) s = s.substring(4);
    s = s.trim().split("```")[0].trim();
  }
  return s;
}

// ─────────────────────────────────────────────────────────────────────────────
//  Main Pipeline Entry Point
// ─────────────────────────────────────────────────────────────────────────────
export async function runCropDiagnosticsPipeline({ base64Image, mimeType, cropTypeHint }) {
  const openAiApiKey = process.env.OPENAI_API_KEY;
  const anthropicApiKey = process.env.ANTHROPIC_API_KEY;

  console.log(`[CropDiagnostics] Starting scan analysis — mimeType: ${mimeType}, cropHint: "${cropTypeHint || "none"}"`);
  console.log(`[CropDiagnostics] OPENAI_API_KEY set: ${Boolean(openAiApiKey && openAiApiKey.trim() && !openAiApiKey.includes("your_api_key_here"))}`);
  console.log(`[CropDiagnostics] ANTHROPIC_API_KEY set: ${Boolean(anthropicApiKey && anthropicApiKey.trim() && !anthropicApiKey.includes("xxxxxxxx"))}`);

  // ──────────────────────────────────────────────────────────────────────────
  // 1. OPENAI VISION (with Structured JSON Output)
  // ──────────────────────────────────────────────────────────────────────────
  if (openAiApiKey && openAiApiKey.trim() !== "" && !openAiApiKey.includes("your_api_key_here")) {
    try {
      const openai = new OpenAI({ apiKey: openAiApiKey.trim() });
      const modelToUse = process.env.OPENAI_VISION_MODEL || process.env.OPENAI_MODEL || "gpt-4o-mini";
      const dataUrl = `data:${mimeType || "image/jpeg"};base64,${base64Image}`;

      console.log(`[CropDiagnostics] Calling OpenAI Vision (${modelToUse})...`);

      const response = await openai.chat.completions.create({
        model: modelToUse,
        messages: [
          { role: "system", content: DIAGNOSIS_SYSTEM_PROMPT },
          {
            role: "user",
            content: [
              { type: "image_url", image_url: { url: dataUrl } },
              {
                type: "text",
                text: `Analyze this image. First determine if it is a crop/plant. Return strict JSON matching:
{
  "is_plant": boolean,
  "rejection_reason": "string (only if not plant)",
  "crop_or_plant": "string",
  "disease_or_problem": "string",
  "certainty_percent": number (0-100),
  "severity": "Low" | "Medium" | "High" | "None",
  "visible_symptoms": ["string"],
  "recommended_treatment": ["string"],
  "recommended_fertilizer": "string",
  "irrigation_care_advice": "string",
  "prevention_tips": ["string"]
}
Farmer specified crop hint: ${cropTypeHint || "none"}. Return raw JSON only.`
              }
            ]
          }
        ],
        max_tokens: 1024,
        temperature: 0.2
      });

      const rawText = (response.choices[0]?.message?.content || "").trim();
      const parsed = JSON.parse(stripJsonFences(rawText));

      if (parsed.is_plant === false || parsed.isAgriculturalImage === false) {
        return {
          isAgriculturalImage: false,
          isPlant: false,
          error: `This doesn't look like a crop or plant image. ${parsed.rejection_reason || "Please scan a clear photo of a crop leaf or plant."}`,
          message: `This doesn't look like a crop or plant image. ${parsed.rejection_reason || "Please scan a clear photo of a crop leaf or plant."}`
        };
      }

      const certainty = typeof parsed.certainty_percent === "number" ? parsed.certainty_percent : 85;

      return {
        success: true,
        isAgriculturalImage: true,
        isPlant: true,
        provider: "OpenAI Vision",
        crop: parsed.crop_or_plant || cropTypeHint || "Crop / Plant",
        diagnosis: parsed.disease_or_problem || "Assessment Inconclusive",
        certaintyPercent: certainty,
        confidence: certainty / 100,
        symptoms: Array.isArray(parsed.visible_symptoms) ? parsed.visible_symptoms : [],
        treatment: Array.isArray(parsed.recommended_treatment) ? parsed.recommended_treatment : [],
        fertilizerAdvice: parsed.recommended_fertilizer ? [parsed.recommended_fertilizer] : [],
        irrigationAdvice: parsed.irrigation_care_advice || "Maintain standard recommended watering.",
        prevention: Array.isArray(parsed.prevention_tips) ? parsed.prevention_tips : [],
        severity: ["Low", "Medium", "High", "None"].includes(parsed.severity) ? parsed.severity : "Medium",
        disclaimer: "AI-based assessment; consult your local Krishi Vigyan Kendra (KVK) for confirmation."
      };
    } catch (err) {
      console.error("[CropDiagnostics] OpenAI Vision Error:", err.message);
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 2. ANTHROPIC CLAUDE VISION (Two-Stage with Strict Tool Use)
  // ──────────────────────────────────────────────────────────────────────────
  if (!anthropicApiKey || !anthropicApiKey.trim() || anthropicApiKey.includes("xxxxxxxx")) {
    console.error("[CropDiagnostics] No valid API keys configured.");
    throw new Error(
      "Crop diagnostics AI service is not configured. Please set OPENAI_API_KEY or ANTHROPIC_API_KEY in the backend .env file."
    );
  }

  const anthropic = new Anthropic({ apiKey: anthropicApiKey.trim() });

  // ── STAGE A: Plant / Non-Plant Gate ─────────────────────────────────────────
  let stageAResult = null;
  let stageALastError = null;

  for (const modelToUse of [...new Set(STAGE_A_MODELS)]) {
    try {
      console.log(`[CropDiagnostics] Stage A Gate — checking with ${modelToUse}...`);
      const stageAResponse = await anthropic.messages.create({
        model: modelToUse,
        max_tokens: 100,
        system: STAGE_A_SYSTEM_PROMPT,
        messages: [{
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: mimeType, data: base64Image } },
            { type: "text", text: "Is this a valid plant or crop image for agricultural diagnosis?" }
          ]
        }]
      });

      const rawText = (stageAResponse.content[0]?.text || "").trim();
      console.log(`[CropDiagnostics] Stage A raw output: ${rawText}`);

      try {
        stageAResult = JSON.parse(stripJsonFences(rawText));
      } catch (_e) {
        const upper = rawText.toUpperCase();
        const isPlant = upper.includes('"IS_PLANT": TRUE') || (upper.includes("PLANT") && !upper.includes("NOT"));
        stageAResult = { is_plant: isPlant, reason: rawText.slice(0, 120) };
      }
      break;
    } catch (err) {
      stageALastError = err;
      console.warn(`[CropDiagnostics] Stage A model ${modelToUse} failed: ${err.message}`);
      if (err.status === 404 || err.message?.toLowerCase().includes("model")) continue;
      throw err;
    }
  }

  if (!stageAResult) {
    throw stageALastError || new Error("Stage A validation failed.");
  }

  if (!stageAResult.is_plant) {
    return {
      isAgriculturalImage: false,
      isPlant: false,
      error: `This doesn't look like a crop or plant image. ${stageAResult.reason || ""} Please scan a clear photo of a crop leaf or plant.`,
      message: `This doesn't look like a crop or plant image. ${stageAResult.reason || ""} Please scan a clear photo of a crop leaf or plant.`
    };
  }

  // ── STAGE B: Structured Diagnosis via Tool Choice ─────────────────────────
  let stageBLastError = null;

  for (const modelToUse of [...new Set(STAGE_B_MODELS)]) {
    try {
      console.log(`[CropDiagnostics] Stage B Diagnosis — querying ${modelToUse} with Tool Use...`);
      const response = await anthropic.messages.create({
        model: modelToUse,
        max_tokens: 1200,
        system: DIAGNOSIS_SYSTEM_PROMPT,
        tools: [DIAGNOSIS_TOOL],
        tool_choice: { type: "tool", name: "submit_diagnosis_report" },
        messages: [{
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: mimeType, data: base64Image } },
            { type: "text", text: `Analyze this crop/plant image and submit a full diagnosis report. Farmer crop hint: ${cropTypeHint || "not specified"}.` }
          ]
        }]
      });

      let toolOutput = null;
      for (const block of response.content) {
        if (block.type === "tool_use" && block.name === "submit_diagnosis_report") {
          toolOutput = block.input;
          break;
        }
      }

      if (!toolOutput) {
        throw new Error("Model did not invoke submit_diagnosis_report tool.");
      }

      console.log(`[CropDiagnostics] Stage B Tool Output — Crop: "${toolOutput.crop_or_plant}", Disease: "${toolOutput.disease_or_problem}", Certainty: ${toolOutput.certainty_percent}%, Severity: ${toolOutput.severity}`);

      const certainty = typeof toolOutput.certainty_percent === "number" ? toolOutput.certainty_percent : 85;

      return {
        success: true,
        isAgriculturalImage: true,
        isPlant: true,
        provider: "Claude Vision",
        crop: toolOutput.crop_or_plant || cropTypeHint || "Crop / Plant",
        diagnosis: toolOutput.disease_or_problem || "Assessment Inconclusive",
        certaintyPercent: certainty,
        confidence: certainty / 100,
        symptoms: Array.isArray(toolOutput.visible_symptoms) ? toolOutput.visible_symptoms : [],
        treatment: Array.isArray(toolOutput.recommended_treatment) ? toolOutput.recommended_treatment : [],
        fertilizerAdvice: toolOutput.recommended_fertilizer ? [toolOutput.recommended_fertilizer] : [],
        irrigationAdvice: toolOutput.irrigation_care_advice || "Maintain standard watering schedule.",
        prevention: Array.isArray(toolOutput.prevention_tips) ? toolOutput.prevention_tips : [],
        severity: ["Low", "Medium", "High", "None"].includes(toolOutput.severity) ? toolOutput.severity : "Medium",
        disclaimer: "AI-based assessment; consult your local Krishi Vigyan Kendra (KVK) for confirmation."
      };
    } catch (err) {
      stageBLastError = err;
      console.warn(`[CropDiagnostics] Stage B model ${modelToUse} failed: ${err.message}`);
      continue;
    }
  }

  throw stageBLastError || new Error("Stage B diagnosis failed — no Anthropic model responded.");
}
