@echo off
setlocal
cd /d "%~dp0"
echo Starting RAKSHA frontend, ML early-warning backend, and alerts backend...
echo.
start "RAKSHA ML Backend :8000" cmd /k "python -m uvicorn backend.main:app --reload --host 127.0.0.1 --port 8000"
start "RAKSHA Alerts Backend :5000" cmd /k "cd /d %~dp0server && npm run dev"
start "RAKSHA Frontend" cmd /k "npm run dev"
echo.
echo Three windows were started.
echo Frontend: http://localhost:5173
 echo ML API: http://localhost:8000/docs
 echo Alerts API: http://localhost:5000/api/health
endlocal
