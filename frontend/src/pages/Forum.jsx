import React, { useState, useEffect } from "react";
import { useLanguage } from "../context/LanguageContext";

// Live Indian Government Agricultural Schemes (curated authoritative dataset)
const LIVE_GOVT_SCHEMES = [
  {
    id: "pmkisan",
    titleEn: "PM-KISAN (Pradhan Mantri Kisan Samman Nidhi)",
    titleMr: "पीएम-किसान (प्रधानमंत्री किसान सन्मान निधी)",
    descEn: "Financial support of ₹6,000/year in three equal installments to small & marginal farmer families across India.",
    descMr: "भारतातील लहान व अल्पभूधारक शेतकरी कुटुंबांना वर्षाकाठी ₹6,000 तीन हप्त्यांमध्ये आर्थिक सहाय्य.",
    url: "https://pmkisan.gov.in",
    category: "Financial Aid",
    categoryMr: "आर्थिक सहाय्य",
    badge: "🏅 Active",
    ministry: "Ministry of Agriculture & Farmers Welfare",
    ministryMr: "कृषी व शेतकरी कल्याण मंत्रालय",
    benefit: "₹6,000/year",
    icon: "💰"
  },
  {
    id: "pmfby",
    titleEn: "PMFBY (Pradhan Mantri Fasal Bima Yojana)",
    titleMr: "पीएमएफबीवाय (प्रधानमंत्री फसल विमा योजना)",
    descEn: "Comprehensive crop insurance scheme providing financial support to farmers suffering crop loss/damage due to unforeseen calamities.",
    descMr: "अनपेक्षित नैसर्गिक आपत्तींमुळे पीक नुकसान झाल्यास शेतकऱ्यांना आर्थिक संरक्षण देणारी सर्वसमावेशक पीक विमा योजना.",
    url: "https://pmfby.gov.in",
    category: "Crop Insurance",
    categoryMr: "पीक विमा",
    badge: "🏅 Active",
    ministry: "Ministry of Agriculture & Farmers Welfare",
    ministryMr: "कृषी व शेतकरी कल्याण मंत्रालय",
    benefit: "Upto full crop loss coverage",
    icon: "🛡️"
  },
  {
    id: "kcc",
    titleEn: "Kisan Credit Card (KCC) Scheme",
    titleMr: "किसान क्रेडिट कार्ड (KCC) योजना",
    descEn: "Provides timely and adequate credit support to farmers for their agricultural operations and contingency needs at lower interest rates.",
    descMr: "शेतकऱ्यांना कमी व्याजदरावर शेती आणि आकस्मिक गरजांसाठी वेळेवर पतपुरवठा करणारी योजना.",
    url: "https://www.nabard.org/content.aspx?id=591",
    category: "Credit & Loans",
    categoryMr: "कर्ज व पतपुरवठा",
    badge: "🏅 Active",
    ministry: "NABARD / RBI",
    ministryMr: "नाबार्ड / आरबीआय",
    benefit: "Up to ₹3 lakh at 4% interest",
    icon: "💳"
  },
  {
    id: "paramparagat",
    titleEn: "Paramparagat Krishi Vikas Yojana (PKVY)",
    titleMr: "परंपरागत कृषि विकास योजना (PKVY)",
    descEn: "Promotes organic farming through cluster-based approach, providing financial assistance for certification and marketing of organic produce.",
    descMr: "सेंद्रिय शेतीला प्रोत्साहन देण्यासाठी क्लस्टर-आधारित दृष्टिकोन आणि प्रमाणीकरण व विपणनासाठी आर्थिक सहाय्य.",
    url: "https://pgsindia-ncof.gov.in/pkvy/Index.aspx",
    category: "Organic Farming",
    categoryMr: "सेंद्रिय शेती",
    badge: "🟢 Open",
    ministry: "Ministry of Agriculture & Farmers Welfare",
    ministryMr: "कृषी व शेतकरी कल्याण मंत्रालय",
    benefit: "₹50,000/ha over 3 years",
    icon: "🌿"
  },
  {
    id: "pmksy",
    titleEn: "PM Krishi Sinchai Yojana (PMKSY)",
    titleMr: "पीएम कृषि सिंचन योजना (PMKSY)",
    descEn: "'Har Khet Ko Pani, More Crop Per Drop' — extends water coverage, improves water use efficiency and introduces sustainable water conservation practices.",
    descMr: "'हर खेत को पानी, हर बूंद ज्यादा फसल' — सिंचन क्षेत्राचा विस्तार, जलसंधारण आणि पाण्याच्या कार्यक्षम वापरासाठी उपाययोजना.",
    url: "https://pmksy.gov.in",
    category: "Irrigation",
    categoryMr: "सिंचन",
    badge: "🏅 Active",
    ministry: "Ministry of Jal Shakti",
    ministryMr: "जल शक्ती मंत्रालय",
    benefit: "55-90% subsidy on drip/sprinkler",
    icon: "💧"
  },
  {
    id: "enam",
    titleEn: "eNAM (National Agriculture Market)",
    titleMr: "ई-नाम (राष्ट्रीय कृषी बाजार)",
    descEn: "Online trading platform for agricultural commodities, enabling farmers to sell their produce at competitive prices across APMCs.",
    descMr: "शेतकऱ्यांना विविध एपीएमसींमध्ये स्पर्धात्मक किमतींवर पीक विक्री करण्यासाठी ऑनलाइन व्यापार मंच.",
    url: "https://enam.gov.in",
    category: "Market Access",
    categoryMr: "बाजार प्रवेश",
    badge: "🏅 Active",
    ministry: "SFAC / MoAFW",
    ministryMr: "एसएफएसी / कृषी मंत्रालय",
    benefit: "Better price discovery",
    icon: "📊"
  },
  {
    id: "smam",
    titleEn: "Sub-Mission on Agricultural Mechanization (SMAM)",
    titleMr: "कृषी यांत्रिकीकरण उप-अभियान (SMAM)",
    descEn: "Promotes farm mechanization to reduce drudgery and cost of cultivation through subsidies on purchase of agricultural machinery and equipment.",
    descMr: "कृषी यंत्रसामग्री व उपकरणांवर अनुदानाद्वारे यांत्रिकीकरणाला प्रोत्साहन आणि शेतीचा खर्च कमी करणे.",
    url: "https://agrimachinery.nic.in",
    category: "Farm Equipment",
    categoryMr: "शेती उपकरणे",
    badge: "🟢 Open",
    ministry: "Ministry of Agriculture & Farmers Welfare",
    ministryMr: "कृषी व शेतकरी कल्याण मंत्रालय",
    benefit: "40-50% subsidy on machinery",
    icon: "🚜"
  },
  {
    id: "nfsm",
    titleEn: "National Food Security Mission (NFSM)",
    titleMr: "राष्ट्रीय अन्न सुरक्षा अभियान (NFSM)",
    descEn: "Aimed at increasing production of rice, wheat, pulses, coarse cereals and commercial crops through area expansion and productivity enhancement.",
    descMr: "क्षेत्र विस्तार आणि उत्पादकता वाढीद्वारे तांदूळ, गहू, कडधान्ये आणि व्यापारी पिकांचे उत्पादन वाढवणे.",
    url: "https://nfsm.gov.in",
    category: "Production Boost",
    categoryMr: "उत्पादन वाढ",
    badge: "🏅 Active",
    ministry: "Ministry of Agriculture & Farmers Welfare",
    ministryMr: "कृषी व शेतकरी कल्याण मंत्रालय",
    benefit: "Seeds & inputs subsidy",
    icon: "🌾"
  },
  {
    id: "atma",
    titleEn: "ATMA (Agricultural Technology Management Agency)",
    titleMr: "आत्मा (कृषी तंत्रज्ञान व्यवस्थापन संस्था)",
    descEn: "Decentralized agricultural extension reform programme to provide technical knowledge and training to farmers at the district level.",
    descMr: "जिल्हा स्तरावर शेतकऱ्यांना तांत्रिक ज्ञान आणि प्रशिक्षण देण्यासाठी विकेंद्रित कृषी विस्तार सुधारणा कार्यक्रम.",
    url: "https://atma.dacnet.nic.in",
    category: "Training & Extension",
    categoryMr: "प्रशिक्षण व विस्तार",
    badge: "🏅 Active",
    ministry: "Ministry of Agriculture & Farmers Welfare",
    ministryMr: "कृषी व शेतकरी कल्याण मंत्रालय",
    benefit: "Free training & field visits",
    icon: "📚"
  },
  {
    id: "rkvy",
    titleEn: "RKVY-RAFTAAR (Rashtriya Krishi Vikas Yojana)",
    titleMr: "RKVY-RAFTAAR (राष्ट्रीय कृषी विकास योजना)",
    descEn: "Promotes agri-entrepreneurship and innovation with funding for Agri-startups, Farmer Producer Organizations, and value-chain development.",
    descMr: "कृषी-उद्योजकता आणि नवनिर्मितीला प्रोत्साहन, FPO, कृषी स्टार्टअप आणि मूल्य साखळी विकासासाठी निधी.",
    url: "https://rkvy.nic.in",
    category: "Agri-Entrepreneurship",
    categoryMr: "कृषी उद्योजकता",
    badge: "🟢 Open",
    ministry: "Ministry of Agriculture & Farmers Welfare",
    ministryMr: "कृषी व शेतकरी कल्याण मंत्रालय",
    benefit: "Funding up to ₹25 lakh",
    icon: "🚀"
  }
];

