# Cleanup Old Session Tags
# Keeps only the last 5 session tags, deletes older ones

Write-Host "Checking session tags..." -ForegroundColor Cyan

# Get all session tags, sorted newest first
$allTags = git tag -l "session-*" | Sort-Object -Descending

if ($allTags.Count -eq 0) {
    Write-Host "No session tags found." -ForegroundColor Yellow
    exit
}

Write-Host "Found $($allTags.Count) session tags" -ForegroundColor Green

# Keep last 5, delete the rest
$tagsToKeep = $allTags | Select-Object -First 5
$tagsToDelete = $allTags | Select-Object -Skip 5

if ($tagsToDelete.Count -eq 0) {
    Write-Host "No old tags to delete (only $($allTags.Count) session tags exist, keeping all)" -ForegroundColor Green
    Write-Host ""
    Write-Host "Current session tags:" -ForegroundColor Cyan
    $tagsToKeep | ForEach-Object { Write-Host "  - $_" }
    exit
}

Write-Host ""
Write-Host "Keeping last 5 session tags:" -ForegroundColor Green
$tagsToKeep | ForEach-Object { Write-Host "  ✅ $_" }

Write-Host ""
Write-Host "Deleting $($tagsToDelete.Count) old session tags:" -ForegroundColor Yellow
foreach ($tag in $tagsToDelete) {
    Write-Host "  🗑️  $tag" -ForegroundColor Red
    
    # Delete local tag
    git tag -d $tag 2>$null
    
    # Delete remote tag
    git push origin :refs/tags/$tag 2>$null
}

Write-Host ""
Write-Host "Cleanup complete! ✅" -ForegroundColor Green
Write-Host "Remaining session tags: $($tagsToKeep.Count)" -ForegroundColor Cyan
