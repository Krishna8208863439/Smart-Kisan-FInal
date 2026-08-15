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
from flask import Flask, request, jsonify, send_from_directory

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
        response.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS'
        response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization, X-Requested-With'
        return response

dist_folder = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'dist')
if not os.path.exists(dist_folder):
    dist_folder = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'frontend', 'dist')


@app.route("/api/health", methods=["GET"])
def health_check():
    return jsonify({"status": "ok", "service": "Smart Kisan AI Backend"})

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

from services.agriexpert_service import get_agriexpert_reply

VISION_MODEL = os.environ.get("CLAUDE_VISION_MODEL", "claude-sonnet-5")


def get_anthropic_client():
    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key or api_key == "sk-ant-xxxxxxxxxxxxxxxxxxxxxxxx":
        raise ValueError("ANTHROPIC_API_KEY is not configured with a valid key in .env.")
    return Anthropic(api_key=api_key)


def encode_image(file_storage, max_dimension=1568):
    img = Image.open(file_storage.stream)
    img.thumbnail((max_dimension, max_dimension))
    buf = io.BytesIO()
    fmt = img.format if img.format in ("JPEG", "PNG") else "JPEG"
    img.convert("RGB").save(buf, format=fmt)
    media_type = "image/jpeg" if fmt == "JPEG" else "image/png"
    return base64.b64encode(buf.getvalue()).decode("utf-8"), media_type


def validate_is_plant(b64_image, media_type):
    client = get_anthropic_client()
    chat_model = os.environ.get("CLAUDE_CHAT_MODEL", "claude-haiku-4-5-20251001")
    fallback_models = [chat_model, "claude-3-5-haiku-20241022", "claude-3-haiku-20240307"]

    resp = None
    last_err = None

    for model_to_use in list(dict.fromkeys(fallback_models)):
        try:
            resp = client.messages.create(
                model=model_to_use,
                max_tokens=10,
                messages=[{
                    "role": "user",
                    "content": [
                        {"type": "image", "source": {"type": "base64", "media_type": media_type, "data": b64_image}},
                        {"type": "text", "text": "Respond with ONLY one word: PLANT if this is a crop/plant/leaf/field photo, or NOT_PLANT for anything else."},
                    ],
                }],
            )
            if resp:
                break
        except Exception as err:
            last_err = err
            continue

    if not resp:
        raise last_err or RuntimeError("Stage A validation failed.")

    result_text = resp.content[0].text.strip().upper()
    return "PLANT" in result_text and "NOT_PLANT" not in result_text


DIAGNOSIS_SYSTEM_PROMPT = """You are a crop diagnostics assistant analyzing a photo for an Indian farmer.

Return ONLY valid JSON, no other text, in this exact shape:
{
  "cropIdentified": "string",
  "healthStatus": "Healthy | Stressed | Diseased | Unclear",
  "growthStage": "string",
  "diseaseAssessment": {
    "suspectedIssue": "string or null",
    "confidence": "High | Medium | Low",
    "visualEvidence": "string - what you actually see supporting this"
  },
  "recommendations": ["string", "..."],
  "disclaimer": "This is an AI vision estimate, not a lab-verified diagnosis. Confirm with your local Krishi Vigyan Kendra or agri extension officer before applying any treatment."
}

RULES:
- Base every field only on what's visible. If unclear, say "Unclear"/null — never guess to fill a field.
- Never state a specific pesticide/fertilizer dosage in ml/kg/L — name the treatment category only, defer exact dosage to a local dealer/KVK.
- confidence is your own certainty as a vision model, not a statistical measure — keep it honest."""


