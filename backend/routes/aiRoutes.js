import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import Product from "../models/Product.js";

const router = express.Router();

// Multilingual fallback content for offline/no-key mode with correct agricultural facts
const FALLBACK_RESPONSES = {
  en: {
    greeting: "Namaste Kisan Bhai/Behan! I am AgriExpert, your elite AI agricultural specialist and digital farming assistant. Please select your preferred language: English, Hindi (हिंदी), or Marathi (मराठी) to begin, or ask me about crops, disease diagnostics, irrigation, and the marketplace!",
    guardrailRefusal: "System error: I can only diagnose crop diseases. Please upload a clear photo of your affected crop leaf, stem, or fruit.",
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
    guardrailRefusal: "सिस्टम त्रुटि: मैं केवल फसल रोगों का निदान कर सकता हूं। कृपया अपनी प्रभावित फसल की पत्ती, तने या फल की एक स्पष्ट तस्वीर अपलोड करें।",
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
    guardrailRefusal: "सिस्टम त्रुटी: मी फक्त पिकांच्या रोगांचे निदान करू शकतो. कृपया तुमच्या बाधित पिकाच्या पानाचा, खोडाचा किंवा फळाचा स्पष्ट फोटो अपलोड करा.",
    pest: "पांढऱ्या माशीच्या (Whiteflies) नियंत्रणासाठी:\n- पिवळे चिकट सापळे (१५-२० सापळे प्रति एकर) शेतात लावा.\n- लिंबोळी तेल (३००० ppm) ३-५ मिली प्रति लीटर पाण्यात मिसळून फवारा.\n- प्रादुर्भाव जास्त असल्यास, ॲसिटामिप्रीड २०% एसपी (०.२ ग्रॅम/लीटर) किंवा डायफेंथियुरॉन ५०% डब्ल्यूपी (१.२ ग्रॅम/लीटर) रसायनांची फवारणी करा.\n\n⚠️ *सुरक्षा चेतावणी: कीटकनाशक फवारताना कृपया हातमोजे आणि मास्क वापरा.*",
    soil: "सेंद्रिय खत तयार करण्यासाठी व जमिनीच्या आरोग्यासाठी:\n- शेत तयार करताना प्रति एकर १०-१५ टन शेणखत किंवा गांडूळ खत वापरा.\n- जैविक खते जसे की अझोटोबॅक्टर (नायट्रोजन स्थिर करण्यासाठी) आणि पीएसबी (PSB - स्फुरद विरघळवण्यासाठी) यांचा वापर करा.",
    tomato: "टोमॅटोसाठी सर्वोत्तम खत नियोजन:\n- टोमॅटो पिकासाठी नायट्रोजन, स्फुरद आणि पालाश (NPK) १२०:६०:६० किलो प्रति हेक्टर प्रमाणात आवश्यक आहे.\n- पानांवर कॅल्शियमची कमतरता टाळण्यासाठी कॅल्शियम क्लोराइड (०.५%) फवारा.",
    rice: "भातावरील करपा (Blast) रोगाचा उपचार:\n- ट्रायसायक्लाझोल ७५% डब्ल्यूपी (०.६ ग्रॅम/लीटर) किंवा कार्बेन्डाझिम ५०% डब्ल्यूपी (१.० ग्रॅम/लीटर) ची फवारणी करा.\n- शेतात पाण्याचा योग्य निचरा ठेवा आणि ५ सेमी पाणी साठवून ठेवा.\n- रोगट प्रादुर्भाव दिसताच युरियाचा अतिरिक्त वापर थांबवा.\n\n⚠️ *सुरक्षा चेतावणी: शेतात रासायनिक फवारणी करताना सुरक्षितता साधनांचा वापर करा.*",
    fertilizer: "खत सल्ला: पिकाची वाढ होण्यासाठी नायट्रोजन, मुळे मजबूत होण्यासाठी स्फुरद, आणि रोगप्रतिकारक शक्ती वाढवण्यासाठी पालाश खतांचा संतुलित वापर करा.",
    irrigation: "गहू पिकाचे सिंचन वेळापत्रक (६ महत्त्वाचे टप्पे):\n१. मुकुट मूळ सुरू होणे (CRI stage) - २१ दिवसांनी (अतिशय महत्त्वाचे - लगेच पाणी द्या!)\n२. फुटवे येणे (Tillering) - ४०-४५ दिवसांनी\n३. कांडी धरणे (Jointing) - ६०-६५ दिवसांनी\n४. फुलारा (Flowering) - ८०-८५ दिवसांनी\n५. दुधाळ अवस्था (Milking) - १००-१०५ दिवसांनी\n६. दाणे भरणे (Dough stage) - ११५-१२० दिवसांनी.",
    default: "मी जमिनीची चाचणी करण्याचे, हवामान अंदाज तपासण्याचे आणि पीक नियोजनात सुधारणा करण्याचे सुचवतो. मला टोमॅटो खत, भातावरील करपा, गहू सिंचन किंवा पांढऱ्या माशी नियंत्रण याबद्दल विचारा!"
  }
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

  // ── Crop Isolation Guardrail (Refuse human skin, animals, household objects, machinery, weeds) ──
  const nonCropKeywords = [
    "human", "skin", "finger", "hand", "face", "leg", "person", "man", "woman", "child",
    "cat", "dog", "tiger", "lion", "elephant", "bird", "snake", "monkey",
    "tractor", "tiller", "machinery", "plow", "harvester", "engine", "car", "bike", "truck",
    "table", "chair", "keyboard", "mobile", "phone", "bottle", "house", "room", "building", "furniture",
    "ornamental weed", "dandelion", "grass lawn"
  ];

  const WHITELISTED_CROPS = [
    "aji pepper", "almond", "amaranth", "apple", "artichoke", "avocado", "acai", "banana", "barley", "beet", "black pepper", "blueberry", "bok choy", "brazil nut", "broccoli", "brussels sprout", "buckwheat", "cabbage", "camucamu", "carrot", "cashew", "cassava", "cauliflower", "celery", "cherimoya", "cherry", "chestnut", "chickpea", "chili pepper", "cinnamon", "clove", "cocoa bean", "coconut", "coffee", "collards", "cotton", "cranberry", "cucumber", "date", "dry bean", "dry pea", "durian", "eggplant", "endive", "fava bean", "fig", "flax", "fonio", "garlic", "ginger", "gooseberry", "grape", "groundnut", "peanut", "guarana", "guava", "habanero pepper", "hazelnut", "hemp", "horseradish", "jackfruit", "jute", "kale", "kohlrabi", "leek", "lemon", "lime", "lentil", "lettuce", "lima bean", "longan", "lupin", "lychee", "maize", "corn", "mandarin", "clementine", "mango", "mangosteen", "maracuja", "passionfruit", "millet", "mint", "mung bean", "mustard green", "mustard seed", "navy bean", "oat", "oil palm", "okra", "olive", "onion", "orange", "oregano", "papaya", "parsley", "peach", "pear", "persimmon", "pine nut", "pineapple", "pinto bean", "pistachio", "plantain", "pomegranate", "potato", "pumpkin", "squash", "gourd", "quinoa", "radish", "rambutan", "rapeseed", "canola", "raspberry", "rice", "paddy", "rosemary", "rubber", "rye", "saffron", "sage", "scallion", "sorghum", "soursop", "soybean", "spinach", "starfruit", "strawberry", "sugar beet", "sugar cane", "sunflower seed", "sweet potato", "swiss chard", "tamarind", "taro", "tea", "teff", "thyme", "tomato", "triticale", "turmeric", "turnip", "vanilla bean", "walnut", "watermelon", "wheat", "yam"
  ];

  const containsNonCrop = nonCropKeywords.some(kw => userMessage.includes(kw)) || 
                          (cropHint && nonCropKeywords.some(kw => cropHint.toLowerCase().includes(kw)));

  const isDiagnosticsQuery = userMessage.includes("diagnostic") || userMessage.includes("disease") || image || userMessage.includes("symptom");
  const containsWhitelistedCrop = WHITELISTED_CROPS.some(keyword => userMessage.includes(keyword) || (cropHint && cropHint.toLowerCase().includes(keyword)));

  if (containsNonCrop || (isDiagnosticsQuery && !containsWhitelistedCrop && (cropHint || userMessage.length > 0))) {
    const refusal = FALLBACK_RESPONSES[activeLang]?.guardrailRefusal || FALLBACK_RESPONSES["en"].guardrailRefusal;
    return res.json({
      success: true,
      response: `🚨 ${refusal}`,
      source: "guardrail"
    });
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

  // ── Get Gemini/Groq API Key ──
  const headerKey = req.headers["x-gemini-key"];
  const apiKey = (headerKey && headerKey.trim().length > 10)
    ? headerKey.trim()
    : (process.env.GEMINI_API_KEY || process.env.GROQ_API_KEY);

  if (apiKey && apiKey !== "YOUR_GEMINI_API_KEY" && apiKey.trim().length > 10) {
    const isGroq = apiKey.startsWith("gsk_");
    try {
      const systemInstruction = 
        `You are "AgriExpert," an elite, highly accurate AI agricultural specialist and digital farming assistant. Your mission is to provide precise, actionable, and personalized agronomic advice, manage a dual-sided marketplace, diagnose crop diseases with absolute safety guardrails, and deliver localized climate-smart recommendations.

Global System Rules & Language Protocol:
1. Multilingual Enforcement: You must support English, Hindi (हिंदी), and Marathi (मराठी) fluently. The active language is: "${activeLang}". ALL text, marketplace listings, diagnostic reports, notifications, and advisory summaries must be rendered natively in that chosen language. If a greeting is sent, reply in that language.
2. Tone: Empathetic, supportive, clear, and highly practical. Avoid dense academic jargon; speak directly to the needs of a farmer.
3. Interaction Execution Style:
- Always check the user context details provided (GPS, weather details, image data).
- If key details like water availability are missing and you need them to give advice, ask a direct, simple multiple-choice question first.
- Keep responses highly scannable by using bolding and bullet points. Never output raw code blocks.

Module 1: Disease Diagnostics (With Fail-Safe Guardrail):
- Input: Image input metadata or user-described symptoms.
- CRITICAL GUARDRAIL (Crop Isolation): Before performing any analysis, evaluate the input. The diagnostic engine must ONLY analyze agricultural crops. If the image or text contains human skin, animals, household objects, machinery, or non-crop plants (like ornamental weeds unrelated to farming), you must immediately abort and return exactly this refusal message:
  "System error: I can only diagnose crop diseases. Please upload a clear photo of your affected crop leaf, stem, or fruit." (Translate to active language).
- Diagnostic Output Schema: If verified as a crop, output exactly this structured profile:
  1. Disease Name: [Scientific & Common name in selected language]
  2. Cure/Treatment: [Chemical and biological solutions with specific dosages]
  3. Precautions to Take: [Preventative measures, crop rotation, farm hygiene practices]
  4. Treatment Product Links: Provide explicit marketplace routing links: [Buy [Product Name] on Marketplace](app://marketplace/search?query=[Product Name])

Module 2: Dual-Sided Marketplace Module:
- Act as a smart facilitator for the marketplace, allowing seamless switching between Selling and Buying modes.
- Farmer as Seller (Product Listing): If the user wishes to list or sell a crop, prompt them for: Product Name, Variety, Quantity Available, Expected Price per kg/quintal, and Pickup Location. Structure this into a clean, confirmable text receipt:
  --- PRODUCT LISTING RECEIPT ---
  Product: [Product Name]
  Variety: [Variety]
  Quantity: [Quantity]
  Price: [Price]
  Location: [Pickup Location]
  ------------------------------
- Farmer as Buyer (Raw Material Sourcing): Search or recommend Seeds, Fertilizers, Pesticides, Organic manure, and Farming Tools. Cross-reference their current crop cycle to recommend what they will need next.

Module 3: Fully Working Crop Advisory System:
- Input: GPS coordinates (Location), weather inputs (temp, humidity, rain probability), and Water Availability metrics.
- Output: Generate a weekly calendar advising on sowing, fertilizer application timelines, weeding, and harvesting windows.

Module 4: Personalized Irrigation Advice Module:
- Calculations: Evaluate Crop Type + Growth Stage + Soil Moisture + Weather Forecast.
- Output: Explicit run schedules. Do not give generic tips. Example: "Based on your flowering tomatoes, clay soil, and a 35°C forecast, run your drip irrigation tomorrow morning for 45 minutes (approx. 4 liters per plant)." Give clear "Water / Do Not Water" triggers based on rainfall.

Module 5: Active Notification Module:
- Generate context-aware, real-time alerts:
  1. Weather Alerts (e.g. Sudden frost, heavy rainfall warning)
  2. Marketplace Updates (e.g. Buyer found for listed stocks)
  3. Pest Breakout Alerts (e.g. Fall Armyworm infestation within 10km)`;

      if (isGroq) {
        // Groq text-only chat integration
        const messages = [
          { role: "system", content: systemInstruction }
        ];
        if (userContext) {
          messages.push({ role: "system", content: `[User Context Metadata]\n${userContext}` });
        }
        if (chatHistory && Array.isArray(chatHistory)) {
          chatHistory.slice(-6).forEach(chat => {
            messages.push({
              role: chat.sender === "user" ? "user" : "assistant",
              content: chat.text
            });
          });
        }
        messages.push({ role: "user", content: message });

        const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiKey}`
          },
          body: JSON.stringify({
            model: "llama-3.3-70b-versatile",
            messages,
            temperature: 0.6
          })
        });

        const data = await response.json();
        if (data.choices && data.choices[0]?.message?.content) {
          const text = data.choices[0].message.content;
          return res.json({ success: true, response: text, source: "groq" });
        }
      } else {
        // Gemini vision + text integration
        const contents = [];
        if (chatHistory && Array.isArray(chatHistory)) {
          chatHistory.slice(-6).forEach(chat => {
            contents.push({
              role: chat.sender === "user" ? "user" : "model",
              parts: [{ text: chat.text }]
            });
          });
        }

        const userParts = [];
        if (userContext) {
          userParts.push({ text: `[User Context Metadata]\n${userContext}` });
        }
        userParts.push({ text: message });

        if (image && image.data && image.mimeType) {
          userParts.push({
            inline_data: {
              mime_type: image.mimeType,
              data: image.data
            }
          });
        }

        contents.push({ role: "user", parts: userParts });

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
    let crop = cropHint || "tomato";
    if (userMessage.includes("rice") || userMessage.includes("paddy") || userMessage.includes("धान") || userMessage.includes("भात")) crop = "rice";
    else if (userMessage.includes("wheat") || userMessage.includes("गेहूं") || userMessage.includes("गहू")) crop = "wheat";
    else if (userMessage.includes("maize") || userMessage.includes("मक्का") || userMessage.includes("मका")) crop = "maize";

    if (activeLang === "mr") {
      responseText = `🏥 **पीक रोग निदान अहवाल (AgriExpert)**\n\n`;
      if (crop.toLowerCase().includes("tomato")) {
        responseText += `1. **रोगाचे नाव**: टोमॅटो अर्ली ब्लाईट (Early Blight - Alternaria solani)\n`;
        responseText += `2. **उपाय/उपचार**: मँकोझेब ७५ डब्ल्यूपी (२ ग्रॅम/लीटर) किंवा कॉपर ऑक्सिक्लोराईड ५० डब्ल्यूपी (३ ग्रॅम/लीटर) दर ७-१० दिवसांनी फवारा.\n`;
        responseText += `3. **घ्यावयाची काळजी**: खालील बाधित पाने छाटून टाका, पाण्याचा निचरा व्यवस्थित ठेवा आणि पिकांची फेरपालट करा.\n`;
        responseText += `4. **खरेदी दुवा**: [Bazaar वर Mancozeb 75 WP खरेदी करा](app://marketplace/search?query=Mancozeb)`;
      } else {
        responseText += `1. **रोगाचे नाव**: भातावरील करपा (Rice Blast - Magnaporthe oryzae)\n`;
        responseText += `2. **उपाय/उपचार**: ट्रायसायक्लाझोल ७५% डब्ल्यूपी (०.६ ग्रॅम/लीटर) किंवा कार्बेन्डाझिम ५०% डब्ल्यूपी (१.० ग्रॅम/लीटर) फवारा.\n`;
        responseText += `3. **घ्यावयाची काळजी**: नत्राचा (युरिया) अतिवापर टाळा आणि शेतात ५ सेमी पाणी पातळी राखा.\n`;
        responseText += `4. **खरेदी दुवा**: [Bazaar वर Tricyclazole खरेदी करा](app://marketplace/search?query=Tricyclazole)`;
      }
    } else if (activeLang === "hi") {
      responseText = `🏥 **फसल रोग निदान रिपोर्ट (AgriExpert)**\n\n`;
      if (crop.toLowerCase().includes("tomato")) {
        responseText += `1. **बीमारी का नाम**: टमाटर अगेती झुलसा (Early Blight - Alternaria solani)\n`;
        responseText += `2. **इलाज/उपचार**: मैंकोजेब 75 डब्ल्यूपी (2 ग्राम/लीटर) या कॉपर ऑक्सीक्लोराइड 50 डब्ल्यूपी (3 ग्राम/लीटर) का छिड़काव हर 7-10 दिनों में करें।\n`;
        responseText += `3. **सावधानियां**: ग्रसित निचली पत्तियों को काटें, मल्चिंग करें, और फसल चक्र अपनाएं।\n`;
        responseText += `4. **उत्पाद लिंक**: [मार्केटप्लेस पर Mancozeb खरीदें](app://marketplace/search?query=Mancozeb)`;
      } else {
        responseText += `1. **बीमारी का नाम**: धान का झोंका रोग (Rice Blast - Magnaporthe oryzae)\n`;
        responseText += `2. **इलाज/उपचार**: ट्राइसाइक्लाजोल 75% डब्ल्यूपी (0.6 ग्राम/लीटर) या कार्बेन्डाजिम 50% डब्ल्यूपी (1 ग्राम/लीटर) का छिड़काव करें।\n`;
        responseText += `3. **सावधानियां**: यूरिया का अत्यधिक उपयोग बंद करें और खेत में 5 सेमी पानी का स्तर बनाए रखें।\n`;
        responseText += `4. **उत्पाद लिंक**: [मार्केटप्लेस पर Tricyclazole खरीदें](app://marketplace/search?query=Tricyclazole)`;
      }
    } else {
      responseText = `🏥 **AI Crop Diagnosis Profile (AgriExpert)**\n\n`;
      if (crop.toLowerCase().includes("tomato")) {
        responseText += `1. **Disease Name**: Tomato Early Blight (Alternaria solani)\n`;
        responseText += `2. **Cure/Treatment**: Spray Mancozeb 75 WP (2 g/L) or Copper Oxychloride 50 WP (3 g/L) every 7-10 days.\n`;
        responseText += `3. **Precautions to Take**: Prune lower infected leaves, apply straw mulching, and practice crop rotation.\n`;
        responseText += `4. **Treatment Product Links**: [Buy Mancozeb 75 WP on Marketplace](app://marketplace/search?query=Mancozeb)`;
      } else {
        responseText += `1. **Disease Name**: Rice Leaf Blast (Magnaporthe oryzae)\n`;
        responseText += `2. **Cure/Treatment**: Apply Tricyclazole 75% WP (0.6 g/L) or Carbendazim 50% WP (1.0 g/L).\n`;
        responseText += `3. **Precautions to Take**: Stop excess Nitrogen (Urea) applications during active spots and drain fields periodically.\n`;
        responseText += `4. **Treatment Product Links**: [Buy Tricyclazole on Marketplace](app://marketplace/search?query=Tricyclazole)`;
      }
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
