import os
import shutil
import json
import pickle
import pandas as pd
from datetime import datetime, timedelta
from typing import Optional, List
from fastapi import FastAPI, Depends, HTTPException, File, UploadFile, Form, status, Header
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session
import requests
from twilio.rest import Client

# Load .env file if present (local development)
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

from database import init_db, get_db, DiseaseReport, CropLog, WeatherCache, User, PushSubscription, EmergencyAlert, CommunityOfficer, CommunityWebinar, GovernmentScheme, seed_db
from ml_model import predict_image, get_gemini_api_key, run_crop_diagnose_cv, run_leaf_disease_diagnose, run_crop_disease_detect, run_plant_identification
from use_dataset_for_disease_detection import register_dataset_routes, get_dataset_stats, load_dataset_classes
from pydantic import BaseModel
from fastapi.responses import FileResponse

# Global crop recommendation model data
crop_model_data = None

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
# Using /py_uploads (not /uploads) to distinguish from Node backend's /uploads path
app.mount("/py_uploads", StaticFiles(directory=UPLOAD_DIR), name="py_uploads")

# Initialize database tables on startup
@app.on_event("startup")
def startup_event():
    global crop_model_data
    init_db()
    seed_db()
    print("[Server] Database initialized successfully and seeded.")
    
    # Register dataset routes for PlantVillage disease data
    register_dataset_routes(app)
    
    # Log dataset status on startup
    try:
        ds_stats = get_dataset_stats()
        if ds_stats["dataset_found"]:
            print(f"[Server] PlantVillage dataset loaded: {ds_stats['total_classes']} classes, {ds_stats['total_images']} images.")
        else:
            print("[Server] PlantVillage dataset not found. Using API + static fallback for disease detection.")
    except Exception as e:
        print(f"[Server] Dataset check error: {e}")
    
    # Train or load crop recommendation model
    model_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "crop_recommendation_model.pkl")
    if not os.path.exists(model_path):
        print("[Server] Crop recommendation model missing. Training now...")
        try:
            from train_crop_model import train_crop_model
            train_crop_model()
        except Exception as e:
            print(f"[Server] Failed to auto-train crop model: {e}")
            
    if os.path.exists(model_path):
        try:
            with open(model_path, "rb") as f:
                crop_model_data = pickle.load(f)
            print("[Server] Crop recommendation model loaded successfully.")
        except Exception as e:
            print(f"[Server] Failed to load crop model: {e}")
            
    # Initialize RAG system
    try:
        from rag_service import init_rag_system
        init_rag_system()
        print("[Server] RAG knowledge base indexed successfully.")
    except Exception as rag_err:
        print(f"[Server] Failed to initialize RAG system: {rag_err}")


@app.get("/api/health")
def health_check():
    return {"status": "healthy", "service": "Smart Kisan Python API", "timestamp": datetime.utcnow().isoformat()}


# --- Dataset-aware Disease Analysis endpoint ---
@app.post("/api/dataset/analyze-from-dataset")
async def analyze_with_dataset_context(
    image: UploadFile = File(...),
    crop: Optional[str] = Form(None),
    x_gemini_key: Optional[str] = Header(None),
    db: Session = Depends(get_db)
):
    """
    Analyze a crop disease image using the local PlantVillage dataset for context.
    Falls back to Gemini Vision → HuggingFace → Dataset-backed static advice.
    """
    if not image.content_type.startswith("image/"):
        from fastapi import HTTPException
        raise HTTPException(status_code=400, detail="File must be an image.")

    # Save file
    file_ext = os.path.splitext(image.filename)[1]
    unique_filename = f"leaf_{int(datetime.utcnow().timestamp())}_{image.filename}"
    file_path = os.path.join(UPLOAD_DIR, unique_filename)
    with open(file_path, "wb") as buffer:
        import shutil
        shutil.copyfileobj(image.file, buffer)
    image_url = f"/py_uploads/{unique_filename}"

    with open(file_path, "rb") as f:
        img_bytes = f.read()

    # Run prediction using ml_model pipeline
    prediction = predict_image(img_bytes, crop_hint=crop, filename=image.filename, custom_key=x_gemini_key)

    # Save to DB
    report = DiseaseReport(
        user_id=None,
        crop=prediction["crop"],
        disease=prediction["disease"],
        severity=prediction["severity"],
        confidence=prediction["confidence"],
        advice=prediction["advice"],
        image_url=image_url,
        region="Dataset Analysis"
    )
    db.add(report)
    db.commit()
    db.refresh(report)

    # Load dataset classes to enrich response
    dataset_classes = load_dataset_classes()

    return {
        "success": True,
        "report_id": report.id,
        "crop": report.crop,
        "disease": report.disease,
        "severity": report.severity,
        "confidence": report.confidence,
        "advice": report.advice,
        "imageUrl": report.image_url,
        "ai_model": prediction.get("model", "ML Pipeline"),
        "gemini_powered": prediction.get("gemini_powered", False),
        "dataset_classes_available": len(dataset_classes),
        "dataset_integrated": True
    }

