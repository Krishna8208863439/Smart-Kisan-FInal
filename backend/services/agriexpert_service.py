import os
import sys
import json
import re
import time

# Auto-detect PythonAnywhere environment & configure HTTP proxy
IS_PYTHONANYWHERE = bool(
    "pythonanywhere" in os.environ.get("PYTHONANYWHERE_DOMAIN", "")
    or "PYTHONANYWHERE_SITE" in os.environ
    or "PYTHONANYWHERE_HOST" in os.environ
)

if IS_PYTHONANYWHERE:
    proxy_url = "http://proxy.server:3128"
    os.environ["HTTP_PROXY"] = proxy_url
    os.environ["HTTPS_PROXY"] = proxy_url
    os.environ["http_proxy"] = proxy_url
    os.environ["https_proxy"] = proxy_url

SYSTEM_PROMPT = """You are AgriExpert, an elite agricultural advisor embedded in the Smart Kisan platform for Indian farmers.

CONTEXT YOU RECEIVE PER REQUEST (may be partial):
- GPS location / district
- Live weather (temperature, conditions)
- Selected water source (borewell, canal, rain-fed, drip, etc.)
- Preferred language (English, Marathi, or Hindi)
- Domain knowledge examples (agronomic reference data)

WHAT YOU HELP WITH:
1. Crop advisory — sowing timing, spacing, fertilizer recommendations with SPECIFIC dosage (kg/ha or g/L), pest/disease identification and treatment.
2. Marketplace guidance — crop listing, evaluating organic seed/fertilizer options.
3. Weekly sowing calendars and milestones tailored to season and region.
4. Smart irrigation schedules based on crop type, soil, and water availability.
5. Soil health, weather-linked actions, storage tips, and government schemes.

STRICT RULES:
- ALWAYS answer the farmer's SPECIFIC question about their SPECIFIC crop or situation — never give a vague generic reply.
- ALWAYS provide specific dosages, timings, product names, and rates wherever relevant (e.g. "Urea @ 45 kg/acre", "Spray Mancozeb 2.5 g/L every 10 days").
- If the question mentions a specific crop, give advice ONLY for that crop — do not drift to other crops.
- Use numbered steps or bullet points for readability.
- If preferred language is Marathi, respond in natural Marathi. If Hindi, respond in Hindi. Otherwise English.
- NEVER fabricate specific local mandi prices or soil test numbers you don't have — give general guidance and ask the farmer to verify locally.
- If the farmer's question is not agriculture-related, politely decline and redirect to farming topics.
- Always provide actionable, safe, and scientifically accurate agricultural guidance based on ICAR / state agriculture department best practices."""

