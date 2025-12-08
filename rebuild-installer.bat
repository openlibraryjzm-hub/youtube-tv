@echo off
echo ========================================
echo YouTube TV - Force Rebuild Installer
echo ========================================
echo.

echo Step 1: Cleaning old build artifacts...
if exist .next rmdir /s /q .next
if exist dist rmdir /s /q dist
echo Cleaned!
echo.

echo Step 2: Building Next.js app...
call npm run build
if errorlevel 1 (
    echo ERROR: Next.js build failed!
    pause
    exit /b 1
)
echo Next.js build complete!
echo.

echo Step 3: Verifying standalone build...
call node scripts/verify-standalone.js
if errorlevel 1 (
    echo ERROR: Verification failed!
    pause
    exit /b 1
)
echo Verification complete!
echo.

echo Step 4: Building Electron installer...
echo This may take 1-2 minutes...
call npx electron-builder --win
if errorlevel 1 (
    echo ERROR: Installer build failed!
    pause
    exit /b 1
)
echo.

echo ========================================
echo ✅ BUILD COMPLETE!
echo ========================================
echo.
echo Installer location: dist\YouTube TV Setup 0.1.0.exe
echo.

pause
