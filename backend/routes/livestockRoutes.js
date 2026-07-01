import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import Livestock from "../models/Livestock.js";

const router = express.Router();

// GET /api/livestock - Get all livestock animals
router.get("/", protect, async (req, res) => {
  try {
    const animals = await Livestock.find({ user: req.user._id }).sort({ createdAt: -1 });
    return res.json(animals);
  } catch (error) {
    console.error("Error fetching livestock:", error);
    return res.status(500).json({ error: "Failed to load livestock directory." });
  }
});

// POST /api/livestock - Create a new animal entry
router.post("/", protect, async (req, res) => {
  try {
    const { tagNumber, name, type, breed, ageYears, healthStatus } = req.body;
    if (!tagNumber || !name || !type || !breed || ageYears === undefined) {
      return res.status(400).json({ error: "Required details missing for animal registration." });
    }

    const animal = await Livestock.create({
      user: req.user._id,
      tagNumber,
      name,
      type,
      breed,
      ageYears: Number(ageYears),
      healthStatus: healthStatus || "Healthy"
    });

    return res.status(201).json(animal);
  } catch (error) {
    console.error("Error creating livestock entry:", error);
    return res.status(500).json({ error: "Failed to register livestock." });
  }
});

// PUT /api/livestock/:id - Update animal profile
router.put("/:id", protect, async (req, res) => {
  try {
    const { name, breed, ageYears, healthStatus } = req.body;
    const animal = await Livestock.findOne({ _id: req.params.id, user: req.user._id });
    if (!animal) {
      return res.status(404).json({ error: "Animal profile not found." });
    }

    if (name) animal.name = name;
    if (breed) animal.breed = breed;
    if (ageYears !== undefined) animal.ageYears = Number(ageYears);
    if (healthStatus) animal.healthStatus = healthStatus;

    await animal.save();
    return res.json(animal);
  } catch (error) {
    console.error("Error updating livestock profile:", error);
    return res.status(500).json({ error: "Failed to update animal profile." });
  }
});

// DELETE /api/livestock/:id - Delete an animal profile
router.delete("/:id", protect, async (req, res) => {
  try {
    const animal = await Livestock.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    if (!animal) {
      return res.status(404).json({ error: "Animal profile not found." });
    }
    return res.json({ success: true, message: "Animal profile deleted successfully." });
  } catch (error) {
    console.error("Error deleting animal profile:", error);
    return res.status(500).json({ error: "Failed to delete animal profile." });
  }
});

// POST /api/livestock/:id/milk - Log daily milk productivity
router.post("/:id/milk", protect, async (req, res) => {
  try {
    const { date, morningYield, eveningYield, fatPercentage } = req.body;
    if (morningYield === undefined || eveningYield === undefined) {
      return res.status(400).json({ error: "Morning and evening yields are required." });
    }

    const animal = await Livestock.findOne({ _id: req.params.id, user: req.user._id });
    if (!animal) {
      return res.status(404).json({ error: "Animal profile not found." });
    }

    animal.milkRecords.push({
      date: date ? new Date(date) : new Date(),
      morningYield: Number(morningYield),
      eveningYield: Number(eveningYield),
      fatPercentage: fatPercentage ? Number(fatPercentage) : null
    });

    await animal.save();
    return res.status(201).json(animal);
  } catch (error) {
    console.error("Error logging milk record:", error);
    return res.status(500).json({ error: "Failed to log milk productivity." });
  }
});

// POST /api/livestock/:id/vaccination - Log or schedule vaccination
router.post("/:id/vaccination", protect, async (req, res) => {
  try {
    const { name, dateAdministered, nextDueDate, status } = req.body;
    if (!name || !nextDueDate) {
      return res.status(400).json({ error: "Vaccination name and next due date are required." });
    }

    const animal = await Livestock.findOne({ _id: req.params.id, user: req.user._id });
    if (!animal) {
      return res.status(404).json({ error: "Animal profile not found." });
    }

    animal.vaccinations.push({
      name,
      dateAdministered: dateAdministered ? new Date(dateAdministered) : null,
      nextDueDate: new Date(nextDueDate),
      status: status || "pending"
    });

    await animal.save();
    return res.status(201).json(animal);
  } catch (error) {
    console.error("Error adding vaccination log:", error);
    return res.status(500).json({ error: "Failed to record vaccination." });
  }
});

