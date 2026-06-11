import { useState, useEffect, useCallback, useRef } from "react";
import api from "../api";
import { useLanguage } from "../context/LanguageContext";

const CATEGORIES = ["All", "Cereals", "Pulses", "Oilseeds", "Vegetables", "Cash Crops"];

const CROP_LIST = [
  // Cereals
  { name: "Wheat", icon: "🌾", category: "Cereals" },
  { name: "Paddy (Rice)", icon: "🌾", category: "Cereals" },
  { name: "Maize", icon: "🌽", category: "Cereals" },
  { name: "Jowar", icon: "🌾", category: "Cereals" },
  { name: "Bajra", icon: "🌾", category: "Cereals" },
  // Pulses
  { name: "Arhar (Tur Dal)", icon: "🫘", category: "Pulses" },
  { name: "Chana (Gram)", icon: "🫘", category: "Pulses" },
  { name: "Moong Dal", icon: "🫘", category: "Pulses" },
  { name: "Masoor (Lentil)", icon: "🫘", category: "Pulses" },
  { name: "Urad Dal", icon: "🫘", category: "Pulses" },
  // Oilseeds
  { name: "Mustard", icon: "🟡", category: "Oilseeds" },
  { name: "Soybean", icon: "🟡", category: "Oilseeds" },
  { name: "Groundnut", icon: "🥜", category: "Oilseeds" },
  { name: "Sunflower", icon: "🌻", category: "Oilseeds" },
  // Vegetables
  { name: "Onion", icon: "🧅", category: "Vegetables" },
  { name: "Potato", icon: "🥔", category: "Vegetables" },
  { name: "Tomato", icon: "🍅", category: "Vegetables" },
  { name: "Garlic", icon: "🧄", category: "Vegetables" },
  // Cash Crops
  { name: "Cotton", icon: "🌿", category: "Cash Crops" },
  { name: "Sugarcane", icon: "🎋", category: "Cash Crops" },
  { name: "Jute", icon: "🪢", category: "Cash Crops" },
];

const trendColor = (dir) =>
  dir === "up" ? "#16a34a" : dir === "down" ? "#dc2626" : "#6b7280";
const trendArrow = (dir) =>
  dir === "up" ? "▲" : dir === "down" ? "▼" : "●";
const trendBg = (dir) =>
  dir === "up" ? "#f0fdf4" : dir === "down" ? "#fef2f2" : "#f9fafb";
const trendBorder = (dir) =>
  dir === "up" ? "#bbf7d0" : dir === "down" ? "#fecaca" : "#e5e7eb";

const recColors = {
  success: { bg: "#f0fdf4", border: "#86efac", text: "#15803d" },
  warning: { bg: "#fffbeb", border: "#fde68a", text: "#92400e" },
  danger:  { bg: "#fef2f2", border: "#fecaca", text: "#991b1b" },
  info:    { bg: "#eff6ff", border: "#bfdbfe", text: "#1d4ed8" },
};

// Mini sparkline SVG chart
const Sparkline = ({ data, color = "#15803d", width = 120, height = 36 }) => {
  if (!data || data.length < 2) return null;
  const prices = data.map(d => d.price);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const range = max - min || 1;
  const pts = prices.map((p, i) => {
    const x = (i / (prices.length - 1)) * width;
    const y = height - ((p - min) / range) * height;
    return `${x},${y}`;
  });
  return (
    <svg width={width} height={height} style={{ overflow: "visible" }}>
      <polyline
        points={pts.join(" ")}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <circle
        cx={pts[pts.length - 1].split(",")[0]}
        cy={pts[pts.length - 1].split(",")[1]}
        r="3"
        fill={color}
      />
    </svg>
  );
};

// 30-day Bar Chart
const PriceChart = ({ data, color = "#15803d" }) => {
  if (!data || data.length === 0) return null;
  const prices = data.map(d => d.price);
  const min = Math.min(...prices) * 0.97;
  const max = Math.max(...prices) * 1.03;
  const range = max - min;
  const visible = data.slice(-15); // show last 15 days

  return (
    <div className="market-chart-wrap">
      <div className="market-chart-bars">
        {visible.map((d, i) => {
          const height = ((d.price - min) / range) * 100;
          const isLast = i === visible.length - 1;
          return (
            <div key={i} className="market-chart-bar-col" title={`${d.label}: ₹${d.price}`}>
              <div
                className="market-chart-bar"
                style={{
                  height: `${height}%`,
                  background: isLast ? color : `${color}88`,
                  borderRadius: "3px 3px 0 0",
                }}
              />
              {i % 3 === 0 && (
                <div className="market-chart-label">{d.label}</div>
              )}
            </div>
          );
        })}
      </div>
      <div className="market-chart-axis">
        <span>₹{Math.round(min)}</span>
        <span>₹{Math.round((min + max) / 2)}</span>
        <span>₹{Math.round(max)}</span>
      </div>
    </div>
  );
};

