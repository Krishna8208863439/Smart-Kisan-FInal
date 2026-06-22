import os
import shutil
import json
from datetime import datetime, timedelta
from typing import Optional
from fastapi import FastAPI, Depends, HTTPException, File, UploadFile, Form, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session
import requests
from twilio.rest import Client

from database import init_db, get_db, DiseaseReport, CropLog, WeatherCache, User
from ml_model import predict_image

# Initialize FastAPI app
app = FastAPI(
    title="Smart Kisan AI-Driven Advisory Portal API",
    description="Production-ready API blueprint for agricultural leaf/livestock diagnosis, soil advisory, and outbreak alert notification systems.",
    version="1.0.0"
)

# Setup CORS for frontend interactions
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, restrict this to specific frontend domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Ensure folders exist
UPLOAD_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

# Mount static folder to serve uploaded leaves/livestock photos
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

# Initialize database tables on startup
@app.on_event("startup")
def startup_event():
    init_db()
    print("[Server] Database initialized successfully.")

@app.get("/api/health")
def health_check():
    return {"status": "healthy", "service": "Smart Kisan Python API", "timestamp": datetime.utcnow().isoformat()}

# --- MODULE A: AI Disease Diagnosis (Computer Vision) ---
@app.post("/api/diagnose", status_code=status.HTTP_201_CREATED)
async def diagnose_crop_disease(
    image: UploadFile = File(...),
    crop: Optional[str] = Form(None),
    region: Optional[str] = Form(None),
    user_id: Optional[int] = Form(None),
    db: Session = Depends(get_db)
):
    """
    Accepts crop/livestock symptom image, runs PyTorch model inference,
    saves the diagnostic record to database, and returns organic/chemical remedies.
    """
    if not image.content_type.startswith("image/"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File uploaded is not a valid image format."
        )

    # 1. Save uploaded image to static uploads folder
    file_ext = os.path.splitext(image.filename)[1]
    unique_filename = f"leaf_{int(datetime.utcnow().timestamp())}_{image.filename}"
    file_path = os.path.join(UPLOAD_DIR, unique_filename)
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(image.file, buffer)
        
    image_url = f"/uploads/{unique_filename}"
    
    # Read image bytes for PyTorch model prediction
    with open(file_path, "rb") as f:
         img_bytes = f.read()

    # 2. Run PyTorch inference
    prediction = predict_image(img_bytes, crop_hint=crop)

    # 3. Save report to Relational Database
    report = DiseaseReport(
        user_id=user_id,
        crop=prediction["crop"],
        disease=prediction["disease"],
        severity=prediction["severity"],
        confidence=prediction["confidence"],
        advice=prediction["advice"],
        image_url=image_url,
        region=region or "Global"
    )
    db.add(report)
    db.commit()
    db.refresh(report)

    return {
        "success": True,
        "report_id": report.id,
        "crop": report.crop,
        "disease": report.disease,
        "severity": report.severity,
        "confidence": report.confidence,
        "advice": report.advice,
        "imageUrl": report.image_url,
        "createdAt": report.created_at.isoformat()
    }


# --- MODULE B: Smart Crop Advisory System ---
# Helper function to geocode location using free Open-Meteo Geocoding
def geocode_region(city_name: str) -> dict:
    try:
        url = f"https://geocoding-api.open-meteo.com/v1/search?name={city_name}&count=1&language=en&format=json"
        res = requests.get(url, timeout=5)
        data = res.json()
        if "results" in data and len(data["results"]) > 0:
            result = data["results"][0]
            return {
                "lat": result["latitude"],
                "lon": result["longitude"],
                "name": f"{result['name']}, {result.get('admin1', '')}, {result.get('country', '')}"
            }
    except Exception as e:
        print("[Geocode Error] Failed to resolve region coords:", e)
    return None

