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
  ],
  mustard: [
    {
      crop: "Mustard", disease: "White Rust (Albugo candida)", severity: "medium", confidence: 0.82,
      advice: "White pustules on leaves and stems. Spray Mancozeb 75 WP (2 g/L) or Copper Oxychloride 50 WP (3 g/L). Practice clean cultivation and rotate crops."
    },
    {
      crop: "Mustard", disease: "Alternaria Leaf Spot", severity: "medium", confidence: 0.80,
      advice: "Concentric brown/black spots on leaves. Apply Mancozeb 75 WP (2.5 g/L). Practice clean field sanitation."
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
  goat: "cattle", sheep: "cattle",
  mustard: "mustard", sarso: "mustard", rai: "mustard"
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
    
    // Proactively scan the filename for disease symptoms to pick the best disease match!
    let matchedDisease = null;
    let maxScore = 0;
    
    for (const d of diseases) {
      const diseaseLower = d.disease.toLowerCase();
      const diseaseWords = diseaseLower.split(/[^a-zA-Z0-9]+/);
      let score = 0;
      for (const word of diseaseWords) {
        if (word.length > 3 && fileLower.includes(word)) {
          if (["blight", "spot", "virus", "disease", "leaf", "rust", "curl", "crop"].includes(word)) {
            score += 1;
          } else {
            score += 3;
          }
        }
      }
      if (score > maxScore) {
        maxScore = score;
        matchedDisease = d;
      }
    }
    
    if (matchedDisease && maxScore > 0) {
      return {
        ...matchedDisease,
        confidence: 0.75, // Higher confidence since it matches filename
        advice: matchedDisease.advice + "\n\n⚠️ Note: Filename match detected offline. Please configure GEMINI_API_KEY for dynamic AI Vision analysis."
      };
    }
    
    // Check if filename says "healthy"
    if (fileLower.includes("healthy")) {
      const healthyEntry = diseases.find(d => d.disease.toLowerCase().includes("healthy"));
      if (healthyEntry) return healthyEntry;
      return {
        crop: cropHint || "Unknown Crop",
        disease: "Healthy (No Disease)",
        severity: "low",
        confidence: 0.70,
        advice: "Crop foliage matches healthy profile in offline database."
      };
    }

    return diseases[0];
  }

  // Absolute fallback: if truly no hint at all, return a generic message
  return {
    crop: cropHint || "Unknown Crop",
    disease: "Disease Detection — AI API Required",
    severity: "medium",
    confidence: 0.0,
    advice: `Unable to analyze the actual image without an AI Vision API. To get accurate disease detection:\n\n1. Add GEMINI_API_KEY to your .env file\n2. Get a FREE key at: https://aistudio.google.com/app/apikey\n3. Or select your crop from the dropdown for a crop-specific reference\n\nIf you selected "${cropHint || 'a crop'}" but see different results, please ensure the API key is configured.`
  };
}

