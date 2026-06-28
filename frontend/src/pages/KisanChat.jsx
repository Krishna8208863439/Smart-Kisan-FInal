import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";
import { useLanguage } from "../context/LanguageContext";
import { useAuth } from "../context/AuthContext";

const CHIPS_TRANSLATIONS = {
  en: [
    "What fertilizer is best for tomato?",
    "How to treat early blight in paddy?",
    "Tips for organic composting",
    "How often should I water wheat?",
    "Whiteflies control recommendations"
  ],
  hi: [
    "टमाटर के लिए कौन सा उर्वरक सबसे अच्छा है?",
    "धान में झुलसा रोग का इलाज कैसे करें?",
    "जैविक खाद बनाने के टिप्स",
    "गेहूं में सिंचाई कब करनी चाहिए?",
    "सफेद मक्खियों के नियंत्रण के उपाय"
  ],
  mr: [
    "टोमॅटोसाठी कोणते खत सर्वोत्तम आहे?",
    "भातावरील करपा रोगावर काय उपाय करावा?",
    "सेंद्रिय खत तयार करण्याच्या टिप्स",
    "गव्हाला किती वेळा पाणी द्यावे?",
    "पांढऱ्या माशीच्या नियंत्रणासाठी शिफारसी"
  ]
};

const ALERT_TRANSLATIONS = {
  en: [
    { type: "weather", text: "🚨 **Urgent Weather Alert**: Sudden frost warning tonight. Cover young saplings or apply light irrigation to protect crops." },
    { type: "marketplace", text: "🤝 **Marketplace Match**: A merchant from Pune wants to buy your listed Onion stock. Tap to view B2B contracts." },
    { type: "pest", text: "🐛 **Pest Outbreak Alert**: Fall Armyworm reported within 10km of your farm. Inspect your maize whorls immediately." }
  ],
  hi: [
    { type: "weather", text: "🚨 **महत्वपूर्ण मौसम चेतावनी**: आज रात अचानक पाला पड़ने की चेतावनी। फसलों को बचाने के लिए हल्की सिंचाई करें।" },
    { type: "marketplace", text: "🤝 **बाजार कनेक्शन**: पुणे का एक व्यापारी आपका प्याज स्टॉक खरीदना चाहता है। अनुबंध देखने के लिए टैप करें।" },
    { type: "pest", text: "🐛 **कीट प्रकोप चेतावनी**: आपके खेत के 10 किमी के भीतर फॉल आर्मीवर्म की सूचना मिली है। तुरंत जांच करें।" }
  ],
  mr: [
    { type: "weather", text: "🚨 **महत्वाची हवामान चेतावणी**: आज रात्री अचानक थंडीची लाट येण्याची शक्यता. पिकांचे रक्षण करण्यासाठी हलके पाणी द्या." },
    { type: "marketplace", text: "🤝 **बाजार मॅच**: पुण्यातील एका व्यापाऱ्याने तुमच्या कांदा साठ्यासाठी मागणी केली आहे. कराराचे व्यवहार पाहण्यासाठी क्लिक करा." },
    { type: "pest", text: "🐛 **कीड प्रादुर्भाव चेतावणी**: तुमच्या शेतापासून १० किमीच्या आत लष्करी अळीचा प्रादुर्भाव आढळला आहे. पिकाची पाहणी करा." }
  ]
};

