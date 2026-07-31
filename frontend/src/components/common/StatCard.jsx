import React from 'react';

/**
 * Standardized StatCard Component for Smart Kisan AI
 * Features: Numeric-forward Space Mono / JetBrains Mono typography, Trend badge, Accent border
 */
export default function StatCard({
  title,
  value,
  unit = "",
  trend,
  trendDirection = "up", // "up" | "down" | "neutral"
  subtitle,
  icon: IconComponent,
  accentColor = "#D97706"
}) {
  const getTrendColor = () => {
    if (trendDirection === "up") return "#15803D";
    if (trendDirection === "down") return "#DC2626";
    return "#D97706";
  };

  return (
    <div
      className="stat-card-container"
      style={{
        background: "var(--color-surface-card)",
        border: "1px solid var(--color-border-subtle)",
        borderTop: `3px solid ${accentColor}`,
        borderRadius: "var(--radius-lg)",
        padding: "20px 22px",
        boxShadow: "var(--shadow-card)",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        transition: "all 0.25s ease"
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <span style={{ fontSize: 13, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", color: "var(--color-text-muted)" }}>
          {title}
        </span>
        {IconComponent && (
          <div style={{ background: "rgba(217, 119, 6, 0.1)", borderRadius: 8, padding: 6, display: "inline-flex" }}>
            <IconComponent size={18} color={accentColor} />
          </div>
        )}
      </div>

      <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginBottom: 8 }}>
        <span className="data-mono" style={{ fontSize: 28, fontWeight: 800, color: "var(--color-text-main)" }}>
          {value}
        </span>
        {unit && (
          <span style={{ fontSize: 14, fontWeight: 600, color: "var(--color-text-muted)" }}>
            {unit}
          </span>
        )}
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12.5 }}>
        {subtitle && <span style={{ color: "var(--color-text-muted)" }}>{subtitle}</span>}
        {trend && (
          <span
            className="data-mono"
            style={{
              fontWeight: 700,
              color: getTrendColor(),
              background: trendDirection === "up" ? "var(--color-status-healthy-bg)" : trendDirection === "down" ? "var(--color-status-diseased-bg)" : "var(--color-status-stressed-bg)",
              padding: "2px 8px",
              borderRadius: 12
            }}
          >
            {trendDirection === "up" ? "▲ " : trendDirection === "down" ? "▼ " : "• "}
            {trend}
          </span>
        )}
      </div>
    </div>
  );
}