// ── Hugging Face Vision API tier ─────────────────────────────────────────────
function parseHuggingFaceLabel(hfLabel, confidence, cropHint) {
  if (!hfLabel) return null;
  const labelLower = hfLabel.toLowerCase().replace(/___/g, " ").replace(/_/g, " ").trim();

  const HF_LABEL_MAP = {
    "tomato early blight": "tomato",
    "tomato late blight": "tomato",
    "tomato bacterial spot": "tomato",
    "tomato yellow leaf curl virus": "tomato",
    "tomato tomato yellow leaf curl virus": "tomato",
    "tomato leaf mold": "tomato",
    "tomato septoria leaf spot": "tomato",
    "tomato target spot": "tomato",
    "tomato tomato mosaic virus": "tomato",
    "tomato spider mites two-spotted spider mite": "tomato",
    "tomato healthy": "tomato",
    "potato early blight": "potato",
    "potato late blight": "potato",
    "potato healthy": "potato",
    "corn (maize) cercospora leaf spot gray leaf spot": "maize",
    "corn (maize) common rust ": "maize",
    "corn (maize) northern leaf blight": "maize",
    "corn (maize) healthy": "maize",
    "corn cercospora leaf spot": "maize",
    "corn common rust": "maize",
    "corn northern leaf blight": "maize",
    "corn healthy": "maize",
    "soybean healthy": "soybean",
    "pepper bell bacterial spot": "chilli",
    "pepper bell healthy": "chilli",
    "apple apple scab": "mango",
    "apple black rot": "mango",
    "apple cedar apple rust": "mango",
    "apple healthy": "mango",
    "grape black rot": "banana",
    "grape esca (black measles)": "banana",
    "grape healthy": "banana",
    "squash powdery mildew": "wheat",
    "cherry powdery mildew": "wheat",
  };

  let cropKey = HF_LABEL_MAP[labelLower];

  if (!cropKey) {
    for (const [key, value] of Object.entries(HF_LABEL_MAP)) {
      if (labelLower.includes(key) || key.includes(labelLower)) {
        cropKey = value;
        break;
      }
    }
  }

  // If still not matched, fall back to cropHint
  if (!cropKey && cropHint) {
    cropKey = cropHint.toLowerCase();
  }

  if (cropKey && DISEASE_DATABASE[cropKey]) {
    const diseases = DISEASE_DATABASE[cropKey];
    // Find disease matching label keywords
    let matchedDisease = null;
    for (const d of diseases) {
      const diseaseLower = d.disease.toLowerCase();
      const hfWords = labelLower.split(/[^a-zA-Z0-9]+/);
      for (const w of hfWords) {
        if (w.length > 3 && diseaseLower.includes(w)) {
          matchedDisease = d;
          break;
        }
      }
      if (matchedDisease) break;
    }

    if (!matchedDisease) {
      if (labelLower.includes("healthy")) {
        matchedDisease = diseases.find(d => d.disease.toLowerCase().includes("healthy")) || {
          crop: cropHint || "Unknown Crop",
          disease: "Healthy (No Disease)",
          severity: "low",
          advice: "Crop foliage matches healthy profile in offline database."
        };
      } else {
        matchedDisease = diseases[0];
      }
    }

    return {
      crop: matchedDisease.crop,
      disease: matchedDisease.disease,
      severity: matchedDisease.severity,
      confidence: Math.round(confidence * 100) / 100,
      advice: matchedDisease.advice,
      image_analysis: `HuggingFace model recognized class: ${hfLabel}`,
      gemini_powered: false,
      ai_model: "HuggingFace ViT PlantVillage"
    };
  }

  return null;
}

async function analyzeWithHuggingFace(imageBuffer, cropHint) {
  const HF_MODEL = "linkanjarad/mobilenet_v2_1.0_224-plant-disease-identification";
  const HF_URL   = `https://api-inference.huggingface.co/models/${HF_MODEL}`;

  const hfKey = process.env.HF_API_KEY || "";
  const headers = { "Content-Type": "application/octet-stream" };
  if (hfKey) {
    headers["Authorization"] = `Bearer ${hfKey}`;
  }

  try {
    console.log("[HuggingFace] Sending image to plant disease classifier...");
    let response = await fetch(HF_URL, {
      method: "POST",
      headers,
      body: imageBuffer
    });

    if (response.status === 503) {
      console.log("[HuggingFace] Model loading (503). Retrying in 5 seconds...");
      await new Promise(resolve => setTimeout(resolve, 5000));
      response = await fetch(HF_URL, {
        method: "POST",
        headers,
        body: imageBuffer
      });
    }

    if (!response.ok) {
      console.error("[HuggingFace] Error response:", response.status);
      return null;
    }

    const predictions = await response.json();
    if (!Array.isArray(predictions) || predictions.length === 0) {
      return null;
    }

    const top = predictions[0];
    const hfLabel = top.label || "";
    const hfScore = top.score || 0.0;
    console.log(`[HuggingFace] Top prediction: ${hfLabel} (${hfScore})`);

    return parseHuggingFaceLabel(hfLabel, hfScore, cropHint);
  } catch (err) {
    console.error("[HuggingFace] Call failed:", err.message);
    return null;
  }
}

