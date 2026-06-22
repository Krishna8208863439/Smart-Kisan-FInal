// backend/routes/cropDiseaseRoutes.js
import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

// ── Upload directory ────────────────────────────────────────────────────────
const uploadDir = path.join(__dirname, "..", "uploads");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext    = path.extname(file.originalname);
    const base   = path.basename(file.originalname, ext).replace(/\s+/g, "_");
    const unique = Date.now() + "-" + Math.round(Math.random() * 1e6);
    cb(null, `${base}-${unique}${ext}`);
  }
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) =>
    file.mimetype.startsWith("image/")
      ? cb(null, true)
      : cb(new Error("Only image files are allowed"), false),
  limits: { fileSize: 5 * 1024 * 1024 } // 5 MB
});

// ── Comprehensive crop disease database ─────────────────────────────────────
// Covers all major Indian crops — used when Gemini API is unavailable
const DISEASE_DATABASE = {
  tomato: [
    {
      crop: "Tomato", disease: "Early Blight (Alternaria solani)", severity: "medium", confidence: 0.87,
      advice: "Dark concentric target-board spots on older leaves. Apply Mancozeb 75 WP (2 g/L) or Copper Oxychloride 50 WP (3 g/L) every 7-10 days. Prune lower diseased leaves to improve airflow. Mulch soil to prevent splash inoculation. Practice 3-year crop rotation."
    },
    {
      crop: "Tomato", disease: "Leaf Curl Virus (TLCV)", severity: "high", confidence: 0.92,
      advice: "Upward leaf curling and yellowing caused by Whiteflies (Bemisia tabaci). Immediately destroy infected plants. Spray Acetamiprid 20 SP (0.2 g/L) or Imidacloprid 17.8 SL (0.3 ml/L). Install yellow sticky traps @ 12/acre. Use TYLCV-resistant varieties next season."
    },
    {
      crop: "Tomato", disease: "Late Blight (Phytophthora infestans)", severity: "high", confidence: 0.89,
      advice: "Water-soaked dark lesions with white mold on leaf undersides. Apply Cymoxanil 8% + Mancozeb 64% WP (3 g/L) every 5-7 days. Avoid overhead irrigation. Destroy infected plant debris. Use blight-resistant varieties."
    }
  ],
  rice: [
    {
      crop: "Rice (Paddy)", disease: "Leaf Blast (Magnaporthe oryzae)", severity: "high", confidence: 0.88,
      advice: "Spindle-shaped grey-centered lesions with brown borders on leaves. Spray Tricyclazole 75 WP (0.6 g/L) or Isoprothiolane 40 EC (1.5 ml/L) at tillering and booting stages. Stop excess Urea application as high nitrogen increases susceptibility. Drain field 3-4 days during active outbreak."
    },
    {
      crop: "Rice (Paddy)", disease: "Sheath Blight (Rhizoctonia solani)", severity: "medium", confidence: 0.83,
      advice: "Oval greyish-white lesions near water level on leaf sheaths. Apply Hexaconazole 5 SC (2 ml/L) or Validamycin 3 L (2 ml/L). Reduce plant density. Drain the field during early crop stages. Avoid excessive Nitrogen application."
    },
    {
      crop: "Rice (Paddy)", disease: "Brown Spot (Helminthosporium oryzae)", severity: "medium", confidence: 0.79,
      advice: "Oval brown spots with grey center on leaves. Spray Mancozeb 75 WP (2.5 g/L) or Carbendazim 50 WP (1 g/L). Apply balanced potassium nutrition. Treat seeds in Thiram 3 g/kg before sowing. Maintain adequate soil potassium levels."
    }
  ],
  wheat: [
    {
      crop: "Wheat", disease: "Black Stem Rust (Puccinia graminis)", severity: "high", confidence: 0.85,
      advice: "Reddish-brown pustules on stems and leaves turning black at maturity. Apply Propiconazole 25 EC (0.5 ml/L) or Tebuconazole 250 EC (0.75 ml/L) at first appearance. Next season sow rust-resistant varieties HD-3086, HD-2967, or DBW-187. Remove volunteer wheat plants."
    },
    {
      crop: "Wheat", disease: "Yellow Stripe Rust (Puccinia striiformis)", severity: "high", confidence: 0.82,
      advice: "Yellow pustules in rows along leaf veins. Spray Propiconazole 25 EC (1 ml/L) at first sign. Use resistant varieties (K-307, PBW-550). Sow at recommended time to avoid peak rust weather. Monitor forecast alerts."
    },
    {
      crop: "Wheat", disease: "Powdery Mildew (Blumeria graminis)", severity: "medium", confidence: 0.80,
      advice: "White powdery patches on upper leaf surface. Spray Sulfur 80 WP (3 g/L) or Hexaconazole 5 SC (1 ml/L). Reduce excess nitrogen. Improve air circulation by reducing plant density. Avoid late planting."
    }
  ],
  maize: [
    {
      crop: "Maize (Corn)", disease: "Northern Leaf Blight (Exserohilum turcicum)", severity: "high", confidence: 0.86,
      advice: "Long tan/grey elliptical lesions on leaves. Apply Propiconazole 25 EC (1 ml/L) or Mancozeb 75 WP (2 g/L) at VT (tasseling) stage. Use resistant hybrids. Practice yearly crop rotation. Destroy infected crop debris after harvest."
    },
    {
      crop: "Maize (Corn)", disease: "Gray Leaf Spot (Cercospora zeae-maydis)", severity: "medium", confidence: 0.81,
      advice: "Rectangular grey-tan lesions limited by leaf veins. Spray Azoxystrobin 23 SC (1 ml/L). Minimum tillage to reduce soil-borne inoculum. Plant resistant hybrids. Crop rotation with soybean reduces severity."
    },
    {
      crop: "Maize (Corn)", disease: "Fall Armyworm (Spodoptera frugiperda)", severity: "high", confidence: 0.90,
      advice: "Holes in whorls with frass (sawdust-like excreta). Apply Emamectin Benzoate 5 SG (0.4 g/L) or Chlorantraniliprole 18.5 SC (0.3 ml/L) directly into the whorl. Scout at 3-4 leaf stage. Early morning spray is most effective. Use pheromone traps."
    }
  ],
  cotton: [
    {
      crop: "Cotton", disease: "Bacterial Blight (Xanthomonas axonopodis)", severity: "high", confidence: 0.84,
      advice: "Angular water-soaked spots turning brown with yellow halo on leaves. Spray Copper Oxychloride 50 WP (3 g/L) + Streptocycline (0.15 g/L). Use certified disease-free seeds. Avoid overhead irrigation. Destroy infected crop debris."
    },
    {
      crop: "Cotton", disease: "Cotton Leaf Curl Virus (CLCuV)", severity: "high", confidence: 0.91,
      advice: "Upward leaf curling, vein thickening (enations). Whitefly vector — apply Acetamiprid 20 SP (0.2 g/L) weekly. Remove infected plants. Use CLCuV-tolerant hybrids like MRC-7017. Install reflective mulch to deter whiteflies."
    }
  ],
  sugarcane: [
    {
      crop: "Sugarcane", disease: "Red Rot (Colletotrichum falcatum)", severity: "high", confidence: 0.85,
      advice: "Internal red discoloration with white patches and sour smell in cane stalks. No effective spray — remove and burn infected stools. Treat setts in Carbendazim 0.1% for 15 min before planting. Plant resistant varieties Co-0238 or Co-86032."
    },
    {
      crop: "Sugarcane", disease: "Smut (Ustilago scitaminea)", severity: "high", confidence: 0.88,
      advice: "Black whip-like structure replacing the growing point. Remove and burn infected plants immediately. Hot water treatment at 50°C for 2 hours for setts. Plant smut-resistant varieties. Do not use infected setts for planting."
    }
  ],
  potato: [
    {
      crop: "Potato", disease: "Late Blight (Phytophthora infestans)", severity: "high", confidence: 0.90,
      advice: "Water-soaked brown lesions with white downy mold on leaf undersides. Apply Cymoxanil 8% + Mancozeb 64% WP (3 g/L) every 5 days. Destroy infected haulms. Avoid overhead irrigation. Use blight-resistant varieties like Kufri Jyoti or Kufri Himalini."
    },
    {
      crop: "Potato", disease: "Early Blight (Alternaria solani)", severity: "medium", confidence: 0.83,
      advice: "Concentric dark target-board spots on older leaves. Spray Mancozeb 75 WP (2 g/L) or Chlorothalonil 75 WP (2 g/L) every 10 days. Remove infected leaves. Maintain adequate potassium nutrition."
    }
  ],
  groundnut: [
    {
      crop: "Groundnut (Peanut)", disease: "Early Leaf Spot (Cercospora arachidicola)", severity: "medium", confidence: 0.82,
      advice: "Dark brown circular spots with yellow halo on leaves. Spray Mancozeb 75 WP (2.5 g/L) or Chlorothalonil 75 WP (2 g/L) at 30, 45, 60 DAS. Remove infected leaves. Apply gypsum 200 kg/ha at pegging stage."
    },
    {
      crop: "Groundnut (Peanut)", disease: "Groundnut Rust (Puccinia arachidis)", severity: "medium", confidence: 0.80,
      advice: "Orange-brown pustules on leaf underside. Spray Triadimefon 25 WP (1 g/L) or Tebuconazole 250 EC (1 ml/L). Use resistant varieties like ICGV-86031. Rotate with non-host crops."
    }
  ],
  soybean: [
    {
      crop: "Soybean", disease: "Frogeye Leaf Spot (Cercospora sojina)", severity: "medium", confidence: 0.79,
      advice: "Small circular spots — dark border with grey center resembling frog eyes. Apply Thiophanate-methyl 70 WP (1 g/L). Rotate crops. Plant tolerant varieties. Avoid early planting in cool wet conditions."
    }
  ],
  chilli: [
    {
      crop: "Chilli (Pepper)", disease: "Anthracnose / Die Back (Colletotrichum capsici)", severity: "high", confidence: 0.86,
      advice: "Circular sunken tan-brown lesions on fruits and leaves with concentric rings. Spray Mancozeb 75 WP (2 g/L) or Carbendazim 50 WP (1 g/L). Harvest fruits timely to avoid rot spread. Use hot-water seed treatment (50°C, 30 min)."
    },
    {
      crop: "Chilli (Pepper)", disease: "Chilli Leaf Curl Virus (ChLCV)", severity: "high", confidence: 0.88,
      advice: "Severe upward leaf curling, stunted growth, reduced fruit set. Whitefly vector — apply Imidacloprid 70 WG (0.3 g/L). Remove and burn infected plants. Install silver reflective mulch to deter whiteflies. Use virus-resistant varieties."
    }
  ],
  banana: [
    {
      crop: "Banana", disease: "Black Sigatoka (Mycosphaerella fijiensis)", severity: "high", confidence: 0.85,
      advice: "Yellow streaks on leaves progressing to dark necrotic patches. Spray Mancozeb 75 WP (2.5 g/L) alternating with Propiconazole 25 EC (0.5 ml/L) every 14 days. Remove infected leaves. Ensure proper field drainage."
    },
    {
      crop: "Banana", disease: "Panama Wilt / Fusarium Wilt (Fusarium oxysporum)", severity: "high", confidence: 0.88,
      advice: "Internal vascular browning, leaf yellowing from outer to inner. No chemical cure — remove and destroy infected plants and root system. Plant in pathogen-free land. Use resistant Cavendish varieties. Soil solarization before replanting."
    }
  ],
  onion: [
    {
      crop: "Onion", disease: "Purple Blotch (Alternaria porri)", severity: "medium", confidence: 0.82,
      advice: "Small white spots with purple center on leaves. Spray Mancozeb 75 WP (2.5 g/L) or Iprodione 50 WP (1 g/L) every 10 days. Avoid overhead irrigation. Maintain proper plant spacing for air circulation."
    }
  ],
  mango: [
    {
      crop: "Mango", disease: "Anthracnose (Colletotrichum gloeosporioides)", severity: "high", confidence: 0.87,
      advice: "Dark sunken lesions on fruits and leaves. Spray Carbendazim 50 WP (1 g/L) or Mancozeb 75 WP (2.5 g/L) at flower bud emergence. Post-harvest hot water dip (52°C, 5 min) prevents fruit rot."
    },
    {
      crop: "Mango", disease: "Powdery Mildew (Oidium mangiferae)", severity: "medium", confidence: 0.84,
      advice: "White powdery coating on new leaves and flowers. Spray Sulfur 80 WP (3 g/L) or Hexaconazole 5 SC (1 ml/L) at flower bud break. Two sprays at 15-day interval. Avoid water stress during flowering."
    }
  ],
  brinjal: [
    {
      crop: "Brinjal (Eggplant)", disease: "Phomopsis Blight (Phomopsis vexans)", severity: "medium", confidence: 0.80,
      advice: "Circular brown spots on leaves and elongated lesions on fruits. Spray Mancozeb 75 WP (2.5 g/L) or Carbendazim 50 WP (1 g/L) every 10 days. Remove infected fruits. Use disease-free seeds. Practice crop rotation."
    }
  ],
  cattle: [
    {
      crop: "Cattle (Livestock)", disease: "Foot and Mouth Disease (FMD)", severity: "high", confidence: 0.91,
      advice: "Blisters/vesicles on mouth, feet, teats with excessive salivation. QUARANTINE immediately — FMD is highly contagious. Wash lesions with 1:1000 KMnO4 solution. Contact veterinarian immediately for antibiotic cover (secondary bacterial infections). Annual FMD vaccination mandatory."
    },
    {
      crop: "Cattle (Livestock)", disease: "Lumpy Skin Disease (Capripoxvirus)", severity: "high", confidence: 0.89,
      advice: "Multiple skin nodules (2-5 cm) across body, fever, nasal discharge. Quarantine affected herd immediately. Apply LSD vaccine to non-infected animals. Antiseptic wound dressing on nodules. Control biting insects (vectors). Notify local animal husbandry department."
    }
  ]
};