# --- MODULE A: AI Disease Diagnosis (Computer Vision) ---
@app.post("/api/diagnose", status_code=status.HTTP_201_CREATED)
async def diagnose_crop_disease(
    image: UploadFile = File(...),
    crop: Optional[str] = Form(None),
    region: Optional[str] = Form(None),
    user_id: Optional[int] = Form(None),
    x_gemini_key: Optional[str] = Header(None),
    db: Session = Depends(get_db)
):
    """
    Accepts crop/livestock symptom image, runs ML pipeline inference,
    saves the diagnostic record to database, and returns all structured remedies.
    Supported formats: JPG, JPEG, PNG, WEBP
    """
    if not image.content_type.startswith("image/"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File uploaded is not a valid image format. Please upload JPG, JPEG, PNG, or WEBP."
        )

    # 1. Save uploaded image to static uploads folder
    file_ext = os.path.splitext(image.filename)[1].lower() or ".jpg"
    unique_filename = f"crop_{int(datetime.utcnow().timestamp())}_{image.filename}"
    file_path = os.path.join(UPLOAD_DIR, unique_filename)
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(image.file, buffer)
        
    image_url = f"/py_uploads/{unique_filename}"

    # Auto-resize to max 1024x1024 for consistent model input
    try:
        from PIL import Image as PILImage
        with PILImage.open(file_path) as pil_img:
            pil_img = pil_img.convert("RGB")
            pil_img.thumbnail((1024, 1024), PILImage.LANCZOS)
            pil_img.save(file_path, format="JPEG", quality=92)
    except Exception as resize_err:
        print(f"[Diagnose] Image resize skipped: {resize_err}")

    # Read image bytes for model prediction
    with open(file_path, "rb") as f:
         img_bytes = f.read()

    # 2. Run ML pipeline (Gemini → HuggingFace → Static)
    prediction = predict_image(img_bytes, crop_hint=crop, filename=image.filename, custom_key=x_gemini_key)

    # 3. Save report to Relational Database
    report = DiseaseReport(
        user_id=user_id,
        crop=prediction.get("crop", "Unknown"),
        disease=prediction.get("disease", "Unknown"),
        severity=prediction.get("severity", "medium"),
        confidence=prediction.get("confidence", 0.0),
        advice=prediction.get("advice", ""),
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
        "plant_name": prediction.get("plant_name", report.crop),
        "disease": report.disease,
        "health_status": prediction.get("health_status", "Unknown"),
        "severity": report.severity,
        "confidence": report.confidence,
        "growth_stage": prediction.get("growth_stage", "Unknown"),
        "symptoms": prediction.get("symptoms", ""),
        "causes": prediction.get("causes", ""),
        "organic_treatment": prediction.get("organic_treatment", ""),
        "chemical_treatment": prediction.get("chemical_treatment", ""),
        "prevention": prediction.get("prevention", ""),
        "fertilizer_advice": prediction.get("fertilizer_advice", ""),
        "irrigation_advice": prediction.get("irrigation_advice", ""),
        "advice": report.advice,
        "imageUrl": report.image_url,
        "createdAt": report.created_at.isoformat(),
        "gemini_powered": prediction.get("gemini_powered", False),
        "ai_model": prediction.get("model", "Static Fallback"),
        "image_analysis": prediction.get("image_analysis", "")
    }


# --- MODULE A2: Crop Diagnostics CV ---
@app.post("/api/crop-diagnose", status_code=status.HTTP_201_CREATED)
async def diagnose_crop_cv_endpoint(
    image: UploadFile = File(...),
    crop: Optional[str] = Form(None),
    x_gemini_key: Optional[str] = Header(None),
    db: Session = Depends(get_db)
):
    """
    Examines crop image. Accepts ONLY crop/plant images.
    If NOT a crop -> returns success: False, error: "Invalid image. Please upload a crop image or plant."
    """
    if not image.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File uploaded is not a valid image format.")

    unique_filename = f"crop_diag_{int(datetime.utcnow().timestamp())}_{image.filename}"
    file_path = os.path.join(UPLOAD_DIR, unique_filename)
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(image.file, buffer)

    # Preprocess & Resize image
    try:
        from PIL import Image as PILImage
        with PILImage.open(file_path) as pil_img:
            pil_img = pil_img.convert("RGB")
            pil_img.thumbnail((800, 800), PILImage.LANCZOS)
            pil_img.save(file_path, format="JPEG", quality=90)
    except Exception as e:
        print(f"[Resize] Error: {e}")

    image_url = f"/py_uploads/{unique_filename}"

    with open(file_path, "rb") as f:
        img_bytes = f.read()

    prediction = run_crop_diagnose_cv(img_bytes, crop_hint=crop, custom_key=x_gemini_key)
    
    # Save search log if valid
    if prediction.get("success", True):
        report = DiseaseReport(
            user_id=None,
            crop=prediction.get("crop_name", "Unknown"),
            disease=prediction.get("problems_detected", "Healthy"),
            severity="medium",
            confidence=prediction.get("confidence", 0.95),
            advice=prediction.get("recommendations", ""),
            image_url=image_url,
            region="Crop Diagnostics (CV)"
        )
        db.add(report)
        db.commit()
        db.refresh(report)
        prediction["report_id"] = report.id
        prediction["imageUrl"] = image_url

    return prediction


