import React, { useState, useEffect } from "react";
import api from "../api";
import { useLanguage } from "../context/LanguageContext";

const LOCAL_TRANS = {
  en: {
    title: "Livestock & Dairy Management (Pashu Mitra)",
    subtitle: "Track your herd health, record morning/evening milk production, schedule vaccinations, and consult the Pashu Mitra AI.",
    herdStats: "Dairy Herd Summary",
    totalAnimals: "Herd Size",
    milkToday: "Today's Milk",
    averageMilk: "Avg Daily Milk",
    healthAlerts: "Health Status",
    registerBtn: "Register Animal",
    tagNumber: "Tag Number (ID)",
    animalName: "Name",
    animalType: "Type",
    animalBreed: "Breed",
    animalAge: "Age (Years)",
    healthStatus: "Health Status",
    vaccineDue: "Vaccination Calendar",
    saveAnimal: "Save Animal Profile",
    all: "All Animals",
    milkLogTitle: "Milk Productivity Log",
    feedTitle: "Feeding Schedule",
    vaccineTitle: "Vaccination Log",
    logMilkBtn: "Log Milk Yield",
    addFeedBtn: "Add Feed Allocation",
    addVaccineBtn: "Schedule Vaccine",
    morning: "Morning (L)",
    evening: "Evening (L)",
    fat: "Fat % (Optional)",
    feedType: "Feed Type",
    quantity: "Qty (kg/day)",
    notes: "Special Instructions",
    vaccineName: "Vaccine Name",
    adminDate: "Administered Date",
    dueDate: "Next Due Date",
    aiTitle: "Pashu Mitra AI Assistant",
    aiPlaceholder: "Ask about cattle feed, sickness symptoms, or breeding...",
    aiSend: "Ask AI",
    quickAsk1: "What is the core vaccination schedule for cows?",
    quickAsk2: "What is the best feeding routine to improve milk fat?",
    quickAsk3: "What are the common symptoms of Lumpy Skin Disease?",
    pending: "Pending",
    completed: "Completed"
  },
  mr: {
    title: "पशुधन व दुग्ध व्यवसाय व्यवस्थापन (पशु मित्र)",
    subtitle: "तुमच्या जनावरांच्या आरोग्याची काळजी घ्या, सकाळ-संध्याकाळच्या दुधाची नोंद ठेवा, लसीकरण वेळापत्रक सांभाळा आणि पशु मित्र एआयचा सल्ला घ्या.",
    herdStats: "दुग्ध व्यवसाय सारांश",
    totalAnimals: "एकूण जनावरे",
    milkToday: "आजचे एकूण दूध",
    averageMilk: "सरासरी दैनिक दूध",
    healthAlerts: "आरोग्य स्थिती",
    registerBtn: "नवीन जनावर नोंदवा",
    tagNumber: "टॅग नंबर (ID)",
    animalName: "नाव",
    animalType: "प्रकार",
    animalBreed: "जात / ब्रीड",
    animalAge: "वय (वर्षे)",
    healthStatus: "आरोग्य स्थिती",
    vaccineDue: "लसीकरण वेळापत्रक",
    saveAnimal: "जनावर नोंदवा",
    all: "सर्व जनावरे",
    milkLogTitle: "दुग्ध उत्पादन नोंदणी",
    feedTitle: "खाद्य नियोजन वेळापत्रक",
    vaccineTitle: "लसीकरण नोंदणी",
    logMilkBtn: "दुधाची नोंद करा",
    addFeedBtn: "खाद्य डोस जोडा",
    addVaccineBtn: "लस नोंदणी करा",
    morning: "सकाळचे दूध (लिटर)",
    evening: "संध्याकाळचे दूध (लिटर)",
    fat: "फॅट % (ऐच्छिक)",
    feedType: "खाद्याचा प्रकार",
    quantity: "प्रमाण (किलो/दिवस)",
    notes: "विशेष सूचना",
    vaccineName: "लसीचे नाव",
    adminDate: "दिलेली तारीख",
    dueDate: "पुढील लसीची तारीख",
    aiTitle: "पशु मित्र एआय सल्लागार",
    aiPlaceholder: "चारा नियोजन, आजार किंवा इतर समस्यांविषयी विचारा...",
    aiSend: "विचारा",
    quickAsk1: "गाईंचे लसीकरण वेळापत्रक काय असावे?",
    quickAsk2: "दुधातील फॅट वाढवण्यासाठी सर्वोत्तम खाद्य कोणते?",
    quickAsk3: "लम्पी त्वचा रोगाची लक्षणे कोणती आहेत?",
    pending: "बाकी आहे",
    completed: "पूर्ण झाले"
  }
};