const Market = () => {
  const { language, t } = useLanguage();
  const [selectedCrop, setSelectedCrop] = useState("Wheat");
  const [activeCategory, setActiveCategory] = useState("All");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(null);
  const [sortBy, setSortBy] = useState("price-asc");
  const [watchlist, setWatchlist] = useState(() => {
    try { return JSON.parse(localStorage.getItem("sk_watchlist") || "[]"); }
    catch { return []; }
  });
  const refreshRef = useRef(null);

  // Mandi Forecast & Sentiment States
  const [forecastPeriod, setForecastPeriod] = useState("7");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [forecastResult, setForecastResult] = useState(null);

  const fetchPrices = useCallback(async (crop = selectedCrop) => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get("/market", { params: { crop } });
      setData(res.data);
      setLastRefresh(new Date());
    } catch (err) {
      setError(err.response?.data?.error || "Failed to fetch market prices.");
    } finally {
      setLoading(false);
    }
  }, [selectedCrop]);

  useEffect(() => {
    fetchPrices(selectedCrop);
    setForecastResult(null); // Clear forecast when crop changes
  }, [selectedCrop]);

  // Auto-refresh every 60 seconds
  useEffect(() => {
    if (autoRefresh) {
      refreshRef.current = setInterval(() => fetchPrices(selectedCrop), 60000);
    }
    return () => clearInterval(refreshRef.current);
  }, [autoRefresh, selectedCrop, fetchPrices]);

  const toggleWatchlist = (cropName) => {
    const next = watchlist.includes(cropName)
      ? watchlist.filter(c => c !== cropName)
      : [...watchlist, cropName];
    setWatchlist(next);
    localStorage.setItem("sk_watchlist", JSON.stringify(next));
  };

  const filteredCrops = CROP_LIST.filter(c => {
    const matchCat = activeCategory === "All" || c.category === activeCategory;
    const matchSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCat && matchSearch;
  });

  const sortedPrices = [...(data?.prices || [])].sort((a, b) => {
    if (sortBy === "price-asc") return a.pricePerQuintal - b.pricePerQuintal;
    if (sortBy === "price-desc") return b.pricePerQuintal - a.pricePerQuintal;
    if (sortBy === "arrival") return b.arrivalTons - a.arrivalTons;
    if (sortBy === "change") return b.changePct - a.changePct;
    return 0;
  });

  // Mandi Price Forecast Simulator
  const handleRunForecast = () => {
    if (!data) return;
    setIsAnalyzing(true);
    setForecastResult(null);

    setTimeout(() => {
      const avg = data.stats.avgPrice;
      const trendDir = data.trend.dir; // "up", "down", "stable"
      const period = parseInt(forecastPeriod);

      let sentiment = "Neutral";
      let multiplier = 0;

      if (trendDir === "up") {
        sentiment = "Bullish";
        multiplier = period === 7 ? 0.03 : period === 15 ? 0.06 : 0.12;
      } else if (trendDir === "down") {
        sentiment = "Bearish";
        multiplier = period === 7 ? -0.02 : period === 15 ? -0.05 : -0.10;
      } else {
        sentiment = "Neutral";
        multiplier = period === 7 ? 0.005 : period === 15 ? 0.01 : 0.02;
      }

      const expectedMin = Math.round(avg * (1 + multiplier - 0.03));
      const expectedMax = Math.round(avg * (1 + multiplier + 0.04));

      let advisoryEn = "";
      let advisoryMr = "";

      if (sentiment === "Bullish") {
        advisoryEn = `Market trend is strong. Prices are expected to rise by ${Math.round(multiplier * 100)}% over the next ${period} days. We recommend holding your stock to maximize profit.`;
        advisoryMr = `बाजार कल मजबूत आहे. पुढील ${period} दिवसांत भाव सुमारे ${Math.round(multiplier * 100)}% वाढण्याची शक्यता आहे. अधिक नफ्यासाठी माल काही दिवस राखून ठेवण्याचा सल्ला दिला जातो.`;
      } else if (sentiment === "Bearish") {
        advisoryEn = `Market shows declining demand. Prices could decrease by ${Math.abs(Math.round(multiplier * 100))}% in ${period} days. It is advised to sell your produce soon to prevent loss.`;
        advisoryMr = `बाजारात मागणी कमी होत आहे. पुढील ${period} दिवसांत भाव सुमारे ${Math.abs(Math.round(multiplier * 100))}% घसरण्याची शक्यता आहे. नुकसान टाळण्यासाठी लवकरात लवकर पिकाची विक्री करा.`;
      } else {
        advisoryEn = `Prices are expected to remain stable with minor fluctuations (±2%). Plan your sales according to your immediate cash requirements.`;
        advisoryMr = `अल्पशा बदलांसह बाजार भाव स्थिर राहण्याची शक्यता आहे (±२%). आपल्या पैशांच्या गरजेनुसार विक्रीचे नियोजन करा.`;
      }

      setForecastResult({
        expectedMin,
        expectedMax,
        sentiment,
        advisoryEn,
        advisoryMr
      });
      setIsAnalyzing(false);
    }, 1000);
  };

  // Localized recommendations helper
  const getLocalizedRecommendation = (recAction) => {
    if (!recAction) return null;
    const actions = {
      "SELL NOW": {
        mr: { action: "त्वरित विक्री करा", reason: "बाजार भाव गेल्या महिन्यापेक्षा वाढले आहेत. विक्रीसाठी उत्तम वेळ." },
        en: { action: "SELL NOW", reason: "Prices are trending up over the last month. Good time to sell." }
      },
      "HOLD": {
        mr: { action: "थांबा / राखून ठेवा", reason: "बाजार भाव कमी होत आहेत. दर सुधारण्यासाठी १-२ आठवडे थांबावे." },
        en: { action: "HOLD", reason: "Prices are falling. Consider holding stock for 1–2 weeks to recover." }
      },
      "MONITOR": {
        mr: { action: "निरीक्षण करा", reason: "बाजार सध्या स्थिर आहे. विक्रीपूर्वी अधिक संधींची वाट पहा." },
        en: { action: "MONITOR", reason: "Market is stable. Watch for better price opportunities before selling." }
      },
      "SELL AT MSP": {
        mr: { action: "हमीभावाने विक्री करा", reason: "बाजार भाव हमीभावापेक्षा कमी आहेत. शासकीय केंद्रांवर हमीभावाने विक्री करा." },
        en: { action: "SELL AT MSP", reason: "Market price is below MSP. Sell directly to government procurement centers to guarantee MSP." }
      },
      "SELL SOON": {
        mr: { action: "लवकर विक्री करा", reason: "बाजार भाव घसरत आहेत. अधिक नुकसान टाळण्यासाठी २-३ दिवसांत विक्री करा." },
        en: { action: "SELL SOON", reason: "Price is declining. Sell within 2–3 days to avoid further losses." }
      }
    };
    return actions[recAction]?.[language] || actions[recAction]?.["en"];
  };

  const rec = data?.recommendation;
  const localizedRec = rec ? getLocalizedRecommendation(rec.action) : null;
  const recStyle = rec ? recColors[rec.color] || recColors.info : null;

  // Localized Categories List helper
  const getCategoryLabel = (cat) => {
    const labels = {
      "All": language === "mr" ? "सर्व" : "All",
      "Cereals": language === "mr" ? "धान्य" : "Cereals",
      "Pulses": language === "mr" ? "कडधान्ये" : "Pulses",
      "Oilseeds": language === "mr" ? "तेलबिया" : "Oilseeds",
      "Vegetables": language === "mr" ? "भाज्या" : "Vegetables",
      "Cash Crops": language === "mr" ? "नगदी पिके" : "Cash Crops"
    };
    return labels[cat] || cat;
  };

  // Localized Sentiment helper
  const getSentimentLabel = (s) => {
    const labels = {
      "Bullish": language === "mr" ? "🟢 तेजी (Bullish)" : "🟢 Bullish",
      "Bearish": language === "mr" ? "🔴 मंदी (Bearish)" : "🔴 Bearish",
      "Neutral": language === "mr" ? "🟡 स्थिर (Neutral)" : "🟡 Neutral"
    };
    return labels[s] || s;
  };

  return (
    <div className="app-container">

      {/* Header */}
      <div className="market-header-card">
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 900, color: "white", marginBottom: 4 }}>
            {t("mandiPrices")}
          </h1>
          <p style={{ opacity: 0.88, fontSize: 14, color: "white" }}>
            {language === "mr" ? "भारतातील १५+ कृषी उत्पन्न बाजार समित्यांमधील पिकांचे चालू बाजार भाव" : "Real-time agricultural commodity prices from 15+ APMC mandis across India"}
          </p>
        </div>
        <div className="market-header-actions">
          <div className="market-refresh-toggle">
            <span style={{ fontSize: 12, fontWeight: 700, opacity: 0.9, color: "white" }}>
              {t("mandiAutoRefresh")}
            </span>
            <button
              className={`market-toggle-btn ${autoRefresh ? "market-toggle-on" : ""}`}
              onClick={() => setAutoRefresh(v => !v)}
              aria-label="Toggle auto refresh"
            >
              <span className="market-toggle-knob" />
            </button>
          </div>
          {lastRefresh && (
            <div className="market-last-update">
              {t("mandiLastUpdate")}: {lastRefresh.toLocaleTimeString(language === "mr" ? "mr-IN" : "en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
            </div>
          )}
        </div>
      </div>

      {/* Main Layout: Sidebar + Content */}
      <div className="market-layout">

        {/* ── LEFT SIDEBAR: Commodity Picker ── */}
        <aside className="market-sidebar card">
          <div className="market-sidebar-search">
            <span>🔍</span>
            <input
              className="market-sidebar-input"
              placeholder={t("mandiSearchPlaceholder")}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Category Tabs */}
          <div className="market-cat-tabs">
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                className={`market-cat-tab ${activeCategory === cat ? "market-cat-tab-active" : ""}`}
                onClick={() => setActiveCategory(cat)}
              >
                {getCategoryLabel(cat)}
              </button>
            ))}
          </div>

          {/* Watchlist */}
          {watchlist.length > 0 && (
            <div className="market-watchlist-section">
              <div className="market-section-label">{language === "mr" ? "⭐ वॉचलिस्ट" : "⭐ Watchlist"}</div>
              {watchlist.map(name => {
                const crop = CROP_LIST.find(c => c.name === name);
                return crop ? (
                  <button
                    key={name}
                    className={`market-crop-btn ${selectedCrop === name ? "market-crop-btn-active" : ""}`}
                    onClick={() => setSelectedCrop(name)}
                  >
                    <span>{crop.icon}</span>
                    <span className="market-crop-btn-name">{language === "mr" ? t(name) || name : name}</span>
                    <span
                      className="market-watchlist-star"
                      onClick={e => { e.stopPropagation(); toggleWatchlist(name); }}
                    >⭐</span>
                  </button>
                ) : null;
              })}
            </div>
          )}

          {/* All Crops */}
          <div className="market-section-label">{language === "mr" ? "सर्व पिके" : "All Commodities"}</div>
          <div className="market-crop-list">
            {filteredCrops.map(crop => (
              <button
                key={crop.name}
                className={`market-crop-btn ${selectedCrop === crop.name ? "market-crop-btn-active" : ""}`}
                onClick={() => setSelectedCrop(crop.name)}
              >
                <span style={{ fontSize: 18 }}>{crop.icon}</span>
                <span className="market-crop-btn-name">{language === "mr" ? t(crop.name) || crop.name : crop.name}</span>
                <span
                  className="market-watchlist-star-empty"
                  onClick={e => { e.stopPropagation(); toggleWatchlist(crop.name); }}
                  title={watchlist.includes(crop.name) ? "Remove from watchlist" : "Add to watchlist"}
                >
                  {watchlist.includes(crop.name) ? "⭐" : "☆"}
                </span>
              </button>
            ))}
            {filteredCrops.length === 0 && (
              <p style={{ fontSize: 13, color: "var(--text-muted)", padding: "12px 8px" }}>
                {language === "mr" ? "कोणतेही पीक सापडले नाही." : "No crops found."}
              </p>
            )}
          </div>
        </aside>

        {/* ── RIGHT CONTENT ── */}
        <main className="market-content">
          {loading && (
            <div className="market-loading">
              <div className="market-spinner" />
              <p>{t("loading")}</p>
            </div>
          )}

          {error && (
            <div className="market-error">⚠️ {error}</div>
          )}

          {data && !loading && (
            <>
              {/* Crop Hero Row */}
              <div className="market-crop-hero card">
                <div className="market-crop-hero-left">
                  <div className="market-crop-hero-icon">{data.icon}</div>
                  <div>
                    <h2 className="market-crop-name">{language === "mr" ? t(data.crop) || data.crop : data.crop}</h2>
                    <div className="market-crop-meta">
                      <span className="market-badge">{getCategoryLabel(data.category)}</span>
                      <span className="market-badge market-badge-blue">
                        {language === "mr" ? `प्रति ${data.unit === "quintal" ? "क्विंटल" : data.unit}` : `per ${data.unit}`}
                      </span>
                      {data.minSupportPrice && (
                        <span className="market-badge market-badge-amber">
                          {language === "mr" ? `MSP ₹${data.minSupportPrice}` : `MSP ₹${data.minSupportPrice}`}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="market-crop-hero-right">
                  <button
                    className="button market-refresh-btn"
                    onClick={() => fetchPrices(selectedCrop)}
                    disabled={loading}
                  >
                    {t("mandiRefreshBtn")}
                  </button>
                  <button
                    className={`button market-watchlist-btn ${watchlist.includes(selectedCrop) ? "market-watchlist-btn-active" : ""}`}
                    onClick={() => toggleWatchlist(selectedCrop)}
                  >
                    {watchlist.includes(selectedCrop) ? t("mandiWatchingBtn") : t("mandiWatchBtn")}
                  </button>
                </div>
              </div>

              {/* Stats Row */}
              <div className="market-stats-row">
                {[
                  { 
                    label: language === "mr" ? "सरासरी बाजार भाव" : "Avg. Mandi Price", 
                    value: `₹${data.stats.avgPrice}`, 
                    icon: "📊", 
                    sub: language === "mr" ? "प्रति क्विंटल" : "Per quintal" 
                  },
                  { 
                    label: language === "mr" ? "किमान किंमत" : "Lowest Price", 
                    value: `₹${data.stats.minPrice}`, 
                    icon: "📉", 
                    sub: data.stats.bestBuyMandi, 
                    color: "#dc2626" 
                  },
                  { 
                    label: language === "mr" ? "कमाल किंमत" : "Highest Price", 
                    value: `₹${data.stats.maxPrice}`, 
                    icon: "📈", 
                    sub: data.stats.bestSellMandi, 
                    color: "#16a34a" 
                  },
                  { 
                    label: language === "mr" ? "किंमतीतील फरक" : "Price Spread", 
                    value: `₹${data.stats.spread}`, 
                    icon: "↔️", 
                    sub: "Max - Min" 
                  },
                  { 
                    label: language === "mr" ? "एकूण आवक" : "Total Arrivals", 
                    value: `${data.stats.totalArrival}T`, 
                    icon: "🚛", 
                    sub: language === "mr" ? "आज सर्व बाजार समित्यांमध्ये" : "Today across mandis" 
                  },
                  {
                    label: language === "mr" ? "३०-दिवसांचा कल" : "30-Day Trend",
                    value: `${data.trend.dir === "up" ? "+" : ""}${data.trend.pct}%`,
                    icon: trendArrow(data.trend.dir),
                    sub: language === "mr" ? "मागील महिन्याच्या तुलनेत" : "vs last month",
                    color: trendColor(data.trend.dir)
                  },
                ].map((s, i) => (
                  <div key={i} className="market-stat-card">
                    <div className="market-stat-icon">{s.icon}</div>
                    <div className="market-stat-value" style={{ color: s.color || "var(--text-dark)" }}>
                      {s.value}
                    </div>
                    <div className="market-stat-label">{s.label}</div>
                    <div className="market-stat-sub">{s.sub}</div>
                  </div>
                ))}
              </div>

              {/* Recommendation Banner */}
              {localizedRec && recStyle && (
                <div
                  className="market-rec-banner"
                  style={{ background: recStyle.bg, borderColor: recStyle.border }}
                >
                  <div
                    className="market-rec-action"
                    style={{ background: recStyle.text, color: "white" }}
                  >
                    {localizedRec.action}
                  </div>
                  <p className="market-rec-reason" style={{ color: recStyle.text }}>
                    {localizedRec.reason}
                  </p>
                </div>
              )}

              {/* Price Prediction Forecast Section */}
              <div className="card" style={{ marginBottom: 20 }}>
                <h3 style={{ fontWeight: 800, marginBottom: 8, display: "flex", alignItems: "center", gap: 8 }}>
                  {t("mandiForecastTitle")}
                </h3>
                <p style={{ color: "var(--text-muted)", fontSize: "0.9rem", marginBottom: 16 }}>
                  {t("mandiForecastDesc")}
                </p>

                <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap", marginBottom: 20 }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    <label style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text-muted)" }}>
                      {t("mandiForecastSelect")}
                    </label>
                    <select
                      className="input"
                      style={{ padding: "8px 12px", width: 180 }}
                      value={forecastPeriod}
                      onChange={e => setForecastPeriod(e.target.value)}
                    >
                      <option value="7">7 {language === "mr" ? "दिवस" : "Days"}</option>
                      <option value="15">15 {language === "mr" ? "दिवस" : "Days"}</option>
                      <option value="30">30 {language === "mr" ? "दिवस" : "Days"}</option>
                    </select>
                  </div>

                  <button
                    className="button"
                    style={{ alignSelf: "flex-end", padding: "10px 18px" }}
                    onClick={handleRunForecast}
                    disabled={isAnalyzing}
                  >
                    {isAnalyzing ? t("loading") : t("mandiForecastBtn")}
                  </button>
                </div>

                {isAnalyzing && (
                  <div style={{ padding: "20px 0", textAlign: "center" }}>
                    <div className="market-spinner" style={{ margin: "0 auto 10px auto" }} />
                    <p style={{ fontSize: "0.9rem", color: "var(--text-muted)" }}>
                      {language === "mr" ? "ऐतिहासिक आवक आणि हवामान अंदाज विश्लेषण सुरू आहे..." : "Analyzing historical mandi arrivals and forecast models..."}
                    </p>
                  </div>
                )}

                {forecastResult && !isAnalyzing && (
                  <div style={{
                    padding: 20,
                    borderRadius: "var(--border-radius)",
                    background: "rgba(34, 197, 94, 0.05)",
                    border: "1px solid var(--border-color)",
                    marginTop: 12
                  }}>
                    <h4 style={{ fontWeight: 700, fontSize: "1.1rem", marginBottom: 12, color: "var(--primary)" }}>
                      🎯 {t("mandiForecastResult")} ({forecastPeriod} {language === "mr" ? "दिवस" : "Days"})
                    </h4>
                    
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16 }}>
                      <div>
                        <div style={{ fontSize: "0.85rem", color: "var(--text-muted)", fontWeight: 600 }}>
                          {t("mandiForecastSentiment")}
                        </div>
                        <div style={{ fontSize: "1.2rem", fontWeight: 800, marginTop: 4 }}>
                          {getSentimentLabel(forecastResult.sentiment)}
                        </div>
                      </div>

                      <div>
                        <div style={{ fontSize: "0.85rem", color: "var(--text-muted)", fontWeight: 600 }}>
                          {t("mandiForecastExpected")}
                        </div>
                        <div style={{ fontSize: "1.2rem", fontWeight: 800, marginTop: 4, color: "var(--text-dark)" }}>
                          ₹{forecastResult.expectedMin} - ₹{forecastResult.expectedMax}
                        </div>
                      </div>
                    </div>

                    <div style={{ borderTop: "1px solid var(--border-color)", marginTop: 16, paddingTop: 16 }}>
                      <div style={{ fontSize: "0.85rem", color: "var(--text-muted)", fontWeight: 600, marginBottom: 4 }}>
                        {t("mandiForecastAdvise")}
                      </div>
                      <p style={{ fontSize: "0.95rem", lineHeight: 1.5, color: "var(--text-dark)", fontWeight: 500 }}>
                        {language === "mr" ? forecastResult.advisoryMr : forecastResult.advisoryEn}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Price Chart */}
              <div className="card" style={{ marginBottom: 20 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                  <h3 style={{ fontWeight: 800 }}>📊 {language === "mr" ? "३०-दिवसीय बाजार भाव इतिहास" : "30-Day Price History"}</h3>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <Sparkline data={data.priceTrend} color={trendColor(data.trend.dir)} width={80} height={28} />
                    <span style={{
                      fontWeight: 800,
                      fontSize: 14,
                      color: trendColor(data.trend.dir),
                      background: trendBg(data.trend.dir),
                      border: `1px solid ${trendBorder(data.trend.dir)}`,
                      padding: "4px 10px",
                      borderRadius: 20,
                    }}>
                      {trendArrow(data.trend.dir)} {data.trend.pct > 0 ? "+" : ""}{data.trend.pct}% (30d)
                    </span>
                  </div>
                </div>
                <PriceChart data={data.priceTrend} color={trendColor(data.trend.dir)} />
              </div>

              {/* Mandi Prices Table */}
              <div className="card" style={{ marginBottom: 20 }}>
                <div className="market-table-header">
                  <h3 style={{ fontWeight: 800 }}>🏪 {t("mandiPriceSpread")}</h3>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <label style={{ fontSize: 13, fontWeight: 600, color: "var(--text-muted)" }}>
                      {language === "mr" ? "क्रमवारी लावा:" : "Sort By:"}
                    </label>
                    <select
                      className="market-sort-select"
                      value={sortBy}
                      onChange={e => setSortBy(e.target.value)}
                    >
                      <option value="price-asc">{language === "mr" ? "किंमत: कमी → जास्त" : "Price: Low → High"}</option>
                      <option value="price-desc">{language === "mr" ? "किंमत: जास्त → कमी" : "Price: High → Low"}</option>
                      <option value="arrival">{language === "mr" ? "जास्त आवक" : "Highest Arrival"}</option>
                      <option value="change">{language === "mr" ? "उत्तम बदल" : "Best Change"}</option>
                    </select>
                  </div>
                </div>

                {/* Desktop Table */}
                <div className="market-table-wrap">
                  <table className="market-table">
                    <thead>
                      <tr>
                        <th>{language === "mr" ? "बाजार समिती (मंडी)" : "Mandi Name"}</th>
                        <th>{language === "mr" ? "राज्य" : "State"}</th>
                        <th>{language === "mr" ? "किमान ₹" : "Min ₹"}</th>
                        <th>{language === "mr" ? "अंदाजे ₹" : "Modal ₹"}</th>
                        <th>{language === "mr" ? "कमाल ₹" : "Max ₹"}</th>
                        <th>{language === "mr" ? "बदल" : "Change"}</th>
                        <th>{language === "mr" ? "आवक" : "Arrival"}</th>
                        <th>{language === "mr" ? "कल" : "Trend"}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedPrices.map((p, i) => (
                        <tr key={i} className={i === 0 && sortBy === "price-asc" ? "market-tr-best" : ""}>
                          <td>
                            <div style={{ fontWeight: 700, fontSize: 13.5 }}>{p.market}</div>
                            <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{p.city}</div>
                          </td>
                          <td style={{ fontSize: 12.5, color: "var(--text-muted)" }}>{p.state}</td>
                          <td style={{ fontWeight: 600, color: "#dc2626" }}>₹{p.minPrice}</td>
                          <td style={{ fontWeight: 800, fontSize: 15, color: "var(--text-dark)" }}>₹{p.pricePerQuintal}</td>
                          <td style={{ fontWeight: 600, color: "#16a34a" }}>₹{p.maxPrice}</td>
                          <td>
                            <span style={{
                              fontWeight: 700,
                              fontSize: 13,
                              color: trendColor(p.trend),
                              background: trendBg(p.trend),
                              padding: "2px 8px",
                              borderRadius: 12,
                              border: `1px solid ${trendBorder(p.trend)}`
                            }}>
                              {trendArrow(p.trend)} {p.change > 0 ? "+" : ""}{p.change}
                            </span>
                          </td>
                          <td style={{ fontSize: 13, color: "var(--text-muted)" }}>{p.arrivalTons}T</td>
                          <td>
                            <span style={{
                              fontSize: 11,
                              fontWeight: 700,
                              color: trendColor(p.trend),
                            }}>
                              {trendArrow(p.trend)} {p.changePct}%
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Card View */}
                <div className="market-mobile-cards">
                  {sortedPrices.map((p, i) => (
                    <div key={i} className={`market-mobile-card ${i === 0 && sortBy === "price-asc" ? "market-mobile-card-best" : ""}`}>
                      <div className="market-mobile-card-header">
                        <div>
                          <div style={{ fontWeight: 800, fontSize: 14 }}>{p.market}</div>
                          <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{p.city}, {p.state}</div>
                        </div>
                        <span style={{
                          fontWeight: 700,
                          fontSize: 12,
                          color: trendColor(p.trend),
                          background: trendBg(p.trend),
                          padding: "3px 8px",
                          borderRadius: 12,
                          border: `1px solid ${trendBorder(p.trend)}`
                        }}>
                          {trendArrow(p.trend)} {p.changePct}%
                        </span>
                      </div>
                      <div className="market-mobile-card-prices">
                        <div>
                          <div style={{ fontSize: 10, color: "var(--text-muted)", fontWeight: 600 }}>
                            {language === "mr" ? "किमान" : "MIN"}
                          </div>
                          <div style={{ fontWeight: 700, color: "#dc2626" }}>₹{p.minPrice}</div>
                        </div>
                        <div style={{ textAlign: "center" }}>
                          <div style={{ fontSize: 10, color: "var(--text-muted)", fontWeight: 600 }}>
                            {language === "mr" ? "अंदाजे" : "MODAL"}
                          </div>
                          <div style={{ fontWeight: 900, fontSize: 18, color: "var(--text-dark)" }}>₹{p.pricePerQuintal}</div>
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <div style={{ fontSize: 10, color: "var(--text-muted)", fontWeight: 600 }}>
                            {language === "mr" ? "कमाल" : "MAX"}
                          </div>
                          <div style={{ fontWeight: 700, color: "#16a34a" }}>₹{p.maxPrice}</div>
                        </div>
                      </div>
                      <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>
                        {language === "mr" ? `आवक: आज ${p.arrivalTons} टन` : `Arrival: ${p.arrivalTons}T today`}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* MSP Info Banner */}
              {data.minSupportPrice && (
                <div className="market-msp-banner">
                  <div className="market-msp-icon">🏛️</div>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 4 }}>
                      {language === "mr" ? `किमान आधारभूत हमीभाव (MSP) — ${t(data.crop) || data.crop}` : `Minimum Support Price (MSP) — ${data.crop}`}
                    </div>
                    <div style={{ fontSize: 13, opacity: 0.88 }}>
                      {language === "mr" 
                        ? `शासकीय हमीभाव प्रति क्विंटल ₹${data.minSupportPrice} निश्चित केला आहे. जर बाजारभाव यापेक्षा कमी झाले, तर नुकसान टाळण्यासाठी शासकीय केंद्रांवर विक्री करा.`
                        : `Government guaranteed MSP is ₹${data.minSupportPrice} per ${data.unit}. If mandi prices fall below MSP, sell to government procurement agencies to protect your income.`}
                    </div>
                  </div>
                  <div className="market-msp-price">₹{data.minSupportPrice}</div>
                </div>
              )}

              <div style={{ textAlign: "center", color: "var(--text-muted)", fontSize: 12, marginTop: 8 }}>
                {language === "mr" 
                  ? `कीमती थेट एपीएमसी मार्केट डेटावर आधारित आहेत · शेवटचे अपडेट: ${new Date(data.lastUpdated).toLocaleTimeString("mr-IN")}`
                  : `Prices are live-updated based on APMC market data · Last fetched: ${new Date(data.lastUpdated).toLocaleTimeString("en-IN")}`}
              </div>
            </>
          )}

          {/* Empty state */}
          {!data && !loading && !error && (
            <div className="market-empty card">
              <div style={{ fontSize: 56 }}>📊</div>
              <h3 style={{ marginTop: 12 }}>
                {language === "mr" ? "एक पीक निवडा" : "Select a Commodity"}
              </h3>
              <p style={{ color: "var(--text-muted)", fontSize: 14, marginTop: 6 }}>
                {language === "mr" ? "थेट बाजार भाव पाहण्यासाठी डावीकडील पॅनेलधून कोणतेही पीक निवडा." : "Choose any crop from the left panel to view live mandi prices."}
              </p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default Market;
