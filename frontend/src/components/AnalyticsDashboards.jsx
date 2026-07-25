import React, { useState, useMemo } from "react";
import { useLanguage } from "../context/LanguageContext";

// Sample Agricultural Datasets for Analytics & Dashboards
const PRODUCTION_DATA = [
  { crop: "Rice", year: 2024, state: "Punjab", district: "Ludhiana", production: 12.8, area: 3.2, yield: 4.0 },
  { crop: "Rice", year: 2024, state: "West Bengal", district: "Burdwan", production: 15.2, area: 4.1, yield: 3.7 },
  { crop: "Wheat", year: 2024, state: "Punjab", district: "Karnal", production: 18.1, area: 3.8, yield: 4.76 },
  { crop: "Wheat", year: 2024, state: "Uttar Pradesh", district: "Meerut", production: 35.4, area: 9.8, yield: 3.61 },
  { crop: "Cotton", year: 2024, state: "Gujarat", district: "Rajkot", production: 8.5, area: 2.6, yield: 3.27 },
  { crop: "Cotton", year: 2024, state: "Maharashtra", district: "Nagpur", production: 7.2, area: 2.8, yield: 2.57 },
  { crop: "Sugarcane", year: 2024, state: "Maharashtra", district: "Kolhapur", production: 82.0, area: 1.1, yield: 74.5 },
  { crop: "Sugarcane", year: 2024, state: "Uttar Pradesh", district: "Muzaffarnagar", production: 145.0, area: 2.1, yield: 69.0 },
  { crop: "Tomato", year: 2024, state: "Maharashtra", district: "Nashik", production: 4.8, area: 0.35, yield: 13.7 },
  { crop: "Tomato", year: 2024, state: "Karnataka", district: "Kolar", production: 5.2, area: 0.38, yield: 13.6 },
  { crop: "Maize", year: 2024, state: "Karnataka", district: "Davangere", production: 6.4, area: 1.8, yield: 3.55 },
  { crop: "Soybean", year: 2024, state: "Madhya Pradesh", district: "Indore", production: 6.8, area: 2.5, yield: 2.72 }
];

const RAINFALL_DATA = [
  { month: "Jan", rainfall: 18, normal: 20, temp: 15 },
  { month: "Feb", rainfall: 22, normal: 25, temp: 18 },
  { month: "Mar", rainfall: 35, normal: 30, temp: 24 },
  { month: "Apr", rainfall: 42, normal: 40, temp: 30 },
  { month: "May", rainfall: 65, normal: 60, temp: 35 },
  { month: "Jun", rainfall: 185, normal: 170, temp: 32 },
  { month: "Jul", rainfall: 290, normal: 280, temp: 28 },
  { month: "Aug", rainfall: 260, normal: 250, temp: 27 },
  { month: "Sep", rainfall: 175, normal: 160, temp: 28 },
  { month: "Oct", rainfall: 75, normal: 70, temp: 26 },
  { month: "Nov", rainfall: 28, normal: 30, temp: 20 },
  { month: "Dec", rainfall: 15, normal: 15, temp: 16 }
];

const FERTILIZER_DATA = [
  { crop: "Rice", n: 120, p: 60, k: 40, organic: 2.5, chemical: 4.8 },
  { crop: "Wheat", n: 120, p: 60, k: 40, organic: 2.0, chemical: 4.5 },
  { crop: "Cotton", n: 150, p: 75, k: 75, organic: 3.0, chemical: 6.0 },
  { crop: "Sugarcane", n: 250, p: 115, k: 115, organic: 5.0, chemical: 10.2 },
  { crop: "Maize", n: 120, p: 60, k: 50, organic: 2.2, chemical: 4.2 },
  { crop: "Tomato", n: 140, p: 80, k: 90, organic: 4.0, chemical: 5.5 }
];