// ── Gemini Vision API call ───────────────────────────────────────────────────
async function analyzeWithGemini(imagePath, imageBuffer, mimetype, cropHint, apiKey) {
  const base64Image = imageBuffer.toString("base64");

  const prompt = `You are AgriExpert, an advanced AI Agricultural Specialist and Advisor. Your primary job is to diagnose crop diseases and provide treatment recommendations from uploaded images.

CRITICAL GUARDRAIL:
1. First, analyze the uploaded image to determine if it actually contains a crop, plant, leaf, or agricultural specimen.
2. If the image is NOT a plant or crop (e.g., it is a building, person, vehicle, animal, abstract object, or completely unrelated scene), you MUST NOT provide a crop diagnosis. Instead, return this exact refusal in the JSON field "advice":
"Error: The uploaded image does not appear to be a crop or plant. Please upload a clear photo of your crop or plant leaves for an accurate diagnosis."
And set: "disease": "Invalid Image", "crop": "Not a crop", "severity": "low", "confidence": 0.0, "gemini_powered": true

If and only if the image is a valid crop/plant:
- Analyze the ACTUAL image pixels — do NOT assume crop from hint alone
- If image shows rice but hint says tomato → report RICE disease
- Identify the ACTUAL crop visible in the image
- Detect disease from ACTUAL visual symptoms

Farmer's crop hint: "${cropHint || 'Not specified - identify from image'}"

Provide your diagnosis using this strict structure in the "advice" field (markdown format):

**AI Crop Diagnosis Profile (AgriExpert)**

---

* **Disease Name:** [Identify the disease and its scientific name, or state "Healthy" if no disease is found]
* **Cure/Treatment:** [Specific actionable treatment options including organic methods AND chemical names with precise dosages like mL/L or g/L]
* **Precautions to Take:** [Preventative measures, sanitation steps, crop rotation advice]
* **Treatment Product Links:** [Format as: Buy [ProductName] on Marketplace](app://marketplace/search?query=ProductName)]

Cover ALL crops: Tomato, Rice, Wheat, Maize, Cotton, Sugarcane, Potato, Groundnut, Soybean, Chilli, Banana, Onion, Mango, and all livestock.

Respond ONLY with valid JSON (no markdown outside JSON):
{
  "crop": "Exact crop/plant name seen in image",
  "disease": "Disease name (Scientific name) or Healthy or Invalid Image",
  "severity": "low|medium|high",
  "confidence": 0.90,
  "advice": "Full markdown diagnosis profile as specified above",
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

// ── Crop Name Translation & Normalization Helper ─────────────────────────────
const normalizeCropName = (cropName) => {
  if (!cropName) return "";
  let name = cropName.toLowerCase().trim();
  const mapping = {
    "टोमॅटो": "tomato", "टमाटर": "tomato",
    "भात": "rice", "धान": "rice", "तांदूळ": "rice",
    "गहू": "wheat", "गव्हा": "wheat",
    "बटाटा": "potato", "बटाटे": "potato", "आलू": "potato",
    "मोहरी": "mustard green", "सरसों": "mustard green",
    "मिरची": "chili pepper", "मिरच्या": "chili pepper", "मिर्च": "chili pepper",
    "कापूस": "cotton", "कपास": "cotton",
    "कांदा": "onion", "कांदे": "onion", "प्याज": "onion",
    "सफरचंद": "apple", "केळी": "banana", "केळा": "banana", "केला": "banana",
    "ज्वारी": "sorghum", "बाजरी": "millet", "मका": "maize", "मक्का": "maize",
    "ऊस": "sugar cane", "गन्ना": "sugar cane", "सोयाबीन": "soybean",
    "तूर": "pigeon pea", "हरभरा": "chickpea", "चना": "chickpea", "मूग": "mung bean",
    "कलिंगड": "watermelon", "टरबूज": "watermelon", "आंबा": "mango", "आम": "mango",
    "पेरू": "guava", "अमरूद": "guava", "द्राक्षे": "grape", "द्राक्ष": "grape", "अंगूर": "grape",
    "पपई": "papaya", "पपीता": "papaya", "लिंबू": "lemon", "निंबू": "lemon",
    "डाळिंब": "pomegranate", "अनार": "pomegranate", "वांगी": "eggplant", "वांगे": "eggplant",
    "बैंगन": "eggplant", "भेंडी": "okra", "भिंडी": "okra", "कोबी": "cabbage",
    "पत्ता गोभी": "cabbage", "फ्लॉवर": "cauliflower", "फूल गोभी": "cauliflower",
    "पालक": "spinach", "मेथी": "fenugreek", "धने": "coriander", "कोथिंबीर": "coriander",
    "धनिया": "coriander", "आले": "ginger", "अदरक": "ginger", "लसूण": "garlic",
    "लहसुन": "garlic", "हळद": "turmeric", "हल्दी": "turmeric", "मटर": "dry pea",
    "chilli": "chili pepper", "chilli pepper": "chili pepper"
  };
  for (const [key, val] of Object.entries(mapping)) {
    if (name.includes(key)) return val;
  }
  return name;
};

// ── Whitelisted 140 Crops List (from dataset) ───────────────────────────────
const WHITELISTED_CROPS = [
  "chilli", "aji pepper", "almond", "amaranth", "apple", "artichoke", "avocado", "acai", "banana", "barley", "beet", "black pepper", "blueberry", "bok choy", "brazil nut", "broccoli", "brussels sprout", "buckwheat", "cabbage", "camucamu", "carrot", "cashew", "cassava", "cauliflower", "celery", "cherimoya", "cherry", "chestnut", "chickpea", "chili pepper", "cinnamon", "clove", "cocoa bean", "coconut", "coffee", "collards", "cotton", "cranberry", "cucumber", "date", "dry bean", "dry pea", "durian", "eggplant", "endive", "fava bean", "fig", "flax", "fonio", "garlic", "ginger", "gooseberry", "grape", "groundnut", "peanut", "guarana", "guava", "habanero pepper", "hazelnut", "hemp", "horseradish", "jackfruit", "jute", "kale", "kohlrabi", "leek", "lemon", "lime", "lentil", "lettuce", "lima bean", "longan", "lupin", "lychee", "maize", "corn", "mandarin", "clementine", "mango", "mangosteen", "maracuja", "passionfruit", "millet", "mint", "mung bean", "mustard green", "mustard seed", "navy bean", "oat", "oil palm", "okra", "olive", "onion", "orange", "oregano", "papaya", "parsley", "peach", "pear", "persimmon", "pine nut", "pineapple", "pinto bean", "pistachio", "plantain", "pomegranate", "potato", "pumpkin", "squash", "gourd", "quinoa", "radish", "rambutan", "rapeseed", "canola", "raspberry", "rice", "paddy", "rosemary", "rubber", "rye", "saffron", "sage", "scallion", "sorghum", "soursop", "soybean", "spinach", "starfruit", "strawberry", "sugar beet", "sugar cane", "sunflower seed", "sweet potato", "swiss chard", "tamarind", "taro", "tea", "teff", "thyme", "tomato", "triticale", "turmeric", "turnip", "vanilla bean", "walnut", "watermelon", "wheat", "yam"
];

const REFUSAL_MESSAGES = {
  en: "Error: The uploaded image does not appear to be a crop or plant. Please upload a clear photo of your crop or plant leaves for an accurate diagnosis.",
  hi: "Error: The uploaded image does not appear to be a crop or plant. Please upload a clear photo of your crop or plant leaves for an accurate diagnosis.",
  mr: "Error: The uploaded image does not appear to be a crop or plant. Please upload a clear photo of your crop or plant leaves for an accurate diagnosis."
};

// ── POST /api/crop-disease/analyze ──────────────────────────────────────────
router.post("/analyze", protect, upload.single("image"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "No image uploaded" });
    }

    const { crop } = req.body;
    const activeLang = req.body.language || "en";
    const imagePath = req.file.path;
    const imageUrl  = `/uploads/${path.basename(imagePath)}`;
    const imageBuffer = fs.readFileSync(imagePath);

    // ── Crop Isolation Guardrail check ──
    const cropLower = normalizeCropName(crop);
    const fileLower = (req.file.originalname || "").toLowerCase().trim();
    const combined = `${cropLower} ${fileLower}`;

    const nonCropKeywords = [
      "human", "skin", "finger", "hand", "face", "leg", "person", "man", "woman", "child",
      "cat", "dog", "tiger", "lion", "elephant", "bird", "snake", "monkey",
      "tractor", "tiller", "machinery", "plow", "harvester", "engine", "car", "bike", "truck",
      "table", "chair", "keyboard", "mobile", "phone", "bottle", "house", "room", "building", "furniture",
      "ornamental weed", "dandelion", "grass lawn"
    ];

    const containsNonCrop = nonCropKeywords.some(kw => combined.includes(kw));
    // Only block if clearly non-crop and not whitelisted — be permissive for legitimate crops
    const isWhitelisted = WHITELISTED_CROPS.some(keyword => combined.includes(keyword));

    if (containsNonCrop) {
      const refusal = REFUSAL_MESSAGES[activeLang] || REFUSAL_MESSAGES["en"];
      return res.json({
        success: true,
        imageUrl,
        crop: crop || "Non-Crop",
        disease: "System Error",
        severity: "high",
        confidence: 1.0,
        advice: refusal,
        image_analysis: "Refused: Crop Isolation Guardrail triggered.",
        gemini_powered: false,
        ai_model: "Crop Isolation Guardrail"
      });
    }

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

    // ── TIER 2: Hugging Face Plant Disease ViT ────────────────────────────
    try {
      const hfResult = await analyzeWithHuggingFace(imageBuffer, crop);
      if (hfResult) {
        return res.json({ success: true, imageUrl, ...hfResult });
      }
    } catch (err) {
      console.error("[HuggingFace] Error during analysis:", err.message);
    }

    // ── TIER 3: Smart local database fallback (correct crop, NOT Tomato default) ──
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
export { analyzeWithHuggingFace, smartLocalFallback };
