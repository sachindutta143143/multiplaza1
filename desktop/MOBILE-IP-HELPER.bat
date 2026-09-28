@echo off
setlocal EnableDelayedExpansion
title Multi Plaza - Mobile Connect (QR Code & Direct Wi-Fi Link)
color 0B
cd /d "%~dp0.."

echo ============================================================
echo   Multi Plaza - Mobile ^& Network Access Tool
echo ============================================================
echo.

where node >nul 2>nul
if not %errorlevel%==0 (
  echo [ERROR] Node.js is not installed!
  pause
  exit /b 1
)

echo Finding all IP addresses for this computer...
echo.

powershell -NoProfile -ExecutionPolicy Bypass -Command "Write-Host '============================================================' -ForegroundColor Cyan; Write-Host '  CONNECT FROM ANY MOBILE OR SECOND DESKTOP:' -ForegroundColor Cyan; Write-Host '============================================================' -ForegroundColor Cyan; Write-Host ''; $ips = Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.InterfaceAlias -notlike '*Loopback*' -and $_.IPAddress -notlike '169.254*' -and $_.IPAddress -notlike '127*' }; if ($ips) { foreach ($ip in $ips) { Write-Host ('  [' + $ip.InterfaceAlias + ']') -ForegroundColor Gray; Write-Host ('  http://' + $ip.IPAddress + ':3000') -ForegroundColor Yellow; Write-Host ('  Direct Demo: http://' + $ip.IPAddress + ':3000/api/auth/demo') -ForegroundColor Green; Write-Host '' } } else { Write-Host '  No active Wi-Fi / LAN connection found.' -ForegroundColor Red }; Write-Host '------------------------------------------------------------'; Write-Host 'Tips:'; Write-Host '1. Phone and PC must be connected to the SAME Wi-Fi router.'; Write-Host '2. Run desktop\ALLOW-MOBILE-WIFI-FIREWALL.bat once as Admin.'; Write-Host '3. Keep this or the start window open while using the app.'; Write-Host '============================================================'; Write-Host ''"

echo.
pause
