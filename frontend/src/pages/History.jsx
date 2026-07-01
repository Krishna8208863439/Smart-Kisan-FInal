import { useState, useEffect, useCallback } from "react";
import { useHistory } from "../context/HistoryContext";
import { useLanguage } from "../context/LanguageContext";

// ── Type metadata ────────────────────────────────────────────────────────────
const TYPE_META = {
  chat:               { label: "AI Chat",           labelMr: "एआय गप्पा",            icon: "🤖", color: "#0d9488" },
  crop_recommendation:{ label: "Crop Advisor",       labelMr: "पीक सल्लागार",          icon: "🌱", color: "#16a34a" },
  weather:            { label: "Weather",            labelMr: "हवामान",               icon: "🌤️", color: "#0284c7" },
  mandi_prices:       { label: "Mandi Prices",       labelMr: "बाजार भाव",             icon: "📈", color: "#7c3aed" },
  disease_scan:       { label: "Disease Scan",       labelMr: "रोग निदान",             icon: "🔬", color: "#dc2626" },
  yield_prediction:   { label: "Yield Prediction",   labelMr: "उत्पादन अंदाज",         icon: "📊", color: "#d97706" },
  marketplace:        { label: "Marketplace",        labelMr: "बाजार",                icon: "🛒", color: "#b45309" },
  agri_health:        { label: "Agri Health",        labelMr: "कृषी आरोग्य",           icon: "🏥", color: "#9333ea" },
  ai_tool:            { label: "AI Tool",            labelMr: "कृषी एआय साधन",         icon: "🛠️", color: "#1d4ed8" },
};

const FILTER_TABS = [
  { key: "all",                label: "All",         labelMr: "सर्व",           icon: "📋" },
  { key: "chat",               label: "Chat",        labelMr: "गप्पा",          icon: "🤖" },
  { key: "crop_recommendation",label: "Crops",       labelMr: "पिके",           icon: "🌱" },
  { key: "weather",            label: "Weather",     labelMr: "हवामान",         icon: "🌤️" },
  { key: "disease_scan",       label: "Disease",     labelMr: "रोग",            icon: "🔬" },
  { key: "yield_prediction",   label: "Yield",       labelMr: "उत्पन्न",        icon: "📊" },
  { key: "marketplace",        label: "Marketplace", labelMr: "बाजार",          icon: "🛒" },
];

// ── Date grouping helper ──────────────────────────────────────────────────────
function getDateGroup(isoStr, language) {
  const d = new Date(isoStr);
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterdayStart = new Date(todayStart - 86400000);
  const weekStart = new Date(todayStart - 6 * 86400000);

  if (d >= todayStart) return language === "mr" ? "आज" : "Today";
  if (d >= yesterdayStart) return language === "mr" ? "काल" : "Yesterday";
  if (d >= weekStart) return language === "mr" ? "या आठवड्यात" : "This Week";
  return language === "mr" ? "जुने" : "Older";
}

const GROUP_ORDER = ["Today", "Yesterday", "This Week", "Older",
                     "आज", "काल", "या आठवड्यात", "जुने"];

// ── Format timestamp ──────────────────────────────────────────────────────────
function formatTime(isoStr) {
  return new Date(isoStr).toLocaleTimeString("en-IN", {
    hour: "2-digit", minute: "2-digit",
  });
}
function formatFullDate(isoStr) {
  return new Date(isoStr).toLocaleDateString("en-IN", {
    weekday: "short", day: "numeric", month: "short", year: "numeric",
  });
}

