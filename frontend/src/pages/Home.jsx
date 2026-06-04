import React, { useState } from "react";
import { Link } from "react-router-dom";

const FAQ_ITEMS = [
  {
    q: "How does the AI Crop Disease detection model work?",
    a: "It analyzes uploaded images of plant leaves to identify visual symptoms of blight, rust, or curls, combining it with crop-specific agronomy rules to suggest fungicide and water adjustments."
  },
  {
    q: "Do I need to pay to use the Kisan AI Copilot?",
    a: "No! The platform features a local rules-based engine which is 100% free. Users can optionally supply their own Google Gemini API keys to activate advanced multilingual AI conversations."
  },
  {
    q: "How does the Farmers Bazaar handle payments?",
    a: "It runs a direct peer-to-peer catalog system. Farmers list their price and contact, and buyers/merchants coordinate directly via the SMS-verified Kisan network with zero platform commissions."
  }
];

const PREVIEWS = {
  Tomato: [
    { title: "Sowing in Nursery Bed", day: "Day 0", details: "Prepare fine soil bed and sow seeds 0.5 cm deep." },
    { title: "Transplanting Seedlings", day: "Day 25", details: "Shift healthy seedlings to the main field with proper row spacing." },
    { title: "Top Dressing (NPK)", day: "Day 45", details: "Apply targeted nitrogen and potassium fertilizers around root zones." },
    { title: "Fruiting & Harvesting", day: "Day 95", details: "Begin harvesting firm, ripe red tomatoes." }
  ],
  Paddy: [
    { title: "Seed Soaking & Sprouting", day: "Day 0", details: "Soak paddy seeds for 24 hours to accelerate sprouting." },
    { title: "Seedling Nursery Pulling", day: "Day 25", details: "Uproot nursery seedlings and transplant into puddled clay fields." },
    { title: "Tillering Phase Weeding", day: "Day 55", details: "Ensure standing water depth of 5cm; clean out weeds." },
    { title: "Harvesting Paddy Crops", day: "Day 125", details: "Drain the fields 10 days before harvesting dry golden grains." }
  ],
  Wheat: [
    { title: "Seed Treatment & Sowing", day: "Day 0", details: "Treat seeds and sow in rows spaced at 22 cm." },
    { title: "First Crown Root Irrigation", day: "Day 21", details: "Irrigate the field - critical crown root initiation phase." },
    { title: "Tillering Phase Top Dressing", day: "Day 35", details: "Apply Urea fertilizer to boost tillers density." },
    { title: "Maturity & Combines Harvesting", day: "Day 130", details: "Harvest mature dry wheat heads." }
  ]
};

