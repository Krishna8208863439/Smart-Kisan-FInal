import { useState } from "react";
import api from "../api";

const Recommendations = () => {
  const [form, setForm] = useState({
    soilType: "loamy",
    region: "",
    season: "kharif",
    irrigationAvailable: true
  });
  const [result, setResult] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const res = await api.post("/recommendations/crop", form);
    setResult(res.data);
  };

  return (
    <div className="app-container">
      <div className="card">
        <h2>AI Crop & Fertilizer Suggestions</h2>
        <form onSubmit={handleSubmit}>
          <label>Soil Type</label>
          <select
            className="input"
            value={form.soilType}
            onChange={(e) => setForm({ ...form, soilType: e.target.value })}
          >
            <option value="loamy">Loamy</option>
            <option value="sandy">Sandy</option>
            <option value="clay">Clay</option>
          </select>

          <label>Region</label>
          <input
            className="input"
            placeholder="e.g. Maharashtra"
            value={form.region}
            onChange={(e) => setForm({ ...form, region: e.target.value })}
          />

          <label>Season</label>
          <select
            className="input"
            value={form.season}
            onChange={(e) => setForm({ ...form, season: e.target.value })}
          >
            <option value="kharif">Kharif</option>
            <option value="rabi">Rabi</option>
          </select>

          <label>
            <input
              type="checkbox"
              checked={form.irrigationAvailable}
              onChange={(e) =>
                setForm({ ...form, irrigationAvailable: e.target.checked })
              }
            />{" "}
            Irrigation Available
          </label>

          <br />
          <button className="button" style={{ marginTop: 8 }}>
            Get Recommendations
          </button>
        </form>

        {result && (
          <div style={{ marginTop: 16 }}>
            <h3>Recommended Crops</h3>
            <ul>
              {result.recommendations.map((r, idx) => (
                <li key={idx}>
                  <strong>{r.crop}</strong>: {r.reason}
                </li>
              ))}
            </ul>
            <h3>Fertilizer Plan</h3>
            <ul>
              {result.fertilizerPlan.map((f, idx) => (
                <li key={idx}>
                  <strong>{f.stage}</strong>: {f.recommendation}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

export default Recommendations;
