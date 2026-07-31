import express from "express";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

// ─────────────────────────────────────────────────────────────────────────────
//  Static cached weather data (Open-Meteo live fetch removed per product spec)
// ─────────────────────────────────────────────────────────────────────────────

// Weather condition code mappings (WMO codes)
const WMO_CONDITIONS = {
  0: { label: "Clear Sky", icon: "☀️" },
  1: { label: "Mainly Clear", icon: "🌤️" },
  2: { label: "Partly Cloudy", icon: "⛅" },
  3: { label: "Overcast", icon: "☁️" },
  45: { label: "Foggy", icon: "🌫️" },
  48: { label: "Depositing Rime Fog", icon: "🌫️" },
  51: { label: "Light Drizzle", icon: "🌦️" },
  53: { label: "Moderate Drizzle", icon: "🌦️" },
  55: { label: "Dense Drizzle", icon: "🌧️" },
  61: { label: "Slight Rain", icon: "🌧️" },
  63: { label: "Moderate Rain", icon: "🌧️" },
  65: { label: "Heavy Rain", icon: "🌧️" },
  71: { label: "Slight Snowfall", icon: "🌨️" },
  73: { label: "Moderate Snowfall", icon: "❄️" },
  75: { label: "Heavy Snowfall", icon: "❄️" },
  77: { label: "Snow Grains", icon: "🌨️" },
  80: { label: "Slight Showers", icon: "🌦️" },
  81: { label: "Moderate Showers", icon: "🌧️" },
  82: { label: "Violent Showers", icon: "⛈️" },
  85: { label: "Slight Snow Showers", icon: "🌨️" },
  86: { label: "Heavy Snow Showers", icon: "❄️" },
  95: { label: "Thunderstorm", icon: "⛈️" },
  96: { label: "Thunderstorm w/ Hail", icon: "⛈️" },
  99: { label: "Thunderstorm w/ Heavy Hail", icon: "⛈️" },
};

// Static 7-day forecast template for Indian agricultural regions
function buildStaticForecast() {
  const today = new Date();
  const days = ["Today", "Tomorrow", "Mon", "Tue", "Wed", "Thu", "Fri"];
  const conditions = [
    { code: 1, maxTemp: 34, minTemp: 22, rain: 10, wind: 12, uv: 6 },
    { code: 2, maxTemp: 33, minTemp: 21, rain: 20, wind: 15, uv: 5 },
    { code: 80, maxTemp: 30, minTemp: 20, rain: 65, wind: 18, uv: 3 },
    { code: 63, maxTemp: 28, minTemp: 19, rain: 80, wind: 20, uv: 2 },
    { code: 2, maxTemp: 31, minTemp: 20, rain: 25, wind: 14, uv: 5 },
    { code: 1, maxTemp: 35, minTemp: 23, rain: 5, wind: 10, uv: 7 },
    { code: 0, maxTemp: 36, minTemp: 24, rain: 5, wind: 9, uv: 8 },
  ];

  return conditions.map((c, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    const cond = WMO_CONDITIONS[c.code] || { label: "Unknown", icon: "🌡️" };
    const dayName =
      i === 0
        ? "Today"
        : i === 1
        ? "Tomorrow"
        : d.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });
    const dateStr = d.toISOString().split("T")[0];
    return {
      date: dateStr,
      dayName,
      icon: cond.icon,
      condition: cond.label,
      maxTemp: c.maxTemp,
      minTemp: c.minTemp,
      rainChance: c.rain,
      rainfall: (c.rain / 20).toFixed(1),
      maxWind: c.wind,
      uvIndex: c.uv,
      sunrise: "06:15",
      sunset: "19:30",
    };
  });
}

// Static hourly template for next 24 hours
function buildStaticHourly() {
  const hours = [];
  const now = new Date();
  const baseTemp = 28;
  for (let i = 0; i < 8; i++) {
    const t = new Date(now);
    t.setHours(now.getHours() + i * 3);
    const hour = t.getHours();
    const tempOffset = hour >= 11 && hour <= 16 ? 6 : hour <= 6 || hour >= 20 ? -4 : 0;
    hours.push({
      time: t.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }),
      temp: baseTemp + tempOffset,
      rainChance: hour >= 14 && hour <= 18 ? 40 : 10,
      icon: hour >= 20 || hour < 6 ? "🌙" : hour >= 14 ? "⛅" : "☀️",
    });
  }
  return hours;
}

// Farming advice derived from static current conditions
function generateStaticFarmingAdvice() {
  return [
    {
      icon: "✅",
      type: "success",
      title: "Good Day for Farm Work",
      text: "Weather looks favorable. Ideal conditions for spraying, weeding, or harvesting activities.",
    },
    {
      icon: "💧",
      type: "info",
      title: "Irrigation Reminder",
      text: "Monitor soil moisture. Irrigate in the early morning or late evening to reduce evaporation losses.",
    },
    {
      icon: "🌾",
      type: "info",
      title: "Seasonal Advisory",
      text: "Check crop growth stage and apply recommended fertilizers as per schedule. Inspect leaves for early disease symptoms.",
    },
  ];
}

// GET /api/weather?location=cityname  OR  /api/weather?lat=...&lon=...
// Returns cached/static weather data. Live API fetch has been disabled.
router.get("/", protect, async (req, res) => {
  try {
    const { location, lat: qLat, lon: qLon } = req.query;

    let displayName = "New Delhi, India";
    if (location && location.trim()) {
      displayName = location.trim();
    } else if (req.query.name) {
      displayName = req.query.name;
    } else if (qLat && qLon) {
      displayName = `${parseFloat(qLat).toFixed(2)}°N, ${parseFloat(qLon).toFixed(2)}°E`;
    }

    return res.json({
      location: displayName,
      lat: parseFloat(qLat) || 28.6139,
      lon: parseFloat(qLon) || 77.209,
      current: {
        temperature: 32,
        feelsLike: 35,
        humidity: 58,
        condition: "Mainly Clear",
        icon: "🌤️",
        windSpeed: 14,
        windDirection: 220,
        pressure: 1008,
        uvIndex: 6,
        precipitation: 0,
        isDay: true,
      },
      forecast: buildStaticForecast(),
      hourly: buildStaticHourly(),
      farmingAdvice: generateStaticFarmingAdvice(),
      lastUpdated: new Date().toISOString(),
      cached: true,
    });
  } catch (err) {
    console.error("Weather route error:", err.message);
    return res.status(500).json({ error: "Weather data unavailable. Please try again later." });
  }
});

export default router;
