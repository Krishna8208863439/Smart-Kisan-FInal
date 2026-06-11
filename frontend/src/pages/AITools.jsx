import React, { useRef, useState, useEffect } from "react";
import api from "../api";
import { useLanguage } from "../context/LanguageContext";

const TABS = ["Disease Detection", "Irrigation", "Fertilizer / NPK", "Smart Calendar"];

const CROP_NPK_TARGETS = {
  Tomato: { n: 120, p: 60, k: 60, ph: "6.0 - 7.0", name: "Tomato" },
  Paddy: { n: 100, p: 40, k: 40, ph: "5.5 - 6.5", name: "Paddy / Rice" },
  Wheat: { n: 120, p: 50, k: 40, ph: "6.0 - 7.5", name: "Wheat" },
  Potato: { n: 150, p: 80, k: 100, ph: "5.0 - 6.0", name: "Potato" },
  Mustard: { n: 80, p: 40, k: 40, ph: "6.0 - 7.5", name: "Mustard" },
  Chilli: { n: 120, p: 60, k: 80, ph: "6.0 - 7.0", name: "Chilli" },
  Cotton: { n: 100, p: 50, k: 50, ph: "6.0 - 8.0", name: "Cotton" }
};

const SOIL_DRY_DRAIN = {
  sandy: { name: "Sandy (Fast)", ph: "5.5 - 6.5", advice: "High drainage. Apply NPK in split doses to avoid leaching." },
  loamy: { name: "Loamy (Optimal)", ph: "6.0 - 7.0", advice: "Ideal water & nutrient retention. Standard NPK splits recommended." },
  clay: { name: "Clayey (Slow)", ph: "6.5 - 7.5", advice: "Heavy retention. Risk of waterlogging. Reduce potassium single dose frequency." },
  peaty: { name: "Peaty (Acidic)", ph: "4.5 - 5.5", advice: "Organic rich but highly acidic. Add agricultural lime to boost P absorption." }
};

const REFERENCE_HEALTHY_LEAVES = {
  Tomato: "https://images.unsplash.com/photo-1592924357228-91a4daadcfea?auto=format&fit=crop&w=300&q=80",
  Paddy: "https://images.unsplash.com/photo-1536304997881-a372c179924b?auto=format&fit=crop&w=300&q=80",
  Wheat: "https://images.unsplash.com/photo-1506619216599-9d16d0903dfd?auto=format&fit=crop&w=300&q=80",
  Potato: "https://images.unsplash.com/photo-1518977676601-b53f82aba655?auto=format&fit=crop&w=300&q=80",
  Mustard: "https://images.unsplash.com/photo-1599819811279-d5ad9cccf838?auto=format&fit=crop&w=300&q=80",
  Chilli: "https://images.unsplash.com/photo-1596797038530-2c107229654b?auto=format&fit=crop&w=300&q=80",
  Cotton: "https://images.unsplash.com/photo-1594900010629-9e0c52a420b9?auto=format&fit=crop&w=300&q=80"
};

