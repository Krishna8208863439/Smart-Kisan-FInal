@echo off
echo ============================================================
echo   🌿 SMART KISAN - WINDOWS ALL FEATURE RUNNER 🌿
echo ============================================================
echo Spawning servers in separate windows...
echo.

echo [1/3] Starting Python FastAPI Backend on Port 8000...
start "Smart Kisan - Python Backend (Port 8000)" cmd /k "cd backend_python && python -m uvicorn main:app --port 8000 --reload"

echo [2/3] Starting Node.js Express Backend on Port 5000...
start "Smart Kisan - Node.js Backend (Port 5000)" cmd /k "cd backend && npm run dev"

echo [3/3] Starting React Vite Frontend on Port 5173...
start "Smart Kisan - React Frontend (Port 5173)" cmd /k "cd frontend && npm run dev"

echo.
echo All services have been spawned in separate console windows!
echo If you need to stop them, just close their respective windows.
echo ============================================================
pause