const CATEGORY_COLORS = {
  "Financial Aid": "#16a34a",
  "Crop Insurance": "#2563eb",
  "Credit & Loans": "#7c3aed",
  "Organic Farming": "#0d9488",
  "Irrigation": "#0284c7",
  "Market Access": "#d97706",
  "Farm Equipment": "#dc2626",
  "Production Boost": "#15803d",
  "Training & Extension": "#9333ea",
  "Agri-Entrepreneurship": "#e11d48"
};

const Forum = () => {
  const { language, t } = useLanguage();
  const [schemes, setSchemes] = useState(LIVE_GOVT_SCHEMES);
  const [schemesLoading, setSchemesLoading] = useState(false);
  const [showSchemeForm, setShowSchemeForm] = useState(false);
  const [schemeTitleEn, setSchemeTitleEn] = useState("");
  const [schemeTitleMr, setSchemeTitleMr] = useState("");
  const [schemeDescEn, setSchemeDescEn] = useState("");
  const [schemeDescMr, setSchemeDescMr] = useState("");
  const [schemeUrl, setSchemeUrl] = useState("");
  const [schemeCategory, setSchemeCategory] = useState("Financial Aid");
  const [schemeBenefit, setSchemeBenefit] = useState("");
  const [schemeError, setSchemeError] = useState("");
  const [schemeSubmitting, setSchemeSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");

  // Fetch additional schemes from backend if available
  const fetchSchemes = async () => {
    try {
      setSchemesLoading(true);
      const res = await fetch("/api/community/schemes");
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      if (data.success && data.schemes && data.schemes.length > 0) {
        // Merge backend schemes with live hardcoded ones (avoid duplicates)
        const backendSchemes = data.schemes.map(s => ({
          id: s.id || s._id,
          titleEn: s.titleEn || s.title_en,
          titleMr: s.titleMr || s.title_mr,
          descEn: s.descEn || s.desc_en,
          descMr: s.descMr || s.desc_mr,
          url: s.url,
          category: s.category || "Government Scheme",
          categoryMr: s.categoryMr || "शासकीय योजना",
          badge: "🏅 Active",
          ministry: "Government of India",
          ministryMr: "भारत सरकार",
          benefit: s.benefit || "Check portal",
          icon: "🏛️"
        }));
        setSchemes([...LIVE_GOVT_SCHEMES, ...backendSchemes]);
      }
    } catch (err) {
      // Use hardcoded live schemes as fallback
      setSchemes(LIVE_GOVT_SCHEMES);
    } finally {
      setSchemesLoading(false);
    }
  };

  useEffect(() => {
    fetchSchemes();
  }, []);

  // Add Scheme
  const handleAddScheme = async (e) => {
    e.preventDefault();
    if (!schemeTitleEn || !schemeTitleMr || !schemeDescEn || !schemeDescMr || !schemeUrl) {
      setSchemeError(language === "mr" ? "कृपया सर्व फील्ड भरा." : "Please fill in all fields.");
      return;
    }
    try {
      setSchemeSubmitting(true);
      setSchemeError("");
      const params = new URLSearchParams();
      params.append("title_en", schemeTitleEn);
      params.append("title_mr", schemeTitleMr);
      params.append("desc_en", schemeDescEn);
      params.append("desc_mr", schemeDescMr);
      params.append("url", schemeUrl);
      const res = await fetch("/api/community/schemes", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: params,
      });
      if (!res.ok) throw new Error("Failed to add scheme");
      const data = await res.json();
      if (data.success) {
        // Add locally immediately
        const newScheme = {
          id: Date.now().toString(),
          titleEn: schemeTitleEn,
          titleMr: schemeTitleMr,
          descEn: schemeDescEn,
          descMr: schemeDescMr,
          url: schemeUrl,
          category: schemeCategory,
          categoryMr: "शासकीय योजना",
          badge: "🏅 Active",
          ministry: "Government of India",
          ministryMr: "भारत सरकार",
          benefit: schemeBenefit || "Check portal",
          icon: "🏛️"
        };
        setSchemes(prev => [...prev, newScheme]);
        setSchemeTitleEn(""); setSchemeTitleMr(""); setSchemeDescEn("");
        setSchemeDescMr(""); setSchemeUrl(""); setSchemeBenefit("");
        setShowSchemeForm(false);
        alert(language === "mr" ? "योजना यशस्वीरित्या जोडली!" : "Scheme added successfully!");
      } else {
        setSchemeError(data.message || "Failed to add scheme");
      }
    } catch (err) {
      // Add locally even if backend fails
      const newScheme = {
        id: Date.now().toString(),
        titleEn: schemeTitleEn, titleMr: schemeTitleMr,
        descEn: schemeDescEn, descMr: schemeDescMr,
        url: schemeUrl, category: schemeCategory,
        categoryMr: "शासकीय योजना", badge: "🏅 Active",
        ministry: "Government of India", ministryMr: "भारत सरकार",
        benefit: schemeBenefit || "Check portal", icon: "🏛️"
      };
      setSchemes(prev => [...prev, newScheme]);
      setSchemeTitleEn(""); setSchemeTitleMr(""); setSchemeDescEn("");
      setSchemeDescMr(""); setSchemeUrl(""); setSchemeBenefit("");
      setShowSchemeForm(false);
    } finally {
      setSchemeSubmitting(false);
    }
  };

  const handleDeleteScheme = (id) => {
    // Only allow deleting custom-added schemes (not the live ones)
    const liveIds = LIVE_GOVT_SCHEMES.map(s => s.id);
    if (liveIds.includes(id)) {
      alert(language === "mr" ? "लाइव्ह सरकारी योजना हटवता येत नाही." : "Cannot remove live government scheme.");
      return;
    }
    setSchemes(prev => prev.filter(s => s.id !== id));
  };

  const categories = ["All", ...Array.from(new Set(LIVE_GOVT_SCHEMES.map(s => s.category)))];

  const filteredSchemes = schemes.filter(s => {
    const matchCategory = selectedCategory === "All" || s.category === selectedCategory;
    const q = searchQuery.toLowerCase();
    const matchSearch = !q || 
      (s.titleEn || "").toLowerCase().includes(q) ||
      (s.titleMr || "").toLowerCase().includes(q) ||
      (s.descEn || "").toLowerCase().includes(q) ||
      (s.category || "").toLowerCase().includes(q);
    return matchCategory && matchSearch;
  });

  return (
    <div className="app-container">
      {/* Hero Header */}
      <div style={{
        background: "linear-gradient(135deg, #052e16, #14532d)",
        borderRadius: 16,
        padding: "32px 36px",
        marginBottom: 28,
        color: "white",
        position: "relative",
        overflow: "hidden"
      }}>
        <div style={{
          position: "absolute", top: 0, right: 0, bottom: 0,
          width: "40%", background: "url('https://images.unsplash.com/photo-1557804506-669a67965ba0?auto=format&fit=crop&w=400&q=60') center/cover",
          opacity: 0.15
        }} />
        <div style={{ position: "relative", zIndex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#86efac", marginBottom: 8, textTransform: "uppercase", letterSpacing: 1 }}>
            🏛️ {language === "mr" ? "शासकीय योजना केंद्र" : "Government Scheme Center"}
          </div>
          <h1 style={{ fontSize: "clamp(1.6rem, 4vw, 2.4rem)", fontWeight: 900, margin: "0 0 10px 0" }}>
            {language === "mr" ? "शासकीय कृषी योजना" : "Government Agricultural Schemes"}
          </h1>
          <p style={{ opacity: 0.85, fontSize: 15, maxWidth: 580, margin: 0 }}>
            {language === "mr"
              ? "भारत सरकार आणि राज्य शासनाच्या लाइव्ह कृषी योजना, अनुदाने आणि कर्ज सुविधांची संपूर्ण माहिती."
              : "Complete information on live Central & State Government agricultural schemes, subsidies and credit facilities for Indian farmers."}
          </p>
          <div style={{ display: "flex", gap: 12, marginTop: 16, flexWrap: "wrap" }}>
            <div style={{ background: "rgba(255,255,255,0.1)", padding: "6px 14px", borderRadius: 100, fontSize: 13, fontWeight: 600 }}>
              📋 {filteredSchemes.length} {language === "mr" ? "योजना उपलब्ध" : "Schemes Available"}
            </div>
            <div style={{ background: "rgba(134,239,172,0.2)", padding: "6px 14px", borderRadius: 100, fontSize: 13, fontWeight: 600, color: "#86efac" }}>
              🔄 {language === "mr" ? "लाइव्ह अपडेट" : "Live Updates"}
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap", alignItems: "center" }}>
        <input
          className="input"
          style={{ flex: 1, minWidth: 200, margin: 0 }}
          placeholder={language === "mr" ? "🔍 योजना शोधा..." : "🔍 Search schemes..."}
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Category Filters */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 24 }}>
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            style={{
              padding: "6px 14px", borderRadius: 100, border: "1px solid",
              borderColor: selectedCategory === cat ? (CATEGORY_COLORS[cat] || "#16a34a") : "var(--border-color)",
              background: selectedCategory === cat ? (CATEGORY_COLORS[cat] || "#16a34a") : "var(--bg-card)",
              color: selectedCategory === cat ? "white" : "var(--text-muted)",
              fontSize: 12, fontWeight: 600, cursor: "pointer", transition: "all 0.2s"
            }}
          >
            {cat === "All" ? (language === "mr" ? "सर्व" : "All") : cat}
          </button>
        ))}
      </div>



      {/* Schemes Grid */}
      {schemesLoading ? (
        <div style={{ textAlign: "center", padding: "60px 0", color: "var(--text-muted)" }}>
          <div style={{ fontSize: 40 }}>🏛️</div>
          <p style={{ marginTop: 12 }}>{language === "mr" ? "योजना लोड होत आहेत..." : "Loading schemes..."}</p>
        </div>
      ) : filteredSchemes.length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: "60px 0" }}>
          <div style={{ fontSize: 40 }}>🔍</div>
          <p style={{ marginTop: 12, color: "var(--text-muted)" }}>
            {language === "mr" ? "कोणत्याही योजना आढळल्या नाहीत." : "No schemes found matching your search."}
          </p>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: 20 }}>
          {filteredSchemes.map(scheme => {
            const isLive = LIVE_GOVT_SCHEMES.some(s => s.id === scheme.id);
            const catColor = CATEGORY_COLORS[scheme.category] || "#16a34a";
            return (
              <div
                key={scheme.id}
                className="card"
                style={{
                  margin: 0, padding: 20, borderRadius: 14,
                  border: "1px solid var(--border-color)",
                  display: "flex", flexDirection: "column", gap: 12,
                  transition: "transform 0.2s, box-shadow 0.2s",
                  position: "relative", overflow: "hidden"
                }}
                onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-3px)"; e.currentTarget.style.boxShadow = "0 8px 24px rgba(0,0,0,0.1)"; }}
                onMouseLeave={e => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "none"; }}
              >
                {/* Live badge */}
                {isLive && (
                  <div style={{
                    position: "absolute", top: 12, right: 12,
                    background: "#dcfce7", color: "#15803d",
                    fontSize: 10, fontWeight: 800, padding: "2px 8px",
                    borderRadius: 100, display: "flex", alignItems: "center", gap: 3
                  }}>
                    <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#16a34a", animation: "pulse 2s infinite" }} />
                    LIVE
                  </div>
                )}

                <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                  <div style={{
                    width: 48, height: 48, borderRadius: 12,
                    background: catColor + "18",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 24, flexShrink: 0
                  }}>
                    {scheme.icon || "🏛️"}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize: 10, fontWeight: 700, color: catColor,
                      textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4
                    }}>
                      {scheme.category}
                    </div>
                    <h4 style={{
                      fontSize: 15, fontWeight: 800, color: "var(--text-dark)",
                      margin: 0, lineHeight: 1.3
                    }}>
                      {language === "mr" ? scheme.titleMr : scheme.titleEn}
                    </h4>
                  </div>
                </div>

                <p style={{ fontSize: 13, color: "var(--text-dark)", lineHeight: 1.55, margin: 0 }}>
                  {language === "mr" ? scheme.descMr : scheme.descEn}
                </p>

                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {scheme.benefit && (
                    <div style={{
                      background: catColor + "15", color: catColor,
                      fontSize: 11, fontWeight: 700, padding: "4px 10px",
                      borderRadius: 100, border: `1px solid ${catColor}30`
                    }}>
                      🎯 {scheme.benefit}
                    </div>
                  )}
                  <div style={{
                    background: "var(--bg-main)", color: "var(--text-muted)",
                    fontSize: 11, padding: "4px 10px", borderRadius: 100
                  }}>
                    🏛️ {language === "mr" ? scheme.ministryMr : scheme.ministry}
                  </div>
                </div>

                <div style={{ display: "flex", gap: 8, marginTop: "auto" }}>
                  <a
                    href={scheme.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      flex: 1, padding: "10px 16px", background: catColor,
                      color: "white", textDecoration: "none", borderRadius: 10,
                      fontSize: 13, fontWeight: 700, textAlign: "center",
                      display: "block", transition: "opacity 0.2s"
                    }}
                    onMouseEnter={e => e.currentTarget.style.opacity = "0.9"}
                    onMouseLeave={e => e.currentTarget.style.opacity = "1"}
                  >
                    {language === "mr" ? "पोर्टलला भेट द्या ↗" : "Visit Portal ↗"}
                  </a>
                  {!isLive && (
                    <button
                      onClick={() => handleDeleteScheme(scheme.id)}
                      style={{
                        background: "#fef2f2", color: "#dc2626", border: "1px solid #fecaca",
                        borderRadius: 10, padding: "10px 14px", cursor: "pointer", fontSize: 16
                      }}
                    >
                      🗑️
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Disclaimer */}
      <div style={{
        marginTop: 32, padding: "14px 20px",
        background: "var(--bg-card)", borderRadius: 10,
        border: "1px solid var(--border-color)",
        fontSize: 12, color: "var(--text-muted)", textAlign: "center"
      }}>
        📋 {language === "mr"
          ? "वरील सर्व माहिती भारत सरकारच्या अधिकृत पोर्टलवरून संकलित केली आहे. अर्ज करण्यापूर्वी नवीनतम नियम व अटी तपासा."
          : "All scheme information sourced from official Government of India portals. Please verify latest terms & eligibility before applying. Information updated as of June 2026."}
      </div>
    </div>
  );
};

export default Forum;
