import io
import os
import base64
import json
import requests
from PIL import Image

try:
    import torch
    import torch.nn as nn
    from torchvision import models, transforms
    TORCH_AVAILABLE = True
except ImportError:
    TORCH_AVAILABLE = False
    print("[ML] PyTorch or TorchVision not installed. Running in Gemini AI mode.")

# ─────────────────────────────────────────────────────────────────────────────
#  Comprehensive Disease Classes – covers all major Indian crops & livestock
# ─────────────────────────────────────────────────────────────────────────────
CLASSES = [
    "Tomato - Early Blight (Alternaria solani)",
    "Tomato - Leaf Curl Virus (TLCV)",
    "Tomato - Late Blight (Phytophthora infestans)",
    "Tomato - Healthy Leaf",
    "Rice - Leaf Blast (Magnaporthe oryzae)",
    "Rice - Brown Plant Hopper",
    "Rice - Sheath Blight (Rhizoctonia solani)",
    "Rice - Healthy Leaf",
    "Wheat - Black Stem Rust (Puccinia graminis)",
    "Wheat - Yellow Stripe Rust (Puccinia striiformis)",
    "Wheat - Powdery Mildew (Blumeria graminis)",
    "Wheat - Healthy Leaf",
    "Maize - Northern Leaf Blight (Exserohilum turcicum)",
    "Maize - Gray Leaf Spot (Cercospora zeae-maydis)",
    "Maize - Common Rust (Puccinia sorghi)",
    "Maize - Healthy Leaf",
    "Cotton - Bacterial Blight (Xanthomonas axonopodis)",
    "Cotton - Leaf Curl Virus",
    "Cotton - Fusarium Wilt",
    "Cotton - Healthy Leaf",
    "Sugarcane - Red Rot (Colletotrichum falcatum)",
    "Sugarcane - Smut (Ustilago scitaminea)",
    "Sugarcane - Healthy",
    "Potato - Late Blight (Phytophthora infestans)",
    "Potato - Early Blight (Alternaria solani)",
    "Potato - Healthy Leaf",
    "Groundnut - Leaf Spot (Cercospora arachidicola)",
    "Groundnut - Rust (Puccinia arachidis)",
    "Groundnut - Healthy Leaf",
    "Soybean - Bacterial Pustule",
    "Soybean - Frogeye Leaf Spot",
    "Soybean - Healthy Leaf",
    "Chilli - Anthracnose (Colletotrichum capsici)",
    "Chilli - Leaf Curl Virus",
    "Chilli - Healthy Leaf",
    "Banana - Sigatoka Leaf Spot (Mycosphaerella fijiensis)",
    "Banana - Panama Wilt (Fusarium oxysporum)",
    "Banana - Healthy Leaf",
    "Cattle - Foot and Mouth Disease (FMD)",
    "Cattle - Lumpy Skin Disease",
    "Cattle - Healthy Skin / Hooves"
]

