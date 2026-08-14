import React from 'react';
import { ShieldCheck, AlertTriangle, AlertOctagon, Info, CheckCircle, HelpCircle } from 'lucide-react';

/**
 * Consolidated Claude Vision Crop Diagnostic Report Component
 * Features:
 * - Qualitative Confidence Pill Badges (High / Medium / Low with Low as outline/muted badge)
 * - Health Status Badges (Healthy, Stressed, Diseased, Unclear)
 * - AI Vision Estimate Label & Visual Evidence line
 * - General Treatment Category Recommendations (NO dosage numbers in ml/kg/L)
 * - Permanently visible Agronomic Disclaimer Card
 */
export default function DiagnosticReport({ report }) {
  if (!report) return null;

  const cropName = report.cropIdentified || report.crop_name || report.crop || "Crop / Plant";
  const healthRaw = String(report.healthStatus || report.health_status || report.crop_health || "Unclear");
  
  const isHealthy = /healthy/i.test(healthRaw);
  const isStressed = /stressed/i.test(healthRaw);
  const isDiseased = /diseased|infected/i.test(healthRaw);

  const statusLabel = isHealthy ? "HEALTHY CROP" : isStressed ? "STRESSED FOLIAGE" : isDiseased ? "DISEASE DETECTED" : "HEALTH UNCLEAR";
  const statusColor = isHealthy ? "#16a34a" : isStressed ? "#d97706" : isDiseased ? "#dc2626" : "#4b5563";
  const statusBg = isHealthy ? "#dcfce7" : isStressed ? "#fef3c7" : isDiseased ? "#fee2e2" : "#f3f4f6";
  const StatusIcon = isHealthy ? ShieldCheck : isStressed ? AlertTriangle : isDiseased ? AlertOctagon : HelpCircle;

  const assessment = report.diseaseAssessment || {};
  const suspectedIssue = assessment.suspectedIssue || report.disease_name || report.disease || (isHealthy ? "No Disease Detected" : "Unspecified Stress");
  const confidenceBand = assessment.confidence || (report.confidence > 0.8 ? "High" : report.confidence > 0.5 ? "Medium" : "Low");
  const visualEvidence = assessment.visualEvidence || report.disease_description || report.image_analysis || "Visual symptoms analyzed from photo.";

  const recommendations = Array.isArray(report.recommendations) 
    ? report.recommendations 
    : (report.organic_treatment || report.advice) 
      ? [report.organic_treatment || report.advice] 
      : ["Inspect foliage regularly.", "Consult local Krishi Vigyan Kendra (KVK) for treatment dosage."];

  const disclaimerText = report.disclaimer || "This is an AI vision estimate, not a lab-verified diagnosis. Confirm with your local Krishi Vigyan Kendra or agri extension officer before applying any treatment.";

  return (
    <div
      className="diagnostic-report-card"
      style={{
        background: "var(--bg-card, #ffffff)",
        border: "1px solid var(--border-color, #e2e8f0)",
        borderTop: `4px solid ${statusColor}`,
        borderRadius: 14,
        padding: 24,
        boxShadow: "0 4px 12px rgba(0, 0, 0, 0.05)",
        marginTop: 16
      }}
    >
      {/* Header Banner */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", borderBottom: "1px solid var(--border-color, #e2e8f0)", paddingBottom: 16, marginBottom: 18, flexWrap: "wrap", gap: 12 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
            <span
              style={{
                background: statusBg,
                color: statusColor,
                padding: "4px 12px",
                borderRadius: 20,
                fontSize: 12,
                fontWeight: 800,
                display: "inline-flex",
                alignItems: "center",
                gap: 6
              }}
            >
              <StatusIcon size={15} color={statusColor} />
              {statusLabel}
            </span>

            {/* AI Vision Estimate Badge */}
            <span
              style={{
                background: "#f1f5f9",
                color: "#475569",
                border: "1px solid #cbd5e1",
                padding: "3px 10px",
                borderRadius: 20,
                fontSize: 11,
                fontWeight: 700
              }}
            >
              📷 AI Vision Estimate
            </span>
          </div>

          <h2 style={{ fontSize: 22, fontWeight: 800, color: "var(--text-dark, #0f172a)", margin: 0 }}>
            {cropName}
          </h2>
          <p style={{ fontSize: 13.5, color: "var(--text-muted, #64748b)", marginTop: 4, marginBottom: 0 }}>
            Growth Stage: <strong>{report.growthStage || "Not specified"}</strong>
          </p>
        </div>

        {/* Qualitative Confidence Pill Badge */}
        <div style={{ textAlign: "right", display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
          <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "var(--text-muted, #64748b)", marginBottom: 4 }}>
            Vision Certainty
          </span>
          {confidenceBand === "High" && (
            <span style={{ background: "#dcfce7", color: "#15803d", border: "1px solid #86efac", padding: "4px 14px", borderRadius: 20, fontSize: 12.5, fontWeight: 800 }}>
              High Certainty
            </span>
          )}
          {confidenceBand === "Medium" && (
            <span style={{ background: "#fef3c7", color: "#b45309", border: "1px solid #fde047", padding: "4px 14px", borderRadius: 20, fontSize: 12.5, fontWeight: 800 }}>
              Medium Certainty
            </span>
          )}
          {confidenceBand === "Low" && (
            <span style={{ background: "transparent", color: "#4b5563", border: "1.5px solid #9ca3af", padding: "4px 14px", borderRadius: 20, fontSize: 12.5, fontWeight: 700, opacity: 0.85 }}>
              Low Certainty (Uncertain)
            </span>
          )}
        </div>
      </div>

      {/* Disease Assessment Block */}
      <div style={{ background: "var(--bg-main, #f8fafc)", border: "1px solid var(--border-color, #e2e8f0)", borderRadius: 10, padding: 16, marginBottom: 18 }}>
        <h4 style={{ fontSize: 12, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.5px", color: "var(--primary, #0d9488)", margin: "0 0 6px 0" }}>
          Disease Assessment
        </h4>
        <div style={{ fontSize: 16, fontWeight: 800, color: "var(--text-dark, #0f172a)", marginBottom: 8 }}>
          {suspectedIssue || "Healthy — No active disease symptoms identified."}
        </div>
        <div style={{ fontSize: 13, color: "var(--text-muted, #475569)", lineHeight: 1.5 }}>
          <strong>Visual Evidence:</strong> {visualEvidence}
        </div>
      </div>

      {/* Recommendations List */}
      <div style={{ marginBottom: 20 }}>
        <h4 style={{ fontSize: 13, fontWeight: 800, textTransform: "uppercase", color: "var(--text-dark, #0f172a)", margin: "0 0 10px 0" }}>
          Suggested Actionable Guidance
        </h4>
        <ul style={{ margin: 0, paddingLeft: 20, display: "flex", flexDirection: "column", gap: 8 }}>
          {recommendations.map((rec, idx) => (
            <li key={idx} style={{ fontSize: 13.5, color: "var(--text-dark, #334155)", lineHeight: 1.5 }}>
              {rec}
            </li>
          ))}
        </ul>
      </div>

      {/* Mandatory Disclaimer Box */}
      <div style={{
        background: "#fffbeb",
        border: "1px solid #fcd34d",
        borderRadius: 10,
        padding: "12px 16px",
        display: "flex",
        alignItems: "flex-start",
        gap: 10
      }}>
        <Info size={18} color="#d97706" style={{ flexShrink: 0, marginTop: 2 }} />
        <p style={{ margin: 0, fontSize: 12.5, color: "#92400e", lineHeight: 1.5, fontWeight: 600 }}>
          {disclaimerText}
        </p>
      </div>
    </div>
  );
}
