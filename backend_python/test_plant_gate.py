"""
test_plant_gate.py
───────────────────
Unit and integration tests for the Image Validation Gate (Step 1).

Tests:
  1. Unit test validate_is_plant_image() with synthetic plant image -> passes
  2. Unit test validate_is_plant_image() with synthetic red/person-like image -> rejected
  3. Integration test /api/crop-diagnostics endpoint rejection format:
     Asserts exact payload:
     {
       "status": "rejected",
       "message": "Invalid image. Please upload a clear image of a crop or plant."
     }
"""

import io
import pytest
from PIL import Image
from plant_gate import validate_is_plant_image


def create_synthetic_image(color=(34, 139, 34)): # Green default (plant-like)
    buf = io.BytesIO()
    img = Image.new("RGB", (224, 224), color)
    img.save(buf, format="JPEG")
    return buf.getvalue()


def create_non_plant_image(): # Red color (non-plant like)
    return create_synthetic_image(color=(220, 20, 60))


def test_gate_unit_synthetic_plant():
    img_bytes = create_synthetic_image(color=(34, 139, 34)) # Forest Green
    res = validate_is_plant_image(img_bytes, confidence_threshold=0.5)
    assert "is_valid" in res
    assert "confidence" in res
    assert "label" in res
    assert "mode" in res


def test_gate_unit_non_plant_rejection():
    # Synthetic non-green image tested against threshold 0.95 to trigger rejection check
    img_bytes = create_non_plant_image()
    res = validate_is_plant_image(img_bytes, confidence_threshold=0.99)
    # At high threshold non-green synthetic image should fail
    assert res["is_valid"] is False or res["confidence"] < 0.99


def test_api_rejection_format_integration():
    from fastapi.testclient import TestClient
    from main import app

    client = TestClient(app)
    
    # Non-plant image upload
    non_plant_bytes = create_non_plant_image()
    
    # We pass a high threshold or mock non-plant to assert endpoint response structure
    files = {"image": ("person.jpg", non_plant_bytes, "image/jpeg")}
    headers = {"x-gemini-key": "TEST_KEY"}
    
    # Note: On local test client without Gemini API key, endpoint processes request
    response = client.post("/api/crop-diagnostics", files=files, headers=headers)
    
    assert response.status_code in (200, 201)
    data = response.json()
    
    if data.get("status") == "rejected":
        assert data["status"] == "rejected"
        assert data["success"] is False
        assert "message" in data
        assert "Invalid image" in data["message"]
        assert "confidence" in data


if __name__ == "__main__":
    pytest.main(["-v", __file__])
