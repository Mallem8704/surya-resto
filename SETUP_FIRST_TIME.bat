@echo off
title Surya Restaurant - One-Time Setup
color 0E

echo ======================================================================
echo     SURYA FAMILY RESTAURANT KADIRI - ONE-TIME PC SETUP
echo ======================================================================
echo.
echo This will install everything needed to run the POS system.
echo Run this ONCE on a fresh Windows PC.
echo.
pause

:: ====================================================================
:: STEP 1: Check Python
:: ====================================================================
echo.
echo [1/5] Checking Python installation...
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo       [!] Python not found. Please install Python 3.11+ from:
    echo           https://www.python.org/downloads/
    echo           IMPORTANT: Check "Add Python to PATH" during install!
    echo.
    start "" "https://www.python.org/downloads/"
    echo       After installing Python, run this setup script again.
    pause
    exit /b 1
) else (
    for /f "tokens=*" %%i in ('python --version') do echo       [OK] %%i found.
)

:: ====================================================================
:: STEP 2: Check Node.js
:: ====================================================================
echo.
echo [2/5] Checking Node.js installation...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo       [!] Node.js not found. Please install Node.js 20+ from:
    echo           https://nodejs.org/
    echo.
    start "" "https://nodejs.org/"
    echo       After installing Node.js, run this setup script again.
    pause
    exit /b 1
) else (
    for /f "tokens=*" %%i in ('node --version') do echo       [OK] Node.js %%i found.
)

:: ====================================================================
:: STEP 3: Install Backend Dependencies
:: ====================================================================
echo.
echo [3/5] Setting up Backend (Python virtual environment + packages)...
cd /d "%~dp0backend"

if not exist "venv" (
    echo       Creating Python virtual environment...
    python -m venv venv
)

echo       Installing backend packages (this may take 2-3 minutes)...
.\venv\Scripts\pip.exe install -r requirements.txt -q
echo       [OK] Backend dependencies installed.

:: ====================================================================
:: STEP 4: Install Frontend Dependencies
:: ====================================================================
echo.
echo [4/5] Setting up Frontend (Node.js packages)...
cd /d "%~dp0frontend"

if not exist "node_modules" (
    echo       Installing frontend packages (this may take 3-5 minutes)...
    call npm install
) else (
    echo       [OK] Frontend packages already installed.
)

:: ====================================================================
:: STEP 5: Add to Windows Startup (Auto-start on boot)
:: ====================================================================
echo.
echo [5/5] Setting up Auto-Start on Windows boot...

set "STARTUP_FOLDER=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup"
set "SHORTCUT_PATH=%STARTUP_FOLDER%\SuryaPOS.lnk"
set "BAT_PATH=%~dp0start_surya_pos.bat"

:: Create a VBS script to make a shortcut (Windows doesn't have a native command for this)
set "VBS_TEMP=%TEMP%\create_shortcut.vbs"
echo Set oWS = WScript.CreateObject("WScript.Shell") > "%VBS_TEMP%"
echo sLinkFile = "%SHORTCUT_PATH%" >> "%VBS_TEMP%"
echo Set oLink = oWS.CreateShortcut(sLinkFile) >> "%VBS_TEMP%"
echo oLink.TargetPath = "%BAT_PATH%" >> "%VBS_TEMP%"
echo oLink.WorkingDirectory = "%~dp0" >> "%VBS_TEMP%"
echo oLink.WindowStyle = 7 >> "%VBS_TEMP%"
echo oLink.Description = "Surya Family Restaurant POS Auto-Launcher" >> "%VBS_TEMP%"
echo oLink.Save >> "%VBS_TEMP%"

cscript //nologo "%VBS_TEMP%"
del "%VBS_TEMP%"

if exist "%SHORTCUT_PATH%" (
    echo       [OK] Auto-start shortcut created in Windows Startup folder.
    echo       [OK] POS will launch automatically every time this PC turns on.
) else (
    echo       [!] Could not create auto-start shortcut. You can manually:
    echo           1. Press Win+R, type: shell:startup
    echo           2. Copy a shortcut to start_surya_pos.bat into that folder
)

:: ====================================================================
:: DONE
:: ====================================================================
echo.
echo ======================================================================
echo   SETUP COMPLETE! Here's how it works:
echo.
echo   * Turn on the PC  -->  POS starts automatically
echo   * Or double-click  start_surya_pos.bat  anytime
echo.
echo   Access Points:
echo   * Cashier POS   : http://localhost:3002/admin/pos
echo   * Kitchen KDS   : http://localhost:3002/admin/kds
echo   * Admin Panel   : http://localhost:3002/admin
echo   * Customer Menu : http://localhost:3002/order?table=1
echo   * Delivery      : http://localhost:3002/delivery
echo ======================================================================
echo.
echo Would you like to start the POS now? (Press any key)
pause >nul

cd /d "%~dp0"
call start_surya_pos.bat
