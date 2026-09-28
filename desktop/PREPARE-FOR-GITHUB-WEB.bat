@echo off
title Multi Plaza - Prepare Files for GitHub Web Upload
color 0B
cd /d "%~dp0.."

where node >nul 2>nul
if not %errorlevel%==0 (
  echo [ERROR] Node.js is not installed!
  echo Please install Node.js LTS from https://nodejs.org
  pause
  exit /b 1
)

call node scripts/prepare-github.js

echo.
pause
