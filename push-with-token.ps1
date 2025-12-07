# Script to push to GitHub using Personal Access Token
param(
    [Parameter(Mandatory=$false)]
    [string]$Token
)

Set-Location "c:\Projects\youtube-tv-grok444"

Write-Host "=== Preparing to push to GitHub ===" -ForegroundColor Cyan

# Make sure everything is committed
git add -A
$status = git status --porcelain
if ($status) {
    git commit -m "Complete project upload: YouTube TV with all features and documentation"
    Write-Host "✓ Changes committed" -ForegroundColor Green
} else {
    Write-Host "✓ Everything already committed" -ForegroundColor Green
}

# Configure remote
git remote remove origin 2>$null
git remote add origin https://github.com/openlibraryjzm-hub/yttv222.git
git branch -M main
Write-Host "✓ Remote configured: https://github.com/openlibraryjzm-hub/yttv222.git" -ForegroundColor Green

# Push with token if provided
if ($Token) {
    Write-Host "`nPushing with provided token..." -ForegroundColor Yellow
    $remoteUrl = "https://openlibraryjzm-hub:$Token@github.com/openlibraryjzm-hub/yttv222.git"
    git push $remoteUrl main --force
    Write-Host "`n✓ Push complete!" -ForegroundColor Green
    Write-Host "Repository: https://github.com/openlibraryjzm-hub/yttv222" -ForegroundColor Cyan
} else {
    Write-Host "`nNo token provided. Run this command manually:" -ForegroundColor Yellow
    Write-Host "git push -u origin main --force" -ForegroundColor White
    Write-Host "`nOr provide token: .\push-with-token.ps1 -Token YOUR_TOKEN" -ForegroundColor Yellow
}
