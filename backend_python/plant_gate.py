"""
plant_gate.py
─────────────
Stage 1 Validation Gate — Binary plant / not-plant classifier.

Two execution paths:
  A) LOCAL / Docker  (TORCH_AVAILABLE=True)
       → MobileNetV2 fine-tuned binary classifier loaded from
         mobilenetv2_plant_gate.pt (if present) OR pretrained ImageNet
         weights used with a plant-class scoring heuristic.
  B) PythonAnywhere   (TORCH_AVAILABLE=False — RAM limit)
       → Falls back to a strict Gemini Vision classification-only prompt
         that asks ONLY "plant or not" — never performs diagnosis.

Public API:
    validate_is_plant_image(image_bytes, confidence_threshold=0.75,
                            custom_key=None) -> dict
        Returns:
            {
                "is_valid": bool,
                "confidence": float,   # 0.0 – 1.0
                "label": "plant" | "not_plant",
                "mode": "mobilenetv2" | "gemini_fallback" | "bypass"
            }

    log_rejection(filename, endpoint, confidence, reason)
        Appends a JSONL line to rejection_log.jsonl for retraining.
"""

from __future__ import annotations

import io
import os
import json
import base64
import logging
import datetime
import traceback
from typing import Optional

logger = logging.getLogger("SmartKisanGate")

# ─────────────────────────────────────────────────────────────────────────────
#  PyTorch availability check  (mirrors ml_model.py logic exactly)
# ─────────────────────────────────────────────────────────────────────────────
_ON_PYTHONANYWHERE = bool(
    os.environ.get("PYTHONANYWHERE_SITE") or os.path.exists("/home/Krishna3114")
)

TORCH_AVAILABLE = False
if not _ON_PYTHONANYWHERE:
    try:
        import torch
        import torch.nn as nn
        from torchvision import models, transforms
        from PIL import Image as _PILImage
        TORCH_AVAILABLE = True
    except ImportError:
        pass

# ─────────────────────────────────────────────────────────────────────────────
#  ImageNet synset words used to score pretrained MobileNetV2 outputs
# ─────────────────────────────────────────────────────────────────────────────
_PLANT_SYNSET_WORDS = {
    "plant", "leaf", "flower", "tree", "vegetable", "fruit", "crop",
    "grass", "herb", "shrub", "fern", "moss", "stem", "blossom",
    "tomato", "potato", "pepper", "banana", "apple", "strawberry",
    "corn", "maize", "wheat", "rice", "sugarcane", "cotton",
    "soybean", "mango", "broccoli", "cauliflower", "cabbage", "spinach",
    "lettuce", "onion", "garlic", "ginger", "chili", "okra",
    "eggplant", "brinjal", "groundnut", "peanut", "mustard", "sunflower",
    "agriculture", "farm", "garden", "field", "nursery", "foliage",
    "seed", "seedling", "blight", "rust", "fungus", "mold",
}

_REJECT_SYNSET_WORDS = {
    "person", "man", "woman", "girl", "boy", "face", "people", "crowd",
    "dog", "cat", "bird", "animal", "horse", "sheep", "elephant",
    "car", "truck", "bus", "motorcycle", "bicycle", "vehicle",
    "building", "house", "church", "skyscraper", "tower",
    "laptop", "phone", "mobile", "computer", "keyboard", "monitor",
    "book", "document", "paper", "currency", "banknote",
    "furniture", "chair", "table", "sofa", "bed",
    "cartoon", "drawing", "painting", "screenshot",
}

_GATE_WEIGHTS_PATH = os.path.join(
    os.path.dirname(os.path.abspath(__file__)),
    "mobilenetv2_plant_gate.pt"
)

# ─────────────────────────────────────────────────────────────────────────────
#  Singleton model cache
# ─────────────────────────────────────────────────────────────────────────────
_GATE_MODEL = None
_GATE_TRANSFORM = None


