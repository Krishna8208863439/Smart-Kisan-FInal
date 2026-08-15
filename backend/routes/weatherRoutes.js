import express from "express";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

// ─────────────────────────────────────────────────────────────────────────────
//  WMO Weather Interpretation Code → label + emoji icon
// ─────────────────────────────────────────────────────────────────────────────
const WMO_CONDITIONS = {
  0:  { label: "Clear Sky",                    icon: "☀️"  },
  1:  { label: "Mainly Clear",                 icon: "🌤️"  },
  2:  { label: "Partly Cloudy",                icon: "⛅"  },
  3:  { label: "Overcast",                     icon: "☁️"  },
  45: { label: "Foggy",                        icon: "🌫️"  },
  48: { label: "Depositing Rime Fog",          icon: "🌫️"  },
  51: { label: "Light Drizzle",                icon: "🌦️"  },
  53: { label: "Moderate Drizzle",             icon: "🌦️"  },
  55: { label: "Dense Drizzle",                icon: "🌧️"  },
  61: { label: "Slight Rain",                  icon: "🌧️"  },
  63: { label: "Moderate Rain",                icon: "🌧️"  },
  65: { label: "Heavy Rain",                   icon: "🌧️"  },
  71: { label: "Slight Snowfall",              icon: "🌨️"  },
  73: { label: "Moderate Snowfall",            icon: "❄️"  },
  75: { label: "Heavy Snowfall",               icon: "❄️"  },
  77: { label: "Snow Grains",                  icon: "🌨️"  },
  80: { label: "Slight Showers",               icon: "🌦️"  },
  81: { label: "Moderate Showers",             icon: "🌧️"  },
  82: { label: "Violent Showers",              icon: "⛈️"  },
  85: { label: "Slight Snow Showers",          icon: "🌨️"  },
  86: { label: "Heavy Snow Showers",           icon: "❄️"  },
  95: { label: "Thunderstorm",                 icon: "⛈️"  },
  96: { label: "Thunderstorm w/ Hail",         icon: "⛈️"  },
  99: { label: "Thunderstorm w/ Heavy Hail",   icon: "⛈️"  },
};

function wmo(code) {
  return WMO_CONDITIONS[code] ?? { label: "Unknown", icon: "🌡️" };
}