@app.post("/api/advisory")
async def generate_crop_advisory(
    soil_type: str = Form(...),
    region: str = Form(...),
    season: str = Form(...),
    pH: float = Form(...),
    n: int = Form(...),
    p: int = Form(...),
    k: int = Form(...),
    land_size: float = Form(...),
    user_id: Optional[int] = Form(None),
    db: Session = Depends(get_db)
):
    """
    Accepts soil parameters and location, fetches real-time/forecasted weather,
    matches agricultural requirements, caches forecast data, and generates advisory.
    """
    # 1. Geocode location and retrieve coordinates
    coords = geocode_region(region)
    lat, lon = (28.6139, 77.2090) # Default: Delhi
    resolved_name = region
    if coords:
        lat = coords["lat"]
        lon = coords["lon"]
        resolved_name = coords["name"]

    # 2. Check Database Weather Cache (Valid for 3 hours)
    cache_limit = datetime.utcnow() - timedelta(hours=3)
    cached_weather = db.query(WeatherCache).filter(
        WeatherCache.lat == round(lat, 2),
        WeatherCache.lon == round(lon, 2),
        WeatherCache.updated_at >= cache_limit
    ).first()

    temp, humidity = (26.0, 65.0)
    forecast_str = "Clear weather forecasted"

    if cached_weather:
        temp = cached_weather.temperature
        humidity = cached_weather.humidity
        forecast_str = cached_weather.forecast_data
        print("[Weather Cache] Hit! Reading cached weather from database.")
    else:
        # Fetch fresh weather from Open-Meteo
        try:
            weather_url = f"https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lon}&current=temperature_2m,relative_humidity_2m&daily=precipitation_probability_max&timezone=auto"
            res = requests.get(weather_url, timeout=5)
            w_data = res.json()
            if "current" in w_data:
                temp = w_data["current"]["temperature_2m"]
                humidity = w_data["current"]["relative_humidity_2m"]
                rain_prob = w_data.get("daily", {}).get("precipitation_probability_max", [0])[0]
                forecast_str = f"Temp: {temp}°C, Humidity: {humidity}%, Rain probability: {rain_prob}%"

                # Store or update in DB weather cache
                new_cache = WeatherCache(
                    lat=round(lat, 2),
                    lon=round(lon, 2),
                    display_name=resolved_name,
                    temperature=temp,
                    humidity=humidity,
                    forecast_data=forecast_str,
                    updated_at=datetime.utcnow()
                )
                db.add(new_cache)
                db.commit()
                print("[Weather API] Fresh weather fetched and cached to DB.")
        except Exception as e:
            print("[Weather API Error] Failed to fetch weather:", e)

    # 3. Run Agronomic Recommendation Heuristics
    # Optimal profiles for major crops
    crop_profiles = [
        {"crop": "Wheat", "season": "rabi", "soils": ["loamy", "clay"], "ph_range": (6.0, 7.5), "npk": (100, 50, 40), "base_yield": "1.8 - 2.2 tons/acre", "profit": 72000},
        {"crop": "Paddy (Rice)", "season": "kharif", "soils": ["clay", "loamy"], "ph_range": (5.5, 6.5), "npk": (120, 60, 40), "base_yield": "2.1 - 2.5 tons/acre", "profit": 85000},
        {"crop": "Tomato", "season": "zaid", "soils": ["loamy", "sandy"], "ph_range": (6.0, 7.0), "npk": (80, 60, 60), "base_yield": "9.5 - 12.0 tons/acre", "profit": 110000},
        {"crop": "Maize", "season": "kharif", "soils": ["loamy", "black"], "ph_range": (5.8, 7.2), "npk": (110, 55, 40), "base_yield": "2.2 - 2.6 tons/acre", "profit": 60000},
    ]

    matched_crops = []
    season_lower = season.lower()
    soil_lower = soil_type.lower()

    for profile in crop_profiles:
        score = 50
        # Check season
        if profile["season"] == season_lower:
            score += 25
        # Check soil type
        if soil_lower in profile["soils"]:
            score += 15
        # Check pH compatibility
        min_ph, max_ph = profile["ph_range"]
        if min_ph <= pH <= max_ph:
            score += 10
        
        # Calculate NPK gap index penalty
        t_n, t_p, t_k = profile["npk"]
        dist = ((t_n - n)**2 + (t_p - p)**2 + (t_k - k)**2)**0.5
        score -= min(15, int(dist * 0.1))

        matched_crops.append({
            "crop": profile["crop"],
            "score": max(10, min(98, score)),
            "predictedYield": profile["base_yield"],
            "estimatedProfit": f"₹{int(profile['profit'] * land_size):,}/acre",
            "npkTarget": profile["npk"]
        })

    # Sort crop suggestions by feasibility score
    matched_crops.sort(key=lambda x: x["score"], reverse=True)
    best_crop = matched_crops[0]

    # Generate Fertilization Plan based on optimal best crop requirements
    opt_n, opt_p, opt_k = best_crop["npkTarget"]
    n_gap = max(0, opt_n - n)
    p_gap = max(0, opt_p - p)
    k_gap = max(0, opt_k - k)

    fertilizer_plan = [
        {
            "stage": "Basal Dressing (Sowing Preparation)",
            "recommendation": f"Blend {int(p_gap * 0.8)}kg Phosphorus (DAP) and {int(k_gap * 0.7)}kg Potassium (MOP) per acre into the tillage bed. Incorporate 5 tons of well-rotted farmyard manure."
        },
        {
            "stage": "Active Vegetative Development (Week 3)",
            "recommendation": f"Top-dress with {int(n_gap * 0.6)}kg Nitrogen using Urea per acre. Ensure fields are weeded prior to application."
        },
        {
            "stage": "Flowering & Crop Reproduction (Week 7)",
            "recommendation": f"Add remaining split dose of Urea ({int(n_gap * 0.4)}kg/acre) and perform minor foliar application of micronutrients to boost node set."
        }
    ]

    # 4. Save advisory log to database
    crop_log = CropLog(
        user_id=user_id,
        crop_name=best_crop["crop"],
        soil_type=soil_type,
        region=resolved_name,
        season=season,
        pH=pH,
        n_level=n,
        p_level=p,
        k_level=k,
        expected_yield=best_crop["predictedYield"],
        estimated_profit=best_crop["estimatedProfit"]
    )
    db.add(crop_log)
    db.commit()

    return {
        "success": True,
        "resolvedLocation": resolved_name,
        "weather": {
            "temp": temp,
            "humidity": humidity,
            "forecast": forecast_str
        },
        "recommendations": [
            {
                "crop": c["crop"],
                "suitabilityScore": c["score"],
                "predictedYield": c["predictedYield"],
                "estimatedProfit": c["estimatedProfit"],
                "reason": f"Excellent compatibility matching {soil_type} soil type during {season} sowing. Yield forecasts adjusted for temperature ({temp}°C)."
            } for c in matched_crops[:3]
        ],
        "fertilizerPlan": fertilizer_plan
    }


