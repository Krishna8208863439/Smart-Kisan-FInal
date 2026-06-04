import { useState } from "react";
import api from "../api";

const Market = () => {
  const [crop, setCrop] = useState("Wheat");
  const [data, setData] = useState(null);

  const fetchPrices = async (e) => {
    e.preventDefault();
    const res = await api.get("/market", { params: { crop } });
    setData(res.data);
  };

  return (
    <div className="app-container">
      <div className="card">
        <h2>Market Prices</h2>
        <form onSubmit={fetchPrices}>
          <input
            className="input"
            value={crop}
            onChange={(e) => setCrop(e.target.value)}
          />
          <button className="button">Get Prices</button>
        </form>

        {data && (
          <div style={{ marginTop: 16 }}>
            <h3>{data.crop} prices</h3>
            <ul>
              {data.prices.map((p, idx) => (
                <li key={idx}>
                  {p.market}: ₹{p.pricePerQuintal} / quintal
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

export default Market;
