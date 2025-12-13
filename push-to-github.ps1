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
[AI] Major Feature: Large Local Video Streaming Solution (500MB+ files now work!)

User Request: "alright. can you do a big documentation update on how we were finally able to get large local files working. also update the git push plugin for description to reflect the updates so I can run myself in terminal."

Problem Solved:
- Large video files (500MB+) were causing 8GB+ memory spikes and app crashes
- H.265/HEVC encoded files showed audio-only playback (browsers don't support H.265)
- MP4 files with moov atom at end couldn't stream (browser needs metadata at start)
- FFmpeg couldn't overwrite same file on Windows (file locking issues)

Complete Solution Implemented:

1. Mini HTTP Server (Rust - tiny_http):
   - Lightweight streaming server on 127.0.0.1 (random port)
   - HTTP Range request support (206 Partial Content)
   - Proper MIME type detection and Content-Range headers
   - Streams only requested byte chunks (no memory load)
   - CSP configured to allow local HTTP requests

2. Faststart Preprocessing (FFmpeg):
   - Automatically moves moov atom to beginning of MP4 files
   - Applied to files >50MB when added to playlist
   - Uses temp file approach (required on Windows)
   - Fast: 5-20 seconds for 400MB files (no re-encoding)
   - Multi-strategy fallback (direct overwrite → temp file → repair mode)

3. H.265 to H.264 Auto-Conversion:
   - Detects H.265/HEVC codec automatically
   - Converts to browser-compatible H.264 (x264)
   - Adds faststart during conversion
   - Replaces original file (in-place conversion)
   - Takes 5-15 minutes per file (re-encoding required)

4. Smart File Size Detection:
   - Files >100MB: Always use streaming
   - MP4 files >50MB: Use streaming
   - Files <50MB: Use blob URLs (acceptable memory)
   - Web-ready files: Always use streaming

5. Video Element Setup:
   - Creates <source> element with explicit MIME type
   - Proper error handling and metadata timeout detection
   - Automatic retry with faststart if metadata doesn't load

Technical Details:
- Added Rust dependencies: tiny_http, urlencoding, mime_guess
- FFmpeg commands: -f mp4 flag required for temp files
- CSP updated: http://127.0.0.1:* allowed in media-src
- Codec detection: Uses ffprobe to check video codec
- Error handling: Comprehensive logging and fallback strategies

Files Modified:
- src-tauri/src/main.rs: HTTP server implementation, get_video_debug_info command
- src-tauri/src/db.rs: add_faststart_in_place, convert_hevc_to_h264 functions
- app/page.jsx: Video initialization, streaming logic, codec detection, H.265 conversion
- src-tauri/tauri.conf.json: CSP configuration for local HTTP server
- src-tauri/Cargo.toml: Added tiny_http, urlencoding, mime_guess dependencies
- LARGE-VIDEO-STREAMING-SOLUTION.md: Complete documentation (NEW)
- LARGE-VIDEO-PLAYBACK-ISSUE.md: Problem analysis document (updated)
- push-to-github.ps1: Updated commit message

Key Results:
✅ Large files (500MB+) now stream without memory spikes
✅ No app crashes with large video files
✅ H.265 files automatically converted to H.264
✅ Faststart applied automatically for streaming compatibility
✅ Smooth playback, seeking, and controls work perfectly
✅ Entire playlists of 500MB videos working flawlessly

Supported Formats:
✅ MP4 with H.264 - Fully supported, streaming works
✅ WebM with VP8/VP9 - Should work (streaming-friendly, no faststart needed)
⚠️ MP4 with H.265 - Auto-converts to H.264
⚠️ MKV - Can convert to MP4 (existing functionality)
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
