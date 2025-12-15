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
[AI] MAJOR VICTORY: Flawless Window Management with 8-Direction Resizing and Proportional Scaling

User Request: Fix window dragging, add all-direction resizing, fix duplicate player issues, and eliminate rapid resizing glitches.

🎉 MAJOR VICTORIES ACHIEVED:

1. BUTTERY SMOOTH Window Dragging (Fixed):
   - Replaced problematic pointer lock approach with full-screen overlay system
   - Cursor no longer disappears or requires ESC to show
   - Overlay captures all mouse events, even over embed player
   - Works flawlessly when dragging over larger players
   - Applied to both main player window and floating window

2. COMPLETE 8-Direction Resizing (All Corners + All Sides):
   - Added resize handles to ALL 8 positions:
     * 4 Corners: top-left, top-right, bottom-left, bottom-right
     * 4 Edges: top, bottom, left, right
   - Each handle has correct cursor style (nwse-resize, nesw-resize, ns-resize, ew-resize)
   - Smooth resizing from any direction using full-screen overlay
   - Resize handlers support all directions with proper position calculations
   - Works perfectly even when resizing over embed player
   - Applied to both main player window and floating window

3. Duplicate Player Fix (Proportional Scaling):
   - Fixed duplicate non-windowed player appearing underneath window
   - Now properly hidden when windowed player is shown in:
     * Fullscreen mode
     * Menu open (left half) mode
     * Quadrant mode (lower left) mode
   - Uses same fix pattern as fullscreen mode for consistency

4. Rapid Resizing Glitch ELIMINATED:
   - Fixed race condition between proportional scaling and initialization useEffects
   - Added isRestoringFromProportionalScaling ref to prevent conflicts
   - Window now smoothly transitions between:
     * Quadrant mode → Left half → Fullscreen
     * Left half → Fullscreen
   - No more rapid spazzing between sizes

5. Window Size Corruption FIXED:
   - Prevented fullscreenLayout from being overwritten with scaled (half/quarter) sizes
   - Added size threshold checks (minimum 50% width, 40% height for fullscreen)
   - Added size comparison checks (prevents shrinking fullscreenLayout)
   - Extended restoration flag timeout to 300ms for stability
   - Window now correctly:
     * Returns to fullscreen size when closing menu
     * Scales correctly when opening menu (half size, not shrinking further)
     * Maintains correct fullscreen size across all transitions

6. Initial Window Size Optimization:
   - Changed from 90% width × 80% height to 81% width × 64% height
   - 10% narrower and 20% shorter as requested
   - Better initial sizing for windowed player

Technical Implementation:

Resize System:
- Added mainWindowResizeDirection and floatingWindowResizeDirection state
- Resize handlers calculate new size/position based on direction:
  * 'n', 's', 'e', 'w' for edges
  * 'ne', 'nw', 'se', 'sw' for corners
- Handles position adjustments for left/top edge resizing
- Stores initial position (posX, posY) in resizeStart for accurate calculations

Drag System:
- Full-screen overlay approach for both windows
- Overlay has z-index 9999 and captures all mouse events
- Prevents embed player from absorbing mouse events
- Cursor stays visible and responsive throughout

Proportional Scaling System:
- Tracks fullscreenLayout state separately from current window size
- Restoration flag prevents initialization useEffect from corrupting layout
- Size validation ensures only fullscreen-sized windows update fullscreenLayout
- Smooth transitions between all modes without size corruption

State Management:
- Added isRestoringFromProportionalScaling ref
- Added resize direction tracking for both windows
- Enhanced resizeStart and mainWindowResizeStart with position data

Files Modified:
- app/page.jsx: 
  * Complete window drag/resize system overhaul
  * Added 8 resize handles to both windows
  * Fixed duplicate player rendering logic
  * Fixed proportional scaling race conditions
  * Added size validation and corruption prevention
  * Updated initial window size (81% × 64%)

Key Results:
✅ Window dragging is BUTTERY SMOOTH - no cursor issues
✅ All 8 resize directions work flawlessly
✅ Resizing works perfectly even over embed player
✅ No duplicate players in any mode
✅ Smooth transitions between all layout modes
✅ No rapid resizing glitches
✅ Window size maintains correctly across all transitions
✅ Initial window size optimized (81% × 64%)

User Feedback:
"its working, I am utterly blown away" - Window management is now flawless!
"WOW that resizing is buttery smooth now" - Resize system works perfectly!
"awesome window movement and resizing is now flawless" - All 8 directions working!

Breaking Changes:
- None - all changes are improvements to existing functionality
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