// ── Single History Card ───────────────────────────────────────────────────────
const HistoryCard = ({ entry, onDelete, language }) => {
  const [expanded, setExpanded] = useState(false);
  const meta = TYPE_META[entry.type] || {
    label: entry.type, labelMr: entry.type, icon: "📌", color: "#6b7280",
  };

  return (
    <div
      style={{
        background: "var(--bg-card)",
        border: "1px solid var(--border-color)",
        borderLeft: `4px solid ${meta.color}`,
        borderRadius: 12,
        padding: "14px 16px",
        marginBottom: 10,
        transition: "box-shadow 0.2s",
        boxShadow: "var(--shadow-sm)",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.boxShadow = "var(--shadow-md)")}
      onMouseLeave={(e) => (e.currentTarget.style.boxShadow = "var(--shadow-sm)")}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
        {/* Left: Icon + content */}
        <div style={{ display: "flex", gap: 12, flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: 26,
              width: 44,
              height: 44,
              borderRadius: 10,
              background: `${meta.color}18`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            {meta.icon}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 3 }}>
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  background: `${meta.color}20`,
                  color: meta.color,
                  padding: "2px 8px",
                  borderRadius: 10,
                  textTransform: "uppercase",
                  letterSpacing: 0.5,
                  flexShrink: 0,
                }}
              >
                {language === "mr" ? meta.labelMr : meta.label}
              </span>
              <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
                {formatTime(entry.timestamp)} · {formatFullDate(entry.timestamp)}
              </span>
            </div>
            <div style={{ fontWeight: 700, fontSize: 14, color: "var(--text-dark)", marginBottom: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {entry.title}
            </div>
            <div style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: expanded ? "normal" : "nowrap" }}>
              {entry.summary}
            </div>
          </div>
        </div>

        {/* Right: actions */}
        <div style={{ display: "flex", gap: 6, flexShrink: 0, alignItems: "flex-start" }}>
          {entry.data && Object.keys(entry.data).length > 0 && (
            <button
              onClick={() => setExpanded((p) => !p)}
              style={{
                background: "var(--bg-main)",
                border: "1px solid var(--border-color)",
                borderRadius: 8,
                padding: "4px 10px",
                fontSize: 11,
                fontWeight: 700,
                cursor: "pointer",
                color: "var(--text-muted)",
                whiteSpace: "nowrap",
              }}
            >
              {expanded ? (language === "mr" ? "बंद करा" : "Hide") : (language === "mr" ? "तपशील" : "Details")}
            </button>
          )}
          <button
            onClick={() => onDelete(entry.id)}
            style={{
              background: "transparent",
              border: "1px solid #fecaca",
              borderRadius: 8,
              padding: "4px 8px",
              fontSize: 13,
              cursor: "pointer",
              color: "#ef4444",
            }}
            title={language === "mr" ? "हटवा" : "Delete"}
          >
            ✕
          </button>
        </div>
      </div>

      {/* Expandable detail panel */}
      {expanded && entry.data && (
        <div
          style={{
            marginTop: 12,
            background: "var(--bg-main)",
            borderRadius: 8,
            padding: "12px 14px",
            fontSize: 12.5,
            color: "var(--text-dark)",
            lineHeight: 1.6,
            borderTop: "1px dashed var(--border-color)",
          }}
        >
          <strong style={{ display: "block", marginBottom: 6, fontSize: 11, textTransform: "uppercase", color: "var(--text-muted)" }}>
            {language === "mr" ? "अतिरिक्त माहिती" : "Details"}
          </strong>
          {Object.entries(entry.data).map(([key, val]) => (
            <div key={key} style={{ display: "flex", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
              <span style={{ fontWeight: 700, color: "var(--text-muted)", minWidth: 100, flexShrink: 0 }}>{key}:</span>
              <span style={{ color: "var(--text-dark)", wordBreak: "break-word" }}>
                {typeof val === "object" ? JSON.stringify(val) : String(val)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ── Main History Page ─────────────────────────────────────────────────────────
const History = () => {
  const { getHistory, clearEntry, clearHistory } = useHistory();
  const { language } = useLanguage();
  const [entries, setEntries] = useState([]);
  const [activeFilter, setActiveFilter] = useState("all");
  const [confirmClear, setConfirmClear] = useState(false);

  const refresh = useCallback(() => setEntries(getHistory()), [getHistory]);

  useEffect(() => {
    refresh();
    // Poll for updates (other tabs write to localStorage)
    const id = setInterval(refresh, 3000);
    return () => clearInterval(id);
  }, [refresh]);

  const handleDelete = (id) => {
    clearEntry(id);
    refresh();
  };

  const handleClearAll = () => {
    if (!confirmClear) { setConfirmClear(true); return; }
    clearHistory();
    setEntries([]);
    setConfirmClear(false);
  };

  // Filter
  const filtered =
    activeFilter === "all"
      ? entries
      : entries.filter((e) => e.type === activeFilter);

  // Group by date
  const groups = {};
  filtered.forEach((e) => {
    const grp = getDateGroup(e.timestamp, language);
    if (!groups[grp]) groups[grp] = [];
    groups[grp].push(e);
  });
  const sortedGroups = GROUP_ORDER.filter((g) => groups[g]);

  const totalCount = entries.length;

  return (
    <div className="app-container">
      {/* Header */}
      <div
        className="card"
        style={{
          background: "linear-gradient(135deg, #1e3a8a 0%, #0d9488 100%)",
          color: "white",
          padding: 28,
          borderRadius: 16,
          marginBottom: 24,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
          <div>
            <h1 style={{ fontSize: 28, fontWeight: 900, margin: 0 }}>
              🕘 {language === "mr" ? "क्रियाकलाप इतिहास" : "Activity History"}
            </h1>
            <p style={{ opacity: 0.88, marginTop: 6, marginBottom: 0, fontSize: 14 }}>
              {language === "mr"
                ? "तुमच्या स्मार्ट किसान वापराचा संपूर्ण रेकॉर्ड — चॅट, पीक शिफारसी, रोग निदान आणि बरेच काही."
                : "Your complete Smart Kisan activity log — chats, crop recommendations, disease scans and more."}
            </p>
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <span style={{ fontSize: 12, background: "rgba(255,255,255,0.2)", padding: "4px 12px", borderRadius: 20, fontWeight: 700 }}>
              {totalCount} {language === "mr" ? "नोंदी" : "entries"}
            </span>
            {totalCount > 0 && (
              <button
                onClick={handleClearAll}
                style={{
                  background: confirmClear ? "#dc2626" : "rgba(255,255,255,0.15)",
                  border: "1px solid rgba(255,255,255,0.3)",
                  color: "white",
                  borderRadius: 8,
                  padding: "6px 14px",
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: "pointer",
                  transition: "all 0.2s",
                }}
                onMouseLeave={() => setConfirmClear(false)}
              >
                {confirmClear
                  ? (language === "mr" ? "✓ हटवण्याची खात्री करा" : "✓ Confirm Clear All")
                  : (language === "mr" ? "🗑️ सर्व हटवा" : "🗑️ Clear All")}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div
        style={{
          display: "flex",
          gap: 8,
          flexWrap: "wrap",
          marginBottom: 24,
          background: "var(--bg-card)",
          padding: "10px 12px",
          borderRadius: 12,
          border: "1px solid var(--border-color)",
        }}
      >
        {FILTER_TABS.map((tab) => {
          const count =
            tab.key === "all"
              ? entries.length
              : entries.filter((e) => e.type === tab.key).length;
          const isActive = activeFilter === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveFilter(tab.key)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "7px 14px",
                borderRadius: 20,
                border: "1px solid",
                borderColor: isActive ? "#0d9488" : "var(--border-color)",
                background: isActive ? "#0d9488" : "var(--bg-main)",
                color: isActive ? "white" : "var(--text-muted)",
                fontSize: 12.5,
                fontWeight: isActive ? 700 : 500,
                cursor: "pointer",
                transition: "all 0.2s",
                whiteSpace: "nowrap",
              }}
            >
              <span>{tab.icon}</span>
              <span>{language === "mr" ? tab.labelMr : tab.label}</span>
              {count > 0 && (
                <span
                  style={{
                    background: isActive ? "rgba(255,255,255,0.3)" : "var(--border-color)",
                    borderRadius: 10,
                    padding: "1px 6px",
                    fontSize: 10,
                    fontWeight: 700,
                    minWidth: 18,
                    textAlign: "center",
                  }}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Empty State */}
      {filtered.length === 0 && (
        <div
          className="card"
          style={{
            textAlign: "center",
            padding: "60px 24px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 12,
          }}
        >
          <div style={{ fontSize: 64 }}>📭</div>
          <h3 style={{ margin: 0, fontSize: 20, color: "var(--text-dark)" }}>
            {language === "mr" ? "कोणताही इतिहास नाही" : "No Activity Yet"}
          </h3>
          <p style={{ color: "var(--text-muted)", fontSize: 14, maxWidth: 360 }}>
            {activeFilter === "all"
              ? (language === "mr"
                ? "स्मार्ट किसान वापरण्यास सुरुवात करा — तुमच्या प्रत्येक क्रियाकलापाची नोंद येथे दिसेल."
                : "Start using Smart Kisan — every interaction will be recorded here automatically.")
              : (language === "mr"
                ? "या श्रेणीत अद्याप कोणतीही क्रियाकलाप नाही."
                : "No activity found in this category yet.")}
          </p>
        </div>
      )}

      {/* Timeline */}
      {sortedGroups.map((group) => (
        <div key={group} style={{ marginBottom: 28 }}>
          {/* Date group header */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              marginBottom: 14,
            }}
          >
            <div
              style={{
                fontWeight: 800,
                fontSize: 13,
                color: "var(--text-muted)",
                textTransform: "uppercase",
                letterSpacing: 0.8,
                whiteSpace: "nowrap",
              }}
            >
              {group}
            </div>
            <div style={{ flex: 1, height: 1, background: "var(--border-color)" }} />
            <div
              style={{
                fontSize: 11,
                color: "var(--text-muted)",
                background: "var(--bg-card)",
                padding: "2px 8px",
                borderRadius: 10,
                border: "1px solid var(--border-color)",
                whiteSpace: "nowrap",
              }}
            >
              {groups[group].length} {language === "mr" ? "नोंदी" : "entries"}
            </div>
          </div>

          {/* Cards */}
          {groups[group].map((entry) => (
            <HistoryCard
              key={entry.id}
              entry={entry}
              onDelete={handleDelete}
              language={language}
            />
          ))}
        </div>
      ))}

      {/* Footer note */}
      {totalCount > 0 && (
        <div style={{ textAlign: "center", color: "var(--text-muted)", fontSize: 12, marginTop: 8, paddingBottom: 8 }}>
          {language === "mr"
            ? `📱 ${totalCount} नोंदी स्थानिक साठवणीत (localStorage) जतन केल्या आहेत.`
            : `📱 ${totalCount} entries stored locally in your browser. Max 200 kept.`}
        </div>
      )}
    </div>
  );
};

export default History;
