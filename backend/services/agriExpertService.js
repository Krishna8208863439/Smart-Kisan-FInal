import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";

const DEFAULT_OPENAI_MODEL = "gpt-4o-mini";

const AGRI_EXPERT_SYSTEM_PROMPT = `You are AgriExpert, an elite agricultural advisor and digital farming assistant embedded in the Smart Kisan platform for Indian farmers.

CONTEXT YOU RECEIVE PER REQUEST:
- Location / GPS coordinates
- Live weather conditions (temperature, forecast)
- Water availability / Irrigation source (borewell, canal, rainfed, drip)
- Selected language (English, Marathi, Hindi)

CORE GOAL & SCOPE:
1. Provide practical, actionable, easy-to-understand guidance on agriculture, crops, diseases, pests, fertilizers (NPK dosages), irrigation schedules, soil health, farming practices, government schemes, crop sowing, and marketplace transactions.
2. Answer the farmer's SPECIFIC question about their SPECIFIC crop or situation. NEVER default to Tomato or any example crop unless the farmer explicitly asked about Tomato.
3. If exact chemical dosages or site-specific diagnosis is needed, recommend safe standard ranges and tell the farmer to confirm with their local Krishi Vigyan Kendra (KVK) or district agricultural officer.
4. STRICT RULES:
   - Do not fabricate false mandi market prices, fake scheme rupee amounts, or unsafe chemical dosages.
   - Reply in the language requested by the user (English, Marathi, or Hindi).
   - Format responses using clean Markdown (short paragraphs, bullet points, bold key terms) so it is easy to read on mobile screens.
   - Maintain context from previous turns in the conversation.`;

/**
 * Intelligent Local Agronomy Advisor Engine
 * Provides context-aware agricultural advice when external paid cloud APIs are offline or unconfigured.
 */
