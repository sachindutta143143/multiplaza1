@echo off
setlocal EnableDelayedExpansion
title Multi Plaza - Push Project to GitHub
color 0B
cd /d "%~dp0.."

echo ============================================================
echo   Multi Plaza - Automatic GitHub Uploader
echo ============================================================
echo.

where git >nul 2>nul
if not %errorlevel%==0 (
  echo [ERROR] Git is not installed on this PC!
  echo.
  echo Please install Git for Windows from:
  echo   https://git-scm.com/download/win
  echo.
  echo (Download 64-bit installer and click Next through the wizard)
  start "" https://git-scm.com/download/win
  pause
  exit /b 1
)

echo [OK] Git is installed!
git --version
echo.

set /p REPO_URL="Enter your GitHub Repository URL (e.g. https://github.com/username/multiplaza-billing.git): "

if "%REPO_URL%"=="" (
  echo [ERROR] Repository URL cannot be empty!
  pause
  exit /b 1
)

echo.
echo Initializing Git repository and preparing files...

if not exist ".git" (
  git init
)

git branch -M main
git remote remove origin >nul 2>nul
git remote add origin %REPO_URL%

echo Staging files (node_modules and build files are excluded automatically)...
git add .

echo Committing code...
git commit -m "Deploy Multi Plaza to GitHub"

echo.
echo ============================================================
echo   Pushing code to GitHub...
echo   (If GitHub asks you to Sign In in your browser, click YES!)
echo ============================================================
echo.

git push -u origin main --force

if %errorlevel%==0 (
  echo.
  echo ============================================================
  echo   [SUCCESS] Code successfully pushed to GitHub!
  echo   Now go to Railway.com and deploy from this repository!
  echo ============================================================
) else (
  echo.
  echo [ERROR] Git push failed. Please check your GitHub permissions or credentials.
)

echo.
pause
