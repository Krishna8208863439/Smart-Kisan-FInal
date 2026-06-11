import { useState, useEffect, useCallback } from "react";
import api from "../api";

// Wind direction helper
const windDirLabel = (deg) => {
  const dirs = ["N","NNE","NE","ENE","E","ESE","SE","SSE","S","SSW","SW","WSW","W","WNW","NW","NNW"];
  return dirs[Math.round(deg / 22.5) % 16];
};

// UV index label
const uvLabel = (uv) => {
  if (uv <= 2) return { label: "Low", color: "#22c55e" };
  if (uv <= 5) return { label: "Moderate", color: "#eab308" };
  if (uv <= 7) return { label: "High", color: "#f97316" };
  if (uv <= 10) return { label: "Very High", color: "#ef4444" };
  return { label: "Extreme", color: "#7c3aed" };
};

const POPULAR_CITIES = [
  "New Delhi", "Mumbai", "Bengaluru", "Hyderabad", "Chennai",
  "Kolkata", "Pune", "Ahmedabad", "Jaipur", "Lucknow",
  "Bhopal", "Patna", "Chandigarh", "Nagpur", "Indore"
];

const Weather = () => {
  const [location, setLocation] = useState("");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [locating, setLocating] = useState(false);
  const [activeDay, setActiveDay] = useState(0);
  const [lastCity, setLastCity] = useState(() => localStorage.getItem("sk_last_city") || "");

  // Auto-load last city on mount
  useEffect(() => {
    if (lastCity) {
      setLocation(lastCity);
      fetchWeather(null, lastCity);
    }
  }, []);

  const fetchWeather = useCallback(async (e, cityOverride = null) => {
    if (e) e.preventDefault();
    const query = cityOverride || location.trim();
    if (!query) return;
    setLoading(true);
    setError("");
    try {
      const res = await api.get("/weather", { params: { location: query } });
      setData(res.data);
      setActiveDay(0);
      localStorage.setItem("sk_last_city", query);
      setLastCity(query);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to fetch weather. Please check the city name.");
    } finally {
      setLoading(false);
    }
  }, [location]);

  // Geolocation auto-detect
  const handleGeolocate = () => {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser.");
      return;
    }
    setLocating(true);
    setError("");
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        setLoading(true);
        try {
          // Reverse geocode using Open-Meteo
          const geoRes = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`
          );
          const geoData = await geoRes.json();
          const cityName = geoData.address?.city || geoData.address?.town || geoData.address?.village || geoData.address?.county || "My Location";
          setLocation(cityName);
          const res = await api.get("/weather", {
            params: { lat: latitude, lon: longitude, name: cityName }
          });
          setData(res.data);
          setActiveDay(0);
          localStorage.setItem("sk_last_city", cityName);
          setLastCity(cityName);
        } catch (err) {
          setError("Could not detect your location's weather. Try typing your city.");
        } finally {
          setLoading(false);
          setLocating(false);
        }
      },
      () => {
        setError("Location permission denied. Please type your city manually.");
        setLocating(false);
      }
    );
  };

  const curr = data?.current;
  const forecast = data?.forecast || [];
  const hourly = data?.hourly || [];
  const farmingAdvice = data?.farmingAdvice || [];
  const selectedDay = forecast[activeDay];

  return (
    <div className="app-container">
      {/* Header */}
      <div className="weather-header-card">
        <div className="weather-header-text">
          <h1 style={{ fontSize: 28, fontWeight: 900, marginBottom: 4 }}>🌤️ Live Weather</h1>
          <p style={{ opacity: 0.88, fontSize: 14 }}>
            Real-time weather data + 7-day forecast for smart farming decisions
          </p>
        </div>
        {data && (
          <div className="weather-last-updated">
            🔄 Updated: {new Date(data.lastUpdated).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
          </div>
        )}
      </div>

      {/* Search Bar */}
      <div className="weather-search-card card">
        <form onSubmit={fetchWeather} className="weather-search-form">
          <div className="weather-search-input-wrap">
            <span className="weather-search-icon">🔍</span>
            <input
              className="weather-search-input"
              placeholder="Search city, district or village..."
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              list="city-suggestions"
            />
            <datalist id="city-suggestions">
              {POPULAR_CITIES.map(c => <option key={c} value={c} />)}
            </datalist>
          </div>
          <button
            type="submit"
            className="button weather-search-btn"
            disabled={loading || !location.trim()}
          >
            {loading ? "⏳ Loading..." : "Get Weather"}
          </button>
          <button
            type="button"
            className="button weather-geo-btn"
            onClick={handleGeolocate}
            disabled={locating || loading}
            title="Use my current location"
          >
            {locating ? "📡 Detecting..." : "📍 My Location"}
          </button>
        </form>

        {/* Popular Cities Quick Select */}
        <div className="weather-quick-cities">
          {POPULAR_CITIES.slice(0, 8).map(city => (
            <button
              key={city}
              className={`weather-city-chip ${location === city ? "weather-city-chip-active" : ""}`}
              onClick={() => { setLocation(city); fetchWeather(null, city); }}
            >
              {city}
            </button>
          ))}
        </div>

        {error && (
          <div className="weather-error">
            ⚠️ {error}
          </div>
        )}
      </div>

      {/* Loading Skeleton */}
      {loading && (
        <div className="weather-loading-wrap">
          <div className="weather-spinner" />
          <p style={{ marginTop: 16, color: "var(--text-muted)", fontWeight: 600 }}>
            Fetching live weather data...
          </p>
        </div>
      )}

      {/* Main Weather Dashboard */}
      {data && !loading && (
        <>
          {/* Current Conditions — Hero Card */}
          <div className="weather-current-card">
            <div className="weather-current-left">
              <div className="weather-location-name">
                📍 {data.location}
              </div>
              <div className="weather-temp-row">
                <span className="weather-big-icon">{curr.icon}</span>
                <div>
                  <div className="weather-temp-main">{curr.temperature}°C</div>
                  <div className="weather-feels-like">Feels like {curr.feelsLike}°C</div>
                </div>
              </div>
              <div className="weather-condition-label">{curr.condition}</div>
            </div>

            {/* Stats Grid */}
            <div className="weather-stats-grid">
              {[
                { icon: "💧", label: "Humidity", value: `${curr.humidity}%` },
                { icon: "💨", label: "Wind", value: `${curr.windSpeed} km/h ${windDirLabel(curr.windDirection)}` },
                { icon: "🌡️", label: "Pressure", value: `${curr.pressure} hPa` },
                { icon: "☀️", label: "UV Index", value: `${curr.uvIndex} (${uvLabel(curr.uvIndex).label})`, valueColor: uvLabel(curr.uvIndex).color },
                { icon: "🌧️", label: "Precipitation", value: `${curr.precipitation} mm` },
                { icon: curr.isDay ? "🌞" : "🌙", label: "Day/Night", value: curr.isDay ? "Daytime" : "Nighttime" },
              ].map((stat, i) => (
                <div key={i} className="weather-stat-box">
                  <span className="weather-stat-icon">{stat.icon}</span>
                  <div className="weather-stat-label">{stat.label}</div>
                  <div className="weather-stat-value" style={{ color: stat.valueColor || "var(--text-dark)" }}>
                    {stat.value}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Hourly Forecast Scroll */}
          {hourly.length > 0 && (
            <div className="card" style={{ marginBottom: 24 }}>
              <h3 style={{ marginBottom: 16, fontWeight: 800 }}>⏱️ Hourly Forecast (Next 24h)</h3>
              <div className="weather-hourly-scroll">
                {hourly.map((h, i) => (
                  <div key={i} className="weather-hourly-item">
                    <div className="weather-hourly-time">{h.time}</div>
                    <div className="weather-hourly-icon">{h.icon}</div>
                    <div className="weather-hourly-temp">{h.temp}°</div>
                    <div className="weather-hourly-rain">💧{h.rainChance}%</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 7-Day Forecast */}
          <div className="card" style={{ marginBottom: 24 }}>
            <h3 style={{ marginBottom: 16, fontWeight: 800 }}>📅 7-Day Forecast</h3>
            <div className="weather-7day-grid">
              {forecast.map((day, i) => (
                <div
                  key={i}
                  className={`weather-day-card ${activeDay === i ? "weather-day-card-active" : ""}`}
                  onClick={() => setActiveDay(i)}
                >
                  <div className="weather-day-name">{day.dayName}</div>
                  <div className="weather-day-icon">{day.icon}</div>
                  <div className="weather-day-condition">{day.condition}</div>
                  <div className="weather-day-temps">
                    <span className="weather-day-max">{day.maxTemp}°</span>
                    <span className="weather-day-min">{day.minTemp}°</span>
                  </div>
                  <div className="weather-day-rain">💧 {day.rainChance}%</div>
                </div>
              ))}
            </div>

            {/* Selected Day Details */}
            {selectedDay && (
              <div className="weather-day-detail">
                <h4 style={{ marginBottom: 16, fontWeight: 800, fontSize: 16 }}>
                  {selectedDay.icon} {selectedDay.dayName} — Detailed Outlook
                </h4>
                <div className="weather-day-detail-grid">
                  <div className="weather-detail-item">
                    <span>🌡️ Max Temp</span><strong>{selectedDay.maxTemp}°C</strong>
                  </div>
                  <div className="weather-detail-item">
                    <span>🌡️ Min Temp</span><strong>{selectedDay.minTemp}°C</strong>
                  </div>
                  <div className="weather-detail-item">
                    <span>💧 Rain Chance</span><strong>{selectedDay.rainChance}%</strong>
                  </div>
                  <div className="weather-detail-item">
                    <span>🌧️ Rainfall</span><strong>{selectedDay.rainfall} mm</strong>
                  </div>
                  <div className="weather-detail-item">
                    <span>💨 Max Wind</span><strong>{selectedDay.maxWind} km/h</strong>
                  </div>
                  <div className="weather-detail-item">
                    <span>☀️ UV Index</span>
                    <strong style={{ color: uvLabel(selectedDay.uvIndex).color }}>
                      {selectedDay.uvIndex} ({uvLabel(selectedDay.uvIndex).label})
                    </strong>
                  </div>
                  <div className="weather-detail-item">
                    <span>🌅 Sunrise</span><strong>{selectedDay.sunrise}</strong>
                  </div>
                  <div className="weather-detail-item">
                    <span>🌇 Sunset</span><strong>{selectedDay.sunset}</strong>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Farming Advisory Section */}
          {farmingAdvice.length > 0 && (
            <div className="card" style={{ marginBottom: 24 }}>
              <h3 style={{ marginBottom: 16, fontWeight: 800 }}>🌾 Farming Advisory</h3>
              <p style={{ color: "var(--text-muted)", fontSize: 13, marginBottom: 20 }}>
                AI-generated crop management tips based on current weather conditions.
              </p>
              <div className="weather-advice-grid">
                {farmingAdvice.map((tip, i) => (
                  <div key={i} className={`weather-advice-card weather-advice-${tip.type}`}>
                    <div className="weather-advice-icon">{tip.icon}</div>
                    <div>
                      <div className="weather-advice-title">{tip.title}</div>
                      <div className="weather-advice-text">{tip.text}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Sunrise/Sunset for Today */}
          {forecast[0] && (
            <div className="weather-sun-card card">
              <div className="weather-sun-item">
                <div style={{ fontSize: 36 }}>🌅</div>
                <div className="weather-sun-label">Sunrise</div>
                <div className="weather-sun-time">{forecast[0].sunrise}</div>
              </div>
              <div className="weather-sun-divider" />
              <div className="weather-sun-item">
                <div style={{ fontSize: 36 }}>🌇</div>
                <div className="weather-sun-label">Sunset</div>
                <div className="weather-sun-time">{forecast[0].sunset}</div>
              </div>
              <div className="weather-sun-divider" />
              <div className="weather-sun-item">
                <div style={{ fontSize: 36 }}>🌧️</div>
                <div className="weather-sun-label">Today's Rainfall</div>
                <div className="weather-sun-time">{forecast[0].rainfall} mm</div>
              </div>
              <div className="weather-sun-divider" />
              <div className="weather-sun-item">
                <div style={{ fontSize: 36 }}>☀️</div>
                <div className="weather-sun-label">UV Index</div>
                <div className="weather-sun-time" style={{ color: uvLabel(forecast[0].uvIndex).color }}>
                  {forecast[0].uvIndex} · {uvLabel(forecast[0].uvIndex).label}
                </div>
              </div>
            </div>
          )}

          {/* Data Source Notice */}
          <div style={{ textAlign: "center", color: "var(--text-muted)", fontSize: 12, marginTop: 8, marginBottom: 16 }}>
            📡 Live data from <strong>Open-Meteo</strong> · Updated every 15 minutes · Free & open weather API
          </div>
        </>
      )}

      {/* Empty State */}
      {!data && !loading && (
        <div className="weather-empty-state card">
          <div style={{ fontSize: 64 }}>🌦️</div>
          <h3 style={{ marginTop: 16, marginBottom: 8 }}>Search for Live Weather</h3>
          <p style={{ color: "var(--text-muted)", fontSize: 14, maxWidth: 360, textAlign: "center" }}>
            Type your city name or tap "My Location" to get real-time weather data and farming advice.
          </p>
        </div>
      )}
    </div>
  );
};

export default Weather;