const STATE_PROFILES = {
  Maharashtra: {
    production: "38.5 Million Tons",
    area: "16.8 Million Ha",
    yield: "2.29 Tons/Ha",
    majorCrops: "Sugarcane, Cotton, Soybean, Onion, Grapes, Tomato",
    rainfall: "1,150 mm/year",
    soilType: "Black Cotton Soil, Loamy, Laterite",
    topDistricts: ["Nashik", "Kolhapur", "Nagpur", "Pune", "Amravati"]
  },
  Punjab: {
    production: "31.2 Million Tons",
    area: "7.8 Million Ha",
    yield: "4.00 Tons/Ha",
    majorCrops: "Wheat, Paddy (Rice), Maize, Cotton, Potato",
    rainfall: "650 mm/year",
    soilType: "Alluvial Soil, Deep Sandy Loam",
    topDistricts: ["Ludhiana", "Patiala", "Amritsar", "Sangrur"]
  },
  Gujarat: {
    production: "24.6 Million Tons",
    area: "9.8 Million Ha",
    yield: "2.51 Tons/Ha",
    majorCrops: "Cotton, Groundnut, Wheat, Spices, Castor",
    rainfall: "800 mm/year",
    soilType: "Black Soil, Alluvial, Sandy Loam",
    topDistricts: ["Rajkot", "Anand", "Junagadh", "Surat"]
  },
  "Uttar Pradesh": {
    production: "56.4 Million Tons",
    area: "17.5 Million Ha",
    yield: "3.22 Tons/Ha",
    majorCrops: "Sugarcane, Wheat, Paddy, Potato, Mango",
    rainfall: "990 mm/year",
    soilType: "Deep Gangetic Alluvial Soil",
    topDistricts: ["Muzaffarnagar", "Meerut", "Varanasi", "Agra"]
  },
  "Madhya Pradesh": {
    production: "33.1 Million Tons",
    area: "15.2 Million Ha",
    yield: "2.18 Tons/Ha",
    majorCrops: "Soybean, Wheat, Pulses, Mustard, Garlic",
    rainfall: "1,100 mm/year",
    soilType: "Deep & Medium Black Soil",
    topDistricts: ["Indore", "Ujjain", "Bhopal", "Dewas"]
  }
};

const SEASONAL_DATA = {
  Kharif: { production: 154.2, yield: 2.45, rainfall: 850, profit: "₹45,000/acre", diseaseRate: "14%" },
  Rabi: { production: 160.8, yield: 3.12, rainfall: 180, profit: "₹52,000/acre", diseaseRate: "8%" },
  Zaid: { production: 38.5, yield: 8.40, rainfall: 90, profit: "₹68,000/acre", diseaseRate: "11%" }
};

