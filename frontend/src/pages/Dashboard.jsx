import { Link } from "react-router-dom";
import CropDiseaseDetectionSection from "../components/CropDiseaseDetectionSection";

const Dashboard = () => {
  return (
    <div className="app-container">
      {/* Welcome Banner */}
      <div className="card" style={{ background: "linear-gradient(135deg, #16a34a, #15803d)", color: "white", padding: 24, marginBottom: 24 }}>
        <h1 style={{ fontSize: 26, fontWeight: 800 }}>Farmer Dashboard</h1>
        <p style={{ opacity: 0.9, marginTop: 4 }}>
          Welcome back to Smart Kisan! Explore AI advisory tools, update your crop calendars, check mandi price changes, or discuss with fellow farmers.
        </p>
      </div>

      <h2 style={{ marginBottom: 16 }}>Agri Advisory Suite</h2>
      
      {/* 2x3 Grid of features */}
      <div className="dashboard-grid" style={{ marginBottom: 24 }}>
        
        <div className="card" style={{ display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: 28, marginBottom: 8 }}>🤖</div>
            <h3>Kisan AI Chatbot</h3>
            <p style={{ color: "var(--text-muted)", fontSize: 13, marginTop: 4 }}>
              Chat with a multilingual agronomy assistant to diagnose pests or get crop prescriptions.
            </p>
          </div>
          <Link to="/chat" style={{ marginTop: 16 }}>
            <button className="button" style={{ width: "100%" }}>Open Chat 💬</button>
          </Link>
        </div>

        <div className="card" style={{ display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: 28, marginBottom: 8 }}>📅</div>
            <h3>Sowing Task Calendar</h3>
            <p style={{ color: "var(--text-muted)", fontSize: 13, marginTop: 4 }}>
              Track day-by-day actions from nursery to harvest, and mark tasks as completed.
            </p>
          </div>
          <Link to="/ai-tools" style={{ marginTop: 16 }}>
            <button className="button" style={{ width: "100%" }}>Open Planner 📅</button>
          </Link>
        </div>

        <div className="card" style={{ display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: 28, marginBottom: 8 }}>🧪</div>
            <h3>NPK Nutrient Advisor</h3>
            <p style={{ color: "var(--text-muted)", fontSize: 13, marginTop: 4 }}>
              Input soil NPK test metrics to calculate target Urea, DAP, and MOP bag dosages.
            </p>
          </div>
          <Link to="/ai-tools" style={{ marginTop: 16 }}>
            <button className="button" style={{ width: "100%" }}>Calculate NPK 🧪</button>
          </Link>
        </div>

        <div className="card" style={{ display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: 28, marginBottom: 8 }}>🛒</div>
            <h3>Farmers Bazaar & Store</h3>
            <p style={{ color: "var(--text-muted)", fontSize: 13, marginTop: 4 }}>
              Buy high-grade seeds and equipment, or list your harvest crop surplus for sale.
            </p>
          </div>
          <Link to="/marketplace" style={{ marginTop: 16 }}>
            <button className="button" style={{ width: "100%" }}>Visit Bazaar 🛒</button>
          </Link>
        </div>

        <div className="card" style={{ display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: 28, marginBottom: 8 }}>☀️</div>
            <h3>Weather Insights</h3>
            <p style={{ color: "var(--text-muted)", fontSize: 13, marginTop: 4 }}>
              See a 3-day regional weather forecast to optimize sowing and watering schedules.
            </p>
          </div>
          <Link to="/weather" style={{ marginTop: 16 }}>
            <button className="button" style={{ width: "100%" }}>View Forecast ☀️</button>
          </Link>
        </div>

        <div className="card" style={{ display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: 28, marginBottom: 8 }}>📈</div>
            <h3>Mandi Market Prices</h3>
            <p style={{ color: "var(--text-muted)", fontSize: 13, marginTop: 4 }}>
              Track local agricultural mandi prices to make informed crop sale arrangements.
            </p>
          </div>
          <Link to="/market" style={{ marginTop: 16 }}>
            <button className="button" style={{ width: "100%" }}>Check Prices 📈</button>
          </Link>
        </div>

      </div>

      {/* Disease Detection Panel */}
      <CropDiseaseDetectionSection />
    </div>
  );
};

export default Dashboard;
