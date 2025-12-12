# Push to GitHub - Auto-updated by AI
# Usage: .\push-to-github.ps1
# 
# NOTE: This script's commit message is updated by AI when user requests a push.
# The AI analyzes all changes since last push and updates the commit message below.

Write-Host "Pushing changes to GitHub..." -ForegroundColor Cyan

# Stage all changes
Write-Host "Staging all changes..." -ForegroundColor Yellow
git add .

# Commit message (updated by AI when user requests push)
# AI analyzes all changes since last push and updates this message
$tempFile = "commit-msg-temp.txt"
$commitMessage = @"
[AI] Major Updates: Thumbnail System, Local Video Playback, Lazy Loading, MKV Support (Fixed)

Recent Changes:
- Fixed thumbnail loading: Switched from data URLs to blob URLs for reliable local file thumbnails
- Fixed playlist cover thumbnails: Now use async ThumbnailImage component for all playlist covers
- Improved local video playback: Always start at 0:00, smooth autoplay to next video, fixed pause/unpause glitches
- Implemented lazy loading: Video files only loaded when selected to play (prevents 6GB+ memory crashes)
- Fixed MKV file support: Added MKV to main Video Files filter with case-insensitive support (mkv, MKV)
- Fixed video seeking: Removed aggressive currentTime resets that prevented scrubbing
- Fixed first pause reset bug: Removed thumbnail extraction reset that caused video to jump to 0:00
- Added asset protocol configuration: Configured Tauri asset protocol scope for thumbnail access
- Enhanced error handling: Better error messages for large/corrupted video files

Technical Improvements:
- Thumbnails now use Tauri fs plugin to read files and create blob URLs (same pattern as videos)
- Local videos simplified: No progress saving, always start fresh at 0:00, smooth transitions
- Lazy loading prevents memory issues with large playlists (6GB+ folders now work)
- MKV file dialog fix: Added MKV to main Video Files filter in both file dialog locations
  - Updated "Add videos to playlist" dialog
  - Updated "Add local folder" dialog (individual files option)
  - Added case-insensitive support (both 'mkv' and 'MKV' extensions)
  - Kept separate MKV Files filter for explicit selection

Files Modified:
- app/page.jsx: Thumbnail system, local video playback, lazy loading, MKV file dialog filters
- src-tauri/tauri.conf.json: Added asset protocol configuration, blob: support in CSP
- push-to-github.ps1: Updated commit message
- RECENT-UPDATES-2025-01-10.md: Added MKV fix documentation

Key Features:
✅ Thumbnails work reliably for local files (blob URLs)
✅ Playlist covers show thumbnails correctly
✅ Local videos play smoothly without glitches
✅ Large playlists (6GB+) work without crashing
✅ MKV files can be added and played (file dialog now shows them)
✅ Video seeking/scrubbing works properly
✅ No pause/unpause glitches
✅ MKV upload working - files visible in file picker
"@

# Write to temp file
$commitMessage | Out-File -FilePath $tempFile -Encoding utf8

Write-Host "Creating commit..." -ForegroundColor Yellow
git commit -F $tempFile

# Clean up temp file
Remove-Item $tempFile -ErrorAction SilentlyContinue

if ($LASTEXITCODE -eq 0) {
    Write-Host "Commit successful!" -ForegroundColor Green
    Write-Host "Pushing to GitHub..." -ForegroundColor Yellow
    git push origin main
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Push successful!" -ForegroundColor Green
        Write-Host "View commits at: https://github.com/openlibraryjzm-hub/youtube-tv/commits/main" -ForegroundColor Cyan
    } else {
        Write-Host "Push failed!" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "Commit failed!" -ForegroundColor Red
    exit 1
}
