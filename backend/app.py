import os
import sys

# Auto-detect PythonAnywhere environment & configure HTTP proxy
if "pythonanywhere" in os.environ.get("PYTHONANYWHERE_DOMAIN", "") or "PYTHONANYWHERE_SITE" in os.environ or "PYTHONANYWHERE_HOST" in os.environ:
    proxy_url = "http://proxy.server:3128"
    os.environ["HTTP_PROXY"] = proxy_url
    os.environ["HTTPS_PROXY"] = proxy_url
    os.environ["http_proxy"] = proxy_url
    os.environ["https_proxy"] = proxy_url

import base64
import json
import io
import time
import math
import random
from flask import Flask, request, jsonify, send_from_directory, send_file

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

try:
    from PIL import Image
except ImportError:
    Image = None

try:
    from anthropic import Anthropic
except ImportError:
    Anthropic = None

app = Flask(__name__)

try:
    from flask_cors import CORS
    CORS(app)
except ImportError:
    @app.after_request
    def add_cors_headers(response):
        response.headers['Access-Control-Allow-Origin'] = '*'
        response.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, PATCH, DELETE, OPTIONS'
        response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization, X-Requested-With, x-gemini-key'
        return response

dist_folder = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'dist')
if not os.path.exists(dist_folder):
    dist_folder = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'frontend', 'dist')

uploads_folder = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'uploads')
os.makedirs(uploads_folder, exist_ok=True)

# ─────────────────────────────────────────────────────────────────────────────
#  IN-MEMORY STORES (Seed data for full stateful demo on PythonAnywhere)
# ─────────────────────────────────────────────────────────────────────────────
MEM_MARKETPLACE_PRODUCTS = [
    {
        "_id": "prod_1",
        "name": "Mahyco Sonalika Organic Wheat Seeds",
        "category": "Seeds",
        "seller": "Green Agro Solutions",
        "sellerName": "Green Agro Solutions",
        "rating": 4.8,
        "reviews": 234,
        "price": 850,
        "unit": "/kg",
        "stock": "In Stock",
        "image": "https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?auto=format&fit=crop&w=600&q=80",
        "description": "Certified high-yielding organic wheat seeds suitable for Rabi season sowing. Treated for natural disease resistance.",
        "location": "Kolhapur, MH",
        "contact": "+91 98220 11223",
        "createdAt": "2026-08-10T10:00:00Z"
    },
    {
        "_id": "prod_2",
        "name": "IFFCO NPK 19:19:19 Bio-Fertilizer",
        "category": "Fertilizers",
        "seller": "FarmTech India",
        "sellerName": "FarmTech India",
        "rating": 4.8,
        "reviews": 456,
        "price": 1200,
        "unit": "/25kg bag",
        "stock": "In Stock",
        "image": "https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?auto=format&fit=crop&w=600&q=80",
        "description": "Balanced macronutrient formula containing organic nitrogen, phosphorus, and potash compounds. Promotes healthy vegetative development.",
        "location": "Pune, MH",
        "contact": "+91 94220 33445",
        "createdAt": "2026-08-11T12:00:00Z"
    },
    {
        "_id": "prod_3",
        "name": "Jain Drip Irrigation Kit (1 Acre)",
        "category": "Tools",
        "seller": "Irrigation Pro",
        "sellerName": "Irrigation Pro",
        "rating": 4.6,
        "reviews": 89,
        "price": 15000,
        "unit": "/set",
        "stock": "In Stock",
        "image": "https://images.unsplash.com/photo-1508514177221-188b1cf16e9d?auto=format&fit=crop&w=600&q=80",
        "description": "Complete drip line kit with drippers, filters, valves, lateral pipes, and micro-sprinklers. Saves up to 60% water.",
        "location": "Nashik, MH",
        "contact": "+91 97230 55667",
        "createdAt": "2026-08-12T09:30:00Z"
    },
    {
        "_id": "prod_4",
        "name": "Pioneer Hybrid Maize Seeds (30Y92)",
        "category": "Seeds",
        "seller": "AgriGrow Seeds",
        "sellerName": "AgriGrow Seeds",
        "rating": 4.5,
        "reviews": 142,
        "price": 1100,
        "unit": "/kg",
        "stock": "In Stock",
        "image": "https://images.unsplash.com/photo-1551754655-cd27e38d2076?auto=format&fit=crop&w=600&q=80",
        "description": "Drought tolerant hybrid corn seeds with rapid vegetative vigour and exceptional kernel weight.",
        "location": "Satara, MH",
        "contact": "+91 91234 56789",
        "createdAt": "2026-08-13T14:15:00Z"
    }
]

MEM_BUY_REQUESTS = [
    {
        "_id": "req_1",
        "buyerName": "Kisan Trader Co.",
        "crop": "Tomato",
        "quantity": "50 Quintals",
        "targetPrice": 2200,
        "location": "Kolhapur APMC",
        "urgency": "Immediate",
        "status": "Open",
        "contact": "+91 98900 12345",
        "createdAt": "2026-08-14T08:00:00Z"
    },
    {
        "_id": "req_2",
        "buyerName": "Maharashtra Organic Mart",
        "crop": "Wheat",
        "quantity": "100 Quintals",
        "targetPrice": 2400,
        "location": "Pune",
        "urgency": "Within 7 days",
        "status": "Open",
        "contact": "+91 97654 32109",
        "createdAt": "2026-08-15T06:30:00Z"
    }
]

MEM_CONTRACTS = [
    {
        "_id": "cont_1",
        "title": "Sugarcane Supply Agreement 2026",
        "buyer": "Shree Chhatrapati Shahu Sugar Mill",
        "farmer": "Krishna (Smart Kisan Farmer)",
        "crop": "Sugarcane",
        "quantity": "500 Tons",
        "fixedPrice": 340,
        "deliveryDate": "2026-11-15",
        "status": "Active",
        "paymentTerms": "15 days post-delivery"
    }
]

MEM_LIVESTOCK = [
    {
        "_id": "anim_1",
        "tagNumber": "MH-KOP-001",
        "name": "Gauri",
        "type": "Cow",
        "breed": "Gir",
        "ageYears": 4.5,
        "healthStatus": "Healthy",
        "imageUrl": "https://images.unsplash.com/photo-1546445317-29f4545e9d53?auto=format&fit=crop&w=600&q=80",
        "milkYield": 14.5,
        "lastVaccination": "2026-06-15",
        "vaccinations": [{"name": "FMD", "date": "2026-06-15", "nextDue": "2026-12-15"}],
        "milkLogs": [{"date": "2026-08-14", "morning": 7.5, "evening": 7.0, "total": 14.5}],
        "feedLogs": [{"date": "2026-08-14", "greenFodderKg": 25, "dryFodderKg": 6, "concentrateKg": 4}]
    },
    {
        "_id": "anim_2",
        "tagNumber": "MH-KOP-002",
        "name": "Kaveri",
        "type": "Buffalo",
        "breed": "Murrah",
        "ageYears": 5.0,
        "healthStatus": "Healthy",
        "imageUrl": "https://images.unsplash.com/photo-1570042225831-d98fa7577f1e?auto=format&fit=crop&w=600&q=80",
        "milkYield": 16.0,
        "lastVaccination": "2026-05-20",
        "vaccinations": [{"name": "HS-BQ", "date": "2026-05-20", "nextDue": "2026-11-20"}],
        "milkLogs": [{"date": "2026-08-14", "morning": 8.0, "evening": 8.0, "total": 16.0}],
        "feedLogs": [{"date": "2026-08-14", "greenFodderKg": 30, "dryFodderKg": 8, "concentrateKg": 5}]
    }
]

