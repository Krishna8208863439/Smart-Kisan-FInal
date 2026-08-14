import React, { useState, useEffect } from "react";
import api from "../api";
import { useLanguage } from "../context/LanguageContext";
import { useHistory } from "../context/HistoryContext";

const POPULAR_REGIONS = [
  { name: "Pune, Maharashtra", lat: 18.5204, lon: 73.8567 },
  { name: "Nashik, Maharashtra", lat: 19.9975, lon: 73.7898 },
  { name: "Nagpur, Maharashtra", lat: 21.1458, lon: 79.0882 },
  { name: "Amravati, Maharashtra", lat: 20.9374, lon: 77.7796 },
  { name: "Kolhapur, Maharashtra", lat: 16.7050, lon: 74.2433 },
  { name: "Ludhiana, Punjab", lat: 30.9010, lon: 75.8573 },
  { name: "Karnal, Haryana", lat: 29.6857, lon: 76.9905 },
  { name: "Indore, Madhya Pradesh", lat: 22.7196, lon: 75.8577 },
  { name: "Anand, Gujarat", lat: 22.5645, lon: 72.9289 }
];

const CROPS = [
  { id: "Tomato", nameEn: "Tomato", nameMr: "टोमॅटो" },
  { id: "Paddy", nameEn: "Paddy / Rice", nameMr: "भात / धान" },
  { id: "Wheat", nameEn: "Wheat", nameMr: "गहू" },
  { id: "Potato", nameEn: "Potato", nameMr: "बटाटा" },
  { id: "Mustard", nameEn: "Mustard", nameMr: "मोहरी" },
  { id: "Chilli", nameEn: "Chilli / Pepper", nameMr: "मिरची" },
  { id: "Cotton", nameEn: "Cotton", nameMr: "कापूस" },
  { id: "Maize", nameEn: "Maize", nameMr: "मका" },
  { id: "Other", nameEn: "Other (Type crop name...)", nameMr: "इतर (नाव प्रविष्ट करा)" }
];

const LOCAL_TRANS = {
  en: {
    title: "Predictive Yield & Resource Engine",
    subtitle: "Forecast your crop yield and generate automated schedules for smart irrigation and fertilizer application.",
    inputSection: "Agronomic Parameters",
    crop: "Select Crop",
    soil: "Select Soil Type",
    ph: "Soil pH Level",
    n: "Nitrogen (N) - ppm / mg/kg",
    p: "Phosphorus (P) - ppm / mg/kg",
    k: "Potassium (K) - ppm / mg/kg",
    area: "Field Area (Acres)",
    historicalYield: "Last Harvest Yield (Tons/Acre) - Optional",
    region: "Region / City Name",
    detectBtn: "📍 GPS Location",
    runBtn: "Run Predictive Simulation",
    historyTitle: "Previous Simulations",
    forecastResults: "Forecast Results",
    predictedYield: "Predicted Crop Yield",
    totalYield: "Total Predicted Harvest",
    predictedProfit: "Estimated Net Profit",
    explanation: "AI Decision Explanation",
    irrTitle: "Drip Irrigation Running Schedule",
    fertTitle: "Optimal Fertilizer split application (For entire field area)",
    stage: "Growth Stage",
    irrFreq: "Watering Frequency",
    irrDuration: "Run Time (Minutes)",
    notes: "Actionable Guidelines",
    fertUrea: "Urea (46% N)",
    fertDap: "DAP (18:46:0)",
    fertMop: "MOP (60% K)",
    fertCompost: "Organic Compost",
    historyEmpty: "No previous yield simulations recorded. Run your first forecast above!",
    loadingSteps: [
      "Contacting regional geocoding registers...",
      "Downloading localized 3-day weather parameters...",
      "Analyzing soil chemistry NPK balance coefficients...",
      "Running simulation models and calculating yield curve...",
      "Generating smart irrigation and fertilizer split routines..."
    ]
  },
  mr: {
    title: "उत्पादन अंदाज व संसाधन नियोजन इंजिन",
    subtitle: "हवामान, माती आणि जुन्या नोंदींवरून पिकाच्या उत्पन्नाचा अंदाज मिळवा आणि सिंचन व खत नियोजनाचे वेळापत्रक तयार करा.",
    inputSection: "कृषी व माती घटक",
    crop: "पीक निवडा",
    soil: "मातीचा प्रकार निवडा",
    ph: "मातीचे pH मूल्य",
    n: "नायट्रोजन (N) पातळी",
    p: "फॉस्फरस (P) पातळी",
    k: "पोटॅशियम (K) पातळी",
    area: "एकूण क्षेत्र (एकर)",
    historicalYield: "मागील कापणी उत्पादन (टन/एकर) - ऐच्छिक",
    region: "शहर / जिल्हा",
    detectBtn: "📍 जीपीएस स्थान",
    runBtn: "उत्पादन अंदाज मिळवा",
    historyTitle: "मागील अंदाज इतिहास",
    forecastResults: "अंदाज निकाल",
    predictedYield: "अंदाजित पीक उत्पादन",
    totalYield: "एकूण अंदाजित कापणी",
    predictedProfit: "अंदाजित निव्वळ नफा",
    explanation: "एआय निर्णय स्पष्टीकरण",
    irrTitle: "ठिबक सिंचन पाणी नियोजन वेळापत्रक",
    fertTitle: "खतांचे अचूक नियोजन आणि प्रमाण (एकूण क्षेत्रासाठी)",
    stage: "वाढीचा टप्पा",
    irrFreq: "पाण्याची वारंवारता",
    irrDuration: "वेळ मर्यादा (मिनिटे)",
    notes: "मार्गदर्शक सूचना",
    fertUrea: "युरिया खत",
    fertDap: "डीएपी खत",
    fertMop: "पोटॅश खत (MOP)",
    fertCompost: "सेंद्रिय शेणखत",
    historyEmpty: "कोणताही इतिहास सापडला नाही. वरील फॉर्म भरून पहिला अंदाज मिळवा!",
    loadingSteps: [
      "स्थानिक जीपीएस कोऑर्डिनेट्स जुळवत आहे...",
      "मागील ३ दिवसांचा हवामान अहवाल तपासत आहे...",
      "मातीतील एनपीके (NPK) प्रमाणाचे गुणोत्तर मोजत आहे...",
      "उत्पादन क्षमता मॉडेल सिमुलेशन चालवत आहे...",
      "सिंचन वेळापत्रक आणि खतांचा अचूक डोस निश्चित करत आहे..."
    ]
  }
};