function generateLocalAgronomyAdvice({ message, context = {} }) {
  const query = (message || "").toLowerCase();
  const lang = (context.language || "").toLowerCase();
  const isMarathi = lang.includes("marathi") || lang === "mr";
  const isHindi = lang.includes("hindi") || lang === "hi";

  const loc = context.location ? `📍 ${context.location}` : "";
  const weather = context.weather ? `⛅ ${context.weather}` : "";
  const water = context.waterSource ? `💧 ${context.waterSource}` : "";

  // 1. Marathi Responses
  if (isMarathi) {
    if (query.includes("कांदा") || query.includes("onion") || query.includes("करपा")) {
      return `### 🧅 कांदा पीक व्यवस्थापन व करपा नियंत्रण

**लक्षणे व उपाय:**
- **जांभळा करपा (Purple Blotch):** पानांवर लांबट जांभळट तपकिरी डाग पडतात.
- **जैविक उपाय:** ट्रायकोडर्मा (Trichoderma harzianum) ५ ग्रॅम/लिटर किंवा स्यूडोमोनास ५ ग्रॅम/लिटर फवारणी करावी.
- **रासायनिक उपाय:** मॅन्कोझेब (Mancozeb 75% WP) २.५ ग्रॅम/लिटर किंवा टेबुकोनॅझोल + ट्रायफ्लॉक्सीस्ट्रोबिन (Nativo) १ ग्रॅम/लिटर फवारणी करावी.
- **खत व्यवस्थापन:** नत्र (N), स्फुरद (P), पालाश (K) योग्य प्रमाणात द्यावे. सल्फर (गंधक) २०-२५ किलो/एकर देणे कांद्याच्या दर्जासाठी फायदेशीर ठरते.

${weather ? `**हवामान सल्ला:** ${weather} — हवेतील आर्द्रता जास्त असल्यास बुरशीनाशकाची फवारणी वेळेवर करा.` : ""}`;
    }

    if (query.includes("ऊस") || query.includes("sugarcane") || query.includes("खत")) {
      return `### 🎋 ऊस पीक खत व पाणी व्यवस्थापन

**महत्त्वाच्या शिफारसी:**
- **खताची मात्रा:** उसासाठी हेक्टरी २५० किलो नत्र, ११५ किलो स्फुरद व ११५ किलो पालाश आवश्यक असते.
- **ठिबक सिंचन:** ठिबक सिंचनाद्वारे विद्राव्य खते (१९:१९:१९, १२:६१:००, ००:००:५०) दिल्यास उत्पादनात ३०-४०% वाढ होते.
- **तण व कीड नियंत्रण:** आंतरमशागत वेळेवर करा आणि खोडकिडीच्या नियंत्रणासाठी ट्रायकोकार्ड्सचा वापर करा.

${water ? `**सिंचन सल्ला:** ${water} उपलब्धतेनुसार उन्हाळ्यात ८-१० दिवसांनी आणि हिवाळ्यात १२-१५ दिवसांनी पाणी द्यावे.` : ""}`;
    }

    if (query.includes("रोग") || query.includes("कीड") || query.includes("pest") || query.includes("disease") || query.includes("बुरशी")) {
      return `### 🌿 पीक रोग व कीड नियंत्रण मार्गदर्शक

1. **रोग निदान:** पिकाच्या पानांचे, खोडाचे किंवा फळांचे नीट निरीक्षण करा. पिवळे डाग, पांढरी बुरशी किंवा सुरकुतलेली पाने तपासा.
2. **सेंद्रिय उपाय:** 
   - ५% निंबोळी अर्क (Neem Oil 10,000 ppm) २-३ मिली/लिटर फवारणी करा.
   - जीवामृत किंवा दशपर्णी अर्क नियमित वापरल्यास रोगांचा प्रादुर्भाव कमी होतो.
3. **मित्र कीटक:** पिवळे आणि निळे चिकट सापळे (Sticky Traps) एकरी १०-१५ लावा.
4. **स्थानिक कृषी सल्ला:** अचूक औषध फवारणीपूर्वी स्थानिक कृषी विज्ञान केंद्राशी (KVK) संपर्क साधा.`;
    }

    if (query.includes("योजना") || query.includes("scheme") || query.includes("अनुदान") || query.includes("subsidy")) {
      return `### 🏛️ प्रमुख सरकारी कृषी योजना

1. **पीएम-किसान (PM-KISAN):** पात्र शेतकऱ्यांना वर्षाला ₹६,००० (३ हप्त्यांमध्ये ₹२,०००).
2. **महाडीबीटी शेतकरी योजना (MahaDBT):** ठिबक/तुषार सिंचन (५५-८०% अनुदान), ट्रॅक्टर, कृषी अवजारे आणि शेततळे यांसाठी थेट अनुदान.
3. **प्रधानमंत्री पीक विमा योजना (PMFBY):** केवळ ₹१ मध्ये पीक विमा नोंदणी. नैसर्गिक आपत्तीत पिकाचे नुकसान भरपाई.
4. **किसान क्रेडिट कार्ड (KCC):** कमी व्याजदरात (४%) अल्पमुदत पीक कर्ज.`;
    }

    return `### 🌾 स्मार्ट किसान कृषी सल्लागार (AgriExpert)

आपल्या प्रश्नाबद्दल धन्यवाद! मी आपल्या शेतासाठी खालील बाबींमध्ये मदत करू शकतो:

- 🚜 **पीक लागवड व खत व्यवस्थापन** (ऊस, कांदा, कापूस, सोयाबीन, भाजीपाला)
- 🐛 **रोग व कीड नियंत्रण** (सेंद्रिय व रासायनिक उपाय)
- 💧 **हवामानानुसार ठिबक सिंचन नियोजन**
- 🏛️ **सरकारी कृषी योजना व सबसिडी माहिती**
- 🛒 **शेतमाल खरेदी-विक्री व बाजारभाव**

${weather ? `\n**सध्याचे हवामान:** ${weather}` : ""}
${loc ? `\n**स्थान:** ${loc}` : ""}

कृपया आपल्या पिकाचे नाव आणि नेमकी अडचण सांगा, मी सविस्तर मार्गदर्शन करेन!`;
  }

  // 2. Hindi Responses
  if (isHindi) {
    if (query.includes("गेहूं") || query.includes("wheat") || query.includes("धान") || query.includes("rice")) {
      return `### 🌾 प्रमुख फसल प्रबंधन व उर्वरक संतुलन

**उर्वरक एवं पोषण प्रबंधन:**
- **संतुलित NPK अनुपात:** अनाज वाली फसलों के लिए आदर्श 4:2:1 (नाइट्रोजन, फास्फोरस, पोटाश) अनुपात रखें।
- **सिंचाई की क्रांतिक अवस्थाएं:** पहली सिंचाई कल्ले फूटते समय (CRI Stage) और दूसरी फूल आने से पहले करें।
- **सूक्ष्म पोषक तत्व:** जिंक सल्फेट (21%) 10 किलो प्रति एकड़ डालने से पीलापन दूर होता है और पैदावार बढ़ती है।

${weather ? `**मौसम चेतावनी:** ${weather} — तेज हवा या बारिश की संभावना होने पर सिंचाई रोकें।` : ""}`;
    }

    if (query.includes("रोग") || query.includes("कीट") || query.includes("pest") || query.includes("disease") || query.includes("दवा")) {
      return `### 🛡️ फसल सुरक्षा एवं कीट प्रबंधन

1. **पहचान व रोकथाम:** पत्तियों के नीचे सफेद मक्खी, माहू (एफिड्स) या फफूंद के धब्बे देखें।
2. **जैविक उपचार:** नीम तेल (10,000 PPM) 2-3 मिली/लीटर पानी में मिलाकर शाम के समय छिड़काव करें।
3. **फफूंदनाशक:** साफ (Saaf - Carbendazim + Mancozeb) 2 ग्राम/लीटर पानी में घोलकर छिड़कें।
4. **ट्रैप्स का उपयोग:** खेत में 10-12 पीले व नीले स्टिकी ट्रैप (Yellow/Blue Sticky Traps) लगाएं।`;
    }

    if (query.includes("योजना") || query.includes("scheme") || query.includes("सब्सिडी") || query.includes("लोन")) {
      return `### 🏛️ मुख्य सरकारी कृषि योजनाएं

1. **पीएम किसान सम्मान निधि:** हर 4 महीने में ₹2,000 की किस्त (वार्षिक ₹6,000 सीधे बैंक खाते में)।
2. **प्रधानमंत्री फसल बीमा योजना (PMFBY):** सूखे, बाढ़ या कीट प्रकोप से फसल नुकसान पर व्यापक बीमा सुरक्षा।
3. **ड्रिप व स्प्रिंकलर सिंचाई सब्सिडी (PMKSY):** सूक्ष्म सिंचाई संयंत्र लगाने पर 55% से 80% तक की सरकारी छूट।
4. **किसान क्रेडिट कार्ड (KCC):** 4% रियायती ब्याज दर पर कृषि कार्यशील पूंजी।`;
    }

    return `### 🌾 स्मार्ट किसान कृषि विशेषज्ञ (AgriExpert)

नमस्ते किसान भाई/बहन! मैं आपकी खेती-किसानी से जुड़े सभी सवालों में मदद कर सकता हूँ:

- 🌱 **उन्नत बीज चयन एवं बुवाई कैलेंडर**
- 💧 **स्मार्ट सिंचाई एवं जल प्रबंधन**
- 🛡️ **रोग, फफूंद व कीटों का जैविक/रासायनिक उपचार**
- 📊 **मंडी भाव एवं नजदीकी कृषि बाजार**
- 🏛️ **सरकारी सब्सिडी एवं फसल बीमा योजनाएं**

${weather ? `\n**वर्तमान मौसम:** ${weather}` : ""}
${water ? `\n**जल स्त्रोत:** ${water}` : ""}

कृपया अपनी फसल का नाम और विशिष्ट समस्या बताएं!`;
  }

  // 3. English Responses (Default)
  if (query.includes("fertilizer") || query.includes("npk") || query.includes("urea") || query.includes("dap")) {
    return `### 🧪 Balanced Fertilizer & Nutrient Management

**Key Principles for High Yields:**
1. **Soil-Testing First:** Base NPK application on a soil health card. Standard basal recommendation: **120:60:40 kg/ha (N:P:K)** for intensive cereals.
2. **Basal Application:** Apply full Phosphorus (DAP/SSP) and Potash (MOP) plus 1/3rd Nitrogen at sowing/planting.
3. **Split Nitrogen:** Top-dress remaining Nitrogen in 2 equal splits (active tillering & panicle/flowering stages) to prevent leaching.
4. **Micro-nutrients:** Zinc Sulphate (25 kg/ha) and Boron (1-1.5 g/L foliar spray) significantly enhance grain filling and fruit setting.

${water ? `**Water Sync:** Ensure light moisture via **${water}** before top-dressing granular fertilizers.` : ""}`;
  }

  if (query.includes("pest") || query.includes("disease") || query.includes("fungus") || query.includes("spray") || query.includes("blight") || query.includes("rot")) {
    return `### 🌿 Integrated Pest & Disease Management (IPM)

**1. Cultural & Biological Control:**
- Install yellow/blue sticky traps (15 per acre) for sucking pests (whiteflies, thrips, aphids).
- Apply **Neem Oil (10,000 ppm)** at 2.5–3 mL per litre of water at first sign of infestation.
- Apply bio-agents like *Trichoderma viride* (5g/L) for soil-borne root rots and damping off.

**2. Targeted Chemical Control (Safe Standard Guidelines):**
- **Fungal Blights/Leaf Spots:** Mancozeb 75% WP @ 2.5 g/L or Azoxystrobin + Difenoconazole @ 1 mL/L.
- **Sucking Pests:** Imidacloprid 17.8% SL @ 0.5 mL/L or Acetamiprid 20% SP @ 0.5 g/L.
- **Safety Note:** Always maintain the Pre-Harvest Interval (PHI) and wear protective gear during spraying.

${weather ? `**Weather Note:** ${weather} — Avoid foliar sprays if rain is expected within 4–6 hours.` : ""}`;
  }

  if (query.includes("irrigation") || query.includes("water") || query.includes("drip")) {
    return `### 💧 Smart Irrigation & Water Scheduling

**Guidelines tailored to Indian soil and climate:**
1. **Critical Growth Stages:** Ensure adequate moisture during germination, flowering, and fruit/grain development.
2. **Drip Irrigation Efficiency:** Delivers 90%+ water-use efficiency. Run lateral drip systems for 1.5–2 hours during cooler morning hours to minimize evaporation.
3. **Mulching:** Use organic mulch or 25–30 micron plastic mulch to retain soil moisture by up to 40% and suppress weed growth.

${weather ? `**Live Weather Insight:** ${weather} — Adjust run times according to current ambient temperatures and rainfall probability.` : ""}`;
  }

  if (query.includes("scheme") || query.includes("subsidy") || query.includes("loan") || query.includes("kisan credit") || query.includes("insurance")) {
    return `### 🏛️ Key Government Agricultural Schemes & Benefits

1. **PM-KISAN (Pradhan Mantri Kisan Samman Nidhi):** Direct income support of ₹6,000 per year in 3 equal installments of ₹2,000.
2. **PMKSY (Per Drop More Crop):** 55% to 80% subsidy for installing micro-irrigation (drip and sprinkler systems).
3. **PMFBY (Pradhan Mantri Fasal Bima Yojana):** Comprehensive risk coverage for non-preventable natural risks from pre-sowing to post-harvest.
4. **Kisan Credit Card (KCC):** Concessional institutional credit at an effective interest rate of 4% per annum for prompt repayment.
5. **Agricultural Infrastructure Fund (AIF):** Financing facility for post-harvest management infrastructure and community farming assets.`;
  }

  return `### 🌾 Smart Kisan AgriExpert Advisory

Namaste! I am your AI Agronomy and Farm Advisory Assistant. Here is how I can support your farming operations:

- 🚜 **Crop Planning & Sowing:** Tailored calendars for Kharif, Rabi, and Zaid seasons.
- 🧪 **Fertilizer & Nutrition:** Soil-tested NPK recommendations and micro-nutrient schedules.
- 🛡️ **Pest & Disease Management:** Organic solutions (Neem, Trichoderma) and targeted safe treatments.
- 💧 **Irrigation Advisory:** Drip scheduling calibrated to live weather and soil moisture.
- 🛒 **Marketplace & Schemes:** Mandi price tracking and government subsidy applications.

${loc ? `**Your Location:** ${loc}` : ""}
${weather ? `**Current Weather:** ${weather}` : ""}
${water ? `**Water Source:** ${water}` : ""}

Please share your specific crop and query so I can provide precise, actionable guidance for your farm.`;
}

