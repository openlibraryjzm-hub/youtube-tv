# MKV to MP4 Batch Converter
# Converts all MKV files in a folder to MP4 format using FFmpeg
# 
# Usage:
#   1. Right-click this script and "Run with PowerShell"
#   2. Or run: .\convert-mkv-to-mp4.ps1
#
# Requirements:
#   - FFmpeg must be installed and in your PATH
#   - Test with: ffmpeg -version

param(
    [string]$InputFolder = "",
    [string]$OutputFolder = ""
)

# Check if FFmpeg is available
try {
    $ffmpegVersion = ffmpeg -version 2>&1 | Select-Object -First 1
    Write-Host "✅ FFmpeg found: $ffmpegVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ ERROR: FFmpeg not found!" -ForegroundColor Red
    Write-Host "Please install FFmpeg and add it to your PATH." -ForegroundColor Yellow
    Write-Host "Download from: https://ffmpeg.org/download.html" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Press any key to exit..."
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
    exit 1
}

# Get input folder if not provided
if ([string]::IsNullOrEmpty($InputFolder)) {
    Add-Type -AssemblyName System.Windows.Forms
    $folderDialog = New-Object System.Windows.Forms.FolderBrowserDialog
    $folderDialog.Description = "Select folder containing MKV files to convert"
    $folderDialog.ShowNewFolderButton = $false
    
    if ($folderDialog.ShowDialog() -eq [System.Windows.Forms.DialogResult]::OK) {
        $InputFolder = $folderDialog.SelectedPath
    } else {
        Write-Host "No folder selected. Exiting." -ForegroundColor Yellow
        exit 0
    }
}

# Validate input folder
if (-not (Test-Path $InputFolder)) {
    Write-Host "❌ ERROR: Input folder does not exist: $InputFolder" -ForegroundColor Red
    exit 1
}

# Set output folder (default: "converted" subfolder in input folder)
if ([string]::IsNullOrEmpty($OutputFolder)) {
    $OutputFolder = Join-Path $InputFolder "converted"
}

# Create output folder if it doesn't exist
if (-not (Test-Path $OutputFolder)) {
    New-Item -ItemType Directory -Path $OutputFolder | Out-Null
    Write-Host "✅ Created output folder: $OutputFolder" -ForegroundColor Green
}

Write-Host ""
Write-Host "📁 Input folder:  $InputFolder" -ForegroundColor Cyan
Write-Host "📁 Output folder: $OutputFolder" -ForegroundColor Cyan
Write-Host ""

# Find all MKV files
$mkvFiles = Get-ChildItem -Path $InputFolder -Filter "*.mkv" -File
$mkvFiles += Get-ChildItem -Path $InputFolder -Filter "*.MKV" -File

if ($mkvFiles.Count -eq 0) {
    Write-Host "⚠️  No MKV files found in: $InputFolder" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Press any key to exit..."
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
    exit 0
}

Write-Host "Found $($mkvFiles.Count) MKV file(s) to convert" -ForegroundColor Green
Write-Host ""

# Confirm before starting
$confirm = Read-Host "Continue with conversion? (Y/N)"
if ($confirm -ne "Y" -and $confirm -ne "y") {
    Write-Host "Conversion cancelled." -ForegroundColor Yellow
    exit 0
}

Write-Host ""
Write-Host "🔄 Starting conversion..." -ForegroundColor Cyan
Write-Host ""

$successCount = 0
$errorCount = 0
$startTime = Get-Date

foreach ($mkvFile in $mkvFiles) {
    $fileName = [System.IO.Path]::GetFileNameWithoutExtension($mkvFile.Name)
    $outputFile = Join-Path $OutputFolder "$fileName.mp4"
    
    Write-Host "📹 Converting: $($mkvFile.Name)" -ForegroundColor White
    Write-Host "   → $([System.IO.Path]::GetFileName($outputFile))" -ForegroundColor Gray
    
    # FFmpeg command - FAST MODE (remux/copy streams)
    # This is MUCH faster - copies streams without re-encoding
    # Works if video is H.264 and audio is AAC (most common case)
    # If this fails, the script will try slow mode automatically
    $ffmpegArgs = @(
        "-i", "`"$($mkvFile.FullName)`"",
        "-c:v", "copy",      # Copy video stream (no re-encoding - FAST!)
        "-c:a", "copy",      # Copy audio stream (no re-encoding - FAST!)
        "-movflags", "+faststart",
        "-y",
        "-loglevel", "error",
        "`"$outputFile`""
    )
    
    try {
        $process = Start-Process -FilePath "ffmpeg" -ArgumentList $ffmpegArgs -Wait -NoNewWindow -PassThru
        
        if ($process.ExitCode -eq 0) {
            $fileSize = (Get-Item $outputFile).Length / 1MB
            Write-Host "   ✅ Success ($([math]::Round($fileSize, 2)) MB)" -ForegroundColor Green
            $successCount++
        } else {
            # Fast mode failed - try slow mode (re-encode)
            Write-Host "   ⚠️  Fast mode failed, trying slow mode (re-encode)..." -ForegroundColor Yellow
            
            $slowArgs = @(
                "-i", "`"$($mkvFile.FullName)`"",
                "-c:v", "libx264",
                "-c:a", "aac",
                "-preset", "veryfast",
                "-crf", "23",
                "-movflags", "+faststart",
                "-y",
                "-loglevel", "error",
                "`"$outputFile`""
            )
            
            $slowProcess = Start-Process -FilePath "ffmpeg" -ArgumentList $slowArgs -Wait -NoNewWindow -PassThru
            
            if ($slowProcess.ExitCode -eq 0) {
                $fileSize = (Get-Item $outputFile).Length / 1MB
                Write-Host "   ✅ Success with slow mode ($([math]::Round($fileSize, 2)) MB)" -ForegroundColor Green
                $successCount++
            } else {
                Write-Host "   ❌ Failed (Exit code: $($slowProcess.ExitCode))" -ForegroundColor Red
                $errorCount++
            }
        }
    } catch {
        Write-Host "   ❌ Error: $_" -ForegroundColor Red
        $errorCount++
    }
    
    Write-Host ""
}

$endTime = Get-Date
$duration = $endTime - $startTime

Write-Host "═══════════════════════════════════════" -ForegroundColor Cyan
Write-Host "Conversion Complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Total files:    $($mkvFiles.Count)" -ForegroundColor White
Write-Host "Success:        $successCount" -ForegroundColor Green
Write-Host "Errors:         $errorCount" -ForegroundColor $(if ($errorCount -gt 0) { "Red" } else { "White" })
Write-Host "Time elapsed:   $($duration.ToString('mm\:ss'))" -ForegroundColor White
Write-Host ""
Write-Host "Output folder:  $OutputFolder" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# Open output folder if successful
if ($successCount -gt 0) {
    $openFolder = Read-Host "Open output folder? (Y/N)"
    if ($openFolder -eq "Y" -or $openFolder -eq "y") {
        Start-Process explorer.exe -ArgumentList $OutputFolder
    }
}

Write-Host "Press any key to exit..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