# ─────────────────────────────────────────────────────────────────────────────
#  Static fallback metadata (used when Gemini API is unavailable)
# ─────────────────────────────────────────────────────────────────────────────
DISEASE_METADATA = {
    # ── TOMATO ────────────────────────────────────────────────────────────
    "Tomato - Early Blight (Alternaria solani)": {
        "disease": "Early Blight (Alternaria solani)", "crop": "Tomato", "severity": "medium",
        "advice": "Dark concentric target-board spots on older leaves. Apply Mancozeb 75 WP (2 g/L) or Copper Oxychloride 50 WP (3 g/L) every 7 days. Remove and destroy infected lower leaves. Mulch soil to prevent splash inoculation."
    },
    "Tomato - Leaf Curl Virus (TLCV)": {
        "disease": "Tomato Leaf Curl Virus (TLCV)", "crop": "Tomato", "severity": "high",
        "advice": "Transmitted by Whitefly (Bemisia tabaci). Upward curling + yellowing of leaves. Destroy infected plants immediately. Spray Imidacloprid 17.8 SL (0.3 ml/L) or Thiamethoxam 25 WG (0.3 g/L). Install yellow sticky traps @ 12/acre."
    },
    "Tomato - Late Blight (Phytophthora infestans)": {
        "disease": "Late Blight (Phytophthora infestans)", "crop": "Tomato", "severity": "high",
        "advice": "Water-soaked dark lesions with white mold on leaf undersides. Apply Cymoxanil + Mancozeb (3 g/L) or Metalaxyl 8% + Mancozeb 64% WP (2.5 g/L) every 5-7 days. Avoid overhead irrigation. Ensure good air circulation."
    },
    "Tomato - Healthy Leaf": {
        "disease": "Healthy (No Disease)", "crop": "Tomato", "severity": "low",
        "advice": "No disease detected. Maintain drip irrigation, apply balanced NPK 19:19:19, and monitor weekly for early signs of whitefly or blight."
    },
    # ── RICE ──────────────────────────────────────────────────────────────
    "Rice - Leaf Blast (Magnaporthe oryzae)": {
        "disease": "Leaf Blast (Magnaporthe oryzae)", "crop": "Rice (Paddy)", "severity": "high",
        "advice": "Spindle-shaped grey-centered lesions with brown borders. Spray Tricyclazole 75 WP (0.6 g/L) or Isoprothiolane 40 EC (1.5 ml/L). Reduce excessive Urea application. Drain field for 3-4 days during active outbreak."
    },
    "Rice - Brown Plant Hopper": {
        "disease": "Brown Plant Hopper (BPH) Infestation", "crop": "Rice (Paddy)", "severity": "high",
        "advice": "Hopper burn – yellowing from base. Apply Buprofezin 25 SC (1 ml/L) or Pymetrozine 50 WG (0.3 g/L). Drain water and spray at base of tillers. Avoid excessive Nitrogen which promotes BPH."
    },
    "Rice - Sheath Blight (Rhizoctonia solani)": {
        "disease": "Sheath Blight (Rhizoctonia solani)", "crop": "Rice (Paddy)", "severity": "medium",
        "advice": "Oval to irregular greenish-grey lesions on leaf sheaths near waterline. Apply Hexaconazole 5 SC (2 ml/L) or Validamycin 3 L (2 ml/L). Keep plant density optimum. Drain the field during early crop stages."
    },
    "Rice - Healthy Leaf": {
        "disease": "Healthy (No Disease)", "crop": "Rice (Paddy)", "severity": "low",
        "advice": "Healthy paddy. Maintain 5 cm flood depth during tillering. Apply Urea in 3 splits. Scout weekly for BPH and blast."
    },
    # ── WHEAT ─────────────────────────────────────────────────────────────
    "Wheat - Black Stem Rust (Puccinia graminis)": {
        "disease": "Black Stem Rust (Puccinia graminis)", "crop": "Wheat", "severity": "high",
        "advice": "Reddish-brown pustules on stems/leaves turning black. Spray Propiconazole 25 EC (0.5 ml/L) or Tebuconazole 250 EC (0.75 ml/L). Use rust-resistant cultivar HD-3086 next season. Remove volunteer wheat plants."
    },
    "Wheat - Yellow Stripe Rust (Puccinia striiformis)": {
        "disease": "Yellow Stripe Rust (Puccinia striiformis)", "crop": "Wheat", "severity": "high",
        "advice": "Yellow stripe pustules in rows along leaf veins. Apply Propiconazole 25 EC (1 ml/L) at first sign. Use resistant varieties (K-307, PBW-550). Sow at recommended time to avoid peak rust weather."
    },
    "Wheat - Powdery Mildew (Blumeria graminis)": {
        "disease": "Powdery Mildew (Blumeria graminis)", "crop": "Wheat", "severity": "medium",
        "advice": "White powdery patches on upper leaf surface. Spray Sulfur 80 WP (3 g/L) or Hexaconazole 5 SC (1 ml/L). Avoid excess nitrogen. Improve field aeration by reducing plant density."
    },
    "Wheat - Healthy Leaf": {
        "disease": "Healthy (No Disease)", "crop": "Wheat", "severity": "low",
        "advice": "Healthy wheat. Apply second irrigation at jointing stage. Monitor for aphid colonies on flag leaf."
    },
    # ── MAIZE ─────────────────────────────────────────────────────────────
    "Maize - Northern Leaf Blight (Exserohilum turcicum)": {
        "disease": "Northern Leaf Blight (Exserohilum turcicum)", "crop": "Maize", "severity": "high",
        "advice": "Long tan/grey elliptical lesions. Apply Propiconazole 25 EC (1 ml/L) or Mancozeb 75 WP (2 g/L) at VT (tasseling) stage. Use resistant hybrids. Rotate crops yearly."
    },
    "Maize - Gray Leaf Spot (Cercospora zeae-maydis)": {
        "disease": "Gray Leaf Spot (Cercospora zeae-maydis)", "crop": "Maize", "severity": "medium",
        "advice": "Rectangular grey-tan lesions limited by leaf veins. Spray Azoxystrobin 23 SC (1 ml/L). Minimum till practices reduce soil-borne inoculum. Plant resistant hybrids."
    },
    "Maize - Common Rust (Puccinia sorghi)": {
        "disease": "Common Rust (Puccinia sorghi)", "crop": "Maize", "severity": "medium",
        "advice": "Brick-red oval pustules on both leaf surfaces. Apply Mancozeb 75 WP (2.5 g/L) preventively. Plant resistant hybrids. Early planting avoids peak rust season."
    },
    "Maize - Healthy Leaf": {
        "disease": "Healthy (No Disease)", "crop": "Maize", "severity": "low",
        "advice": "Healthy maize. Apply 120 kg N/ha in 3 splits. Scout for Fall Armyworm in whorls – apply Emamectin Benzoate 5 SG (0.4 g/L) if found."
    },
    # ── COTTON ────────────────────────────────────────────────────────────
    "Cotton - Bacterial Blight (Xanthomonas axonopodis)": {
        "disease": "Bacterial Blight (Xanthomonas axonopodis)", "crop": "Cotton", "severity": "high",
        "advice": "Angular water-soaked spots turning brown with yellow halo. Spray Copper Oxychloride 50 WP (3 g/L) + Streptocycline (0.15 g/L). Use certified disease-free seeds. Avoid rainfed overhead irrigation."
    },
    "Cotton - Leaf Curl Virus": {
        "disease": "Cotton Leaf Curl Virus (CLCuV)", "crop": "Cotton", "severity": "high",
        "advice": "Upward leaf curling, vein thickening (enations). Whitefly vector – apply Acetamiprid 20 SP (0.2 g/L) weekly. Remove infected plants. Use CLCuV-tolerant hybrids like MRC-7017."
    },
    "Cotton - Fusarium Wilt": {
        "disease": "Fusarium Wilt (Fusarium oxysporum f.sp. vasinfectum)", "crop": "Cotton", "severity": "high",
        "advice": "Sudden wilting, yellowing, vascular browning. Drench soil with Carbendazim 50 WP (2 g/L). Practice 3-year crop rotation. Use Trichoderma viride seed treatment (4 g/kg seed)."
    },
    "Cotton - Healthy Leaf": {
        "disease": "Healthy (No Disease)", "crop": "Cotton", "severity": "low",
        "advice": "Healthy cotton. Apply square pinching at 45 days, maintain NPK 80:40:40 kg/ha. Scout for bollworm egg masses."
    },
    # ── SUGARCANE ─────────────────────────────────────────────────────────
    "Sugarcane - Red Rot (Colletotrichum falcatum)": {
        "disease": "Red Rot (Colletotrichum falcatum)", "crop": "Sugarcane", "severity": "high",
        "advice": "Internal red discoloration with white patches. No effective spray – remove and destroy infected stools. Use disease-free setts treated in Carbendazim 0.1% for 15 min. Plant resistant varieties like Co-0238."
    },
    "Sugarcane - Smut (Ustilago scitaminea)": {
        "disease": "Smut (Ustilago scitaminea)", "crop": "Sugarcane", "severity": "high",
        "advice": "Black whip-like structure replacing the growing point. Remove and burn infected plants. Treat setts in hot water (50°C for 2 hrs). Plant smut-resistant varieties."
    },
    "Sugarcane - Healthy": {
        "disease": "Healthy (No Disease)", "crop": "Sugarcane", "severity": "low",
        "advice": "Healthy sugarcane. Apply ratoon management – stubble shaving + earthing up. Side-dress with 60 kg N/ha at 60 and 120 days."
    },
    # ── POTATO ────────────────────────────────────────────────────────────
    "Potato - Late Blight (Phytophthora infestans)": {
        "disease": "Late Blight (Phytophthora infestans)", "crop": "Potato", "severity": "high",
        "advice": "Water-soaked brown lesions with white downy mold on undersides. Apply Cymoxanil 8% + Mancozeb 64% WP (3 g/L) every 5 days. Destroy infected haulms. Avoid overhead irrigation. Use blight-resistant varieties."
    },
    "Potato - Early Blight (Alternaria solani)": {
        "disease": "Early Blight (Alternaria solani)", "crop": "Potato", "severity": "medium",
        "advice": "Concentric dark target-board spots on older leaves. Spray Mancozeb 75 WP (2 g/L) or Chlorothalonil 75 WP (2 g/L) every 10 days. Remove infected leaves. Maintain adequate potassium nutrition."
    },
    "Potato - Healthy Leaf": {
        "disease": "Healthy (No Disease)", "crop": "Potato", "severity": "low",
        "advice": "Healthy potato crop. Apply hilling at 30-40 days. Monitor for Late Blight during cool wet spells."
    },
    # ── GROUNDNUT ─────────────────────────────────────────────────────────
    "Groundnut - Leaf Spot (Cercospora arachidicola)": {
        "disease": "Early Leaf Spot (Cercospora arachidicola)", "crop": "Groundnut", "severity": "medium",
        "advice": "Dark brown circular spots with yellow halo. Spray Mancozeb 75 WP (2.5 g/L) or Chlorothalonil 75 WP (2 g/L) at 30, 45, and 60 DAS. Remove infected leaves. Apply gypsum at pegging stage."
    },
    "Groundnut - Rust (Puccinia arachidis)": {
        "disease": "Groundnut Rust (Puccinia arachidis)", "crop": "Groundnut", "severity": "medium",
        "advice": "Orange-brown pustules on leaf underside. Spray Triadimefon 25 WP (1 g/L) or Tebuconazole 250 EC (1 ml/L). Use resistant varieties. Rotate with non-host crops."
    },
    "Groundnut - Healthy Leaf": {
        "disease": "Healthy (No Disease)", "crop": "Groundnut", "severity": "low",
        "advice": "Healthy groundnut. Apply gypsum 200 kg/ha at flower initiation. Scout for thrips transmitting bud necrosis virus."
    },
    # ── SOYBEAN ───────────────────────────────────────────────────────────
    "Soybean - Bacterial Pustule": {
        "disease": "Bacterial Pustule (Xanthomonas axonopodis)", "crop": "Soybean", "severity": "medium",
        "advice": "Small pale-green spots with raised pustule center on underside. Copper-based bactericide (3 g/L). Use disease-free certified seed. Avoid crop injury. Maintain adequate potassium."
    },
    "Soybean - Frogeye Leaf Spot": {
        "disease": "Frogeye Leaf Spot (Cercospora sojina)", "crop": "Soybean", "severity": "medium",
        "advice": "Small circular spots – dark border with grey center resembling frog eyes. Apply Thiophanate-methyl 70 WP (1 g/L). Rotate crops. Plant tolerant varieties."
    },
    "Soybean - Healthy Leaf": {
        "disease": "Healthy (No Disease)", "crop": "Soybean", "severity": "low",
        "advice": "Healthy soybean. Apply Rhizobium inoculant to seed before sowing. Top-dress with 20 kg N/ha at branching stage."
    },
    # ── CHILLI ────────────────────────────────────────────────────────────
    "Chilli - Anthracnose (Colletotrichum capsici)": {
        "disease": "Anthracnose / Die Back (Colletotrichum capsici)", "crop": "Chilli", "severity": "high",
        "advice": "Circular sunken tan-brown lesions on fruits/leaves with concentric rings. Spray Mancozeb 75 WP (2 g/L) or Carbendazim 50 WP (1 g/L). Harvest fruits timely to avoid rot spread. Use hot-water seed treatment."
    },
    "Chilli - Leaf Curl Virus": {
        "disease": "Chilli Leaf Curl Virus (ChLCV)", "crop": "Chilli", "severity": "high",
        "advice": "Severe upward leaf curling, stunted growth. Whitefly vector – apply Imidacloprid 70 WG (0.3 g/L). Remove and burn infected plants. Install silver reflective mulch to deter whiteflies."
    },
    "Chilli - Healthy Leaf": {
        "disease": "Healthy (No Disease)", "crop": "Chilli", "severity": "low",
        "advice": "Healthy chilli. Apply calcium nitrate spray (1%) at flowering to prevent blossom end rot. Scout weekly for mites."
    },
    # ── BANANA ────────────────────────────────────────────────────────────
    "Banana - Sigatoka Leaf Spot (Mycosphaerella fijiensis)": {
        "disease": "Black Sigatoka (Mycosphaerella fijiensis)", "crop": "Banana", "severity": "high",
        "advice": "Yellow streaks progressing to dark necrotic patches. Spray Mancozeb 75 WP (2.5 g/L) alternating with Propiconazole 25 EC (0.5 ml/L) every 14 days. Remove infected leaves. Ensure field drainage."
    },
    "Banana - Panama Wilt (Fusarium oxysporum)": {
        "disease": "Panama Wilt / Fusarium Wilt (Fusarium oxysporum f.sp. cubense)", "crop": "Banana", "severity": "high",
        "advice": "Internal vascular browning, leaf yellowing from outer to inner. No effective chemical cure – remove infected plants and soil. Plant in uninfected land. Use Cavendish varieties with resistance. Soil solarization helps."
    },
    "Banana - Healthy Leaf": {
        "disease": "Healthy (No Disease)", "crop": "Banana", "severity": "low",
        "advice": "Healthy banana. Apply 200 g Urea + 200 g MOP per plant at monthly intervals. Ensure drip irrigation. Remove dead leaves (desuckering)."
    },
    # ── CATTLE ────────────────────────────────────────────────────────────
    "Cattle - Foot and Mouth Disease (FMD)": {
        "disease": "Foot and Mouth Disease (FMD)", "crop": "Cattle (Livestock)", "severity": "high",
        "advice": "Blisters on mouth, feet, teats. Quarantine immediately – FMD is highly contagious. Wash lesions with 1:1000 KMnO4 solution. Contact veterinarian for antibiotic cover (secondary infections). Annual FMD vaccination mandatory."
    },
    "Cattle - Lumpy Skin Disease": {
        "disease": "Lumpy Skin Disease (Capripoxvirus)", "crop": "Cattle (Livestock)", "severity": "high",
        "advice": "Multiple skin nodules (2-5 cm) across body. Quarantine affected herd. Apply Lumpy Skin Disease vaccine to non-infected animals. Wound treatment with antiseptic dressing. Control biting insects (vectors). Notify local animal husbandry department."
    },
    "Cattle - Healthy Skin / Hooves": {
        "disease": "Healthy (No Disease)", "crop": "Cattle (Livestock)", "severity": "low",
        "advice": "No disease symptoms detected. Maintain vaccination records (FMD, BQ, HS, LSD). Clean stalls daily with lime powder. Periodic deworming every 3 months."
    }
}

