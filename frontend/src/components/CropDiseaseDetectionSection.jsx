// frontend/src/components/CropDiseaseDetectionSection.jsx
import React, { useRef, useState } from "react";
import api from "../api";
import { useLanguage } from "../context/LanguageContext";

const CropDiseaseDetectionSection = () => {
  const { language } = useLanguage();
  const [file, setFile] = useState(null);
  const [fileName, setFileName] = useState("");
  const [previewUrl, setPreviewUrl] = useState("");
  const [cropHint, setCropHint] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  
  const defaultStatus = language === "mr" 
    ? "फोटो अपलोड करा किंवा कॅप्चर करा आणि परिणाम पाहण्यासाठी 'तपासा आणि निदान करा' वर क्लिक करा."
    : "Upload or capture an image and click \"Analyze Image\" to see results.";

  const [status, setStatus] = useState(defaultStatus);
  const fileInputRef = useRef(null);

  const getLocalizedAdvice = (adviceEn) => {
    if (!adviceEn) return "";
    if (language !== "mr") return adviceEn;
    
    if (adviceEn.includes("Early Blight")) {
      return "अर्ली ब्लाईट (लवकर येणारा करपा) पिकाच्या पानांवर गोलाकार काळे ठिपके तयार करतो. त्वरित मॅन्कोझेब ७५ डब्ल्यूपी (२ ग्रॅम/लीटर) किंवा कॉपर ऑक्सिक्लोराईड ५० डब्ल्यूपी (३ ग्रॅम/लीटर) १०-१४ दिवसांच्या अंतराने फवारा. प्रादुर्भाव झालेली खालची पाने काढून टाका जेणेकरून हवेचा प्रवाह सुधारेल. पिकांची फेरपालट करा.";
    }
    if (adviceEn.includes("Leaf Curl")) {
      return "लीफ कर्ल (पाने आकसणे) हा रोग पांढऱ्या माशीद्वारे पसरतो. विषाणूचा प्रसार रोखण्यासाठी बाधित झाडे त्वरित नष्ट करा. पांढऱ्या माशीच्या नियंत्रणासाठी असिटामिप्रीड २० एसपी (०.२ ग्रॅम/लीटर) किंवा इमिडाक्लोप्रिड १७.८ एसएल (०.३ मिली/लीटर) फवारा. शेतात पिवळे चिकट सापळे लावा.";
    }
    if (adviceEn.includes("Leaf Blast")) {
      return "लीफ ब्लास्ट (भातावरील करपा) पानांवर राखाडी रंगाचे लांबट ठिपके निर्माण करतो. फुटवे येण्याच्या आणि लोंब्या धरण्याच्या अवस्थेत ट्रायसायक्लाझोल ७५ डब्ल्यूपी (०.६ ग्रॅम/लीटर) किंवा आयसोप्रोथिओलेन ४० ईसी (१.५ मिली/लीटर) ची फवारणी करा. नत्राचा (युरिया) अतिवापर थांबवा.";
    }
    if (adviceEn.includes("Stem Rust") || adviceEn.includes("Rust")) {
      return "तांबेरा (Stem Rust) रोगामुळे खोडावर आणि पानांवर लांबट तांबूस-तपकिरी ठिपके येतात. रोगाची लक्षणे दिसताच प्रोपिकोनाझोल २५% ईसी (५०० मिली/हेक्टर) किंवा टेब्युकोनाझोल २५० ईसी (७५० मिली/हेक्टर) फवारा. प्रतिबंधात्मक उपाय म्हणून एचडी-२९६७ किंवा डीबीडब्ल्यू-१८७ यांसारख्या तांबेरा-प्रतिकारक वाणांची पेरणी करा.";
    }
    return adviceEn;
  };

  const getLocalizedCrop = (cropEn) => {
    if (!cropEn) return "";
    if (language !== "mr") return cropEn;
    const crops = {
      "Tomato": "टोमॅटो (Tomato)",
      "Rice (Paddy)": "भात / धान (Rice)",
      "Rice": "भात / धान (Rice)",
      "Paddy": "भात / धान (Rice)",
      "Wheat": "गहू (Wheat)"
    };
    return crops[cropEn] || cropEn;
  };

  const getLocalizedDisease = (diseaseEn) => {
    if (!diseaseEn) return "";
    if (language !== "mr") return diseaseEn;
    const diseases = {
      "Early Blight (Alternaria solani)": "अर्ली ब्लाईट / लवकर येणारा करपा (Early Blight)",
      "Leaf Curl Virus (TLCV)": "लीफ कर्ल विषाणू / पाने आकसणे (Leaf Curl)",
      "Leaf Blast (Magnaporthe oryzae)": "लीफ ब्लास्ट / पानावरील करपा (Leaf Blast)",
      "Black Stem Rust (Puccinia graminis)": "तांबेरा रोग / स्टेम रस्ट (Stem Rust)"
    };
    return diseases[diseaseEn] || diseaseEn;
  };

  const getLocalizedSeverity = (sev) => {
    if (!sev) return "";
    if (language !== "mr") return sev;
    const sevs = {
      "low": "कमी (low)",
      "medium": "मध्यम (medium)",
      "high": "जास्त (high)"
    };
    return sevs[sev.toLowerCase()] || sev;
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files?.[0];
    if (!droppedFile) return;
    if (!droppedFile.type.startsWith("image/")) {
      setStatus(
        language === "mr"
          ? "कृपया फक्त फोटो फाईल अपलोड करा (jpg, png, jpeg)."
          : "Please drop an image file (jpg, png, jpeg)."
      );
      return;
    }
    handleFileSelected(droppedFile);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleFileSelected = (selectedFile) => {
    setFile(selectedFile);
    setFileName(selectedFile.name);
    setResult(null);
    setStatus(
      language === "mr"
        ? "फोटो तयार आहे. रोग तपासण्यासाठी 'तपासा आणि निदान करा' वर क्लिक करा."
        : "Image ready. Click 'Analyze Image' to detect disease."
    );
    const localUrl = URL.createObjectURL(selectedFile);
    setPreviewUrl(localUrl);
  };

  const handleFileInputChange = (e) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;
    if (!selectedFile.type.startsWith("image/")) {
      setStatus(
        language === "mr"
          ? "कृपया फक्त फोटो फाईल अपलोड करा (jpg, png, jpeg)."
          : "Please upload an image file (jpg, png, jpeg)."
      );
      return;
    }
    handleFileSelected(selectedFile);
  };

  const handleAnalyze = async () => {
    if (!file) {
      setStatus(
        language === "mr"
          ? "कृपया आधी फोटो अपलोड करा किंवा कॅप्चर करा."
          : "Please upload or capture an image first."
      );
      return;
    }

    try {
      setLoading(true);
      setStatus(
        language === "mr"
          ? "एआय मॉडेलद्वारे तपासणी केली जात आहे..."
          : "Analyzing image with AI model..."
      );
      setResult(null);

      const formData = new FormData();
      formData.append("image", file);
      if (cropHint) {
        formData.append("crop", cropHint);
      }

      const response = await api.post("/crop-disease/analyze", formData, {
        headers: {
          "Content-Type": "multipart/form-data"
        }
      });

      const data = response.data;
      if (!data.success) {
        setStatus(
          language === "mr"
            ? (data.message || "तपासणी अयशस्वी. कृपया पुन्हा प्रयत्न करा.")
            : (data.message || "Analysis failed. Please try again.")
        );
        return;
      }

      setResult(data);
      setStatus(
        language === "mr"
          ? "तपासणी पूर्ण झाली. खालील अहवाल पहा."
          : "Analysis complete. See results below."
      );
    } catch (err) {
      console.error(err);
      setStatus(
        language === "mr"
          ? "फोटो तपासताना त्रुटी आली. कृपया पुन्हा प्रयत्न करा."
          : "Error analyzing image. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card" style={{ marginTop: 24 }}>
      <h2>
        {language === "mr" ? "पीक रोग तपासणी (AI)" : "Crop Disease Detection (AI)"}
      </h2>
      <p style={{ marginBottom: 16, color: "#555" }}>
        {language === "mr" 
          ? "रोगट पिकाच्या पानाचा स्पष्ट फोटो अपलोड करा. एआय मॉडेल विश्लेषण करून संभाव्य रोग आणि त्यावर उपाय सुचवेल."
          : "Upload a clear photo of the affected plant leaf. The AI will analyze the image and suggest the most likely disease and remedy."}
      </p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 1.2fr) minmax(0, 1fr)",
          gap: 24,
          alignItems: "flex-start"
        }}
      >
        <div>
          <div style={{ marginBottom: 12 }}>
            <label
              style={{
                fontSize: 14,
                fontWeight: 600,
                display: "block",
                marginBottom: 4
              }}
            >
              {language === "mr" ? "पीक (पर्यायी)" : "Crop (optional)"}
            </label>
            <input
              className="input"
              type="text"
              placeholder={language === "mr" ? "उदा. टोमॅटो, भात, गहू..." : "Example: Tomato, Rice, Wheat..."}
              value={cropHint}
              onChange={(e) => setCropHint(e.target.value)}
            />
          </div>

          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onClick={() => fileInputRef.current?.click()}
            style={{
              border: "2px dashed #cbd5e1",
              borderRadius: 12,
              padding: 24,
              textAlign: "center",
              background: "#f8fafc",
              cursor: "pointer",
              marginBottom: 16
            }}
          >
            <input
              type="file"
              accept="image/*"
              ref={fileInputRef}
              style={{ display: "none" }}
              onChange={handleFileInputChange}
            />
            <div style={{ fontSize: 32, marginBottom: 8 }}>📷</div>
            <div style={{ fontWeight: 600, marginBottom: 4 }}>
              {fileName || (language === "mr" ? "फोटो निवडण्यासाठी येथे क्लिक करा किंवा ड्रॅग करा" : "Click here or drag & drop an image")}
            </div>
            <div style={{ fontSize: 13, color: "#6b7280" }}>
              {language === "mr" ? "समर्थित फॉरमॅट्स: JPG, JPEG, PNG (कमाल ~५MB)." : "Supported formats: JPG, JPEG, PNG (max ~5MB)."}
            </div>
          </div>

          {previewUrl && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 14, marginBottom: 4 }}>
                {language === "mr" ? "पूर्वावलोकन (Preview):" : "Preview:"}
              </div>
              <img
                src={previewUrl}
                alt={language === "mr" ? "निवडलेले पान" : "Selected leaf"}
                style={{
                  maxWidth: "100%",
                  borderRadius: 12,
                  border: "1px solid #e5e7eb",
                  maxHeight: 260,
                  objectFit: "cover"
                }}
              />
            </div>
          )}

          <button
            className="button"
            style={{ width: "100%", marginTop: 8 }}
            onClick={handleAnalyze}
            disabled={loading}
          >
            {loading 
              ? (language === "mr" ? "तपासणी सुरू आहे..." : "Analyzing...") 
              : (language === "mr" ? "तपासा आणि निदान करा" : "Analyze Image")}
          </button>

          <p style={{ fontSize: 13, color: "#6b7280", marginTop: 8 }}>
            {status}
          </p>
        </div>

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
              <div
                style={{
                  marginBottom: 12,
                  padding: 8,
                  borderRadius: 8,
                  background: "#eff6ff",
                  fontSize: 13
                }}
              >
                ✅ <strong>{language === "mr" ? "संभाव्य रोग आढळला." : "Most likely disease detected."}</strong>
              </div>

              <div style={{ marginBottom: 8 }}>
                <strong>{language === "mr" ? "पीक:" : "Crop:"}</strong> {getLocalizedCrop(result.crop)}
              </div>
              <div style={{ marginBottom: 8 }}>
                <strong>{language === "mr" ? "रोग:" : "Disease:"}</strong> {getLocalizedDisease(result.disease)}
              </div>
              <div style={{ marginBottom: 8 }}>
                <strong>{language === "mr" ? "रोगाची तीव्रता:" : "Severity:"}</strong> {getLocalizedSeverity(result.severity)}
              </div>
              <div style={{ marginBottom: 8 }}>
                <strong>{language === "mr" ? "एआय मॉडेलची अचूकता:" : "Model confidence:"}</strong>{" "}
                {(result.confidence * 100).toFixed(1)}%
              </div>

              {result.imageUrl && (
                <div style={{ marginTop: 12 }}>
                  <div style={{ fontSize: 14, marginBottom: 4 }}>
                    {language === "mr" ? "प्रक्रिया केलेला फोटो:" : "Processed Image:"}
                  </div>
                  <img
                    src={`${import.meta.env.VITE_API_URL || "http://localhost:5000"}${result.imageUrl}`}
                    alt={language === "mr" ? "तपासलेले पान" : "Analyzed leaf"}
                    style={{
                      maxWidth: "100%",
                      borderRadius: 12,
                      border: "1px solid #e5e7eb",
                      maxHeight: 260,
                      objectFit: "cover"
                    }}
                  />
                </div>
              )}

              <div style={{ marginTop: 16 }}>
                <strong>{language === "mr" ? "शिफारस केलेले उपाय:" : "Suggested Action:"}</strong>
                <p style={{ fontSize: 14, color: "#374151", marginTop: 4 }}>
                  {getLocalizedAdvice(result.advice)}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CropDiseaseDetectionSection;
