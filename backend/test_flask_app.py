import unittest
import json
import io
from app import app

class FlaskAppTestCase(unittest.TestCase):
    def setUp(self):
        self.client = app.test_client()

    def test_health_check(self):
        response = self.client.get("/api/health")
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertEqual(data.get("status"), "ok")

    def test_weather_endpoint(self):
        response = self.client.get("/api/weather?location=Kolhapur")
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertTrue(data.get("success"))

    def test_market_endpoint(self):
        response = self.client.get("/api/market")
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertTrue(data.get("success"))

    def test_marketplace_endpoint(self):
        response = self.client.get("/api/marketplace")
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertTrue(data.get("success"))

    def test_yield_history_and_predict(self):
        response = self.client.get("/api/yield/history")
        self.assertEqual(response.status_code, 200)
        
        predict_res = self.client.post("/api/yield/predict", json={"crop": "Tomato", "area": 2})
        self.assertEqual(predict_res.status_code, 200)
        self.assertTrue(predict_res.json.get("success"))

    def test_livestock_endpoints(self):
        response = self.client.get("/api/livestock")
        self.assertEqual(response.status_code, 200)

    def test_crop_diagnostics_analyze(self):
        response = self.client.post("/api/diagnose", json={"crop": "Tomato"})
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.json.get("success"))

    def test_schemes_and_officers(self):
        res1 = self.client.get("/api/community/schemes")
        self.assertEqual(res1.status_code, 200)
        res2 = self.client.get("/api/community/officers")
        self.assertEqual(res2.status_code, 200)

if __name__ == "__main__":
    unittest.main()
