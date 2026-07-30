import React, { useState, useEffect } from "react";
import api from "../api";
import { useAuth } from "../context/AuthContext";

export default function Admin() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [system, setSystem] = useState(null);
  const [users, setUsers] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userPage, setUserPage] = useState(1);
  const [userTotalPages, setUserTotalPages] = useState(1);
  const [userSearch, setUserSearch] = useState("");
  const [activeTab, setActiveTab] = useState("overview"); // overview, users, products, system
  const [msg, setMsg] = useState({ type: "", text: "" });

  const fetchStats = async () => {
    try {
      const res = await api.get("/admin/stats");
      if (res.data.success) {
        setStats(res.data.data);
      }
    } catch (err) {
      console.error("Failed to fetch admin stats:", err);
    }
  };

  const fetchSystem = async () => {
    try {
      const res = await api.get("/admin/system");
      if (res.data.success) {
        setSystem(res.data.data);
      }
    } catch (err) {
      console.error("Failed to fetch system info:", err);
    }
  };

  const fetchUsers = async (page = 1, search = "") => {
    try {
      const res = await api.get("/admin/users", { params: { page, limit: 10, search } });
      if (res.data.success) {
        setUsers(res.data.data.users);
        setUserPage(res.data.data.page);
        setUserTotalPages(res.data.data.pages);
      }
    } catch (err) {
      console.error("Failed to fetch users:", err);
    }
  };

  const fetchProducts = async () => {
    try {
      const res = await api.get("/admin/products");
      if (res.data.success) {
        setProducts(res.data.data.products);
      }
    } catch (err) {
      console.error("Failed to fetch products:", err);
    }
  };

  useEffect(() => {
    const loadAll = async () => {
      setLoading(true);
      await Promise.all([fetchStats(), fetchSystem(), fetchUsers(1), fetchProducts()]);
      setLoading(false);
    };
    loadAll();
  }, []);

  const handleRoleChange = async (userId, newRole) => {
    try {
      const res = await api.put(`/admin/users/${userId}/role`, { role: newRole });
      if (res.data.success) {
        setMsg({ type: "success", text: `User role updated to ${newRole}` });
        fetchUsers(userPage, userSearch);
        fetchStats();
      }
    } catch (err) {
      setMsg({ type: "error", text: err.response?.data?.error?.message || "Failed to update role" });
    }
  };

  const handleToggleUser = async (userId) => {
    try {
      const res = await api.put(`/admin/users/${userId}/toggle`);
      if (res.data.success) {
        setMsg({ type: "success", text: `User status toggled` });
        fetchUsers(userPage, userSearch);
      }
    } catch (err) {
      setMsg({ type: "error", text: err.response?.data?.error?.message || "Failed to toggle user status" });
    }
  };

  const handleDeleteProduct = async (prodId) => {
    if (!window.confirm("Are you sure you want to delete this product?")) return;
    try {
      const res = await api.delete(`/admin/products/${prodId}`);
      if (res.data.success) {
        setMsg({ type: "success", text: "Product deleted" });
        fetchProducts();
        fetchStats();
      }
    } catch (err) {
      setMsg({ type: "error", text: err.response?.data?.error?.message || "Failed to delete product" });
    }
  };

  if (loading) {
    return (
      <div style={{ padding: "40px", textAlign: "center", minHeight: "80vh" }}>
        <h2>Loading Admin Dashboard...</h2>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "20px", fontFamily: "sans-serif" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
        <div>
          <h1 style={{ margin: 0, color: "#166534" }}>🏛️ Smart Kisan Admin Portal</h1>
          <p style={{ margin: "5px 0 0", color: "#4b5563" }}>Logged in as Admin ({user?.name || user?.email})</p>
        </div>
        <button
          onClick={() => { fetchStats(); fetchSystem(); fetchUsers(userPage, userSearch); fetchProducts(); }}
          style={{ padding: "8px 16px", backgroundColor: "#16a34a", color: "#fff", border: "none", borderRadius: "6px", cursor: "pointer" }}
        >
          🔄 Refresh
        </button>
      </div>

      {msg.text && (
        <div style={{
          padding: "12px",
          marginBottom: "20px",
          borderRadius: "6px",
          backgroundColor: msg.type === "error" ? "#fee2e2" : "#dcfce7",
          color: msg.type === "error" ? "#991b1b" : "#166534"
        }}>
          {msg.text}
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: "flex", gap: "10px", borderBottom: "2px solid #e5e7eb", marginBottom: "20px" }}>
        {["overview", "users", "products", "system"].map((t) => (
          <button
            key={t}
            onClick={() => setActiveTab(t)}
            style={{
              padding: "10px 20px",
              border: "none",
              background: "none",
              borderBottom: activeTab === t ? "3px solid #16a34a" : "none",
              fontWeight: activeTab === t ? "bold" : "normal",
              color: activeTab === t ? "#16a34a" : "#4b5563",
              cursor: "pointer",
              textTransform: "capitalize"
            }}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === "overview" && stats && (
        <div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "20px", marginBottom: "30px" }}>
            <div style={cardStyle}>
              <h3>👥 Total Users</h3>
              <p style={statNumberStyle}>{stats.users.total}</p>
              <small>Farmers: {stats.users.byRole.farmer} | Experts: {stats.users.byRole.expert} | Merchants: {stats.users.byRole.merchant}</small>
            </div>
            <div style={cardStyle}>
              <h3>🛒 Marketplace Products</h3>
              <p style={statNumberStyle}>{stats.marketplace.products}</p>
              <small>Orders: {stats.marketplace.orders}</small>
            </div>
            <div style={cardStyle}>
              <h3>💬 Forum Posts</h3>
              <p style={statNumberStyle}>{stats.forum.posts}</p>
              <small>Active Discussions</small>
            </div>
            <div style={cardStyle}>
              <h3>⚡ System Status</h3>
              <p style={{ fontSize: "1.2rem", fontWeight: "bold", color: "#16a34a", margin: "10px 0" }}>Healthy</p>
              <small>Memory: {system?.memoryMB} MB | Node {system?.nodeVersion}</small>
            </div>
          </div>
        </div>
      )}

      {/* Users Tab */}
      {activeTab === "users" && (
        <div>
          <div style={{ display: "flex", gap: "10px", marginBottom: "15px" }}>
            <input
              type="text"
              placeholder="Search users by name or email..."
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
              style={{ flex: 1, padding: "8px 12px", border: "1px solid #ccc", borderRadius: "6px" }}
            />
            <button
              onClick={() => fetchUsers(1, userSearch)}
              style={{ padding: "8px 16px", backgroundColor: "#16a34a", color: "#fff", border: "none", borderRadius: "6px", cursor: "pointer" }}
            >
              Search
            </button>
          </div>

          <table style={{ width: "100%", borderCollapse: "collapse", backgroundColor: "#fff", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
            <thead>
              <tr style={{ backgroundColor: "#f3f4f6", textAlign: "left" }}>
                <th style={thStyle}>Name</th>
                <th style={thStyle}>Email</th>
                <th style={thStyle}>Role</th>
                <th style={thStyle}>Status</th>
                <th style={thStyle}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u._id} style={{ borderBottom: "1px solid #e5e7eb" }}>
                  <td style={tdStyle}>{u.name}</td>
                  <td style={tdStyle}>{u.email}</td>
                  <td style={tdStyle}>
                    <select
                      value={u.role}
                      onChange={(e) => handleRoleChange(u._id, e.target.value)}
                      style={{ padding: "4px 8px", borderRadius: "4px" }}
                    >
                      <option value="farmer">Farmer</option>
                      <option value="expert">Expert</option>
                      <option value="merchant">Merchant</option>
                      <option value="admin">Admin</option>
                    </select>
                  </td>
                  <td style={tdStyle}>
                    <span style={{ color: u.isActive !== false ? "#16a34a" : "#dc2626", fontWeight: "bold" }}>
                      {u.isActive !== false ? "Active" : "Disabled"}
                    </span>
                  </td>
                  <td style={tdStyle}>
                    <button
                      onClick={() => handleToggleUser(u._id)}
                      style={{
                        padding: "4px 10px",
                        backgroundColor: u.isActive !== false ? "#ef4444" : "#22c55e",
                        color: "#fff",
                        border: "none",
                        borderRadius: "4px",
                        cursor: "pointer"
                      }}
                    >
                      {u.isActive !== false ? "Deactivate" : "Activate"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Pagination */}
          <div style={{ display: "flex", justifyContent: "center", gap: "10px", marginTop: "15px" }}>
            <button
              disabled={userPage <= 1}
              onClick={() => fetchUsers(userPage - 1, userSearch)}
              style={{ padding: "6px 12px", cursor: userPage <= 1 ? "not-allowed" : "pointer" }}
            >
              Prev
            </button>
            <span>Page {userPage} of {userTotalPages}</span>
            <button
              disabled={userPage >= userTotalPages}
              onClick={() => fetchUsers(userPage + 1, userSearch)}
              style={{ padding: "6px 12px", cursor: userPage >= userTotalPages ? "not-allowed" : "pointer" }}
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Products Tab */}
      {activeTab === "products" && (
        <div>
          <h3>Product Catalog ({products.length})</h3>
          <table style={{ width: "100%", borderCollapse: "collapse", backgroundColor: "#fff", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
            <thead>
              <tr style={{ backgroundColor: "#f3f4f6", textAlign: "left" }}>
                <th style={thStyle}>Product Name</th>
                <th style={thStyle}>Category</th>
                <th style={thStyle}>Price (₹)</th>
                <th style={thStyle}>Seller</th>
                <th style={thStyle}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p._id} style={{ borderBottom: "1px solid #e5e7eb" }}>
                  <td style={tdStyle}>{p.name}</td>
                  <td style={tdStyle}>{p.category}</td>
                  <td style={tdStyle}>₹{p.price}</td>
                  <td style={tdStyle}>{p.sellerName || p.seller || "System"}</td>
                  <td style={tdStyle}>
                    <button
                      onClick={() => handleDeleteProduct(p._id)}
                      style={{ padding: "4px 10px", backgroundColor: "#dc2626", color: "#fff", border: "none", borderRadius: "4px", cursor: "pointer" }}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* System Tab */}
      {activeTab === "system" && system && (
        <div style={cardStyle}>
          <h3>⚙️ System Diagnostic Info</h3>
          <p><strong>Environment:</strong> {system.env}</p>
          <p><strong>Uptime:</strong> {Math.floor(system.uptime / 60)} minutes</p>
          <p><strong>Memory Usage:</strong> {system.memoryMB} MB</p>
          <p><strong>Node Version:</strong> {system.nodeVersion}</p>
          <p><strong>Timestamp:</strong> {new Date(system.timestamp).toLocaleString()}</p>
        </div>
      )}
    </div>
  );
}

const cardStyle = {
  backgroundColor: "#fff",
  padding: "20px",
  borderRadius: "8px",
  boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
  border: "1px solid #e5e7eb"
};

const statNumberStyle = {
  fontSize: "2rem",
  fontWeight: "bold",
  margin: "10px 0",
  color: "#15803d"
};

const thStyle = {
  padding: "12px",
  borderBottom: "2px solid #e5e7eb",
  color: "#374151"
};

const tdStyle = {
  padding: "12px"
};
