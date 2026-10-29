@echo off
echo ========================================================
echo  Starting HisabKitab - Billing & Inventory Management
echo ========================================================

:: Check MongoDB status
echo [1/3] Checking MongoDB...
sc query MongoDB | find "RUNNING" >nul
if %ERRORLEVEL% EQU 0 (
    echo MongoDB Service is RUNNING.
) else (
    echo WARNING: MongoDB service is not running. Please start MongoDB.
)

:: Start Backend API (FastAPI)
echo [2/3] Launching FastAPI Backend on http://localhost:8000 ...
start "HisabKitab Backend" cmd /k "cd backend && python main.py"

:: Wait 2 seconds
timeout /t 2 /nobreak >nul

:: Start Frontend (Vite React)
echo [3/3] Launching Vite Frontend on http://localhost:5173 ...
start "HisabKitab Frontend" cmd /k "cd frontend && npm run dev"

echo.
echo ========================================================
echo  HisabKitab is running!
echo  Frontend UI:  http://localhost:5173
echo  Backend API:  http://localhost:8000
echo  API Docs:     http://localhost:8000/docs
echo ========================================================
pause

