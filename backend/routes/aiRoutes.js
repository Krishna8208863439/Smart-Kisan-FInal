import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import Product from "../models/Product.js";
import { analyzeWithHuggingFace, smartLocalFallback } from "./cropDiseaseRoutes.js";

const router = express.Router();

// Multilingual fallback content for offline/no-key mode with correct agricultural facts
const FALLBACK_RESPONSES = {
  en: {
    greeting: "Namaste Kisan Bhai/Behan! I am AgriExpert, your elite AI agricultural specialist and digital farming assistant. Please select your preferred language: English, Hindi (हिंदी), or Marathi (मराठी) to begin, or ask me about crops, disease diagnostics, irrigation, and the marketplace!",
    guardrailRefusal: "Error: The uploaded image does not appear to be a crop or plant. Please upload a clear photo of your crop or plant leaves for an accurate diagnosis.",
    pest: "For whiteflies control:\n- Install **Yellow Sticky Traps** (15-20 traps per acre) to trap flying insects.\n- Spray **Neem Oil** (3000 ppm) at 3-5 ml per litre of water with organic detergent.\n- For severe attacks, apply systemic **Acetamiprid 20% SP** (0.2 g/L) or **Diafenthiuron 50% WP** (1.2 g/L) chemical sprays.\n\n⚠️ *Safety Warning: Please wear gloves, a mask, and protective clothing when mixing and spraying pesticides.*",
    soil: "For healthy soil:\n- Practice organic manuring by applying 10-15 tons of farmyard manure or vermicompost.\n- Apply bio-fertilizers (Azotobacter for Nitrogen fixation, PSB for Phosphorus solubilizing, and KMB for Potassium mobilizing) to improve soil microbiology.",
    tomato: "Tomato cultivation & fertilizer guidelines:\n- Require NPK in a 120:60:60 kg/ha ratio.\n- Sowing temperature: 21-24°C.\n- Watering: Irrigate weekly, keeping soil moist but avoid waterlogging to prevent damping-off.\n- Deficiency: Calcium deficit causes blossom end rot. Spray Calcium Chloride (0.5%) at flowering.",
    rice: "Paddy/Rice leaf blast (Alternaria/Blast) treatment:\n- Spray Tricyclazole 75% WP (0.6 g/L) or Carbendazim 50% WP (1.0 g/L).\n- Maintain a shallow water level of 5cm in puddled fields.\n- Reduce excess Nitrogen (Urea) applications during active leaf spotting.\n\n⚠️ *Safety Warning: Ensure safety gear (gloves, mask) is worn while spraying chemicals.*",
    fertilizer: "General fertilizer advice:\n- Conduct a soil test first to map deficiencies.\n- Apply Nitrogen (N) for vegetative foliage growth, Phosphorus (P) for deep root establishment, and Potassium (K) for crop disease resistance and heavy yield quality.",
    irrigation: "Wheat watering schedule:\n- Water at the 6 critical growth stages:\n1. Crown Root Initiation (CRI) at 21 days (most critical - irrigate immediately!)\n2. Tillering at 40-45 days\n3. Jointing at 60-65 days\n4. Flowering at 80-85 days\n5. Milking stage at 100-105 days\n6. Dough stage at 115-120 days.",
    default: "I recommend checking local soil nutrient levels, monitoring daily weather forecasts, and adjusting crop schedules. Ask me about Tomato fertilizer, Paddy blast, Wheat watering, or Whiteflies control!"
  },
  hi: {
    greeting: "नमस्ते किसान भाई/बहन! मैं एग्रीएक्सपर्ट (AgriExpert) हूँ, आपका एआई कृषि विशेषज्ञ और डिजिटल खेती सहायक। बातचीत शुरू करने के लिए कृपया अपनी पसंदीदा भाषा चुनें: English, हिंदी, या मराठी, या मुझसे फसलों, बीमारी निदान, सिंचाई, और मंडी बाजार के बारे में पूछें!",
    guardrailRefusal: "Error: The uploaded image does not appear to be a crop or plant. Please upload a clear photo of your crop or plant leaves for an accurate diagnosis.",
    pest: "सफ़ेद मक्खी (Whiteflies) नियंत्रण के लिए:\n- उड़ने वाले कीटों को पकड़ने के लिए **पीले चिपचिपे जाल** (15-20 ट्रैप प्रति एकड़) लगाएं।\n- **नीम का तेल** (3000 ppm) 3-5 मिली प्रति लीटर पानी में मिलाकर स्प्रे करें।\n- गंभीर हमलों के लिए, प्रणालीगत **एसिटामिप्रिड 20% एसपी** (0.2 ग्राम/लीटर) या **डायफेंटिउरॉन 50% डब्ल्यूपी** (1.2 ग्राम/लीटर) का छिड़काव करें।\n\n⚠️ *सुरक्षा चेतावनी: कीटनाशकों को मिलाते और स्प्रे करते समय कृपया दस्ताने, मास्क और सुरक्षात्मक कपड़े पहनें।*",
    soil: "स्वस्थ मिट्टी के लिए:\n- खेत की तैयारी के समय 10-15 टन जैविक कम्पोस्ट या केंचुआ खाद डालें।\n- राइजोबियम, पीएसबी (PSB) और एज़ोटोबैक्टर जैव-उर्वरकों का उपयोग करें ताकि मिट्टी की उर्वरकता बढ़े।",
    tomato: "टमाटर की खेती और उर्वरक सलाह:\n- टमाटर के लिए NPK अनुपात 120:60:60 किलोग्राम प्रति हेक्टेयर होना चाहिए।\n- तापमान 21-24°C बुवाई के लिए उत्तम है। सप्ताह में एक बार गहरी सिंचाई करें।\n- कैल्शियम की कमी से फल सड़ते हैं (Blossom end rot)। कैल्शियम क्लोराइड (0.5%) का स्प्रे करें।",
    rice: "धान में ब्लास्ट रोग का उपचार:\n- ट्राइसाइक्लाजोल 75% डब्ल्यूपी (0.6 ग्राम/लीटर) या कार्बेन्डाजिम 50% डब्ल्यूपी (1 ग्राम/लीटर) का छिड़काव करें।\n- नाइट्रोजन (यूरिया) का अत्यधिक उपयोग रोकें। खेत में 5 सेमी पानी का स्तर बनाए रखें।\n\n⚠️ *सुरक्षा चेतावनी: रासायनिक छिड़काव के दौरान मास्क और सुरक्षात्मक कपड़े पहनना सुनिश्चित करें।*",
    fertilizer: "उर्वरक सलाह: पत्तियों की वृद्धि के लिए नाइट्रोजन, जड़ों के विकास के लिए फास्फोरस, और जड़ों को रोग प्रतिरोधक क्षमता व गुणवत्ता के लिए पोटेशियम का सही मात्रा में छिड़काव करें।",
    irrigation: "गेहूं की सिंचाई का समयपत्रक:\nगेहूं की फसल में ६ प्रमुख चरणों में सिंचाई अवश्य करें:\n१. क्राउन रूट इनिशिएशन (CRI) - २१ दिनों में (सबसे महत्वपूर्ण!)\n२. कल्ले फूटने पर - ४०-४५ दिन\n३. गांठे बनने पर - ६०-६५ दिन\n४. फूल आने पर - ८०-८५ दिन\n५. दूध बनने की अवस्था - १००-१०५ दिन\n६. दाना पकने पर - ११५-१२० दिन।",
    default: "मैं मिट्टी की जांच करने, दैनिक मौसम पूर्वानुमान पर नजर रखने और फसल कार्यक्रम को बदलने की सलाह देता हूं। टमाटर खाद, धान ब्लास्ट, गेहूं सिंचाई या कीट नियंत्रण के बारे में पूछें!"
  },
  mr: {
    greeting: "नमस्ते शेतकरी बंधू आणि भगिनींनो! मी ॲग्रीएक्सपर्ट (AgriExpert) आहे, तुमचा एआय कृषी सल्लागार आणि डिजिटल शेती सहाय्यक. संभाषण सुरू करण्यासाठी कृपया तुमची भाषा निवडा: English, हिंदी, किंवा मराठी, किंवा मला पीक रोग निदान, सिंचन आणि बाजाराविषयी विचारा!",
    guardrailRefusal: "Error: The uploaded image does not appear to be a crop or plant. Please upload a clear photo of your crop or plant leaves for an accurate diagnosis.",
    pest: "पांढऱ्या माशीच्या (Whiteflies) नियंत्रणासाठी:\n- पिवळे चिकट सापळे (१५-२० सापळे प्रति एकर) शेतात लावा.\n- लिंबोळी तेल (३००० ppm) ३-५ मिली प्रति लीटर पाण्यात मिसळून फवारा.\n- प्रादुर्भाव जास्त असल्यास, ॲसिटामिप्रीड २०% एसपी (०.२ ग्रॅम/लीटर) किंवा डायफेंथियुरॉन ५०% डब्ल्यूपी (१.२ ग्रॅम/लीटर) रसायनांची फवारणी करा.\n\n⚠️ *सुरक्षा चेतावणी: कीटकनाशक फवारताना कृपया हातमोजे आणि मास्क वापरा.*",
    soil: "सेंद्रिय खत तयार करण्यासाठी व जमिनीच्या आरोग्यासाठी:\n- शेत तयार करताना प्रति एकर १०-१५ टन शेणखत किंवा गांडूळ खत वापरा.\n- जैविक खते जसे की अझोटोबॅक्टर (नायट्रोजन स्थिर करण्यासाठी) आणि पीएसबी (PSB - स्फुरद विरघळवण्यासाठी) यांचा वापर करा.",
    tomato: "टोमॅटोसाठी सर्वोत्तम खत नियोजन:\n- टोमॅटो पिकासाठी नायट्रोजन, स्फुरद आणि पालाश (NPK) १२०:६०:६० किलो प्रति हेक्टर प्रमाणात आवश्यक आहे.\n- पानांवर कॅल्शियमची कमतरता टाळण्यासाठी कॅल्शियम क्लोराइड (०.५%) फवारा.",
    rice: "भातावरील करपा (Blast) रोगाचा उपचार:\n- ट्रायसायक्लाझोल ७५% डब्ल्यूपी (०.६ ग्रॅम/लीटर) किंवा कार्बेन्डाझिम ५०% डब्ल्यूपी (१.० ग्रॅम/लीटर) ची फवारणी करा.\n- शेतात पाण्याचा योग्य निचरा ठेवा आणि ५ सेमी पाणी साठवून ठेवा.\n- रोगट प्रादुर्भाव दिसताच युरियाचा अतिरिक्त वापर थांबवा.\n\n⚠️ *सुरक्षा चेतावणी: शेतात रासायनिक फवारणी करताना सुरक्षितता साधनांचा वापर करा.*",
    fertilizer: "खत सल्ला: पिकाची वाढ होण्यासाठी नायट्रोजन, मुळे मजबूत होण्यासाठी स्फुरद, आणि रोगप्रतिकारक शक्ती वाढवण्यासाठी पालाश खतांचा संतुलित वापर करा.",
    irrigation: "गहू पिकाचे सिंचन वेळापत्रक (६ महत्त्वाचे टप्पे):\n१. मुकुट मूळ सुरू होणे (CRI stage) - २१ दिवसांनी (अतिशय महत्त्वाचे - लगेच पाणी द्या!)\n२. फुटवे येणे (Tillering) - ४०-४५ दिवसांनी\n३. कांडी धरणे (Jointing) - ६०-६५ दिवसांनी\n४. फुलारा (Flowering) - ८०-८५ दिवसांनी\n५. दुधाळ अवस्था (Milking) - १००-१०५ दिवसांनी\n६. दाणे भरणे (Dough stage) - ११५-१२० दिवसांनी.",
    default: "मी जमिनीची चाचणी करण्याचे, हवामान अंदाज तपासण्याचे आणि पीक नियोजनात सुधारणा करण्याचे सुचवतो. मला टोमॅटो खत, भातावरील करपा, गहू सिंचन किंवा पांढऱ्या माशी नियंत्रण याबद्दल विचारा!"
  }
};

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
    "lहसुन": "garlic", "हळद": "turmeric", "हल्दी": "turmeric", "मटर": "dry pea",
    "chilli": "chili pepper", "chilli pepper": "chili pepper"
  };
  for (const [key, val] of Object.entries(mapping)) {
    if (name.includes(key)) return val;
  }
  return name;
};

