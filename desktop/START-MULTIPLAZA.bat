@echo off
setlocal EnableDelayedExpansion
title Multi Plaza - Billing Management
color 0B
cd /d "%~dp0.."

echo ============================================================
echo   Multi Plaza - Customer Order ^& Billing Management
echo ============================================================
echo.

where node >nul 2>nul
if not %errorlevel%==0 (
  echo [ERROR] Node.js is not installed!
  echo Please run desktop\SETUP-WINDOWS.bat first or install from https://nodejs.org
  pause
  exit /b 1
)

if not exist "node_modules" (
  echo [!] First time setup required. Running setup now...
  call "%~dp0SETUP-WINDOWS.bat"
  exit /b 0
)

if not exist ".next" (
  echo [!] Building application, please wait...
  call npm run build
)

if not exist ".env" (
  echo PGLITE_PATH=./data/multiplaza-data> .env
  echo AUTH_SECRET=multiplaza-desktop-secret-2026>> .env
)

REM ---- Free port 3000 if a previous process is still holding it ----
powershell -NoProfile -Command "Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue | ForEach-Object { try { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue } catch {} }" >nul 2>nul

echo [OK] Starting local server on all network interfaces (0.0.0.0:3000)...
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

start "" cmd /c "timeout /t 4 /nobreak >nul & start http://localhost:3000"

REM Run npx next start directly with host and port
call npx next start -H 0.0.0.0 -p 3000

echo.
echo Server stopped.
pause
