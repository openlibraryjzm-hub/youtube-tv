# Push Documentation Updates to GitHub
# Usage: .\push-documentation-updates.ps1

Write-Host "Pushing documentation updates to GitHub..." -ForegroundColor Cyan

# Stage all changes
Write-Host "Staging all changes..." -ForegroundColor Yellow
git add .

# Create commit message in temp file
$tempFile = "commit-msg-temp.txt"
$commitMessage = @"
[AI] Major Feature: Local File Support + Enhanced Playlist Features

Changes:
- Local File Support (NEW - Major Feature)
  - Add local video files (.mp4, .webm) to playlists alongside YouTube videos
  - Two methods: Folder scanning (recursive) or individual file selection
  - HTML5 video player for local files, automatic detection vs YouTube videos
  - Progress tracking and resume playback for local videos
  - File paths stored with local:file:// prefix, absolute paths preserved
  - Purple Folder icon button in playlist add bar and playlist videos view
  - Thumbnail placeholders for local files (extract frames later)
- Enhanced "Configure Playlist" mode with existing playlist support
  - Option to create new playlist OR add to existing playlist
  - When existing playlist selected, color dropdown shows custom folder names
  - Preserves existing videos and groups when updating
  - Custom folder name input for each colored folder
  - Color cycling for "Add Another" button (cycles through all 16 colors)
- Video Metadata System (PERMANENT STORAGE - like thumbnails)
  - Database table: video_metadata stores title, author, views, channelId, publishedYear, duration
  - Automatic metadata fetching when adding playlists (single or bulk)
  - Manual "Fetch Metadata" button per playlist (Database icon)
  - ONE-TIME FETCH per video - stored permanently, never auto-refetched
  - Metadata displayed in video grid (author, views below titles)
  - Metadata displayed in current video info card (top right)
- Fixed "Show Colored Folders" toggle default to OFF
- Enhanced playlist import/export features
  - Smart import auto-detects playlist vs tab files from single button
  - Export filenames include type suffix (- playlist.json, - tab.json)
  - Immediate UI refresh after import (no app restart needed)
  - Export individual playlists and full tab structures
  - Overwrite playlist option for replacing existing playlists
- UI Improvements
  - Fixed dropdown text color visibility (white on white issue)
  - Split playlist ID field into two: ID input and folder name input (horizontally aligned)
  - Improved modal layouts and user experience

Files Modified:
- app/page.jsx (local file support, player handling, UI buttons, configure playlist enhancements, metadata system)
- src-tauri/src/db.rs (scan_local_folder command for recursive folder scanning)
- src-tauri/src/main.rs (registered scan_local_folder command)
- AI-ONBOARDING-PROMPT.md (updated with local file features)
- push-documentation-updates.ps1 (this file)

Technical Details:
- Local files: Uses Tauri convertFileSrc for proper file:// URL handling
- Player: Automatic detection between local files (HTML5) and YouTube (IFrame API)
- Folder scanning: Recursively scans for .mp4 and .webm files, case-insensitive
- File selection: Multiple file picker with .mp4/.webm filter
- Configure playlist: Creates/updates playlists with colored folders pre-configured
- Metadata: Fetched once per video, stored in SQLite forever (like thumbnails)
- Import/export supports both individual playlists and full tab structures
- All changes persist immediately without requiring app restart
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
