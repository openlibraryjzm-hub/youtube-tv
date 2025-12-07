# Quick Session Checkpoint Script
# Run this after each AI conversation/work session

Write-Host "Creating session checkpoint..." -ForegroundColor Cyan

# Get current timestamp
$timestamp = Get-Date -Format "yyyy-MM-dd HH:mm"
$tagName = "session-$(Get-Date -Format 'yyyyMMdd-HHmm')"

# Check if there are changes
$status = git status --porcelain
if ($status -eq "") {
    Write-Host "No changes to commit." -ForegroundColor Yellow
    exit
}

# Add all changes
Write-Host "Adding all changes..." -ForegroundColor Cyan
git add .

# Create commit
Write-Host "Creating commit..." -ForegroundColor Cyan
git commit -m "Session checkpoint - $timestamp"

# Push to GitHub
Write-Host "Pushing to GitHub..." -ForegroundColor Cyan
git push

# Create session tag
Write-Host "Creating session tag: $tagName" -ForegroundColor Cyan
git tag $tagName
git push origin $tagName

Write-Host ""
Write-Host "✅ Session checkpoint created successfully!" -ForegroundColor Green
Write-Host "   Commit: Session checkpoint - $timestamp" -ForegroundColor Gray
Write-Host "   Tag: $tagName" -ForegroundColor Gray
Write-Host ""
Write-Host "To go back to this checkpoint later, use:" -ForegroundColor Cyan
Write-Host "   git checkout $tagName" -ForegroundColor Yellow
