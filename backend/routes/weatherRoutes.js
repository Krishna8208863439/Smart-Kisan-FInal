import express from "express";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

// Weather condition code mappings (WMO codes from Open-Meteo)
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

// Geocoding: Convert city name → lat/lon using Open-Meteo geocoding API
async function geocodeCity(cityName) {
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(cityName)}&count=1&language=en&format=json`;
  const res = await fetch(url);
  const data = await res.json();
  if (!data.results || data.results.length === 0) return null;
  const { latitude, longitude, name, admin1, country } = data.results[0];
  return { lat: latitude, lon: longitude, displayName: `${name}${admin1 ? ", " + admin1 : ""}, ${country}` };
}

// Fetch live weather from Open-Meteo (free, no API key)
async function fetchOpenMeteo(lat, lon) {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}`
    + `&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,wind_speed_10m,wind_direction_10m,weather_code,surface_pressure,uv_index`
    + `&hourly=temperature_2m,precipitation_probability,weather_code`
    + `&daily=weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,precipitation_sum,precipitation_probability_max,wind_speed_10m_max,uv_index_max`
    + `&timezone=Asia%2FKolkata&forecast_days=7&wind_speed_unit=kmh`;

  const res = await fetch(url);
  if (!res.ok) throw new Error("Weather API request failed");
  return res.json();
}

// GET /api/weather?location=cityname  OR  /api/weather?lat=...&lon=...
router.get("/", protect, async (req, res) => {
  try {
    const { location, lat: qLat, lon: qLon } = req.query;

    let lat, lon, displayName;

    // Coordinates provided directly (from browser geolocation)
    if (qLat && qLon) {
      lat = parseFloat(qLat);
      lon = parseFloat(qLon);
      displayName = req.query.name || "Your Location";
    } else if (location && location.trim()) {
      // Geocode the city name
      const geo = await geocodeCity(location.trim());
      if (!geo) {
        return res.status(404).json({ error: `Location "${location}" not found. Try a major city or district name.` });
      }
      lat = geo.lat;
      lon = geo.lon;
      displayName = geo.displayName;
    } else {
      // Default: New Delhi
      lat = 28.6139;
      lon = 77.2090;
      displayName = "New Delhi, India";
    }

    const raw = await fetchOpenMeteo(lat, lon);
    const curr = raw.current;
    const daily = raw.daily;
    const hourly = raw.hourly;

    // Current weather
    const wmoCode = curr.weather_code;
    const condition = WMO_CONDITIONS[wmoCode] || { label: "Unknown", icon: "🌡️" };

    // Farming-specific advisory based on conditions
    const farmingAdvice = generateFarmingAdvice(curr, daily, wmoCode);

    // 7-day forecast
    const forecast = daily.time.map((dateStr, i) => {
      const code = daily.weather_code[i];
      const cond = WMO_CONDITIONS[code] || { label: "Unknown", icon: "🌡️" };
      const sunrise = daily.sunrise[i] ? daily.sunrise[i].split("T")[1] : "--";
      const sunset = daily.sunset[i] ? daily.sunset[i].split("T")[1] : "--";
      const date = new Date(dateStr);
      return {
        date: dateStr,
        dayName: i === 0 ? "Today" : i === 1 ? "Tomorrow" : date.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" }),
        icon: cond.icon,
        condition: cond.label,
        maxTemp: Math.round(daily.temperature_2m_max[i]),
        minTemp: Math.round(daily.temperature_2m_min[i]),
        rainChance: daily.precipitation_probability_max[i] || 0,
        rainfall: (daily.precipitation_sum[i] || 0).toFixed(1),
        maxWind: Math.round(daily.wind_speed_10m_max[i] || 0),
        uvIndex: Math.round(daily.uv_index_max[i] || 0),
        sunrise,
        sunset,
      };
    });

    // Hourly forecast for next 24 hours
    const now = new Date();
    const currentHourIdx = hourly.time.findIndex(t => new Date(t) >= now);
    const next24Hours = hourly.time.slice(currentHourIdx, currentHourIdx + 24).map((t, i) => {
      const idx = currentHourIdx + i;
      const code = hourly.weather_code[idx];
      const hCond = WMO_CONDITIONS[code] || { icon: "🌡️" };
      return {
        time: new Date(t).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }),
        temp: Math.round(hourly.temperature_2m[idx]),
        rainChance: hourly.precipitation_probability[idx] || 0,
        icon: hCond.icon,
      };
    }).filter((_, i) => i % 3 === 0); // Every 3 hours

    return res.json({
      location: displayName,
      lat, lon,
      current: {
        temperature: Math.round(curr.temperature_2m),
        feelsLike: Math.round(curr.apparent_temperature),
        humidity: curr.relative_humidity_2m,
        condition: condition.label,
        icon: condition.icon,
        windSpeed: Math.round(curr.wind_speed_10m),
        windDirection: curr.wind_direction_10m,
        pressure: Math.round(curr.surface_pressure),
        uvIndex: Math.round(curr.uv_index || 0),
        precipitation: curr.precipitation || 0,
        isDay: curr.is_day === 1,
      },
      forecast,
      hourly: next24Hours,
      farmingAdvice,
      lastUpdated: new Date().toISOString(),
    });
  } catch (err) {
    console.error("Weather API error:", err.message);
    return res.status(500).json({ error: "Failed to fetch live weather data. Please try again." });
  }
});