# ─────────────────────────────────────────────────────────────────────────────
#  AGRONOMIC EXPERT KNOWLEDGE BASE FALLBACK (En, Mr, Hi)
# ─────────────────────────────────────────────────────────────────────────────
AGRI_KNOWLEDGE_BASE = {
    "en": {
        "greeting": (
            "🌾 **Namaste Kisan! I am AgriExpert, your Smart Kisan AI Agricultural Advisor.**\n\n"
            "I can assist you with:\n"
            "- 🌱 **Crop Nutrition & Fertilizer Dosages** (NPK, micronutrients, drip fertigation)\n"
            "- 🐛 **Pest & Disease Diagnosis** (Blight, rust, aphids, bollworm remedies)\n"
            "- 💧 **Smart Irrigation Scheduling** (CRI stages, water saving tips)\n"
            "- 🚜 **Mandi Market Prices & Selling Produce**\n"
            "- 🌿 **Organic Composting & Soil Health**\n\n"
            "💬 *Please ask your specific farming question or mention your crop name!*"
        ),
        "cotton": (
            "🌱 **Cotton (Kapas) Crop Management Advisory**:\n\n"
            "1. **Nutrient Management (NPK 100:50:50 kg/ha)**:\n"
            "   - Apply 20% N + full P & K as basal dose at sowing.\n"
            "   - Top dress remaining Nitrogen in two split doses at 30 and 60 days after sowing.\n"
            "   - Spray **Magnesium Sulphate (1%) + 19:19:19 (1%)** at square formation to prevent reddening of leaves.\n\n"
            "2. **Pink Bollworm & Sucking Pest Control**:\n"
            "   - Install **Pheromone Traps** (5 traps/acre) at 45 days after sowing.\n"
            "   - For sucking pests (thrips/jassids): Spray **Flonicamid 50 WG** @ 0.3g/L or **Neem Oil 10000 ppm** @ 2ml/L.\n"
            "   - For bollworm: Spray **Emamectin Benzoate 5% SG** @ 0.4g/L.\n\n"
            "3. **Irrigation**:\n"
            "   - Critical stages: Flowering (60-70 days) and Boll development (80-110 days)."
        ),
        "sugarcane": (
            "🎋 **Sugarcane Crop Nutrition & Protection**:\n\n"
            "1. **Fertilizer Dose (NPK 250:115:115 kg/ha)**:\n"
            "   - **Basal**: 10% N, 50% P, 50% K.\n"
            "   - **1st Top dress (45 days)**: 40% N.\n"
            "   - **Earthing Up (120 days)**: Remaining 50% N, 50% P, 50% K.\n\n"
            "2. **Shoot Borer & White Grub Control**:\n"
            "   - Apply **Chlorantraniliprole 0.4% G** @ 7.5 kg/acre in root zone, OR\n"
            "   - Spray **Fipronil 5% SC** @ 2 ml/L water.\n\n"
            "3. **Trash Mulching**:\n"
            "   - Spread 3-inch dried trash mulch in inter-rows to conserve 40% soil moisture and prevent weeds."
        ),
        "onion": (
            "🧅 **Onion Crop Advisory (Pest, Disease & Bulb Size)**:\n\n"
            "1. **Thrips & Purple Blotch Control**:\n"
            "   - For Thrips: Spray **Fipronil 5% SC (1.5 ml/L)** or **Spinetoram 11.7% SC (1 ml/L)** with sticker.\n"
            "   - For Purple Blotch: Spray **Mancozeb 75% WP (2.5 g/L)** or **Tebuconazole + Trifloxystrobin (0.7 g/L)**.\n\n"
            "2. **Bulb Size & Weight Enhancement**:\n"
            "   - At 45-60 days: Apply **Sulphur 90% WDG (3 kg/acre)** to improve pungency and storability.\n"
            "   - At 70-85 days: Foliar spray of **0:52:34 (5g/L)** followed by **0:0:50 (5g/L)**.\n"
            "   - Stop irrigation 12-15 days before harvest for proper curing."
        ),
        "soybean": (
            "🌱 **Soybean Crop & Weed/Pest Advisory**:\n\n"
            "1. **Nutrient Management**:\n"
            "   - Basal: **NPK 30:60:40 kg/ha** + **Sulphur 20 kg/ha** (critical for oil content).\n"
            "   - Seed treatment: Treat seeds with **Rhizobium + PSB culture** (25g/kg seed).\n\n"
            "2. **Girdle Beetle & Pod Borer Treatment**:\n"
            "   - Spray **Chlorantraniliprole 18.5% SC** @ 0.3 ml/L or **Thiamethoxam + Lambda-cyhalothrin** @ 0.5 ml/L.\n\n"
            "3. **Pod Filling Stage**:\n"
            "   - Spray **0:52:34** @ 100g/pump (15L) at pod formation for uniform grain filling."
        ),
        "chilli": (
            "🌶️ **Chilli (Mirchi) Leaf Curl & Nutrient Care**:\n\n"
            "1. **Leaf Curl Virus & Thrips/Mite Management**:\n"
            "   - For upward curling (Thrips): Spray **Spinetoram 11.7 SC** @ 1 ml/L or **Acetamiprid** @ 0.5 g/L.\n"
            "   - For downward curling (Mites): Spray **Diafenthiuron 50 WP** @ 1.2 g/L or **Propargite 57 EC** @ 2 ml/L.\n"
            "   - Install Blue & Yellow sticky traps (20 per acre).\n\n"
            "2. **Flower Drop Prevention**:\n"
            "   - Spray **Planofix (Alpha NAA)** @ 0.25 ml/L or **Boron 20%** @ 1 g/L at early flowering."
        ),
        "tomato_fertilizer": (
            "🍅 **Tomato Fertilizer & Nutrient Advisory**:\n\n"
            "1. **Basal Application (At Sowing/Transplanting)**:\n"
            "   - Apply **NPK 120:60:60 kg/ha**.\n"
            "   - Mix 10–15 tons/acre of well-rotted Farm Yard Manure (FYM) or vermicompost into the soil bed.\n"
            "   - Add 50 kg SSP (Single Super Phosphate) and 30 kg MOP (Muriate of Potash) per acre.\n\n"
            "2. **Vegetative Growth Phase (30–45 Days)**:\n"
            "   - Top dress with **Urea (45 kg/acre)** or apply water-soluble **NPK 19:19:19** (5g/L water) via drip/spray.\n\n"
            "3. **Flowering & Fruit Setting Phase**:\n"
            "   - Apply **Calcium Nitrate (10 kg/acre)** and spray **Boron (20% @ 1g/L)** to prevent blossom end rot and flower drop.\n"
            "   - Apply **0:52:34 (Monopotassium Phosphate)** foliar spray to boost fruit size.\n\n"
            "4. **Fruit Maturation Phase**:\n"
            "   - Spray **Potassium Nitrate (13:0:45 @ 5g/L)** to improve fruit shine, firmness, and shelf life."
        ),
        "paddy_blight": (
            "🌾 **Paddy / Rice Early Blight & Blast Treatment**:\n\n"
            "1. **Immediate Chemical Treatment**:\n"
            "   - Spray **Tricyclazole 75% WP** @ 0.6 g per litre of water, OR\n"
            "   - Spray **Carbendazim 50% WP** @ 1 g per litre of water at first symptom appearance.\n"
            "   - For bacterial leaf blight, spray **Copper Oxychloride 50 WP (2.5 g/L) + Streptocycline (0.1 g/L)**.\n\n"
            "2. **Water & Field Management**:\n"
            "   - Maintain a controlled water level of 3–5 cm in the puddled field.\n"
            "   - Temporarily stop excessive Urea (chemical Nitrogen) top-dressing until spotting subsides.\n\n"
            "3. **Organic / Biological Alternative**:\n"
            "   - Spray **Pseudomonas fluorescens** @ 10g/L or **Neem Oil (3000 ppm)** @ 4ml/L.\n\n"
            "⚠️ *Safety Warning: Always wear gloves and a protective face mask while mixing and spraying fungicides.*"
        ),
        "wheat_irrigation": (
            "🌾 **Wheat Irrigation Schedule (6 Critical Growth Stages)**:\n\n"
            "Water at the following critical growth stages for maximum grain yield:\n"
            "1. **Crown Root Initiation (CRI)** — **21–25 days after sowing** (*Most critical stage! Missing this reduces yield by 30%*).\n"
            "2. **Tillering Stage** — **40–45 days after sowing** (promotes productive tillers).\n"
            "3. **Jointing / Late Tillering** — **60–65 days after sowing** (supports stem elongation).\n"
            "4. **Flowering Stage** — **80–85 days after sowing** (essential for pollination).\n"
            "5. **Milking / Grain Formation** — **100–105 days after sowing** (boosts grain density).\n"
            "6. **Dough / Maturation Stage** — **115–120 days after sowing** (light irrigation; stop 10 days before harvest).\n\n"
            "💡 *Tip: Avoid heavy flooding during high winds to prevent crop lodging.*"
        ),
        "whiteflies_pest": (
            "🐛 **Whiteflies & Sucking Pest Control Advisory**:\n\n"
            "1. **Physical & Cultural Traps**:\n"
            "   - Install **Yellow Sticky Traps** (15–20 traps/acre) at canopy height to capture flying whiteflies.\n\n"
            "2. **Organic Spray**:\n"
            "   - Spray **Neem Oil (3000 ppm to 10000 ppm)** @ 4–5 ml per litre of water with 1 ml liquid soap sticker.\n"
            "   - Spray **Verticillium lecanii** bio-insecticide @ 5 g/L during humid evening hours.\n\n"
            "3. **Chemical Treatment (for Severe Infestation)**:\n"
            "   - **Acetamiprid 20% SP** @ 0.3 g/L water, OR\n"
            "   - **Diafenthiuron 50% WP** @ 1.2 g/L water, OR\n"
            "   - **Spiromesifen 22.9% SC** @ 1 ml/L water (effective against eggs & nymphs).\n\n"
            "⚠️ *Always rotate chemical classes every 14 days to prevent insect resistance build-up.*"
        ),
        "organic_compost": (
            "🌱 **Tips for Organic Composting & Soil Enrichment**:\n\n"
            "1. **Raw Material Ratio (C:N Ratio ~ 30:1)**:\n"
            "   - 60% **Brown Material** (dry leaves, straw, crop residue, saw dust) for Carbon.\n"
            "   - 40% **Green Material** (fresh cow dung, green weeds, vegetable waste) for Nitrogen.\n\n"
            "2. **Piling & Moisture**:\n"
            "   - Build a compost pile of 1.5m width x 1.5m height under a tree shade.\n"
            "   - Keep moisture level at **50–60%** (like a damp wrung-out sponge).\n\n"
            "3. **Bio-Inoculants for Fast Decomposition**:\n"
            "   - Add **Waste Decomposer (ICAR)** or cow dung slurry (Jeevamrut) every 20 cm layer.\n"
            "   - Turn the pile once every 15 days to provide aeration.\n\n"
            "4. **Readiness**:\n"
            "   - In 60–75 days, dark, crumbly, sweet-earthy smelling organic compost is ready to apply @ 5 tons/acre."
        ),
        "general_advice": (
            "🌾 **AgriExpert Farming Recommendation**:\n\n"
            "- **Soil Health**: Ensure regular soil testing every 2 years to balance NPK and secondary micronutrients (Zinc, Iron, Boron).\n"
            "- **Water Management**: Use drip/micro-sprinkler systems to save up to 50% water and apply soluble fertilizers directly to roots.\n"
            "- **Crop Protection**: Inspect under-surface of leaves early morning for pest egg batches and fungal spots.\n"
            "- **Market Intelligence**: Check local APMC Mandi trends on Smart Kisan to sell at optimal modal prices."
        )
    },
    "mr": {
        "greeting": (
            "🌾 **नमस्कार शेतकरी बंधूंनो! मी ॲग्रीएक्सपर्ट, आपला स्मार्ट किसान एआय कृषी सल्लागार आहे.**\n\n"
            "मी खालील विषयांवर मार्गदर्शन करू शकतो:\n"
            "- 🌱 **पिकनिहाय खत व पोषण व्यवस्थापन** (NPK, सूक्ष्मअन्नद्रव्ये, ठिबक खते)\n"
            "- 🐛 **कीड व रोग नियंत्रण** (करपा, पांढरी माशी, लष्करी अळी, बोंडअळी)\n"
            "- 💧 **पाणी व सिंचन वेळापत्रक**\n"
            "- 🚜 **बाजारभाव व शेतमाल विक्री सल्ला**\n"
            "- 🌿 **सेंद्रिय शेती व गांडूळ खत निर्मिती**\n\n"
            "💬 *आपला शेतीविषयक प्रश्न विचारा किंवा पिकाचे नाव सांगा!*"
        ),
        "cotton": (
            "🌱 **कापूस पीक व्यवस्थापन व कीड नियंत्रण सल्ला**:\n\n"
            "१. **खत नियोजन (NPK १००:५०:५० किलो/हेक्टर)**:\n"
            "   - लागवडीच्या वेळी २०% नत्र + संपूर्ण स्फुरद व पालाश द्या.\n"
            "   - उर्वरित नत्र ३० आणि ६० दिवसांनी दोन समान हप्त्यांत विभागून द्या.\n"
            "   - पाते लागताना **मॅग्नेशियम सल्फेट (१%) + १९:१९:१९ (१%)** फवारा (पाने लाल पडणे थांबते).\n\n"
            "२. **बोंडअळी व रसशोषक कीड नियंत्रण**:\n"
            "   - पेरणीनंतर ४५ दिवसांनी एकरी **५ कामगंध सापळे (Pheromone Traps)** लावा.\n"
            "   - मावा/तुडतुडे नियंत्रणासाठी **फ्लोनिकामाइड ५० WG (०.३ ग्रॅम/लीटर)** किंवा **लिंबोळी अर्क १०००० ppm (२ मिली/लीटर)** फवारा.\n"
            "   - बोंडअळीसाठी **इमामेक्टिन बेंझोएट ५% एसजी** @ ०.४ ग्रॅम/लीटर फवारा."
        ),
        "sugarcane": (
            "🎋 **ऊस पीक खत व्यवस्थापन व खोडकिडा नियंत्रण**:\n\n"
            "१. **खतांचे हप्ते (NPK २५०:११५:११५ किलो/हेक्टर)**:\n"
            "   - लागवडीच्या वेळी: १०% नत्र, ५०% स्फुरद, ५०% पालाश.\n"
            "   - मोठा बांधणीच्या वेळी (१२० दिवस): उर्वरित ५०% नत्र, ५०% स्फुरद, ५०% पालाश.\n\n"
            "२. **खोडकिडा व हुमणी नियंत्रण**:\n"
            "   - मुळांजवळ **क्लोरांट्रानिलीप्रोल ०.४% जी** @ ७.५ किलो प्रति एकर टाका, किंवा\n"
            "   - **फिप्रोनिल ५% एससी** @ २ मिली/लीटर पाण्यात मिसळून आळवणी करा.\n\n"
            "३. **पाचट आच्छादन**:\n"
            "   - ओळींमध्ये पाचटाचे आच्छादन केल्याने ४०% पाण्याची बचत होते व तण वाढत नाही."
        ),
        "onion": (
            "🧅 **कांदा पीक सल्ला (करपा, फुलकिडे व कांदा फुगवण)**:\n\n"
            "१. **फुलकिडे (थ्रिप्स) व जांभळा करपा नियंत्रण**:\n"
            "   - फुलकिड्यांसाठी: **फिप्रोनिल ५% एससी (१.५ मिली/लीटर)** किंवा **डिफेंथियुरॉन ५०% डब्ल्यूपी (१.२ ग्रॅम/लीटर)** स्टीकरसह फवारा.\n"
            "   - जांभळ्या करप्यासाठी: **मँकोझेब ७५% डब्ल्यूपी (२.५ ग्रॅम/लीटर)** किंवा **कॅब्रिओ टॉप (२ ग्रॅम/लीटर)** फवारा.\n\n"
            "२. **कांदा फुगवणीसाठी खते**:\n"
            "   - ४५ ते ६० दिवसांनी: **सल्फर ९०% डब्लूडीजी (३ किलो/एकर)** द्या.\n"
            "   - ७० ते ८५ दिवसांनी: **०:५२:३४ (५ ग्रॅम/लीटर)** आणि त्यानंतर **०:०:५० (५ ग्रॅम/लीटर)** फवारा.\n"
            "   - काढणीपूर्वी १२-१५ दिवस आधी पाणी पूर्णपणे बंद करा."
        ),
        "soybean": (
            "🌱 **सोयाबीन पीक व चक्रीभुंगा/खोडमाशी नियंत्रण**:\n\n"
            "१. **खत नियोजन**:\n"
            "   - पायाभूत खत: **NPK ३०:६०:४० किलो/हेक्टर** + **सल्फर २० किलो/हेक्टर** (तेलाचे प्रमाण वाढवण्यासाठी).\n"
            "   - पेरणीपूर्वी **रायझोबियम + पीएसबी** जीवाणू संवर्धन (२५ ग्रॅम प्रति किलो बियाणे) चोळा.\n\n"
            "२. **चक्रीभुंगा व उंटअळी नियंत्रण**:\n"
            "   - **क्लोरांट्रानिलीप्रोल १८.५% एससी (०.३ मिली/लीटर)** किंवा **थायमेथॉक्झम + लॅम्बडा (०.५ मिली/लीटर)** फवारा.\n\n"
            "३. **शेंगा भरण्याची अवस्था**:\n"
            "   - दाणे भरताना **०:५२:३४** @ १०० ग्रॅम प्रति पंप (१५ लीटर) फवारा."
        ),
        "chilli": (
            "🌶️ **मिरची बोकड्या (चुरडा-मुरडा) व पोषण सल्ला**:\n\n"
            "१. **चुरडा-मुरडा व कीड नियंत्रण**:\n"
            "   - पाने वरच्या बाजूला वळल्यास (थ्रिप्स): **स्पायनेटोरम ११.७ एससी (१ मिली/लीटर)** फवारा.\n"
            "   - पाने खालच्या बाजूला वळल्यास (कोळी/माइट्स): **डायफेन्थियुरॉन (१.२ ग्रॅम/लीटर)** किंवा **ओमाइट (२ मिली/लीटर)** फवारा.\n"
            "   - एकरी २० पिवळे व निळे चिकट सापळे लावा.\n\n"
            "२. **फुलगळ थांबवण्यासाठी**:\n"
            "   - **प्लानोफिक्स (अल्फा एनएए)** @ ०.२५ मिली/लीटर किंवा **बोरॉन २०%** @ १ ग्रॅम/लीटर फवारा."
        ),
        "tomato_fertilizer": (
            "🍅 **टोमॅटो खत आणि पोषण व्यवस्थापन सल्ला**:\n\n"
            "१. **पायाभूत खत (लागवडीच्या वेळी)**:\n"
            "   - **NPK १२०:६०:६० किलो प्रति हेक्टर** प्रमाणे नियोजन करा.\n"
            "   - शेताची मशागत करताना प्रति एकर १०–१५ टन चांगले कुजलेले शेणखत किंवा गांडूळ खत मिसळा.\n"
            "   - प्रति एकर ५० किलो एसएसपी (SSP) आणि ३० किलो म्युरिएट ऑफ पोटॅश (MOP) द्या.\n\n"
            "२. **शाकीय वाढीचा टप्पा (३० ते ४५ दिवस)**:\n"
            "   - प्रति एकर **४५ किलो युरिया** किंवा ठिबकद्वारे **१९:१९:१९** विद्राव्य खत (५ ग्रॅम/लीटर) द्या.\n\n"
            "३. **फुलधारणा व फळधारणा टप्पा**:\n"
            "   - कॅल्शियमची कमतरता टाळण्यासाठी **कॅल्शियम नायट्रेट (१० किलो/एकर)** आणि **बोरॉन (२०% @ १ ग्रॅम/लीटर)** ची फवारणी करा.\n"
            "   - फळांचा आकार वाढवण्यासाठी **०:५२:३४ (मोनोपोटॅशियम फॉस्फेट)** फवारा.\n\n"
            "४. **फळ पक्वता टप्पा**:\n"
            "   - फळांना उत्तम चकाकी आणि टिकाऊपणा मिळण्यासाठी **१३:०:४५ (पोटॅशियम नायट्रेट)** ५ ग्रॅम/लीटर फवारा."
        ),
        "paddy_blight": (
            "🌾 **भातावरील करपा (Early Blight / Blast) रोगावरील उपचार**:\n\n"
            "१. **रासायनिक फवारणी**:\n"
            "   - **ट्रायसायक्लाझोल ७५% डब्ल्यूपी** @ ०.६ ग्रॅम प्रति लीटर पाण्यात मिसळून फवारा, किंवा\n"
            "   - **कार्बेन्डाझिम ५०% डब्ल्यूपी** @ १ ग्रॅम प्रति लीटर पाण्यात मिसळून पहिली लक्षणे दिसताच फवारा.\n"
            "   - जिवाणू करप्यासाठी **कॉपर ऑक्सिक्लोराईड ५० डब्ल्यूपी (२.५ ग्रॅम/लीटर) + स्ट्रेप्टोसायक्लिन (०.१ ग्रॅम/लीटर)** वापरा.\n\n"
            "२. **पाणी व शेत व्यवस्थापन**:\n"
            "   - भात खाचरात ३ ते ५ सेंमी पाण्याचा नियंत्रित थर ठेवा.\n"
            "   - रोगट पाने दिसताच युरियाचा अतिरिक्त वापर तात्पुरता थांबवा.\n\n"
            "३. **जैविक उपाय**:\n"
            "   - **स्यूडोमोनास फ्लुओरेसेन्स** १० ग्रॅम/लीटर किंवा **लिंबोळी तेल (३००० ppm)** ४ मिली/लीटर फवारा.\n\n"
            "⚠️ *सुरक्षा सूचना: औषध फवारताना हातमोजे आणि तोंडाला मास्क नक्की वापरा.*"
        ),
        "wheat_irrigation": (
            "🌾 **गहू पिकाचे सिंचन वेळापत्रक (६ अत्यंत महत्त्वाचे टप्पे)**:\n\n"
            "उत्तम उत्पादनासाठी गव्हाला खालील ६ महत्त्वाच्या टप्प्यांवर पाणी देणे आवश्यक आहे:\n"
            "१. **मुकुट मुळे फुटण्याची अवस्था (CRI stage)** — **२१ ते २५ दिवसांनी** (*सर्वात महत्त्वाचा टप्पा! पाणी न दिल्यास उत्पादन ३०% घटते*).\n"
            "२. **फुटवे येण्याची अवस्था (Tillering)** — **४० ते ४५ दिवसांनी**.\n"
            "३. **कांडी धरण्याची अवस्था (Jointing)** — **६० ते ६५ दिवसांनी**.\n"
            "४. **फुलोरा अवस्था (Flowering)** — **८० ते ८५ दिवसांनी**.\n"
            "५. **दुधाळ अवस्था (Milking)** — **१०० ते १०५ दिवसांनी**.\n"
            "६. **दाणे भरण्याची अवस्था (Dough)** — **११५ ते १२० दिवसांनी** (हलके पाणी द्या; कापणीपूर्वी १० दिवस आधी पाणी बंद करा).\n\n"
            "💡 *सूचना: सोसाट्याचा वारा असताना पाणी देणे टाळा, यामुळे पीक लोळत नाही.*"
        ),
        "whiteflies_pest": (
            "🐛 **पांढरी माशी आणि रसशोषक किडींचे नियंत्रण**:\n\n"
            "१. **सापळे व्यवस्थापन**:\n"
            "   - शेतात प्रति एकर **१५–२० पिवळे चिकट सापळे (Yellow Sticky Traps)** पिकाच्या उंचीवर लावा.\n\n"
            "२. **सेंद्रिय / जैविक फवारणी**:\n"
            "   - **लिंबोळी तेल (३००० ppm)** @ ४–५ मिली प्रति लीटर पाण्यात मिसळून सायंकाळी फवारा.\n"
            "   - जैविक बुरशी **व्हर्टिसिलियम लेकॅनी** @ ५ ग्रॅम/लीटर फवारा.\n\n"
            "३. **रासायनिक उपाय (प्रादुर्भाव जास्त असल्यास)**:\n"
            "   - **ॲसिटामिप्रीड २०% एसपी** @ ०.३ ग्रॅम प्रति लीटर पाणी, किंवा\n"
            "   - **डायफेंथियुरॉन ५०% डब्ल्यूपी** @ १.२ ग्रॅम प्रति लीटर पाणी.\n\n"
            "⚠️ *रासायनिक औषधे सतत बदलून फवारा जेणेकरून किडींमध्ये प्रतिकारशक्ती तयार होणार नाही.*"
        ),
        "organic_compost": (
            "🌱 **सेंद्रिय खत (कंपोस्ट) तयार करण्याच्या सोप्या टिप्स**:\n\n"
            "१. **कच्च्या मालाचे प्रमाण (६०:४०)**:\n"
            "   - ६०% सुका पालापाचोळा, काडीकचरा, भुसा (कार्बनसाठी).\n"
            "   - ४०% ताजे शेणखत, हिरवे गवत, भाजीपाला कचरा (नायट्रोजनसाठी).\n\n"
            "२. **ढिगारा व ओलावा**:\n"
            "   - झाडाच्या सावलीत १.५ मीटर रुंद x १.५ मीटर उंच ढीग तयार करा.\n"
            "   - ढिगाऱ्यामध्ये ५० ते ६०% ओलावा टिकवून ठेवा.\n\n"
            "३. **जीवाणूंचा वापर**:\n"
            "   - कुजण्याची प्रक्रिया जलद होण्यासाठी प्रत्येक थरावर **जीवामृत** किंवा **वेस्ट डीकंपोजर** शिंपडा.\n"
            "   - दर १५ दिवसांनी ढीग खाली-वर करून हवा खेळती ठेवा.\n\n"
            "४. **खत तयार होण्याची खूण**:\n"
            "   - ६० ते ७५ दिवसांत काळेशार, भुसभुशीत आणि मातीचा सुगंध असलेले दर्जेदार सेंद्रिय खत तयार होते."
        ),
        "general_advice": (
            "🌾 **ॲग्रीएक्सपर्ट कृषी सल्ला**:\n\n"
            "- **जमीन आरोग्य**: जमिनीतील पोषक घटकांचा समतोल राखण्यासाठी दर २ वर्षांनी माती परीक्षण करा.\n"
            "- **पाणी व्यवस्थापन**: पाण्याची ५०% बचत करण्यासाठी ठिबक सिंचनाचा वापर करा.\n"
            "- **रोग नियंत्रण**: पानांच्या मागील बाजूस कीड किंवा बुरशीची लक्षणे आहेत का ते नियमित तपासा.\n"
            "- **बाजारभाव**: आपल्या पिकाला योग्य भाव मिळवण्यासाठी स्मार्ट किसान वरील बाजारभाव दररोज तपासा."
        )
    },
    "hi": {
        "greeting": (
            "🌾 **नमस्ते किसान भाई! मैं एग्रीएक्सपर्ट, आपका स्मार्ट किसान एआई कृषि सलाहकार हूं।**\n\n"
            "मैं आपकी निम्न विषयों में मदद कर सकता हूं:\n"
            "- 🌱 **फसल पोषण एवं उर्वरक डोज** (NPK, सूक्ष्म पोषक तत्व, ड्रिप खाद)\n"
            "- 🐛 **कीट व रोग प्रबंधन** (झुलसा, सफेद मक्खी, सुंडी, इल्ली नियंत्रण)\n"
            "- 💧 **सिंचाई समय-सारणी एवं जल प्रबंधन**\n"
            "- 🚜 **मंडी भाव एवं उपज बिक्री मार्गदर्शन**\n"
            "- 🌿 **जैविक खेती व कंपोस्ट खाद**\n\n"
            "💬 *कृपया अपना विशिष्ट कृषि प्रश्न पूछें या फसल का नाम बताएं!*"
        ),
        "cotton": (
            "🌱 **कपास फसल पोषण एवं गुलाबी सुंडी नियंत्रण सलाह**:\n\n"
            "1. **उर्वरक प्रबंधन (NPK 100:50:50 किग्रा/हेक्टेयर)**:\n"
            "   - बुवाई के समय 20% नाइट्रोजन + पूरी फास्फोरस व पोटाश दें।\n"
            "   - शेष नाइट्रोजन को 30 और 60 दिन बाद दो बराबर भागों में दें।\n"
            "   - फूल बनते समय **मैग्नीशियम सल्फेट (1%) + 19:19:19 (1%)** का स्प्रे करें (पत्तियां लाल होना रुकती हैं)।\n\n"
            "2. **गुलाबी सुंडी व रस चूसक कीट नियंत्रण**:\n"
            "   - बुवाई के 45 दिन बाद प्रति एकड़ **5 फेरोमोन ट्रैप** लगाएं।\n"
            "   - रस चूसक कीटों के लिए: **फ्लोनिकामाइड 50 WG** @ 0.3 ग्राम/लीटर या **नीम तेल 10000 ppm** @ 2 मिली/लीटर छिड़कें।\n"
            "   - गुलाबी सुंडी के लिए: **इमामेक्टिन बेंजोएट 5% SG** @ 0.4 ग्राम/लीटर का स्प्रे करें।"
        ),
        "sugarcane": (
            "🎋 **गन्ना फसल उर्वरक एवं कीट प्रबंधन**:\n\n"
            "1. **उर्वरक खुराक (NPK 250:115:115 किग्रा/हेक्टेयर)**:\n"
            "   - बुवाई के समय: 10% N, 50% P, 50% K।\n"
            "   - भारी मिट्टी चढ़ाई के समय (120 दिन): शेष 50% N, 50% P, 50% K डालें।\n\n"
            "2. **कंसुआ (Shoot Borer) व सफेद लट (White Grub) नियंत्रण**:\n"
            "   - जड़ों के पास **क्लोरांट्रानिलीप्रोल 0.4% G** @ 7.5 किग्रा/एकड़ डालें, या\n"
            "   - **फिप्रोनिल 5% SC** @ 2 मिली/लीटर पानी में मिलाकर ड्रेन्चिंग करें।\n\n"
            "3. **सूखी पत्तियों की मल्चिंग**:\n"
            "   - कतारों के बीच सूखी पत्तियों की मल्चिंग करने से 40% पानी की बचत होती है।"
        ),
        "onion": (
            "🧅 **प्याज फसल सलाह (थ्रिप्स, जामुनी धब्बा व कंद फुलाव)**:\n\n"
            "1. **थ्रिप्स एवं जामुनी धब्बा (Purple Blotch) नियंत्रण**:\n"
            "   - थ्रिप्स के लिए: **फिप्रोनिल 5% SC (1.5 मिली/लीटर)** या **स्पिनेटोरम 11.7 SC (1 मिली/लीटर)** स्टीकर के साथ छिड़कें।\n"
            "   - जामुनी धब्बे के लिए: **मैंकोजेब 75% WP (2.5 ग्राम/लीटर)** या **कस्टोडिया/नेटिवो (0.7 ग्राम/लीटर)** का स्प्रे करें।\n\n"
            "2. **कंद का आकार व चमक बढ़ाने के लिए**:\n"
            "   - 45-60 दिन बाद: **सल्फर 90% WDG (3 किग्रा/एकड़)** दें।\n"
            "   - 70-85 दिन बाद: **0:52:34 (5 ग्राम/लीटर)** और फिर **0:0:50 (5 ग्राम/लीटर)** का स्प्रे करें।\n"
            "   - खुदाई से 15 दिन पहले पानी पूरी तरह बंद कर दें।"
        ),
        "soybean": (
            "🌱 **सोयाबीन फसल व चक्र भृंग / गर्डल बीटल नियंत्रण**:\n\n"
            "1. **उर्वरक प्रबंधन**:\n"
            "   - बेसल डोज: **NPK 30:60:40 किग्रा/हेक्टेयर** + **सल्फर 20 किग्रा/हेक्टेयर** (तेल की मात्रा बढ़ाने के लिए)।\n"
            "   - बुवाई से पहले **राइजोबियम + PSB** कल्चर से बीजोपचार करें।\n\n"
            "2. **गर्डल बीटल व सेमीलूपर इल्ली नियंत्रण**:\n"
            "   - **क्लोरांट्रानिलीप्रोल 18.5% SC (0.3 मिली/लीटर)** या **थायमेथॉक्सम + लैम्ब्डा (0.5 मिली/लीटर)** का स्प्रे करें।\n\n"
            "3. **फली बनने की अवस्था**:\n"
            "   - दाना भरते समय **0:52:34** @ 100 ग्राम प्रति 15 लीटर पंप स्प्रे करें।"
        ),
        "chilli": (
            "🌶️ **मिर्च चुरड़ा-मुरड़ा (लीफ कर्ल) व पोषक तत्व प्रबंधन**:\n\n"
            "1. **चुरड़ा-मुरड़ा व कीट नियंत्रण**:\n"
            "   - पत्तियां ऊपर मुड़ने पर (थ्रिप्स): **स्पिनेटोरम 11.7 SC (1 मिली/लीटर)** या **एसिटामिप्रिड (0.5 ग्राम/लीटर)** स्प्रे करें।\n"
            "   - पत्तियां नीचे मुड़ने पर (माइट्स/मकड़ी): **डायफेंटिउरॉन 50 WP (1.2 ग्राम/लीटर)** या **ओमाइट (2 मिली/लीटर)** स्प्रे करें।\n"
            "   - खेत में नीले व पीले स्टिकी ट्रैप लगाएं।\n\n"
            "2. **फूल झड़ने से रोकने के लिए**:\n"
            "   - **प्लानोफिक्स** @ 0.25 मिली/लीटर या **बोरॉन 20%** @ 1 ग्राम/लीटर का स्प्रे करें।"
        ),
        "tomato_fertilizer": (
            "🍅 **टमाटर की फसल के लिए उर्वरक एवं पोषण सलाह**:\n\n"
            "1. **बुवाई/रोपाई के समय (बेसल डोज)**:\n"
            "   - **NPK 120:60:60 किलोग्राम प्रति हेक्टेयर** की दर से डालें।\n"
            "   - खेत तैयार करते समय 10-15 टन अच्छी सड़ी हुई गोबर की खाद या केंचुआ खाद मिलाएं।\n"
            "   - 50 किलो एसएसपी (SSP) और 30 किलो पोटाश (MOP) प्रति एकड़ दें।\n\n"
            "2. **वानस्पतिक वृद्धि चरण (30-45 दिन)**:\n"
            "   - **45 किलो यूरिया प्रति एकड़** या ड्रिप द्वारा **19:19:19** (5 ग्राम/लीटर पानी) का छिड़काव करें।\n\n"
            "3. **फूल और फल बनने की अवस्था**:\n"
            "   - फल सड़न (Blossom end rot) रोकने के लिए **कैल्शियम नाइट्रेट (10 किलो/एकड़)** और **बोरॉन (20% @ 1 ग्राम/लीटर)** का स्प्रे करें।\n"
            "   - फलों के आकार के लिए **0:52:34** का पर्णीय छिड़काव करें।\n\n"
            "4. **फल पकने की अवस्था**:\n"
            "   - फलों में चमक और वजन बढ़ाने के लिए **13:0:45 (पोटेशियम नाइट्रेट @ 5 ग्राम/लीटर)** का स्प्रे करें।"
        ),
        "paddy_blight": (
            "🌾 **धान में झुलसा/ब्लास्ट रोग का उपचार**:\n\n"
            "1. **रासायनिक उपचार**:\n"
            "   - **ट्राइसाइक्लाजोल 75% डब्लूपी** @ 0.6 ग्राम प्रति लीटर पानी में मिलाकर स्प्रे करें, या\n"
            "   - **कार्बेन्डाजिम 50% डब्लूपी** @ 1 ग्राम प्रति लीटर पानी का छिड़काव करें।\n"
            "   - जीवाणु झुलसा के लिए **कॉपर ऑक्सीक्लोराइड 50 डब्लूपी (2.5 ग्राम/लीटर) + स्ट्रेप्टोसाइक्लिन (0.1 ग्राम/लीटर)** का प्रयोग करें।\n\n"
            "2. **खेत व पानी प्रबंधन**:\n"
            "   - खेत में 3-5 सेमी पानी का स्तर बनाए रखें।\n"
            "   - रोग के लक्षण दिखते ही यूरिया का अत्यधिक उपयोग तुरंत रोक दें।\n\n"
            "3. **जैविक उपाय**:\n"
            "   - **स्यूडोमोनास फ्लोरोसेंस** 10 ग्राम/लीटर या **नीम का तेल (3000 ppm)** 4 मिली/लीटर का छिड़काव करें।\n\n"
            "⚠️ *सुरक्षा चेतावनी: कीटनाशक का छिड़काव करते समय मास्क और दस्ताने अवश्य पहनें।* "
        ),
        "wheat_irrigation": (
            "🌾 **गेहूं की सिंचाई का समय-सारणी (6 प्रमुख अवस्थाएं)**:\n\n"
            "गेहूं में बंपर पैदावार के लिए इन 6 महत्वपूर्ण अवस्थाओं पर सिंचाई करें:\n"
            "1. **ताज जड़ निकलने की अवस्था (CRI stage)** — **21-25 दिन बाद** (*सबसे महत्वपूर्ण! इसमें चूक होने पर पैदावार 30% घट सकती है*)।\n"
            "2. **कल्ले फूटने की अवस्था (Tillering)** — **40-45 दिन बाद**।\n"
            "3. **गांठ बनने की अवस्था (Jointing)** — **60-65 दिन बाद**।\n"
            "4. **फूल आने की अवस्था (Flowering)** — **80-85 दिन बाद**।\n"
            "5. **दुग्ध अवस्था (Milking)** — **100-105 दिन बाद**।\n"
            "6. **दाना पकने की अवस्था (Dough stage)** — **115-120 दिन बाद** (हल्की सिंचाई करें; कटाई से 10 दिन पहले पानी बंद करें)।\n\n"
            "💡 *सुझाव: तेज हवा चलने के समय सिंचाई न करें ताकि फसल गिरे नहीं।*"
        ),
        "whiteflies_pest": (
            "🐛 **सफेद मक्खी और रस चूसक कीटों का नियंत्रण**:\n\n"
            "1. **पीले चिपचिपे जाल**:\n"
            "   - खेत में प्रति एकड़ **15-20 पीले चिपचिपे ट्रैप (Yellow Sticky Traps)** लगाएं।\n\n"
            "2. **जैविक स्प्रे**:\n"
            "   - **नीम का तेल (3000 ppm)** 4-5 मिली प्रति लीटर पानी में शैम्पू/स्टीकर मिलाकर स्प्रे करें।\n"
            "   - **वर्टिसिलियम लेकानी** 5 ग्राम/लीटर का शाम के समय छिड़काव करें।\n\n"
            "3. **रासायनिक कीटनाशक (गंभीर प्रकोप होने पर)**:\n"
            "   - **एसिटामिप्रिड 20% एसपी** @ 0.3 ग्राम प्रति लीटर पानी, या\n"
            "   - **डायफेंटिउरॉन 50% डब्ल्यूपी** @ 1.2 ग्राम प्रति लीटर पानी का स्प्रे करें।"
        ),
        "organic_compost": (
            "🌱 **जैविक खाद (कंपोस्ट) बनाने के टिप्स**:\n\n"
            "1. **कच्चे माल का अनुपात (60:40)**:\n"
            "   - 60% सूखी पत्तियां, भूसा, डंठल (कार्बन के लिए)।\n"
            "   - 40% ताजा गोबर, हरी घास, रसोई का कचरा (नाइट्रोजन के लिए)।\n\n"
            "2. **ढीर और नमी**:\n"
            "   - छायादार स्थान पर 1.5 मीटर चौड़ा x 1.5 मीटर ऊंचा ढेर बनाएं।\n"
            "   - 50-60% नमी बनाए रखें।\n\n"
            "3. **तेजी से सड़ने के लिए**:\n"
            "   - हर 20 सेमी की परत पर **जीवामृत** या **वेस्ट डीकंपोजर** का छिड़काव करें।\n"
            "   - हर 15 दिन में ढेर को पलटें।\n\n"
            "4. **तैयार होने की पहचान**:\n"
            "   - 60-75 दिनों में गहरे भूरे रंग की सुगंधित जैविक खाद तैयार हो जाती है।"
        ),
        "general_advice": (
            "🌾 **एग्रीएक्सपर्ट कृषि सलाह**:\n\n"
            "- **मिट्टी की जांच**: संतुलित खाद उपयोग के लिए हर 2 साल में मिट्टी परीक्षण अवश्य कराएं।\n"
            "- **जल संरक्षण**: 50% पानी बचाने और खाद सीधे जड़ों तक पहुंचाने के लिए ड्रिप सिंचाई अपनाएं।\n"
            "- **फसल सुरक्षा**: सुबह के समय पत्तियों के नीचे कीड़ों और फफूंद के लक्षणों की जांच करें।\n"
            "- **मंडी भाव**: अपनी उपज का सर्वोत्तम दाम पाने के लिए स्मार्ट किसान पर लाइव मंडी भाव देखें।"
        )
    }
}