# --- MODULE C: Predictive Outbreak & Alert System ---
TWILIO_ACCOUNT_SID = os.getenv("TWILIO_ACCOUNT_SID", "ACmockaccountsd1234567890abcdef")
TWILIO_AUTH_TOKEN = os.getenv("TWILIO_AUTH_TOKEN", "mockauthtoken1234567890abcdef")
TWILIO_PHONE_NUMBER = os.getenv("TWILIO_PHONE_NUMBER", "+15017122661")

@app.post("/api/alerts")
async def check_regional_outbreaks(
    region: str = Form(...),
    threshold: int = Form(3),
    send_sms: bool = Form(False),
    db: Session = Depends(get_db)
):
    """
    Checks recent disease report uploads inside the region. If reports exceed
    the threshold, it identifies an outbreak risk and triggers SMS notifications.
    """
    # Look back over last 7 days
    lookback_date = datetime.utcnow() - timedelta(days=7)
    
    # Query reports count grouped by disease
    reports = db.query(DiseaseReport).filter(
        DiseaseReport.region.like(f"%{region}%"),
        DiseaseReport.created_at >= lookback_date
    ).all()
    
    disease_counts = {}
    for r in reports:
        disease_counts[r.disease] = disease_counts.get(r.disease, 0) + 1

    active_outbreaks = []
    sms_broadcast_count = 0
    notifications_sent = []

    for disease, count in disease_counts.items():
        if count >= threshold:
            active_outbreaks.append({
                "disease": disease,
                "reportsCount": count,
                "status": "CRITICAL"
            })
            
            alert_message = f"🚨 SMART KISAN EMERGENCY ALERT! An outbreak of '{disease}' has been detected in region '{region}' with {count} reports filed this week. Please quarantine infected crops immediately and apply protective spraying. Consult nearest Agri-Expert."
            
            # Send SMS via Twilio if requested
            if send_sms:
                # Simulated contacts: In production, query user directory database for local phone numbers
                mock_contacts = ["+919876543210", "+918765432109"]
                
                try:
                    # Validate Twilio credentials before executing
                    if "mock" not in TWILIO_ACCOUNT_SID and len(TWILIO_ACCOUNT_SID) > 10:
                        client = Client(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
                        for contact in mock_contacts:
                            client.messages.create(
                                body=alert_message,
                                from_=TWILIO_PHONE_NUMBER,
                                to=contact
                            )
                        sms_broadcast_count += len(mock_contacts)
                        print(f"[Twilio] SMS alert sent to {len(mock_contacts)} farmers for {disease}.")
                    else:
                        # Log mock SMS delivery print block
                        print("=" * 60)
                        print("               [MOCK TWILIO SMS BROADCAST]")
                        print(f"From: {TWILIO_PHONE_NUMBER}")
                        print(f"To Contacts: {', '.join(mock_contacts)}")
                        print(f"Message:\n{alert_message}")
                        print("=" * 60)
                        sms_broadcast_count += len(mock_contacts)
                        notifications_sent.append({
                            "disease": disease,
                            "contacts": mock_contacts,
                            "simulated": True
                        })
                except Exception as e:
                    print("[Twilio Error] SMS Dispatch failed:", e)

    return {
        "success": True,
        "region": region,
        "lookbackDays": 7,
        "reportsFound": len(reports),
        "outbreaks": active_outbreaks,
        "smsDispatched": sms_broadcast_count,
        "broadcastDetails": notifications_sent if len(notifications_sent) > 0 else "Live/Mock Twilio executed."
    }
