import unittest
import json
import io
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
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
        response = self.client.get("/api/weather?location=Kolhapur&lat=16.7050&lon=74.2433")
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertTrue(data.get("success"))
        self.assertIn("current", data)
        self.assertIn("forecast", data)

    def test_chat_endpoint(self):
        # 1. Test tomato fertilizer query
        response = self.client.post("/api/chat", json={
            "message": "What fertilizer is best for tomato?",
            "context": {"language": "English"}
        })
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertTrue(data.get("success"))
        self.assertTrue(bool(data.get("reply") or data.get("response")))

        # 2. Test Marathi blight query
        res_mr = self.client.post("/api/chat", json={
            "message": "भातावरील करपा रोगावर काय उपाय करावा?",
            "context": {"language": "Marathi"}
        })
        self.assertEqual(res_mr.status_code, 200)
        data_mr = json.loads(res_mr.data)
        self.assertTrue(data_mr.get("success"))
        self.assertIn("उपचार", data_mr.get("reply"))

    def test_crop_recommendations_endpoint(self):
        response = self.client.post("/api/recommendations/crop", json={
            "soilType": "loamy",
            "season": "kharif",
            "region": "Kolhapur, Maharashtra",
            "irrigationAvailable": True,
            "pH": 6.5,
            "n": 50,
            "p": 50,
            "k": 50
        })
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertTrue(data.get("success"))
        self.assertIn("recommendations", data)
        self.assertTrue(len(data["recommendations"]) > 0)
        self.assertIn("suitabilityScore", data["recommendations"][0])
        self.assertIn("predictedYield", data["recommendations"][0])
        self.assertIn("fertilizerPlan", data)
        self.assertTrue(len(data["fertilizerPlan"]) > 0)

    def test_market_endpoint(self):
        response = self.client.get("/api/market?crop=Wheat")
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertTrue(data.get("success"))
        self.assertIn("prices", data)
        self.assertTrue(len(data["prices"]) > 0)
        self.assertIn("pricePerQuintal", data["prices"][0])
        self.assertIn("stats", data)
        self.assertIn("trend", data)
        self.assertIn("priceTrend", data)
        self.assertIn("recommendation", data)

    def test_crop_calendar_endpoints(self):
        # 1. GET calendars (returns list)
        res_get = self.client.get("/api/crop-calendar")
        self.assertEqual(res_get.status_code, 200)
        cals = json.loads(res_get.data)
        self.assertIsInstance(cals, list)
        self.assertTrue(len(cals) > 0)

        # 2. POST create new calendar
        res_post = self.client.post("/api/crop-calendar", json={
            "cropName": "Tomato",
            "sowingDate": "2026-08-15"
        })
        self.assertEqual(res_post.status_code, 201)
        new_cal = json.loads(res_post.data)
        self.assertIn("_id", new_cal)
        self.assertTrue(len(new_cal.get("tasks", [])) > 0)

        # 3. PATCH toggle task
        t_id = new_cal["tasks"][0]["_id"]
        res_patch = self.client.patch(f"/api/crop-calendar/{new_cal['_id']}/task/{t_id}", json={
            "status": "completed"
        })
        self.assertEqual(res_patch.status_code, 200)

    def test_yield_history_and_predict(self):
        predict_res = self.client.post("/api/yield/predict", json={
            "cropName": "Tomato",
            "area": 2.0,
            "n": 60,
            "p": 45,
            "k": 45,
            "pH": 6.5
        })
        self.assertEqual(predict_res.status_code, 200)
        data = json.loads(predict_res.data)
        self.assertTrue(data.get("success"))
        pred = data.get("prediction", {})
        self.assertIn("predictedYield", pred)
        self.assertIn("totalPredictedYield", pred)
        self.assertIn("predictedProfit", pred)
        self.assertIn("irrigationSchedule", pred)
        self.assertIn("fertilizerSchedule", pred)
        self.assertIn("explanation", data)

        res_hist = self.client.get("/api/yield/history")
        self.assertEqual(res_hist.status_code, 200)
        hist = json.loads(res_hist.data)
        self.assertIsInstance(hist, list)

    def test_marketplace_endpoints(self):
        # 1. GET marketplace products
        res = self.client.get("/api/marketplace")
        self.assertEqual(res.status_code, 200)
        prods = json.loads(res.data)
        self.assertIsInstance(prods, list)
        self.assertTrue(len(prods) > 0)

        # 2. POST new product
        res_post = self.client.post("/api/marketplace", json={
            "name": "Organic Tomatoes",
            "category": "Produce",
            "price": 30,
            "unit": "/kg"
        })
        self.assertEqual(res_post.status_code, 201)

        # 3. Buy requests
        res_req = self.client.get("/api/marketplace/buy-requests")
        self.assertEqual(res_req.status_code, 200)

        # 4. Checkout
        res_check = self.client.post("/api/marketplace/checkout", json={
            "items": [{"name": "Organic Wheat", "price": 850, "qty": 1}],
            "totalAmount": 850
        })
        self.assertEqual(res_check.status_code, 200)

    def test_crop_diagnostics(self):
        # 1. Standard crop (Tomato)
        response = self.client.post("/api/diagnose", json={"crop": "Tomato"})
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertTrue(data.get("success"))
        self.assertTrue(data.get("isAgriculturalImage"))
        self.assertIn("diagnosis", data)
        self.assertIn("symptoms", data)
        self.assertIn("treatment", data)
        self.assertIn("fertilizerAdvice", data)
        self.assertIn("irrigationAdvice", data)
        self.assertIn("prevention", data)
        self.assertIn("report", data)
        self.assertIn("disease", data["report"])
        self.assertIn("advice", data["report"])
        self.assertTrue(len(data["symptoms"]) > 0)
        self.assertTrue(len(data["treatment"]) > 0)

        # 2. Potato test
        res_pot = self.client.post("/api/crop-diagnosis", json={"crop": "Potato"})
        self.assertEqual(res_pot.status_code, 200)
        data_pot = json.loads(res_pot.data)
        self.assertIn("Late Blight", data_pot["diagnosis"])

        # 3. Marathi alias test (ऊस / Sugarcane)
        res_sugar = self.client.post("/api/crop-diagnosis", json={"crop": "ऊस"})
        self.assertEqual(res_sugar.status_code, 200)
        data_sugar = json.loads(res_sugar.data)
        self.assertIn("Sugarcane", data_sugar["crop"])

        # 4. Arbitrary custom crop test (Pomegranate)
        res_custom = self.client.post("/api/crop-diagnosis", json={"crop": "Pomegranate"})
        self.assertEqual(res_custom.status_code, 200)
        data_custom = json.loads(res_custom.data)
        self.assertTrue(data_custom.get("success"))
        self.assertIn("Pomegranate", data_custom["crop"])
        self.assertTrue(len(data_custom["symptoms"]) > 0)
        self.assertTrue(len(data_custom["treatment"]) > 0)
        self.assertTrue(len(data_custom["fertilizerAdvice"]) > 0)

    def test_livestock_and_schemes(self):
        res1 = self.client.get("/api/community/schemes")
        self.assertEqual(res1.status_code, 200)
        res2 = self.client.get("/api/community/officers")
        self.assertEqual(res2.status_code, 200)
        res3 = self.client.get("/api/livestock")
        self.assertEqual(res3.status_code, 200)

if __name__ == "__main__":
    unittest.main()
