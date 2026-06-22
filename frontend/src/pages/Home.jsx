import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useLanguage } from "../context/LanguageContext";
import usePWAInstall from "../hooks/usePWAInstall";

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

const Home = () => {
  const { t, language } = useLanguage();
  const [selectedCrop, setSelectedCrop] = useState("Tomato");
  const [customCropName, setCustomCropName] = useState("");
  const [simDate, setSimDate] = useState(new Date().toISOString().split("T")[0]);
  const [timeline, setTimeline] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [bannerDismissed, setBannerDismissed] = useState(() =>
    localStorage.getItem('sk-banner-dismissed') === 'true'
  );
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const { isInstallable, isInstalled, installApp } = usePWAInstall();

  // Dynamic Features List (Translated)
  const FEATURES = [
    { icon: "🤖", title: t("chat"), desc: language === 'en' ? "Multilingual farming assistant in Hindi, English & 6+ languages" : "हिंदी, इंग्रजी आणि ६+ भाषांमध्ये बहुभाषिक शेती सहाय्यक", link: "/chat", color: "#dcfce7" },
    { icon: "🏥", title: language === 'en' ? "Agri-Health Portal" : "कृषी-आरोग्य पोर्टल", desc: language === 'en' ? "Plant & livestock disease diagnostics, soil advisory and alert systems" : "वनस्पती आणि जनावरांचे रोग निदान, माती सल्ला आणि रोग चेतावणी संदेश", link: "/agri-health", color: "#ffe4e6" },
    { icon: "🔬", title: language === 'en' ? "Disease Detection" : "रोग निदान", desc: language === 'en' ? "Upload leaf photos for instant AI-powered disease diagnosis" : "तात्काळ एआय-आधारित पीक रोग निदानासाठी पानावरील फोटो अपलोड करा", link: "/dashboard", color: "#fef3c7" },
    { icon: "📅", title: language === 'en' ? "Crop Planner" : "पीक नियोजक", desc: t("cropPlannerDesc"), link: "/ai-tools", color: "#dbeafe" },
    { icon: "🛒", title: t("bazaar"), desc: language === 'en' ? "Buy seeds, sell surplus crops — zero commission peer trading" : "बियाणे खरेदी करा, पीक विक्री करा — शून्य मध्यस्थी थेट व्यापार", link: "/marketplace", color: "#fce7f3" },
    { icon: "☀️", title: t("weather"), desc: t("impactAccuracy"), link: "/weather", color: "#ede9fe" },
    { icon: "📈", title: t("mandiPrices"), desc: t("mandiSubtitle"), link: "/market", color: "#d1fae5" },
    { icon: "🌱", title: language === 'en' ? "Crop Advisor" : "पीक सल्लागार", desc: language === 'en' ? "Predict optimal crops based on soil and location parameters" : "माती आणि हवामानाच्या आधारे फायदेशीर पिकांची शिफारस मिळवा", link: "/recommendations", color: "#fff7ed" },
  ];

  // Live clock
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const dismissBanner = () => {
    setBannerDismissed(true);
    localStorage.setItem('sk-banner-dismissed', 'true');
  };

  const handleSimulate = (e) => {
    e.preventDefault();
    let steps;
    let offsets;
    let cropName = selectedCrop;

    if (selectedCrop === "Other") {
      cropName = customCropName.trim() || t("customCrop");
      steps = [
        { title: `${cropName} ${language === 'en' ? 'Sowing' : 'पेरणी'}`, day: "Day 0", details: language === 'en' ? `Sow ${cropName} seeds in prepared field beds.` : `तयार केलेल्या शेतात ${cropName} बियाणे पेरा.` },
        { title: language === 'en' ? "Early Emergence Care" : "उगवण काळ काळजी", day: "Day 10", details: language === 'en' ? "Monitor germination and irrigate lightly." : "बीज उगवण्याची तपासणी करा आणि हलके पाणी द्या." },
        { title: language === 'en' ? "Vegetative Top Dressing" : "खतांचा डोस", day: "Day 40", details: language === 'en' ? "Apply fertilizers and manage weeds." : "पिकाला खत घाला आणि तण काढा." },
        { title: `${cropName} ${language === 'en' ? 'Harvest' : 'काढणी'}`, day: "Day 90", details: language === 'en' ? `Harvest ${cropName} crops.` : `${cropName} पिकाची काढणी करा.` }
      ];
      offsets = [0, 10, 40, 90];
    } else {
      steps = PREVIEWS[selectedCrop] || PREVIEWS["Tomato"];
      offsets = selectedCrop === "Tomato" ? [0, 25, 45, 95] 
              : selectedCrop === "Paddy" ? [0, 25, 55, 125]
              : [0, 21, 35, 130];
    }

    const base = new Date(simDate);
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

  return (
    <div className="app-container">

      {/* Offline Banner */}
      {!isOnline && (
        <div className="offline-banner">
          <span>📡 {language === 'en' ? 'You are offline. Some features may be limited.' : 'तुम्ही ऑफलाइन आहात. काही वैशिष्ट्ये मर्यादित असू शकतात.'}</span>
        </div>
      )}

      {/* Install App Banner */}
      {!bannerDismissed && !isInstalled && (
        <div className="install-banner">
          <span className="install-banner-icon">📲</span>
          <div className="install-banner-text">
            <strong>{t("installApp")}</strong>
            <span>{language === 'en' ? 'Get the full app experience on your phone!' : 'तुमच्या फोनवर ॲपचा संपूर्ण अनुभव मिळवा!'}</span>
          </div>
          <div className="install-banner-actions">
            <button className="install-banner-btn" onClick={installApp}>{language === 'en' ? 'Install' : 'स्थापित करा'}</button>
            <button className="install-banner-close" onClick={dismissBanner} aria-label="Dismiss">✕</button>
          </div>
        </div>
      )}

      {/* Hero Section */}
      <section className="hero-section" style={{ gridTemplateColumns: "1fr" }}>
        <div className="hero-content" style={{ textAlign: "center", margin: "0 auto", maxWidth: 700 }}>
          <div className="hero-badge">{t("trustedFarmers")}</div>
          <h1 className="hero-title">{t("heroTitle")}</h1>
          <p className="hero-subtitle">
            {t("heroSubtitle")}
          </p>
          <div className="hero-actions" style={{ justifyContent: "center" }}>
            <Link to="/register">
              <button className="button hero-cta-primary">
                {t("getStarted")}
              </button>
            </Link>
            <Link to="/login">
              <button className="button hero-cta-secondary">
                {t("loginCta")}
              </button>
            </Link>
            {/* PWA Download App Button */}
            {!isInstalled && (
              <button
                className="button hero-download-btn"
                onClick={installApp}
                id="hero-download-app-btn"
              >
                {t("downloadApp")}
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Impact Numbers Grid */}
      <section className="stats-section">
        {[
          { value: "15,000+", label: t("impactFarmers"), icon: "👨‍🌾" },
          { value: "94.2%", label: t("impactAccuracy"), icon: "🎯" },
          { value: "500+ Tons", label: t("impactTraded"), icon: "🌾" },
          { value: "₹0", label: t("impactFees"), icon: "💰" },
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
          {t("featureTitle")}
        </h2>
        <p style={{ textAlign: "center", color: "var(--text-muted)", marginBottom: 24, fontSize: 14 }}>
          {t("featureSubtitle")}
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
          <h3 style={{ marginBottom: 6 }}>{t("cropPlanner")}</h3>
          <p style={{ color: "var(--text-muted)", fontSize: 13, marginBottom: 16 }}>
            {t("cropPlannerDesc")}
          </p>
          <form onSubmit={handleSimulate}>
            <label>{t("selectCrop")}</label>
            <select className="input" value={selectedCrop} onChange={(e) => setSelectedCrop(e.target.value)}>
              <option value="Tomato">Tomato</option>
              <option value="Paddy">Paddy / Rice</option>
              <option value="Wheat">Wheat</option>
              <option value="Other">{language === 'en' ? 'Other (Type custom name...)' : 'इतर (नाव प्रविष्ट करा...)'}</option>
            </select>
            
            {selectedCrop === "Other" && (
              <div style={{ marginTop: 8, marginBottom: 12 }}>
                <label style={{ fontSize: 12.5, fontWeight: 600 }}>{t("enterCustomCrop")}</label>
                <input
                  type="text"
                  className="input"
                  placeholder="e.g. Mustard, Cotton, Carrot"
                  value={customCropName}
                  onChange={(e) => setCustomCropName(e.target.value)}
                  required
                />
              </div>
            )}

            <label>{t("sowingDate")}</label>
            <input type="date" className="input" value={simDate} onChange={(e) => setSimDate(e.target.value)} />
            <button type="submit" className="button" style={{ width: "100%" }}>
              {t("simulateButton")}
            </button>
          </form>
        </div>

        <div className="card" style={{ background: "var(--bg-card)" }}>
          <h3>{t("pipelinePreview")}</h3>
          {!timeline ? (
            <div style={{ padding: "40px 0", textAlign: "center", color: "var(--text-muted)" }}>
              <span style={{ fontSize: 40 }}>📅</span>
              <p style={{ marginTop: 12, fontSize: 13.5 }}>{t("pipelineConfigureDesc")}</p>
            </div>
          ) : (
            <div style={{ marginTop: 12 }}>
              <strong style={{ fontSize: 14, color: "var(--primary)" }}>
                {selectedCrop === "Other" ? (customCropName.trim() || "Custom Crop") : selectedCrop} {t("milestonesTitle")}
              </strong>
              <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 16 }}>
                {timeline.map((step, idx) => (
                  <div key={idx} style={{ display: "flex", gap: 12, borderLeft: "3px solid var(--primary-light)", paddingLeft: 12, paddingBottom: 6 }}>
                    <div>
                      <span style={{ background: "var(--primary-light)", color: "var(--primary-hover)", padding: "1px 6px", borderRadius: 12, fontSize: 10, fontWeight: 700 }}>
                        {step.day}
                      </span>
                      <strong style={{ display: "block", fontSize: 13.5, marginTop: 2 }}>{step.title}</strong>
                      <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{language === 'en' ? 'Est:' : 'अंदाजे:'} {step.dateStr}</span>
                      <p style={{ fontSize: 12, color: "var(--text-dark)", marginTop: 2 }}>{step.details}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>


    </div>
  );
};

export default Home;