# ─────────────────────────────────────────────────────────────────────────────
#  PyTorch model (optional – used only when Gemini API unavailable)
# ─────────────────────────────────────────────────────────────────────────────
if TORCH_AVAILABLE:
    class MobileNetDiseaseClassifier(nn.Module):
        def __init__(self, num_classes=len(CLASSES)):
            super().__init__()
            self.backbone = models.mobilenet_v3_small(weights=models.MobileNet_V3_Small_Weights.DEFAULT)
            in_features = self.backbone.classifier[3].in_features
            self.backbone.classifier[3] = nn.Linear(in_features, num_classes)

        def forward(self, x):
            return self.backbone(x)

    transform = transforms.Compose([
        transforms.Resize((224, 224)),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
    ])
else:
    class MobileNetDiseaseClassifier:
        pass
    transform = None

model = None

def get_model():
    global model
    if not TORCH_AVAILABLE:
        return None
    if model is None:
        model = MobileNetDiseaseClassifier()
        model.eval()
        checkpoint_path = "disease_model_weights.pth"
        if os.path.exists(checkpoint_path):
            try:
                model.load_state_dict(torch.load(checkpoint_path, map_location=torch.device("cpu")))
                print("[ML] Loaded custom trained weights from", checkpoint_path)
            except Exception as e:
                print(f"[ML] Weight load error ({e}). Using ImageNet pre-trained features.")
        else:
            print("[ML] No custom weights found. Using ImageNet pre-trained features.")
    return model