// ── Keyword → crop key mapping ───────────────────────────────────────────────
const CROP_KEYWORD_MAP = {
  tomato: "tomato", tamatar: "tomato",
  rice: "rice", paddy: "rice", dhan: "rice", bhat: "rice", bhaat: "rice",
  wheat: "wheat", gehun: "wheat", gehu: "wheat",
  maize: "maize", corn: "maize", makka: "maize",
  cotton: "cotton", kapas: "cotton",
  sugarcane: "sugarcane", ganna: "sugarcane",
  potato: "potato", aloo: "potato", alu: "potato",
  groundnut: "groundnut", peanut: "groundnut", moongfali: "groundnut",
  soybean: "soybean",
  chilli: "chilli", pepper: "chilli", mirch: "chilli",
  banana: "banana", kela: "banana",
  onion: "onion", pyaj: "onion", kanda: "onion",
  mango: "mango", aam: "mango",
  brinjal: "brinjal", eggplant: "brinjal", baingan: "brinjal",
  cattle: "cattle", cow: "cattle", buffalo: "cattle", livestock: "cattle",
  goat: "cattle", sheep: "cattle"
};

/**
 * Smart local fallback — uses crop hint to return the CORRECT crop's disease.
 * NEVER defaults to Tomato for non-Tomato crops.
 * Also tries basic image filename analysis as secondary hint.
 */
