import React, { useState, useEffect } from "react";
import { useLanguage } from "../context/LanguageContext";

const CommunityDirectory = () => {
  const { language, t } = useLanguage();
  const [officers, setOfficers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);

  // Form states
  const [nameEn, setNameEn] = useState("");
  const [nameMr, setNameMr] = useState("");
  const [roleEn, setRoleEn] = useState("");
  const [roleMr, setRoleMr] = useState("");
  const [regionEn, setRegionEn] = useState("");
  const [regionMr, setRegionMr] = useState("");
  const [contact, setContact] = useState("");
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchOfficers = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/community/officers");
      if (!res.ok) throw new Error("Failed to fetch officers");
      const data = await res.json();
      if (data.success && data.officers) {
        setOfficers(data.officers);
      }
    } catch (err) {
      console.error("Error loading officers:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOfficers();
  }, []);

  const handleAddOfficer = async (e) => {
    e.preventDefault();
    if (!nameEn || !nameMr || !roleEn || !roleMr || !regionEn || !regionMr || !contact) {
      setFormError(language === "mr" ? "कृपया सर्व फील्ड भरा." : "Please fill in all fields.");
      return;
    }

    try {
      setSubmitting(true);
      setFormError("");
      
      const params = new URLSearchParams();
      params.append("name_en", nameEn);
      params.append("name_mr", nameMr);
      params.append("role_en", roleEn);
      params.append("role_mr", roleMr);
      params.append("region_en", regionEn);
      params.append("region_mr", regionMr);
      params.append("contact", contact);

      const res = await fetch("/api/community/officers", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: params,
      });

      if (!res.ok) throw new Error("Failed to add officer");
      const data = await res.json();
      if (data.success) {
        // Reset form
        setNameEn("");
        setNameMr("");
        setRoleEn("");
        setRoleMr("");
        setRegionEn("");
        setRegionMr("");
        setContact("");
        setShowAddForm(false);
        // Refresh list
        fetchOfficers();
      } else {
        setFormError(data.message || "Failed to add officer");
      }
    } catch (err) {
      setFormError(err.message || "Server error occurred");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteOfficer = async (id) => {
    const confirmMsg = language === "mr" 
      ? "आपण खरोखर हा संपर्क हटवू इच्छिता?" 
      : "Are you sure you want to delete this contact?";
    if (!window.confirm(confirmMsg)) return;

    try {
      const res = await fetch(`/api/community/officers/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete officer");
      const data = await res.json();
      if (data.success) {
        fetchOfficers();
      }
    } catch (err) {
      alert(language === "mr" ? "संपर्क हटवण्यात त्रुटी आली." : "Error deleting contact.");
    }
  };

  return (
    <div className="card" style={{ marginBottom: 24, background: "var(--bg-card)", border: "1px solid var(--border-color)", borderRadius: "var(--border-radius)", padding: 24, boxShadow: "var(--shadow-md)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12, marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: "2rem" }}>👥</span>
          <h2 style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--text-dark)", margin: 0 }}>
            {language === "mr" ? "समुदाय संसाधन आणि संपर्क सूची" : "Community Resource Center & Directory"}
          </h2>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          style={{
            background: showAddForm ? "var(--danger)" : "var(--primary)",
            border: "none",
            borderRadius: "8px",
            padding: "8px 16px",
            fontSize: "0.9rem",
            fontWeight: 600,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 6,
            color: "white",
            transition: "background 0.2s"
          }}
        >
          {showAddForm 
            ? (language === "mr" ? "बंद करा" : "Cancel") 
            : (language === "mr" ? "नवीन संपर्क जोडा ➕" : "Add New Contact ➕")}
        </button>
      </div>

      {showAddForm && (
        <form onSubmit={handleAddOfficer} style={{
          background: "rgba(21, 128, 61, 0.03)",
          border: "1px dashed var(--primary)",
          borderRadius: "12px",
          padding: 20,
          marginBottom: 24,
          animation: "fadeIn 0.3s ease"
        }}>
          <h3 style={{ fontSize: "1.1rem", fontWeight: 600, marginBottom: 16, color: "var(--primary)" }}>
            {language === "mr" ? "नवीन अधिकारी / सल्लागार जोडा" : "Add New Officer / Advisor"}
          </h3>

          {formError && (
            <div style={{ color: "var(--danger)", background: "rgba(239, 68, 68, 0.1)", padding: "10px 14px", borderRadius: "8px", fontSize: "0.88rem", marginBottom: 16 }}>
              ⚠️ {formError}
            </div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16, marginBottom: 16 }}>
            <div>
              <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, marginBottom: 6, color: "var(--text-dark)" }}>
                Name (English) *
              </label>
              <input
                type="text"
                placeholder="e.g. Dr. Ramesh Patil"
                value={nameEn}
                onChange={(e) => setNameEn(e.target.value)}
                style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid var(--border-color)", background: "var(--bg-card)", color: "var(--text-dark)" }}
                required
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, marginBottom: 6, color: "var(--text-dark)" }}>
                नाव (मराठी) *
              </label>
              <input
                type="text"
                placeholder="उदा. डॉ. रमेश पाटील"
                value={nameMr}
                onChange={(e) => setNameMr(e.target.value)}
                style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid var(--border-color)", background: "var(--bg-card)", color: "var(--text-dark)" }}
                required
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, marginBottom: 6, color: "var(--text-dark)" }}>
                Role (English) *
              </label>
              <input
                type="text"
                placeholder="e.g. Senior Agronomist"
                value={roleEn}
                onChange={(e) => setRoleEn(e.target.value)}
                style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid var(--border-color)", background: "var(--bg-card)", color: "var(--text-dark)" }}
                required
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, marginBottom: 6, color: "var(--text-dark)" }}>
                भूमिका / पद (मराठी) *
              </label>
              <input
                type="text"
                placeholder="उदा. वरिष्ठ कृषी तज्ज्ञ"
                value={roleMr}
                onChange={(e) => setRoleMr(e.target.value)}
                style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid var(--border-color)", background: "var(--bg-card)", color: "var(--text-dark)" }}
                required
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, marginBottom: 6, color: "var(--text-dark)" }}>
                Region/District (English) *
              </label>
              <input
                type="text"
                placeholder="e.g. Pune Region"
                value={regionEn}
                onChange={(e) => setRegionEn(e.target.value)}
                style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid var(--border-color)", background: "var(--bg-card)", color: "var(--text-dark)" }}
                required
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, marginBottom: 6, color: "var(--text-dark)" }}>
                विभाग / जिल्हा (मराठी) *
              </label>
              <input
                type="text"
                placeholder="उदा. पुणे विभाग"
                value={regionMr}
                onChange={(e) => setRegionMr(e.target.value)}
                style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid var(--border-color)", background: "var(--bg-card)", color: "var(--text-dark)" }}
                required
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, marginBottom: 6, color: "var(--text-dark)" }}>
                Contact Number *
              </label>
              <input
                type="text"
                placeholder="e.g. +91 98765 01234"
                value={contact}
                onChange={(e) => setContact(e.target.value)}
                style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid var(--border-color)", background: "var(--bg-card)", color: "var(--text-dark)" }}
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
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
              opacity: submitting ? 0.7 : 1
            }}
          >
            {submitting 
              ? (language === "mr" ? "जतन करत आहे..." : "Saving...") 
              : (language === "mr" ? "संपर्क जतन करा" : "Save Contact")}
          </button>
        </form>
      )}

      {loading ? (
        <div style={{ textAlign: "center", padding: "20px 0", color: "var(--text-muted)" }}>
          {language === "mr" ? "संपर्क लोड होत आहेत..." : "Loading directory..."}
        </div>
      ) : officers.length === 0 ? (
        <div style={{ textAlign: "center", padding: "20px 0", color: "var(--text-muted)" }}>
          {language === "mr" ? "सूचीमध्ये कोणतेही संपर्क उपलब्ध नाहीत." : "No directory contacts available."}
        </div>
      ) : (
        <>
          {/* Desktop Table View (hidden on very small mobile screens) */}
          <div className="desktop-only" style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", minWidth: 600 }}>
              <thead>
                <tr style={{ borderBottom: "2px solid var(--border-color)" }}>
                  <th style={{ padding: "12px 16px", color: "var(--text-muted)", fontWeight: 600, fontSize: 14 }}>
                    {language === "mr" ? "नाव" : "Name"}
                  </th>
                  <th style={{ padding: "12px 16px", color: "var(--text-muted)", fontWeight: 600, fontSize: 14 }}>
                    {language === "mr" ? "पद / भूमिका" : "Designation / Role"}
                  </th>
                  <th style={{ padding: "12px 16px", color: "var(--text-muted)", fontWeight: 600, fontSize: 14 }}>
                    {language === "mr" ? "जिल्हा / क्षेत्र" : "District / Region"}
                  </th>
                  <th style={{ padding: "12px 16px", color: "var(--text-muted)", fontWeight: 600, fontSize: 14 }}>
                    {language === "mr" ? "संपर्क क्रमांक" : "Contact Number"}
                  </th>
                  <th style={{ padding: "12px 16px", color: "var(--text-muted)", fontWeight: 600, fontSize: 14, textAlign: "right" }}>
                    {language === "mr" ? "क्रिया" : "Action"}
                  </th>
                </tr>
              </thead>
              <tbody>
                {officers.map((officer) => (
                  <tr 
                    key={officer.id} 
                    style={{ 
                      borderBottom: "1px solid var(--border-color)",
                      transition: "background 0.2s ease" 
                    }}
                    className="table-row-hover"
                  >
                    <td style={{ padding: "16px", fontWeight: 600, color: "var(--text-dark)", fontSize: 14 }}>
                      {language === "mr" ? officer.nameMr : officer.nameEn}
                    </td>
                    <td style={{ padding: "16px" }}>
                      <span style={{
                        background: "var(--primary-light)",
                        color: "var(--primary)",
                        padding: "4px 8px",
                        borderRadius: "6px",
                        fontSize: "0.85rem",
                        fontWeight: 600
                      }}>
                        {language === "mr" ? officer.roleMr : officer.roleEn}
                      </span>
                    </td>
                    <td style={{ padding: "16px", color: "var(--text-muted)", fontSize: 14 }}>
                      {language === "mr" ? officer.regionMr : officer.regionEn}
                    </td>
                    <td style={{ padding: "16px", fontWeight: "bold", fontSize: 14 }}>
                      <a 
                        href={`tel:${officer.contact}`} 
                        style={{ color: "var(--secondary)", display: "flex", alignItems: "center", gap: 6 }}
                      >
                        📞 {officer.contact}
                      </a>
                    </td>
                    <td style={{ padding: "16px", textAlign: "right" }}>
                      <button
                        onClick={() => handleDeleteOfficer(officer.id)}
                        style={{
                          background: "transparent",
                          color: "var(--danger)",
                          border: "none",
                          cursor: "pointer",
                          fontSize: "1.1rem",
                          padding: "4px 8px",
                          borderRadius: "4px",
                          transition: "background 0.2s"
                        }}
                        title={language === "mr" ? "हटवा" : "Delete"}
                        onMouseEnter={(e) => e.target.style.background = "rgba(239, 68, 68, 0.08)"}
                        onMouseLeave={(e) => e.target.style.background = "transparent"}
                      >
                        🗑️
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Card List View (hidden on desktop screens using custom CSS media query) */}
          <div className="mobile-only" style={{ display: "none", flexDirection: "column", gap: 12 }}>
            {officers.map((officer) => (
              <div 
                key={officer.id} 
                style={{ 
                  border: "1px solid var(--border-color)", 
                  borderRadius: "8px", 
                  padding: "16px", 
                  background: "rgba(255, 255, 255, 0.02)",
                  position: "relative"
                }}
              >
                <div style={{ fontWeight: 600, fontSize: "1.05rem", color: "var(--text-dark)", marginBottom: 4 }}>
                  {language === "mr" ? officer.nameMr : officer.nameEn}
                </div>
                <div style={{ marginBottom: 8 }}>
                  <span style={{
                    background: "var(--primary-light)",
                    color: "var(--primary)",
                    padding: "2px 6px",
                    borderRadius: "4px",
                    fontSize: "0.78rem",
                    fontWeight: 600
                  }}>
                    {language === "mr" ? officer.roleMr : officer.roleEn}
                  </span>
                </div>
                <div style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: 12 }}>
                  📍 {language === "mr" ? officer.regionMr : officer.regionEn}
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <a 
                    href={`tel:${officer.contact}`} 
                    style={{ 
                      color: "var(--secondary)", 
                      fontWeight: "bold", 
                      fontSize: "0.9rem", 
                      display: "flex", 
                      alignItems: "center", 
                      gap: 6,
                      background: "rgba(13, 148, 136, 0.08)",
                      padding: "6px 12px",
                      borderRadius: "6px"
                    }}
                  >
                    📞 {officer.contact}
                  </a>
                  <button
                    onClick={() => handleDeleteOfficer(officer.id)}
                    style={{
                      background: "rgba(239, 68, 68, 0.08)",
                      color: "var(--danger)",
                      border: "none",
                      cursor: "pointer",
                      padding: "6px 10px",
                      borderRadius: "6px",
                      fontSize: "0.9rem"
                    }}
                  >
                    🗑️ {language === "mr" ? "हटवा" : "Delete"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Inline styling tag to handle the display of desktop table vs mobile cards */}
      <style>{`
        @media (max-width: 640px) {
          .desktop-only {
            display: none !important;
          }
          .mobile-only {
            display: flex !important;
          }
        }
      `}</style>
    </div>
  );
};

export default CommunityDirectory;
