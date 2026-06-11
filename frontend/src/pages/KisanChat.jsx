import React, { useState, useEffect, useRef } from "react";
import api from "../api";
import { useLanguage } from "../context/LanguageContext";

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

const KisanChat = () => {
  const { language: contextLang, t } = useLanguage();
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState("");
  const [language, setLanguage] = useState(contextLang === 'mr' ? 'mr' : 'en');
  const [loading, setLoading] = useState(false);
  const [customKey, setCustomKey] = useState(localStorage.getItem("sk_gemini_key") || "");
  const [showKeyConfig, setShowKeyConfig] = useState(false);

  useEffect(() => {
    if (contextLang) {
      setLanguage(contextLang === 'mr' ? 'mr' : 'en');
    }
  }, [contextLang]);

  useEffect(() => {
    const welcomeText = language === 'mr'
      ? "नमस्ते! किसान एआई सहाय्यकामध्ये आपले स्वागत आहे. आज मी आपल्या शेतीच्या निर्णयांमध्ये कशी मदत करू शकतो?"
      : language === 'hi'
      ? "नमस्ते! किसान एआई असिस्टेंट में आपका स्वागत है। आज मैं आपकी कृषि निर्णयों में कैसे मदद कर सकता हूँ?"
      : "Namaste! Welcome to Kisan AI Assistant. How can I help you today with your farming decisions?";
    
    setMessages([
      {
        sender: "ai",
        text: welcomeText,
        timestamp: new Date()
      }
    ]);
  }, [language]);
  
  const chatEndRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const handleSaveKey = (e) => {
    e.preventDefault();
    localStorage.setItem("sk_gemini_key", customKey);
    setShowKeyConfig(false);
  };

  const handleSendMessage = async (textToSend) => {
    if (!textToSend.trim()) return;

    const userMsg = {
      sender: "user",
      text: textToSend,
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

      // Call our backend endpoint, passing custom key in headers if present
      const headers = {};
      if (customKey.trim()) {
        headers["x-gemini-key"] = customKey.trim();
      }

      const response = await api.post(
        "/ai/chat",
        {
          message: textToSend,
          chatHistory,
          language
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
    } catch (error) {
      console.error(error);
      setMessages((prev) => [
        ...prev,
        {
          sender: "ai",
          text: "I am having trouble connecting right now. Please verify your connection or Gemini Key, and try again.",
          timestamp: new Date()
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-container">
      <div className="chat-container">
        
        {/* Left Side: Controls & Info */}
        <aside className="chat-sidebar">
          <h2>{language === 'mr' ? 'किसान एआय को-पायलट' : 'Kisan AI Copilot'}</h2>
          <p style={{ fontSize: 13, color: "var(--text-muted)" }}>
            {language === 'mr' 
              ? 'पीक निदान, पाणी व्यवस्थापन आणि मातीचे खत नियोजन यासाठी शेती सहाय्यक.' 
              : 'An intelligent advisor designed to assist with crop diagnosis, watering advice, and soil nutrient planning.'}
          </p>

          <div>
            <label>{language === 'mr' ? 'भाषा निवडा' : 'Select Language'}</label>
            <select
              className="input"
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              style={{ marginTop: 4 }}
            >
              <option value="en">English</option>
              <option value="mr">मराठी (Marathi)</option>
              <option value="hi">हिन्दी (Hindi)</option>
            </select>
          </div>

          <div style={{ marginTop: "auto" }}>
            <button 
              className="button button-secondary" 
              style={{ width: "100%" }}
              onClick={() => setShowKeyConfig(!showKeyConfig)}
            >
              {language === 'mr' ? '⚙️ जेमिनी की कॉन्फिगरेशन' : '⚙️ Gemini Key Config'}
            </button>
            <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 6, textAlign: "center" }}>
              {language === 'mr'
                ? (customKey ? "✅ सानुकूल की सक्रिय केली" : "⚠️ ऑफलाइन / मानक मोडमध्ये चालू")
                : (customKey ? "✅ Custom key enabled" : "⚠️ Running in offline/standard mode")}
            </p>
          </div>

          {showKeyConfig && (
            <div className="card" style={{ marginTop: 12, padding: 12, border: "1px solid var(--accent)" }}>
              <form onSubmit={handleSaveKey}>
                <label style={{ fontSize: 12 }}>{language === 'mr' ? 'गुगल जेमिनी API की टाका' : 'Enter Google Gemini API Key'}</label>
                <input
                  type="password"
                  className="input"
                  placeholder="AIzaSy..."
                  value={customKey}
                  onChange={(e) => setCustomKey(e.target.value)}
                  style={{ marginBottom: 8, padding: 8 }}
                />
                <div style={{ display: "flex", gap: 8 }}>
                  <button type="submit" className="button" style={{ padding: "4px 8px", fontSize: 12 }}>
                    {language === 'mr' ? 'जतन करा' : 'Save'}
                  </button>
                  <button 
                    type="button" 
                    className="button button-secondary" 
                    style={{ padding: "4px 8px", fontSize: 12 }}
                    onClick={() => {
                      setCustomKey("");
                      localStorage.removeItem("sk_gemini_key");
                    }}
                  >
                    {language === 'mr' ? 'साफ करा' : 'Clear'}
                  </button>
                </div>
              </form>
            </div>
          )}
        </aside>

        {/* Right Side: Chat Panel */}
        <main className="chat-main">
          <header className="chat-header">
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ fontSize: 24 }}>🤖</div>
              <div>
                <h3 style={{ fontSize: 16 }}>{language === 'mr' ? 'किसान एआय' : 'Kisan AI'}</h3>
                <p style={{ fontSize: 11, opacity: 0.85 }}>{language === 'mr' ? 'तुमचा स्मार्ट शेती सल्लागार' : 'Your Smart Farm Advisor'}</p>
              </div>
            </div>
            <div style={{ fontSize: 12, background: "rgba(255,255,255,0.2)", padding: "4px 8px", borderRadius: 4 }}>
              {language === 'mr' ? 'बहुभाषिक सल्लागार' : 'Multilingual Advisor'}
            </div>
          </header>

          {/* Messages Area */}
          <div className="chat-history">
            {messages.map((m, idx) => (
              <div 
                key={idx} 
                className={`chat-bubble ${m.sender === "user" ? "chat-bubble-user" : "chat-bubble-ai"}`}
              >
                <div>{m.text}</div>
                {m.source && (
                  <div style={{ fontSize: 9, opacity: 0.7, textAlign: "right", marginTop: 4 }}>
                    {language === 'mr' ? 'द्वारे' : 'via'} {m.source === "gemini" ? "Google Gemini" : (language === 'mr' ? "स्थानिक किसान डेटाबेस" : "Local Kisan Database")}
                  </div>
                )}
              </div>
            ))}
            
            {loading && (
              <div className="chat-bubble chat-bubble-ai" style={{ display: "flex", gap: 4, alignItems: "center" }}>
                <span style={{ fontSize: 12 }}>{language === 'mr' ? 'विचार करत आहे...' : 'Thinking...'}</span>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Prompt Chips */}
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

          {/* Input Area */}
          <div className="chat-input-area">
            <input
              type="text"
              className="input"
              style={{ flex: 1, margin: 0 }}
              placeholder={language === 'mr' ? 'माती, पिके, खते, सिंचन याबद्दल विचारा...' : 'Ask about soil, crops, fertilizers, irrigation...'}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSendMessage(inputText);
              }}
            />
            <button 
              className="button"
              onClick={() => handleSendMessage(inputText)}
              disabled={loading || !inputText.trim()}
            >
              {language === 'mr' ? 'पाठवा 🚀' : 'Send 🚀'}
            </button>
          </div>
        </main>

      </div>
    </div>
  );
};

export default KisanChat;
