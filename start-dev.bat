@echo off
echo ================================================
echo   Petty Cash Management System - Dev Launcher
echo ================================================
echo.

REM Check if node_modules exist for backend
IF NOT EXIST "backend\node_modules\" (
    echo [1/4] Installing backend dependencies...
    cd backend
    cmd /c "npm install"
    cd ..
) ELSE (
    echo [1/4] Backend dependencies already installed.
)

REM Check if node_modules exist for frontend
IF NOT EXIST "frontend\node_modules\" (
    echo [2/4] Installing frontend dependencies...
    cd frontend
    cmd /c "npm install"
    cd ..
) ELSE (
    echo [2/4] Frontend dependencies already installed.
)

echo.
echo [3/4] Initializing database...
cd backend
cmd /c "node scripts/init-db.js"
cmd /c "npx prisma db seed"
cd ..

echo.
echo [4/4] Starting development servers...
echo       Backend  : http://localhost:3000/api
echo       Swagger  : http://localhost:3000/swagger
echo       Frontend : http://localhost:5173
echo.

REM Start backend in new window
start "PettyCash Backend" cmd /k "cd /d backend && npx nest start --watch"

REM Wait 5 seconds for backend to initialize
timeout /t 5 /nobreak >nul

REM Start frontend in new window
start "PettyCash Frontend" cmd /k "cd /d frontend && npm run dev"

echo Both services started! Check the opened terminal windows.
pause