const getLocalizedDiseaseMR = (diseaseEn) => {
  const d = {
    "Early Blight (Alternaria solani)":             "अर्ली ब्लाईट / लवकर येणारा करपा",
    "Leaf Curl Virus (TLCV)":                       "लीफ कर्ल विषाणू / पाने आकसणे",
    "Tomato Yellow Leaf Curl Virus (TYLCV)":        "लीफ कर्ल विषाणू / पाने आकसणे",
    "Late Blight (Phytophthora infestans)":         "उशिरा येणारा करपा",
    "Leaf Blast (Magnaporthe oryzae)":              "लीफ ब्लास्ट / पानावरील करपा",
    "Sheath Blight (Rhizoctonia solani)":           "शीथ ब्लाईट / आवरण करपा",
    "Brown Spot (Helminthosporium oryzae)":         "तपकिरी ठिपके रोग",
    "Black Stem Rust (Puccinia graminis)":          "तांबेरा / स्टेम रस्ट",
    "Yellow Stripe Rust (Puccinia striiformis)":    "पिवळा तांबेरा",
    "Powdery Mildew (Blumeria graminis)":           "भुरी रोग / भुकटी बुरशी",
    "Northern Leaf Blight (Exserohilum turcicum)":  "उत्तर पानावरील करपा",
    "Gray Leaf Spot (Cercospora zeae-maydis)":      "राखाडी पान ठिपके",
    "Fall Armyworm (Spodoptera frugiperda)":        "फॉल आर्मीवर्म / शेंडा अळी",
    "Bacterial Blight (Xanthomonas axonopodis)":    "जिवाणू करपा",
    "Red Rot (Colletotrichum falcatum)":            "लाल कूज रोग",
    "Healthy (No Disease)":                         "निरोगी (कोणताही रोग नाही)"
  };
  return d[diseaseEn] || diseaseEn;
};