function smartLocalFallback(cropHint, imageFilename) {
  const cropLower    = (cropHint || "").toLowerCase();
  const fileLower    = (imageFilename || "").toLowerCase();
  const searchText   = cropLower + " " + fileLower;

  // Try to find a matching crop key from keywords
  let cropKey = null;
  for (const [keyword, key] of Object.entries(CROP_KEYWORD_MAP)) {
    if (searchText.includes(keyword)) {
      cropKey = key;
      break;
    }
  }

  if (cropKey && DISEASE_DATABASE[cropKey]) {
    const diseases = DISEASE_DATABASE[cropKey];
    // Return the most common disease (index 0), varied by image size hint
    const idx = 0; // first disease = most common for that crop
    return diseases[idx];
  }

  // Absolute fallback: if truly no hint at all, return a generic message
  // instead of defaulting to Tomato
  return {
    crop: cropHint || "Unknown Crop",
    disease: "Disease Detection — AI API Required",
    severity: "medium",
    confidence: 0.0,
    advice: `Unable to analyze the actual image without an AI Vision API. To get accurate disease detection:\n\n1. Add GEMINI_API_KEY to your .env file\n2. Get a FREE key at: https://aistudio.google.com/app/apikey\n3. Or select your crop from the dropdown for a crop-specific reference\n\nIf you selected "${cropHint || 'a crop'}" but see different results, please ensure the API key is configured.`
  };
}

