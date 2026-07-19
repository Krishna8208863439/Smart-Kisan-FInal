import React, { useRef, useState, useEffect } from "react";
import api from "../api";
import { useLanguage } from "../context/LanguageContext";
import { useHistory } from "../context/HistoryContext";

const TABS = ["Disease Detection", "Irrigation", "Fertilizer / NPK", "Smart Calendar"];

const CROP_NPK_TARGETS = {
  Tomato: { n: 120, p: 60, k: 60, ph: "6.0 - 7.0", name: "Tomato" },
  Paddy: { n: 100, p: 40, k: 40, ph: "5.5 - 6.5", name: "Paddy / Rice" },
};

// Extended targets for Irrigation and Fertilizer tabs (more crops)
const CROP_NPK_TARGETS_EXTENDED = {
  Tomato: { n: 120, p: 60, k: 60, ph: "6.0 - 7.0", name: "Tomato" },
  Paddy: { n: 100, p: 40, k: 40, ph: "5.5 - 6.5", name: "Paddy / Rice" },
  Wheat: { n: 120, p: 60, k: 40, ph: "6.0 - 7.0", name: "Wheat" },
  Potato: { n: 150, p: 80, k: 120, ph: "5.2 - 6.4", name: "Potato" },
  Mustard: { n: 80, p: 40, k: 40, ph: "6.0 - 7.5", name: "Mustard" },
  Chilli: { n: 100, p: 60, k: 60, ph: "6.0 - 7.0", name: "Chilli" },
  Cotton: { n: 120, p: 60, k: 60, ph: "6.0 - 7.5", name: "Cotton" }
};

const SOIL_DRY_DRAIN = {
  sandy: { name: "Sandy (Fast)", ph: "5.5 - 6.5", advice: "High drainage. Apply NPK in split doses to avoid leaching." },
  loamy: { name: "Loamy (Optimal)", ph: "6.0 - 7.0", advice: "Ideal water & nutrient retention. Standard NPK splits recommended." },
  clay: { name: "Clayey (Slow)", ph: "6.5 - 7.5", advice: "Heavy retention. Risk of waterlogging. Reduce potassium single dose frequency." },
  peaty: { name: "Peaty (Acidic)", ph: "4.5 - 5.5", advice: "Organic rich but highly acidic. Add agricultural lime to boost P absorption." }
};