const ANIMAL_TYPES = ["Cow", "Buffalo", "Goat", "Sheep", "Other"];
const HEALTH_STATUSES = ["Healthy", "Sick", "Under Treatment", "Pregnant", "Dry"];

const PashuMitra = () => {
  const { language } = useLanguage();
  const lang = language === "mr" ? "mr" : "en";
  const T = LOCAL_TRANS[lang];

  const [animals, setAnimals] = useState([]);
  const [selectedAnimal, setSelectedAnimal] = useState(null);
  const [filterType, setFilterType] = useState("All");
  
  // Registration Form
  const [showAddForm, setShowAddForm] = useState(false);
  const [newAnimal, setNewAnimal] = useState({
    tagNumber: "",
    name: "",
    type: "Cow",
    breed: "",
    ageYears: "",
    healthStatus: "Healthy"
  });

  // Logging Forms
  const [milkForm, setMilkForm] = useState({ morningYield: "", eveningYield: "", fatPercentage: "" });
  const [feedForm, setFeedForm] = useState({ feedType: "", quantityKg: "", frequencyPerDay: 2, notes: "" });
  const [vaccineForm, setVaccineForm] = useState({ name: "", dateAdministered: "", nextDueDate: "", status: "pending" });

  // AI Chat States
  const [chatInput, setChatInput] = useState("");
  const [chatHistory, setChatHistory] = useState([]);
  const [chatLoading, setChatLoading] = useState(false);

  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [viewMode, setViewMode] = useState("list"); // "list" or "details"

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    fetchAnimals();
  }, []);

  const fetchAnimals = async () => {
    try {
      const res = await api.get("/livestock");
      setAnimals(res.data);
      if (res.data.length > 0 && !selectedAnimal) {
        setSelectedAnimal(res.data[0]);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleRegisterAnimal = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post("/livestock", newAnimal);
      setAnimals([res.data, ...animals]);
      setSelectedAnimal(res.data);
      setNewAnimal({ tagNumber: "", name: "", type: "Cow", breed: "", ageYears: "", healthStatus: "Healthy" });
      setShowAddForm(false);
      if (window.innerWidth <= 768) {
        setViewMode("details");
      }
    } catch (err) {
      console.error(err);
      alert("Failed to register animal.");
    }
  };

  const handleLogMilk = async (e) => {
    e.preventDefault();
    if (!selectedAnimal) return;
    try {
      const res = await api.post(`/livestock/${selectedAnimal._id}/milk`, milkForm);
      // Update locally
      const updated = res.data;
      setAnimals(animals.map(a => a._id === updated._id ? updated : a));
      setSelectedAnimal(updated);
      setMilkForm({ morningYield: "", eveningYield: "", fatPercentage: "" });
    } catch (err) {
      console.error(err);
      alert("Failed to log milk record.");
    }
  };

  const handleAddFeed = async (e) => {
    e.preventDefault();
    if (!selectedAnimal) return;
    try {
      const res = await api.post(`/livestock/${selectedAnimal._id}/feed`, feedForm);
      const updated = res.data;
      setAnimals(animals.map(a => a._id === updated._id ? updated : a));
      setSelectedAnimal(updated);
      setFeedForm({ feedType: "", quantityKg: "", frequencyPerDay: 2, notes: "" });
    } catch (err) {
      console.error(err);
      alert("Failed to save feed allocation.");
    }
  };

  const handleAddVaccine = async (e) => {
    e.preventDefault();
    if (!selectedAnimal) return;
    try {
      const res = await api.post(`/livestock/${selectedAnimal._id}/vaccination`, vaccineForm);
      const updated = res.data;
      setAnimals(animals.map(a => a._id === updated._id ? updated : a));
      setSelectedAnimal(updated);
      setVaccineForm({ name: "", dateAdministered: "", nextDueDate: "", status: "pending" });
    } catch (err) {
      console.error(err);
      alert("Failed to log vaccination.");
    }
  };

  const handleDeleteAnimal = async (id) => {
    if (!window.confirm(lang === "mr" ? "तुम्हाला खरोखर हा जनावराचा प्रोफाइल डिलीट करायचा आहे का?" : "Are you sure you want to delete this animal profile?")) return;
    try {
      await api.delete(`/livestock/${id}`);
      const filtered = animals.filter(a => a._id !== id);
      setAnimals(filtered);
      setSelectedAnimal(filtered.length > 0 ? filtered[0] : null);
    } catch (err) {
      console.error(err);
    }
  };

  const handleAskAI = async (messageText) => {
    const text = messageText || chatInput;
    if (!text.trim()) return;

    setChatLoading(true);
    setChatHistory(prev => [...prev, { sender: "user", text }]);
    setChatInput("");

    try {
      const res = await api.post("/livestock/chat", {
        message: text,
        language: lang
      });
      setChatHistory(prev => [...prev, { sender: "ai", text: res.data.response }]);
    } catch (err) {
      console.error(err);
      setChatHistory(prev => [...prev, { 
        sender: "ai", 
        text: lang === "mr" ? "क्षमा करा, पशु मित्र एआय सध्या ऑफलाइन आहे. कृपया नंतर प्रयत्न करा." : "Sorry, Pashu Mitra AI is offline. Please try again later." 
      }]);
    } finally {
      setChatLoading(false);
    }
  };

  // Helper stats calculations
  const totalLitersToday = animals.reduce((sum, a) => {
    const todayStr = new Date().toISOString().split("T")[0];
    const todayLogs = a.milkRecords?.filter(r => new Date(r.date).toISOString().split("T")[0] === todayStr) || [];
    const logsSum = todayLogs.reduce((s, r) => s + r.morningYield + r.eveningYield, 0);
    return sum + logsSum;
  }, 0);

  const averageHerdMilk = animals.length > 0 
    ? (animals.reduce((sum, a) => {
        if (!a.milkRecords || a.milkRecords.length === 0) return sum;
        const totalAnimalMilk = a.milkRecords.reduce((s, r) => s + r.morningYield + r.eveningYield, 0);
        return sum + (totalAnimalMilk / a.milkRecords.length);
      }, 0) / animals.length).toFixed(1)
    : 0;

  const totalSick = animals.filter(a => a.healthStatus === "Sick" || a.healthStatus === "Under Treatment").length;

  const filteredAnimals = filterType === "All" 
    ? animals 
    : animals.filter(a => a.type === filterType);

  return (
    <div className="app-container">
      {/* Page Header */}
      <div className="card" style={{ background: "linear-gradient(135deg, #1e3a8a, #3b82f6)", color: "white", marginBottom: 24 }}>
        <h1 style={{ fontSize: 26, fontWeight: 800, margin: 0 }}>🐄 {T.title}</h1>
        <p style={{ opacity: 0.9, marginTop: 6, marginBottom: 0, fontSize: 14 }}>
          {T.subtitle}
        </p>
      </div>

      {/* KPI Blocks */}
      <div className="grid-4" style={{ gap: 16, marginBottom: 24 }}>
        <div className="card" style={{ textAlign: "center", borderTop: "4px solid #3b82f6" }}>
          <span style={{ fontSize: 12, color: "var(--text-muted)", display: "block" }}>{T.totalAnimals}</span>
          <strong style={{ fontSize: 24 }}>{animals.length}</strong>
        </div>
        <div className="card" style={{ textAlign: "center", borderTop: "4px solid #10b981" }}>
          <span style={{ fontSize: 12, color: "var(--text-muted)", display: "block" }}>{T.milkToday}</span>
          <strong style={{ fontSize: 24, color: "#10b981" }}>{totalLitersToday} <span style={{ fontSize: 13 }}>L</span></strong>
        </div>
        <div className="card" style={{ textAlign: "center", borderTop: "4px solid #f59e0b" }}>
          <span style={{ fontSize: 12, color: "var(--text-muted)", display: "block" }}>{T.averageMilk}</span>
          <strong style={{ fontSize: 24 }}>{averageHerdMilk} <span style={{ fontSize: 13 }}>L/day</span></strong>
        </div>
        <div className="card" style={{ textAlign: "center", borderTop: `4px solid ${totalSick > 0 ? "#ef4444" : "#10b981"}` }}>
          <span style={{ fontSize: 12, color: "var(--text-muted)", display: "block" }}>{T.healthAlerts}</span>
          <strong style={{ fontSize: 24, color: totalSick > 0 ? "#ef4444" : "#10b981" }}>
            {totalSick > 0 ? `${totalSick} Sick` : "All Healthy"}
          </strong>
        </div>
      </div>

      {isMobile && viewMode === "details" && selectedAnimal && (
        <button
          className="button button-secondary"
          style={{ marginBottom: 16, display: "flex", alignItems: "center", gap: 8, fontWeight: 700 }}
          onClick={() => setViewMode("list")}
        >
          ⬅️ {lang === "mr" ? "जनावरांची यादी" : "Back to Herd List"}
        </button>
      )}

      <div style={isMobile ? { display: "block" } : { display: "grid", gridTemplateColumns: "1.2fr 2fr", gap: 24, alignItems: "start" }}>
        
        {/* Left Side: Cattle Directory & Add Form */}
        {(!isMobile || (isMobile && viewMode === "list")) && (
          <div>
          {/* Action Row */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <div style={{ display: "flex", gap: 6 }}>
              <button 
                className={`button button-secondary`}
                style={{ padding: "6px 12px", fontSize: 12, background: filterType === "All" ? "#3b82f6" : "", color: filterType === "All" ? "white" : "" }}
                onClick={() => setFilterType("All")}
              >
                {T.all}
              </button>
              {ANIMAL_TYPES.slice(0, 3).map(type => (
                <button
                  key={type}
                  className={`button button-secondary`}
                  style={{ padding: "6px 12px", fontSize: 12, background: filterType === type ? "#3b82f6" : "", color: filterType === type ? "white" : "" }}
                  onClick={() => setFilterType(type)}
                >
                  {type === "Cow" ? "🐄 Cow" : type === "Buffalo" ? "🐃 Buffalo" : "🐐 Goat"}
                </button>
              ))}
            </div>

            <button 
              className="button"
              style={{ padding: "8px 12px", fontSize: 12 }}
              onClick={() => setShowAddForm(!showAddForm)}
            >
              {showAddForm ? "✕ Close" : `➕ ${T.registerBtn}`}
            </button>
          </div>

          {/* Register Animal Form */}
          {showAddForm && (
            <div className="card" style={{ marginBottom: 16 }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12 }}>🐄 {T.registerBtn}</h3>
              <form onSubmit={handleRegisterAnimal}>
                <div style={{ marginBottom: 10 }}>
                  <label style={{ fontSize: 12, fontWeight: 600 }}>{T.tagNumber}</label>
                  <input
                    type="text"
                    className="input"
                    placeholder="e.g. C-102"
                    value={newAnimal.tagNumber}
                    onChange={(e) => setNewAnimal({ ...newAnimal, tagNumber: e.target.value })}
                    required
                  />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600 }}>{T.animalName}</label>
                    <input
                      type="text"
                      className="input"
                      placeholder="e.g. Ganga"
                      value={newAnimal.name}
                      onChange={(e) => setNewAnimal({ ...newAnimal, name: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600 }}>{T.animalType}</label>
                    <select
                      className="input"
                      style={{ height: 42 }}
                      value={newAnimal.type}
                      onChange={(e) => setNewAnimal({ ...newAnimal, type: e.target.value })}
                    >
                      {ANIMAL_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600 }}>{T.animalBreed}</label>
                    <input
                      type="text"
                      className="input"
                      placeholder="e.g. Gir / Murrah"
                      value={newAnimal.breed}
                      onChange={(e) => setNewAnimal({ ...newAnimal, breed: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600 }}>{T.animalAge}</label>
                    <input
                      type="number"
                      className="input"
                      placeholder="e.g. 4"
                      value={newAnimal.ageYears}
                      onChange={(e) => setNewAnimal({ ...newAnimal, ageYears: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div style={{ marginBottom: 12 }}>
                  <label style={{ fontSize: 12, fontWeight: 600 }}>{T.healthStatus}</label>
                  <select
                    className="input"
                    style={{ height: 42 }}
                    value={newAnimal.healthStatus}
                    onChange={(e) => setNewAnimal({ ...newAnimal, healthStatus: e.target.value })}
                  >
                    {HEALTH_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>

                <button type="submit" className="button" style={{ width: "100%", height: 40 }}>{T.saveAnimal}</button>
              </form>
            </div>
          )}

          {/* Herd Directory Grid */}
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {filteredAnimals.map((a) => (
              <div 
                key={a._id}
                className="card"
                onClick={() => {
                  setSelectedAnimal(a);
                  if (isMobile) {
                    setViewMode("details");
                  }
                }}
                style={{ 
                  cursor: "pointer", 
                  background: selectedAnimal?._id === a._id ? "var(--bg-main)" : "",
                  borderLeft: selectedAnimal?._id === a._id ? "5px solid #3b82f6" : "1px solid var(--border-color)",
                  padding: 12,
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center"
                }}
              >
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 20 }}>{a.type === "Cow" ? "🐄" : a.type === "Buffalo" ? "🐃" : "🐐"}</span>
                    <strong>{a.name}</strong>
                    <span style={{ fontSize: 10, background: "var(--border-color)", padding: "2px 6px", borderRadius: 4 }}>{a.tagNumber}</span>
                  </div>
                  <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>
                    {a.breed} • {a.ageYears} Yrs
                  </div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
                  <span 
                    style={{ 
                      fontSize: 10, 
                      fontWeight: 700, 
                      padding: "2px 8px", 
                      borderRadius: 12,
                      background: a.healthStatus === "Healthy" ? "#dcfce7" : a.healthStatus === "Sick" ? "#fee2e2" : "#fef3c7",
                      color: a.healthStatus === "Healthy" ? "#166534" : a.healthStatus === "Sick" ? "#991b1b" : "#92400e"
                    }}
                  >
                    {a.healthStatus}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteAnimal(a._id);
                    }}
                    style={{ background: "none", border: "none", color: "#dc2626", cursor: "pointer", fontSize: 12, marginTop: 4 }}
                  >
                    🗑️ Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
        )}

        {/* Right Side: Selected Animal Details & Action Logs */}
        {(!isMobile || (isMobile && viewMode === "details")) && (
          <div>
          {selectedAnimal ? (
            <div>
              {/* Profile Card Header */}
              <div className="card" style={{ marginBottom: 16, borderLeft: "5px solid #3b82f6" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <h2 style={{ margin: 0, fontSize: 20 }}>{selectedAnimal.name} ({selectedAnimal.tagNumber})</h2>
                    <p style={{ color: "var(--text-muted)", margin: "4px 0 0 0", fontSize: 13 }}>
                      {selectedAnimal.type} • {selectedAnimal.breed} • {selectedAnimal.ageYears} Years Old
                    </p>
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <select
                      className="input"
                      style={{ height: 36, fontSize: 12, width: 140 }}
                      value={selectedAnimal.healthStatus}
                      onChange={async (e) => {
                        const newStatus = e.target.value;
                        try {
                          const res = await api.put(`/livestock/${selectedAnimal._id}`, { healthStatus: newStatus });
                          const updated = res.data;
                          setAnimals(animals.map(a => a._id === updated._id ? updated : a));
                          setSelectedAnimal(updated);
                        } catch (err) {
                          console.error(err);
                        }
                      }}
                    >
                      {HEALTH_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              {/* Action Tabs - Accordion / Section Grid */}
              <div className="grid-2" style={{ gap: 16, marginBottom: 16 }}>
                
                {/* Milking Recorder Log */}
                <div className="card">
                  <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12 }}>🥛 {T.milkLogTitle}</h3>
                  <form onSubmit={handleLogMilk} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 12 }}>
                    <div>
                      <label style={{ fontSize: 11, fontWeight: 600 }}>{T.morning}</label>
                      <input
                        type="number"
                        step="0.1"
                        className="input"
                        value={milkForm.morningYield}
                        onChange={(e) => setMilkForm({ ...milkForm, morningYield: e.target.value })}
                        required
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: 11, fontWeight: 600 }}>{T.evening}</label>
                      <input
                        type="number"
                        step="0.1"
                        className="input"
                        value={milkForm.eveningYield}
                        onChange={(e) => setMilkForm({ ...milkForm, eveningYield: e.target.value })}
                        required
                      />
                    </div>
                    <div style={{ gridColumn: "span 2" }}>
                      <button type="submit" className="button" style={{ width: "100%", height: 36, fontSize: 12 }}>{T.logMilkBtn}</button>
                    </div>
                  </form>

                  {/* Render CSS Milk Bars Chart */}
                  {selectedAnimal.milkRecords?.length > 0 && (
                    <div>
                      <div style={{ display: "flex", gap: 4, height: 80, alignItems: "flex-end", borderBottom: "2px solid var(--border-color)", paddingBottom: 4, marginBottom: 8, overflowX: "auto" }}>
                        {selectedAnimal.milkRecords.slice(-7).map((rec, idx) => {
                          const dailyTotal = rec.morningYield + rec.eveningYield;
                          return (
                            <div key={idx} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center" }}>
                              <div 
                                style={{ 
                                  width: "100%", 
                                  height: `${Math.min(70, dailyTotal * 4)}px`, 
                                  background: "#3b82f6", 
                                  borderRadius: "4px 4px 0 0" 
                                }} 
                                title={`Date: ${new Date(rec.date).toLocaleDateString()}, Morn: ${rec.morningYield}L, Eve: ${rec.eveningYield}L`}
                              />
                            </div>
                          );
                        })}
                      </div>
                      <span style={{ fontSize: 10, color: "var(--text-muted)", display: "block", textAlign: "center" }}>Milk Yield Trend (Last 7 Records)</span>
                    </div>
                  )}
                </div>

                {/* Feeding Schedules */}
                <div className="card">
                  <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12 }}>🌾 {T.feedTitle}</h3>
                  <form onSubmit={handleAddFeed} style={{ marginBottom: 12 }}>
                    <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 8, marginBottom: 8 }}>
                      <select
                        className="input"
                        style={{ height: 38 }}
                        value={feedForm.feedType}
                        onChange={(e) => setFeedForm({ ...feedForm, feedType: e.target.value })}
                        required
                      >
                        <option value="">-- {T.feedType} --</option>
                        <option value="Green Fodder">{lang === "mr" ? "हिरवा चारा" : "Green Fodder"}</option>
                        <option value="Dry Fodder">{lang === "mr" ? "सुका चारा" : "Dry Fodder"}</option>
                        <option value="Concentrates">{lang === "mr" ? "पशू खाद्य / पेंड" : "Concentrates"}</option>
                      </select>
                      <input
                        type="number"
                        className="input"
                        placeholder={T.quantity}
                        value={feedForm.quantityKg}
                        onChange={(e) => setFeedForm({ ...feedForm, quantityKg: e.target.value })}
                        required
                      />
                    </div>
                    <button type="submit" className="button" style={{ width: "100%", height: 36, fontSize: 12 }}>{T.addFeedBtn}</button>
                  </form>

                  {/* Feed list */}
                  <div style={{ maxHeight: 90, overflowY: "auto", fontSize: 11 }}>
                    {selectedAnimal.feedingSchedules?.map((f, idx) => (
                      <div key={idx} style={{ padding: "4px 8px", background: "var(--bg-main)", borderRadius: 4, marginBottom: 4 }}>
                        🌾 <strong>{f.feedType}</strong>: {f.quantityKg} kg/day
                      </div>
                    ))}
                  </div>
                </div>

              </div>

              {/* Vaccination Accordeon */}
              <div className="card" style={{ marginBottom: 24 }}>
                <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12 }}>📅 {T.vaccineTitle}</h3>
                <form onSubmit={handleAddVaccine} style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr 1fr", gap: 8, marginBottom: 12 }}>
                  <input
                    type="text"
                    className="input"
                    placeholder="e.g. FMD / Anthrax"
                    value={vaccineForm.name}
                    onChange={(e) => setVaccineForm({ ...vaccineForm, name: e.target.value })}
                    required
                  />
                  <input
                    type="date"
                    className="input"
                    value={vaccineForm.nextDueDate}
                    onChange={(e) => setVaccineForm({ ...vaccineForm, nextDueDate: e.target.value })}
                    required
                  />
                  <button type="submit" className="button" style={{ height: 42, fontSize: 12 }}>{T.addVaccineBtn}</button>
                </form>

                <div style={{ overflowX: "auto" }}>
                  <table className="mandi-table" style={{ width: "100%", fontSize: 12 }}>
                    <thead>
                      <tr>
                        <th style={{ textAlign: "left" }}>{T.vaccineName}</th>
                        <th>{T.dueDate}</th>
                        <th>{T.healthStatus}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedAnimal.vaccinations?.map((v, idx) => (
                        <tr key={idx}>
                          <td style={{ fontWeight: 600 }}>{v.name}</td>
                          <td style={{ textAlign: "center" }}>{new Date(v.nextDueDate).toLocaleDateString()}</td>
                          <td style={{ textAlign: "center" }}>
                            <button
                              style={{ 
                                background: v.status === "completed" ? "#dcfce7" : "#fee2e2", 
                                color: v.status === "completed" ? "#166534" : "#991b1b",
                                border: "none",
                                padding: "2px 8px",
                                borderRadius: 8,
                                fontSize: 11,
                                fontWeight: 700,
                                cursor: "pointer"
                              }}
                              onClick={async () => {
                                // Toggle status
                                const nextStatus = v.status === "pending" ? "completed" : "pending";
                                const updatedVaccines = selectedAnimal.vaccinations.map(vacc => 
                                  vacc._id === v._id ? { ...vacc, status: nextStatus, dateAdministered: nextStatus === "completed" ? new Date().toISOString() : null } : vacc
                                );
                                try {
                                  const res = await api.put(`/livestock/${selectedAnimal._id}`, { vaccinations: updatedVaccines });
                                  const updated = res.data;
                                  setAnimals(animals.map(a => a._id === updated._id ? updated : a));
                                  setSelectedAnimal(updated);
                                } catch (err) {
                                  console.error(err);
                                }
                              }}
                            >
                              {v.status === "completed" ? T.completed : T.pending}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          ) : (
            <div className="card" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: 300, color: "var(--text-muted)" }}>
              <span style={{ fontSize: 48 }}>🐃</span>
              <p style={{ marginTop: 12 }}>
                {lang === "mr" ? "जनावर निवडण्यासाठी डाव्या यादीवर क्लिक करा किंवा नवीन नोंदवा." : "Select an animal to view log details."}
              </p>
            </div>
          )}

          {/* Pashu Mitra AI Chat Widget */}
          <div className="card" style={{ borderLeft: "5px solid #1e3a8a" }}>
            <h3 style={{ fontSize: 16, fontWeight: 800, color: "#1e3a8a", margin: "0 0 12px 0" }}>🤖 {T.aiTitle}</h3>
            
            {/* Chat Messages */}
            <div style={{ height: 200, overflowY: "auto", border: "1px solid var(--border-color)", borderRadius: 8, padding: 12, background: "var(--bg-main)", marginBottom: 12 }}>
              {chatHistory.length === 0 && (
                <div style={{ color: "var(--text-muted)", fontSize: 12, textAlign: "center", marginTop: 40 }}>
                  💬 {lang === "mr" ? "पशु संवर्धनाविषयी कोणतेही प्रश्न विचारा!" : "Ask any questions about dairy animal husbandry!"}
                </div>
              )}
              {chatHistory.map((chat, idx) => (
                <div key={idx} style={{ marginBottom: 12, textAlign: chat.sender === "user" ? "right" : "left" }}>
                  <div 
                    style={{ 
                      display: "inline-block", 
                      padding: "8px 12px", 
                      borderRadius: 12, 
                      fontSize: 13, 
                      maxWidth: "85%",
                      lineHeight: 1.5,
                      background: chat.sender === "user" ? "#1e3a8a" : "var(--bg-card)",
                      color: chat.sender === "user" ? "white" : "var(--text-dark)",
                      border: chat.sender === "user" ? "none" : "1px solid var(--border-color)",
                      textAlign: "left"
                    }}
                  >
                    {chat.text}
                  </div>
                </div>
              ))}
              {chatLoading && <div style={{ fontSize: 12, color: "var(--text-muted)", fontStyle: "italic" }}>🤖 Pashu Mitra is thinking...</div>}
            </div>

            {/* Quick Suggestions */}
            <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 12 }}>
              <button 
                type="button" 
                className="button button-secondary" 
                style={{ padding: "6px 8px", fontSize: 11, textAlign: "left", display: "block", width: "100%" }}
                onClick={() => handleAskAI(T.quickAsk1)}
              >
                ❓ {T.quickAsk1}
              </button>
              <button 
                type="button" 
                className="button button-secondary" 
                style={{ padding: "6px 8px", fontSize: 11, textAlign: "left", display: "block", width: "100%" }}
                onClick={() => handleAskAI(T.quickAsk2)}
              >
                ❓ {T.quickAsk2}
              </button>
              <button 
                type="button" 
                className="button button-secondary" 
                style={{ padding: "6px 8px", fontSize: 11, textAlign: "left", display: "block", width: "100%" }}
                onClick={() => handleAskAI(T.quickAsk3)}
              >
                ❓ {T.quickAsk3}
              </button>
            </div>

            {/* Chat Input */}
            <div style={{ display: "flex", gap: 8 }}>
              <input
                type="text"
                className="input"
                placeholder={T.aiPlaceholder}
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAskAI()}
                disabled={chatLoading}
              />
              <button 
                type="button" 
                className="button"
                style={{ background: "#1e3a8a", padding: "0 16px" }}
                onClick={() => handleAskAI()}
                disabled={chatLoading}
              >
                {T.aiSend}
              </button>
            </div>
          </div>

        </div>
        )}

      </div>
    </div>
  );
};

export default PashuMitra;
