import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Bot, Calendar, FlaskConical, ShoppingCart, Sun, LineChart, Sprout, BarChart3, Leaf, Microscope, Landmark, ShieldCheck, Camera } from "lucide-react";
import { useLanguage } from "../context/LanguageContext";
import { useAuth } from "../context/AuthContext";
import api from "../api";
import ToolCard from "../components/common/ToolCard";
import StatCard from "../components/common/StatCard";
import PageHeader from "../components/common/PageHeader";
const getFallbackImage = (product) => {
  if (!product) return "https://images.unsplash.com/photo-1500651230702-0e2d8a49d4ad?auto=format&fit=crop&w=300&q=80";
  const name = (product.name || "").toLowerCase();
  const cat = (product.category || "").toLowerCase();
  if (name.includes("tomato")) return "https://images.unsplash.com/photo-1592924357228-91a4daadcfea?auto=format&fit=crop&w=300&q=80";
  if (name.includes("wheat")) return "https://images.unsplash.com/photo-1506619216599-9d16d0903dfd?auto=format&fit=crop&w=300&q=80";
  if (name.includes("potato")) return "https://images.unsplash.com/photo-1518977676601-b53f82aba655?auto=format&fit=crop&w=300&q=80";
  if (name.includes("rice")) return "https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=300&q=80";
  if (name.includes("mustard")) return "https://images.unsplash.com/photo-1528825871115-3581a5387919?auto=format&fit=crop&w=300&q=80";
  if (name.includes("chilli") || name.includes("chili")) return "https://images.unsplash.com/photo-1596797038530-2c107229654b?auto=format&fit=crop&w=300&q=80";
  if (name.includes("cotton")) return "https://images.unsplash.com/photo-1500651230702-0e2d8a49d4ad?auto=format&fit=crop&w=300&q=80";
  
  if (cat === "seeds") return "https://images.unsplash.com/photo-1523301343968-6a6ebf63c672?auto=format&fit=crop&w=300&q=80";
  if (cat === "fertilizers") return "https://images.unsplash.com/photo-1628352081506-83c43123ed6d?auto=format&fit=crop&w=300&q=80";
  if (cat === "tools" || cat === "equipment") return "https://images.unsplash.com/photo-1508514177221-188b1cf16e9d?auto=format&fit=crop&w=300&q=80";
  if (cat === "pesticides") return "https://images.unsplash.com/photo-1599599810769-bcde5a160d32?auto=format&fit=crop&w=300&q=80";
  
  return "https://images.unsplash.com/photo-1500651230702-0e2d8a49d4ad?auto=format&fit=crop&w=300&q=80";
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
      {/* Industrial Page Header */}
      <PageHeader
        title={language === "mr" ? "शेतकरी डॅशबोर्ड" : "Farmer Dashboard"}
        subtitle={
          language === "mr"
            ? "स्मार्ट किसानवर आपले स्वागत आहे! कृषी एआय साधने वापरा, पीक दिनदर्शिका अद्ययावत करा, आणि बाजार भाव तपासा."
            : "Welcome back to Smart Kisan! Explore AI advisory tools, update crop calendars, and track mandi price changes."
        }
        breadcrumb="Overview"
        badgeText="FIELD OPS LINKED"
        badgeColor="#1B7A43"
      />

      {/* Live Weather Widget */}
      <WeatherWidget />

      {/* Prominent Primary Field Action: Camera Scan Hero CTA */}
      <div
        style={{
          background: "linear-gradient(135deg, #1B7A43 0%, #15803D 100%)",
          borderRadius: 16,
          padding: "20px 24px",
          marginTop: 20,
          marginBottom: 24,
          color: "#FFFFFF",
          boxShadow: "0 8px 24px -4px rgba(27, 122, 67, 0.4)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 16
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ background: "rgba(255, 255, 255, 0.2)", borderRadius: 50, padding: 12, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Camera size={28} color="#FFFFFF" />
          </div>
          <div>
            <span style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.8px", color: "rgba(255, 255, 255, 0.85)" }}>
              FIELD CAMERA DIAGNOSTICS
            </span>
            <h3 style={{ fontSize: 18, fontWeight: 800, color: "#FFFFFF", margin: "2px 0 0 0" }}>
              {language === "mr" ? "पिकाचा फोटो काढून रोग ओळखा" : "Scan Crop Leaf for Immediate Diagnosis"}
            </h3>
          </div>
        </div>

        <Link to="/ai-tools?tab=disease&subtab=crop_cv" style={{ textDecoration: "none" }}>
          <button
            className="agri-suite-btn"
            style={{
              background: "#FFFFFF",
              color: "#15803D",
              padding: "12px 24px",
              fontSize: 14,
              fontWeight: 800,
              boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)"
            }}
          >
            <Camera size={18} />
            {language === "mr" ? "स्कॅन करा" : "Launch Camera"}
          </button>
        </Link>
      </div>

      {/* ===== Agri Advisory Suite — Standardized ToolCard Grid ===== */}
      <div style={{ marginTop: 20, marginBottom: 36 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: "var(--color-text-main)", letterSpacing: "-0.4px", margin: 0 }}>
            {language === "mr" ? "कृषी सल्लागार संच" : "Agri Advisory Suite"}
          </h2>
          <span style={{ fontSize: 12.5, fontWeight: 700, color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
            8 Core Agronomic Tools
          </span>
        </div>

        <div className="agri-suite-grid-4x2 agri-mobile-grid-2col">
          {/* Card 1: Kisan AI Chatbot */}
          <ToolCard
            icon={Bot}
            iconColor="#1B7A43"
            iconBg="rgba(27, 122, 67, 0.1)"
            accentColor="#1B7A43"
            title={language === "mr" ? "किसान AI चॅटबॉट" : "Kisan AI Chatbot"}
            description={language === "mr" ? "पिकांवरील कीड ओळखण्यासाठी किंवा पीक सल्ला मिळवण्यासाठी बहुभाषिक कृषी एआय सहाय्यकाशी चर्चा करा." : "Chat with a multilingual agronomy assistant to diagnose pests or get crop prescriptions."}
            to="/chat"
            btnText={language === "mr" ? "चॅट उघडा" : "Open Chat"}
          />

          {/* Card 2: Sowing Task Calendar */}
          <ToolCard
            icon={Calendar}
            iconColor="#0284c7"
            iconBg="rgba(2, 132, 199, 0.1)"
            accentColor="#0284c7"
            title={language === "mr" ? "पेरणी कार्य दिनदर्शिका" : "Sowing Task Calendar"}
            description={language === "mr" ? "रोपवाटिकेपासून काढणीपर्यंतच्या दैनंदिन कामांची नोंद ठेवा आणि पूर्ण झालेली कामे चिन्हांकित करा." : "Track day-by-day actions from nursery to harvest, and mark tasks as completed."}
            to="/ai-tools?tab=calendar"
            btnText={language === "mr" ? "नियोजक उघडा" : "Open Planner"}
          />

          {/* Card 3: NPK Nutrient Advisor */}
          <ToolCard
            icon={FlaskConical}
            iconColor="#7c3aed"
            iconBg="rgba(124, 58, 237, 0.1)"
            accentColor="#7c3aed"
            title={language === "mr" ? "NPK खत सल्लागार" : "NPK Nutrient Advisor"}
            description={language === "mr" ? "मातीतील NPK चाचणीचे घटक टाकून आवश्यक युरिया, डीएपी आणि एमओपी खताच्या गोण्यांची संख्या मोजा." : "Input soil NPK test metrics to calculate target Urea, DAP, and MOP bag dosages."}
            to="/ai-tools?tab=npk"
            btnText={language === "mr" ? "NPK मोजा" : "Calculate NPK"}
          />

          {/* Card 4: Farmers Bazaar & Store */}
          <ToolCard
            icon={ShoppingCart}
            iconColor="#D97706"
            iconBg="rgba(217, 119, 6, 0.1)"
            accentColor="#D97706"
            title={language === "mr" ? "शेतकरी बाजार आणि दुकान" : "Farmers Bazaar & Store"}
            description={language === "mr" ? "उत्कृष्ट बियाणे आणि अवजारे खरेदी करा, किंवा तुमचे काढणी झालेले पीक विक्रीसाठी बाजारात नोंदवा." : "Buy high-grade seeds and equipment, or list your harvest crop surplus for sale."}
            to="/marketplace"
            btnText={language === "mr" ? "बाजार पहा" : "Visit Bazaar"}
          />

          {/* Card 5: Weather Insights */}
          <ToolCard
            icon={Sun}
            iconColor="#f97316"
            iconBg="rgba(249, 115, 22, 0.1)"
            accentColor="#f97316"
            title={language === "mr" ? "हवामान अंदाज" : "Weather Insights"}
            description={language === "mr" ? "पेरणी आणि सिंचनाच्या अचूक नियोजनासाठी पुढील ३ दिवसांचा हवामान अंदाज पहा." : "See a 3-day regional weather forecast to optimize sowing and watering schedules."}
            to="/weather"
            btnText={language === "mr" ? "अंदाज पहा" : "View Forecast"}
          />

          {/* Card 6: Mandi Market Prices */}
          <ToolCard
            icon={LineChart}
            iconColor="#10b981"
            iconBg="rgba(16, 185, 129, 0.1)"
            accentColor="#10b981"
            title={language === "mr" ? "मंडी बाजार भाव" : "Mandi Market Prices"}
            description={language === "mr" ? "नफ्यात विक्री करण्यासाठी स्थानिक कृषी बाजार समित्यांमधील चालू बाजार भाव तपासा." : "Track local agricultural mandi prices to make informed crop sale arrangements."}
            to="/market"
            btnText={language === "mr" ? "भाव तपासा" : "Check Prices"}
          />

          {/* Card 7: AI Crop Recommendations */}
          <ToolCard
            icon={Sprout}
            iconColor="#22c55e"
            iconBg="rgba(34, 197, 94, 0.1)"
            accentColor="#22c55e"
            title={language === "mr" ? "AI पीक शिफारसी" : "AI Crop Recommendations"}
            description={language === "mr" ? "तुमच्या जमिनीचा प्रकार आणि हवामानाची माहिती देऊन योग्य पीक आणि संसाधनांचे नियोजन करा." : "Predict optimal crop varieties and get fertilizer schedules based on soil chemistry."}
            to="/recommendations"
            btnText={language === "mr" ? "सल्लागार उघडा" : "Open Advisor"}
          />

          {/* Card 8: Predictive Yield Engine */}
          <ToolCard
            icon={BarChart3}
            iconColor="#3b82f6"
            iconBg="rgba(59, 130, 246, 0.1)"
            accentColor="#3b82f6"
            title={language === "mr" ? "उत्पादन अंदाज इंजिन" : "Predictive Yield Engine"}
            description={language === "mr" ? "हवामान आणि जमिनीनुसार पिकाचे उत्पादन, एकूण नफा आणि सिंचन वेळापत्रक निश्चित करा." : "Forecast crop yields, estimate net profits, and generate smart resource application plans."}
            to="/predictive-yield"
            btnText={language === "mr" ? "अंदाज मिळवा" : "Predictive Engine"}
          />
        </div>
      </div>

      {/* ===== Additional Plant Health Diagnostics & Schemes ===== */}
      <div style={{ marginTop: 16, marginBottom: 32 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: "var(--color-text-main)", letterSpacing: "-0.4px", margin: 0 }}>
            🌿 {language === "mr" ? "अतिरिक्त कृषी निदान आणि योजना" : "Plant Health Diagnostics & Schemes"}
          </h2>
          <span style={{ fontSize: 12.5, fontWeight: 700, color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
            Visual Scan & Subsidies
          </span>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 20 }}>
          {/* Card 9: Crop Vision Diagnostics */}
          <ToolCard
            icon={Leaf}
            iconColor="#15803d"
            iconBg="rgba(21, 128, 61, 0.1)"
            accentColor="#15803d"
            title={language === "mr" ? "पीक वाढ निदान (CV)" : "Crop Vision Diagnostics"}
            description={language === "mr" ? "पिकाच्या वाढीचे टप्पे विश्लेषण करा." : "Upload plant photos for AI computer vision stage diagnosis."}
            to="/ai-tools?tab=disease&subtab=crop_cv"
            btnText={language === "mr" ? "पीक निदान करा" : "Diagnose Crop"}
          />

          {/* Card 10: Leaf Disease Scanner */}
          <ToolCard
            icon={Sprout}
            iconColor="#22c55e"
            iconBg="rgba(34, 197, 94, 0.1)"
            accentColor="#22c55e"
            title={language === "mr" ? "पान रोग निदान" : "Leaf Disease Scanner"}
            description={language === "mr" ? "पानावरील बुरशीजन्य संसर्ग आणि डाग स्कॅन करा." : "Scan crop leaf symptoms to diagnose fungal infections and spots."}
            to="/ai-tools?tab=disease&subtab=leaf_diag"
            btnText={language === "mr" ? "पान विश्लेषण करा" : "Analyze Leaf"}
          />

          {/* Card 11: Disease Detection */}
          <div className="card" style={{ margin: 0, padding: 18, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
            <div>
              <div style={{ background: "rgba(124, 58, 237, 0.1)", borderRadius: 10, width: 40, height: 40, display: "inline-flex", alignItems: "center", justifyContent: "center", marginBottom: 10 }}>
                <Microscope size={22} color="#7c3aed" />
              </div>
              <strong style={{ fontSize: 15, color: "var(--text-dark)", display: "block" }}>
                {language === "mr" ? "पीक रोग ओळख" : "Disease Detection"}
              </strong>
              <p style={{ fontSize: 12.5, color: "var(--text-muted)", marginTop: 4 }}>
                {language === "mr" ? "मशीन लर्निंगने रोग ओळखा आणि उपाय मिळवा." : "Detect plant health issues with ML model precision."}
              </p>
            </div>
            <Link to="/ai-tools?tab=disease&subtab=crop_disease" style={{ marginTop: 12 }}>
              <button className="button" style={{ width: "100%", padding: "8px 12px", fontSize: 12.5 }}>
                {language === "mr" ? "रोग ओळख करा 🔬" : "Detect Disease 🔬"}
              </button>
            </Link>
          </div>

          {/* Card 12: Government Schemes */}
          <div className="card" style={{ margin: 0, padding: 18, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
            <div>
              <div style={{ background: "rgba(2, 132, 199, 0.1)", borderRadius: 10, width: 40, height: 40, display: "inline-flex", alignItems: "center", justifyContent: "center", marginBottom: 10 }}>
                <Landmark size={22} color="#0284c7" />
              </div>
              <strong style={{ fontSize: 15, color: "var(--text-dark)", display: "block" }}>
                {language === "mr" ? "शासकीय योजना" : "Government Schemes"}
              </strong>
              <p style={{ fontSize: 12.5, color: "var(--text-muted)", marginTop: 4 }}>
                {language === "mr" ? "कृषी अनुदाने आणि योजनांची माहिती मिळवा." : "Explore state & national agricultural subsidies & loans."}
              </p>
            </div>
            <Link to="/forum" style={{ marginTop: 12 }}>
              <button className="button" style={{ width: "100%", padding: "8px 12px", fontSize: 12.5 }}>
                {language === "mr" ? "योजना पहा 🏛️" : "Explore Schemes 🏛️"}
              </button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;