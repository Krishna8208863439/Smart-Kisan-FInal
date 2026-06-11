import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import usePWAInstall from "../hooks/usePWAInstall";

const FAQ_ITEMS = [
  {
    q: "How does the AI Crop Disease detection model work?",
    a: "It analyzes uploaded images of plant leaves to identify visual symptoms of blight, rust, or curls, combining it with crop-specific agronomy rules to suggest fungicide and water adjustments."
  },
  {
    q: "Do I need to pay to use the Kisan AI Copilot?",
    a: "No! The platform features a local rules-based engine which is 100% free. Users can optionally supply their own Google Gemini API keys to activate advanced multilingual AI conversations."
  },
  {
    q: "How does the Farmers Bazaar handle payments?",
    a: "It runs a direct peer-to-peer catalog system. Farmers list their price and contact, and buyers/merchants coordinate directly via the SMS-verified Kisan network with zero platform commissions."
  },
  {
    q: "Can I use Smart Kisan offline?",
    a: "Yes! Once installed as an app on your phone, Smart Kisan caches core pages for offline access. You can view your crop calendar, saved prices, and chatbot history even without internet."
  },
  {
    q: "What languages does the AI chatbot support?",
    a: "The Kisan AI Chatbot supports Hindi, English, Marathi, Punjabi, Telugu, Tamil, and more. Just type in your language and it will respond in kind."
  }
];

const PREVIEWS = {
  Tomato: [
    { title: "Sowing in Nursery Bed", day: "Day 0", details: "Prepare fine soil bed and sow seeds 0.5 cm deep." },
    { title: "Transplanting Seedlings", day: "Day 25", details: "Shift healthy seedlings to the main field with proper row spacing." },
    { title: "Top Dressing (NPK)", day: "Day 45", details: "Apply targeted nitrogen and potassium fertilizers around root zones." },
    { title: "Fruiting & Harvesting", day: "Day 95", details: "Begin harvesting firm, ripe red tomatoes." }
  ],
  Paddy: [
    { title: "Seed Soaking & Sprouting", day: "Day 0", details: "Soak paddy seeds for 24 hours to accelerate sprouting." },
    { title: "Seedling Nursery Pulling", day: "Day 25", details: "Uproot nursery seedlings and transplant into puddled clay fields." },
    { title: "Tillering Phase Weeding", day: "Day 55", details: "Ensure standing water depth of 5cm; clean out weeds." },
    { title: "Harvesting Paddy Crops", day: "Day 125", details: "Drain the fields 10 days before harvesting dry golden grains." }
  ],
  Wheat: [
    { title: "Seed Treatment & Sowing", day: "Day 0", details: "Treat seeds and sow in rows spaced at 22 cm." },
    { title: "First Crown Root Irrigation", day: "Day 21", details: "Irrigate the field - critical crown root initiation phase." },
    { title: "Tillering Phase Top Dressing", day: "Day 35", details: "Apply Urea fertilizer to boost tillers density." },
    { title: "Maturity & Combines Harvesting", day: "Day 130", details: "Harvest mature dry wheat heads." }
  ]
};

const FEATURES = [
  { icon: "🤖", title: "AI Kisan Chatbot", desc: "Multilingual farming assistant in Hindi, English & 6+ languages", link: "/chat", color: "#dcfce7" },
  { icon: "🔬", title: "Disease Detection", desc: "Upload leaf photos for instant AI-powered disease diagnosis", link: "/dashboard", color: "#fef3c7" },
  { icon: "📅", title: "Crop Planner", desc: "Day-by-day sowing calendar from nursery to harvest", link: "/ai-tools", color: "#dbeafe" },
  { icon: "🛒", title: "Farmers Bazaar", desc: "Buy seeds, sell surplus crops — zero commission peer trading", link: "/marketplace", color: "#fce7f3" },
  { icon: "☀️", title: "Weather Forecast", desc: "3-day regional weather to optimize sowing & watering", link: "/weather", color: "#ede9fe" },
  { icon: "📈", title: "Mandi Prices", desc: "Real-time agricultural commodity prices from local mandis", link: "/market", color: "#d1fae5" },
];

