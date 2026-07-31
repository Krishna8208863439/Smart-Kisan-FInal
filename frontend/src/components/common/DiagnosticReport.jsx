import React from 'react';
import { ShieldCheck, AlertTriangle, AlertOctagon, Sparkles } from 'lucide-react';

/**
 * Signature Industrial DiagnosticReport Component for Smart Kisan AI
 * Features:
 * - Signature Agronomic SVG Radial Confidence Arc Gauge
 * - Colorblind-safe status pills (Healthy, Stressed, Diseased)
 * - Structured 2-column key-value field grid with JetBrains Mono numbers
 * - Organic & Chemical dosage cards
 */
export default function DiagnosticReport({ report }) {
  if (!report) return null;

  const confidencePct = Math.round((report.confidence || 0.95) * 100);
  const healthStatus = (report.health_status || report.crop_health || (report.disease && report.disease.toLowerCase().includes("healthy") ? "Healthy" : "Infected")).toLowerCase();

  const isHealthy = healthStatus.includes("healthy") || healthStatus === "normal";
  const isStressed = healthStatus.includes("stressed") || healthStatus.includes("warning");
  
  const statusColor = isHealthy ? "#15803D" : isStressed ? "#D97706" : "#DC2626";
  const statusBg = isHealthy ? "var(--color-status-healthy-bg)" : isStressed ? "var(--color-status-stressed-bg)" : "var(--color-status-diseased-bg)";
  const StatusIcon = isHealthy ? ShieldCheck : isStressed ? AlertTriangle : AlertOctagon;

  // Gauge calculation for 180-degree radial arc
  const radius = 42;
  const circumference = Math.PI * radius; // approx 131.9
  const dashOffset = circumference - (confidencePct / 100) * circumference;

  return (
    <div
      className="diagnostic-report-card"
      style={{
        background: "var(--color-surface-card)",
        border: "1px solid var(--color-border-subtle)",
        borderTop: `4px solid ${statusColor}`,
        borderRadius: "var(--radius-lg)",
        padding: 24,
        boxShadow: "var(--shadow-card)",
        marginTop: 16
      }}
    >
      {/* Top Banner: Plant Name & Signature Health Radial Arc */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--color-border-subtle)", paddingBottom: 20, marginBottom: 20, flexWrap: "wrap", gap: 16 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
            <span
              style={{
                background: statusBg,
                color: statusColor,
                padding: "4px 12px",
                borderRadius: 20,
                fontSize: 12.5,
                fontWeight: 800,
                display: "inline-flex",
                alignItems: "center",
                gap: 6
              }}
            >
              <StatusIcon size={16} color={statusColor} />
              {isHealthy ? "HEALTHY CROP" : isStressed ? "STRESSED FOLIAGE" : "DISEASE DETECTED"}
            </span>
            {report.ai_model && (
              <span style={{ fontSize: 11.5, fontWeight: 700, color: "var(--color-text-muted)" }}>
                via {report.ai_model}
              </span>
            )}
          </div>
          <h2 style={{ fontSize: 24, fontWeight: 800, color: "var(--color-text-main)", letterSpacing: "-0.4px" }}>
            {report.plant_name || report.crop_name || report.crop || "Agricultural Crop"}
          </h2>
          <p style={{ fontSize: 14, color: "var(--color-text-muted)", marginTop: 2 }}>
            {report.disease_name || report.disease || report.problems_detected || "No active foliage lesions observed."}
          </p>
        </div>

        {/* Signature Device: SVG Radial Gauge Arc */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", minWidth: 110 }}>
          <div style={{ position: "relative", width: 100, height: 60, display: "flex", justifyContent: "center" }}>
            <svg width="100" height="60" viewBox="0 0 100 60">
              {/* Background Arc */}
              <path
                d="M 10 50 A 42 42 0 0 1 90 50"
                fill="none"
                stroke="var(--color-border-subtle)"
                strokeWidth="8"
                strokeLinecap="round"
              />
              {/* Filled Arc */}
              <path
                d="M 10 50 A 42 42 0 0 1 90 50"
                fill="none"
                stroke={statusColor}
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={dashOffset}
                style={{ transition: "stroke-dashoffset 0.8s ease-in-out" }}
              />
            </svg>
            <div style={{ position: "absolute", bottom: 0, textAlign: "center" }}>
              <span className="data-mono" style={{ fontSize: 18, fontWeight: 800, color: "var(--color-text-main)" }}>
                {confidencePct}%
              </span>
            </div>
          </div>
          <span style={{ fontSize: 10.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.6px", color: "var(--color-text-muted)", marginTop: 2 }}>
            Confidence
          </span>
        </div>
      </div>

      {/* Structured Key-Value Fields Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 16, marginBottom: 20 }}>
        {report.growth_stage && (
          <div style={{ background: "var(--color-bg-warm-neutral)", padding: 14, borderRadius: 12 }}>
            <div style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", color: "var(--color-text-muted)" }}>Growth Stage</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: "var(--color-text-main)", marginTop: 2 }}>{report.growth_stage}</div>
          </div>
        )}
        {report.severity && (
          <div style={{ background: "var(--color-bg-warm-neutral)", padding: 14, borderRadius: 12 }}>
            <div style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", color: "var(--color-text-muted)" }}>Threat Severity</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: statusColor, marginTop: 2, textTransform: "capitalize" }}>{report.severity} Severity</div>
          </div>
        )}
        {report.plant_health_score && (
          <div style={{ background: "var(--color-bg-warm-neutral)", padding: 14, borderRadius: 12 }}>
            <div style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", color: "var(--color-text-muted)" }}>Foliage Health Score</div>
            <div className="data-mono" style={{ fontSize: 14, fontWeight: 700, color: "var(--color-text-main)", marginTop: 2 }}>{report.plant_health_score}</div>
          </div>
        )}
        {report.nutrient_status && (
          <div style={{ background: "var(--color-bg-warm-neutral)", padding: 14, borderRadius: 12 }}>
            <div style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", color: "var(--color-text-muted)" }}>Soil & Nutrient Profile</div>
            <div style={{ fontSize: 13.5, fontWeight: 600, color: "var(--color-text-main)", marginTop: 2 }}>{report.nutrient_status}</div>
          </div>
        )}
      </div>

      {/* Detailed Diagnostics Description */}
      {report.disease_description && (
        <div style={{ marginBottom: 18, background: "var(--color-bg-warm-neutral)", padding: 16, borderRadius: 12 }}>
          <h4 style={{ fontSize: 13, fontWeight: 800, textTransform: "uppercase", color: "var(--color-field-green)", marginBottom: 6 }}>Visual Symptom Analysis</h4>
          <p style={{ fontSize: 14, color: "var(--color-text-main)", lineHeight: 1.6 }}>{report.disease_description}</p>
        </div>
      )}

      {/* Recommendations Cards: Organic vs Chemical */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
        {/* Organic Treatment */}
        {(report.organic_treatment || report.treatment) && (
          <div style={{ border: "1px solid var(--color-status-healthy)", borderRadius: 12, padding: 16, background: "var(--color-status-healthy-bg)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 800, color: "var(--color-status-healthy)", marginBottom: 6 }}>
              <Sparkles size={16} /> Organic Treatment (Recommended)
            </div>
            <p style={{ fontSize: 13.5, color: "var(--color-text-main)", lineHeight: 1.55 }}>
              {report.organic_treatment || report.treatment}
            </p>
          </div>
        )}

        {/* Chemical Control */}
        {report.chemical_treatment && (
          <div style={{ border: "1px solid var(--color-border-subtle)", borderRadius: 12, padding: 16, background: "var(--color-bg-warm-neutral)" }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: "var(--color-text-main)", marginBottom: 6 }}>
              💊 Chemical Control & Doses
            </div>
            <p style={{ fontSize: 13.5, color: "var(--color-text-main)", lineHeight: 1.55 }}>
              {report.chemical_treatment}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
