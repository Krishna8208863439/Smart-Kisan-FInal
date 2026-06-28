import { useState, useEffect } from "react";
import api from "../api";
import { useLanguage } from "../context/LanguageContext";

const POPULAR_AGRICULTURAL_REGIONS = [
  { name: "Pune, Maharashtra", lat: 18.5204, lon: 73.8567 },
  { name: "Nashik, Maharashtra", lat: 19.9975, lon: 73.7898 },
  { name: "Nagpur, Maharashtra", lat: 21.1458, lon: 79.0882 },
  { name: "Amravati, Maharashtra", lat: 20.9374, lon: 77.7796 },
  { name: "Kolhapur, Maharashtra", lat: 16.7050, lon: 74.2433 },
  { name: "Ludhiana, Punjab", lat: 30.9010, lon: 75.8573 },
  { name: "Bathinda, Punjab", lat: 30.2076, lon: 74.9455 },
  { name: "Karnal, Haryana", lat: 29.6857, lon: 76.9905 },
  { name: "Indore, Madhya Pradesh", lat: 22.7196, lon: 75.8577 },
  { name: "Vijayawada, Andhra Pradesh", lat: 16.5062, lon: 80.6480 },
  { name: "Coimbatore, Tamil Nadu", lat: 11.0168, lon: 76.9558 },
  { name: "Anand, Gujarat", lat: 22.5645, lon: 72.9289 },
  { name: "Kota, Rajasthan", lat: 25.2138, lon: 75.8648 },
  { name: "Meerut, Uttar Pradesh", lat: 28.9845, lon: 77.7064 },
  { name: "Aligarh, Uttar Pradesh", lat: 27.8974, lon: 78.0880 },
  { name: "Patna, Bihar", lat: 25.5941, lon: 85.1376 },
];