const UI_TRANSLATIONS = {
  en: {
    sidebarTitle: "AgriExpert Advisor",
    sidebarDesc: "Elite agronomic assistant, dual-sided marketplace facilitator, and water manager.",
    langPickerLabel: "Change Language",
    gpsStatus: "GPS Position Linked",
    weatherSync: "Weather Synced",
    waterSource: "Water Availability",
    waterPlaceholder: "Select your water source...",
    rainfed: "Rainfed (Rain)",
    borewell: "Borewell",
    canal: "Canal System",
    drip: "Drip Irrigation",
    keyConfig: "Gemini Key Config",
    assistantMode: "Farming Focus Mode",
    modeAdvisory: "Advisory & Chat",
    modeDiagnostics: "Crop Diagnostics (CV)",
    modeMarketplace: "Market Sourcing",
    placeholderText: "Ask AgriExpert about soil, crops, fertilizers, irrigation...",
    sendBtn: "Send 🚀",
    uploadBtn: "📷 Image",
    uploadPlaceholder: "Attached Crop Photo",
    buyingBtn: "🛒 Sourcing Inputs",
    sellingBtn: "🚜 Sell Produce",
    cropHintLabel: "Identify Crop Hint (Optional)",
    initializingLang: "Select Language to Initialise AgriExpert Advisor",
    alertsTitle: "⚠️ Priority Alerts",
    activeOffline: "Running in Standard Multilingual Mode",
    activeCustomKey: "Gemini AI Engine Active"
  },
  hi: {
    sidebarTitle: "एग्रीएक्सपर्ट एआई सलाहकार",
    sidebarDesc: "कुलीन कृषि विज्ञान विशेषज्ञ, दोतरफा बाजार और जल प्रबंधन सहायक।",
    langPickerLabel: "भाषा बदलें",
    gpsStatus: "जीपीएस स्थान कनेक्टेड",
    weatherSync: "मौसम डेटा सिंक है",
    waterSource: "पानी की उपलब्धता",
    waterPlaceholder: "पानी का स्रोत चुनें...",
    rainfed: "वर्षा आधारित (बारिश)",
    borewell: "बोरवेल/ट्यूबवेल",
    canal: "नहर प्रणाली",
    drip: "ड्रिप सिंचाई",
    keyConfig: "जेमिनी कुंजी विन्यास",
    assistantMode: "कृषि फोकस मोड",
    modeAdvisory: "सलाहकार और चैट",
    modeDiagnostics: "फसल रोग निदान (AI)",
    modeMarketplace: "बाजार सोर्सिंग",
    placeholderText: "मिट्टी, फसलों, उर्वरक या सिंचाई के बारे में एग्रीएक्सपर्ट से पूछें...",
    sendBtn: "भेजें 🚀",
    uploadBtn: "📷 छवि",
    uploadPlaceholder: "संलग्न फसल फोटो",
    buyingBtn: "🛒 इनपुट खरीदें",
    sellingBtn: "🚜 उपज बेचें",
    cropHintLabel: "फसल प्रकार संकेत (वैकल्पिक)",
    initializingLang: "एग्रीएक्सपर्ट सलाहकार शुरू करने के लिए भाषा चुनें",
    alertsTitle: "⚠️ प्राथमिकता अलर्ट",
    activeOffline: "मानक बहुभाषी मोड सक्रिय है",
    activeCustomKey: "जेमिनी एआई इंजन सक्रिय है"
  },
  mr: {
    sidebarTitle: "ॲग्रीएक्सपर्ट सल्लागार",
    sidebarDesc: "तज्ज्ञ कृषी सल्लागार, शेतमाल खरेदी-विक्री व्यवस्थापक आणि पाणी व्यवस्थापन मार्गदर्शक.",
    langPickerLabel: "भाषा बदला",
    gpsStatus: "जीपीएस स्थान जोडले",
    weatherSync: "हवामान डेटा सिंक केला",
    waterSource: "पाण्याची उपलब्धता",
    waterPlaceholder: "पाण्याचा स्रोत निवडा...",
    rainfed: "पावसावर आधारित (जिरायती)",
    borewell: "बोअरवेल / विहीर",
    canal: "कालवा प्रणाली",
    drip: "ठिबक सिंचन",
    keyConfig: "जेमिनी की कॉन्फिगरेशन",
    assistantMode: "शेती मुख्य उद्देश",
    modeAdvisory: "सल्लागार आणि गप्पा",
    modeDiagnostics: "पीक रोग निदान (AI)",
    modeMarketplace: "बाजार सोर्सिंग",
    placeholderText: "माती, पिके, खते, सिंचनाबद्दल ॲग्रीएक्सपर्टला विचारा...",
    sendBtn: "पाठवा 🚀",
    uploadBtn: "📷 फोटो",
    uploadPlaceholder: "जोडलेला पिकाचा फोटो",
    buyingBtn: "🛒 निविष्ठा खरेदी",
    sellingBtn: "🚜 पीक विक्री करा",
    cropHintLabel: "पिकाचा प्रकार (वैकल्पिक)",
    initializingLang: "ॲग्रीएक्सपर्ट सल्लागार सुरू करण्यासाठी भाषा निवडा",
    alertsTitle: "⚠️ महत्त्वपूर्ण सूचना",
    activeOffline: "मानक बहुभाषिक मोड चालू आहे",
    activeCustomKey: "जेमिनी एआय इंजिन सक्रिय आहे"
  }
};

