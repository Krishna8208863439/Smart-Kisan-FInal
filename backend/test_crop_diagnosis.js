import http from "http";

// Minimal 1x1 green pixel JPEG base64 (representing a plant leaf snippet)
const greenPixelBase64 = "/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=";

const testPayload = JSON.stringify({
  base64Image: greenPixelBase64,
  mimeType: "image/jpeg",
  crop: "Tomato"
});

console.log("Testing POST /api/crop-diagnosis...");

const req = http.request(
  {
    hostname: "localhost",
    port: 5000,
    path: "/api/crop-diagnosis",
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Content-Length": Buffer.byteLength(testPayload)
    }
  },
  (res) => {
    let body = "";
    console.log("STATUS CODE:", res.statusCode);
    res.on("data", (chunk) => (body += chunk));
    res.on("end", () => {
      console.log("RESPONSE BODY:", body);
    });
  }
);

req.on("error", (e) => {
  console.error("TEST ERROR:", e.message);
});

req.write(testPayload);
req.end();
