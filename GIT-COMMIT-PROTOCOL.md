# Git Commit Protocol for AI Agents

**Last Updated:** 2025-01-06  
**Version:** 1.0  
**Purpose:** Automatic version control with prompt tracking

> **🤖 AI Agent Note:** This protocol is MANDATORY. Every code change must be committed with the user's prompt included in the commit message. This creates a complete audit trail of what prompts led to what changes.

## Protocol Overview

**Core Principle:** When the user requests a commit or push to GitHub, commit with:
1. The user's prompt/request that triggered the change
2. Description of what was changed
3. Automatic timestamp (via git)
4. Full traceability from prompt → code → commit

**⚠️ IMPORTANT:** Only commit when the user explicitly requests it. Do NOT automatically commit changes.

## Commit Message Format

### Standard Format

```
[AI] User Request: "[exact user prompt]"

Changes:
- [List of specific changes made]
- [Files modified]
- [Functions added/modified]

Timestamp: [automatic via git]
```

### Example Commit Message

```
[AI] User Request: "add bulk delete feature for playlists"

Changes:
- Added bulkDeleteMode state variable
- Implemented handleBulkDeletePlaylists() function
- Added bulk delete UI in playlists screen
- Updated STATE-MANAGEMENT.md with new state
- Updated CODE-STRUCTURE.md with new function

Files Modified:
- app/page.jsx (lines 297-417: state, 214-219: functions, 4263-5166: UI)
- AI-ONBOARDING-PROMPT.md (patterns section)
```

## When to Commit

### ✅ ALWAYS Commit When:
1. **Code changes made** - Any modification to `.jsx`, `.js`, `.ts`, `.tsx` files
2. **Documentation updated** - Changes to `.md` files
3. **Configuration changed** - `package.json`, config files, etc.
4. **New files added** - New components, utilities, etc.
5. **Bug fixes** - Any bug resolution

### ❌ DON'T Commit:
1. **No changes made** - If user request didn't result in file changes
2. **Only temporary files** - `.log`, `.tmp` files (should be in .gitignore)
3. **Node modules** - Already in .gitignore

## Commit Workflow

### When User Requests a Git Push

**Step 1: Analyze Changes**
- Check `git status` to see all changes since last push
- Review modified/deleted/new files
- Identify what was changed in current session

**Step 2: Update push-to-github.ps1 Script**
- Open `push-to-github.ps1`
- Update the commit message with current, accurate information:
  - List all changes made
  - List all files modified/deleted/created
  - Include user's exact request
- Save the script

**Step 3: User Runs Script**
```powershell
.\push-to-github.ps1
```

**Step 4: Script Executes**
- Stages all changes (`git add .`)
- Commits with updated message
- Pushes to GitHub (`git push origin main`)

**This ensures commit messages are always accurate and reflect current state.**

## Implementation for AI Agents

### Commit Function (When User Requests)

**⚠️ Only use this when the user explicitly requests a commit or push to GitHub.**

When the user requests a commit, follow this pattern:

1. **Capture the user's prompt** - Store exact user request
2. **List all changes made** - Track what was modified
3. **Stage files** - `git add .` or specific files
4. **Create commit** - Use format above
5. **Push to remote** - `git push origin main` (if user requested push)

### PowerShell Script Template

```powershell
# After making changes, run:
$userPrompt = "[exact user prompt from conversation]"
$changes = @"
- [list of changes]
- [files modified]
"@

git add .
git commit -m "[AI] User Request: `"$userPrompt`"

Changes:
$changes

Timestamp: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
git push origin main
```

## Commit Message Guidelines

### Do's ✅
- Include exact user prompt in quotes
- List all files modified
- Describe what changed functionally
- Keep it clear and searchable
- Include relevant line numbers if helpful

### Don'ts ❌
- Don't use generic messages like "update code"
- Don't omit the user prompt
- Don't combine unrelated changes in one commit
- Don't commit without push (unless testing)

## Viewing Commit History

### See All Commits with Prompts
```bash
git log --oneline
git log --format="%h - %an, %ar : %s" -20
```

### Search Commits by Prompt
```bash
# Search for commits containing specific prompt text
git log --grep="add bulk delete"
git log --all --grep="user request"
```

### See Full Commit Details
```bash
git show <commit-hash>
git log -p -1  # Show last commit with diff
```

## GitHub Integration

### Viewing on GitHub
- All commits appear in repository's "Commits" tab
- Each commit shows the full message with prompt
- Timestamps are automatically included
- Easy to search and filter

### Benefits
- **Full audit trail** - See what prompt led to what change
- **Easy rollback** - Know exactly what to revert
- **Collaboration** - Others can see the reasoning
- **History** - Complete development timeline

## Special Cases

### Multiple Changes in One Session
If user makes multiple requests in one conversation:
- **Option A:** One commit per change (recommended)
- **Option B:** One commit with all changes listed

### Documentation-Only Changes
Still commit with prompt:
```
[AI] User Request: "update documentation for new feature"

Changes:
- Updated MASTER-CONTEXT.md with new feature
- Added cross-references in PATTERNS.md
- Updated CODE-STRUCTURE.md function list
```

### Rollback Commits
If reverting a change:
```
[AI] User Request: "revert the bulk delete feature"

Changes:
- Reverted app/page.jsx to previous version
- Removed bulkDeleteMode state
- Removed handleBulkDeletePlaylists() function

Reverted from commit: [commit-hash]
```

## Integration with Existing Workflow

This protocol **enhances** the existing session checkpoint system:

- **Session Checkpoints** - Still create at end of sessions
- **Automatic Commits** - Happen during session for each change
- **Version Tags** - Still create for major milestones

### Combined Workflow (When User Requests Commits)
1. **When User Requests Commit:** Use this protocol format
2. **End of Session:** Create session checkpoint tag (if user requests)
3. **Major Milestone:** Create version tag (if user requests)

## Troubleshooting

### Git Not Configured
```bash
# Set user name and email (one time)
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"
```

### Remote Not Set
```bash
# Check if remote exists
git remote -v

# Add remote if missing
git remote add origin https://github.com/openlibraryjzm-hub/youtube-tv.git
```

### Push Fails
```bash
# Pull latest first
git pull origin main

# Then push
git push origin main
```

## Best Practices

1. **Commit frequently** - After each logical change
2. **Be descriptive** - Include all relevant details
3. **Keep prompts exact** - Don't paraphrase user requests
4. **List all changes** - Don't omit files
5. **Push immediately** - Don't accumulate commits locally

## Example Session

```
User: "add bulk delete feature"
→ AI makes changes
→ Commit: "[AI] User Request: \"add bulk delete feature\" ..."
→ Push: git push

User: "update documentation"
→ AI updates docs
→ Commit: "[AI] User Request: \"update documentation\" ..."
→ Push: git push

End of session:
→ Tag: session-20250106-1800
```

## Related Documentation

- **[AI-ONBOARDING-PROMPT.md](./AI-ONBOARDING-PROMPT.md)** - AI agent onboarding (includes git workflow summary)
- **[GIT-WORKFLOW.md](./GIT-WORKFLOW.md)** - Detailed git workflow and session checkpoints
- **[DOCUMENTATION-MAINTENANCE.md](./DOCUMENTATION-MAINTENANCE.md)** - Documentation update strategy

---

**Remember:** Every code change = One commit with prompt = Full traceability










