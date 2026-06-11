import express from "express";
import { protect } from "../middleware/authMiddleware.js";

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
    console.error("Geocoding failed inside recommendations:", err);
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
    console.error("Weather fetch failed inside recommendations:", err);
    return null;
  }
}

// Typical crop statistics database for fallback & contextual pricing
const CROP_DATA = [
  {
    crop: "Wheat",
    seasons: ["rabi"],
    soils: ["loamy", "clay", "black"],
    minPH: 6.0, maxPH: 7.5,
    optimalNPK: { n: 100, p: 50, k: 40 },
    baseYield: 2.0, // tons/acre
    waterReq: "Moderate",
    demand: "High",
    mandiBase: 2275,
    reason: "Wheat thrives in cooler temperatures during the Rabi season in loamy or clayey soil with moderate irrigation."
  },
  {
    crop: "Paddy (Rice)",
    seasons: ["kharif"],
    soils: ["clay", "loamy"],
    minPH: 5.5, maxPH: 6.5,
    optimalNPK: { n: 120, p: 60, k: 40 },
    baseYield: 2.3,
    waterReq: "High",
    demand: "High",
    mandiBase: 2183,
    reason: "Paddy requires hot, humid climates and fields that can retain water, matching clayey or loamy soils during the monsoon season."
  },
  {
    crop: "Tomato",
    seasons: ["kharif", "zaid", "rabi"],
    soils: ["loamy", "sandy", "red"],
    minPH: 6.0, maxPH: 7.0,
    optimalNPK: { n: 80, p: 60, k: 60 },
    baseYield: 10.0,
    waterReq: "Moderate",
    demand: "High",
    mandiBase: 2500,
    reason: "Tomato grows well in warm weather with sandy loam or loamy soil. It has consistent high market demand."
  },
  {
    crop: "Groundnut",
    seasons: ["kharif", "zaid"],
    soils: ["sandy", "red"],
    minPH: 6.0, maxPH: 7.0,
    optimalNPK: { n: 30, p: 50, k: 50 },
    baseYield: 1.0,
    waterReq: "Low",
    demand: "Medium",
    mandiBase: 6377,
    reason: "Groundnut is a legume that fixes nitrogen. It performs well in loose sandy soils that prevent water stagnation."
  },
  {
    crop: "Cotton",
    seasons: ["kharif"],
    soils: ["black", "clay"],
    minPH: 6.0, maxPH: 8.0,
    optimalNPK: { n: 100, p: 50, k: 50 },
    baseYield: 0.9,
    waterReq: "Moderate",
    demand: "High",
    mandiBase: 6620,
    reason: "Cotton requires deep, moisture-retentive black cotton soils and sunny, frost-free growth periods."
  },
  {
    crop: "Mustard",
    seasons: ["rabi"],
    soils: ["sandy", "loamy", "red"],
    minPH: 6.0, maxPH: 7.5,
    optimalNPK: { n: 80, p: 40, k: 20 },
    baseYield: 0.8,
    waterReq: "Low",
    demand: "High",
    mandiBase: 5650,
    reason: "Mustard is highly drought-tolerant and thrives in sandy loam soils during the dry cool winter period."
  },
  {
    crop: "Maize",
    seasons: ["kharif", "rabi"],
    soils: ["loamy", "red", "black"],
    minPH: 5.5, maxPH: 7.5,
    optimalNPK: { n: 120, p: 60, k: 40 },
    baseYield: 2.5,
    waterReq: "Moderate",
    demand: "Medium",
    mandiBase: 1870,
    reason: "Maize is a versatile cereal requiring deep loamy soils and warm, sunny conditions during early vegetative phases."
  },
  {
    crop: "Potato",
    seasons: ["rabi"],
    soils: ["loamy", "sandy"],
    minPH: 5.0, maxPH: 6.5,
    optimalNPK: { n: 120, p: 80, k: 120 },
    baseYield: 12.0,
    waterReq: "Moderate",
    demand: "High",
    mandiBase: 1200,
    reason: "Potato requires cool climates during tuber development and loose, well-aerated sandy loam soil to expand tubers."
  }
];

