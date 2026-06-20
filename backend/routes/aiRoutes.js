import express from "express";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

// Multilingual fallback content for offline/no-key mode with correct agricultural facts
const FALLBACK_RESPONSES = {
  en: {
    greeting: "Namaste Kisan Bhai/Behan! Welcome to Kisan AI Copilot, your dedicated agricultural assistant. Thank you for your hard work in feeding our nation. How can I help you today with your crops, soil, or farming decisions?",
    pest: "For whiteflies control:\n- Install Yellow Sticky Traps (15-20 traps per acre) to trap flying insects.\n- Spray Neem Oil (3000 ppm) at 3-5 ml per litre of water with organic detergent.\n- For severe attacks, apply systemic Acetamiprid 20% SP (0.2 g/L) or Diafenthiuron 50% WP (1.2 g/L) chemical sprays.\n\n⚠️ Safety Warning: Please wear gloves, a mask, and protective clothing when mixing and spraying pesticides.",
    soil: "For healthy soil:\n- Practice organic manuring by applying 10-15 tons of farmyard manure or vermicompost.\n- Apply bio-fertilizers (Azotobacter for Nitrogen fixation, PSB for Phosphorus solubilizing, and KMB for Potassium mobilizing) to improve soil microbiology.",
    tomato: "Tomato cultivation & fertilizer guidelines:\n- Require NPK in a 120:60:60 kg/ha ratio.\n- Sowing temperature: 21-24°C.\n- Watering: Irrigate weekly, keeping soil moist but avoid waterlogging to prevent damping-off.\n- Deficiency: Calcium deficit causes blossom end rot. Spray Calcium Chloride (0.5%) at flowering.",
    rice: "Paddy/Rice leaf blast (Alternaria/Blast) treatment:\n- Spray Tricyclazole 75% WP (0.6 g/L) or Carbendazim 50% WP (1.0 g/L).\n- Maintain a shallow water level of 5cm in puddled fields.\n- Reduce excess Nitrogen (Urea) applications during active leaf spotting.\n\n⚠️ Safety Warning: Ensure safety gear (gloves, mask) is worn while spraying chemicals.",
    fertilizer: "General fertilizer advice:\n- Conduct a soil test first to map deficiencies.\n- Apply Nitrogen (N) for vegetative foliage growth, Phosphorus (P) for deep root establishment, and Potassium (K) for crop disease resistance and heavy yield quality.",
    irrigation: "Wheat watering schedule:\n- Water at the 6 critical growth stages:\n1. Crown Root Initiation (CRI) at 21 days (most critical - irrigate immediately!)\n2. Tillering at 40-45 days\n3. Jointing at 60-65 days\n4. Flowering at 80-85 days\n5. Milking stage at 100-105 days\n6. Dough stage at 115-120 days.",
    default: "I recommend checking local soil nutrient levels, monitoring daily weather forecasts, and adjusting crop schedules. Ask me about Tomato fertilizer, Paddy blast, Wheat watering, or Whiteflies control!"
  },
  hi: {
    greeting: "नमस्ते किसान भाई/बहन! किसान एआई कोपायलट में आपका स्वागत है। हमारे देश को अन्न देने के लिए आपका बहुत-बहुत धन्यवाद। आज मैं आपकी फसलों, मिट्टी या खेती के निर्णयों में कैसे मदद कर सकता हूँ?",
    pest: "सफ़ेद मक्खी (Whiteflies) नियंत्रण के लिए:\n- पीली चिपचिपी जालियां (15-20 ट्रैप प्रति एकड़) लगाएं।\n- नीम का तेल (3000 ppm) 3-5 मिली प्रति लीटर पानी में मिलाकर स्प्रे करें।\n- गंभीर स्थिति में, एसिटामिप्रिड 20% एसपी (0.2 ग्राम/लीटर) का छिड़काव करें।\n\n⚠️ सुरक्षा चेतावनी: कीटनाशक का छिड़काव करते समय कृपया दस्ताने और मास्क जरूर पहनें।",
    soil: "स्वस्थ मिट्टी के लिए:\n- खेत की तैयारी के समय 10-15 टन जैविक कम्पोस्ट या केंचुआ खाद डालें।\n- राइजोबियम, पीएसबी (PSB) और एज़ोटोबैक्टर जैव-उर्वरकों का उपयोग करें ताकि मिट्टी की उर्वरकता बढ़े।",
    tomato: "टमाटर की खेती और उर्वरक सलाह:\n- टमाटर के लिए NPK अनुपात 120:60:60 किलोग्राम प्रति हेक्टेयर होना चाहिए।\n- तापमान 21-24°C बुवाई के लिए उत्तम है। सप्ताह में एक बार गहरी सिंचाई करें।\n- कैल्शियम की कमी से फल सड़ते हैं (Blossom end rot)। कैल्शियम क्लोराइड (0.5%) का स्प्रे करें।",
    rice: "धान में ब्लास्ट रोग का उपचार:\n- ट्राइसाइक्लाजोल 75% डब्ल्यूपी (0.6 ग्राम/लीटर) या कार्बेन्डाजिम 50% डब्ल्यूपी (1 ग्राम/लीटर) का छिड़काव करें।\n- नाइट्रोजन (यूरिया) का अत्यधिक उपयोग रोकें। खेत में 5 सेमी पानी का स्तर बनाए रखें।\n\n⚠️ सुरक्षा चेतावनी: रासायनिक छिड़काव के दौरान मास्क और सुरक्षात्मक कपड़े पहनना सुनिश्चित करें।",
    fertilizer: "उर्वरक सलाह: पत्तियों की वृद्धि के लिए नाइट्रोजन, जड़ों के विकास के लिए फास्फोरस, और जड़ों को रोग प्रतिरोधक क्षमता व गुणवत्ता के लिए पोटेशियम का सही मात्रा में छिड़काव करें।",
    irrigation: "गेहूं की सिंचाई का समयपत्रक:\nगेहूं की फसल में ६ प्रमुख चरणों में सिंचाई अवश्य करें:\n१. क्राउन रूट इनिशिएशन (CRI) - २१ दिनों में (सबसे महत्वपूर्ण!)\n२. कल्ले फूटने पर - ४०-४५ दिन\n३. गांठे बनने पर - ६०-६५ दिन\n४. फूल आने पर - ८०-८५ दिन\n५. दूध बनने की अवस्था - १००-१०५ दिन\n६. दाना पकने पर - ११५-१२० दिन।",
    default: "मैं मिट्टी की जांच करने, दैनिक मौसम पूर्वानुमान पर नजर रखने और फसल कार्यक्रम को बदलने की सलाह देता हूं। टमाटर खाद, धान ब्लास्ट, गेहूं सिंचाई या कीट नियंत्रण के बारे में पूछें!"
  },
  mr: {
    greeting: "नमस्ते शेतकरी बंधू आणि भगिनींनो! किसान एआय कोपायलट मध्ये आपले स्वागत आहे. देशासाठी अन्न पिकवणाऱ्या आपल्या कष्टाला माझा सलाम. आज मी आपल्या पिकांबद्दल, शेतीबद्दल किंवा खत नियोजनाबद्दल कशी मदत करू शकतो?",
    pest: "पांढऱ्या माशीच्या (Whiteflies) नियंत्रणासाठी:\n- पिवळे चिकट सापळे (१५-२० सापळे प्रति एकर) शेतात लावा.\n- लिंबोळी तेल (३००० ppm) ३-५ मिली प्रति लीटर पाण्यात मिसळून फवारा.\n- प्रादुर्भाव जास्त असल्यास, ॲसिटामिप्रीड २०% एसपी (०.२ ग्रॅम/लीटर) किंवा डायफेंथियुरॉन ५०% डब्ल्यूपी (१.२ ग्रॅम/लीटर) रसायनांची फवारणी करा.\n\n⚠️ सुरक्षा चेतावणी: कीटकनाशक फवारताना कृपया हातमोजे आणि मास्क वापरा.",
    soil: "सेंद्रिय खत तयार करण्यासाठी व जमिनीच्या आरोग्यासाठी:\n- शेत तयार करताना प्रति एकर १०-१५ टन शेणखत किंवा गांडूळ खत वापरा.\n- जैविक खते जसे की अझोटोबॅक्टर (नायट्रोजन स्थिर करण्यासाठी) आणि पीएसबी (PSB - स्फुरद विरघळवण्यासाठी) यांचा वापर करा.",
    tomato: "टोमॅटोसाठी सर्वोत्तम खत नियोजन:\n- टोमॅटो पिकासाठी नायट्रोजन, स्फुरद आणि पालाश (NPK) १२०:६०:६० किलो प्रति हेक्टर प्रमाणात आवश्यक आहे.\n- बुजविलेले रोप लावणीच्या वेळी आणि फुलधारणेच्या वेळी खतांचे योग्य डोस द्या. पानांवर कॅल्शियमची कमतरता टाळण्यासाठी कॅल्शियम क्लोराइड (०.५%) फवारा.",
    rice: "भातावरील करपा (Blast) रोगाचा उपचार:\n- ट्रायसायक्लाझोल ७५% डब्ल्यूपी (०.६ ग्रॅम/लीटर) किंवा कार्बेन्डाझिम ५०% डब्ल्यूपी (१.० ग्रॅम/लीटर) ची फवारणी करा.\n- शेतात पाण्याचा योग्य निचरा ठेवा आणि ५ सेमी पाणी साठवून ठेवा.\n- रोगट प्रादुर्भाव दिसताच युरियाचा अतिरिक्त वापर थांबवा.\n\n⚠️ सुरक्षा चेतावणी: शेतात रासायनिक फवारणी करताना सुरक्षितता साधनांचा वापर करा.",
    fertilizer: "खत सल्ला: पिकाची वाढ होण्यासाठी नायट्रोजन, मुळे मजबूत होण्यासाठी स्फुरद, आणि रोगप्रतिकारक शक्ती वाढवण्यासाठी पालाश खतांचा संतुलित वापर करा.",
    irrigation: "गहू पिकाचे सिंचन वेळापत्रक (६ महत्त्वाचे टप्पे):\n१. मुकुट मूळ सुरू होणे (CRI stage) - २१ दिवसांनी (अतिशय महत्त्वाचे - लगेच पाणी द्या!)\n२. फुटवे येणे (Tillering) - ४०-४५ दिवसांनी\n३. कांडी धरणे (Jointing) - ६०-६५ दिवसांनी\n४. फुलारा (Flowering) - ८०-८५ दिवसांनी\n५. दुधाळ अवस्था (Milking) - १००-१०५ दिवसांनी\n६. दाणे भरणे (Dough stage) - ११५-१२० दिवसांनी.",
    default: "मी जमिनीची चाचणी करण्याचे, हवामान अंदाज तपासण्याचे आणि पीक नियोजनात सुधारणा करण्याचे सुचवतो. मला टोमॅटो खत, भातावरील करपा, गहू सिंचन किंवा पांढऱ्या माशी नियंत्रण याबद्दल विचारा!"
  }
};

