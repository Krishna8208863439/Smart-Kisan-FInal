import express from "express";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

// ─── Comprehensive commodity database with realistic live-fluctuating prices ───
const COMMODITY_DATA = {
  // Cereals & Grains
  "Wheat": { unit: "quintal", basePrice: 2275, minSupport: 2275, category: "Cereals", icon: "🌾", states: ["Punjab", "Haryana", "UP", "MP", "Rajasthan"] },
  "Paddy (Rice)": { unit: "quintal", basePrice: 2183, minSupport: 2183, category: "Cereals", icon: "🌾", states: ["Punjab", "Haryana", "AP", "WB", "Odisha"] },
  "Maize": { unit: "quintal", basePrice: 1870, minSupport: 1870, category: "Cereals", icon: "🌽", states: ["Karnataka", "AP", "Bihar", "UP", "Rajasthan"] },
  "Jowar": { unit: "quintal", basePrice: 3180, minSupport: 3180, category: "Cereals", icon: "🌾", states: ["Maharashtra", "Karnataka", "MP", "Rajasthan"] },
  "Bajra": { unit: "quintal", basePrice: 2500, minSupport: 2500, category: "Cereals", icon: "🌾", states: ["Rajasthan", "UP", "Haryana", "Gujarat"] },

  // Pulses
  "Arhar (Tur Dal)": { unit: "quintal", basePrice: 7000, minSupport: 7000, category: "Pulses", icon: "🫘", states: ["Maharashtra", "Karnataka", "MP", "UP"] },
  "Chana (Gram)": { unit: "quintal", basePrice: 5440, minSupport: 5440, category: "Pulses", icon: "🫘", states: ["MP", "Rajasthan", "UP", "Maharashtra"] },
  "Moong Dal": { unit: "quintal", basePrice: 8558, minSupport: 8558, category: "Pulses", icon: "🫘", states: ["Rajasthan", "MP", "Maharashtra", "Karnataka"] },
  "Masoor (Lentil)": { unit: "quintal", basePrice: 6000, minSupport: 6000, category: "Pulses", icon: "🫘", states: ["MP", "UP", "Bihar", "Rajasthan"] },
  "Urad Dal": { unit: "quintal", basePrice: 6950, minSupport: 6950, category: "Pulses", icon: "🫘", states: ["MP", "UP", "Maharashtra", "Rajasthan"] },

  // Oilseeds
  "Mustard": { unit: "quintal", basePrice: 5650, minSupport: 5650, category: "Oilseeds", icon: "🟡", states: ["Rajasthan", "UP", "Haryana", "MP"] },
  "Soybean": { unit: "quintal", basePrice: 4600, minSupport: 4600, category: "Oilseeds", icon: "🟡", states: ["MP", "Maharashtra", "Rajasthan"] },
  "Groundnut": { unit: "quintal", basePrice: 6377, minSupport: 6377, category: "Oilseeds", icon: "🥜", states: ["Gujarat", "AP", "Rajasthan", "Tamil Nadu"] },
  "Sunflower": { unit: "quintal", basePrice: 6760, minSupport: 6760, category: "Oilseeds", icon: "🌻", states: ["Karnataka", "AP", "Maharashtra"] },

  // Vegetables
  "Onion": { unit: "quintal", basePrice: 1800, minSupport: null, category: "Vegetables", icon: "🧅", states: ["Maharashtra", "Karnataka", "MP", "Gujarat", "Rajasthan"] },
  "Potato": { unit: "quintal", basePrice: 1200, minSupport: null, category: "Vegetables", icon: "🥔", states: ["UP", "WB", "Bihar", "Gujarat", "MP"] },
  "Tomato": { unit: "quintal", basePrice: 2500, minSupport: null, category: "Vegetables", icon: "🍅", states: ["AP", "Karnataka", "Maharashtra", "UP"] },
  "Garlic": { unit: "quintal", basePrice: 8000, minSupport: null, category: "Vegetables", icon: "🧄", states: ["MP", "Gujarat", "Rajasthan", "UP"] },

  // Cash Crops
  "Cotton": { unit: "quintal", basePrice: 6620, minSupport: 6620, category: "Cash Crops", icon: "🌿", states: ["Gujarat", "Maharashtra", "Telangana", "Punjab"] },
  "Sugarcane": { unit: "quintal", basePrice: 315, minSupport: 315, category: "Cash Crops", icon: "🎋", states: ["UP", "Maharashtra", "Karnataka", "Tamil Nadu"] },
  "Jute": { unit: "quintal", basePrice: 5050, minSupport: 5050, category: "Cash Crops", icon: "🪢", states: ["WB", "Bihar", "Assam", "Odisha"] },
};

