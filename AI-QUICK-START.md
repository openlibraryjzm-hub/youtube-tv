# AI Agent Quick Start Guide

**Purpose:** Get an AI agent up to speed quickly on this project.

## Reading Order for New AI Agents

### 1. Start Here (5 minutes)
Read **[MASTER-CONTEXT.md](./MASTER-CONTEXT.md)** first:
- Get project overview
- Understand architecture
- Learn key concepts
- Review recent developments

### 2. Understand the Code (10 minutes)
Read **[CODE-STRUCTURE.md](./CODE-STRUCTURE.md)**:
- Find where things are located
- Understand file organization
- Learn function groupings
- Note line number ranges

### 3. Learn the Patterns (10 minutes)
Read **[PATTERNS.md](./PATTERNS.md)**:
- Understand mandatory patterns
- Learn code idioms
- See examples
- Note what NOT to do

### 4. Know the Gotchas (5 minutes)
Read **[GOTCHAS.md](./GOTCHAS.md)**:
- Learn common pitfalls
- Understand what breaks
- See prevention strategies
- Check status of known issues

### 5. Understand Data Flow (10 minutes)
Read **[DATA-FLOW.md](./DATA-FLOW.md)**:
- See how data moves
- Understand save/load cycles
- Learn sync mechanisms
- Review flow diagrams

### 6. Reference as Needed
Use **[STATE-MANAGEMENT.md](./STATE-MANAGEMENT.md)** as reference:
- Look up state variables
- Check update patterns
- Understand dependencies
- Find related patterns

## Key Concepts to Understand

