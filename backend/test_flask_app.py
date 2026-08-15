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

    def test_chatbot_missing_message(self):
        response = self.client.post("/api/chatbot/message", json={})
        self.assertEqual(response.status_code, 400)

    def test_chat_missing_message(self):
        response = self.client.post("/api/chat", json={})
        self.assertEqual(response.status_code, 400)

    def test_weather_endpoint(self):
        response = self.client.get("/api/weather?location=Kolhapur")
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertTrue(data.get("success"))
        self.assertIn("current", data)
        self.assertIn("forecast", data)

    def test_market_prices_endpoint(self):
        response = self.client.get("/api/market-prices")
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertTrue(data.get("success"))
        self.assertTrue(len(data.get("data", [])) > 0)

    def test_schemes_endpoint(self):
        response = self.client.get("/api/community/schemes")
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertTrue(data.get("success"))
        self.assertTrue(len(data.get("data", [])) > 0)

    def test_crop_recommendations(self):
        response = self.client.post("/api/recommendations/crop", json={"nitrogen": 80, "phosphorus": 40, "potassium": 40})
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertTrue(data.get("success"))
        self.assertTrue(len(data.get("recommendations", [])) > 0)

if __name__ == "__main__":
    unittest.main()
