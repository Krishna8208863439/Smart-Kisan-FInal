import React, { useMemo, useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import api from "../api";
import { useLanguage } from "../context/LanguageContext";

const CATEGORIES = [
  { name: "All Products", icon: "📦", color: "#64748b" },
  { name: "Seeds", icon: "🌱", color: "#16a34a" },
  { name: "Fertilizers", icon: "🧪", color: "#2563eb" },
  { name: "Tools", icon: "🛠️", color: "#d97706" },
  { name: "Equipment", icon: "🚜", color: "#7c3aed" },
  { name: "Pesticides", icon: "🐛", color: "#dc2626" },
  { name: "Produce", icon: "🍎", color: "#0d9488" }
];

const MARKET_REF_PRICES = {
  "Organic Wheat Seeds": { price: "₹2,125 - ₹2,350", unit: "per quintal" },
  "Bio-Fertilizer NPK": { price: "₹1,100 - ₹1,300", unit: "per 25kg bag" },
  "Drip Irrigation Kit": { price: "₹14,000 - ₹16,000", unit: "per set" },
  "Hybrid Maize Seeds": { price: "₹900 - ₹1,100", unit: "per kg" },
  "Liquid Micro-Nutrient Mix": { price: "₹450 - ₹550", unit: "per litre" },
  "Hand Sprayer Pump": { price: "₹2,000 - ₹2,400", unit: "per unit" },
  "Eco Pesticide (Neem Based)": { price: "₹600 - ₹720", unit: "per litre" },
  "Wheat": { price: "₹2,100 - ₹2,300", unit: "per quintal" },
  "Rice": { price: "₹2,040 - ₹2,250", unit: "per quintal" },
  "Potato": { price: "₹1,200 - ₹1,600", unit: "per quintal" },
  "Tomato": { price: "₹1,500 - ₹3,500", unit: "per quintal" },
  "Mustard": { price: "₹5,400 - ₹5,950", unit: "per quintal" },
  "Chilli": { price: "₹9,000 - ₹14,000", unit: "per quintal" },
  "Cotton": { price: "₹6,600 - ₹7,400", unit: "per quintal" }
};

const SAMPLE_IMAGES = [
  { label: "Wheat", url: "https://images.unsplash.com/photo-1506619216599-9d16d0903dfd?auto=format&fit=crop&w=300&q=80" },
  { label: "Potato", url: "https://images.unsplash.com/photo-1518977676601-b53f82aba655?auto=format&fit=crop&w=300&q=80" },
  { label: "Rice", url: "https://images.unsplash.com/photo-1536304997881-a372c179924b?auto=format&fit=crop&w=300&q=80" },
  { label: "Tomato", url: "https://images.unsplash.com/photo-1592924357228-91a4daadcfea?auto=format&fit=crop&w=300&q=80" },
  { label: "Mustard", url: "https://images.unsplash.com/photo-1528825871115-3581a5387919?auto=format&fit=crop&w=300&q=80" },
  { label: "Chilli", url: "https://images.unsplash.com/photo-1596797038530-2c107229654b?auto=format&fit=crop&w=300&q=80" }
];

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
  
  // Intercept known bad/incorrect sample images (bear, motorcycle, or deleted/broken ones)
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

  const backendBase = import.meta.env.VITE_API_URL || "http://localhost:5000";
  if (url.startsWith("http://localhost:5000")) {
    return url.replace("http://localhost:5000", backendBase);
  }
  if (url.startsWith("/uploads")) {
    return `${backendBase}${url}`;
  }
  return url;
};

const parseDescriptionSpecs = (description) => {
  if (!description) return { cleanDesc: "", specs: {} };
  
  const specs = {};
  let cleanDesc = description;

  const germinationMatch = description.match(/\[Germination Rate:\s*([^\]]+)\]/);
  if (germinationMatch) {
    specs.germinationRate = germinationMatch[1];
    cleanDesc = cleanDesc.replace(germinationMatch[0], "");
  }

  const npkMatch = description.match(/\[NPK Formula:\s*([^\]]+)\]/);
  if (npkMatch) {
    specs.npkRatio = npkMatch[1];
    cleanDesc = cleanDesc.replace(npkMatch[0], "");
  }

  const harvestMatch = description.match(/\[Harvest Date:\s*([^\]]+)\]/);
  if (harvestMatch) {
    specs.harvestDate = harvestMatch[1];
    cleanDesc = cleanDesc.replace(harvestMatch[0], "");
  }

  const liveLinkMatch = description.match(/\[Live Link:\s*([^\]]+)\]/);
  if (liveLinkMatch) {
    specs.liveLink = liveLinkMatch[1].trim();
    cleanDesc = cleanDesc.replace(liveLinkMatch[0], "");
  }

  return { cleanDesc: cleanDesc.trim(), specs };
};