// ─── Major Indian Mandis with states ───
const MANDIS = [
  { name: "Azadpur Mandi", city: "Delhi", state: "Delhi", type: "APMC" },
  { name: "Kashi Mandi", city: "Varanasi", state: "Uttar Pradesh", type: "APMC" },
  { name: "Lasalgaon Mandi", city: "Nashik", state: "Maharashtra", type: "APMC" },
  { name: "Gultekdi Market", city: "Pune", state: "Maharashtra", type: "APMC" },
  { name: "Bowenpally Mandi", city: "Hyderabad", state: "Telangana", type: "APMC" },
  { name: "Koyambedu Market", city: "Chennai", state: "Tamil Nadu", type: "APMC" },
  { name: "Yeshwanthpur APMC", city: "Bengaluru", state: "Karnataka", type: "APMC" },
  { name: "Khanna Grain Market", city: "Ludhiana", state: "Punjab", type: "APMC" },
  { name: "Unjha APMC", city: "Mehsana", state: "Gujarat", type: "APMC" },
  { name: "Neemuch APMC", city: "Neemuch", state: "Madhya Pradesh", type: "APMC" },
  { name: "Hapur Mandi", city: "Hapur", state: "Uttar Pradesh", type: "APMC" },
  { name: "Jaipur APMC", city: "Jaipur", state: "Rajasthan", type: "APMC" },
  { name: "Patna Sabzi Mandi", city: "Patna", state: "Bihar", type: "APMC" },
  { name: "Kolkata APMC", city: "Kolkata", state: "West Bengal", type: "APMC" },
  { name: "Bhopal APMC", city: "Bhopal", state: "Madhya Pradesh", type: "APMC" },
];

// ─── Live price simulation with realistic market fluctuation ───
function generateLivePrice(basePrice, seed = 0) {
  // Realistic ±15% intraday volatility with time-based seeding
  const hourSeed = new Date().getHours() + seed;
  const daySeed = new Date().getDate() + new Date().getMonth() * 31;
  const pseudo = Math.sin(hourSeed * 9301 + daySeed * 49297 + seed * 233) * 0.5 + 0.5;
  const fluctuation = (pseudo - 0.5) * 0.15; // ±7.5%
  return Math.round(basePrice * (1 + fluctuation));
}

function generatePriceTrend(basePrice) {
  // Generate 30-day price history
  const today = new Date();
  const trend = [];
  let price = basePrice;
  for (let i = 29; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(today.getDate() - i);
    const seed = i * 17 + date.getDate() * 3;
    const pseudo = Math.sin(seed * 9301 + 49297) * 0.5 + 0.5;
    const delta = (pseudo - 0.5) * 0.06;
    price = Math.round(price * (1 + delta));
    trend.push({
      date: date.toISOString().split("T")[0],
      price,
      label: date.toLocaleDateString("en-IN", { day: "numeric", month: "short" })
    });
  }
  return trend;
}

function getTrendSignal(prices) {
  if (!prices || prices.length < 2) return { dir: "stable", pct: 0 };
  const recent = prices.slice(-5).reduce((a, b) => a + b.price, 0) / 5;
  const older = prices.slice(0, 5).reduce((a, b) => a + b.price, 0) / 5;
  const pct = ((recent - older) / older) * 100;
  return {
    dir: pct > 1 ? "up" : pct < -1 ? "down" : "stable",
    pct: pct.toFixed(1),
    weekPct: (((prices[prices.length - 1].price - prices[prices.length - 8]?.price) / prices[prices.length - 8]?.price) * 100).toFixed(1)
  };
}