def _load_gate_model():
    """Load or build the gate MobileNetV2 model (singleton)."""
    global _GATE_MODEL, _GATE_TRANSFORM
    if _GATE_MODEL is not None:
        return _GATE_MODEL, _GATE_TRANSFORM

    if not TORCH_AVAILABLE:
        return None, None

    # Standard ImageNet normalisation transform
    _GATE_TRANSFORM = transforms.Compose([
        transforms.Resize(256),
        transforms.CenterCrop(224),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406],
                             std=[0.229, 0.224, 0.225]),
    ])

    if os.path.exists(_GATE_WEIGHTS_PATH):
        # Fine-tuned binary checkpoint: output layer = 2 (plant / not_plant)
        try:
            model = models.mobilenet_v2(weights=None)
            model.classifier[1] = nn.Linear(model.last_channel, 2)
            state = torch.load(_GATE_WEIGHTS_PATH, map_location="cpu")
            model.load_state_dict(state)
            model.eval()
            _GATE_MODEL = model
            logger.info("[Gate] Loaded fine-tuned plant gate weights from %s",
                        _GATE_WEIGHTS_PATH)
            return _GATE_MODEL, _GATE_TRANSFORM
        except Exception as e:
            logger.warning(
                "[Gate] Failed to load fine-tuned weights: %s. "
                "Falling back to pretrained.", e)

    # No fine-tuned weights — use pretrained ImageNet MobileNetV2 (1000-class)
    # We score the output against known plant / reject synset words.
    model = models.mobilenet_v2(weights=models.MobileNet_V2_Weights.IMAGENET1K_V1)
    model.eval()
    _GATE_MODEL = model
    logger.info(
        "[Gate] Using pretrained ImageNet MobileNetV2 for plant gate "
        "(no fine-tuned weights found at %s).", _GATE_WEIGHTS_PATH)
    return _GATE_MODEL, _GATE_TRANSFORM


def _score_pretrained_imagenet(image_bytes: bytes) -> tuple[float, str]:
    """
    Run pretrained 1000-class MobileNetV2 and compute a plant confidence
    score by matching top-10 class names against known plant / reject synsets.

    Returns: (plant_confidence: float, label: "plant" | "not_plant")
    """
    model, transform = _load_gate_model()
    if model is None or transform is None:
        return 0.5, "plant"

    img = _PILImage.open(io.BytesIO(image_bytes)).convert("RGB")
    tensor = transform(img).unsqueeze(0)

    try:
        weights = models.MobileNet_V2_Weights.IMAGENET1K_V1
        class_names = weights.meta["categories"]  # 1000 category names
    except Exception:
        class_names = []

    with torch.no_grad():
        logits = model(tensor)
        probs = torch.softmax(logits[0], dim=0)

    top_probs, top_idx = torch.topk(probs, 10)

    plant_score = 0.0
    reject_score = 0.0

    for prob, idx in zip(top_probs.tolist(), top_idx.tolist()):
        name = class_names[idx].lower() if idx < len(class_names) else ""
        words = set(name.replace(",", " ").replace("-", " ").split())
        if words & _PLANT_SYNSET_WORDS:
            plant_score += prob
        if words & _REJECT_SYNSET_WORDS:
            reject_score += prob

    total = plant_score + reject_score + 1e-8
    confidence = plant_score / total
    label = "plant" if confidence >= 0.5 else "not_plant"
    logger.info(
        "[Gate-ImageNet] plant_score=%.3f reject_score=%.3f "
        "confidence=%.3f → %s",
        plant_score, reject_score, confidence, label,
    )
    return float(confidence), label


def _score_binary_finetuned(image_bytes: bytes) -> tuple[float, str]:
    """
    Run the fine-tuned 2-class MobileNetV2 gate.
    Class 0 = plant, Class 1 = not_plant.
    Returns: (confidence of "plant" class, label)
    """
    model, transform = _load_gate_model()
    if model is None or transform is None:
        return 0.5, "plant"

    img = _PILImage.open(io.BytesIO(image_bytes)).convert("RGB")
    tensor = transform(img).unsqueeze(0)

    with torch.no_grad():
        logits = model(tensor)
        probs = torch.softmax(logits[0], dim=0)

    plant_prob = probs[0].item()
    not_plant_prob = probs[1].item()
    label = "plant" if plant_prob >= not_plant_prob else "not_plant"
    logger.info(
        "[Gate-Binary] plant=%.3f not_plant=%.3f → %s",
        plant_prob, not_plant_prob, label,
    )
    return float(plant_prob), label


