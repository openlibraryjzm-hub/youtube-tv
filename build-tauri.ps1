# Build script for Tauri app
# Usage: .\build-tauri.ps1 [-Clean]

param(
    [switch]$Clean
)

Write-Host "Building YouTube TV Tauri App..." -ForegroundColor Cyan

if ($Clean) {
    Write-Host "Cleaning previous builds..." -ForegroundColor Yellow
    Remove-Item -Recurse -Force out -ErrorAction SilentlyContinue
    Remove-Item -Recurse -Force src-tauri\target -ErrorAction SilentlyContinue
    Write-Host "Clean complete" -ForegroundColor Green
} else {
    Write-Host "Skipping clean (use -Clean for a full clean build)" -ForegroundColor Gray
}

Write-Host "Building Next.js static files..." -ForegroundColor Cyan
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "Next.js build failed!" -ForegroundColor Red
    exit 1
}

Write-Host "Building Tauri app..." -ForegroundColor Cyan
npx tauri build
if ($LASTEXITCODE -ne 0) {
    Write-Host "Tauri build failed!" -ForegroundColor Red
    exit 1
}

# Copy default-channels.json to release directory
Write-Host "Copying default-channels.json to release directory..." -ForegroundColor Cyan
$releaseDir = "src-tauri\target\release"
if (Test-Path "default-channels.json") {
    if (-not (Test-Path $releaseDir)) {
        New-Item -ItemType Directory -Path $releaseDir -Force | Out-Null
    }
    Copy-Item "default-channels.json" -Destination "$releaseDir\default-channels.json" -Force
    Write-Host "Copied default-channels.json to release directory" -ForegroundColor Green
} else {
    Write-Host "WARNING: default-channels.json not found in project root!" -ForegroundColor Yellow
}

Write-Host "Build complete! Installer at: src-tauri\target\release\bundle\nsis\YouTube TV_0.1.0_x64-setup.exe" -ForegroundColor Green

