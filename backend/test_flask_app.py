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

    def test_crop_diagnostics_missing_file(self):
        response = self.client.post("/api/crop-diagnostics/analyze", data={})
        self.assertEqual(response.status_code, 400)

if __name__ == "__main__":
    unittest.main()
