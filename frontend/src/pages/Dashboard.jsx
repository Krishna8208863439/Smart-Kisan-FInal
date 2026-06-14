import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useLanguage } from "../context/LanguageContext";
import CropDiseaseDetectionSection from "../components/CropDiseaseDetectionSection";
import api from "../api";

const WeatherWidget = () => {
  const { language } = useLanguage();
  const [weather, setWeather] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchWidgetWeather = async () => {
      try {
        const city = localStorage.getItem("sk_last_city") || "New Delhi";
        const res = await api.get("/weather", { params: { location: city } });
        setWeather(res.data);
      } catch (err) {
        console.error("Failed to load weather widget:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchWidgetWeather();
  }, []);

  if (loading) {
    return (
      <div className="card" style={{ display: "flex", justifyContent: "center", alignItems: "center", padding: 20, marginBottom: 24, minHeight: 80 }}>
        <div className="weather-spinner" style={{ width: 20, height: 20, borderWidth: 3 }} />
        <span style={{ marginLeft: 12, fontSize: 13, color: "var(--text-muted)", fontWeight: 600 }}>Loading live weather...</span>
      </div>
    );
  }

  if (!weather || !weather.current) return null;

  const { current, location } = weather;

  return (
    <div 
      className="card" 
      style={{ 
        display: "flex", 
        flexDirection: "row", 
        justifyContent: "space-between", 
        alignItems: "center", 
        padding: "16px 20px", 
        marginBottom: 24, 
        background: "var(--bg-card)",
        border: "1px solid var(--border-color)",
        flexWrap: "wrap",
        gap: 16
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <span style={{ fontSize: 32 }}>{current.icon}</span>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <strong style={{ fontSize: 18, color: "var(--text-dark)" }}>{current.temperature}°C</strong>
            <span style={{ fontSize: 11, color: "var(--text-muted)", background: "var(--primary-light)", padding: "1px 6px", borderRadius: 4, fontWeight: 700 }}>
              {current.condition}
            </span>
          </div>
          <div style={{ fontSize: 12.5, color: "var(--text-muted)", marginTop: 2 }}>
            📍 {location} • Feels like {current.feelsLike}°C
          </div>
        </div>
      </div>

      <div style={{ display: "flex", gap: 20, flexWrap: "wrap", fontSize: 12.5, color: "var(--text-dark)" }}>
        <div>
          <span style={{ color: "var(--text-muted)" }}>Humidity: </span>
          <strong>{current.humidity}%</strong>
        </div>
        <div>
          <span style={{ color: "var(--text-muted)" }}>Wind: </span>
          <strong>{current.windSpeed} km/h</strong>
        </div>
        <div>
          <span style={{ color: "var(--text-muted)" }}>Rain: </span>
          <strong>{current.precipitation} mm</strong>
        </div>
      </div>

      <Link to="/weather" style={{ fontSize: 13, fontWeight: 700, color: "var(--primary)", textDecoration: "none" }}>
        Full Forecast →
      </Link>
    </div>
  );
};

const Dashboard = () => {
  const { language } = useLanguage();

  return (
    <div className="app-container">
      {/* Welcome Banner */}
      <div className="card" style={{ background: "linear-gradient(135deg, #16a34a, #15803d)", color: "white", padding: 24, marginBottom: 24 }}>
        <h1 style={{ fontSize: 26, fontWeight: 800 }}>
          {language === "mr" ? "शेतकरी डॅशबोर्ड" : "Farmer Dashboard"}
        </h1>
        <p style={{ opacity: 0.9, marginTop: 4 }}>
          {language === "mr" 
            ? "स्मार्ट किसानवर आपले स्वागत आहे! कृषी एआय साधने वापरा, पीक दिनदर्शिका अद्ययावत करा, बाजार भाव तपासा आणि सल्लागारांशी संपर्क साधा."
            : "Welcome back to Smart Kisan! Explore AI advisory tools, update your crop calendars, check mandi price changes, or discuss with fellow farmers."}
        </p>
      </div>

      {/* Live Weather Widget */}
      <WeatherWidget />

      <h2 style={{ marginBottom: 16 }}>
        {language === "mr" ? "कृषी सल्लागार संच" : "Agri Advisory Suite"}
      </h2>
      
      {/* 2x3 Grid of features */}
      <div className="dashboard-grid" style={{ marginBottom: 24 }}>
        
        <div className="card" style={{ display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: 28, marginBottom: 8 }}>🤖</div>
            <h3>
              {language === "mr" ? "किसान एआय चॅटबॉट" : "Kisan AI Chatbot"}
            </h3>
            <p style={{ color: "var(--text-muted)", fontSize: 13, marginTop: 4 }}>
              {language === "mr"
                ? "पिकांवरील कीड ओळखण्यासाठी किंवा पीक सल्ला मिळवण्यासाठी बहुभाषिक कृषी एआय सहाय्यकाशी चर्चा करा."
                : "Chat with a multilingual agronomy assistant to diagnose pests or get crop prescriptions."}
            </p>
          </div>
          <Link to="/chat" style={{ marginTop: 16 }}>
            <button className="button" style={{ width: "100%" }}>
              {language === "mr" ? "गप्पा सुरू करा 💬" : "Open Chat 💬"}
            </button>
          </Link>
        </div>

        <div className="card" style={{ display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: 28, marginBottom: 8 }}>📅</div>
            <h3>
              {language === "mr" ? "पेरणी कार्य दिनदर्शिका" : "Sowing Task Calendar"}
            </h3>
            <p style={{ color: "var(--text-muted)", fontSize: 13, marginTop: 4 }}>
              {language === "mr"
                ? "रोपवाटिकेपासून काढणीपर्यंतच्या दैनंदिन कामांची नोंद ठेवा आणि पूर्ण झालेली कामे चिन्हांकित करा."
                : "Track day-by-day actions from nursery to harvest, and mark tasks as completed."}
            </p>
          </div>
          <Link to="/ai-tools" style={{ marginTop: 16 }}>
            <button className="button" style={{ width: "100%" }}>
              {language === "mr" ? "नियोजक उघडा 📅" : "Open Planner 📅"}
            </button>
          </Link>
        </div>

        <div className="card" style={{ display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: 28, marginBottom: 8 }}>🧪</div>
            <h3>
              {language === "mr" ? "NPK खत सल्लागार" : "NPK Nutrient Advisor"}
            </h3>
            <p style={{ color: "var(--text-muted)", fontSize: 13, marginTop: 4 }}>
              {language === "mr"
                ? "मातीतील NPK चाचणीचे घटक टाकून आवश्यक युरिया, डीएपी आणि एमओपी खताच्या गोण्यांची संख्या मोजा."
                : "Input soil NPK test metrics to calculate target Urea, DAP, and MOP bag dosages."}
            </p>
          </div>
          <Link to="/ai-tools" style={{ marginTop: 16 }}>
            <button className="button" style={{ width: "100%" }}>
              {language === "mr" ? "NPK खत मोजा 🧪" : "Calculate NPK 🧪"}
            </button>
          </Link>
        </div>

        <div className="card" style={{ display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: 28, marginBottom: 8 }}>🛒</div>
            <h3>
              {language === "mr" ? "शेतकरी बाजार आणि दुकान" : "Farmers Bazaar & Store"}
            </h3>
            <p style={{ color: "var(--text-muted)", fontSize: 13, marginTop: 4 }}>
              {language === "mr"
                ? "उत्कृष्ट बियाणे आणि अवजारे खरेदी करा, किंवा तुमचे काढणी झालेले पीक विक्रीसाठी बाजारात नोंदवा."
                : "Buy high-grade seeds and equipment, or list your harvest crop surplus for sale."}
            </p>
          </div>
          <Link to="/marketplace" style={{ marginTop: 16 }}>
            <button className="button" style={{ width: "100%" }}>
              {language === "mr" ? "बाजार पहा 🛒" : "Visit Bazaar 🛒"}
            </button>
          </Link>
        </div>

        <div className="card" style={{ display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: 28, marginBottom: 8 }}>☀️</div>
            <h3>
              {language === "mr" ? "हवामान अंदाज" : "Weather Insights"}
            </h3>
            <p style={{ color: "var(--text-muted)", fontSize: 13, marginTop: 4 }}>
              {language === "mr"
                ? "पेरणी आणि सिंचनाच्या अचूक नियोजनासाठी पुढील ३ दिवसांचा हवामान अंदाज पहा."
                : "See a 3-day regional weather forecast to optimize sowing and watering schedules."}
            </p>
          </div>
          <Link to="/weather" style={{ marginTop: 16 }}>
            <button className="button" style={{ width: "100%" }}>
              {language === "mr" ? "अंदाज पहा ☀️" : "View Forecast ☀️"}
            </button>
          </Link>
        </div>

        <div className="card" style={{ display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: 28, marginBottom: 8 }}>📈</div>
            <h3>
              {language === "mr" ? "बाजार भाव (मंडी दर)" : "Mandi Market Prices"}
            </h3>
            <p style={{ color: "var(--text-muted)", fontSize: 13, marginTop: 4 }}>
              {language === "mr"
                ? "नफ्यात विक्री करण्यासाठी स्थानिक कृषी बाजार समित्यांमधील चालू बाजार भाव तपासा."
                : "Track local agricultural mandi prices to make informed crop sale arrangements."}
            </p>
          </div>
          <Link to="/market" style={{ marginTop: 16 }}>
            <button className="button" style={{ width: "100%" }}>
              {language === "mr" ? "बाजार भाव पहा 📈" : "Check Prices 📈"}
            </button>
          </Link>
        </div>

        <div className="card" style={{ display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: 28, marginBottom: 8 }}>🌱</div>
            <h3>
              {language === "mr" ? "AI पीक शिफारसी" : "AI Crop Recommendations"}
            </h3>
            <p style={{ color: "var(--text-muted)", fontSize: 13, marginTop: 4 }}>
              {language === "mr"
                ? "तुमच्या जमिनीचा प्रकार आणि हवामानाची माहिती देऊन योग्य पीक आणि संसाधनांचे नियोजन करा."
                : "Predict optimal crop varieties and get fertilizer schedules based on soil chemistry."}
            </p>
          </div>
          <Link to="/recommendations" style={{ marginTop: 16 }}>
            <button className="button" style={{ width: "100%" }}>
              {language === "mr" ? "सल्लागार उघडा 🌾" : "Open Advisor 🌾"}
            </button>
          </Link>
        </div>

      </div>

      {/* Disease Detection Panel */}
      <CropDiseaseDetectionSection />
    </div>
  );
};

export default Dashboard;
