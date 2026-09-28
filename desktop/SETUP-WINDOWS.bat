@echo off
setlocal EnableDelayedExpansion
title Multi Plaza - Automatic Setup ^& Launcher
color 0B
cd /d "%~dp0.."

echo ============================================================
echo   Multi Plaza - Customer Order ^& Billing Management
echo   AUTOMATIC SETUP ^& LAUNCHER
echo ============================================================
echo.

REM ---- 1. Node.js check ----
where node >nul 2>nul
if not %errorlevel%==0 (
  echo [!] Node.js not detected.
  echo.
  echo     Option 1: Attempting automatic install via Windows winget...
  where winget >nul 2>nul
  if %errorlevel%==0 (
    echo     winget detected, installing Node.js LTS...
    winget install -e --id OpenJS.NodeJS.LTS --accept-package-agreements --accept-source-agreements
    echo.
    echo [IMPORTANT] Node.js has been installed!
    echo             Please close this window and run SETUP-WINDOWS.bat once more.
    pause
    exit /b 1
  )
  echo.
  echo     Option 2: Opening https://nodejs.org in your browser...
  echo     Please download and install the LTS version (click Next through the wizard).
  start "" https://nodejs.org
  echo.
  echo After installing Node.js, run this file again!
  pause
  exit /b 1
)

echo [OK] Node.js detected:
node -v
echo.

REM ---- 2. npm install if node_modules missing ----
if not exist "node_modules" (
  echo ============================================================
  echo   [1/3] Installing application dependencies...
  echo         (Internet connection required, 2-5 minutes)
  echo ============================================================
  call npm install
  if not !errorlevel!==0 (
    echo [ERROR] npm install failed. Please verify your internet connection.
    pause
    exit /b 1
  )
) else (
  echo [OK] node_modules already installed.
)

REM ---- 3. Create .env if missing ----
if not exist ".env" (
  echo PGLITE_PATH=./data/multiplaza-data> .env
  echo AUTH_SECRET=multiplaza-desktop-secret-2026>> .env
  echo [OK] .env configured.
) else (
  findstr /C:"PGLITE_PATH" .env >nul
  if errorlevel 1 (
    echo PGLITE_PATH=./data/multiplaza-data>> .env
  )
)

REM ---- 4. Build if .next missing ----
if not exist ".next" (
  echo.
  echo ============================================================
  echo   [2/3] Building production bundle... (~1 minute)
  echo ============================================================
  call npm run build
  if not !errorlevel!==0 (
    echo [ERROR] Build failed.
    pause
    exit /b 1
  )
) else (
  echo [OK] Production build ready.
)

REM ---- 5. Seed initial data if data folder missing ----
if not exist "data\multiplaza-data" (
  echo.
  echo ============================================================
  echo   [3/3] Initializing local database...
  echo ============================================================
  call npx tsx src/db/seed.ts
)

echo.
echo ============================================================
echo   SETUP COMPLETE! Starting application now...
echo ============================================================
echo.
pause
call "%~dp0START-MULTIPLAZA.bat"
