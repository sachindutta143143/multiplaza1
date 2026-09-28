@echo off
setlocal EnableDelayedExpansion
title Multi Plaza - Fast Launch (Direct Mode)
color 0A
cd /d "%~dp0.."

echo ============================================================
echo   Multi Plaza - Fast Launch (Desktop + Mobile Wi-Fi Mode)
echo ============================================================
echo.

where node >nul 2>nul
if not %errorlevel%==0 (
  echo [ERROR] Node.js was not detected!
  echo Please install Node.js LTS from https://nodejs.org
  pause
  exit /b 1
)

if not exist "node_modules" (
  echo Installing dependencies, please wait...
  call npm install
)

if not exist ".env" (
  echo PGLITE_PATH=./data/multiplaza-data> .env
  echo AUTH_SECRET=multiplaza-desktop-secret-2026>> .env
)

REM ---- Free port 3000 if a previous process is still holding it ----
powershell -NoProfile -Command "Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue | ForEach-Object { try { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue } catch {} }" >nul 2>nul

echo [OK] App is starting on all network interfaces (0.0.0.0:3000)...
echo.
echo ============================================================
echo   THIS DESKTOP:  http://localhost:3000
echo.
echo   MOBILE ^& OTHER DEVICES ON YOUR WI-FI:
powershell -NoProfile -ExecutionPolicy Bypass -Command "Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.InterfaceAlias -notlike '*Loopback*' -and $_.IPAddress -notlike '169.254*' -and $_.IPAddress -notlike '127*' } | ForEach-Object { Write-Host ('      * ' + $_.InterfaceAlias + ': http://' + $_.IPAddress + ':3000') -ForegroundColor Yellow }"
echo.
echo   * Keep this command window open while using the app!
echo ============================================================
echo.

REM Open local browser automatically in 4 seconds
start "" cmd /c "timeout /t 4 /nobreak >nul & start http://localhost:3000"

REM -H 0.0.0.0 allows mobile & other devices on the local network to connect!
call npx next dev -H 0.0.0.0 -p 3000
pause
