import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useLanguage } from "../context/LanguageContext";
import { useAuth } from "../context/AuthContext";
import CropDiseaseDetectionSection from "../components/CropDiseaseDetectionSection";
import api from "../api";

const getFallbackImage = (product) => {
  if (!product) return "https://images.unsplash.com/photo-1592982537447-7440770cbfc8?auto=format&fit=crop&w=300&q=80";
  const name = (product.name || "").toLowerCase();
  const cat = (product.category || "").toLowerCase();
  if (name.includes("tomato")) return "https://images.unsplash.com/photo-1592924357228-91a4daadcfea?auto=format&fit=crop&w=300&q=80";
  if (name.includes("wheat")) return "https://images.unsplash.com/photo-1506619216599-9d16d0903dfd?auto=format&fit=crop&w=300&q=80";
  if (name.includes("potato")) return "https://images.unsplash.com/photo-1518977676601-b53f82aba655?auto=format&fit=crop&w=300&q=80";
  if (name.includes("rice")) return "https://images.unsplash.com/photo-1536304997881-a372c179924b?auto=format&fit=crop&w=300&q=80";
  if (name.includes("mustard")) return "https://images.unsplash.com/photo-1528825871115-3581a5387919?auto=format&fit=crop&w=300&q=80";
  if (name.includes("chilli") || name.includes("chili")) return "https://images.unsplash.com/photo-1596797038530-2c107229654b?auto=format&fit=crop&w=300&q=80";
  if (name.includes("cotton")) return "https://images.unsplash.com/photo-1604928141064-207ec6f57e42?auto=format&fit=crop&w=300&q=80";
  
  if (cat === "seeds") return "https://images.unsplash.com/photo-1523301343968-6a6ebf63c672?auto=format&fit=crop&w=300&q=80";
  if (cat === "fertilizers") return "https://images.unsplash.com/photo-1628352081506-83c43123ed6d?auto=format&fit=crop&w=300&q=80";
  if (cat === "tools" || cat === "equipment") return "https://images.unsplash.com/photo-1508514177221-188b1cf16e9d?auto=format&fit=crop&w=300&q=80";
  if (cat === "pesticides") return "https://images.unsplash.com/photo-1599599810769-bcde5a160d32?auto=format&fit=crop&w=300&q=80";
  
  return "https://images.unsplash.com/photo-1592982537447-7440770cbfc8?auto=format&fit=crop&w=300&q=80";
};

const getProductImageUrl = (url) => {
  if (!url) return "";
  if (
    url.includes("1530595467537") ||
    url.includes("1599819811279") ||
    url.includes("1592417817098") ||
    url.includes("1416879595882") ||
    url.includes("1593113630400") ||
    url.includes("1563514227147")
  ) {
    return ""; // Force fallback
  }
  const backendBase = typeof window !== "undefined" && window.location.hostname !== "localhost" && window.location.hostname !== "127.0.0.1"
    ? window.location.origin
    : (import.meta.env.VITE_API_URL || "http://localhost:5000");
  if (url.startsWith("http://localhost:5000")) {
    return url.replace("http://localhost:5000", backendBase);
  }
  if (url.startsWith("/uploads")) {
    return `${backendBase}${url}`;
  }
  return url;
};

