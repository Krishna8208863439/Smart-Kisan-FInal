#!/bin/bash
echo "============================================================"
echo "  🌿 SMART KISAN - UNIX ALL FEATURE RUNNER 🌿"
echo "============================================================"

# Function to clean up background processes on exit
cleanup() {
    echo "Stopping all services..."
    kill $(jobs -p) 2>/dev/null
    exit
}

trap cleanup SIGINT SIGTERM

echo "[1/3] Starting Python FastAPI Backend on Port 8000..."
cd backend_python
python3 -m uvicorn main:app --port 8000 --reload &
PID_PY=$!
cd ..

sleep 2

echo "[2/3] Starting Node.js Express Backend on Port 5000..."
cd backend
npm run dev &
PID_NODE=$!
cd ..

echo "[3/3] Starting React Vite Frontend on Port 5173..."
cd frontend
npm run dev &
PID_FRONT=$!
cd ..

echo "============================================================"
echo "All servers running in background."
echo "FastAPI (PID: $PID_PY), Node (PID: $PID_NODE), Vite (PID: $PID_FRONT)"
echo "Press Ctrl+C to stop all services together."
echo "============================================================"

# Wait for background jobs
wait
