// frontend/src/components/CropDiseaseDetectionSection.jsx
import React, { useRef, useState } from "react";
import api from "../api";

const CropDiseaseDetectionSection = () => {
  const [file, setFile] = useState(null);
  const [fileName, setFileName] = useState("");
  const [previewUrl, setPreviewUrl] = useState("");
  const [cropHint, setCropHint] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [status, setStatus] = useState(
    'Upload or capture an image and click "Analyze Image" to see results.'
  );

  const fileInputRef = useRef(null);

  const handleDrop = (e) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files?.[0];
    if (!droppedFile) return;
    if (!droppedFile.type.startsWith("image/")) {
      setStatus("Please drop an image file (jpg, png, jpeg).");
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
    setStatus("Image ready. Click 'Analyze Image' to detect disease.");
    const localUrl = URL.createObjectURL(selectedFile);
    setPreviewUrl(localUrl);
  };

  const handleFileInputChange = (e) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;
    if (!selectedFile.type.startsWith("image/")) {
      setStatus("Please upload an image file (jpg, png, jpeg).");
      return;
    }
    handleFileSelected(selectedFile);
  };

  const handleAnalyze = async () => {
    if (!file) {
      setStatus("Please upload or capture an image first.");
      return;
    }

    try {
      setLoading(true);
      setStatus("Analyzing image with AI model...");
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
        setStatus(data.message || "Analysis failed. Please try again.");
        return;
      }

      setResult(data);
      setStatus("Analysis complete. See results below.");
    } catch (err) {
      console.error(err);
      setStatus("Error analyzing image. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card" style={{ marginTop: 24 }}>
      <h2>Crop Disease Detection (AI)</h2>
      <p style={{ marginBottom: 16, color: "#555" }}>
        Upload a clear photo of the affected plant leaf. The AI will analyze the
        image and suggest the most likely disease and remedy.
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
              Crop (optional)
            </label>
            <input
              className="input"
              type="text"
              placeholder="Example: Tomato, Rice, Wheat..."
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
              {fileName || "Click here or drag & drop an image"}
            </div>
            <div style={{ fontSize: 13, color: "#6b7280" }}>
              Supported formats: JPG, JPEG, PNG (max ~5MB).
            </div>
          </div>

          {previewUrl && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 14, marginBottom: 4 }}>Preview:</div>
              <img
                src={previewUrl}
                alt="Selected leaf"
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
            {loading ? "Analyzing..." : "Analyze Image"}
          </button>

          <p style={{ fontSize: 13, color: "#6b7280", marginTop: 8 }}>
            {status}
          </p>
        </div>

        <div>
          <h3 style={{ marginBottom: 8 }}>AI Diagnosis</h3>
          {!result && (
            <p style={{ fontSize: 14, color: "#6b7280" }}>
              Results will appear here after you analyze an image.
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
                ✅ <strong>Most likely disease detected.</strong>
              </div>

              <div style={{ marginBottom: 8 }}>
                <strong>Crop:</strong> {result.crop}
              </div>
              <div style={{ marginBottom: 8 }}>
                <strong>Disease:</strong> {result.disease}
              </div>
              <div style={{ marginBottom: 8 }}>
                <strong>Severity:</strong> {result.severity}
              </div>
              <div style={{ marginBottom: 8 }}>
                <strong>Model confidence:</strong>{" "}
                {(result.confidence * 100).toFixed(1)}%
              </div>

              {result.imageUrl && (
                <div style={{ marginTop: 12 }}>
                  <div style={{ fontSize: 14, marginBottom: 4 }}>
                    Processed Image:
                  </div>
                  <img
                    src={`http://localhost:5000${result.imageUrl}`}
                    alt="Analyzed leaf"
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
                <strong>Suggested Action:</strong>
                <p style={{ fontSize: 14, color: "#374151" }}>
                  {result.advice}
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
