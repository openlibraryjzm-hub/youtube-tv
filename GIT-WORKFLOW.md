# Git Workflow Guide for Beginners

**🤖 AI Agent Note:** This document explains version control strategy for the project. It's designed for complete beginners with no coding experience.

## 🎯 What You Want

1. **Session Checkpoints** - Save state after each AI conversation/work session
2. **Quick Reversal** - Go back to previous working state if something breaks
3. **Keep Last 5** - Only keep 5 recent session checkpoints
4. **Major/Minor Versions** - Tag important milestones

## 📚 What is Git? (Simple Explanation)

**Think of Git like a time machine for your code:**
- **Commit** = Save a snapshot of your project
- **Tag** = Mark an important checkpoint (like "v1.0.0")
- **Branch** = Create an alternate timeline to test changes
- **Revert** = Go back to a previous save

**GitHub** = Cloud backup where all your saves are stored online

---

## 🚀 Quick Start (Copy-Paste Commands)

### First Time Setup (Do This Once)

```bash
# 1. Open PowerShell in your project folder
# (Right-click folder → "Open in Terminal" or "Open PowerShell window here")

# 2. Check if Git is installed
git --version

# 3. If Git is not installed, download from: https://git-scm.com/download/win
# Then restart PowerShell and try step 2 again

# 4. Initialize Git (if not already done)
git init

# 5. Add all files
git add .

# 6. Create first commit
git commit -m "Initial commit - documentation system complete"

# 7. Create GitHub repository (go to github.com, click "New repository")
#    Name it: youtube-tv-grok444
#    Don't initialize with README (you already have one)

# 8. Connect to GitHub (replace YOUR_USERNAME with your GitHub username)
git remote add origin https://github.com/YOUR_USERNAME/youtube-tv-grok444.git

# 9. Push to GitHub
git branch -M main
git push -u origin main
```

---

## 📋 Session Checkpoint System (Your Main Workflow)

### After Each AI Conversation/Session

**Step 1: Save Your Work (Commit)**
```bash
# Add all changed files
git add .

# Create a checkpoint with today's date
git commit -m "Session checkpoint - $(Get-Date -Format 'yyyy-MM-dd HH:mm')"
```

**Step 2: Push to GitHub (Backup Online)**
```bash
git push
```

**Step 3: Create Session Tag (Optional but Recommended)**
```bash
# Create a tag for this session (replace SESSION_NUMBER with 1, 2, 3, etc.)
git tag session-$(Get-Date -Format 'yyyyMMdd-HHmm')
git push origin --tags
```

**That's it!** Your work is saved and backed up.

---

## 🔄 Quick Reversal (If Something Breaks)

### Option 1: Go Back to Last Session (Easiest)

```bash
# See your recent commits
git log --oneline -10

# Go back to the last commit (undoes current changes)
git reset --hard HEAD~1

# Or go back to a specific commit (copy the commit hash from git log)
git reset --hard COMMIT_HASH_HERE
```

### Option 2: Go Back to a Tagged Session

```bash
# See all your session tags
git tag -l "session-*"

# Go back to a specific session
git checkout session-20250106-1430

# Create a new branch from that point (safer)
git checkout -b fix-from-session-20250106-1430 session-20250106-1430
```

### Option 3: See What Changed (Before Reverting)

```bash
# See what files changed
git status

# See what changed in a file
git diff app/page.jsx

# See commit history
git log --oneline --graph -20
```

---

## 🏷️ Major/Minor Version System

### When to Create Major/Minor Versions

**Major Version (v1.0.0, v2.0.0):**
- Complete documentation system ✅ (do this now!)
- Major feature complete
- Before/after handover
- Major refactoring complete

**Minor Version (v1.1.0, v1.2.0):**
- New feature added
- Significant improvement
- Screenshots added
- API docs added

**Patch Version (v1.0.1, v1.0.2):**
- Bug fixes
- Small improvements
- Documentation fixes

### How to Create Versions

```bash
# Create a version tag
git tag -a v1.0.0 -m "Documentation system complete - ready for handover"

# Push the tag to GitHub
git push origin v1.0.0

# List all versions
git tag

# Go back to a version
git checkout v1.0.0
```

---

## 🧹 Keep Only Last 5 Sessions (Cleanup)

### Manual Cleanup (Simple)

**Step 1: List Your Session Tags**
```bash
# See all session tags
git tag -l "session-*" | Sort-Object -Descending
```

**Step 2: Delete Old Tags (Keep Only Last 5)**

```bash
# PowerShell script to keep only last 5 session tags
$tags = git tag -l "session-*" | Sort-Object -Descending
$tagsToDelete = $tags | Select-Object -Skip 5
foreach ($tag in $tagsToDelete) {
    git tag -d $tag
    git push origin :refs/tags/$tag
}
```

**Or manually delete old tags:**
```bash
# Delete a tag locally
git tag -d session-20250101-1200

# Delete a tag on GitHub
git push origin :refs/tags/session-20250101-1200
```

### Automatic Cleanup Script (Advanced - Optional)

Create a file `cleanup-old-sessions.ps1`:

```powershell
# Keep only last 5 session tags
$tags = git tag -l "session-*" | Sort-Object -Descending
$tagsToDelete = $tags | Select-Object -Skip 5

if ($tagsToDelete.Count -gt 0) {
    Write-Host "Deleting $($tagsToDelete.Count) old session tags..."
    foreach ($tag in $tagsToDelete) {
        git tag -d $tag
        git push origin :refs/tags/$tag
        Write-Host "Deleted: $tag"
    }
} else {
    Write-Host "No old tags to delete (only $($tags.Count) session tags exist)"
}
```

