import express from "express";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

// Multilingual fallback content for offline/no-key mode
const FALLBACK_RESPONSES = {
  en: {
    greeting: "Hello! I am Kisan AI, your agricultural assistant. Ask me anything about crop diseases, fertilizers, watering, or sowing schedules!",
    pest: "For pest control:\n- Use Neem oil spray for aphids and mites.\n- Apply ash to ward off beetles.\n- Maintain crop rotation to break pest lifecycles.",
    soil: "For healthy soil, practice organic manuring. Apply compost, bio-fertilizers (Azotobacter, Rhizobium), and crop residues to boost organic carbon content.",
    tomato: "Tomato cultivation tips:\n- Sowing temp: 21-24°C.\n- Watering: Keep soil moist but not waterlogged. Water deeply once a week.\n- Deficiencies: Calcium deficiency causes blossom end rot. Spray calcium chloride.",
    rice: "Paddy/Rice tips:\n- Maintain 5cm water level in fields during early tillering to flowering stages.\n- Split nitrogen applications (basal, tillering, panicle initiation).\n- Monitor for Blast disease (spindle-shaped leaf spots).",
    fertilizer: "Fertilizer advice: Test your soil before application. Apply Nitrogen (N) for vegetative growth, Phosphorus (P) for root development, and Potassium (K) for crop disease resistance and quality fruits.",
    irrigation: "Irrigation advice: Drip irrigation saves up to 50% water. Water crops during early morning or late evening to minimize evaporation losses.",
    default: "I recommend checking local soil nutrient levels, monitoring daily weather forecasts, and adjusting crop schedules. Let me know if you want detailed info on crops like Tomato, Paddy, Wheat, or pest controls!"
  },
  hi: {
    greeting: "नमस्ते! मैं किसान एआई हूं, आपका कृषि सहायक। मुझसे फसल के रोगों, खादों, सिंचाई या बुवाई के बारे में कुछ भी पूछें!",
    pest: "कीट नियंत्रण के लिए:\n- एफिड्स और माइट्स के लिए नीम के तेल का स्प्रे करें।\n- बीटल्स को दूर रखने के लिए लकड़ी की राख का छिड़काव करें।\n- फसल चक्र अपनाएं ताकि कीटों का चक्र टूट सके।",
    soil: "स्वस्थ मिट्टी के लिए जैविक खाद का उपयोग करें। जैविक कार्बन बढ़ाने के लिए कम्पोस्ट, जैव-उर्वरक (राइजोबियम) और फसल अवशेष डालें।",
    tomato: "टमाटर की खेती के टिप्स:\n- बुवाई तापमान: 21-24°C।\n- सिंचाई: मिट्टी नम रखें पर जलभराव न होने दें। सप्ताह में एक बार गहरी सिंचाई करें।\n- पोषण कमी: कैल्शियम की कमी से फल सड़ते हैं। कैल्शियम क्लोराइड का स्प्रे करें।",
    rice: "धान/चावल के टिप्स:\n- कल्ले फूटते समय और फूल आते समय खेत में 5 सेमी पानी का स्तर बनाए रखें।\n- नाइट्रोजन को तीन भागों में विभाजित करके डालें (बुवाई, कल्ले फुटाव, और बालियाँ आते समय)।",
    fertilizer: "उर्वरक सलाह: प्रयोग से पहले मिट्टी की जांच अवश्य करें। पत्तियों की वृद्धि के लिए नाइट्रोजन, जड़ों के विकास के लिए फास्फोरस, और फलों की गुणवत्ता व रोग प्रतिरोधक क्षमता के लिए पोटेशियम डालें।",
    irrigation: "सिंचाई सलाह: टपक सिंचाई (Drip irrigation) से 50% तक पानी बचता है। वाष्पीकरण से बचने के लिए सुबह जल्दी या शाम को पानी दें।",
    default: "मैं स्थानीय मिट्टी की जांच करने, दैनिक मौसम पूर्वानुमान पर नजर रखने और फसल कार्यक्रम को समायोजित करने की सलाह देता हूं। टमाटर, धान, गेहूं या कीट नियंत्रण के बारे में पूछें!"
  }
};

// POST /api/ai/chat
router.post("/chat", protect, async (req, res) => {
  const { message, chatHistory, language } = req.body;
  const lang = language || "en";
  const userMessage = message ? message.toLowerCase() : "";

  // Check for Gemini API key in Headers, Env, or Request body
  const geminiKey = req.headers["x-gemini-key"] || process.env.GEMINI_API_KEY;

  if (geminiKey && geminiKey !== "YOUR_GEMINI_API_KEY" && geminiKey.trim().length > 10) {
    try {
      // Setup the system prompt
      const systemInstruction = 
        `You are Kisan AI, a highly expert, supportive agricultural assistant and agronomy specialist. 
         Provide your advice in the user's requested language (current language code is: ${lang}). 
         Keep answers highly actionable, practical, format with bullet points, and use farmer-friendly terminology with helpful emojis. 
         Discuss soil conditions, crop types, fertilizer calculations, organic alternatives, and weather dependencies where relevant.`;

      // Build Gemini API payload
      const contents = [];
      if (chatHistory && Array.isArray(chatHistory)) {
        chatHistory.slice(-6).forEach(chat => {
          contents.push({
            role: chat.sender === "user" ? "user" : "model",
            parts: [{ text: chat.text }]
          });
        });
      }
      contents.push({
        role: "user",
        parts: [{ text: `${systemInstruction}\n\nUser Question: ${message}` }]
      });

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ contents })
        }
      );

      const data = await response.json();
      if (data.candidates && data.candidates[0]?.content?.parts[0]?.text) {
        const text = data.candidates[0].content.parts[0].text;
        return res.json({ success: true, response: text, source: "gemini" });
      } else {
        console.warn("Gemini structure response issue:", data);
        throw new Error("Invalid API response format");
      }
    } catch (error) {
      console.error("Gemini API Error, falling back to local advisor:", error);
    }
  }

  // Fallback Rule-Based Response Generator
  const dict = FALLBACK_RESPONSES[lang] || FALLBACK_RESPONSES["en"];
  let reply = dict.default;

  if (userMessage.includes("hello") || userMessage.includes("hi") || userMessage.includes("नमस्ते") || userMessage.includes("हैलो")) {
    reply = dict.greeting;
  } else if (userMessage.includes("pest") || userMessage.includes("insect") || userMessage.includes("कीट") || userMessage.includes("कीड़ा")) {
    reply = dict.pest;
  } else if (userMessage.includes("soil") || userMessage.includes("mitti") || userMessage.includes("मिट्टी") || userMessage.includes("भूमि")) {
    reply = dict.soil;
  } else if (userMessage.includes("tomato") || userMessage.includes("tamatar") || userMessage.includes("टमाटर")) {
    reply = dict.tomato;
  } else if (userMessage.includes("rice") || userMessage.includes("paddy") || userMessage.includes("धान") || userMessage.includes("चावल")) {
    reply = dict.rice;
  } else if (userMessage.includes("fertilizer") || userMessage.includes("khad") || userMessage.includes("खाद") || userMessage.includes("यूरिया")) {
    reply = dict.fertilizer;
  } else if (userMessage.includes("water") || userMessage.includes("irrigation") || userMessage.includes("sinchai") || userMessage.includes("सिंचाई") || userMessage.includes("पानी")) {
    reply = dict.irrigation;
  }

  return res.json({
    success: true,
    response: reply,
    source: "local-rules"
  });
});

export default router;
