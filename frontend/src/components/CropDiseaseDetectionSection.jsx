// frontend/src/components/CropDiseaseDetectionSection.jsx
import React, { useRef, useState } from "react";
import api from "../api";
import { useLanguage } from "../context/LanguageContext";

// Crop options with Hindi/Marathi labels
const CROP_OPTIONS = [
  { value: "Tomato",              en: "Tomato",              mr: "टोमॅटो (Tomato)" },
  { value: "Rice",               en: "Rice / Paddy",        mr: "भात / धान (Rice)" },
  { value: "Wheat",              en: "Wheat",               mr: "गहू (Wheat)" },
  { value: "Maize",              en: "Maize / Corn",        mr: "मक्का (Maize)" },
  { value: "Cotton",             en: "Cotton",              mr: "कापूस (Cotton)" },
  { value: "Sugarcane",          en: "Sugarcane",           mr: "ऊस (Sugarcane)" },
  { value: "Potato",             en: "Potato",              mr: "बटाटा (Potato)" },
  { value: "Groundnut",          en: "Groundnut / Peanut",  mr: "भुईमूग (Groundnut)" },
  { value: "Soybean",            en: "Soybean",             mr: "सोयाबीन (Soybean)" },
  { value: "Chilli",             en: "Chilli / Pepper",     mr: "मिरची (Chilli)" },
  { value: "Banana",             en: "Banana",              mr: "केळी (Banana)" },
  { value: "Onion",              en: "Onion",               mr: "कांदा (Onion)" },
  { value: "Mango",              en: "Mango",               mr: "आंबा (Mango)" },
  { value: "Brinjal",            en: "Brinjal / Eggplant",  mr: "वांगी (Brinjal)" },
  { value: "Cattle",             en: "Cattle / Livestock",  mr: "जनावरे (Cattle)" },
];