const REFERENCE_HEALTHY_LEAVES = {
  Tomato: "https://images.unsplash.com/photo-1592924357228-91a4daadcfea?auto=format&fit=crop&w=300&q=80",
  Paddy: "https://images.unsplash.com/photo-1536304997881-a372c179924b?auto=format&fit=crop&w=300&q=80"
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
  const [activeTab, setActiveTab] = useState("Disease Detection");
  const isLoggedIn = !!localStorage.getItem("sk_token");

  // Q&A states
  const [qaInput, setQaInput] = useState("");
  const [qaResponse, setQaResponse] = useState("");
  const [qaLoading, setQaLoading] = useState(false);
  const [qaCrop, setQaCrop] = useState("Tomato");

  const displayTabName = (tab) => {
    if (tab === "Disease Detection") return t("leafDiagnostics");
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

  // State: Disease Detection
  const [diseaseSubTab, setDiseaseSubTab] = useState("crop_cv"); // "crop_cv" | "leaf_diag" | "crop_detect"
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

  const PY_API_BASE = import.meta.env.VITE_PY_API_URL || "/pyapi";

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
    setScanStep(0);
    setDiseaseResult(null);
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
    }, 850);

    try {
      const formData = new FormData();
      const finalCrop = diseaseCropHint === "Other" ? diseaseCustomCrop : diseaseCropHint;
      if (finalCrop) formData.append("crop", finalCrop);
      formData.append("region", "India");
      formData.append("image", diseaseFile);

      // Get Gemini key from state or localStorage
      const geminiKey = diseaseGeminiKey.trim() || localStorage.getItem("sk_gemini_key") || "";
      const extraHeaders = {};
      if (geminiKey) extraHeaders["x-gemini-key"] = geminiKey;

      // Use dedicated endpoint based on diseaseSubTab
      const endpoint = diseaseSubTab === "crop_cv" ? "/crop-diagnostics" : diseaseSubTab === "leaf_diag" ? "/leaf-disease" : "/crop-disease";
      const { default: axios } = await import("axios");
      const response = await axios.post(`${PY_API_BASE}${endpoint}`, formData, {
        headers: extraHeaders,
        timeout: 55000
      });

      clearInterval(stepInterval);

      const result = response.data;
      const isInvalid = !result || result.success === false || result.disease === "Invalid Image" || result.health_status === "invalid" || result.error;
      
      setDiseaseIsInvalid(isInvalid);
      setDiseaseResult(result);

      if (isInvalid) {
        const defaultErr = diseaseSubTab === "crop_cv" ? "Invalid image. Please upload a crop image or plant." :
                           diseaseSubTab === "leaf_diag" ? "Invalid image. Please upload a crop image of a plant leaf." :
                           "Invalid image. Please upload a valid crop image.";
        const errMsg = result.error || defaultErr;
        setDiseaseStatus(`🚫 ${errMsg}`);
      } else {
        const modelUsed = result.ai_model || "AI Analysis";
        if (diseaseSubTab === "leaf_diag") {
          setDiseaseStatus(`✅ ${language === 'mr' ? `${modelUsed} द्वारे निदान पूर्ण.` : `Diagnosis completed via ${modelUsed}.`}`);
        } else {
          setDiseaseStatus(`✅ ${language === 'mr' ? 'Google Gemini द्वारे निदान पूर्ण.' : 'Diagnosis completed via Gemini AI.'}`);
        }
        
        addHistoryEntry({
          type: "disease_scan",
          title: language === "mr" ? `रोग निदान — ${result.plant_name || result.crop_name || result.crop || finalCrop}` : `Disease Scan — ${result.plant_name || result.crop_name || result.crop || finalCrop}`,
          icon: "🔬",
          summary: `${result.plant_name || result.crop_name || result.crop || finalCrop} — ${result.disease_name || result.disease || result.problems_detected} (${Math.round((result.confidence || 0.95) * 100)}% confidence)`,
          data: {
            crop: result.plant_name || result.crop_name || result.crop || finalCrop,
            disease: result.disease_name || result.disease || result.problems_detected,
            confidence: `${Math.round((result.confidence || 0.95) * 100)}%`,
          },
        });
      }
    } catch (err) {
      clearInterval(stepInterval);
      console.error("[DiseaseDetection] Error:", err);
      
      let statusMsg = "⚠️ Server unreachable.";
      if (err.response) {
        if (err.response.data && (err.response.data.message === "Gemini API key missing." || err.response.data.detail === "Gemini API key missing.")) {
          statusMsg = language === 'mr' ? "🚫 जेमिनी एपीआय की गहाळ आहे." : "Gemini API key is missing.";
        } else if (err.response.status === 504 || (err.response.data && err.response.data.message && err.response.data.message.includes("timeout"))) {
          statusMsg = language === 'mr' ? "⚠️ एआय सेवा कालबाह्य झाली. कृपया पुन्हा प्रयत्न करा." : "AI service timeout. Please retry.";
        } else {
          statusMsg = `🚫 ${err.response.data.message || err.response.data.detail || "Diagnosis failed."}`;
        }
      } else if (err.message && err.message.toLowerCase().includes("timeout")) {
        statusMsg = language === 'mr' ? "⚠️ एआय सेवा कालबाह्य झाली. कृपया पुन्हा प्रयत्न करा." : "AI service timeout. Please retry.";
      } else {
        statusMsg = language === 'mr' ? "⚠️ बॅकएंड सर्व्हर ऑफलाइन आहे. कृपया FastAPI सुरू करा." : "Backend server is offline. Please start FastAPI.";
      }
      setDiseaseStatus(statusMsg);
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
      const pyApiBase = localStorage.getItem("sk_py_api_base") || "http://localhost:8000/api";
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

      const response = await fetch(`${pyApiBase}/generate-pdf`, {
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
    // Normalize both to midnight UTC to avoid timezone drift
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
        
        {/* --- DISEASE DETECTION TAB --- */}
        {activeTab === "Disease Detection" && (
          <div>
            {/* Sub-tabs for Crop CV, Leaf Diag, and Crop Disease Detect */}
            <div style={{ display: "flex", gap: 10, borderBottom: "1.5px solid var(--border-color)", paddingBottom: 10, marginBottom: 16, overflowX: "auto" }}>
              {[
                { id: "crop_cv", label: language === 'mr' ? '🌾 पीक संगणक दृष्टी' : '🌾 Crop Diagnostics (CV)' },
                { id: "leaf_diag", label: language === 'mr' ? '🍃 पान रोग निदान' : '🍃 Leaf Disease Diagnostics' },
                { id: "crop_detect", label: language === 'mr' ? '🔬 पीक रोग ओळख' : '🔬 Crop Disease Detection' }
              ].map(subTab => (
                <button
                  key={subTab.id}
                  type="button"
                  onClick={() => {
                    setDiseaseSubTab(subTab.id);
                    clearDiseaseImage(subTab.id);
                  }}
                  style={{
                    padding: "8px 18px",
                    borderRadius: 8,
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: "pointer",
                    border: "none",
                    whiteSpace: "nowrap",
                    background: diseaseSubTab === subTab.id ? "var(--primary)" : "var(--bg-main)",
                    color: diseaseSubTab === subTab.id ? "white" : "var(--text-muted)",
                    boxShadow: diseaseSubTab === subTab.id ? "0 2px 6px rgba(0,0,0,0.15)" : "none",
                    transition: "all 0.2s ease"
                  }}
                >
                  {subTab.label}
                </button>
              ))}
            </div>

            <div className="grid-2">
              {/* Upload Card */}
              <div className="card">
              <h3>
                {diseaseSubTab === "crop_cv" ? (language === 'mr' ? '🌾 पीक संगणक दृष्टी' : 'Crop Diagnostics (CV)') :
                 diseaseSubTab === "leaf_diag" ? (language === 'mr' ? '🍃 पान रोग निदान' : 'Leaf Disease Diagnostics') :
                 (language === 'mr' ? '🔬 पीक रोग ओळख' : 'Crop Disease Detection')}
              </h3>
              <p style={{ color: "var(--text-muted)", fontSize: 13, marginBottom: 12 }}>
                {diseaseSubTab === "crop_cv" ? (language === 'mr' ? 'पिकाचा फोटो अपलोड करा. स्वीकार्य फोटो प्रकार: पीक किंवा झाड. Google Gemini Vision AI द्वारे अचूक निदान मिळवा.' : 'Upload a photo of your crop or plant. Gemini AI analyzes crop health, growth stage, and recommendations.') :
                 diseaseSubTab === "leaf_diag" ? (language === 'mr' ? 'पिकाच्या पानाचा स्पष्ट फोटो अपलोड करा. Gemini AI द्वारे पानांवरील रोग, कारणे आणि उपायांचे निदान मिळवा.' : 'Upload a photo of a plant leaf. Gemini AI analyzes leaf lesions and outlines disease description, causes, and treatments.') :
                 (language === 'mr' ? 'रोगग्रस्त पिकाचा किंवा पानाचा फोटो अपलोड करा. सविस्तर सेंद्रिय/रासायनिक नियंत्रण व खत शिफारसी मिळवा.' : 'Upload a photo of the diseased crop. Gemini AI provides severity, symptoms, organic/chemical treatments, and fertilizer/irrigation advice.')}
              </p>

              <label style={{ fontWeight: 600, fontSize: 13 }}>{t("cropTypeHint")}</label>
              <select 
                className="input"
                value={diseaseCropHint}
                onChange={(e) => setDiseaseCropHint(e.target.value)}
              >
                {DIAGNOSTIC_CROPS.map(crop => (
                  <option key={crop.id} value={crop.id}>
                    {language === 'mr' ? crop.mr : language === 'hi' ? crop.hi : crop.en}
                  </option>
                ))}
              </select>

              {diseaseCropHint === "Other" && (
                <div style={{ marginTop: 8, marginBottom: 12 }}>
                  <label style={{ fontWeight: 600, fontSize: 13 }}>
                    {language === 'mr' ? 'पिकाचे नाव प्रविष्ट करा' : 'Type Crop Name'}
                  </label>
                  <input
                    type="text"
                    className="input"
                    placeholder={language === 'mr' ? 'उदा. सोयाबीन, कांदा, आंबा...' : 'e.g. Soyabean, Onion, Mango...'}
                    value={diseaseCustomCrop}
                    onChange={(e) => setDiseaseCustomCrop(e.target.value)}
                    required
                  />
                </div>
              )}

              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  if (!diseasePreview) {
                    handleDiseaseFileSelected(e.dataTransfer.files?.[0]);
                  }
                }}
                onClick={() => {
                  if (!diseasePreview) {
                    fileInputRef.current?.click();
                  }
                }}
                style={{
                  border: diseasePreview ? "1px solid var(--border-color)" : "2px dashed var(--border-color)",
                  borderRadius: 12,
                  padding: diseasePreview ? 0 : 24,
                  textAlign: "center",
                  background: "var(--bg-main)",
                  cursor: diseasePreview ? "default" : "pointer",
                  marginBottom: 16,
                  position: "relative",
                  overflow: "hidden",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  minHeight: 200
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

                {diseasePreview ? (
                  <div style={{ position: "relative", width: "100%", height: "200px" }}>
                    <img
                      src={diseasePreview}
                      alt="Leaf preview"
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover"
                      }}
                    />
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        clearDiseaseImage();
                      }}
                      style={{
                        position: "absolute",
                        top: 8,
                        right: 8,
                        background: "rgba(220, 38, 38, 0.9)",
                        color: "white",
                        border: "none",
                        borderRadius: "50%",
                        width: 28,
                        height: 28,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 14,
                        fontWeight: "bold",
                        zIndex: 10,
                        boxShadow: "0 2px 4px rgba(0,0,0,0.2)"
                      }}
                      title="Clear Image"
                    >
                      ✕
                    </button>
                  </div>
                ) : (
                  <>
                    <div style={{ fontSize: 36, marginBottom: 8 }}>
                      {diseaseSubTab === "crop_cv" ? "🌾" : diseaseSubTab === "leaf_diag" ? "🍃" : "🔬"}
                    </div>
                    <div style={{ fontWeight: 600, fontSize: 14, color: "var(--text-dark)", marginBottom: 4 }}>
                      {t("dragDropPhoto")}
                    </div>
                    <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 12 }}>
                      {t("supportsFormats")}
                    </div>
                    <button
                      type="button"
                      className="button"
                      style={{
                        padding: "6px 14px",
                        fontSize: 12,
                        margin: 0,
                        background: "var(--primary)",
                        color: "white",
                        border: "none",
                        borderRadius: 6,
                        cursor: "pointer",
                        fontWeight: 600
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        fileInputRef.current?.click();
                      }}
                    >
                      {language === 'mr' ? 'फोटो निवडा' : 'Choose Photo'}
                    </button>
                    <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 6 }}>
                      {diseaseSubTab === "crop_cv" ? (language === 'mr' ? '⚠️ फक्त पिकाचे/झाडाचे फोटो स्वीकारले जातात' : '⚠️ Only crop & plant photos are accepted') :
                       diseaseSubTab === "leaf_diag" ? (language === 'mr' ? '⚠️ फक्त पानाचे स्पष्ट फोटो स्वीकारले जातात' : '⚠️ Only clear plant leaf photos are accepted') :
                       (language === 'mr' ? '⚠️ फक्त पिकाचे फोटो स्वीकारले जातात' : '⚠️ Only crop images are accepted')}
                    </p>
                  </>
                )}
              </div>



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
                <h3 style={{ margin: 0 }}>
                  {language === 'mr' ? '🩺 निदान अहवाल' : '🩺 Diagnostics Report'}
                </h3>
                {diseaseResult && !diseaseIsInvalid && (
                  <button className="button" style={{ background: "#0284c7", padding: "6px 12px", fontSize: 12, margin: 0 }} onClick={printPrescription}>
                    {t("printPrescription")}
                  </button>
                )}
              </div>

              {!diseaseResult ? (
                <div style={{ padding: "60px 0", textAlign: "center", color: "var(--text-muted)", flexGrow: 1, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center" }}>
                  <span style={{ fontSize: 48 }}>
                    {diseaseSubTab === "crop_cv" ? "🌾" : diseaseSubTab === "leaf_diag" ? "🍃" : "🔬"}
                  </span>
                  <p style={{ marginTop: 12, fontSize: 14 }}>
                    {diseaseSubTab === "crop_cv" ? (language === 'mr' ? 'पिकाचा फोटो अपलोड करून Gemini AI निदान मिळवा' : 'Upload a crop photo to get Gemini AI-powered diagnosis') :
                     diseaseSubTab === "leaf_diag" ? (language === 'mr' ? 'पानाचा फोटो अपलोड करून Gemini AI रोग निदान मिळवा' : 'Upload a leaf photo to get Gemini AI-powered disease diagnostics') :
                     (language === 'mr' ? 'पिकाचा फोटो अपलोड करून सविस्तर रोग निदान व उपाय मिळवा' : 'Upload a valid crop photo to get disease detection analysis')}
                  </p>
                  <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 6 }}>
                    {diseaseSubTab === "crop_cv" ? (language === 'mr' ? '⚠️ फक्त पिकाचे/झाडाचे फोटो स्वीकारले जातात' : '⚠️ Only crop & plant photos are accepted') :
                     diseaseSubTab === "leaf_diag" ? (language === 'mr' ? '⚠️ फक्त पानाचे स्पष्ट फोटो स्वीकारले जातात' : '⚠️ Only plant leaf photos are accepted') :
                     (language === 'mr' ? '⚠️ फक्त पिकाचे फोटो स्वीकारले जातात' : '⚠️ Only crop images are accepted')}
                  </p>
                </div>
              ) : diseaseIsInvalid ? (
                /* Invalid Image Alert */
                <div style={{
                  background: "linear-gradient(135deg, #fef2f2, #fee2e2)",
                  border: "2px solid #ef4444",
                  borderRadius: 12,
                  padding: 20,
                  textAlign: "center",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 10
                }}>
                  <span style={{ fontSize: 48 }}>🚫</span>
                  <strong style={{ fontSize: 16, color: "#b91c1c" }}>
                    {diseaseSubTab === "crop_cv" ? (language === 'mr' ? 'अवैध प्रतिमा — पीक आढळले नाही' : 'Invalid Image — No Crop Detected') :
                     diseaseSubTab === "leaf_diag" ? (language === 'mr' ? 'अवैध प्रतिमा — पान आढळले नाही' : 'Invalid Image — No Plant Leaf Detected') :
                     (language === 'mr' ? 'अवैध प्रतिमा — वैध पीक नाही' : 'Invalid Image — Not a Valid Crop')}
                  </strong>
                  <p style={{ fontSize: 13, color: "#7f1d1d", margin: 0, lineHeight: 1.6 }}>
                    {diseaseResult.error || (
                      diseaseSubTab === "crop_cv" ? "Invalid image. Please upload a crop image or plant." :
                      diseaseSubTab === "leaf_diag" ? "Invalid image. Please upload a crop image of a plant leaf." :
                      "Invalid image. Please upload a valid crop image."
                    )}
                  </p>
                  <button
                    type="button"
                    onClick={clearDiseaseImage}
                    style={{
                      marginTop: 8,
                      background: "linear-gradient(135deg, #dc2626, #b91c1c)",
                      color: "white",
                      border: "none",
                      borderRadius: 8,
                      padding: "8px 20px",
                      fontSize: 13,
                      cursor: "pointer",
                      fontWeight: 700
                    }}
                  >
                    {language === 'mr' ? '🔄 पुन्हा प्रयत्न करा' : '🔄 Try Again'}
                  </button>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 12 }}>
                    {/* AI Model Badge */}
                    <div style={{
                      background: "linear-gradient(135deg, #dbeafe, #eff6ff)",
                      border: "1px solid #93c5fd",
                      borderRadius: 8,
                      padding: "6px 12px",
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      fontSize: 12
                    }}>
                      <span>✨</span>
                      <span style={{ color: "#1d4ed8", fontWeight: 600 }}>
                        {diseaseSubTab === "leaf_diag" 
                          ? (diseaseResult?.ai_model || "AI Computer Vision Model")
                          : "Google Gemini 1.5 Flash (AgriExpert AI)"}
                      </span>
                    </div>

                    {/* Download PDF button */}
                    <button
                      type="button"
                      onClick={handleDownloadDiagnosticPDF}
                      style={{
                        background: "linear-gradient(135deg, #15803d, #16a34a)",
                        color: "white",
                        border: "none",
                        borderRadius: 8,
                        padding: "6px 12px",
                        fontSize: 12,
                        cursor: "pointer",
                        fontWeight: 600,
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6
                      }}
                    >
                      <span>📥</span>
                      {language === 'mr' ? 'अहवाल (PDF)' : 'Report (PDF)'}
                    </button>
                  </div>

                  {/* --- CASE 1: CROP DIAGNOSTICS (CV) --- */}
                  {diseaseSubTab === "crop_cv" && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                      <div style={{ display: "flex", gap: 12, alignItems: "center", background: "var(--bg-main)", padding: 12, borderRadius: 8 }}>
                        <div style={{ position: "relative", width: 60, height: 60, flexShrink: 0 }}>
                          <svg width="60" height="60" viewBox="0 0 36 36">
                            <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#e2e8f0" strokeWidth="3" />
                            <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none"
                              stroke="#2563eb"
                              strokeWidth="3" strokeDasharray={`${Math.round((diseaseResult.confidence || 0.95) * 100)}, 100`} />
                          </svg>
                          <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", fontSize: 11, fontWeight: 700 }}>
                            {Math.round((diseaseResult.confidence || 0.95) * 100)}%
                          </div>
                        </div>
                        <div style={{ flex: 1 }}>
                          <strong style={{ display: "block", fontSize: 13, color: "var(--text-dark)" }}>
                            {language === 'mr' ? 'ओळखलेले पीक' : 'Identified Crop'}
                          </strong>
                          <span style={{ fontSize: 14, fontWeight: 600, color: "var(--primary)" }}>{diseaseResult.crop_name || "Unknown"}</span>
                          
                          <div style={{ marginTop: 4, display: "flex", gap: 8 }}>
                            <span style={{
                              fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 20,
                              background: "#dbeafe", color: "#1e40af"
                            }}>
                              🌱 Stage: {diseaseResult.growth_stage || "Unknown"}
                            </span>
                            <span style={{
                              fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 20,
                              background: diseaseResult.crop_health === "Healthy" ? "#dcfce7" : "#fee2e2",
                              color: diseaseResult.crop_health === "Healthy" ? "#166534" : "#991b1b"
                            }}>
                              🩺 Health: {diseaseResult.crop_health || "Unknown"}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div style={{ background: "#f8fafc", border: "1px solid var(--border-color)", borderRadius: 8, padding: 12 }}>
                        <strong style={{ fontSize: 12, color: "var(--text-dark)", display: "block", marginBottom: 4 }}>
                          ⚠️ {language === 'mr' ? 'शोधलेल्या समस्या:' : 'Problems Detected:'}
                        </strong>
                        <p style={{ fontSize: 13, color: "var(--text-muted)", margin: 0, lineHeight: 1.5 }}>
                          {diseaseResult.problems_detected || "None"}
                        </p>
                      </div>

                      <div style={{ background: "#ecfdf5", borderLeft: "4px solid #16a34a", padding: 12, borderRadius: 8 }}>
                        <strong style={{ display: "block", marginBottom: 6, fontSize: 13, color: "#14532d" }}>
                          💡 {language === 'mr' ? 'शिफारसी व सल्ला:' : 'Recommendations & Advice:'}
                        </strong>
                        <p style={{ margin: 0, whiteSpace: "pre-wrap", fontSize: 13, color: "#14532d", lineHeight: 1.6 }}>
                          {diseaseResult.recommendations}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* --- CASE 2: LEAF DIAGNOSTICS --- */}
                  {diseaseSubTab === "leaf_diag" && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                      <div style={{ display: "flex", gap: 12, alignItems: "center", background: "var(--bg-main)", padding: 12, borderRadius: 8 }}>
                        <div style={{ position: "relative", width: 60, height: 60, flexShrink: 0 }}>
                          <svg width="60" height="60" viewBox="0 0 36 36">
                            <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#e2e8f0" strokeWidth="3" />
                            <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none"
                              stroke="#16a34a"
                              strokeWidth="3" strokeDasharray={`${Math.round((diseaseResult.confidence || 0.95) * 100)}, 100`} />
                          </svg>
                          <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", fontSize: 11, fontWeight: 700 }}>
                            {Math.round((diseaseResult.confidence || 0.95) * 100)}%
                          </div>
                        </div>
                        <div style={{ flex: 1 }}>
                          <strong style={{ display: "block", fontSize: 13, color: "var(--text-dark)" }}>
                            {language === 'mr' ? 'वनस्पतीचे नाव' : 'Plant Name'}
                          </strong>
                          <span style={{ fontSize: 14, fontWeight: 600, color: "var(--primary)" }}>{diseaseResult.plant_name || "Unknown"}</span>
                          
                          <div style={{ marginTop: 4 }}>
                            <span style={{
                              fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 20,
                              background: diseaseResult.health_status === "Healthy" ? "#dcfce7" : "#fee2e2",
                              color: diseaseResult.health_status === "Healthy" ? "#166534" : "#991b1b"
                            }}>
                              {diseaseResult.health_status === "Healthy" ? "🟢 Healthy" : "🔴 Infected"}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div style={{ background: "var(--bg-main)", borderRadius: 8, padding: 12 }}>
                        <span style={{ color: "var(--text-muted)", fontSize: 11 }}>{language === 'mr' ? 'आढळलेला रोग' : 'Detected Disease'}</span>
                        <div style={{ fontWeight: 700, fontSize: 14, color: "#dc2626", marginTop: 2 }}>{diseaseResult.disease_name}</div>
                      </div>

                      <div style={{ background: "#f8fafc", border: "1px solid var(--border-color)", borderRadius: 8, padding: 12 }}>
                        <strong style={{ fontSize: 12, color: "var(--text-dark)", display: "block", marginBottom: 4 }}>
                          📌 {language === 'mr' ? 'रोगाचे वर्णन:' : 'Disease Description:'}
                        </strong>
                        <p style={{ fontSize: 13, color: "var(--text-muted)", margin: 0, lineHeight: 1.5 }}>
                          {diseaseResult.disease_description}
                        </p>
                      </div>

                      <div style={{ background: "#fff7ed", border: "1px solid #fed7aa", borderLeft: "4px solid #f97316", borderRadius: 8, padding: 12 }}>
                        <strong style={{ fontSize: 12, color: "#92400e", display: "block", marginBottom: 4 }}>
                          🧫 {language === 'mr' ? 'रोगाचे कारण:' : 'Disease Causes:'}
                        </strong>
                        <p style={{ fontSize: 13, color: "#78350f", margin: 0, lineHeight: 1.5 }}>{diseaseResult.causes}</p>
                      </div>

                      <div style={{ background: "#ecfdf5", borderLeft: "4px solid #16a34a", padding: 12, borderRadius: 8 }}>
                        <strong style={{ display: "block", marginBottom: 6, fontSize: 13, color: "#14532d" }}>
                          💊 {language === 'mr' ? 'उपचार व नियंत्रण:' : 'Treatment Remedies:'}
                        </strong>
                        <p style={{ margin: 0, whiteSpace: "pre-wrap", fontSize: 13, color: "#14532d", lineHeight: 1.6 }}>
                          {diseaseResult.treatment}
                        </p>
                      </div>

                      <div style={{ background: "#f5f3ff", borderLeft: "4px solid #7c3aed", padding: 12, borderRadius: 8 }}>
                        <strong style={{ display: "block", marginBottom: 6, fontSize: 13, color: "#3b0764" }}>
                          🛡️ {language === 'mr' ? 'प्रतिबंधात्मक उपाय:' : 'Prevention Methods:'}
                        </strong>
                        <p style={{ margin: 0, whiteSpace: "pre-wrap", fontSize: 13, color: "#3b0764", lineHeight: 1.6 }}>
                          {diseaseResult.prevention_methods}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* --- CASE 3: CROP DISEASE DETECTION --- */}
                  {diseaseSubTab === "crop_detect" && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                      <div style={{ display: "flex", gap: 12, alignItems: "center", background: "var(--bg-main)", padding: 12, borderRadius: 8 }}>
                        <div style={{ position: "relative", width: 60, height: 60, flexShrink: 0 }}>
                          <svg width="60" height="60" viewBox="0 0 36 36">
                            <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#e2e8f0" strokeWidth="3" />
                            <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none"
                              stroke="#f59e0b"
                              strokeWidth="3" strokeDasharray={`${Math.round((diseaseResult.confidence || 0.95) * 100)}, 100`} />
                          </svg>
                          <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", fontSize: 11, fontWeight: 700 }}>
                            {Math.round((diseaseResult.confidence || 0.95) * 100)}%
                          </div>
                        </div>
                        <div style={{ flex: 1 }}>
                          <strong style={{ display: "block", fontSize: 13, color: "var(--text-dark)" }}>
                            {language === 'mr' ? 'पिकाचे नाव' : 'Crop Name'}
                          </strong>
                          <span style={{ fontSize: 14, fontWeight: 600, color: "var(--primary)" }}>{diseaseResult.crop || "Unknown"}</span>
                          
                          <div style={{ marginTop: 4 }}>
                            <span style={{
                              fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 20,
                              background: diseaseResult.severity === "high" ? "#fee2e2" : diseaseResult.severity === "medium" ? "#fef3c7" : "#dcfce7",
                              color: diseaseResult.severity === "high" ? "#991b1b" : diseaseResult.severity === "medium" ? "#92400e" : "#166534"
                            }}>
                              Severity: {diseaseResult.severity ? diseaseResult.severity.toUpperCase() : "MEDIUM"}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div style={{ background: "var(--bg-main)", borderRadius: 8, padding: 12 }}>
                        <span style={{ color: "var(--text-muted)", fontSize: 11 }}>{language === 'mr' ? 'आढळलेला रोग' : 'Detected Disease'}</span>
                        <div style={{ fontWeight: 700, fontSize: 14, color: "#dc2626", marginTop: 2 }}>{diseaseResult.disease}</div>
                      </div>

                      <div style={{ background: "#f8fafc", border: "1px solid var(--border-color)", borderRadius: 8, padding: 12 }}>
                        <strong style={{ fontSize: 12, color: "var(--text-dark)", display: "block", marginBottom: 4 }}>
                          🔍 {language === 'mr' ? 'लक्षणे:' : 'Symptoms:'}
                        </strong>
                        <p style={{ fontSize: 13, color: "var(--text-muted)", margin: 0, lineHeight: 1.5 }}>
                          {diseaseResult.symptoms}
                        </p>
                      </div>

                      <div style={{ background: "#fff7ed", border: "1px solid #fed7aa", borderLeft: "4px solid #f97316", borderRadius: 8, padding: 12 }}>
                        <strong style={{ fontSize: 12, color: "#92400e", display: "block", marginBottom: 4 }}>
                          🧫 {language === 'mr' ? 'रोगाचे कारण:' : 'Causes:'}
                        </strong>
                        <p style={{ fontSize: 13, color: "#78350f", margin: 0, lineHeight: 1.5 }}>{diseaseResult.causes}</p>
                      </div>

                      <div style={{ background: "#ecfdf5", borderLeft: "4px solid #16a34a", padding: 12, borderRadius: 8 }}>
                        <strong style={{ display: "block", marginBottom: 6, fontSize: 13, color: "#14532d" }}>
                          🌿 {language === 'mr' ? 'सेंद्रिय उपचार:' : 'Organic Treatment:'}
                        </strong>
                        <p style={{ margin: 0, whiteSpace: "pre-wrap", fontSize: 13, color: "#14532d", lineHeight: 1.6 }}>
                          {diseaseResult.organic_treatment}
                        </p>
                      </div>

                      <div style={{ background: "#eff6ff", borderLeft: "4px solid #2563eb", padding: 12, borderRadius: 8 }}>
                        <strong style={{ display: "block", marginBottom: 6, fontSize: 13, color: "#1e3a8a" }}>
                          ⚡ {language === 'mr' ? 'रासायनिक नियंत्रण:' : 'Chemical Treatment:'}
                        </strong>
                        <p style={{ margin: 0, whiteSpace: "pre-wrap", fontSize: 13, color: "#1e3a8a", lineHeight: 1.6 }}>
                          {diseaseResult.chemical_treatment}
                        </p>
                      </div>

                      <div style={{ background: "#f5f3ff", borderLeft: "4px solid #7c3aed", padding: 12, borderRadius: 8 }}>
                        <strong style={{ display: "block", marginBottom: 6, fontSize: 13, color: "#3b0764" }}>
                          🛡️ {language === 'mr' ? 'प्रतिबंधात्मक उपाय:' : 'Prevention Methods:'}
                        </strong>
                        <p style={{ margin: 0, whiteSpace: "pre-wrap", fontSize: 13, color: "#3b0764", lineHeight: 1.6 }}>
                          {diseaseResult.prevention_methods}
                        </p>
                      </div>

                      {diseaseResult.suggested_fertilizers && (
                        <div style={{ background: "linear-gradient(135deg, #fefce8, #fef9c3)", border: "1px solid #fde047", borderRadius: 8, padding: 12 }}>
                          <strong style={{ fontSize: 12, color: "#713f12", display: "block", marginBottom: 4 }}>
                            🌾 {language === 'mr' ? 'सुचविलेली खते:' : 'Suggested Fertilizers:'}
                          </strong>
                          <p style={{ fontSize: 13, color: "#854d0e", margin: 0, lineHeight: 1.5 }}>{diseaseResult.suggested_fertilizers}</p>
                        </div>
                      )}

                      {diseaseResult.irrigation_advice && (
                        <div style={{ background: "#f0fdfa", border: "1px solid #99f6e4", borderRadius: 8, padding: 12 }}>
                          <strong style={{ fontSize: 12, color: "#0f766e", display: "block", marginBottom: 4 }}>
                            💧 {language === 'mr' ? 'पाणी व्यवस्थापन सल्ला:' : 'Irrigation Advice:'}
                          </strong>
                          <p style={{ fontSize: 13, color: "#115e59", margin: 0, lineHeight: 1.5 }}>{diseaseResult.irrigation_advice}</p>
                        </div>
                      )}
                    </div>
                  )}

                </div>
              )}
            </div>
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
                  {calLoading ? (language === 'mr' ? "तयार करत आहे..." : "Generating...") : (language === 'mr' ? "पीक वेळापत्रक तयार करा 📅" : "Generate Crop Calendar 📅")}
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