/**
 * Generate AI response for AgriExpert chatbot using Multi-Tier Architecture:
 * Tier 1: OpenAI (ChatGPT)
 * Tier 2: Anthropic (Claude)
 * Tier 3: Google Gemini (Direct REST API)
 * Tier 4: Python Backend FastAPI AI Service
 * Tier 5: Intelligent Local Agronomy Advisor Engine (Always available, zero 502 failures)
 */
export async function getAgriExpertReply({ message, history = [], context = {} }) {
  const openAiApiKey = process.env.OPENAI_API_KEY;
  const anthropicApiKey = process.env.ANTHROPIC_API_KEY;
  const geminiApiKey = (context.geminiKey || process.env.GEMINI_API_KEY || "").trim();

  // ── Diagnostic logging ─────────────────────────────────────────────────────
  console.log(`[AgriExpert] Received message: "${message}"`);
  console.log(`[AgriExpert] OPENAI_API_KEY set: ${Boolean(openAiApiKey && openAiApiKey.trim() && !openAiApiKey.includes("your_api_key_here"))}`);
  console.log(`[AgriExpert] ANTHROPIC_API_KEY set: ${Boolean(anthropicApiKey && anthropicApiKey.trim() && !anthropicApiKey.includes("xxxxxxxx"))}`);
  console.log(`[AgriExpert] GEMINI_API_KEY set: ${Boolean(geminiApiKey && geminiApiKey.length > 10 && !geminiApiKey.startsWith("YOUR_"))}`);

  // Format context details
  const locationStr = typeof context.location === "object" && context.location !== null
    ? `Lat ${context.location.lat}, Lon ${context.location.lon}`
    : (context.location || "unknown");
  const weatherStr = typeof context.weather === "object" && context.weather !== null
    ? `${context.weather.temp ? context.weather.temp + "°C" : ""} ${context.weather.forecast || context.weather.conditions || ""}`.trim()
    : (context.weather || "unknown");

  const contextBlock = [
    `[Live Field Context]`,
    `Location: ${locationStr}`,
    `Weather: ${weatherStr}`,
    `Water source: ${context.waterSource || "not selected"}`,
    `Language: ${context.language || "English"}`
  ].join("\n");

  const rawHistory = Array.isArray(history) ? history.slice(-10) : [];

  // ──────────────────────────────────────────────────────────────────────────
  // 1. OPENAI CHATGPT API INTEGRATION (TIER 1)
  // ──────────────────────────────────────────────────────────────────────────
  if (openAiApiKey && openAiApiKey.trim() !== "" && !openAiApiKey.includes("your_api_key_here")) {
    try {
      const openai = new OpenAI({ apiKey: openAiApiKey.trim() });
      const modelToUse = process.env.OPENAI_MODEL || DEFAULT_OPENAI_MODEL;

      const openAiMessages = [
        { role: "system", content: AGRI_EXPERT_SYSTEM_PROMPT }
      ];

      for (const item of rawHistory) {
        const role = item.role === "assistant" || item.sender === "ai" ? "assistant" : "user";
        const content = typeof item.content === "string" ? item.content : (item.text || "");
        if (content && content.trim()) {
          openAiMessages.push({ role, content: content.trim() });
        }
      }

      openAiMessages.push({
        role: "user",
        content: `${contextBlock}\n\nFarmer's question: ${message}`
      });

      console.log(`[AgriExpert] Sending to OpenAI (${modelToUse}), messages count: ${openAiMessages.length}`);

      const completion = await openai.chat.completions.create({
        model: modelToUse,
        messages: openAiMessages,
        max_tokens: 1024,
        temperature: 0.7,
      });

      const reply = completion.choices[0]?.message?.content;
      if (reply && reply.trim()) {
        console.log(`[AgriExpert] OpenAI reply received (${reply.length} chars)`);
        return reply.trim();
      }
    } catch (err) {
      console.warn("[AgriExpert] OpenAI API Error:", err.message);
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 2. ANTHROPIC CLAUDE API INTEGRATION (TIER 2)
  // ──────────────────────────────────────────────────────────────────────────
  if (anthropicApiKey && anthropicApiKey.trim() !== "" && !anthropicApiKey.includes("xxxxxxxx")) {
    try {
      const anthropic = new Anthropic({ apiKey: anthropicApiKey.trim() });
      const primaryModel = process.env.CLAUDE_MODEL || "claude-haiku-4-5-20251001";
      const fallbackModels = [primaryModel, "claude-3-5-haiku-20241022", "claude-3-haiku-20240307"];

      const formattedHistory = [];
      for (const item of rawHistory) {
        const role = item.role === "assistant" || item.sender === "ai" ? "assistant" : "user";
        const content = typeof item.content === "string" ? item.content : (item.text || "");
        if (content && content.trim()) {
          formattedHistory.push({ role, content: content.trim() });
        }
      }

      const claudeMessages = [];
      for (const msg of formattedHistory) {
        if (claudeMessages.length === 0) {
          if (msg.role === "user") claudeMessages.push(msg);
        } else {
          const prevRole = claudeMessages[claudeMessages.length - 1].role;
          if (msg.role !== prevRole) {
            claudeMessages.push(msg);
          } else {
            claudeMessages[claudeMessages.length - 1].content += "\n\n" + msg.content;
          }
        }
      }

      const userContent = `${contextBlock}\n\nFarmer's question: ${message}`;
      if (claudeMessages.length > 0 && claudeMessages[claudeMessages.length - 1].role === "user") {
        claudeMessages[claudeMessages.length - 1].content += "\n\n" + userContent;
      } else {
        claudeMessages.push({ role: "user", content: userContent });
      }

      for (const modelToUse of [...new Set(fallbackModels)]) {
        try {
          const response = await anthropic.messages.create({
            model: modelToUse,
            max_tokens: 1024,
            system: AGRI_EXPERT_SYSTEM_PROMPT,
            messages: claudeMessages,
          });
          const textBlock = response.content.find((b) => b.type === "text");
          if (textBlock && textBlock.text) {
            console.log(`[AgriExpert] Anthropic (${modelToUse}) reply received (${textBlock.text.length} chars)`);
            return textBlock.text;
          }
        } catch (err) {
          console.warn(`[AgriExpert] Anthropic Model '${modelToUse}' failed:`, err.message);
        }
      }
    } catch (err) {
      console.warn("[AgriExpert] Anthropic Client Error:", err.message);
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 3. GOOGLE GEMINI API INTEGRATION (TIER 3)
  // ──────────────────────────────────────────────────────────────────────────
  if (geminiApiKey && geminiApiKey.length > 10 && !geminiApiKey.startsWith("YOUR_")) {
    try {
      console.log("[AgriExpert] Calling Google Gemini API...");
      const fullPrompt = `${AGRI_EXPERT_SYSTEM_PROMPT}\n\n${contextBlock}\n\nFarmer's question: ${message}`;
      
      const geminiResponse = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{
              parts: [{ text: fullPrompt }]
            }],
            generationConfig: {
              temperature: 0.7,
              maxOutputTokens: 1024,
            }
          })
        }
      );

      if (geminiResponse.ok) {
        const geminiData = await geminiResponse.json();
        const geminiText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;
        if (geminiText && geminiText.trim()) {
          console.log(`[AgriExpert] Gemini reply received (${geminiText.length} chars)`);
          return geminiText.trim();
        }
      }
    } catch (err) {
      console.warn("[AgriExpert] Gemini API call error:", err.message);
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 4. PYTHON BACKEND FASTAPI AGRI-AI PROXY (TIER 4)
  // ──────────────────────────────────────────────────────────────────────────
  try {
    const pyRes = await fetch("http://localhost:8000/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(geminiApiKey ? { "x-gemini-key": geminiApiKey } : {})
      },
      body: JSON.stringify({
        message,
        language: context.language || "en",
        chatHistory: rawHistory,
        gps: typeof context.location === "object" ? context.location : undefined,
        weather: typeof context.weather === "object" ? context.weather : undefined,
        waterAvailability: context.waterSource
      })
    });

    if (pyRes.ok) {
      const pyData = await pyRes.json();
      const pyReply = pyData.response || pyData.reply;
      if (pyReply && pyReply.trim()) {
        console.log(`[AgriExpert] Python backend reply received (${pyReply.length} chars)`);
        return pyReply.trim();
      }
    }
  } catch (pyErr) {
    // Python backend not running or timed out; continue to Tier 5 fallback
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 5. NATIVE AGRONOMY ADVISOR EXPERT ENGINE (TIER 5 - ALWAYS AVAILABLE)
  // ──────────────────────────────────────────────────────────────────────────
  console.log("[AgriExpert] Generating response via Native Agronomy Expert Engine.");
  return generateLocalAgronomyAdvice({ message, context });
}