def get_agronomic_fallback_reply(message: str, language: str = "en") -> str:
    """Matches the query against comprehensive agronomic domain knowledge."""
    lang_key = "mr" if language in ("mr", "marathi") else ("hi" if language in ("hi", "hindi") else "en")
    kb = AGRI_KNOWLEDGE_BASE.get(lang_key, AGRI_KNOWLEDGE_BASE["en"])

    msg_lower = (message or "").lower().strip()

    # 1. Greetings
    if any(msg_lower == w or msg_lower.startswith(w) for w in ["hi", "hello", "hey", "namaste", "namaskar", "नमस्कार", "नमस्ते", "राम राम", "help", "who are you", "what can you do", "कसा आहेस", "सल्ला", "advice"]):
        return kb.get("greeting", kb["general_advice"])

    # 2. Cotton / Kapas
    if any(w in msg_lower for w in ["cotton", "kapas", "कापूस", "कपास", "बोंडअळी", "bollworm"]):
        return kb.get("cotton", kb["general_advice"])

    # 3. Sugarcane
    if any(w in msg_lower for w in ["sugarcane", "cane", "ऊस", "गन्ना", "खोडकिडा"]):
        return kb.get("sugarcane", kb["general_advice"])

    # 4. Onion
    if any(w in msg_lower for w in ["onion", "कांदा", "प्याज", "thrips", "फुगवण"]):
        return kb.get("onion", kb["general_advice"])

    # 5. Soybean
    if any(w in msg_lower for w in ["soybean", "soya", "सोयाबीन", "girdle beetle", "चक्रीभुंगा"]):
        return kb.get("soybean", kb["general_advice"])

    # 6. Chilli
    if any(w in msg_lower for w in ["chilli", "chili", "pepper", "मिरची", "मिर्च", "leaf curl", "चुरडा"]):
        return kb.get("chilli", kb["general_advice"])

    # 7. Tomato
    if any(w in msg_lower for w in ["tomato", "टमाटर", "टोमॅटो"]):
        return kb["tomato_fertilizer"]

    # 8. Rice / Paddy
    if any(w in msg_lower for w in ["paddy", "rice", "धान", "भात", "blast", "blight", "करपा", "झुलसा"]):
        return kb["paddy_blight"]

    # 9. Wheat
    if any(w in msg_lower for w in ["wheat", "गेहूं", "गहू", "water", "irrigation", "सिंचाई", "पाणी"]):
        return kb["wheat_irrigation"]

    # 10. Whiteflies & Sucking pests
    if any(w in msg_lower for w in ["whitefl", "fly", "flies", "मक्खी", "माशी", "pest", "कीट", "कीड", "aphid", "कीटक"]):
        return kb["whiteflies_pest"]

    # 11. Compost & Organic
    if any(w in msg_lower for w in ["compost", "organic", "जैविक", "सेंद्रिय", "खाद", "खत तयार", "vermicompost"]):
        return kb["organic_compost"]

    # 12. Fertilizer in general
    if any(w in msg_lower for w in ["fertilizer", "khad", "खत", "उर्वरक", "npk", "urea", "युरिया", "यूरिया", "dap"]):
        return kb["tomato_fertilizer"]

    # Default general advice
    return kb["general_advice"]