def _run_mobilenetv2_gate(image_bytes: bytes) -> tuple[float, str]:
    """Dispatch to fine-tuned or pretrained scoring depending on weights availability."""
    if os.path.exists(_GATE_WEIGHTS_PATH):
        return _score_binary_finetuned(image_bytes)
    return _score_pretrained_imagenet(image_bytes)


# ─────────────────────────────────────────────────────────────────────────────
#  Gemini Strict Plant Check  (path B — PythonAnywhere fallback)
#  Uses Vision + text.  Classifies ONLY: plant vs not_plant.
#  Never performs diagnosis, never invents crop/disease names.
# ─────────────────────────────────────────────────────────────────────────────
_GEMINI_GATE_PROMPT = (
    "You are a strict binary image classifier. "
    "Examine the uploaded image and answer ONLY ONE question: "
    "Does the image show a PLANT, CROP, LEAF, VEGETABLE, FRUIT (on a plant), "
    "AGRICULTURAL FIELD, or other plant matter?\n\n"
    "Reply with EXACTLY this JSON and nothing else:\n"
    "{\"label\": \"plant\", \"confidence\": 0.95}\n"
    "  OR\n"
    "{\"label\": \"not_plant\", \"confidence\": 0.97}\n\n"
    "REJECT (not_plant) if image shows: a person, face, animal, vehicle, "
    "building, furniture, electronics, document, cartoon, or any non-plant object.\n"
    "confidence must be a float between 0.0 and 1.0. "
    "DO NOT include any diagnosis, crop name, or disease information."
)


def _run_gemini_plant_check(
    image_bytes: bytes, custom_key: str = None
) -> tuple[float, str]:
    """
    Strict plant/not-plant classification via Gemini Vision.
    Used ONLY on PythonAnywhere where PyTorch is disabled.
    Returns (confidence_of_plant_class, label)
    """
    import requests as _req

    # Resolve API key (same lookup chain as ml_model.get_gemini_api_key)
    api_key = (custom_key or "").strip()
    if not api_key:
        api_key = os.getenv("GEMINI_API_KEY", "").strip()
    if not api_key:
        for p in [
            os.path.join(os.path.dirname(__file__), ".env"),
            os.path.join(os.path.dirname(__file__), "..", ".env"),
            "/home/Krishna3114/smart-kisan-backend/.env",
        ]:
            if os.path.exists(p):
                try:
                    with open(p) as f:
                        for line in f:
                            if line.strip().startswith("GEMINI_API_KEY="):
                                val = line.split("=", 1)[1].strip().strip('"').strip("'")
                                if val:
                                    api_key = val
                                    break
                except Exception:
                    pass
            if api_key:
                break

    if not api_key:
        logger.warning("[Gate-Gemini] No API key available. Bypass gate (fail-open).")
        return 0.8, "plant"

    try:
        mime_type = "image/jpeg"
        try:
            from PIL import Image as _PIL
            img = _PIL.open(io.BytesIO(image_bytes))
            fmt = (img.format or "JPEG").upper()
            mime_type = {"JPEG": "image/jpeg", "PNG": "image/png",
                         "WEBP": "image/webp"}.get(fmt, "image/jpeg")
        except Exception:
            pass

        b64 = base64.b64encode(image_bytes).decode("utf-8")
        url = (
            "https://generativelanguage.googleapis.com/v1beta/"
            f"models/gemini-1.5-flash:generateContent?key={api_key}"
        )
        payload = {
            "contents": [{
                "parts": [
                    {"text": _GEMINI_GATE_PROMPT},
                    {"inline_data": {"mime_type": mime_type, "data": b64}},
                ]
            }],
            "generationConfig": {
                "temperature": 0.0,
                "maxOutputTokens": 80,
                "responseMimeType": "application/json",
            },
        }
        resp = _req.post(url, json=payload, timeout=20)
        if resp.status_code != 200:
            logger.warning("[Gate-Gemini] API error %d. Bypass gate.", resp.status_code)
            return 0.8, "plant"

        data = resp.json()
        raw = (
            data.get("candidates", [{}])[0]
            .get("content", {})
            .get("parts", [{}])[0]
            .get("text", "")
            .strip()
        )
        # Strip markdown fences if present
        if "```" in raw:
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
            raw = raw.strip().rstrip("`").strip()

        parsed = json.loads(raw)
        label = str(parsed.get("label", "plant")).lower().strip()
        confidence = float(parsed.get("confidence", 0.8))
        if label not in ("plant", "not_plant"):
            label = "plant" if confidence >= 0.5 else "not_plant"

        logger.info("[Gate-Gemini] label=%s confidence=%.3f", label, confidence)
        return confidence, label

    except Exception as e:
        logger.warning("[Gate-Gemini] Exception: %s — bypass gate (fail-open).", e)
        return 0.8, "plant"