# --- MODULE A3: Leaf Disease Diagnosis ---
@app.post("/api/leaf-diagnose", status_code=status.HTTP_201_CREATED)
async def diagnose_leaf_disease(
    image: UploadFile = File(...),
    crop: Optional[str] = Form(None),
    x_gemini_key: Optional[str] = Header(None),
    db: Session = Depends(get_db)
):
    """
    Leaf-specific disease diagnosis endpoint.
    If NOT a leaf -> returns success: False, error: "Invalid image. Please upload a crop image of a plant leaf."
    """
    if not image.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File uploaded is not a valid image format.")

    unique_filename = f"leaf_diag_{int(datetime.utcnow().timestamp())}_{image.filename}"
    file_path = os.path.join(UPLOAD_DIR, unique_filename)
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(image.file, buffer)

    # Preprocess & Resize image
    try:
        from PIL import Image as PILImage
        with PILImage.open(file_path) as pil_img:
            pil_img = pil_img.convert("RGB")
            pil_img.thumbnail((800, 800), PILImage.LANCZOS)
            pil_img.save(file_path, format="JPEG", quality=90)
    except Exception as e:
        print(f"[Resize] Error: {e}")

    image_url = f"/py_uploads/{unique_filename}"

    with open(file_path, "rb") as f:
        img_bytes = f.read()

    prediction = run_leaf_disease_diagnose(img_bytes, crop_hint=crop, custom_key=x_gemini_key)

    # Save search log if valid
    if prediction.get("success", True):
        report = DiseaseReport(
            user_id=None,
            crop=prediction.get("plant_name", "Unknown"),
            disease=prediction.get("disease_name", "Healthy"),
            severity="medium",
            confidence=prediction.get("confidence", 0.95),
            advice=prediction.get("treatment", ""),
            image_url=image_url,
            region="Leaf Diagnostics"
        )
        db.add(report)
        db.commit()
        db.refresh(report)
        prediction["report_id"] = report.id
        prediction["imageUrl"] = image_url

    return prediction


# --- MODULE A4: Crop Disease Detection ---
@app.post("/api/crop-disease-detect", status_code=status.HTTP_201_CREATED)
async def detect_crop_disease_endpoint(
    image: UploadFile = File(...),
    crop: Optional[str] = Form(None),
    x_gemini_key: Optional[str] = Header(None),
    db: Session = Depends(get_db)
):
    """
    Crop disease detection endpoint.
    If NOT a crop -> returns success: False, error: "Invalid image. Please upload a valid crop image."
    """
    if not image.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File uploaded is not a valid image format.")

    unique_filename = f"crop_detect_{int(datetime.utcnow().timestamp())}_{image.filename}"
    file_path = os.path.join(UPLOAD_DIR, unique_filename)
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(image.file, buffer)

    # Preprocess & Resize image
    try:
        from PIL import Image as PILImage
        with PILImage.open(file_path) as pil_img:
            pil_img = pil_img.convert("RGB")
            pil_img.thumbnail((800, 800), PILImage.LANCZOS)
            pil_img.save(file_path, format="JPEG", quality=90)
    except Exception as e:
        print(f"[Resize] Error: {e}")

    image_url = f"/py_uploads/{unique_filename}"

    with open(file_path, "rb") as f:
        img_bytes = f.read()

    prediction = run_crop_disease_detect(img_bytes, crop_hint=crop, custom_key=x_gemini_key)

    # Save search log if valid
    if prediction.get("success", True):
        report = DiseaseReport(
            user_id=None,
            crop=prediction.get("crop", "Unknown"),
            disease=prediction.get("disease", "Healthy"),
            severity=prediction.get("severity", "medium"),
            confidence=prediction.get("confidence", 0.95),
            advice=prediction.get("organic_treatment", ""),
            image_url=image_url,
            region="Crop Disease Detection"
        )
        db.add(report)
        db.commit()
        db.refresh(report)
        prediction["report_id"] = report.id
        prediction["imageUrl"] = image_url

    return prediction


