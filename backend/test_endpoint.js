import http from "http";

const data = JSON.stringify({
  message: "What fertilizer is best for tomato?",
  history: [],
  context: {
    location: "Lat: 18.52, Lon: 73.85",
    weather: "32°C · Clear",
    waterSource: "Borewell",
    language: "English"
  }
});

const req = http.request(
  {
    hostname: "localhost",
    port: 5000,
    path: "/api/chat",
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Content-Length": Buffer.byteLength(data)
    }
  },
  (res) => {
    let body = "";
    console.log("STATUS:", res.statusCode);
    res.on("data", (chunk) => (body += chunk));
    res.on("end", () => {
      console.log("BODY:", body);
    });
  }
);

req.on("error", (e) => {
  console.error("ERROR:", e.message);
});

req.write(data);
req.end();
