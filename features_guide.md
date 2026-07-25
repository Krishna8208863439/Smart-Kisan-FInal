# Smart Kisan - Complete Project Features Guide

Welcome to the **Smart Kisan Digital Agriculture Portal**. This guide provides a detailed breakdown of all user-facing features, underlying technology stacks, database configurations, and AI services integrated into this hybrid application.

---

## 🏗️ System Architecture Overview

Smart Kisan is built on a **Hybrid Multi-Tier Architecture** that combines high-performance microservices, machine learning advisory engines, and offline-first capabilities:

```
                  ┌───────────────────────────────┐
                  │      React Vite Frontend      │
                  │   PWA (Offline-First Cached)  │
                  └───────────────┬───────────────┘
                                  │
                 ┌────────────────┴────────────────┐
                 ▼ (Vite Proxy: /api)              ▼ (Vite Proxy: /pyapi)
      ┌─────────────────────┐             ┌─────────────────────┐
      │   Node.js Backend   │             │   Python Backend    │
      │    Express & JWT    │             │   FastAPI & ASGI    │
      └──────────┬──────────┘             └──────────┬──────────┘
                 │                                   │
      ┌──────────┴──────────┐             ┌──────────┴──────────┐
      │  MongoDB Database   │             │   SQLite Database   │
      │  (Fallback Local    │             │  (smart_kisan.db)   │
      │   db_fallback.json) │             └─────────────────────┘
      └─────────────────────┘
```

1. **Frontend (Vite + React)**: Operates on port `5173`. Uses Vite configuration to proxy `/api` calls to the Node backend and `/pyapi` calls to the Python backend. Built as a Progressive Web App (PWA) with service workers for offline caching.
2. **Core API Backend (Node.js + Express)**: Operates on port `5000`. Manages user accounts, authentication (JWT), APMC Mandi catalogs, community forums, marketplace transactions, and crop calendar scheduling. Connects to MongoDB, with an automatic, zero-config fallback to a local JSON file database (`db_fallback.json`) if MongoDB is unavailable.
3. **AI & ML Service Backend (Python + FastAPI)**: Operates on port `8000`. Runs high-compute tasks including PyTorch/HuggingFace computer vision pipelines, scikit-learn crop models, RAG vector retrieval, and Gemini 1.5 Flash text/vision integrations. Uses SQLAlchemy with a local SQLite database (`smart_kisan.db`).

---

## 🌿 Core Platform Features