const Home = () => {
  // Crop Simulator State
  const [selectedCrop, setSelectedCrop] = useState("Tomato");
  const [simDate, setSimDate] = useState(new Date().toISOString().split("T")[0]);
  const [timeline, setTimeline] = useState(null);

  // FAQ Accordion State
  const [openFaq, setOpenFaq] = useState(null);

  const handleSimulate = (e) => {
    e.preventDefault();
    const steps = PREVIEWS[selectedCrop] || PREVIEWS["Tomato"];
    const base = new Date(simDate);
    
    const calculated = steps.map((s, idx) => {
      const stepDate = new Date(base);
      const dayOffset = idx === 0 ? 0 : idx === 1 ? 25 : idx === 2 ? 45 : idx === 3 ? 95 : 120;
      stepDate.setDate(stepDate.getDate() + dayOffset);
      return {
        ...s,
        dateStr: stepDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
      };
    });
    setTimeline(calculated);
  };

  return (
    <div className="app-container">
      {/* Hero Section */}
      <section 
        className="card" 
        style={{ 
          background: "linear-gradient(rgba(21, 128, 61, 0.85), rgba(22, 163, 74, 0.9)), url('https://images.unsplash.com/photo-1627920769842-6887c6df05ca?auto=format&fit=crop&w=1200&q=80') no-repeat center center", 
          backgroundSize: "cover",
          color: "white", 
          padding: "60px 40px",
          textAlign: "center",
          marginBottom: 32
        }}
      >
        <h1 style={{ fontSize: 38, fontWeight: 900, marginBottom: 12 }}>Digital Agriculture Companion</h1>
        <p style={{ fontSize: 18, maxWidth: 700, margin: "0 auto 24px auto", opacity: 0.95 }}>
          Smart Kisan bridges the gap between traditional wisdom and modern tech. Leverage crop simulators, visual disease diagnostics, and trading pipelines to boost your farm's productivity.
        </p>
        <div style={{ display: "flex", justifyContent: "center", gap: 16 }}>
          <Link to="/register">
            <button className="button" style={{ background: "#f59e0b", padding: "14px 28px", fontSize: 16 }}>
              Get Started Free 🚀
            </button>
          </Link>
          <Link to="/login">
            <button className="button button-secondary" style={{ background: "rgba(255,255,255,0.15)", color: "white", borderColor: "white", padding: "14px 28px", fontSize: 16 }}>
              Log In
            </button>
          </Link>
        </div>
      </section>

      {/* Impact Numbers Grid */}
      <section style={{ marginBottom: 36 }}>
        <h2 style={{ textAlign: "center", marginBottom: 20 }}>Smart Kisan Impact</h2>
        <div className="dashboard-grid">
          <div className="card text-center" style={{ padding: 18 }}>
            <div style={{ fontSize: 32, fontWeight: 800, color: "var(--primary)" }}>15,000+</div>
            <div style={{ fontSize: 12.5, fontWeight: 600, color: "var(--text-muted)", marginTop: 4 }}>Registered Farmers</div>
          </div>
          <div className="card text-center" style={{ padding: 18 }}>
            <div style={{ fontSize: 32, fontWeight: 800, color: "var(--primary)" }}>94.2%</div>
            <div style={{ fontSize: 12.5, fontWeight: 600, color: "var(--text-muted)", marginTop: 4 }}>Diagnosis Accuracy</div>
          </div>
          <div className="card text-center" style={{ padding: 18 }}>
            <div style={{ fontSize: 32, fontWeight: 800, color: "var(--primary)" }}>500+ Tons</div>
            <div style={{ fontSize: 12.5, fontWeight: 600, color: "var(--text-muted)", marginTop: 4 }}>Harvest Traded</div>
          </div>
          <div className="card text-center" style={{ padding: 18 }}>
            <div style={{ fontSize: 32, fontWeight: 800, color: "var(--primary)" }}>₹0</div>
            <div style={{ fontSize: 12.5, fontWeight: 600, color: "var(--text-muted)", marginTop: 4 }}>Commission Fees</div>
          </div>
        </div>
      </section>

      {/* Core Split Section: Interactive Preview simulator widget */}
      <section className="grid-2" style={{ marginBottom: 36 }}>
        {/* Interactive Crop Planning Simulator */}
        <div className="card">
          <h3 style={{ marginBottom: 6 }}>🌱 Interactive Crop Planner (Simulation)</h3>
          <p style={{ color: "var(--text-muted)", fontSize: 13, marginBottom: 16 }}>
            Select a crop and sowing target to preview the sowing schedule generated for your field before signing up!
          </p>

          <form onSubmit={handleSimulate}>
            <label>Select Crop</label>
            <select className="input" value={selectedCrop} onChange={(e) => setSelectedCrop(e.target.value)}>
              <option value="Tomato">Tomato</option>
              <option value="Paddy">Paddy / Rice</option>
              <option value="Wheat">Wheat</option>
            </select>

            <label>Estimated Sowing Date</label>
            <input 
              type="date" 
              className="input" 
              value={simDate} 
              onChange={(e) => setSimDate(e.target.value)} 
            />

            <button type="submit" className="button" style={{ width: "100%" }}>
              Simulate Growth Timeline 📈
            </button>
          </form>
        </div>

        {/* Timeline simulation results */}
        <div className="card" style={{ background: "#fcfdfc" }}>
          <h3>Growth Pipeline Preview</h3>
          {!timeline ? (
            <div style={{ padding: "40px 0", textAlign: "center", color: "var(--text-muted)" }}>
              <span style={{ fontSize: 40 }}>📅</span>
              <p style={{ marginTop: 12, fontSize: 13.5 }}>Configure parameters on the left and simulate to view growth steps.</p>
            </div>
          ) : (
            <div style={{ marginTop: 12 }}>
              <strong style={{ fontSize: 14, color: "var(--primary)" }}>{selectedCrop} Sowing Milestones:</strong>
              
              <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 16 }}>
                {timeline.map((step, idx) => (
                  <div key={idx} style={{ display: "flex", gap: 12, borderLeft: "3px solid var(--primary-light)", paddingLeft: 12, paddingBottom: 6 }}>
                    <div>
                      <span style={{ 
                        background: "var(--primary-light)", 
                        color: "var(--primary-hover)", 
                        padding: "1px 6px", 
                        borderRadius: 12, 
                        fontSize: 10, 
                        fontWeight: 700 
                      }}>
                        {step.day}
                      </span>
                      <strong style={{ display: "block", fontSize: 13.5, marginTop: 2 }}>{step.title}</strong>
                      <span style={{ fontSize: 11, color: "var(--text-muted)" }}>Est: {step.dateStr}</span>
                      <p style={{ fontSize: 12, color: "#374151", marginTop: 2 }}>{step.details}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Expandable FAQs accordion */}
      <section className="card" style={{ marginBottom: 24 }}>
        <h3 style={{ marginBottom: 16, textCenter: "center" }}>Frequently Asked Questions</h3>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {FAQ_ITEMS.map((item, idx) => (
            <div 
              key={idx} 
              style={{ 
                border: "1.5px solid var(--border-color)", 
                borderRadius: 8, 
                overflow: "hidden" 
              }}
            >
              <div 
                onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                style={{ 
                  background: openFaq === idx ? "var(--primary-light)" : "white",
                  padding: "12px 16px",
                  cursor: "pointer",
                  fontWeight: 700,
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  fontSize: 14.5
                }}
              >
                <span>{item.q}</span>
                <span>{openFaq === idx ? "➖" : "➕"}</span>
              </div>
              
              {openFaq === idx && (
                <div style={{ padding: 16, background: "white", fontSize: 13.5, color: "#374151", borderTop: "1.5px solid var(--border-color)", lineHeight: 1.6 }}>
                  {item.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

export default Home;