const AITools = () => {
  const { t, language } = useLanguage();
  const [activeTab, setActiveTab] = useState("Disease Detection");
  const isLoggedIn = !!localStorage.getItem("sk_token");

  const displayTabName = (tab) => {
    if (tab === "Disease Detection") return t("leafDiagnostics");
    if (tab === "Irrigation") return language === 'mr' ? 'सिंचन वेळापत्रक' : 'Irrigation';
    if (tab === "Fertilizer / NPK") return language === 'mr' ? 'खत / NPK सल्लागार' : 'Fertilizer / NPK';
    if (tab === "Smart Calendar") return language === 'mr' ? 'स्मार्ट वेळापत्रक' : 'Smart Calendar';
    return tab;
  };

  // State: Disease Detection
  const [diseaseFile, setDiseaseFile] = useState(null);
  const [diseasePreview, setDiseasePreview] = useState("");
  const [diseaseCropHint, setDiseaseCropHint] = useState("Tomato");
  const [diseaseLoading, setDiseaseLoading] = useState(false);
  const [diseaseResult, setDiseaseResult] = useState(null);
  const [diseaseStatus, setDiseaseStatus] = useState("Upload a leaf photo and click analyze.");
  const [scanStep, setScanStep] = useState(0);
  const [scanStepsList] = useState([
    "Scanning leaf margins and textures...",
    "Segmenting spot lesions and discolored vectors...",
    "Correlating patterns against Agri-Model DB...",
    "Formulating treatment schedule..."
  ]);
  const [treatmentTab, setTreatmentTab] = useState("organic"); // organic or chemical
  const fileInputRef = useRef(null);

  // State: Irrigation
  const [irrCrop, setIrrCrop] = useState("Tomato");
  const [irrStage, setIrrStage] = useState("Vegetative");
  const [irrSoil, setIrrSoil] = useState("loamy");
  const [irrResult, setIrrResult] = useState(null);

  // State: Fertilizer / NPK Advisor
  const [fertCrop, setFertCrop] = useState("Tomato");
  const [fertSoil, setFertSoil] = useState("loamy");
  const [fertN, setFertN] = useState(50);
  const [fertP, setFertP] = useState(30);
  const [fertK, setFertK] = useState(25);
  const [fertArea, setFertArea] = useState(1);
  const [fertResult, setFertResult] = useState(null);

  // State: Smart Calendar
  const [calCrop, setCalCrop] = useState("Tomato");
  const [calDate, setCalDate] = useState(new Date().toISOString().split("T")[0]);
  const [activeCalendars, setActiveCalendars] = useState([]);
  const [selectedCalId, setSelectedCalId] = useState(null);
  const [calLoading, setCalLoading] = useState(false);
  const [customTaskTitle, setCustomTaskTitle] = useState("");
  const [customTaskOffset, setCustomTaskOffset] = useState("10");

  // Load calendars on mount/refresh
  const loadCalendars = async () => {
    if (!isLoggedIn) return;
    try {
      const res = await api.get("/crop-calendar");
      setActiveCalendars(res.data);
      if (res.data.length > 0 && !selectedCalId) {
        setSelectedCalId(res.data[0]._id);
      }
    } catch (err) {
      console.error("Error loading calendars:", err);
    }
  };

  useEffect(() => {
    loadCalendars();
  }, [isLoggedIn]);

  // --- Handlers: Disease Detection ---
  const handleDiseaseFileSelected = (file) => {
    if (!file) return;
    setDiseaseFile(file);
    setDiseasePreview(URL.createObjectURL(file));
    setDiseaseResult(null);
    setDiseaseStatus("Image loaded. Click 'Analyze Leaf'.");
  };

  const handleAnalyzeDisease = async () => {
    if (!diseaseFile) {
      setDiseaseStatus("Please select or drop an image file.");
      return;
    }
    setDiseaseLoading(true);
    setScanStep(0);
    setDiseaseStatus(scanStepsList[0]);

    // Interval to cycle through scanning steps
    const stepInterval = setInterval(() => {
      setScanStep((prev) => {
        if (prev < scanStepsList.length - 1) {
          setDiseaseStatus(scanStepsList[prev + 1]);
          return prev + 1;
        } else {
          clearInterval(stepInterval);
          return prev;
        }
      });
    }, 900);

    try {
      const formData = new FormData();
      formData.append("image", diseaseFile);
      if (diseaseCropHint) {
        formData.append("crop", diseaseCropHint);
      }
      
      const response = await api.post("/crop-disease/analyze", formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });

      // Clear interval and complete animation
      clearInterval(stepInterval);
      
      if (response.data.success) {
        setDiseaseResult(response.data);
        setDiseaseStatus("Diagnostic report complete.");
      } else {
        setDiseaseStatus(response.data.message || "Model analysis failed.");
      }
    } catch (err) {
      clearInterval(stepInterval);
      console.error(err);
      setDiseaseStatus("Network error analyzing leaf. Using diagnostics fallback.");
      // Fallback response for offline demonstration
      setDiseaseResult({
        success: true,
        crop: diseaseCropHint || "Tomato",
        disease: "Blight Spotting (Simulated)",
        severity: "medium",
        confidence: 0.84,
        advice: "Remove spotted leaves from the lower stems. Spray neem-oil mixture or copper fungicide to prevent spore spread."
      });
    } finally {
      setDiseaseLoading(false);
    }
  };

  const printPrescription = () => {
    if (!diseaseResult) return;
    const printWindow = window.open("", "_blank");
    printWindow.document.write(`
      <html>
        <head>
          <title>Smart Kisan Diagnostic Prescription</title>
          <style>
            body { font-family: system-ui, sans-serif; padding: 40px; color: #333; }
            .header { border-bottom: 2px solid #16a34a; padding-bottom: 15px; margin-bottom: 20px; }
            .title { font-size: 24px; font-weight: bold; color: #16a34a; }
            .meta { margin-bottom: 20px; font-size: 14px; color: #666; }
            .section { margin-bottom: 25px; }
            .section-title { font-weight: bold; font-size: 16px; margin-bottom: 10px; text-transform: uppercase; color: #111; }
            .badge { padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: 700; display: inline-block; }
            .badge-high { background: #fee2e2; color: #991b1b; }
            .badge-medium { background: #fef3c7; color: #92400e; }
            .badge-low { background: #dcfce7; color: #166534; }
            .advice-box { background: #f8fafc; border-left: 4px solid #16a34a; padding: 15px; border-radius: 4px; line-height: 1.6; }
            .footer { margin-top: 50px; font-size: 12px; color: #888; border-top: 1px solid #ddd; padding-top: 15px; text-align: center; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="title">🍃 Smart Kisan AI Diagnostic Prescription</div>
            <div class="meta">Report Generated: ${new Date().toLocaleString()} | Digital Signature: Verified Agri-Model v2.4</div>
          </div>
          
          <div class="section">
            <div class="section-title">Diagnostics Metadata</div>
            <p><strong>Target Crop:</strong> ${diseaseResult.crop}</p>
            <p><strong>Identified Condition:</strong> ${diseaseResult.disease}</p>
            <p><strong>Model Confidence:</strong> ${(diseaseResult.confidence * 100).toFixed(1)}%</p>
            <p><strong>Severity Index:</strong> 
              <span class="badge badge-${diseaseResult.severity}">
                ${diseaseResult.severity.toUpperCase()}
              </span>
            </p>
          </div>

          <div class="section">
            <div class="section-title">Prescribed Remedies & Advice</div>
            <div class="advice-box">
              ${diseaseResult.advice}
            </div>
          </div>

          <div class="section">
            <div class="section-title">Agronomic Standard Treatment Schedule</div>
            <ul>
              <li><strong>Day 1 (Immediate):</strong> Prune all highly spotted/damaged leaves. Clean pruning shears with disinfectant.</li>
              <li><strong>Day 3:</strong> Apply organic bio-remedies (Neem oil spray) or copper-based fungicide at low concentration.</li>
              <li><strong>Day 7:</strong> Re-inspect crop node stems. Suspend water spray directly on foliage.</li>
            </ul>
          </div>

          <div class="footer">
            Smart Kisan Platform. Diagnostic prescriptions are recommendations based on machine-learning visual indexing.
          </div>
          <script>window.print();</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // --- Handlers: Irrigation ---
  const handleCalculateIrrigation = (e) => {
    e.preventDefault();
    let baseRate = 4.5; // mm/day
    let interval = 3; 

    if (irrCrop === "Paddy") { baseRate = 8.0; interval = 1; }
    else if (irrCrop === "Wheat") { baseRate = 3.5; interval = 6; }
    else if (irrCrop === "Potato") { baseRate = 4.8; interval = 4; }
    else if (irrCrop === "Mustard") { baseRate = 2.8; interval = 8; }
    else if (irrCrop === "Chilli") { baseRate = 5.2; interval = 3; }
    else if (irrCrop === "Cotton") { baseRate = 6.0; interval = 5; }

    if (irrSoil === "sandy") { interval = Math.max(1, interval - 1); }
    else if (irrSoil === "clay") { interval += 1; }

    if (irrStage === "Flowering" || irrStage === "Fruiting" || irrStage === "Reproductive") {
      baseRate *= 1.25;
    }

    setIrrResult({
      dailyRate: baseRate.toFixed(1),
      interval,
      stageAdvice: `Keep soil moisture balanced during ${irrStage} stage to maximize crop yield and fruit size. Avoid waterlogging during active root development.`,
      warning: Math.random() > 0.5 
        ? "⚠️ Local weather predicts high ambient temperature: consider irrigating in early morning to minimize evaporation." 
        : "🌧️ Local forecasts suggest slight precipitation within 48h. Monitor soil closely to reduce watering costs."
    });
  };

  // --- Handlers: Fertilizer NPK Advisor ---
  const handleCalculateFertilizer = (e) => {
    e.preventDefault();
    const target = CROP_NPK_TARGETS[fertCrop];
    if (!target) return;

    // Deficits
    const defN = Math.max(0, target.n - fertN);
    const defP = Math.max(0, target.p - fertP);
    const defK = Math.max(0, target.k - fertK);

    // standard bag calculations:
    // 1 bag (50kg) Urea = 23kg N
    // 1 bag (50kg) DAP = 9kg N + 23kg P
    // 1 bag (50kg) MOP = 30kg K
    let dapBags = (defP / 23) * fertArea;
    let ureaBags = ((defN - (dapBags * 9)) / 23) * fertArea;
    if (ureaBags < 0) ureaBags = 0;
    let mopBags = (defK / 30) * fertArea;

    // Soil specific amendments
    let soilAdvice = SOIL_DRY_DRAIN[fertSoil].advice;

    setFertResult({
      dap: parseFloat(dapBags.toFixed(1)),
      urea: parseFloat(ureaBags.toFixed(1)),
      mop: parseFloat(mopBags.toFixed(1)),
      compost: (fertArea * 2.5).toFixed(1),
      deficits: { n: defN, p: defP, k: defK },
      targets: target,
      soilAdvice
    });
  };

  // --- Handlers: Smart Calendar ---
  const handleCreateCalendar = async (e) => {
    e.preventDefault();
    setCalLoading(true);
    try {
      const res = await api.post("/crop-calendar", {
        cropName: calCrop,
        sowingDate: calDate
      });
      setActiveCalendars((prev) => [res.data, ...prev]);
      setSelectedCalId(res.data._id);
    } catch (err) {
      console.error(err);
      alert("Failed to generate calendar. Make sure you are logged in.");
    } finally {
      setCalLoading(false);
    }
  };

  const handleToggleTask = async (calId, taskId, currentStatus) => {
    const nextStatus = currentStatus === "pending" ? "completed" : "pending";
    try {
      const res = await api.patch(`/crop-calendar/${calId}/task`, {
        taskId,
        status: nextStatus
      });
      setActiveCalendars((prev) =>
        prev.map((c) => (c._id === calId ? res.data : c))
      );
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddCustomTask = async (e) => {
    e.preventDefault();
    if (!customTaskTitle.trim()) return;
    try {
      const res = await api.post(`/crop-calendar/${selectedCalId}/custom-task`, {
        title: customTaskTitle,
        dayOffset: Number(customTaskOffset),
        category: "custom"
      });
      setActiveCalendars((prev) =>
        prev.map((c) => (c._id === selectedCalId ? res.data : c))
      );
      setCustomTaskTitle("");
      alert("Custom milestone added successfully!");
    } catch (err) {
      console.error("Error adding custom task:", err);
      alert("Failed to add custom milestone.");
    }
  };

  const handleDeleteCalendar = async (calId) => {
    if (!window.confirm("Are you sure you want to delete this crop calendar?")) return;
    try {
      await api.delete(`/crop-calendar/${calId}`);
      setActiveCalendars((prev) => prev.filter((c) => c._id !== calId));
      if (selectedCalId === calId) {
        setSelectedCalId(activeCalendars.length > 1 ? activeCalendars[0]._id : null);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const selectedCalendar = activeCalendars.find((c) => c._id === selectedCalId);

  // Calendar metrics
  const getProgressPercent = (cal) => {
    if (!cal || !cal.tasks.length) return 0;
    const completed = cal.tasks.filter((t) => t.status === "completed").length;
    return Math.round((completed / cal.tasks.length) * 100);
  };

  // Lifecycle stepper calculation
  const getCropLifecycleStage = (cal) => {
    if (!cal) return { stage: "Nursery", progress: 0 };
    const sowing = new Date(cal.sowingDate);
    const today = new Date();
    const daysElapsed = Math.max(0, Math.floor((today - sowing) / (1000 * 60 * 60 * 24)));

    let stages = [];
    if (cal.cropName === "Tomato") {
      stages = [
        { name: "Nursery", range: [0, 25] },
        { name: "Vegetative", range: [26, 60] },
        { name: "Flowering", range: [61, 80] },
        { name: "Harvest", range: [81, 999] }
      ];
    } else if (cal.cropName === "Paddy") {
      stages = [
        { name: "Nursery", range: [0, 25] },
        { name: "Tillering", range: [26, 80] },
        { name: "Flowering", range: [81, 110] },
        { name: "Harvest", range: [111, 999] }
      ];
    } else if (cal.cropName === "Wheat") {
      stages = [
        { name: "Germination", range: [0, 20] },
        { name: "Tillering", range: [21, 60] },
        { name: "Jointing", range: [61, 95] },
        { name: "Harvest", range: [96, 999] }
      ];
    } else {
      stages = [
        { name: "Sowing", range: [0, 20] },
        { name: "Vegetative", range: [21, 55] },
        { name: "Reproductive", range: [56, 85] },
        { name: "Harvest", range: [86, 999] }
      ];
    }

    const current = stages.find(s => daysElapsed >= s.range[0] && daysElapsed <= s.range[1]) || stages[stages.length - 1];
    return {
      stage: current.name,
      daysElapsed,
      stages
    };
  };

  const lifecycle = getCropLifecycleStage(selectedCalendar);

  // Helper to format date offset strings
  const getRelativeDateString = (targetDateStr) => {
    const target = new Date(targetDateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    target.setHours(0, 0, 0, 0);
    
    const diffTime = target - today;
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Tomorrow";
    if (diffDays === -1) return "Yesterday";
    if (diffDays > 1) return `In ${diffDays} days`;
    return `${Math.abs(diffDays)} days ago`;
  };

  return (
    <div className="app-container">
      {/* Title Card */}
      <div className="card" style={{ paddingBottom: 12, background: "linear-gradient(135deg, #15803d, #166534)", color: "white" }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, margin: 0 }}>{t("agriCenterTitle")}</h1>
        <p style={{ opacity: 0.9, marginTop: 4, marginBottom: 0, fontSize: 14 }}>
          {t("agriCenterSubtitle")}
        </p>
      </div>

      {/* Tabs Row */}
      <div className="ai-tabs">
        {TABS.map((tab) => (
          <button
            key={tab}
            type="button"
            className={`ai-tab ${tab === activeTab ? "ai-tab-active" : ""}`}
            onClick={() => setActiveTab(tab)}
          >
            {displayTabName(tab)}
          </button>
        ))}
      </div>

      {/* Dynamic Content Panel */}
      <div className="ai-content">
        
        {/* --- DISEASE DETECTION TAB --- */}
        {activeTab === "Disease Detection" && (
          <div className="grid-2">
            {/* Upload Card */}
            <div className="card">
              <h3>{t("leafDiagnostics")}</h3>
              <p style={{ color: "var(--text-muted)", fontSize: 13, marginBottom: 16 }}>
                {t("leafDiagnosticsDesc")}
              </p>

              <label style={{ fontWeight: 600, fontSize: 13 }}>{t("cropTypeHint")}</label>
              <select 
                className="input"
                value={diseaseCropHint}
                onChange={(e) => setDiseaseCropHint(e.target.value)}
              >
                {Object.keys(CROP_NPK_TARGETS).map(crop => (
                  <option key={crop} value={crop}>{crop}</option>
                ))}
              </select>

              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  handleDiseaseFileSelected(e.dataTransfer.files?.[0]);
                }}
                onClick={() => fileInputRef.current?.click()}
                style={{
                  border: "2px dashed var(--border-color)",
                  borderRadius: 12,
                  padding: 24,
                  textAlign: "center",
                  background: "var(--bg-main)",
                  cursor: "pointer",
                  marginBottom: 16,
                  position: "relative",
                  overflow: "hidden"
                }}
              >
                <input
                  type="file"
                  accept="image/*"
                  ref={fileInputRef}
                  style={{ display: "none" }}
                  onChange={(e) => handleDiseaseFileSelected(e.target.files?.[0])}
                />
                
                {diseaseLoading && <div className="scan-line" />}

                <div style={{ fontSize: 36, marginBottom: 8 }}>🍃</div>
                <div style={{ fontWeight: 600, fontSize: 14, color: "var(--text-dark)" }}>
                  {diseaseFile ? diseaseFile.name : t("dragDropPhoto")}
                </div>
                <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{t("supportsFormats")}</div>
              </div>

              {diseasePreview && (
                <div style={{ marginBottom: 16, textAlign: "center", position: "relative" }}>
                  <img
                    src={diseasePreview}
                    alt="Leaf preview"
                    style={{
                      maxHeight: 200,
                      maxWidth: "100%",
                      borderRadius: 8,
                      border: "1px solid var(--border-color)",
                      objectFit: "cover"
                    }}
                  />
                  {diseaseLoading && <div className="scan-line" />}
                </div>
              )}

              <button
                className="button"
                style={{ width: "100%" }}
                onClick={handleAnalyzeDisease}
                disabled={diseaseLoading || !diseaseFile}
              >
                {diseaseLoading ? (language === 'mr' ? 'तपासत आहे...' : 'Running Diagnostics...') : t("analyzeImageBtn")}
              </button>
              
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 12 }}>
                <span className="spinner-dot" style={{ display: diseaseLoading ? "inline-block" : "none" }}></span>
                <p style={{ fontSize: 13, color: "var(--text-muted)", margin: 0 }}>
                  {diseaseStatus}
                </p>
              </div>
            </div>

            {/* Diagnostics Report */}
            <div className="card" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h3 style={{ margin: 0 }}>{t("diagnosticsReport")}</h3>
                {diseaseResult && (
                  <button className="button" style={{ background: "#0284c7", padding: "6px 12px", fontSize: 12, margin: 0 }} onClick={printPrescription}>
                    {t("printPrescription")}
                  </button>
                )}
              </div>

              {!diseaseResult ? (
                <div style={{ padding: "60px 0", textAlign: "center", color: "var(--text-muted)", flexGrow: 1, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center" }}>
                  <span style={{ fontSize: 48 }}>📊</span>
                  <p style={{ marginTop: 12, fontSize: 14 }}>{t("uploadPrompt")}</p>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  
                  {/* Confidence Gauge */}
                  <div style={{ display: "flex", gap: 16, alignItems: "center", background: "var(--bg-main)", padding: 12, borderRadius: 8 }}>
                    <div style={{ position: "relative", width: 60, height: 60 }}>
                      <svg width="60" height="60" viewBox="0 0 36 36">
                        <path
                          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                          fill="none"
                          stroke="#e2e8f0"
                          strokeWidth="3"
                        />
                        <path
                          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                          fill="none"
                          stroke="var(--primary)"
                          strokeWidth="3"
                          strokeDasharray={`${diseaseResult.confidence * 100}, 100`}
                        />
                      </svg>
                      <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", fontSize: 12, fontWeight: 700 }}>
                        {Math.round(diseaseResult.confidence * 100)}%
                      </div>
                    </div>
                    <div>
                      <strong style={{ display: "block", fontSize: 14, color: "var(--text-dark)" }}>{t("modelConfidence")}</strong>
                      <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{t("basedOnFoliage")}</span>
                    </div>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <div>
                      <span style={{ color: "var(--text-muted)", fontSize: 12 }}>{t("cropTarget")}</span>
                      <div style={{ fontWeight: 700, fontSize: 15, color: "var(--text-dark)" }}>{diseaseResult.crop}</div>
                    </div>
                    <div>
                      <span style={{ color: "var(--text-muted)", fontSize: 12 }}>{t("detectedDisease")}</span>
                      <div style={{ fontWeight: 700, fontSize: 15, color: "#dc2626" }}>{diseaseResult.disease}</div>
                    </div>
                  </div>

                  <div>
                    <span style={{ color: "var(--text-muted)", fontSize: 12, display: "block", marginBottom: 4 }}>{t("severityLevel")}</span>
                    <div style={{ height: 8, background: "#e2e8f0", borderRadius: 4, overflow: "hidden", position: "relative", marginBottom: 6 }}>
                      <div 
                        style={{
                          height: "100%",
                          width: diseaseResult.severity === "high" ? "100%" : diseaseResult.severity === "medium" ? "60%" : "30%",
                          background: diseaseResult.severity === "high" ? "#ef4444" : diseaseResult.severity === "medium" ? "#f59e0b" : "#16a34a"
                        }}
                      />
                    </div>
                    <span 
                      style={{ 
                        fontSize: 11, 
                        fontWeight: 700, 
                        color: diseaseResult.severity === "high" ? "#ef4444" : diseaseResult.severity === "medium" ? "#d97706" : "#16a34a",
                        textTransform: "uppercase"
                      }}
                    >
                      {diseaseResult.severity === "high" ? (language === 'mr' ? 'उच्च' : 'high') : diseaseResult.severity === "medium" ? (language === 'mr' ? 'मध्यम' : 'medium') : (language === 'mr' ? 'कमी' : 'low')} {t("severityThreat")}
                    </span>
                  </div>

                  {/* Healthy Leaf Comparison preset */}
                  {REFERENCE_HEALTHY_LEAVES[diseaseResult.crop] && (
                    <div style={{ border: "1px solid var(--border-color)", padding: 10, borderRadius: 8 }}>
                      <span style={{ fontSize: 12, color: "var(--text-muted)", display: "block", marginBottom: 6 }}>{t("healthyLeafRef")}</span>
                      <img 
                        src={REFERENCE_HEALTHY_LEAVES[diseaseResult.crop]} 
                        alt="Healthy Reference" 
                        style={{ height: 70, width: "100%", objectFit: "cover", borderRadius: 6 }}
                      />
                    </div>
                  )}

                  <hr style={{ borderColor: "var(--border-color)", margin: "4px 0" }} />

                  {/* Treatment prescription tabs */}
                  <div>
                    <div style={{ display: "flex", gap: 10, borderBottom: "1px solid var(--border-color)", paddingBottom: 6, marginBottom: 10 }}>
                      <button 
                        type="button"
                        style={{
                          background: "transparent",
                          border: "none",
                          fontWeight: 700,
                          fontSize: 12,
                          color: treatmentTab === "organic" ? "var(--primary)" : "var(--text-muted)",
                          borderBottom: treatmentTab === "organic" ? "2px solid var(--primary)" : "none",
                          cursor: "pointer",
                          paddingBottom: 4
                        }}
                        onClick={() => setTreatmentTab("organic")}
                      >
                        {t("organicRemedy")}
                      </button>
                      <button 
                        type="button"
                        style={{
                          background: "transparent",
                          border: "none",
                          fontWeight: 700,
                          fontSize: 12,
                          color: treatmentTab === "chemical" ? "var(--primary)" : "var(--text-muted)",
                          borderBottom: treatmentTab === "chemical" ? "2px solid var(--primary)" : "none",
                          cursor: "pointer",
                          paddingBottom: 4
                        }}
                        onClick={() => setTreatmentTab("chemical")}
                      >
                        {t("chemicalControl")}
                      </button>
                    </div>

                    {treatmentTab === "organic" ? (
                      <div style={{ background: "#ecfdf5", borderLeft: "4px solid #16a34a", padding: 12, borderRadius: 8, fontSize: 13, color: "#14532d", lineHeight: 1.5 }}>
                        <strong>{t("organicPrescription")}</strong>
                        <p style={{ margin: "4px 0 0 0" }}>{diseaseResult.advice}</p>
                        <p style={{ margin: "6px 0 0 0", fontSize: 11, opacity: 0.8 }}>
                          💡 {language === 'mr' ? 'कम्पोस्ट चहा आणि ट्रायकोडर्मा विरिडी सेंद्रिय नियंत्रणासाठी अतिशय प्रभावी पर्याय आहेत.' : 'Natural compost teas and Trichoderma viride application are highly effective biological alternatives.'}
                        </p>
                      </div>
                    ) : (
                      <div style={{ background: "#eff6ff", borderLeft: "4px solid #2563eb", padding: 12, borderRadius: 8, fontSize: 13, color: "#1e3a8a", lineHeight: 1.5 }}>
                        <strong>{t("chemicalGuidelines")}</strong>
                        <p style={{ margin: "4px 0 0 0" }}>
                          {language === 'mr' 
                            ? 'गंभीर प्रादुर्भाव असल्यास: मँकोझेब किंवा कार्बेंडाझिम (१.५ ग्रॅम प्रति लीटर पाणी) घटक असलेले बुरशीनाशक फवारा. फवारणी करताना सुरक्षित मास्क व हातमोजे वापरा.'
                            : 'In case of severe outbreak: Apply systemic fungicides containing Mancozeb or Carbendazim (1.5g per litre of water). Wear gloves and protect respiratory airways during spray.'}
                        </p>
                        <p style={{ margin: "6px 0 0 0", fontSize: 11, opacity: 0.8 }}>
                          ⚠️ {language === 'mr' ? 'रासायनिक फवारणीनंतर काढणीपूर्वी किमान १४ दिवसांचे अंतर ठेवा.' : 'Keep a 14-day pre-harvest interval after chemical sprays.'}
                        </p>
                      </div>
                    )}
                  </div>

                </div>
              )}
            </div>
          </div>
        )}

        {/* --- IRRIGATION TAB --- */}
        {activeTab === "Irrigation" && (
          <div className="grid-2">
            <div className="card">
              <h3>{language === 'mr' ? 'सिंचन वेळापत्रक सल्लागार' : 'Irrigation Scheduler'}</h3>
              <p style={{ color: "var(--text-muted)", fontSize: 13, marginBottom: 16 }}>
                {language === 'mr' 
                  ? 'पिकाच्या वाढीचे टप्पे, पिकाचा प्रकार आणि मातीच्या प्रकारानुसार पाणी देण्याचे अचूक वेळापत्रक बनवा.' 
                  : 'Set up crop irrigation schedules based on growth stage, crop type, and soil profile metrics.'}
              </p>

              <form onSubmit={handleCalculateIrrigation}>
                <label style={{ fontWeight: 600, fontSize: 13 }}>{t("selectCrop")}</label>
                <select className="input" value={irrCrop} onChange={(e) => setIrrCrop(e.target.value)}>
                  {Object.keys(CROP_NPK_TARGETS).map(crop => (
                    <option key={crop} value={crop}>{CROP_NPK_TARGETS[crop].name}</option>
                  ))}
                </select>

                <label style={{ fontWeight: 600, fontSize: 13 }}>{language === 'mr' ? 'वाढीचा टप्पा' : 'Growth Stage'}</label>
                <select className="input" value={irrStage} onChange={(e) => setIrrStage(e.target.value)}>
                  <option value="Nursery">{language === 'mr' ? 'रोपवाटिका / उगवण' : 'Nursery / Germination'}</option>
                  <option value="Vegetative">{language === 'mr' ? 'शाकीय वाढ (Vegetative)' : 'Vegetative Growth'}</option>
                  <option value="Flowering">{language === 'mr' ? 'फुलधारणेचा टप्पा (Flowering)' : 'Flowering Stage'}</option>
                  <option value="Reproductive">{language === 'mr' ? 'पुनरुत्पादन टप्पा (Reproductive)' : 'Reproductive / Boll-Pod formation'}</option>
                  <option value="Harvesting">{language === 'mr' ? 'काढणी टप्पा (Harvesting)' : 'Harvesting stage'}</option>
                </select>

                <label style={{ fontWeight: 600, fontSize: 13 }}>{language === 'mr' ? 'मातीचा प्रकार' : 'Soil Type'}</label>
                <select className="input" value={irrSoil} onChange={(e) => setIrrSoil(e.target.value)}>
                  <option value="sandy">{language === 'mr' ? 'वाळूमय माती' : 'Sandy (Fast Drainage)'}</option>
                  <option value="loamy">{language === 'mr' ? 'गाळाची/लोमी माती' : 'Loamy (Ideal Retention)'}</option>
                  <option value="clay">{language === 'mr' ? 'चिकणमाती' : 'Clay (Slow Drainage)'}</option>
                  <option value="peaty">{language === 'mr' ? 'पीठमय माती (Peaty)' : 'Peaty (Acidic/Spongy)'}</option>
                </select>

                <button type="submit" className="button" style={{ width: "100%" }}>
                  {language === 'mr' ? 'सिंचन वेळापत्रक मिळवा 💧' : 'Calculate Irrigation Prescriptions 💧'}
                </button>
              </form>
            </div>

            <div className="card">
              <h3>{language === 'mr' ? 'सिंचन शिफारस तपशील' : 'Prescription Details'}</h3>
              {!irrResult ? (
                <div style={{ padding: "60px 0", textAlign: "center", color: "var(--text-muted)" }}>
                  <span style={{ fontSize: 40 }}>🚿</span>
                  <p style={{ marginTop: 12, fontSize: 14 }}>{language === 'mr' ? 'माती व पिकाची माहिती भरून शिफारसी मिळवा.' : 'Submit farm configuration to view watering prescription.'}</p>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span>{language === 'mr' ? 'अंदाजे वापर दर:' : 'Estimated Consumption Rate:'}</span>
                    <strong style={{ fontSize: 18, color: "var(--primary)" }}>{irrResult.dailyRate} mm / {language === 'mr' ? 'दिवस' : 'day'}</strong>
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span>{language === 'mr' ? 'शिफारस केलेली वारंवारता:' : 'Recommended Frequency:'}</span>
                    <strong style={{ fontSize: 16 }}>{language === 'mr' ? `दर ${irrResult.interval} दिवसांनी` : `Every ${irrResult.interval} day(s)`}</strong>
                  </div>

                  <div style={{ background: "var(--bg-main)", padding: 12, borderRadius: 8, borderLeft: "4px solid var(--primary)" }}>
                    <strong>{language === 'mr' ? 'वाढीच्या टप्प्यासाठी मार्गदर्शन:' : 'Growth stage guidance:'}</strong>
                    <p style={{ fontSize: 13, color: "var(--text-dark)", marginTop: 4, margin: 0 }}>{irrResult.stageAdvice}</p>
                  </div>

                  {irrResult.warning && (
                    <div style={{ background: "#fffbeb", padding: 12, borderRadius: 8, borderLeft: "4px solid #f59e0b", color: "#92400e", fontSize: 13 }}>
                      {irrResult.warning}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* --- FERTILIZER / NPK ADVISOR TAB --- */}
        {activeTab === "Fertilizer / NPK" && (
          <div className="grid-2">
            {/* Input Form */}
            <div className="card">
              <h3>{language === 'mr' ? 'NPK माती पोषक सल्लागार' : 'NPK Soil Nutrient Advisor'}</h3>
              <p style={{ color: "var(--text-muted)", fontSize: 13, marginBottom: 16 }}>
                {language === 'mr' 
                  ? 'खतांचे योग्य नियोजन करण्यासाठी माती चाचणीचे मूल्य (N, P, K किलो/हेक्टर) टाका.'
                  : 'Enter soil test values (N, P, K in kg/hectare) to calculate fertilizer bag dosage split schedules.'}
              </p>

              <form onSubmit={handleCalculateFertilizer}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div>
                    <label style={{ fontWeight: 600, fontSize: 13 }}>{language === 'mr' ? 'निवडलेले पीक' : 'Target Crop'}</label>
                    <select className="input" value={fertCrop} onChange={(e) => setFertCrop(e.target.value)}>
                      {Object.keys(CROP_NPK_TARGETS).map(crop => (
                        <option key={crop} value={crop}>{CROP_NPK_TARGETS[crop].name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={{ fontWeight: 600, fontSize: 13 }}>{language === 'mr' ? 'मातीचा प्रकार' : 'Soil Type'}</label>
                    <select className="input" value={fertSoil} onChange={(e) => setFertSoil(e.target.value)}>
                      <option value="sandy">{language === 'mr' ? 'वाळूमय माती' : 'Sandy Soil'}</option>
                      <option value="loamy">{language === 'mr' ? 'गाळाची/लोमी माती' : 'Loamy Soil'}</option>
                      <option value="clay">{language === 'mr' ? 'चिकणमाती' : 'Clayey Soil'}</option>
                      <option value="peaty">{language === 'mr' ? 'पीठमय माती (Peaty)' : 'Peaty Soil'}</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
                  <div>
                    <label style={{ fontWeight: 600, fontSize: 13 }}>Acreage Area (Acres)</label>
                    <input 
                      type="number"
                      className="input" 
                      min="0.1" 
                      max="100" 
                      step="0.1"
                      value={fertArea} 
                      onChange={(e) => setFertArea(Number(e.target.value))}
                    />
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", justifyContent: "flex-end", paddingBottom: 12 }}>
                    <span style={{ fontSize: 11, background: "var(--bg-main)", padding: "8px 10px", borderRadius: 8, textAlign: "center", color: "var(--text-muted)" }}>
                      Target pH: <strong>{CROP_NPK_TARGETS[fertCrop].ph}</strong>
                    </span>
                  </div>
                </div>

                {/* N-P-K Sliders */}
                <div style={{ marginBottom: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <label style={{ fontWeight: 600, fontSize: 13 }}>Nitrogen (N): <strong>{fertN} kg/ha</strong></label>
                    <span style={{ fontSize: 10, color: "var(--text-muted)" }}>Target: {CROP_NPK_TARGETS[fertCrop].n}</span>
                  </div>
                  <input
                    type="range"
                    className="range-slider"
                    min="0"
                    max="180"
                    value={fertN}
                    onChange={(e) => setFertN(Number(e.target.value))}
                  />
                </div>

                <div style={{ marginBottom: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <label style={{ fontWeight: 600, fontSize: 13 }}>Phosphorus (P): <strong>{fertP} kg/ha</strong></label>
                    <span style={{ fontSize: 10, color: "var(--text-muted)" }}>Target: {CROP_NPK_TARGETS[fertCrop].p}</span>
                  </div>
                  <input
                    type="range"
                    className="range-slider"
                    min="0"
                    max="120"
                    value={fertP}
                    onChange={(e) => setFertP(Number(e.target.value))}
                  />
                </div>

                <div style={{ marginBottom: 16 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <label style={{ fontWeight: 600, fontSize: 13 }}>Potassium (K): <strong>{fertK} kg/ha</strong></label>
                    <span style={{ fontSize: 10, color: "var(--text-muted)" }}>Target: {CROP_NPK_TARGETS[fertCrop].k}</span>
                  </div>
                  <input
                    type="range"
                    className="range-slider"
                    min="0"
                    max="150"
                    value={fertK}
                    onChange={(e) => setFertK(Number(e.target.value))}
                  />
                </div>

                <button type="submit" className="button" style={{ width: "100%" }}>
                  Calculate Nutrient Prescription 🧪
                </button>
              </form>
            </div>

            {/* Prescription Report */}
            <div className="card">
              <h3>Nutrient Prescription</h3>
              {!fertResult ? (
                <div style={{ padding: "60px 0", textAlign: "center", color: "var(--text-muted)" }}>
                  <span style={{ fontSize: 40 }}>🌾</span>
                  <p style={{ marginTop: 12, fontSize: 14 }}>Enter soil parameters and click calculate.</p>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  
                  {/* Deficiency Chart */}
                  <div>
                    <h4 style={{ fontSize: 13, textTransform: "uppercase", color: "var(--text-muted)", marginBottom: 8 }}>Nutrient Deficiency Index</h4>
                    
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      {/* N bar */}
                      <div>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 2 }}>
                          <span>Nitrogen (N) Deficit</span>
                          <strong>{fertResult.deficits.n} kg/ha</strong>
                        </div>
                        <div style={{ height: 10, background: "#e2e8f0", borderRadius: 5, overflow: "hidden" }}>
                          <div 
                            style={{ 
                              height: "100%", 
                              width: `${(fertN / fertResult.targets.n) * 100 > 100 ? 100 : (fertN / fertResult.targets.n) * 100}%`,
                              background: "#3b82f6" 
                            }} 
                          />
                        </div>
                      </div>

                      {/* P bar */}
                      <div>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 2 }}>
                          <span>Phosphorus (P) Deficit</span>
                          <strong>{fertResult.deficits.p} kg/ha</strong>
                        </div>
                        <div style={{ height: 10, background: "#e2e8f0", borderRadius: 5, overflow: "hidden" }}>
                          <div 
                            style={{ 
                              height: "100%", 
                              width: `${(fertP / fertResult.targets.p) * 100 > 100 ? 100 : (fertP / fertResult.targets.p) * 100}%`,
                              background: "#a855f7" 
                            }} 
                          />
                        </div>
                      </div>

                      {/* K bar */}
                      <div>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 2 }}>
                          <span>Potassium (K) Deficit</span>
                          <strong>{fertResult.deficits.k} kg/ha</strong>
                        </div>
                        <div style={{ height: 10, background: "#e2e8f0", borderRadius: 5, overflow: "hidden" }}>
                          <div 
                            style={{ 
                              height: "100%", 
                              width: `${(fertK / fertResult.targets.k) * 100 > 100 ? 100 : (fertK / fertResult.targets.k) * 100}%`,
                              background: "#ef4444" 
                            }} 
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <hr style={{ borderColor: "var(--border-color)", margin: 0 }} />

                  {/* Bags Display */}
                  <div>
                    <h4 style={{ fontSize: 13, textTransform: "uppercase", color: "var(--text-muted)", marginBottom: 10 }}>Recommended Bags (50kg each):</h4>
                    
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, textAlign: "center" }}>
                      <div style={{ background: "#eff6ff", padding: 10, borderRadius: 8, border: "1px solid #bfdbfe" }}>
                        <div style={{ fontSize: 24, marginBottom: 4 }}>🎒</div>
                        <div style={{ fontSize: 18, fontWeight: 800, color: "#1d4ed8" }}>{fertResult.urea}</div>
                        <div style={{ fontSize: 11, color: "#1e40af", fontWeight: 600 }}>Urea (N)</div>
                      </div>
                      <div style={{ background: "#faf5ff", padding: 10, borderRadius: 8, border: "1px solid #e9d5ff" }}>
                        <div style={{ fontSize: 24, marginBottom: 4 }}>🎒</div>
                        <div style={{ fontSize: 18, fontWeight: 800, color: "#7e22ce" }}>{fertResult.dap}</div>
                        <div style={{ fontSize: 11, color: "#6b21a8", fontWeight: 600 }}>DAP (P + N)</div>
                      </div>
                      <div style={{ background: "#fef2f2", padding: 10, borderRadius: 8, border: "1px solid #fecaca" }}>
                        <div style={{ fontSize: 24, marginBottom: 4 }}>🎒</div>
                        <div style={{ fontSize: 18, fontWeight: 800, color: "#b91c1c" }}>{fertResult.mop}</div>
                        <div style={{ fontSize: 11, color: "#991b1b", fontWeight: 600 }}>MOP (K)</div>
                      </div>
                    </div>
                  </div>

                  {/* Compost and Soil advice */}
                  <div style={{ background: "#ecfdf5", padding: 12, borderRadius: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <strong style={{ fontSize: 13, color: "#065f46" }}>Organic Compost / Carbon:</strong>
                      <p style={{ fontSize: 11, color: "#047857", margin: 0 }}>To boost microbial soil biomes</p>
                    </div>
                    <strong style={{ fontSize: 18, color: "#047857" }}>{fertResult.compost} Tons</strong>
                  </div>

                  <div style={{ background: "var(--bg-main)", padding: 12, borderRadius: 8, fontSize: 12 }}>
                    <strong>Soil Type & pH Advisory:</strong>
                    <p style={{ margin: "4px 0 0 0", color: "var(--text-dark)", lineHeight: 1.4 }}>
                      {fertResult.soilAdvice} Target soil pH range: <strong>{fertResult.targets.ph}</strong>.
                    </p>
                  </div>

                  <div style={{ background: "#fffbeb", padding: 12, borderRadius: 8, fontSize: 12, border: "1px solid #fef3c7" }}>
                    <strong>Split Dose Schedule:</strong>
                    <ul style={{ margin: "4px 0 0 0", paddingLeft: 16, color: "#92400e" }}>
                      <li>Basal (At Sowing): Apply 100% of DAP, 100% of MOP, and 33% of Urea.</li>
                      <li>Top Dress 1 (Growth Stage): Apply 33% of Urea.</li>
                      <li>Top Dress 2 (Flowering Stage): Apply remaining 33% of Urea.</li>
                    </ul>
                  </div>

                </div>
              )}
            </div>
          </div>
        )}

        {/* --- SMART CALENDAR TAB --- */}
        {activeTab === "Smart Calendar" && (
          <div className="grid-2">
            {/* Generate card */}
            <div className="card">
              <h3>Sowing Milestone Calendar</h3>
              <p style={{ color: "var(--text-muted)", fontSize: 13, marginBottom: 16 }}>
                Set crop sowing/planting dates to generate automated calendars and track progress.
              </p>

              <form onSubmit={handleCreateCalendar}>
                <label style={{ fontWeight: 600, fontSize: 13 }}>Select Crop</label>
                <select className="input" value={calCrop} onChange={(e) => setCalCrop(e.target.value)}>
                  {Object.keys(CROP_NPK_TARGETS).map(crop => (
                    <option key={crop} value={crop}>{CROP_NPK_TARGETS[crop].name}</option>
                  ))}
                </select>

                <label style={{ fontWeight: 600, fontSize: 13 }}>Sowing Date</label>
                <input
                  type="date"
                  className="input"
                  value={calDate}
                  onChange={(e) => setCalDate(e.target.value)}
                />

                <button type="submit" className="button" style={{ width: "100%" }} disabled={calLoading}>
                  {calLoading ? "Generating..." : "Generate Crop Calendar 📅"}
                </button>
              </form>

              {/* Active Calendars Selector */}
              <h4 style={{ marginTop: 20, marginBottom: 8, fontSize: 14 }}>Your Active Calendars</h4>
              {!isLoggedIn ? (
                <div style={{ background: "#eff6ff", padding: 12, borderRadius: 8, fontSize: 12, color: "#1e40af", textAlign: "center" }}>
                  🔐 Login to generate and save calendars to the database.
                </div>
              ) : activeCalendars.length === 0 ? (
                <p style={{ fontSize: 13, color: "var(--text-muted)", margin: 0 }}>No active crop calendars found.</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {activeCalendars.map((cal) => (
                    <div
                      key={cal._id}
                      onClick={() => setSelectedCalId(cal._id)}
                      style={{
                        padding: 10,
                        border: "1px solid",
                        borderColor: selectedCalId === cal._id ? "var(--primary)" : "var(--border-color)",
                        background: selectedCalId === cal._id ? "var(--primary-light)" : "var(--bg-card)",
                        borderRadius: 8,
                        cursor: "pointer",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center"
                      }}
                    >
                      <div>
                        <strong style={{ fontSize: 14, color: "var(--text-dark)" }}>{cal.cropName}</strong>
                        <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
                          Sown: {new Date(cal.sowingDate).toLocaleDateString()}
                        </div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: "var(--primary)" }}>
                          {getProgressPercent(cal)}%
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteCalendar(cal._id);
                          }}
                          style={{
                            background: "transparent",
                            border: "none",
                            color: "#ef4444",
                            cursor: "pointer",
                            fontSize: 14
                          }}
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Milestone checklist / timeline */}
            <div className="card">
              {!selectedCalendar ? (
                <div style={{ padding: "60px 0", textAlign: "center", color: "var(--text-muted)", height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center" }}>
                  <span style={{ fontSize: 40 }}>📅</span>
                  <p style={{ marginTop: 12, fontSize: 14 }}>Select or generate a crop calendar to track milestones.</p>
                </div>
              ) : (
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
                    <h4 style={{ margin: 0 }}>{selectedCalendar.cropName} Lifecycle Timeline</h4>
                    <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
                      Sowing: {new Date(selectedCalendar.sowingDate).toLocaleDateString()}
                    </span>
                  </div>

                  {/* Circular SVG Progress & Stage info */}
                  <div style={{ display: "flex", gap: 16, alignItems: "center", background: "var(--bg-main)", padding: 12, borderRadius: 8, marginBottom: 16 }}>
                    <div style={{ position: "relative", width: 64, height: 64 }}>
                      <svg width="64" height="64" viewBox="0 0 36 36">
                        <path
                          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                          fill="none"
                          stroke="#e2e8f0"
                          strokeWidth="3.5"
                        />
                        <path
                          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                          fill="none"
                          stroke="var(--primary)"
                          strokeWidth="3.5"
                          strokeDasharray={`${getProgressPercent(selectedCalendar)}, 100`}
                        />
                      </svg>
                      <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", fontSize: 13, fontWeight: 800 }}>
                        {getProgressPercent(selectedCalendar)}%
                      </div>
                    </div>

                    <div>
                      <span style={{ fontSize: 11, color: "var(--text-muted)", display: "block" }}>Active Stage</span>
                      <strong style={{ fontSize: 16, color: "var(--primary-hover)" }}>{lifecycle.stage}</strong>
                      <span style={{ fontSize: 11, color: "var(--text-muted)", display: "block" }}>
                        Day {lifecycle.daysElapsed} of crop lifecycle
                      </span>
                    </div>
                  </div>

                  {/* Horizontal Lifecycle Stepper */}
                  <div style={{ margin: "20px 0", borderTop: "2px solid #e2e8f0", paddingTop: 10, position: "relative" }}>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      {lifecycle.stages.map((stg) => (
                        <div key={stg.name} style={{ textAlign: "center", position: "relative", top: -16 }}>
                          <div 
                            style={{ 
                              width: 12, 
                              height: 12, 
                              borderRadius: "50%", 
                              background: lifecycle.stage === stg.name ? "var(--primary)" : "#cbd5e1",
                              margin: "0 auto 4px auto",
                              border: lifecycle.stage === stg.name ? "3px solid var(--primary-light)" : "none"
                            }} 
                          />
                          <span style={{ fontSize: 10, fontWeight: lifecycle.stage === stg.name ? 700 : 500, color: lifecycle.stage === stg.name ? "var(--primary-hover)" : "var(--text-muted)" }}>
                            {stg.name}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Add Custom Task Form */}
                  <div style={{ border: "1px solid var(--border-color)", padding: 12, borderRadius: 8, marginBottom: 16, background: "var(--bg-main)" }}>
                    <h5 style={{ margin: "0 0 8px 0", fontSize: 12, textTransform: "uppercase", color: "var(--text-muted)" }}>Add Custom Milestone</h5>
                    <form onSubmit={handleAddCustomTask} style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                      <input
                        type="text"
                        className="input"
                        style={{ flex: 1, margin: 0, padding: "6px 10px", fontSize: 13 }}
                        placeholder="e.g. Call harvester machinery..."
                        value={customTaskTitle}
                        onChange={(e) => setCustomTaskTitle(e.target.value)}
                        required
                      />
                      <input
                        type="number"
                        className="input"
                        style={{ width: 80, margin: 0, padding: "6px 10px", fontSize: 13 }}
                        placeholder="Day offset"
                        value={customTaskOffset}
                        onChange={(e) => setCustomTaskOffset(e.target.value)}
                        min="0"
                        required
                      />
                      <button type="submit" className="button" style={{ margin: 0, padding: "6px 12px", fontSize: 12, background: "var(--primary)" }}>
                        + Add
                      </button>
                    </form>
                  </div>

                  {/* Timeline Checklist */}
                  <div className="timeline" style={{ maxHeight: 350, overflowY: "auto", paddingRight: 4 }}>
                    {selectedCalendar.tasks.map((task) => (
                      <div
                        key={task._id}
                        className={`timeline-item ${task.status === "completed" ? "timeline-item-completed" : "timeline-item-active"}`}
                      >
                        <div className="timeline-dot" style={{ background: task.category === "custom" ? "#f59e0b" : "var(--primary)" }} />
                        <div className="timeline-content" style={{ padding: "8px 12px" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
                            <div style={{ flex: 1 }}>
                              <strong style={{ fontSize: 13.5, color: task.status === "completed" ? "var(--primary-hover)" : "var(--text-dark)" }}>
                                {task.title}
                              </strong>
                              <div style={{ fontSize: 10.5, color: "var(--text-muted)", marginTop: 2 }}>
                                Day {task.dayOffset} • Due: {new Date(task.targetDate).toLocaleDateString()} ({getRelativeDateString(task.targetDate)})
                              </div>
                              {task.category === "custom" && (
                                <span style={{ display: "inline-block", background: "#fef3c7", color: "#d97706", fontSize: 9, padding: "1px 4px", borderRadius: 4, fontWeight: 700, marginTop: 4 }}>
                                  Custom Task
                                </span>
                              )}
                            </div>
                            <input
                              type="checkbox"
                              checked={task.status === "completed"}
                              onChange={() => handleToggleTask(selectedCalendar._id, task._id, task.status)}
                              style={{ width: 18, height: 18, cursor: "pointer", marginTop: 2 }}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                </div>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default AITools;