**Run it:**
```bash
powershell -ExecutionPolicy Bypass -File cleanup-old-sessions.ps1
```

---

## 📝 Recommended Workflow

### Daily/Session Workflow

**1. Start Working**
- Make changes with AI
- Test that everything works

**2. Save Checkpoint**
```bash
git add .
git commit -m "Session checkpoint - $(Get-Date -Format 'yyyy-MM-dd HH:mm')"
git push
```

**3. Optional: Create Session Tag**
```bash
git tag session-$(Get-Date -Format 'yyyyMMdd-HHmm')
git push origin --tags
```

**4. Cleanup (Once a Week)**
```bash
# Keep only last 5 sessions
powershell -ExecutionPolicy Bypass -File cleanup-old-sessions.ps1
```

### Major Milestone Workflow

**When something big is complete:**

```bash
# 1. Make sure everything is committed
git add .
git commit -m "Complete: [description of what was completed]"
git push

# 2. Create version tag
git tag -a v1.0.0 -m "Documentation system complete"
git push origin v1.0.0

# 3. Celebrate! 🎉
```

---

## 🆘 Emergency Reversal (Something Broke!)

### Quick Fix Steps

**1. Don't Panic!** Everything is saved.

**2. See What Happened**
```bash
# See recent commits
git log --oneline -10

# See what changed
git status
```

**3. Go Back to Last Working State**

**Option A: Undo Last Commit (Keep Changes)**
```bash
git reset --soft HEAD~1
# Your changes are still there, just uncommitted
```

**Option B: Undo Last Commit (Discard Changes)**
```bash
git reset --hard HEAD~1
# ⚠️ WARNING: This deletes your changes!
```

**Option C: Go Back to Specific Session**
```bash
# List session tags
git tag -l "session-*"

# Go back to that session
git checkout session-20250106-1430
```

**4. Test That It Works**

**5. If It Works, Save It**
```bash
git add .
git commit -m "Reverted to working state from session-20250106-1430"
git push
```

---

## 📊 Version History Example

Here's what your version history might look like:

```
v1.0.0 (2025-01-06) - Documentation system complete
  ├── session-20250106-1000 - Initial docs created
  ├── session-20250106-1400 - Added completion signals
  └── session-20250106-1800 - Final documentation review

v1.1.0 (2025-01-07) - Screenshots added
  ├── session-20250107-0900 - Took screenshots
  ├── session-20250107-1100 - Annotated screenshots
  └── session-20250107-1500 - Updated docs with screenshots

v1.2.0 (2025-01-08) - API reference added
  └── session-20250108-1200 - Created API-REFERENCE.md
```

---

## 🎓 Beginner Tips

### Common Commands You'll Use

```bash
# Check status (what changed?)
git status

# See commit history
git log --oneline -10

# Save changes
git add .
git commit -m "Description of what you did"
git push

# See all tags
git tag

# Go back to a tag
git checkout TAG_NAME
```

### What Each Command Does

- `git status` - "What files did I change?"
- `git add .` - "Prepare all changes to save"
- `git commit -m "message"` - "Save with this description"
- `git push` - "Upload to GitHub"
- `git log` - "Show me my save history"
- `git tag` - "Show me my checkpoints"
- `git checkout TAG` - "Go back to this checkpoint"

### Safety Tips

1. **Always push after committing** - This backs up to GitHub
2. **Create tags for important milestones** - Easy to find later
3. **Test before committing** - Make sure it works first
4. **Write descriptive commit messages** - You'll thank yourself later
5. **Don't delete tags unless you're sure** - They're your safety net

---

## 🔗 Integration with Documentation

**When you complete documentation:**
1. Mark it complete in `DOCUMENTATION-GAPS.md` (change status to ✅ Complete)
2. Commit the change
3. Create a version tag if it's a major milestone

**Example:**
```bash
# After adding screenshots
git add .
git commit -m "docs: screenshots complete - mark as complete in DOCUMENTATION-GAPS.md"
git push
git tag -a v1.1.0 -m "Screenshots added - documentation gap filled"
git push origin v1.1.0
```

---

## 📋 Quick Reference Card

**Save Your Work:**
```bash
git add .
git commit -m "Session checkpoint - $(Get-Date -Format 'yyyy-MM-dd HH:mm')"
git push
```

**See History:**
```bash
git log --oneline -10
```

**Go Back:**
```bash
git checkout TAG_NAME
```

**Create Version:**
```bash
git tag -a v1.0.0 -m "Description"
git push origin v1.0.0
```

**Cleanup Old Sessions:**
```bash
powershell -ExecutionPolicy Bypass -File cleanup-old-sessions.ps1
```

---

## 🎯 Your First Steps

1. **Set up Git** (if not already done)
   ```bash
   git init
   git add .
   git commit -m "Initial commit - documentation system complete"
   ```

2. **Create GitHub repo** and connect it
   ```bash
   git remote add origin https://github.com/YOUR_USERNAME/youtube-tv-grok444.git
   git push -u origin main
   ```

3. **Create first version tag**
   ```bash
   git tag -a v1.0.0-docs -m "Documentation system complete - ready for handover"
   git push origin v1.0.0-docs
   ```

4. **Start using session checkpoints** after each AI conversation

5. **Cleanup weekly** to keep only last 5 sessions

---

**Remember:** Git is your safety net. Use it liberally - you can always go back!

---

**Last Updated:** 2025-01-06  
**Version:** 1.0.0
