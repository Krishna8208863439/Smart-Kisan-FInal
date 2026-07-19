import os
import json
import pickle
import requests
import numpy as np

try:
    import faiss
    FAISS_AVAILABLE = True
    print("[RAG] FAISS is installed and available.")
except ImportError:
    FAISS_AVAILABLE = False
    print("[RAG] FAISS not found. Falling back to Numpy cosine similarity search.")

# Paths
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
KB_JSON_PATH = os.path.join(BASE_DIR, "datasets", "agriculture_kb.json")
KB_PKL_PATH = os.path.join(BASE_DIR, "datasets", "agriculture_kb_embeddings.pkl")

# Cache to avoid reloading vectors on every query
_cached_kb = []
_cached_embeddings = []
_faiss_index = None

def get_gemini_api_key():
    from ml_model import get_gemini_api_key as get_key
    return get_key()

def get_embedding(text: str, api_key: str = None) -> list:
    """Fetch 768-dimension text embedding from Gemini API using REST."""
    key = (api_key or "").strip() or get_gemini_api_key()
    if not key:
        print("[RAG] Missing Gemini API Key for embedding. Returning mock vector.")
        return [0.0] * 768
    
    try:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key={key}"
        payload = {
            "model": "models/text-embedding-004",
            "content": {"parts": [{"text": text}]}
        }
        res = requests.post(url, json=payload, timeout=12)
        if res.status_code == 200:
            data = res.json()
            return data["embedding"]["values"]
        else:
            print(f"[RAG] Embedding API error {res.status_code}: {res.text}")
            return [0.0] * 768
    except Exception as e:
        print(f"[RAG] Embedding query failed: {e}")
        return [0.0] * 768

def init_rag_system(force_rebuild: bool = False, api_key: str = None):
    """Initializes RAG KB. Generates vector embeddings for all documents if cache not found."""
    global _cached_kb, _cached_embeddings, _faiss_index
    
    if not os.path.exists(KB_JSON_PATH):
        print(f"[RAG] Warning: Knowledge base JSON file not found at {KB_JSON_PATH}")
        return
        
    with open(KB_JSON_PATH, "r", encoding="utf-8") as f:
        _cached_kb = json.load(f)
        
    print(f"[RAG] Loaded {len(_cached_kb)} agricultural articles.")
    
    # Load cached embeddings or generate them
    if not force_rebuild and os.path.exists(KB_PKL_PATH):
        try:
            with open(KB_PKL_PATH, "rb") as f:
                _cached_embeddings = pickle.load(f)
            print(f"[RAG] Loaded cached embeddings for {len(_cached_embeddings)} documents.")
        except Exception as e:
            print(f"[RAG] Failed to load embeddings cache: {e}. Rebuilding...")
            force_rebuild = True

    if force_rebuild or not _cached_embeddings or len(_cached_embeddings) != len(_cached_kb):
        print("[RAG] Embedding knowledge base documents (this may take a moment)...")
        _cached_embeddings = []
        for doc in _cached_kb:
            # Combine title + text to get better semantic vector
            doc_context = f"Title: {doc['title']}\nSource: {doc['source']}\nText: {doc['text']}"
            vec = get_embedding(doc_context, api_key)
            _cached_embeddings.append(vec)
            
        # Save cache
        try:
            os.makedirs(os.path.dirname(KB_PKL_PATH), exist_ok=True)
            with open(KB_PKL_PATH, "wb") as f:
                pickle.dump(_cached_embeddings, f)
            print(f"[RAG] Saved {len(_cached_embeddings)} embeddings to cache.")
        except Exception as e:
            print(f"[RAG] Failed to save embeddings cache: {e}")

    # Build FAISS index if available
    if FAISS_AVAILABLE and _cached_embeddings:
        try:
            dim = len(_cached_embeddings[0])
            _faiss_index = faiss.IndexFlatL2(dim)
            _faiss_index.add(np.array(_cached_embeddings).astype("float32"))
            print("[RAG] FAISS Index created and loaded successfully.")
        except Exception as faiss_err:
            print(f"[RAG] Error loading FAISS index: {faiss_err}. Using Numpy fallback.")
            _faiss_index = None

def search_knowledge_base(query: str, k: int = 3, api_key: str = None) -> list:
    """
    Search agriculture knowledge base for relevant documents.
    Returns: list of dicts (articles with relevance score)
    """
    global _cached_kb, _cached_embeddings, _faiss_index
    
    if not _cached_kb:
        init_rag_system(api_key=api_key)
        if not _cached_kb:
            return []
            
    query_vector = get_embedding(query, api_key)
    
    # 1. Use FAISS if index exists
    if FAISS_AVAILABLE and _faiss_index is not None:
        try:
            q_arr = np.array([query_vector]).astype("float32")
            D, I = _faiss_index.search(q_arr, k)
            results = []
            for dist, idx in zip(D[0], I[0]):
                if idx < len(_cached_kb) and idx >= 0:
                    doc = _cached_kb[idx].copy()
                    # Distance in FAISS FlatL2 is squared L2 distance. Convert to raw score
                    doc["relevance_score"] = float(1.0 / (1.0 + dist))
                    results.append(doc)
            return results
        except Exception as search_err:
            print(f"[RAG] FAISS search failed: {search_err}. Falling back to Numpy.")
            
    # 2. Numpy fallback (Cosine Similarity)
    results = []
    q_vec = np.array(query_vector)
    q_norm = np.linalg.norm(q_vec)
    
    for i, doc in enumerate(_cached_kb):
        doc_vec = np.array(_cached_embeddings[i])
        doc_norm = np.linalg.norm(doc_vec)
        if q_norm == 0 or doc_norm == 0:
            score = 0.0
        else:
            score = float(np.dot(q_vec, doc_vec) / (q_norm * doc_norm))
            
        doc_copy = doc.copy()
        doc_copy["relevance_score"] = score
        results.append(doc_copy)
        
    # Sort by score descending
    results.sort(key=lambda x: x["relevance_score"], reverse=True)
    return results[:k]
