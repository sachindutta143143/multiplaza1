@echo off
setlocal EnableDelayedExpansion
title Multi Plaza - Mobile ^& Wi-Fi Firewall Unlock
color 0E
cd /d "%~dp0.."

echo ============================================================
echo   Multi Plaza - Windows Firewall Unlock for Mobile Access
echo ============================================================
echo.
echo Requesting Administrator permissions...
echo Please click "YES" on the Windows prompt.
echo.

powershell -NoProfile -ExecutionPolicy Bypass -Command "$ruleName = 'Multi Plaza Port 3000'; $script = { netsh advfirewall firewall delete rule name='Multi Plaza Port 3000' | Out-Null; netsh advfirewall firewall add rule name='Multi Plaza Port 3000' dir=in action=allow protocol=TCP localport=3000 profile=any | Out-Null; try { $nodePath = (Get-Command node -ErrorAction SilentlyContinue).Source; if ($nodePath) { netsh advfirewall firewall delete rule name='Multi Plaza Node' | Out-Null; netsh advfirewall firewall add rule name='Multi Plaza Node' dir=in action=allow program=$nodePath profile=any | Out-Null } } catch {}; Write-Host ''; Write-Host '============================================================' -ForegroundColor Green; Write-Host '  [SUCCESS] Port 3000 and Node.js are now allowed!' -ForegroundColor Green; Write-Host '============================================================' -ForegroundColor Green; Write-Host ''; Write-Host 'Detected IP Addresses on this PC:'; Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.InterfaceAlias -notlike '*Loopback*' -and $_.IPAddress -notlike '169.254*' -and $_.IPAddress -notlike '127*' } | ForEach-Object { Write-Host ('  -> Mobile URL: http://' + $_.IPAddress + ':3000') -ForegroundColor Yellow }; Write-Host ''; Write-Host 'Press any key to close this window...'; [Console]::ReadKey() | Out-Null }; Start-Process powershell -Verb RunAs -ArgumentList '-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', $script"

exit /b 0
