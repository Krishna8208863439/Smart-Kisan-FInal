import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["icon-192.png", "icon-512.png"],
      manifest: {
        name: "Smart Kisan - Digital Agriculture",
        short_name: "SmartKisan",
        description: "AI-powered farming companion for crop management, disease detection, weather forecasting, and market prices.",
        start_url: "/",
        display: "standalone",
        background_color: "#f0fdf4",
        theme_color: "#15803d",
        orientation: "portrait-primary",
        categories: ["agriculture", "productivity", "utilities"],
        icons: [
          {
            src: "/icon-192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any maskable"
          },
          {
            src: "/icon-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any maskable"
          }
        ],
        shortcuts: [
          {
            name: "Kisan AI Chat",
            short_name: "Chat",
            description: "Talk to the Kisan AI Chatbot",
            url: "/chat",
            icons: [{ src: "/icon-192.png", sizes: "192x192" }]
          },
          {
            name: "Marketplace",
            short_name: "Market",
            description: "Buy and sell crops",
            url: "/marketplace",
            icons: [{ src: "/icon-192.png", sizes: "192x192" }]
          }
        ]
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "google-fonts-cache",
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 }
            }
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "gstatic-fonts-cache",
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 }
            }
          },
          {
            urlPattern: /^https:\/\/images\.unsplash\.com\/.*/i,
            handler: "StaleWhileRevalidate",
            options: {
              cacheName: "unsplash-image-cache",
              expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 7 }
            }
          }
        ]
      },
      devOptions: {
        enabled: true
      }
    })
  ],
  server: {
    port: 5173
  }
});
