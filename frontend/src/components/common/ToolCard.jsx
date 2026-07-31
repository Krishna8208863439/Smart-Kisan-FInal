import React from 'react';
import { Link } from 'react-router-dom';

/**
 * Standardized ToolCard Component for Smart Kisan AI
 * Features: Accent Top Border, Icon Badge, Outfit Display Title, Monospace badges, Hover lift
 */
export default function ToolCard({
  icon: IconComponent,
  iconColor = "#1B7A43",
  iconBg = "rgba(27, 122, 67, 0.1)",
  title,
  description,
  to,
  btnText,
  accentColor = "#1B7A43"
}) {
  return (
    <div
      className="agri-suite-card"
      style={{ borderTop: `3px solid ${accentColor}` }}
    >
      <div className="agri-suite-card-top">
        <div
          className="agri-suite-icon"
          style={{
            background: iconBg,
            borderRadius: 12,
            padding: 10,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: 44,
            height: 44,
            marginBottom: 12
          }}
        >
          {IconComponent && <IconComponent size={24} color={iconColor} />}
        </div>

        <h3 className="agri-suite-card-title">{title}</h3>
        <p className="agri-suite-card-desc">{description}</p>
      </div>

      <Link to={to} style={{ textDecoration: "none" }}>
        <button className="agri-suite-btn">
          {btnText}
        </button>
      </Link>
    </div>
  );
}