### 1. Local-First Architecture
- Local state takes precedence during saves
- Firestore snapshots are merged, not overwritten
- Data loss prevention is critical
- See: [DATA-FLOW.md#10-data-loss-prevention-flow](./DATA-FLOW.md#10-data-loss-prevention-flow)

### 2. Session vs Persistent Data
- **Persistent (Firestore):** playlists, tabs, video progress
- **Session (useRef):** shuffle orders, positions, fetch tracking
- See: [STATE-MANAGEMENT.md#6-session-specific-state-useref](./STATE-MANAGEMENT.md#6-session-specific-state-useref)

### 3. Document Size Optimization
- Main document stores only video IDs (strings)
- Titles/metadata in subcollection
- 1MB limit is critical constraint
- See: [GOTCHAS.md#1-firestore-document-size-limit-1mb](./GOTCHAS.md#1-firestore-document-size-limit-1mb)

### 4. Debounced Saves
- All saves wait 2 seconds for quiet period
- Use refs for latest state (not closure values)
- Prevents excessive Firestore writes
- See: [PATTERNS.md#1-debounced-save-pattern](./PATTERNS.md#1-debounced-save-pattern)

### 5. Cache-First API Calls
- Always check cache before API
- Track fetched items in session
- Save to cache for future loads
- See: [PATTERNS.md#6-cache-first-api-pattern](./PATTERNS.md#6-cache-first-api-pattern)

## Common Tasks

### Adding a New Feature

1. **Check Patterns:** Review [PATTERNS.md](./PATTERNS.md) for similar patterns
2. **Check Gotchas:** Review [GOTCHAS.md](./GOTCHAS.md) for related pitfalls
3. **Understand Flow:** Review [DATA-FLOW.md](./DATA-FLOW.md) for affected flows
4. **Add State:** If needed, follow [STATE-MANAGEMENT.md](./STATE-MANAGEMENT.md) patterns
5. **Update Docs:** Follow [DOCUMENTATION-MAINTENANCE.md](./DOCUMENTATION-MAINTENANCE.md) checklist

### Fixing a Bug

1. **Check Gotchas:** See if bug is documented in [GOTCHAS.md](./GOTCHAS.md)
2. **Check Patterns:** See if pattern violation in [PATTERNS.md](./PATTERNS.md)
3. **Trace Flow:** Use [DATA-FLOW.md](./DATA-FLOW.md) to understand data flow
4. **Find Code:** Use [CODE-STRUCTURE.md](./CODE-STRUCTURE.md) to locate functions
5. **Update Docs:** Document fix in [GOTCHAS.md](./GOTCHAS.md) and [MASTER-CONTEXT.md](./MASTER-CONTEXT.md)

### Understanding Existing Code

1. **Find Function:** Use [CODE-STRUCTURE.md](./CODE-STRUCTURE.md) to locate
2. **Understand Pattern:** Check [PATTERNS.md](./PATTERNS.md) for pattern used
3. **Trace Flow:** See [DATA-FLOW.md](./DATA-FLOW.md) for how it fits
4. **Check State:** Review [STATE-MANAGEMENT.md](./STATE-MANAGEMENT.md) for state used
5. **Watch for Gotchas:** Check [GOTCHAS.md](./GOTCHAS.md) for related issues

## Critical Rules

### ⚠️ ALWAYS Follow These Patterns

1. **Debounce all saves** - See [PATTERNS.md#1](./PATTERNS.md#1)
2. **Use functional state updates** - See [PATTERNS.md#4](./PATTERNS.md#4)
3. **Check cache before API** - See [PATTERNS.md#6](./PATTERNS.md#6)
4. **Prevent data loss** - See [PATTERNS.md#3](./PATTERNS.md#3)
5. **Fix orphaned IDs** - See [PATTERNS.md#7](./PATTERNS.md#7)

### 🚫 NEVER Do These

1. **Don't mutate state directly** - See [GOTCHAS.md#common-mistakes](./GOTCHAS.md#common-mistakes)
2. **Don't save without debouncing** - See [GOTCHAS.md#4](./GOTCHAS.md#4)
3. **Don't skip cache check** - See [GOTCHAS.md#5](./GOTCHAS.md#5)
4. **Don't ignore orphaned IDs** - See [GOTCHAS.md#3](./GOTCHAS.md#3)
5. **Don't use closure values in saves** - See [GOTCHAS.md#4](./GOTCHAS.md#4)

## File Locations

### Main Application
- **File:** `app/page.jsx`
- **Lines:** ~5954
- **Structure:** See [CODE-STRUCTURE.md](./CODE-STRUCTURE.md)

### Documentation Files
- `MASTER-CONTEXT.md` - Overview
- `CODE-STRUCTURE.md` - Code organization
- `STATE-MANAGEMENT.md` - State reference
- `PATTERNS.md` - Code patterns
- `GOTCHAS.md` - Common pitfalls
- `DATA-FLOW.md` - Data flow diagrams
- `DOCUMENTATION-GUIDE.md` - Documentation guide
- `DOCUMENTATION-MAINTENANCE.md` - Maintenance strategy
- `AI-QUICK-START.md` - This file

## Quick Reference

### State Variables
- **Playback:** `currentPlaylistIndex`, `currentVideoIndex`, `activeShuffleOrder`
- **Data:** `playlists`, `playlistTabs`, `videoProgress`, `videoHistory`
- **UI:** `showSideMenu`, `videoFilter`, `bulkMode`, etc.
- **Full List:** [STATE-MANAGEMENT.md](./STATE-MANAGEMENT.md)

### Key Functions
- **Data Fetching:** `fetchAllVideos()`
- **Saving:** `performStagedSave()`
- **Playback:** `goToNextVideo()`, `changePlaylist()`
- **Organization:** `assignVideoToColor()`, `mergeColoredFolderToPlaylist()`
- **Full List:** [CODE-STRUCTURE.md#section-4-core-logic-functions](./CODE-STRUCTURE.md#section-4-core-logic-functions)

### Critical Flows
- **Save Flow:** [DATA-FLOW.md#2](./DATA-FLOW.md#2)
- **Snapshot Flow:** [DATA-FLOW.md#3](./DATA-FLOW.md#3)
- **Title Fetching:** [DATA-FLOW.md#5](./DATA-FLOW.md#5)
- **Bulk Add:** [DATA-FLOW.md#6](./DATA-FLOW.md#6)

## When Stuck

1. **Check Gotchas:** [GOTCHAS.md](./GOTCHAS.md) - Your problem might be documented
2. **Check Patterns:** [PATTERNS.md](./PATTERNS.md) - See if pattern exists
3. **Trace Flow:** [DATA-FLOW.md](./DATA-FLOW.md) - Understand data movement
4. **Find Code:** [CODE-STRUCTURE.md](./CODE-STRUCTURE.md) - Locate implementation
5. **Check State:** [STATE-MANAGEMENT.md](./STATE-MANAGEMENT.md) - Understand state

## Documentation Updates

**AUTOMATED UPDATES:** AI agents should automatically update documentation after each code change. See [DOCUMENTATION-MAINTENANCE.md#automated-update-strategy](./DOCUMENTATION-MAINTENANCE.md#automated-update-strategy) for details.

**Update Process:**
1. Make code change
2. Identify affected documentation files
3. Update each file using templates
4. Add cross-references
5. Update "Last Updated" dates
6. Add to change log

**Checklist:** See [DOCUMENTATION-MAINTENANCE.md](./DOCUMENTATION-MAINTENANCE.md) for complete automated update checklist.

---

**Remember:** All documentation is cross-referenced. Use the links to navigate between related topics. When in doubt, check the patterns and gotchas first.