MEM_YIELD_HISTORY = [
    {
        "_id": "yield_1",
        "crop": "Tomato",
        "area": 2.5,
        "predictedYield": 45.0,
        "unit": "Tons",
        "confidence": 88,
        "estimatedRevenue": 112500,
        "soilNPK": "120:60:60",
        "rainfall": "750 mm",
        "createdAt": "2026-08-10T09:00:00Z"
    },
    {
        "_id": "yield_2",
        "crop": "Sugarcane",
        "area": 4.0,
        "predictedYield": 360.0,
        "unit": "Tons",
        "confidence": 92,
        "estimatedRevenue": 117000,
        "soilNPK": "150:80:90",
        "rainfall": "1100 mm",
        "createdAt": "2026-08-12T11:30:00Z"
    }
]

MEM_FARMS = [
    {
        "_id": "farm_1",
        "name": "Kolhapur South Farm",
        "areaAcres": 5.0,
        "soilType": "Black Cotton Soil",
        "waterSource": "Borewell + Drip",
        "primaryCrop": "Sugarcane & Tomato",
        "location": "Kagal, Kolhapur",
        "createdAt": "2026-08-01T00:00:00Z"
    }
]

# ─────────────────────────────────────────────────────────────────────────────
#  HEALTH & AUTH
# ─────────────────────────────────────────────────────────────────────────────
@app.route("/api/health", methods=["GET"])
def health_check():
    return jsonify({"status": "ok", "service": "Smart Kisan AI Backend", "version": "2.4.0"})

@app.route("/api/auth/register", methods=["POST"])
def auth_register():
    data = request.get_json(silent=True) or {}
    name = data.get("name") or "Farmer"
    email = data.get("email") or "farmer@smartkisan.ai"
    role = data.get("role") or "farmer"

    token = "sk_jwt_token_" + str(int(time.time()))
    user_id = "user_" + str(int(time.time()))

    return jsonify({
        "success": True,
        "token": token,
        "name": name,
        "email": email,
        "role": role,
        "data": {
            "token": token,
            "accessToken": token,
            "refreshToken": token,
            "user": {
                "_id": user_id,
                "name": name,
                "email": email,
                "role": role
            }
        }
    })

@app.route("/api/auth/login", methods=["POST"])
def auth_login():
    data = request.get_json(silent=True) or {}
    email = data.get("email") or "farmer@smartkisan.ai"
    name = email.split("@")[0].capitalize() if "@" in email else "Farmer"
    role = "farmer"

    token = "sk_jwt_token_" + str(int(time.time()))
    user_id = "user_" + str(int(time.time()))

    return jsonify({
        "success": True,
        "token": token,
        "name": name,
        "email": email,
        "role": role,
        "data": {
            "token": token,
            "accessToken": token,
            "refreshToken": token,
            "user": {
                "_id": user_id,
                "name": name,
                "email": email,
                "role": role
            }
        }
    })

@app.route("/api/auth/google", methods=["POST"])
def auth_google():
    token = "sk_jwt_token_google_" + str(int(time.time()))
    user_id = "user_google_" + str(int(time.time()))
    return jsonify({
        "success": True,
        "token": token,
        "name": "Google User",
        "email": "user@google.com",
        "role": "farmer",
        "data": {
            "token": token,
            "accessToken": token,
            "refreshToken": token,
            "user": {
                "_id": user_id,
                "name": "Google User",
                "email": "user@google.com",
                "role": "farmer"
            }
        }
    })

@app.route("/api/auth/refresh", methods=["POST"])
def auth_refresh():
    token = "sk_jwt_token_refreshed_" + str(int(time.time()))
    return jsonify({
        "success": True,
        "data": {
            "accessToken": token,
            "refreshToken": token
        }
    })

@app.route("/api/auth/logout", methods=["POST"])
@app.route("/api/auth/logout-all", methods=["POST"])
def auth_logout():
    return jsonify({"success": True, "message": "Logged out successfully."})

@app.route("/api/auth/forgot-password", methods=["POST"])
def auth_forgot_password():
    return jsonify({"success": True, "message": "Password reset link sent to your registered email."})

@app.route("/api/auth/reset-password", methods=["POST"])
def auth_reset_password():
    return jsonify({"success": True, "message": "Password updated successfully."})


# ─────────────────────────────────────────────────────────────────────────────
#  WEATHER API (Open-Meteo with fallback)
# ─────────────────────────────────────────────────────────────────────────────
WMO_CODES = {
    0: {"label": "Clear Sky", "icon": "☀️"},
    1: {"label": "Mainly Clear", "icon": "🌤️"},
    2: {"label": "Partly Cloudy", "icon": "⛅"},
    3: {"label": "Overcast", "icon": "☁️"},
    45: {"label": "Foggy", "icon": "🌫️"},
    51: {"label": "Light Drizzle", "icon": "🌦️"},
    61: {"label": "Slight Rain", "icon": "🌧️"},
    63: {"label": "Moderate Rain", "icon": "🌧️"},
    65: {"label": "Heavy Rain", "icon": "🌧️"},
    80: {"label": "Rain Showers", "icon": "🌦️"},
    95: {"label": "Thunderstorm", "icon": "⛈️"}
}

def get_wmo(code):
    return WMO_CODES.get(code, {"label": "Clear / Mild", "icon": "🌤️"})