const Home = () => {
  const [selectedCrop, setSelectedCrop] = useState("Tomato");
  const [simDate, setSimDate] = useState(new Date().toISOString().split("T")[0]);
  const [timeline, setTimeline] = useState(null);
  const [openFaq, setOpenFaq] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [bannerDismissed, setBannerDismissed] = useState(() =>
    localStorage.getItem('sk-banner-dismissed') === 'true'
  );
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const { isInstallable, isInstalled, installApp } = usePWAInstall();

  // Live clock
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Online/offline detection
  useEffect(() => {
    const onOnline = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  const dismissBanner = () => {
    setBannerDismissed(true);
    localStorage.setItem('sk-banner-dismissed', 'true');
  };

  const handleSimulate = (e) => {
    e.preventDefault();
    const steps = PREVIEWS[selectedCrop] || PREVIEWS["Tomato"];
    const base = new Date(simDate);
    const offsets = [0, 25, 45, 95];
    const calculated = steps.map((s, idx) => {
      const stepDate = new Date(base);
      stepDate.setDate(stepDate.getDate() + (offsets[idx] || 0));
      return {
        ...s,
        dateStr: stepDate.toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" })
      };
    });
    setTimeline(calculated);
  };

  const timeStr = currentTime.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  const dateStr = currentTime.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  return (
    <div className="app-container">

      {/* Offline Banner */}
      {!isOnline && (
        <div className="offline-banner">
          <span>📡 You are offline. Some features may be limited.</span>
        </div>
      )}

      {/* Install App Banner */}
      {!bannerDismissed && !isInstalled && (
        <div className="install-banner">
          <span className="install-banner-icon">📲</span>
          <div className="install-banner-text">
            <strong>Install Smart Kisan</strong>
            <span>Get the full app experience on your phone!</span>
          </div>
          <div className="install-banner-actions">
            <button className="install-banner-btn" onClick={installApp}>Install</button>
            <button className="install-banner-close" onClick={dismissBanner} aria-label="Dismiss">✕</button>
          </div>
        </div>
      )}

      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-content">
          <div className="hero-badge">🌾 Trusted by 15,000+ Farmers</div>
          <h1 className="hero-title">Digital Agriculture<br />Companion</h1>
          <p className="hero-subtitle">
            Smart Kisan bridges traditional wisdom with modern AI. Leverage crop simulators, visual disease diagnostics, and trading pipelines to maximize your farm's potential.
          </p>
          <div className="hero-actions">
            <Link to="/register">
              <button className="button hero-cta-primary">
                Get Started Free 🚀
              </button>
            </Link>
            <Link to="/login">
              <button className="button hero-cta-secondary">
                Log In
              </button>
            </Link>
            {/* PWA Download App Button */}
            {!isInstalled && (
              <button
                className="button hero-download-btn"
                onClick={installApp}
                id="hero-download-app-btn"
              >
                📲 Download App
              </button>
            )}
            {isInstalled && (
              <div className="hero-installed-badge">
                ✅ App Installed!
              </div>
            )}
          </div>

          {/* How to Install on iOS */}
          <div className="ios-install-hint">
            <span>📱 iPhone: Tap Share → "Add to Home Screen"</span>
          </div>
        </div>

        {/* Live Clock Widget */}
        <div className="hero-clock-widget">
          <div className="hero-clock-time">{timeStr}</div>
          <div className="hero-clock-date">{dateStr}</div>
          <div className="hero-clock-status">
            <span className={`status-dot ${isOnline ? 'status-online' : 'status-offline'}`} />
            {isOnline ? 'Connected' : 'Offline'}
          </div>
        </div>
      </section>

      {/* Impact Numbers Grid */}
      <section className="stats-section">
        {[
          { value: "15,000+", label: "Registered Farmers", icon: "👨‍🌾" },
          { value: "94.2%", label: "Diagnosis Accuracy", icon: "🎯" },
          { value: "500+ Tons", label: "Harvest Traded", icon: "🌾" },
          { value: "₹0", label: "Commission Fees", icon: "💰" },
        ].map((stat, idx) => (
          <div key={idx} className="stat-card">
            <div className="stat-icon">{stat.icon}</div>
            <div className="stat-value">{stat.value}</div>
            <div className="stat-label">{stat.label}</div>
          </div>
        ))}
      </section>

      {/* Features Grid */}
      <section style={{ marginBottom: 36 }}>
        <h2 style={{ textAlign: "center", marginBottom: 8, fontSize: 24, fontWeight: 800 }}>
          Everything a Farmer Needs 🌱
        </h2>
        <p style={{ textAlign: "center", color: "var(--text-muted)", marginBottom: 24, fontSize: 14 }}>
          One platform, all your farming needs covered.
        </p>
        <div className="features-grid">
          {FEATURES.map((feat, idx) => (
            <Link to={feat.link} key={idx} style={{ textDecoration: "none" }}>
              <div className="feature-card" style={{ "--feat-bg": feat.color }}>
                <div className="feature-card-icon">{feat.icon}</div>
                <h3 className="feature-card-title">{feat.title}</h3>
                <p className="feature-card-desc">{feat.desc}</p>
                <span className="feature-card-arrow">→</span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Interactive Crop Planner + Timeline */}
      <section className="grid-2" style={{ marginBottom: 36 }}>
        <div className="card">
          <h3 style={{ marginBottom: 6 }}>🌱 Interactive Crop Planner</h3>
          <p style={{ color: "var(--text-muted)", fontSize: 13, marginBottom: 16 }}>
            Select a crop and sowing date to preview your growth schedule!
          </p>
          <form onSubmit={handleSimulate}>
            <label>Select Crop</label>
            <select className="input" value={selectedCrop} onChange={(e) => setSelectedCrop(e.target.value)}>
              <option value="Tomato">Tomato</option>
              <option value="Paddy">Paddy / Rice</option>
              <option value="Wheat">Wheat</option>
            </select>
            <label>Estimated Sowing Date</label>
            <input type="date" className="input" value={simDate} onChange={(e) => setSimDate(e.target.value)} />
            <button type="submit" className="button" style={{ width: "100%" }}>
              Simulate Growth Timeline 📈
            </button>
          </form>
        </div>

        <div className="card" style={{ background: "var(--bg-card)" }}>
          <h3>Growth Pipeline Preview</h3>
          {!timeline ? (
            <div style={{ padding: "40px 0", textAlign: "center", color: "var(--text-muted)" }}>
              <span style={{ fontSize: 40 }}>📅</span>
              <p style={{ marginTop: 12, fontSize: 13.5 }}>Configure parameters on the left and simulate to view growth steps.</p>
            </div>
          ) : (
            <div style={{ marginTop: 12 }}>
              <strong style={{ fontSize: 14, color: "var(--primary)" }}>{selectedCrop} Sowing Milestones:</strong>
              <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 16 }}>
                {timeline.map((step, idx) => (
                  <div key={idx} style={{ display: "flex", gap: 12, borderLeft: "3px solid var(--primary-light)", paddingLeft: 12, paddingBottom: 6 }}>
                    <div>
                      <span style={{ background: "var(--primary-light)", color: "var(--primary-hover)", padding: "1px 6px", borderRadius: 12, fontSize: 10, fontWeight: 700 }}>
                        {step.day}
                      </span>
                      <strong style={{ display: "block", fontSize: 13.5, marginTop: 2 }}>{step.title}</strong>
                      <span style={{ fontSize: 11, color: "var(--text-muted)" }}>Est: {step.dateStr}</span>
                      <p style={{ fontSize: 12, color: "var(--text-dark)", marginTop: 2 }}>{step.details}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* App Download CTA Section */}
      <section className="download-cta-section">
        <div className="download-cta-content">
          <h2 className="download-cta-title">📱 Take Smart Kisan Everywhere</h2>
          <p className="download-cta-desc">
            Install Smart Kisan as a native app on your Android or iPhone. Works offline, loads instantly, no app store needed!
          </p>
          <div className="download-cta-steps">
            <div className="download-step">
              <div className="download-step-num">1</div>
              <div>
                <strong>Tap Install App</strong>
                <span>Click the button below</span>
              </div>
            </div>
            <div className="download-step">
              <div className="download-step-num">2</div>
              <div>
                <strong>Confirm Install</strong>
                <span>Browser shows a prompt</span>
              </div>
            </div>
            <div className="download-step">
              <div className="download-step-num">3</div>
              <div>
                <strong>Launch from Home Screen</strong>
                <span>Opens like a native app!</span>
              </div>
            </div>
          </div>
          <div className="download-cta-buttons">
            {!isInstalled ? (
              <button
                className="button download-cta-btn"
                onClick={installApp}
                id="download-cta-install-btn"
              >
                📲 Download App — Free
              </button>
            ) : (
              <div className="download-installed-msg">
                ✅ Smart Kisan is installed on your device!
              </div>
            )}
            <div className="download-manual-hint">
              <span>🍎 iPhone/iPad: Safari → Share → "Add to Home Screen"</span>
              <span>🤖 Android Chrome: Menu → "Add to Home screen"</span>
            </div>
          </div>
        </div>
        <div className="download-cta-visual">
          <div className="phone-mockup">
            <div className="phone-screen">
              <div style={{ fontSize: 48, marginBottom: 8 }}>🌾</div>
              <div style={{ fontWeight: 800, fontSize: 14 }}>Smart Kisan</div>
              <div style={{ fontSize: 11, opacity: 0.7, marginTop: 4 }}>AI Farming Companion</div>
              <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 6 }}>
                {["🤖 AI Chatbot", "🔬 Disease Scan", "📅 Crop Calendar"].map(f => (
                  <div key={f} style={{ background: "rgba(255,255,255,0.2)", borderRadius: 8, padding: "6px 12px", fontSize: 11, fontWeight: 600 }}>{f}</div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="card" style={{ marginBottom: 24 }}>
        <h3 style={{ marginBottom: 16 }}>❓ Frequently Asked Questions</h3>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {FAQ_ITEMS.map((item, idx) => (
            <div key={idx} style={{ border: "1.5px solid var(--border-color)", borderRadius: 8, overflow: "hidden" }}>
              <div
                onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                style={{
                  background: openFaq === idx ? "var(--primary-light)" : "var(--bg-card)",
                  padding: "12px 16px",
                  cursor: "pointer",
                  fontWeight: 700,
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  fontSize: 14.5,
                  color: "var(--text-dark)"
                }}
              >
                <span>{item.q}</span>
                <span style={{ transition: "transform 0.2s", transform: openFaq === idx ? "rotate(45deg)" : "none" }}>➕</span>
              </div>
              {openFaq === idx && (
                <div style={{ padding: 16, background: "var(--bg-card)", fontSize: 13.5, color: "var(--text-muted)", borderTop: "1.5px solid var(--border-color)", lineHeight: 1.6 }}>
                  {item.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

export default Home;
