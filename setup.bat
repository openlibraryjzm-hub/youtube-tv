@echo off
echo Installing YouTube TV...
echo.

REM Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo Node.js is not installed. Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

REM Install dependencies
echo Installing dependencies...
npm install

REM Start the app
echo Starting YouTube TV...
echo.
echo The app will open in your browser at http://localhost:3000
echo Press Ctrl+C to stop the server
echo.
npm run dev