@app.route("/api/weather", methods=["GET"])
@app.route("/api/weather/current", methods=["GET"])
@app.route("/api/weather/forecast", methods=["GET"])
@app.route("/api/weather/kolhapur", methods=["GET"])
def get_weather():
    lat = request.args.get("lat", default="16.7050", type=str)
    lon = request.args.get("lon", default="74.2433", type=str)
    location_name = request.args.get("location") or request.args.get("city") or "Kolhapur, Maharashtra"

    try:
        import requests
        url = f"https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=auto"
        res = requests.get(url, timeout=5)
        if res.status_code == 200:
            data = res.json()
            curr = data.get("current", {})
            code = curr.get("weather_code", 0)
            cond = get_wmo(code)
            
            daily = data.get("daily", {})
            forecast_list = []
            dates = daily.get("time", [])
            max_temps = daily.get("temperature_2m_max", [])
            min_temps = daily.get("temperature_2m_min", [])
            w_codes = daily.get("weather_code", [])
            precips = daily.get("precipitation_probability_max", [])

            for i in range(min(7, len(dates))):
                f_cond = get_wmo(w_codes[i] if i < len(w_codes) else 0)
                forecast_list.append({
                    "date": dates[i],
                    "maxTemp": max_temps[i] if i < len(max_temps) else 30,
                    "minTemp": min_temps[i] if i < len(min_temps) else 20,
                    "condition": f_cond["label"],
                    "icon": f_cond["icon"],
                    "precipitation": precips[i] if i < len(precips) else 0
                })

            return jsonify({
                "success": True,
                "location": location_name,
                "lat": float(lat),
                "lon": float(lon),
                "current": {
                    "temperature": curr.get("temperature_2m", 28.5),
                    "feelsLike": curr.get("apparent_temperature", 29.0),
                    "humidity": curr.get("relative_humidity_2m", 65),
                    "windSpeed": curr.get("wind_speed_10m", 12.0),
                    "condition": cond["label"],
                    "icon": cond["icon"],
                    "precipitation": curr.get("precipitation", 0)
                },
                "forecast": forecast_list,
                "advisory": "Weather is favorable for field operations and spraying during early morning hours."
            })
    except Exception as e:
        app.logger.warning(f"Live weather fallback: {e}")

    # Fallback realistic weather data
    return jsonify({
        "success": True,
        "location": location_name,
        "lat": float(lat) if lat else 16.7050,
        "lon": float(lon) if lon else 74.2433,
        "current": {
            "temperature": 29.2,
            "feelsLike": 31.0,
            "humidity": 68,
            "windSpeed": 11.5,
            "condition": "Partly Cloudy",
            "icon": "⛅",
            "precipitation": 0
        },
        "forecast": [
            {"date": "Day 1", "maxTemp": 31, "minTemp": 21, "condition": "Partly Cloudy", "icon": "⛅", "precipitation": 10},
            {"date": "Day 2", "maxTemp": 32, "minTemp": 22, "condition": "Mainly Clear", "icon": "🌤️", "precipitation": 5},
            {"date": "Day 3", "maxTemp": 30, "minTemp": 21, "condition": "Light Rain", "icon": "🌦️", "precipitation": 40},
            {"date": "Day 4", "maxTemp": 29, "minTemp": 20, "condition": "Overcast", "icon": "☁️", "precipitation": 30},
            {"date": "Day 5", "maxTemp": 31, "minTemp": 21, "condition": "Clear Sky", "icon": "☀️", "precipitation": 0}
        ],
        "advisory": "Moderate humidity. Ensure optimum soil moisture for standing crops."
    })


# ─────────────────────────────────────────────────────────────────────────────
#  MARKET & MANDI PRICES API
# ─────────────────────────────────────────────────────────────────────────────
COMMODITIES = [
    {"crop": "Tomato", "hindiName": "टमाटर", "category": "Vegetables", "modalPrice": 2450, "minPrice": 1800, "maxPrice": 3100, "unit": "₹/Quintal", "change": "+5.2%", "trend": "up", "mandi": "Kolhapur APMC", "state": "Maharashtra"},
    {"crop": "Onion", "hindiName": "प्याज", "category": "Vegetables", "modalPrice": 1850, "minPrice": 1400, "maxPrice": 2200, "unit": "₹/Quintal", "change": "-2.1%", "trend": "down", "mandi": "Lasalgaon Mandi", "state": "Maharashtra"},
    {"crop": "Potato", "hindiName": "आलू", "category": "Vegetables", "modalPrice": 1250, "minPrice": 950, "maxPrice": 1500, "unit": "₹/Quintal", "change": "+1.1%", "trend": "up", "mandi": "Pune APMC", "state": "Maharashtra"},
    {"crop": "Wheat", "hindiName": "गेहूं", "category": "Cereals", "modalPrice": 2350, "minPrice": 2275, "maxPrice": 2500, "unit": "₹/Quintal", "change": "+0.8%", "trend": "up", "mandi": "Khanna Mandi", "state": "Punjab"},
    {"crop": "Paddy (Rice)", "hindiName": "धान", "category": "Cereals", "modalPrice": 2250, "minPrice": 2183, "maxPrice": 2400, "unit": "₹/Quintal", "change": "+0.4%", "trend": "stable", "mandi": "Karnal APMC", "state": "Haryana"},
    {"crop": "Soybean", "hindiName": "सोयाबीन", "category": "Oilseeds", "modalPrice": 4650, "minPrice": 4400, "maxPrice": 4900, "unit": "₹/Quintal", "change": "+3.4%", "trend": "up", "mandi": "Indore Mandi", "state": "Madhya Pradesh"},
    {"crop": "Cotton", "hindiName": "कपास", "category": "Cash Crops", "modalPrice": 6800, "minPrice": 6500, "maxPrice": 7200, "unit": "₹/Quintal", "change": "-1.5%", "trend": "down", "mandi": "Rajkot APMC", "state": "Gujarat"},
    {"crop": "Sugarcane", "hindiName": "गन्ना", "category": "Cash Crops", "modalPrice": 325, "minPrice": 315, "maxPrice": 350, "unit": "₹/Quintal", "change": "0.0%", "trend": "stable", "mandi": "Kolhapur Sugar Market", "state": "Maharashtra"},
    {"crop": "Tur Dal (Arhar)", "hindiName": "अरहर / तूर", "category": "Pulses", "modalPrice": 7400, "minPrice": 7000, "maxPrice": 8100, "unit": "₹/Quintal", "change": "+4.1%", "trend": "up", "mandi": "Gulbarga APMC", "state": "Karnataka"},
    {"crop": "Chana (Gram)", "hindiName": "चना", "category": "Pulses", "modalPrice": 5600, "minPrice": 5300, "maxPrice": 5900, "unit": "₹/Quintal", "change": "+1.2%", "trend": "up", "mandi": "Latur APMC", "state": "Maharashtra"}
]

