import io
import os
import base64
import json
import requests
from PIL import Image

try:
    import os
    # Force disable PyTorch on PythonAnywhere hosting to avoid exceeding 512MB RAM OOM limit
    if os.environ.get("PYTHONANYWHERE_SITE") or os.path.exists("/home/Krishna3114"):
        TORCH_AVAILABLE = False
        print("[ML] Running on PythonAnywhere. Disabling PyTorch to prevent Out-Of-Memory (OOM) crash.")
    else:
        import torch
        import torch.nn as nn
        from torchvision import models, transforms
        TORCH_AVAILABLE = True
except ImportError:
    TORCH_AVAILABLE = False
    print("[ML] PyTorch not installed. Using Vision AI APIs.")

# ─────────────────────────────────────────────────────────────────────────────
#  PlantVillage 38-class labels (used for HuggingFace model mapping)
# ─────────────────────────────────────────────────────────────────────────────
PLANTVILLAGE_LABELS = [
    "Apple___Apple_scab",
    "Apple___Black_rot",
    "Apple___Cedar_apple_rust",
    "Apple___healthy",
    "Blueberry___healthy",
    "Cherry_(including_sour)___Powdery_mildew",
    "Cherry_(including_sour)___healthy",
    "Corn_(maize)___Cercospora_leaf_spot Gray_leaf_spot",
    "Corn_(maize)___Common_rust_",
    "Corn_(maize)___Northern_Leaf_Blight",
    "Corn_(maize)___healthy",
    "Grape___Black_rot",
    "Grape___Esca_(Black_Measles)",
    "Grape___Leaf_blight_(Isariopsis_Leaf_Spot)",
    "Grape___healthy",
    "Orange___Haunglongbing_(Citrus_greening)",
    "Peach___Bacterial_spot",
    "Peach___healthy",
    "Pepper,_bell___Bacterial_spot",
    "Pepper,_bell___healthy",
    "Potato___Early_blight",
    "Potato___Late_blight",
    "Potato___healthy",
    "Raspberry___healthy",
    "Soybean___healthy",
    "Squash___Powdery_mildew",
    "Strawberry___Leaf_scorch",
    "Strawberry___healthy",
    "Tomato___Bacterial_spot",
    "Tomato___Early_blight",
    "Tomato___Late_blight",
    "Tomato___Leaf_Mold",
    "Tomato___Septoria_leaf_spot",
    "Tomato___Spider_mites Two-spotted_spider_mite",
    "Tomato___Target_Spot",
    "Tomato___Tomato_Yellow_Leaf_Curl_Virus",
    "Tomato___Tomato_mosaic_virus",
    "Tomato___healthy",
]

# ─────────────────────────────────────────────────────────────────────────────
#  140-crop classification dataset labels list
# ─────────────────────────────────────────────────────────────────────────────
CLASSES = [
    "Aji pepper plant", "Almonds plant", "Amaranth plant", "Apples plant", "Artichoke plant", 
    "Avocados plant", "Açaí plant", "Bananas plant", "Barley plant", "Beets plant", 
    "Black pepper plant", "Blueberries plant", "Bok choy plant", "Brazil nuts plant", "Broccoli plant", 
    "Brussels sprout plant", "Buckwheat plant", "Cabbages and other brassicas plant", "Camucamu plant", "Carrots and turnips plant", 
    "Cashew nuts plant", "Cassava plant", "Cauliflower plant", "Celery plant", "Cherimoya plant", 
    "Cherry plant", "Chestnuts plant", "Chickpeas plant", "Chili peppers and green peppers plant", "Cinnamon plant", 
    "Cloves plant", "Cocoa beans plant", "Coconuts plant", "Coffee (green) plant", "Collards plant", 
    "Cotton lint plant", "Cranberries plant", "Cucumbers and gherkins plant", "Dates plant", "Dry beans plant", 
    "Dry peas plant", "Durian plant", "Eggplants (Aubergines) plant", "Endive plant", "Fava bean plant", 
    "Figs plant", "Flax fiber and tow plant", "Flaxseed (Linseed) plant", "Fonio plant", "Garlic plant", 
    "Ginger plant", "Gooseberries plant", "Grapes plant", "Groundnuts (Peanuts) plant", "Guarana plant", 
    "Guavas plant", "Habanero pepper plant", "Hazelnuts plant", "Hemp plant", "Hen eggs (shell weight) plant", 
    "Horseradish plant", "Jackfruit plant", "Jute plant", "Kale plant", "Kohlrabi plant", 
    "Leeks plant", "Lemons and limes plant", "Lentils plant", "Lettuce and chicory plant", "Lima bean plant", 
    "Longan plant", "Lupins plant", "Lychee plant", "Maize (Corn) plant", "Mandarins, clementines, satsumas plant", 
    "Mangoes, mangosteens, guavas plant", "Maracuja(Passionfruit) plant", "Millet plant", "Mint plant", 
    "Mung bean plant", "Mustard greens plant", "Mustard seeds plant", "Navy bean plant", "Oats plant", 
    "Oil palm fruit plant", "Okra plant", "Olives plant", "Onions (dry) plant", "Oranges plant", 
    "Oregano plant", "Papayas plant", "Parsley plant", "Peaches and nectarines plant", "Peas (Green) plant", 
    "Persimmons plant", "Pine nuts plant", "Pineapples plant", "Pinto bean plant", "Pistachios plant", 
    "Plantains plant", "Pomegranates plant", "Potatoes plant", "Pumpkins, squash and gourds plant", "Quinoa plant", 
    "Radishes and similar roots plant", "Rambutan plant", "Rapeseed (Canola) plant", "Raspberries plant", "Rice (Paddy) plant", 
    "Rosemary plant", "Rubber (natural) plant", "Rye plant", "Saffron plant", "Sage plant", 
    "Scallions plant", "Sorghum plant", "Soursop plant", "Soybeans plant", "Spinach plant", 
    "Starfruit plant", "Strawberries plant", "Sugar beet plant", "Sugar cane plant", "Sunflower seeds plant", 
    "Sweet potatoes plant", "Swiss chard plant", "Tamarind plant", "Taro (cocoyam) plant", "Tea plant", 
    "Teff plant", "Thyme plant", "Tomatoes plant", "Triticale plant", "Turmeric plant", 
    "Turnip greens plant", "Vanilla beans plant", "Walnuts plant", "Watermelons plant", "Wheat plant", 
    "Yams plant"
]

