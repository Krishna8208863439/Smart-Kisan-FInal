import React, { useState, useEffect } from "react";
import { useLanguage } from "../context/LanguageContext";
import CommunityDirectory from "../components/CommunityDirectory";

const Forum = () => {
  const { language, t } = useLanguage();
  const [activeTab, setActiveTab] = useState("directory"); // directory, webinars, schemes

  // Webinars state
  const [webinars, setWebinars] = useState([]);
  const [webinarsLoading, setWebinarsLoading] = useState(true);
  const [showWebinarForm, setShowWebinarForm] = useState(false);
  const [webinarTopicEn, setWebinarTopicEn] = useState("");
  const [webinarTopicMr, setWebinarTopicMr] = useState("");
  const [webinarDateEn, setWebinarDateEn] = useState("");
  const [webinarDateMr, setWebinarDateMr] = useState("");
  const [webinarLink, setWebinarLink] = useState("");
  const [webinarError, setWebinarError] = useState("");
  const [webinarSubmitting, setWebinarSubmitting] = useState(false);

  // Schemes state
  const [schemes, setSchemes] = useState([]);
  const [schemesLoading, setSchemesLoading] = useState(true);
  const [showSchemeForm, setShowSchemeForm] = useState(false);
  const [schemeTitleEn, setSchemeTitleEn] = useState("");
  const [schemeTitleMr, setSchemeTitleMr] = useState("");
  const [schemeDescEn, setSchemeDescEn] = useState("");
  const [schemeDescMr, setSchemeDescMr] = useState("");
  const [schemeUrl, setSchemeUrl] = useState("");
  const [schemeError, setSchemeError] = useState("");
  const [schemeSubmitting, setSchemeSubmitting] = useState(false);

  // Fetch Webinars
  const fetchWebinars = async () => {
    try {
      setWebinarsLoading(true);
      const res = await fetch("/api/community/webinars");
      if (!res.ok) throw new Error("Failed to fetch webinars");
      const data = await res.json();
      if (data.success && data.webinars) {
        setWebinars(data.webinars);
      }
    } catch (err) {
      console.error("Error fetching webinars:", err);
    } finally {
      setWebinarsLoading(false);
    }
  };

  // Fetch Schemes
  const fetchSchemes = async () => {
    try {
      setSchemesLoading(true);
      const res = await fetch("/api/community/schemes");
      if (!res.ok) throw new Error("Failed to fetch schemes");
      const data = await res.json();
      if (data.success && data.schemes) {
        setSchemes(data.schemes);
      }
    } catch (err) {
      console.error("Error fetching schemes:", err);
    } finally {
      setSchemesLoading(false);
    }
  };

  useEffect(() => {
    fetchWebinars();
    fetchSchemes();
  }, []);

  // Add Webinar
  const handleAddWebinar = async (e) => {
    e.preventDefault();
    if (!webinarTopicEn || !webinarTopicMr || !webinarDateEn || !webinarDateMr || !webinarLink) {
      setWebinarError(language === "mr" ? "कृपया सर्व फील्ड भरा." : "Please fill in all fields.");
      return;
    }

    try {
      setWebinarSubmitting(true);
      setWebinarError("");

      const params = new URLSearchParams();
      params.append("topic_en", webinarTopicEn);
      params.append("topic_mr", webinarTopicMr);
      params.append("date_en", webinarDateEn);
      params.append("date_mr", webinarDateMr);
      params.append("link", webinarLink);

      const res = await fetch("/api/community/webinars", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: params,
      });

      if (!res.ok) throw new Error("Failed to add webinar");
      const data = await res.json();
      if (data.success) {
        setWebinarTopicEn("");
        setWebinarTopicMr("");
        setWebinarDateEn("");
        setWebinarDateMr("");
        setWebinarLink("");
        setShowWebinarForm(false);
        fetchWebinars();
      } else {
        setWebinarError(data.message || "Failed to add webinar");
      }
    } catch (err) {
      setWebinarError(err.message || "Server error occurred");
    } finally {
      setWebinarSubmitting(false);
    }
  };

  // Delete Webinar
  const handleDeleteWebinar = async (id) => {
    const confirmMsg = language === "mr"
      ? "आपण खरोखर हे प्रशिक्षण/वेबिनार हटवू इच्छिता?"
      : "Are you sure you want to delete this webinar?";
    if (!window.confirm(confirmMsg)) return;

    try {
      const res = await fetch(`/api/community/webinars/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete webinar");
      const data = await res.json();
      if (data.success) {
        fetchWebinars();
      }
    } catch (err) {
      alert(language === "mr" ? "वेबिनार हटवण्यात त्रुटी आली." : "Error deleting webinar.");
    }
  };

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
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: params,
      });

      if (!res.ok) throw new Error("Failed to add scheme");
      const data = await res.json();
      if (data.success) {
        setSchemeTitleEn("");
        setSchemeTitleMr("");
        setSchemeDescEn("");
        setSchemeDescMr("");
        setSchemeUrl("");
        setShowSchemeForm(false);
        fetchSchemes();
      } else {
        setSchemeError(data.message || "Failed to add scheme");
      }
    } catch (err) {
      setSchemeError(err.message || "Server error occurred");
    } finally {
      setSchemeSubmitting(false);
    }
  };

  // Delete Scheme
  const handleDeleteScheme = async (id) => {
    const confirmMsg = language === "mr"
      ? "आपण खरोखर ही योजना हटवू इच्छिता?"
      : "Are you sure you want to delete this scheme?";
    if (!window.confirm(confirmMsg)) return;

    try {
      const res = await fetch(`/api/community/schemes/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete scheme");
      const data = await res.json();
      if (data.success) {
        fetchSchemes();
      }
    } catch (err) {
      alert(language === "mr" ? "योजना हटवण्यात त्रुटी आली." : "Error deleting scheme.");
    }
  };

  return (
    <div className="app-container">
      {/* Hero Header section */}
      <div style={{ textAlign: "center", marginBottom: 32 }}>
        <h1 style={{ fontSize: "2.2rem", fontWeight: 800, color: "var(--primary)", marginBottom: 8 }}>
          {t("communityResourcesTitle")}
        </h1>
        <p style={{ color: "var(--text-muted)", fontSize: "1.1rem", maxWidth: 650, margin: "0 auto" }}>
          {t("communityResourcesSubtitle")}
        </p>
      </div>

      {/* Tabs Navigation Selector */}
      <div style={{
        display: "flex",
        background: "var(--border-color)",
        padding: "6px",
        borderRadius: "14px",
        marginBottom: 30,
        overflowX: "auto",
        gap: 6
      }}>
        <button
          onClick={() => setActiveTab("directory")}
          style={{
            flex: 1,
            minWidth: "120px",
            background: activeTab === "directory" ? "var(--bg-card)" : "transparent",
            color: activeTab === "directory" ? "var(--primary)" : "var(--text-muted)",
            border: "none",
            borderRadius: "10px",
            padding: "12px 16px",
            fontSize: "0.95rem",
            fontWeight: 600,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            boxShadow: activeTab === "directory" ? "var(--shadow-sm)" : "none",
            transition: "all 0.25s ease",
            whiteSpace: "nowrap"
          }}
        >
          <span>👥</span>
          <span>{language === "mr" ? "संपर्क सूची" : "Directory"}</span>
        </button>

        <button
          onClick={() => setActiveTab("webinars")}
          style={{
            flex: 1,
            minWidth: "120px",
            background: activeTab === "webinars" ? "var(--bg-card)" : "transparent",
            color: activeTab === "webinars" ? "var(--primary)" : "var(--text-muted)",
            border: "none",
            borderRadius: "10px",
            padding: "12px 16px",
            fontSize: "0.95rem",
            fontWeight: 600,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            boxShadow: activeTab === "webinars" ? "var(--shadow-sm)" : "none",
            transition: "all 0.25s ease",
            whiteSpace: "nowrap"
          }}
        >
          <span>🎥</span>
          <span>{language === "mr" ? "वेबिनार व प्रशिक्षण" : "Webinars"}</span>
        </button>

        <button
          onClick={() => setActiveTab("schemes")}
          style={{
            flex: 1,
            minWidth: "120px",
            background: activeTab === "schemes" ? "var(--bg-card)" : "transparent",
            color: activeTab === "schemes" ? "var(--primary)" : "var(--text-muted)",
            border: "none",
            borderRadius: "10px",
            padding: "12px 16px",
            fontSize: "0.95rem",
            fontWeight: 600,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            boxShadow: activeTab === "schemes" ? "var(--shadow-sm)" : "none",
            transition: "all 0.25s ease",
            whiteSpace: "nowrap"
          }}
        >
          <span>🏛️</span>
          <span>{language === "mr" ? "सरकारी योजना" : "Govt Schemes"}</span>
        </button>
      </div>

      {/* Tab Contents */}
      <div>
        {/* Tab 1: Directory */}
        {activeTab === "directory" && (
          <div style={{ animation: "fadeIn 0.3s ease" }}>
            <CommunityDirectory />
          </div>
        )}

        {/* Tab 2: Webinars */}
        {activeTab === "webinars" && (
          <div style={{ animation: "fadeIn 0.3s ease" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12, marginBottom: 20 }}>
              <div>
                <h3 style={{ fontSize: "1.3rem", fontWeight: 700, margin: 0 }}>
                  {t("communityMeetingsTitle")}
                </h3>
                <p style={{ color: "var(--text-muted)", fontSize: "0.95rem", marginTop: 4 }}>
                  {t("communityMeetingsDesc")}
                </p>
              </div>
              <button
                onClick={() => setShowWebinarForm(!showWebinarForm)}
                style={{
                  background: showWebinarForm ? "var(--danger)" : "var(--primary)",
                  color: "white",
                  border: "none",
                  borderRadius: "8px",
                  padding: "8px 16px",
                  fontSize: "0.9rem",
                  fontWeight: 600,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 6
                }}
              >
                {showWebinarForm
                  ? (language === "mr" ? "बंद करा" : "Cancel")
                  : (language === "mr" ? "वेबिनार जोडा 🎥" : "Add Webinar 🎥")}
              </button>
            </div>

            {showWebinarForm && (
              <form onSubmit={handleAddWebinar} style={{
                background: "rgba(21, 128, 61, 0.03)",
                border: "1px dashed var(--primary)",
                borderRadius: "12px",
                padding: 20,
                marginBottom: 24
              }}>
                <h4 style={{ fontSize: "1.1rem", fontWeight: 600, marginBottom: 16, color: "var(--primary)" }}>
                  {language === "mr" ? "नवीन प्रशिक्षण / वेबिनार जोडा" : "Add New Training / Webinar"}
                </h4>

                {webinarError && (
                  <div style={{ color: "var(--danger)", background: "rgba(239, 68, 68, 0.1)", padding: "10px 14px", borderRadius: "8px", fontSize: "0.88rem", marginBottom: 16 }}>
                    ⚠️ {webinarError}
                  </div>
                )}

                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16, marginBottom: 16 }}>
                  <div>
                    <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, marginBottom: 6, color: "var(--text-dark)" }}>
                      Topic (English) *
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Kharif Soil Management"
                      value={webinarTopicEn}
                      onChange={(e) => setWebinarTopicEn(e.target.value)}
                      style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid var(--border-color)", background: "var(--bg-card)", color: "var(--text-dark)" }}
                      required
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, marginBottom: 6, color: "var(--text-dark)" }}>
                      विषय (मराठी) *
                    </label>
                    <input
                      type="text"
                      placeholder="उदा. खरीप जमीन व्यवस्थापन"
                      value={webinarTopicMr}
                      onChange={(e) => setWebinarTopicMr(e.target.value)}
                      style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid var(--border-color)", background: "var(--bg-card)", color: "var(--text-dark)" }}
                      required
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, marginBottom: 6, color: "var(--text-dark)" }}>
                      Date & Time (English) *
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. June 25, 2026 - 03:00 PM"
                      value={webinarDateEn}
                      onChange={(e) => setWebinarDateEn(e.target.value)}
                      style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid var(--border-color)", background: "var(--bg-card)", color: "var(--text-dark)" }}
                      required
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, marginBottom: 6, color: "var(--text-dark)" }}>
                      दिनांक व वेळ (मराठी) *
                    </label>
                    <input
                      type="text"
                      placeholder="उदा. २५ जून, २०२६ - दुपारी ०३:०० वाजता"
                      value={webinarDateMr}
                      onChange={(e) => setWebinarDateMr(e.target.value)}
                      style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid var(--border-color)", background: "var(--bg-card)", color: "var(--text-dark)" }}
                      required
                    />
                  </div>
                  <div style={{ gridColumn: "1 / -1" }}>
                    <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, marginBottom: 6, color: "var(--text-dark)" }}>
                      Meeting / Streaming Link (Google Meet, YouTube etc.) *
                    </label>
                    <input
                      type="url"
                      placeholder="https://meet.google.com/..."
                      value={webinarLink}
                      onChange={(e) => setWebinarLink(e.target.value)}
                      style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid var(--border-color)", background: "var(--bg-card)", color: "var(--text-dark)" }}
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={webinarSubmitting}
                  style={{
                    background: "var(--primary)",
                    color: "white",
                    border: "none",
                    borderRadius: "8px",
                    padding: "10px 20px",
                    fontSize: "0.95rem",
                    fontWeight: 600,
                    cursor: "pointer",
                    width: "100%",
                    opacity: webinarSubmitting ? 0.7 : 1
                  }}
                >
                  {webinarSubmitting
                    ? (language === "mr" ? "वेबिनार जतन करत आहे..." : "Saving Webinar...")
                    : (language === "mr" ? "वेबिनार जतन करा" : "Save Webinar")}
                </button>
              </form>
            )}

            {webinarsLoading ? (
              <div style={{ textAlign: "center", padding: "40px 0", color: "var(--text-muted)" }}>
                {language === "mr" ? "वेबिनार लोड होत आहेत..." : "Loading webinars..."}
              </div>
            ) : webinars.length === 0 ? (
              <div style={{ textAlign: "center", padding: "40px 0", color: "var(--text-muted)" }}>
                {language === "mr" ? "कोणतेही वेबिनार नियोजित नाहीत." : "No upcoming webinars scheduled."}
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(290px, 1fr))", gap: 20 }}>
                {webinars.map((webinar) => (
                  <div
                    key={webinar.id}
                    className="card"
                    style={{
                      marginBottom: 0,
                      padding: 20,
                      borderRadius: 12,
                      background: "rgba(21, 128, 61, 0.04)",
                      border: "1px solid var(--border-color)",
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "space-between",
                      gap: 16,
                      position: "relative"
                    }}
                  >
                    <div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
                        <h4 style={{ fontWeight: 700, fontSize: "1.1rem", color: "var(--text-dark)", margin: 0 }}>
                          {language === "mr" ? webinar.topicMr : webinar.topicEn}
                        </h4>
                        <button
                          onClick={() => handleDeleteWebinar(webinar.id)}
                          style={{
                            background: "rgba(239, 68, 68, 0.08)",
                            color: "var(--danger)",
                            border: "none",
                            cursor: "pointer",
                            padding: "6px 10px",
                            borderRadius: "6px",
                            fontSize: "0.85rem"
                          }}
                        >
                          🗑️
                        </button>
                      </div>
                      <p style={{ fontSize: "0.9rem", color: "var(--text-muted)", marginTop: 8, display: "flex", alignItems: "center", gap: 6 }}>
                        🗓️ {language === "mr" ? webinar.dateMr : webinar.dateEn}
                      </p>
                    </div>
                    <a
                      href={webinar.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="button"
                      style={{
                        textAlign: "center",
                        padding: "10px 14px",
                        fontSize: "0.95rem",
                        display: "block",
                        textDecoration: "none",
                        color: "white",
                        background: "var(--primary)",
                        borderRadius: "8px",
                        fontWeight: 600
                      }}
                    >
                      {t("communityMeetingJoin")} 🎥
                    </a>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Schemes */}
        {activeTab === "schemes" && (
          <div style={{ animation: "fadeIn 0.3s ease" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12, marginBottom: 20 }}>
              <div>
                <h3 style={{ fontSize: "1.3rem", fontWeight: 700, margin: 0 }}>
                  {t("communitySchemesTitle")}
                </h3>
                <p style={{ color: "var(--text-muted)", fontSize: "0.95rem", marginTop: 4 }}>
                  {t("communitySchemesDesc")}
                </p>
              </div>
              <button
                onClick={() => setShowSchemeForm(!showSchemeForm)}
                style={{
                  background: showSchemeForm ? "var(--danger)" : "var(--primary)",
                  color: "white",
                  border: "none",
                  borderRadius: "8px",
                  padding: "8px 16px",
                  fontSize: "0.9rem",
                  fontWeight: 600,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 6
                }}
              >
                {showSchemeForm
                  ? (language === "mr" ? "बंद करा" : "Cancel")
                  : (language === "mr" ? "योजना जोडा 🏛️" : "Add Scheme 🏛️")}
              </button>
            </div>

            {showSchemeForm && (
              <form onSubmit={handleAddScheme} style={{
                background: "rgba(13, 148, 136, 0.03)",
                border: "1px dashed var(--secondary)",
                borderRadius: "12px",
                padding: 20,
                marginBottom: 24
              }}>
                <h4 style={{ fontSize: "1.1rem", fontWeight: 600, marginBottom: 16, color: "var(--secondary)" }}>
                  {language === "mr" ? "नवीन सरकारी योजना जोडा" : "Add New Government Scheme"}
                </h4>

                {schemeError && (
                  <div style={{ color: "var(--danger)", background: "rgba(239, 68, 68, 0.1)", padding: "10px 14px", borderRadius: "8px", fontSize: "0.88rem", marginBottom: 16 }}>
                    ⚠️ {schemeError}
                  </div>
                )}

                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16, marginBottom: 16 }}>
                  <div>
                    <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, marginBottom: 6, color: "var(--text-dark)" }}>
                      Scheme Title (English) *
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. PM Kisan Samman Nidhi"
                      value={schemeTitleEn}
                      onChange={(e) => setSchemeTitleEn(e.target.value)}
                      style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid var(--border-color)", background: "var(--bg-card)", color: "var(--text-dark)" }}
                      required
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, marginBottom: 6, color: "var(--text-dark)" }}>
                      योजनेचे नाव (मराठी) *
                    </label>
                    <input
                      type="text"
                      placeholder="उदा. पीएम किसान सन्मान निधी"
                      value={schemeTitleMr}
                      onChange={(e) => setSchemeTitleMr(e.target.value)}
                      style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid var(--border-color)", background: "var(--bg-card)", color: "var(--text-dark)" }}
                      required
                    />
                  </div>
                  <div style={{ gridColumn: "1 / -1" }}>
                    <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, marginBottom: 6, color: "var(--text-dark)" }}>
                      Description (English) *
                    </label>
                    <textarea
                      placeholder="Brief details about the benefits of this scheme..."
                      rows="3"
                      value={schemeDescEn}
                      onChange={(e) => setSchemeDescEn(e.target.value)}
                      style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid var(--border-color)", background: "var(--bg-card)", color: "var(--text-dark)", fontFamily: "inherit" }}
                      required
                    />
                  </div>
                  <div style={{ gridColumn: "1 / -1" }}>
                    <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, marginBottom: 6, color: "var(--text-dark)" }}>
                      माहिती / वर्णन (मराठी) *
                    </label>
                    <textarea
                      placeholder="या योजनेच्या फायद्यांविषयी थोडक्यात माहिती..."
                      rows="3"
                      value={schemeDescMr}
                      onChange={(e) => setSchemeDescMr(e.target.value)}
                      style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid var(--border-color)", background: "var(--bg-card)", color: "var(--text-dark)", fontFamily: "inherit" }}
                      required
                    />
                  </div>
                  <div style={{ gridColumn: "1 / -1" }}>
                    <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, marginBottom: 6, color: "var(--text-dark)" }}>
                      Portal Link / Application URL *
                    </label>
                    <input
                      type="url"
                      placeholder="https://pmkisan.gov.in"
                      value={schemeUrl}
                      onChange={(e) => setSchemeUrl(e.target.value)}
                      style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid var(--border-color)", background: "var(--bg-card)", color: "var(--text-dark)" }}
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={schemeSubmitting}
                  style={{
                    background: "var(--secondary)",
                    color: "white",
                    border: "none",
                    borderRadius: "8px",
                    padding: "10px 20px",
                    fontSize: "0.95rem",
                    fontWeight: 600,
                    cursor: "pointer",
                    width: "100%",
                    opacity: schemeSubmitting ? 0.7 : 1
                  }}
                >
                  {schemeSubmitting
                    ? (language === "mr" ? "योजना जतन करत आहे..." : "Saving Scheme...")
                    : (language === "mr" ? "योजना जतन करा" : "Save Scheme")}
                </button>
              </form>
            )}

            {schemesLoading ? (
              <div style={{ textAlign: "center", padding: "40px 0", color: "var(--text-muted)" }}>
                {language === "mr" ? "योजना लोड होत आहेत..." : "Loading schemes..."}
              </div>
            ) : schemes.length === 0 ? (
              <div style={{ textAlign: "center", padding: "40px 0", color: "var(--text-muted)" }}>
                {language === "mr" ? "कोणत्याही सरकारी योजना उपलब्ध नाहीत." : "No government schemes available."}
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(310px, 1fr))", gap: 20 }}>
                {schemes.map((scheme) => (
                  <div
                    key={scheme.id}
                    className="card"
                    style={{
                      marginBottom: 0,
                      padding: 20,
                      borderRadius: 12,
                      background: "rgba(13, 148, 136, 0.04)",
                      border: "1px solid var(--border-color)",
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "space-between",
                      gap: 16,
                      position: "relative"
                    }}
                  >
                    <div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
                        <h4 style={{ fontWeight: 700, fontSize: "1.1rem", color: "var(--text-dark)", margin: 0 }}>
                          {language === "mr" ? scheme.titleMr : scheme.titleEn}
                        </h4>
                        <button
                          onClick={() => handleDeleteScheme(scheme.id)}
                          style={{
                            background: "rgba(239, 68, 68, 0.08)",
                            color: "var(--danger)",
                            border: "none",
                            cursor: "pointer",
                            padding: "6px 10px",
                            borderRadius: "6px",
                            fontSize: "0.85rem"
                          }}
                        >
                          🗑️
                        </button>
                      </div>
                      <p style={{ fontSize: "0.88rem", color: "var(--text-muted)", marginTop: 10 }}>
                        {language === "mr" ? scheme.descMr : scheme.descEn}
                      </p>
                    </div>
                    <a
                      href={scheme.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        color: "var(--secondary)",
                        fontWeight: 600,
                        fontSize: "0.95rem",
                        display: "flex",
                        alignItems: "center",
                        gap: 4,
                        alignSelf: "flex-start",
                        background: "rgba(13, 148, 136, 0.08)",
                        padding: "6px 12px",
                        borderRadius: "6px"
                      }}
                    >
                      {language === "mr" ? "पोर्टलला भेट द्या" : "Visit Portal"} ↗
                    </a>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Forum;
