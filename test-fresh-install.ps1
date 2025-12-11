# Quick Fresh Install Test Script
# This sets a test database path to simulate a fresh install

Write-Host "=== Fresh Install Test ===" -ForegroundColor Cyan
Write-Host ""

# Set test database location
$testDbPath = "$PWD\test-fresh-db"
$env:DATABASE_PATH = "$testDbPath\youtube-tv.db"

# Clean up old test database
if (Test-Path $testDbPath) {
    Write-Host "Cleaning up old test database..." -ForegroundColor Yellow
    Remove-Item -Recurse -Force $testDbPath -ErrorAction SilentlyContinue
}

# Create fresh test directory
New-Item -ItemType Directory -Path $testDbPath -Force | Out-Null

Write-Host "✅ Test database path set: $env:DATABASE_PATH" -ForegroundColor Green
Write-Host ""
Write-Host "To test:" -ForegroundColor Yellow
Write-Host "1. Run your app (it will use the test database)" -ForegroundColor White
Write-Host "2. Make some changes" -ForegroundColor White
Write-Host "3. Close and reopen app" -ForegroundColor White
Write-Host "4. Verify changes persist" -ForegroundColor White
Write-Host ""
Write-Host "Database location: $env:DATABASE_PATH" -ForegroundColor Cyan
Write-Host ""
Write-Host "Press any key to continue (or close this window to cancel)..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

# Keep environment variable set for this session
Write-Host ""
Write-Host "⚠️  Note: DATABASE_PATH is set for this PowerShell session only" -ForegroundColor Yellow
Write-Host "   To test, run your app from THIS PowerShell window" -ForegroundColor Yellow
Write-Host "   Or set the environment variable in your app's launch script" -ForegroundColor Yellow