# ─────────────────────────────────────────────────────────────────────────────
#  AI PROVIDER CALLS (Gemini -> OpenAI -> Anthropic -> Fallback)
# ─────────────────────────────────────────────────────────────────────────────
def try_gemini_api(api_key: str, message: str, history: list, context_str: str) -> str:
    """Sends chat request to Google Gemini API with proxy support."""
    try:
        import requests
        headers = {"Content-Type": "application/json"}
        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={api_key.strip()}"
        
        contents = []
        # Add system context
        contents.append({
            "role": "user",
            "parts": [{"text": f"System Instructions: {SYSTEM_PROMPT}\n\nContext:\n{context_str}"}]
        })
        contents.append({
            "role": "model",
            "parts": [{"text": "Understood. I am AgriExpert and will provide elite agricultural advice based on this context."}]
        })

        # Add history
        for item in (history or [])[-6:]:
            role = "model" if item.get("role") == "assistant" or item.get("sender") == "ai" else "user"
            text = item.get("content") or item.get("text") or ""
            if text:
                contents.append({"role": role, "parts": [{"text": str(text)}]})

        # Add current user query
        contents.append({"role": "user", "parts": [{"text": message}]})

        proxies = None
        if IS_PYTHONANYWHERE:
            proxies = {"http": "http://proxy.server:3128", "https": "http://proxy.server:3128"}

        res = requests.post(url, headers=headers, json={"contents": contents}, proxies=proxies, timeout=12)
        if res.status_code == 200:
            data = res.json()
            candidates = data.get("candidates", [])
            if candidates:
                parts = candidates[0].get("content", {}).get("parts", [])
                if parts:
                    return parts[0].get("text", "").strip()
    except Exception as e:
        print(f"[AgriExpert] Gemini call failed: {e}")
    return ""