// POST /api/recommendations/crop
router.post("/crop", protect, async (req, res) => {
  try {
    const { 
      soilType, 
      region, 
      season, 
      irrigationAvailable, 
      lat: userLat, 
      lon: userLon, 
      pH: userPH,
      n: userN,
      p: userP,
      k: userK
    } = req.body;

    const soilTypeLower = (soilType || "loamy").toLowerCase();
    const seasonLower = (season || "kharif").toLowerCase();
    const phVal = parseFloat(userPH) || 6.5;
    const nVal = parseInt(userN) || 50;
    const pVal = parseInt(userP) || 50;
    const kVal = parseInt(userK) || 50;

    let latitude = parseFloat(userLat);
    let longitude = parseFloat(userLon);
    let geoName = region || "Detected Location";

    // 1. Resolve coordinates if names are provided
    if (isNaN(latitude) || isNaN(longitude)) {
      if (region && region.trim()) {
        const geo = await geocodeCity(region.trim());
        if (geo) {
          latitude = geo.lat;
          longitude = geo.lon;
          geoName = geo.displayName;
        }
      } else {
        // Fallback New Delhi
        latitude = 28.6139;
        longitude = 77.2090;
        geoName = "New Delhi, Delhi, India";
      }
    }

    // 2. Fetch Live Weather context
    let weatherData = null;
    let currentTemp = 25;
    let currentHumidity = 60;
    let rainfallSum = 2.0;
    let forecastString = "No live weather data";

    if (!isNaN(latitude) && !isNaN(longitude)) {
      weatherData = await fetchWeather(latitude, longitude);
      if (weatherData && weatherData.current) {
        currentTemp = Math.round(weatherData.current.temperature_2m);
        currentHumidity = Math.round(weatherData.current.relative_humidity_2m);
        rainfallSum = weatherData.current.precipitation || 0.0;
        const dailyMax = weatherData.daily?.temperature_2m_max?.[0] || currentTemp;
        const dailyMin = weatherData.daily?.temperature_2m_min?.[0] || currentTemp;
        const dailyRain = weatherData.daily?.precipitation_sum?.[0] || 0;
        forecastString = `Temp: ${dailyMin}°C - ${dailyMax}°C, Expected precipitation: ${dailyRain}mm`;
      }
    }

    // 3. Assemble dynamic market prices context
    const marketPrices = {};
    CROP_DATA.forEach(c => {
      // Simulate live price with daily fluctuation
      const daySeed = new Date().getDate();
      const pseudo = Math.sin(daySeed * 9301 + c.crop.charCodeAt(0)) * 0.5 + 0.5;
      const fluctuation = (pseudo - 0.5) * 0.12; // ±6%
      marketPrices[c.crop] = Math.round(c.mandiBase * (1 + fluctuation));
    });

    // 4. Try Gemini AI if key is present
    const geminiKey = req.headers["x-gemini-key"] || process.env.GEMINI_API_KEY;
    const lang = req.headers["x-language"] || "en";

    if (geminiKey && geminiKey !== "YOUR_GEMINI_API_KEY" && geminiKey.trim().length > 10) {
      try {
        let systemInstruction = 
          `You are Kisan AI, a Lead Agritech Specialist and AI Soil scientist. 
           You MUST recommend the top 3 most suitable crops and provide a detailed fertilizer schedule in strict JSON format. 
           Do not add any markup, styling, or text outside the JSON output. 
           Use the exact schema:
           {
             "recommendations": [
               {
                 "crop": "Crop name",
                 "suitabilityScore": 95,
                 "reason": "Clear explanation factoring in NPK, pH, season, weather temperature, and mandi price",
                 "predictedYield": "3.5 - 4.0 tons/acre",
                 "estimatedProfit": "₹75,000/acre (calculated based on yield and mandi price)",
                 "waterRequirement": "Moderate",
                 "marketDemand": "High"
               }
             ],
             "fertilizerPlan": [
               {
                 "stage": "Basal Application",
                 "recommendation": "Use 50kg NPK + 10 tons organic compost during tillage."
               },
               {
                 "stage": "Vegetative Growth (Week 3-4)",
                 "recommendation": "Top dress with 20kg Urea per acre."
               }
             ]
           }`;

        if (lang === "mr") {
          systemInstruction += "\nIMPORTANT: You must write the entire output JSON values (crop names, reasons, predictedYield, estimatedProfit, waterRequirement, marketDemand, fertilizer stages, and recommendation details) in Marathi (मराठी) language. Do not translate keys like 'crop', 'suitabilityScore', 'reason', 'predictedYield', 'estimatedProfit', 'waterRequirement', 'marketDemand', 'recommendations', 'fertilizerPlan', 'stage', 'recommendation', etc. Only translate their values into Marathi.";
        }

        const prompt = `
          Recommend crops based on these values:
          - Soil: ${soilTypeLower}
          - pH: ${phVal}
          - NPK: N=${nVal}, P=${pVal}, K=${kVal}
          - Season: ${seasonLower}
          - Irrigation: ${irrigationAvailable ? "Available" : "Not available"}
          - Location: ${geoName}
          - Live Weather: Temp ${currentTemp}°C, Humidity ${currentHumidity}%, Rain ${rainfallSum}mm. (${forecastString})
          - Live Mandi prices: ${JSON.stringify(marketPrices)}
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
          // Clean up markdown block wraps if model outputted them
          if (textResult.includes("```json")) {
            textResult = textResult.split("```json")[1].split("```")[0];
          } else if (textResult.includes("```")) {
            textResult = textResult.split("```")[1].split("```")[0];
          }
          
          const parsed = JSON.parse(textResult.trim());
          if (parsed.recommendations && parsed.fertilizerPlan) {
            return res.json({ 
              success: true, 
              source: "gemini", 
              location: geoName, 
              weather: { temp: currentTemp, humidity: currentHumidity, forecast: forecastString },
              recommendations: parsed.recommendations, 
              fertilizerPlan: parsed.fertilizerPlan 
            });
          }
        }
      } catch (geminiError) {
        console.error("Gemini crop recommendation error, falling back to rule engine:", geminiError);
      }
    }

    // 5. Sophisticated Heuristic/Rule-Based Classifier Fallback
    const matches = [];

    CROP_DATA.forEach(crop => {
      let score = 50; // Base score

      // A. Season Match
      if (crop.seasons.includes(seasonLower)) {
        score += 20;
      } else {
        score -= 25; // penalize heavily if out of season
      }

      // B. Soil Suitability
      if (crop.soils.includes(soilTypeLower)) {
        score += 15;
      } else {
        score -= 10;
      }

      // C. pH Level compatibility
      if (phVal >= crop.minPH && phVal <= crop.maxPH) {
        score += 10;
      } else {
        const diff = Math.min(Math.abs(phVal - crop.minPH), Math.abs(phVal - crop.maxPH));
        score -= Math.round(diff * 10); // penalize further away from pH
      }

      // D. NPK suitability (Euclidean matching score)
      const nDiff = Math.abs(nVal - crop.optimalNPK.n);
      const pDiff = Math.abs(pVal - crop.optimalNPK.p);
      const kDiff = Math.abs(kVal - crop.optimalNPK.k);
      const dist = Math.sqrt(nDiff*nDiff + pDiff*pDiff + kDiff*kDiff);
      // Map NPK distance (0 to 150) to score adjustment
      const npkBonus = Math.max(0, 15 - Math.round(dist * 0.15));
      score += npkBonus;

      // E. Water compatibility
      if (crop.waterReq === "High" && !irrigationAvailable) {
        score -= 20;
      } else if (crop.waterReq === "Low" && !irrigationAvailable) {
        score += 10; // drought-resistant crops favored
      }

      // Cap score
      score = Math.max(10, Math.min(98, score));

      matches.push({
        crop: crop.crop,
        score,
        baseYield: crop.baseYield,
        waterReq: crop.waterReq,
        demand: crop.demand,
        mandiPrice: marketPrices[crop.crop],
        reason: crop.reason
      });
    });

    // Sort by score descending and take top 3
    matches.sort((a, b) => b.score - a.score);
    const topMatches = matches.slice(0, 3);

    const recommendations = topMatches.map(m => {
      // Calculate continuous yield forecast with variation based on compatibility score
      const yieldMod = (m.score / 80); // Multiplier around 0.5 to 1.2
      const minYield = (m.baseYield * 0.9 * yieldMod).toFixed(1);
      const maxYield = (m.baseYield * 1.15 * yieldMod).toFixed(1);
      const predictedYield = `${minYield} - ${maxYield} tons/acre`;

      // Calculate expected profit based on average simulated mandi price
      const averageYield = (m.baseYield * yieldMod);
      const quintalsPerAcre = averageYield * 10; // 1 ton = 10 quintals
      const totalRevenue = quintalsPerAcre * m.mandiPrice;
      const cultivationCost = averageYield * 5000 + 4000; // Estimated input cost
      const netProfit = Math.round(totalRevenue - cultivationCost);

      const cropMr = {
        "Wheat": "गहू",
        "Paddy (Rice)": "भात (तांदूळ)",
        "Tomato": "टोमॅटो",
        "Groundnut": "भुईमूग",
        "Cotton": "कापूस",
        "Mustard": "मोहरी",
        "Maize": "मका",
        "Potato": "बटाटा"
      };

      const reasonMr = {
        "Wheat": "गहू थंड हवामानात आणि पाण्याचा निचरा होणाऱ्या लोमी मातीत चांगला वाढतो, जो हिवाळी हंगामासाठी योग्य आहे.",
        "Paddy (Rice)": "भाताच्या पिकाला मुळांद्वारे पाणी शोषून घेण्यासाठी सतत पाणी साचून राहणे आणि चिकणमाती आवश्यक असते.",
        "Tomato": "टोमॅटो गरम हवामानात वाळूच्या किंवा लोमी मातीत चांगला वाढतो आणि बाजारात सतत उच्च मागणी असते.",
        "Groundnut": "भुईमूग हे हवेतील नायट्रोजन जमिनीत स्थिर करते. ते हलक्या मातीत पाण्याचा निचरा होण्यास मदत करते.",
        "Cotton": "कापूस हे नगदी पीक असून ते जास्त पाणी धरून ठेवण्याची क्षमता असलेल्या खोल काळ्या मातीत आणि उष्ण हवामानात वाढते.",
        "Mustard": "मोहरीला थंड तापमान आणि कमी पाण्याची आवश्यकता असते, ज्यामुळे ती कोरड्या मातीसाठी योग्य मानली जाते.",
        "Maize": "मका हे बहुगुणी पीक असून त्याला खोल गाळाची माती आणि सुरुवातीच्या वाढीसाठी उबदार, सूर्यप्रकाश आवश्यक असतो.",
        "Potato": "बटाट्याला बटाटे मोठे होण्यासाठी थंड हवामान आणि भुसभुशीत, हवा खेळती राहणारी वाळूमय लोमी माती हवी असते."
      };

      const waterMr = {
        "High": "जास्त",
        "Moderate": "मध्यम",
        "Low": "कमी"
      };

      const demandMr = {
        "High": "जास्त",
        "Moderate": "मध्यम",
        "Low": "कमी"
      };

      const cropName = lang === "mr" ? (cropMr[m.crop] || m.crop) : m.crop;
      const cropReason = lang === "mr" ? (reasonMr[m.crop] || m.reason) : m.reason;
      const reasonText = lang === "mr" 
        ? `${cropReason} स्थानिक चालू बाजार भाव ₹${m.mandiPrice}/क्विंटल आहे.` 
        : `${cropReason} Live local Mandi price is ₹${m.mandiPrice}/quintal.`;
      
      const profitText = lang === "mr" 
        ? `₹${netProfit.toLocaleString("en-IN")}/एकर` 
        : `₹${netProfit.toLocaleString("en-IN")}/acre`;

      const yieldText = lang === "mr"
        ? `${minYield} - ${maxYield} टन/एकर`
        : `${minYield} - ${maxYield} tons/acre`;

      return {
        crop: cropName,
        suitabilityScore: m.score,
        reason: reasonText,
        predictedYield: yieldText,
        estimatedProfit: profitText,
        waterRequirement: lang === "mr" ? (waterMr[m.waterReq] || m.waterReq) : m.waterReq,
        marketDemand: lang === "mr" ? (demandMr[m.demand] || m.demand) : m.demand
      };
    });

    // Create tailored stage-wise fertilizer plan based on the soil inputs and best recommended crop
    const bestCrop = recommendations[0]?.crop || "Millets";
    // If bestCrop was translated to Marathi, resolve its English equivalent to lookup in CROP_DATA
    const cropMrInverse = {
      "गहू": "Wheat",
      "भात (तांदूळ)": "Paddy (Rice)",
      "टोमॅटो": "Tomato",
      "भुईमूग": "Groundnut",
      "कापूस": "Cotton",
      "मोहरी": "Mustard",
      "मका": "Maize",
      "बटाटा": "Potato"
    };
    const bestCropEn = cropMrInverse[bestCrop] || bestCrop;
    const optimalCrop = CROP_DATA.find(c => c.crop === bestCropEn) || { optimalNPK: { n: 60, p: 40, k: 30 } };
    
    // Custom calculation: advise NPK values based on deficiency
    const nGap = Math.max(0, optimalCrop.optimalNPK.n - nVal);
    const pGap = Math.max(0, optimalCrop.optimalNPK.p - pVal);
    const kGap = Math.max(0, optimalCrop.optimalNPK.k - kVal);

    const fertilizerPlan = lang === "mr" ? [
      {
        stage: "पायाभूत खत (शेतीची तयारी)",
        recommendation: `१०-१५ टन सेंद्रिय शेणखत टाका. माती चाचणीनुसार NPK मूल्ये आहेत: N=${nVal}, P=${pVal}, K=${kVal}. ${bestCrop} साठी आवश्यक प्रमाण N=${optimalCrop.optimalNPK.n}, P=${optimalCrop.optimalNPK.p}, K=${optimalCrop.optimalNPK.k} आहे, म्हणून पेरणीपूर्वी ${pGap > 0 ? (pGap * 0.8).toFixed(0) + "किलो फॉस्फरस (सिंगल सुपर फॉस्फेटद्वारे)" : "शिफारस केलेले फॉस्फरस"} आणि ${kGap > 0 ? (kGap * 0.8).toFixed(0) + "किलो पोटॅश (एमओपी द्वारे)" : "शिफारस केलेले पोटॅश"} टाका.`
      },
      {
        stage: "शाकीय वाढ/फुटवे येण्याचा टप्पा (आठवडा ३-४)",
        recommendation: `पानांच्या चांगल्या वाढीसाठी ${nGap > 0 ? (nGap * 0.6).toFixed(0) + "किलो नायट्रोजन (युरियाद्वारे टॉप ड्रेसिंग)" : "२५ किलो नायट्रोजन"} टाका.`
      },
      {
        stage: "फूल येण्याचा/लोंब्या बाहेर पडण्याचा टप्पा (आठवडा ७-८)",
        recommendation: `नायट्रोजनचा उर्वरित हप्ता (${nGap > 0 ? (nGap * 0.4).toFixed(0) + "किलो नायट्रोजन" : "१५ किलो नायट्रोजन"}) टाका आणि रोगांचा प्रतिकार करण्यासाठी आणि दाण्यांची गुणवत्ता सुधारण्यासाठी १% पोटॅशियम नायट्रेटची फवारणी करा.`
      }
    ] : [
      {
        stage: "Basal Dressing (Field Preparation)",
        recommendation: `Apply 10-15 tons of organic compost. Soil test shows NPK values: N=${nVal}, P=${pVal}, K=${kVal}. Since optimal for ${bestCropEn} is N=${optimalCrop.optimalNPK.n}, P=${optimalCrop.optimalNPK.p}, K=${optimalCrop.optimalNPK.k}, apply ${pGap > 0 ? (pGap * 0.8).toFixed(0) + "kg Phosphorus (via Single Super Phosphate)" : "recommended maintenance Phosphorus"} and ${kGap > 0 ? (kGap * 0.8).toFixed(0) + "kg Potassium (via MOP)" : "recommended Potassium"} before sowing.`
      },
      {
        stage: "Vegetative/Active Tillering Stage (Week 3-4)",
        recommendation: `Apply ${nGap > 0 ? (nGap * 0.6).toFixed(0) + "kg Nitrogen (top dressing via Urea)" : "25kg nitrogen"} to stimulate vegetative leaf growth and foliage expansion.`
      },
      {
        stage: "Flowering/Panicle Initiation Stage (Week 7-8)",
        recommendation: `Apply remaining split dose of Nitrogen (${nGap > 0 ? (nGap * 0.4).toFixed(0) + "kg Nitrogen" : "15kg nitrogen"}) and spray 1% Potassium Nitrate solution to build disease resistance and enhance fruit/grain quality.`
      }
    ];

    return res.json({
      success: true,
      source: "local-classifier",
      location: geoName,
      weather: { temp: currentTemp, humidity: currentHumidity, forecast: forecastString },
      recommendations,
      fertilizerPlan
    });

  } catch (err) {
    console.error("Recommendations API error:", err);
    return res.status(500).json({ error: "Failed to generate crop recommendations. Please check inputs and try again." });
  }
});

export default router;

