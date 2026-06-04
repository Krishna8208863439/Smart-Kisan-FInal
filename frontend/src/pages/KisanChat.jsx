import React, { useState, useEffect, useRef } from "react";
import api from "../api";

const CHIPS = [
  "What fertilizer is best for tomato?",
  "How to treat early blight in paddy?",
  "Tips for organic composting",
  "How often should I water wheat?",
  "Whiteflies control recommendations"
];

const KisanChat = () => {
  const [messages, setMessages] = useState([
    {
      sender: "ai",
      text: "Namaste! Welcome to Kisan AI Assistant. How can I help you today with your farming decisions?",
      timestamp: new Date()
    }
  ]);
  const [inputText, setInputText] = useState("");
  const [language, setLanguage] = useState("en");
  const [loading, setLoading] = useState(false);
  const [customKey, setCustomKey] = useState(localStorage.getItem("sk_gemini_key") || "");
  const [showKeyConfig, setShowKeyConfig] = useState(false);
  
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
          <h2>Kisan AI Copilot</h2>
          <p style={{ fontSize: 13, color: "var(--text-muted)" }}>
            An intelligent advisor designed to assist with crop diagnosis, watering advice, and soil nutrient planning.
          </p>

          <div>
            <label>Select Language</label>
            <select
              className="input"
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              style={{ marginTop: 4 }}
            >
              <option value="en">English</option>
              <option value="hi">हिन्दी (Hindi)</option>
            </select>
          </div>

          <div style={{ marginTop: "auto" }}>
            <button 
              className="button button-secondary" 
              style={{ width: "100%" }}
              onClick={() => setShowKeyConfig(!showKeyConfig)}
            >
              ⚙️ Gemini Key Config
            </button>
            <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 6, textAlign: "center" }}>
              {customKey ? "✅ Custom key enabled" : "⚠️ Running in offline/standard mode"}
            </p>
          </div>

          {showKeyConfig && (
            <div className="card" style={{ marginTop: 12, padding: 12, border: "1px solid var(--accent)" }}>
              <form onSubmit={handleSaveKey}>
                <label style={{ fontSize: 12 }}>Enter Google Gemini API Key</label>
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
                    Save
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
                    Clear
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
                <h3 style={{ fontSize: 16 }}>Kisan AI</h3>
                <p style={{ fontSize: 11, opacity: 0.85 }}>Your Smart Farm Advisor</p>
              </div>
            </div>
            <div style={{ fontSize: 12, background: "rgba(255,255,255,0.2)", padding: "4px 8px", borderRadius: 4 }}>
              Multilingual Advisor
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
                    via {m.source === "gemini" ? "Google Gemini" : "Local Kisan Database"}
                  </div>
                )}
              </div>
            ))}
            
            {loading && (
              <div className="chat-bubble chat-bubble-ai" style={{ display: "flex", gap: 4, alignItems: "center" }}>
                <span style={{ fontSize: 12 }}>Thinking...</span>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Prompt Chips */}
          <div className="chat-chips">
            {CHIPS.map((chip, idx) => (
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
              placeholder="Ask about soil, crops, fertilizers, irrigation..."
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
              Send 🚀
            </button>
          </div>
        </main>

      </div>
    </div>
  );
};

export default KisanChat;