def try_openai_api(api_key: str, message: str, history: list, context_str: str) -> str:
    """Sends chat request to OpenAI API with proxy support."""
    try:
        from openai import OpenAI
        import httpx
        client = None
        if IS_PYTHONANYWHERE:
            proxy = os.environ.get("HTTPS_PROXY") or "http://proxy.server:3128"
            client = OpenAI(api_key=api_key.strip(), http_client=httpx.Client(proxy=proxy, timeout=12))
        else:
            client = OpenAI(api_key=api_key.strip(), timeout=12)

        messages = [{"role": "system", "content": SYSTEM_PROMPT}]
        for item in (history or [])[-6:]:
            role = "assistant" if item.get("role") == "assistant" or item.get("sender") == "ai" else "user"
            content = item.get("content") or item.get("text") or ""
            if content:
                messages.append({"role": role, "content": str(content)})

        user_content = f"{context_str}\n\nFarmer's Question: {message}"
        messages.append({"role": "user", "content": user_content})

        model_name = os.environ.get("OPENAI_MODEL", "gpt-4o-mini")
        completion = client.chat.completions.create(
            model=model_name,
            messages=messages,
            max_tokens=800,
            temperature=0.7
        )
        reply = completion.choices[0].message.content
        if reply and reply.strip():
            return reply.strip()
    except Exception as e:
        print(f"[AgriExpert] OpenAI call failed: {e}")
    return ""


