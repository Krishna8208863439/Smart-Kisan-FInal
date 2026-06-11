import React from "react";
import { useLanguage } from "../context/LanguageContext";

const OFFICERS = [
  {
    nameEn: "Dr. Ramesh Patil",
    nameMr: "डॉ. रमेश पाटील",
    roleEn: "Senior District Agronomist",
    roleMr: "वरिष्ठ जिल्हा कृषी तज्ज्ञ",
    regionEn: "Pune Region",
    regionMr: "पुणे विभाग",
    contact: "+91 98765 01234"
  },
  {
    nameEn: "Mrs. Savita Shinde",
    nameMr: "श्रीमती सविता शिंदे",
    roleEn: "Block Agriculture Officer",
    roleMr: "तालुका कृषी अधिकारी",
    regionEn: "Nashik Block",
    regionMr: "नाशिक तालुका",
    contact: "+91 98765 05678"
  },
  {
    nameEn: "Dr. Anil Deshmukh",
    nameMr: "डॉ. अनिल देशमुख",
    roleEn: "Soil Health Specialist",
    roleMr: "मृदा आरोग्य शास्त्रज्ञ",
    regionEn: "Nagpur District",
    regionMr: "नागपूर जिल्हा",
    contact: "+91 98765 09012"
  },
  {
    nameEn: "Mr. Vijay Kakade",
    nameMr: "श्री. विजय काकडे",
    roleEn: "Horticulture Advisor",
    roleMr: "फलोत्पादन सल्लागार",
    regionEn: "Jalgaon Block",
    regionMr: "जळगाव तालुका",
    contact: "+91 98765 03456"
  }
];

const WEBINARS = [
  {
    topicEn: "Kharif Soil Management & Fertilizer Optimization",
    topicMr: "खरीप जमीन व्यवस्थापन आणि खत नियोजन",
    dateEn: "June 18, 2026 - 11:00 AM",
    dateMr: "१४ जून, २०२६ - सकाळी ११:०० वाजता",
    link: "https://meet.google.com/abc-defg-hij"
  },
  {
    topicEn: "Drip Irrigation Setup & Subsidy Application Guidance",
    topicMr: "ठिबक सिंचन उभारणी आणि अनुदान अर्ज मार्गदर्शन",
    dateEn: "June 25, 2026 - 03:00 PM",
    dateMr: "२५ जून, २०२६ - दुपारी ०३:०० वाजता",
    link: "https://meet.google.com/xyz-uvwx-yza"
  },
  {
    topicEn: "Post-Harvest Storage & Cold Chain Management",
    topicMr: "काढणीपश्चात साठवणूक आणि शीत साखळी व्यवस्थापन",
    dateEn: "July 02, 2026 - 04:00 PM",
    dateMr: "०२ जुलै, २०२६ - दुपारी ०४:०० वाजता",
    link: "https://meet.google.com/qwe-rtyu-iop"
  }
];

const GOVT_SCHEMES = [
  {
    titleEn: "Pradhan Mantri Fasal Bima Yojana (PMFBY) - Crop Insurance",
    titleMr: "प्रधानमंत्री पीक विमा योजना (PMFBY)",
    descEn: "Protect your crops against natural calamities with subsidized insurance.",
    descMr: "नैसर्गिक आपत्तींपासून पीक संरक्षणासाठी सवलतीच्या दरात विमा मिळवा.",
    url: "https://pmfby.gov.in"
  },
  {
    titleEn: "Mahadbt Farmer Portal - Maharashtra Subsidies",
    titleMr: "महाडीबीटी शेतकरी पोर्टल - योजना व अनुदान",
    descEn: "One-stop shop for Maharashtra agriculture subsidies and equipment application.",
    descMr: "महाराष्ट्र कृषी अनुदान आणि अवजारे अर्जासाठी मुख्य दालन.",
    url: "https://mahadbt.maharashtra.gov.in"
  },
  {
    titleEn: "PM Kisan Samman Nidhi",
    titleMr: "पीएम किसान सन्मान निधी",
    descEn: "Direct income support of ₹6,000 per year to landholding farmer families.",
    descMr: "शेतकरी कुटुंबांना वर्षाला ₹६,००० थेट बँक खात्यात मदत.",
    url: "https://pmkisan.gov.in"
  }
];