### 1. AI Crop Disease Detection & Computer Vision
- **Location in Code**: 
  - Backend API Route: [cropDiseaseRoutes.js](file:///c:/Users/krish/Downloads/Project/smart_kisan_bot/smart_kisan_bot/smart_kisan_bot/smart_kisan_bot/smart-kisan/backend/routes/cropDiseaseRoutes.js)
  - Python Route: `POST /api/diagnose` in [main.py](file:///c:/Users/krish/Downloads/Project/smart_kisan_bot/smart_kisan_bot/smart_kisan_bot/smart_kisan_bot/smart-kisan/backend_python/main.py#L250-L336)
  - Frontend Section: [CropDiseaseDetectionSection.jsx](file:///c:/Users/krish/Downloads/Project/smart_kisan_bot/smart_kisan_bot/smart_kisan_bot/smart_kisan_bot/smart-kisan/frontend/src/components/CropDiseaseDetectionSection.jsx)
- **Features**:
  - **Multi-Tier AI Diagnostics**:
    - **Tier 1 (Google Gemini 1.5 Flash)**: Performs high-accuracy visual analysis of crop foliage, generating diagnostic profiles with scientific names, organic remedies, precise chemical dosage (e.g., in g/L), and direct marketplace purchase links.
    - **Tier 2 (HuggingFace ViT)**: Uses `MobileNetV2` fine-tuned on the PlantVillage dataset to classify diseases when Gemini is unavailable.
    - **Tier 3 (Rule-Based Fallback)**: Uses local keyword mapping and image filename indicators to provide static crop-specific advice without internet/API connectivity.
  - **Crop Isolation Guardrail**: Rejects invalid images (e.g., humans, animals, vehicles, buildings, random objects) to protect server processing overhead.
  - **Database Persistence**: Diagnostic reports (severity, confidence, advice, image URL) are stored in `DiseaseReport` table.

---

### 2. Smart Crop Advisory & Soil NPK recommendation
- **Location in Code**:
  - Node Route: `POST /api/recommendations/crop` in [recommendationRoutes.js](file:///c:/Users/krish/Downloads/Project/smart_kisan_bot/smart_kisan_bot/smart_kisan_bot/smart_kisan_bot/smart-kisan/backend/routes/recommendationRoutes.js#L137-L501)
  - Python Route: `POST /api/advisory` in [main.py](file:///c:/Users/krish/Downloads/Project/smart_kisan_bot/smart_kisan_bot/smart_kisan_bot/smart-kisan/backend_python/main.py#L738-L945)
  - Model Training: [train_crop_model.py](file:///c:/Users/krish/Downloads/Project/smart_kisan_bot/smart_kisan_bot/smart_kisan_bot/smart_kisan_bot/smart-kisan/backend_python/train_crop_model.py)
- **Features**:
  - **ML Recommendation Classifier**: Trains a Random Forest/Gaussian Naive Bayes model on soil NPK levels, pH, temperature, humidity, and rainfall to classify the most suitable crops.
  - **Environmental Context Enrichment**: Resolves latitude/longitude from user region inputs using the *Open-Meteo Geocoding API* and pulls live weather (cached to database for 3 hours).
  - **Financial Yield Modeling**: Calculates expected crop yield (tons/acre) and net profits by analyzing live simulated mandi prices and typical cultivation cost factors.
  - **Tailored Fertilizer Stages**: Synthesizes a 3-stage fertilizer plan (Basal Application during field prep, Vegetative top-dressing, and Flowering spray) that directly matches NPK soil deficiencies to target standards.

---

### 3. PashuMitra Livestock Diagnosis & Veterinary Advisory
- **Location in Code**:
  - Node Route: `/api/livestock` in [server.js](file:///c:/Users/krish/Downloads/Project/smart_kisan_bot/smart_kisan_bot/smart_kisan_bot/smart_kisan_bot/smart-kisan/backend/server.js#L20)
  - Python Route: `cattle` disease databases and veterinary rules.
- **Features**:
  - **Animal Health Diagnosis**: Detects livestock symptoms and common Indian cattle diseases (such as *Foot and Mouth Disease (FMD)* or *Lumpy Skin Disease (LSD)*).
  - **First-Aid Remedies**: Recommends immediate quarantines, antiseptic wash ratios (e.g., 1:1000 potassium permanganate solution), and vaccine guidelines while advising veterinary contact.

---

### 4. KisanChat RAG Agricultural Assistant
- **Location in Code**:
  - Python Endpoint: `POST /api/chat` in [main.py](file:///c:/Users/krish/Downloads/Project/smart_kisan_bot/smart_kisan_bot/smart_kisan_bot/smart_kisan_bot/smart-kisan/backend_python/main.py#L563-L650)
  - Knowledge Base: [agriculture_kb.json](file:///c:/Users/krish/Downloads/Project/smart_kisan_bot/smart_kisan_bot/smart_kisan_bot/smart_kisan_bot/smart-kisan/backend_python/datasets/agriculture_kb.json)
  - Service: [rag_service.py](file:///c:/Users/krish/Downloads/Project/smart_kisan_bot/smart_kisan_bot/smart_kisan_bot/smart_kisan_bot/smart-kisan/backend_python/rag_service.py)
- **Features**:
  - **Strict Agricultural Topic Guardrail**: Validates inputs using Gemini checks. Refuses non-agricultural questions (e.g., programming, general trivia) by responding: *"I am Kisan AI. I can only answer agriculture and farming-related questions."*
  - **RAG (Retrieval-Augmented Generation)**: Performs text embeddings / TF-IDF searches against local agricultural knowledge documents (`agriculture_kb.json`) and appends matched references to Gemini prompts.
  - **Multilingual Delivery**: Translates responses into English, Hindi, or Marathi based on the user's current session state.

---

### 5. Mandi Market Prices & APMC Mandi Locator
- **Location in Code**:
  - Node Route: [marketRoutes.js](file:///c:/Users/krish/Downloads/Project/smart_kisan_bot/smart_kisan_bot/smart_kisan_bot/smart_kisan_bot/smart-kisan/backend/routes/marketRoutes.js)
  - Frontend Page: [Market.jsx](file:///c:/Users/krish/Downloads/Project/smart_kisan_bot/smart_kisan_bot/smart_kisan_bot/smart_kisan_bot/smart-kisan/frontend/src/pages/Market.jsx)
- **Features**:
  - **APMC Mandi directory**: Catalog of major Indian mandis (Azadpur, Lasalgaon, Gultekdi, Yeshwanthpur) mapping geographical coordinates, districts, and crop specializations.
  - **MSP (Minimum Support Price) Advisory**: Highlights whether current mandi averages are above or below government-regulated MSP. If below, advises: *"Sell directly to government procurement centers to guarantee MSP."*
  - **Gemini Price Forecasting**: Predicts 7-30 day price trends (Bullish/Bearish/Neutral) with estimated min/max values based on seasonal supply cycles.

---

### 6. Interactive Community Forum
- **Location in Code**:
  - Node Route: `backend/routes/forumRoutes.js`
  - Model: `backend/models/Post.js`
  - Frontend Page: `frontend/src/pages/Forum.jsx`
- **Features**:
  - **Discussion Board**: Allows authenticated farmers to post queries, share disease alerts, and answer community questions.
  - **Farmer & Expert Roles**: Displays special trust badges for verified agronomists and veterinarians.

---

### 7. Weather & Location Advisory Cache
- **Location in Code**:
  - Node Route: `backend/routes/weatherRoutes.js`
  - Database Model: `WeatherCache` in [database.py](file:///c:/Users/krish/Downloads/Project/smart_kisan_bot/smart_kisan_bot/smart_kisan_bot/smart_kisan_bot/smart-kisan/backend_python/database.py#L59-L69)
- **Features**:
  - **Hourly Weather Checks**: Pulls current temperature, relative humidity, and precipitation probability.
  - **3-Hour Cache Policy**: Stores fetched weather records to database to respect Open-Meteo rate limits and accelerate dashboard loads.

---

### 8. Progressive Web App (PWA) Offline Functionality
- **Location in Code**:
  - Frontend Config: [vite.config.js](file:///c:/Users/krish/Downloads/Project/smart_kisan_bot/smart_kisan_bot/smart_kisan_bot/smart_kisan_bot/smart-kisan/frontend/vite.config.js#L8-L84)
- **Features**:
  - **Offline Caching**: Automatically bundles assets, icons, Google fonts, and Unsplash illustrations using Workbox's `CacheFirst` and `StaleWhileRevalidate` strategies.
  - **Stand-Alone Installable UI**: Includes custom install prompts and standalone desktop/mobile launcher shortcuts.