# --- Pydantic Schemas for Agricultural Chat & PDF Reports ---
class ChatMessage(BaseModel):
    sender: str
    text: str

class ChatRequest(BaseModel):
    message: str
    chatHistory: Optional[List[ChatMessage]] = None
    language: Optional[str] = "en"

class PDFReportRequest(BaseModel):
    crop_name: Optional[str] = None
    crop: Optional[str] = None
    disease_name: Optional[str] = None
    disease: Optional[str] = None
    severity: Optional[str] = "medium"
    confidence: Optional[float] = 0.95
    problems_detected: Optional[str] = None
    disease_description: Optional[str] = None
    symptoms: Optional[str] = None
    causes: Optional[str] = None
    organic_treatment: Optional[str] = None
    chemical_treatment: Optional[str] = None
    treatment: Optional[str] = None
    prevention_methods: Optional[str] = None
    prevention: Optional[str] = None
    fertilizer_recommendation: Optional[str] = None
    suggested_fertilizers: Optional[str] = None
    fertilizer_advice: Optional[str] = None
    irrigation_advice: Optional[str] = None
    region: Optional[str] = "India"


# --- Plant Identification Endpoint ---
@app.post("/api/plant-identify", status_code=status.HTTP_201_CREATED)
async def identify_plant_endpoint(
    image: UploadFile = File(...),
    x_gemini_key: Optional[str] = Header(None)
):
    """
    Accepts plant photo, validates it is a plant, and runs Gemini Vision Identification.
    """
    if not image.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File uploaded is not a valid image format.")
    img_bytes = await image.read()
    result = run_plant_identification(img_bytes, x_gemini_key)
    return result


# --- Strictly Agricultural RAG Chat Endpoint ---
@app.post("/api/chat")
async def agricultural_chat_endpoint(
    req: ChatRequest,
    x_gemini_key: Optional[str] = Header(None)
):
    """
    RAG-driven chatbot endpoint. Restricts answers to agriculture.
    """
    query = req.message
    lang = req.language or "en"
    history = req.chatHistory or []
    api_key = (x_gemini_key or "").strip() or get_gemini_api_key()

    if not api_key:
        raise HTTPException(status_code=400, detail="Gemini API Key is not configured. Set GEMINI_API_KEY in backend environment.")

    # 1. Strict Agriculture Topic Guardrail check via Gemini
    check_prompt = f"""Analyze if this user query is related to agriculture, farming, crops, plant/leaf diseases, pests, soil, fertilizers, irrigation, agricultural weather, livestock, poultry, dairy, fisheries, horticulture, agricultural government schemes, or farm equipment.
    Return ONLY this JSON:
    {{
      "is_agriculture": true|false
    }}
    Query: "{query}" """

    from ml_model import query_gemini_text
    check_res = query_gemini_text(check_prompt, api_key)
    
    if not check_res or not check_res.get("is_agriculture", False):
        return {
            "success": False,
            "response": "I am Kisan AI. I can only answer agriculture and farming-related questions.",
            "source": "guardrail"
        }

    # 2. Vector search matched documents (RAG)
    from rag_service import search_knowledge_base
    matched_docs = search_knowledge_base(query, k=3, api_key=api_key)
    context_str = ""
    if matched_docs:
        context_str = "\n\n".join([f"Source: {doc['source']}\nTitle: {doc['title']}\nContent: {doc['text']}" for doc in matched_docs])

    # 3. Formulate RAG context prompt
    system_instruction = f"""You are SmartKisanBot, a highly specialized B2B Agricultural AI Assistant for Indian farmers.
    You can ONLY answer agriculture and farming-related questions. If a question is not related to agriculture, politely refuse.
    Reply ONLY in the requested language (English, Hindi, or Marathi). Currently the language request is: {lang.upper()}.
    Always format your response using clean, simple Markdown with bullet points or numbered lists. Do not write large paragraphs.
    Use the following verified documents to guide your response (if relevant):
    {context_str}"""

    # Assemble chat history
    contents = []
    for msg in history[-6:]:
        contents.append({
            "role": "user" if msg.sender == "user" else "model",
            "parts": [{"text": msg.text}]
        })
    contents.append({
        "role": "user",
        "parts": [{"text": query}]
    })

    try:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={api_key}"
        payload = {
            "contents": contents,
            "systemInstruction": {
                "parts": [{"text": system_instruction}]
            },
            "generationConfig": {
                "temperature": 0.2,
                "maxOutputTokens": 1200
            }
        }
        resp = requests.post(url, json=payload, timeout=25)
        if resp.status_code == 200:
            data = resp.json()
            response_text = data.get("candidates", [{}])[0].get("content", {}).get("parts", [])[0].get("text", "").strip()
            return {
                "success": True,
                "response": response_text,
                "source": "gemini",
                "rag_sources": [d["title"] for d in matched_docs]
            }
        else:
            raise Exception(f"Gemini API status code {resp.status_code}")
    except Exception as err:
        print(f"[FastAPI Chat Error] {err}")
        if matched_docs:
            doc = matched_docs[0]
            fallback_text = f"Here is some relevant information from our database:\n\n* **{doc['title']}** ({doc['source']}): {doc['text']}"
            return {
                "success": True,
                "response": fallback_text,
                "source": "database_fallback",
                "rag_sources": [d["title"] for d in matched_docs]
            }
        return {
            "success": False,
            "response": "I am Kisan AI. I can only answer agriculture and farming-related questions.",
            "source": "guardrail"
        }