// GET /api/market?crop=Wheat&state=Punjab
router.get("/", protect, async (req, res) => {
  try {
    const { crop, state } = req.query;
    const commodity = crop || "Wheat";
    const info = COMMODITY_DATA[commodity];

    if (!info) {
      // Return list of available commodities
      return res.json({
        commodities: Object.entries(COMMODITY_DATA).map(([name, data]) => ({
          name, category: data.category, icon: data.icon, basePrice: data.basePrice, unit: data.unit
        }))
      });
    }

    // Filter mandis by state if provided
    let selectedMandis = state
      ? MANDIS.filter(m => m.state.toLowerCase().includes(state.toLowerCase()))
      : MANDIS.slice(0, 10);

    if (selectedMandis.length === 0) selectedMandis = MANDIS.slice(0, 8);

    // Generate live prices for each mandi
    const prices = selectedMandis.map((mandi, idx) => {
      const price = generateLivePrice(info.basePrice, idx + 1);
      const prevPrice = generateLivePrice(info.basePrice, idx + 2);
      const minPrice = Math.round(price * 0.92);
      const maxPrice = Math.round(price * 1.08);
      const change = price - prevPrice;
      return {
        market: mandi.name,
        city: mandi.city,
        state: mandi.state,
        type: mandi.type,
        pricePerQuintal: price,
        minPrice,
        maxPrice,
        modalPrice: Math.round((price + minPrice + maxPrice) / 3),
        change,
        changePct: ((change / prevPrice) * 100).toFixed(2),
        trend: change > 0 ? "up" : change < 0 ? "down" : "stable",
        arrivalTons: Math.round(20 + Math.abs(Math.sin((idx + 1) * 17)) * 80),
        lastUpdated: new Date().toISOString(),
      };
    });

    // Sort by price ascending
    prices.sort((a, b) => a.pricePerQuintal - b.pricePerQuintal);

    // Price trend (30 days)
    const priceTrend = generatePriceTrend(info.basePrice);
    const trendSignal = getTrendSignal(priceTrend);

    // Market stats
    const priceValues = prices.map(p => p.pricePerQuintal);
    const avgPrice = Math.round(priceValues.reduce((a, b) => a + b, 0) / priceValues.length);
    const minMandi = prices[0];
    const maxMandi = prices[prices.length - 1];

    // Selling recommendation
    const recommendation = generateSellRecommendation(trendSignal, info.minSupport, avgPrice);

    return res.json({
      crop: commodity,
      icon: info.icon,
      unit: info.unit,
      category: info.category,
      minSupportPrice: info.minSupport,
      stats: {
        avgPrice,
        minPrice: minMandi.pricePerQuintal,
        maxPrice: maxMandi.pricePerQuintal,
        bestBuyMandi: minMandi.market,
        bestSellMandi: maxMandi.market,
        spread: maxMandi.pricePerQuintal - minMandi.pricePerQuintal,
        totalArrival: prices.reduce((a, p) => a + p.arrivalTons, 0),
      },
      trend: trendSignal,
      priceTrend,
      prices,
      recommendation,
      lastUpdated: new Date().toISOString(),
    });
  } catch (err) {
    console.error("Market API error:", err);
    return res.status(500).json({ error: "Failed to fetch market prices. Please try again." });
  }
});

// GET /api/market/commodities — list all available commodities
router.get("/commodities", protect, (req, res) => {
  const list = Object.entries(COMMODITY_DATA).map(([name, data]) => ({
    name,
    category: data.category,
    icon: data.icon,
    unit: data.unit,
    basePrice: data.basePrice,
    msp: data.minSupport,
    states: data.states,
  }));
  return res.json({ commodities: list });
});

function generateSellRecommendation(trend, msp, avgPrice) {
  if (!msp) {
    if (trend.dir === "up") return { action: "SELL NOW", color: "success", reason: `Prices are trending up +${trend.pct}% over the last month. Good time to sell.` };
    if (trend.dir === "down") return { action: "HOLD", color: "warning", reason: `Prices falling ${trend.pct}%. Consider holding stock for 1–2 weeks to recover.` };
    return { action: "MONITOR", color: "info", reason: "Market is stable. Watch for better price opportunities before selling." };
  }

  const aboveMSP = avgPrice >= msp;
  if (trend.dir === "up" && aboveMSP) {
    return { action: "SELL NOW", color: "success", reason: `Excellent — avg mandi price ₹${avgPrice} is above MSP ₹${msp} and trending up. Maximize your returns!` };
  } else if (!aboveMSP) {
    return { action: "SELL AT MSP", color: "warning", reason: `Market price ₹${avgPrice} is below MSP ₹${msp}. Sell directly to government procurement centers to guarantee MSP.` };
  } else if (trend.dir === "down") {
    return { action: "SELL SOON", color: "danger", reason: `Price is declining. Sell within 2–3 days to avoid further losses below MSP.` };
  }
  return { action: "HOLD", color: "info", reason: `Price is stable at ₹${avgPrice}. Monitor daily and sell when trend turns upward.` };
}

export default router;
