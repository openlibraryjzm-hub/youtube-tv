# Large Local Video Streaming Solution - Complete Documentation

## Problem Summary

Large local video files (>100MB, especially 500MB+) were causing:
- **Memory explosions** (8GB+ spikes) when using blob URLs
- **App crashes** when trying to load entire files into memory
- **Audio-only playback** for H.265/HEVC encoded files
- **Greyed-out, unresponsive video players** for large files

## Root Causes Identified

### 1. Memory Issues
- **Blob URLs** (`URL.createObjectURL`) load entire files into memory
- For 500MB files, this caused 8GB+ memory spikes
- Browser couldn't handle the memory load, causing crashes

### 2. MP4 File Structure (Moov Atom)
- MP4 files store metadata (moov atom) at the **end** by default
- Browsers need metadata at the **start** for streaming
- Without faststart, browser must download entire file to read metadata
- This defeats the purpose of streaming

### 3. Codec Compatibility
- **H.265/HEVC** codec is NOT supported by browsers (except Safari on macOS/iOS)
- Files with H.265 show audio-only playback
- Browsers only support: H.264 (AVC), VP8, VP9, AV1

### 4. FFmpeg File Overwrite Limitations
- FFmpeg on Windows **cannot** overwrite the same file it's reading
- Direct overwrite (`-y` flag) fails with "Output same as Input" error
- Required temp file approach with atomic rename

## Complete Solution Architecture

### 1. Mini HTTP Server (Rust - `tiny_http`)

**Purpose**: Stream video files in chunks instead of loading entire file into memory

**Implementation** (`src-tauri/src/main.rs`):
- Lightweight HTTP server on `127.0.0.1:0` (random port)
- Handles `/video/{encoded_path}` requests
- Supports HTTP Range requests (206 Partial Content)
- Proper MIME type detection (`mime_guess` crate)
- Content-Range headers for seeking

**Key Features**:
- **No memory load** - streams only requested byte ranges
- **Efficient seeking** - browser requests only needed chunks
- **206 Partial Content** - proper HTTP streaming protocol
- **CSP configured** - `tauri.conf.json` allows `http://127.0.0.1:*`

### 2. Faststart Preprocessing (FFmpeg)

**Purpose**: Move moov atom to beginning of MP4 files for instant streaming

**Implementation** (`src-tauri/src/db.rs` - `add_faststart_in_place`):
- **Strategy 1**: Direct overwrite (fails on Windows, but tried first)
- **Strategy 2**: Temp file with `-f mp4` flag (required on Windows)
- **Strategy 3**: Repair mode with `-err_detect ignore_err` (handles problematic files)

**Command Used**:
```bash
ffmpeg -i input.mp4 -c copy -f mp4 -movflags +faststart -y output.mp4.tmp
# Then: rename output.mp4.tmp → input.mp4
```

**Key Points**:
- `-c copy`: No re-encoding (fast - seconds even for GB files)
- `-f mp4`: Explicitly specify format (required for `.tmp` extension)
- `-movflags +faststart`: Move moov atom to beginning
- Temp file approach: Required because FFmpeg can't overwrite same file

**When Applied**:
- Automatically for MP4 files >50MB when added to playlist
- Also attempted automatically if video metadata doesn't load within 5 seconds

### 3. H.265 to H.264 Conversion

**Purpose**: Convert unsupported H.265 codec to browser-compatible H.264

**Implementation** (`src-tauri/src/db.rs` - `convert_hevc_to_h264`):
- Detects H.265/HEVC codec using `get_video_debug_info`
- Converts to H.264 with AAC audio
- Adds faststart during conversion
- Replaces original file (in-place conversion)

**Command Used**:
```bash
ffmpeg -i input.mp4 -c:v libx264 -preset fast -crf 23 -c:a aac -b:a 192k -f mp4 -movflags +faststart -y output.mp4.tmp
# Then: rename output.mp4.tmp → input.mp4
```

**Settings**:
- `-preset fast`: Balance between speed and quality
- `-crf 23`: Near-lossless quality
- `-c:a aac -b:a 192k`: Browser-compatible audio

**When Applied**:
- Automatically detected when adding MP4 files to playlist
- Only converts if codec is H.265/HEVC
- Takes several minutes (re-encoding required)

### 4. Smart File Size Detection

**Purpose**: Choose between streaming (large files) and blob URLs (small files)

**Implementation** (`app/page.jsx` - `initializePlayer`):
- Files >100MB: Always use streaming
- MP4 files >50MB: Use streaming (even without faststart)
- Files <50MB: Use blob URLs (acceptable memory usage)
- Web-ready files: Always use streaming

**Logic**:
```javascript
useStreaming = isWebReady || fileSizeMB > 100 || (isMP4 && fileSizeMB > 50);
```

### 5. Video Element Setup

**Purpose**: Properly configure video element for streaming

**Implementation** (`app/page.jsx`):
- Creates `<source>` element with explicit MIME type
- Uses `http://127.0.0.1:PORT/video/ENCODED_PATH` URL
- Proper error handling and metadata timeout detection
- Automatic retry with faststart if metadata doesn't load

## File Flow

### Adding Large MP4 File (>50MB):

1. **File Selection**: User selects MP4 file
2. **Size Check**: File size >50MB detected
3. **Codec Check**: 
   - If H.265 → Convert to H.264 (takes minutes)
   - If H.264 → Add faststart (takes seconds)
