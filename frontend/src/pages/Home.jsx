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

const FARMER_IMAGE_URL = "https://images.unsplash.com/photo-1625246333195-78d9c38ad449?auto=format&fit=crop&w=1200&q=80";

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

  // Live clock
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Online/offline tracking
  useEffect(() => {
    const on = () => setIsOnline(true);
    const off = () => setIsOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => { window.removeEventListener("online", on); window.removeEventListener("offline", off); };
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

      {/* ===== HERO SECTION with Smart Farming Image ===== */}
      <section className="hero-section" style={{
        position: "relative",
        borderRadius: 20,
        overflow: "hidden",
        minHeight: 480,
        display: "flex",
        alignItems: "center",
        marginBottom: 36,
        background: "linear-gradient(135deg, #052e16, #14532d)"
      }}>
        {/* Background farming image */}
        <div style={{
          position: "absolute",
          inset: 0,
          backgroundImage: `url(${FARMER_IMAGE_URL})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          opacity: 0.35,
          zIndex: 0
        }} />
        {/* Gradient overlay */}
        <div style={{
          position: "absolute",
          inset: 0,
          background: "linear-gradient(90deg, rgba(5,46,22,0.92) 0%, rgba(5,46,22,0.6) 60%, rgba(5,46,22,0.25) 100%)",
          zIndex: 1
        }} />

        {/* Content */}
        <div style={{
          position: "relative",
          zIndex: 2,
          padding: "48px 48px",
          maxWidth: 700,
          color: "white"
        }}>
          {/* Smart Kisan Badge */}
          <div style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            background: "rgba(255,255,255,0.12)",
            backdropFilter: "blur(10px)",
            border: "1px solid rgba(255,255,255,0.25)",
            borderRadius: 100,
            padding: "6px 16px",
            fontSize: 13,
            fontWeight: 700,
            marginBottom: 20,
            color: "#86efac"
          }}>
            🌾 Smart Kisan — {language === 'en' ? 'AI Farming Platform' : 'एआय शेती मंच'}
          </div>

          <h1 style={{
            fontSize: "clamp(2rem, 5vw, 3.2rem)",
            fontWeight: 900,
            lineHeight: 1.15,
            margin: "0 0 16px 0",
            color: "white",
            letterSpacing: "-0.02em"
          }}>
            {language === 'en' ? (
              <>🌱 Smart Kisan <br/><span style={{ color: "#86efac" }}>AI Farming Assistant</span></>
            ) : (
              <>🌱 स्मार्ट किसान<br/><span style={{ color: "#86efac" }}>एआय शेती सहाय्यक</span></>
            )}
          </h1>

          <p style={{
            fontSize: "clamp(1rem, 2vw, 1.15rem)",
            color: "rgba(255,255,255,0.85)",
            marginBottom: 32,
            lineHeight: 1.6,
            maxWidth: 540
          }}>
            {language === 'en'
              ? "Empowering 15,000+ Indian farmers with AI-powered crop diagnostics, market intelligence, and precision irrigation tools."
              : "एआय-आधारित पीक निदान, बाजार माहिती आणि अचूक सिंचन साधनांद्वारे १५,०००+ भारतीय शेतकऱ्यांना सक्षम बनवत आहे."}
          </p>

          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <Link to="/register">
              <button className="button" style={{
                background: "linear-gradient(135deg, #16a34a, #15803d)",
                padding: "14px 28px",
                fontSize: 16,
                fontWeight: 700,
                borderRadius: 12,
                boxShadow: "0 4px 20px rgba(22,163,74,0.4)"
              }}>
                {t("getStarted")} →
              </button>
            </Link>
            <Link to="/login">
              <button className="button" style={{
                background: "rgba(255,255,255,0.12)",
                backdropFilter: "blur(10px)",
                border: "1px solid rgba(255,255,255,0.3)",
                color: "white",
                padding: "14px 28px",
                fontSize: 16,
                fontWeight: 700,
                borderRadius: 12
              }}>
                {t("loginCta")}
              </button>
            </Link>
            {!isInstalled && (
              <button
                className="button"
                onClick={installApp}
                id="hero-download-app-btn"
                style={{
                  background: "rgba(255,255,255,0.08)",
                  border: "1px solid rgba(255,255,255,0.2)",
                  color: "rgba(255,255,255,0.8)",
                  padding: "14px 20px",
                  fontSize: 15,
                  borderRadius: 12
                }}
              >
                📲 {t("downloadApp")}
              </button>
            )}
          </div>
        </div>
      </section>

    </div>
  );
};

export default Home;
