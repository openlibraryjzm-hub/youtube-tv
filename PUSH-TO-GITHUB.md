# Push to GitHub - Manual Commands

Run these commands in your PowerShell terminal, one at a time:

## Step 1: Navigate to project directory
```powershell
cd c:\Projects\yttv1
```

## Step 2: Check current status
```powershell
git status
```

## Step 3: Add all changes
```powershell
git add -A
```

## Step 4: Commit with message "migration 1"
```powershell
git commit -m "migration 1"
```

## Step 5: Set remote (if not already set)
```powershell
git remote set-url origin https://github.com/openlibraryjzm-hub/youtube-tv.git
```

Or if remote doesn't exist:
```powershell
git remote add origin https://github.com/openlibraryjzm-hub/youtube-tv.git
```

## Step 6: Push to GitHub
```powershell
git push -u origin main
```

## If you get authentication errors:

### Option A: Use Personal Access Token
1. Go to GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)
2. Generate new token with `repo` permissions
3. When prompted for password, paste the token instead

### Option B: Use GitHub CLI (if installed)
```powershell
gh auth login
git push -u origin main
```

### Option C: Check if you need to pull first
```powershell
git pull origin main --rebase
git push -u origin main
```

---

**After pushing, check:** https://github.com/openlibraryjzm-hub/youtube-tv/commits/main