// ─────────────────────────────────────────────────────────────────────────────
//  Geocode a city name → { lat, lon, displayName }
//  Uses Open-Meteo geocoding API — free, no API key required.
// ─────────────────────────────────────────────────────────────────────────────
async function geocodeCity(cityName) {
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(cityName)}&count=1&language=en&format=json`;
  console.log(`[Weather] Geocoding "${cityName}" → ${url}`);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Geocoding API HTTP ${res.status}`);
  const data = await res.json();
  if (!data.results?.length) return null;
  const r = data.results[0];
  return {
    lat: r.latitude,
    lon: r.longitude,
    displayName: [r.name, r.admin1, r.country].filter(Boolean).join(", "),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
//  Reverse Geocode GPS coordinates (lat, lon) → City / Village, State, Country
// ─────────────────────────────────────────────────────────────────────────────
async function reverseGeocode(lat, lon) {
  // Service 1: BigDataCloud Reverse Geocoding (Fast, accurate, no key needed)
  try {
    const url = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`;
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      const place = data.locality || data.city || data.localityInfo?.administrative?.find(a => a.order === 3 || a.adminLevel === 6)?.name;
      const state = data.principalSubdivision;
      const country = data.countryName || "India";
      const parts = [place, state, country].filter(Boolean);
      if (parts.length > 0) return parts.join(", ");
    }
  } catch (_e) {}

  // Service 2: OpenStreetMap Nominatim with User-Agent
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&addressdetails=1`;
    const res = await fetch(url, { headers: { "User-Agent": "SmartKisanApp/1.0" } });
    if (res.ok) {
      const data = await res.json();
      const addr = data.address || {};
      const place = addr.village || addr.town || addr.city || addr.suburb || addr.county || addr.state_district;
      const state = addr.state;
      const country = addr.country;
      const parts = [place, state, country].filter(Boolean);
      if (parts.length > 0) return parts.join(", ");
    }
  } catch (_e) {}

  return `${lat.toFixed(3)}°N, ${lon.toFixed(3)}°E`;
}

// ─────────────────────────────────────────────────────────────────────────────
//  Fetch full weather forecast from Open-Meteo — free, no API key required.
//  Fetches: current conditions, 7-day daily, 24h hourly (temp + precip + UV).
// ─────────────────────────────────────────────────────────────────────────────
async function fetchOpenMeteo(lat, lon) {
  const params = [
    `latitude=${lat}`,
    `longitude=${lon}`,
    `current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,pressure_msl,wind_speed_10m,wind_direction_10m,weather_code`,
    `hourly=temperature_2m,precipitation_probability,weather_code,uv_index`,
    `daily=temperature_2m_max,temperature_2m_min,weather_code,precipitation_probability_max,precipitation_sum,wind_speed_10m_max,uv_index_max,sunrise,sunset`,
    `timezone=auto`,
    `forecast_days=7`,
  ].join("&");
  const url = `https://api.open-meteo.com/v1/forecast?${params}`;
  console.log(`[Weather] Fetching Open-Meteo: ${url}`);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Open-Meteo API HTTP ${res.status}`);
  return await res.json();
}

// ─────────────────────────────────────────────────────────────────────────────
//  Format "HH:MM" from an ISO datetime string like "2026-08-14T06:15"
// ─────────────────────────────────────────────────────────────────────────────
function fmtTime(isoStr) {
  if (!isoStr) return "--:--";
  const timePart = isoStr.includes("T") ? isoStr.split("T")[1] : isoStr;
  return timePart.slice(0, 5);
}

// ─────────────────────────────────────────────────────────────────────────────
//  Generate farming advice from REAL current conditions (not static template).
// ─────────────────────────────────────────────────────────────────────────────
function generateFarmingAdvice({ temperature, humidity, precipitation, windSpeed, uvIndex }) {
  const tips = [];

  // Precipitation / irrigation advice
  if (precipitation > 5) {
    tips.push({
      icon: "🌧️", type: "warning", title: "Heavy Rain — Suspend Irrigation",
      text: `${precipitation.toFixed(1)} mm precipitation in the last hour. Suspend irrigation, clear field drainage channels, and delay fertilizer application to prevent nutrient wash-off.`,
    });
  } else if (humidity > 80 && temperature > 25) {
    tips.push({
      icon: "⚠️", type: "warning", title: "High Disease Risk",
      text: `High humidity (${humidity}%) combined with warm temperature (${temperature}°C) creates conditions favourable for fungal diseases. Inspect crops closely and ensure good canopy ventilation.`,
    });
  } else if (precipitation === 0 && humidity < 40) {
    tips.push({
      icon: "💧", type: "info", title: "Good Day to Irrigate",
      text: "Low humidity and no active precipitation. Schedule irrigation in early morning or late evening to minimise evaporation losses.",
    });
  }

  // Temperature advice
  if (temperature > 38) {
    tips.push({
      icon: "🔥", type: "danger", title: "Heat Stress Alert",
      text: `Temperature at ${temperature}°C. Irrigate in the early morning or after sunset. Apply mulching around root zones to retain soil moisture and reduce temperature.`,
    });
  } else if (temperature < 8) {
    tips.push({
      icon: "❄️", type: "info", title: "Cold Stress Risk",
      text: `Temperature at ${temperature}°C. Cover seedlings and nursery beds overnight. Light irrigation before frost onset protects crop roots from cold damage.`,
    });
  } else if (temperature >= 20 && temperature <= 30) {
    tips.push({
      icon: "✅", type: "success", title: "Optimal Growing Conditions",
      text: `Temperature at ${temperature}°C is ideal for most crops. Excellent conditions for transplanting, sowing, fertiliser application, and field inspection.`,
    });
  }

  // Wind advice
  if (windSpeed > 40) {
    tips.push({
      icon: "💨", type: "warning", title: "High Wind Warning",
      text: `Wind at ${windSpeed} km/h. Avoid pesticide and foliar spraying — chemical drift risk is high. Stake tall crops like maize, sugarcane, and sunflower.`,
    });
  }

  // UV advice
  if (uvIndex >= 8) {
    tips.push({
      icon: "☀️", type: "info", title: "High UV Index",
      text: `UV Index ${uvIndex} (Very High). Field work is recommended before 11 AM or after 4 PM. Wear protective clothing and stay well-hydrated.`,
    });
  }

  if (tips.length === 0) {
    tips.push({
      icon: "🌾", type: "success", title: "Good Day for Farm Work",
      text: "Weather conditions look favourable. Suitable for general field activities including weeding, earthing-up, fertiliser application, and crop monitoring.",
    });
  }

  return tips;
}

// ─────────────────────────────────────────────────────────────────────────────
//  GET /api/weather
//  Query options:
//    ?location=CityName            — city name search (geocoded via Open-Meteo)
//    ?lat=16.85&lon=74.56&name=Sangli  — GPS coordinates (My Location path)
// ─────────────────────────────────────────────────────────────────────────────
router.get("/", protect, async (req, res) => {
  try {
    const { location, lat: qLat, lon: qLon, name: qName } = req.query;

    let lat, lon, displayName;

    // ── Path 1: GPS coordinates (My Location button / Live Geolocation) ───────
    if (qLat && qLon) {
      lat = parseFloat(qLat);
      lon = parseFloat(qLon);
      if (qName && qName.trim() && qName.trim() !== "My Location" && !qName.includes("°")) {
        displayName = qName.trim();
      } else {
        displayName = await reverseGeocode(lat, lon);
      }
      console.log(`[Weather] GPS path — lat:${lat}, lon:${lon}, display:"${displayName}"`);
    }
    // ── Path 2: City name search ───────────────────────────────────────────────
    else if (location?.trim()) {
      const geo = await geocodeCity(location.trim());
      if (!geo) {
        return res.status(404).json({
          error: `City not found: "${location}". Try a different spelling or nearby city name.`,
        });
      }
      lat = geo.lat;
      lon = geo.lon;
      displayName = geo.displayName;
      console.log(`[Weather] City path — "${location}" → ${displayName} (${lat}, ${lon})`);
    }
    // ── No valid input ─────────────────────────────────────────────────────────
    else {
      return res.status(400).json({
        error: "Provide either ?location=CityName or ?lat=...&lon=...",
      });
    }

    // ── Fetch live data from Open-Meteo ───────────────────────────────────────
    const wx = await fetchOpenMeteo(lat, lon);
    console.log(
      `[Weather] Open-Meteo response — ` +
      `temp:${wx.current.temperature_2m}°C, ` +
      `humidity:${wx.current.relative_humidity_2m}%, ` +
      `wind:${wx.current.wind_speed_10m} km/h, ` +
      `code:${wx.current.weather_code}`
    );

    // ── Locate current hour index in the hourly arrays ────────────────────────
    //    wx.current.time is the truncated-to-hour timestamp, e.g. "2026-08-14T10:00"
    //    wx.hourly.time is the same format for every slot.
    const currentTimeStr = wx.current.time;
    const hourlyTimes = wx.hourly.time;
    let curIdx = hourlyTimes.findIndex((t) => t === currentTimeStr);
    if (curIdx === -1) curIdx = 0;

    const currentUV = wx.hourly.uv_index?.[curIdx] ?? 0;

    // ── Current conditions ─────────────────────────────────────────────────────
    const currCond = wmo(wx.current.weather_code);
    const current = {
      temperature:  Math.round(wx.current.temperature_2m),
      feelsLike:    Math.round(wx.current.apparent_temperature),
      humidity:     wx.current.relative_humidity_2m,
      condition:    currCond.label,
      icon:         currCond.icon,
      windSpeed:    Math.round(wx.current.wind_speed_10m),
      windDirection: Math.round(wx.current.wind_direction_10m),
      pressure:     Math.round(wx.current.pressure_msl),
      uvIndex:      Math.round(currentUV),
      precipitation: wx.current.precipitation,
      isDay:        wx.current.is_day === 1,
    };

    // ── 7-day daily forecast ───────────────────────────────────────────────────
    const forecast = wx.daily.time.map((dateStr, i) => {
      const d = new Date(dateStr);
      const dayCond = wmo(wx.daily.weather_code[i]);
      const dayName =
        i === 0 ? "Today"
        : i === 1 ? "Tomorrow"
        : d.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });
      return {
        date:       dateStr,
        dayName,
        icon:       dayCond.icon,
        condition:  dayCond.label,
        maxTemp:    Math.round(wx.daily.temperature_2m_max[i]),
        minTemp:    Math.round(wx.daily.temperature_2m_min[i]),
        rainChance: wx.daily.precipitation_probability_max?.[i] ?? 0,
        rainfall:   (wx.daily.precipitation_sum?.[i] ?? 0).toFixed(1),
        maxWind:    Math.round(wx.daily.wind_speed_10m_max?.[i] ?? 0),
        uvIndex:    Math.round(wx.daily.uv_index_max?.[i] ?? 0),
        sunrise:    fmtTime(wx.daily.sunrise?.[i]),
        sunset:     fmtTime(wx.daily.sunset?.[i]),
      };
    });

    // ── Hourly forecast — 8 slots at 3-hour intervals from the current hour ────
    const hourly = [];
    for (let i = 0; i < 8; i++) {
      const idx = curIdx + i * 3;
      if (idx >= hourlyTimes.length) break;
      const hCond = wmo(wx.hourly.weather_code?.[idx] ?? 0);
      hourly.push({
        time:       fmtTime(hourlyTimes[idx]),
        temp:       Math.round(wx.hourly.temperature_2m?.[idx] ?? 0),
        rainChance: wx.hourly.precipitation_probability?.[idx] ?? 0,
        icon:       hCond.icon,
      });
    }

    // ── Farming advice generated from real current conditions ──────────────────
    const farmingAdvice = generateFarmingAdvice({
      temperature:  current.temperature,
      humidity:     current.humidity,
      precipitation: current.precipitation,
      windSpeed:    current.windSpeed,
      uvIndex:      current.uvIndex,
    });

    return res.json({
      location: displayName,
      lat,
      lon,
      current,
      forecast,
      hourly,
      farmingAdvice,
      lastUpdated: new Date().toISOString(),
      source: "open-meteo",   // confirms live data, not cached/static
    });

  } catch (err) {
    console.error("[Weather] Route error:", err.message);
    return res.status(503).json({
      error:
        "Weather service temporarily unavailable. " +
        "Could not reach Open-Meteo API. Please try again in a moment.",
    });
  }
});

export default router;