const WeatherWidget = () => {
  const { language } = useLanguage();
  const [weather, setWeather] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchWidgetWeather = async () => {
      try {
        const city = localStorage.getItem("sk_last_city") || "New Delhi";
        const res = await api.get("/weather", { params: { location: city } });
        setWeather(res.data);
      } catch (err) {
        console.error("Failed to load weather widget:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchWidgetWeather();
  }, []);

  if (loading) {
    return (
      <div className="card" style={{ display: "flex", justifyContent: "center", alignItems: "center", padding: 20, marginBottom: 24, minHeight: 80 }}>
        <div className="weather-spinner" style={{ width: 20, height: 20, borderWidth: 3 }} />
        <span style={{ marginLeft: 12, fontSize: 13, color: "var(--text-muted)", fontWeight: 600 }}>Loading live weather...</span>
      </div>
    );
  }

  if (!weather || !weather.current) return null;

  const { current, location } = weather;

  return (
    <div 
      className="card" 
      style={{ 
        display: "flex", 
        flexDirection: "row", 
        justifyContent: "space-between", 
        alignItems: "center", 
        padding: "16px 20px", 
        marginBottom: 24, 
        background: "var(--bg-card)",
        border: "1px solid var(--border-color)",
        flexWrap: "wrap",
        gap: 16
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <span style={{ fontSize: 32 }}>{current.icon}</span>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <strong style={{ fontSize: 18, color: "var(--text-dark)" }}>{current.temperature}°C</strong>
            <span style={{ fontSize: 11, color: "var(--text-muted)", background: "var(--primary-light)", padding: "1px 6px", borderRadius: 4, fontWeight: 700 }}>
              {current.condition}
            </span>
          </div>
          <div style={{ fontSize: 12.5, color: "var(--text-muted)", marginTop: 2 }}>
            📍 {location} • Feels like {current.feelsLike}°C
          </div>
        </div>
      </div>

      <div style={{ display: "flex", gap: 20, flexWrap: "wrap", fontSize: 12.5, color: "var(--text-dark)" }}>
        <div>
          <span style={{ color: "var(--text-muted)" }}>Humidity: </span>
          <strong>{current.humidity}%</strong>
        </div>
        <div>
          <span style={{ color: "var(--text-muted)" }}>Wind: </span>
          <strong>{current.windSpeed} km/h</strong>
        </div>
        <div>
          <span style={{ color: "var(--text-muted)" }}>Rain: </span>
          <strong>{current.precipitation} mm</strong>
        </div>
      </div>

      <Link to="/weather" style={{ fontSize: 13, fontWeight: 700, color: "var(--primary)", textDecoration: "none" }}>
        Full Forecast →
      </Link>
    </div>
  );
};

const Dashboard = () => {
  const { language } = useLanguage();
  const { user } = useAuth();
  const isMerchant = user?.role === "merchant";

  // State for Merchant Dashboard
  const [products, setProducts] = useState([]);
  const [buyRequests, setBuyRequests] = useState([]);
  const [contracts, setContracts] = useState([]);
  const [loadingMerchant, setLoadingMerchant] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showRequestForm, setShowRequestForm] = useState(false);

  // Forms
  const [addForm, setAddForm] = useState({
    name: "",
    category: "Seeds",
    price: "",
    unit: "/kg",
    image: "",
    description: ""
  });
  const [requestForm, setRequestForm] = useState({
    cropName: "",
    quantity: "",
    unit: "quintal",
    targetPrice: "",
    description: ""
  });

  const fetchMerchantData = async () => {
    if (!isMerchant) return;
    setLoadingMerchant(true);
    try {
      const prodRes = await api.get("/marketplace");
      setProducts(prodRes.data);
      const reqRes = await api.get("/marketplace/buy-requests");
      setBuyRequests(reqRes.data);
      const contractRes = await api.get("/marketplace/contracts");
      setContracts(contractRes.data);
    } catch (err) {
      console.error("Error loading merchant data:", err);
    } finally {
      setLoadingMerchant(false);
    }
  };

  useEffect(() => {
    if (isMerchant) {
      fetchMerchantData();
    }
  }, [isMerchant]);

  // Handlers
  const handleAddProduct = async (e) => {
    e.preventDefault();
    try {
      await api.post("/marketplace", addForm);
      alert("Input product listed successfully!");
      setAddForm({
        name: "",
        category: "Seeds",
        price: "",
        unit: "/kg",
        image: "",
        description: ""
      });
      setShowAddForm(false);
      fetchMerchantData();
    } catch (err) {
      alert("Failed to add product: " + (err.response?.data?.message || err.message));
    }
  };

  const handleAddBuyRequest = async (e) => {
    e.preventDefault();
    try {
      await api.post("/marketplace/buy-requests", requestForm);
      alert("Buy request posted successfully!");
      setRequestForm({
        cropName: "",
        quantity: "",
        unit: "quintal",
        targetPrice: "",
        description: ""
      });
      setShowRequestForm(false);
      fetchMerchantData();
    } catch (err) {
      alert("Failed to post buy request: " + (err.response?.data?.message || err.message));
    }
  };

  const handleDeleteProduct = async (id) => {
    if (!window.confirm("Are you sure you want to pull this input listing?")) return;
    try {
      await api.delete(`/marketplace/${id}`);
      fetchMerchantData();
    } catch (err) {
      alert("Failed to delete product");
    }
  };

  const handleDeleteBuyRequest = async (id) => {
    if (!window.confirm("Are you sure you want to pull this buy request?")) return;
    try {
      await api.delete(`/marketplace/buy-requests/${id}`);
      fetchMerchantData();
    } catch (err) {
      alert("Failed to delete buy request");
    }
  };

  const handleUpdateContractStatus = async (id, nextStatus) => {
    try {
      await api.patch(`/marketplace/contracts/${id}`, { status: nextStatus });
      alert(`Contract status updated to: ${nextStatus}`);
      fetchMerchantData();
    } catch (err) {
      alert("Failed to update status");
    }
  };

  const handleBuyProduce = async (product) => {
    try {
      const cleanName = product.name;
      const cleanPrice = product.price;
      const cleanUnit = product.unit ? product.unit.replace(/^\//, "") : "kg";
      const qtyInput = window.prompt(`Enter wholesale quantity (in ${cleanUnit}) to buy:`, "50");
      if (!qtyInput) return;
      const quantity = Number(qtyInput);
      if (isNaN(quantity) || quantity <= 0) {
        alert("Please enter a valid quantity.");
        return;
      }
      
      await api.post("/marketplace/contracts", {
        cropName: cleanName,
        quantity: quantity,
        unit: cleanUnit,
        price: cleanPrice,
        sellerName: product.seller
      });
      
      alert(`🎉 Bulk Purchase Contract created successfully!\n\nContract negotiated with Farmer ${product.seller} for ${quantity} ${cleanUnit} of ${cleanName} at total contract value ₹${(cleanPrice * quantity).toLocaleString()}.\n\nView details in your Wholesale Contracts Ledger below!`);
      fetchMerchantData();
    } catch (err) {
      console.error(err);
      alert("Failed to create contract: " + (err.response?.data?.message || err.message));
    }
  };

  if (isMerchant) {
    const myStoreListings = products.filter(p => p.seller === user?.name || p.sellerId);
    const farmerProduceListings = products.filter(p => p.category === "Produce");

    return (
      <div className="app-container">
        {/* Welcome Banner */}
        <div className="card" style={{ background: "linear-gradient(135deg, #0284c7, #0369a1)", color: "white", padding: 24, marginBottom: 24 }}>
          <h1 style={{ fontSize: 26, fontWeight: 800 }}>
            {language === "mr" ? "व्यापारी डॅशबोर्ड" : "Merchant Dashboard"}
          </h1>
          <p style={{ opacity: 0.9, marginTop: 4 }}>
            {language === "mr" 
              ? "स्मार्ट किसान व्यापारी पोर्टलवर आपले स्वागत आहे! पीक पुरवठा सूची व्यवस्थापित करा, शेतकऱ्यांचे घाऊक धान्य खरेदी करा आणि व्यापार वाढवा."
              : "Welcome to the Smart Kisan Merchant Portal! Manage your input supply listings, review wholesale crop offers listed directly by farmers, or post crop buy requests."}
          </p>
        </div>

        {/* Live Weather Widget */}
        <WeatherWidget />

        {/* Quick Metrics */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, marginBottom: 24 }}>
          <div className="card" style={{ textAlign: "center", padding: 20 }}>
            <div style={{ fontSize: 28 }}>📦</div>
            <strong style={{ fontSize: 24, color: "var(--text-dark)" }}>{myStoreListings.length}</strong>
            <div style={{ fontSize: 12.5, color: "var(--text-muted)", marginTop: 4 }}>
              {language === "mr" ? "स्टोअर मधील उत्पादने" : "My Input Store Items"}
            </div>
          </div>
          <div className="card" style={{ textAlign: "center", padding: 20 }}>
            <div style={{ fontSize: 28 }}>🌾</div>
            <strong style={{ fontSize: 24, color: "#16a34a" }}>{farmerProduceListings.length}</strong>
            <div style={{ fontSize: 12.5, color: "var(--text-muted)", marginTop: 4 }}>
              {language === "mr" ? "शेतकऱ्यांचे पीक विक्री ऑफर्स" : "Farmer Produce Offers"}
            </div>
          </div>
          <div className="card" style={{ textAlign: "center", padding: 20 }}>
            <div style={{ fontSize: 28 }}>🤝</div>
            <strong style={{ fontSize: 24, color: "#0284c7" }}>{buyRequests.length}</strong>
            <div style={{ fontSize: 12.5, color: "var(--text-muted)", marginTop: 4 }}>
              {language === "mr" ? "सक्रिय खरेदी मागण्या" : "Active B2B Buy Requests"}
            </div>
          </div>
          <div className="card" style={{ textAlign: "center", padding: 20 }}>
            <div style={{ fontSize: 28 }}>📜</div>
            <strong style={{ fontSize: 24, color: "#7c3aed" }}>{contracts.length}</strong>
            <div style={{ fontSize: 12.5, color: "var(--text-muted)", marginTop: 4 }}>
              {language === "mr" ? "घाऊक करार" : "Wholesale Contracts"}
            </div>
          </div>
        </div>

        {/* Primary Sections Split / Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 24, marginBottom: 24 }}>
          
          {/* Section: Farmer Crop Produce Offers */}
          <div className="card" style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h3 style={{ margin: 0 }}>
                🌾 {language === "mr" ? "शेतकऱ्यांचे पीक विक्री ऑफर्स" : "Farmer Crop Offers (Produce)"}
              </h3>
              <Link to="/marketplace" style={{ fontSize: 12, fontWeight: 700, color: "var(--primary)" }}>
                {language === "mr" ? "सर्व पहा →" : "View All →"}
              </Link>
            </div>
            
            {farmerProduceListings.length === 0 ? (
              <p style={{ color: "var(--text-muted)", fontSize: 13, textAlign: "center", padding: "30px 0" }}>
                No crop produce listed by farmers currently.
              </p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 12, maxHeight: 400, overflowY: "auto", paddingRight: 4 }}>
                {farmerProduceListings.map(p => (
                  <div key={p._id} style={{ display: "flex", gap: 12, padding: 10, border: "1px solid var(--border-color)", borderRadius: 8, alignItems: "center" }}>
                    <img 
                      src={getProductImageUrl(p.image) || getFallbackImage(p)} 
                      alt={p.name} 
                      style={{ width: 50, height: 50, borderRadius: 6, objectFit: "cover" }}
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = getFallbackImage(p);
                      }}
                    />
                    <div style={{ flex: 1 }}>
                      <strong style={{ fontSize: 14, color: "var(--text-dark)", display: "block" }}>{p.name}</strong>
                      <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
                        {language === "mr" ? "विक्रेता" : "Seller"}: {p.seller} • ₹{p.price} {p.unit}
                      </span>
                    </div>
                    <button className="button" style={{ padding: "4px 8px", fontSize: 11, background: "#16a34a" }} onClick={() => handleBuyProduce(p)}>
                      {language === "mr" ? "खरेदी करा" : "Buy Bulk"}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Section: B2B Buy Requests (Trade Leads) */}
          <div className="card" style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h3 style={{ margin: 0 }}>
                🤝 {language === "mr" ? "खरेदी मागण्या (Buy Requests)" : "B2B Buy Requests"}
              </h3>
              <button className="button" style={{ padding: "4px 10px", fontSize: 11, margin: 0 }} onClick={() => setShowRequestForm(!showRequestForm)}>
                {showRequestForm ? "Close" : "+ Post Request"}
              </button>
            </div>

            {showRequestForm && (
              <form onSubmit={handleAddBuyRequest} className="card" style={{ border: "1.5px solid var(--primary)", background: "var(--bg-app)", padding: 12, marginBottom: 16 }}>
                <label style={{ fontSize: 12, fontWeight: 700 }}>Crop / Grain Name *</label>
                <input 
                  type="text" className="input" style={{ padding: 6, fontSize: 12.5 }} required 
                  placeholder="e.g. Basmati Rice, Organic Wheat, Chilli"
                  value={requestForm.cropName} onChange={e => setRequestForm({...requestForm, cropName: e.target.value})}
                />
                
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 700 }}>Qty *</label>
                    <input 
                      type="number" className="input" style={{ padding: 6, fontSize: 12.5 }} required 
                      value={requestForm.quantity} onChange={e => setRequestForm({...requestForm, quantity: e.target.value})}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 700 }}>Unit *</label>
                    <input 
                      type="text" className="input" style={{ padding: 6, fontSize: 12.5 }} required 
                      placeholder="e.g. quintal, kg, ton"
                      value={requestForm.unit} onChange={e => setRequestForm({...requestForm, unit: e.target.value})}
                    />
                  </div>
                </div>

                <label style={{ fontSize: 12, fontWeight: 700 }}>Target Buy Price (₹) *</label>
                <input 
                  type="number" className="input" style={{ padding: 6, fontSize: 12.5 }} required 
                  placeholder="e.g. 2200"
                  value={requestForm.targetPrice} onChange={e => setRequestForm({...requestForm, targetPrice: e.target.value})}
                />

                <label style={{ fontSize: 12, fontWeight: 700 }}>Description</label>
                <textarea 
                  className="input" style={{ padding: 6, fontSize: 12.5 }} rows={2}
                  placeholder="Additional specifications e.g. quality parameters, packing size..."
                  value={requestForm.description} onChange={e => setRequestForm({...requestForm, description: e.target.value})}
                />

                <button type="submit" className="button" style={{ width: "100%", padding: 8, fontSize: 13, background: "#0284c7" }}>
                  Submit Trade Request
                </button>
              </form>
            )}

            {buyRequests.length === 0 ? (
              <p style={{ color: "var(--text-muted)", fontSize: 13, textAlign: "center", padding: "30px 0" }}>
                No B2B buy requests posted.
              </p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 12, maxHeight: 400, overflowY: "auto", paddingRight: 4 }}>
                {buyRequests.map(r => {
                  const isMine = r.merchantId === user?._id || r.merchant === user?.name;
                  return (
                    <div key={r._id} style={{ padding: 12, border: "1px solid var(--border-color)", borderRadius: 8, background: "#f8fafc" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                        <div>
                          <strong style={{ fontSize: 14, color: "var(--text-dark)" }}>Wanted: {r.cropName}</strong>
                          <div style={{ fontSize: 12, color: "var(--primary-hover)", fontWeight: 700 }}>
                            Qty: {r.quantity} {r.unit} @ target price ₹{r.targetPrice}/{r.unit}
                          </div>
                        </div>
                        {isMine && (
                          <button 
                            className="button" 
                            style={{ padding: "2px 6px", fontSize: 10, background: "#ef4444", margin: 0 }}
                            onClick={() => handleDeleteBuyRequest(r._id)}
                          >
                            🗑️ Pull
                          </button>
                        )}
                      </div>
                      <p style={{ fontSize: 11.5, color: "var(--text-muted)", margin: "4px 0 0 0", fontStyle: "italic" }}>
                        Posted by: {r.merchant} • {r.description}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>

        {/* Section: My Store Inventory & Form */}
        <div className="card" style={{ marginBottom: 24 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <h3 style={{ margin: 0 }}>
              🛠️ {language === "mr" ? "माझे कृषी पुरवठा स्टोअर सूची" : "My Input Supply Store Inventory"}
            </h3>
            <button className="button" style={{ background: "#16a34a" }} onClick={() => setShowAddForm(!showAddForm)}>
              {showAddForm ? "Close Form" : "📢 List New Supply Input"}
            </button>
          </div>

          {showAddForm && (
            <form onSubmit={handleAddProduct} className="card" style={{ border: "2px solid #16a34a", padding: 20, marginBottom: 20 }}>
              <h4 style={{ margin: "0 0 16px 0" }}>📢 List New Agriculture Supply Input</h4>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: 16 }}>
                <div>
                  <label style={{ fontSize: 13, fontWeight: 700 }}>Input Product Name *</label>
                  <input 
                    type="text" className="input" required 
                    placeholder="e.g. Premium Cotton Seeds, Liquid Zinc-Boron Mix"
                    value={addForm.name} onChange={e => setAddForm({...addForm, name: e.target.value})}
                  />

                  <label style={{ fontSize: 13, fontWeight: 700 }}>Category *</label>
                  <select 
                    className="input" 
                    value={addForm.category} onChange={e => setAddForm({...addForm, category: e.target.value})}
                  >
                    <option value="Seeds">Seeds</option>
                    <option value="Fertilizers">Fertilizers</option>
                    <option value="Tools">Tools</option>
                    <option value="Equipment">Equipment</option>
                    <option value="Pesticides">Pesticides</option>
                  </select>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <div>
                      <label style={{ fontSize: 13, fontWeight: 700 }}>Price (₹) *</label>
                      <input 
                        type="number" className="input" required 
                        placeholder="e.g. 850"
                        value={addForm.price} onChange={e => setAddForm({...addForm, price: e.target.value})}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: 13, fontWeight: 700 }}>Unit *</label>
                      <input 
                        type="text" className="input" required 
                        placeholder="e.g. /kg, /bag, /unit"
                        value={addForm.unit} onChange={e => setAddForm({...addForm, unit: e.target.value})}
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: 13, fontWeight: 700 }}>Product Description</label>
                  <textarea 
                    className="input" rows={3}
                    placeholder="Details about product source, usage parameters, active ingredients..."
                    value={addForm.description} onChange={e => setAddForm({...addForm, description: e.target.value})}
                  />

                  <label style={{ fontSize: 13, fontWeight: 700 }}>Image Selection Preset</label>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", margin: "6px 0 12px 0" }}>
                    {[
                      { label: "Seeds", url: "https://images.unsplash.com/photo-1523301343968-6a6ebf63c672?auto=format&fit=crop&w=300&q=80" },
                      { label: "Fertilizer", url: "https://images.unsplash.com/photo-1628352081506-83c43123ed6d?auto=format&fit=crop&w=300&q=80" },
                      { label: "Irrigation", url: "https://images.unsplash.com/photo-1508514177221-188b1cf16e9d?auto=format&fit=crop&w=300&q=80" },
                      { label: "Pesticide", url: "https://images.unsplash.com/photo-1599599810769-bcde5a160d32?auto=format&fit=crop&w=300&q=80" }
                    ].map(img => (
                      <button
                        key={img.label} type="button"
                        style={{
                          padding: "4px 8px", borderRadius: 6, border: "1px solid", fontSize: 11, cursor: "pointer",
                          borderColor: addForm.image === img.url ? "var(--primary)" : "var(--border-color)",
                          background: addForm.image === img.url ? "var(--primary-light)" : "white"
                        }}
                        onClick={() => setAddForm({ ...addForm, image: img.url })}
                      >
                        {img.label}
                      </button>
                    ))}
                  </div>

                  <input 
                    type="text" className="input" 
                    placeholder="Or enter Custom Image URL..."
                    value={addForm.image} onChange={e => setAddForm({...addForm, image: e.target.value})}
                  />
                </div>
              </div>

              <button type="submit" className="button" style={{ width: "100%", background: "#16a34a", marginTop: 16 }}>
                Publish Input to Bazaar Store
              </button>
            </form>
          )}

          {myStoreListings.length === 0 ? (
            <div style={{ textAlign: "center", padding: "30px 0", color: "var(--text-muted)" }}>
              <p>You have not listed any input products for sale yet.</p>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 16 }}>
              {myStoreListings.map(p => (
                <div key={p._id} style={{ border: "1px solid var(--border-color)", padding: 12, borderRadius: 8, display: "flex", flexDirection: "column", gap: 8 }}>
                  <img 
                    src={getProductImageUrl(p.image) || getFallbackImage(p)} 
                    alt={p.name} 
                    style={{ height: 120, borderRadius: 6, objectFit: "cover" }}
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = getFallbackImage(p);
                    }}
                  />
                  <div>
                    <span style={{ fontSize: 9.5, fontWeight: 700, color: "#16a34a", textTransform: "uppercase" }}>{p.category}</span>
                    <strong style={{ fontSize: 14, color: "var(--text-dark)", display: "block" }}>{p.name}</strong>
                    <span style={{ fontSize: 13, color: "var(--text-dark)", fontWeight: 700 }}>₹{p.price} {p.unit}</span>
                  </div>
                  <button 
                    className="button" style={{ background: "#ef4444", padding: "4px 8px", fontSize: 11.5, margin: 0, marginTop: "auto" }}
                    onClick={() => handleDeleteProduct(p._id)}
                  >
                    🗑️ Pull Item
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ===== Wholesale B2B Contracts Ledger ===== */}
        <div className="card" style={{ marginBottom: 24, overflowX: "auto" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <h3 style={{ margin: 0 }}>
              📜 {language === "mr" ? "घाऊक करार खातेवही (B2B Contracts)" : "Wholesale B2B Contracts Ledger"}
            </h3>
            <span style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 600 }}>
              {contracts.length} {language === "mr" ? "करार" : "contract(s)"}
            </span>
          </div>

          {contracts.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px 0", color: "var(--text-muted)" }}>
              <div style={{ fontSize: 40, marginBottom: 8 }}>🤝</div>
              <p style={{ fontSize: 14 }}>
                {language === "mr"
                  ? "अद्याप कोणतेही घाऊक करार नाहीत. शेतकऱ्यांच्या पीक ऑफर्समधून 'खरेदी करा' दाबून नवीन करार तयार करा."
                  : "No wholesale contracts yet. Click \"Buy Bulk\" on a farmer's crop offer above to create one."}
              </p>
            </div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ background: "var(--bg-app)", borderBottom: "2px solid var(--border-color)" }}>
                  {["Contract ID", "Crop / Item", "Farmer (Seller)", "Qty & Unit", "Contract Value", "Status", "Actions"].map(h => (
                    <th key={h} style={{ padding: "10px 12px", textAlign: "left", fontWeight: 700, fontSize: 12, color: "var(--text-muted)", whiteSpace: "nowrap" }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {contracts.map((c, idx) => {
                  const statusColors = {
                    Pending: { bg: "#fef3c7", color: "#92400e" },
                    Approved: { bg: "#dbeafe", color: "#1e40af" },
                    "In Transit": { bg: "#ede9fe", color: "#4c1d95" },
                    Completed: { bg: "#dcfce7", color: "#14532d" },
                    Cancelled: { bg: "#fee2e2", color: "#7f1d1d" }
                  };
                  const statusStyle = statusColors[c.status] || { bg: "#f1f5f9", color: "#475569" };
                  const contractValue = c.price && c.quantity ? `₹${(Number(c.price) * Number(c.quantity)).toLocaleString("en-IN")}` : "—";
                  const shortId = c._id ? String(c._id).slice(-8).toUpperCase() : `C-${idx + 1}`;

                  return (
                    <tr
                      key={c._id || idx}
                      style={{
                        borderBottom: "1px solid var(--border-color)",
                        background: idx % 2 === 0 ? "var(--bg-card)" : "var(--bg-app)",
                        transition: "background 0.15s"
                      }}
                    >
                      {/* Contract ID */}
                      <td style={{ padding: "10px 12px", fontFamily: "monospace", fontWeight: 700, color: "var(--primary)", fontSize: 11 }}>
                        #{shortId}
                      </td>
                      {/* Crop */}
                      <td style={{ padding: "10px 12px", fontWeight: 600, color: "var(--text-dark)" }}>
                        {c.cropName || "—"}
                      </td>
                      {/* Seller */}
                      <td style={{ padding: "10px 12px", color: "var(--text-muted)" }}>
                        {c.sellerName || "—"}
                      </td>
                      {/* Qty */}
                      <td style={{ padding: "10px 12px", fontWeight: 600 }}>
                        {c.quantity} {c.unit || ""}
                      </td>
                      {/* Value */}
                      <td style={{ padding: "10px 12px", fontWeight: 700, color: "#16a34a" }}>
                        {contractValue}
                      </td>
                      {/* Status Badge */}
                      <td style={{ padding: "10px 12px" }}>
                        <span style={{
                          display: "inline-block",
                          padding: "3px 10px",
                          borderRadius: 20,
                          fontSize: 11,
                          fontWeight: 700,
                          background: statusStyle.bg,
                          color: statusStyle.color,
                          whiteSpace: "nowrap"
                        }}>
                          {c.status}
                        </span>
                      </td>
                      {/* Actions */}
                      <td style={{ padding: "10px 12px" }}>
                        <div style={{ display: "flex", gap: 6, flexWrap: "nowrap" }}>
                          {c.status === "Pending" && (
                            <>
                              <button
                                className="button"
                                style={{ padding: "3px 8px", fontSize: 11, margin: 0, background: "#0284c7", whiteSpace: "nowrap" }}
                                onClick={() => handleUpdateContractStatus(c._id, "Approved")}
                              >
                                ✅ Approve
                              </button>
                              <button
                                className="button"
                                style={{ padding: "3px 8px", fontSize: 11, margin: 0, background: "#ef4444", whiteSpace: "nowrap" }}
                                onClick={() => handleUpdateContractStatus(c._id, "Cancelled")}
                              >
                                ✖ Cancel
                              </button>
                            </>
                          )}
                          {c.status === "Approved" && (
                            <button
                              className="button"
                              style={{ padding: "3px 8px", fontSize: 11, margin: 0, background: "#7c3aed", whiteSpace: "nowrap" }}
                              onClick={() => handleUpdateContractStatus(c._id, "In Transit")}
                            >
                              🚚 Dispatch
                            </button>
                          )}
                          {c.status === "In Transit" && (
                            <button
                              className="button"
                              style={{ padding: "3px 8px", fontSize: 11, margin: 0, background: "#16a34a", whiteSpace: "nowrap" }}
                              onClick={() => handleUpdateContractStatus(c._id, "Completed")}
                            >
                              ✅ Complete
                            </button>
                          )}
                          {(c.status === "Completed" || c.status === "Cancelled") && (
                            <span style={{ fontSize: 11, color: "var(--text-muted)", fontStyle: "italic" }}>
                              {c.status === "Completed" ? "🎉 Done" : "❌ Closed"}
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

      </div>
    );
  }

  return (
    <div className="app-container">
      {/* Welcome Banner */}
      <div className="card" style={{ background: "linear-gradient(135deg, #16a34a, #15803d)", color: "white", padding: 24, marginBottom: 24 }}>
        <h1 style={{ fontSize: 26, fontWeight: 800 }}>
          {language === "mr" ? "शेतकरी डॅशबोर्ड" : "Farmer Dashboard"}
        </h1>
        <p style={{ opacity: 0.9, marginTop: 4 }}>
          {language === "mr" 
            ? "स्मार्ट किसानवर आपले स्वागत आहे! कृषी एआय साधने वापरा, पीक दिनदर्शिका अद्ययावत करा, बाजार भाव तपासा आणि सल्लागारांशी संपर्क साधा."
            : "Welcome back to Smart Kisan! Explore AI advisory tools, update your crop calendars, check mandi price changes, or discuss with fellow farmers."}
        </p>
      </div>

      {/* Live Weather Widget */}
      <WeatherWidget />

      <h2 style={{ marginBottom: 16 }}>
        {language === "mr" ? "कृषी सल्लागार संच" : "Agri Advisory Suite"}
      </h2>
      
      {/* 2x3 Grid of features */}
      <div className="dashboard-grid" style={{ marginBottom: 24 }}>
        
        <div className="card" style={{ display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: 28, marginBottom: 8 }}>🤖</div>
            <h3>
              {language === "mr" ? "किसान एआय चॅटबॉट" : "Kisan AI Chatbot"}
            </h3>
            <p style={{ color: "var(--text-muted)", fontSize: 13, marginTop: 4 }}>
              {language === "mr"
                ? "पिकांवरील कीड ओळखण्यासाठी किंवा पीक सल्ला मिळवण्यासाठी बहुभाषिक कृषी एआय सहाय्यकाशी चर्चा करा."
                : "Chat with a multilingual agronomy assistant to diagnose pests or get crop prescriptions."}
            </p>
          </div>
          <Link to="/chat" style={{ marginTop: 16 }}>
            <button className="button" style={{ width: "100%" }}>
              {language === "mr" ? "गप्पा सुरू करा 💬" : "Open Chat 💬"}
            </button>
          </Link>
        </div>

        <div className="card" style={{ display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: 28, marginBottom: 8 }}>📅</div>
            <h3>
              {language === "mr" ? "पेरणी कार्य दिनदर्शिका" : "Sowing Task Calendar"}
            </h3>
            <p style={{ color: "var(--text-muted)", fontSize: 13, marginTop: 4 }}>
              {language === "mr"
                ? "रोपवाटिकेपासून काढणीपर्यंतच्या दैनंदिन कामांची नोंद ठेवा आणि पूर्ण झालेली कामे चिन्हांकित करा."
                : "Track day-by-day actions from nursery to harvest, and mark tasks as completed."}
            </p>
          </div>
          <Link to="/ai-tools" style={{ marginTop: 16 }}>
            <button className="button" style={{ width: "100%" }}>
              {language === "mr" ? "नियोजक उघडा 📅" : "Open Planner 📅"}
            </button>
          </Link>
        </div>

        <div className="card" style={{ display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: 28, marginBottom: 8 }}>🧪</div>
            <h3>
              {language === "mr" ? "NPK खत सल्लागार" : "NPK Nutrient Advisor"}
            </h3>
            <p style={{ color: "var(--text-muted)", fontSize: 13, marginTop: 4 }}>
              {language === "mr"
                ? "मातीतील NPK चाचणीचे घटक टाकून आवश्यक युरिया, डीएपी आणि एमओपी खताच्या गोण्यांची संख्या मोजा."
                : "Input soil NPK test metrics to calculate target Urea, DAP, and MOP bag dosages."}
            </p>
          </div>
          <Link to="/ai-tools" style={{ marginTop: 16 }}>
            <button className="button" style={{ width: "100%" }}>
              {language === "mr" ? "NPK खत मोजा 🧪" : "Calculate NPK 🧪"}
            </button>
          </Link>
        </div>

        <div className="card" style={{ display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: 28, marginBottom: 8 }}>🛒</div>
            <h3>
              {language === "mr" ? "शेतकरी बाजार आणि दुकान" : "Farmers Bazaar & Store"}
            </h3>
            <p style={{ color: "var(--text-muted)", fontSize: 13, marginTop: 4 }}>
              {language === "mr"
                ? "उत्कृष्ट बियाणे आणि अवजारे खरेदी करा, किंवा तुमचे काढणी झालेले पीक विक्रीसाठी बाजारात नोंदवा."
                : "Buy high-grade seeds and equipment, or list your harvest crop surplus for sale."}
            </p>
          </div>
          <Link to="/marketplace" style={{ marginTop: 16 }}>
            <button className="button" style={{ width: "100%" }}>
              {language === "mr" ? "बाजार पहा 🛒" : "Visit Bazaar 🛒"}
            </button>
          </Link>
        </div>

        <div className="card" style={{ display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: 28, marginBottom: 8 }}>☀️</div>
            <h3>
              {language === "mr" ? "हवामान अंदाज" : "Weather Insights"}
            </h3>
            <p style={{ color: "var(--text-muted)", fontSize: 13, marginTop: 4 }}>
              {language === "mr"
                ? "पेरणी आणि सिंचनाच्या अचूक नियोजनासाठी पुढील ३ दिवसांचा हवामान अंदाज पहा."
                : "See a 3-day regional weather forecast to optimize sowing and watering schedules."}
            </p>
          </div>
          <Link to="/weather" style={{ marginTop: 16 }}>
            <button className="button" style={{ width: "100%" }}>
              {language === "mr" ? "अंदाज पहा ☀️" : "View Forecast ☀️"}
            </button>
          </Link>
        </div>

        <div className="card" style={{ display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: 28, marginBottom: 8 }}>📈</div>
            <h3>
              {language === "mr" ? "बाजार भाव (मंडी दर)" : "Mandi Market Prices"}
            </h3>
            <p style={{ color: "var(--text-muted)", fontSize: 13, marginTop: 4 }}>
              {language === "mr"
                ? "नफ्यात विक्री करण्यासाठी स्थानिक कृषी बाजार समित्यांमधील चालू बाजार भाव तपासा."
                : "Track local agricultural mandi prices to make informed crop sale arrangements."}
            </p>
          </div>
          <Link to="/market" style={{ marginTop: 16 }}>
            <button className="button" style={{ width: "100%" }}>
              {language === "mr" ? "बाजार भाव पहा 📈" : "Check Prices 📈"}
            </button>
          </Link>
        </div>

        <div className="card" style={{ display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: 28, marginBottom: 8 }}>🌱</div>
            <h3>
              {language === "mr" ? "AI पीक शिफारसी" : "AI Crop Recommendations"}
            </h3>
            <p style={{ color: "var(--text-muted)", fontSize: 13, marginTop: 4 }}>
              {language === "mr"
                ? "तुमच्या जमिनीचा प्रकार आणि हवामानाची माहिती देऊन योग्य पीक आणि संसाधनांचे नियोजन करा."
                : "Predict optimal crop varieties and get fertilizer schedules based on soil chemistry."}
            </p>
          </div>
          <Link to="/recommendations" style={{ marginTop: 16 }}>
            <button className="button" style={{ width: "100%" }}>
              {language === "mr" ? "सल्लागार उघडा 🌾" : "Open Advisor 🌾"}
            </button>
          </Link>
        </div>

        <div className="card" style={{ display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: 28, marginBottom: 8 }}>📊</div>
            <h3>
              {language === "mr" ? "उत्पादन अंदाज इंजिन" : "Predictive Yield Engine"}
            </h3>
            <p style={{ color: "var(--text-muted)", fontSize: 13, marginTop: 4 }}>
              {language === "mr"
                ? "हवामान आणि जमिनीनुसार पिकाचे उत्पादन, एकूण नफा आणि सिंचन वेळापत्रक निश्चित करा."
                : "Forecast crop yields, estimate net profits, and generate smart resource application plans."}
            </p>
          </div>
          <Link to="/predictive-yield" style={{ marginTop: 16 }}>
            <button className="button" style={{ width: "100%", background: "#166534" }}>
              {language === "mr" ? "अंदाज मिळवा 📊" : "Forecast Yield 📊"}
            </button>
          </Link>
        </div>

        <div className="card" style={{ display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: 28, marginBottom: 8 }}>🐄</div>
            <h3>
              {language === "mr" ? "पशु मित्र (Livestock)" : "Pashu Mitra (Livestock)"}
            </h3>
            <p style={{ color: "var(--text-muted)", fontSize: 13, marginTop: 4 }}>
              {language === "mr"
                ? "गाई-म्हशींच्या आरोग्याची काळजी घ्या, दुग्ध उत्पादनाचा आलेख आणि लसीकरण ट्रॅक करा."
                : "Track dairy cattle health, log daily milking yields, vaccination due dates, and consult AI."}
            </p>
          </div>
          <Link to="/pashu-mitra" style={{ marginTop: 16 }}>
            <button className="button" style={{ width: "100%", background: "#1e3a8a" }}>
              {language === "mr" ? "पशु मित्र उघडा 🐄" : "Open Pashu Mitra 🐄"}
            </button>
          </Link>
        </div>

      </div>

      {/* Disease Detection Panel */}
      <CropDiseaseDetectionSection />
    </div>
  );
};

export default Dashboard;