const Recommendations = () => {
  const { t, language } = useLanguage();
  const [form, setForm] = useState({
    soilType: "loamy",
    region: "",
    season: "kharif",
    irrigationAvailable: true,
    pH: 6.5,
    n: 50,
    p: 50,
    k: 50,
    lat: "",
    lon: ""
  });
  const [loading, setLoading] = useState(false);
  const [locating, setLocating] = useState(false);
  const [result, setResult] = useState(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [activeCrop, setActiveCrop] = useState(null);
  const [error, setError] = useState(null);

  // Get custom gemini key from local storage (if user configured it in chat)
  const getCustomKey = () => localStorage.getItem("sk_gemini_key") || "";

  // Auto-detect geolocation
  const detectLocation = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser.");
      return;
    }
    setLocating(true);
    setError(null);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setForm((prev) => ({
          ...prev,
          lat: position.coords.latitude,
          lon: position.coords.longitude,
          region: "Detected GPS Location"
        }));
        setLocating(false);
      },
      (err) => {
        console.warn("Geolocation access denied or failed:", err);
        setError("Could not access your location. Please enter your region name manually.");
        setLocating(false);
      },
      { timeout: 8000 }
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const headers = { "x-language": language };
      const key = getCustomKey();
      if (key) {
        headers["x-gemini-key"] = key;
      }

      const res = await api.post("/recommendations/crop", form, { headers });
      setResult(res.data);
      if (res.data?.recommendations?.length > 0) {
        setActiveCrop(res.data.recommendations[0].crop);
      }
    } catch (err) {
      console.error(err);
      setError("Failed to fetch recommendations. Please verify network connection.");
    } finally {
      setLoading(false);
    }
  };

  // Helper icons for crops
  const getCropIcon = (cropName) => {
    const icons = {
      "Wheat": "🌾",
      "Paddy (Rice)": "🌾",
      "Tomato": "🍅",
      "Groundnut": "🥜",
      "Cotton": "🌿",
      "Mustard": "🟡",
      "Maize": "🌽",
      "Potato": "🥔"
    };
    return icons[cropName] || "🌱";
  };

  return (
    <div className="app-container">
      <div style={{ marginBottom: 24, textAlign: "center" }}>
        <h1 style={{ fontSize: 32, fontWeight: 800, color: "var(--primary)" }}>{t("recommendationTitle")}</h1>
        <p style={{ color: "var(--text-muted)", marginTop: 6 }}>
          {t("recommendationSubtitle")}
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: result ? "1fr 1.5fr" : "1fr", gap: 24, alignItems: "start" }}>
        
        {/* Form Column */}
        <div className="card" style={{ position: "sticky", top: 88 }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
            <span>🧪</span> {t("soilLocationDetails")}
          </h2>
          
          <form onSubmit={handleSubmit}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, display: "block", marginBottom: 4 }}>{t("soilType")}</label>
                <select
                  className="input"
                  style={{ width: "100%", height: 42 }}
                  value={form.soilType}
                  onChange={(e) => setForm({ ...form, soilType: e.target.value })}
                >
                  <option value="loamy">{t("soilLoamy")}</option>
                  <option value="sandy">{t("soilSandy")}</option>
                  <option value="clay">{t("soilClay")}</option>
                  <option value="black">{t("soilBlack")}</option>
                  <option value="red">{t("soilRed")}</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: 13, fontWeight: 600, display: "block", marginBottom: 4 }}>{t("season")}</label>
                <select
                  className="input"
                  style={{ width: "100%", height: 42 }}
                  value={form.season}
                  onChange={(e) => setForm({ ...form, season: e.target.value })}
                >
                  <option value="kharif">{t("seasonKharif")}</option>
                  <option value="rabi">{t("seasonRabi")}</option>
                  <option value="zaid">{t("seasonZaid")}</option>
                </select>
              </div>
            </div>

            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 13, fontWeight: 600, display: "block", marginBottom: 4 }}>
                {language === 'mr' ? 'शहर / जिल्हा निवडा' : 'Select City / Agricultural District'}
              </label>
              <select
                className="input"
                style={{ width: "100%", height: 42, marginBottom: 8 }}
                value={form.region}
                onChange={(e) => {
                  const val = e.target.value;
                  const match = POPULAR_AGRICULTURAL_REGIONS.find(r => r.name === val);
                  if (match) {
                    setForm({
                      ...form,
                      region: match.name,
                      lat: match.lat,
                      lon: match.lon
                    });
                  } else {
                    setForm({
                      ...form,
                      region: val,
                      lat: "",
                      lon: ""
                    });
                  }
                }}
              >
                <option value="">{language === 'mr' ? '-- निवडा किंवा खाली टाईप करा --' : '-- Select Region or Type Custom Below --'}</option>
                {POPULAR_AGRICULTURAL_REGIONS.map((r) => (
                  <option key={r.name} value={r.name}>{r.name}</option>
                ))}
                <option value="custom">{language === 'mr' ? 'इतर शहर / जिल्हा प्रविष्ट करा' : 'Other (Type below)'}</option>
              </select>

              <label style={{ fontSize: 13, fontWeight: 600, display: "block", marginBottom: 4 }}>
                {language === 'mr' ? 'सानुकूल शहर / राज्य' : 'Custom City / State / Region'}
              </label>
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  className="input"
                  style={{ flex: 1 }}
                  placeholder="e.g. Maharashtra, Punjab"
                  value={form.region}
                  onChange={(e) => setForm({ ...form, region: e.target.value, lat: "", lon: "" })}
                />
                <button
                  type="button"
                  className="button button-secondary"
                  style={{ padding: "0 14px", height: 42, whiteSpace: "nowrap", flexShrink: 0 }}
                  onClick={detectLocation}
                  disabled={locating}
                >
                  {locating ? "📍..." : t("gpsDetectBtn")}
                </button>
              </div>
              {form.lat && (
                <span style={{ fontSize: 11, color: "var(--primary)", marginTop: 4, display: "block" }}>
                  Coordinates loaded: {parseFloat(form.lat).toFixed(4)}, {parseFloat(form.lon).toFixed(4)}
                </span>
              )}
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 14 }}>
                <input
                  type="checkbox"
                  checked={form.irrigationAvailable}
                  onChange={(e) => setForm({ ...form, irrigationAvailable: e.target.checked })}
                />
                <strong>{t("irrigationLabel")}</strong>
              </label>
            </div>

            {/* Toggle Advanced Sliders */}
            <div style={{ marginBottom: 16 }}>
              <button
                type="button"
                className="button button-secondary"
                style={{ width: "100%", padding: "8px 12px", fontSize: 13, display: "flex", justifyContent: "space-between", alignItems: "center" }}
                onClick={() => setShowAdvanced(!showAdvanced)}
              >
                <span>{t("soilChemistry")}</span>
                <span>{showAdvanced ? "▲" : "▼"}</span>
              </button>
            </div>

            {showAdvanced && (
              <div className="card" style={{ background: "rgba(0,0,0,0.02)", border: "1px dashed var(--border-color)", padding: 16, marginBottom: 16 }}>
                
                {/* pH Slider */}
                <div style={{ marginBottom: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, fontWeight: 600 }}>
                    <span>{t("soilPH")}</span>
                    <span style={{ color: "var(--primary)", fontWeight: 700 }}>{form.pH}</span>
                  </div>
                  <input
                    type="range"
                    min="4.0"
                    max="9.0"
                    step="0.1"
                    style={{ width: "100%" }}
                    value={form.pH}
                    onChange={(e) => setForm({ ...form, pH: parseFloat(e.target.value) })}
                  />
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "var(--text-muted)" }}>
                    <span>{t("acidic")}</span>
                    <span>{t("neutral")}</span>
                    <span>{t("alkaline")}</span>
                  </div>
                </div>

                {/* Nitrogen (N) Slider */}
                <div style={{ marginBottom: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, fontWeight: 600 }}>
                    <span>{t("nitrogen")}</span>
                    <span style={{ color: "#2563eb", fontWeight: 700 }}>{form.n} kg/ha</span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="150"
                    style={{ width: "100%" }}
                    value={form.n}
                    onChange={(e) => setForm({ ...form, n: parseInt(e.target.value) })}
                  />
                </div>

                {/* Phosphorus (P) Slider */}
                <div style={{ marginBottom: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, fontWeight: 600 }}>
                    <span>{t("phosphorus")}</span>
                    <span style={{ color: "#d97706", fontWeight: 700 }}>{form.p} kg/ha</span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="100"
                    style={{ width: "100%" }}
                    value={form.p}
                    onChange={(e) => setForm({ ...form, p: parseInt(e.target.value) })}
                  />
                </div>

                {/* Potassium (K) Slider */}
                <div style={{ marginBottom: 4 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, fontWeight: 600 }}>
                    <span>{t("potassium")}</span>
                    <span style={{ color: "#dc2626", fontWeight: 700 }}>{form.k} kg/ha</span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="120"
                    style={{ width: "100%" }}
                    value={form.k}
                    onChange={(e) => setForm({ ...form, k: parseInt(e.target.value) })}
                  />
                </div>

              </div>
            )}

            {error && (
              <div style={{ background: "rgba(239, 68, 68, 0.1)", border: "1px solid var(--danger)", color: "var(--danger)", padding: 10, borderRadius: 8, fontSize: 13, marginBottom: 12 }}>
                ⚠️ {error}
              </div>
            )}

            <button
              type="submit"
              className="button"
              style={{ width: "100%", height: 46, fontSize: 15, fontWeight: 700 }}
              disabled={loading}
            >
              {loading ? (language === 'mr' ? 'पर्यावरण घटकांचे विश्लेषण सुरू आहे...' : "Analyzing Environmental Parameters...") : t("generateRecommendations")}
            </button>
          </form>
        </div>

        {/* Results Column */}
        {result && (
          <div>
            
            {/* Live Weather Widget */}
            <div className="card" style={{ background: "linear-gradient(135deg, #0d9488 0%, #15803d 100%)", color: "white", padding: 20, marginBottom: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <span style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: 0.5, opacity: 0.9 }}>
                    {t("detectedWeather")}
                  </span>
                  <h3 style={{ fontSize: 20, fontWeight: 800, margin: "2px 0 6px 0" }}>{result.location}</h3>
                  <p style={{ fontSize: 13, opacity: 0.9 }}>
                    {result.weather?.forecast}
                  </p>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 32, fontWeight: 900 }}>
                    {result.weather?.temp}°C
                  </div>
                  <div style={{ fontSize: 12, opacity: 0.9 }}>
                    💧 {language === 'mr' ? 'आद्रता' : 'Humidity'}: {result.weather?.humidity}%
                  </div>
                </div>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 12, paddingTop: 12, borderTop: "1px solid rgba(255, 255, 255, 0.15)", fontSize: 11 }}>
                <span>🎯 {language === 'mr' ? 'इंजिन' : 'Engine'}: {result.source === "gemini" ? "Google Gemini 1.5 Flash" : (language === 'mr' ? 'स्थानिक वर्गीकरणकर्ता' : "Local Agronomy Classifier")}</span>
                <span>⚡ {language === 'mr' ? 'थेट समक्रमण' : 'Real-Time Sync'}</span>
              </div>
            </div>

            {/* Recommended Crop Cards */}
            <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
              <span>🌾</span> {language === 'mr' ? 'शीर्ष एआय पीक शिफारसी' : 'Top AI Crop Recommendations'}
            </h3>

            <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 16, marginBottom: 24 }}>
              {result.recommendations.map((r, idx) => {
                const isSelected = activeCrop === r.crop;
                return (
                  <div
                    key={idx}
                    className="card"
                    style={{
                      margin: 0,
                      cursor: "pointer",
                      border: isSelected ? "2px solid var(--primary)" : "1.5px solid var(--border-color)",
                      boxShadow: isSelected ? "var(--shadow-lg)" : "var(--shadow-sm)",
                      background: isSelected ? "var(--bg-card-hover)" : "var(--bg-card)"
                    }}
                    onClick={() => setActiveCrop(r.crop)}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 10 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <span style={{ fontSize: 32 }}>{getCropIcon(r.crop)}</span>
                        <div>
                          <h4 style={{ fontSize: 18, fontWeight: 800 }}>{r.crop}</h4>
                          <span style={{ fontSize: 11, background: "var(--primary-light)", color: "var(--primary)", padding: "2px 8px", borderRadius: 12, fontWeight: 700 }}>
                            {r.suitabilityScore || 90}% {t("matchPercentage")}
                          </span>
                        </div>
                      </div>

                      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        <div style={{ textAlign: "right" }}>
                          <span style={{ fontSize: 10, display: "block", color: "var(--text-muted)", fontWeight: 600 }}>{t("estProfitLabel")}</span>
                          <strong style={{ color: "var(--primary)", fontSize: 15 }}>{r.estimatedProfit}</strong>
                        </div>
                      </div>
                    </div>

                    <p style={{ fontSize: 13, color: "var(--text-dark)", marginBottom: 12 }}>
                      {r.reason}
                    </p>

                    <div style={{ display: "flex", flexWrap: "wrap", gap: 10, borderTop: "1px solid var(--border-color)", paddingTop: 10, fontSize: 12 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                        <span style={{ opacity: 0.7 }}>📈 {t("yieldLabel")}</span>
                        <strong>{r.predictedYield}</strong>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                        <span style={{ opacity: 0.7 }}>💧 {t("waterLabel")}</span>
                        <span style={{
                          fontWeight: 700,
                          color: r.waterRequirement === "High" || r.waterRequirement === "जास्त" ? "var(--danger)" : r.waterRequirement === "Moderate" || r.waterRequirement === "मध्यम" ? "var(--accent)" : "var(--primary)"
                        }}>
                          {r.waterRequirement}
                        </span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                        <span style={{ opacity: 0.7 }}>📦 {t("demandLabel")}</span>
                        <strong>{r.marketDemand}</strong>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Dynamic Fertilizer Timeline for Best / Selected Crop */}
            {activeCrop && (
              <div className="card">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                  <h3 style={{ fontSize: 18, fontWeight: 800 }}>
                    🛠️ {t("fertilizerActionPlan")} <span style={{ color: "var(--primary)" }}>{activeCrop}</span>
                  </h3>
                  <span style={{ fontSize: 12, background: "var(--primary-light)", color: "var(--primary)", padding: "4px 10px", borderRadius: 4, fontWeight: 700 }}>
                    {t("stepCalendar")}
                  </span>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 16, position: "relative" }}>
                  {/* Decorative Timeline Line */}
                  <div style={{
                    position: "absolute",
                    left: 17,
                    top: 10,
                    bottom: 10,
                    width: 2,
                    background: "var(--border-color)",
                    zIndex: 0
                  }} />

                  {result.fertilizerPlan.map((step, idx) => (
                    <div key={idx} style={{ display: "flex", gap: 16, position: "relative", zIndex: 1 }}>
                      <div style={{
                        width: 36,
                        height: 36,
                        borderRadius: "50%",
                        background: idx === 0 ? "var(--primary)" : idx === 1 ? "var(--accent)" : "var(--secondary)",
                        color: "white",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontWeight: 700,
                        fontSize: 14,
                        boxShadow: "var(--shadow-sm)",
                        flexShrink: 0
                      }}>
                        {idx + 1}
                      </div>

                      <div style={{ flex: 1, background: "rgba(0, 0, 0, 0.01)", border: "1px solid var(--border-color)", borderRadius: 8, padding: 12 }}>
                        <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.3 }}>
                          {step.stage}
                        </h4>
                        <p style={{ fontSize: 12.5, color: "var(--text-dark)", lineHeight: 1.5 }}>
                          {step.recommendation}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>
        )}

      </div>
    </div>
  );
};

export default Recommendations;

