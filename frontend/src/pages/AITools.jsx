import React, { useRef, useState, useEffect } from "react";
import api from "../api";

const TABS = ["Disease Detection", "Irrigation", "Fertilizer", "Smart Calendar"];

const AITools = () => {
  const [activeTab, setActiveTab] = useState("Disease Detection");

  // State: Disease Detection
  const [diseaseFile, setDiseaseFile] = useState(null);
  const [diseasePreview, setDiseasePreview] = useState("");
  const [diseaseCropHint, setDiseaseCropHint] = useState("");
  const [diseaseLoading, setDiseaseLoading] = useState(false);
  const [diseaseResult, setDiseaseResult] = useState(null);
  const [diseaseStatus, setDiseaseStatus] = useState("Upload a clear leaf photo to analyze.");
  const fileInputRef = useRef(null);

  // State: Irrigation
  const [irrCrop, setIrrCrop] = useState("Tomato");
  const [irrStage, setIrrStage] = useState("Vegetative");
  const [irrSoil, setIrrSoil] = useState("loamy");
  const [irrResult, setIrrResult] = useState(null);

  // State: Fertilizer
  const [fertCrop, setFertCrop] = useState("Tomato");
  const [fertN, setFertN] = useState(40);
  const [fertP, setFertP] = useState(25);
  const [fertK, setFertK] = useState(30);
  const [fertArea, setFertArea] = useState(1);
  const [fertResult, setFertResult] = useState(null);

  // State: Smart Calendar
  const [calCrop, setCalCrop] = useState("Tomato");
  const [calDate, setCalDate] = useState(new Date().toISOString().split("T")[0]);
  const [activeCalendars, setActiveCalendars] = useState([]);
  const [selectedCalId, setSelectedCalId] = useState(null);
  const [calLoading, setCalLoading] = useState(false);

  // Load calendars on mount/refresh
  const loadCalendars = async () => {
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
  }, []);

  // --- Handlers: Disease Detection ---
  const handleDiseaseFileSelected = (file) => {
    if (!file) return;
    setDiseaseFile(file);
    setDiseasePreview(URL.createObjectURL(file));
    setDiseaseResult(null);
    setDiseaseStatus("Image ready. Click 'Analyze Image'.");
  };

  const handleAnalyzeDisease = async () => {
    if (!diseaseFile) {
      setDiseaseStatus("Please select or drop an image file.");
      return;
    }
    setDiseaseLoading(true);
    setDiseaseStatus("AI is examining leaf features...");
    try {
      const formData = new FormData();
      formData.append("image", diseaseFile);
      if (diseaseCropHint) {
        formData.append("crop", diseaseCropHint);
      }
      const response = await api.post("/crop-disease/analyze", formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      if (response.data.success) {
        setDiseaseResult(response.data);
        setDiseaseStatus("Analysis successful.");
      } else {
        setDiseaseStatus(response.data.message || "Analysis failed.");
      }
    } catch (err) {
      console.error(err);
      setDiseaseStatus("Error analyzing crop leaf. Please retry.");
    } finally {
      setDiseaseLoading(false);
    }
  };

  // --- Handlers: Irrigation ---
  const handleCalculateIrrigation = (e) => {
    e.preventDefault();
    // Simulate smart calculation
    let baseRate = 4.5; // mm/day
    let interval = 3; // days
    let warning = "";

    if (irrCrop === "Paddy") {
      baseRate = 8.0;
      interval = 1;
    } else if (irrCrop === "Wheat") {
      baseRate = 3.5;
      interval = 6;
    }

    if (irrSoil === "sandy") {
      interval = Math.max(1, interval - 1);
    } else if (irrSoil === "clay") {
      interval += 1;
    }

    if (irrStage === "Flowering" || irrStage === "Fruiting") {
      baseRate *= 1.25;
    }

    // Weather warnings
    const weatherConditions = ["raining", "hot", "normal"];
    const currentSimulatedWeather = weatherConditions[Math.floor(Math.random() * weatherConditions.length)];
    if (currentSimulatedWeather === "raining") {
      warning = "⚠️ Rain forecasted soon in your region. Suspend irrigation schedule for 48 hours to conserve water.";
    } else if (currentSimulatedWeather === "hot") {
      warning = "🔥 Temperature is elevated. Crop transpiration rates are high. Add 15% more water volume.";
    }

    setIrrResult({
      dailyRate: baseRate.toFixed(1),
      interval,
      stageAdvice: `Keep soil moisture balanced during ${irrStage} stage to maximize yield and fruit size.`,
      warning
    });
  };

  // --- Handlers: Fertilizer NPK ---
  const handleCalculateFertilizer = (e) => {
    e.preventDefault();
    // Targets (N, P, K)
    const TARGETS = {
      Tomato: { n: 120, p: 60, k: 60 },
      Paddy: { n: 100, p: 40, k: 40 },
      Wheat: { n: 120, p: 50, k: 40 },
      Potato: { n: 150, p: 80, k: 100 }
    };

    const target = TARGETS[fertCrop];
    const defN = Math.max(0, target.n - fertN);
    const defP = Math.max(0, target.p - fertP);
    const defK = Math.max(0, target.k - fertK);

    // 1 bag (50kg) Urea = 23kg N
    // 1 bag (50kg) DAP = 9kg N + 23kg P
    // 1 bag (50kg) MOP = 30kg K
    let dapBags = (defP / 23) * fertArea;
    let ureaBags = ((defN - (dapBags * 9)) / 23) * fertArea;
    if (ureaBags < 0) ureaBags = 0;
    let mopBags = (defK / 30) * fertArea;

    setFertResult({
      dap: dapBags.toFixed(1),
      urea: ureaBags.toFixed(1),
      mop: mopBags.toFixed(1),
      compost: (fertArea * 2).toFixed(1), // tonnes of compost
      advice: `Split the Urea application: 1/3 as basal during sowing, 1/3 at 30 days, and 1/3 at 60 days. Apply all DAP & MOP as basal dose.`
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
      // update state
      setActiveCalendars((prev) =>
        prev.map((c) => (c._id === calId ? res.data : c))
      );
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteCalendar = async (calId) => {
    if (!window.confirm("Are you sure you want to delete this calendar?")) return;
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

  // Calendar progress calculation
  const getProgressPercent = (cal) => {
    if (!cal || !cal.tasks.length) return 0;
    const completed = cal.tasks.filter((t) => t.status === "completed").length;
    return Math.round((completed / cal.tasks.length) * 100);
  };

  return (
    <div className="app-container">
      <div className="card" style={{ paddingBottom: 10, background: "linear-gradient(135deg, #15803d, #166534)", color: "white" }}>
        <h1 style={{ fontSize: 28, fontWeight: 800 }}>AI Agri-Center</h1>
        <p style={{ opacity: 0.9, marginTop: 4 }}>
          Access cutting-edge advisory tools including visual disease checking, water managers, crop planners, and nutrient schedules.
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
            {tab}
          </button>
        ))}
      </div>

      {/* Dynamic Content Panel */}
      <div className="ai-content">
        
        {/* --- DISEASE DETECTION TAB --- */}
        {activeTab === "Disease Detection" && (
          <div className="grid-2">
            {/* Upload Area */}
            <div className="card">
              <h3>Leaf Disease Diagnostics</h3>
              <p style={{ color: "var(--text-muted)", fontSize: 13, marginBottom: 16 }}>
                Snap or upload a photo of the affected plant leaf. Our AI model examines textures and spotting to suggest treatments.
              </p>

              <label>Crop Type (optional)</label>
              <input
                type="text"
                className="input"
                placeholder="Example: Tomato, Rice, Wheat..."
                value={diseaseCropHint}
                onChange={(e) => setDiseaseCropHint(e.target.value)}
              />

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
                  background: "#f9fafb",
                  cursor: "pointer",
                  marginBottom: 16
                }}
              >
                <input
                  type="file"
                  accept="image/*"
                  ref={fileInputRef}
                  style={{ display: "none" }}
                  onChange={(e) => handleDiseaseFileSelected(e.target.files?.[0])}
                />
                <div style={{ fontSize: 36, marginBottom: 8 }}>🍃</div>
                <div style={{ fontWeight: 600, fontSize: 14 }}>
                  {diseaseFile ? diseaseFile.name : "Click here or drag-and-drop crop photo"}
                </div>
                <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Supports PNG, JPG, JPEG</div>
              </div>

              {diseasePreview && (
                <div style={{ marginBottom: 16, textAlign: "center" }}>
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
                </div>
              )}

              <button
                className="button"
                style={{ width: "100%" }}
                onClick={handleAnalyzeDisease}
                disabled={diseaseLoading || !diseaseFile}
              >
                {diseaseLoading ? "Analyzing leaf patterns..." : "Analyze Image 🔬"}
              </button>
              <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 8, textAlign: "center" }}>
                {diseaseStatus}
              </p>
            </div>

            {/* Results Panel */}
            <div className="card">
              <h3>AI Diagnostic Report</h3>
              {!diseaseResult ? (
                <div style={{ padding: "40px 0", textAlign: "center", color: "var(--text-muted)" }}>
                  <span style={{ fontSize: 40 }}>📊</span>
                  <p style={{ marginTop: 12, fontSize: 14 }}>Upload a leaf photo and click analyze to output report.</p>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <div style={{ background: "var(--primary-light)", padding: 12, borderRadius: 8, color: "var(--primary-hover)" }}>
                    <strong>✅ Model Confidence: {(diseaseResult.confidence * 100).toFixed(1)}%</strong>
                  </div>
                  <div>
                    <strong>Target Crop:</strong> {diseaseResult.crop}
                  </div>
                  <div>
                    <strong>Detected Issue:</strong> {diseaseResult.disease}
                  </div>
                  <div>
                    <strong>Threat Severity:</strong>{" "}
                    <span
                      style={{
                        padding: "2px 8px",
                        borderRadius: 4,
                        fontSize: 12,
                        fontWeight: 700,
                        background: diseaseResult.severity === "high" ? "#fee2e2" : diseaseResult.severity === "medium" ? "#fef3c7" : "#dcfce7",
                        color: diseaseResult.severity === "high" ? "#991b1b" : diseaseResult.severity === "medium" ? "#92400e" : "#166534"
                      }}
                    >
                      {diseaseResult.severity.toUpperCase()}
                    </span>
                  </div>
                  <hr style={{ margin: "8px 0", borderColor: "var(--border-color)" }} />
                  <div>
                    <strong>Suggested Remedial Action:</strong>
                    <p style={{ fontSize: 14, color: "#374151", marginTop: 4, lineHeight: 1.6 }}>
                      {diseaseResult.advice}
                    </p>
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
              <h3>Water Manager</h3>
              <p style={{ color: "var(--text-muted)", fontSize: 13, marginBottom: 16 }}>
                Set up crop irrigation schedules based on growth stage, local weather parameters, and soil drainage attributes.
              </p>

              <form onSubmit={handleCalculateIrrigation}>
                <label>Select Crop</label>
                <select className="input" value={irrCrop} onChange={(e) => setIrrCrop(e.target.value)}>
                  <option value="Tomato">Tomato</option>
                  <option value="Paddy">Paddy / Rice</option>
                  <option value="Wheat">Wheat</option>
                  <option value="Potato">Potato</option>
                </select>

                <label>Growth Stage</label>
                <select className="input" value={irrStage} onChange={(e) => setIrrStage(e.target.value)}>
                  <option value="Nursery">Nursery / Sowing</option>
                  <option value="Vegetative">Vegetative Growth</option>
                  <option value="Flowering">Flowering Stage</option>
                  <option value="Fruiting">Fruiting / Yielding</option>
                </select>

                <label>Soil Drainage Profile</label>
                <select className="input" value={irrSoil} onChange={(e) => setIrrSoil(e.target.value)}>
                  <option value="sandy">Sandy (Fast Drainage)</option>
                  <option value="loamy">Loamy (Optimal retention)</option>
                  <option value="clay">Clay (Dense, slow drainage)</option>
                </select>

                <button type="submit" className="button" style={{ width: "100%" }}>
                  Calculate Irrigation Rates 💧
                </button>
              </form>
            </div>

            <div className="card">
              <h3>Irrigation Prescription</h3>
              {!irrResult ? (
                <div style={{ padding: "40px 0", textAlign: "center", color: "var(--text-muted)" }}>
                  <span style={{ fontSize: 40 }}>🚿</span>
                  <p style={{ marginTop: 12, fontSize: 14 }}>Submit farm configuration to view watering prescription.</p>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span>Estimated Consumption Rate:</span>
                    <strong style={{ fontSize: 18, color: "var(--primary)" }}>{irrResult.dailyRate} mm / day</strong>
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span>Recommended Frequency:</span>
                    <strong style={{ fontSize: 16 }}>Every {irrResult.interval} day(s)</strong>
                  </div>

                  <div style={{ background: "#f8fafc", padding: 12, borderRadius: 8, borderLeft: "4px solid var(--primary)" }}>
                    <strong>Growth stage guidance:</strong>
                    <p style={{ fontSize: 13, color: "#4b5563", marginTop: 4 }}>{irrResult.stageAdvice}</p>
                  </div>

                  {irrResult.warning && (
                    <div style={{ background: "var(--accent-light)", padding: 12, borderRadius: 8, borderLeft: "4px solid var(--accent)", color: "#92400e", fontSize: 13 }}>
                      {irrResult.warning}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* --- FERTILIZER TAB --- */}
        {activeTab === "Fertilizer" && (
          <div className="grid-2">
            <div className="card">
              <h3>NPK Soil Deficit Calculator</h3>
              <p style={{ color: "var(--text-muted)", fontSize: 13, marginBottom: 16 }}>
                Drag soil test metrics (N-P-K in kg/hectare) to compute bag recommendations for standard farming agents.
              </p>

              <form onSubmit={handleCalculateFertilizer}>
                <label>Select Target Crop</label>
                <select className="input" value={fertCrop} onChange={(e) => setFertCrop(e.target.value)}>
                  <option value="Tomato">Tomato</option>
                  <option value="Paddy">Paddy / Rice</option>
                  <option value="Wheat">Wheat</option>
                  <option value="Potato">Potato</option>
                </select>

                <div style={{ marginBottom: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <label>Soil Nitrogen (N): <strong>{fertN} kg/ha</strong></label>
                  </div>
                  <input
                    type="range"
                    className="range-slider"
                    min="0"
                    max="150"
                    value={fertN}
                    onChange={(e) => setFertN(Number(e.target.value))}
                  />
                </div>

                <div style={{ marginBottom: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <label>Soil Phosphorus (P): <strong>{fertP} kg/ha</strong></label>
                  </div>
                  <input
                    type="range"
                    className="range-slider"
                    min="0"
                    max="100"
                    value={fertP}
                    onChange={(e) => setFertP(Number(e.target.value))}
                  />
                </div>

                <div style={{ marginBottom: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <label>Soil Potassium (K): <strong>{fertK} kg/ha</strong></label>
                  </div>
                  <input
                    type="range"
                    className="range-slider"
                    min="0"
                    max="120"
                    value={fertK}
                    onChange={(e) => setFertK(Number(e.target.value))}
                  />
                </div>

                <label>Farm Land Area (Acres)</label>
                <input
                  type="number"
                  className="input"
                  min="0.1"
                  max="100"
                  step="0.1"
                  value={fertArea}
                  onChange={(e) => setFertArea(Number(e.target.value))}
                />

                <button type="submit" className="button" style={{ width: "100%" }}>
                  Calculate Nutrient Bags 🧪
                </button>
              </form>
            </div>

            <div className="card">
              <h3>Target Fertilizer Application</h3>
              {!fertResult ? (
                <div style={{ padding: "40px 0", textAlign: "center", color: "var(--text-muted)" }}>
                  <span style={{ fontSize: 40 }}>🌾</span>
                  <p style={{ marginTop: 12, fontSize: 14 }}>Enter soil parameters and calculate recommendations.</p>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  <h4 style={{ fontSize: 14, textTransform: "uppercase", color: "var(--text-muted)" }}>Required Bags (50kg each):</h4>
                  
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, textAlign: "center" }}>
                    <div style={{ background: "#eff6ff", padding: 12, borderRadius: 8 }}>
                      <div style={{ fontSize: 20, fontWeight: 800, color: "#1d4ed8" }}>{fertResult.urea}</div>
                      <div style={{ fontSize: 11, color: "#1e40af", fontWeight: 600 }}>Urea (Nitrogen)</div>
                    </div>
                    <div style={{ background: "#faf5ff", padding: 12, borderRadius: 8 }}>
                      <div style={{ fontSize: 20, fontWeight: 800, color: "#7e22ce" }}>{fertResult.dap}</div>
                      <div style={{ fontSize: 11, color: "#6b21a8", fontWeight: 600 }}>DAP (Phos + N)</div>
                    </div>
                    <div style={{ background: "#fef2f2", padding: 12, borderRadius: 8 }}>
                      <div style={{ fontSize: 20, fontWeight: 800, color: "#b91c1c" }}>{fertResult.mop}</div>
                      <div style={{ fontSize: 11, color: "#991b1b", fontWeight: 600 }}>MOP (Potassium)</div>
                    </div>
                  </div>

                  <div style={{ background: "#ecfdf5", padding: 12, borderRadius: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <strong style={{ fontSize: 13, color: "#065f46" }}>Organic Compost / Manure:</strong>
                      <p style={{ fontSize: 11, color: "#047857" }}>Boosts microbial carbon metrics.</p>
                    </div>
                    <strong style={{ fontSize: 18, color: "#047857" }}>{fertResult.compost} Tons</strong>
                  </div>

                  <div style={{ background: "#fafafa", padding: 12, border: "1px solid var(--border-color)", borderRadius: 8 }}>
                    <strong>Application Advice:</strong>
                    <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4, lineHeight: 1.5 }}>
                      {fertResult.advice}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* --- SMART CALENDAR TAB --- */}
        {activeTab === "Smart Calendar" && (
          <div className="grid-2">
            {/* Generate calendar form */}
            <div className="card">
              <h3>Crop Calendar Generator</h3>
              <p style={{ color: "var(--text-muted)", fontSize: 13, marginBottom: 16 }}>
                Generate sowing timelines, track milestones relative to current crop age, and check off steps as they complete.
              </p>

              <form onSubmit={handleCreateCalendar}>
                <label>Select Crop</label>
                <select className="input" value={calCrop} onChange={(e) => setCalCrop(e.target.value)}>
                  <option value="Tomato">Tomato</option>
                  <option value="Paddy">Paddy / Rice</option>
                  <option value="Wheat">Wheat</option>
                  <option value="Potato">Potato</option>
                </select>

                <label>Sowing/Nursery Date</label>
                <input
                  type="date"
                  className="input"
                  value={calDate}
                  onChange={(e) => setCalDate(e.target.value)}
                />

                <button type="submit" className="button" style={{ width: "100%" }} disabled={calLoading}>
                  {calLoading ? "Generating Schedule..." : "Generate Crop Calendar 📅"}
                </button>
              </form>

              <h4 style={{ marginTop: 24, marginBottom: 8, fontSize: 14 }}>Active Calendars</h4>
              {activeCalendars.length === 0 ? (
                <p style={{ fontSize: 13, color: "var(--text-muted)" }}>No calendars generated yet.</p>
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
                        background: selectedCalId === cal._id ? "var(--primary-light)" : "white",
                        borderRadius: 8,
                        cursor: "pointer",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center"
                      }}
                    >
                      <div>
                        <strong>{cal.cropName}</strong>
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

            {/* Display active schedule timeline */}
            <div className="card">
              <h3>Milestone Tracker</h3>
              {!selectedCalendar ? (
                <div style={{ padding: "40px 0", textAlign: "center", color: "var(--text-muted)" }}>
                  <span style={{ fontSize: 40 }}>📅</span>
                  <p style={{ marginTop: 12, fontSize: 14 }}>Select or generate a crop calendar to track milestones.</p>
                </div>
              ) : (
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                    <h4>{selectedCalendar.cropName} Schedule</h4>
                    <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
                      Sowing Date: {new Date(selectedCalendar.sowingDate).toLocaleDateString()}
                    </span>
                  </div>

                  {/* Progress bar */}
                  <div style={{ background: "#e5e7eb", borderRadius: 4, height: 8, width: "100%", marginBottom: 20, overflow: "hidden" }}>
                    <div
                      style={{
                        height: "100%",
                        width: `${getProgressPercent(selectedCalendar)}%`,
                        background: "var(--primary)",
                        transition: "width 0.3s"
                      }}
                    />
                  </div>

                  {/* Timeline Checklist */}
                  <div className="timeline">
                    {selectedCalendar.tasks.map((task) => (
                      <div
                        key={task._id}
                        className={`timeline-item ${task.status === "completed" ? "timeline-item-completed" : "timeline-item-active"}`}
                      >
                        <div className="timeline-dot" />
                        <div className="timeline-content">
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
                            <div>
                              <strong style={{ fontSize: 14, color: task.status === "completed" ? "var(--primary-hover)" : "inherit" }}>
                                {task.title}
                              </strong>
                              <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
                                Day {task.dayOffset} • Due: {new Date(task.targetDate).toLocaleDateString()}
                              </div>
                            </div>
                            <input
                              type="checkbox"
                              checked={task.status === "completed"}
                              onChange={() => handleToggleTask(selectedCalendar._id, task._id, task.status)}
                              style={{ width: 16, height: 16, cursor: "pointer" }}
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
