import os
import json
import sys
from unittest.mock import patch

# Reconfigure stdout/stderr to support UTF-8 on Windows command line
try:
    sys.stdout.reconfigure(encoding='utf-8')
    sys.stderr.reconfigure(encoding='utf-8')
except AttributeError:
    pass

# Add current folder to path to allow importing ml_model
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from ml_model import predict_image, get_gemini_api_key

def main():
    print("=== Smart Kisan Disease Diagnosis Verification Script ===")
    
    # 1. Resolve path to sample image in dataset
    backend_dir = os.path.dirname(os.path.abspath(__file__))
    sample_img_path = os.path.abspath(os.path.join(
        backend_dir, "..", "archive", "Raw", "Raw", "Apples plant", "raw", "1.jpg"
    ))
    
    print(f"Target sample image: {sample_img_path}")
    if not os.path.exists(sample_img_path):
        print(f"Error: Sample image not found at {sample_img_path}")
        return
        
    print("Sample image found successfully.")
    
    # 2. Read image bytes
    with open(sample_img_path, "rb") as f:
        img_bytes = f.read()
        
    print(f"Read {len(img_bytes)} bytes from image.")
    
    # 3. Check for Gemini API key
    api_key = get_gemini_api_key()
    if api_key:
        print("GEMINI_API_KEY is configured.")
    else:
        print("WARNING: GEMINI_API_KEY is NOT configured. Fallback pipelines will be used.")
        
    # 4. Execute standard prediction (with local key/offline fallbacks)
    print("\n[Test 1] Executing standard prediction pipeline...")
    result = predict_image(img_bytes, crop_hint="Apples plant", filename="1.jpg")
    
    print("\n=== [Test 1] STANDARD PIPELINE RESULT ===")
    print(json.dumps(result, indent=2))
    
    # 5. Execute simulated/mocked Gemini Vision prediction
    print("\n[Test 2] Executing mocked Google Gemini 1.5 Flash Vision pipeline...")
    
    # Define a mock response object
    class MockResponse:
        def __init__(self, status_code, json_data):
            self.status_code = status_code
            self.json_data = json_data
            self.text = json.dumps(json_data)
        def json(self):
            return self.json_data

    # Gemini success payload structure matching the model's actual response format
    mock_gemini_payload = {
        "candidates": [
            {
                "content": {
                    "parts": [
                        {
                            "text": "```json\n{\n  \"crop\": \"Apples plant\",\n  \"disease\": \"Apple Scab (Venturia inaequalis)\",\n  \"severity\": \"medium\",\n  \"confidence\": 0.94,\n  \"advice\": \"Apply Mancozeb 75 WP (2 g/L) or Copper Oxychloride 50 WP (3 g/L) at pink bud stage. Prune and destroy fallen leaves. Introduce disease-resistant varieties like Redfree or Liberty next season.\",\n  \"image_analysis\": \"Dark, olive-colored lesions/spots visible on the leaf surface corresponding to Apple Scab infestation.\",\n  \"gemini_powered\": true\n}\n```"
                        }
                    ]
                }
            }
        ]
    }

    # Patch requests.post in ml_model to simulate API response
    with patch("requests.post") as mock_post:
        mock_post.return_value = MockResponse(200, mock_gemini_payload)
        
        # We pass a temporary custom_key to bypass the check and force the Gemini pathway
        mock_result = predict_image(img_bytes, crop_hint="Apples plant", filename="1.jpg", custom_key="mock_active_key_1234")
        
    print("\n=== [Test 2] MOCKED GEMINI AI DIAGNOSIS REPORT ===")
    print(json.dumps(mock_result, indent=2))
    
    # 6. Save mock report to file as verification reference
    report_out_path = os.path.join(backend_dir, "sample_diagnosis_report.json")
    with open(report_out_path, "w", encoding="utf-8") as out_f:
        json.dump(mock_result, out_f, indent=2)
    print(f"\nMocked AI Report successfully saved to: {report_out_path}")
    print("=========================================================")

if __name__ == "__main__":
    main()
