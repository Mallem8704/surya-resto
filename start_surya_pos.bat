@echo off
title Surya Family Restaurant Kadiri - POS System
color 0E

echo ======================================================================
echo      SURYA FAMILY RESTAURANT KADIRI - POS LAUNCHER
echo      Dhandubatu Street, Bypass Road, Kadiri, AP 515591
echo ======================================================================
echo.

:: ====================================================================
:: STEP 1: Start Backend API Server
:: ====================================================================
echo [1/3] Starting Backend API Server...

netstat -ano | findstr ":8000 " | findstr "LISTENING" >nul 2>&1
if %errorlevel% equ 0 (
    echo       [OK] Backend already running on port 8000.
) else (
    cd /d "%~dp0backend"
    if not exist "venv\Scripts\python.exe" (
        echo       [ERROR] Python venv not found! Run SETUP_FIRST_TIME.bat first.
        pause
        exit /b 1
    )
    start /min "Surya-Backend" ".\venv\Scripts\python.exe" -m uvicorn app.main:app --port 8000 --host 0.0.0.0
    echo       [OK] Backend starting...

    :: Wait for backend to be ready (max 30 seconds)
    echo       Waiting for API to respond...
    for /l %%i in (1,1,15) do (
        timeout /t 2 /nobreak >nul
        curl -s http://127.0.0.1:8000/api/health >nul 2>&1
        if !errorlevel! equ 0 goto backend_ready
    )
    echo       [WARN] Backend took longer than expected. Continuing anyway...
)
:backend_ready
echo       [OK] Backend API is live.

:: ====================================================================
:: STEP 2: Start Frontend Web Interface
:: ====================================================================
echo.
echo [2/3] Starting Frontend POS Interface...

netstat -ano | findstr ":3002 " | findstr "LISTENING" >nul 2>&1
if %errorlevel% equ 0 (
    echo       [OK] Frontend already running on port 3002.
) else (
    cd /d "%~dp0frontend"
    if not exist "node_modules" (
        echo       [ERROR] npm packages not installed! Run SETUP_FIRST_TIME.bat first.
        pause
        exit /b 1
    )
    start /min "Surya-Frontend" cmd /c "npm run dev -- -p 3002"
    echo       [OK] Frontend starting...
    timeout /t 5 /nobreak >nul
)
echo       [OK] Frontend POS is live.

:: ====================================================================
:: STEP 3: Open POS in Browser (Chrome kiosk mode for silent printing)
:: ====================================================================
echo.
echo [3/3] Opening Cashier POS in browser...

set "POS_URL=http://localhost:3002/admin/pos"

:: Try Chrome with kiosk printing (best for thermal receipts)
if exist "%ProgramFiles%\Google\Chrome\Application\chrome.exe" (
    start "" "%ProgramFiles%\Google\Chrome\Application\chrome.exe" --kiosk-printing --app="%POS_URL%"
    goto :launched
)
if exist "%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe" (
    start "" "%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe" --kiosk-printing --app="%POS_URL%"
    goto :launched
)
if exist "%LocalAppData%\Google\Chrome\Application\chrome.exe" (
    start "" "%LocalAppData%\Google\Chrome\Application\chrome.exe" --kiosk-printing --app="%POS_URL%"
    goto :launched
)

:: Try Microsoft Edge as fallback
if exist "%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe" (
    start "" "%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe" --kiosk-printing --app="%POS_URL%"
    goto :launched
)

:: Default browser fallback
start "" "%POS_URL%"

:launched
echo.
echo ======================================================================
echo   SURYA POS IS LIVE! READY FOR BUSINESS!
echo.
echo   Cashier POS    : http://localhost:3002/admin/pos
echo   Kitchen KDS    : http://localhost:3002/admin/kds
echo   Captain Tablet : http://localhost:3002/captain
echo   Admin Panel    : http://localhost:3002/admin
echo   Customer Menu  : http://localhost:3002/order?table=1
echo   UPI VPA        : 9880358634@upi
echo.
echo   DO NOT CLOSE THIS WINDOW during restaurant shift.
echo ======================================================================
echo.

:: Keep window open (minimized) - closing this won't kill the servers
:: The servers run in their own background windows
timeout /t 10 >nul
exit