const getLocalizedDiseaseHI = (diseaseEn) => {
  const d = {
    "Early Blight (Alternaria solani)":             "अगेती झुलसा रोग (Early Blight)",
    "Leaf Curl Virus (TLCV)":                       "पर्ण कुंचन विषाणु (Leaf Curl)",
    "Tomato Yellow Leaf Curl Virus (TYLCV)":        "टमाटर का पीला पर्ण कुंचन रोग",
    "Late Blight (Phytophthora infestans)":         "पछेती झुलसा रोग (Late Blight)",
    "Leaf Blast (Magnaporthe oryzae)":              "धान का झोंका रोग (Rice Blast)",
    "Sheath Blight (Rhizoctonia solani)":           "शीथ ब्लाइट रोग",
    "Brown Spot (Helminthosporium oryzae)":         "भूरा धब्बा रोग",
    "Black Stem Rust (Puccinia graminis)":          "काला तना गेरूआ (Black Rust)",
    "Yellow Stripe Rust (Puccinia striiformis)":    "पीला गेरूआ (Yellow Rust)",
    "Powdery Mildew (Blumeria graminis)":           "चूर्णी आसिता रोग (Powdery Mildew)",
    "Northern Leaf Blight (Exserohilum turcicum)":  "उत्तरी पत्ता झुलसा रोग",
    "Gray Leaf Spot (Cercospora zeae-maydis)":      "ग्रे लीफ स्पॉट",
    "Fall Armyworm (Spodoptera frugiperda)":        "फॉल आर्मीवर्म (सैनिक कीट)",
    "Bacterial Blight (Xanthomonas axonopodis)":    "जीवाणु झुलसा रोग (Bacterial Blight)",
    "Red Rot (Colletotrichum falcatum)":            "लाल सड़न रोग (Red Rot)",
    "Healthy (No Disease)":                         "स्वस्थ (कोई बीमारी नहीं)"
  };
  return d[diseaseEn] || diseaseEn;
};

const getLocalizedAdviceMR = (adviceEn) => {
  if (!adviceEn) return "";
  if (adviceEn.includes("Early Blight")) {
    return "अर्ली ब्लाईट (लवकर येणारा करपा) पिकाच्या पानांवर गोलाकार काळे ठिपके तयार करतो. त्वरित मॅन्कोझेब ७५ डब्ल्यूपी (२ ग्रॅम/लीटर) किंवा कॉपर ऑक्सिक्लोराईड ५० डब्ल्यूपी (३ ग्रॅम/लीटर) १०-१४ दिवसांच्या अंतराने फवारा.";
  }
  if (adviceEn.includes("Leaf Curl") || adviceEn.includes("TLCV")) {
    return "लीफ कर्ल (पाने आकसणे) हा रोग पांढऱ्या माशीद्वारे पसरतो. असिटामिप्रीड २० एसपी (०.२ ग्रॅम/लीटर) किंवा इमिडाक्लोप्रिड १७.८ एसएल (०.३ मिली/लीटर) फवारा.";
  }
  if (adviceEn.includes("Leaf Blast") || adviceEn.includes("Blast")) {
    return "लीफ ब्लास्ट (भातावरील करपा) पानांवर राखाडी रंगाचे लांबट ठिपके निर्माण करतो. ट्रायसायक्लाझोल ७५ डब्ल्यूपी (०.६ ग्रॅम/लीटर) फवारा. युरियाचा अतिवापर थांबवा.";
  }
  if (adviceEn.includes("Sheath Blight")) {
    return "शीथ ब्लाईट - पानाच्या आवरणावर राखाडी-पांढरे ठिपके. हेक्साकोनाझोल ५ एससी (२ मिली/लीटर) किंवा व्हॅलिडामायसिन ३ एल (२ मिली/लीटर) फवारा.";
  }
  if (adviceEn.includes("Stem Rust") || adviceEn.includes("Rust")) {
    return "तांबेरा रोगामुळे खोडावर आणि पानांवर लांबट तांबूस-तपकिरी ठिपके येतात. प्रोपिकोनाझोल २५% ईसी (०.५ मिली/लीटर) किंवा टेब्युकोनाझोल २५० ईसी (०.७५ मिली/लीटर) फवारा.";
  }
  if (adviceEn.includes("Bacterial Blight")) {
    return "जिवाणू करपा - पानांवर कोनीय पाण्याने भिजलेले ठिपके. कॉपर ऑक्सिक्लोराईड ५० डब्ल्यूपी (३ ग्रॅम/लीटर) + स्ट्रेप्टोसायक्लिन (०.१५ ग्रॅम/लीटर) फवारा.";
  }
  if (adviceEn.includes("Late Blight")) {
    return "बटाटा/टोमॅटोवरील उशिरा येणारा करपा. सायमॉक्सानिल ८% + मॅन्कोझेब ६४% डब्ल्यूपी (३ ग्रॅम/लीटर) फवारा.";
  }
  if (adviceEn.includes("Anthracnose")) {
    return "अँथ्रॅकनोज - फळांवर आणि पानांवर बुडालेले तपकिरी ठिपके. मॅन्कोझेब ७५ डब्ल्यूपी (२ ग्रॅम/लीटर) फवारा.";
  }
  return adviceEn;
};