const PredictiveYield = () => {
  const { language } = useLanguage();
  const { addHistoryEntry } = useHistory();
  const lang = language === "mr" ? "mr" : "en";
  const T = LOCAL_TRANS[lang];

  const [form, setForm] = useState({
    cropName: "Tomato",
    customCropName: "",
    soilType: "loamy",
    pH: 6.5,
    n: 50,
    p: 50,
    k: 50,
    area: 1.0,
    historicalYield: "",
    region: ""
  });

  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const res = await api.get("/yield/history");
      setHistory(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const detectLocation = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setForm((prev) => ({
          ...prev,
          region: `${position.coords.latitude.toFixed(4)}, ${position.coords.longitude.toFixed(4)}`
        }));
      },
      (err) => {
        console.error(err);
        alert("GPS detection failed. Please type location manually.");
      }
    );
  };

  const handlePredict = async (e) => {
    e.preventDefault();
    setLoading(true);
    setLoadingStep(0);
    setError(null);
    setResult(null);

    // Step cycle animation
    const interval = setInterval(() => {
      setLoadingStep((prev) => {
        if (prev < T.loadingSteps.length - 1) {
          return prev + 1;
        } else {
          clearInterval(interval);
          return prev;
        }
      });
    }, 1000);

    try {
      const payload = {
        ...form,
        cropName: form.cropName === "Other" ? form.customCropName : form.cropName,
        pH: Number(form.pH),
        n: Number(form.n),
        p: Number(form.p),
        k: Number(form.k),
        area: Number(form.area),
        historicalYield: form.historicalYield ? Number(form.historicalYield) : undefined
      };
      
      const res = await api.post("/yield/predict", payload, {
        headers: { "x-language": lang }
      });
      clearInterval(interval);
      setResult(res.data);
      fetchHistory();
      // Record in Activity History
      if (res.data) {
        const cropName = form.cropName === "Other" ? form.customCropName : form.cropName;
        const predYield = res.data.predictedYield || res.data.prediction?.predictedYield || "—";
        const profit = res.data.estimatedProfit || res.data.prediction?.estimatedProfit || "—";
        addHistoryEntry({
          type: "yield_prediction",
          title: lang === "mr" ? `उत्पादन अंदाज — ${cropName}` : `Yield Prediction — ${cropName}`,
          icon: "📊",
          summary: `${cropName} · ${predYield} · ${form.area} acres · Profit: ${profit}`,
          data: {
            crop: cropName,
            soil: form.soilType,
            area: `${form.area} acres`,
            predictedYield: predYield,
            estimatedProfit: profit,
            pH: form.pH,
          },
        });
      }
    } catch (err) {
      clearInterval(interval);
      console.error(err);
      setError(lang === "mr" ? "अंदाज मिळवण्यात अयशस्वी. नेटवर्क तपासा." : "Failed to run simulation. Please check connection.");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm(lang === "mr" ? "तुम्हाला ही रेकॉर्ड हटवायची आहे का?" : "Are you sure you want to delete this prediction?")) return;
    try {
      await api.delete(`/yield/${id}`);
      fetchHistory();
      if (result && result.prediction?._id === id) {
        setResult(null);
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="app-container">
      {/* Title Header */}
      <div className="card" style={{ background: "linear-gradient(135deg, #166534, #15803d)", color: "white", marginBottom: 24 }}>
        <h1 style={{ fontSize: 26, fontWeight: 800, margin: 0 }}>📊 {T.title}</h1>
        <p style={{ opacity: 0.9, marginTop: 6, marginBottom: 0, fontSize: 14 }}>
          {T.subtitle}
        </p>
      </div>

      <div className="grid-2" style={{ gap: 24, alignItems: "start" }}>
        {/* Parameters Form */}
        <div className="card">
          <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>🌱 {T.inputSection}</h2>
          <form onSubmit={handlePredict}>
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 13, fontWeight: 600, display: "block", marginBottom: 4 }}>{T.crop}</label>
              <select
                className="input"
                style={{ width: "100%", height: 42 }}
                value={form.cropName}
                onChange={(e) => setForm({ ...form, cropName: e.target.value })}
              >
                {CROPS.map((c) => (
                  <option key={c.id} value={c.id}>
                    {lang === "mr" ? c.nameMr : c.nameEn}
                  </option>
                ))}
              </select>

              {form.cropName === "Other" && (
                <div style={{ marginTop: 8, marginBottom: 12 }}>
                  <label style={{ fontSize: 13, fontWeight: 600, display: "block", marginBottom: 4 }}>
                    {lang === "mr" ? "पिकाचे नाव प्रविष्ट करा" : "Type Crop Name"}
                  </label>
                  <input
                    type="text"
                    className="input"
                    placeholder={lang === "mr" ? "उदा. सोयाबीन, कांदा, ऊस..." : "e.g. Soyabean, Onion, Sugarcane..."}
                    value={form.customCropName}
                    onChange={(e) => setForm({ ...form, customCropName: e.target.value })}
                    required
                  />
                </div>
              )}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, display: "block", marginBottom: 4 }}>{T.soil}</label>
                <select
                  className="input"
                  style={{ width: "100%", height: 42 }}
                  value={form.soilType}
                  onChange={(e) => setForm({ ...form, soilType: e.target.value })}
                >
                  <option value="loamy">{lang === "mr" ? "लोमी माती (Optimal)" : "Loamy (Optimal)"}</option>
                  <option value="sandy">{lang === "mr" ? "वाळूमय माती" : "Sandy Soil"}</option>
                  <option value="clay">{lang === "mr" ? "चिकण माती" : "Clayey Soil"}</option>
                  <option value="peaty">{lang === "mr" ? "आम्लयुक्त / पेटी माती" : "Peaty Soil"}</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: 13, fontWeight: 600, display: "block", marginBottom: 4 }}>{T.ph} (3.5 - 9.0)</label>
                <input
                  type="number"
                  step="0.1"
                  min="3.5"
                  max="9.0"
                  className="input"
                  value={form.pH}
                  onChange={(e) => setForm({ ...form, pH: e.target.value })}
                  required
                />
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 12 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, display: "block", marginBottom: 4 }}>{T.n}</label>
                <input
                  type="number"
                  className="input"
                  value={form.n}
                  onChange={(e) => setForm({ ...form, n: e.target.value })}
                  required
                />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, display: "block", marginBottom: 4 }}>{T.p}</label>
                <input
                  type="number"
                  className="input"
                  value={form.p}
                  onChange={(e) => setForm({ ...form, p: e.target.value })}
                  required
                />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, display: "block", marginBottom: 4 }}>{T.k}</label>
                <input
                  type="number"
                  className="input"
                  value={form.k}
                  onChange={(e) => setForm({ ...form, k: e.target.value })}
                  required
                />
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, display: "block", marginBottom: 4 }}>{T.area}</label>
                <input
                  type="number"
                  step="0.1"
                  min="0.1"
                  className="input"
                  value={form.area}
                  onChange={(e) => setForm({ ...form, area: e.target.value })}
                  required
                />
              </div>

              <div>
                <label style={{ fontSize: 13, fontWeight: 600, display: "block", marginBottom: 4 }}>{T.historicalYield}</label>
                <input
                  type="number"
                  step="0.01"
                  className="input"
                  placeholder="e.g. 3.2"
                  value={form.historicalYield}
                  onChange={(e) => setForm({ ...form, historicalYield: e.target.value })}
                />
              </div>
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 13, fontWeight: 600, display: "block", marginBottom: 4 }}>{T.region}</label>
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  type="text"
                  className="input"
                  style={{ flex: 1 }}
                  placeholder="e.g. Nashik, Maharashtra"
                  value={form.region}
                  onChange={(e) => setForm({ ...form, region: e.target.value })}
                  required
                />
                <button
                  type="button"
                  className="button button-secondary"
                  style={{ whiteSpace: "nowrap", padding: "0 12px" }}
                  onClick={detectLocation}
                >
                  {T.detectBtn}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="button"
              style={{ width: "100%", height: 45, fontWeight: 700 }}
              disabled={loading}
            >
              {loading ? "⚙️ Simulating Model..." : T.runBtn}
            </button>
          </form>

          {error && (
            <div className="offline-bar" style={{ marginTop: 12, borderRadius: 8, textAlign: "center" }}>
              {error}
            </div>
          )}
        </div>

        {/* Loader Simulation / Results */}
        <div>
          {loading && (
            <div className="card" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: 280, textAlign: "center" }}>
              <div className="scan-line" style={{ width: "100%", maxWidth: 300, position: "relative" }} />
              <div style={{ fontSize: 40, animation: "spin 2s linear infinite" }} className="spin-slow">⏳</div>
              <h3 style={{ marginTop: 16, color: "var(--primary)" }}>{lang === "mr" ? "डेटा सिमुलेशन चालू आहे..." : "Processing Agricultural Forecast..."}</h3>
              <p style={{ color: "var(--text-muted)", fontSize: 13, marginTop: 8, fontStyle: "italic" }}>
                "{T.loadingSteps[loadingStep]}"
              </p>
            </div>
          )}

          {!loading && !result && (
            <div className="card" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: 280, border: "2px dashed var(--border-color)", background: "transparent", color: "var(--text-muted)" }}>
              <span style={{ fontSize: 48 }}>📈</span>
              <p style={{ marginTop: 12, fontWeight: 600 }}>
                {lang === "mr" ? "उत्पादनाचा अंदाज चालवण्यासाठी डावीकडील फॉर्म भरा." : "Fill the farm details to run yield projections."}
              </p>
            </div>
          )}

          {result && (
            <div>
              {/* Forecast Numbers Cards */}
              <div className="card" style={{ borderLeft: "5px solid var(--primary)", marginBottom: 16 }}>
                <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16, color: "var(--primary)" }}>⭐ {T.forecastResults}</h2>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                  <div style={{ background: "var(--bg-main)", padding: 12, borderRadius: 8 }}>
                    <span style={{ fontSize: 11, color: "var(--text-muted)", display: "block" }}>{T.predictedYield}</span>
                    <strong style={{ fontSize: 22, color: "var(--text-dark)" }}>{result.prediction.predictedYield} <span style={{ fontSize: 13 }}>tons/acre</span></strong>
                  </div>
                  <div style={{ background: "var(--bg-main)", padding: 12, borderRadius: 8 }}>
                    <span style={{ fontSize: 11, color: "var(--text-muted)", display: "block" }}>{T.totalYield} ({form.area} ac)</span>
                    <strong style={{ fontSize: 22, color: "var(--text-dark)" }}>{result.prediction.totalPredictedYield} <span style={{ fontSize: 13 }}>tons</span></strong>
                  </div>
                </div>

                <div style={{ marginTop: 12, background: "var(--bg-main)", padding: 12, borderRadius: 8 }}>
                  <span style={{ fontSize: 11, color: "var(--text-muted)", display: "block" }}>{T.predictedProfit}</span>
                  <strong style={{ fontSize: 24, color: "#16a34a" }}>₹{result.prediction.predictedProfit.toLocaleString(lang === "mr" ? "en-IN" : "en-US")}</strong>
                </div>

                <div style={{ marginTop: 16, borderTop: "1px solid var(--border-color)", paddingTop: 12 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, display: "block", marginBottom: 4 }}>🧠 {T.explanation}:</span>
                  <p style={{ fontSize: 13, color: "var(--text-dark)", lineHeight: 1.5, margin: 0, fontStyle: "italic" }}>
                    {result.explanation}
                  </p>
                </div>
              </div>

              {/* Schedules */}
              <div className="card" style={{ marginBottom: 16 }}>
                <h3 style={{ fontSize: 15, fontWeight: 800, marginBottom: 12 }}>💧 {T.irrTitle}</h3>
                <div style={{ overflowX: "auto" }}>
                  <table className="mandi-table" style={{ width: "100%", fontSize: 12 }}>
                    <thead>
                      <tr>
                        <th style={{ textAlign: "left" }}>{T.stage}</th>
                        <th>{T.irrFreq}</th>
                        <th>{T.irrDuration}</th>
                        <th style={{ textAlign: "left" }}>{T.notes}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.prediction.irrigationSchedule.map((s, idx) => (
                        <tr key={idx}>
                          <td style={{ fontWeight: 600 }}>{s.stage}</td>
                          <td style={{ textAlign: "center" }}>{lang === "mr" ? `दर ${s.frequencyDays} दिवसांनी` : `Every ${s.frequencyDays} days`}</td>
                          <td style={{ textAlign: "center" }}>{s.runTimeMinutes} min</td>
                          <td>{s.notes}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="card">
                <h3 style={{ fontSize: 15, fontWeight: 800, marginBottom: 12 }}>🧪 {T.fertTitle}</h3>
                <div style={{ overflowX: "auto" }}>
                  <table className="mandi-table" style={{ width: "100%", fontSize: 12 }}>
                    <thead>
                      <tr>
                        <th style={{ textAlign: "left" }}>{T.stage}</th>
                        <th>{T.fertUrea}</th>
                        <th>{T.fertDap}</th>
                        <th>{T.fertMop}</th>
                        <th>{T.fertCompost}</th>
                        <th style={{ textAlign: "left" }}>{T.notes}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.prediction.fertilizerSchedule.map((f, idx) => (
                        <tr key={idx}>
                          <td style={{ fontWeight: 600 }}>{f.stage}</td>
                          <td style={{ textAlign: "center", color: f.ureaKg > 0 ? "var(--primary)" : "inherit" }}>{f.ureaKg} kg</td>
                          <td style={{ textAlign: "center", color: f.dapKg > 0 ? "var(--primary)" : "inherit" }}>{f.dapKg} kg</td>
                          <td style={{ textAlign: "center", color: f.mopKg > 0 ? "var(--primary)" : "inherit" }}>{f.mopKg} kg</td>
                          <td style={{ textAlign: "center" }}>{f.organicCompostTons > 0 ? `${f.organicCompostTons} T` : "0"}</td>
                          <td>{f.notes}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* History Catalog Section */}
      <div className="card" style={{ marginTop: 24 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>📁 {T.historyTitle}</h2>
        {history.length === 0 ? (
          <p style={{ color: "var(--text-muted)", fontSize: 13, fontStyle: "italic", textAlign: "center", padding: "16px 0" }}>{T.historyEmpty}</p>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
            {history.map((h) => (
              <div key={h._id} className="card" style={{ background: "var(--bg-main)", padding: 16, display: "flex", flexDirection: "column", justifyContent: "space-between", position: "relative" }}>
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: 8 }}>
                    <strong style={{ fontSize: 16, color: "var(--primary)" }}>
                      🌾 {lang === "mr" ? (CROPS.find(c => c.id === h.cropName)?.nameMr || h.cropName) : h.cropName}
                    </strong>
                    <button
                      onClick={() => handleDelete(h._id)}
                      style={{ background: "none", border: "none", color: "#dc2626", cursor: "pointer", fontSize: 15 }}
                      title="Delete Record"
                    >
                      🗑️
                    </button>
                  </div>
                  <div style={{ fontSize: 13, color: "var(--text-muted)" }}>
                    <div>📍 {h.region}</div>
                    <div>📐 {h.area} Acres ({h.soilType})</div>
                    <div style={{ margin: "8px 0", borderTop: "1px dashed var(--border-color)", paddingTop: 6 }}>
                      <span style={{ display: "block" }}>{T.predictedYield}: <strong>{h.predictedYield} T/ac</strong></span>
                      <span style={{ display: "block" }}>{T.predictedProfit}: <strong style={{ color: "#16a34a" }}>₹{h.predictedProfit.toLocaleString()}</strong></span>
                    </div>
                  </div>
                </div>
                <div style={{ fontSize: 10, color: "var(--text-muted)", alignSelf: "flex-end", marginTop: 8 }}>
                  {new Date(h.createdAt).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default PredictiveYield;
