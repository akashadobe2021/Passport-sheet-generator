@echo off
setlocal enabledelayedexpansion
title Passport Sheet Studio - Diagnostic Launcher

echo ====================================================================
echo        PASSPORT SHEET GENERATOR - ONE-CLICK LAUNCHER
echo ====================================================================
echo.

cd /d "%~dp0"
echo [STEP 1/4] Current Directory: %~dp0
echo.

:: ---------------------------------------------------------
:: 1. Search for Node.js (Portable or System-wide)
:: ---------------------------------------------------------
echo [*] Locating Node.js runtime...
set "NODE_EXE="
set "NPM_CMD="

:: Check 1: Direct in node-portable
if exist "%~dp0node-portable\node.exe" (
    set "NODE_EXE=%~dp0node-portable\node.exe"
    set "NPM_CMD=%~dp0node-portable\npm.cmd"
    set "PATH=%~dp0node-portable;%PATH%"
    echo [OK] Found portable Node.js in .\node-portable
)

:: Check 2: Subfolder in node-portable
if not defined NODE_EXE (
    if exist "%~dp0node-portable\node-v24.21.0-win-x64\node.exe" (
        set "NODE_EXE=%~dp0node-portable\node-v24.21.0-win-x64\node.exe"
        set "NPM_CMD=%~dp0node-portable\node-v24.21.0-win-x64\npm.cmd"
        set "PATH=%~dp0node-portable\node-v24.21.0-win-x64;%PATH%"
        echo [OK] Found portable Node.js in .\node-portable\node-v24.21.0-win-x64
    )
)

:: Check 3: Deep search inside node-portable
if not defined NODE_EXE (
    for /f "delims=" %%F in ('dir /b /s "%~dp0node-portable\node.exe" 2^>nul') do (
        set "NODE_EXE=%%~fF"
        set "NPM_CMD=%%~dpFnpm.cmd"
        set "PATH=%%~dpF;%PATH%"
        echo [OK] Found portable Node.js at %%~fF
    )
)

:: Check 4: System PATH Node.js
if not defined NODE_EXE (
    where node >nul 2>nul
    if %ERRORLEVEL% equ 0 (
        for /f "delims=" %%F in ('where node 2^>nul') do (
            if not defined NODE_EXE set "NODE_EXE=%%~fF"
        )
        for /f "delims=" %%F in ('where npm.cmd 2^>nul') do (
            if not defined NPM_CMD set "NPM_CMD=%%~fF"
        )
        if not defined NPM_CMD (
            for /f "delims=" %%F in ('where npm 2^>nul') do (
                if not defined NPM_CMD set "NPM_CMD=%%~fF"
            )
        )
        echo [OK] Found installed system Node.js: !NODE_EXE!
    )
)

:: ---------------------------------------------------------
:: If Node.js is NOT found, attempt automatic download
:: ---------------------------------------------------------
if not defined NODE_EXE (
    echo [!] Node.js not detected on this computer.
    echo [*] Attempting automatic download of Node.js v24.21.0 portable...
    echo     URL: https://nodejs.org/dist/v24.21.0/node-v24.21.0-win-x64.zip
    echo.

    set "NODE_URL=https://nodejs.org/dist/v24.21.0/node-v24.21.0-win-x64.zip"
    set "NODE_ZIP=%~dp0node-portable-archive.zip"

    powershell -NoProfile -ExecutionPolicy Bypass -Command "[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; (New-Object Net.WebClient).DownloadFile('%NODE_URL%', '%NODE_ZIP%')" 2>nul
    if not exist "%NODE_ZIP%" (
        echo [*] PowerShell download failed. Trying curl fallback...
        curl -L -o "%NODE_ZIP%" "%NODE_URL%"
    )

    if not exist "%NODE_ZIP%" (
        echo.
        echo ====================================================================
        echo [ERROR - STEP 1 FAILED] NODE.JS NOT FOUND AND COULD NOT BE DOWNLOADED
        echo ====================================================================
        echo Details:
        echo 1. Your computer has no Node.js installed in PATH.
        echo 2. No portable Node.js was found in "%~dp0node-portable".
        echo 3. Automated download failed (possibly no internet or blocked by firewall).
        echo.
        echo HOW TO FIX:
        echo 1. Download node-v24.21.0-win-x64.zip from:
        echo    https://nodejs.org/dist/v24.21.0/node-v24.21.0-win-x64.zip
        echo 2. Create a folder named "node-portable" in:
        echo    %~dp0
        echo 3. Extract the zip inside "node-portable" so node.exe is present.
        echo 4. Double click run.bat again.
        echo ====================================================================
        echo.
        pause
        exit /b 1
    )

    echo [*] Extracting portable Node.js into .\node-portable ...
    powershell -NoProfile -ExecutionPolicy Bypass -Command "Expand-Archive -Path '%NODE_ZIP%' -DestinationPath '%~dp0node-portable' -Force"
    del /f /q "%NODE_ZIP%" 2>nul

    for /f "delims=" %%F in ('dir /b /s "%~dp0node-portable\node.exe" 2^>nul') do (
        set "NODE_EXE=%%~fF"
        set "NPM_CMD=%%~dpFnpm.cmd"
        set "PATH=%%~dpF;%PATH%"
    )
)