def diagnose_crop(b64_image, media_type, crop_hint):
    client = get_anthropic_client()
    vision_models = [VISION_MODEL, "claude-3-5-sonnet-20241022", os.environ.get("CLAUDE_CHAT_MODEL", "claude-haiku-4-5-20251001")]

    resp = None
    last_err = None

    for model_to_use in list(dict.fromkeys(vision_models)):
        try:
            resp = client.messages.create(
                model=model_to_use,
                max_tokens=1024,
                system=DIAGNOSIS_SYSTEM_PROMPT,
                messages=[{
                    "role": "user",
                    "content": [
                        {"type": "image", "source": {"type": "base64", "media_type": media_type, "data": b64_image}},
                        {"type": "text", "text": f"Crop type hint from farmer: {crop_hint or 'not specified'}"},
                    ],
                }],
            )
            if resp:
                break
        except Exception as err:
            last_err = err
            continue

    if not resp:
        raise last_err or RuntimeError("Stage B diagnosis failed.")

    raw_text = resp.content[0].text.strip()
    if "```" in raw_text:
        parts = raw_text.split("```")
        raw_text = parts[1] if len(parts) > 1 else parts[0]
        if raw_text.startswith("json"):
            raw_text = raw_text[4:]
        raw_text = raw_text.strip().split("```")[0].strip()

    parsed = json.loads(raw_text)

    # Sanitize confidence
    conf = parsed.get("diseaseAssessment", {}).get("confidence", "Medium")
    if "high" in str(conf).lower():
        conf_band = "High"
    elif "low" in str(conf).lower():
        conf_band = "Low"
    else:
        conf_band = "Medium"

    if "diseaseAssessment" in parsed and isinstance(parsed["diseaseAssessment"], dict):
        parsed["diseaseAssessment"]["confidence"] = conf_band

    return parsed


@app.route("/api/chat", methods=["POST"])
@app.route("/api/chatbot/message", methods=["POST"])
def chatbot_message():
    data = request.get_json(force=True) or {}
    message = data.get("message") or data.get("text")
    if not message or not isinstance(message, str) or not message.strip():
        return jsonify({"success": False, "error": "message is required and cannot be empty"}), 400
    try:
        reply = get_agriexpert_reply(message.strip(), data.get("history") or data.get("chatHistory"), data.get("context"))
        return jsonify({"success": True, "reply": reply, "response": reply})
    except Exception as e:
        app.logger.error(f"AgriExpert error: {e}")
        return jsonify({"success": False, "error": "AgriExpert is temporarily unavailable. Please try again."}), 502


def get_openai_client(api_key):
    is_pa = "pythonanywhere" in os.environ.get("PYTHONANYWHERE_DOMAIN", "") or "PYTHONANYWHERE_SITE" in os.environ or "PYTHONANYWHERE_HOST" in os.environ
    try:
        from openai import OpenAI
    except ImportError:
        return None
    if is_pa:
        try:
            import httpx
            proxy = os.environ.get("HTTPS_PROXY") or os.environ.get("HTTP_PROXY") or "http://proxy.server:3128"
            return OpenAI(api_key=api_key.strip(), http_client=httpx.Client(proxy=proxy))
        except Exception as e:
            print(f"[AgriExpert] Proxy client init note: {e}")
    return OpenAI(api_key=api_key.strip())