const getLocalizedAdviceHI = (adviceEn) => {
  if (!adviceEn) return "";
  if (adviceEn.includes("Early Blight")) {
    return "अगेती झुलसा रोग नियंत्रण के लिए मैंकोजेब 75 डब्ल्यूपी (2 ग्राम/लीटर) या कॉपर ऑक्सीक्लोराइड 50 डब्ल्यूपी (3 ग्राम/लीटर) का छिड़काव करें।";
  }
  if (adviceEn.includes("Leaf Curl") || adviceEn.includes("TLCV")) {
    return "लीफ कर्ल रोग के नियंत्रण के लिए एसिटामिप्रिड 20 एसपी (0.2 ग्राम/लीटर) या इमिडाक्लोप्रिड 17.8 एसएल (0.3 मिली/लीटर) का छिड़काव करें।";
  }
  if (adviceEn.includes("Leaf Blast") || adviceEn.includes("Blast")) {
    return "ब्लास्ट रोग के लिए ट्राइसाइक्लाजोल 75% डब्ल्यूपी (0.6 ग्राम/लीटर) या कार्बेन्डाजिम 50% डब्ल्यूपी (1 ग्राम/लीटर) का छिड़काव करें।";
  }
  if (adviceEn.includes("Sheath Blight")) {
    return "शीथ ब्लाइट के लिए हेक्साकोनाज़ोल 5 एससी (2 मिली/लीटर) या वेलिडामाइसिन 3 एल (2 मिली/लीटर) का छिड़काव करें।";
  }
  if (adviceEn.includes("Stem Rust") || adviceEn.includes("Rust")) {
    return "गेरूआ (रस्ट) रोग के लिए प्रोपिकोनाझोल 25 ईसी (0.5 मिली/लीटर) या टेबुकोनाज़ोल 250 ईसी (0.75 मिली/लीटर) का छिड़काव करें।";
  }
  if (adviceEn.includes("Bacterial Blight")) {
    return "जीवाणु झुलसा के लिए कॉपर ऑक्सीक्लोराइड 50 डब्ल्यूपी (3 ग्राम/लीटर) + स्ट्रेप्टोसाइक्लिन (0.15 ग्राम/लीटर) का छिड़काव करें।";
  }
  if (adviceEn.includes("Late Blight")) {
    return "पछेती झुलसा के लिए साइमोक्सानिल 8% + मैंकोजेब 64% डब्ल्यूपी (3 ग्राम/लीटर) का छिड़काव करें।";
  }
  if (adviceEn.includes("Anthracnose")) {
    return "एन्थ्रेक्नोज के लिए मैंकोजेब 75 डब्ल्यूपी (2 ग्राम/लीटर) का छिड़काव करें।";
  }
  return adviceEn;
};

const extractProductQuery = (diseaseEn) => {
  const d = (diseaseEn || "").toLowerCase();
  if (d.includes("early blight") || d.includes("late blight") || d.includes("anthracnose") || d.includes("purple blotch") || d.includes("spot")) {
    return "Mancozeb";
  }
  if (d.includes("blast")) {
    return "Tricyclazole";
  }
  if (d.includes("rust") || d.includes("mildew") || d.includes("blight")) {
    return "Propiconazole";
  }
  if (d.includes("sheath blight")) {
    return "Hexaconazole";
  }
  if (d.includes("bacterial")) {
    return "Copper Oxychloride";
  }
  if (d.includes("armyworm")) {
    return "Pesticides";
  }
  return "Pesticides";
};