:: Validate Node.js execution
if not defined NODE_EXE (
    echo.
    echo ====================================================================
    echo [ERROR - STEP 1 FAILED] node.exe is missing.
    echo ====================================================================
    echo Check that node.exe exists in "%~dp0node-portable".
    echo.
    pause
    exit /b 1
)

echo.
echo [STEP 2/4] Testing Node.js runtime execution...
"%NODE_EXE%" -v > "%TEMP%\node_ver.txt" 2>&1
if %ERRORLEVEL% neq 0 (
    echo.
    echo ====================================================================
    echo [ERROR - STEP 2 FAILED] Node.js binary failed to execute!
    echo ====================================================================
    echo Output log:
    type "%TEMP%\node_ver.txt"
    echo.
    echo Possible causes:
    echo - Architecture mismatch (e.g. 64-bit binary on 32-bit Windows).
    echo - Antivirus software blocking node.exe from running.
    echo.
    pause
    exit /b 1
)
set /p VER_OUTPUT=<"%TEMP%\node_ver.txt"
echo [SUCCESS] Node.js is operational: %VER_OUTPUT%
echo.

:: ---------------------------------------------------------
:: 2. Check npm executable
:: ---------------------------------------------------------
if not defined NPM_CMD (
    :: Try finding npm.cmd relative to node.exe
    for %%P in ("%NODE_EXE%") do (
        if exist "%%~dpPnpm.cmd" set "NPM_CMD=%%~dpPnpm.cmd"
        if exist "%%~dpPnode_modules\npm\bin\npm.cmd" set "NPM_CMD=%%~dpPnode_modules\npm\bin\npm.cmd"
    )
)

if not defined NPM_CMD (
    echo ====================================================================
    echo [ERROR - STEP 2 FAILED] npm.cmd could not be located.
    echo ====================================================================
    echo Node was found at: "%NODE_EXE%"
    echo But npm.cmd was not found in the same folder.
    echo.
    pause
    exit /b 1
)

echo [OK] Using Package Manager: "%NPM_CMD%"
echo.

:: ---------------------------------------------------------
:: 3. Check and Install Dependencies
:: ---------------------------------------------------------
echo [STEP 3/4] Checking project dependencies in node_modules...

if not exist "%~dp0node_modules\vite\" (
    echo [!] Dependencies are not installed yet.
    echo [*] Running: npm install --legacy-peer-deps ...
    echo     (Please wait, this takes ~30-60 seconds depending on disk speed)
    echo.
    
    call "%NPM_CMD%" install --legacy-peer-deps
    if %ERRORLEVEL% neq 0 (
        echo.
        echo [!] First install attempt exited with code %ERRORLEVEL%.
        echo [*] Retrying with: npm install --force ...
        call "%NPM_CMD%" install --force
        if %ERRORLEVEL% neq 0 (
            echo.
            echo ====================================================================
            echo [ERROR - STEP 3 FAILED] DEPENDENCY INSTALLATION FAILED
            echo ====================================================================
            echo npm install returned error code %ERRORLEVEL%.
            echo.
            echo Troubleshooting tips:
            echo 1. Check your internet connection.
            echo 2. If npm cache is corrupt, run: "%NPM_CMD%" cache clean --force
            echo 3. Ensure no antivirus is locking files in the node_modules folder.
            echo ====================================================================
            echo.
            pause
            exit /b 1
        )
    )
    echo [SUCCESS] Dependencies installed successfully!
) else (
    echo [SUCCESS] Dependencies already installed in node_modules.
)
echo.

:: ---------------------------------------------------------
:: 4. Launch Vite Dev Server
:: ---------------------------------------------------------
echo [STEP 4/4] Starting Passport Sheet Studio web server...
echo.
echo ====================================================================
echo  PASSPORT SHEET STUDIO IS STARTING
echo  Server Address: http://localhost:3000
echo.
echo  * Opening browser automatically in 2 seconds...
echo  * KEEP THIS WINDOW OPEN while using the application.
echo  * To stop the application, press Ctrl+C or close this window.
echo ====================================================================
echo.

:: Launch browser in background
start "" powershell -NoProfile -ExecutionPolicy Bypass -Command "Start-Sleep -Seconds 2; Start-Process 'http://localhost:3000'" 2>nul

:: Run the Vite development server
call "%NPM_CMD%" run dev

:: If server stops, report exit status
echo.
echo ====================================================================
if %ERRORLEVEL% equ 0 (
    echo [INFO] Web server was stopped normally.
) else (
    echo [ERROR - STEP 4 FAILED] Web server exited with error code %ERRORLEVEL%.
    echo Common reasons:
    echo - Port 3000 may already be in use by another program or tab.
    echo - A file in the project was locked or deleted.
)
echo ====================================================================
echo.
pause