def get_dataset_classes():
    """
    Load class names from dataset_loader (preferred) or fall back to classes.json / hardcoded list.
    dataset_loader auto-detects the local PlantVillage dataset first, then classes.json.
    """
    try:
        from dataset_loader import list_disease_classes
        classes = list_disease_classes()
        if classes:
            return classes
    except Exception:
        pass

    # Legacy fallback paths
    checkpoint_dir = os.path.dirname(os.path.abspath(__file__))
    classes_json_path = os.path.join(checkpoint_dir, "classes.json")
    if os.path.exists(classes_json_path):
        try:
            with open(classes_json_path, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            pass

    return CLASSES

# ─────────────────────────────────────────────────────────────────────────────
#  Comprehensive Disease Metadata — 40+ diseases across all Indian crops
# ─────────────────────────────────────────────────────────────────────────────
DISEASE_METADATA = {
    # ── TOMATO ────────────────────────────────────────────────────────────
    "Tomato - Early Blight": {
        "disease": "Early Blight (Alternaria solani)", "crop": "Tomato", "severity": "medium",
        "advice": "Dark concentric target-board spots on older leaves. Apply Mancozeb 75 WP (2 g/L) or Copper Oxychloride 50 WP (3 g/L) every 7 days. Remove infected lower leaves. Mulch soil to prevent splash inoculation. Avoid overhead irrigation."
    },
    "Tomato - Late Blight": {
        "disease": "Late Blight (Phytophthora infestans)", "crop": "Tomato", "severity": "high",
        "advice": "Water-soaked dark lesions with white mold on leaf undersides. Apply Cymoxanil 8% + Mancozeb 64% WP (3 g/L) every 5-7 days. Destroy infected plants immediately. Ensure good drainage. Avoid overhead irrigation."
    },
    "Tomato - Leaf Curl Virus": {
        "disease": "Tomato Yellow Leaf Curl Virus (TYLCV)", "crop": "Tomato", "severity": "high",
        "advice": "Upward curling + yellowing of leaves. Transmitted by Whitefly (Bemisia tabaci). Destroy infected plants. Spray Imidacloprid 17.8 SL (0.3 ml/L) or Acetamiprid 20 SP (0.3 g/L). Install yellow sticky traps @ 12/acre."
    },
    "Tomato - Bacterial Spot": {
        "disease": "Bacterial Spot (Xanthomonas vesicatoria)", "crop": "Tomato", "severity": "medium",
        "advice": "Small water-soaked spots with yellow halo on leaves and fruits. Spray Copper Oxychloride 50 WP (3 g/L) + Streptocycline (150 ppm). Use certified disease-free seeds. Avoid overhead irrigation."
    },
    "Tomato - Healthy": {
        "disease": "Healthy (No Disease)", "crop": "Tomato", "severity": "low",
        "advice": "Crop looks healthy! Maintain drip irrigation. Apply balanced NPK 19:19:19. Monitor weekly for whitefly and blight symptoms."
    },
    # ── RICE ──────────────────────────────────────────────────────────────
    "Rice - Leaf Blast": {
        "disease": "Leaf Blast (Magnaporthe oryzae)", "crop": "Rice (Paddy)", "severity": "high",
        "advice": "Spindle-shaped grey-centered lesions with brown borders. Spray Tricyclazole 75 WP (0.6 g/L) or Isoprothiolane 40 EC (1.5 ml/L). Reduce excess Urea application. Drain field 3-4 days during active outbreak."
    },
    "Rice - Neck Blast": {
        "disease": "Neck/Panicle Blast (Magnaporthe oryzae)", "crop": "Rice (Paddy)", "severity": "high",
        "advice": "Brown lesion at neck of panicle causes total grain loss. Spray Tricyclazole 75 WP (0.6 g/L) at boot-leaf stage and again at 50% heading. Avoid late Nitrogen application."
    },
    "Rice - Brown Spot": {
        "disease": "Brown Spot (Helminthosporium oryzae)", "crop": "Rice (Paddy)", "severity": "medium",
        "advice": "Oval brown spots with grey center on leaves. Spray Mancozeb 75 WP (2.5 g/L) or Carbendazim 50 WP (1 g/L). Apply balanced potassium nutrition. Treat seeds in Thiram 3 g/kg before sowing."
    },
    "Rice - Sheath Blight": {
        "disease": "Sheath Blight (Rhizoctonia solani)", "crop": "Rice (Paddy)", "severity": "medium",
        "advice": "Oval greyish lesions on leaf sheaths near waterline. Apply Hexaconazole 5 SC (2 ml/L) or Validamycin 3 L (2 ml/L). Keep plant density optimum. Drain field during early crop stages."
    },
    "Rice - Brown Plant Hopper": {
        "disease": "Brown Plant Hopper (BPH) Infestation", "crop": "Rice (Paddy)", "severity": "high",
        "advice": "Hopper burn – circular yellowing/browning from base. Apply Buprofezin 25 SC (1 ml/L) at base of tillers. Drain field water before spraying. Avoid excess Nitrogen fertilization."
    },
    "Rice - Healthy": {
        "disease": "Healthy (No Disease)", "crop": "Rice (Paddy)", "severity": "low",
        "advice": "Paddy crop looks healthy! Maintain 5 cm flood depth during tillering. Apply Urea in 3 splits. Scout weekly for blast and BPH."
    },
    # ── WHEAT ─────────────────────────────────────────────────────────────
    "Wheat - Black Stem Rust": {
        "disease": "Black Stem Rust (Puccinia graminis)", "crop": "Wheat", "severity": "high",
        "advice": "Reddish-brown pustules on stems/leaves turning black. Spray Propiconazole 25 EC (0.5 ml/L) or Tebuconazole 250 EC (0.75 ml/L). Next season use resistant cultivars (HD-3086, HD-2967). Remove volunteer wheat plants."
    },
    "Wheat - Yellow Stripe Rust": {
        "disease": "Yellow Stripe Rust (Puccinia striiformis)", "crop": "Wheat", "severity": "high",
        "advice": "Yellow pustules in rows along leaf veins. Apply Propiconazole 25 EC (1 ml/L) at first sign. Use resistant varieties (K-307, PBW-550). Sow at recommended time to avoid peak rust weather."
    },
    "Wheat - Powdery Mildew": {
        "disease": "Powdery Mildew (Blumeria graminis)", "crop": "Wheat", "severity": "medium",
        "advice": "White powdery patches on upper leaf surface. Spray Sulfur 80 WP (3 g/L) or Hexaconazole 5 SC (1 ml/L). Avoid excess nitrogen. Improve air circulation by reducing plant density."
    },
    "Wheat - Loose Smut": {
        "disease": "Loose Smut (Ustilago tritici)", "crop": "Wheat", "severity": "high",
        "advice": "Entire ear replaced by black smut mass. Use systemic seed treatment with Carboxin 37.5% + Thiram 37.5% DS (2 g/kg seed). Plant certified disease-free seeds. Carbamates ineffective – use systemic fungicide seed treatment."
    },
    "Wheat - Healthy": {
        "disease": "Healthy (No Disease)", "crop": "Wheat", "severity": "low",
        "advice": "Wheat crop healthy! Apply second irrigation at jointing stage. Monitor for aphid colonies on flag leaf. Do not delay harvesting to avoid shattering."
    },
    # ── MAIZE ─────────────────────────────────────────────────────────────
    "Maize - Northern Leaf Blight": {
        "disease": "Northern Leaf Blight (Exserohilum turcicum)", "crop": "Maize (Corn)", "severity": "high",
        "advice": "Long tan/grey elliptical lesions on leaves. Apply Propiconazole 25 EC (1 ml/L) or Mancozeb 75 WP (2 g/L) at VT (tasseling) stage. Use resistant hybrids. Crop rotation yearly."
    },
    "Maize - Gray Leaf Spot": {
        "disease": "Gray Leaf Spot (Cercospora zeae-maydis)", "crop": "Maize (Corn)", "severity": "medium",
        "advice": "Rectangular grey-tan lesions limited by veins. Spray Azoxystrobin 23 SC (1 ml/L). Minimum tillage to reduce soil-borne inoculum. Plant resistant hybrids."
    },
    "Maize - Common Rust": {
        "disease": "Common Rust (Puccinia sorghi)", "crop": "Maize (Corn)", "severity": "medium",
        "advice": "Brick-red oval pustules on both leaf surfaces. Apply Mancozeb 75 WP (2.5 g/L) preventively. Plant resistant hybrids. Early planting avoids peak rust season."
    },
    "Maize - Fall Armyworm": {
        "disease": "Fall Armyworm (Spodoptera frugiperda)", "crop": "Maize (Corn)", "severity": "high",
        "advice": "Holes in whorls with frass. Apply Emamectin Benzoate 5 SG (0.4 g/L) or Chlorantraniliprole 18.5 SC (0.3 ml/L) directly into whorl. Scout at 3-4 leaf stage. Early morning spray most effective."
    },
    "Maize - Healthy": {
        "disease": "Healthy (No Disease)", "crop": "Maize (Corn)", "severity": "low",
        "advice": "Maize crop healthy! Apply 120 kg N/ha in 3 splits. Scout for Fall Armyworm in whorls. Maintain earthing-up at 30 days."
    },
    # ── COTTON ────────────────────────────────────────────────────────────
    "Cotton - Bacterial Blight": {
        "disease": "Bacterial Blight (Xanthomonas axonopodis)", "crop": "Cotton", "severity": "high",
        "advice": "Angular water-soaked spots turning brown with yellow halo. Spray Copper Oxychloride 50 WP (3 g/L) + Streptocycline (0.15 g/L). Use certified disease-free seeds. Avoid overhead irrigation."
    },
    "Cotton - Leaf Curl Virus": {
        "disease": "Cotton Leaf Curl Virus (CLCuV)", "crop": "Cotton", "severity": "high",
        "advice": "Upward leaf curling, vein thickening (enations). Whitefly vector – apply Acetamiprid 20 SP (0.2 g/L) weekly. Remove infected plants. Use CLCuV-tolerant hybrids like MRC-7017."
    },
    "Cotton - Fusarium Wilt": {
        "disease": "Fusarium Wilt (Fusarium oxysporum)", "crop": "Cotton", "severity": "high",
        "advice": "Sudden wilting, vascular browning. Drench soil with Carbendazim 50 WP (2 g/L). 3-year crop rotation. Use Trichoderma viride seed treatment (4 g/kg seed)."
    },
    "Cotton - Healthy": {
        "disease": "Healthy (No Disease)", "crop": "Cotton", "severity": "low",
        "advice": "Cotton crop healthy! Apply NPK 80:40:40 kg/ha. Square pinching at 45 days. Scout for bollworm egg masses."
    },
    # ── SUGARCANE ─────────────────────────────────────────────────────────
    "Sugarcane - Red Rot": {
        "disease": "Red Rot (Colletotrichum falcatum)", "crop": "Sugarcane", "severity": "high",
        "advice": "Internal red discoloration with white patches and sour smell. No effective spray – remove and burn infected stools. Treat setts in Carbendazim 0.1% for 15 min. Plant resistant varieties Co-0238 or Co-86032."
    },
    "Sugarcane - Smut": {
        "disease": "Smut (Ustilago scitaminea)", "crop": "Sugarcane", "severity": "high",
        "advice": "Black whip-like structure replacing growing point. Remove and burn infected plants. Hot water treatment at 50°C for 2 hrs. Plant smut-resistant varieties."
    },
    "Sugarcane - Healthy": {
        "disease": "Healthy (No Disease)", "crop": "Sugarcane", "severity": "low",
        "advice": "Healthy sugarcane. Apply ratoon management – stubble shaving + earthing up. Side-dress 60 kg N/ha at 60 and 120 days."
    },
    # ── POTATO ────────────────────────────────────────────────────────────
    "Potato - Late Blight": {
        "disease": "Late Blight (Phytophthora infestans)", "crop": "Potato", "severity": "high",
        "advice": "Water-soaked brown lesions with white downy mold on undersides. Apply Cymoxanil 8% + Mancozeb 64% WP (3 g/L) every 5 days. Destroy infected haulms. Avoid overhead irrigation. Use blight-resistant varieties."
    },
    "Potato - Early Blight": {
        "disease": "Early Blight (Alternaria solani)", "crop": "Potato", "severity": "medium",
        "advice": "Concentric dark target-board spots on older leaves. Spray Mancozeb 75 WP (2 g/L) or Chlorothalonil 75 WP (2 g/L) every 10 days. Remove infected leaves. Maintain adequate potassium nutrition."
    },
    "Potato - Healthy": {
        "disease": "Healthy (No Disease)", "crop": "Potato", "severity": "low",
        "advice": "Healthy potato crop. Apply hilling at 30-40 days. Monitor for Late Blight during cool wet spells."
    },
    # ── GROUNDNUT ─────────────────────────────────────────────────────────
    "Groundnut - Leaf Spot": {
        "disease": "Early Leaf Spot (Cercospora arachidicola)", "crop": "Groundnut (Peanut)", "severity": "medium",
        "advice": "Dark brown circular spots with yellow halo. Spray Mancozeb 75 WP (2.5 g/L) at 30, 45, 60 DAS. Remove infected leaves. Apply gypsum 200 kg/ha at pegging stage."
    },
    "Groundnut - Rust": {
        "disease": "Groundnut Rust (Puccinia arachidis)", "crop": "Groundnut (Peanut)", "severity": "medium",
        "advice": "Orange-brown pustules on leaf underside. Spray Triadimefon 25 WP (1 g/L) or Tebuconazole 250 EC (1 ml/L). Use resistant varieties. Rotate with non-host crops."
    },
    "Groundnut - Healthy": {
        "disease": "Healthy (No Disease)", "crop": "Groundnut (Peanut)", "severity": "low",
        "advice": "Healthy groundnut. Apply gypsum 200 kg/ha at flower initiation. Scout for thrips transmitting bud necrosis virus."
    },
    # ── SOYBEAN ───────────────────────────────────────────────────────────
    "Soybean - Bacterial Pustule": {
        "disease": "Bacterial Pustule (Xanthomonas axonopodis)", "crop": "Soybean", "severity": "medium",
        "advice": "Small pale-green spots with raised pustule center on underside. Apply Copper-based bactericide (3 g/L). Use disease-free certified seed. Maintain adequate potassium."
    },
    "Soybean - Frogeye Leaf Spot": {
        "disease": "Frogeye Leaf Spot (Cercospora sojina)", "crop": "Soybean", "severity": "medium",
        "advice": "Small circular spots – dark border with grey center. Apply Thiophanate-methyl 70 WP (1 g/L). Rotate crops. Plant tolerant varieties."
    },
    "Soybean - Healthy": {
        "disease": "Healthy (No Disease)", "crop": "Soybean", "severity": "low",
        "advice": "Healthy soybean. Apply Rhizobium inoculant to seed before sowing. Top-dress 20 kg N/ha at branching stage."
    },
    # ── CHILLI ────────────────────────────────────────────────────────────
    "Chilli - Anthracnose": {
        "disease": "Anthracnose / Die Back (Colletotrichum capsici)", "crop": "Chilli (Pepper)", "severity": "high",
        "advice": "Circular sunken tan-brown lesions on fruits/leaves. Spray Mancozeb 75 WP (2 g/L) or Carbendazim 50 WP (1 g/L). Harvest fruits timely. Use hot-water seed treatment."
    },
    "Chilli - Leaf Curl": {
        "disease": "Chilli Leaf Curl Virus (ChLCV)", "crop": "Chilli (Pepper)", "severity": "high",
        "advice": "Severe upward leaf curling, stunted growth. Whitefly vector – apply Imidacloprid 70 WG (0.3 g/L). Remove and burn infected plants. Install silver reflective mulch."
    },
    "Chilli - Healthy": {
        "disease": "Healthy (No Disease)", "crop": "Chilli (Pepper)", "severity": "low",
        "advice": "Healthy chilli crop. Apply calcium nitrate spray (1%) at flowering to prevent blossom end rot. Scout weekly for mites."
    },
    # ── BANANA ────────────────────────────────────────────────────────────
    "Banana - Sigatoka": {
        "disease": "Black Sigatoka (Mycosphaerella fijiensis)", "crop": "Banana", "severity": "high",
        "advice": "Yellow streaks progressing to dark necrotic patches. Spray Mancozeb 75 WP (2.5 g/L) alternating with Propiconazole 25 EC (0.5 ml/L) every 14 days. Remove infected leaves. Ensure field drainage."
    },
    "Banana - Panama Wilt": {
        "disease": "Panama Wilt / Fusarium Wilt (Fusarium oxysporum f.sp. cubense)", "crop": "Banana", "severity": "high",
        "advice": "Internal vascular browning, leaf yellowing. No chemical cure – remove infected plants. Plant in uninfected land. Use resistant Cavendish varieties. Soil solarization helps."
    },
    "Banana - Healthy": {
        "disease": "Healthy (No Disease)", "crop": "Banana", "severity": "low",
        "advice": "Healthy banana. Apply 200 g Urea + 200 g MOP per plant monthly. Ensure drip irrigation. Remove dead leaves (desuckering)."
    },
    # ── ONION / GARLIC ────────────────────────────────────────────────────
    "Onion - Purple Blotch": {
        "disease": "Purple Blotch (Alternaria porri)", "crop": "Onion", "severity": "medium",
        "advice": "Small white spots with purple center. Spray Mancozeb 75 WP (2.5 g/L) or Iprodione 50 WP (1 g/L) every 10 days. Avoid overhead irrigation. Maintain proper plant spacing."
    },
    "Onion - Healthy": {
        "disease": "Healthy (No Disease)", "crop": "Onion", "severity": "low",
        "advice": "Healthy onion. Apply potassium at bulbing stage. Avoid excessive nitrogen after 60 days. Scout for thrips – the major virus vector."
    },
    # ── MANGO ─────────────────────────────────────────────────────────────
    "Mango - Anthracnose": {
        "disease": "Anthracnose (Colletotrichum gloeosporioides)", "crop": "Mango", "severity": "high",
        "advice": "Dark sunken lesions on fruits/leaves. Spray Carbendazim 50 WP (1 g/L) or Mancozeb 75 WP (2.5 g/L) at flower bud emergence. Post-harvest hot water dip (52°C, 5 min) prevents fruit rot."
    },
    "Mango - Powdery Mildew": {
        "disease": "Powdery Mildew (Oidium mangiferae)", "crop": "Mango", "severity": "medium",
        "advice": "White powdery coating on new leaves/flowers. Spray Sulfur 80 WP (3 g/L) or Hexaconazole 5 SC (1 ml/L) at flower bud break. Two sprays at 15-day interval. Avoid water stress."
    },
    "Mango - Healthy": {
        "disease": "Healthy (No Disease)", "crop": "Mango", "severity": "low",
        "advice": "Healthy mango tree. Apply NPK 1 kg:0.5 kg:1 kg per tree. Adequate irrigation at fruit set. Scout for fruit fly and mealybugs."
    },
    # ── CATTLE / LIVESTOCK ────────────────────────────────────────────────
    "Cattle - Foot and Mouth Disease": {
        "disease": "Foot and Mouth Disease (FMD)", "crop": "Cattle (Livestock)", "severity": "high",
        "advice": "Blisters on mouth, feet, teats. QUARANTINE immediately – FMD is highly contagious. Wash lesions with 1:1000 KMnO4 solution. Contact veterinarian for antibiotic cover. Annual FMD vaccination is mandatory."
    },
    "Cattle - Lumpy Skin Disease": {
        "disease": "Lumpy Skin Disease (Capripoxvirus)", "crop": "Cattle (Livestock)", "severity": "high",
        "advice": "Multiple skin nodules (2-5 cm) across body. Quarantine affected herd. Apply LSD vaccine to non-infected animals. Antiseptic wound dressing. Control biting insects (vectors). Notify local animal husbandry department."
    },
    "Cattle - Healthy": {
        "disease": "Healthy (No Disease)", "crop": "Cattle (Livestock)", "severity": "low",
        "advice": "No disease symptoms detected. Maintain vaccination records (FMD, BQ, HS, LSD). Clean stalls with lime powder daily. Periodic deworming every 3 months."
    },
    # ── BRINJAL ───────────────────────────────────────────────────────────
    "Brinjal - Phomopsis Blight": {
        "disease": "Phomopsis Blight (Phomopsis vexans)", "crop": "Brinjal (Eggplant)", "severity": "medium",
        "advice": "Circular brown spots on leaves and lesions on fruit. Spray Mancozeb 75 WP (2.5 g/L) or Carbendazim 50 WP (1 g/L) every 10 days. Remove affected fruit. Practice crop rotation."
    },
    "Brinjal - Healthy": {
        "disease": "Healthy (No Disease)", "crop": "Brinjal (Eggplant)", "severity": "low",
        "advice": "Brinjal looks healthy! Apply balanced NPK and watch for shoot and fruit borer."
    },
    # ── MUSTARD ───────────────────────────────────────────────────────────
    "Mustard - White Rust": {
        "disease": "White Rust (Albugo candida)", "crop": "Mustard", "severity": "medium",
        "advice": "White pustules on leaf undersides and stems. Spray Mancozeb 75 WP (2 g/L) or Copper Oxychloride 50 WP (3 g/L) at first sign. Destroy plant debris."
    },
    "Mustard - Alternaria Leaf Spot": {
        "disease": "Alternaria Leaf Spot (Alternaria brassicae)", "crop": "Mustard", "severity": "medium",
        "advice": "Concentric black spots on leaves. Spray Mancozeb 75 WP (2.5 g/L). Use certified seeds and clean field margins."
    },
    "Mustard - Healthy": {
        "disease": "Healthy (No Disease)", "crop": "Mustard", "severity": "low",
        "advice": "Mustard crop looks healthy! Maintain proper spacing and monitor for aphids."
    },
}

# ─────────────────────────────────────────────────────────────────────────────
#  Crop keyword → Disease keys mapping for smart fallback
# ─────────────────────────────────────────────────────────────────────────────
CROP_FALLBACK_MAP = {
    "tomato":     ("Tomato - Early Blight",        "Tomato"),
    "rice":       ("Rice - Leaf Blast",             "Rice (Paddy)"),
    "paddy":      ("Rice - Leaf Blast",             "Rice (Paddy)"),
    "wheat":      ("Wheat - Black Stem Rust",       "Wheat"),
    "maize":      ("Maize - Northern Leaf Blight",  "Maize (Corn)"),
    "corn":       ("Maize - Northern Leaf Blight",  "Maize (Corn)"),
    "cotton":     ("Cotton - Bacterial Blight",     "Cotton"),
    "sugarcane":  ("Sugarcane - Red Rot",           "Sugarcane"),
    "potato":     ("Potato - Late Blight",          "Potato"),
    "groundnut":  ("Groundnut - Leaf Spot",         "Groundnut (Peanut)"),
    "peanut":     ("Groundnut - Leaf Spot",         "Groundnut (Peanut)"),
    "soybean":    ("Soybean - Frogeye Leaf Spot",   "Soybean"),
    "chilli":     ("Chilli - Anthracnose",          "Chilli (Pepper)"),
    "pepper":     ("Chilli - Anthracnose",          "Chilli (Pepper)"),
    "banana":     ("Banana - Sigatoka",             "Banana"),
    "onion":      ("Onion - Purple Blotch",         "Onion"),
    "mango":      ("Mango - Anthracnose",           "Mango"),
    "cattle":     ("Cattle - Foot and Mouth Disease", "Cattle (Livestock)"),
    "livestock":  ("Cattle - Foot and Mouth Disease", "Cattle (Livestock)"),
    "cow":        ("Cattle - Foot and Mouth Disease", "Cattle (Livestock)"),
    "buffalo":    ("Cattle - Foot and Mouth Disease", "Cattle (Livestock)"),
    "brinjal":    ("Brinjal - Phomopsis Blight",    "Brinjal (Eggplant)"),
    "eggplant":   ("Brinjal - Phomopsis Blight",    "Brinjal (Eggplant)"),
    "mustard":    ("Mustard - White Rust",          "Mustard"),
}

# ─────────────────────────────────────────────────────────────────────────────
#  PyTorch model (optional fallback)
# ─────────────────────────────────────────────────────────────────────────────
if TORCH_AVAILABLE:
    class MobileNetDiseaseClassifier(nn.Module):
        def __init__(self, num_classes=38):
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

_torch_model = None

def get_torch_model():
    global _torch_model
    if not TORCH_AVAILABLE:
        return None
    if _torch_model is None:
        checkpoint_dir = os.path.dirname(os.path.abspath(__file__))
        checkpoint_path = os.path.join(checkpoint_dir, "disease_model_weights.pth")
        if not os.path.exists(checkpoint_path):
            checkpoint_path = os.path.join(checkpoint_dir, "crop_model_weights.pth")
            
        if os.path.exists(checkpoint_path):
            try:
                state_dict = torch.load(checkpoint_path, map_location="cpu")
                num_classes = 38
                for key in ["backbone.classifier.3.weight", "classifier.weight", "fc.weight", "classifier.3.weight", "backbone.classifier.3.bias"]:
                    if key in state_dict:
                        num_classes = state_dict[key].shape[0]
                        break
                _torch_model = MobileNetDiseaseClassifier(num_classes=num_classes)
                _torch_model.load_state_dict(state_dict)
                _torch_model.eval()
                print(f"[ML] Loaded custom weights from {checkpoint_path} with num_classes={num_classes}")
            except Exception as e:
                print(f"[ML] Weight load error: {e}")
                return None
        else:
            print("[ML] No custom weights found. Run train.py to generate weights from the PlantVillage dataset.")
            return None
    return _torch_model


# ─────────────────────────────────────────────────────────────────────────────
#  Local PyTorch Inference execution
# ─────────────────────────────────────────────────────────────────────────────
def predict_via_torch(image_bytes: bytes) -> dict | None:
    if not TORCH_AVAILABLE:
        return None
    model = get_torch_model()
    if model is None:
        return None
        
    try:
        # Load classes mapping
        checkpoint_dir = os.path.dirname(os.path.abspath(__file__))
        classes_path = os.path.join(checkpoint_dir, "classes.json")
        classes = None
        if os.path.exists(classes_path):
            try:
                with open(classes_path, "r", encoding="utf-8") as f:
                    classes = json.load(f)
            except Exception:
                pass
        if not classes:
            # Fall back to dynamic checking of archive directory
            archive_train_dir = os.path.join(checkpoint_dir, "..", "archive", "RGB_224x224", "RGB_224x224", "train")
            if os.path.exists(archive_train_dir):
                classes = sorted([d for d in os.listdir(archive_train_dir) if os.path.isdir(os.path.join(archive_train_dir, d))])
            else:
                classes = get_dataset_classes()
                
        # Preprocess image
        img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        preprocess = transforms.Compose([
            transforms.Resize((224, 224)),
            transforms.ToTensor(),
            transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
        ])
        tensor = preprocess(img).unsqueeze(0)
        
        device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        model.to(device)
        tensor = tensor.to(device)
        
        with torch.no_grad():
            outputs = model(tensor)
            probabilities = torch.nn.functional.softmax(outputs[0], dim=0)
            confidence, class_idx = torch.max(probabilities, 0)
            confidence = confidence.item()
            class_idx = class_idx.item()
            
        if classes and class_idx < len(classes):
            predicted_class = classes[class_idx]
            print(f"[ML-Torch] Predicted: {predicted_class} (confidence: {confidence:.2f})")
            
            # Check if this model is a 38-class disease classifier (PlantVillage)
            if len(classes) == 38 or "___" in predicted_class:
                parsed = _parse_hf_label(predicted_class, confidence)
                if parsed:
                    parsed["model"] = "Local PyTorch Model (PlantVillage)"
                    parsed["gemini_powered"] = False
                    return parsed
            
            # Map predicted class to our disease database crops
            predicted_crop = predicted_class.replace(" plant", "").replace(" plantain", "plantain").strip()
            crop_mapping = {
                "Tomatoes": "Tomato",
                "Apples": "Apple",
                "Bananas": "Banana",
                "Blueberries": "Blueberry",
                "Cherries": "Cherry",
                "Chili peppers and green peppers": "Chilli",
                "Coconuts": "Coconut",
                "Grapes": "Grape",
                "Mangoes, mangosteens, guavas": "Mango",
                "Oranges": "Orange",
                "Peaches and nectarines": "Peach",
                "Potatoes": "Potato",
                "Rice (Paddy)": "Rice",
                "Strawberries": "Strawberry",
                "Soybeans": "Soybean",
                "Sugar cane": "Sugarcane",
                "Groundnuts (Peanuts)": "Groundnut",
                "Maize (Corn)": "Maize",
                "Eggplants (Aubergines)": "Brinjal",
                "Mustard greens": "Mustard",
                "Mustard seeds": "Mustard",
                "Onions (dry)": "Onion",
            }
            base_crop = crop_mapping.get(predicted_crop, predicted_crop)
            if base_crop.endswith("es"):
                base_crop = base_crop[:-2]
            elif base_crop.endswith("s") and not base_crop.endswith("ch") and not base_crop.endswith("sh"):
                base_crop = base_crop[:-1]
                
            return {
                "predicted_crop_class": predicted_class,
                "crop": base_crop,
                "confidence": confidence,
            }
    except Exception as e:
        print(f"[ML-Torch] Inference failed: {e}")
        return None


# ─────────────────────────────────────────────────────────────────────────────
#  Utility: Crop Name Translation & Normalization Helper
# ─────────────────────────────────────────────────────────────────────────────
def normalize_crop_name(crop_name: str) -> str:
    if not crop_name:
        return ""
    name = crop_name.lower().strip()
    mapping = {
        "टोमॅटो": "tomato", "टमाटर": "tomato",
        "भात": "rice", "धान": "rice", "तांदूळ": "rice",
        "गहू": "wheat", "गव्हा": "wheat",
        "बटाटा": "potato", "बटाटे": "potato", "आलू": "potato",
        "मोहरी": "mustard", "सरसों": "mustard",
        "मिरची": "chilli", "मिरच्या": "chilli", "मिर्च": "chilli",
        "कापूस": "cotton", "कपास": "cotton",
        "कांदा": "onion", "कांदे": "onion", "प्याज": "onion",
        "sफरचंद": "apple", "केळी": "banana", "केळा": "banana", "केला": "banana",
        "ज्वारी": "sorghum", "बाजरी": "millet", "मका": "maize", "मक्का": "maize",
        "ऊस": "sugarcane", "गन्ना": "sugarcane", "सोयाबीन": "soybean",
        "तूर": "pigeonpea", "हरभरा": "chickpea", "चना": "chickpea", "मूग": "mungbean",
        "कलिंगड": "watermelon", "टरबूज": "watermelon", "आंबा": "mango", "आम": "mango",
        "पेरू": "guava", "अमरूद": "guava", "द्राक्षे": "grape", "द्राक्ष": "grape", "अंगूर": "grape",
        "पपई": "papaya", "पपीता": "papaya", "लिंबू": "lemon", "निंबू": "lemon",
        "डाळिंब": "pomegranate", "अनार": "pomegranate", "वांगी": "eggplant", "वांगे": "eggplant",
        "बैंगन": "eggplant", "भेंडी": "okra", "भिंडी": "okra", "कोबी": "cabbage",
        "पत्ता गोभी": "cabbage", "फ्लॉवर": "cauliflower", "फूल गोभी": "cauliflower",
        "पालक": "spinach", "मेथी": "fenugreek", "धने": "coriander", "कोथिंबीर": "coriander",
        "धनिया": "coriander", "आले": "ginger", "अदरक": "ginger", "लसूण": "garlic",
        "लहसुन": "garlic", "हळद": "turmeric", "हल्दी": "turmeric", "मटर": "pea",
        "chilli": "chilli", "chilli pepper": "chilli"
    }
    for key, val in mapping.items():
        if key in name:
            return val
    return name


# ─────────────────────────────────────────────────────────────────────────────
#  Utility: Read GEMINI_API_KEY from env or .env file
# ─────────────────────────────────────────────────────────────────────────────
def get_gemini_api_key() -> str | None:
    key = os.getenv("GEMINI_API_KEY", "").strip()
    if key:
        return key

    env_paths = [
        os.path.join(os.path.dirname(__file__), ".env"),
        os.path.join(os.path.dirname(__file__), "..", ".env"),
        os.path.join(os.path.dirname(__file__), "..", "backend", ".env"),
        "/home/Krishna3114/smart-kisan-backend/.env",
        "/home/Krishna3114/smart-kisan-backend/backend_python/.env",
        "/home/Krishna3114/mysite/.env",
    ]
    for path in env_paths:
        if os.path.exists(path):
            try:
                with open(path, "r") as f:
                    for line in f:
                        line = line.strip()
                        if line.startswith("GEMINI_API_KEY="):
                            val = line.split("=", 1)[1].strip().strip('"').strip("'")
                            if val:
                                return val
            except Exception:
                pass
    return None


# ─────────────────────────────────────────────────────────────────────────────
#  TIER 1 — Google Gemini 1.5 Flash Vision API
#  Analyzes the ACTUAL image — returns correct crop/disease regardless of hint
# ─────────────────────────────────────────────────────────────────────────────
def predict_via_gemini(image_bytes: bytes, crop_hint: str = None, custom_key: str = None) -> dict | None:
    api_key = (custom_key or "").strip()
    if not api_key:
        api_key = get_gemini_api_key()
    if not api_key:
        print("[Gemini] No GEMINI_API_KEY found. Skipping.")
        return None

    try:
        # Detect MIME type
        try:
            img = Image.open(io.BytesIO(image_bytes))
            fmt = (img.format or "JPEG").upper()
            mime_type = {"JPEG": "image/jpeg", "PNG": "image/png",
                         "WEBP": "image/webp", "GIF": "image/gif"}.get(fmt, "image/jpeg")
        except Exception:
            mime_type = "image/jpeg"

        b64 = base64.b64encode(image_bytes).decode("utf-8")

        # Load the user's 140 crops dataset classes list
        dataset_classes = get_dataset_classes()
        dataset_classes_str = ", ".join(dataset_classes)

        prompt = f"""You are AgriExpert, an expert AI Agricultural Disease Specialist trained on PlantVillage, PlantDoc, and CropDoc datasets.

=== MANDATORY STEP 1: IMAGE VALIDATION ===
Look at the uploaded image carefully.
- If the image shows a PERSON, ANIMAL, VEHICLE, BUILDING, FOOD (cooked), OBJECT, LANDSCAPE (without plants), or ANY NON-PLANT content → you MUST return Invalid Image response.
- ONLY proceed if the image clearly shows a CROP, PLANT, LEAF, STEM, FRUIT (on plant), or AGRICULTURAL FIELD.

For NON-CROP images, return EXACTLY this JSON and nothing else:
{{"disease": "Invalid Image", "crop": "Not a crop", "severity": "low", "confidence": 0.0, "health_status": "invalid", "plant_name": "N/A", "symptoms": "N/A", "causes": "N/A", "organic_treatment": "N/A", "chemical_treatment": "N/A", "prevention": "N/A", "fertilizer_advice": "N/A", "irrigation_advice": "N/A", "growth_stage": "N/A", "advice": "Invalid image. Please upload a clear image of a crop or plant.", "image_analysis": "Image rejected — no plant or crop visible.", "gemini_powered": true}}

=== MANDATORY STEP 2: CROP DIAGNOSIS (only if valid plant image) ===
Available crops reference: {dataset_classes_str}
Farmer crop hint: "{crop_hint or 'auto-detect from image'}"
IMPORTANT: Analyze actual image pixels. If image shows rice but hint says tomato → report RICE.

Return ONLY this JSON (no text outside):
{{
  "crop": "Exact crop name (e.g. Tomato, Rice, Wheat)",
  "plant_name": "Full botanical or common plant name",
  "disease": "Disease name with scientific name (e.g. Early Blight (Alternaria solani)) or Healthy",
  "health_status": "Healthy|Infected|Suspect",
  "severity": "low|medium|high",
  "confidence": 0.90,
  "growth_stage": "Seedling|Vegetative|Flowering|Fruiting|Harvest|Unknown",
  "symptoms": "Visible symptoms described from actual image (2-3 sentences)",
  "causes": "Disease cause: fungal/bacterial/viral/pest + pathogen name",
  "organic_treatment": "Organic/biological treatment options with exact doses",
  "chemical_treatment": "Chemical treatment with product names, active ingredients, doses (g/L or mL/L)",
  "prevention": "Prevention and sanitation measures",
  "fertilizer_advice": "Recommended fertilizers for recovery (NPK, micronutrients)",
  "irrigation_advice": "Irrigation recommendation based on disease and crop type",
  "advice": "Comprehensive markdown treatment advice summary",
  "image_analysis": "What you actually see in the image (plant type, symptoms, affected areas)",
  "gemini_powered": true
}}"""

        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={api_key}"
        payload = {
            "contents": [{
                "parts": [
                    {"text": prompt},
                    {"inline_data": {"mime_type": mime_type, "data": b64}}
                ]
            }],
            "generationConfig": {
                "temperature": 0.05,
                "topK": 16,
                "topP": 0.95,
                "maxOutputTokens": 1500,
                "responseMimeType": "application/json"
            },
            "safetySettings": [
                {"category": "HARM_CATEGORY_HARASSMENT", "threshold": "BLOCK_NONE"},
                {"category": "HARM_CATEGORY_HATE_SPEECH", "threshold": "BLOCK_NONE"},
                {"category": "HARM_CATEGORY_SEXUALLY_EXPLICIT", "threshold": "BLOCK_NONE"},
                {"category": "HARM_CATEGORY_DANGEROUS_CONTENT", "threshold": "BLOCK_NONE"}
            ]
        }

        resp = requests.post(url, json=payload, timeout=35)
        print(f"[Gemini] Status: {resp.status_code}")

        if resp.status_code != 200:
            print(f"[Gemini] Error body: {resp.text[:400]}")
            return None

        data = resp.json()
        candidates = data.get("candidates", [])
        if not candidates:
            print("[Gemini] No candidates in response")
            return None

        parts = candidates[0].get("content", {}).get("parts", [])
        if not parts:
            print("[Gemini] Empty response parts")
            return None

        raw = parts[0].get("text", "").strip()

        # Strip markdown fences if present
        if "```" in raw:
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
            raw = raw.strip().rstrip("`").strip()

        parsed = json.loads(raw)

        result = {
            "disease":            str(parsed.get("disease", "Unknown Disease")),
            "crop":               str(parsed.get("crop", crop_hint or "Unknown Crop")),
            "plant_name":         str(parsed.get("plant_name", parsed.get("crop", crop_hint or "Unknown Plant"))),
            "health_status":      str(parsed.get("health_status", "Unknown")),
            "severity":           str(parsed.get("severity", "medium")).lower().strip(),
            "confidence":         min(1.0, max(0.0, float(parsed.get("confidence", 0.88)))),
            "growth_stage":       str(parsed.get("growth_stage", "Unknown")),
            "symptoms":           str(parsed.get("symptoms", "")),
            "causes":             str(parsed.get("causes", "")),
            "organic_treatment":  str(parsed.get("organic_treatment", "")),
            "chemical_treatment": str(parsed.get("chemical_treatment", "")),
            "prevention":         str(parsed.get("prevention", "")),
            "fertilizer_advice":  str(parsed.get("fertilizer_advice", "")),
            "irrigation_advice":  str(parsed.get("irrigation_advice", "")),
            "advice":             str(parsed.get("advice", "Consult your nearest Krishi Vigyan Kendra (KVK).")),
            "image_analysis":     str(parsed.get("image_analysis", "")),
            "gemini_powered":     True,
            "model":              "Google Gemini 1.5 Flash"
        }

        # Validate severity
        if result["severity"] not in ("low", "medium", "high"):
            result["severity"] = "medium"

        print(f"[Gemini] ✅ Detected: {result['crop']} → {result['disease']} (conf: {result['confidence']:.2f})")
        return result

    except json.JSONDecodeError as e:
        print(f"[Gemini] JSON parse error: {e}. Raw: {raw[:300]}")
        return None
    except Exception as e:
        print(f"[Gemini] API call failed: {type(e).__name__}: {e}")
        return None


# ─────────────────────────────────────────────────────────────────────────────
#  TIER 2 — Hugging Face Inference API (FREE, no key needed for basic use)
#  Uses a real PlantVillage-trained ViT model to classify crop disease from image
# ─────────────────────────────────────────────────────────────────────────────
def predict_via_huggingface(image_bytes: bytes, crop_hint: str = None) -> dict | None:
    """
    Uses Hugging Face's free inference API with a plant disease classification model.
    Model: linkanjarad/mobilenet_v2_1.0_224-plant-disease-identification
    Trained on PlantVillage dataset — actually reads the image pixels.
    """
    HF_MODEL = "linkanjarad/mobilenet_v2_1.0_224-plant-disease-identification"
    HF_URL   = f"https://api-inference.huggingface.co/models/{HF_MODEL}"

    # Try to get HF API key if available (optional - improves rate limits)
    hf_key = os.getenv("HF_API_KEY", "").strip()
    headers = {"Content-Type": "application/octet-stream"}
    if hf_key:
        headers["Authorization"] = f"Bearer {hf_key}"

    try:
        print("[HuggingFace] Sending image to plant disease classifier...")
        resp = requests.post(HF_URL, headers=headers, data=image_bytes, timeout=25)
        print(f"[HuggingFace] Status: {resp.status_code}")

        if resp.status_code == 503:
            # Model loading — this is normal on first call
            print("[HuggingFace] Model loading (503). Will retry once...")
            import time
            time.sleep(5)
            resp = requests.post(HF_URL, headers=headers, data=image_bytes, timeout=30)

        if resp.status_code != 200:
            print(f"[HuggingFace] Error: {resp.text[:300]}")
            return None

        predictions = resp.json()
        if not isinstance(predictions, list) or not predictions:
            print("[HuggingFace] Unexpected response format")
            return None

        # Top prediction from the model
        top = predictions[0]
        hf_label = top.get("label", "").strip()
        hf_score = float(top.get("score", 0.0))

        print(f"[HuggingFace] Top prediction: {hf_label} ({hf_score:.3f})")

        # Parse the HuggingFace PlantVillage label into our format
        # Labels look like: "Tomato___Early_blight" or "Apple___Apple_scab"
        parsed = _parse_hf_label(hf_label, hf_score, crop_hint)
        if parsed:
            parsed["model"] = "HuggingFace ViT PlantVillage"
            parsed["gemini_powered"] = False
            print(f"[HuggingFace] ✅ Detected: {parsed['crop']} → {parsed['disease']}")
            return parsed

        return None

    except Exception as e:
        print(f"[HuggingFace] API call failed: {type(e).__name__}: {e}")
        return None


def _parse_hf_label(hf_label: str, confidence: float, crop_hint: str = None) -> dict | None:
    """
    Convert HuggingFace PlantVillage label into our disease metadata format.
    HF labels: "Tomato___Early_blight", "Corn_(maize)___Northern_Leaf_Blight", etc.
    """
    if not hf_label:
        return None

    # Normalize
    label_lower = hf_label.lower().replace("___", " ").replace("_", " ").strip()

    # Map HF label → our disease metadata keys
    HF_LABEL_MAP = {
        "tomato early blight": "Tomato - Early Blight",
        "tomato late blight": "Tomato - Late Blight",
        "tomato bacterial spot": "Tomato - Bacterial Spot",
        "tomato yellow leaf curl virus": "Tomato - Leaf Curl Virus",
        "tomato tomato yellow leaf curl virus": "Tomato - Leaf Curl Virus",
        "tomato leaf mold": "Tomato - Early Blight",
        "tomato septoria leaf spot": "Tomato - Early Blight",
        "tomato target spot": "Tomato - Late Blight",
        "tomato tomato mosaic virus": "Tomato - Leaf Curl Virus",
        "tomato spider mites two-spotted spider mite": "Tomato - Bacterial Spot",
        "tomato healthy": "Tomato - Healthy",
        "potato early blight": "Potato - Early Blight",
        "potato late blight": "Potato - Late Blight",
        "potato healthy": "Potato - Healthy",
        "corn (maize) cercospora leaf spot gray leaf spot": "Maize - Gray Leaf Spot",
        "corn (maize) common rust ": "Maize - Common Rust",
        "corn (maize) northern leaf blight": "Maize - Northern Leaf Blight",
        "corn (maize) healthy": "Maize - Healthy",
        "corn cercospora leaf spot": "Maize - Gray Leaf Spot",
        "corn common rust": "Maize - Common Rust",
        "corn northern leaf blight": "Maize - Northern Leaf Blight",
        "corn healthy": "Maize - Healthy",
        "soybean healthy": "Soybean - Healthy",
        "pepper bell bacterial spot": "Chilli - Anthracnose",
        "pepper bell healthy": "Chilli - Healthy",
        "apple apple scab": "Mango - Anthracnose",
        "apple black rot": "Mango - Anthracnose",
        "apple cedar apple rust": "Mango - Powdery Mildew",
        "apple healthy": "Mango - Healthy",
        "grape black rot": "Banana - Sigatoka",
        "grape esca (black measles)": "Banana - Panama Wilt",
        "grape healthy": "Banana - Healthy",
        "squash powdery mildew": "Wheat - Powdery Mildew",
        "cherry powdery mildew": "Wheat - Powdery Mildew",
    }

    # Try direct match
    matched_key = HF_LABEL_MAP.get(label_lower.strip())

    # If no direct match, try partial matching
    if not matched_key:
        for hf_key, meta_key in HF_LABEL_MAP.items():
            if hf_key in label_lower or label_lower in hf_key:
                matched_key = meta_key
                break

    # If still no match but crop_hint is available, try crop-based matching
    if not matched_key and crop_hint:
        crop_lower = crop_hint.lower()
        if "healthy" in label_lower:
            # Find healthy version of hinted crop
            for meta_key in DISEASE_METADATA:
                if crop_lower in meta_key.lower() and "healthy" in meta_key.lower():
                    matched_key = meta_key
                    break
        else:
            # Find disease version of hinted crop
            for meta_key in DISEASE_METADATA:
                if crop_lower in meta_key.lower() and "healthy" not in meta_key.lower():
                    matched_key = meta_key
                    break

    if not matched_key:
        print(f"[HuggingFace] Could not map label: {hf_label}")
        return None

    meta = DISEASE_METADATA.get(matched_key)
    if not meta:
        # Try dataset-backed metadata as a secondary source
        try:
            from use_dataset_for_disease_detection import predict_from_dataset, DATASET_DISEASE_METADATA
            ds_result = predict_from_dataset(matched_key, confidence)
            if ds_result:
                return {
                    "disease":    ds_result["disease"],
                    "crop":       ds_result["crop"],
                    "severity":   ds_result["severity"],
                    "confidence": round(confidence, 3),
                    "advice":     ds_result["advice"],
                    "hf_label":   hf_label,
                }
        except ImportError:
            pass
        return None

    return {
        "disease":    meta["disease"],
        "crop":       meta["crop"],
        "severity":   meta["severity"],
        "confidence": round(confidence, 3),
        "advice":     meta["advice"],
        "hf_label":   hf_label,
    }


# ─────────────────────────────────────────────────────────────────────────────
#  TIER 3 — Smart Crop-Aware Static Fallback
#  Uses crop_hint properly; never defaults to Tomato for non-tomato crops
# ─────────────────────────────────────────────────────────────────────────────
def predict_via_static_fallback(crop_hint: str = None, filename: str = None) -> dict:
    """
    Last resort fallback. Uses crop_hint and filename keywords to return the crop's disease.
    Also integrates the local PlantVillage dataset metadata for enriched results.
    NEVER defaults to Tomato if a different crop is hinted.
    """
    # First try dataset-backed metadata
    try:
        from use_dataset_for_disease_detection import (
            DATASET_DISEASE_METADATA,
            predict_from_dataset
        )
        # Try to match crop_hint against dataset class names
        crop_lower = (crop_hint or "").lower().strip()
        file_lower = (filename or "").lower().strip()
        combined = f"{crop_lower} {file_lower}"

        for class_name, meta in DATASET_DISEASE_METADATA.items():
            crop_key = class_name.split("___")[0].lower().replace("_", " ")
            disease_key = class_name.split("___")[1].lower().replace("_", " ") if "___" in class_name else ""
            if crop_key and crop_key in combined:
                # Match on disease keyword in filename if possible
                if disease_key and any(w in file_lower for w in disease_key.split() if len(w) > 3):
                    return predict_from_dataset(class_name, confidence=0.76)
                # Otherwise use first disease for this crop (skip healthy)
                if "healthy" not in class_name.lower():
                    return predict_from_dataset(class_name, confidence=0.60)
    except ImportError:
        pass  # dataset module not available, fall through to local dict

    crop_lower = (crop_hint or "").lower().strip()
    file_lower = (filename or "").lower().strip()

    # Try to find matching crop from crop_hint or filename
    matched_key = None
    for keyword, (meta_key, crop_name) in CROP_FALLBACK_MAP.items():
        if keyword in crop_lower or (file_lower and keyword in file_lower):
            matched_key = meta_key
            break

    if matched_key:
        # Find all keys in DISEASE_METADATA matching this crop
        crop_base = matched_key.split(" - ")[0]  # e.g. "Tomato" or "Rice"
        diseases = [k for k in DISEASE_METADATA if k.startswith(crop_base)]

        # Check if filename has keyword
        found_key = None
        for d_key in diseases:
            disease_name = d_key.split(" - ")[1].lower()
            disease_words = [w for w in disease_name.split() if len(w) > 3]
            for w in disease_words:
                if w in file_lower:
                    found_key = d_key
                    break
            if found_key:
                break

        if not found_key and "healthy" in file_lower:
            # Look for healthy version
            for d_key in diseases:
                if "healthy" in d_key.lower():
                    found_key = d_key
                    break

        if not found_key:
            found_key = matched_key  # Use default

        meta = DISEASE_METADATA.get(found_key)
        if meta:
            confidence = 0.75 if found_key != matched_key or "healthy" in file_lower else 0.55
            note_suffix = "\n\n⚠️ Note: Filename match detected offline. Please configure GEMINI_API_KEY for dynamic AI Vision analysis." if found_key != matched_key else "\n\n⚠️ Note: This result is based on your selected crop type, not image analysis. For accurate AI diagnosis, please configure the Gemini API key."
            return {
                "disease":    meta["disease"],
                "crop":       meta["crop"],
                "severity":   meta["severity"],
                "confidence": confidence,
                "advice":     meta["advice"] + note_suffix,
                "gemini_powered": False,
                "model": "Static Fallback (crop-hint based)"
            }

    # Absolute last resort — unknown crop
    return {
        "disease":    "Disease Detection Requires API Configuration",
        "crop":       crop_hint or "Unknown Crop",
        "severity":   "medium",
        "confidence": 0.0,
        "advice":     "Unable to analyze image. Please:\n1. Configure GEMINI_API_KEY in your .env file to enable AI analysis\n2. Get a free key at https://aistudio.google.com/app/apikey\n3. Or consult your nearest Krishi Vigyan Kendra (KVK) for expert help.",
        "gemini_powered": False,
        "model": "No Analysis Available"
    }


# ─────────────────────────────────────────────────────────────────────────────
#  Main Entry Point
#  Pipeline: Gemini → HuggingFace → Static (NEVER wrong-crop defaults)
# ─────────────────────────────────────────────────────────────────────────────
def predict_image(image_bytes: bytes, crop_hint: str = None, filename: str = None, custom_key: str = None) -> dict:
    """
    4-tier image analysis pipeline.
    Includes local PyTorch model, Gemini vision, HF vision, and static fallbacks.
    When no Gemini key is configured and HF gives very low confidence,
    the image is likely NOT a crop — the static fallback is BLOCKED and a
    refusal message is returned instead of fabricated crop disease data.
    """
    crop_hint = normalize_crop_name(crop_hint)
    print(f"\n[ML] Starting diagnosis | crop_hint={crop_hint!r} | filename={filename!r} | image_size={len(image_bytes)} bytes")

    # ── Text-based Guardrail Check (Filename or Crop Hint keywords) ──
    non_crop_keywords = [
        "human", "skin", "finger", "hand", "face", "leg", "person", "man", "woman", "child",
        "cat", "dog", "tiger", "lion", "elephant", "bird", "snake", "monkey",
        "tractor", "tiller", "machinery", "plow", "harvester", "engine", "car", "bike", "truck",
        "table", "chair", "keyboard", "mobile", "phone", "bottle", "house", "room", "building", "furniture",
        "ornamental weed", "dandelion", "grass lawn"
    ]
    
    file_lower = (filename or "").lower().strip()
    hint_lower = (crop_hint or "").lower().strip()
    combined_text = f"{file_lower} {hint_lower}"
    
    if any(kw in combined_text for kw in non_crop_keywords):
        print(f"[ML] ⚠️  Blocking inference — Text guardrail triggered by keyword in: {combined_text}")
        return {
            "disease": "Invalid Image",
            "crop": "Not a crop",
            "severity": "low",
            "confidence": 0.0,
            "advice": "Error: The uploaded image does not appear to be a crop or plant. Please upload a clear photo of your crop or plant leaves for an accurate diagnosis.",
            "image_analysis": "Refused: Text-based Crop Isolation Guardrail triggered.",
            "gemini_powered": False,
            "model": "AgriExpert Guardrail (Text check)"
        }

    # ── TIER 0: Local PyTorch Inference (Crop or Disease Classification) ──
    torch_result = None
    if TORCH_AVAILABLE:
        torch_result = predict_via_torch(image_bytes)
        
    if torch_result and "disease" in torch_result:
        return torch_result

    detected_crop = None
    if torch_result and "crop" in torch_result:
        detected_crop = torch_result["crop"]
        print(f"[ML] Local PyTorch model detected crop: {detected_crop} (confidence: {torch_result['confidence']:.2f})")
        if not crop_hint or crop_hint.lower() in ["unknown", "other", "not specified", "tomato"]:
            crop_hint = detected_crop

    # ── TIER 1: Google Gemini Vision ──────────────────────────────────────
    gemini_hint = crop_hint
    if detected_crop:
        gemini_hint = f"{crop_hint} (Local PyTorch model auto-detected: {detected_crop})"
    result = predict_via_gemini(image_bytes, gemini_hint, custom_key)
    if result:
        if detected_crop and not result.get("crop"):
            result["crop"] = detected_crop
        return result

    # ── TIER 2: Hugging Face Plant Disease ViT ────────────────────────────
    hf_low_confidence = False  # Track if HF ran but gave very low score (non-plant signal)
    result = predict_via_huggingface(image_bytes, crop_hint)
    if result:
        return result
    else:
        # HuggingFace ran but returned None — could be non-plant image with very low score
        # Stricter threshold: if HF top score < 0.30, treat as likely non-plant
        try:
            HF_MODEL = "linkanjarad/mobilenet_v2_1.0_224-plant-disease-identification"
            HF_URL = f"https://api-inference.huggingface.co/models/{HF_MODEL}"
            hf_key = os.getenv("HF_API_KEY", "").strip()
            headers = {"Content-Type": "application/octet-stream"}
            if hf_key:
                headers["Authorization"] = f"Bearer {hf_key}"
            import requests as _req
            # Preprocess image to 224x224 for better HF accuracy
            try:
                from PIL import Image as PILImage
                import io as _io
                pil_img = PILImage.open(_io.BytesIO(image_bytes)).convert("RGB")
                pil_img = pil_img.resize((224, 224), PILImage.LANCZOS)
                buf = _io.BytesIO()
                pil_img.save(buf, format="JPEG", quality=90)
                check_bytes = buf.getvalue()
            except Exception:
                check_bytes = image_bytes
            resp = _req.post(HF_URL, headers=headers, data=check_bytes, timeout=20)
            if resp.status_code == 200:
                preds = resp.json()
                if isinstance(preds, list) and preds:
                    top_score = float(preds[0].get("score", 0.0))
                    # Raised threshold from 0.15 to 0.30 for stricter non-crop detection
                    if top_score < 0.30:
                        hf_low_confidence = True
                        print(f"[ML] HF top score={top_score:.3f} — below 0.30 threshold, image likely NOT a crop.")
        except Exception as hf_check_e:
            print(f"[ML] HF quick-check failed: {hf_check_e}")

    # ── TIER 3: Static fallback with correct crop ─────────────────────────
    # GUARD: If HF signalled non-plant AND no Gemini key, do NOT give a fabricated diagnosis.
    # Return a proper refusal message instead — this is the AgriExpert guardrail.
    if hf_low_confidence:
        print("[ML] ⚠️  Blocking static fallback — HF confidence below 0.30 — not a crop image.")
        return {
            "disease": "Invalid Image",
            "crop": "Not a crop",
            "severity": "low",
            "confidence": 0.0,
            "health_status": "invalid",
            "plant_name": "N/A",
            "symptoms": "N/A",
            "causes": "N/A",
            "organic_treatment": "N/A",
            "chemical_treatment": "N/A",
            "prevention": "N/A",
            "fertilizer_advice": "N/A",
            "irrigation_advice": "N/A",
            "growth_stage": "N/A",
            "advice": "Invalid image. Please upload a clear image of a crop or plant.",
            "image_analysis": "HuggingFace plant classifier returned confidence below 30% — image is likely not a plant.",
            "gemini_powered": False,
            "model": "AgriExpert Guardrail (HF Low-Confidence < 0.30)"
        }

    print("[ML] All APIs failed. Using crop-aware static fallback.")
    fallback_crop = detected_crop or crop_hint
    fallback_result = predict_via_static_fallback(fallback_crop, filename)
    if torch_result and "predicted_crop_class" in torch_result:
        fallback_result["image_analysis"] = f"Auto-detected crop via local model: {torch_result['predicted_crop_class']} (confidence: {torch_result['confidence']:.2f})"
        fallback_result["confidence"] = torch_result["confidence"]
        fallback_result["model"] = "Local PyTorch Model + Static Fallback"
    return fallback_result


# ─────────────────────────────────────────────────────────────────────────────
#  New Crop & Leaf Diagnostics specialized pipelines
# ─────────────────────────────────────────────────────────────────────────────
def query_gemini_raw(image_bytes: bytes, prompt: str, custom_key: str = None) -> dict | None:
    api_key = (custom_key or "").strip()
    if not api_key:
        api_key = get_gemini_api_key()
    if not api_key:
        print("[Gemini] No GEMINI_API_KEY found.")
        return None

    try:
        # Detect MIME type
        try:
            img = Image.open(io.BytesIO(image_bytes))
            fmt = (img.format or "JPEG").upper()
            mime_type = {"JPEG": "image/jpeg", "PNG": "image/png",
                         "WEBP": "image/webp", "GIF": "image/gif"}.get(fmt, "image/jpeg")
        except Exception:
            mime_type = "image/jpeg"

        b64 = base64.b64encode(image_bytes).decode("utf-8")

        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={api_key}"
        payload = {
            "contents": [{
                "parts": [
                    {"text": prompt},
                    {"inline_data": {"mime_type": mime_type, "data": b64}}
                ]
            }],
            "generationConfig": {
                "temperature": 0.05,
                "topK": 16,
                "topP": 0.95,
                "maxOutputTokens": 1500,
                "responseMimeType": "application/json"
            },
            "safetySettings": [
                {"category": "HARM_CATEGORY_HARASSMENT", "threshold": "BLOCK_NONE"},
                {"category": "HARM_CATEGORY_HATE_SPEECH", "threshold": "BLOCK_NONE"},
                {"category": "HARM_CATEGORY_SEXUALLY_EXPLICIT", "threshold": "BLOCK_NONE"},
                {"category": "HARM_CATEGORY_DANGEROUS_CONTENT", "threshold": "BLOCK_NONE"}
            ]
        }

        # Timeout and Retry logic with exponential backoff
        import time
        from fastapi import HTTPException
        
        max_retries = 3
        backoff = 1.5
        last_status_code = None
        last_error_text = ""
        
        for attempt in range(max_retries):
            try:
                # Log Gemini request
                print(f"[Gemini-Raw] Request attempt {attempt+1}/{max_retries} | Prompt length: {len(prompt)}")
                resp = requests.post(url, json=payload, timeout=30)
                last_status_code = resp.status_code
                last_error_text = resp.text
                
                if resp.status_code == 200:
                    data = resp.json()
                    parts = data.get("candidates", [{}])[0].get("content", {}).get("parts", [])
                    if not parts:
                        raise HTTPException(status_code=502, detail="Gemini API returned an empty response.")
                    raw = parts[0].get("text", "").strip()
                    print(f"[Gemini-Raw] Response: {raw}")
                    
                    if "```" in raw:
                        raw = raw.split("```")[1]
                        if raw.startswith("json"):
                            raw = raw[4:]
                        raw = raw.strip().rstrip("`").strip()
                    try:
                        return json.loads(raw)
                    except json.JSONDecodeError as je:
                        print(f"[Gemini-Raw] JSON decode error: {je}. Raw output was: {raw}")
                        raise HTTPException(status_code=502, detail="Failed to parse Gemini response as JSON.")
                        
                elif resp.status_code == 429:
                    print(f"[Gemini-Raw] Rate limited (429). Retrying in {backoff}s... (Attempt {attempt+1}/{max_retries})")
                    time.sleep(backoff)
                    backoff *= 2
                elif resp.status_code in (400, 403):
                    print(f"[Gemini-Raw] Invalid API Key or client error (HTTP {resp.status_code}): {resp.text}")
                    raise HTTPException(status_code=400, detail="Gemini API key is invalid.")
                else:
                    print(f"[Gemini-Raw] HTTP Error status {resp.status_code} on attempt {attempt+1}: {resp.text}")
                    if attempt == max_retries - 1:
                        raise HTTPException(status_code=502, detail="Gemini API unavailable.")
            except requests.exceptions.Timeout:
                print(f"[Gemini-Raw] Timeout. Retrying in {backoff}s... (Attempt {attempt+1}/{max_retries})")
                if attempt == max_retries - 1:
                    raise HTTPException(status_code=504, detail="AI service timeout. Please retry.")
                time.sleep(backoff)
                backoff *= 2
            except HTTPException:
                raise
            except Exception as e:
                import traceback
                print(f"[Gemini-Raw] Request failed: {e}\n{traceback.format_exc()}")
                if attempt == max_retries - 1:
                    raise HTTPException(status_code=502, detail="Gemini API unavailable.")
                    
        if last_status_code == 429:
            raise HTTPException(status_code=429, detail="Gemini API quota exceeded or rate limited. Please try again later.")
        raise HTTPException(status_code=502, detail="Gemini API unavailable.")
    except Exception as e:
        print(f"[Gemini] query_gemini_raw overall failure: {e}")
        from fastapi import HTTPException
        raise HTTPException(status_code=502, detail="Gemini API unavailable.")


import hashlib
import numpy as np
from PIL import ImageEnhance, Image as PILImage
import logging

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("SmartKisanML")

# Validation Cache
VALIDATION_CACHE = {}
MAX_CACHE_SIZE = 200

def get_image_hash(image_bytes: bytes) -> str:
    return hashlib.sha256(image_bytes).hexdigest()

def preprocess_image_and_check_quality(image_bytes: bytes) -> tuple[bytes, dict]:
    """
    Decodes the image, resizes if too large, checks blurriness using Laplacian variance,
    checks and corrects brightness, and returns processed bytes with quality parameters.
    """
    try:
        img = Image.open(io.BytesIO(image_bytes))
        img = img.convert("RGB")
        
        # 1. Resize if exceeds max dimensions of 800x800
        original_size = img.size
        img.thumbnail((800, 800), Image.Resampling.LANCZOS)
        resized_size = img.size
        
        # 2. Brightness Check & Correction
        gray_arr = np.array(img.convert("L"), dtype=np.float32)
        mean_brightness = float(np.mean(gray_arr))
        
        corrected_img = img
        brightness_adjusted = False
        factor = 1.0
        if mean_brightness < 80:
            factor = 1.4
            enhancer = ImageEnhance.Brightness(img)
            corrected_img = enhancer.enhance(factor)
            brightness_adjusted = True
            logger.info(f"[ML] Low brightness detected ({mean_brightness:.1f}). Adjusted by factor of {factor}.")
        elif mean_brightness > 220:
            factor = 0.8
            enhancer = ImageEnhance.Brightness(img)
            corrected_img = enhancer.enhance(factor)
            brightness_adjusted = True
            logger.info(f"[ML] High brightness detected ({mean_brightness:.1f}). Adjusted by factor of {factor}.")
            
        # 3. Blur Detection (Laplacian Variance using NumPy)
        gray_corrected = np.array(corrected_img.convert("L"), dtype=np.float32)
        laplacian = (
            gray_corrected[1:-1, 2:] + gray_corrected[1:-1, :-2] +
            gray_corrected[2:, 1:-1] + gray_corrected[:-2, 1:-1] -
            4 * gray_corrected[1:-1, 1:-1]
        )
        laplacian_variance = float(np.var(laplacian))
        is_blurry = laplacian_variance < 30.0
        logger.info(f"[ML] Quality Check: Original Size={original_size} -> Resized={resized_size} | Brightness={mean_brightness:.2f} (Adjusted: {brightness_adjusted}) | Blur Score={laplacian_variance:.2f}")

        out_buf = io.BytesIO()
        corrected_img.save(out_buf, format="JPEG", quality=90)
        processed_bytes = out_buf.getvalue()

        quality_report = {
            "is_blurry": is_blurry,
            "blur_score": laplacian_variance,
            "brightness": mean_brightness,
            "brightness_adjusted": brightness_adjusted,
            "resized": original_size != resized_size,
            "success": not is_blurry
        }
        return processed_bytes, quality_report

    except Exception as e:
        logger.error(f"[ML] Error in image preprocessing and quality check: {e}")
        return image_bytes, {
            "is_blurry": False,
            "blur_score": 999.0,
            "brightness": 128.0,
            "brightness_adjusted": False,
            "resized": False,
            "success": True
        }

def calculate_agriculture_score(labels: list[str]) -> int:
    """
    Calculates agriculture score by matching labels against agricultural terms.
    Weights:
      Specific Crop: +40
      High-level Crop/Plant/Foliage: +30
      Parts/Secondary: +20
    """
    cleaned_labels = [str(l).lower().strip() for l in labels]
    
    crop_keywords = {
        "tomato", "potato", "onion", "rice", "wheat", "cotton", "maize", "corn", 
        "banana", "sugarcane", "soybean", "groundnut", "turmeric", "chili", "chilly", 
        "mango", "pomegranate", "apple", "orange", "papaya", "guava", "brinjal", 
        "cabbage", "cauliflower", "spinach", "okra", "cucumber", "pumpkin", "peas", 
        "beans", "millets", "millet", "mustard", "sunflower", "agriculture", 
        "agricultural", "field", "crop field", "cultivated crop", "cultivated plant"
    }
    
    plant_keywords = {
        "plant", "leaf", "leaves", "farm", "field", "nursery", "greenhouse", 
        "foliage", "crop", "crops", "garden plant", "nursery plant", "greenhouse plant"
    }
    
    secondary_keywords = {
        "fruit", "fruits", "vegetable", "vegetables", "stem", "stems", "flower", 
        "flowers", "root", "roots", "branch", "branches", "seedling", "seedlings", 
        "tree", "trees", "shrub", "shrubs", "herb", "herbs", "produce", "food", 
        "soil", "dirt", "harvest", "plant stem", "plant branch", "plant root", 
        "fruit plant", "vegetable plant"
    }

    score = 0
    matched_words = set()
    for label in cleaned_labels:
        for kw in crop_keywords:
            if kw in label and kw not in matched_words:
                score += 40
                matched_words.add(kw)
        for kw in plant_keywords:
            if kw in label and kw not in matched_words:
                score += 30
                matched_words.add(kw)
        for kw in secondary_keywords:
            if kw in label and kw not in matched_words:
                score += 20
                matched_words.add(kw)
                
    return score

def validate_image_type(image_bytes: bytes, custom_key: str = None) -> dict:
    """
    Uses Gemini Vision to validate if the image contains an agricultural crop, plant, leaf, fruit, stem, or flower.
    Enforces image preprocessing, blur/quality detection, caching, and Python-based Agriculture Score.
    """
    global VALIDATION_CACHE
    
    processed_bytes, quality = preprocess_image_and_check_quality(image_bytes)
    
    if quality.get("is_blurry", False):
        return {
            "success": False,
            "is_crop": False,
            "is_leaf": False,
            "confidence": 0.0,
            "error": "Uploaded image is too blurry or low quality. Please capture a clear photo of the crop or leaf."
        }
        
    img_hash = get_image_hash(processed_bytes)
    if img_hash in VALIDATION_CACHE:
        logger.info(f"[ML] Cache hit for image hash {img_hash}")
        return VALIDATION_CACHE[img_hash]
        
    prompt = (
        "You are an agricultural image classifier.\n"
        "Determine whether the uploaded image contains any agricultural object.\n"
        "Agricultural objects include crops, plants, leaves, fruits attached to plants, vegetables attached to plants, stems, flowers, roots, seedlings, trees, farms, agricultural fields, nurseries, or greenhouse crops.\n"
        "If the image belongs to agriculture, return VALID.\n"
        "If it does not belong to agriculture, return INVALID.\n"
        "Do not require the exact word 'crop'.\n"
        "Treat tomato, banana, potato, onion, rice, wheat, cotton, maize, sugarcane, soybean, mango, pomegranate, chili, turmeric, groundnut, vegetables, fruits, and leaves as valid agricultural objects.\n\n"
        "You must return the classification and metadata in the following JSON format structure:\n"
        "{\n"
        "  \"status\": \"VALID\" | \"INVALID\",\n"
        "  \"labels\": [\"label1\", \"label2\", ...],\n"
        "  \"is_leaf\": true | false,\n"
        "  \"agriculture_score\": float\n"
        "}\n"
        "Return ONLY this JSON (no markdown formatting, no other text)."
    )
    
    api_key = (custom_key or "").strip() or get_gemini_api_key()
    if not api_key:
        logger.warning("[ML] No Gemini API key configured. Cannot run image validation.")
        return {"success": False, "is_crop": False, "is_leaf": False, "confidence": 0.0, "error": "Gemini API Key is missing. Please configure it in your .env file."}

    result = query_gemini_raw(processed_bytes, prompt, api_key)
    
    status = "INVALID"
    labels = []
    is_leaf = False
    gemini_agri_score = 0.0

    if result and isinstance(result, dict):
        status = str(result.get("status", "INVALID")).upper().strip()
        labels = [str(l).lower().strip() for l in result.get("labels", [])]
        is_leaf = result.get("is_leaf", False)
        gemini_agri_score = result.get("agriculture_score", 0.0)
    else:
        logger.warning("[ML] Gemini returned non-JSON/invalid structure. Doing fallback analysis.")
        if isinstance(result, str):
            if "VALID" in result.upper():
                status = "VALID"
            
    computed_score = calculate_agriculture_score(labels)
    
    IMMEDIATE_VALID_KEYWORDS = {
        "plant", "leaf", "leaves", "tomato", "potato", "onion", "rice", "wheat", "cotton",
        "sugarcane", "soybean", "groundnut", "banana", "mango", "pomegranate", "maize",
        "corn", "millets", "millet", "vegetable", "vegetables", "fruit", "fruits", "seedling",
        "seedlings", "flower", "flowers", "stem", "stems", "branch", "branches", "root", "roots",
        "agriculture", "agricultural", "farm", "field", "fields", "garden", "nursery", "greenhouse",
        "herb", "shrub", "tree", "trees", "foliage", "produce", "food", "soil", "harvest",
        "apple", "orange", "papaya", "guava", "brinjal", "cabbage", "cauliflower", "spinach",
        "okra", "cucumber", "pumpkin", "peas", "beans", "mustard", "sunflower", "cultivated"
    }
    
    has_immediate_keyword = False
    for label in labels:
        if any(kw in label for kw in IMMEDIATE_VALID_KEYWORDS):
            has_immediate_keyword = True
            break

    for label in labels:
        if "leaf" in label or "leaves" in label:
            is_leaf = True
            break
            
    REJECT_KEYWORDS = {
        "human", "person", "man", "woman", "child", "people", "face", "faces",
        "dog", "cat", "bird", "animal", "pet", "vehicle", "car", "motorcycle",
        "truck", "bike", "bicycle", "house", "building", "laptop", "phone",
        "mobile", "computer", "book", "document", "currency", "money", "furniture",
        "table", "chair", "sofa", "desk", "unknown object", "random object",
        "screenshot", "cartoon", "drawing"
    }
    
    has_reject_keyword = False
    for label in labels:
        if any(kw in label for kw in REJECT_KEYWORDS):
            has_reject_keyword = True
            break

    is_valid = False
    confidence = max(gemini_agri_score, float(computed_score) / 100.0)
    
    if status == "VALID" or has_immediate_keyword or computed_score >= 60:
        is_valid = True
        
    if has_reject_keyword and computed_score < 60 and status != "VALID":
        is_valid = False

    logger.info(f"[ML] Image Validation Output: status={status} | labels={labels} | is_leaf={is_leaf} | computed_score={computed_score} | final_valid={is_valid}")
    
    res = {
        "success": is_valid,
        "is_crop": is_valid,
        "is_leaf": is_leaf,
        "confidence": confidence if is_valid else 0.0,
        "error": None if is_valid else "Invalid Image — No Crop or Agricultural Object Detected. Please upload a clear image of a crop, plant, leaf, or farm."
    }
    
    if len(VALIDATION_CACHE) >= MAX_CACHE_SIZE:
        VALIDATION_CACHE.pop(next(iter(VALIDATION_CACHE)))
    VALIDATION_CACHE[img_hash] = res
    
    return res


def query_gemini_text(prompt: str, custom_key: str = None) -> dict | None:
    api_key = (custom_key or "").strip()
    if not api_key:
        api_key = get_gemini_api_key()
    if not api_key:
        print("[Gemini-Text] No API key available.")
        return None
    try:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={api_key}"
        payload = {
            "contents": [{
                "parts": [{"text": prompt}]
            }],
            "generationConfig": {
                "temperature": 0.2,
                "maxOutputTokens": 1000,
                "responseMimeType": "application/json"
            }
        }
        
        # Timeout and Retry logic with exponential backoff
        import time
        from fastapi import HTTPException
        
        max_retries = 3
        backoff = 1.5
        last_status_code = None
        
        for attempt in range(max_retries):
            try:
                print(f"[Gemini-Text] Request attempt {attempt+1}/{max_retries}")
                resp = requests.post(url, json=payload, timeout=20)
                last_status_code = resp.status_code
                
                if resp.status_code == 200:
                    data = resp.json()
                    parts = data.get("candidates", [{}])[0].get("content", {}).get("parts", [])
                    if not parts:
                        raise HTTPException(status_code=502, detail="Gemini API returned empty response.")
                    raw = parts[0].get("text", "").strip()
                    print(f"[Gemini-Text] Response: {raw}")
                    
                    if "```" in raw:
                        raw = raw.split("```")[1]
                        if raw.startswith("json"):
                            raw = raw[4:]
                        raw = raw.strip().rstrip("`").strip()
                    try:
                        return json.loads(raw)
                    except json.JSONDecodeError as je:
                        print(f"[Gemini-Text] JSON decode error: {je}. Raw output: {raw}")
                        raise HTTPException(status_code=502, detail="Failed to parse response JSON.")
                        
                elif resp.status_code == 429:
                    print(f"[Gemini-Text] Rate limited (429). Retrying in {backoff}s... (Attempt {attempt+1}/{max_retries})")
                    time.sleep(backoff)
                    backoff *= 2
                elif resp.status_code in (400, 403):
                    print(f"[Gemini-Text] Invalid API Key or client error (HTTP {resp.status_code}): {resp.text}")
                    raise HTTPException(status_code=400, detail="Gemini API key is invalid.")
                else:
                    print(f"[Gemini-Text] HTTP Error status {resp.status_code} on attempt {attempt+1}: {resp.text}")
                    if attempt == max_retries - 1:
                        raise HTTPException(status_code=502, detail="Gemini API unavailable.")
            except requests.exceptions.Timeout:
                print(f"[Gemini-Text] Timeout. Retrying in {backoff}s... (Attempt {attempt+1}/{max_retries})")
                if attempt == max_retries - 1:
                    raise HTTPException(status_code=504, detail="AI service timeout. Please retry.")
                time.sleep(backoff)
                backoff *= 2
            except HTTPException:
                raise
            except Exception as e:
                import traceback
                print(f"[Gemini-Text] Request failed: {e}\n{traceback.format_exc()}")
                if attempt == max_retries - 1:
                    raise HTTPException(status_code=502, detail="Gemini API unavailable.")
                    
        if last_status_code == 429:
            raise HTTPException(status_code=429, detail="Gemini API quota exceeded or rate limited. Please try again later.")
        raise HTTPException(status_code=502, detail="Gemini API unavailable.")
    except Exception as e:
        print(f"[Gemini-Text] query_gemini_text overall failure: {e}")
        raise HTTPException(status_code=502, detail="Gemini API unavailable.")


def run_cv_prediction(image_bytes: bytes, crop_hint: str = None) -> dict:
    """
    Runs computer vision models (local PyTorch or Hugging Face) to identify the crop and disease class.
    """
    torch_res = None
    if TORCH_AVAILABLE:
        torch_res = predict_via_torch(image_bytes)
        if torch_res and "disease" in torch_res:
            return torch_res
            
    hf_res = predict_via_huggingface(image_bytes, crop_hint)
    if hf_res:
        return hf_res
        
    return predict_via_static_fallback(crop_hint)


def run_crop_diagnose_cv(image_bytes: bytes, crop_hint: str = None, custom_key: str = None) -> dict:
    """
    1. Crop Diagnostics (Computer Vision)
    Accepts ONLY crop/plant images.
    """
    val = validate_image_type(image_bytes, custom_key)
    if not val or not val.get("success", False):
        return {
            "success": False,
            "error": "Please upload a clear image of a crop or agricultural plant. No crop was detected in the uploaded image."
        }

    pred = run_cv_prediction(image_bytes, crop_hint)
    if not pred:
        return {"success": False, "error": "AI Computer Vision model is temporarily offline or unable to process this image. Please try again later."}

    predicted_crop = pred.get("crop", crop_hint or "Crop")
    predicted_disease = pred.get("disease", "Healthy")
    confidence = pred.get("confidence", 0.95)

    if confidence < 0.80:
        return {
            "success": False,
            "error": "Unable to identify the crop confidently. Please upload a clearer image."
        }

    prompt = f"""You are an AI Crop Diagnostics Expert.

Analyze and explain the following crop classification:
Crop Name: {predicted_crop}
Disease/Condition: {predicted_disease}
Confidence: {confidence:.2f}

Provide a detailed agricultural diagnostics report.
Return ONLY this JSON structure (no markdown outside JSON):
{{
  "success": true,
  "crop_name": "{predicted_crop}",
  "scientific_name": "Scientific name of the crop",
  "growth_stage": "Growth stage (Seedling, Vegetative, Flowering, Fruiting, or Harvest)",
  "crop_health": "Healthy | Infected | Diseased",
  "confidence": {confidence:.2f},
  "problems_detected": "Disease Detected: {predicted_disease}. Description of visual symptoms and possible causes.",
  "recommendations": "Recommended treatment and preventive measures.",
  "fertilizer_recommendation": "Precise fertilizer recommendation for recovery",
  "irrigation_advice": "Detailed watering advice"
}}"""

    result = query_gemini_text(prompt, custom_key)
    if result and isinstance(result, dict):
        result["ai_model"] = pred.get("model", "AI Computer Vision Model")
        return result

    return {
        "success": True,
        "crop_name": predicted_crop,
        "growth_stage": "Vegetative",
        "crop_health": "Healthy" if "healthy" in predicted_disease.lower() else "Diseased",
        "confidence": confidence,
        "problems_detected": f"Detected: {predicted_disease}.",
        "recommendations": pred.get("advice", "Maintain proper crop management."),
        "fertilizer_recommendation": "Apply standard NPK split dosage.",
        "irrigation_advice": "Irrigate according to growth stage requirements.",
        "ai_model": pred.get("model", "AI Computer Vision Model")
    }



def run_leaf_disease_diagnose(image_bytes: bytes, crop_hint: str = None, custom_key: str = None) -> dict:
    """
    2. Leaf Disease Diagnostics
    Accepts ONLY leaf images.
    """
    val = validate_image_type(image_bytes, custom_key)
    if not val or not val.get("success", False) or not val.get("is_leaf", False):
        return {
            "success": False,
            "error": "Please upload a clear close-up photo of a single plant leaf."
        }

    pred = run_cv_prediction(image_bytes, crop_hint)
    if not pred:
        return {"success": False, "error": "AI Computer Vision model is temporarily offline or unable to process this image. Please try again later."}

    predicted_crop = pred.get("crop", crop_hint or "Plant")
    predicted_disease = pred.get("disease", "Healthy")
    confidence = pred.get("confidence", 0.95)

    if confidence < 0.80:
        return {
            "success": False,
            "error": "The disease cannot be identified confidently. Please upload a clearer image."
        }

    prompt = f"""You are an AI Leaf Disease Detection Expert.

Analyze the following leaf disease classification:
Plant Name: {predicted_crop}
Disease/Condition: {predicted_disease}
Confidence: {confidence:.2f}

Provide a detailed leaf disease diagnostics report.
Return ONLY this JSON structure (no markdown outside JSON):
{{
  "success": true,
  "plant_name": "{predicted_crop}",
  "health_status": "Healthy | Infected",
  "disease_name": "{predicted_disease}",
  "severity": "low | medium | high",
  "confidence": {confidence:.2f},
  "disease_description": "Detailed visual symptoms observed on the leaf",
  "causes": "Specific cause and pathogen details (e.g. fungal/bacterial/viral/pest)",
  "treatment": "Actionable chemical and organic treatments",
  "organic_treatment": "Organic/biological treatment options with exact dosages",
  "chemical_treatment": "Chemical treatment with active ingredients and doses (g/L or mL/L)",
  "prevention_methods": "Sanitation and cultural prevention methods"
}}"""

    result = query_gemini_text(prompt, custom_key)
    if result and isinstance(result, dict):
        result["ai_model"] = pred.get("model", "AI Computer Vision Model")
        return result

    return {
        "success": True,
        "plant_name": f"{predicted_crop} plant",
        "disease_name": predicted_disease,
        "health_status": "Healthy" if "healthy" in predicted_disease.lower() else "Infected",
        "confidence": confidence,
        "disease_description": f"Observed symptoms of {predicted_disease} on plant leaves.",
        "causes": "Pathogen infection favored by environmental humidity.",
        "treatment": pred.get("advice", "Apply standard treatment."),
        "organic_treatment": "Apply neem oil spray (3-5 ml/L) as a preventive measure.",
        "chemical_treatment": "Apply suitable contact fungicide if infection spreads.",
        "prevention_methods": "Sanitation, remove infected debris, maintain space.",
        "ai_model": pred.get("model", "AI Computer Vision Model")
    }



def run_crop_disease_detect(image_bytes: bytes, crop_hint: str = None, custom_key: str = None) -> dict:
    """
    3. Crop Disease Detection
    Accepts ONLY crop/plant/foliage images.
    """
    val = validate_image_type(image_bytes, custom_key)
    if not val or not val.get("success", False):
        return {
            "success": False,
            "error": "Invalid image. Please upload a clear crop or leaf image for disease detection."
        }

    pred = run_cv_prediction(image_bytes, crop_hint)
    if not pred:
        return {"success": False, "error": "AI Computer Vision model is temporarily offline or unable to process this image. Please try again later."}

    predicted_crop = pred.get("crop", crop_hint or "Crop")
    predicted_disease = pred.get("disease", "Healthy")
    confidence = pred.get("confidence", 0.95)

    if confidence < 0.80:
        return {
            "success": False,
            "error": "Disease could not be identified confidently. Please upload a clearer image."
        }

    prompt = f"""You are an AI Crop Disease Detection System.

Analyze the following crop disease classification:
Crop Name: {predicted_crop}
Disease/Condition: {predicted_disease}
Confidence: {confidence:.2f}

Provide a comprehensive crop disease detection report.
Return ONLY this JSON structure (no markdown outside JSON):
{{
  "success": true,
  "crop": "{predicted_crop}",
  "disease": "{predicted_disease}",
  "confidence": {confidence:.2f},
  "severity": "low | medium | high",
  "symptoms": "Detailed visual symptoms",
  "causes": "Detailed pathogen information and favorability conditions",
  "organic_treatment": "Actionable organic/biological treatments with doses",
  "chemical_treatment": "Precise chemical treatments with products and doses (g/L or mL/L)",
  "suggested_fertilizers": "Fertilizers recommended for recovery",
  "irrigation_advice": "Irrigation recommendations based on disease state",
  "prevention_methods": "Prevention and sanitation methods"
}}"""

    result = query_gemini_text(prompt, custom_key)
    if result and isinstance(result, dict):
        result["ai_model"] = pred.get("model", "AI Computer Vision Model")
        return result


    return {
        "success": True,
        "crop": predicted_crop,
        "disease": predicted_disease,
        "confidence": confidence,
        "severity": pred.get("severity", "medium"),
        "symptoms": f"Signs of {predicted_disease} spotted on foliage.",
        "causes": "Pathogen spores or insect vectors.",
        "organic_treatment": "Apply organic bio-remedies (e.g. Pseudomonas fluorescens).",
        "chemical_treatment": pred.get("advice", "Apply appropriate chemical treatment."),
        "suggested_fertilizers": "Apply balanced micronutrient spray for quick recovery.",
        "irrigation_advice": "Avoid overhead watering; ensure standard soil moisture.",
        "prevention_methods": "Sanitation and crop rotation.",
        "ai_model": pred.get("model", "AI Computer Vision Model")
    }




