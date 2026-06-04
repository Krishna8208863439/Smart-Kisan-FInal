import React, { useMemo, useState, useEffect } from "react";
import api from "../api";

const CATEGORIES = ["All Products", "Seeds", "Fertilizers", "Tools", "Equipment", "Pesticides", "Produce"];

const Marketplace = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All Products");
  const [sortBy, setSortBy] = useState("popular");
  
  // Shopping Cart state
  const [cart, setCart] = useState(() => {
    const saved = localStorage.getItem("sk_cart");
    return saved ? JSON.parse(saved) : [];
  });
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [checkoutStatus, setCheckoutStatus] = useState(null);

  // Farmers Bazaar: Sell Form state
  const [showSellForm, setShowSellForm] = useState(false);
  const [sellForm, setSellForm] = useState({
    name: "",
    category: "Produce",
    price: "",
    unit: "/kg",
    image: "",
    description: ""
  });
  const [sellLoading, setSellLoading] = useState(false);

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

  useEffect(() => {
    fetchProducts();
  }, []);

  // Save cart to local storage
  useEffect(() => {
    localStorage.setItem("sk_cart", JSON.stringify(cart));
  }, [cart]);

  // Derived metrics
  const countsByCategory = useMemo(() => {
    const base = { "All Products": products.length };
    CATEGORIES.slice(1).forEach((c) => (base[c] = 0));
    products.forEach((p) => {
      base[p.category] = (base[p.category] || 0) + 1;
    });
    return base;
  }, [products]);

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

  // Cart operations
  const handleAddToCart = (product) => {
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

  const cartTotal = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  const cartItemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const handleCheckout = async () => {
    try {
      const res = await api.post("/marketplace/checkout", {
        cartItems: cart.map((i) => ({ productId: i.product._id, quantity: i.quantity }))
      });
      setCheckoutStatus(res.data);
      setCart([]); // Clear cart on success
    } catch (err) {
      console.error(err);
      alert("Checkout failed. Please verify you are logged in.");
    }
  };

  // Farmers Bazaar: submit listing
  const handleSellProduct = async (e) => {
    e.preventDefault();
    if (!sellForm.name || !sellForm.price || !sellForm.unit) {
      alert("Please fill in Name, Price, and Unit.");
      return;
    }
    setSellLoading(true);
    try {
      await api.post("/marketplace", sellForm);
      setSellForm({
        name: "",
        category: "Produce",
        price: "",
        unit: "/kg",
        image: "",
        description: ""
      });
      setShowSellForm(false);
      fetchProducts(); // Reload marketplace items
    } catch (err) {
      console.error(err);
      alert("Failed to submit listing. Make sure you are logged in.");
    } finally {
      setSellLoading(false);
    }
  };

  const handleQuickImageSelect = (url) => {
    setSellForm((prev) => ({ ...prev, image: url }));
  };

  const SAMPLE_IMAGES = [
    { label: "Wheat", url: "https://images.unsplash.com/photo-1506619216599-9d16d0903dfd?auto=format&fit=crop&w=300&q=80" },
    { label: "Potato", url: "https://images.unsplash.com/photo-1518977676601-b53f82aba655?auto=format&fit=crop&w=300&q=80" },
    { label: "Rice", url: "https://images.unsplash.com/photo-1536304997881-a372c179924b?auto=format&fit=crop&w=300&q=80" },
    { label: "Tomato", url: "https://images.unsplash.com/photo-1592924357228-91a4daadcfea?auto=format&fit=crop&w=300&q=80" }
  ];

  return (
    <main className="app-container">
      {/* Header Banner */}
      <div className="card" style={{ background: "linear-gradient(135deg, #0d9488, #115e59)", color: "white", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 800 }}>Kisan Marketplace</h1>
          <p style={{ opacity: 0.9, marginTop: 4 }}>
            Trade premium seeds, specialized tools, bio-fertilizers, or sell your own farm produce directly on the Farmers Bazaar.
          </p>
        </div>
        <button className="button" style={{ background: "#f59e0b" }} onClick={() => setIsCartOpen(true)}>
          🛒 Cart <span style={{ background: "white", color: "#f59e0b", padding: "1px 6px", borderRadius: 10, marginLeft: 4, fontWeight: 800 }}>{cartItemCount}</span>
        </button>
      </div>

      {/* Control Actions Row */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 16, margin: "20px 0", alignItems: "center" }}>
        {/* Search & Sort filters */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
          <input
            className="input"
            style={{ width: 280, margin: 0 }}
            placeholder="Search crop, seed, tools, seller..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          <select
            className="input"
            style={{ width: 160, margin: 0 }}
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          <select
            className="input"
            style={{ width: 160, margin: 0 }}
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
          >
            <option value="popular">Popularity</option>
            <option value="rating">Highest Rated</option>
            <option value="price-low">Price: Low to High</option>
            <option value="price-high">Price: High to Low</option>
          </select>
        </div>

        {/* Sell produce button */}
        <button 
          className="button" 
          style={{ background: "#2563eb", padding: "12px 20px" }}
          onClick={() => setShowSellForm(!showSellForm)}
        >
          {showSellForm ? "Close Listing Form ✖" : "📢 Sell Your Produce"}
        </button>
      </div>

      {/* Farmers Bazaar: Sell Your Produce Form */}
      {showSellForm && (
        <div className="card" style={{ border: "2px solid #2563eb", animation: "slideDown 0.25s ease" }}>
          <h3>List Your Crop surplus in the Bazaar</h3>
          <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 16 }}>
            Set your wholesale pricing, upload/choose an image, and submit. Other farmers and merchants will see your listing instantly.
          </p>

          <form onSubmit={handleSellProduct} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
            <div>
              <label>Crop / Item Name *</label>
              <input
                type="text"
                className="input"
                placeholder="e.g. Organic Basmati Rice, Red Potatoes"
                value={sellForm.name}
                onChange={(e) => setSellForm({ ...sellForm, name: e.target.value })}
              />

              <label>Category</label>
              <select
                className="input"
                value={sellForm.category}
                onChange={(e) => setSellForm({ ...sellForm, category: e.target.value })}
              >
                <option value="Produce">Produce (Farmer Harvest)</option>
                <option value="Seeds">Seeds</option>
                <option value="Fertilizers">Fertilizers</option>
                <option value="Tools">Tools</option>
              </select>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label>Wholesale Price (₹) *</label>
                  <input
                    type="number"
                    className="input"
                    placeholder="e.g. 1500"
                    value={sellForm.price}
                    onChange={(e) => setSellForm({ ...sellForm, price: e.target.value })}
                  />
                </div>
                <div>
                  <label>Sale Unit *</label>
                  <input
                    type="text"
                    className="input"
                    placeholder="e.g. /quintal, /kg, /bag"
                    value={sellForm.unit}
                    onChange={(e) => setSellForm({ ...sellForm, unit: e.target.value })}
                  />
                </div>
              </div>
            </div>

            <div>
              <label>Item Description</label>
              <textarea
                className="input"
                rows={3}
                placeholder="Harvest conditions, organic practices, minimum order size..."
                value={sellForm.description}
                onChange={(e) => setSellForm({ ...sellForm, description: e.target.value })}
              />

              <label>Select Crop Photo Preset (Or paste custom URL below)</label>
              <div style={{ display: "flex", gap: 10, margin: "6px 0 12px 0" }}>
                {SAMPLE_IMAGES.map((img) => (
                  <button
                    key={img.label}
                    type="button"
                    style={{
                      padding: "4px 8px",
                      borderRadius: 6,
                      border: "1px solid",
                      borderColor: sellForm.image === img.url ? "#2563eb" : "var(--border-color)",
                      background: sellForm.image === img.url ? "#eff6ff" : "white",
                      fontSize: 12,
                      cursor: "pointer"
                    }}
                    onClick={() => handleQuickImageSelect(img.url)}
                  >
                    {img.label}
                  </button>
                ))}
              </div>

              <input
                type="text"
                className="input"
                placeholder="Custom Image URL..."
                value={sellForm.image}
                onChange={(e) => setSellForm({ ...sellForm, image: e.target.value })}
              />

              <button type="submit" className="button" style={{ width: "100%", background: "#2563eb" }} disabled={sellLoading}>
                {sellLoading ? "Publishing listing..." : "Publish Listing in Bazaar 🚀"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Marketplace Catalog layout */}
      <div style={{ display: "grid", gridTemplateColumns: "250px 1fr", gap: 24 }}>
        
        {/* Categories Sidebar Filter */}
        <aside>
          <div className="card" style={{ padding: 16 }}>
            <h4 style={{ marginBottom: 12, borderBottom: "1px solid var(--border-color)", paddingBottom: 6 }}>Categories</h4>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    width: "100%",
                    padding: "8px 12px",
                    border: "none",
                    background: selectedCategory === cat ? "var(--primary-light)" : "transparent",
                    color: selectedCategory === cat ? "var(--primary-hover)" : "var(--text-dark)",
                    fontWeight: selectedCategory === cat ? "700" : "500",
                    borderRadius: 6,
                    cursor: "pointer",
                    textAlign: "left",
                    fontSize: 13.5
                  }}
                  onClick={() => setSelectedCategory(cat)}
                >
                  <span>{cat}</span>
                  <span style={{ opacity: 0.6, fontSize: 11 }}>({countsByCategory[cat] || 0})</span>
                </button>
              ))}
            </div>
          </div>
        </aside>

        {/* Product Catalog Grid */}
        <section>
          {loading ? (
            <div style={{ textAlign: "center", padding: "60px 0" }}>
              <h3>Loading Bazaar Inventory...</h3>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="card" style={{ textAlign: "center", padding: "60px 0" }}>
              <h4>No products matches your filters.</h4>
              <p style={{ color: "var(--text-muted)", fontSize: 13, marginTop: 4 }}>Try clearing search queries or checking other categories.</p>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 20 }}>
              {filteredProducts.map((p) => (
                <div key={p._id} className="card" style={{ padding: 12, display: "flex", flexDirection: "column", gap: 8, marginBottom: 0 }}>
                  <div style={{ position: "relative", height: 140, borderRadius: 8, overflow: "hidden", background: "#eee" }}>
                    <img
                      src={p.image || "https://images.unsplash.com/photo-1592982537447-7440770cbfc8?auto=format&fit=crop&w=300&q=80"}
                      alt={p.name}
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    />
                    <span style={{
                      position: "absolute",
                      top: 8,
                      right: 8,
                      background: "rgba(0,0,0,0.6)",
                      color: "white",
                      fontSize: 10,
                      padding: "2px 6px",
                      borderRadius: 4,
                      fontWeight: 700
                    }}>
                      {p.stock}
                    </span>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: 3, flexGrow: 1 }}>
                    <span style={{ fontSize: 10, fontWeight: 700, color: "var(--secondary)", textTransform: "uppercase" }}>{p.category}</span>
                    <strong style={{ fontSize: 14, color: "var(--text-dark)", display: "block" }}>{p.name}</strong>
                    <span style={{ fontSize: 11, color: "var(--text-muted)" }}>Seller: {p.seller}</span>
                    
                    <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "#eab308" }}>
                      <span>⭐ {p.rating.toFixed(1)}</span>
                      <span style={{ color: "var(--text-muted)" }}>({p.reviews} reviews)</span>
                    </div>

                    {p.description && (
                      <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                        {p.description}
                      </p>
                    )}
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8 }}>
                    <div>
                      <strong style={{ fontSize: 16, color: "var(--text-dark)" }}>₹{p.price}</strong>
                      <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{p.unit}</span>
                    </div>
                    <button className="button" style={{ padding: "6px 12px", fontSize: 12 }} onClick={() => handleAddToCart(p)}>
                      + Add 🛒
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Cart Drawer Panel */}
      {isCartOpen && (
        <div className="cart-drawer">
          <header style={{ background: "var(--primary)", color: "white", padding: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h3>Shopping Cart ({cartItemCount})</h3>
            <button style={{ background: "transparent", border: "none", color: "white", fontSize: 20, cursor: "pointer" }} onClick={() => { setIsCartOpen(false); setCheckoutStatus(null); }}>
              ✖
            </button>
          </header>

          <div style={{ flex: 1, overflowY: "auto", padding: 16, background: "#fafafa" }}>
            {checkoutStatus ? (
              <div style={{ textAlign: "center", padding: "20px 0" }}>
                <span style={{ fontSize: 48 }}>🎉</span>
                <h4 style={{ color: "var(--primary)", marginTop: 12 }}>Order Placed!</h4>
                <p style={{ fontSize: 13, fontWeight: 700, margin: "8px 0" }}>{checkoutStatus.orderId}</p>
                <p style={{ fontSize: 12, color: "var(--text-muted)" }}>{checkoutStatus.message}</p>
                <button className="button" style={{ marginTop: 16 }} onClick={() => { setIsCartOpen(false); setCheckoutStatus(null); }}>
                  Continue Shopping
                </button>
              </div>
            ) : cart.length === 0 ? (
              <div style={{ textAlign: "center", padding: "40px 0", color: "var(--text-muted)" }}>
                <span>🛒</span>
                <p style={{ fontSize: 13, marginTop: 8 }}>Your cart is empty.</p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {cart.map((item) => (
                  <div key={item.product._id} style={{ background: "white", border: "1px solid var(--border-color)", padding: 10, borderRadius: 8, display: "flex", gap: 10 }}>
                    <img
                      src={item.product.image || "https://images.unsplash.com/photo-1592982537447-7440770cbfc8?auto=format&fit=crop&w=100&q=80"}
                      alt={item.product.name}
                      style={{ width: 50, height: 50, borderRadius: 4, objectFit: "cover" }}
                    />
                    <div style={{ flex: 1 }}>
                      <strong style={{ fontSize: 13, display: "block" }}>{item.product.name}</strong>
                      <span style={{ fontSize: 11, color: "var(--text-muted)" }}>₹{item.product.price} {item.product.unit}</span>
                      
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 4 }}>
                        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                          <button style={{ padding: "1px 6px", fontSize: 11, cursor: "pointer" }} onClick={() => handleUpdateQuantity(item.product._id, -1)}>-</button>
                          <span style={{ fontSize: 12, fontWeight: 700 }}>{item.quantity}</span>
                          <button style={{ padding: "1px 6px", fontSize: 11, cursor: "pointer" }} onClick={() => handleUpdateQuantity(item.product._id, 1)}>+</button>
                        </div>
                        <strong style={{ fontSize: 13 }}>₹{item.product.price * item.quantity}</strong>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {!checkoutStatus && cart.length > 0 && (
            <footer style={{ padding: 16, borderTop: "1px solid var(--border-color)", background: "white" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12, fontSize: 15 }}>
                <span>Subtotal:</span>
                <strong style={{ color: "var(--text-dark)", fontSize: 17 }}>₹{cartTotal}</strong>
              </div>
              <button className="button" style={{ width: "100%", background: "#f59e0b", fontSize: 15 }} onClick={handleCheckout}>
                Complete Purchase 🚀
              </button>
            </footer>
          )}
        </div>
      )}
    </main>
  );
};

export default Marketplace;