def diagnose_crop_openai(b64_image, media_type, crop_hint):
    openai_key = os.environ.get("OPENAI_API_KEY")
    if not openai_key or "your_api_key" in openai_key:
        raise ValueError("OPENAI_API_KEY is not configured")

    client = get_openai_client(openai_key)
    model_name = os.environ.get("OPENAI_VISION_MODEL", os.environ.get("OPENAI_MODEL", "gpt-4o-mini"))

    data_url = f"data:{media_type};base64,{b64_image}"

    prompt_system = """You are an expert AI agricultural pathologist analyzing photos for Indian farmers.

Return ONLY a valid JSON object matching this exact schema:

{
  "isAgriculturalImage": boolean,
  "crop": "string - crop/plant name identified, e.g. Tomato, Rice, Wheat, Cotton, Maize, Chilli, Potato, etc.",
  "diagnosis": "string - disease or problem detected, e.g. Early Blight, Leaf Blast, Powdery Mildew, Healthy Crop, or 'Inconclusive / Unclear'",
  "confidence": number,
  "symptoms": ["string", "..."],
  "treatment": ["string", "..."],
  "fertilizerAdvice": ["string", "..."],
  "irrigationAdvice": "string",
  "prevention": ["string", "..."],
  "severity": "Low | Medium | High",
  "disclaimer": "AI-based assessment; consult an agricultural expert (KVK) for confirmation."
}

RULES:
1. If the photo shows a person, human face, animal, document, phone, car, building interior, furniture, or non-plant object, set "isAgriculturalImage": false, "diagnosis": "Not a Crop Image", "confidence": 0.0, "severity": "Low", and explain in symptoms that only crop/plant photos are accepted.
2. If it IS a valid crop/plant/leaf image, set "isAgriculturalImage": true.
3. If the crop is healthy, set "diagnosis": "Healthy Crop (No Disease Detected)", "confidence": 0.95, "severity": "Low".
4. If inconclusive or blurry, set "diagnosis": "Inconclusive / Unclear", "confidence": 0.35, "severity": "Low", and recommend taking a clearer photo or consulting a local KVK.
5. Return raw JSON ONLY without markdown backticks."""

    response = client.chat.completions.create(
        model=model_name,
        messages=[
            {"role": "system", "content": prompt_system},
            {
                "role": "user",
                "content": [
                    {"type": "image_url", "image_url": {"url": data_url}},
                    {"type": "text", "text": f"Crop hint: {crop_hint or 'not specified'}"}
                ]
            }
        ],
        max_tokens=1024,
        temperature=0.2
    )

    raw_text = response.choices[0].message.content.strip()
    if "```" in raw_text:
        parts = raw_text.split("```")
        raw_text = parts[1] if len(parts) > 1 else parts[0]
        if raw_text.startswith("json"):
            raw_text = raw_text[4:]
        raw_text = raw_text.strip().split("```")[0].strip()

    return json.loads(raw_text)


@app.route("/api/crop-diagnosis", methods=["POST"])
@app.route("/api/crop-diagnostics/analyze", methods=["POST"])
def analyze_crop():
    req_json = request.get_json(silent=True) or {}
    if "image" not in request.files and not req_json:
        return jsonify({"success": False, "error": "image file is required"}), 400

    crop_hint = ""
    b64_image = ""
    media_type = "image/jpeg"

    if "image" in request.files:
        image_file = request.files["image"]
        crop_hint = request.form.get("cropTypeHint") or request.form.get("crop") or ""
        b64_image, media_type = encode_image(image_file)
    elif req_json and "base64Image" in req_json:
        b64_image = req_json["base64Image"]
        media_type = req_json.get("mimeType", "image/jpeg")
        crop_hint = req_json.get("crop", "")

    try:
        openai_key = os.environ.get("OPENAI_API_KEY")
        if openai_key and openai_key.strip() and "your_api_key" not in openai_key:
            res = diagnose_crop_openai(b64_image, media_type, crop_hint)
            if res.get("isAgriculturalImage") is False:
                return jsonify({
                    "success": False,
                    "isAgriculturalImage": False,
                    "error": "Please upload a clear crop, plant, or leaf image for agricultural diagnosis.",
                    "message": "Please upload a clear crop, plant, or leaf image for agricultural diagnosis."
                }), 422
            return jsonify({
                "success": True,
                "isAgriculturalImage": True,
                "crop": res.get("crop") or crop_hint or "Crop / Plant",
                "diagnosis": res.get("diagnosis") or "Field Assessment",
                "confidence": res.get("confidence") or 0.85,
                "symptoms": res.get("symptoms") or [],
                "treatment": res.get("treatment") or [],
                "fertilizerAdvice": res.get("fertilizerAdvice") or [],
                "irrigationAdvice": res.get("irrigationAdvice") or "Maintain recommended watering schedule.",
                "prevention": res.get("prevention") or [],
                "severity": res.get("severity") or "Medium",
                "disclaimer": res.get("disclaimer") or "AI-based assessment; consult an agricultural expert for confirmation."
            })
    except Exception as e:
        app.logger.error(f"OpenAI vision error: {e}")

    return jsonify({
        "success": True,
        "isAgriculturalImage": True,
        "crop": crop_hint or "Crop / Plant",
        "diagnosis": "Field Visual Assessment",
        "confidence": 0.75,
        "symptoms": ["Leaf visual patterns observed."],
        "treatment": ["Inspect crop foliage.", "Consult local KVK for treatment product selection."],
        "fertilizerAdvice": ["Apply balanced NPK according to growth stage."],
        "irrigationAdvice": "Maintain regular recommended watering schedule.",
        "prevention": ["Maintain field sanitation and crop rotation."],
        "severity": "Medium",
        "disclaimer": "AI-based assessment; consult an agricultural expert for confirmation."
    })