4. **File Ready**: File now has moov atom at start + H.264 codec
5. **Playback**: Video uses streaming server (no memory load)

### Playing Large Video:

1. **Server Start**: Mini HTTP server starts on random port
2. **URL Creation**: `http://127.0.0.1:PORT/video/ENCODED_PATH`
3. **Video Element**: Creates `<source>` with MIME type
4. **Browser Request**: Requests byte ranges as needed
5. **Server Response**: Sends 206 Partial Content with requested chunks
6. **Playback**: Smooth streaming, no memory issues

## Supported Formats

### ✅ Fully Supported:
- **MP4 with H.264** - Universal browser support, streaming works
- **WebM with VP8/VP9** - Good browser support, streaming-friendly (no faststart needed)

### ⚠️ Needs Conversion:
- **MP4 with H.265** - Auto-converts to H.264
- **MKV** - Can convert to MP4 (existing functionality)

### ❌ Not Supported:
- AVI, MOV, WMV, FLV - Not browser-native formats

## Technical Details

### HTTP Server Implementation

**Rust Dependencies** (`Cargo.toml`):
```toml
tiny_http = "0.12"      # Lightweight HTTP server
urlencoding = "2.1"     # URL encoding/decoding
mime_guess = "2.0"      # MIME type detection
```

**Server Features**:
- Random port assignment (`127.0.0.1:0`)
- Range request parsing (`bytes=start-end`)
- File seeking to requested byte range
- Proper HTTP headers (Content-Type, Content-Range, Accept-Ranges)
- Error handling (404, 500, etc.)

### CSP Configuration

**File**: `src-tauri/tauri.conf.json`

**Required Changes**:
```json
{
  "security": {
    "csp": "default-src 'self'; ... media-src 'self' asset: http://asset.localhost https://asset.localhost http://127.0.0.1:* blob: ..."
  }
}
```

**Why**: Browser security blocks local HTTP requests unless explicitly allowed in CSP.

### FFmpeg Requirements

**Required Tools**:
- `ffmpeg` - For faststart and conversion
- `ffprobe` - For codec detection

**Commands Used**:
1. **Faststart**: `ffmpeg -i file.mp4 -c copy -f mp4 -movflags +faststart -y file.mp4.tmp`
2. **H.265 Conversion**: `ffmpeg -i file.mp4 -c:v libx264 -preset fast -crf 23 -c:a aac -b:a 192k -f mp4 -movflags +faststart -y file.mp4.tmp`
3. **Codec Detection**: `ffprobe -v error -print_format json -show_format -show_streams file.mp4`

## Performance Characteristics

### Faststart (H.264 MP4):
- **Time**: 5-20 seconds for 400MB files
- **CPU**: Low (just reorganizing file structure)
- **Disk**: Minimal (temp file, then rename)
- **Result**: File ready for streaming

### H.265 to H.264 Conversion:
- **Time**: 5-15 minutes for 400MB files (depends on CPU)
- **CPU**: High (re-encoding video)
- **Disk**: Temp file during conversion
- **Result**: Browser-compatible file

### Streaming Playback:
- **Memory**: Stable (no spikes)
- **Network**: Efficient (only requested chunks)
- **Seeking**: Instant (moov atom at start)
- **Result**: Smooth playback, no crashes

## Error Handling

### Common Issues & Solutions:

1. **"Moov atom not found"**
   - **Cause**: Corrupted or incomplete file
   - **Solution**: File repair attempted automatically, or re-download file

2. **"Output same as Input"**
   - **Cause**: FFmpeg trying to overwrite same file
   - **Solution**: Temp file approach (already implemented)

3. **"Unable to choose output format"**
   - **Cause**: FFmpeg doesn't recognize `.tmp` extension
   - **Solution**: Added `-f mp4` flag to explicitly specify format

4. **Audio-only playback**
   - **Cause**: H.265/HEVC codec not supported
   - **Solution**: Automatic conversion to H.264

5. **No 127.0.0.1 in network tab**
   - **Cause**: Video using blob URL instead of streaming
   - **Solution**: Check file size - should use streaming for >50MB MP4 files

## Testing Checklist

- [x] Large MP4 files (>100MB) stream without memory spikes
- [x] Faststart applied automatically for large MP4 files
- [x] H.265 files automatically converted to H.264
- [x] HTTP server serves files with proper Range support
- [x] Video element loads metadata correctly
- [x] Seeking works smoothly
- [x] No app crashes with large files
- [x] Small files still use blob URLs (acceptable memory usage)

## Future Improvements

1. **Progress indicators** for H.265 conversion (takes minutes)
2. **Batch conversion** for multiple H.265 files
3. **WebM support** testing and optimization
4. **AV1 codec** support (modern, efficient)
5. **Conversion queue** to handle multiple files

## Key Files Modified

1. `src-tauri/src/main.rs` - HTTP server implementation
2. `src-tauri/src/db.rs` - Faststart and H.265 conversion
3. `app/page.jsx` - Video initialization and streaming logic
4. `src-tauri/tauri.conf.json` - CSP configuration
5. `src-tauri/Cargo.toml` - Dependencies (tiny_http, urlencoding, mime_guess)

## Summary

The solution combines:
- **Mini HTTP server** for efficient streaming (no memory load)
- **Faststart preprocessing** for instant metadata access
- **H.265 to H.264 conversion** for browser compatibility
- **Smart file size detection** to choose optimal playback method

Result: **Large local video files (500MB+) now stream smoothly without memory issues or crashes.**
