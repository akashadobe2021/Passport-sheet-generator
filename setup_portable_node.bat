@echo off
title Setup Portable Node.js for Passport Sheet Studio

echo ====================================================================
echo        PORTABLE NODE.JS SETUP (NO INSTALLATION REQUIRED)
echo ====================================================================
echo.

cd /d "%~dp0"

set "NODE_URL=https://nodejs.org/dist/v24.21.0/node-v24.21.0-win-x64.zip"
set "NODE_ZIP=%~dp0node-v24.21.0-win-x64.zip"

echo [*] Downloading official Node.js v24.21.0 64-bit portable archive...
powershell -NoProfile -ExecutionPolicy Bypass -Command "[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; (New-Object Net.WebClient).DownloadFile('%NODE_URL%', '%NODE_ZIP%')"
if not exist "%NODE_ZIP%" (
    curl -L -o "%NODE_ZIP%" "%NODE_URL%"
)

if not exist "%NODE_ZIP%" (
    echo [ERROR] Failed to download. Please download manually from:
    echo %NODE_URL%
    pause
    exit /b 1
)

echo [*] Extracting to .\node-portable ...
powershell -NoProfile -ExecutionPolicy Bypass -Command "Expand-Archive -Path '%NODE_ZIP%' -DestinationPath '%~dp0node-portable' -Force"
del /f /q "%NODE_ZIP%" 2>nul

:: Verify node.exe exists anywhere inside node-portable
set "FOUND_NODE="
for /f "delims=" %%F in ('dir /b /s "%~dp0node-portable\node.exe" 2^>nul') do (
    set "FOUND_NODE=%%~fF"
)

if defined FOUND_NODE (
    echo.
    echo [SUCCESS] Portable Node.js is ready at:
    echo "%FOUND_NODE%"
    "%FOUND_NODE%" -v
    echo.
    echo You can now simply double-click 'run.bat' anytime to start the app!
) else (
    echo.
    echo [WARNING] Extraction completed, but node.exe was not detected in expected location.
)

echo.
pause
