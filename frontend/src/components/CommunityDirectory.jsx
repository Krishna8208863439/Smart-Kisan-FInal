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

const CommunityDirectory = () => {
  const { language } = useLanguage();

  return (
    <div className="card" style={{ marginBottom: 24, background: "var(--bg-card)", border: "1px solid var(--border-color)", borderRadius: "var(--border-radius)", padding: 24, boxShadow: "var(--shadow-md)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
        <span style={{ fontSize: "2rem" }}>👥</span>
        <h2 style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--text-dark)" }}>
          {language === "mr" ? "समुदाय संसाधन आणि संपर्क सूची" : "Community Resource Center & Directory"}
        </h2>
      </div>
      
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", minWidth: 600 }}>
          <thead>
            <tr style={{ borderBottom: "2px solid var(--border-color)", paddingBottom: 10 }}>
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
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default CommunityDirectory;