const Marketplace = () => {
  const { t, language } = useLanguage();
  const locationState = useLocation();
  const searchParams = new URLSearchParams(locationState.search);
  const initialSearch = searchParams.get("search") || locationState.state?.searchQuery || "";

  const [products, setProducts] = useState([]);
  const [myListings, setMyListings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState(initialSearch);
  const [selectedCategory, setSelectedCategory] = useState("All Products");
  const [sortBy, setSortBy] = useState("popular");
  


  // Uploading state
  const [uploadingImage, setUploadingImage] = useState(false);

  // Dashboard view toggle ("browse" or "dashboard")
  const [viewMode, setViewMode] = useState("browse");
  const [dashboardTab, setDashboardTab] = useState("listings"); // listings or orders
  const [orders, setOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(false);

  // Selected product for detail modal
  const [selectedProduct, setSelectedProduct] = useState(null);

  // Shopping Cart state
  const [cart, setCart] = useState(() => {
    const saved = localStorage.getItem("sk_cart");
    return saved ? JSON.parse(saved) : [];
  });
   const [isCartOpen, setIsCartOpen] = useState(false);
  const [checkoutStatus, setCheckoutStatus] = useState(null);
  
  // BillDesk gateway states
  const [showBillDesk, setShowBillDesk] = useState(false);
  const [billDeskLoading, setBillDeskLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("upi"); // upi, cards, netbanking
  const [paymentDetails, setPaymentDetails] = useState({ upiId: "", cardNumber: "", expiry: "", cvv: "", netBank: "sbi" });
  const [paymentStep, setPaymentStep] = useState(1); // 1 = select method, 2 = simulated OTP/processing, 3 = success
  const [paymentOtp, setPaymentOtp] = useState("");

  // Farmers Bazaar: Sell Form state
  const [showSellForm, setShowSellForm] = useState(false);
  const [sellForm, setSellForm] = useState({
    name: "",
    category: "Produce",
    price: "",
    unit: "/kg",
    image: "",
    description: "",
    germinationRate: "",
    npkRatio: "",
    harvestDate: "",
    liveLink: ""
  });
  const [sellLoading, setSellLoading] = useState(false);

  const isLoggedIn = !!localStorage.getItem("sk_token");

  // Handle uploading of product photo file
  const handleImageFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("image", file);

    setUploadingImage(true);
    try {
      const res = await api.post("/marketplace/upload", formData, {
        headers: {
          "Content-Type": "multipart/form-data"
        }
      });
      setSellForm((prev) => ({ ...prev, image: res.data.imageUrl }));
      alert("Image uploaded successfully!");
    } catch (err) {
      console.error(err);
      alert("Failed to upload image. " + (err.response?.data?.message || err.message));
    } finally {
      setUploadingImage(false);
    }
  };

  // Fetch products from backend
  const fetchProducts = async () => {
    setLoading(true);
    try {
      const res = await api.get("/marketplace");
      setProducts(res.data);
    } catch (err) {
      console.error("Error fetching products:", err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch user listings
  const fetchMyListings = async () => {
    if (!isLoggedIn) return;
    try {
      const res = await api.get("/marketplace/my-listings");
      setMyListings(res.data);
    } catch (err) {
      console.error("Error fetching seller listings:", err);
    }
  };

  const fetchOrders = async () => {
    if (!isLoggedIn) return;
    setOrdersLoading(true);
    try {
      const res = await api.get("/marketplace/orders");
      setOrders(res.data);
    } catch (err) {
      console.error("Error fetching order history:", err);
    } finally {
      setOrdersLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
    if (isLoggedIn) {
      fetchMyListings();
      fetchOrders();
    }
  }, [isLoggedIn]);

  // Save cart to local storage
  useEffect(() => {
    localStorage.setItem("sk_cart", JSON.stringify(cart));
  }, [cart]);

  // Derived counts for categories
  const countsByCategory = useMemo(() => {
    const base = { "All Products": products.length };
    CATEGORIES.slice(1).forEach((cat) => {
      base[cat.name] = 0;
    });
    products.forEach((p) => {
      if (p.category) {
        base[p.category] = (base[p.category] || 0) + 1;
      }
    });
    return base;
  }, [products]);

  // Filtered and Sorted products
  const filteredProducts = useMemo(() => {
    let list = [...products];

    if (selectedCategory !== "All Products") {
      list = list.filter((p) => p.category === selectedCategory);
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q) ||
          p.seller.toLowerCase().includes(q)
      );
    }

    if (sortBy === "price-low") {
      list.sort((a, b) => a.price - b.price);
    } else if (sortBy === "price-high") {
      list.sort((a, b) => b.price - a.price);
    } else if (sortBy === "rating") {
      list.sort((a, b) => b.rating - a.rating);
    }

    return list;
  }, [products, search, selectedCategory, sortBy]);

  // Cart actions
  const handleAddToCart = (product, e) => {
    if (e) e.stopPropagation();
    
    // Check if the item is in stock
    if (product.stock === "Sold Out") {
      alert("This item is currently sold out.");
      return;
    }

    setCart((prev) => {
      const existing = prev.find((item) => item.product._id === product._id);
      if (existing) {
        return prev.map((item) =>
          item.product._id === product._id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
    setIsCartOpen(true);
  };

  const handleUpdateQuantity = (productId, delta) => {
    setCart((prev) => {
      return prev
        .map((item) => {
          if (item.product._id === productId) {
            const nextQty = item.quantity + delta;
            return { ...item, quantity: nextQty };
          }
          return item;
        })
        .filter((item) => item.quantity > 0);
    });
  };

  // Calculate cart total with mock bulk discount if applicable
  const cartItemCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const cartTotalBeforeDiscount = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  
  // Bulk discount rule: 10% off items with quantity >= 10
  const cartDiscount = useMemo(() => {
    let discount = 0;
    cart.forEach(item => {
      if (item.quantity >= 10) {
        discount += (item.product.price * item.quantity) * 0.1; // 10% discount on that item
      }
    });
    return Math.round(discount);
  }, [cart]);

  const cartTotal = cartTotalBeforeDiscount - cartDiscount;

  const handleCheckout = () => {
    if (!isLoggedIn) {
      alert("Please log in to complete your purchase.");
      window.location.href = "/login";
      return;
    }
    setShowBillDesk(true);
    setPaymentStep(1);
    setPaymentOtp("");
  };

  const completeBillDeskPayment = async () => {
    setBillDeskLoading(true);
    // Simulate loading for verification
    await new Promise((resolve) => setTimeout(resolve, 1500));
    try {
      const res = await api.post("/marketplace/checkout", {
        cartItems: cart.map((i) => ({ productId: i.product._id, quantity: i.quantity }))
      });
      setCheckoutStatus(res.data);
      setCart([]); // Clear cart
      setShowBillDesk(false);
      fetchProducts(); // Refresh list to catch stock updates
      fetchOrders(); // Refresh order history
    } catch (err) {
      console.error(err);
      alert("Checkout failed. Please verify you are logged in.");
    } finally {
      setBillDeskLoading(false);
    }
  };

  // Farmer listing upload
  const handleSellProduct = async (e) => {
    e.preventDefault();
    if (!sellForm.name || !sellForm.price || !sellForm.unit) {
      alert("Please fill in the Item Name, Price, and Unit.");
      return;
    }
    if (Number(sellForm.price) <= 0) {
      alert("Please enter a valid price greater than zero.");
      return;
    }
    setSellLoading(true);
    try {
      // Package details inside description
      let detailedDesc = sellForm.description;
      if (sellForm.category === "Seeds" && sellForm.germinationRate) {
        detailedDesc += `\n[Germination Rate: ${sellForm.germinationRate}%]`;
      } else if (sellForm.category === "Fertilizers" && sellForm.npkRatio) {
        detailedDesc += `\n[NPK Formula: ${sellForm.npkRatio}]`;
      } else if (sellForm.category === "Produce" && sellForm.harvestDate) {
        detailedDesc += `\n[Harvest Date: ${new Date(sellForm.harvestDate).toLocaleDateString()}]`;
      }

      if (sellForm.liveLink) {
        detailedDesc += `\n[Live Link: ${sellForm.liveLink}]`;
      }

      await api.post("/marketplace", {
        name: sellForm.name,
        category: sellForm.category,
        price: Number(sellForm.price),
        unit: sellForm.unit,
        image: sellForm.image || "",
        description: detailedDesc
      });

      setSellForm({
        name: "",
        category: "Produce",
        price: "",
        unit: "/kg",
        image: "",
        description: "",
        germinationRate: "",
        npkRatio: "",
        harvestDate: "",
        liveLink: ""
      });
      setShowSellForm(false);
      fetchProducts();
      fetchMyListings();
      alert("Product listed successfully in the Bazaar!");
    } catch (err) {
      console.error(err);
      alert("Failed to submit listing: " + (err.response?.data?.message || err.message));
    } finally {
      setSellLoading(false);
    }
  };

  // Toggle stock status
  const handleToggleStock = async (productId, currentStock) => {
    try {
      await api.patch(`/marketplace/${productId}/stock`);
      fetchProducts();
      fetchMyListings();
    } catch (err) {
      console.error("Failed to toggle stock status:", err);
      alert("Error updating stock status.");
    }
  };

  // Delete product
  const handleDeleteListing = async (productId) => {
    if (!window.confirm("Are you sure you want to pull this listing from the Bazaar?")) return;
    try {
      await api.delete(`/marketplace/${productId}`);
      fetchProducts();
      fetchMyListings();
    } catch (err) {
      console.error("Failed to delete listing:", err);
      alert("Error deleting listing.");
    }
  };

  // Reference guide fetch helper
  const getReferencePrice = (productName) => {
    // Find partial match
    const key = Object.keys(MARKET_REF_PRICES).find(
      (k) => productName.toLowerCase().includes(k.toLowerCase())
    );
    return key ? MARKET_REF_PRICES[key] : null;
  };

  const displayCategoryName = (catName) => {
    if (catName === "All Products") return language === 'mr' ? 'सर्व उत्पादने' : 'All Products';
    if (catName === "Seeds") return language === 'mr' ? 'बियाणे' : 'Seeds';
    if (catName === "Fertilizers") return language === 'mr' ? 'खते' : 'Fertilizers';
    if (catName === "Tools") return language === 'mr' ? 'साधने' : 'Tools';
    if (catName === "Equipment") return language === 'mr' ? 'अवजारे (Equipment)' : 'Equipment';
    if (catName === "Pesticides") return language === 'mr' ? 'कीटकनाशके' : 'Pesticides';
    if (catName === "Produce") return language === 'mr' ? 'कृषी उत्पन्न (Produce)' : 'Produce';
    return catName;
  };

  return (
    <main className="app-container" style={{ position: "relative" }}>
      {/* Banner */}
      <div 
        className="card" 
        style={{ 
          background: "linear-gradient(135deg, #0d9488, #115e59)", 
          color: "white", 
          display: "flex", 
          flexDirection: "row", 
          justifyContent: "space-between", 
          alignItems: "center",
          flexWrap: "wrap",
          gap: 16
        }}
      >
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 800, margin: 0 }}>{t("bazaarTitle")}</h1>
          <p style={{ opacity: 0.9, marginTop: 4, marginBottom: 0, fontSize: 14 }}>
            {t("bazaarSubtitle")}
          </p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          {isLoggedIn && (
            <button 
              className="button" 
              style={{ background: viewMode === "dashboard" ? "#0f766e" : "#0284c7" }}
              onClick={() => {
                setViewMode(viewMode === "browse" ? "dashboard" : "browse");
                setShowSellForm(false);
              }}
            >
              {viewMode === "browse" ? t("bazaarSellerCenter") : t("bazaarBrowse")}
            </button>
          )}
          <button className="button" style={{ background: "#f59e0b" }} onClick={() => setIsCartOpen(true)}>
            {t("bazaarCart")} ({cartItemCount})
          </button>
        </div>
      </div>

      {viewMode === "browse" ? (
        <>
          {/* Categories Horizontal Grid */}
          <div style={{ margin: "24px 0" }}>
            <h3 style={{ fontSize: 16, marginBottom: 12 }}>{t("bazaarFilterCategory")}</h3>
            <div 
              style={{ 
                display: "grid", 
                gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))", 
                gap: 12 
              }}
            >
              {CATEGORIES.map((cat) => (
                <div
                  key={cat.name}
                  onClick={() => setSelectedCategory(cat.name)}
                  style={{
                    padding: "16px 12px",
                    borderRadius: 12,
                    background: "var(--bg-card)",
                    border: "2px solid",
                    borderColor: selectedCategory === cat.name ? cat.color : "var(--border-color)",
                    textAlign: "center",
                    cursor: "pointer",
                    transition: "all 0.2s ease",
                    boxShadow: selectedCategory === cat.name ? "0 4px 12px rgba(0,0,0,0.08)" : "none",
                    transform: selectedCategory === cat.name ? "translateY(-2px)" : "none"
                  }}
                >
                  <div style={{ fontSize: 24, marginBottom: 6 }}>{cat.icon}</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-dark)" }}>{displayCategoryName(cat.name)}</div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
                    ({countsByCategory[cat.name] || 0})
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Search, Sort, and Sell Control Row */}
          <div 
            style={{ 
              display: "flex", 
              justifyContent: "space-between", 
              alignItems: "center", 
              gap: 16, 
              margin: "24px 0",
              flexWrap: "wrap"
            }}
          >
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", flexGrow: 1 }}>
              <input
                className="input"
                style={{ width: "min(320px, 100%)", margin: 0 }}
                placeholder={t("bazaarSearchPlaceholder")}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />

              <select
                className="input"
                style={{ width: 160, margin: 0 }}
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
              >
                <option value="popular">{t("bazaarSortPopularity")}</option>
                <option value="rating">{t("bazaarSortRating")}</option>
                <option value="price-low">{t("bazaarSortPriceLow")}</option>
                <option value="price-high">{t("bazaarSortPriceHigh")}</option>
              </select>
            </div>

            {isLoggedIn ? (
              <button 
                className="button" 
                style={{ background: "#16a34a", margin: 0 }}
                onClick={() => setShowSellForm(!showSellForm)}
              >
                {showSellForm ? t("bazaarCloseForm") : t("bazaarListSurplus")}
              </button>
            ) : (
              <div style={{ fontSize: 13, color: "var(--text-muted)" }}>
                {t("bazaarLoginToSell")}
              </div>
            )}
          </div>



          {/* Sell Form */}
          {showSellForm && (
            <div className="card" style={{ border: "2px solid #16a34a", animation: "slideDown 0.25s ease", marginBottom: 24 }}>
              <h3 style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span>🌾</span> {t("bazaarListHarvestTitle")}
              </h3>
              <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 16 }}>
                {t("bazaarListHarvestDesc")}
              </p>

              <form onSubmit={handleSellProduct} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 20 }}>
                <div>
                  <label style={{ fontWeight: 600, fontSize: 13, display: "block", marginBottom: 4 }}>{t("bazaarItemName")}</label>
                  <input
                    type="text"
                    className="input"
                    required
                    placeholder="e.g. Organic Basmati Rice, Red Potatoes, Mustard seeds"
                    value={sellForm.name}
                    onChange={(e) => setSellForm({ ...sellForm, name: e.target.value })}
                  />

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <div>
                      <label style={{ fontWeight: 600, fontSize: 13, display: "block", marginBottom: 4 }}>{t("bazaarCategory")}</label>
                      <select
                        className="input"
                        value={sellForm.category}
                        onChange={(e) => setSellForm({ ...sellForm, category: e.target.value })}
                      >
                        <option value="Produce">{language === 'mr' ? 'कृषी उत्पन्न (Produce)' : 'Produce (Farmer Harvest)'}</option>
                        <option value="Seeds">{language === 'mr' ? 'बियाणे' : 'Seeds'}</option>
                        <option value="Fertilizers">{language === 'mr' ? 'खते' : 'Fertilizers'}</option>
                        <option value="Tools">{language === 'mr' ? 'साधने' : 'Tools'}</option>
                        <option value="Equipment">{language === 'mr' ? 'अवजारे (Equipment)' : 'Equipment'}</option>
                        <option value="Pesticides">{language === 'mr' ? 'कीटकनाशके' : 'Pesticides'}</option>
                      </select>
                    </div>

                    <div>
                      <label style={{ fontWeight: 600, fontSize: 13, display: "block", marginBottom: 4 }}>{t("bazaarSaleUnit")}</label>
                      <input
                        type="text"
                        className="input"
                        required
                        placeholder="e.g. /kg, /quintal, /bag"
                        value={sellForm.unit}
                        onChange={(e) => setSellForm({ ...sellForm, unit: e.target.value })}
                      />
                    </div>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <div>
                      <label style={{ fontWeight: 600, fontSize: 13, display: "block", marginBottom: 4 }}>{t("bazaarWholesalePrice")}</label>
                      <input
                        type="number"
                        className="input"
                        required
                        placeholder="e.g. 1850"
                        value={sellForm.price}
                        onChange={(e) => setSellForm({ ...sellForm, price: e.target.value })}
                      />
                    </div>
                    
                    <div style={{ display: "flex", flexDirection: "column", justifyContent: "flex-end", paddingBottom: 12 }}>
                      {/* Mandi Price Guideline badge */}
                      {getReferencePrice(sellForm.name) && (
                        <div style={{ fontSize: 11, background: "var(--primary-light)", color: "var(--primary-hover)", padding: "8px 10px", borderRadius: 8, fontWeight: 700 }}>
                          📈 {language === 'mr' ? 'बाजार भाव संदर्भ' : 'APMC'}: {getReferencePrice(sellForm.name).price}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Category-Specific Form Fields */}
                  {sellForm.category === "Seeds" && (
                    <div style={{ animation: "fadeIn 0.2s" }}>
                      <label style={{ fontWeight: 600, fontSize: 13, display: "block", marginBottom: 4 }}>{t("bazaarSeedsGermination")}</label>
                      <input
                        type="number"
                        className="input"
                        min="1"
                        max="100"
                        placeholder="e.g. 95"
                        value={sellForm.germinationRate}
                        onChange={(e) => setSellForm({ ...sellForm, germinationRate: e.target.value })}
                      />
                    </div>
                  )}

                  {sellForm.category === "Fertilizers" && (
                    <div style={{ animation: "fadeIn 0.2s" }}>
                      <label style={{ fontWeight: 600, fontSize: 13, display: "block", marginBottom: 4 }}>{t("bazaarFertilizersRatio")}</label>
                      <input
                        type="text"
                        className="input"
                        placeholder="e.g. 19:19:19, 10:26:26"
                        value={sellForm.npkRatio}
                        onChange={(e) => setSellForm({ ...sellForm, npkRatio: e.target.value })}
                      />
                    </div>
                  )}

                  {sellForm.category === "Produce" && (
                    <div style={{ animation: "fadeIn 0.2s" }}>
                      <label style={{ fontWeight: 600, fontSize: 13, display: "block", marginBottom: 4 }}>{t("bazaarProduceHarvestDate")}</label>
                      <input
                        type="date"
                        className="input"
                        value={sellForm.harvestDate}
                        onChange={(e) => setSellForm({ ...sellForm, harvestDate: e.target.value })}
                      />
                    </div>
                  )}
                </div>

                <div>
                  <label style={{ fontWeight: 600, fontSize: 13, display: "block", marginBottom: 4 }}>{t("bazaarItemDesc")}</label>
                  <textarea
                    className="input"
                    rows={3}
                    placeholder="Details about seed source, organic standards, packaging size, minimum purchase orders..."
                    value={sellForm.description}
                    onChange={(e) => setSellForm({ ...sellForm, description: e.target.value })}
                  />

                  {/* Upload Image Section */}
                  <label style={{ fontWeight: 600, fontSize: 13, display: "block", marginTop: 12, marginBottom: 4 }}>
                    {t("bazaarUploadImage")}
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageFileChange}
                    style={{ marginBottom: 12, display: "block", fontSize: 13 }}
                    disabled={uploadingImage}
                  />
                  {uploadingImage && (
                    <div style={{ fontSize: 12, color: "var(--primary)", marginBottom: 10, fontWeight: 700 }}>
                      {t("bazaarUploadingImage")}
                    </div>
                  )}



                  {sellForm.image && (
                    <div style={{ marginBottom: 12, textAlign: "center" }}>
                      <img 
                        src={getProductImageUrl(sellForm.image)} 
                        alt="Listing Preview" 
                        style={{ height: 80, borderRadius: 8, objectFit: "cover", border: "1px solid var(--border-color)" }}
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = getFallbackImage({ category: sellForm.category, name: sellForm.name });
                        }}
                      />
                    </div>
                  )}

                  <button type="submit" className="button" style={{ width: "100%", background: "#16a34a", marginTop: 8 }} disabled={sellLoading}>
                    {sellLoading ? t("bazaarPublishing") : t("bazaarPublishListing")}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Product Catalog Grid */}
          {loading ? (
            <div style={{ textAlign: "center", padding: "60px 0" }}>
              <span style={{ fontSize: 32 }}>🌾</span>
              <h3>{t("bazaarLoadingInventory")}</h3>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="card" style={{ textAlign: "center", padding: "60px 0" }}>
              <h4>{t("bazaarNoProductsMatched")}</h4>
              <p style={{ color: "var(--text-muted)", fontSize: 13, marginTop: 4 }}>{t("bazaarTryClearing")}</p>
            </div>
          ) : (
            <div 
              style={{ 
                display: "grid", 
                gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", 
                gap: 20 
              }}
            >
              {filteredProducts.map((p) => {
                const refPrice = getReferencePrice(p.name);
                return (
                  <div 
                    key={p._id} 
                    className="card" 
                    onClick={() => setSelectedProduct(p)}
                    style={{ 
                      padding: 12, 
                      display: "flex", 
                      flexDirection: "column", 
                      gap: 8, 
                      margin: 0,
                      cursor: "pointer",
                      transition: "transform 0.2s, box-shadow 0.2s",
                      position: "relative"
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = "translateY(-4px)";
                      e.currentTarget.style.boxShadow = "0 8px 24px rgba(0,0,0,0.08)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = "none";
                      e.currentTarget.style.boxShadow = "none";
                    }}
                  >
                    {/* Image */}
                    <div style={{ position: "relative", height: 150, borderRadius: 8, overflow: "hidden", background: "#f1f5f9" }}>
                      <img
                        src={getProductImageUrl(p.image) || getFallbackImage(p)}
                        alt={p.name}
                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = getFallbackImage(p);
                        }}
                      />
                      <span 
                        style={{
                          position: "absolute",
                          top: 8,
                          right: 8,
                          background: p.stock === "In Stock" ? "rgba(22, 163, 74, 0.9)" : "rgba(220, 38, 38, 0.9)",
                          color: "white",
                          fontSize: 10,
                          padding: "2px 6px",
                          borderRadius: 4,
                          fontWeight: 700
                        }}
                      >
                        {p.stock === "In Stock" ? (language === 'mr' ? 'शिल्लक आहे' : 'In Stock') : (language === 'mr' ? 'विक्री झाली' : 'Sold Out')}
                      </span>
                    </div>

                    {/* Details */}
                    <div style={{ display: "flex", flexDirection: "column", gap: 3, flexGrow: 1 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontSize: 10, fontWeight: 700, color: "#16a34a", textTransform: "uppercase" }}>
                          {displayCategoryName(p.category)}
                        </span>
                        {p.sellerId && (
                          <span style={{ fontSize: 9, background: "#dbeafe", color: "#1e40af", padding: "1px 4px", borderRadius: 4, fontWeight: 700 }}>
                            {t("bazaarFarmerDirect")}
                          </span>
                        )}
                      </div>
                      
                      <strong style={{ fontSize: 15, color: "var(--text-dark)", display: "block" }}>{p.name}</strong>
                      <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{language === 'mr' ? 'विक्रेता' : 'Seller'}: {p.seller}</span>
                      
                      {/* Live specifications tags */}
                      {(() => {
                        const { specs } = parseDescriptionSpecs(p.description);
                        return (
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 2 }}>
                            {specs.germinationRate && (
                              <span style={{ fontSize: 10, background: "#f0fdf4", color: "#166534", padding: "2px 6px", borderRadius: 4, fontWeight: 700 }}>
                                🌱 Germination: {specs.germinationRate}%
                              </span>
                            )}
                            {specs.npkRatio && (
                              <span style={{ fontSize: 10, background: "#eff6ff", color: "#1e40af", padding: "2px 6px", borderRadius: 4, fontWeight: 700 }}>
                                🧪 NPK: {specs.npkRatio}
                              </span>
                            )}
                            {specs.harvestDate && (
                              <span style={{ fontSize: 10, background: "#fff7ed", color: "#9a3412", padding: "2px 6px", borderRadius: 4, fontWeight: 700 }}>
                                🍎 Harvest: {specs.harvestDate}
                              </span>
                            )}
                            {specs.liveLink && (
                              <a
                                href={specs.liveLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{
                                  fontSize: 10,
                                  background: "#eff6ff",
                                  color: "#2563eb",
                                  padding: "2px 6px",
                                  borderRadius: 4,
                                  fontWeight: 700,
                                  textDecoration: "none",
                                  border: "1px solid #bfdbfe",
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: 2
                                }}
                                onClick={(e) => e.stopPropagation()}
                              >
                                🔗 {language === 'mr' ? 'लाइव्ह लिंक' : 'Live Link'}
                              </a>
                            )}
                          </div>
                        );
                      })()}

                      <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "#eab308", marginTop: 4 }}>
                        <span>⭐ {p.rating.toFixed(1)}</span>
                        <span style={{ color: "var(--text-muted)" }}>({p.reviews || 0} {language === 'mr' ? 'पुनरावलोकने' : 'reviews'})</span>
                      </div>
 
                      {/* Display referenced mandi prices */}
                      {refPrice && (
                        <div style={{ fontSize: 11, color: "var(--primary-hover)", background: "var(--primary-light)", padding: "4px 8px", borderRadius: 6, marginTop: 4, fontWeight: 600 }}>
                          📈 {t("bazaarMandiRef")}: {refPrice.price}
                        </div>
                      )}
                    </div>

                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8 }}>
                      <div>
                        <strong style={{ fontSize: 18, color: "var(--text-dark)" }}>₹{p.price}</strong>
                        <span style={{ fontSize: 11, color: "var(--text-muted)" }}> {p.unit}</span>
                      </div>
                      <button 
                        className="button" 
                        style={{ padding: "6px 12px", fontSize: 12, opacity: p.stock === "Sold Out" ? 0.5 : 1 }} 
                        disabled={p.stock === "Sold Out"}
                        onClick={(e) => handleAddToCart(p, e)}
                      >
                        {t("bazaarAddToCart")}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      ) : (
        /* Seller Center / Dashboard View */
        <div style={{ marginTop: 24, animation: "fadeIn 0.25s ease" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
            <h2>Seller Center Dashboard</h2>
            <button className="button" style={{ background: "#16a34a" }} onClick={() => setShowSellForm(!showSellForm)}>
              {showSellForm ? "Close Listing Form" : "📢 List New Item"}
            </button>
          </div>

          {/* Quick Metrics */}
          <div 
            style={{ 
              display: "grid", 
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", 
              gap: 16,
              marginBottom: 24
            }}
          >
            <div className="card" style={{ textAlign: "center", padding: 20 }}>
              <div style={{ fontSize: 28 }}>📦</div>
              <strong style={{ fontSize: 24, color: "var(--text-dark)" }}>{myListings.length}</strong>
              <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Active Listings</div>
            </div>
            <div className="card" style={{ textAlign: "center", padding: 20 }}>
              <div style={{ fontSize: 28 }}>✅</div>
              <strong style={{ fontSize: 24, color: "#16a34a" }}>
                {myListings.filter(p => p.stock === "In Stock").length}
              </strong>
              <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Available Items</div>
            </div>
            <div className="card" style={{ textAlign: "center", padding: 20 }}>
              <div style={{ fontSize: 28 }}>💰</div>
              <strong style={{ fontSize: 24, color: "#d97706" }}>
                ₹{myListings.reduce((sum, p) => sum + (p.price * 25), 0).toLocaleString()}
              </strong>
              <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Est. Value (25 units sold)</div>
            </div>
          </div>

          {/* Sell Form inside Seller Dashboard if toggled */}
          {showSellForm && (
            <div className="card" style={{ border: "2px solid #16a34a", animation: "slideDown 0.25s ease", marginBottom: 24 }}>
              <h3>📢 List Your Harvest Surplus</h3>
              <form onSubmit={handleSellProduct} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 20 }}>
                <div>
                  <label style={{ fontWeight: 600, fontSize: 13, display: "block", marginBottom: 4 }}>Item / Crop Name *</label>
                  <input
                    type="text"
                    className="input"
                    required
                    placeholder="e.g. Organic Basmati Rice, Red Potatoes, Mustard seeds"
                    value={sellForm.name}
                    onChange={(e) => setSellForm({ ...sellForm, name: e.target.value })}
                  />

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <div>
                      <label style={{ fontWeight: 600, fontSize: 13, display: "block", marginBottom: 4 }}>Category</label>
                      <select
                        className="input"
                        value={sellForm.category}
                        onChange={(e) => setSellForm({ ...sellForm, category: e.target.value })}
                      >
                        <option value="Produce">Produce (Farmer Harvest)</option>
                        <option value="Seeds">Seeds</option>
                        <option value="Fertilizers">Fertilizers</option>
                        <option value="Tools">Tools</option>
                        <option value="Equipment">Equipment</option>
                        <option value="Pesticides">Pesticides</option>
                      </select>
                    </div>
                    <div>
                      <label style={{ fontWeight: 600, fontSize: 13, display: "block", marginBottom: 4 }}>Sale Unit *</label>
                      <input
                        type="text"
                        className="input"
                        required
                        placeholder="e.g. /quintal, /kg, /bag"
                        value={sellForm.unit}
                        onChange={(e) => setSellForm({ ...sellForm, unit: e.target.value })}
                      />
                    </div>
                  </div>

                  <label style={{ fontWeight: 600, fontSize: 13, display: "block", marginBottom: 4 }}>Wholesale Price (₹) *</label>
                  <input
                    type="number"
                    className="input"
                    required
                    placeholder="e.g. 2100"
                    value={sellForm.price}
                    onChange={(e) => setSellForm({ ...sellForm, price: e.target.value })}
                  />

                  {/* Category-Specific Form Fields */}
                  {sellForm.category === "Seeds" && (
                    <div style={{ animation: "fadeIn 0.2s" }}>
                      <label style={{ fontWeight: 600, fontSize: 13, display: "block", marginBottom: 4 }}>Seeds Germination Rate (%)</label>
                      <input
                        type="number"
                        className="input"
                        min="1"
                        max="100"
                        placeholder="e.g. 95"
                        value={sellForm.germinationRate}
                        onChange={(e) => setSellForm({ ...sellForm, germinationRate: e.target.value })}
                      />
                    </div>
                  )}

                  {sellForm.category === "Fertilizers" && (
                    <div style={{ animation: "fadeIn 0.2s" }}>
                      <label style={{ fontWeight: 600, fontSize: 13, display: "block", marginBottom: 4 }}>NPK chemical ratio</label>
                      <input
                        type="text"
                        className="input"
                        placeholder="e.g. 19:19:19, 10:26:26"
                        value={sellForm.npkRatio}
                        onChange={(e) => setSellForm({ ...sellForm, npkRatio: e.target.value })}
                      />
                    </div>
                  )}

                  {sellForm.category === "Produce" && (
                    <div style={{ animation: "fadeIn 0.2s" }}>
                      <label style={{ fontWeight: 600, fontSize: 13, display: "block", marginBottom: 4 }}>Harvest Date</label>
                      <input
                        type="date"
                        className="input"
                        value={sellForm.harvestDate}
                        onChange={(e) => setSellForm({ ...sellForm, harvestDate: e.target.value })}
                      />
                    </div>
                  )}
                </div>

                <div>
                  <label style={{ fontWeight: 600, fontSize: 13, display: "block", marginBottom: 4 }}>Item Description</label>
                  <textarea
                    className="input"
                    rows={3}
                    placeholder="Describe crop quality, organic details, harvest region..."
                    value={sellForm.description}
                    onChange={(e) => setSellForm({ ...sellForm, description: e.target.value })}
                  />

                  <label style={{ fontWeight: 600, fontSize: 13, display: "block", marginBottom: 4 }}>Live Product URL (Optional)</label>
                  <input
                    type="url"
                    className="input"
                    placeholder="e.g., https://example.com/product"
                    value={sellForm.liveLink || ""}
                    onChange={(e) => setSellForm({ ...sellForm, liveLink: e.target.value })}
                    style={{ marginBottom: 12 }}
                  />

                  <label style={{ fontWeight: 600, fontSize: 13, display: "block", marginBottom: 4 }}>Upload Product Image (Recommended)</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageFileChange}
                    style={{ marginBottom: 12, display: "block", fontSize: 13 }}
                    disabled={uploadingImage}
                  />
                  {uploadingImage && (
                    <div style={{ fontSize: 12, color: "var(--primary)", marginBottom: 10, fontWeight: 700 }}>
                      ⏳ Uploading photo to server...
                    </div>
                  )}



                  {sellForm.image && (
                    <div style={{ marginBottom: 12, textAlign: "center" }}>
                      <img 
                        src={getProductImageUrl(sellForm.image)} 
                        alt="Listing Preview" 
                        style={{ height: 80, borderRadius: 8, objectFit: "cover", border: "1px solid var(--border-color)" }}
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = getFallbackImage({ category: sellForm.category, name: sellForm.name });
                        }}
                      />
                    </div>
                  )}

                  <button type="submit" className="button" style={{ width: "100%", background: "#16a34a" }} disabled={sellLoading}>
                    {sellLoading ? "Publishing..." : "Publish Listing"}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Dashboard Tab Selector */}
          <div style={{ display: "flex", gap: 10, borderBottom: "1px solid var(--border-color)", paddingBottom: 10, marginBottom: 20 }}>
            <button
              type="button"
              className={`ai-tab ${dashboardTab === "listings" ? "ai-tab-active" : ""}`}
              style={{
                background: "transparent",
                border: "none",
                fontWeight: 700,
                fontSize: 14,
                color: dashboardTab === "listings" ? "var(--primary)" : "var(--text-muted)",
                borderBottom: dashboardTab === "listings" ? "2px solid var(--primary)" : "none",
                cursor: "pointer",
                paddingBottom: 6,
                margin: 0
              }}
              onClick={() => setDashboardTab("listings")}
            >
              🚜 {language === 'mr' ? 'माझी विक्री उत्पादने' : 'My Sales Listings'}
            </button>
            <button
              type="button"
              className={`ai-tab ${dashboardTab === "orders" ? "ai-tab-active" : ""}`}
              style={{
                background: "transparent",
                border: "none",
                fontWeight: 700,
                fontSize: 14,
                color: dashboardTab === "orders" ? "var(--primary)" : "var(--text-muted)",
                borderBottom: dashboardTab === "orders" ? "2px solid var(--primary)" : "none",
                cursor: "pointer",
                paddingBottom: 6,
                margin: 0
              }}
              onClick={() => setDashboardTab("orders")}
            >
              📜 {language === 'mr' ? 'माझा खरेदी इतिहास' : 'My Purchase History'}
            </button>
          </div>

          {dashboardTab === "listings" ? (
            /* Seller Listings List */
            <div className="card">
              <h3>My Active Bazaar Listings</h3>
              {myListings.length === 0 ? (
                <div style={{ textAlign: "center", padding: "40px 0", color: "var(--text-muted)" }}>
                  <span>🚜</span>
                  <p style={{ marginTop: 12 }}>You have not listed any items for sale in the Bazaar yet.</p>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {myListings.map((p) => (
                    <div 
                      key={p._id} 
                      style={{ 
                        display: "flex", 
                        alignItems: "center", 
                        justifyContent: "space-between", 
                        padding: "12px", 
                        border: "1px solid var(--border-color)",
                        borderRadius: 8,
                        flexWrap: "wrap",
                        gap: 12
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <img 
                          src={getProductImageUrl(p.image) || getFallbackImage(p)}
                          alt={p.name} 
                          style={{ width: 50, height: 50, borderRadius: 6, objectFit: "cover" }}
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = getFallbackImage(p);
                          }}
                        />
                        <div>
                          <strong style={{ fontSize: 15, display: "block" }}>{p.name}</strong>
                          <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
                            ₹{p.price} {p.unit} • <span style={{ textTransform: "uppercase", fontWeight: 700, color: "var(--primary)" }}>{p.category}</span>
                          </span>
                        </div>
                      </div>

                      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        <button 
                          className="button"
                          style={{ 
                            background: p.stock === "In Stock" ? "#16a34a" : "#dc2626", 
                            padding: "6px 12px", 
                            fontSize: 12,
                            margin: 0
                          }}
                          onClick={() => handleToggleStock(p._id, p.stock)}
                        >
                          {p.stock === "In Stock" ? "Mark Sold Out" : "Mark Available"}
                        </button>
                        <button 
                          className="button" 
                          style={{ background: "#ef4444", padding: "6px 12px", fontSize: 12, margin: 0 }}
                          onClick={() => handleDeleteListing(p._id)}
                        >
                          🗑️ Pull Item
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            /* Purchase History List */
            <div className="card">
              <h3>{language === 'mr' ? 'माझा खरेदी इतिहास' : 'My Purchase History'}</h3>
              {ordersLoading ? (
                <div style={{ textAlign: "center", padding: "40px 0" }}>
                  <span className="spinner-dot"></span>
                  <p style={{ marginTop: 8 }}>{language === 'mr' ? 'इतिहास लोड करत आहे...' : 'Loading order history...'}</p>
                </div>
              ) : orders.length === 0 ? (
                <div style={{ textAlign: "center", padding: "40px 0", color: "var(--text-muted)" }}>
                  <span style={{ fontSize: 40 }}>🛒</span>
                  <p style={{ marginTop: 12 }}>{language === 'mr' ? 'तुम्ही अद्याप बाजारातून कोणतीही खरेदी केलेली नाही.' : 'You have not made any purchases in the Bazaar yet.'}</p>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  {orders.map((order) => (
                    <div 
                      key={order._id}
                      style={{
                        border: "1px solid var(--border-color)",
                        borderRadius: 10,
                        padding: 16,
                        background: "#fff",
                        boxShadow: "0 1px 3px rgba(0,0,0,0.05)"
                      }}
                    >
                      {/* Order Header */}
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8, borderBottom: "1px solid #f1f5f9", paddingBottom: 12, marginBottom: 12 }}>
                        <div>
                          <strong style={{ fontSize: 14, color: "var(--text-dark)", display: "block" }}>{order.orderId}</strong>
                          <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
                            {new Date(order.createdAt).toLocaleString()}
                          </span>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <span 
                            style={{ 
                              padding: "4px 8px", 
                              borderRadius: 4, 
                              fontSize: 11, 
                              fontWeight: 700,
                              background: "#fef3c7", 
                              color: "#d97706",
                              textTransform: "uppercase"
                            }}
                          >
                            {order.status}
                          </span>
                          <strong style={{ fontSize: 16, color: "var(--primary)" }}>₹{order.totalAmount}</strong>
                        </div>
                      </div>

                      {/* Order Items */}
                      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                        {order.items.map((item, idx) => (
                          <div key={idx} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                              <img 
                                src={getProductImageUrl(item.image) || getFallbackImage(item)}
                                alt={item.name}
                                style={{ width: 40, height: 40, borderRadius: 6, objectFit: "cover", border: "1px solid #f1f5f9" }}
                                onError={(e) => {
                                  e.target.onerror = null;
                                  e.target.src = getFallbackImage(item);
                                }}
                              />
                              <div>
                                <span style={{ fontSize: 13, fontWeight: 600, display: "block", color: "var(--text-dark)" }}>{item.name}</span>
                                <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
                                  ₹{item.price} {item.unit} x {item.quantity}
                                </span>
                              </div>
                            </div>
                            <strong style={{ fontSize: 13 }}>₹{item.price * item.quantity}</strong>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* --- Detailed Product Modal --- */}
      {selectedProduct && (
        <div 
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.5)",
            zIndex: 1100,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            padding: 20
          }}
          onClick={() => setSelectedProduct(null)}
        >
          <div 
            className="card"
            style={{
              maxWidth: 550,
              width: "100%",
              maxHeight: "90vh",
              overflowY: "auto",
              position: "relative",
              padding: 24,
              animation: "zoomIn 0.2s ease",
              boxShadow: "var(--shadow-lg)"
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              style={{
                position: "absolute",
                top: 16,
                right: 16,
                background: "transparent",
                border: "none",
                fontSize: 20,
                cursor: "pointer"
              }}
              onClick={() => setSelectedProduct(null)}
            >
              ✖
            </button>

            <div style={{ height: 220, borderRadius: 12, overflow: "hidden", marginBottom: 16 }}>
              <img 
                src={getProductImageUrl(selectedProduct.image) || getFallbackImage(selectedProduct)} 
                alt={selectedProduct.name}
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = getFallbackImage(selectedProduct);
                }}
              />
            </div>

            <span style={{ fontSize: 11, fontWeight: 700, color: "#16a34a", textTransform: "uppercase", display: "block", marginBottom: 4 }}>
              {selectedProduct.category}
            </span>
            <h2 style={{ margin: "0 0 8px 0" }}>{selectedProduct.name}</h2>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div>
                <span style={{ fontSize: 24, fontWeight: 800, color: "var(--text-dark)" }}>₹{selectedProduct.price}</span>
                <span style={{ color: "var(--text-muted)" }}> {selectedProduct.unit}</span>
              </div>
              <span 
                style={{
                  background: selectedProduct.stock === "In Stock" ? "#dcfce7" : "#fee2e2",
                  color: selectedProduct.stock === "In Stock" ? "#166534" : "#991b1b",
                  padding: "4px 10px",
                  borderRadius: 6,
                  fontSize: 12,
                  fontWeight: 700
                }}
              >
                {selectedProduct.stock}
              </span>
            </div>

            {(() => {
              const { cleanDesc, specs } = parseDescriptionSpecs(selectedProduct.description);
              return (
                <div style={{ background: "#f8fafc", padding: 12, borderRadius: 8, marginBottom: 16, borderLeft: "4px solid var(--primary)" }}>
                  <strong>📋 Details & Description:</strong>
                  <p style={{ fontSize: 13, color: "#475569", margin: "4px 0 12px 0", lineHeight: 1.5, whiteSpace: "pre-line" }}>
                    {cleanDesc || "Fresh farm produce directly listed by farmer."}
                  </p>
                  
                  {(specs.germinationRate || specs.npkRatio || specs.harvestDate || specs.liveLink) && (
                    <div style={{ borderTop: "1px dashed #cbd5e1", paddingTop: 10, display: "flex", flexWrap: "wrap", gap: 10 }}>
                      {specs.germinationRate && (
                        <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", padding: "6px 10px", borderRadius: 6 }}>
                          <span style={{ display: "block", fontSize: 10, color: "#166534", fontWeight: 700, textTransform: "uppercase" }}>Germination Rate</span>
                          <strong style={{ fontSize: 14, color: "#14532d" }}>{specs.germinationRate}%</strong>
                        </div>
                      )}
                      {specs.npkRatio && (
                        <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", padding: "6px 10px", borderRadius: 6 }}>
                          <span style={{ display: "block", fontSize: 10, color: "#1e40af", fontWeight: 700, textTransform: "uppercase" }}>NPK Ratio</span>
                          <strong style={{ fontSize: 14, color: "#1e3a8a" }}>{specs.npkRatio}</strong>
                        </div>
                      )}
                      {specs.harvestDate && (
                        <div style={{ background: "#fff7ed", border: "1px solid #fed7aa", padding: "6px 10px", borderRadius: 6 }}>
                          <span style={{ display: "block", fontSize: 10, color: "#9a3412", fontWeight: 700, textTransform: "uppercase" }}>Harvest Date</span>
                          <strong style={{ fontSize: 14, color: "#7c2d12" }}>{specs.harvestDate}</strong>
                        </div>
                      )}
                      {specs.liveLink && (
                        <div style={{ background: "#e0f2fe", border: "1px solid #bae6fd", padding: "6px 10px", borderRadius: 6 }}>
                          <span style={{ display: "block", fontSize: 10, color: "#0369a1", fontWeight: 700, textTransform: "uppercase" }}>Live Listing URL</span>
                          <a href={specs.liveLink} target="_blank" rel="noopener noreferrer" style={{ fontSize: 14, color: "#0284c7", fontWeight: 700, textDecoration: "none" }}>
                            🔗 Visit Live Product
                          </a>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Bulk Discount Info */}
            <div style={{ background: "#fffbeb", border: "1px solid #fef3c7", padding: 12, borderRadius: 8, marginBottom: 16 }}>
              <strong style={{ color: "#d97706" }}>🌾 Wholesale Special Discount:</strong>
              <p style={{ fontSize: 12, color: "#92400e", margin: "4px 0 0 0" }}>
                Buy <strong>10 or more</strong> items and get an automatic <strong>10% discount</strong> on checkout! Save on logistics shipping.
              </p>
            </div>

            {/* Shipping & Seller */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, fontSize: 13, marginBottom: 20 }}>
              <div>
                <span style={{ color: "var(--text-muted)" }}>Seller Profile:</span>
                <div style={{ fontWeight: 700, marginTop: 2 }}>{selectedProduct.seller}</div>
                <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Rating: ⭐ {selectedProduct.rating.toFixed(1)} ({selectedProduct.reviews || 0} trades)</div>
              </div>
              <div>
                <span style={{ color: "var(--text-muted)" }}>Estimated Delivery:</span>
                <div style={{ fontWeight: 700, marginTop: 2, color: "var(--primary)" }}>🚚 2-3 Days (Kisan Logistics)</div>
                <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Cash on Delivery available</div>
              </div>
            </div>

            <div style={{ display: "flex", gap: 12 }}>
              <button 
                className="button"
                style={{ flex: 1, background: "#0284c7" }}
                onClick={() => {
                  alert(`📞 Contacting Seller: ${selectedProduct.seller}\nDirect helpline: +91 99887 76655\nReference Product ID: ${selectedProduct._id}\n(Simulated SMS sent)`);
                }}
              >
                📞 Contact Seller
              </button>
              <button 
                className="button"
                style={{ flex: 1, background: "#f59e0b", opacity: selectedProduct.stock === "Sold Out" ? 0.5 : 1 }}
                disabled={selectedProduct.stock === "Sold Out"}
                onClick={() => {
                  handleAddToCart(selectedProduct);
                  setSelectedProduct(null);
                }}
              >
                + Add to Cart 🛒
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cart Drawer Panel */}
      {isCartOpen && (
        <div className="cart-drawer">
          <header style={{ background: "var(--primary)", color: "white", padding: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h3 style={{ margin: 0 }}>Shopping Cart ({cartItemCount})</h3>
            <button style={{ background: "transparent", border: "none", color: "white", fontSize: 20, cursor: "pointer" }} onClick={() => { setIsCartOpen(false); setCheckoutStatus(null); }}>
              ✖
            </button>
          </header>

          <div style={{ flex: 1, overflowY: "auto", padding: 16, background: "#fafafa" }}>
            {checkoutStatus ? (
              <div style={{ textAlign: "center", padding: "24px 12px", background: "#f0fdf4", borderRadius: 12, border: "1px solid #bbf7d0", animation: "scaleUp 0.3s ease" }}>
                <span style={{ fontSize: 54, display: "block", marginBottom: 12 }}>🎉</span>
                <h4 style={{ color: "#166534", marginTop: 0, fontSize: 18, fontWeight: 800 }}>Order Confirmed!</h4>
                
                <div style={{ background: "white", padding: 12, borderRadius: 8, margin: "14px 0", border: "1px solid #e2e8f0" }}>
                  <span style={{ fontSize: 11, color: "#64748b", textTransform: "uppercase", display: "block", fontWeight: 700 }}>Transaction Order ID</span>
                  <strong style={{ fontSize: 14, color: "#0f172a", fontFamily: "monospace" }}>{checkoutStatus.orderId}</strong>
                </div>

                <p style={{ fontSize: 13, color: "#14532d", margin: "12px 0 16px 0", lineHeight: 1.5 }}>
                  {checkoutStatus.message}
                </p>

                <div style={{ background: "#e0f2fe", padding: 12, borderRadius: 8, borderLeft: "4px solid #0284c7", textAlign: "left", display: "flex", gap: 10, alignItems: "center" }}>
                  <span style={{ fontSize: 20 }}>📧</span>
                  <div style={{ fontSize: 12, color: "#0369a1" }}>
                    <strong>Email Confirmation:</strong> Digital invoice & dispatch details sent to your registered account email.
                  </div>
                </div>

                <button 
                  className="button" 
                  style={{ marginTop: 20, width: "100%", background: "#16a34a" }} 
                  onClick={() => { setIsCartOpen(false); setCheckoutStatus(null); }}
                >
                  Back to Bazaar
                </button>
              </div>
            ) : cart.length === 0 ? (
              <div style={{ textAlign: "center", padding: "40px 0", color: "var(--text-muted)" }}>
                <span style={{ fontSize: 40 }}>🛒</span>
                <p style={{ fontSize: 13, marginTop: 8 }}>Your basket is currently empty.</p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {cart.map((item) => (
                  <div key={item.product._id} style={{ background: "white", border: "1px solid var(--border-color)", padding: 10, borderRadius: 8, display: "flex", gap: 10 }}>
                    <img
                      src={getProductImageUrl(item.product.image) || getFallbackImage(item.product)}
                      alt={item.product.name}
                      style={{ width: 55, height: 55, borderRadius: 4, objectFit: "cover" }}
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = getFallbackImage(item.product);
                      }}
                    />
                    <div style={{ flex: 1 }}>
                      <strong style={{ fontSize: 13, display: "block", color: "var(--text-dark)" }}>{item.product.name}</strong>
                      <span style={{ fontSize: 11, color: "var(--text-muted)" }}>₹{item.product.price} {item.product.unit}</span>
                      
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 4 }}>
                        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                          <button style={{ padding: "1px 6px", fontSize: 11, cursor: "pointer" }} onClick={() => handleUpdateQuantity(item.product._id, -1)}>-</button>
                          <span style={{ fontSize: 12, fontWeight: 700 }}>{item.quantity}</span>
                          <button style={{ padding: "1px 6px", fontSize: 11, cursor: "pointer" }} onClick={() => handleUpdateQuantity(item.product._id, 1)}>+</button>
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <strong style={{ fontSize: 13 }}>₹{item.product.price * item.quantity}</strong>
                          {item.quantity >= 10 && (
                            <div style={{ fontSize: 9, color: "#16a34a", fontWeight: 700 }}>-10% bulk saved</div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {!checkoutStatus && cart.length > 0 && (
            <footer style={{ padding: 16, borderTop: "1px solid var(--border-color)", background: "white" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "var(--text-muted)" }}>
                  <span>Items Total:</span>
                  <span>₹{cartTotalBeforeDiscount}</span>
                </div>
                {cartDiscount > 0 && (
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "#16a34a", fontWeight: 700 }}>
                    <span>Bulk Savings:</span>
                    <span>-₹{cartDiscount}</span>
                  </div>
                )}
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 15, borderTop: "1px solid var(--border-color)", paddingTop: 8 }}>
                  <span>Total Payable:</span>
                  <strong style={{ color: "var(--text-dark)", fontSize: 18 }}>₹{cartTotal}</strong>
                </div>
              </div>
              <button className="button" style={{ width: "100%", background: "#f59e0b", fontSize: 15, margin: 0 }} onClick={handleCheckout}>
                {isLoggedIn ? (language === "mr" ? "खरेदी पूर्ण करा 🚀" : "Complete Purchase 🚀") : (language === "mr" ? "खरेदी करण्यासाठी लॉग इन करा 🔑" : "Log in to Purchase 🔑")}
              </button>
            </footer>
          )}
        </div>
      )}

      {/* --- BillDesk Payment Gateway Modal --- */}
      {showBillDesk && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.6)",
            zIndex: 1200,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            padding: 20
          }}
        >
          <div
            className="card"
            style={{
              maxWidth: 620,
              width: "100%",
              borderRadius: 16,
              overflow: "hidden",
              padding: 0,
              boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.25), 0 10px 10px -5px rgba(0, 0, 0, 0.2)",
              border: "1px solid #e2e8f0"
            }}
          >
            {/* BillDesk Corporate Header */}
            <div style={{ background: "#0c3161", color: "white", padding: "20px 24px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 24 }}>💳</span>
                <div>
                  <h3 style={{ margin: 0, fontSize: 18, color: "white", fontWeight: 800 }}>billdesk</h3>
                  <span style={{ fontSize: 10, opacity: 0.8, textTransform: "uppercase", letterSpacing: 0.5 }}>All Payments Secured</span>
                </div>
              </div>
              <button 
                style={{ background: "transparent", border: "none", color: "white", fontSize: 20, cursor: "pointer" }} 
                onClick={() => setShowBillDesk(false)}
              >
                ✕
              </button>
            </div>

            {/* Merchant Details Ribbon */}
            <div style={{ background: "#f8fafc", padding: "14px 24px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #e2e8f0" }}>
              <div>
                <span style={{ fontSize: 11, color: "#64748b", textTransform: "uppercase", display: "block" }}>Merchant Name</span>
                <strong style={{ fontSize: 14, color: "#0f172a" }}>Smart Kisan AI Bazaar</strong>
              </div>
              <div style={{ textAlign: "right" }}>
                <span style={{ fontSize: 11, color: "#64748b", textTransform: "uppercase", display: "block" }}>Amount Payable</span>
                <strong style={{ fontSize: 18, color: "#15803d" }}>₹{cartTotal}</strong>
              </div>
            </div>

            {/* Gateway UI Content */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1.8fr", minHeight: 280 }}>
              
              {/* Payment Methods Side Bar */}
              <div style={{ background: "#f1f5f9", borderRight: "1px solid #e2e8f0", display: "flex", flexDirection: "column" }}>
                <button
                  style={{
                    padding: "16px 20px", textAlign: "left", background: paymentMethod === "upi" ? "white" : "transparent",
                    color: paymentMethod === "upi" ? "#0c3161" : "#64748b", fontWeight: 700, border: "none",
                    borderLeft: paymentMethod === "upi" ? "4px solid #f97316" : "4px solid transparent", cursor: "pointer", transition: "all 0.2s"
                  }}
                  onClick={() => { setPaymentMethod("upi"); setPaymentStep(1); }}
                >
                  📱 UPI / QR Code
                </button>
                <button
                  style={{
                    padding: "16px 20px", textAlign: "left", background: paymentMethod === "cards" ? "white" : "transparent",
                    color: paymentMethod === "cards" ? "#0c3161" : "#64748b", fontWeight: 700, border: "none",
                    borderLeft: paymentMethod === "cards" ? "4px solid #f97316" : "4px solid transparent", cursor: "pointer", transition: "all 0.2s"
                  }}
                  onClick={() => { setPaymentMethod("cards"); setPaymentStep(1); }}
                >
                  💳 Credit & Debit Card
                </button>
                <button
                  style={{
                    padding: "16px 20px", textAlign: "left", background: paymentMethod === "netbanking" ? "white" : "transparent",
                    color: paymentMethod === "netbanking" ? "#0c3161" : "#64748b", fontWeight: 700, border: "none",
                    borderLeft: paymentMethod === "netbanking" ? "4px solid #f97316" : "4px solid transparent", cursor: "pointer", transition: "all 0.2s"
                  }}
                  onClick={() => { setPaymentMethod("netbanking"); setPaymentStep(1); }}
                >
                  🏛️ Net Banking
                </button>
              </div>

              {/* Payment Input Panel */}
              <div style={{ padding: 24, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                {billDeskLoading ? (
                  <div style={{ textAlign: "center", padding: "40px 0" }}>
                    <div style={{ border: "4px solid #f3f3f3", borderTop: "4px solid #f97316", borderRadius: "50%", width: 40, height: 40, animation: "spin 1s linear infinite", margin: "0 auto 16px auto" }} />
                    <strong style={{ color: "#0c3161", display: "block" }}>Verifying secure token...</strong>
                    <span style={{ fontSize: 11, color: "#64748b" }}>Please do not close this window or hit back.</span>
                  </div>
                ) : paymentStep === 1 ? (
                  <div>
                    {paymentMethod === "upi" && (
                      <div style={{ animation: "fadeIn 0.2s" }}>
                        <h4 style={{ margin: "0 0 12px 0", color: "#0f172a" }}>Pay using UPI ID</h4>
                        <input
                          type="text"
                          className="input"
                          placeholder="e.g. user@ybl, mobile@upi"
                          value={paymentDetails.upiId}
                          onChange={(e) => setPaymentDetails({ ...paymentDetails, upiId: e.target.value })}
                          style={{ marginBottom: 12 }}
                        />
                        <div style={{ textAlign: "center", background: "#f8fafc", padding: 12, borderRadius: 8, border: "1px dashed #cbd5e1", marginBottom: 12 }}>
                          <span style={{ fontSize: 12, color: "#475569", display: "block" }}>OR Scan BHIM UPI QR Code</span>
                          <div style={{ fontSize: 48, margin: "6px 0" }}>🔳</div>
                          <span style={{ fontSize: 10, color: "#64748b" }}>Universal Dynamic QR Code generated securely</span>
                        </div>
                      </div>
                    )}

                    {paymentMethod === "cards" && (
                      <div style={{ animation: "fadeIn 0.2s", display: "flex", flexDirection: "column", gap: 10 }}>
                        <h4 style={{ margin: 0, color: "#0f172a" }}>Enter Card Credentials</h4>
                        <div>
                          <label style={{ fontSize: 11, fontWeight: 700, color: "#475569" }}>Card Number</label>
                          <input
                            type="text"
                            className="input"
                            placeholder="xxxx xxxx xxxx xxxx"
                            value={paymentDetails.cardNumber}
                            onChange={(e) => setPaymentDetails({ ...paymentDetails, cardNumber: e.target.value })}
                            maxLength="19"
                          />
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                          <div>
                            <label style={{ fontSize: 11, fontWeight: 700, color: "#475569" }}>Expiry Date</label>
                            <input
                              type="text"
                              className="input"
                              placeholder="MM/YY"
                              value={paymentDetails.expiry}
                              onChange={(e) => setPaymentDetails({ ...paymentDetails, expiry: e.target.value })}
                              maxLength="5"
                            />
                          </div>
                          <div>
                            <label style={{ fontSize: 11, fontWeight: 700, color: "#475569" }}>CVV</label>
                            <input
                              type="password"
                              className="input"
                              placeholder="***"
                              value={paymentDetails.cvv}
                              onChange={(e) => setPaymentDetails({ ...paymentDetails, cvv: e.target.value })}
                              maxLength="3"
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {paymentMethod === "netbanking" && (
                      <div style={{ animation: "fadeIn 0.2s" }}>
                        <h4 style={{ margin: "0 0 12px 0", color: "#0f172a" }}>Select Your Bank</h4>
                        <select
                          className="input"
                          value={paymentDetails.netBank}
                          onChange={(e) => setPaymentDetails({ ...paymentDetails, netBank: e.target.value })}
                        >
                          <option value="sbi">State Bank of India</option>
                          <option value="hdfc">HDFC Bank</option>
                          <option value="icici">ICICI Bank</option>
                          <option value="axis">Axis Bank</option>
                          <option value="boi">Bank of India</option>
                        </select>
                        <div style={{ fontSize: 12, color: "#64748b", marginTop: 12 }}>
                          💻 You will be redirected to the secure NetBanking credentials portal of your choice.
                        </div>
                      </div>
                    )}

                    <button
                      className="button"
                      onClick={() => setPaymentStep(2)}
                      style={{ width: "100%", background: "#f97316", border: "none", color: "white", fontSize: 15, fontWeight: 700, marginTop: 20 }}
                      disabled={paymentMethod === "upi" && !paymentDetails.upiId.includes("@")}
                    >
                      Authorize Payment of ₹{cartTotal}
                    </button>
                  </div>
                ) : (
                  <div style={{ textAlign: "center" }}>
                    <h4 style={{ margin: "0 0 12px 0", color: "#0f172a" }}>Verify Secure OTP Code</h4>
                    <span style={{ fontSize: 12, color: "#475569", display: "block", marginBottom: 12 }}>
                      A secure OTP verification pin has been sent to your linked mobile number via Indian Telecom services.
                    </span>
                    <input
                      type="text"
                      className="input"
                      placeholder="Enter 6-Digit OTP"
                      maxLength="6"
                      value={paymentOtp}
                      onChange={(e) => setPaymentOtp(e.target.value)}
                      style={{ width: 180, textAlign: "center", fontSize: 18, fontWeight: "bold", letterSpacing: 3, margin: "0 auto 12px auto" }}
                    />
                    <button
                      className="button"
                      onClick={completeBillDeskPayment}
                      style={{ width: "100%", background: "#16a34a", border: "none", color: "white", fontSize: 14, fontWeight: 700, marginTop: 12 }}
                      disabled={paymentOtp.length < 4}
                    >
                      Confirm Payment Action
                    </button>
                  </div>
                )}
              </div>

            </div>

            {/* BillDesk Footer */}
            <div style={{ background: "#f1f5f9", padding: "12px 24px", fontSize: 11, color: "#64748b", textAlign: "center", borderTop: "1px solid #e2e8f0" }}>
              🔒 Verified by Visa • MasterCard SecureCode • RuPay PaySecure • ISO 27001 Certified Gateway
            </div>
          </div>
        </div>
      )}
    </main>
  );
};

export default Marketplace;
