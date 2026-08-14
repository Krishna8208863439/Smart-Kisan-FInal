import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import YieldPrediction from "../models/YieldPrediction.js";

const router = express.Router();

// Geocoding helper using Open-Meteo
async function geocodeCity(cityName) {
  try {
    const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(cityName)}&count=1&language=en&format=json`;
    const res = await fetch(url);
    const data = await res.json();
    if (!data.results || data.results.length === 0) return null;
    return {
      lat: data.results[0].latitude,
      lon: data.results[0].longitude,
      displayName: `${data.results[0].name}, ${data.results[0].admin1 || ""}, ${data.results[0].country}`
    };
  } catch (err) {
    console.error("Geocoding failed inside yield calculations:", err);
    return null;
  }
}

// Fetch weather from Open-Meteo
async function fetchWeather(lat, lon) {
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,precipitation&daily=temperature_2m_max,temperature_2m_min,precipitation_sum&timezone=Asia%2FKolkata&forecast_days=3`;
    const res = await fetch(url);
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    console.error("Weather fetch failed inside yield calculations:", err);
    return null;
  }
}

const CROP_BASELINES = {
  Tomato: { baseYield: 10.0, optimalPH: { min: 6.0, max: 7.0 }, optimalNPK: { n: 120, p: 60, k: 60 }, mandiBase: 2500 },
  Paddy: { baseYield: 2.3, optimalPH: { min: 5.5, max: 6.5 }, optimalNPK: { n: 120, p: 60, k: 40 }, mandiBase: 2183 },
  Rice: { baseYield: 2.3, optimalPH: { min: 5.5, max: 6.5 }, optimalNPK: { n: 120, p: 60, k: 40 }, mandiBase: 2183 },
  Wheat: { baseYield: 2.0, optimalPH: { min: 6.0, max: 7.5 }, optimalNPK: { n: 100, p: 50, k: 40 }, mandiBase: 2275 },
  Potato: { baseYield: 12.0, optimalPH: { min: 5.0, max: 6.5 }, optimalNPK: { n: 120, p: 80, k: 120 }, mandiBase: 1200 },
  Mustard: { baseYield: 0.8, optimalPH: { min: 6.0, max: 7.5 }, optimalNPK: { n: 80, p: 40, k: 20 }, mandiBase: 5650 },
  Chilli: { baseYield: 1.5, optimalPH: { min: 6.0, max: 7.0 }, optimalNPK: { n: 100, p: 60, k: 60 }, mandiBase: 7000 },
  Cotton: { baseYield: 0.9, optimalPH: { min: 6.0, max: 8.0 }, optimalNPK: { n: 100, p: 50, k: 50 }, mandiBase: 6620 },
  Maize: { baseYield: 2.5, optimalPH: { min: 5.5, max: 7.5 }, optimalNPK: { n: 120, p: 60, k: 40 }, mandiBase: 1870 }
};

// GET /api/yield/history
router.get("/history", protect, async (req, res) => {
  try {
    const history = await YieldPrediction.find({ user: req.user._id }).sort({ createdAt: -1 });
    return res.json(history);
  } catch (error) {
    console.error("Error fetching yield prediction history:", error);
    return res.status(500).json({ error: "Failed to fetch prediction history." });
  }
});

// DELETE /api/yield/:id
router.delete("/:id", protect, async (req, res) => {
  try {
    const prediction = await YieldPrediction.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    if (!prediction) {
      return res.status(404).json({ error: "Prediction record not found." });
    }
    return res.json({ success: true, message: "Yield prediction deleted." });
  } catch (error) {
    console.error("Error deleting yield prediction:", error);
    return res.status(500).json({ error: "Failed to delete prediction record." });
  }
});

