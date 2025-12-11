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
[AI] User Request: "update documentation to reflect new git pushing protocol"

Changes:
- Updated git push protocol: AI now updates this script's commit message when user requests push
- Updated MASTER-PROMPT.txt - Added new git push protocol instructions
- Updated AI-ONBOARDING-PROMPT.md - Updated git workflow section with new push protocol
- Updated GIT-COMMIT-PROTOCOL.md - Updated workflow to reflect script-based approach
- Created push-to-github.ps1 - New script that AI updates before user runs it
- Replaced push-documentation-updates.ps1 with push-to-github.ps1

Files Modified:
- MASTER-PROMPT.txt
- AI-ONBOARDING-PROMPT.md
- GIT-COMMIT-PROTOCOL.md

Files Created:
- push-to-github.ps1 (new script with auto-update protocol)

Files Deleted:
- push-documentation-updates.ps1 (replaced by push-to-github.ps1)
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
