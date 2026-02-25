@echo off
REM ============================================================================
REM RGM Tool - Complete Environment Startup
REM Starts both frontend (React/Vite) and backend (FastAPI) servers
REM ============================================================================

setlocal enabledelayedexpansion

color 0A
title RGM Tool - Frontend & Backend Server

echo.
echo ============================================================================
echo   RGM Revenue Growth Management Tool - Development Environment
echo ============================================================================
echo.

REM Check if Node.js is installed
node --version >nul 2>&1
if errorlevel 1 (
    color 0C
    echo ERROR: Node.js is not installed or not in PATH
    echo Please install Node.js from https://nodejs.org/
    echo.
    pause
    exit /b 1
)

echo Node.js version:
node --version
echo.

REM Change to project directory
cd /d "%~dp0my-essential-tool-main"

if not exist "package.json" (
    color 0C
    echo ERROR: package.json not found in my-essential-tool-main directory
    echo Current directory: %cd%
    echo.
    pause
    exit /b 1
)

echo Current directory: %cd%
echo.

REM Check if Python venv exists
if not exist "python-backend\.venv\Scripts\python.exe" (
    color 0C
    echo ERROR: Python virtual environment not found!
    echo.
    echo Please run setup.bat first to configure the environment
    echo OR use: python -m venv python-backend\.venv
    echo.
    pause
    exit /b 1
)

echo Python venv detected
echo.

REM Activate Python virtual environment
echo Activating Python virtual environment...
call python-backend\.venv\Scripts\activate.bat
if errorlevel 1 (
    color 0C
    echo ERROR: Failed to activate virtual environment
    echo.
    pause
    exit /b 1
)

echo.
echo Virtual environment activated
echo Python version: 
for /f "tokens=*" %%i in ('python --version') do echo %%i
echo.

REM Check command line arguments
if "%1"=="--no-seed" (
    echo Starting services WITHOUT MongoDB seed...
    echo.
    timeout /t 2 /nobreak
    call npm run dev:all:no-seed
) else (
    echo Starting services with MongoDB seed...
    echo [This will seed the database on first run]
    echo.
    timeout /t 2 /nobreak
    call npm run dev:all
)

REM If we reach here, the services have stopped
color 0E
echo.
echo ============================================================================
echo   Services stopped
echo ============================================================================
echo.
pause
exit /b %errorlevel%
