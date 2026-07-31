import React from 'react';

/**
 * Standardized EmptyState Component for Smart Kisan AI
 * Features: Agronomic icon badge, clean title, descriptive helper text, action button
 */
export default function EmptyState({
  icon: IconComponent,
  title,
  description,
  actionButton,
  accentColor = "#1B7A43"
}) {
  return (
    <div
      className="empty-state-card"
      style={{
        background: "var(--color-surface-card)",
        border: "1px dashed var(--color-border-subtle)",
        borderRadius: "var(--radius-lg)",
        padding: "48px 24px",
        textAlign: "center",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        margin: "24px 0"
      }}
    >
      {IconComponent && (
        <div
          style={{
            background: "var(--color-field-green-light)",
            borderRadius: "var(--radius-full)",
            padding: 16,
            marginBottom: 16,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center"
          }}
        >
          <IconComponent size={32} color={accentColor} />
        </div>
      )}

      <h3 style={{ fontSize: 18, fontWeight: 700, color: "var(--color-text-main)", marginBottom: 6 }}>
        {title}
      </h3>
      <p style={{ fontSize: 14, color: "var(--color-text-muted)", maxWidth: 420, lineHeight: 1.6, marginBottom: 20 }}>
        {description}
      </p>

      {actionButton && <div>{actionButton}</div>}
    </div>
  );
}
