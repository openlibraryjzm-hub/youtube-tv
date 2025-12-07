# Script to push project to GitHub
Write-Host "=== Pushing YouTube TV Project to GitHub ===" -ForegroundColor Cyan

# Navigate to project directory
Set-Location "c:\Projects\youtube-tv-grok444"

# Check if git is initialized
if (-not (Test-Path .git)) {
    Write-Host "Initializing git repository..." -ForegroundColor Yellow
    git init
}

# Add all files
Write-Host "Adding all files..." -ForegroundColor Yellow
git add .

# Check if there are changes to commit
$status = git status --porcelain
if ($status) {
    Write-Host "Committing changes..." -ForegroundColor Yellow
    git commit -m "Upload YouTube TV project: multi-playback, playlist management, comprehensive documentation"
} else {
    Write-Host "No changes to commit (everything already committed)" -ForegroundColor Green
}

# Set branch to main
Write-Host "Setting branch to main..." -ForegroundColor Yellow
git branch -M main

# Remove existing remote if it exists
Write-Host "Configuring remote..." -ForegroundColor Yellow
git remote remove origin 2>$null

# Get GitHub username
$username = Read-Host "Enter your GitHub username"
$repoName = "yttv222"

# Add remote
git remote add origin "https://github.com/$username/$repoName.git"
Write-Host "Remote added: https://github.com/$username/$repoName.git" -ForegroundColor Green

# Push to GitHub
Write-Host "Pushing to GitHub..." -ForegroundColor Yellow
Write-Host "You may be prompted for credentials. Use a Personal Access Token if asked for password." -ForegroundColor Cyan
git push -u origin main --force

Write-Host "`n=== Done! ===" -ForegroundColor Green
Write-Host "Check your repository at: https://github.com/$username/$repoName" -ForegroundColor Cyan