// POST /api/yield/predict
router.post("/predict", protect, async (req, res) => {
  try {
    const { cropName, soilType, pH, n, p, k, area, historicalYield, region } = req.body;

    if (!cropName || !soilType || !pH || !area) {
      return res.status(400).json({ error: "Missing required agricultural parameters." });
    }

    const nVal = Number(n) || 50;
    const pVal = Number(p) || 50;
    const kVal = Number(k) || 50;
    const phVal = Number(pH);
    const fieldArea = Number(area);
    const histYield = historicalYield ? Number(historicalYield) : null;
    const soilLower = soilType.toLowerCase();

    // 1. Weather fetching
    let lat = 28.6139;
    let lon = 77.2090;
    let resolvedName = region || "Detected Location";
    if (region && region.trim()) {
      const geo = await geocodeCity(region.trim());
      if (geo) {
        lat = geo.lat;
        lon = geo.lon;
        resolvedName = geo.displayName;
      }
    }

    let currentTemp = 25;
    let currentHumidity = 60;
    let rainPrecip = 0.0;
    let forecastString = "Sunny weather forecasted";
    const weather = await fetchWeather(lat, lon);
    if (weather && weather.current) {
      currentTemp = Math.round(weather.current.temperature_2m);
      currentHumidity = Math.round(weather.current.relative_humidity_2m);
      rainPrecip = weather.current.precipitation || 0.0;
      const dailyMax = weather.daily?.temperature_2m_max?.[0] || currentTemp;
      const dailyMin = weather.daily?.temperature_2m_min?.[0] || currentTemp;
      const dailyRain = weather.daily?.precipitation_sum?.[0] || 0;
      forecastString = `Temp range: ${dailyMin}°C - ${dailyMax}°C, Expected precipitation: ${dailyRain}mm`;
    }

    // Language protocol check
    const lang = req.headers["x-language"] || "en";

    // 2. Dynamic Mandi Price Fluctuation
    const cropData = CROP_BASELINES[cropName] || CROP_BASELINES["Tomato"];
    const daySeed = new Date().getDate();
    const pseudo = Math.sin(daySeed * 9301 + cropName.charCodeAt(0)) * 0.5 + 0.5;
    const fluctuation = (pseudo - 0.5) * 0.12; // ±6%
    const currentMandiPrice = Math.round(cropData.mandiBase * (1 + fluctuation));

    // 3. Check Gemini API
    const geminiKey = req.headers["x-gemini-key"] || process.env.GEMINI_API_KEY;
    if (geminiKey && geminiKey !== "YOUR_GEMINI_API_KEY" && geminiKey.trim().length > 10) {
      try {
        let systemInstruction = `You are Kisan AI, a Lead Agritech Predictive Analytics Engine and Agricultural Advisor. 
You must analyze the crop data, weather parameters, and soil inputs and predict the crop yield (tons/acre), total yield, and total profit (based on mandi price ₹${currentMandiPrice}/quintal).
You must also output a precise stage-wise Drip Irrigation Schedule and Fertilizer Application Schedule in strict JSON format. 
Do not add any markdown formatting, wrappers, or text outside the JSON output.
Use the exact schema:
{
  "predictedYield": 4.5,
  "totalPredictedYield": 45.0,
  "predictedProfit": 185000,
  "explanation": "Brief explainable AI analysis of why the yield was adjusted based on soil nutrients and weather conditions.",
  "irrigationSchedule": [
    {
      "stage": "Basal Establishment",
      "frequencyDays": 3,
      "runTimeMinutes": 30,
      "notes": "Ensure soil stays moist. Skip if precipitation is high."
    }
  ],
  "fertilizerSchedule": [
    {
      "stage": "Basal Dressing",
      "ureaKg": 10,
      "dapKg": 50,
      "mopKg": 30,
      "organicCompostTons": 5,
      "notes": "Mix with soil during initial bed formation."
    }
  ]
}`;

        if (lang === "mr") {
          systemInstruction += "\nIMPORTANT: You must write the entire output JSON string values (explanation, stage, notes, etc.) in Marathi (मराठी) language. Do not translate JSON keys like 'predictedYield', 'totalPredictedYield', 'predictedProfit', 'explanation', 'irrigationSchedule', 'stage', 'frequencyDays', 'runTimeMinutes', 'notes', 'fertilizerSchedule', 'ureaKg', 'dapKg', 'mopKg', 'organicCompostTons', etc. Only translate their values into Marathi.";
        }

        const prompt = `
          Run Predictive Yield Engine for:
          - Crop: ${cropName}
          - Field Area: ${fieldArea} acres
          - Soil Type: ${soilType}
          - pH: ${phVal}
          - NPK levels: N=${nVal}, P=${pVal}, K=${kVal}
          - Historical Yield Bench: ${histYield ? histYield + " tons/acre" : "No record available"}
          - Region/Location: ${resolvedName}
          - Current Weather Context: Temp ${currentTemp}°C, Humidity ${currentHumidity}%, Precipitation ${rainPrecip}mm. (${forecastString})
          - Live local Mandi Price: ₹${currentMandiPrice}/quintal
        `;

        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{
                role: "user",
                parts: [{ text: `${systemInstruction}\n\nUser Context:\n${prompt}` }]
              }]
            })
          }
        );

        const data = await response.json();
        let textResult = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (textResult) {
          if (textResult.includes("```json")) {
            textResult = textResult.split("```json")[1].split("```")[0];
          } else if (textResult.includes("```")) {
            textResult = textResult.split("```")[1].split("```")[0];
          }

          const parsed = JSON.parse(textResult.trim());
          if (parsed.predictedYield !== undefined && parsed.irrigationSchedule && parsed.fertilizerSchedule) {
            // Save to DB
            const prediction = await YieldPrediction.create({
              user: req.user._id,
              cropName,
              soilType,
              pH: phVal,
              n: nVal,
              p: pVal,
              k: kVal,
              area: fieldArea,
              historicalYield: histYield,
              predictedYield: Number(parsed.predictedYield),
              totalPredictedYield: Number(parsed.totalPredictedYield || (parsed.predictedYield * fieldArea)),
              predictedProfit: Number(parsed.predictedProfit),
              irrigationSchedule: parsed.irrigationSchedule,
              fertilizerSchedule: parsed.fertilizerSchedule,
              region: resolvedName
            });

            return res.status(201).json({
              success: true,
              source: "gemini",
              explanation: parsed.explanation,
              prediction
            });
          }
        }
      } catch (geminiError) {
        console.error("Gemini Yield Engine call failed, falling back to local engine:", geminiError);
      }
    }

    // 4. Fallback Rule-Based Yield Engine
    const baselineObj = CROP_BASELINES[cropName] || { baseYield: 2.0, optimalPH: { min: 6.0, max: 7.0 }, optimalNPK: { n: 80, p: 40, k: 30 } };
    const baselineYield = histYield ? histYield : baselineObj.baseYield;

    // Run deterministic coefficients
    let multiplier = 1.0;

    // Soil type impact
    if (soilLower === "sandy") {
      multiplier -= 0.15; // nutrients drain
    } else if (soilLower === "clay") {
      if (cropName === "Paddy" || cropName === "Rice") multiplier += 0.10; // Rice loves clay
      else multiplier -= 0.12; // Waterlogging risk for others
    } else if (soilLower === "peaty") {
      multiplier -= 0.08;
    } else {
      multiplier += 0.05; // Loamy optimal
    }

    // pH impact
    const optPH = baselineObj.optimalPH;
    if (phVal < optPH.min || phVal > optPH.max) {
      const dev = phVal < optPH.min ? optPH.min - phVal : phVal - optPH.max;
      multiplier -= Math.min(0.25, dev * 0.1); // deduct up to 25% for extreme pH
    }

    // NPK gap impact
    const optNPK = baselineObj.optimalNPK;
    const nGap = Math.max(0, optNPK.n - nVal);
    const pGap = Math.max(0, optNPK.p - pVal);
    const kGap = Math.max(0, optNPK.k - kVal);
    const totalGap = nGap + pGap + kGap;
    if (totalGap > 0) {
      multiplier -= Math.min(0.20, (totalGap / 300) * 0.20); // deduct up to 20% for severe nutrient deficit
    }

    // Weather impact
    if (currentTemp > 35) {
      multiplier -= 0.10; // Heat stress
    } else if (currentTemp < 15 && (cropName === "Tomato" || cropName === "Chilli" || cropName === "Cotton")) {
      multiplier -= 0.15; // Cold shock for summer crops
    }

    // Precipitation sum boost
    if (rainPrecip > 5.0 && (cropName === "Paddy" || cropName === "Rice")) {
      multiplier += 0.05;
    }

    // Cap multiplier
    multiplier = Math.max(0.4, Math.min(1.35, multiplier));
    const finalPredictedYield = parseFloat((baselineYield * multiplier).toFixed(2));
    const totalYield = parseFloat((finalPredictedYield * fieldArea).toFixed(2));

    // Revenue calculations (1 ton = 10 quintals)
    const totalRevenue = totalYield * 10 * currentMandiPrice;
    // Costs: base operational ₹5000/acre + NPK adjustments ₹2000/acre
    const totalCosts = (5000 + (totalGap * 10)) * fieldArea;
    const predictedProfit = Math.max(1000, Math.round(totalRevenue - totalCosts));

    // Generate irrigation schedule
    const irrInt = soilLower === "sandy" ? 2 : soilLower === "clay" ? 5 : 3;
    const irrMinutes = soilLower === "sandy" ? 25 : soilLower === "clay" ? 45 : 30;
    
    // Generate Fertilizer split quantities based on soil deficits
    const ureaReq = Math.round(nGap * 2.17 * fieldArea); // Urea has 46% N
    const dapReq = Math.round(pGap * 2.17 * fieldArea);  // DAP has 46% P
    const mopReq = Math.round(kGap * 1.66 * fieldArea);  // MOP has 60% K
    const compostReq = 2.5 * fieldArea;

    let explanationEn = `Forecast model evaluated against ${soilType} soil, pH ${pH}, and current temp ${currentTemp}°C. Yield adjusted by ${(multiplier * 100).toFixed(0)}% of crop baseline. Recommended fertilizer splits will compensate for soil NPK gaps.`;
    let explanationMr = `पुढील कापणीचा अंदाज ${soilType} माती, pH ${pH}, आणि तापमान ${currentTemp}°C नुसार काढला आहे. पिकाची उत्पादन क्षमता सुमारे ${(multiplier * 100).toFixed(0)}% निर्धारित केली आहे. खतांचा योग्य वापर करून उत्पादनात वाढ केली जाऊ शकते.`;

    const irrigationSchedule = lang === "mr" ? [
      { stage: "बियाणे उगवण / पायाभूत टप्पा", frequencyDays: Math.max(1, irrInt - 1), runTimeMinutes: irrMinutes, notes: "सुरुवातीच्या वाढीसाठी ओल आवश्यक आहे. सकाळी किंवा संध्याकाळी पाणी द्या." },
      { stage: "शाकीय वाढीचा टप्पा (Week 3-6)", frequencyDays: irrInt, runTimeMinutes: irrMinutes + 5, notes: "खते दिल्यानंतर शेतात ओलावा ठेवावा. अतिपाणी टाळावे." },
      { stage: "फुलधारणा व फळ निर्मिती (Week 7-10)", frequencyDays: Math.max(1, irrInt - 1), runTimeMinutes: irrMinutes + 10, notes: "फुलधारणेदरम्यान पाण्याचा ताण पडू देऊ नका, अन्यथा फुले गळू शकतात." },
      { stage: "काढणीपूर्व टप्पा (काढणीआधी १० दिवस)", frequencyDays: irrInt + 3, runTimeMinutes: irrMinutes - 10, notes: "काढणीपूर्वी पाणी कमी करा म्हणजे पिकाची टिकवण क्षमता सुधारेल." }
    ] : [
      { stage: "Establishment / Initial Sowing", frequencyDays: Math.max(1, irrInt - 1), runTimeMinutes: irrMinutes, notes: "Establish shallow root moisture. Keep soil damp. Water early morning." },
      { stage: "Active Vegetative Development", frequencyDays: irrInt, runTimeMinutes: irrMinutes + 5, notes: "Water right after top-dressing fertilizers. Avoid leaf wetting." },
      { stage: "Flowering & Pod/Fruit Set", frequencyDays: Math.max(1, irrInt - 1), runTimeMinutes: irrMinutes + 10, notes: "Critical moisture window. Do not let soil dry completely to prevent bud drop." },
      { stage: "Pre-Harvest Drying Window", frequencyDays: irrInt + 3, runTimeMinutes: irrMinutes - 10, notes: "Stop irrigation 7-10 days before harvest to improve shelf-life and starch profile." }
    ];

    const fertilizerSchedule = lang === "mr" ? [
      { stage: "पेरणीपूर्व पायाभूत खत (Week 0)", ureaKg: Math.round(ureaReq * 0.2), dapKg: dapReq, mopKg: Math.round(mopReq * 0.4), organicCompostTons: compostReq, notes: "तपशील: संपूर्ण शेणखत आणि डीएपी पेरणीच्या वेळी जमिनीत मिसळा." },
      { stage: "पहिले टॉप ड्रेसिंग (शाकीय वाढ - Week 3)", ureaKg: Math.round(ureaReq * 0.5), dapKg: 0, mopKg: Math.round(mopReq * 0.3), organicCompostTons: 0, notes: "तपशील: खुरपणी झाल्यावर युरिया आणि पोटॅश मुळांजवळ टाका." },
      { stage: "दुसरे टॉप ड्रेसिंग (फुलधारणा - Week 7)", ureaKg: Math.round(ureaReq * 0.3), dapKg: 0, mopKg: Math.round(mopReq * 0.3), organicCompostTons: 0, notes: "तपशील: पिकाला फुले लागण्याच्या सुरुवातीला शेवटचा विभाजित डोस द्यावा." }
    ] : [
      { stage: "Basal Dressing / Pre-Sowing (Week 0)", ureaKg: Math.round(ureaReq * 0.2), dapKg: dapReq, mopKg: Math.round(mopReq * 0.4), organicCompostTons: compostReq, notes: "Mix all compost and DAP directly into the soil bed during tillage." },
      { stage: "First Top Dressing (Vegetative Growth - Week 3)", ureaKg: Math.round(ureaReq * 0.5), dapKg: 0, mopKg: Math.round(mopReq * 0.3), organicCompostTons: 0, notes: "Apply Urea and MOP splits in ring method near the root line after hand weeding." },
      { stage: "Second Top Dressing (Flowering Initiation - Week 7)", ureaKg: Math.round(ureaReq * 0.3), dapKg: 0, mopKg: Math.round(mopReq * 0.3), organicCompostTons: 0, notes: "Apply final nitrogen split. Consider minor foliar Boron spray to reduce flower shedding." }
    ];

    const prediction = await YieldPrediction.create({
      user: req.user._id,
      cropName,
      soilType,
      pH: phVal,
      n: nVal,
      p: pVal,
      k: kVal,
      area: fieldArea,
      historicalYield: histYield,
      predictedYield: finalPredictedYield,
      totalPredictedYield: totalYield,
      predictedProfit,
      irrigationSchedule,
      fertilizerSchedule,
      region: resolvedName
    });

    return res.status(201).json({
      success: true,
      source: "local-calculator",
      explanation: lang === "mr" ? explanationMr : explanationEn,
      prediction
    });

  } catch (error) {
    console.error("Predictive Yield calculation error:", error);
    return res.status(500).json({ error: "Predictive engine encountered an error." });
  }
});

export default router;
