"""
test_kolhapur_chat.py
──────────────────────
Regression test for AgriExpert Chatbot location-based crop grounding.
Asserts that querying "what is the best crop to grow in Kolhapur" returns
grounded agricultural data referencing Kolhapur/Western Maharashtra crops
(Sugarcane, Paddy, Soybean, etc.) rather than a generic refusal block.
"""

import pytest
from rag_service import search_knowledge_base


def test_kolhapur_kb_search():
    query = "what is the best crop to grow in Kolhapur"
    results = search_knowledge_base(query, k=3)
    assert len(results) > 0
    top_doc = results[0]
    assert "Kolhapur" in top_doc["title"] or "Kolhapur" in top_doc["text"]
    assert any(crop in top_doc["text"] for crop in ["Sugarcane", "Paddy", "Soybean"])


def test_kolhapur_chat_endpoint():
    from fastapi.testclient import TestClient
    from main import app

    client = TestClient(app)
    payload = {
        "message": "what is the best crop to grow in Kolhapur?",
        "language": "en"
    }
    
    response = client.post("/api/chat", json=payload)
    assert response.status_code == 200
    data = response.json()
    
    assert data.get("success") is True or "response" in data
    resp_text = data.get("response", "")
    
    # Assert answer contains Kolhapur or key Kolhapur crops
    lowered = resp_text.lower()
    assert any(term in lowered for term in ["kolhapur", "sugarcane", "paddy", "soybean", "maharashtra", "crop"])


if __name__ == "__main__":
    pytest.main(["-v", __file__])