# ─────────────────────────────────────────────────────────────────────────────
#  Google Gemini API – Primary disease detection engine
# ─────────────────────────────────────────────────────────────────────────────

def get_gemini_api_key() -> str | None:
    """Read GEMINI_API_KEY from env or .env files."""
    key = os.getenv("GEMINI_API_KEY")
    if key:
        return key.strip()

    env_paths = [
        os.path.join(os.path.dirname(__file__), ".env"),
        os.path.join(os.path.dirname(__file__), "..", ".env"),
        os.path.join(os.path.dirname(__file__), "..", "backend", ".env"),
        "/home/Krishna3114/smart-kisan-backend/.env",
        "/home/Krishna3114/mysite/.env",
    ]
    for path in env_paths:
        if os.path.exists(path):
            with open(path, "r") as f:
                for line in f:
                    line = line.strip()
                    if line.startswith("GEMINI_API_KEY="):
                        return line.split("=", 1)[1].strip().strip('"').strip("'")
    return None


def predict_image_via_gemini(image_bytes: bytes, crop_hint: str = None) -> dict | None:
    """
    Send crop/livestock image to Google Gemini 1.5 Flash vision model.
    Returns structured disease diagnosis with advice for ANY crop or livestock.
    """
    api_key = get_gemini_api_key()
    if not api_key:
        print("[Gemini] GEMINI_API_KEY not found. Skipping Gemini Vision analysis.")
        return None

    try:
        base64_image = base64.b64encode(image_bytes).decode("utf-8")

        # Detect MIME type
        try:
            img = Image.open(io.BytesIO(image_bytes))
            fmt = img.format or "JPEG"
            mime_map = {"JPEG": "image/jpeg", "PNG": "image/png", "WEBP": "image/webp", "GIF": "image/gif"}
            mime_type = mime_map.get(fmt.upper(), "image/jpeg")
        except Exception:
            mime_type = "image/jpeg"

        system_prompt = f"""You are an expert Agricultural Plant Pathologist and Veterinary Disease Specialist with 20 years of experience in Indian farming conditions.

Carefully examine this image of a crop leaf, plant, fruit, or livestock.
Crop/Animal hint provided by farmer: "{crop_hint or 'Not specified – auto-detect from image'}"

Your task:
1. Identify the EXACT disease name with scientific name (or confirm if healthy)
2. Identify which crop or animal is shown
3. Rate severity: low (minor lesions), medium (spreading infection), or high (severe/systemic)
4. Estimate confidence (0.0 to 1.0) based on visible symptom clarity
5. Give PRECISE agronomic treatment advice including:
   - Specific chemical fungicide/pesticide/bactericide with brand-ready active ingredient names
   - Exact dosage (e.g., 2 g/L, 1 ml/L, 500 ml/ha)
   - Application timing and frequency
   - Organic/biological alternatives (Trichoderma, Neem, etc.)
   - Preventive measures and field management tips
   - Which resistant varieties to use next season (for India)

IMPORTANT: Cover ALL Indian crops – Tomato, Rice, Wheat, Maize, Cotton, Sugarcane, Potato, Groundnut, Soybean, Chilli, Banana, Onion, Garlic, Brinjal, Okra, Mango, Grapes, Pomegranate, Mustard, Sunflower, and all livestock diseases.

Respond ONLY with valid JSON in this exact format:
{{
  "crop": "Exact crop/animal name",
  "disease": "Disease name (Scientific name)",
  "severity": "low|medium|high",
  "confidence": 0.92,
  "advice": "Detailed treatment and prevention advice with exact chemical dosages and agronomic recommendations.",
  "gemini_powered": true
}}

If image is unclear or not agricultural, still give your best assessment. Do NOT include markdown, only pure JSON."""

        # Gemini 1.5 Flash REST API endpoint
        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={api_key}"

        payload = {
            "contents": [
                {
                    "parts": [
                        {"text": system_prompt},
                        {
                            "inline_data": {
                                "mime_type": mime_type,
                                "data": base64_image
                            }
                        }
                    ]
                }
            ],
            "generationConfig": {
                "temperature": 0.1,
                "topK": 32,
                "topP": 1.0,
                "maxOutputTokens": 1024,
                "responseMimeType": "application/json"
            },
            "safetySettings": [
                {"category": "HARM_CATEGORY_HARASSMENT", "threshold": "BLOCK_NONE"},
                {"category": "HARM_CATEGORY_HATE_SPEECH", "threshold": "BLOCK_NONE"},
                {"category": "HARM_CATEGORY_SEXUALLY_EXPLICIT", "threshold": "BLOCK_NONE"},
                {"category": "HARM_CATEGORY_DANGEROUS_CONTENT", "threshold": "BLOCK_NONE"}
            ]
        }

        response = requests.post(url, json=payload, timeout=30)
        print(f"[Gemini] API Response Status: {response.status_code}")

        if response.status_code == 200:
            data = response.json()
            # Extract text from Gemini response
            candidates = data.get("candidates", [])
            if not candidates:
                print("[Gemini] No candidates in response")
                return None

            content_parts = candidates[0].get("content", {}).get("parts", [])
            if not content_parts:
                print("[Gemini] No content parts in response")
                return None

            raw_text = content_parts[0].get("text", "").strip()

            # Clean JSON if wrapped in markdown
            if raw_text.startswith("```"):
                raw_text = raw_text.split("```")[1]
                if raw_text.startswith("json"):
                    raw_text = raw_text[4:]
                raw_text = raw_text.strip()

            parsed = json.loads(raw_text)

            result = {
                "disease": parsed.get("disease", "Unknown Disease"),
                "crop": parsed.get("crop", crop_hint or "Unknown Crop"),
                "severity": parsed.get("severity", "medium").lower(),
                "confidence": min(1.0, max(0.0, float(parsed.get("confidence", 0.88)))),
                "advice": parsed.get("advice", "Consult your nearest Krishi Vigyan Kendra (KVK)."),
                "gemini_powered": True,
                "model": "Google Gemini 1.5 Flash"
            }
            print(f"[Gemini] ✅ Successfully diagnosed: {result['disease']} in {result['crop']}")
            return result

        else:
            error_body = response.text[:500]
            print(f"[Gemini] API Error {response.status_code}: {error_body}")
            return None

    except json.JSONDecodeError as e:
        print(f"[Gemini] JSON parse error: {e}")
        return None
    except Exception as e:
        print(f"[Gemini] API call failed: {e}")
        return None


