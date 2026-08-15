import express from "express";
import fs from "fs";
import { protect } from "../middleware/authMiddleware.js";
import Product from "../models/Product.js";
import { analyzeWithHuggingFace, smartLocalFallback } from "./cropDiseaseRoutes.js";
import { getAgriExpertReply } from "../services/agriExpertService.js";

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
router.post("/chat", async (req, res) => {
  const { message, history, chatHistory, language, gps, weather, waterAvailability } = req.body;
  const userMsg = message || "";
  if (!userMsg) {
    return res.status(400).json({ error: "message is required" });
  }

  const geminiKey = (req.headers["x-gemini-key"] || (typeof req.body?.geminiKey === "string" ? req.body.geminiKey : "") || "").trim();

  try {
    const reply = await getAgriExpertReply({
      message: userMsg,
      history: history || chatHistory || [],
      context: {
        location: gps,
        weather,
        waterSource: waterAvailability,
        language: language === "mr" ? "Marathi" : language === "hi" ? "Hindi" : "English",
        geminiKey
      }
    });
    return res.json({
      success: true,
      response: reply,
      reply,
      source: process.env.OPENAI_API_KEY ? "chatgpt" : process.env.ANTHROPIC_API_KEY ? "claude" : geminiKey ? "gemini" : "agriexpert"
    });
  } catch (err) {
    console.error("AgriExpert API error:", err);
    return res.status(500).json({
      error: "AgriExpert is temporarily unavailable. Please try again.",
    });
  }
});

export default router;