const KisanChat = () => {
  const { language: contextLang, setLanguage: setContextLanguage } = useLanguage();
  const navigate = useNavigate();
  const { user } = useAuth();

  // If no language is selected yet, we show the welcome layout initialization screen
  const [langInitialized, setLangInitialized] = useState(!!localStorage.getItem("sk-lang"));
  const [language, setLanguage] = useState(localStorage.getItem("sk-lang") || "en");

  // Determine key for history storage
  const historyKey = user && user.email ? `sk_chat_history_${user.email}` : "sk_chat_history_guest";

  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(false);
  const [customKey, setCustomKey] = useState(localStorage.getItem("sk_gemini_key") || "");
  const [showKeyConfig, setShowKeyConfig] = useState(false);

  // Advanced metadata states
  const [gps, setGps] = useState(null);
  const [weather, setWeather] = useState(null);
  const [waterAvailability, setWaterAvailability] = useState("");
  const [activeMode, setActiveMode] = useState("advisory"); // advisory, diagnostics, marketplace
  const [cropHint, setCropHint] = useState("");

  // Attachment states
  const [selectedFile, setSelectedFile] = useState(null);
  const [base64Image, setBase64Image] = useState("");
  const [uploadUrl, setUploadUrl] = useState("");
  const fileInputRef = useRef(null);

  // Priority Alerts rotating index
  const [activeAlertIdx, setActiveAlertIdx] = useState(0);

  // Active language text dictionary
  const ui = UI_TRANSLATIONS[language] || UI_TRANSLATIONS.en;

  // Auto-detect Geolocation and fetch Weather details on mount
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const lat = parseFloat(pos.coords.latitude.toFixed(4));
          const lon = parseFloat(pos.coords.longitude.toFixed(4));
          setGps({ lat, lon });

          try {
            // Fetch weather stats from backend weather endpoint using lat/lon
            const res = await api.get("/weather", { params: { lat, lon } });
            if (res.data && res.data.current) {
              setWeather({
                temp: res.data.current.temperature,
                humidity: res.data.current.humidity,
                rainProb: res.data.forecast?.[0]?.rainChance || 0,
                windSpeed: res.data.current.windSpeed,
                forecast: res.data.current.condition
              });
            }
          } catch (err) {
            console.warn("Weather pre-fetch failed:", err);
          }
        },
        (err) => {
          console.warn("GPS Access declined:", err);
        }
      );
    }
  }, []);

  // Alert slider rotating interval
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveAlertIdx((prev) => (prev + 1) % 3);
    }, 8000);
    return () => clearInterval(interval);
  }, []);

  // Sync state language updates to context
  const handleLangSelect = (selectedCode) => {
    setLanguage(selectedCode);
    setContextLanguage(selectedCode);
    localStorage.setItem("sk-lang", selectedCode);
    setLangInitialized(true);
  };

  // Load history from localStorage when user/key or language/init changes
  useEffect(() => {
    if (!langInitialized) return;
    
    const saved = localStorage.getItem(historyKey);
    if (saved) {
      try {
        setMessages(JSON.parse(saved));
        return; // Don't set initial greeting if saved messages exist
      } catch (e) {
        console.error("Error loading chat history:", e);
      }
    }

    // Default system greeting if no history found
    const greetings = {
      en: "Namaste Kisan Bhai/Behan! I am **AgriExpert**, your elite AI agricultural assistant. Thank you for your hard work in feeding our nation.\n\nI can help you with:\n1. 🏥 **Disease Diagnostics** (Upload a photo of crop foliage)\n2. 🚜 **Marketplace Listings** (Sell crops or find organic seeds/fertilizers)\n3. 📅 **Weekly Sowing Calendars** (Custom advice for your soil)\n4. 💧 **Drip Irrigation Schedules** (Personalized run times)\n\nHow can I help you today?",
      hi: "नमस्ते किसान भाई/बहन! मैं **AgriExpert** हूँ, आपका एआई कृषि विशेषज्ञ। हमारे देश को अन्न देने के लिए आपका बहुत-बहुत धन्यवाद।\n\nमैं आपकी निम्नलिखित सहायता कर सकता हूँ:\n1. 🏥 **फसल रोग निदान** (तस्वीर अपलोड कर बीमारी पहचानें)\n2. 🚜 **फसल बिक्री/खरीद** (उपज बेचें या उच्च गुणवत्ता वाले उर्वरक/बीज खोजें)\n3. 📅 **साप्ताहिक कृषि कैलेंडर** (मिट्टी के अनुसार योजना)\n4. 💧 **ड्रिप सिंचाई अनुसूची** (सिंचाई का सही समय और पानी की मात्रा)\n\nआज मैं आपके लिए क्या कर सकता हूँ?",
      mr: "नमस्ते शेतकरी बंधू आणि भगिनींनो! मी **AgriExpert** आहे, तुमचा एआय कृषी सल्लागार. देशासाठी अन्न पिकवणाऱ्या आपल्या कष्टाला माझा सलाम.\n\nमी खालील बाबींमध्ये मदत करू शकतो:\n1. 🏥 **पीक रोग निदान** (बाधित पानाचा फोटो अपलोड करा)\n2. 🚜 **बाजार खरेदी-विक्री** (शेतमाल विक्री नोंदवा किंवा बियाणे/खते शोधा)\n3. 📅 **साप्ताहिक पीक वेळापत्रक** (मातीच्या प्रकारानुसार सल्ला)\n4. 💧 **ठिबक सिंचन वेळापत्रक** (नियोजनाचे मार्गदर्शन)\n\nआज आपण काय चर्चा करूया?"
    };

    setMessages([
      {
        sender: "ai",
        text: greetings[language] || greetings.en,
        timestamp: new Date()
      }
    ]);
  }, [language, langInitialized, historyKey]);

  // Persist messages to localStorage whenever they change
  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem(historyKey, JSON.stringify(messages));
    }
  }, [messages, historyKey]);

  // Handler to clear chat history
  const handleClearHistory = () => {
    if (!window.confirm(language === 'mr' ? 'तुम्हाला खरोखरच चॅट हिस्ट्री मिटवायची आहे का?' : 'Are you sure you want to clear your chat history?')) return;
    localStorage.removeItem(historyKey);
    
    const greetings = {
      en: "Namaste Kisan Bhai/Behan! I am **AgriExpert**, your elite AI agricultural assistant. Thank you for your hard work in feeding our nation.\n\nI can help you with:\n1. 🏥 **Disease Diagnostics** (Upload a photo of crop foliage)\n2. 🚜 **Marketplace Listings** (Sell crops or find organic seeds/fertilizers)\n3. 📅 **Weekly Sowing Calendars** (Custom advice for your soil)\n4. 💧 **Drip Irrigation Schedules** (Personalized run times)\n\nHow can I help you today?",
      hi: "नमस्ते किसान भाई/बहन! मैं **AgriExpert** हूँ, आपका एआई कृषि विशेषज्ञ। हमारे देश को अन्न देने के लिए आपका बहुत-बहुत धन्यवाद।\n\nमैं आपकी निम्नलिखित सहायता कर सकता हूँ:\n1. 🏥 **फसल रोग निदान** (तस्वीर अपलोड कर बीमारी पहचानें)\n2. 🚜 **फसल बिक्री/खरीद** (उपज बेचें या उच्च गुणवत्ता वाले उर्वरक/बीज खोजें)\n3. 📅 **साप्ताहिक कृषि कैलेंडर** (मिट्टी के अनुसार योजना)\n4. 💧 **ड्रिप सिंचाई अनुसूची** (सिंचाई का सही समय और पानी की मात्रा)\n\nआज मैं आपके लिए क्या कर सकता हूँ?",
      mr: "नमस्ते शेतकरी बंधू आणि भगिनींनो! मी **AgriExpert** आहे, तुमचा एआय कृषी सल्लागार. देशासाठी अन्न पिकवणाऱ्या आपल्या कष्टाला माझा सलाम.\n\nमी खालील बाबींमध्ये मदत करू शकतो:\n1. 🏥 **पीक रोग निदान** (बाधित पानाचा फोटो अपलोड करा)\n2. 🚜 **बाजार खरेदी-विक्री** (शेतमाल विक्री नोंदवा किंवा बियाणे/खते शोधा)\n3. 📅 **साप्ताहिक पीक वेळापत्रक** (मातीच्या प्रकारानुसार सल्ला)\n4. 💧 **ठिबक सिंचन वेळापत्रक** (नियोजनाचे मार्गदर्शन)\n\nआज आपण काय चर्चा करूया?"
    };

    setMessages([
      {
        sender: "ai",
        text: greetings[language] || greetings.en,
        timestamp: new Date()
      }
    ]);
  };

  const chatEndRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const handleSaveKey = (e) => {
    e.preventDefault();
    localStorage.setItem("sk_gemini_key", customKey);
    setShowKeyConfig(false);
  };

  // Convert uploaded image file to base64
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setBase64Image(reader.result.split(",")[1]);
      };
      reader.readAsDataURL(file);
    }
  };

  const clearAttachment = () => {
    setSelectedFile(null);
    setBase64Image("");
    setUploadUrl("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Main sending handler
  const handleSendMessage = async (textToSend) => {
    const inputContent = textToSend || inputText;
    if (!inputContent.trim() && !base64Image) return;

    let displayMessage = inputContent;
    const userMsg = {
      sender: "user",
      text: displayMessage,
      imagePreview: selectedFile ? URL.createObjectURL(selectedFile) : null,
      timestamp: new Date()
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText("");
    setLoading(true);

    try {
      const chatHistory = messages.map((m) => ({
        sender: m.sender,
        text: m.text
      }));

      const headers = {};
      if (customKey.trim()) {
        headers["x-gemini-key"] = customKey.trim();
      }

      // If an image is selected, upload it first to get the URL
      let localImageUrl = "";
      if (selectedFile) {
        const formData = new FormData();
        formData.append("image", selectedFile);
        try {
          const uploadRes = await api.post("/marketplace/upload", formData, {
            headers: { "Content-Type": "multipart/form-data" }
          });
          localImageUrl = uploadRes.data.imageUrl;
        } catch (uploadErr) {
          console.warn("Media upload failed, running inline diagnostics direct:", uploadErr);
        }
      }

      // Execute chat post request with context payload
      const response = await api.post(
        "/ai/chat",
        {
          message: inputContent + (activeMode === "diagnostics" ? " [Mode: Crop Disease Diagnostics]" : activeMode === "marketplace" ? " [Mode: Marketplace]" : ""),
          chatHistory,
          language,
          gps,
          weather,
          waterAvailability,
          cropHint: cropHint || undefined,
          image: base64Image ? {
            data: base64Image,
            mimeType: selectedFile.type
          } : undefined,
          imageUrl: localImageUrl || undefined
        },
        { headers }
      );

      const aiMsg = {
        sender: "ai",
        text: response.data.response,
        source: response.data.source,
        timestamp: new Date()
      };

      setMessages((prev) => [...prev, aiMsg]);
      clearAttachment();
    } catch (error) {
      console.error(error);
      setMessages((prev) => [
        ...prev,
        {
          sender: "ai",
          text: language === 'mr' 
            ? "कनेक्शन एरर. कृपया इंटरनेट तपासा आणि पुन्हा प्रयत्न करा." 
            : language === 'hi'
            ? "कनेक्शन त्रुटि। कृपया अपना इंटरनेट कनेक्शन जांचें और पुन: प्रयास करें।"
            : "I am having trouble connecting right now. Please verify your connection or Gemini Key, and try again.",
          timestamp: new Date()
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  // Intercept links inside AI messages and parse them
  const renderMessageContent = (text) => {
    if (!text) return null;

    // Direct routing regex match for marketplace links [Buy...](app://marketplace/search?query=Product)
    const marketplaceLinkRegex = /\[([^\]]+)\]\(app:\/\/marketplace\/search\?query=([^)]+)\)/g;

    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = marketplaceLinkRegex.exec(text)) !== null) {
      const textBefore = text.substring(lastIndex, match.index);
      if (textBefore) {
        parts.push(<span key={lastIndex} style={{ whiteSpace: "pre-wrap" }}>{textBefore}</span>);
      }

      const linkText = match[1];
      const query = decodeURIComponent(match[2]);

      parts.push(
        <button
          key={match.index}
          onClick={() => navigate(`/marketplace?search=${encodeURIComponent(query)}`)}
          className="bazaar-redirect-badge"
          title={`Search "${query}" on Marketplace`}
        >
          🛒 {linkText}
        </button>
      );

      lastIndex = marketplaceLinkRegex.lastIndex;
    }

    const textRemaining = text.substring(lastIndex);
    if (textRemaining) {
      parts.push(<span key={lastIndex} style={{ whiteSpace: "pre-wrap" }}>{textRemaining}</span>);
    }

    if (parts.length === 0) {
      return <div style={{ whiteSpace: "pre-wrap" }}>{text}</div>;
    }

    return <div>{parts}</div>;
  };

  // Welcome Initialization Panel
  if (!langInitialized) {
    return (
      <div className="lang-init-container">
        <div className="lang-init-card card">
          <span style={{ fontSize: 64, display: "block", marginBottom: 12 }}>🤖</span>
          <h2>AgriExpert Advisor</h2>
          <p style={{ color: "var(--text-muted)", fontSize: 14, marginBottom: 24 }}>
            {UI_TRANSLATIONS.en.initializingLang}
          </p>

          <div style={{ display: "grid", gap: 12 }}>
            <button className="button" style={{ background: "#0d9488" }} onClick={() => handleLangSelect("en")}>
              English (English)
            </button>
            <button className="button" style={{ background: "#d97706" }} onClick={() => handleLangSelect("mr")}>
              मराठी (Marathi)
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Active rotating alert message
  const alertList = ALERT_TRANSLATIONS[language] || ALERT_TRANSLATIONS.en;
  const currentAlert = alertList[activeAlertIdx];

  return (
    <div className="app-container">
      {/* Visual styles injection */}
      <style>{`
        .lang-init-container {
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: 80vh;
          padding: 20px;
        }
        .lang-init-card {
          width: 100%;
          max-width: 420px;
          text-align: center;
          padding: 32px;
          border-radius: 16px;
          box-shadow: 0 10px 25px rgba(0,0,0,0.15);
        }
        .bazaar-redirect-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: #ecfdf5;
          border: 1px solid #10b981;
          color: #065f46;
          font-weight: 700;
          font-size: 13px;
          padding: 6px 14px;
          border-radius: 20px;
          cursor: pointer;
          margin: 6px 0;
          transition: all 0.2s;
        }
        .bazaar-redirect-badge:hover {
          background: #d1fae5;
          transform: translateY(-1px);
        }
        .alert-ribbon {
          background: #fffbeb;
          border-left: 5px solid #d97706;
          color: #92400e;
          padding: 12px 16px;
          border-radius: 8px;
          margin-bottom: 16px;
          font-size: 13.5px;
          display: flex;
          align-items: center;
          gap: 12px;
          animation: fadeIn 0.4s ease;
        }
        .meta-badges-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
          gap: 8px;
          margin-bottom: 16px;
        }
        .meta-badge {
          background: var(--bg-card);
          border: 1px solid var(--border-color);
          padding: 8px 12px;
          border-radius: 8px;
          font-size: 11px;
          color: var(--text-muted);
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .meta-badge-active {
          border-color: #10b981;
          background: #ecfdf5;
          color: #065f46;
        }
        .mode-selection-tabs {
          display: flex;
          gap: 8px;
          margin-bottom: 16px;
        }
        .mode-tab {
          flex: 1;
          padding: 10px 4px;
          background: var(--bg-card);
          border: 1px solid var(--border-color);
          border-radius: 8px;
          font-size: 11.5px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s;
          color: var(--text-muted);
        }
        .mode-tab-active {
          background: #0ea5e9;
          border-color: #0284c7;
          color: white;
        }
        .chat-image-preview-box {
          display: flex;
          align-items: center;
          gap: 10px;
          background: var(--bg-card);
          padding: 8px;
          border-radius: 8px;
          border: 1px dashed var(--border-color);
          margin-bottom: 10px;
        }
      `}</style>



      <div className="chat-container">
        
        {/* Left Side: AgriExpert Settings & Metadata Context */}
        <aside className="chat-sidebar" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <h2>🌿 {ui.sidebarTitle}</h2>
          <p style={{ fontSize: 13, color: "var(--text-muted)", margin: 0 }}>
            {ui.sidebarDesc}
          </p>

          <hr style={{ borderColor: "var(--border-color)", margin: 0 }} />

          {/* Sync Stats Badges */}
          <div>
            <label style={{ fontSize: 12, fontWeight: 700, marginBottom: 8, display: "block" }}>🛰️ Metadata Sync</label>
            <div className="meta-badges-grid">
              <div className={`meta-badge ${gps ? "meta-badge-active" : ""}`}>
                <span>📍</span>
                <span>{gps ? ui.gpsStatus : "GPS Pending..."}</span>
              </div>
              <div className={`meta-badge ${weather ? "meta-badge-active" : ""}`}>
                <span>🌤️</span>
                <span>{weather ? `${weather.temp}°C · ${ui.weatherSync}` : "Weather Pending..."}</span>
              </div>
            </div>
          </div>

          {/* Water Availability Input */}
          <div>
            <label style={{ fontSize: 12, fontWeight: 700, marginBottom: 4, display: "block" }}>💧 {ui.waterSource}</label>
            <select
              className="input"
              value={waterAvailability}
              onChange={(e) => setWaterAvailability(e.target.value)}
              style={{ padding: 8, fontSize: 12.5 }}
            >
              <option value="">{ui.waterPlaceholder}</option>
              <option value="Rainfed">{ui.rainfed}</option>
              <option value="Borewell">{ui.borewell}</option>
              <option value="Canal">{ui.canal}</option>
              <option value="Drip">{ui.drip}</option>
            </select>
          </div>

          {/* Mode Selector Tab */}
          <div>
            <label style={{ fontSize: 12, fontWeight: 700, marginBottom: 6, display: "block" }}>🛠️ {ui.assistantMode}</label>
            <div className="mode-selection-tabs">
              <button 
                className={`mode-tab ${activeMode === "advisory" ? "mode-tab-active" : ""}`}
                onClick={() => { setActiveMode("advisory"); clearAttachment(); }}
              >
                💬 {ui.modeAdvisory}
              </button>
              <button 
                className={`mode-tab ${activeMode === "diagnostics" ? "mode-tab-active" : ""}`}
                onClick={() => setActiveMode("diagnostics")}
              >
                🏥 {ui.modeDiagnostics}
              </button>
              <button 
                className={`mode-tab ${activeMode === "marketplace" ? "mode-tab-active" : ""}`}
                onClick={() => { setActiveMode("marketplace"); clearAttachment(); }}
              >
                🛒 {ui.modeMarketplace}
              </button>
            </div>
          </div>

          {/* Sourcing Quick Helpers */}
          {activeMode === "marketplace" && (
            <div style={{ display: "flex", gap: 8, animation: "fadeIn 0.2s" }}>
              <button 
                className="button button-secondary" 
                style={{ flex: 1, padding: "8px 4px", fontSize: 11, background: "#ecfdf5", border: "1px solid #10b981", color: "#065f46" }}
                onClick={() => handleSendMessage("I want to buy raw materials for farming")}
              >
                {ui.buyingBtn}
              </button>
              <button 
                className="button button-secondary" 
                style={{ flex: 1, padding: "8px 4px", fontSize: 11, background: "#fef3c7", border: "1px solid #d97706", color: "#92400e" }}
                onClick={() => handleSendMessage("I want to list surplus crop produce to sell")}
              >
                {ui.sellingBtn}
              </button>
            </div>
          )}

          {/* Crop hint for diagnostics */}
          {activeMode === "diagnostics" && (
            <div style={{ animation: "fadeIn 0.2s" }}>
              <label style={{ fontSize: 11.5, fontWeight: 600 }}>{ui.cropHintLabel}</label>
              <input
                type="text"
                className="input"
                style={{ padding: "6px 8px", fontSize: 12, marginTop: 4 }}
                placeholder="e.g. Tomato, Rice"
                value={cropHint}
                onChange={(e) => setCropHint(e.target.value)}
              />
            </div>
          )}

          {/* Settings / Configuration */}
          <div style={{ marginTop: "auto" }}>
            <label style={{ fontSize: 11.5, color: "var(--text-muted)" }}>{ui.langPickerLabel}</label>
            <select
              className="input"
              value={language}
              onChange={(e) => handleLangSelect(e.target.value)}
              style={{ padding: 6, fontSize: 12, marginTop: 4, marginBottom: 12 }}
            >
              <option value="en">English</option>
              <option value="mr">मराठी (Marathi)</option>
            </select>
            
            <button
              onClick={handleClearHistory}
              style={{
                width: "100%",
                background: "rgba(220, 38, 38, 0.08)",
                color: "#dc2626",
                border: "1px solid rgba(220, 38, 38, 0.2)",
                borderRadius: 8,
                padding: "8px 12px",
                fontSize: 12,
                fontWeight: 700,
                cursor: "pointer",
                transition: "all 0.2s"
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(220, 38, 38, 0.15)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "rgba(220, 38, 38, 0.08)";
              }}
            >
              🗑️ {language === 'mr' ? 'चॅट इतिहास पुसा' : language === 'hi' ? 'चैट इतिहास साफ करें' : 'Clear Chat History'}
            </button>
          </div>

          {showKeyConfig && (
            <div className="card" style={{ padding: 12, border: "1px solid var(--accent)" }}>
              <form onSubmit={handleSaveKey}>
                <label style={{ fontSize: 11 }}>Enter Google Gemini API Key</label>
                <input
                  type="password"
                  className="input"
                  placeholder="AIzaSy..."
                  value={customKey}
                  onChange={(e) => setCustomKey(e.target.value)}
                  style={{ marginBottom: 8, padding: 6, fontSize: 12 }}
                />
                <div style={{ display: "flex", gap: 8 }}>
                  <button type="submit" className="button" style={{ padding: "4px 8px", fontSize: 11 }}>
                    Save
                  </button>
                  <button 
                    type="button" 
                    className="button button-secondary" 
                    style={{ padding: "4px 8px", fontSize: 11 }}
                    onClick={() => {
                      setCustomKey("");
                      localStorage.removeItem("sk_gemini_key");
                    }}
                  >
                    Clear
                  </button>
                </div>
              </form>
            </div>
          )}
        </aside>

        {/* Right Side: Chat Panel */}
        <main className="chat-main">
          <header className="chat-header" style={{ background: "linear-gradient(135deg, #0d9488 0%, #15803d 100%)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ fontSize: 28 }}>🤖</div>
              <div>
                <h3 style={{ fontSize: 16, color: "white", margin: 0 }}>AgriExpert</h3>
                <p style={{ fontSize: 11, color: "rgba(255,255,255,0.85)", margin: 0 }}>
                  {language === 'mr' ? 'अचूक आणि जलद कृषी सल्लागार' : language === 'hi' ? 'सटीक और कुशल कृषि सलाहकार' : 'Elite Agricultural Specialist & Advisor'}
                </p>
              </div>
            </div>
            <div style={{ fontSize: 11.5, background: "rgba(255,255,255,0.2)", padding: "4px 10px", borderRadius: 12, color: "white", fontWeight: 700 }}>
              {activeMode === "diagnostics" ? ui.modeDiagnostics : activeMode === "marketplace" ? ui.modeMarketplace : ui.modeAdvisory}
            </div>
          </header>

          {/* Messages Area */}
          <div className="chat-history">
            {messages.map((m, idx) => (
              <div 
                key={idx} 
                className={`chat-bubble ${m.sender === "user" ? "chat-bubble-user" : "chat-bubble-ai"}`}
              >
                {/* Image message attachment preview */}
                {m.imagePreview && (
                  <div style={{ marginBottom: 8 }}>
                    <img 
                      src={m.imagePreview} 
                      alt="Crop Foliage Attachment" 
                      style={{ maxWidth: "200px", borderRadius: 8, border: "1px solid var(--border-color)" }} 
                    />
                  </div>
                )}
                
                {/* Parsed and formatted message */}
                {renderMessageContent(m.text)}

                {m.source && (
                  <div style={{ fontSize: 9, opacity: 0.65, textAlign: "right", marginTop: 6 }}>
                    {language === 'mr' ? 'द्वारे' : 'via'} {m.source === "gemini" ? "Google Gemini 1.5 Flash" : m.source === "groq" ? "Groq LLM Engine" : (language === 'mr' ? "AgriExpert डेटाबेस" : "AgriExpert Database")}
                  </div>
                )}
              </div>
            ))}
            
            {loading && (
              <div className="chat-bubble chat-bubble-ai" style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <span className="spinner-dot"></span>
                <span style={{ fontSize: 12.5, color: "var(--text-muted)" }}>
                  {language === 'mr' ? 'ॲग्रीएक्सपर्ट विचार करत आहे...' : language === 'hi' ? 'एग्रीएक्सपर्ट विचार कर रहा है...' : 'AgriExpert is analyzing...'}
                </span>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Quick trigger Chips */}
          <div className="chat-chips">
            {(CHIPS_TRANSLATIONS[language] || CHIPS_TRANSLATIONS.en).map((chip, idx) => (
              <button 
                key={idx} 
                type="button" 
                className="chat-chip"
                onClick={() => handleSendMessage(chip)}
              >
                {chip}
              </button>
            ))}
          </div>

          {/* Image preview in message input bar */}
          {selectedFile && (
            <div className="chat-image-preview-box">
              <img 
                src={URL.createObjectURL(selectedFile)} 
                alt="Selected preview" 
                style={{ width: 40, height: 40, objectFit: "cover", borderRadius: 4 }} 
              />
              <div style={{ flex: 1, fontSize: 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {ui.uploadPlaceholder}: <strong>{selectedFile.name}</strong>
              </div>
              <button 
                type="button" 
                onClick={clearAttachment} 
                style={{ background: "#ef4444", border: "none", color: "white", padding: "2px 6px", borderRadius: 4, cursor: "pointer", fontSize: 11 }}
              >
                ✕
              </button>
            </div>
          )}

          {/* Input Area */}
          <div className="chat-input-area">
            {activeMode === "diagnostics" && (
              <>
                <input
                  type="file"
                  accept="image/*"
                  ref={fileInputRef}
                  style={{ display: "none" }}
                  onChange={handleFileChange}
                />
                <button
                  type="button"
                  className="button button-secondary"
                  style={{ margin: 0, padding: "10px 14px", display: "flex", alignItems: "center", gap: 4 }}
                  onClick={() => fileInputRef.current?.click()}
                  title={ui.imageUpload}
                >
                  📷 {ui.uploadBtn}
                </button>
              </>
            )}

            <input
              type="text"
              className="input"
              style={{ flex: 1, margin: 0 }}
              placeholder={ui.placeholderText}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSendMessage();
              }}
            />
            
            <button 
              className="button"
              style={{ margin: 0, padding: "10px 16px" }}
              onClick={() => handleSendMessage()}
              disabled={loading || (!inputText.trim() && !base64Image)}
            >
              {ui.sendBtn}
            </button>
          </div>
        </main>

      </div>
    </div>
  );
};

export default KisanChat;