def try_anthropic_api(api_key: str, message: str, history: list, context_str: str) -> str:
    """Sends chat request to Anthropic Claude."""
    try:
        from anthropic import Anthropic
        import httpx
        client = None
        if IS_PYTHONANYWHERE:
            proxy = os.environ.get("HTTPS_PROXY") or "http://proxy.server:3128"
            client = Anthropic(api_key=api_key.strip(), http_client=httpx.Client(proxy=proxy, timeout=12))
        else:
            client = Anthropic(api_key=api_key.strip(), timeout=12)

        messages = []
        for item in (history or [])[-6:]:
            role = "assistant" if item.get("role") == "assistant" or item.get("sender") == "ai" else "user"
            content = item.get("content") or item.get("text") or ""
            if content:
                if not messages or messages[-1]["role"] != role:
                    messages.append({"role": role, "content": str(content)})
                else:
                    messages[-1]["content"] += "\n" + str(content)

        user_content = f"{context_str}\n\nFarmer's Question: {message}"
        if messages and messages[-1]["role"] == "user":
            messages[-1]["content"] += "\n" + user_content
        else:
            messages.append({"role": "user", "content": user_content})

        response = client.messages.create(
            model=os.environ.get("CLAUDE_CHAT_MODEL", "claude-3-haiku-20240307"),
            max_tokens=800,
            system=SYSTEM_PROMPT,
            messages=messages
        )
        if response:
            reply = next((b.text for b in response.content if b.type == "text"), "")
            if reply:
                return reply.strip()
    except Exception as e:
        print(f"[AgriExpert] Anthropic call failed: {e}")
    return ""


