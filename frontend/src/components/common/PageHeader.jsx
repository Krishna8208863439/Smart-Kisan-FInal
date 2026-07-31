import React from 'react';

/**
 * Standardized PageHeader Component for Smart Kisan AI
 * Features: Title in Outfit Display Font, Subtitle, Breadcrumbs, Action Button / Status Badge
 */
export default function PageHeader({
  title,
  subtitle,
  breadcrumb = "Dashboard",
  actionButton,
  badgeText,
  badgeColor = "#1B7A43"
}) {
  return (
    <div
      className="page-header-container"
      style={{
        background: "var(--color-surface-card)",
        border: "1px solid var(--color-border-subtle)",
        borderLeft: `4px solid ${badgeColor}`,
        borderRadius: "var(--radius-lg)",
        padding: "24px 28px",
        marginBottom: 28,
        boxShadow: "var(--shadow-card)",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        flexWrap: "wrap",
        gap: 16
      }}
    >
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
          <span style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.6px", color: "var(--color-text-muted)" }}>
            Smart Kisan AI / {breadcrumb}
          </span>
          {badgeText && (
            <span
              style={{
                background: "var(--color-field-green-light)",
                color: badgeColor,
                padding: "2px 8px",
                borderRadius: 12,
                fontSize: 11,
                fontWeight: 800
              }}
            >
              {badgeText}
            </span>
          )}
        </div>
        <h1 style={{ fontSize: 26, fontWeight: 800, color: "var(--color-text-main)", letterSpacing: "-0.5px", margin: 0 }}>
          {title}
        </h1>
        {subtitle && (
          <p style={{ fontSize: 14, color: "var(--color-text-muted)", marginTop: 4, margin: "4px 0 0 0" }}>
            {subtitle}
          </p>
        )}
      </div>

      {actionButton && <div>{actionButton}</div>}
    </div>
  );
}
