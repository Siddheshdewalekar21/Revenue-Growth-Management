@echo off
REM ============================================================================
REM RGM Tool - Initial Setup Script
REM Sets up Python virtual environment and Node dependencies
REM ============================================================================

setlocal enabledelayedexpansion

color 0A
title RGM Tool - Setup

echo.
echo ============================================================================
echo   RGM Tool - Initial Setup
echo ============================================================================
echo.

REM Check if Python is installed
python --version >nul 2>&1
if errorlevel 1 (
    color 0C
    echo ERROR: Python is not installed or not in PATH
    echo.
    echo Please install Python 3.8+ from: https://www.python.org/
    echo Make sure to check "Add Python to PATH" during installation
    echo.
    pause
    exit /b 1
)

echo Python version:
python --version
echo.

REM Check if Node.js is installed
node --version >nul 2>&1
if errorlevel 1 (
    color 0C
    echo ERROR: Node.js is not installed or not in PATH
    echo.
    echo Please install Node.js from: https://nodejs.org/
    echo.
    pause
    exit /b 1
)

echo Node.js version:
node --version
echo.

REM Navigate to project directory
cd /d "%~dp0my-essential-tool-main"

if not exist "package.json" (
    color 0C
    echo ERROR: package.json not found
    echo Current directory: %cd%
    echo.
    pause
    exit /b 1
)

echo Current directory: %cd%
echo.

REM Step 1: Install Node dependencies
echo ============================================================================
echo Step 1: Installing Node.js dependencies...
echo ============================================================================
call npm install
if errorlevel 1 (
    color 0C
    echo ERROR: Failed to install Node dependencies
    pause
    exit /b 1
)
echo Done!
echo.

REM Step 2: Setup Python virtual environment
echo ============================================================================
echo Step 2: Setting up Python virtual environment...
echo ============================================================================

cd /d "%~dp0my-essential-tool-main\python-backend"

if exist ".venv" (
    echo Virtual environment found, verifying...
    if not exist ".venv\Scripts\python.exe" (
        echo Virtual environment corrupted, recreating...
        rmdir /s /q ".venv" >nul 2>&1
        python -m venv .venv
    )
) else (
    echo Creating virtual environment...
    python -m venv .venv
    if errorlevel 1 (
        color 0C
        echo ERROR: Failed to create virtual environment
        cd /d "%~dp0"
        pause
        exit /b 1
    )
    echo Virtual environment created!
)

echo.
echo Activating virtual environment...
call .venv\Scripts\activate.bat
if errorlevel 1 (
    color 0C
    echo ERROR: Failed to activate virtual environment
    echo Ensure .venv path is valid: %cd%\.venv
    cd /d "%~dp0"
    pause
    exit /b 1
)

echo Virtual environment activated successfully
echo.
echo Installing Python dependencies...
echo This may take 2-3 minutes...
echo.
pip install -r requirements.txt --quiet
if errorlevel 1 (
    color 0C
    echo ERROR: Failed to install Python dependencies
    echo.
    echo Try running manually:
    echo   cd python-backend
    echo   .venv\Scripts\activate.bat
    echo   pip install -r requirements.txt
    echo.
    cd /d "%~dp0"
    pause
    exit /b 1
)
echo Done!
echo.

REM Step 3: Create .env file if it doesn't exist
cd /d "%~dp0my-essential-tool-main"

if not exist ".env" (
    echo ============================================================================
    echo Step 3: Creating .env file...
    echo ============================================================================
    (
        echo MONGODB_URI=mongodb://localhost:27017
        echo SUPABASE_URL=your_supabase_url_here
        echo SUPABASE_KEY=your_supabase_key_here
    ) > .env
    echo .env file created. Please update with your actual credentials.
    echo.
) else (
    echo .env file already exists
    echo.
)

REM Verify Python venv
echo ============================================================================
echo Verifying installation...
echo ============================================================================
cd /d "%~dp0my-essential-tool-main\python-backend"
call .venv\Scripts\activate.bat
python --version
echo.

REM Complete
color 0B
echo ============================================================================
echo   Setup Complete!
echo ============================================================================
echo.
echo Next steps:
echo 1. Update .env file with your actual credentials (if needed)
echo 2. Ensure MongoDB is running (local or Atlas)
echo 3. Run start.bat to start the services
echo.
pause