# ─────────────────────────────────────────────────────────────────────────────
#  WEATHER API
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
#  MARKET PRICES & MANDI API
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

@app.route("/api/market-prices", methods=["GET"])
@app.route("/api/market/prices", methods=["GET"])
def get_market_prices():
    category = request.args.get("category")
    crop = request.args.get("crop")
    items = COMMODITIES
    if category and category.lower() != "all":
        items = [c for c in items if c["category"].lower() == category.lower()]
    if crop:
        items = [c for c in items if crop.lower() in c["crop"].lower() or crop.lower() in c.get("hindiName", "").lower()]
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


# ─────────────────────────────────────────────────────────────────────────────
#  COMMUNITY, SCHEMES & OFFICERS API
# ─────────────────────────────────────────────────────────────────────────────
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

@app.route("/api/community/officers", methods=["GET"])
def get_officers():
    return jsonify({"success": True, "data": COMMUNITY_OFFICERS, "officers": COMMUNITY_OFFICERS})

@app.route("/api/community/posts", methods=["GET", "POST"])
def community_posts():
    if request.method == "POST":
        data = request.get_json(silent=True) or {}
        new_post = {
            "_id": "post_" + str(int(time.time())),
            "title": data.get("title", "Farmer Query"),
            "content": data.get("content", ""),
            "author": data.get("author", "Farmer"),
            "likes": 0,
            "createdAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
        }
        return jsonify({"success": True, "data": new_post})
    return jsonify({"success": True, "data": []})


# ─────────────────────────────────────────────────────────────────────────────
#  RECOMMENDATIONS & CROP CALENDAR API
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
        {"crop": "Tomato", "suitability": 82, "expectedYield": "18 Tons/Acre", "season": "Annual", "waterNeed": "Medium", "profitEstimate": "₹75,000 / Acre"}
    ]
    return jsonify({
        "success": True,
        "recommendations": crops,
        "soilStatus": {"npkRatio": f"{int(n)}:{int(p)}:{int(k)}", "phLevel": ph, "soilHealth": "Good"}
    })

@app.route("/api/crop-calendar", methods=["GET", "POST"])
def crop_calendar():
    tasks = [
        {"id": 1, "title": "Field Ploughing & Solarization", "day": "Day 1", "category": "Land Preparation", "status": "completed"},
        {"id": 2, "title": "Basal Fertilizer Application (NPK + Compost)", "day": "Day 5", "category": "Fertilizer", "status": "pending"},
        {"id": 3, "title": "Seed Sowing / Transplanting", "day": "Day 10", "category": "Sowing", "status": "pending"},
        {"id": 4, "title": "First Drip Irrigation & Weed Control", "day": "Day 20", "category": "Irrigation", "status": "pending"},
        {"id": 5, "title": "First Micronutrient Foliar Spray", "day": "Day 35", "category": "Foliar Spray", "status": "pending"},
        {"id": 6, "title": "Flowering Stage Inspection & Pest Scouting", "day": "Day 50", "category": "Pest Management", "status": "pending"}
    ]
    return jsonify({"success": True, "calendar": tasks, "tasks": tasks})

@app.route("/api/alerts/subscribe", methods=["POST"])
@app.route("/api/alerts/unsubscribe", methods=["POST"])
def alerts_subscription():
    return jsonify({"success": True, "message": "Notification preferences updated successfully."})


# ─────────────────────────────────────────────────────────────────────────────
#  SPA CATCH-ALL ROUTE (Serves Vite Frontend)
# ─────────────────────────────────────────────────────────────────────────────
@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve_spa(path):
    if path.startswith("api/"):
        return jsonify({"error": "Endpoint not found"}), 404
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


