import React, { useRef, useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import api from "../api";
import { useLanguage } from "../context/LanguageContext";
import { useHistory } from "../context/HistoryContext";
import DiagnosticReport from "../components/common/DiagnosticReport";
import { extractErrorMessage } from "../utils/errorUtils";


const TABS = ["Irrigation", "Fertilizer / NPK", "Smart Calendar"];

const CROP_NPK_TARGETS = {
  Tomato: { n: 120, p: 60, k: 60, ph: "6.0 - 7.0", name: "Tomato" },
  Paddy: { n: 100, p: 40, k: 40, ph: "5.5 - 6.5", name: "Paddy / Rice" },
};

// Extended targets for Irrigation, Fertilizer, and Smart Calendar tabs (all crops)
const CROP_NPK_TARGETS_EXTENDED = {
  Rice: { n: 100, p: 40, k: 40, ph: "5.5 - 6.5", name: "Rice (Paddy)" },
  Wheat: { n: 120, p: 60, k: 40, ph: "6.0 - 7.0", name: "Wheat" },
  Cotton: { n: 120, p: 60, k: 60, ph: "6.0 - 7.5", name: "Cotton" },
  Sugarcane: { n: 250, p: 115, k: 115, ph: "6.0 - 7.5", name: "Sugarcane" },
  Maize: { n: 120, p: 60, k: 50, ph: "5.8 - 7.0", name: "Maize (Corn)" },
  Soybean: { n: 30, p: 60, k: 40, ph: "6.0 - 7.5", name: "Soybean" },
  Groundnut: { n: 25, p: 50, k: 40, ph: "6.0 - 6.8", name: "Groundnut" },
  Onion: { n: 100, p: 50, k: 50, ph: "6.0 - 7.0", name: "Onion" },
  Tomato: { n: 120, p: 60, k: 60, ph: "6.0 - 7.0", name: "Tomato" },
  Potato: { n: 150, p: 80, k: 120, ph: "5.2 - 6.4", name: "Potato" },
  Chilli: { n: 100, p: 60, k: 60, ph: "6.0 - 7.0", name: "Chilli" },
  Banana: { n: 200, p: 60, k: 300, ph: "6.0 - 7.5", name: "Banana" },
  Mango: { n: 100, p: 50, k: 100, ph: "5.5 - 7.5", name: "Mango" },
  Grapes: { n: 100, p: 80, k: 120, ph: "6.0 - 7.5", name: "Grapes" },
  Mustard: { n: 80, p: 40, k: 40, ph: "6.0 - 7.5", name: "Mustard" }
};

const SOIL_DRY_DRAIN = {
  sandy: { name: "Sandy (Fast)", ph: "5.5 - 6.5", advice: "High drainage. Apply NPK in split doses to avoid leaching." },
  loamy: { name: "Loamy (Optimal)", ph: "6.0 - 7.0", advice: "Ideal water & nutrient retention. Standard NPK splits recommended." },
  clay: { name: "Clayey (Slow)", ph: "6.5 - 7.5", advice: "Heavy retention. Risk of waterlogging. Reduce potassium single dose frequency." },
  peaty: { name: "Peaty (Acidic)", ph: "4.5 - 5.5", advice: "Organic rich but highly acidic. Add agricultural lime to boost P absorption." }
};

const REFERENCE_HEALTHY_LEAVES = {
  Tomato: "https://images.unsplash.com/photo-1592924357228-91a4daadcfea?auto=format&fit=crop&w=300&q=80",
  Paddy: "https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=300&q=80"
};

const DIAGNOSTIC_CROPS = [
  { id: "Tomato", en: "Tomato", mr: "टोमॅटो", hi: "टमाटर" },
  { id: "Paddy", en: "Paddy / Rice", mr: "भात / धान", hi: "धान / चावल" },
  { id: "Wheat", en: "Wheat", mr: "गहू", hi: "गेहूं" },
  { id: "Maize", en: "Maize / Corn", mr: "मका", hi: "मक्का" },
  { id: "Cotton", en: "Cotton", mr: "कापूस", hi: "कपास" },
  { id: "Sugarcane", en: "Sugarcane", mr: "ऊस", hi: "गन्ना" },
  { id: "Potato", en: "Potato", mr: "बटाटा", hi: "आलू" },
  { id: "Groundnut", en: "Groundnut / Peanut", mr: "भूईमूग / शेंगदाणा", hi: "मूंगफली" },
  { id: "Soybean", en: "Soybean", mr: "सोयाबीन", hi: "सोयाबीन" },
  { id: "Chilli", en: "Chilli / Pepper", mr: "मिरची", hi: "मिर्च" },
  { id: "Banana", en: "Banana", mr: "केळी", hi: "केला" },
  { id: "Onion", en: "Onion", mr: "कांदा", hi: "प्याज़" },
  { id: "Mango", en: "Mango", mr: "आंबा", hi: "आम" },
  { id: "Brinjal", en: "Brinjal / Eggplant", mr: "वांगी", hi: "बैंगन" },
  { id: "Mustard", en: "Mustard", mr: "मोहरी", hi: "सरसों" },
  { id: "Cattle", en: "Cattle / Livestock", mr: "पशुधन / जनावरे", hi: "पशुधन / गाय-भैंस" },
  { id: "Other", en: "Other (Type crop name...)", mr: "इतर (नाव प्रविष्ट करा)", hi: "अन्य (नाम दर्ज करें)" }
];

const AITools = () => {
  const { t, language } = useLanguage();
  const { addHistoryEntry } = useHistory();
  const [activeTab, setActiveTab] = useState("Irrigation");
  const isLoggedIn = !!localStorage.getItem("sk_token");

  // Q&A states
  const [qaInput, setQaInput] = useState("");
  const [qaResponse, setQaResponse] = useState("");
  const [qaLoading, setQaLoading] = useState(false);
  const [qaCrop, setQaCrop] = useState("Tomato");

  const displayTabName = (tab) => {
    if (tab === "Irrigation") return language === 'mr' ? 'सिंचन वेळापत्रक' : 'Irrigation';
    if (tab === "Fertilizer / NPK") return language === 'mr' ? 'खत / NPK' : 'Fertilizer / NPK';
    if (tab === "Smart Calendar") return language === 'mr' ? 'स्मार्ट कॅलेंडर' : 'Smart Calendar';
    if (tab === "Crop Q&A Assistant") return language === 'mr' ? 'पीक प्रश्नोत्तरे' : 'Crop Q&A Assistant';
    return tab;
  };

  const handleAskQuestion = async (e) => {
    e.preventDefault();
    if (!qaInput.trim()) return;
    setQaLoading(true);
    setQaResponse("");
    try {
      const key = localStorage.getItem("sk_gemini_key") || "";
      const headers = {};
      if (key) headers["x-gemini-key"] = key;

      const res = await api.post("/ai/chat", {
        message: qaInput,
        language: language,
        cropHint: qaCrop
      }, { headers });

      setQaResponse(res.data.response);
    } catch (err) {
      console.error(err);
      setQaResponse(language === 'mr' 
        ? "माहिती मिळवण्यात त्रुटी आली. कृपया शेताचे खत व्यवस्थापन, पाणी भरणे आणि पिकाचे कीड नियंत्रण वेळेवर करा." 
        : "AI server is currently offline. Local crop advice: Keep soil well-drained, inspect leaves for symptoms daily, and apply NPK in split doses.");
    } finally {
      setQaLoading(false);
    }
  };

  const location = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tabParam = params.get("tab");

    if (tabParam === "calendar") {
      setActiveTab("Smart Calendar");
    } else if (tabParam === "npk") {
      setActiveTab("Fertilizer / NPK");
    } else if (tabParam === "irrigation") {
      setActiveTab("Irrigation");
    }
  }, [location.search]);

  // Handle image passed from CameraScannerModal
  useEffect(() => {
    if (location.state?.capturedFile) {
      const file = location.state.capturedFile;
      setDiseaseFile(file);
      setDiseasePreview(URL.createObjectURL(file));
      setDiseaseResult(null);
      setDiseaseRejection(null);
    }
  }, [location.state]);
  const [diseaseFile, setDiseaseFile] = useState(null);
  const [diseasePreview, setDiseasePreview] = useState("");
  const [diseaseCropHint, setDiseaseCropHint] = useState("Tomato");
  const [diseaseCustomCrop, setDiseaseCustomCrop] = useState("");
  const [diseaseGeminiKey, setDiseaseGeminiKey] = useState(localStorage.getItem("sk_gemini_key") || "");
  const [showKeyInput, setShowKeyInput] = useState(!localStorage.getItem("sk_gemini_key"));
  const [keySavedStatus, setKeySavedStatus] = useState("");
  const [diseaseLoading, setDiseaseLoading] = useState(false);
  const [diseaseResult, setDiseaseResult] = useState(null);
  const [diseaseIsInvalid, setDiseaseIsInvalid] = useState(false);
  const [diseaseRejection, setDiseaseRejection] = useState(null); // {message, confidence} on gate rejection
  const [diseaseStatus, setDiseaseStatus] = useState("Upload a crop leaf photo and click analyze.");
  const [scanStep, setScanStep] = useState(0);
  const [scanStepsList] = useState([
    "🔬 Validating image — checking for plant leaf...",
    "🌿 Analyzing leaf morphology, lesion patterns & color signatures...",
    "🤖 Cross-referencing with PlantVillage & PlantDoc disease database...",
    "💊 Synthesizing organic & chemical treatment recommendations..."
  ]);
  const [leafTreatmentTab, setLeafTreatmentTab] = useState("organic"); // organic | chemical | prevention
  const fileInputRef = useRef(null);



  // Gemini API key save handler
  const saveGeminiKey = () => {
    const trimmed = diseaseGeminiKey.trim();
    if (trimmed) {
      localStorage.setItem("sk_gemini_key", trimmed);
      setKeySavedStatus(language === 'mr' ? '✅ API Key जतन केली!' : '✅ API Key saved!');
      setShowKeyInput(false);
      setTimeout(() => setKeySavedStatus(""), 3000);
    }
  };

  const PY_API_BASE = import.meta.env.VITE_PY_API_URL || (
    typeof window !== "undefined" && (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1")
      ? "/pyapi"
      : "/api"
  );

  // Parse structured Gemini AgriExpert advice
  const parseGeminiAdvice = (adviceText) => {
    if (!adviceText) return null;
    const sections = { diseaseName: null, treatment: null, precautions: null, productLinks: null, isStructured: false, raw: adviceText };
    if (adviceText.includes("**Disease Name:**") || adviceText.includes("Disease Name:")) {
      sections.isStructured = true;
      const extract = (key, nextKey) => {
        const patterns = [`* **${key}:**`, `- **${key}:**`, `**${key}:**`, `${key}:`];
        let bestIdx = -1, bestLen = 0;
        for (const pat of patterns) {
          const idx = adviceText.indexOf(pat);
          if (idx !== -1) { bestIdx = idx; bestLen = pat.length; break; }
        }
        if (bestIdx === -1) return null;
        const contentStart = bestIdx + bestLen;
        let contentEnd = adviceText.length;
        if (nextKey) {
          const nextPatterns = [`* **${nextKey}:**`, `- **${nextKey}:**`, `**${nextKey}:**`];
          for (const np of nextPatterns) {
            const ni = adviceText.indexOf(np, contentStart);
            if (ni !== -1 && ni < contentEnd) contentEnd = ni;
          }
        }
        return adviceText.slice(contentStart, contentEnd).trim().replace(/^\[|\]$/g, "").trim();
      };
      sections.diseaseName  = extract("Disease Name", "Cure/Treatment");
      sections.treatment    = extract("Cure/Treatment", "Precautions to Take");
      sections.precautions  = extract("Precautions to Take", "Treatment Product Links");
      sections.productLinks = extract("Treatment Product Links", null);
    }
    return sections;
  };

  // State: Irrigation
  const [irrCrop, setIrrCrop] = useState("Tomato");
  const [irrCustomCrop, setIrrCustomCrop] = useState("");
  const [irrStage, setIrrStage] = useState("Vegetative");
  const [irrSoil, setIrrSoil] = useState("loamy");
  const [irrResult, setIrrResult] = useState(null);

  // State: Fertilizer / NPK Advisor
  const [fertCrop, setFertCrop] = useState("Tomato");
  const [fertCustomCrop, setFertCustomCrop] = useState("");
  const [fertSoil, setFertSoil] = useState("loamy");
  const [fertN, setFertN] = useState(50);
  const [fertP, setFertP] = useState(30);
  const [fertK, setFertK] = useState(25);
  const [fertArea, setFertArea] = useState(1);
  const [fertResult, setFertResult] = useState(null);

  // State: Smart Calendar
  const [calCrop, setCalCrop] = useState("Tomato");
  const [calCustomCrop, setCalCustomCrop] = useState("");
  const [calDate, setCalDate] = useState(new Date().toISOString().split("T")[0]);
  const [activeCalendars, setActiveCalendars] = useState([]);
  const [selectedCalId, setSelectedCalId] = useState(null);
  const [calLoading, setCalLoading] = useState(false);
  const [customTaskTitle, setCustomTaskTitle] = useState("");
  const [customTaskOffset, setCustomTaskOffset] = useState("10");
  const [isEditingSowingDate, setIsEditingSowingDate] = useState(false);
  const [tempSowingDate, setTempSowingDate] = useState("");

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

  // Reset editing mode when calendar selection changes
  useEffect(() => {
    setIsEditingSowingDate(false);
  }, [selectedCalId]);

  // --- Handlers: Disease Detection ---
  const handleDiseaseFileSelected = (file) => {
    if (!file) return;
    setDiseaseFile(file);
    setDiseasePreview(URL.createObjectURL(file));
    setDiseaseResult(null);
    if (diseaseSubTab === "leaf_diag") {
      setDiseaseStatus(language === 'mr' ? "प्रतिमा लोड झाली. 'पानाचे विश्लेषण करा' वर क्लिक करा." : "Image loaded. Click 'Analyze Leaf'.");
    } else {
      setDiseaseStatus(language === 'mr' ? "प्रतिमा लोड झाली. 'पिकाचे विश्लेषण करा' वर क्लिक करा." : "Image loaded. Click 'Analyze Crop'.");
    }
  };

  const clearDiseaseImage = (subTabId) => {
    const activeSubTab = subTabId || diseaseSubTab;
    setDiseaseFile(null);
    setDiseasePreview(null);
    setDiseaseResult(null);
    if (activeSubTab === "crop_cv") {
      setDiseaseStatus(language === 'mr' ? "पिकाचा फोटो अपलोड करा आणि विश्लेषणावर क्लिक करा." : "Upload a crop photo and click analyze to output report.");
    } else if (activeSubTab === "leaf_diag") {
      setDiseaseStatus(language === 'mr' ? "पानाचा फोटो अपलोड करा आणि विश्लेषणावर क्लिक करा." : "Upload a leaf photo and click analyze to output report.");
    } else {
      setDiseaseStatus(language === 'mr' ? "पिकाचा फोटो अपलोड करा आणि विश्लेषणावर क्लिक करा." : "Upload a crop photo and click analyze to output report.");
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleAnalyzeDisease = async () => {
    if (!diseaseFile) {
      setDiseaseStatus(language === 'mr' ? "⚠️ कृपया पिकाचा फोटो अपलोड करा." : "⚠️ Please upload a crop image first.");
      return;
    }
    setDiseaseLoading(true);
    setDiseaseIsInvalid(false);
    setDiseaseRejection(null);
    setDiseaseResult(null);
    setDiseaseStatus(language === 'mr' ? "तपासत आहे (Stage 1 & 2 processing)..." : "Analyzing photo with Claude Vision (Stage 1 & 2)...");

    try {
      const formData = new FormData();
      const finalCrop = diseaseCropHint === "Other" ? diseaseCustomCrop : diseaseCropHint;
      if (finalCrop) formData.append("crop", finalCrop);
      formData.append("image", diseaseFile);

      const response = await fetch("/api/crop-diagnostics/analyze", {
        method: "POST",
        body: formData
      });

      if (response.status === 422) {
        const errData = await response.json();
        setDiseaseRejection({
          message: errData.message || "Only crop & plant photos are accepted.",
          confidence: null
        });
        setDiseaseResult(null);
        setDiseaseStatus("🚫 " + (errData.message || "Only crop & plant photos are accepted."));
        return;
      }

      if (!response.ok) {
        let errMsg = "Diagnosis failed. Please try again.";
        try {
          const errData = await response.json();
          errMsg = extractErrorMessage(errData, errMsg);
        } catch (e) {}
        throw new Error(errMsg);
      }

      const data = await response.json();
      if (data && data.report) {
        setDiseaseResult(data.report);
        setDiseaseStatus(language === 'mr' ? '✅ Claude Vision द्वारे विश्लेषण पूर्ण.' : '✅ Diagnosis completed via Claude Vision.');
        
        addHistoryEntry({
          type: "disease_scan",
          title: language === "mr" ? `रोग निदान — ${data.report.cropIdentified || finalCrop}` : `Disease Scan — ${data.report.cropIdentified || finalCrop}`,
          icon: "🔬",
          summary: `${data.report.cropIdentified} — ${data.report.diseaseAssessment?.suspectedIssue || "Healthy"} (${data.report.diseaseAssessment?.confidence} Certainty)`,
          data: {
            crop: data.report.cropIdentified,
            disease: data.report.diseaseAssessment?.suspectedIssue,
            confidence: data.report.diseaseAssessment?.confidence,
          },
        });
      } else {
        throw new Error("Diagnosis failed. Please try again.");
      }
    } catch (err) {
      console.error("[CropDiagnostics] Error:", err);
      const parsedErr = extractErrorMessage(err);
      setDiseaseStatus(`⚠️ ${parsedErr}`);
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

  const handleDownloadDiagnosticPDF = async () => {
    if (!diseaseResult) return;
    try {
      const payload = {
        crop_name: diseaseResult.crop || diseaseResult.crop_name || "Crop",
        disease_name: diseaseResult.disease || diseaseResult.disease_name || "Healthy",
        severity: diseaseResult.severity || "medium",
        confidence: diseaseResult.confidence || 0.95,
        problems_detected: diseaseResult.symptoms || diseaseResult.problems_detected || "Foliage analysis completed.",
        causes: diseaseResult.causes || "N/A",
        organic_treatment: diseaseResult.organic_treatment || diseaseResult.treatment || "Apply organic neem formulation.",
        chemical_treatment: diseaseResult.chemical_treatment || diseaseResult.treatment || "Apply target fungicide.",
        fertilizer_recommendation: diseaseResult.suggested_fertilizers || diseaseResult.fertilizer_recommendation || "",
        irrigation_advice: diseaseResult.irrigation_advice || "",
        prevention_methods: diseaseResult.prevention_methods || diseaseResult.prevention || ""
      };

      const response = await fetch(`${PY_API_BASE}/generate-pdf`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `disease_report_${(diseaseResult.crop || "crop").replace(/\s+/g, '_')}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      } else {
        alert("Failed to generate report PDF.");
      }
    } catch (err) {
      console.error(err);
      alert("Error exporting PDF.");
    }
  };



  // --- Handlers: Irrigation ---
  const handleCalculateIrrigation = (e) => {
    e.preventDefault();
    const activeCropKey = irrCrop === "Other" ? (irrCustomCrop.trim() || "Custom") : irrCrop;
    let baseRate = 4.5; // mm/day
    let interval = 3;
    let cropAdviceName = activeCropKey;

    // Standard crop-specific rates
    const cropRates = {
      Tomato: { rate: 4.5, interval: 3 },
      Paddy: { rate: 8.0, interval: 1 },
      Wheat: { rate: 3.5, interval: 6 },
      Potato: { rate: 4.8, interval: 4 },
      Mustard: { rate: 2.8, interval: 8 },
      Chilli: { rate: 5.2, interval: 3 },
      Cotton: { rate: 6.0, interval: 5 },
      Sugarcane: { rate: 7.5, interval: 2 },
      Onion: { rate: 3.8, interval: 5 },
      Soybean: { rate: 4.2, interval: 4 },
      Groundnut: { rate: 3.6, interval: 6 },
      Sunflower: { rate: 4.0, interval: 5 },
      Maize: { rate: 5.5, interval: 4 },
      Bajra: { rate: 3.0, interval: 7 },
      Jowar: { rate: 3.2, interval: 7 },
      Turmeric: { rate: 4.0, interval: 5 },
      Ginger: { rate: 4.5, interval: 4 },
      Banana: { rate: 6.5, interval: 2 },
    };

    if (irrCrop !== "Other" && cropRates[irrCrop]) {
      baseRate = cropRates[irrCrop].rate;
      interval = cropRates[irrCrop].interval;
    } else if (irrCrop === "Other") {
      // Generic for custom crops
      baseRate = 4.5;
      interval = 4;
    }

    if (irrSoil === "sandy") { interval = Math.max(1, interval - 1); baseRate *= 1.1; }
    else if (irrSoil === "clay") { interval += 1; baseRate *= 0.9; }
    else if (irrSoil === "peaty") { interval += 0; baseRate *= 0.95; }

    if (irrStage === "Flowering" || irrStage === "Reproductive") { baseRate *= 1.25; }
    else if (irrStage === "Nursery") { baseRate *= 0.7; interval = Math.max(1, interval - 1); }
    else if (irrStage === "Harvesting") { baseRate *= 0.65; interval += 2; }

    const stageAdviceMap = {
      Nursery: language === 'mr' ? `${cropAdviceName} उगवण काळात माती सतत ओलसर ठेवा. हलक्या फवाऱ्याने पाणी द्या.` : `Keep soil consistently moist during ${cropAdviceName} nursery phase. Use gentle sprinklers to avoid seedling damage.`,
      Vegetative: language === 'mr' ? `शाकीय वाढीच्या काळात ${cropAdviceName} ला नियमित पाणी द्या. मुळांजवळ पाणी द्या.` : `Water ${cropAdviceName} regularly during vegetative growth. Direct water near root zone for deep penetration.`,
      Flowering: language === 'mr' ? `फुलधारणेच्या काळात ${cropAdviceName} ला पाण्याची कमतरता होऊ देऊ नका.` : `Maintain consistent moisture for ${cropAdviceName} during flowering - water stress now severely reduces yield.`,
      Reproductive: language === 'mr' ? `${cropAdviceName} च्या फळधारणेच्या काळात पाण्याचे प्रमाण वाढवा.` : `Increase water frequency for ${cropAdviceName} during reproductive/boll-pod formation phase for better fruit set.`,
      Harvesting: language === 'mr' ? `${cropAdviceName} काढणीपूर्वी १०-१२ दिवस आधी पाणी कमी करा.` : `Gradually reduce irrigation for ${cropAdviceName} 10-12 days before harvest to improve produce quality and storability.`
    };

    setIrrResult({
      dailyRate: baseRate.toFixed(1),
      interval,
      stageAdvice: stageAdviceMap[irrStage] || `Irrigate ${cropAdviceName} based on soil moisture levels during the ${irrStage} growth phase.`,
      warning: irrSoil === "sandy"
        ? (language === 'mr' ? "⚠️ वाळूमय जमिनीत पाण्याचा निचरा वेगाने होतो. खत वाहून जाऊ नये म्हणून विभाजित डोसमध्ये खत द्या." : "⚠️ Sandy soil drains fast. Apply fertilizers in split doses to avoid nutrient leaching.")
        : irrSoil === "clay"
        ? (language === 'mr' ? "⚠️ चिकण मातीत जास्त पाणी साचते. अतिपाणी टाळा; पाण्याचा निचरा सुनिश्चित करा." : "⚠️ Clay soil retains excess water. Avoid over-irrigation; ensure proper drainage channels.")
        : (language === 'mr' ? "🌿 सकाळी लवकर किंवा सायंकाळी पाणी द्या म्हणजे बाष्पीभवन कमी होईल." : "🌿 Water in early morning or evening to minimize evaporation losses and maximize root absorption.")
    });
  };

  // --- Handlers: Fertilizer NPK Advisor ---
  const handleCalculateFertilizer = (e) => {
    e.preventDefault();
    const target = fertCrop !== "Other" ? CROP_NPK_TARGETS_EXTENDED[fertCrop] : null;
    const activeCropName = fertCrop === "Other" ? (fertCustomCrop.trim() || "Custom Crop") : (CROP_NPK_TARGETS_EXTENDED[fertCrop]?.name || fertCrop);
    
    // For "Other" crop: use moderate defaults
    const effectiveTarget = target || { n: 100, p: 50, k: 60, ph: "6.0 - 7.0", name: activeCropName };

    // Deficits
    const defN = Math.max(0, effectiveTarget.n - fertN);
    const defP = Math.max(0, effectiveTarget.p - fertP);
    const defK = Math.max(0, effectiveTarget.k - fertK);

    // Bag calculations (50kg bags)
    let dapBags = (defP / 23) * fertArea;
    let ureaBags = ((defN - (dapBags * 9)) / 23) * fertArea;
    if (ureaBags < 0) ureaBags = 0;
    let mopBags = (defK / 30) * fertArea;

    // Crop-specific organic compost recommendations
    const compostMap = {
      Tomato: 3.0,
      Paddy: 2.0,
      Wheat: 2.5,
      Potato: 4.0,
      Mustard: 1.8,
      Chilli: 3.5,
      Cotton: 2.8,
      Other: 2.5
    };
    const compostRate = compostMap[fertCrop] || 2.5;
    const compostTons = (fertArea * compostRate).toFixed(1);

    // Soil specific amendments
    let soilAdvice = SOIL_DRY_DRAIN[fertSoil].advice;

    setFertResult({
      dap: parseFloat(dapBags.toFixed(1)),
      urea: parseFloat(ureaBags.toFixed(1)),
      mop: parseFloat(mopBags.toFixed(1)),
      compost: compostTons,
      compostDesc: `Recommended for ${activeCropName}: ${compostRate} Tons/Acre of FYM/organic matter to improve microbial activity and soil structure.`,
      deficits: { n: defN, p: defP, k: defK },
      targets: effectiveTarget,
      soilAdvice,
      cropName: activeCropName
    });

    // Record in Activity History
    addHistoryEntry({
      type: "ai_tool",
      title: language === "mr" ? `NPK खत नियोजन — ${activeCropName}` : `Fertilizer NPK — ${activeCropName}`,
      icon: "🛠️",
      summary: `${activeCropName} · Urea: ${ureaBags.toFixed(1)} bags · DAP: ${dapBags.toFixed(1)} bags · MOP: ${mopBags.toFixed(1)} bags · ${fertArea} acres`,
      data: {
        crop: activeCropName,
        soil: fertSoil,
        area: `${fertArea} acres`,
        urea: `${ureaBags.toFixed(1)} bags (50kg)`,
        dap: `${dapBags.toFixed(1)} bags (50kg)`,
        mop: `${mopBags.toFixed(1)} bags (50kg)`,
        compost: `${compostTons} tons`,
        nDeficit: `${defN} kg/ha`,
        pDeficit: `${defP} kg/ha`,
        kDeficit: `${defK} kg/ha`,
      },
    });
  };

  // --- Handlers: Smart Calendar ---
  const handleCreateCalendar = async (e) => {
    e.preventDefault();
    setCalLoading(true);
    try {
      const res = await api.post("/crop-calendar", {
        cropName: calCrop,
        customCropName: calCustomCrop,
        sowingDate: calDate
      });
      setActiveCalendars((prev) => [res.data, ...prev]);
      setSelectedCalId(res.data._id);
      setCalCustomCrop("");
      // Record in Activity History
      const cropLabel = calCrop === "Other" ? (calCustomCrop || "Custom Crop") : calCrop;
      addHistoryEntry({
        type: "ai_tool",
        title: language === "mr" ? `स्मार्ट कॅलेंडर — ${cropLabel}` : `Smart Calendar — ${cropLabel}`,
        icon: "📅",
        summary: `${cropLabel} · Sowing: ${new Date(calDate).toLocaleDateString("en-IN")} · ${res.data.tasks?.length || 0} milestones generated`,
        data: {
          crop: cropLabel,
          sowingDate: calDate,
          milestones: res.data.tasks?.length || 0,
        },
      });
    } catch (err) {
      console.error(err);
      alert("Failed to generate calendar. Make sure you are logged in.");
    } finally {
      setCalLoading(false);
    }
  };

  const handleToggleTask = async (calId, taskId, currentStatus) => {
    const nextStatus = currentStatus === "pending" ? "completed" : "pending";
    // Optimistic update first for responsive UI
    setActiveCalendars((prev) =>
      prev.map((c) => {
        if (c._id !== calId) return c;
        return {
          ...c,
          tasks: c.tasks.map((task) =>
            task._id === taskId ? { ...task, status: nextStatus } : task
          )
        };
      })
    );
    try {
      const res = await api.patch(`/crop-calendar/${calId}/task`, {
        taskId,
        status: nextStatus
      });
      // Sync with server response
      setActiveCalendars((prev) =>
        prev.map((c) => (c._id === calId ? res.data : c))
      );
    } catch (err) {
      console.error(err);
      // Revert optimistic update on error
      setActiveCalendars((prev) =>
        prev.map((c) => {
          if (c._id !== calId) return c;
          return {
            ...c,
            tasks: c.tasks.map((task) =>
              task._id === taskId ? { ...task, status: currentStatus } : task
            )
          };
        })
      );
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

  const handleUpdateSowingDate = async (calId, newDate) => {
    try {
      const res = await api.patch(`/crop-calendar/${calId}`, {
        sowingDate: newDate
      });
      setActiveCalendars((prev) =>
        prev.map((c) => (c._id === calId ? res.data : c))
      );
      setIsEditingSowingDate(false);
    } catch (err) {
      console.error(err);
      alert("Failed to update sowing date.");
    }
  };

  const selectedCalendar = activeCalendars.find((c) => c._id === selectedCalId);

  // Calendar metrics
  const getProgressPercent = (cal) => {
    if (!cal || !cal.tasks.length) return 0;
    const completed = cal.tasks.filter((t) => t.status === "completed").length;
    return Math.round((completed / cal.tasks.length) * 100);
  };

  const getCropLifecycleStage = (cal) => {
    if (!cal) return { stage: "Nursery", progress: 0, daysElapsed: 0, stages: [] };
    // Parse sowing date at midnight local time to avoid timezone offset issues
    const sowingRaw = new Date(cal.sowingDate);
    const sowing = new Date(sowingRaw.getFullYear(), sowingRaw.getMonth(), sowingRaw.getDate());
    const today = new Date();
    const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    
    // Calculate the maximum dayOffset of completed tasks to dynamically advance the lifecycle
    const completedTasks = cal.tasks ? cal.tasks.filter((t) => t.status === "completed") : [];
    const maxCompletedOffset = completedTasks.length > 0 
      ? Math.max(...completedTasks.map((t) => t.dayOffset)) 
      : 0;

    const daysElapsed = Math.max(
      Math.max(0, Math.floor((todayMidnight - sowing) / (1000 * 60 * 60 * 24))),
      maxCompletedOffset
    );

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

  // Localized date formatter
  const formatDate = (dateStr, lang) => {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    if (lang === 'mr') {
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      return `${day}/${month}/${year}`;
    }
    const day = d.getDate();
    const month = d.getMonth() + 1;
    const year = d.getFullYear();
    return `${month}/${day}/${year}`;
  };

  // Helper to format date offset strings — fixed day calculation
  const getRelativeDateString = (targetDateStr) => {
    if (!targetDateStr) return "";
    const target = new Date(targetDateStr);
    const today = new Date();
    const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const targetMidnight = new Date(target.getFullYear(), target.getMonth(), target.getDate());
    
    const diffTime = targetMidnight.getTime() - todayMidnight.getTime();
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return language === 'mr' ? "आज" : "Today";
    if (diffDays === 1) return language === 'mr' ? "उद्या" : "Tomorrow";
    if (diffDays === -1) return language === 'mr' ? "काल" : "Yesterday";
    if (diffDays > 1) return language === 'mr' ? `${diffDays} दिवसांत` : `In ${diffDays} days`;
    return language === 'mr' ? `${Math.abs(diffDays)} दिवसांपूर्वी` : `${Math.abs(diffDays)} days ago`;
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
                  {Object.keys(CROP_NPK_TARGETS_EXTENDED).map(crop => (
                    <option key={crop} value={crop}>{CROP_NPK_TARGETS_EXTENDED[crop].name}</option>
                  ))}
                  <option value="Sugarcane">Sugarcane</option>
                  <option value="Onion">Onion</option>
                  <option value="Soybean">Soybean</option>
                  <option value="Groundnut">Groundnut</option>
                  <option value="Maize">Maize / Corn</option>
                  <option value="Banana">Banana</option>
                  <option value="Turmeric">Turmeric</option>
                  <option value="Ginger">Ginger</option>
                  <option value="Other">{language === 'mr' ? 'इतर (नाव प्रविष्ट करा)' : 'Other (Type crop name...)'}</option>
                </select>

                {irrCrop === "Other" && (
                  <div style={{ marginBottom: 12 }}>
                    <label style={{ fontWeight: 600, fontSize: 13 }}>{language === 'mr' ? 'पिकाचे नाव लिहा' : 'Type Crop Name'}</label>
                    <input
                      type="text"
                      className="input"
                      placeholder={language === 'mr' ? 'उदा. कापूस, ज्वारी, बाजरी...' : 'e.g. Bajra, Jowar, Cauliflower...'}
                      value={irrCustomCrop}
                      onChange={e => setIrrCustomCrop(e.target.value)}
                      required
                    />
                  </div>
                )}

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
                  {language === 'mr' ? 'सिंचन वेळापत्रक मिळवा' : 'Calculate'}
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
                    <select className="input" value={fertCrop} onChange={(e) => { setFertCrop(e.target.value); setFertResult(null); }}>
                      {Object.keys(CROP_NPK_TARGETS_EXTENDED).map(crop => (
                        <option key={crop} value={crop}>{language === 'mr' ? t(crop) : CROP_NPK_TARGETS_EXTENDED[crop].name}</option>
                      ))}
                      <option value="Other">{language === 'mr' ? 'इतर (नाव टाइप करा)' : 'Other (Type name...)'}</option>
                    </select>
                    {fertCrop === "Other" && (
                      <input
                        type="text"
                        className="input"
                        style={{ marginTop: 6 }}
                        placeholder={language === 'mr' ? 'पिकाचे नाव लिहा...' : 'e.g. Soybean, Sunflower...'}
                        value={fertCustomCrop}
                        onChange={e => setFertCustomCrop(e.target.value)}
                        required
                      />
                    )}
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
                      Target pH: <strong>{CROP_NPK_TARGETS_EXTENDED[fertCrop]?.ph || "6.0 - 7.0"}</strong>
                    </span>
                  </div>
                </div>

                {/* N-P-K Sliders */}
                <div style={{ marginBottom: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <label style={{ fontWeight: 600, fontSize: 13 }}>Nitrogen (N): <strong>{fertN} kg/ha</strong></label>
                    <span style={{ fontSize: 10, color: "var(--text-muted)" }}>Target: {CROP_NPK_TARGETS_EXTENDED[fertCrop]?.n || 100}</span>
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
                    <span style={{ fontSize: 10, color: "var(--text-muted)" }}>Target: {CROP_NPK_TARGETS_EXTENDED[fertCrop]?.p || 50}</span>
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
                    <span style={{ fontSize: 10, color: "var(--text-muted)" }}>Target: {CROP_NPK_TARGETS_EXTENDED[fertCrop]?.k || 60}</span>
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
                  Calculate
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
                  <div style={{ background: "#ecfdf5", padding: 12, borderRadius: 8 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        <strong style={{ fontSize: 13, color: "#065f46" }}>
                          {language === 'mr' ? 'सेंद्रिय खत / FYM:' : 'Organic Compost / FYM:'}
                        </strong>
                        <p style={{ fontSize: 11, color: "#047857", margin: "2px 0 0 0" }}>
                          {fertResult.compostDesc || 'To boost microbial soil biomes and organic carbon'}
                        </p>
                      </div>
                      <strong style={{ fontSize: 18, color: "#047857", flexShrink: 0, marginLeft: 12 }}>{fertResult.compost} {language === 'mr' ? 'टन' : 'Tons'}</strong>
                    </div>
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
              <h3>{t("sowingMilestoneCalendar") || "Sowing Milestone Calendar"}</h3>
              <p style={{ color: "var(--text-muted)", fontSize: 13, marginBottom: 16 }}>
                {t("sowingCalendarDesc") || "Set crop sowing/planting dates to generate automated calendars and track progress."}
              </p>

              <form onSubmit={handleCreateCalendar}>
                <label style={{ fontWeight: 600, fontSize: 13 }}>{t("selectCrop")}</label>
                <select className="input" value={calCrop} onChange={(e) => { setCalCrop(e.target.value); if (e.target.value !== "Other") setCalCustomCrop(""); }}>
                  {Object.keys(CROP_NPK_TARGETS_EXTENDED).map(crop => (
                    <option key={crop} value={crop}>{language === 'mr' ? t(crop) : CROP_NPK_TARGETS_EXTENDED[crop].name}</option>
                  ))}
                  <option value="Other">{language === 'mr' ? 'इतर (नाव टाइप करा)' : 'Other (Type name...)'}</option>
                </select>
                {calCrop === "Other" && (
                  <input
                    type="text"
                    className="input"
                    style={{ marginTop: 6 }}
                    placeholder={language === 'mr' ? 'पिकाचे नाव लिहा...' : 'e.g. Soybean, Sunflower...'}
                    value={calCustomCrop}
                    onChange={e => setCalCustomCrop(e.target.value)}
                    required
                  />
                )}

                <label style={{ fontWeight: 600, fontSize: 13 }}>{t("sowingDate")}</label>
                <input
                  type="date"
                  className="input"
                  value={calDate}
                  onChange={(e) => setCalDate(e.target.value)}
                />

                <button type="submit" className="button" style={{ width: "100%" }} disabled={calLoading}>
                  {calLoading ? (language === 'mr' ? "तयार करत आहे..." : "Generating...") : (language === 'mr' ? "पीक वेळापत्रक तयार करा" : "Generate Calendar")}
                </button>
              </form>

              {/* Active Calendars Selector */}
              <h4 style={{ marginTop: 20, marginBottom: 8, fontSize: 14 }}>{t("yourActiveCalendars") || "Your Active Calendars"}</h4>
              {!isLoggedIn ? (
                <div style={{ background: "#eff6ff", padding: 12, borderRadius: 8, fontSize: 12, color: "#1e40af", textAlign: "center" }}>
                  🔐 {t("loginRequiredCalendar") || "Login to generate and save calendars to the database."}
                </div>
              ) : activeCalendars.length === 0 ? (
                <p style={{ fontSize: 13, color: "var(--text-muted)", margin: 0 }}>{t("noActiveCalendars") || "No active crop calendars found."}</p>
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
                        alignItems: "center",
                        transition: "all 0.2s"
                      }}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <strong style={{ fontSize: 14, color: "var(--text-dark)", display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {cal.cropName === "Other" ? (cal.customCropName || "Custom Crop") : t(cal.cropName)}
                        </strong>
                        <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
                          {language === 'mr' ? "पेरणीची तारीख" : "Sown"}: {new Date(cal.sowingDate).toLocaleDateString()}
                        </div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
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
                            fontSize: 14,
                            padding: "2px 4px"
                          }}
                          title="Delete calendar"
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
                  <p style={{ marginTop: 12, fontSize: 14 }}>{t("selectCalendarPrompt") || "Select or generate a crop calendar to track milestones."}</p>
                </div>
              ) : (
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
                    <h4 style={{ margin: 0 }}>{selectedCalendar.cropName === "Other" ? (selectedCalendar.customCropName || "Custom Crop") : t(selectedCalendar.cropName)} {t("lifecycleTimeline") || "Lifecycle Timeline"}</h4>
                    {isEditingSowingDate ? (
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--text-muted)" }}>
                        {t("sowingLabel") || "Sowing"}:
                        <input
                          type="date"
                          value={tempSowingDate}
                          onChange={(e) => setTempSowingDate(e.target.value)}
                          style={{
                            padding: "2px 4px",
                            fontSize: 12,
                            border: "1px solid var(--border-color)",
                            borderRadius: 4,
                            background: "var(--bg-main)",
                            color: "var(--text-dark)"
                          }}
                        />
                        <button
                          onClick={() => handleUpdateSowingDate(selectedCalendar._id, tempSowingDate)}
                          style={{ background: "none", border: "none", cursor: "pointer", padding: "2px", fontSize: 14 }}
                          title="Save"
                        >
                          ✔️
                        </button>
                        <button
                          onClick={() => setIsEditingSowingDate(false)}
                          style={{ background: "none", border: "none", cursor: "pointer", padding: "2px", fontSize: 14 }}
                          title="Cancel"
                        >
                          ❌
                        </button>
                      </span>
                    ) : (
                      <span style={{ fontSize: 12, color: "var(--text-muted)", display: "inline-flex", alignItems: "center", gap: 4 }}>
                        {t("sowingLabel") || "Sowing"}: {formatDate(selectedCalendar.sowingDate, language)}
                        <button
                          onClick={() => {
                            setTempSowingDate(selectedCalendar.sowingDate.split('T')[0]);
                            setIsEditingSowingDate(true);
                          }}
                          style={{ background: "none", border: "none", cursor: "pointer", padding: "2px 4px", fontSize: 12 }}
                          title="Edit Sowing Date"
                        >
                          ✏️
                        </button>
                      </span>
                    )}
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
                      <span style={{ fontSize: 11, color: "var(--text-muted)", display: "block" }}>{t("activeStageLabel") || "Active Stage"}</span>
                      <strong style={{ fontSize: 16, color: "var(--primary-hover)" }}>{t(lifecycle.stage)}</strong>
                      <span style={{ fontSize: 11, color: "var(--text-muted)", display: "block" }}>
                        {language === 'mr' ? `पीक चक्राचा दिवस ${lifecycle.daysElapsed}` : `Day ${lifecycle.daysElapsed} of crop lifecycle`}
                      </span>
                    </div>
                  </div>

                  {/* Horizontal Lifecycle Stepper */}
                  <div style={{ margin: "20px 0", borderTop: "2px solid #e2e8f0", paddingTop: 10, position: "relative" }}>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      {lifecycle.stages.map((stg, sIdx) => {
                        const activeStageIdx = lifecycle.stages.findIndex(s => s.name === lifecycle.stage);
                        const isCompletedOrActive = sIdx <= activeStageIdx;
                        return (
                          <div key={stg.name} style={{ textAlign: "center", position: "relative", top: -16 }}>
                            <div 
                              style={{ 
                                width: 12, 
                                height: 12, 
                                borderRadius: "50%", 
                                background: isCompletedOrActive ? "var(--primary)" : "#cbd5e1",
                                margin: "0 auto 4px auto",
                                border: lifecycle.stage === stg.name ? "3px solid var(--primary-light)" : "none",
                                boxShadow: isCompletedOrActive ? "0 0 8px var(--primary)" : "none",
                                transition: "all 0.3s ease"
                              }} 
                            />
                            <span style={{ fontSize: 10, fontWeight: isCompletedOrActive ? 700 : 500, color: isCompletedOrActive ? "var(--primary-hover)" : "var(--text-muted)" }}>
                              {t(stg.name)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Add Custom Task Form */}
                  <div style={{ border: "1px solid var(--border-color)", padding: 12, borderRadius: 8, marginBottom: 16, background: "var(--bg-main)" }}>
                    <h5 style={{ margin: "0 0 8px 0", fontSize: 12, textTransform: "uppercase", color: "var(--text-muted)" }}>{t("addCustomMilestone") || "Add Custom Milestone"}</h5>
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
                        placeholder={t("dayOffsetPlaceholder") || "Day offset"}
                        value={customTaskOffset}
                        onChange={(e) => setCustomTaskOffset(e.target.value)}
                        min="0"
                        required
                      />
                      <button type="submit" className="button" style={{ margin: 0, padding: "6px 12px", fontSize: 12, background: "var(--primary)" }}>
                        + {t("addBtn") || "Add"}
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
                                {t(task.title)}
                              </strong>
                              <div style={{ fontSize: 10.5, color: "var(--text-muted)", marginTop: 2 }}>
                                {language === 'mr' ? "दिवस" : "Day"} {task.dayOffset} • {t("dueLabel") || "Due"}: {formatDate(task.targetDate, language)} ({getRelativeDateString(task.targetDate)})
                              </div>
                              {task.category === "custom" && (
                                <span style={{ display: "inline-block", background: "#fef3c7", color: "#d97706", fontSize: 9, padding: "1px 4px", borderRadius: 4, fontWeight: 700, marginTop: 4 }}>
                                  {t("customTaskLabel") || "Custom Task"}
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

        {/* --- CROP Q&A ASSISTANT TAB --- */}
        {activeTab === "Crop Q&A Assistant" && (
          <div className="card">
            <h3>💬 {language === 'mr' ? 'पीक कृषी-एआय सहाय्यक' : 'Crop Q&A Assistant'}</h3>
            <p style={{ color: "var(--text-muted)", fontSize: 13, marginBottom: 16 }}>
              {language === 'mr' 
                ? 'टोमॅटो किंवा भात (Paddy) पिकांविषयी कोणताही प्रश्न विचारा, आमचे एआय तुम्हाला अचूक उत्तर देईल.'
                : 'Ask any agronomic or pest question about Tomato or Paddy, and get instant answers from our AI Engine.'}
            </p>
            <form onSubmit={handleAskQuestion}>
              <label style={{ fontWeight: 600, fontSize: 13 }}>{t("selectCrop")}</label>
              <select className="input" value={qaCrop} onChange={e => setQaCrop(e.target.value)}>
                <option value="Tomato">Tomato</option>
                <option value="Paddy">Paddy / Rice</option>
              </select>

              <label style={{ fontWeight: 600, fontSize: 13, marginTop: 12, display: "block" }}>
                {language === 'mr' ? 'तुमचा प्रश्न विचारा:' : 'Ask Your Question:'}
              </label>
              <textarea
                className="input"
                rows={3}
                placeholder={language === 'mr' ? 'उदा. टोमॅटोवरील पांढऱ्या माशीचे नियंत्रण कसे करावे?' : 'e.g. How to manage bacterial leaf blight in Paddy?'}
                value={qaInput}
                onChange={e => setQaInput(e.target.value)}
                required
              />

              <button type="submit" className="button" style={{ width: "100%", marginTop: 12 }} disabled={qaLoading}>
                {qaLoading ? (language === 'mr' ? 'विचारत आहे...' : 'Processing Q&A...') : (language === 'mr' ? 'उत्तर मिळवा 🔍' : 'Get AI Answer 🔍')}
              </button>
            </form>

            {qaResponse && (
              <div style={{ marginTop: 20, padding: 16, background: "var(--bg-main)", borderRadius: 10, borderLeft: "4px solid var(--primary)", animation: "fadeIn 0.3s ease" }}>
                <strong style={{ fontSize: 14, color: "var(--primary-hover)" }}>🤖 Agri-AI Answer:</strong>
                <p style={{ fontSize: 13.5, color: "var(--text-dark)", marginTop: 6, whiteSpace: "pre-line", lineHeight: 1.6 }}>{qaResponse}</p>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
};

export default AITools;