const AnalyticsDashboards = () => {
  const { language } = useLanguage();
  const [activeSubTab, setActiveSubTab] = useState("production");

  // Filters
  const [selectedCrop, setSelectedCrop] = useState("All");
  const [selectedState, setSelectedState] = useState("Maharashtra");

  // Production Filtered Data
  const filteredProduction = useMemo(() => {
    return PRODUCTION_DATA.filter((item) => {
      if (selectedCrop !== "All" && item.crop !== selectedCrop) return false;
      return true;
    });
  }, [selectedCrop]);

  const totalProduction = useMemo(() => {
    return filteredProduction.reduce((sum, item) => sum + item.production, 0).toFixed(1);
  }, [filteredProduction]);

  const exportCSV = (filename, data) => {
    const csvRows = [];
    const headers = Object.keys(data[0]);
    csvRows.push(headers.join(","));

    for (const row of data) {
      const values = headers.map(header => JSON.stringify(row[header] || ""));
      csvRows.push(values.join(","));
    }

    const blob = new Blob([csvRows.join("\n")], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div style={{ marginTop: 12 }}>
      {/* Navigation Sub-Tabs */}
      <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 8, marginBottom: 20 }}>
        {[
          { id: "production", title: language === "mr" ? "🌾 पीक उत्पादन विश्लेषक" : "🌾 Crop Production" },
          { id: "rainfall", title: language === "mr" ? "🌧️ पर्जन्यमान विश्लेषक" : "🌧️ Rainfall Analysis" },
          { id: "fertilizer", title: language === "mr" ? "🧪 खत वापराचे विश्लेषण" : "🧪 Fertilizer Usage" },
          { id: "state", title: language === "mr" ? "🗺️ राज्यनिहाय कृषी प्रोफाइल" : "🗺️ State-wise Production" },
          { id: "seasonal", title: language === "mr" ? "🗓️ हंगामी तुलना" : "🗓️ Seasonal Comparison" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveSubTab(tab.id)}
            className="button"
            style={{
              padding: "8px 14px",
              fontSize: 13,
              margin: 0,
              background: activeSubTab === tab.id ? "var(--primary)" : "var(--bg-card)",
              color: activeSubTab === tab.id ? "white" : "var(--text-dark)",
              border: "1px solid var(--border-color)",
              whiteSpace: "nowrap"
            }}
          >
            {tab.title}
          </button>
        ))}
      </div>

      {/* 1. CROP PRODUCTION ANALYTICS */}
      {activeSubTab === "production" && (
        <div className="card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12, marginBottom: 16 }}>
            <div>
              <h3 style={{ margin: 0 }}>{language === "mr" ? "पीक उत्पादन आणि वार्षिक वाढ विश्लेषण" : "Crop Production Analytics"}</h3>
              <p style={{ fontSize: 13, color: "var(--text-muted)", margin: "4px 0 0 0" }}>
                {language === "mr" ? "राज्य व जिल्ह्यानुसार एकूण उत्पादन आणि उत्पादकता ट्रॅक करा." : "Track state and district-wise production metrics, annual growth, and area yield."}
              </p>
            </div>
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <select className="input" style={{ padding: "4px 10px", fontSize: 13, width: "auto" }} value={selectedCrop} onChange={(e) => setSelectedCrop(e.target.value)}>
                <option value="All">All Crops</option>
                <option value="Rice">Rice</option>
                <option value="Wheat">Wheat</option>
                <option value="Cotton">Cotton</option>
                <option value="Sugarcane">Sugarcane</option>
                <option value="Tomato">Tomato</option>
                <option value="Maize">Maize</option>
                <option value="Soybean">Soybean</option>
              </select>
              <button
                className="button"
                style={{ padding: "6px 12px", fontSize: 12, margin: 0, background: "#0284c7" }}
                onClick={() => exportCSV("crop_production_data.csv", filteredProduction)}
              >
                📥 Export CSV
              </button>
            </div>
          </div>

          {/* KPI Summary Cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 16, marginBottom: 20 }}>
            <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", padding: 16, borderRadius: 10 }}>
              <span style={{ fontSize: 12, color: "#166534", fontWeight: 700 }}>Total Production</span>
              <div style={{ fontSize: 24, fontWeight: 800, color: "#15803d", marginTop: 4 }}>{totalProduction} MT</div>
              <span style={{ fontSize: 11, color: "#166534" }}>+5.4% YoY Growth</span>
            </div>
            <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", padding: 16, borderRadius: 10 }}>
              <span style={{ fontSize: 12, color: "#1e40af", fontWeight: 700 }}>Total Cultivated Area</span>
              <div style={{ fontSize: 24, fontWeight: 800, color: "#1d4ed8", marginTop: 4 }}>42.1 Million Ha</div>
              <span style={{ fontSize: 11, color: "#1e40af" }}>Active Cropping Zone</span>
            </div>
            <div style={{ background: "#faf5ff", border: "1px solid #e9d5ff", padding: 16, borderRadius: 10 }}>
              <span style={{ fontSize: 12, color: "#6b21a8", fontWeight: 700 }}>Average Yield Rate</span>
              <div style={{ fontSize: 24, fontWeight: 800, color: "#7e22ce", marginTop: 4 }}>4.28 Tons/Ha</div>
              <span style={{ fontSize: 11, color: "#6b21a8" }}>+2.1% Efficiency</span>
            </div>
          </div>

          {/* Bar Chart Visualization */}
          <div style={{ background: "var(--bg-subtle, #f8fafc)", padding: 16, borderRadius: 10, marginBottom: 20 }}>
            <h4 style={{ margin: "0 0 12px 0", fontSize: 14 }}>Production Volume Comparison (Million Tons)</h4>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {filteredProduction.map((item, idx) => (
                <div key={idx} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ width: 120, fontSize: 12, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {item.crop} ({item.district})
                  </div>
                  <div style={{ flex: 1, background: "#e2e8f0", height: 18, borderRadius: 4, overflow: "hidden", position: "relative" }}>
                    <div
                      style={{
                        width: `${Math.min(100, (item.production / 150) * 100)}%`,
                        background: "linear-gradient(90deg, #16a34a, #22c55e)",
                        height: "100%",
                        borderRadius: 4,
                        transition: "width 0.4s ease"
                      }}
                    />
                  </div>
                  <div style={{ width: 70, fontSize: 12, fontWeight: 700, textAlign: "right" }}>{item.production} MT</div>
                </div>
              ))}
            </div>
          </div>

          {/* Data Table */}
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, textAlign: "left" }}>
              <thead>
                <tr style={{ background: "var(--primary-light)", borderBottom: "2px solid var(--border-color)" }}>
                  <th style={{ padding: 10 }}>Crop</th>
                  <th style={{ padding: 10 }}>State</th>
                  <th style={{ padding: 10 }}>District</th>
                  <th style={{ padding: 10 }}>Production (MT)</th>
                  <th style={{ padding: 10 }}>Area (M Ha)</th>
                  <th style={{ padding: 10 }}>Yield (T/Ha)</th>
                </tr>
              </thead>
              <tbody>
                {filteredProduction.map((row, i) => (
                  <tr key={i} style={{ borderBottom: "1px solid var(--border-color)" }}>
                    <td style={{ padding: 10, fontWeight: 700 }}>{row.crop}</td>
                    <td style={{ padding: 10 }}>{row.state}</td>
                    <td style={{ padding: 10 }}>{row.district}</td>
                    <td style={{ padding: 10, color: "var(--primary)", fontWeight: 700 }}>{row.production}</td>
                    <td style={{ padding: 10 }}>{row.area}</td>
                    <td style={{ padding: 10 }}>{row.yield}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 2. RAINFALL ANALYSIS DASHBOARD */}
      {activeSubTab === "rainfall" && (
        <div className="card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <h3 style={{ margin: 0 }}>{language === "mr" ? "मासिक व वार्षिक पर्जन्यमान अंदाज व प्रवाह" : "Monthly & Yearly Rainfall Analytics"}</h3>
            <button className="button" style={{ padding: "6px 12px", fontSize: 12, margin: 0 }} onClick={() => exportCSV("rainfall_analytics.csv", RAINFALL_DATA)}>
              📥 Export CSV
            </button>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, marginBottom: 20 }}>
            <div style={{ background: "#f0f9ff", border: "1px solid #bae6fd", padding: 16, borderRadius: 10 }}>
              <span style={{ fontSize: 12, color: "#0369a1", fontWeight: 700 }}>Annual Cumulative Rainfall</span>
              <div style={{ fontSize: 24, fontWeight: 800, color: "#0284c7", marginTop: 4 }}>1,190 mm</div>
              <span style={{ fontSize: 11, color: "#0369a1" }}>+4.2% Normal Monsoon</span>
            </div>
            <div style={{ background: "#fef3c7", border: "1px solid #fde68a", padding: 16, borderRadius: 10 }}>
              <span style={{ fontSize: 12, color: "#92400e", fontWeight: 700 }}>Peak Monsoon Month</span>
              <div style={{ fontSize: 24, fontWeight: 800, color: "#b45309", marginTop: 4 }}>July (290 mm)</div>
              <span style={{ fontSize: 11, color: "#92400e" }}>Optimal Sowing Window</span>
            </div>
          </div>

          {/* Monthly Rainfall Chart */}
          <div style={{ background: "var(--bg-subtle, #f8fafc)", padding: 16, borderRadius: 10, marginBottom: 20 }}>
            <h4 style={{ margin: "0 0 16px 0", fontSize: 14 }}>Monthly Precipitation vs Historical Average (mm)</h4>
            <div style={{ display: "flex", alignItems: "flex-end", gap: 10, height: 180, paddingBottom: 24, borderBottom: "1px solid #cbd5e1" }}>
              {RAINFALL_DATA.map((d, i) => (
                <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", height: "100%", justifyContent: "flex-end" }}>
                  <div
                    style={{
                      width: "100%",
                      maxWidth: 24,
                      background: "linear-gradient(180deg, #0284c7, #38bdf8)",
                      height: `${(d.rainfall / 300) * 100}%`,
                      borderRadius: "4px 4px 0 0",
                      transition: "height 0.3s"
                    }}
                    title={`${d.month}: ${d.rainfall} mm`}
                  />
                  <span style={{ fontSize: 11, marginTop: 6, fontWeight: 600 }}>{d.month}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 3. FERTILIZER ANALYSIS DASHBOARD */}
      {activeSubTab === "fertilizer" && (
        <div className="card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <h3 style={{ margin: 0 }}>{language === "mr" ? "खत वापर व NPK घटक प्रमाण" : "Fertilizer Usage & NPK Ratio Consumption"}</h3>
            <button className="button" style={{ padding: "6px 12px", fontSize: 12, margin: 0 }} onClick={() => exportCSV("fertilizer_analysis.csv", FERTILIZER_DATA)}>
              📥 Export CSV
            </button>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16, marginBottom: 20 }}>
            {FERTILIZER_DATA.map((f, idx) => (
              <div key={idx} style={{ background: "var(--bg-subtle, #f8fafc)", border: "1px solid var(--border-color)", padding: 16, borderRadius: 10 }}>
                <h4 style={{ margin: "0 0 8px 0", color: "var(--primary)" }}>{f.crop} Fertilizer Profile</h4>
                <div style={{ fontSize: 13, display: "flex", flexDirection: "column", gap: 4 }}>
                  <div><strong>NPK Dose:</strong> {f.n}:{f.p}:{f.k} kg/ha</div>
                  <div><strong>Organic FYM:</strong> {f.organic} Tons/acre</div>
                  <div><strong>Chemical Blend:</strong> {f.chemical} Bags/acre</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. STATE-WISE PRODUCTION MAP & PROFILE */}
      {activeSubTab === "state" && (
        <div className="card">
          <h3 style={{ margin: "0 0 12px 0" }}>{language === "mr" ? "भारतीय राज्यनिहाय कृषी प्रोफाइल" : "State-wise Production Hub & India Profile"}</h3>

          <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 8, marginBottom: 16 }}>
            {Object.keys(STATE_PROFILES).map((st) => (
              <button
                key={st}
                onClick={() => setSelectedState(st)}
                className="button"
                style={{
                  padding: "6px 12px",
                  fontSize: 12,
                  margin: 0,
                  background: selectedState === st ? "#0284c7" : "var(--bg-subtle, #f8fafc)",
                  color: selectedState === st ? "white" : "var(--text-dark)",
                  border: "1px solid var(--border-color)"
                }}
              >
                {st}
              </button>
            ))}
          </div>

          {STATE_PROFILES[selectedState] && (
            <div style={{ background: "var(--bg-subtle, #f8fafc)", padding: 20, borderRadius: 12, border: "1px solid var(--border-color)" }}>
              <h3 style={{ margin: "0 0 16px 0", color: "var(--primary)" }}>📍 {selectedState} Agricultural Profile</h3>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}>
                <div>
                  <span style={{ fontSize: 12, color: "var(--text-muted)" }}>Total Production</span>
                  <div style={{ fontSize: 18, fontWeight: 800 }}>{STATE_PROFILES[selectedState].production}</div>
                </div>
                <div>
                  <span style={{ fontSize: 12, color: "var(--text-muted)" }}>Cultivated Area</span>
                  <div style={{ fontSize: 18, fontWeight: 800 }}>{STATE_PROFILES[selectedState].area}</div>
                </div>
                <div>
                  <span style={{ fontSize: 12, color: "var(--text-muted)" }}>Average Yield</span>
                  <div style={{ fontSize: 18, fontWeight: 800 }}>{STATE_PROFILES[selectedState].yield}</div>
                </div>
                <div>
                  <span style={{ fontSize: 12, color: "var(--text-muted)" }}>Major Crops</span>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{STATE_PROFILES[selectedState].majorCrops}</div>
                </div>
                <div>
                  <span style={{ fontSize: 12, color: "var(--text-muted)" }}>Annual Rainfall</span>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{STATE_PROFILES[selectedState].rainfall}</div>
                </div>
                <div>
                  <span style={{ fontSize: 12, color: "var(--text-muted)" }}>Soil Types</span>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{STATE_PROFILES[selectedState].soilType}</div>
                </div>
              </div>

              <div style={{ marginTop: 16 }}>
                <span style={{ fontSize: 12, color: "var(--text-muted)", display: "block", marginBottom: 6 }}>Top Producing Districts</span>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {STATE_PROFILES[selectedState].topDistricts.map((dist) => (
                    <span key={dist} style={{ background: "var(--primary-light)", color: "var(--primary)", padding: "4px 10px", borderRadius: 6, fontSize: 12, fontWeight: 700 }}>
                      🏆 {dist}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 5. SEASONAL COMPARISON (KHARIF VS RABI VS ZAID) */}
      {activeSubTab === "seasonal" && (
        <div className="card">
          <h3 style={{ margin: "0 0 16px 0" }}>{language === "mr" ? "हंगामी तुलना (खरीप vs रब्बी vs उन्हाळी/झायद)" : "Seasonal Comparison (Kharif vs Rabi vs Zaid)"}</h3>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16 }}>
            {Object.entries(SEASONAL_DATA).map(([season, data]) => (
              <div key={season} style={{ background: "var(--bg-subtle, #f8fafc)", border: "1px solid var(--border-color)", padding: 20, borderRadius: 12 }}>
                <h3 style={{ margin: "0 0 12px 0", color: season === "Kharif" ? "#16a34a" : season === "Rabi" ? "#0284c7" : "#d97706" }}>
                  🗓️ {season} Season
                </h3>
                <div style={{ fontSize: 13, display: "flex", flexDirection: "column", gap: 8 }}>
                  <div><strong>Total Production:</strong> {data.production} Million Tons</div>
                  <div><strong>Average Yield:</strong> {data.yield} Tons/Ha</div>
                  <div><strong>Average Rainfall:</strong> {data.rainfall} mm</div>
                  <div><strong>Est. Net Profit:</strong> <span style={{ color: "#16a34a", fontWeight: 700 }}>{data.profit}</span></div>
                  <div><strong>Disease Outbreak Rate:</strong> {data.diseaseRate}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default AnalyticsDashboards;
