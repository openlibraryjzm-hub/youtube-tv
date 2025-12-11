# Push Documentation Updates to GitHub
# Usage: .\push-documentation-updates.ps1

Write-Host "Pushing documentation updates to GitHub..." -ForegroundColor Cyan

# Stage all changes
Write-Host "Staging all changes..." -ForegroundColor Yellow
git add .

# Create commit message in temp file
$tempFile = "commit-msg-temp.txt"
$commitMessage = @"
[AI] User Request: "push the git now"

Changes:
- Created MASTER-PROMPT.txt - Concise pasteable prompt for AI agents
- Updated AI-ONBOARDING-PROMPT.md - Added documentation maintenance protocol
- Updated GIT-COMMIT-PROTOCOL.md - Clarified only upon user request
- Updated DOCUMENTATION-MAINTENANCE.md - Removed mandatory/automatic language
- Deleted 11 outdated documentation files (Electron/Firestore era)
- Consolidated Tauri docs into core documentation
- Added GitHub repository info to MASTER-PROMPT.txt

Files Modified:
- MASTER-PROMPT.txt (new file)
- AI-ONBOARDING-PROMPT.md
- GIT-COMMIT-PROTOCOL.md
- DOCUMENTATION-MAINTENANCE.md
- README-DOCUMENTATION.md

Files Deleted:
- FINAL-FIX.md, FIRESTORE-READS.md, FIX-NODE-MODULES-ISSUE.md
- DOCUMENTATION-GAPS.md, DOCUMENTATION-GUIDE.md, Grok-Context.md
- SIZE-OPTIMIZATION-PLAN.md, SIZE-ANALYSIS.md, QUICK-REBUILD.md
- MANUAL-REBUILD-INSTRUCTIONS.md, MIGRATION-PLAN.md
- REBUILD-INSTRUCTIONS.md, INSTALLED-APP-CONTEXT.md
- TAURI-QUICK-REFERENCE.md, TAURI-DEVELOPMENT-GUIDE.md, TEST-FRESH-ENVIRONMENT.md
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