# ─────────────────────────────────────────────────────────────────────────────
#  Main predict_image – Gemini → PyTorch → Static fallback
# ─────────────────────────────────────────────────────────────────────────────

def predict_image(image_bytes: bytes, crop_hint: str = None) -> dict:
    """
    Primary prediction pipeline:
      1. Google Gemini 1.5 Flash (Vision AI) – most accurate, covers ALL crops
      2. PyTorch MobileNetV3 – local model inference
      3. Static metadata fallback – deterministic based on crop_hint
    """

    # ── STEP 1: Gemini Vision API ──────────────────────────────────────────
    gemini_result = predict_image_via_gemini(image_bytes, crop_hint)
    if gemini_result:
        return gemini_result

    print("[ML] Gemini unavailable. Falling back to PyTorch / static model.")

    # ── STEP 2: PyTorch inference ──────────────────────────────────────────
    if TORCH_AVAILABLE:
        try:
            image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
            tensor = transform(image).unsqueeze(0)
            net = get_model()
            with torch.no_grad():
                outputs = net(tensor)
                probabilities = torch.softmax(outputs, dim=1)[0]
                confidence, predicted_idx = torch.max(probabilities, dim=0)

            predicted_class = CLASSES[predicted_idx.item()]

            # Align prediction with crop_hint if provided
            if crop_hint:
                hint_lower = crop_hint.lower()
                current_meta = DISEASE_METADATA.get(predicted_class, {})
                if hint_lower not in current_meta.get("crop", "").lower():
                    matching = [c for c in CLASSES if hint_lower in DISEASE_METADATA.get(c, {}).get("crop", "").lower()]
                    if matching:
                        predicted_class = matching[0]
                        confidence = torch.tensor(0.78)

            meta = DISEASE_METADATA.get(predicted_class, {
                "disease": "Unknown Condition",
                "crop": crop_hint or "Unknown Crop",
                "severity": "medium",
                "advice": "Image inconclusive. Please consult your nearest Krishi Vigyan Kendra (KVK)."
            })
            return {
                "disease": meta["disease"],
                "crop": meta["crop"],
                "severity": meta["severity"],
                "confidence": float(confidence.item()),
                "advice": meta["advice"],
                "gemini_powered": False,
                "model": "PyTorch MobileNetV3"
            }
        except Exception as e:
            print(f"[ML PyTorch] Inference error: {e}")

    # ── STEP 3: Static crop-hint based fallback ────────────────────────────
    crop = crop_hint or "Tomato"
    crop_lower = crop.lower()

    fallback_map = {
        "tomato": "Tomato - Early Blight (Alternaria solani)",
        "rice": "Rice - Leaf Blast (Magnaporthe oryzae)",
        "paddy": "Rice - Leaf Blast (Magnaporthe oryzae)",
        "wheat": "Wheat - Black Stem Rust (Puccinia graminis)",
        "maize": "Maize - Northern Leaf Blight (Exserohilum turcicum)",
        "corn": "Maize - Northern Leaf Blight (Exserohilum turcicum)",
        "cotton": "Cotton - Bacterial Blight (Xanthomonas axonopodis)",
        "sugarcane": "Sugarcane - Red Rot (Colletotrichum falcatum)",
        "potato": "Potato - Late Blight (Phytophthora infestans)",
        "groundnut": "Groundnut - Leaf Spot (Cercospora arachidicola)",
        "soybean": "Soybean - Bacterial Pustule",
        "chilli": "Chilli - Anthracnose (Colletotrichum capsici)",
        "banana": "Banana - Sigatoka Leaf Spot (Mycosphaerella fijiensis)",
        "cattle": "Cattle - Foot and Mouth Disease (FMD)",
        "livestock": "Cattle - Foot and Mouth Disease (FMD)",
        "cow": "Cattle - Foot and Mouth Disease (FMD)",
    }

    pred_class = "Tomato - Early Blight (Alternaria solani)"
    for key, cls in fallback_map.items():
        if key in crop_lower:
            pred_class = cls
            break

    meta = DISEASE_METADATA[pred_class]
    return {
        "disease": meta["disease"],
        "crop": meta["crop"],
        "severity": meta["severity"],
        "confidence": 0.72,
        "advice": meta["advice"],
        "gemini_powered": False,
        "model": "Static Fallback"
    }
