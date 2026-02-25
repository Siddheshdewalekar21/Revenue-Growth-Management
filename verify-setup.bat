@echo off
REM ============================================================================
REM RGM Tool - Environment Verification Script
REM Checks that Python venv and all dependencies are correctly configured
REM ============================================================================

setlocal enabledelayedexpansion

color 0B
title RGM Tool - Environment Verification

echo.
echo ============================================================================
echo   RGM Tool - Environment Verification
echo ============================================================================
echo.

cd /d "%~dp0my-essential-tool-main"

echo [1/5] Checking virtual environment exists...
if exist "python-backend\.venv\Scripts\python.exe" (
    echo   ✓ Virtual environment found at python-backend\.venv
) else (
    color 0C
    echo   ✗ Virtual environment NOT found!
    echo   Run setup.bat first
    pause
    exit /b 1
)

echo.
echo [2/5] Checking Python in venv...
call python-backend\.venv\Scripts\activate.bat >nul 2>&1
python --version >nul 2>&1
if errorlevel 1 (
    color 0C
    echo   ✗ Python not accessible in venv
    pause
    exit /b 1
) else (
    for /f "tokens=*" %%i in ('python --version') do (
        echo   ✓ %%i
    )
)

echo.
echo [3/5] Checking pip packages...
pip list --quiet >nul 2>&1
if errorlevel 1 (
    color 0C
    echo   ✗ pip not accessible
    pause
    exit /b 1
) else (
    echo   ✓ Checking core packages:
    for %%pkg in (fastapi uvicorn pymongo numpy scikit-learn) do (
        pip show %%pkg >nul 2>&1
        if errorlevel 1 (
            echo     ✗ %%pkg - MISSING
        ) else (
            echo     ✓ %%pkg
        )
    )
)

echo.
echo [4/5] Checking Node.js dependencies...
if not exist "node_modules" (
    echo   ! node_modules not found, may need: npm install
) else (
    echo   ✓ node_modules found
)

echo.
echo [5/5] Checking .env file...
if exist ".env" (
    echo   ✓ .env file exists
) else (
    echo   ! .env file not found (will be created by setup)
)

echo.
color 0A
echo ============================================================================
echo   Environment Verification Complete!
echo ============================================================================
echo.
echo You can now run: start.bat
echo.
pause
