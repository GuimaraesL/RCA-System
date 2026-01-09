@echo off
echo ===========================================
echo      INICIANDO SISTEMA RCA GLOBAL
echo ===========================================

echo 1. Iniciando Backend (Server)...
cd server
start "RCA Backend (Port 3001)" npm run dev
cd ..

echo 2. Iniciando Frontend (Client)...
start "RCA Frontend (Port 3000)" npm run dev

echo ===========================================
echo      SISTEMA INICIANDO...
echo ===========================================
echo Backend: http://localhost:3001
echo Frontend: http://localhost:3000
echo.
timeout /t 5
