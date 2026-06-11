import { useState, useEffect, useCallback, useRef } from "react";
import api from "../api";

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

  const rec = data?.recommendation;
  const recStyle = rec ? recColors[rec.color] || recColors.info : null;

  return (
    <div className="app-container">

      {/* Header */}
      <div className="market-header-card">
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 900, color: "white", marginBottom: 4 }}>
            📈 Live Mandi Prices
          </h1>
          <p style={{ opacity: 0.88, fontSize: 14, color: "white" }}>
            Real-time agricultural commodity prices from 15+ APMC mandis across India
          </p>
        </div>
        <div className="market-header-actions">
          <div className="market-refresh-toggle">
            <span style={{ fontSize: 12, fontWeight: 700, opacity: 0.9, color: "white" }}>Auto Refresh</span>
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
              🔄 {lastRefresh.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
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
              placeholder="Search crop..."
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
                {cat}
              </button>
            ))}
          </div>

          {/* Watchlist */}
          {watchlist.length > 0 && (
            <div className="market-watchlist-section">
              <div className="market-section-label">⭐ Watchlist</div>
              {watchlist.map(name => {
                const crop = CROP_LIST.find(c => c.name === name);
                return crop ? (
                  <button
                    key={name}
                    className={`market-crop-btn ${selectedCrop === name ? "market-crop-btn-active" : ""}`}
                    onClick={() => setSelectedCrop(name)}
                  >
                    <span>{crop.icon}</span>
                    <span className="market-crop-btn-name">{name}</span>
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
          <div className="market-section-label">All Commodities</div>
          <div className="market-crop-list">
            {filteredCrops.map(crop => (
              <button
                key={crop.name}
                className={`market-crop-btn ${selectedCrop === crop.name ? "market-crop-btn-active" : ""}`}
                onClick={() => setSelectedCrop(crop.name)}
              >
                <span style={{ fontSize: 18 }}>{crop.icon}</span>
                <span className="market-crop-btn-name">{crop.name}</span>
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
              <p style={{ fontSize: 13, color: "var(--text-muted)", padding: "12px 8px" }}>No crops found.</p>
            )}
          </div>
        </aside>

        {/* ── RIGHT CONTENT ── */}
        <main className="market-content">
          {loading && (
            <div className="market-loading">
              <div className="market-spinner" />
              <p>Fetching live mandi prices...</p>
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
                    <h2 className="market-crop-name">{data.crop}</h2>
                    <div className="market-crop-meta">
                      <span className="market-badge">{data.category}</span>
                      <span className="market-badge market-badge-blue">per {data.unit}</span>
                      {data.minSupportPrice && (
                        <span className="market-badge market-badge-amber">
                          MSP ₹{data.minSupportPrice}
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
                    🔄 Refresh
                  </button>
                  <button
                    className={`button market-watchlist-btn ${watchlist.includes(selectedCrop) ? "market-watchlist-btn-active" : ""}`}
                    onClick={() => toggleWatchlist(selectedCrop)}
                  >
                    {watchlist.includes(selectedCrop) ? "⭐ Watching" : "☆ Watch"}
                  </button>
                </div>
              </div>

              {/* Stats Row */}
              <div className="market-stats-row">
                {[
                  { label: "Avg. Mandi Price", value: `₹${data.stats.avgPrice}`, icon: "📊", sub: "Per quintal" },
                  { label: "Lowest Price", value: `₹${data.stats.minPrice}`, icon: "📉", sub: data.stats.bestBuyMandi, color: "#dc2626" },
                  { label: "Highest Price", value: `₹${data.stats.maxPrice}`, icon: "📈", sub: data.stats.bestSellMandi, color: "#16a34a" },
                  { label: "Price Spread", value: `₹${data.stats.spread}`, icon: "↔️", sub: "Max - Min" },
                  { label: "Total Arrivals", value: `${data.stats.totalArrival}T`, icon: "🚛", sub: "Today across mandis" },
                  {
                    label: "30-Day Trend",
                    value: `${data.trend.dir === "up" ? "+" : ""}${data.trend.pct}%`,
                    icon: trendArrow(data.trend.dir),
                    sub: "vs last month",
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
              {rec && recStyle && (
                <div
                  className="market-rec-banner"
                  style={{ background: recStyle.bg, borderColor: recStyle.border }}
                >
                  <div
                    className="market-rec-action"
                    style={{ background: recStyle.text, color: "white" }}
                  >
                    {rec.action}
                  </div>
                  <p className="market-rec-reason" style={{ color: recStyle.text }}>
                    {rec.reason}
                  </p>
                </div>
              )}

              {/* Price Chart */}
              <div className="card" style={{ marginBottom: 20 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                  <h3 style={{ fontWeight: 800 }}>📊 30-Day Price History</h3>
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
                  <h3 style={{ fontWeight: 800 }}>🏪 Live Mandi Prices</h3>
                  <select
                    className="market-sort-select"
                    value={sortBy}
                    onChange={e => setSortBy(e.target.value)}
                  >
                    <option value="price-asc">Price: Low → High</option>
                    <option value="price-desc">Price: High → Low</option>
                    <option value="arrival">Highest Arrival</option>
                    <option value="change">Best Change</option>
                  </select>
                </div>

                {/* Desktop Table */}
                <div className="market-table-wrap">
                  <table className="market-table">
                    <thead>
                      <tr>
                        <th>Mandi Name</th>
                        <th>State</th>
                        <th>Min ₹</th>
                        <th>Modal ₹</th>
                        <th>Max ₹</th>
                        <th>Change</th>
                        <th>Arrival</th>
                        <th>Trend</th>
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
                          <div style={{ fontSize: 10, color: "var(--text-muted)", fontWeight: 600 }}>MIN</div>
                          <div style={{ fontWeight: 700, color: "#dc2626" }}>₹{p.minPrice}</div>
                        </div>
                        <div style={{ textAlign: "center" }}>
                          <div style={{ fontSize: 10, color: "var(--text-muted)", fontWeight: 600 }}>MODAL</div>
                          <div style={{ fontWeight: 900, fontSize: 18, color: "var(--text-dark)" }}>₹{p.pricePerQuintal}</div>
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <div style={{ fontSize: 10, color: "var(--text-muted)", fontWeight: 600 }}>MAX</div>
                          <div style={{ fontWeight: 700, color: "#16a34a" }}>₹{p.maxPrice}</div>
                        </div>
                      </div>
                      <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>
                        Arrival: {p.arrivalTons}T today
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
                      Minimum Support Price (MSP) — {data.crop}
                    </div>
                    <div style={{ fontSize: 13, opacity: 0.88 }}>
                      Government guaranteed MSP is <strong>₹{data.minSupportPrice} per {data.unit}</strong>.
                      If mandi prices fall below MSP, sell to government procurement agencies (FCI/NAFED) to protect your income.
                    </div>
                  </div>
                  <div className="market-msp-price">₹{data.minSupportPrice}</div>
                </div>
              )}

              <div style={{ textAlign: "center", color: "var(--text-muted)", fontSize: 12, marginTop: 8 }}>
                📡 Prices are live-updated based on APMC market data · Last fetched: {new Date(data.lastUpdated).toLocaleTimeString("en-IN")}
              </div>
            </>
          )}

          {/* Empty state */}
          {!data && !loading && !error && (
            <div className="market-empty card">
              <div style={{ fontSize: 56 }}>📊</div>
              <h3 style={{ marginTop: 12 }}>Select a Commodity</h3>
              <p style={{ color: "var(--text-muted)", fontSize: 14, marginTop: 6 }}>
                Choose any crop from the left panel to view live mandi prices.
              </p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default Market;