// ── Gemini Vision API call ───────────────────────────────────────────────────
async function analyzeWithGemini(imagePath, imageBuffer, mimetype, cropHint, apiKey) {
  const base64Image = imageBuffer.toString("base64");

  const prompt = `You are an expert Agricultural Plant Pathologist and Veterinary Disease Specialist for Indian farming.

CRITICAL INSTRUCTION: Analyze the ACTUAL image provided. Look at the real pixels.
- Do NOT assume the crop from the hint alone
- If the image shows rice plants but hint says tomato → report RICE disease
- Identify the ACTUAL crop/animal visible in the image
- Detect disease from ACTUAL visual symptoms

Farmer's crop hint: "${cropHint || 'Not specified - identify from image'}"

Analyze and provide:
1. What crop/plant/animal you actually see in the image
2. The disease present (with scientific name) or confirm it's healthy
3. Severity: low/medium/high
4. Confidence: 0.0-1.0 based on image clarity
5. Precise treatment advice with exact chemical names and dosages for Indian farmers
6. Organic/biological alternatives
7. Resistant variety recommendations

Cover ALL crops: Tomato, Rice, Wheat, Maize, Cotton, Sugarcane, Potato, Groundnut, Soybean, Chilli, Banana, Onion, Mango, and all livestock.

Respond ONLY with valid JSON (no markdown, no text outside JSON):
{
  "crop": "Exact crop/animal name seen in image",
  "disease": "Disease name (Scientific name) or Healthy",
  "severity": "low|medium|high",
  "confidence": 0.90,
  "advice": "Detailed treatment with chemical names, exact dosages (e.g., Mancozeb 75 WP at 2 g/L), timing, organic alternatives, and preventive measures.",
  "image_analysis": "Brief: what you actually see in this image",
  "gemini_powered": true
}`;

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: prompt },
            { inline_data: { mime_type: mimetype, data: base64Image } }
          ]
        }],
        generationConfig: {
          temperature: 0.05,
          topK: 16,
          topP: 0.95,
          maxOutputTokens: 1500,
          responseMimeType: "application/json"
        },
        safetySettings: [
          { category: "HARM_CATEGORY_HARASSMENT",       threshold: "BLOCK_NONE" },
          { category: "HARM_CATEGORY_HATE_SPEECH",      threshold: "BLOCK_NONE" },
          { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
          { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" }
        ]
      })
    }
  );

  const data = await response.json();
  if (!response.ok) {
    console.error("[Gemini] HTTP error:", response.status, JSON.stringify(data).substring(0, 300));
    return null;
  }

  let raw = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!raw) return null;

  // Strip markdown if present
  if (raw.includes("```")) {
    const parts = raw.split("```");
    raw = parts[1] || parts[0];
    if (raw.startsWith("json")) raw = raw.slice(4);
    raw = raw.trim();
  }

  const parsed = JSON.parse(raw.trim());
  if (!parsed.crop || !parsed.disease) return null;

  const severity = ["low","medium","high"].includes(parsed.severity) ? parsed.severity : "medium";
  console.log(`[Gemini] ✅ ${parsed.crop} → ${parsed.disease} (${(parsed.confidence || 0.88)*100|0}%)`);

  return {
    crop:           parsed.crop,
    disease:        parsed.disease,
    severity,
    confidence:     Math.min(1, Math.max(0, parseFloat(parsed.confidence) || 0.88)),
    advice:         parsed.advice || "",
    image_analysis: parsed.image_analysis || "",
    gemini_powered: true,
    ai_model:       "Google Gemini 1.5 Flash"
  };
}