# --- PDF Report Download Endpoint ---
@app.post("/api/generate-pdf")
async def generate_pdf_endpoint(req: PDFReportRequest):
    """
    Accepts full diagnosis JSON, creates a ReportLab PDF, and streams it back.
    """
    from pdf_generator import generate_diagnostic_pdf
    pdf_path = generate_diagnostic_pdf(req.dict())
    filename = os.path.basename(pdf_path)
    return FileResponse(
        pdf_path,
        media_type="application/pdf",
        filename=filename,
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


# --- Gemini API Status Endpoint ---
@app.get("/api/gemini-test")
def test_gemini_connection():
    """Check if Gemini API key is configured and reachable."""
    api_key = get_gemini_api_key()
    if not api_key:
        return {
            "status": "not_configured",
            "message": "GEMINI_API_KEY not found. Set it in your .env file or environment variables.",
            "gemini_enabled": False
        }
    # Quick ping to Gemini REST API
    try:
        url = f"https://generativelanguage.googleapis.com/v1beta/models?key={api_key}"
        res = requests.get(url, timeout=8)
        if res.status_code == 200:
            return {
                "status": "connected",
                "message": "Google Gemini API is active and responding.",
                "gemini_enabled": True,
                "model": "gemini-1.5-flash"
            }
        else:
            return {
                "status": "error",
                "message": f"Gemini API returned HTTP {res.status_code}. Check your API key.",
                "gemini_enabled": False
            }
    except Exception as e:
        return {
            "status": "unreachable",
            "message": f"Could not reach Gemini API: {str(e)}",
            "gemini_enabled": False
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

    # 3. Run Agronomic Recommendation Heuristics / ML Model
    season_lower = season.lower()
    soil_lower = soil_type.lower()
    
    # Estimate rainfall based on season
    if season_lower == "kharif":
        estimated_rainfall = 180.0
    elif season_lower == "rabi":
        estimated_rainfall = 60.0
    else: # zaid
        estimated_rainfall = 80.0
        
    CROP_DISPLAY_NAMES = {
        "rice": "Paddy (Rice)",
        "maize": "Maize (Corn)",
        "chickpea": "Chickpea",
        "kidneybeans": "Kidney Beans",
        "pigeonpeas": "Pigeon Peas",
        "mothbeans": "Moth Beans",
        "mungbean": "Mung Beans",
        "blackgram": "Black Gram",
        "lentil": "Lentils",
        "pomegranate": "Pomegranate",
        "banana": "Banana",
        "mango": "Mango",
        "grapes": "Grapes",
        "watermelon": "Watermelon",
        "muskmelon": "Muskmelon",
        "apple": "Apple",
        "orange": "Orange",
        "papaya": "Papaya",
        "coconut": "Coconut",
        "cotton": "Cotton",
        "jute": "Jute",
        "coffee": "Coffee"
    }

    matched_crops = []

    if crop_model_data is not None:
        model = crop_model_data["model"]
        features = crop_model_data["features"]
        classes = crop_model_data["classes"]
        crop_stats = crop_model_data["crop_stats"]
        
        # Build features dataframe
        X_new = pd.DataFrame([[n, p, k, temp, humidity, pH, estimated_rainfall]], columns=features)
        
        try:
            probabilities = model.predict_proba(X_new)[0]
            class_prob_map = dict(zip(classes, probabilities))
        except Exception as e:
            print(f"[Advisory ML Error] Prediction failed: {e}")
            class_prob_map = {}
            
        for crop_cls in classes:
            stats = crop_stats.get(crop_cls, {})
            disp_name = CROP_DISPLAY_NAMES.get(crop_cls, crop_cls.capitalize())
            
            # Start base compatibility score at 60
            score = 60
            
            # 1. Season bonus
            crop_season = stats.get("season", "whole year").lower()
            if crop_season == "whole year" or crop_season == season_lower:
                score += 15
            else:
                score -= 15
                
            # 2. Soil compatibility bonus
            crop_soils = stats.get("soils", ["loamy"])
            if soil_lower in crop_soils:
                score += 10
            else:
                score -= 5
                
            # 3. pH compatibility bonus
            avg_ph = stats.get("ph", 6.5)
            if abs(pH - avg_ph) <= 0.8:
                score += 10
            else:
                score -= min(15, int(abs(pH - avg_ph) * 10))
                
            # 4. NPK gap penalty
            t_n, t_p, t_k = stats.get("N", 50), stats.get("P", 40), stats.get("K", 40)
            dist = ((t_n - n)**2 + (t_p - p)**2 + (t_k - k)**2)**0.5
            score -= min(25, int(dist * 0.12))
            
            # 5. Model prediction bonus
            prob = class_prob_map.get(crop_cls, 0.0)
            score += int(prob * 20)
            
            final_score = max(10, min(98, score))
            
            matched_crops.append({
                "crop": disp_name,
                "score": final_score,
                "predictedYield": stats.get("yield", "1.5 - 2.0 tons/acre"),
                "estimatedProfit": f"₹{int(stats.get('profit', 50000) * land_size):,}/acre",
                "npkTarget": (int(t_n), int(t_p), int(t_k)),
                "raw_prob": prob
            })
    else:
        # Fallback to local heuristics if model failed to load
        print("[Advisory Fallback] Model data is not available, falling back to static profiles.")
        crop_profiles = [
            {"crop": "Wheat", "season": "rabi", "soils": ["loamy", "clay"], "ph_range": (6.0, 7.5), "npk": (100, 50, 40), "base_yield": "1.8 - 2.2 tons/acre", "profit": 72000},
            {"crop": "Paddy (Rice)", "season": "kharif", "soils": ["clay", "loamy"], "ph_range": (5.5, 6.5), "npk": (120, 60, 40), "base_yield": "2.1 - 2.5 tons/acre", "profit": 85000},
            {"crop": "Tomato", "season": "zaid", "soils": ["loamy", "sandy"], "ph_range": (6.0, 7.0), "npk": (80, 60, 60), "base_yield": "9.5 - 12.0 tons/acre", "profit": 110000},
            {"crop": "Maize", "season": "kharif", "soils": ["loamy", "black"], "ph_range": (5.8, 7.2), "npk": (110, 55, 40), "base_yield": "2.2 - 2.6 tons/acre", "profit": 60000},
        ]
        for profile in crop_profiles:
            score = 50
            if profile["season"] == season_lower:
                score += 25
            if soil_lower in profile["soils"]:
                score += 15
            min_ph, max_ph = profile["ph_range"]
            if min_ph <= pH <= max_ph:
                score += 10
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

from pydantic import BaseModel

class SubscriptionRequest(BaseModel):
    topic: str
    token: str

def send_fcm_push_notification(token: str, title: str, body: str, deep_link: str):
    """
    Simulates sending an asynchronous push notification via FCM with high priority
    overriding DND, including the deep linking target.
    """
    fcm_payload = {
        "message": {
            "token": token,
            "notification": {
                "title": title,
                "body": body
            },
            "android": {
                "priority": "HIGH",
                "notification": {
                    "channel_id": "outbreak_alerts_critical",
                    "sound": "default",
                    "importance": "HIGH", # Critical/High importance level
                }
            },
            "data": {
                "url": deep_link,
                "priority": "HIGH"
            }
        }
    }
    print("=" * 60)
    print("               [FIREBASE CLOUD MESSAGING BROADCAST]")
    print(f"FCM Token: {token}")
    print(f"Title: {title}")
    print(f"Body: {body}")
    print(f"Payload: {json.dumps(fcm_payload, indent=2)}")
    print("=" * 60)

@app.post("/api/alerts")
async def check_regional_outbreaks(
    region: str = Form(...),
    threshold: int = Form(3),
    send_sms: bool = Form(False),
    db: Session = Depends(get_db)
):
    """
    Checks recent disease report uploads inside the region. If reports exceed
    the threshold, it identifies an outbreak risk, sends FCM push notifications
    to subscribed topic segments, and dispatches SMS warnings.
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
    fcm_push_count = 0
    notifications_sent = []

    clean_region = region.strip().lower().replace(" ", "").replace("_", "")
    topic_name = f"outbreak_{clean_region}"

    for disease, count in disease_counts.items():
        if count >= threshold:
            active_outbreaks.append({
                "disease": disease,
                "reportsCount": count,
                "status": "CRITICAL"
            })
            
            alert_title = f"🚨 EMERGENCY OUTBREAK ALERT: {region.upper()}"
            alert_message = f"Critical level of '{disease}' detected in region '{region}' with {count} reports this week. Quarantine infected crops immediately & check offline diagnostics."
            
            # 1. FCM Push to Subscribed Topic Segment
            subscribers = db.query(PushSubscription).filter(PushSubscription.topic == topic_name).all()
            for sub in subscribers:
                send_fcm_push_notification(
                    token=sub.token,
                    title=alert_title,
                    body=alert_message,
                    deep_link="/dashboard"
                )
                fcm_push_count += 1
                notifications_sent.append({
                    "type": "FCM_PUSH",
                    "topic": topic_name,
                    "token": sub.token,
                    "title": alert_title,
                    "body": alert_message,
                    "deep_link": "/dashboard",
                    "simulated": True
                })
            
            # 2. Twilio SMS
            sms_message = f"🚨 SMART KISAN EMERGENCY ALERT! An outbreak of '{disease}' has been detected in region '{region}' with {count} reports filed this week. Please quarantine infected crops immediately. Consult nearest Agri-Expert."
            if send_sms:
                mock_contacts = ["+919876543210", "+918765432109"]
                
                try:
                    if "mock" not in TWILIO_ACCOUNT_SID and len(TWILIO_ACCOUNT_SID) > 10:
                        client = Client(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
                        for contact in mock_contacts:
                            client.messages.create(
                                body=sms_message,
                                from_=TWILIO_PHONE_NUMBER,
                                to=contact
                            )
                        sms_broadcast_count += len(mock_contacts)
                    else:
                        # Log mock SMS delivery
                        print("=" * 60)
                        print("               [MOCK TWILIO SMS BROADCAST]")
                        print(f"From: {TWILIO_PHONE_NUMBER}")
                        print(f"To Contacts: {', '.join(mock_contacts)}")
                        print(f"Message:\n{sms_message}")
                        print("=" * 60)
                        sms_broadcast_count += len(mock_contacts)
                        notifications_sent.append({
                            "type": "TWILIO_SMS",
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
        "fcmPushesDispatched": fcm_push_count,
        "smsDispatched": sms_broadcast_count,
        "broadcastDetails": notifications_sent if len(notifications_sent) > 0 else "Outbreak notifications completed."
    }

@app.post("/api/alerts/subscribe")
def subscribe_to_alerts(req: SubscriptionRequest, db: Session = Depends(get_db)):
    existing = db.query(PushSubscription).filter(
        PushSubscription.topic == req.topic,
        PushSubscription.token == req.token
    ).first()
    if not existing:
        sub = PushSubscription(topic=req.topic, token=req.token)
        db.add(sub)
        db.commit()
    return {"success": True, "message": f"Successfully subscribed to topic: {req.topic}"}

@app.post("/api/alerts/unsubscribe")
def unsubscribe_from_alerts(req: SubscriptionRequest, db: Session = Depends(get_db)):
    sub = db.query(PushSubscription).filter(
        PushSubscription.topic == req.topic,
        PushSubscription.token == req.token
    ).first()
    if sub:
        db.delete(sub)
        db.commit()
    return {"success": True, "message": f"Successfully unsubscribed from topic: {req.topic}"}

@app.post("/api/alerts/manual")
async def create_manual_alert(
    region: str = Form(...),
    disease: str = Form(...),
    message: str = Form(...),
    priority: str = Form("high"),
    db: Session = Depends(get_db)
):
    alert = EmergencyAlert(
        region=region,
        disease=disease,
        message=message,
        priority=priority
    )
    db.add(alert)
    db.commit()
    db.refresh(alert)

    # Clean the region name to generate the topic segment
    clean_region = region.strip().lower().replace(" ", "").replace("_", "")
    topic_name = f"outbreak_{clean_region}"

    # Query all subscribers to this topic
    subscribers = db.query(PushSubscription).filter(PushSubscription.topic == topic_name).all()
    
    alert_title = f"🚨 {priority.upper()} EMERGENCY OUTBREAK ALERT: {region.upper()}"
    
    # Broadcast FCM notification to all registered tokens
    fcm_count = 0
    for sub in subscribers:
        send_fcm_push_notification(
            token=sub.token,
            title=alert_title,
            body=message,
            deep_link="/dashboard"
        )
        fcm_count += 1

    return {
        "success": True,
        "alert_id": alert.id,
        "message": f"Successfully created manual alert and pushed to {fcm_count} subscriber(s) for topic: {topic_name}",
        "pushedCount": fcm_count
    }

@app.get("/api/alerts/active")
def get_active_alerts(db: Session = Depends(get_db)):
    alerts = db.query(EmergencyAlert).order_by(EmergencyAlert.created_at.desc()).all()
    return {
        "success": True,
        "alerts": [
            {
                "id": a.id,
                "region": a.region,
                "disease": a.disease,
                "message": a.message,
                "priority": a.priority,
                "createdAt": a.created_at.isoformat()
            }
            for a in alerts
        ]
    }

@app.delete("/api/alerts/active/{alert_id}")
def delete_active_alert(alert_id: int, db: Session = Depends(get_db)):
    alert = db.query(EmergencyAlert).filter(EmergencyAlert.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    db.delete(alert)
    db.commit()
    return {"success": True, "message": "Alert deleted successfully"}

# --- COMMUNITY & RESOURCE DIRECTORY API ---

@app.get("/api/community/officers")
def get_community_officers(db: Session = Depends(get_db)):
    officers = db.query(CommunityOfficer).all()
    return {
        "success": True,
        "officers": [
            {
                "id": o.id,
                "nameEn": o.name_en,
                "nameMr": o.name_mr,
                "roleEn": o.role_en,
                "roleMr": o.role_mr,
                "regionEn": o.region_en,
                "regionMr": o.region_mr,
                "contact": o.contact
            }
            for o in officers
        ]
    }

@app.post("/api/community/officers")
def add_community_officer(
    name_en: str = Form(...),
    name_mr: str = Form(...),
    role_en: str = Form(...),
    role_mr: str = Form(...),
    region_en: str = Form(...),
    region_mr: str = Form(...),
    contact: str = Form(...),
    db: Session = Depends(get_db)
):
    officer = CommunityOfficer(
        name_en=name_en,
        name_mr=name_mr,
        role_en=role_en,
        role_mr=role_mr,
        region_en=region_en,
        region_mr=region_mr,
        contact=contact
    )
    db.add(officer)
    db.commit()
    db.refresh(officer)
    return {"success": True, "message": "Officer added successfully"}

@app.delete("/api/community/officers/{officer_id}")
def delete_community_officer(officer_id: int, db: Session = Depends(get_db)):
    officer = db.query(CommunityOfficer).filter(CommunityOfficer.id == officer_id).first()
    if not officer:
        raise HTTPException(status_code=404, detail="Officer not found")
    db.delete(officer)
    db.commit()
    return {"success": True, "message": "Officer deleted successfully"}


@app.get("/api/community/webinars")
def get_community_webinars(db: Session = Depends(get_db)):
    webinars = db.query(CommunityWebinar).all()
    return {
        "success": True,
        "webinars": [
            {
                "id": w.id,
                "topicEn": w.topic_en,
                "topicMr": w.topic_mr,
                "dateEn": w.date_en,
                "dateMr": w.date_mr,
                "link": w.link
            }
            for w in webinars
        ]
    }

@app.post("/api/community/webinars")
def add_community_webinar(
    topic_en: str = Form(...),
    topic_mr: str = Form(...),
    date_en: str = Form(...),
    date_mr: str = Form(...),
    link: str = Form(...),
    db: Session = Depends(get_db)
):
    webinar = CommunityWebinar(
        topic_en=topic_en,
        topic_mr=topic_mr,
        date_en=date_en,
        date_mr=date_mr,
        link=link
    )
    db.add(webinar)
    db.commit()
    db.refresh(webinar)
    return {"success": True, "message": "Webinar added successfully"}

@app.delete("/api/community/webinars/{webinar_id}")
def delete_community_webinar(webinar_id: int, db: Session = Depends(get_db)):
    webinar = db.query(CommunityWebinar).filter(CommunityWebinar.id == webinar_id).first()
    if not webinar:
        raise HTTPException(status_code=404, detail="Webinar not found")
    db.delete(webinar)
    db.commit()
    return {"success": True, "message": "Webinar deleted successfully"}


@app.get("/api/community/schemes")
def get_community_schemes(db: Session = Depends(get_db)):
    schemes = db.query(GovernmentScheme).all()
    return {
        "success": True,
        "schemes": [
            {
                "id": s.id,
                "titleEn": s.title_en,
                "titleMr": s.title_mr,
                "descEn": s.desc_en,
                "descMr": s.desc_mr,
                "url": s.url
            }
            for s in schemes
        ]
    }

@app.post("/api/community/schemes")
def add_government_scheme(
    title_en: str = Form(...),
    title_mr: str = Form(...),
    desc_en: str = Form(...),
    desc_mr: str = Form(...),
    url: str = Form(...),
    db: Session = Depends(get_db)
):
    scheme = GovernmentScheme(
        title_en=title_en,
        title_mr=title_mr,
        desc_en=desc_en,
        desc_mr=desc_mr,
        url=url
    )
    db.add(scheme)
    db.commit()
    db.refresh(scheme)
    return {"success": True, "message": "Scheme added successfully"}

@app.delete("/api/community/schemes/{scheme_id}")
def delete_government_scheme(scheme_id: int, db: Session = Depends(get_db)):
    scheme = db.query(GovernmentScheme).filter(GovernmentScheme.id == scheme_id).first()
    if not scheme:
        raise HTTPException(status_code=404, detail="Scheme not found")
    db.delete(scheme)
    db.commit()
    return {"success": True, "message": "Scheme deleted successfully"}


