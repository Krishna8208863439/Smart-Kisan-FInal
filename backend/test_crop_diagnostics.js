import http from "http";

// A small 1x1 black JPEG base64 (Non-plant image)
const tinyNonPlantBase64 = "/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=";

const data = JSON.stringify({
  crop: "Tomato",
  base64Image: tinyNonPlantBase64,
  mimeType: "image/jpeg"
});

const req = http.request(
  {
    hostname: "localhost",
    port: 5000,
    path: "/api/crop-diagnostics/analyze",
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Content-Length": Buffer.byteLength(data)
    }
  },
  (res) => {
    let body = "";
    console.log("TEST 1 (Non-plant image stage A test) - STATUS:", res.statusCode);
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
