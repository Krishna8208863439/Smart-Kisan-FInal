import http from "http";
import https from "https";
import { URL } from "url";

const originalFetch = global.fetch;

async function proxyFetch(urlString, options = {}) {
  const proxy = process.env.HTTPS_PROXY || process.env.HTTP_PROXY || process.env.http_proxy || process.env.https_proxy;
  if (!proxy) {
    return originalFetch(urlString, options);
  }

  const targetUrl = new URL(urlString);
  const proxyUrl = new URL(proxy);

  return new Promise((resolve, reject) => {
    // For HTTPS targets, establish CONNECT tunnel through HTTP proxy
    if (targetUrl.protocol === "https:") {
      const connectOptions = {
        host: proxyUrl.hostname,
        port: proxyUrl.port || 3128,
        method: "CONNECT",
        path: `${targetUrl.hostname}:443`,
        headers: {
          Host: targetUrl.hostname
        }
      };

      const req = http.request(connectOptions);
      req.on("connect", (res, socket, head) => {
        if (res.statusCode !== 200) {
          reject(new Error(`Proxy connection failed: ${res.statusCode}`));
          return;
        }

        // Establish TLS connection over the established TCP socket
        const tlsSocket = https.connect({
          socket: socket,
          servername: targetUrl.hostname
        }, () => {
          // Send actual HTTPS request
          const pathWithQuery = targetUrl.pathname + targetUrl.search;
          const requestHeaders = {
            Host: targetUrl.hostname,
            ...(options.headers || {})
          };
          if (options.body) {
            requestHeaders["Content-Length"] = Buffer.byteLength(options.body);
          }

          const actualReq = https.request({
            method: options.method || "GET",
            path: pathWithQuery,
            headers: requestHeaders,
            createConnection: () => tlsSocket
          }, (actualRes) => {
            let chunks = [];
            actualRes.on("data", chunk => chunks.push(chunk));
            actualRes.on("end", () => {
              const bodyBuffer = Buffer.concat(chunks);
              const bodyText = bodyBuffer.toString("utf8");
              resolve({
                ok: actualRes.statusCode >= 200 && actualRes.statusCode < 300,
                status: actualRes.statusCode,
                json: async () => JSON.parse(bodyText),
                text: async () => bodyText,
                headers: {
                  get: (name) => actualRes.headers[name.toLowerCase()]
                }
              });
            });
          });

          actualReq.on("error", reject);
          if (options.body) {
            actualReq.write(options.body);
          }
          actualReq.end();
        });

        tlsSocket.on('error', reject);
      });

      req.on("error", reject);
      req.end();
    } else {
      // For HTTP targets, direct request to proxy
      const path = targetUrl.href;
      const requestHeaders = {
        Host: targetUrl.hostname,
        ...(options.headers || {})
      };
      if (options.body) {
        requestHeaders["Content-Length"] = Buffer.byteLength(options.body);
      }

      const req = http.request({
        host: proxyUrl.hostname,
        port: proxyUrl.port || 3128,
        method: options.method || "GET",
        path: path,
        headers: requestHeaders
      }, (res) => {
        let chunks = [];
        res.on("data", chunk => chunks.push(chunk));
        res.on("end", () => {
          const bodyBuffer = Buffer.concat(chunks);
          const bodyText = bodyBuffer.toString("utf8");
          resolve({
            ok: res.statusCode >= 200 && res.statusCode < 300,
            status: res.statusCode,
            json: async () => JSON.parse(bodyText),
            text: async () => bodyText,
            headers: {
              get: (name) => res.headers[name.toLowerCase()]
            }
          });
        });
      });

      req.on("error", reject);
      if (options.body) {
        req.write(options.body);
      }
      req.end();
    }
  });
}

// Intercept global fetch
global.fetch = proxyFetch;
console.log("✈️ Global fetch monkey-patched for PythonAnywhere HTTP proxy support.");
