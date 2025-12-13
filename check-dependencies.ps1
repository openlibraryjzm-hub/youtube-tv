# Dependency Check Script for YouTube TV
Write-Host "🔍 Checking dependencies for YouTube TV..." -ForegroundColor Cyan
Write-Host ""

# Check FFmpeg
Write-Host "1. Checking FFmpeg..." -ForegroundColor Yellow
try {
    $ffmpegVersion = ffmpeg -version 2>&1 | Select-Object -First 1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "   ✅ FFmpeg is installed" -ForegroundColor Green
        Write-Host "   Version: $ffmpegVersion" -ForegroundColor Gray
    } else {
        Write-Host "   ❌ FFmpeg is NOT installed or not in PATH" -ForegroundColor Red
        Write-Host "   Download from: https://ffmpeg.org/download.html" -ForegroundColor Gray
    }
} catch {
    Write-Host "   ❌ FFmpeg is NOT installed or not in PATH" -ForegroundColor Red
    Write-Host "   Download from: https://ffmpeg.org/download.html" -ForegroundColor Gray
}
Write-Host ""

# Check FFprobe
Write-Host "2. Checking FFprobe..." -ForegroundColor Yellow
try {
    $ffprobeVersion = ffprobe -version 2>&1 | Select-Object -First 1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "   ✅ FFprobe is installed" -ForegroundColor Green
        Write-Host "   Version: $ffprobeVersion" -ForegroundColor Gray
    } else {
        Write-Host "   ❌ FFprobe is NOT installed or not in PATH" -ForegroundColor Red
        Write-Host "   (Usually comes with FFmpeg)" -ForegroundColor Gray
    }
} catch {
    Write-Host "   ❌ FFprobe is NOT installed or not in PATH" -ForegroundColor Red
    Write-Host "   (Usually comes with FFmpeg)" -ForegroundColor Gray
}
Write-Host ""

# Check Node.js
Write-Host "3. Checking Node.js..." -ForegroundColor Yellow
try {
    $nodeVersion = node --version
    if ($LASTEXITCODE -eq 0) {
        Write-Host "   ✅ Node.js is installed" -ForegroundColor Green
        Write-Host "   Version: $nodeVersion" -ForegroundColor Gray
    } else {
        Write-Host "   ❌ Node.js is NOT installed" -ForegroundColor Red
    }
} catch {
    Write-Host "   ❌ Node.js is NOT installed" -ForegroundColor Red
}
Write-Host ""

# Check Rust/Cargo
Write-Host "4. Checking Rust/Cargo..." -ForegroundColor Yellow
try {
    $rustVersion = cargo --version
    if ($LASTEXITCODE -eq 0) {
        Write-Host "   ✅ Rust/Cargo is installed" -ForegroundColor Green
        Write-Host "   Version: $rustVersion" -ForegroundColor Gray
    } else {
        Write-Host "   ❌ Rust/Cargo is NOT installed" -ForegroundColor Red
        Write-Host "   Install from: https://rustup.rs/" -ForegroundColor Gray
    }
} catch {
    Write-Host "   ❌ Rust/Cargo is NOT installed" -ForegroundColor Red
    Write-Host "   Install from: https://rustup.rs/" -ForegroundColor Gray
}
Write-Host ""

# Check if ports are available (common video server ports)
Write-Host "5. Checking common ports (127.0.0.1:5000-60000)..." -ForegroundColor Yellow
Write-Host "   (Video server uses random port, this is just a general check)" -ForegroundColor Gray
$testPort = Get-NetTCPConnection -LocalPort 5000 -ErrorAction SilentlyContinue
if ($testPort) {
    Write-Host "   ⚠️  Port 5000 is in use (not necessarily a problem)" -ForegroundColor Yellow
} else {
    Write-Host "   ✅ Port range appears available" -ForegroundColor Green
}
Write-Host ""

# Summary
Write-Host "═══════════════════════════════════════" -ForegroundColor Cyan
Write-Host "Summary:" -ForegroundColor Cyan
Write-Host "  Required: FFmpeg, FFprobe, Node.js, Rust" -ForegroundColor White
Write-Host "  Optional: None" -ForegroundColor Gray
Write-Host "═══════════════════════════════════════" -ForegroundColor Cyan
