# Video Debug Guide

## Quick Debug Command

When a large video file isn't playing, run this in the browser console (F12 → Console tab):

```javascript
await window.getVideoDebugReport()
```

This will output a comprehensive diagnostic report showing:

### What It Checks:

1. **Frontend (Video Element) State**
   - Video source URL
   - Network state (loading, error, etc.)
   - Ready state (metadata loaded, etc.)
   - Error codes and messages
   - Buffered ranges
   - Video dimensions

2. **Backend (Rust Server) State**
   - Server port and status
   - File existence and size
   - File readability
   - FFmpeg/FFprobe availability
   - **Moov atom location** (critical for streaming!)
   - Video/audio codecs
   - File format info

3. **Diagnosis**
   - Automatic analysis of common issues
   - Specific error messages
   - Suggested fixes

## Common Issues & Solutions

### ❌ "Moov atom is at the END of the file"
**Problem**: MP4 metadata is at the end, preventing streaming
**Solution**: The file needs `+faststart` applied. This should happen automatically, but if it fails, you'll see FFmpeg errors in the report.

### ❌ "Video server is not running"
**Problem**: The mini HTTP server didn't start
**Solution**: Check if port is blocked or if there's a Rust compilation error

### ❌ "File exists but cannot be read"
**Problem**: File is locked by another process
**Solution**: Close any other apps using the file (VLC, media players, etc.)

### ❌ "FFmpeg is not available"
**Problem**: FFmpeg not installed or not in PATH
**Solution**: Install FFmpeg and ensure it's accessible from command line

### ❌ "VIDEO ELEMENT ERROR: MEDIA_ERR_DECODE"
**Problem**: Browser can't decode the video codec
**Solution**: Check codec compatibility - may need conversion

## Example Output

```
🔍 ========== COMPREHENSIVE VIDEO DEBUG REPORT ==========
🔍 File: C:\Users\...\video.mp4
🔍 Video ID: local:file://C:\Users\...\video.mp4

🔍 ========== FRONTEND (VIDEO ELEMENT) STATE ==========
{
  "videoElementExists": true,
  "videoSrc": "http://127.0.0.1:56562/video/...",
  "videoNetworkState": 2,
  "videoReadyState": 0,
  ...
}

🔍 ========== BACKEND (RUST) STATE ==========
{
  "server_port": 56562,
  "server_running": true,
  "file_exists": true,
  "file_size": 382612808,
  "moov_at_start": false,
  ...
}

🔍 ========== DIAGNOSIS ==========
✅ Server running on port 56562
✅ File exists (364.90 MB)
✅ File is readable
✅ FFmpeg available: ffmpeg version 6.0
❌ CRITICAL ISSUE: Moov atom is at the END of the file!
   → This prevents streaming - browser needs metadata at start
   → Solution: Run add_faststart_in_place() on this file
```

## Tips

- Run the debug command **while the video is trying to load** for most accurate state
- Check the Network tab (F12 → Network) to see HTTP requests to `127.0.0.1`
- Copy the full console output and share it for troubleshooting
