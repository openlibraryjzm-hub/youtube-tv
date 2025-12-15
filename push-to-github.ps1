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
[AI] Major Feature: Windowed Players, Quadrant Modes, and react-youtube Integration

User Request: Implementation of windowed video players, quadrant layout modes, and resolution of persistent React/YouTube API conflicts.

Major Features Implemented:

1. react-youtube Integration (Critical Fix):
   - Replaced raw YouTube IFrame API with react-youtube component
   - SOLVED persistent "removeChild" errors that were crashing the app
   - Better React lifecycle management - no more DOM conflicts
   - Both primary and secondary players now use react-youtube
   - Video playback reset issue fixed (using key prop + seekTo instead of start parameter)

2. Window-Style UI for All Players:
   - Desktop window appearance with borders, title bars, and close buttons
   - Full border around each player window (border-2 border-gray-600)
   - Title bar at top showing video title
   - Close button (X) in top-right corner
   - Gray color scheme matching desktop applications
   - Shadow effects for depth (shadow-2xl)
   - Removed legacy black boxes with "Player 1"/"Player 2" labels

3. Windowed Main Player (Default Mode):
   - Main player now starts in resizable, draggable window mode
   - Default size: 800x600px at position (50, 50)
   - Draggable via title bar (cursor-grab)
   - Resizable via bottom-right corner handle
   - Black space behind when resized smaller than full screen
   - Video scales with window size automatically
   - Close button disabled (main player cannot be closed)

4. Floating Window Player ("2nd Window Player"):
   - New menu option in context menu (3-dot menu)
   - Creates resizable, draggable floating window
   - Overlays main player content
   - Same window styling as main player
   - Can be closed independently
   - Video scales with window resize

5. Quadrant Mode Features:
   - Menu Quadrant Mode: Hover 2 seconds on CornerDownRight button → menu shrinks to bottom-right quadrant
   - Player Quadrant Mode: Hover 2 seconds on MoveDown button → player shrinks to bottom-left quadrant
   - Smooth 500ms transitions with ease-in-out
   - Automatically reverts when hover ends
   - Works with single player + side menu configuration

6. 2-Player Limit Enforcement (Hard Rule):
   - Maximum 2 players allowed at once
   - "Add to 2nd Player" option disabled when floating window is active
   - "2nd Window Player" option disabled when quarter splitscreen mode is active
   - Menu options show disabled state with tooltips explaining the limit
   - Prevents UI clutter and performance issues

7. Video Playback Improvements:
   - Fixed video resetting to 0:00 during playback
   - Fixed video resetting to 0:00 when pausing
   - Uses key prop to prevent unnecessary re-renders
   - seekTo() in onReady handler for resume position (instead of start parameter)
   - hasSeekedToResume ref prevents multiple seeks per video load

Technical Implementation:

State Management:
- Added floatingWindowVideoId, floatingWindowPosition, floatingWindowSize
- Added mainPlayerWindowPosition, mainPlayerWindowSize
- Added isDraggingWindow, isResizingWindow, isDraggingMainWindow, isResizingMainWindow
- Added drag/resize handlers with useEffect hooks

Refs Added:
- mainPlayerWindowRef, floatingWindowRef
- floatingPlayerRef, floatingPlayerContainerRef

Event Handlers:
- Drag handlers for both main and floating windows
- Resize handlers with minimum size constraints (300x200 for floating, 400x300 for main)
- Mouse move/up event listeners for smooth dragging/resizing

UI Components:
- Window containers with flex-col layout
- Title bars with flex layout (title + close button)
- Resize handles with diagonal cursor (nwse-resize)
- Black background behind windowed players

Files Modified:
- app/page.jsx: Complete refactor of player rendering
  * Replaced YT.Player with react-youtube component
  * Added windowed main player container
  * Added floating window player container
  * Added drag/resize handlers
  * Added 2-player limit logic to context menu
  * Removed legacy black box UI elements
  * Fixed video playback reset issues
- package.json: Added react-youtube dependency (v10.1.0)
- QUADRANT-MODE-SUMMARY.md: Updated with all new features and status

Key Results:
✅ No more "removeChild" crashes - react-youtube handles React lifecycle properly
✅ All players have desktop window styling
✅ Main player windowed by default - resizable and draggable
✅ Floating window player feature working
✅ 2-player limit enforced with UI feedback
✅ Video playback stable - no more resets to 0:00
✅ Quadrant modes working smoothly
✅ Legacy UI elements removed

Breaking Changes:
- Main player is now always windowed (no longer full-width by default)
- Left side area is now black space when main player is windowed
- Context menu options now have disabled states based on player count
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