function generateFarmingAdvice(curr, daily, wmoCode) {
  const tips = [];
  const temp = Math.round(curr.temperature_2m);
  const humidity = curr.relative_humidity_2m;
  const wind = Math.round(curr.wind_speed_10m);
  const rain = curr.precipitation || 0;
  const uv = curr.uv_index || 0;
  const rainTomorrow = daily.precipitation_probability_max[1] || 0;

  // Rain advice
  if ([61, 63, 65, 80, 81, 82, 95, 96, 99].includes(wmoCode)) {
    tips.push({ icon: "🌧️", type: "warning", title: "Heavy Rain Alert", text: "Suspend irrigation and postpone fertilizer application. Ensure field drainage is clear to prevent waterlogging." });
  } else if (rainTomorrow > 60) {
    tips.push({ icon: "⛈️", type: "warning", title: "Rain Expected Tomorrow", text: `${rainTomorrow}% chance of rain tomorrow. Skip irrigation today and delay pesticide spraying.` });
  }

  // Temperature advice
  if (temp > 38) {
    tips.push({ icon: "🔥", type: "danger", title: "Heat Stress Risk", text: "Temperatures above 38°C. Irrigate crops in the early morning or late evening. Mulch root zones to retain moisture." });
  } else if (temp < 10) {
    tips.push({ icon: "❄️", type: "info", title: "Cold Stress Risk", text: "Low temperatures may damage tender crops. Cover seedlings and nursery beds with polythene mulch tonight." });
  } else if (temp >= 20 && temp <= 30) {
    tips.push({ icon: "✅", type: "success", title: "Ideal Growing Conditions", text: "Temperature is optimal for most rabi and kharif crops. Good time for transplanting and sowing activities." });
  }

  // Humidity advice
  if (humidity > 85) {
    tips.push({ icon: "💧", type: "warning", title: "High Humidity — Disease Risk", text: "High humidity favors fungal diseases (blight, mildew). Improve crop ventilation and inspect leaves for early symptoms." });
  } else if (humidity < 30) {
    tips.push({ icon: "🌵", type: "warning", title: "Low Humidity — Drought Risk", text: "Very dry conditions. Monitor soil moisture closely and schedule drip or sprinkler irrigation more frequently." });
  }

  // Wind advice
  if (wind > 40) {
    tips.push({ icon: "💨", type: "warning", title: "High Winds", text: `Wind speed ${wind} km/h. Avoid pesticide spraying — chemical drift risk. Support tall crops with stakes.` });
  }

  // UV advice
  if (uv >= 8) {
    tips.push({ icon: "☀️", type: "info", title: "High UV Index", text: "UV Index is high. Best to do field work before 11 AM or after 4 PM to avoid heat exhaustion." });
  }

  // Clear day advice
  if (tips.length === 0) {
    tips.push({ icon: "🌾", type: "success", title: "Good Day for Farm Work", text: "Weather looks favorable. Ideal conditions for spraying, weeding, or harvesting activities." });
  }

  return tips;
}

export default router;