// POST /api/livestock/:id/feed - Update feeding schedule
router.post("/:id/feed", protect, async (req, res) => {
  try {
    const { feedType, quantityKg, frequencyPerDay, notes } = req.body;
    if (!feedType || !quantityKg) {
      return res.status(400).json({ error: "Feed type and quantity are required." });
    }

    const animal = await Livestock.findOne({ _id: req.params.id, user: req.user._id });
    if (!animal) {
      return res.status(404).json({ error: "Animal profile not found." });
    }

    animal.feedingSchedules.push({
      feedType,
      quantityKg: Number(quantityKg),
      frequencyPerDay: Number(frequencyPerDay) || 2,
      notes
    });

    await animal.save();
    return res.status(201).json(animal);
  } catch (error) {
    console.error("Error adding feeding schedule:", error);
    return res.status(500).json({ error: "Failed to save feed plan." });
  }
});

// POST /api/livestock/chat - Pashu Mitra AI advisor chat
router.post("/chat", protect, async (req, res) => {
  const { message, language } = req.body;
  const lang = language || "en";
  const userMsg = message ? message.toLowerCase() : "";

  const geminiKey = req.headers["x-gemini-key"] || process.env.GEMINI_API_KEY;

  const systemInstruction = `You are "Pashu Mitra AI," an elite livestock advisor and dairy farm specialist. 
Your goal is to answer questions about cattle health (cows, buffaloes, goats, etc.), feeding schedules, vaccination calendars, dairy productivity optimization, and common veterinary symptoms.
Provide precise, actionable advice in localized Marathi (मराठी) or English depending on language parameter. The active language is: "${lang}". Keep formatting clean with bullet points and bold headers. Do not output code blocks.`;

  if (geminiKey && geminiKey !== "YOUR_GEMINI_API_KEY" && geminiKey.trim().length > 10) {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{
              role: "user",
              parts: [{ text: `${systemInstruction}\n\nUser Question:\n${message}` }]
            }]
          })
        }
      );

      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (text) {
        return res.json({ success: true, response: text, source: "gemini" });
      }
    } catch (err) {
      console.error("Pashu Mitra AI Gemini error, dropping to local advisor:", err);
    }
  }

  // Fallback responses
  const fallbacks = {
    en: {
      vaccination: `📅 **Core Vaccination Schedule for Cattle**:\n- **FMD (Foot & Mouth Disease)**: Every 6 months (May/June & Nov/Dec).\n- **HS (Haemorrhagic Septicaemia)**: Once a year before monsoon (May).\n- **BQ (Black Quarter)**: Once a year (May/June).\n- **Brucellosis**: Once in a lifetime for female calves (4-8 months old).`,
      feeding: `🌾 **Optimal Dairy Cow Feeding Routine** (for 300-400kg cow yielding 10-15L daily):\n- **Green Fodder**: 20-25 kg per day (provides vitamins and digestibility).\n- **Dry Fodder**: 5-7 kg per day (adds dry matter and fiber).\n- **Concentrate Feed**: 1.5 kg base maintenance + 400g per liter of milk produced.\n- **Mineral Mixture**: 50g daily mixed in concentrate feed to avoid calcium drops.\n- **Fresh Water**: Constant access, clean supply.`,
      sickness: `🤒 **Common Cattle Disease Indicators**:\n- **Mastitis**: Warm, swollen udder quadrants, watery/clotted milk. Treatment requires prompt antibiotic infusion and stripping.\n- **Lumpy Skin Disease**: Skin nodules, high fever, watery eyes. Vaccinate immediately and isolate infected cows.\n- **FMD**: Foamy saliva, mouth blisters, severe limping. Wash sores with potassium permanganate solution (0.1%).`,
      default: `Namaste! I am Pashu Mitra AI. Ask me about **vaccination schedules**, **milking feed plans**, **symptoms of Mastitis / Lumpy Skin**, or cattle health logs.`
    },
    mr: {
      vaccination: `📅 **जनावरांचे लसीकरण वेळापत्रक (Pashu Mitra)**:\n- **लाळ्या खुरकुत (FMD)**: दर ६ महिन्यांनी (मे/जून आणि नोव्हेंबर/डिसेंबर).\n- **घटसर्प (HS)**: पावसाळ्यापूर्वी वर्षातून एकदा (मे).\n- **फऱ्या (BQ)**: वर्षातून एकदा (मे/जून).\n- **ब्रूसेलोसिस**: मादी वासराला वयाच्या ४ ते ८ महिन्यात आयुष्यात एकदाच दिले जाते.`,
      feeding: `🌾 **दूध देणाऱ्या गाईंचे खाद्य नियोजन** (१०-१५ लिटर दूध देणाऱ्या गाईसाठी):\n- **हिरवा चारा**: २० ते २५ किलो रोज (जीवनसत्त्वे आणि पचनासाठी).\n- **सुका चारा**: ५ ते ७ किलो रोज (कोरडे वजन आणि तंतूमय पदार्थ).\n- **पशू आहार (सरकी पेंड/मिश्रण)**: शरीराच्या वाढीसाठी १.५ किलो + प्रति लिटर दुधामागे ४०० ग्रॅम अतिरिक्त आहार.\n- **खनिज मिश्रण (Mineral Mixture)**: रोज ५० ग्रॅम खनिज मिश्रण द्यावे, ज्यामुळे कॅल्शियमची कमतरता टळेल.\n- **स्वच्छ पाणी**: २४ तास मुबलक पिण्याचे पाणी उपलब्ध असावे.`,
      sickness: `🤒 **जनावरांच्या प्रमुख आजारांची लक्षणे व उपाय**:\n- **स्तनदाह (Mastitis)**: कास सुजणे, गरम होणे, दुधात गाठी येणे. वेळेवर पशुवैद्यकांकडून उपचार करून घ्यावेत.\n- **लम्पी त्वचा रोग (LSD)**: अंगावर गाठी येणे, ताप, डोळ्यातून पाणी. बाधित जनावराला वेगळे ठेवावे.\n- **लाळ्या खुरकुत**: तोंडात लाळ गळणे, जिभेवर आणि खुरांवर फोड येणे, लंगडणे. तोंड आणि खुर जंतुनाशक पाण्याने धुवावेत.`,
      default: `नमस्ते! मी पशु मित्र एआय आहे. मला **लसीकरण वेळापत्रक**, **खाद्य व्यवस्थापन नियोजन**, **स्तनदाह आजाराची लक्षणे** किंवा दुग्ध उत्पादनाविषयी प्रश्न विचारा.`
    }
  };

  const selectedFallback = fallbacks[lang] || fallbacks["en"];
  let responseText = selectedFallback.default;

  if (userMsg.includes("vaccin") || userMsg.includes("lasi") || userMsg.includes("लस")) {
    responseText = selectedFallback.vaccination;
  } else if (userMsg.includes("feed") || userMsg.includes("food") || userMsg.includes("चारा") || userMsg.includes("खाद्य") || userMsg.includes("पेंड")) {
    responseText = selectedFallback.feeding;
  } else if (userMsg.includes("sick") || userMsg.includes("disease") || userMsg.includes("mastitis") || userMsg.includes("lumpy") || userMsg.includes("आजारी") || userMsg.includes("रोग") || userMsg.includes("दूध कमी")) {
    responseText = selectedFallback.sickness;
  }

  return res.json({
    success: true,
    response: responseText,
    source: "local-livestock-advisor"
  });
});

export default router;