def get_agriexpert_reply(message: str, history=None, context=None, custom_gemini_key: str = None) -> str:
    """
    Main AgriExpert conversational entry point.
    Attempts live LLM providers (Gemini, OpenAI, Anthropic) and gracefully
    falls back to domain agronomic expert response so farmers NEVER receive a 502 crash.
    """
    if not message or not isinstance(message, str) or not message.strip():
        return "Namaste! Please ask your agricultural question about crops, fertilizers, irrigation, or pests."

    msg_clean = message.strip()
    history = history or []
    context = context or {}

    lang = context.get("language") or "en"
    if isinstance(lang, str):
        lang = lang.lower()
        if "marathi" in lang or "mr" in lang:
            lang = "mr"
        elif "hindi" in lang or "hi" in lang:
            lang = "hi"
        else:
            lang = "en"

    location = context.get("location") or "Maharashtra, India"
    weather = context.get("weather") or "Not Available"
    water = context.get("waterSource") or "Not Specified"

    # Build KB domain examples to inject as grounding context for the LLM
    lang_key = "mr" if lang == "mr" else ("hi" if lang == "hi" else "en")
    kb = AGRI_KNOWLEDGE_BASE.get(lang_key, AGRI_KNOWLEDGE_BASE["en"])
    kb_examples = "\n\n".join([
        f"[AgriExpert Reference: {k}]\n{v}" for k, v in list(kb.items())[:3]
    ])

    context_str = (
        f"[Live Context]\n"
        f"Location: {location}\n"
        f"Weather: {weather}\n"
        f"Water Source: {water}\n"
        f"Language: {lang}\n\n"
        f"[Agronomic Domain Reference Examples (use as grounding, not verbatim copy)]:\n{kb_examples}"
    )

    # 1. Try Gemini Key (from request header or env)
    gemini_key = (custom_gemini_key or os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY") or "").strip()
    if gemini_key and len(gemini_key) > 10 and "your_key" not in gemini_key:
        reply = try_gemini_api(gemini_key, msg_clean, history, context_str)
        if reply:
            return reply

    # 2. Try OpenAI API
    openai_key = (os.environ.get("OPENAI_API_KEY") or "").strip()
    if openai_key and len(openai_key) > 10 and "your_api_key" not in openai_key:
        reply = try_openai_api(openai_key, msg_clean, history, context_str)
        if reply:
            return reply

    # 3. Try Anthropic API
    anthropic_key = (os.environ.get("ANTHROPIC_API_KEY") or "").strip()
    if anthropic_key and len(anthropic_key) > 10 and "xxxxxxxx" not in anthropic_key:
        reply = try_anthropic_api(anthropic_key, msg_clean, history, context_str)
        if reply:
            return reply

    # 4. Built-in Agronomic Expert Engine (Natural response, no disruptive warning banners)
    fallback_text = get_agronomic_fallback_reply(msg_clean, language=lang)
    return fallback_text