const CropDiseaseDetectionSection = () => {
  const { language } = useLanguage();
  const [file, setFile] = useState(null);
  const [fileName, setFileName] = useState("");
  const [previewUrl, setPreviewUrl] = useState("");
  const [cropHint, setCropHint] = useState("Tomato");   // Always has a value now (dropdown)
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const defaultStatus = language === "mr"
    ? "पिकाचा प्रकार निवडा, फोटो अपलोड करा आणि 'तपासा आणि निदान करा' वर क्लिक करा."
    : "Select your crop, upload a photo, and click \"Analyze Image\" to detect disease.";

  const [status, setStatus] = useState(defaultStatus);
  const fileInputRef = useRef(null);

  // ── Localization helpers ──────────────────────────────────────────────────
  const getLocalizedAdvice = (adviceEn) => {
    if (!adviceEn) return "";
    if (language !== "mr") return adviceEn;
    if (adviceEn.includes("Early Blight")) {
      return "अर्ली ब्लाईट (लवकर येणारा करपा) पिकाच्या पानांवर गोलाकार काळे ठिपके तयार करतो. त्वरित मॅन्कोझेब ७५ डब्ल्यूपी (२ ग्रॅम/लीटर) किंवा कॉपर ऑक्सिक्लोराईड ५० डब्ल्यूपी (३ ग्रॅम/लीटर) १०-१४ दिवसांच्या अंतराने फवारा. प्रादुर्भाव झालेली खालची पाने काढून टाका. पिकांची फेरपालट करा.";
    }
    if (adviceEn.includes("Leaf Curl") || adviceEn.includes("TLCV")) {
      return "लीफ कर्ल (पाने आकसणे) हा रोग पांढऱ्या माशीद्वारे पसरतो. बाधित झाडे त्वरित नष्ट करा. असिटामिप्रीड २० एसपी (०.२ ग्रॅम/लीटर) किंवा इमिडाक्लोप्रिड १७.८ एसएल (०.३ मिली/लीटर) फवारा. पिवळे चिकट सापळे लावा.";
    }
    if (adviceEn.includes("Leaf Blast")) {
      return "लीफ ब्लास्ट (भातावरील करपा) पानांवर राखाडी रंगाचे लांबट ठिपके निर्माण करतो. ट्रायसायक्लाझोल ७५ डब्ल्यूपी (०.६ ग्रॅम/लीटर) किंवा आयसोप्रोथिओलेन ४० ईसी (१.५ मिली/लीटर) ची फवारणी करा. युरियाचा अतिवापर थांबवा. रोपाची घनता कमी करा.";
    }
    if (adviceEn.includes("Sheath Blight")) {
      return "शीथ ब्लाईट - पानाच्या आवरणावर राखाडी-पांढरे ठिपके. हेक्साकोनाझोल ५ एससी (२ मिली/लीटर) किंवा व्हॅलिडामायसिन ३ एल (२ मिली/लीटर) फवारा. रोपाची घनता कमी करा.";
    }
    if (adviceEn.includes("Stem Rust") || adviceEn.includes("Rust")) {
      return "तांबेरा रोगामुळे खोडावर आणि पानांवर लांबट तांबूस-तपकिरी ठिपके येतात. प्रोपिकोनाझोल २५% ईसी (५०० मिली/हेक्टर) किंवा टेब्युकोनाझोल २५० ईसी (७५० मिली/हेक्टर) फवारा. एचडी-२९६७ किंवा डीबीडब्ल्यू-१८७ प्रतिकारक वाणांची पेरणी करा.";
    }
    if (adviceEn.includes("Northern Leaf Blight") || adviceEn.includes("Gray Leaf Spot")) {
      return "मक्क्यावरील पानावरील रोग. प्रोपिकोनाझोल २५ ईसी (१ मिली/लीटर) किंवा मॅन्कोझेब ७५ डब्ल्यूपी (२ ग्रॅम/लीटर) VT (ताटणी) अवस्थेत फवारा. प्रतिकारक संकरित वाण वापरा. पिकांची फेरपालट करा.";
    }
    if (adviceEn.includes("Fall Armyworm")) {
      return "फॉल आर्मीवर्म (शेंडा अळी) - पोंग्यात छिद्रे आणि भुस्सा. इमामेक्टिन बेन्झोएट ५ एसजी (०.४ ग्रॅम/लीटर) थेट पोंग्यात टाका. पहाटे फवारणी करा. फेरोमोन सापळे वापरा.";
    }
    if (adviceEn.includes("Bacterial Blight") || adviceEn.includes("Xanthomonas")) {
      return "जिवाणू करपा - पानांवर कोनीय पाण्याने भिजलेले ठिपके. कॉपर ऑक्सिक्लोराईड ५० डब्ल्यूपी (३ ग्रॅम/लीटर) + स्ट्रेप्टोसायक्लिन (०.१५ ग्रॅम/लीटर) फवारा. प्रमाणित रोगमुक्त बियाणे वापरा.";
    }
    if (adviceEn.includes("Leaf Curl") && (adviceEn.includes("CLCuV") || adviceEn.includes("Cotton"))) {
      return "कापसावरील पाने आकसणे रोग. असिटामिप्रीड २० एसपी (०.२ ग्रॅम/लीटर) साप्ताहिक फवारा. बाधित झाडे काढा. CLCuV-सहिष्णु संकरित वाण MRC-7017 वापरा.";
    }
    if (adviceEn.includes("Red Rot")) {
      return "लाल कूज (Red Rot) - उसाच्या आतून लाल रंगाचे डाग आणि आंबट वास. बाधित खोडे जाळून नष्ट करा. लागवडीपूर्वी बेण्याला कार्बेन्डाझिम ०.१% मध्ये १५ मिनिटे बुडवा. Co-0238 वाण लावा.";
    }
    if (adviceEn.includes("Smut")) {
      return "काजळी रोग (Smut) - उसाच्या शेंड्याऐवजी काळी चाबकासारखी रचना. बाधित झाडे जाळून नष्ट करा. बेण्याला ५०°C तापमानात २ तास उपचार करा. रोगप्रतिकारक वाण लावा.";
    }
    if (adviceEn.includes("Late Blight") && adviceEn.includes("Potato")) {
      return "बटाट्यावरील उशिरा येणारा करपा. सायमॉक्सानिल ८% + मॅन्कोझेब ६४% डब्ल्यूपी (३ ग्रॅम/लीटर) दर ५ दिवसांनी फवारा. बाधित झाडे नष्ट करा. तुषार सिंचन टाळा.";
    }
    if (adviceEn.includes("Anthracnose") || adviceEn.includes("Die Back")) {
      return "अँथ्रॅकनोज / खोडे मरणे - फळांवर आणि पानांवर बुडालेले तपकिरी ठिपके. मॅन्कोझेब ७५ डब्ल्यूपी (२ ग्रॅम/लीटर) किंवा कार्बेन्डाझिम ५० डब्ल्यूपी (१ ग्रॅम/लीटर) फवारा. फळे वेळेवर काढा.";
    }
    if (adviceEn.includes("Sigatoka") || adviceEn.includes("Mycosphaerella")) {
      return "केळीवरील सिगाटोका रोग - पानांवर पिवळ्या रेषा जाऊन काळे डाग. मॅन्कोझेब ७५ डब्ल्यूपी (२.५ ग्रॅम/लीटर) आणि प्रोपिकोनाझोल २५ ईसी (०.५ मिली/लीटर) आलटून पालटून दर १४ दिवसांनी फवारा.";
    }
    if (adviceEn.includes("Foot and Mouth") || adviceEn.includes("FMD")) {
      return "लाळ्या-खुरकत (FMD) - तोंड, खुरे, आचळांवर फोड. तत्काळ अलग करा - हा रोग अत्यंत संसर्गजन्य आहे. फोडांवर १:१०००० KMnO4 द्रावणाने धुवा. पशुवैद्यांना तात्काळ कळवा. वार्षिक FMD लसीकरण अनिवार्य आहे.";
    }
    if (adviceEn.includes("Lumpy Skin")) {
      return "लम्पी स्किन डिसीज - शरीरावर गाठी, ताप, नाकातून स्त्राव. बाधित कळपाला अलग करा. निरोगी जनावरांना LSD लस द्या. जखमांवर जंतुनाशक लावा. रक्त शोषणाऱ्या कीटकांचे नियंत्रण करा. पशुसंवर्धन विभागाला कळवा.";
    }
    return adviceEn;
  };

  const getLocalizedCrop = (cropEn) => {
    if (!cropEn || language !== "mr") return cropEn;
    const crops = {
      "Tomato": "टोमॅटो (Tomato)", "Rice (Paddy)": "भात / धान (Rice)", "Rice": "भात / धान (Rice)",
      "Paddy": "भात / धान (Rice)", "Wheat": "गहू (Wheat)", "Maize (Corn)": "मक्का (Maize)",
      "Maize": "मक्का (Maize)", "Corn": "मक्का (Maize)", "Cotton": "कापूस (Cotton)",
      "Sugarcane": "ऊस (Sugarcane)", "Potato": "बटाटा (Potato)", "Groundnut (Peanut)": "भुईमूग (Groundnut)",
      "Groundnut": "भुईमूग (Groundnut)", "Soybean": "सोयाबीन (Soybean)",
      "Chilli (Pepper)": "मिरची (Chilli)", "Chilli": "मिरची (Chilli)",
      "Banana": "केळी (Banana)", "Onion": "कांदा (Onion)", "Mango": "आंबा (Mango)",
      "Brinjal (Eggplant)": "वांगी (Brinjal)", "Brinjal": "वांगी (Brinjal)",
      "Cattle (Livestock)": "जनावरे (Cattle)", "Cattle": "जनावरे (Cattle)"
    };
    return crops[cropEn] || cropEn;
  };

  const getLocalizedDisease = (diseaseEn) => {
    if (!diseaseEn || language !== "mr") return diseaseEn;
    const d = {
      "Early Blight (Alternaria solani)":             "अर्ली ब्लाईट / लवकर येणारा करपा",
      "Leaf Curl Virus (TLCV)":                       "लीफ कर्ल विषाणू / पाने आकसणे",
      "Tomato Yellow Leaf Curl Virus (TYLCV)":        "लीफ कर्ल विषाणू / पाने आकसणे",
      "Late Blight (Phytophthora infestans)":         "उशिरा येणारा करपा",
      "Leaf Blast (Magnaporthe oryzae)":              "लीफ ब्लास्ट / पानावरील करपा",
      "Sheath Blight (Rhizoctonia solani)":           "शीथ ब्लाईट / आवरण करपा",
      "Brown Spot (Helminthosporium oryzae)":         "तपकिरी ठिपके रोग",
      "Black Stem Rust (Puccinia graminis)":          "तांबेरा / स्टेम रस्ट",
      "Yellow Stripe Rust (Puccinia striiformis)":    "पिवळा तांबेरा",
      "Powdery Mildew (Blumeria graminis)":           "भुरी रोग / भुकटी बुरशी",
      "Northern Leaf Blight (Exserohilum turcicum)":  "उत्तर पानावरील करपा",
      "Gray Leaf Spot (Cercospora zeae-maydis)":      "राखाडी पान ठिपके",
      "Fall Armyworm (Spodoptera frugiperda)":        "फॉल आर्मीवर्म / शेंडा अळी",
      "Bacterial Blight (Xanthomonas axonopodis)":    "जिवाणू करपा",
      "Cotton Leaf Curl Virus (CLCuV)":              "कापूस पान कुरळणे विषाणू",
      "Red Rot (Colletotrichum falcatum)":            "लाल कूज रोग",
      "Smut (Ustilago scitaminea)":                  "काजळी रोग",
      "Foot and Mouth Disease (FMD)":                "लाळ्या-खुरकत रोग",
      "Lumpy Skin Disease (Capripoxvirus)":          "लम्पी स्किन रोग",
      "Anthracnose / Die Back (Colletotrichum capsici)": "अँथ्रॅकनोज / खोडे मरणे",
      "Black Sigatoka (Mycosphaerella fijiensis)":   "केळीवरील सिगाटोका रोग",
      "Healthy (No Disease)":                         "निरोगी (कोणताही रोग नाही)"
    };
    return d[diseaseEn] || diseaseEn;
  };

  const getLocalizedSeverity = (sev) => {
    if (!sev || language !== "mr") return sev;
    return { low: "कमी (low)", medium: "मध्यम (medium)", high: "जास्त (high)" }[sev.toLowerCase()] || sev;
  };

  // ── File handlers ─────────────────────────────────────────────────────────
  const handleDrop = (e) => {
    e.preventDefault();
    const f = e.dataTransfer.files?.[0];
    if (f?.type.startsWith("image/")) handleFileSelected(f);
  };

  const handleFileSelected = (selectedFile) => {
    setFile(selectedFile);
    setFileName(selectedFile.name);
    setResult(null);
    setStatus(language === "mr"
      ? "फोटो तयार आहे. रोग तपासण्यासाठी 'तपासा आणि निदान करा' वर क्लिक करा."
      : "Image ready. Click 'Analyze Image' to detect disease.");
    setPreviewUrl(URL.createObjectURL(selectedFile));
  };

  const handleFileInputChange = (e) => {
    const f = e.target.files?.[0];
    if (f?.type.startsWith("image/")) handleFileSelected(f);
  };

  // ── Analysis ──────────────────────────────────────────────────────────────
  const handleAnalyze = async () => {
    if (!file) {
      setStatus(language === "mr"
        ? "कृपया आधी फोटो अपलोड करा."
        : "Please upload an image first.");
      return;
    }

    try {
      setLoading(true);
      setStatus(language === "mr"
        ? "एआय मॉडेलद्वारे तपासणी केली जात आहे... (३०-४५ सेकंद)"
        : "Analyzing with AI model... (30-45 seconds)");
      setResult(null);

      const formData = new FormData();
      formData.append("image", file);
      formData.append("crop", cropHint);   // Always sends the selected crop

      const response = await api.post("/crop-disease/analyze", formData, {
        headers: { "Content-Type": "multipart/form-data" },
        timeout: 50000    // 50s for Gemini to respond
      });

      const data = response.data;
      if (!data.success) {
        setStatus(language === "mr"
          ? (data.message || "तपासणी अयशस्वी. पुन्हा प्रयत्न करा.")
          : (data.message || "Analysis failed. Please try again."));
        return;
      }

      setResult(data);
      const modelLabel = data.gemini_powered
        ? (language === "mr" ? "गूगल जेमिनी व्हिजन एआय" : "Google Gemini Vision AI")
        : (language === "mr" ? "स्थानिक रोग डेटाबेस" : "Local Disease Database");
      setStatus(language === "mr"
        ? `तपासणी पूर्ण झाली. (${modelLabel})`
        : `Analysis complete via ${modelLabel}.`);

    } catch (err) {
      console.error("[CropDisease]", err);
      setStatus(language === "mr"
        ? "फोटो तपासताना त्रुटी आली. कृपया पुन्हा प्रयत्न करा."
        : "Error analyzing image. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // ── Severity colors ───────────────────────────────────────────────────────
  const severityColor = { high: "#dc2626", medium: "#d97706", low: "#16a34a" };
  const severityBg    = { high: "#fef2f2", medium: "#fffbeb", low: "#f0fdf4" };

  return (
    <div className="card" style={{ marginTop: 24 }}>
      <h2>
        {language === "mr" ? "पीक रोग तपासणी (AI)" : "Crop Disease Detection (AI)"}
      </h2>

      {/* Gemini badge */}
      <div style={{
        display: "inline-flex", alignItems: "center", gap: 6,
        background: "linear-gradient(135deg,#1a73e8,#0d9488)",
        color: "white", padding: "4px 12px", borderRadius: 14,
        fontSize: 11, fontWeight: 700, marginBottom: 12
      }}>
        🤖 {language === "mr" ? "गूगल जेमिनी १.५ Flash व्हिजन एआय" : "Powered by Google Gemini 1.5 Flash Vision AI"}
      </div>

      <p style={{ marginBottom: 16, color: "#555", fontSize: 14 }}>
        {language === "mr"
          ? "पिकाचा प्रकार निवडा आणि रोगट पिकाच्या पानाचा स्पष्ट फोटो अपलोड करा. एआय मॉडेल प्रत्यक्ष फोटो पाहून संभाव्य रोग आणि उपाय सुचवेल."
          : "Select your crop type and upload a clear photo of the affected plant. The AI will look at the actual image and detect the real disease — not a generic result."}
      </p>

      <div style={{
        display: "grid",
        gridTemplateColumns: "minmax(0, 1.2fr) minmax(0, 1fr)",
        gap: 24,
        alignItems: "flex-start"
      }}>
        {/* ── Left: Upload ─────────────────────────────────────────────────── */}
        <div>
          {/* Crop DROPDOWN — fixes the wrong-crop-result bug */}
          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 14, fontWeight: 700, display: "block", marginBottom: 6 }}>
              {language === "mr" ? "🌾 पिकाचा प्रकार निवडा:" : "🌾 Select Your Crop:"}
            </label>
            <select
              className="input"
              value={cropHint}
              onChange={(e) => setCropHint(e.target.value)}
              style={{ fontWeight: 600 }}
            >
              {CROP_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {language === "mr" ? opt.mr : opt.en}
                </option>
              ))}
            </select>
            <p style={{ fontSize: 11, color: "#6b7280", marginTop: 4 }}>
              {language === "mr"
                ? "⚠️ अचूक निदानासाठी योग्य पीक निवडा"
                : "⚠️ Select the correct crop for accurate diagnosis"}
            </p>
          </div>

          {/* Drop zone */}
          <div
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            onClick={() => fileInputRef.current?.click()}
            style={{
              border: "2px dashed #cbd5e1", borderRadius: 12, padding: 24,
              textAlign: "center", background: "#f8fafc", cursor: "pointer", marginBottom: 16
            }}
          >
            <input
              type="file" accept="image/*" ref={fileInputRef}
              style={{ display: "none" }} onChange={handleFileInputChange}
            />
            <div style={{ fontSize: 32, marginBottom: 8 }}>📷</div>
            <div style={{ fontWeight: 600, marginBottom: 4 }}>
              {fileName || (language === "mr" ? "फोटो निवडण्यासाठी येथे क्लिक करा किंवा ड्रॅग करा" : "Click here or drag & drop an image")}
            </div>
            <div style={{ fontSize: 13, color: "#6b7280" }}>
              {language === "mr" ? "समर्थित फॉरमॅट्स: JPG, JPEG, PNG (कमाल ~५MB)." : "Supported formats: JPG, JPEG, PNG (max ~5MB)."}
            </div>
          </div>

          {/* Preview */}
          {previewUrl && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 14, marginBottom: 4 }}>
                {language === "mr" ? "पूर्वावलोकन (Preview):" : "Preview:"}
              </div>
              <div style={{ position: "relative", display: "inline-block", maxWidth: "100%" }}>
                <img
                  src={previewUrl}
                  alt={language === "mr" ? "निवडलेले पान" : "Selected leaf"}
                  style={{ maxWidth: "100%", borderRadius: 12, border: "1px solid #e5e7eb", maxHeight: 260, objectFit: "cover" }}
                />
                <button
                  type="button"
                  onClick={() => {
                    setFile(null); setFileName(""); setPreviewUrl(""); setResult(null);
                    setStatus(defaultStatus);
                    if (fileInputRef.current) fileInputRef.current.value = "";
                  }}
                  style={{
                    position: "absolute", top: 8, right: 8,
                    background: "rgba(220,38,38,0.9)", color: "white",
                    border: "none", borderRadius: "50%", width: 24, height: 24,
                    cursor: "pointer", display: "flex", alignItems: "center",
                    justifyContent: "center", fontSize: 14, fontWeight: "bold", zIndex: 10
                  }}
                >✕</button>
              </div>
            </div>
          )}

          <button
            className="button"
            style={{ width: "100%", marginTop: 8 }}
            onClick={handleAnalyze}
            disabled={loading || !file}
          >
            {loading
              ? (language === "mr" ? "तपासणी सुरू आहे... ⏳" : "Analyzing... ⏳")
              : (language === "mr" ? "तपासा आणि निदान करा" : "Analyze Image")}
          </button>

          <p style={{ fontSize: 13, color: "#6b7280", marginTop: 8 }}>{status}</p>
        </div>

        {/* ── Right: Results ────────────────────────────────────────────────── */}
        <div>
          <h3 style={{ marginBottom: 8 }}>
            {language === "mr" ? "एआय रोग निदान" : "AI Diagnosis"}
          </h3>

          {!result && (
            <p style={{ fontSize: 14, color: "#6b7280" }}>
              {language === "mr"
                ? "पानाचा फोटो तपासा वर क्लिक केल्यावर अहवाल येथे दिसेल."
                : "Results will appear here after you analyze an image."}
            </p>
          )}

          {result && (
            <div style={{ marginTop: 8 }}>
              {/* AI model badge */}
              <div style={{
                marginBottom: 12, padding: "8px 12px", borderRadius: 8,
                background: result.gemini_powered
                  ? "linear-gradient(135deg,#e0f2fe,#dcfce7)"
                  : "#f1f5f9",
                border: result.gemini_powered ? "1px solid #0ea5e9" : "1px solid #e2e8f0",
                display: "flex", justifyContent: "space-between", alignItems: "center"
              }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: "#475569" }}>
                  {result.gemini_powered
                    ? (language === "mr" ? "🤖 गूगल जेमिनी व्हिजन एआय" : "🤖 Google Gemini Vision AI")
                    : (language === "mr" ? "📊 स्थानिक रोग डेटाबेस" : "📊 " + (result.ai_model || "Local Database"))}
                </span>
                {result.gemini_powered && (
                  <span style={{
                    fontSize: 10, background: "linear-gradient(135deg,#1a73e8,#0d9488)",
                    color: "white", padding: "2px 8px", borderRadius: 10, fontWeight: 700
                  }}>✨ Gemini AI</span>
                )}
              </div>

              {/* What AI actually saw */}
              {result.image_analysis && (
                <div style={{
                  marginBottom: 10, padding: "8px 12px", borderRadius: 8,
                  background: "#f8fafc", border: "1px solid #e2e8f0",
                  fontSize: 12, color: "#64748b", fontStyle: "italic"
                }}>
                  👁️ <strong>{language === "mr" ? "एआयने पाहिले:" : "AI saw:"}</strong> {result.image_analysis}
                </div>
              )}

              {/* Detected label */}
              <div style={{ marginBottom: 12, padding: 8, borderRadius: 8, background: "#eff6ff", fontSize: 13 }}>
                ✅ <strong>{language === "mr" ? "संभाव्य रोग आढळला." : "Most likely disease detected."}</strong>
              </div>

              {/* Crop */}
              <div style={{ marginBottom: 8, fontSize: 15 }}>
                <strong>{language === "mr" ? "पीक:" : "Crop:"}</strong>{" "}
                <span style={{ color: "#15803d", fontWeight: 700 }}>
                  {getLocalizedCrop(result.crop)}
                </span>
              </div>

              {/* Disease */}
              <div style={{ marginBottom: 8, fontSize: 15 }}>
                <strong>{language === "mr" ? "रोग:" : "Disease:"}</strong>{" "}
                <span style={{ color: "#dc2626", fontWeight: 600 }}>
                  {getLocalizedDisease(result.disease)}
                </span>
              </div>

              {/* Severity with color bar */}
              <div style={{ marginBottom: 12 }}>
                <strong style={{ fontSize: 14 }}>{language === "mr" ? "रोगाची तीव्रता:" : "Severity:"}</strong>
                <div style={{
                  marginTop: 4, padding: "4px 10px", borderRadius: 6, display: "inline-block",
                  marginLeft: 8,
                  background: severityBg[result.severity] || "#f1f5f9",
                  color: severityColor[result.severity] || "#374151",
                  fontWeight: 700, fontSize: 13, textTransform: "uppercase"
                }}>
                  {getLocalizedSeverity(result.severity)}
                </div>
              </div>

              {/* Confidence */}
              <div style={{ marginBottom: 12 }}>
                <strong style={{ fontSize: 14 }}>{language === "mr" ? "एआय मॉडेलची अचूकता:" : "AI Confidence:"}</strong>
                <div style={{ marginTop: 4, display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ flex: 1, height: 8, background: "#e2e8f0", borderRadius: 4, overflow: "hidden" }}>
                    <div style={{
                      height: "100%", borderRadius: 4,
                      width: `${(result.confidence * 100).toFixed(0)}%`,
                      background: result.confidence > 0.8 ? "#16a34a" : result.confidence > 0.6 ? "#d97706" : "#ef4444"
                    }} />
                  </div>
                  <span style={{ fontWeight: 700, fontSize: 14, minWidth: 42 }}>
                    {(result.confidence * 100).toFixed(1)}%
                  </span>
                </div>
              </div>

              {/* Processed image */}
              {result.imageUrl && (
                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 13, marginBottom: 4, fontWeight: 600 }}>
                    {language === "mr" ? "प्रक्रिया केलेला फोटो:" : "Processed Image:"}
                  </div>
                  <img
                    src={`${import.meta.env.VITE_API_URL || "http://localhost:5000"}${result.imageUrl}`}
                    alt={language === "mr" ? "तपासलेले पान" : "Analyzed leaf"}
                    style={{ maxWidth: "100%", borderRadius: 12, border: "1px solid #e5e7eb", maxHeight: 180, objectFit: "cover" }}
                  />
                </div>
              )}

              {/* Treatment advice */}
              <div style={{ marginTop: 4 }}>
                <strong style={{ fontSize: 14 }}>{language === "mr" ? "शिफारस केलेले उपाय:" : "Suggested Treatment:"}</strong>
                <div style={{
                  marginTop: 8, padding: "12px 14px", borderRadius: 8,
                  background: result.severity === "high" ? "#fef2f2"
                    : result.severity === "medium" ? "#fffbeb" : "#f0fdf4",
                  borderLeft: `4px solid ${severityColor[result.severity] || "#16a34a"}`,
                  fontSize: 13.5, lineHeight: 1.7, color: "#374151"
                }}>
                  {getLocalizedAdvice(result.advice)}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CropDiseaseDetectionSection;