const Forum = () => {
  const { language, t } = useLanguage();

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

      {/* Grid structure for main layout */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 30 }}>
        
        {/* Section 1: District Agronomists Directory */}
        <div className="card" style={{ marginBottom: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
            <span style={{ fontSize: "2rem" }}>👥</span>
            <h2 style={{ fontSize: "1.5rem", fontWeight: 700 }}>
              {t("communityDirectoryTitle")}
            </h2>
          </div>
          
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
              <thead>
                <tr style={{ borderBottom: "2px solid var(--border-color)", paddingBottom: 10 }}>
                  <th style={{ padding: "12px 16px", color: "var(--text-muted)", fontWeight: 600 }}>
                    {t("communityOfficerName")}
                  </th>
                  <th style={{ padding: "12px 16px", color: "var(--text-muted)", fontWeight: 600 }}>
                    {t("communityOfficerRole")}
                  </th>
                  <th style={{ padding: "12px 16px", color: "var(--text-muted)", fontWeight: 600 }}>
                    {t("communityOfficerRegion")}
                  </th>
                  <th style={{ padding: "12px 16px", color: "var(--text-muted)", fontWeight: 600 }}>
                    {t("communityOfficerContact")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {OFFICERS.map((officer, index) => (
                  <tr 
                    key={index} 
                    style={{ 
                      borderBottom: "1px solid var(--border-color)",
                      transition: "background 0.2s ease" 
                    }}
                    className="table-row-hover"
                  >
                    <td style={{ padding: "16px", fontWeight: 600, color: "var(--text-dark)" }}>
                      {language === "mr" ? officer.nameMr : officer.nameEn}
                    </td>
                    <td style={{ padding: "16px", color: "var(--text-dark)" }}>
                      <span style={{
                        background: "var(--primary-light)",
                        color: "var(--primary)",
                        padding: "4px 8px",
                        borderRadius: "6px",
                        fontSize: "0.85rem",
                        fontWeight: 500
                      }}>
                        {language === "mr" ? officer.roleMr : officer.roleEn}
                      </span>
                    </td>
                    <td style={{ padding: "16px", color: "var(--text-muted)" }}>
                      {language === "mr" ? officer.regionMr : officer.regionEn}
                    </td>
                    <td style={{ padding: "16px", fontWeight: "bold" }}>
                      <a 
                        href={`tel:${officer.contact}`} 
                        style={{ color: "var(--secondary)", display: "flex", alignItems: "center", gap: 6 }}
                      >
                        📞 {officer.contact}
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Two Column Section for Webinars and Schemes */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 30 }}>
          
          {/* Section 2: Webinars */}
          <div className="card" style={{ marginBottom: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
              <span style={{ fontSize: "1.8rem" }}>🎥</span>
              <h3 style={{ fontSize: "1.3rem", fontWeight: 700 }}>
                {t("communityMeetingsTitle")}
              </h3>
            </div>
            <p style={{ color: "var(--text-muted)", fontSize: "0.95rem", marginBottom: 20 }}>
              {t("communityMeetingsDesc")}
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {WEBINARS.map((webinar, index) => (
                <div 
                  key={index}
                  style={{
                    padding: 16,
                    borderRadius: 8,
                    background: "rgba(21, 128, 61, 0.04)",
                    border: "1px solid var(--border-color)",
                    display: "flex",
                    flexDirection: "column",
                    gap: 10
                  }}
                >
                  <div>
                    <h4 style={{ fontWeight: 600, fontSize: "1.05rem", color: "var(--text-dark)" }}>
                      {language === "mr" ? webinar.topicMr : webinar.topicEn}
                    </h4>
                    <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginTop: 4 }}>
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
                      padding: "8px 12px",
                      fontSize: "0.9rem",
                      display: "inline-block",
                      textDecoration: "none",
                      color: "white"
                    }}
                  >
                    {t("communityMeetingJoin")}
                  </a>
                </div>
              ))}
            </div>
          </div>

          {/* Section 3: Schemes & Insurance */}
          <div className="card" style={{ marginBottom: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
              <span style={{ fontSize: "1.8rem" }}>🏛️</span>
              <h3 style={{ fontSize: "1.3rem", fontWeight: 700 }}>
                {t("communitySchemesTitle")}
              </h3>
            </div>
            <p style={{ color: "var(--text-muted)", fontSize: "0.95rem", marginBottom: 20 }}>
              {t("communitySchemesDesc")}
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {GOVT_SCHEMES.map((scheme, index) => (
                <div 
                  key={index}
                  style={{
                    padding: 16,
                    borderRadius: 8,
                    background: "rgba(13, 148, 136, 0.04)",
                    border: "1px solid var(--border-color)",
                    display: "flex",
                    flexDirection: "column",
                    gap: 8
                  }}
                >
                  <h4 style={{ fontWeight: 600, fontSize: "1.05rem", color: "var(--text-dark)" }}>
                    {language === "mr" ? scheme.titleMr : scheme.titleEn}
                  </h4>
                  <p style={{ fontSize: "0.88rem", color: "var(--text-muted)" }}>
                    {language === "mr" ? scheme.descMr : scheme.descEn}
                  </p>
                  <a 
                    href={scheme.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      color: "var(--secondary)",
                      fontWeight: 600,
                      fontSize: "0.9rem",
                      alignSelf: "flex-start",
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                      marginTop: 4
                    }}
                  >
                    Visit Portal ↗
                  </a>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};

export default Forum;
