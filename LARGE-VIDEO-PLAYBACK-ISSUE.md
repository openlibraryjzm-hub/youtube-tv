# Large MP4 Video Playback Issue - Technical Deep Dive

## Project Context
- **App**: YouTube TV (Tauri v2 desktop app, Next.js frontend, Rust backend)
- **Goal**: Play local video files of any size without memory explosion
- **Current Status**: Small files (<50MB) work perfectly with blob URLs. Large files (>50MB) fail to play despite streaming server working.

## What's Working ✅

### Mini HTTP Server (Rust)
- **Status**: ✅ Fully functional
- **Implementation**: `tiny_http` server on random port (e.g., `127.0.0.1:56562`)
- **Features**:
  - HTTP Range support (206 Partial Content) ✅
  - Proper Content-Type headers (`video/mp4`) ✅
  - MIME type detection via `mime_guess` ✅
  - Server responds correctly to all requests ✅

### Network Requests
- **Status**: ✅ Working perfectly
- **Evidence from Network Tab**:
  ```
  Request URL: http://127.0.0.1:56562/video/C%3A%5CUsers%5C...
  Status Code: 206 Partial Content
  Content-Type: video/mp4
  Content-Range: bytes 0-382612807/382612808
  Server: tiny-http (Rust)
  ```
- **Conclusion**: Server is streaming correctly, browser is receiving data

### CSP Configuration
- **Status**: ✅ Fixed
- **Solution**: Added `http://127.0.0.1:*` to `media-src` in `tauri.conf.json`
- **Result**: No more "Media load rejected by URL safety check" errors

## What's NOT Working ❌

### Video Element Playback
- **Symptom**: Video element loads (`loadstart` fires) but never progresses
- **No Events Fired**:
  - ❌ `loadedmetadata` - never fires
  - ❌ `canplay` - never fires
  - ❌ `canplaythrough` - never fires
- **Video State**:
  - `readyState`: 0 (HAVE_NOTHING)
  - `networkState`: 3 (NETWORK_NO_SOURCE)
  - Player appears greyed out, unresponsive

### In-Place Faststart
- **Status**: ❌ Failing
- **Error**: `FFmpeg in-place faststart failed. Exit code: Some(-1094995529)`
- **Attempted Solution**: Temp file approach (write to `.tmp`, then rename)
- **Issue**: FFmpeg command fails before we can test the temp file approach

## Technical Details

### Current Architecture

**Small Files (<50MB)**:
- Uses blob URLs (`URL.createObjectURL`)
- Loads entire file into memory
- Works perfectly ✅

**Large Files (>50MB)**:
- Uses mini HTTP server (`http://127.0.0.1:PORT/video/ENCODED_PATH`)
- Streams via HTTP Range requests
- Server works ✅, but video element fails ❌

### Code Flow for Large Files

1. **File Detection**: Check size → if >50MB, use streaming
2. **Server Initialization**: `start_video_server()` → returns port
3. **URL Creation**: `http://127.0.0.1:PORT/video/ENCODED_PATH`
4. **Video Element Setup**: 
   - Create `<source>` element with `type="video/mp4"`
   - Append to `<video>` element
   - Call `video.load()`
5. **Result**: `loadstart` fires, then nothing

### File Structure Issue

**The Problem**:
- MP4 files store metadata (moov atom) at the END by default
- When streaming, browser needs metadata at the START
- Without `+faststart`, browser can't read metadata without downloading entire file
- For 364MB file, this defeats the purpose of streaming

**Attempted Solution**:
- Auto-preprocessing: Add `+faststart` in-place when files are added
- Command: `ffmpeg -i file.mp4 -c copy -movflags +faststart -y file.tmp && rename file.tmp file.mp4`
- **Status**: Failing with exit code `-1094995529`

## Error Analysis

### Console Logs
```
✅ [DEBUG] Video server running on port: 56562
✅ [DEBUG] Using HTTP streaming URL: http://127.0.0.1:56562/video/...
✅ [DEBUG] MIME type: video/mp4
🔄 [DEBUG] Video loadstart - beginning to load
[Then nothing - no loadedmetadata, no canplay, no errors]
```

### Network Tab
- **Request**: `GET http://127.0.0.1:56562/video/...`
- **Response**: `206 Partial Content`
- **Headers**: All correct (Content-Type, Content-Range, Accept-Ranges)
- **Data**: Being received (382MB content-length)

### FFmpeg Error
- **Exit Code**: `-1094995529` (Windows error code)
- **Command**: `ffmpeg -i input.mp4 -c copy -movflags +faststart -y output.tmp`
- **Likely Cause**: File access/permission issue, or FFmpeg can't read file

## What We've Tried

1. ✅ Mini HTTP server with Range support
2. ✅ CSP updates to allow `http://127.0.0.1:*`
3. ✅ `<source>` element with explicit MIME type
4. ✅ Proper Content-Type headers from server
5. ❌ In-place faststart (failing)
6. ❌ Automatic retry on metadata timeout (not reached yet)

## Current Hypothesis

**Primary Issue**: MP4 file structure (moov atom at end)
- Browser can't read metadata when streaming
- Needs `+faststart` to move metadata to beginning
- But `+faststart` is failing during preprocessing

**Secondary Issue**: FFmpeg command failure
- Exit code suggests file access/permission problem
- Or FFmpeg not finding the file
- Or file locked by another process

## Questions for Grok

1. **Why does the video element stop after `loadstart`?**
   - Server is working (206 status)
   - Headers are correct
   - Data is being received
   - But browser won't parse/play it

2. **Is the moov atom location the issue?**
   - Can we detect if moov atom is at end vs beginning?
   - Can browser request end of file first to get metadata?
   - Or is `+faststart` the only solution?

3. **Why is FFmpeg failing?**
   - Exit code `-1094995529` - what does this mean?
   - File permissions? File locked? Path issue?
   - How to debug FFmpeg errors better?

4. **Alternative approaches?**
   - Can we use a different streaming method?
   - Can we detect codec compatibility before streaming?
   - Is there a way to make browser read moov atom from end?

## Files Involved

- **Rust Server**: `src-tauri/src/main.rs` - `start_video_server()` function
- **Rust Preprocessing**: `src-tauri/src/db.rs` - `add_faststart_in_place()` function
- **Frontend Playback**: `app/page.jsx` - `initializePlayer()` function (around line 5450)
- **Tauri Config**: `src-tauri/tauri.conf.json` - CSP settings

## Next Steps Needed

1. **Fix FFmpeg in-place conversion** - Why is it failing?
2. **Alternative**: Try manual faststart on existing files
3. **Debug**: Better error logging from FFmpeg
4. **Fallback**: If faststart fails, show user-friendly error

## Key Constraint

**User Requirement**: 
- No noticeable delay in user experience
- No extra files created
- Fast processing (seconds, not minutes)

This rules out full re-encoding, but `+faststart` should be fast enough (just reorganizes file structure).