// ── POST /api/crop-disease/analyze ──────────────────────────────────────────
router.post("/analyze", protect, upload.single("image"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "No image uploaded" });
    }

    const { crop } = req.body;
    const imagePath = req.file.path;
    const imageUrl  = `/uploads/${path.basename(imagePath)}`;
    const imageBuffer = fs.readFileSync(imagePath);

    // ── TIER 1: Gemini Vision API ────────────────────────────────────────
    const geminiKey = (
      req.headers["x-gemini-key"] ||
      process.env.GEMINI_API_KEY  || ""
    ).trim();

    if (geminiKey && geminiKey.length > 10 && !geminiKey.startsWith("YOUR_")) {
      try {
        const geminiResult = await analyzeWithGemini(
          imagePath, imageBuffer, req.file.mimetype, crop, geminiKey
        );
        if (geminiResult) {
          return res.json({ success: true, imageUrl, ...geminiResult });
        }
      } catch (err) {
        console.error("[Gemini] Error:", err.message);
      }
    } else {
      console.log("[cropDisease] No Gemini key. Skipping Gemini API.");
    }

    // ── TIER 2: Smart local database fallback (correct crop, NOT Tomato default) ──
    console.log(`[cropDisease] Using smart local fallback for crop="${crop || 'unknown'}"`);
    const localResult = smartLocalFallback(crop, req.file.originalname);

    return res.json({
      success:       true,
      imageUrl,
      gemini_powered: false,
      ai_model:      geminiKey
        ? "Local Database (Gemini returned no result)"
        : "Local Database (Configure GEMINI_API_KEY for AI analysis)",
      ...localResult
    });

  } catch (err) {
    console.error("[cropDisease] Error:", err);
    return res.status(500).json({ success: false, message: "Error analyzing image" });
  }
});

export default router;
