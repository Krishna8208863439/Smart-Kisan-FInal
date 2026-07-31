import React, { useRef, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, X, RefreshCw, Upload, AlertCircle, Wifi, WifiOff } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

/**
 * CameraScannerModal Component — Camera-First Mobile Diagnostic Capture
 * Features:
 * - HTML5 Camera Stream with live leaf frame guide overlay
 * - Large 60px shutter touch button
 * - Gallery upload fallback for saved images
 * - Network connectivity status banner
 */
export default function CameraScannerModal({ isOpen, onClose, onCaptureImage }) {
  const { language } = useLanguage();
  const navigate = useNavigate();
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);

  const [stream, setStream] = useState(null);
  const [cameraError, setCameraError] = useState(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isCapturing, setIsCapturing] = useState(false);

  // Monitor network status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Initialize camera stream when modal opens
  useEffect(() => {
    if (isOpen) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => stopCamera();
  }, [isOpen]);

  const startCamera = async () => {
    setCameraError(null);
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      console.warn('[Camera] Direct camera stream unavailable:', err);
      setCameraError(language === 'mr' ? 'कॅमेरा वापरता आला नाही. कृपया गॅलरीमधून फोटो निवडा.' : 'Camera access restricted or unavailable. Please select an image from gallery.');
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
  };

  const handleTakeSnapshot = () => {
    if (!videoRef.current || !canvasRef.current) return;
    setIsCapturing(true);

    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;

    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob((blob) => {
      if (blob) {
        const file = new File([blob], `field_crop_scan_${Date.now()}.jpg`, { type: 'image/jpeg' });
        stopCamera();
        onClose();
        if (onCaptureImage) {
          onCaptureImage(file);
        } else {
          // Navigate to AI Tools disease scanner tab with state
          navigate('/ai-tools?tab=disease&subtab=crop_cv', { state: { capturedFile: file } });
        }
      }
      setIsCapturing(false);
    }, 'image/jpeg', 0.92);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      stopCamera();
      onClose();
      if (onCaptureImage) {
        onCaptureImage(file);
      } else {
        navigate('/ai-tools?tab=disease&subtab=crop_cv', { state: { capturedFile: file } });
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="camera-modal-overlay">
      <div className="camera-modal-container">
        {/* Header Controls */}
        <div className="camera-modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Camera size={20} color="#22C55E" />
            <span style={{ fontWeight: 800, color: '#FFFFFF', fontSize: 16 }}>
              {language === 'mr' ? 'पीक पान स्कॅनर' : 'Crop Field Scanner'}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: isOnline ? '#22C55E' : '#EAB308', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              {isOnline ? <Wifi size={14} /> : <WifiOff size={14} />}
              {isOnline ? 'Online' : 'Offline Mode'}
            </span>
            <button type="button" className="camera-modal-close" onClick={onClose}>
              <X size={22} color="#FFFFFF" />
            </button>
          </div>
        </div>

        {/* Camera Viewport with Frame Guide Overlay */}
        <div className="camera-viewport-box">
          {stream && !cameraError && (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="camera-video-element"
            />
          )}

          {/* Interactive Leaf Frame Guide Overlay */}
          <div className="camera-frame-guide">
            <div className="camera-frame-box">
              <span className="camera-frame-label">
                {language === 'mr' ? 'पानाचा फोटो या चौकटीत ठेवा' : 'POSITION CROP / LEAF WITHIN FRAME'}
              </span>
            </div>
          </div>

          {/* Camera Error / Fallback View */}
          {cameraError && (
            <div className="camera-fallback-box">
              <AlertCircle size={40} color="#EAB308" />
              <p style={{ fontSize: 13.5, color: '#FFFFFF', marginTop: 12, textAlign: 'center', maxWidth: 280 }}>
                {cameraError}
              </p>
              <button
                type="button"
                className="agri-suite-btn"
                style={{ width: 'auto', padding: '10px 20px', marginTop: 14 }}
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload size={18} />
                {language === 'mr' ? 'गॅलरीमधून फोटो निवडा' : 'Choose Photo from Gallery'}
              </button>
            </div>
          )}
        </div>

        {/* Hidden Canvas & Input */}
        <canvas ref={canvasRef} style={{ display: 'none' }} />
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          style={{ display: 'none' }}
          onChange={handleFileUpload}
        />

        {/* Bottom Shutter Action Controls */}
        <div className="camera-modal-actions">
          <button
            type="button"
            className="camera-action-sub-btn"
            onClick={() => fileInputRef.current?.click()}
            title="Upload from Gallery"
          >
            <Upload size={22} color="#FFFFFF" />
            <span style={{ fontSize: 11, color: '#9CA3AF' }}>{language === 'mr' ? 'गॅलरी' : 'Gallery'}</span>
          </button>

          {/* Center Large 64px Shutter Capture Button */}
          <button
            type="button"
            className="camera-shutter-btn"
            onClick={handleTakeSnapshot}
            disabled={!stream || isCapturing}
            aria-label="Take Photo"
          >
            <div className="camera-shutter-inner" />
          </button>

          <button
            type="button"
            className="camera-action-sub-btn"
            onClick={startCamera}
            title="Reload Camera"
          >
            <RefreshCw size={22} color="#FFFFFF" />
            <span style={{ fontSize: 11, color: '#9CA3AF' }}>{language === 'mr' ? 'पुन्हा सुरू करा' : 'Reload'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
