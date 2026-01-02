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
[AI] Created comprehensive project context summary for reorganization

Created PROJECT-CONTEXT-SUMMARY.md - a complete snapshot of project state, challenges, and architectural concerns. This document captures:

- Full project understanding (architecture, code structure, state management)
- Current challenges with implementing new pages/features
- Integration difficulties (RadialMenu, unified frontend)
- Memory/context issues causing Cursor crashes
- Technical debt and code organization concerns
- Recommendations for short/medium/long-term reorganization

This document is intended to help with project reorganization and serve as context for future development sessions.

Files Created:
- PROJECT-CONTEXT-SUMMARY.md: Comprehensive 630-line context document
- PROJECT-SUMMARY.md: User-focused project overview
- FRONTEND-INTEGRATION-PLAN.md: Integration plan for unified frontend
- INTEGRATION-START.md: Initial integration notes

Files Modified:
- app/page.jsx: Ongoing integration attempts (unified frontend)
- app/components/RadialMenu.jsx: Previous integration attempts
- app/components/PlayerAreaMapper.jsx: Save functionality work
- app/components/unified/: New unified frontend components

Status: Project working but needs reorganization. Context document created to guide future refactoring efforts.
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
