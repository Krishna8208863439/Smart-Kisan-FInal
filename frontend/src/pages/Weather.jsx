import { useState } from "react";
import api from "../api";

const Weather = () => {
  const [location, setLocation] = useState("");
  const [data, setData] = useState(null);

  const fetchWeather = async (e) => {
    e.preventDefault();
    const res = await api.get("/weather", { params: { location } });
    setData(res.data);
  };

  return (
    <div className="app-container">
      <div className="card">
        <h2>Weather Insights</h2>
        <form onSubmit={fetchWeather}>
          <input
            className="input"
            placeholder="Village / Taluka / District"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
          />
          <button className="button">Get Weather</button>
        </form>

        {data && (
          <div style={{ marginTop: 16 }}>
            <h3>{data.location}</h3>
            <p>
              Current: {data.current.temperature}°C, {data.current.condition},
              Humidity: {data.current.humidity}%
            </p>
            <h4>Next 3 days</h4>
            <ul>
              {data.forecast.map((f, idx) => (
                <li key={idx}>
                  {f.day}: {f.temp}°C, Rain chance: {f.chanceOfRain}%
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

export default Weather;