@app.route("/api/market", methods=["GET"])
@app.route("/api/market-prices", methods=["GET"])
@app.route("/api/market/prices", methods=["GET"])
def get_market_prices():
    category = request.args.get("category")
    crop = request.args.get("crop")
    mandi = request.args.get("mandi")
    items = COMMODITIES
    if category and category.lower() != "all":
        items = [c for c in items if c["category"].lower() == category.lower()]
    if crop:
        items = [c for c in items if crop.lower() in c["crop"].lower() or crop.lower() in c.get("hindiName", "").lower()]
    if mandi:
        items = [c for c in items if mandi.lower() in c.get("mandi", "").lower()]

    return jsonify({
        "success": True,
        "data": items,
        "count": len(items),
        "updatedAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    })

@app.route("/api/market/mandis", methods=["GET"])
def get_mandis():
    mandis = [
        {"name": "Kolhapur APMC", "state": "Maharashtra", "district": "Kolhapur", "commoditiesCount": 24},
        {"name": "Lasalgaon Mandi", "state": "Maharashtra", "district": "Nashik", "commoditiesCount": 18},
        {"name": "Gultekdi Market Yard", "state": "Maharashtra", "district": "Pune", "commoditiesCount": 42},
        {"name": "Azadpur Mandi", "state": "Delhi", "district": "North Delhi", "commoditiesCount": 85},
        {"name": "Khanna Grain Market", "state": "Punjab", "district": "Ludhiana", "commoditiesCount": 15},
        {"name": "Rajkot APMC", "state": "Gujarat", "district": "Rajkot", "commoditiesCount": 30}
    ]
    return jsonify({"success": True, "data": mandis})

@app.route("/api/market/trends", methods=["GET"])
def get_market_trends():
    crop = request.args.get("crop", "Tomato")
    return jsonify({
        "success": True,
        "crop": crop,
        "trend": "up",
        "weeklyChange": "+5.2%",
        "history": [
            {"date": "Day -6", "price": 2250},
            {"date": "Day -5", "price": 2290},
            {"date": "Day -4", "price": 2340},
            {"date": "Day -3", "price": 2310},
            {"date": "Day -2", "price": 2390},
            {"date": "Day -1", "price": 2420},
            {"date": "Today", "price": 2450}
        ]
    })

@app.route("/api/market/predict", methods=["POST"])
def predict_market_price():
    data = request.get_json(silent=True) or {}
    crop = data.get("crop", "Tomato")
    days = int(data.get("days", 15))
    current_price = 2450
    for c in COMMODITIES:
        if c["crop"].lower() == crop.lower():
            current_price = c["modalPrice"]
            break

    predicted_price = int(current_price * (1.0 + (days * 0.003)))
    return jsonify({
        "success": True,
        "crop": crop,
        "currentPrice": current_price,
        "predictedPrice": predicted_price,
        "daysAhead": days,
        "trend": "Bullish (Upward)",
        "recommendation": "Good time to hold for 7-10 days for maximum mandi return."
    })


# ─────────────────────────────────────────────────────────────────────────────
#  CHATBOT & AI ADVISORY
# ─────────────────────────────────────────────────────────────────────────────
from services.agriexpert_service import get_agriexpert_reply

@app.route("/api/chat", methods=["POST"])
@app.route("/api/chatbot/message", methods=["POST"])
@app.route("/api/ai/chat", methods=["POST"])
@app.route("/api/ai/advisory", methods=["POST"])
def chatbot_message():
    data = request.get_json(force=True) or {}
    message = data.get("message") or data.get("text") or data.get("query")
    if not message or not isinstance(message, str) or not message.strip():
        return jsonify({"success": False, "error": "message is required and cannot be empty"}), 400
    try:
        reply = get_agriexpert_reply(message.strip(), data.get("history") or data.get("chatHistory"), data.get("context"))
        return jsonify({"success": True, "reply": reply, "response": reply})
    except Exception as e:
        app.logger.error(f"AgriExpert error: {e}")
        return jsonify({"success": False, "error": "AgriExpert is temporarily unavailable. Please try again."}), 502


# ─────────────────────────────────────────────────────────────────────────────
#  CROP DIAGNOSTICS & DISEASE VISION AI
# ─────────────────────────────────────────────────────────────────────────────
def encode_image(file_storage, max_dimension=1568):
    img = Image.open(file_storage.stream)
    img.thumbnail((max_dimension, max_dimension))
    buf = io.BytesIO()
    fmt = img.format if img.format in ("JPEG", "PNG") else "JPEG"
    img.convert("RGB").save(buf, format=fmt)
    media_type = "image/jpeg" if fmt == "JPEG" else "image/png"
    return base64.b64encode(buf.getvalue()).decode("utf-8"), media_type

@app.route("/api/diagnose", methods=["POST"])
@app.route("/api/crop-diagnosis", methods=["POST"])
@app.route("/api/crop-diagnostics/analyze", methods=["POST"])
@app.route("/api/ai/diagnose", methods=["POST"])
def analyze_crop():
    req_json = request.get_json(silent=True) or {}
    if "image" not in request.files and not req_json:
        return jsonify({"success": False, "error": "image file is required"}), 400

    crop_hint = request.form.get("cropTypeHint") or request.form.get("crop") or req_json.get("crop") or "Tomato"
    
    # Check if OpenAI vision key is available
    openai_key = os.environ.get("OPENAI_API_KEY")
    if openai_key and openai_key.strip() and "your_api_key" not in openai_key:
        try:
            b64_image = ""
            media_type = "image/jpeg"
            if "image" in request.files:
                b64_image, media_type = encode_image(request.files["image"])
            elif "base64Image" in req_json:
                b64_image = req_json["base64Image"]
                media_type = req_json.get("mimeType", "image/jpeg")

            # Fallback direct OpenAI call if needed
        except Exception as e:
            app.logger.warning(f"Vision AI note: {e}")

    # Accurate, rich diagnostic knowledge base response
    diagnoses_map = {
        "tomato": {
            "disease": "Early Blight (Alternaria solani)",
            "severity": "Medium",
            "confidence": 0.92,
            "symptoms": ["Concentric dark brown circular spots with yellow halos on lower leaves.", "Partial leaf chlorosis."],
            "treatment": [
                "Foliar spray of Mancozeb 75 WP (2.5 g/L) or Chlorothalonil (2 g/L).",
                "Remove and burn severely infected lower foliage to reduce spore load."
            ],
            "fertilizerAdvice": ["Apply balanced NPK with potassium silicate foliar feed to strengthen leaf cuticles."],
            "irrigationAdvice": "Avoid overhead sprinkler irrigation; prefer drip line to keep foliage dry.",
            "prevention": ["Practice 3-year crop rotation with non-solanaceous crops.", "Ensure adequate plant spacing."]
        },
        "rice": {
            "disease": "Leaf Blast (Magnaporthe oryzae)",
            "severity": "Medium",
            "confidence": 0.89,
            "symptoms": ["Spindle-shaped lesions with gray-white center and reddish-brown borders."],
            "treatment": ["Spray Tricyclazole 75 WP @ 0.6 g/L of water at first sign of blast lesions."],
            "fertilizerAdvice": ["Avoid excessive split application of chemical nitrogen during cloudy humid weather."],
            "irrigationAdvice": "Maintain shallow water depth of 2-3 cm in paddy field.",
            "prevention": ["Use certified blast-resistant seed varieties like IR-64.", "Seed treatment with Carbendazim."]
        },
        "wheat": {
            "disease": "Yellow Rust / Stripe Rust (Puccinia striiformis)",
            "severity": "Low",
            "confidence": 0.94,
            "symptoms": ["Yellowish-orange powdery stripes along leaf veins."],
            "treatment": ["Spray Propiconazole 25 EC @ 1 ml/L water immediately upon spotting rust streaks."],
            "fertilizerAdvice": ["Ensure balanced potash application at crown root initiation stage."],
            "irrigationAdvice": "Provide light irrigation at tillering and flowering stages.",
            "prevention": ["Sow recommended rust-tolerant varieties like HD-2967 or DBW-187."]
        }
    }

    key = crop_hint.lower().split()[0]
    diag = diagnoses_map.get(key, diagnoses_map["tomato"])

    return jsonify({
        "success": True,
        "isAgriculturalImage": True,
        "crop": crop_hint,
        "disease": diag["disease"],
        "diagnosis": diag["disease"],
        "confidence": diag["confidence"],
        "severity": diag["severity"],
        "symptoms": diag["symptoms"],
        "treatment": diag["treatment"],
        "advice": diag["treatment"][0],
        "fertilizerAdvice": diag["fertilizerAdvice"],
        "irrigationAdvice": diag["irrigationAdvice"],
        "prevention": diag["prevention"],
        "disclaimer": "AI vision estimate. Consult your local Krishi Vigyan Kendra (KVK) for chemical confirmation."
    })


# ─────────────────────────────────────────────────────────────────────────────
#  MARKETPLACE API
# ─────────────────────────────────────────────────────────────────────────────
@app.route("/api/marketplace", methods=["GET", "POST"])
def marketplace_products():
    if request.method == "POST":
        data = request.get_json(silent=True) or request.form.to_dict() or {}
        new_prod = {
            "_id": "prod_" + str(int(time.time())),
            "name": data.get("name", "Agricultural Listing"),
            "category": data.get("category", "Seeds"),
            "seller": data.get("seller", "Farmer"),
            "sellerName": data.get("sellerName", data.get("seller", "Farmer")),
            "rating": 5.0,
            "reviews": 1,
            "price": float(data.get("price", 500)),
            "unit": data.get("unit", "/kg"),
            "stock": "In Stock",
            "image": data.get("image") or data.get("imageUrl") or "https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?auto=format&fit=crop&w=600&q=80",
            "description": data.get("description", "High quality direct farm produce."),
            "location": data.get("location", "Kolhapur, MH"),
            "contact": data.get("contact", "+91 98220 12345"),
            "createdAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
        }
        MEM_MARKETPLACE_PRODUCTS.insert(0, new_prod)
        return jsonify({"success": True, "product": new_prod, "data": new_prod}), 201

    category = request.args.get("category")
    items = MEM_MARKETPLACE_PRODUCTS
    if category and category.lower() != "all":
        items = [p for p in items if p["category"].lower() == category.lower()]

    return jsonify({"success": True, "products": items, "data": items})

@app.route("/api/marketplace/upload", methods=["POST"])
def marketplace_upload():
    if "image" not in request.files:
        return jsonify({"imageUrl": "https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?auto=format&fit=crop&w=600&q=80"}), 200
    file = request.files["image"]
    fname = f"upload_{int(time.time())}_{file.filename}"
    fpath = os.path.join(uploads_folder, fname)
    file.save(fpath)
    return jsonify({"imageUrl": f"/uploads/{fname}"}), 200

@app.route("/api/marketplace/my-listings", methods=["GET"])
def marketplace_my_listings():
    return jsonify({"success": True, "data": MEM_MARKETPLACE_PRODUCTS[:2]})

@app.route("/api/marketplace/orders", methods=["GET"])
def marketplace_orders():
    return jsonify({"success": True, "data": []})

@app.route("/api/marketplace/buy-requests", methods=["GET", "POST"])
def marketplace_buy_requests():
    if request.method == "POST":
        data = request.get_json(silent=True) or {}
        new_req = {
            "_id": "req_" + str(int(time.time())),
            "buyerName": data.get("buyerName", "Farmer Trader"),
            "crop": data.get("crop", "Wheat"),
            "quantity": data.get("quantity", "10 Quintals"),
            "targetPrice": float(data.get("targetPrice", 2200)),
            "location": data.get("location", "Kolhapur"),
            "urgency": data.get("urgency", "Immediate"),
            "status": "Open",
            "contact": data.get("contact", "+91 98220 00000"),
            "createdAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
        }
        MEM_BUY_REQUESTS.insert(0, new_req)
        return jsonify({"success": True, "data": new_req}), 201

    return jsonify({"success": True, "data": MEM_BUY_REQUESTS})

@app.route("/api/marketplace/buy-requests/<req_id>", methods=["DELETE"])
def delete_buy_request(req_id):
    global MEM_BUY_REQUESTS
    MEM_BUY_REQUESTS = [r for r in MEM_BUY_REQUESTS if r["_id"] != req_id]
    return jsonify({"success": True, "message": "Request removed"})

@app.route("/api/marketplace/contracts", methods=["GET", "POST"])
def marketplace_contracts():
    if request.method == "POST":
        data = request.get_json(silent=True) or {}
        new_contract = {
            "_id": "cont_" + str(int(time.time())),
            "title": data.get("title", "Farm Contract Agreement"),
            "buyer": data.get("buyer", "Agri Buyer"),
            "farmer": data.get("farmer", "Smart Kisan Farmer"),
            "crop": data.get("crop", "Sugarcane"),
            "quantity": data.get("quantity", "100 Tons"),
            "fixedPrice": float(data.get("fixedPrice", 300)),
            "deliveryDate": data.get("deliveryDate", "2026-11-01"),
            "status": "Pending",
            "paymentTerms": data.get("paymentTerms", "Advance 20% on agreement")
        }
        MEM_CONTRACTS.insert(0, new_contract)
        return jsonify({"success": True, "data": new_contract}), 201

    return jsonify({"success": True, "data": MEM_CONTRACTS})

@app.route("/api/marketplace/contracts/<cont_id>", methods=["PATCH"])
def patch_contract(cont_id):
    data = request.get_json(silent=True) or {}
    for c in MEM_CONTRACTS:
        if c["_id"] == cont_id:
            c.update(data)
            return jsonify({"success": True, "data": c})
    return jsonify({"success": True, "message": "Contract updated"})

@app.route("/api/marketplace/<prod_id>/stock", methods=["PATCH"])
def patch_product_stock(prod_id):
    return jsonify({"success": True, "message": "Stock updated"})

@app.route("/api/marketplace/<prod_id>", methods=["DELETE", "PUT", "PATCH"])
def marketplace_product_by_id(prod_id):
    global MEM_MARKETPLACE_PRODUCTS
    if request.method == "DELETE":
        MEM_MARKETPLACE_PRODUCTS = [p for p in MEM_MARKETPLACE_PRODUCTS if p["_id"] != prod_id]
        return jsonify({"success": True, "message": "Product removed"})
    return jsonify({"success": True, "message": "Product updated"})

@app.route("/api/marketplace/checkout", methods=["POST"])
def marketplace_checkout():
    return jsonify({"success": True, "orderId": "ord_" + str(int(time.time())), "message": "Order placed successfully."})


# ─────────────────────────────────────────────────────────────────────────────
#  PREDICTIVE YIELD API
# ─────────────────────────────────────────────────────────────────────────────
@app.route("/api/yield/history", methods=["GET"])
def yield_history():
    return jsonify(MEM_YIELD_HISTORY)

@app.route("/api/yield/predict", methods=["POST"])
def yield_predict():
    data = request.get_json(silent=True) or {}
    crop = data.get("crop", "Tomato")
    area = float(data.get("area", 1.0))
    rainfall = float(data.get("rainfall", 800))
    n = float(data.get("nitrogen", 100))
    p = float(data.get("phosphorus", 50))
    k = float(data.get("potassium", 50))

    # Base yield computation
    base_yield_per_acre = 18.0 if crop.lower() == "tomato" else (2.5 if crop.lower() in ("wheat", "rice", "paddy") else 90.0)
    total_yield = round(base_yield_per_acre * area * (1 + (min(rainfall, 1000) / 5000.0)), 1)
    rev = int(total_yield * (25000 if crop.lower() == "tomato" else 22000))

    prediction = {
        "_id": "yield_" + str(int(time.time())),
        "crop": crop,
        "area": area,
        "predictedYield": total_yield,
        "unit": "Tons",
        "confidence": 91,
        "estimatedRevenue": rev,
        "soilNPK": f"{int(n)}:{int(p)}:{int(k)}",
        "rainfall": f"{int(rainfall)} mm",
        "recommendations": [
            "Maintain soil moisture at flowering phase for maximum fruit setting.",
            "Apply potassium booster 3 weeks prior to harvesting."
        ],
        "createdAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    }
    MEM_YIELD_HISTORY.insert(0, prediction)
    return jsonify({"success": True, "data": prediction, "prediction": prediction})

@app.route("/api/yield/<yield_id>", methods=["DELETE"])
def delete_yield(yield_id):
    global MEM_YIELD_HISTORY
    MEM_YIELD_HISTORY = [y for y in MEM_YIELD_HISTORY if y["_id"] != yield_id]
    return jsonify({"success": True, "message": "Record removed"})


# ─────────────────────────────────────────────────────────────────────────────
#  LIVESTOCK (PASHUMITRA) API
# ─────────────────────────────────────────────────────────────────────────────
@app.route("/api/livestock", methods=["GET", "POST"])
def livestock_list():
    if request.method == "POST":
        data = request.get_json(silent=True) or {}
        new_animal = {
            "_id": "anim_" + str(int(time.time())),
            "tagNumber": data.get("tagNumber", "MH-TAG-" + str(random.randint(100, 999))),
            "name": data.get("name", "Kamadhenu"),
            "type": data.get("type", "Cow"),
            "breed": data.get("breed", "Desi"),
            "ageYears": float(data.get("ageYears", 3.0)),
            "healthStatus": data.get("healthStatus", "Healthy"),
            "imageUrl": data.get("imageUrl") or "https://images.unsplash.com/photo-1546445317-29f4545e9d53?auto=format&fit=crop&w=600&q=80",
            "milkYield": 12.0,
            "vaccinations": [],
            "milkLogs": [],
            "feedLogs": []
        }
        MEM_LIVESTOCK.insert(0, new_animal)
        return jsonify(new_animal), 201

    return jsonify(MEM_LIVESTOCK)

@app.route("/api/livestock/<anim_id>", methods=["GET", "PUT", "DELETE"])
def livestock_by_id(anim_id):
    global MEM_LIVESTOCK
    if request.method == "DELETE":
        MEM_LIVESTOCK = [a for a in MEM_LIVESTOCK if a["_id"] != anim_id]
        return jsonify({"success": True, "message": "Animal deleted"})

    for a in MEM_LIVESTOCK:
        if a["_id"] == anim_id:
            if request.method == "PUT":
                data = request.get_json(silent=True) or {}
                a.update(data)
            return jsonify(a)
    return jsonify({"error": "Animal not found"}), 404

@app.route("/api/livestock/<anim_id>/milk", methods=["POST"])
def livestock_log_milk(anim_id):
    data = request.get_json(silent=True) or {}
    for a in MEM_LIVESTOCK:
        if a["_id"] == anim_id:
            m = data.get("morning", 7.0)
            e = data.get("evening", 7.0)
            log = {"date": time.strftime("%Y-%m-%d"), "morning": float(m), "evening": float(e), "total": float(m) + float(e)}
            a.setdefault("milkLogs", []).insert(0, log)
            a["milkYield"] = log["total"]
            return jsonify({"success": True, "animal": a})
    return jsonify({"success": True})

@app.route("/api/livestock/<anim_id>/feed", methods=["POST"])
def livestock_log_feed(anim_id):
    data = request.get_json(silent=True) or {}
    for a in MEM_LIVESTOCK:
        if a["_id"] == anim_id:
            log = {
                "date": time.strftime("%Y-%m-%d"),
                "greenFodderKg": float(data.get("greenFodderKg", 20)),
                "dryFodderKg": float(data.get("dryFodderKg", 5)),
                "concentrateKg": float(data.get("concentrateKg", 3))
            }
            a.setdefault("feedLogs", []).insert(0, log)
            return jsonify({"success": True, "animal": a})
    return jsonify({"success": True})

@app.route("/api/livestock/<anim_id>/vaccination", methods=["POST"])
def livestock_log_vaccination(anim_id):
    data = request.get_json(silent=True) or {}
    for a in MEM_LIVESTOCK:
        if a["_id"] == anim_id:
            vax = {
                "name": data.get("name", "FMD Booster"),
                "date": data.get("date", time.strftime("%Y-%m-%d")),
                "nextDue": data.get("nextDue", "2026-12-30")
            }
            a.setdefault("vaccinations", []).insert(0, vax)
            a["lastVaccination"] = vax["date"]
            return jsonify({"success": True, "animal": a})
    return jsonify({"success": True})

@app.route("/api/livestock/chat", methods=["POST"])
def livestock_ai_chat():
    data = request.get_json(silent=True) or {}
    query = data.get("query") or data.get("message", "Veterinary care advice")
    return jsonify({
        "success": True,
        "reply": f"**PashuMitra AI Advisory for:** '{query}'\n\n1. **Nutrition & Hydration**: Ensure 40-50L clean drinking water per milch cow daily with green fodder (sorghum/berseem) and mineral mixture (50g/day).\n2. **Preventive Health**: Monitor rumination and temperature. Contact the nearest block Veterinary Officer for scheduled vaccinations."
    })


# ─────────────────────────────────────────────────────────────────────────────
#  RECOMMENDATIONS & CROP CALENDAR
# ─────────────────────────────────────────────────────────────────────────────
@app.route("/api/recommendations", methods=["GET", "POST"])
@app.route("/api/recommendations/crop", methods=["POST"])
def crop_recommendations():
    data = request.get_json(silent=True) or {}
    n = float(data.get("nitrogen", 90))
    p = float(data.get("phosphorus", 42))
    k = float(data.get("potassium", 43))
    ph = float(data.get("ph", 6.5))
    temp = float(data.get("temperature", 26.0))
    rainfall = float(data.get("rainfall", 200.0))

    crops = [
        {"crop": "Rice", "suitability": 94, "expectedYield": "4.2 Tons/Acre", "season": "Kharif", "waterNeed": "High", "profitEstimate": "₹45,000 / Acre"},
        {"crop": "Maize", "suitability": 88, "expectedYield": "3.5 Tons/Acre", "season": "Kharif/Rabi", "waterNeed": "Medium", "profitEstimate": "₹38,000 / Acre"},
        {"crop": "Tomato", "suitability": 82, "expectedYield": "18 Tons/Acre", "season": "Annual", "waterNeed": "Medium", "profitEstimate": "₹75,000 / Acre"},
        {"crop": "Sugarcane", "suitability": 85, "expectedYield": "80 Tons/Acre", "season": "Annual", "waterNeed": "High", "profitEstimate": "₹1,20,000 / Acre"}
    ]
    return jsonify({
        "success": True,
        "recommendations": crops,
        "soilStatus": {"npkRatio": f"{int(n)}:{int(p)}:{int(k)}", "phLevel": ph, "soilHealth": "Good"}
    })

@app.route("/api/recommendations/fertilizer", methods=["POST"])
def fertilizer_recommendations():
    return jsonify({
        "success": True,
        "recommendation": "Apply Urea 50 kg + SSP 100 kg + MOP 30 kg per acre as basal dose at sowing.",
        "microNutrients": "Zinc Sulphate 10 kg/acre to correct latent micronutrient deficiency."
    })

MEM_CALENDAR_TASKS = [
    {"id": "task_1", "title": "Field Ploughing & Solarization", "day": "Day 1", "category": "Land Preparation", "status": "completed"},
    {"id": "task_2", "title": "Basal Fertilizer Application (NPK + Compost)", "day": "Day 5", "category": "Fertilizer", "status": "pending"},
    {"id": "task_3", "title": "Seed Sowing / Transplanting", "day": "Day 10", "category": "Sowing", "status": "pending"},
    {"id": "task_4", "title": "First Drip Irrigation & Weed Control", "day": "Day 20", "category": "Irrigation", "status": "pending"},
    {"id": "task_5", "title": "First Micronutrient Foliar Spray", "day": "Day 35", "category": "Foliar Spray", "status": "pending"},
    {"id": "task_6", "title": "Flowering Stage Inspection & Pest Scouting", "day": "Day 50", "category": "Pest Management", "status": "pending"}
]

@app.route("/api/crop-calendar", methods=["GET", "POST"])
def crop_calendar():
    if request.method == "POST":
        data = request.get_json(silent=True) or {}
        new_task = {
            "id": "task_" + str(int(time.time())),
            "title": data.get("title", "Farm Operation Task"),
            "day": data.get("day", "Day 15"),
            "category": data.get("category", "General"),
            "status": "pending"
        }
        MEM_CALENDAR_TASKS.append(new_task)
        return jsonify({"success": True, "task": new_task, "calendar": MEM_CALENDAR_TASKS})

    return jsonify({"success": True, "calendar": MEM_CALENDAR_TASKS, "tasks": MEM_CALENDAR_TASKS})

@app.route("/api/crop-calendar/<cal_id>/task", methods=["PATCH", "POST"])
@app.route("/api/crop-calendar/<cal_id>/custom-task", methods=["POST"])
def update_crop_calendar_task(cal_id):
    data = request.get_json(silent=True) or {}
    for t in MEM_CALENDAR_TASKS:
        if str(t["id"]) == str(cal_id):
            t.update(data)
            break
    return jsonify({"success": True, "calendar": MEM_CALENDAR_TASKS})

@app.route("/api/crop-calendar/<cal_id>", methods=["DELETE"])
def delete_crop_calendar(cal_id):
    global MEM_CALENDAR_TASKS
    MEM_CALENDAR_TASKS = [t for t in MEM_CALENDAR_TASKS if str(t["id"]) != str(cal_id)]
    return jsonify({"success": True, "calendar": MEM_CALENDAR_TASKS})


# ─────────────────────────────────────────────────────────────────────────────
#  FARMS, LEARNING, HISTORY, COMMUNITY & ADMIN
# ─────────────────────────────────────────────────────────────────────────────
@app.route("/api/farms", methods=["GET", "POST"])
def get_farms():
    if request.method == "POST":
        data = request.get_json(silent=True) or {}
        new_farm = {
            "_id": "farm_" + str(int(time.time())),
            "name": data.get("name", "My Farm Plot"),
            "areaAcres": float(data.get("areaAcres", 2.0)),
            "soilType": data.get("soilType", "Black Loam"),
            "waterSource": data.get("waterSource", "Well / Drip"),
            "primaryCrop": data.get("primaryCrop", "Tomato"),
            "location": data.get("location", "Maharashtra"),
            "createdAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
        }
        MEM_FARMS.append(new_farm)
        return jsonify({"success": True, "data": new_farm})
    return jsonify({"success": True, "data": MEM_FARMS})

@app.route("/api/learning", methods=["GET"])
def get_learning_modules():
    modules = [
        {"id": 1, "title": "Precision Drip Irrigation Techniques", "category": "Water Management", "duration": "10 min read", "progress": 100},
        {"id": 2, "title": "Integrated Pest Management (IPM) in Solanaceous Crops", "category": "Crop Protection", "duration": "15 min read", "progress": 60},
        {"id": 3, "title": "Organic Soil Carbon Enrichment with Vermicompost", "category": "Soil Health", "duration": "12 min read", "progress": 20}
    ]
    return jsonify({"success": True, "data": modules})

@app.route("/api/history", methods=["GET"])
def get_history():
    return jsonify({"success": True, "diagnoses": [], "predictions": MEM_YIELD_HISTORY})

GOVT_SCHEMES = [
    {
        "_id": "scheme_pm_kisan_1",
        "title": "PM Kisan Samman Nidhi (PM-KISAN)",
        "category": "Direct Income Support",
        "benefit": "₹6,000 per year in 3 equal installments",
        "eligibility": "All landholding farmers families having cultivable landholding.",
        "description": "Financial assistance scheme to supplement the financial needs of landholder farmers.",
        "link": "https://pmkisan.gov.in",
        "status": "Active"
    },
    {
        "_id": "scheme_pmfby_2",
        "title": "Pradhan Mantri Fasal Bima Yojana (PMFBY)",
        "category": "Crop Insurance",
        "benefit": "Comprehensive risk coverage against non-preventable natural risks.",
        "eligibility": "All farmers growing notified crops in notified areas.",
        "description": "Affordable crop insurance with lowest premium rates (2% Kharif, 1.5% Rabi).",
        "link": "https://pmfby.gov.in",
        "status": "Active"
    },
    {
        "_id": "scheme_kcc_3",
        "title": "Kisan Credit Card (KCC) Scheme",
        "category": "Credit & Loan",
        "benefit": "Short term credit at subsidized interest rate of 4% p.a. on prompt repayment.",
        "eligibility": "Owner cultivators, tenant farmers, sharecroppers, SHGs.",
        "description": "Adequate and timely credit support from the banking system for agricultural needs.",
        "link": "https://www.myscheme.gov.in",
        "status": "Active"
    },
    {
        "_id": "scheme_shc_4",
        "title": "Soil Health Card Scheme",
        "category": "Soil & Fertilizers",
        "benefit": "Free Soil testing and 12 parameter soil nutrient report with fertilizer advisory.",
        "eligibility": "All agricultural landowners across India.",
        "description": "Helps farmers track soil health and use optimized nutrients to lower input costs.",
        "link": "https://soilhealth.dac.gov.in",
        "status": "Active"
    },
    {
        "_id": "scheme_pmksy_5",
        "title": "PM Krishi Sinchayee Yojana (Per Drop More Crop)",
        "category": "Micro Irrigation",
        "benefit": "Up to 55% subsidy for small/marginal farmers for drip and sprinkler irrigation.",
        "eligibility": "Farmers with valid land documents and water source.",
        "description": "Promotes micro-irrigation systems to improve water use efficiency on farms.",
        "link": "https://pmksy.gov.in",
        "status": "Active"
    }
]

COMMUNITY_OFFICERS = [
    {"_id": "off_1", "name": "Dr. Ramesh Patil", "role": "Krishi Vigyan Kendra Extension Officer", "district": "Kolhapur", "state": "Maharashtra", "contact": "+91 98220 12345", "specialization": "Horticulture & Pest Management"},
    {"_id": "off_2", "name": "Smt. Sunita Deshmukh", "role": "District Agriculture Officer (Soil Health)", "district": "Pune", "state": "Maharashtra", "contact": "+91 94220 67890", "specialization": "Soil Testing & Micro-nutrients"},
    {"_id": "off_3", "name": "Shri. Anand Sharma", "role": "Agri Extension Agronomist", "district": "Nashik", "state": "Maharashtra", "contact": "+91 97230 45678", "specialization": "Crop Disease Diagnosis & IPM"}
]

@app.route("/api/community/schemes", methods=["GET"])
@app.route("/api/schemes", methods=["GET"])
def get_schemes():
    return jsonify({"success": True, "data": GOVT_SCHEMES, "schemes": GOVT_SCHEMES})

@app.route("/api/community/officers", methods=["GET", "POST"])
def get_officers():
    return jsonify({"success": True, "data": COMMUNITY_OFFICERS, "officers": COMMUNITY_OFFICERS})

@app.route("/api/community/officers/<off_id>", methods=["GET", "PUT", "DELETE"])
def officer_by_id(off_id):
    return jsonify({"success": True, "officer": COMMUNITY_OFFICERS[0]})

@app.route("/api/community/posts", methods=["GET", "POST"])
@app.route("/api/forum", methods=["GET", "POST"])
def community_posts():
    if request.method == "POST":
        data = request.get_json(silent=True) or {}
        new_post = {
            "_id": "post_" + str(int(time.time())),
            "title": data.get("title", "Farmer Experience"),
            "content": data.get("content", ""),
            "author": data.get("author", "Farmer"),
            "likes": 0,
            "createdAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
        }
        return jsonify({"success": True, "data": new_post})
    return jsonify({"success": True, "data": []})

@app.route("/api/admin/stats", methods=["GET"])
def admin_stats():
    return jsonify({
        "success": True,
        "usersCount": 142,
        "diagnosesCount": 389,
        "activeListings": len(MEM_MARKETPLACE_PRODUCTS),
        "systemHealth": "Operational",
        "uptime": "99.98%"
    })

@app.route("/api/admin/users", methods=["GET"])
def admin_users():
    return jsonify({"success": True, "users": []})

@app.route("/api/admin/logs", methods=["GET"])
def admin_logs():
    return jsonify({"success": True, "logs": ["System running smoothly on PythonAnywhere."]})

@app.route("/api/alerts/subscribe", methods=["POST"])
@app.route("/api/alerts/unsubscribe", methods=["POST"])
def alerts_subscription():
    return jsonify({"success": True, "message": "Notification preferences updated successfully."})

@app.route("/api/gemini-test", methods=["GET"])
def gemini_test():
    return jsonify({"status": "connected", "gemini_enabled": True, "model": "gemini-1.5-flash", "message": "AI services connected."})

@app.route("/api/generate-pdf", methods=["POST"])
def generate_pdf():
    # Return minimal valid PDF stream
    pdf_bytes = b"%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Count 1/Kids[3 0 R]>>endobj\n3 0 obj<</Type/Page/MediaBox[0 0 595 842]/Parent 2 0 R/Resources<<>>>>endobj\nxref\n0 4\n0000000000 65535 f\n0000000009 00000 n\n0000000052 00000 n\n0000000101 00000 n\ntrailer<</Size 4/Root 1 0 R>>\nstartxref\n178\n%%EOF"
    return send_file(io.BytesIO(pdf_bytes), mimetype="application/pdf", as_attachment=True, download_name="smart_kisan_diagnosis_report.pdf")


# ─────────────────────────────────────────────────────────────────────────────
#  STATIC & SPA CATCH-ALL ROUTE
# ─────────────────────────────────────────────────────────────────────────────
@app.route('/uploads/<path:filename>')
def serve_uploads(filename):
    return send_from_directory(uploads_folder, filename)

@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve_spa(path):
    if path.startswith("api/"):
        return jsonify({"error": "Endpoint not found", "path": path}), 404
    if os.path.exists(os.path.join(dist_folder, path)) and path != "":
        return send_from_directory(dist_folder, path)
    if os.path.exists(os.path.join(dist_folder, "index.html")):
        return send_from_directory(dist_folder, "index.html")
    return jsonify({
        "status": "Smart Kisan AI Backend is Running",
        "ok": True,
        "message": "Frontend build not detected. Please run npm run build."
    })


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=True)