// POST /api/ai/chat
router.post("/chat", protect, async (req, res) => {
  const { message, chatHistory, language } = req.body;
  const lang = language || "en";
  const userMessage = message ? message.toLowerCase() : "";

  // Check for API key (Headers, Env, or Request body)
  const headerKey = req.headers["x-gemini-key"];
  const apiKey = (headerKey && headerKey.trim().length > 10)
    ? headerKey.trim()
    : (process.env.GEMINI_API_KEY || process.env.GROQ_API_KEY);

  if (apiKey && apiKey !== "YOUR_GEMINI_API_KEY" && apiKey.trim().length > 10) {
    const isGroq = apiKey.startsWith("gsk_");
    try {
      // Setup the system prompt
      const systemInstruction = 
        `You are "Kisan AI Copilot," an expert, empathetic, and highly practical agricultural assistant integrated into the "Smart Kisan" website. Your sole purpose is to empower farmers by providing accurate, actionable, and easy-to-understand information to help them maximize their yield, protect their crops, and improve their livelihoods.

Target Audience:
Our users are primarily farmers. They may have varying levels of formal education and digital literacy. Therefore, your responses must be clear, direct, free of complex jargon, and deeply respectful of their hard work.

Core Knowledge Areas you assist with:
1. Crop Management: Best practices for sowing, growing, and harvesting specific crops based on seasons (Rabi, Kharif, Zaid).
2. Soil Health & Fertilizers: Guidance on soil testing, organic farming, NPK ratios, and safe usage of chemical and organic fertilizers.
3. Pest & Disease Control: Identifying plant diseases/pests from descriptions and suggesting safe, cost-effective remedies (both organic and chemical).
4. Weather & Irrigation: Advising on irrigation schedules based on weather conditions and crop water requirements.
5. Market & Economics: Providing insights on Mandi prices, crop profitability, and post-harvest storage techniques.
6. Government Schemes: Informing farmers about relevant agricultural subsidies, loans, and insurance schemes (e.g., PM-Kisan, Fasal Bima Yojana).

Communication Guidelines & Rules:
- Keep it Simple: Use plain, everyday language. Use bullet points or short paragraphs so the information is easy to read on a mobile phone.
- Be Action-Oriented: Tell the farmer exactly what steps to take. Example: Instead of "Nitrogen deficiency is bad," say, "To fix yellowing leaves, apply [X amount] of Urea per acre."
- Prioritize Low-Cost & Organic Solutions: Whenever possible, suggest home remedies, organic solutions, or low-cost alternatives before recommending expensive chemicals.
- Safety First: Always include safety warnings when advising the use of pesticides or chemical fertilizers (e.g., "Please wear gloves and a mask when spraying").
- Acknowledge Limitations: If a user asks for real-time data (like today's exact weather or market price in a specific village) and you do not have live internet access, politely explain this and guide them on where they can find that information.
- Language Adaptability: If the user speaks in Hindi, Marathi, Tamil, or any other regional language (or uses Hinglish/Romanized text), seamlessly reply in the same language or style. The current language code selected in UI is: ${lang}.
- Tone: Respectful, encouraging, wise, and highly practical. Greet them warmly (e.g., "Namaste Kisan Bhai/Behan" if appropriate to the language) and always show appreciation for their contribution to society.`;

      if (isGroq) {
        const messages = [
          { role: "system", content: systemInstruction }
        ];
        if (chatHistory && Array.isArray(chatHistory)) {
          chatHistory.slice(-6).forEach(chat => {
            messages.push({
              role: chat.sender === "user" ? "user" : "assistant",
              content: chat.text
            });
          });
        }
        messages.push({
          role: "user",
          content: message
        });

        const response = await fetch(
          "https://api.groq.com/openai/v1/chat/completions",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${apiKey}`
            },
            body: JSON.stringify({
              model: "llama-3.3-70b-versatile",
              messages,
              temperature: 0.7
            })
          }
        );

        const data = await response.json();
        if (data.choices && data.choices[0]?.message?.content) {
          const text = data.choices[0].message.content;
          return res.json({ success: true, response: text, source: "groq" });
        } else {
          console.warn("Groq structure response issue:", data);
          throw new Error("Invalid API response format");
        }
      } else {
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
          parts: [{ text: message }]
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
        } else {
          console.warn("Gemini structure response issue:", data);
          throw new Error("Invalid API response format");
        }
      }
    } catch (error) {
      console.error("AI API Error, falling back to local advisor:", error);
    }
  }

  // Fallback Rule-Based Response Generator
  const dict = FALLBACK_RESPONSES[lang] || FALLBACK_RESPONSES["en"];
  let reply = dict.default;

  if (userMessage.includes("hello") || userMessage.includes("hi") || userMessage.includes("नमस्ते") || userMessage.includes("हैलो") || userMessage.includes("नमस्कार") || userMessage.includes("greeting")) {
    reply = dict.greeting;
  } else if (userMessage.includes("tomato") || userMessage.includes("tamatar") || userMessage.includes("टमाटर") || userMessage.includes("टोमॅटो")) {
    reply = dict.tomato;
  } else if (userMessage.includes("rice") || userMessage.includes("paddy") || userMessage.includes("धान") || userMessage.includes("चावल") || userMessage.includes("भात") || userMessage.includes("करपा")) {
    reply = dict.rice;
  } else if (userMessage.includes("pest") || userMessage.includes("insect") || userMessage.includes("कीट") || userMessage.includes("कीड़ा") || userMessage.includes("कीड") || userMessage.includes("माशी") || userMessage.includes("रोग")) {
    reply = dict.pest;
  } else if (userMessage.includes("soil") || userMessage.includes("mitti") || userMessage.includes("मिट्टी") || userMessage.includes("भूमि") || userMessage.includes("माती") || userMessage.includes("जमीन")) {
    reply = dict.soil;
  } else if (userMessage.includes("fertilizer") || userMessage.includes("khad") || userMessage.includes("खाद") || userMessage.includes("यूरिया") || userMessage.includes("युरिया") || userMessage.includes("खत")) {
    reply = dict.fertilizer;
  } else if (userMessage.includes("water") || userMessage.includes("irrigation") || userMessage.includes("sinchai") || userMessage.includes("सिंचाई") || userMessage.includes("पानी") || userMessage.includes("सिंचन") || userMessage.includes("गहू") || userMessage.includes("पिकाचे")) {
    reply = dict.irrigation;
  }

  return res.json({
    success: true,
    response: reply,
    source: "local-rules"
  });
});

export default router;
