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
[AI] Botched attempt to integrate radial menu into main app

This was a day where there was a botched attempt to integrate the radial menu into the main app. Multiple failed attempts were made to fix:
- Radial menu scroll snap back issues
- Player area mapper save functionality  
- Radial menu dragging functionality

None of the fixes worked as intended. The code was reverted back to original state in most cases.

Files Modified:
- app/components/RadialMenu.jsx: Various attempted fixes that didn't work
- app/components/PlayerAreaMapper.jsx: Attempted save functionality fixes

Status: Issues remain unresolved. Need to take a different approach.
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