# ─────────────────────────────────────────────────────────────────────────────
#  Rejection Log
# ─────────────────────────────────────────────────────────────────────────────
_REJECTION_LOG_PATH = os.path.join(
    os.path.dirname(os.path.abspath(__file__)),
    "rejection_log.jsonl"
)


def log_rejection(filename: str, endpoint: str, confidence: float, reason: str):
    """
    Append one JSONL record for every rejected image.
    File is used to curate a negative-class dataset for future gate retraining.
    """
    record = {
        "ts": datetime.datetime.utcnow().isoformat() + "Z",
        "endpoint": endpoint,
        "filename": str(filename),
        "confidence": round(float(confidence), 4),
        "reason": reason,
    }
    try:
        with open(_REJECTION_LOG_PATH, "a", encoding="utf-8") as f:
            f.write(json.dumps(record) + "\n")
        logger.info("[Gate] Rejection logged: %s", record)
    except Exception as e:
        logger.warning("[Gate] Could not write rejection log: %s", e)


# ─────────────────────────────────────────────────────────────────────────────
#  Public API
# ─────────────────────────────────────────────────────────────────────────────
def validate_is_plant_image(
    image_bytes: bytes,
    confidence_threshold: float = 0.75,
    custom_key: Optional[str] = None,
) -> dict:
    """
    Step 1 Validation Gate — must pass before any diagnosis logic runs.

    Returns:
        {
            "is_valid": bool,
            "confidence": float,        # 0.0 – 1.0
            "label": "plant"|"not_plant",
            "mode":  "mobilenetv2" | "gemini_fallback" | "bypass"
        }

    Decision:
        is_valid = (label == "plant") AND (confidence >= confidence_threshold)
    """
    try:
        if TORCH_AVAILABLE:
            confidence, label = _run_mobilenetv2_gate(image_bytes)
            mode = "mobilenetv2"
        else:
            # PythonAnywhere or no torch: use Gemini strict plant check
            confidence, label = _run_gemini_plant_check(image_bytes, custom_key)
            mode = "gemini_fallback"

        is_valid = (label == "plant") and (confidence >= confidence_threshold)

        logger.info(
            "[Gate] mode=%s label=%s confidence=%.3f threshold=%.2f → %s",
            mode, label, confidence, confidence_threshold,
            "VALID" if is_valid else "REJECTED",
        )
        return {
            "is_valid": is_valid,
            "confidence": round(confidence, 4),
            "label": label,
            "mode": mode,
        }

    except Exception as e:
        logger.error(
            "[Gate] Unexpected error in validate_is_plant_image: %s\n%s",
            e, traceback.format_exc(),
        )
        # Fail-open on unexpected exceptions to avoid breaking existing deployments
        return {
            "is_valid": True,
            "confidence": 0.8,
            "label": "plant",
            "mode": "bypass",
        }