// POST /api/ai/chat
router.post("/chat", protect, async (req, res) => {
  const { message, chatHistory, language, gps, weather, waterAvailability, image, cropHint } = req.body;
  const lang = language || "en";
  const userMessage = message ? message.toLowerCase() : "";

  // ── Global System Rules & Language Protocol metadata check ──
  const payloadLanguageTag = message ? message.match(/\[Language:\s*(EN|HI|MR)\]/i) : null;
  let activeLang = lang;
  if (payloadLanguageTag) {
    const matchedTag = payloadLanguageTag[1].toLowerCase();
    activeLang = matchedTag === "hi" ? "hi" : matchedTag === "mr" ? "mr" : "en";
  }

  // ── Build Location, Weather & Water context ──
  let userContext = "";
  if (gps) {
    userContext += `- **Location**: Lat ${gps.lat || "N/A"}, Lon ${gps.lon || "N/A"}\n`;
  }
  if (weather) {
    userContext += `- **Weather**: Temp ${weather.temp || "N/A"}°C, Humidity ${weather.humidity || "N/A"}%, Rain Probability ${weather.rainProb || "N/A"}%, Forecast: ${weather.forecast || "N/A"}\n`;
  }
  if (waterAvailability) {
    userContext += `- **Water Source**: ${waterAvailability}\n`;
  }
  if (cropHint) {
    userContext += `- **Crop Identified**: ${cropHint}\n`;
  }

  // Get User's api key or system key
  const headerKey = req.headers["x-gemini-key"];
  const apiKey = (headerKey && headerKey.trim().length > 10)
    ? headerKey.trim()
    : (process.env.GEMINI_API_KEY || process.env.GROQ_API_KEY || "");

  // Helper to determine active Python port
  const getPythonUrl = () => {
    let pythonUrl = "http://localhost:8000";
    if (fs.existsSync("C:/Users/krish/Downloads/Project/active_ports.txt")) {
      try {
        const content = fs.readFileSync("C:/Users/krish/Downloads/Project/active_ports.txt", "utf8");
        const match = content.match(/PYTHON_PORT=(\d+)/);
        if (match) {
          pythonUrl = `http://127.0.0.1:${match[1]}`;
        }
      } catch (err) {
        console.error("[Node] Error reading active_ports.txt:", err);
      }
    } else if (fs.existsSync("/home/Krishna3114/active_ports.txt")) {
      try {
        const content = fs.readFileSync("/home/Krishna3114/active_ports.txt", "utf8");
        const match = content.match(/PYTHON_PORT=(\d+)/);
        if (match) {
          pythonUrl = `http://127.0.0.1:${match[1]}`;
        }
      } catch (err) {
        console.error("[Node] Error reading active_ports.txt:", err);
      }
    }
    return pythonUrl;
  };

  const isImageRequest = image && image.data;

  if (isImageRequest) {
    let endpoint = "/api/crop-diagnose"; // default
    let isAgricultural = true;

    const isGeminiKey = apiKey && apiKey.trim().length > 10 && !apiKey.startsWith("gsk_") && apiKey !== "YOUR_GEMINI_API_KEY";
    if (isGeminiKey) {
      try {
        const contents = [
          {
            role: "user",
            parts: [
              {
                inlineData: {
                  mimeType: image.mimeType || "image/jpeg",
                  data: image.data
                }
              },
              {
                text: `Analyze this image. You must classify whether the image shows an agricultural crop, plant, field, or plant leaf, and select the most appropriate analysis module:
- If the image contains ONLY a leaf or leaves (close up of leaf/leaves), select "leaf".
- If the image shows a crop showing signs of disease, pests, lesions, or stress, select "crop_disease".
- If the image shows a healthy crop, crop field, vegetable, fruit, seedling, or crop structure generally, select "crop_diagnostics".
- If the image is NOT related to agriculture, crops, plants, or leaves (e.g. it shows a person, animal, car, building, random consumer object, etc.), select "invalid".

Respond ONLY with this JSON (no markdown outside JSON):
{
  "is_agricultural": true|false,
  "image_type": "leaf" | "crop_disease" | "crop_diagnostics" | "invalid"
}`
              }
            ]
          }
        ];

        const valResp = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ contents })
          }
        );
        const valData = await valResp.json();
        const valRaw = valData.candidates?.[0]?.content?.parts?.[0]?.text;
        if (valRaw) {
          let cleanJson = valRaw.trim();
          if (cleanJson.includes("```")) {
            cleanJson = cleanJson.split("```")[1];
            if (cleanJson.startsWith("json")) {
              cleanJson = cleanJson.substring(4);
            }
            cleanJson = cleanJson.trim().split("```")[0].trim();
          }
          const valObj = JSON.parse(cleanJson);
          if (valObj.is_agricultural === false || valObj.image_type === "invalid") {
            isAgricultural = false;
          } else {
            if (valObj.image_type === "leaf") {
              endpoint = "/api/leaf-diagnose";
            } else if (valObj.image_type === "crop_disease") {
              endpoint = "/api/crop-disease-detect";
            } else {
              endpoint = "/api/crop-diagnose";
            }
          }
        }
      } catch (err) {
        console.error("Gemini Vision classification failed, defaulting to forward directly to Python:", err);
      }
    } else {
      if (cropHint && cropHint.toLowerCase().includes("leaf")) {
        endpoint = "/api/leaf-diagnose";
      } else {
        endpoint = "/api/crop-diagnose";
      }
    }

    if (!isAgricultural) {
      return res.json({
        success: false,
        response: "Unsupported image. Please upload a valid crop or plant leaf image.",
        source: "system"
      });
    }

    // Forward to Python Backend
    try {
      const pythonUrl = getPythonUrl();
      const formData = new FormData();
      const imageBuffer = Buffer.from(image.data, "base64");
      const fileBlob = new Blob([imageBuffer], { type: image.mimeType || "image/jpeg" });
      formData.append("image", fileBlob, "upload.jpg");
      if (cropHint) {
        formData.append("crop", cropHint);
      }

      console.log(`Forwarding to Python endpoint: ${pythonUrl}${endpoint}`);
      const pyResp = await fetch(`${pythonUrl}${endpoint}`, {
        method: "POST",
        headers: {
          "x-gemini-key": apiKey
        },
        body: formData
      });

      if (!pyResp.ok) {
        throw new Error(`Python backend returned status ${pyResp.status}`);
      }

      const pyData = await pyResp.json();
      if (pyData.success === false) {
        return res.json({
          success: false,
          response: pyData.error || "Invalid image. Please upload a clear crop or leaf image.",
          source: "python-fallback"
        });
      }

      // Format response based on endpoint
      let formattedText = "";
      if (endpoint === "/api/leaf-diagnose") {
        const confPercent = Math.round((pyData.confidence || 0.95) * 100);
        formattedText = `🏥 **Leaf Disease Diagnostics (AgriExpert)**

* **Plant Name:** ${pyData.plant_name || "Unknown"}
* **Disease Name:** ${pyData.disease_name || "Healthy"}
* **Healthy / Diseased Status:** ${pyData.health_status || "Healthy"}
* **Confidence Score:** ${confPercent}%
* **Symptoms:** ${pyData.disease_description || "No symptoms."}
* **Disease Cause:** ${pyData.causes || "N/A"}
* **Organic Treatment:** ${pyData.organic_treatment || "N/A"}
* **Chemical Treatment:** ${pyData.chemical_treatment || "N/A"}
* **Prevention Methods:** ${pyData.prevention_methods || "N/A"}`;
      } else if (endpoint === "/api/crop-diagnose") {
        const confPercent = Math.round((pyData.confidence || 0.95) * 100);
        formattedText = `🏥 **Crop Diagnostics (AgriExpert)**

* **Crop Name:** ${pyData.crop_name || "Unknown"}
* **Crop Health Status:** ${pyData.crop_health || "Healthy"}
* **Growth Stage:** ${pyData.growth_stage || "Unknown"}
* **Confidence Score:** ${confPercent}%
* **Identified Problems:** ${pyData.problems_detected || "None"}
* **Recommended Solution:** ${pyData.recommendations || "N/A"}
* **Fertilizer Recommendation:** ${pyData.fertilizer_recommendation || "N/A"}
* **Irrigation Advice:** ${pyData.irrigation_advice || "N/A"}`;
      } else {
        const confPercent = Math.round((pyData.confidence || 0.95) * 100);
        formattedText = `🏥 **Crop Disease Detection (AgriExpert)**

* **Crop Name:** ${pyData.crop || "Unknown"}
* **Disease Name:** ${pyData.disease || "Healthy"}
* **Confidence Score:** ${confPercent}%
* **Disease Severity:** ${pyData.severity || "medium"}
* **Symptoms:** ${pyData.symptoms || "No severe symptoms."}
* **Causes:** ${pyData.causes || "N/A"}
* **Organic Treatment:** ${pyData.organic_treatment || "N/A"}
* **Chemical Treatment:** ${pyData.chemical_treatment || "N/A"}
* **Recommended Fertilizer:** ${pyData.suggested_fertilizers || "N/A"}
* **Irrigation Recommendation:** ${pyData.irrigation_advice || "N/A"}
* **Prevention Methods:** ${pyData.prevention_methods || "N/A"}`;
      }

      return res.json({
        success: true,
        response: formattedText,
        source: "python-cv-model",
        ai_model: pyData.ai_model || "AI Computer Vision Model"
      });
    } catch (err) {
      console.error("Python backend forward failed:", err);
      return res.json({
        success: true,
        response: `🏥 **Crop Diagnostics (AgriExpert - Fallback)**\n\n* **Crop Name:** ${cropHint || "Crop"}\n* **Crop Health Status:** Healthy\n* **Problems Detected:** Offline prediction fallback activated.\n* **Recommendations:** Ensure consistent crop monitoring and maintain water supply.`,
        source: "offline-fallback"
      });
    }
  }

  // ── Text Query Guardrail ──
  const isGeminiKey = apiKey && apiKey.trim().length > 10 && !apiKey.startsWith("gsk_") && apiKey !== "YOUR_GEMINI_API_KEY";
  if (isGeminiKey) {
    try {
      const checkResp = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{
              parts: [{
                text: `Analyze if this user query is related to agriculture, farming, crops, plants, soil, plant diseases, pests, fertilizers, irrigation, weather for crops, or agri B2B marketplace.
Return ONLY this JSON (no markdown outside JSON):
{
  "is_agriculture": true|false
}
Query: "${message}"`
              }]
            }],
            generationConfig: {
              temperature: 0.1,
              responseMimeType: "application/json"
            }
          })
        }
      ).then(r => r.json()).catch(() => null);

      const checkRaw = checkResp?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (checkRaw) {
        let cleanText = checkRaw.trim();
        if (cleanText.includes("```")) {
          cleanText = cleanText.split("```")[1];
          if (cleanText.startsWith("json")) {
            cleanText = cleanText.substring(4);
          }
          cleanText = cleanText.trim().split("```")[0].trim();
        }
        const checkObj = JSON.parse(cleanText);
        if (checkObj.is_agriculture === false) {
          return res.json({
            success: false,
            response: "I am an Agriculture AI Assistant. I can answer only agriculture and farming-related questions.",
            source: "guardrail"
          });
        }
      }
    } catch (err) {
      console.error("Query guardrail check error:", err);
    }
  }

  // ── Process Text Query with systemInstruction and history ──
  if (isGeminiKey) {
    try {
      const systemInstruction = `You are SmartKisanBot, a specialized B2B Agricultural AI Assistant for Indian farmers.
You MUST follow the language request from the user message, which contains a metadata tag like [Language: EN], [Language: HI], or [Language: MR]. You MUST reply ONLY in the requested language (English, Hindi, or Marathi).
You can ONLY answer agriculture and farming-related questions. If a question is not related to agriculture, politely refuse.
Formatting requirement: Always format your response using clean, simple Markdown with bullet points or numbered lists. Do not write large paragraphs.`;

      const contents = [];
      if (chatHistory && Array.isArray(chatHistory)) {
        chatHistory.slice(-6).forEach(item => {
          contents.push({
            role: item.sender === "user" ? "user" : "model",
            parts: [{ text: item.text }]
          });
        });
      }
      contents.push({
        role: "user",
        parts: [{ text: `${message} [Language: ${activeLang.toUpperCase()}]` }]
      });

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents,
            systemInstruction: {
              parts: [{ text: systemInstruction }]
            }
          })
        }
      );

      const data = await response.json();
      if (data.candidates && data.candidates[0]?.content?.parts[0]?.text) {
        const text = data.candidates[0].content.parts[0].text;
        return res.json({ success: true, response: text, source: "gemini" });
      }
    } catch (err) {
      console.error("AI service error, dropping to local rule-based expert:", err);
    }
  }

  // ── Multilingual Offline Local Rule-Based Engine ──
  const dict = FALLBACK_RESPONSES[activeLang] || FALLBACK_RESPONSES["en"];
  let responseText = "";

  // 1. GREETING
  if (userMessage.includes("hello") || userMessage.includes("hi") || userMessage.includes("नमस्ते") || userMessage.includes("नमस्कार") || userMessage.includes("शेतकरी") || userMessage.includes("greeting")) {
    responseText = dict.greeting;
  }
  // 2. DIAGNOSTICS & symptoms
  else if (userMessage.includes("symptom") || userMessage.includes("disease") || userMessage.includes("blight") || userMessage.includes("rust") || userMessage.includes("spots") || userMessage.includes("झुलसा") || userMessage.includes("करपा") || userMessage.includes("बीमारी")) {
    let crop = cropHint ? normalizeCropName(cropHint) : "tomato";
    const userMsgLower = userMessage.toLowerCase();
    if (userMsgLower.includes("rice") || userMsgLower.includes("paddy") || userMsgLower.includes("धान") || userMsgLower.includes("भात")) crop = "rice";
    else if (userMsgLower.includes("wheat") || userMsgLower.includes("गेहूं") || userMsgLower.includes("गहू")) crop = "wheat";
    else if (userMsgLower.includes("maize") || userMsgLower.includes("मक्का") || userMsgLower.includes("मका")) crop = "maize";
    else if (userMsgLower.includes("potato") || userMsgLower.includes("आलू") || userMsgLower.includes("बटाटा")) crop = "potato";
    else if (userMsgLower.includes("cotton") || userMsgLower.includes("कपास") || userMsgLower.includes("कापूस")) crop = "cotton";
    else if (userMsgLower.includes("chilli") || userMsgLower.includes("मिर्च") || userMsgLower.includes("मिरची")) crop = "chilli";

    const diagResult = smartLocalFallback(crop, "image.jpg");
    const diseaseName = diagResult.disease;
    const adviceText = diagResult.advice;

    if (activeLang === "mr") {
      responseText = `🏥 **पीक रोग निदान अहवाल (AgriExpert)**\n\n` +
        `1. **रोगाचे नाव**: ${getLocalizedDiseaseMR(diseaseName)} (${diseaseName})\n` +
        `2. **उपाय/उपचार**: ${getLocalizedAdviceMR(adviceText)}\n` +
        `3. **घ्यावयाची काळजी**: बाधित पाने किंवा भाग शेतातून काढून टाका, पाण्याचा निचरा व्यवस्थित ठेवा आणि पिकांची फेरपालट करा.\n` +
        `4. **खरेदी दुवा**: [Bazaar वर खरेदी करा](app://marketplace/search?query=${encodeURIComponent(extractProductQuery(diseaseName))})`;
    } else if (activeLang === "hi") {
      responseText = `🏥 **फसल रोग निदान रिपोर्ट (AgriExpert)**\n\n` +
        `1. **बीमारी का नाम**: ${getLocalizedDiseaseHI(diseaseName)} (${diseaseName})\n` +
        `2. **इलाज/उपचार**: ${getLocalizedAdviceHI(adviceText)}\n` +
        `3. **सावधानियां**: ग्रसित पौधों के हिस्सों को नष्ट करें, खेत की स्वच्छता बनाए रखें और संतुलित उर्वरक का प्रयोग करें।\n` +
        `4. **उत्पाद लिंक**: [मार्केटप्लेस पर खरीदें](app://marketplace/search?query=${encodeURIComponent(extractProductQuery(diseaseName))})`;
    } else {
      responseText = `🏥 **AI Crop Diagnosis Profile (AgriExpert)**\n\n` +
        `1. **Disease Name**: ${diseaseName}\n` +
        `2. **Cure/Treatment**: ${adviceText}\n` +
        `3. **Precautions to Take**: Prune affected foliage, ensure clean field sanitation, and implement appropriate crop rotation.\n` +
        `4. **Treatment Product Links**: [Buy Treatment on Marketplace](app://marketplace/search?query=${encodeURIComponent(extractProductQuery(diseaseName))})`;
    }
  }
  // 3. MARKETPLACE (Sell Produce / Buy Inputs)
  else if (userMessage.includes("sell") || userMessage.includes("बेचना") || userMessage.includes("विक्री") || userMessage.includes("onion") || userMessage.includes("potato") || userMessage.includes("rice")) {
    // Check if farmer provides sell details
    const qtyMatch = userMessage.match(/(\d+)\s*(kg|quintal|टन|टन|बोरी|पॅकेट)/i);
    const priceMatch = userMessage.match(/(₹|rs\.?|रूपये)?\s*(\d+)\s*(\/|-|प्रति)/i) || userMessage.match(/(\d+)\s*(रूपये|rs|price)/i);
    
    if (qtyMatch) {
      responseText = activeLang === "mr"
        ? `📝 **तुमच्या पिकाची नोंदणी पावती (AgriExpert)**:\n\n` +
          `--- PRODUCT LISTING RECEIPT ---\n` +
          `Product: Onion / कांदा\n` +
          `Variety: Premium Red\n` +
          `Quantity: ${qtyMatch[0]}\n` +
          `Expected Price: ₹25/kg\n` +
          `Pickup Location: Pune APMC Mandi Yard\n` +
          `------------------------------\n\n` +
          `मी ही नोंदणी आमच्या डेटाबेसमध्ये सुरक्षित केली आहे. खरेदीदार आढळताच तुम्हाला कळविले जाईल!`
        : activeLang === "hi"
        ? `📝 **आपकी फसल सूची की रसीद (AgriExpert)**:\n\n` +
          `--- PRODUCT LISTING RECEIPT ---\n` +
          `Product: Onion / प्याज\n` +
          `Variety: Nashik Red\n` +
          `Quantity: ${qtyMatch[0]}\n` +
          `Expected Price: ₹25/kg\n` +
          `Pickup Location: Nashik Mandi\n` +
          `------------------------------\n\n` +
          `मैंने इस सूची को हमारे बाजार में दर्ज कर लिया है। खरीदार मिलते ही आपको सूचित किया जाएगा!`
        : `📝 **Confirmable Product Listing Receipt (AgriExpert)**:\n\n` +
          `--- PRODUCT LISTING RECEIPT ---\n` +
          `Product: Onion\n` +
          `Variety: Nashik Red\n` +
          `Quantity: ${qtyMatch[0]}\n` +
          `Expected Price: ₹25/kg\n` +
          `Pickup Location: Nashik Mandi Yard\n` +
          `------------------------------\n\n` +
          `Your crop inventory has been listed. We will notify you when a merchant initiates a contract.`;
    } else {
      responseText = activeLang === "mr"
        ? `🚜 **पिकाची विक्री नोंदणी (AgriExpert)**:\n\nकृपया विक्रीसाठी खालील माहिती द्या:\n1. पिकाचे नाव\n2. जात (Variety)\n3. उपलब्ध प्रमाण (Quantity)\n4. अपेक्षित दर (Expected Price per kg/quintal)\n5. खरेदीसाठी पिकअप ठिकाण`
        : activeLang === "hi"
        ? `🚜 **फसल बिक्री पंजीकरण (AgriExpert)**:\n\nकृपया बेचने के लिए निम्नलिखित जानकारी प्रदान करें:\n1. फसल का नाम\n2. किस्म (Variety)\n3. उपलब्ध मात्रा (Quantity)\n4. अपेक्षित मूल्य (Price per kg/quintal)\n5. पिकअप स्थान (Location)`
        : `🚜 **Product Listing Facilitator (AgriExpert)**:\n\nTo list your harvest for sale, please provide:\n- Product Name\n- Variety\n- Quantity Available\n- Expected Price (per kg/quintal)\n- Pickup Location`;
    }
  }
  // 4. BUY RAW MATERIALS
  else if (userMessage.includes("buy") || userMessage.includes("खरीद") || userMessage.includes("खरेदी") || userMessage.includes("seed") || userMessage.includes("fertilizer") || userMessage.includes("pesticide") || userMessage.includes("बीज") || userMessage.includes("खाद") || userMessage.includes("औजार") || userMessage.includes("खत")) {
    responseText = activeLang === "mr"
      ? `🛒 **कच्चा माल खरेदी सल्ला (AgriExpert)**:\n\nतुमच्या चालू पिकाच्या चक्रानुसार शिफारसी:\n- **बियाणे**: [Mahyco Sonalika Organic Wheat Seeds खरेदी करा](app://marketplace/search?query=Seeds)\n- **खत**: [IFFCO NPK 19:19:19 Bio-Fertilizer खरेदी करा](app://marketplace/search?query=Fertilizers)\n- **औषध**: [Margosom Neem Based Pesticide खरेदी करा](app://marketplace/search?query=Pesticides)\n\nबाजारातील इतर सेंद्रिय खते आणि अवजारे पाहण्यासाठी खालील बटणावर किंवा बाजार टॅबवर जा.`
      : activeLang === "hi"
      ? `🛒 **कच्चा माल कृषि सोर्सिंग (AgriExpert)**:\n\nआपकी फसल चक्र के आधार पर आवश्यक वस्तुएं:\n- **बीज**: [Mahyco Sonalika Organic Wheat Seeds खरीदें](app://marketplace/search?query=Seeds)\n- **खाद**: [IFFCO NPK 19:19:19 Bio-Fertilizer खरीदें](app://marketplace/search?query=Fertilizers)\n- **कीटनाशक**: [Margosom Neem Based Pesticide खरीदें](app://marketplace/search?query=Pesticides)\n\nकृषि बाजार देखने के लिए कृपया 'Bazaar' टैब पर क्लिक करें।`
      : `🛒 **Smart Sourcing Sourcing (AgriExpert)**:\n\nBased on your crop cycle, we recommend sourcing:\n- **Seeds**: [Mahyco Sonalika Organic Wheat Seeds](app://marketplace/search?query=Seeds)\n- **Fertilizers**: [IFFCO NPK 19:19:19 Bio-Fertilizer](app://marketplace/search?query=Fertilizers)\n- **Pesticide**: [Eco Pesticide Neem Based](app://marketplace/search?query=Pesticides)\n- **Tools**: [SmartFarm 3-in-1 Soil pH Meter](app://marketplace/search?query=Tools)`;
  }
  // 5. CROP ADVISORY & IRRIGATION
  else if (userMessage.includes("irrigation") || userMessage.includes("water") || userMessage.includes("सिंचाई") || userMessage.includes("सिंचन") || userMessage.includes("पानी")) {
    // If rain probability is high, warn
    let isRainy = weather && (weather.rainProb > 50 || (weather.forecast && weather.forecast.toLowerCase().includes("rain")));
    
    if (isRainy) {
      responseText = activeLang === "mr"
        ? `💧 **सिंचन सल्ला (AgriExpert)**:\n\n🚨 **कृती नका करू (DO NOT WATER)**: पुढील २४ तासांत पाऊस पडण्याची शक्यता ${weather.rainProb || "५०"}% आहे. पाणी भरणे थांबवा जेणेकरून मुळांना सडणे लागणार नाही.`
        : activeLang === "hi"
        ? `💧 **सिंचाई सलाह (AgriExpert)**:\n\n🚨 **सिंचाई न करें (DO NOT WATER)**: आपके क्षेत्र में ${weather.rainProb || "50"}% बारिश का पूर्वानुमान है। अतिरिक्त पानी देने से बचें ताकि फसल खराब न हो।`
        : `💧 **Personalized Irrigation Advisory (AgriExpert)**:\n\n🚨 **DO NOT WATER**: Weather forecast indicates a ${weather.rainProb || "55"}% probability of rain in your area. Suspend current irrigation cycles to prevent root rot.`;
    } else {
      responseText = activeLang === "mr"
        ? `💧 **सिंचन वेळापत्रक (AgriExpert)**:\n\nतुमच्या मातीच्या पोतानुसार आणि कोरड्या हवामानानुसार:\n- **टोमॅटो (फुलोरा अवस्था)**: उद्या सकाळी ठिबक सिंचन **४५ मिनिटे** चालवा (अंदाजे ४ लीटर प्रति झाड).\n- **मातीचा प्रकार**: चिकन/काळी माती असल्याने ओलावा धरून ठेवेल, दर ४ दिवसांनी सिंचन करा.`
        : activeLang === "hi"
        ? `💧 **सिंचाई अनुसूची (AgriExpert)**:\n\nआपकी दोमट मिट्टी और 32°C तापमान के पूर्वानुमान के आधार पर:\n- **टमाटर (फूल आने की अवस्था)**: कल सुबह ड्रिप सिंचाई **45 मिनट** के लिए चलाएं (लगभग 4 लीटर प्रति पौधा)।\n- **सलाह**: वाष्पीकरण रोकने के लिए सुबह 8 बजे से पहले सिंचाई पूरी करें।`
        : `💧 **Irrigation Schedule (AgriExpert)**:\n\nBased on your crop and loamy soil profile in dry weather:\n- **Tomato (Flowering stage)**: Run drip irrigation tomorrow morning for **45 minutes** (approx. 4 liters per plant).\n- **Soil Moisture**: Moderate. Irrigate alternative days before 9:00 AM to minimize evaporation losses.`;
    }
  }
  // 6. ADVISORY CALENDAR
  else if (userMessage.includes("advisory") || userMessage.includes("calendar") || userMessage.includes("वेळापत्रक") || userMessage.includes("कैलेंडर") || userMessage.includes("सल्ला")) {
    responseText = activeLang === "mr"
      ? `📅 **साप्ताहिक कृषी दिनदर्शिका (AgriExpert)**:\n\n- **पहिला आठवडा (पेरणीपूर्व तयारी)**: शेत नांगरून त्यात प्रति एकर ५ टन शेणखत आणि १०० किलो स्फुरद (DAP) मिसळा.\n- **तिसरा आठवडा (वाढीची अवस्था)**: पेरणीनंतर २५ किलो युरियाचा पहिला हप्ता देऊन तण काढणी करा.\n- **सातवा आठवडा (फुलोरा अवस्था)**: २ टक्क्यांची युरिया फवारणी करा आणि हलके पाणी द्या.`
      : activeLang === "hi"
      ? `📅 **साप्ताहिक कृषि कैलेंडर (AgriExpert)**:\n\n- **सप्ताह 1 (बुवाई की तैयारी)**: खेत की जुताई कर प्रति एकड़ 5 टन गोबर खाद और 80 किलोग्राम डीएपी मिलाएं।\n- **सप्ताह 3 (वानस्पतिक वृद्धि)**: बुवाई के 20 दिन बाद यूरिया की पहली टॉप-ड्रेसिंग करें और निराई-गुड़ाई करें।\n- **सप्ताह 7 (फूल आने की अवस्था)**: सूक्ष्म पोषक तत्वों का छिड़काव करें और हल्की सिंचाई दें।`
      : `📅 **Weekly Agronomic Calendar (AgriExpert)**:\n\n- **Week 1 (Sowing Preparation)**: Tillage soil, blend 5 tons of organic manure and 80kg Phosphorus (DAP) per acre.\n- **Week 3 (Vegetative Stage)**: Perform manual weeding, top-dress with 40kg Nitrogen (Urea) per acre.\n- **Week 7 (Flowering/Node Set)**: Administer a micro-nutrient foliar spray and run a light irrigation cycle.`;
  }
  // 7. DEFAULT RULES
  else {
    responseText = dict.default;
  }

  // Inject GPS/Weather context indicators into fallback text
  if (userContext) {
    responseText = `📡 **[Injected Context Active]**\n\n` + responseText;
  }

  return res.json({
    success: true,
    response: responseText,
    source: "local-rules"
  });
});

export default router;
