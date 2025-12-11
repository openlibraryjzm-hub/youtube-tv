# AI Agent Master Onboarding Prompt

**🎯 ULTIMATE PROMPT FOR AI AGENTS**  
**Last Updated:** 2025-01-09  
**Status:** ✅ **PRODUCTION READY - FULLY FUNCTIONAL**

> **Use this prompt when starting a new conversation to get any AI agent fully up to speed on the YouTube TV project. This document is self-contained with all essential information. For deep dives, see [PROJECT-MASTER-DOCUMENTATION.md](./PROJECT-MASTER-DOCUMENTATION.md).**

---

## 🚀 Quick Start

**Read this document completely** - it contains everything you need:
1. Project overview and architecture
2. Tools, dependencies, and setup
3. How everything works fundamentally
4. The breakthrough packaging solution
5. Build protocol and core criteria
6. Code structure and patterns
7. Critical gotchas and how to avoid them
8. Data flow and state management
9. Tauri development patterns
10. Quick reference

**Optional Deep Dive:** [PROJECT-MASTER-DOCUMENTATION.md](./PROJECT-MASTER-DOCUMENTATION.md) - Comprehensive reference with detailed explanations

---

## 🎯 Project Overview

### What It Is
A desktop application that transforms YouTube playlists into a Netflix-like, lean-back viewing experience. Built with Next.js (React) frontend and Tauri (Rust) backend.

### Current Status
✅ **PRODUCTION READY - FULLY FUNCTIONAL**
- Tauri Migration: ✅ Complete
- Database: ✅ Local SQLite working
- Resource Bundling: ✅ Fixed (`_up_/` directory)
- Save Persistence: ✅ Fixed (verification added)
- Zero Dependencies: ✅ No Node.js required for users
- Build Protocol: ✅ Documented and working

### Architecture
- **Frontend:** Next.js static export (React) - Single file `app/page.jsx` (~6000 lines)
- **Backend:** Rust (Tauri v2) - `src-tauri/src/main.rs` and `db.rs`
- **Database:** Local SQLite via `rusqlite` - `%APPDATA%\Roaming\YouTube TV\youtube-tv.db`
- **Data Access:** Tauri commands (Rust functions exposed to JavaScript)
- **Build:** Next.js static export + Tauri bundling → Standalone installer

### User Experience
- **Main Interface:** Full-screen YouTube player (left) + Splitscreen menu (right)
- **Core Features:** Watch videos, organize into colored folders, manage playlists, track progress
- **First Launch:** 20+ default playlists with 20,000+ videos load automatically
- **Data Persistence:** All data saved locally, no cloud account needed

---

## 🛠️ Tools & Dependencies

### Development Tools (Developer Only)
- **Node.js** (v18+) - For building Next.js frontend
- **Rust** (latest stable) - For compiling Tauri backend
- **Windows SDK** - For Windows builds

### Frontend Dependencies
- `next` (^14.2.5) - Next.js framework
- `react` (^18.3.1) - React UI library
- `lucide-react` (^0.441.0) - Icons
- `react-window` (^2.2.0) - Virtual scrolling
- `@tauri-apps/api` (^2.9.1) - Tauri frontend API

### Backend Dependencies (Rust)
- `tauri` (^2.9.4) - Tauri framework
- `rusqlite` (^0.31) - SQLite database (bundled)
- `serde` / `serde_json` - JSON serialization
- `dirs` (^5.0) - System directory access

### Runtime Dependencies (Users)
**✅ ZERO - Completely standalone**
- No Node.js, npm, Rust, or any development tools
- Uses system WebView (Edge WebView2 - pre-installed on Windows)

### External APIs
- **YouTube Data API v3:** Fetch playlist data, video metadata (cached aggressively)
- **YouTube IFrame Player API:** Video playback

---

## 🏗️ How Everything Works

### Application Startup Flow
1. Tauri loads Rust backend
2. Rust initializes SQLite database
3. Default channels loaded from `_up_/default-channels.json`
4. Frontend loads from `out/` directory
5. React app initializes, detects Tauri
6. Data loaded via Tauri commands
7. UI renders with playlists

### Data Flow
```
User Action → React State Update → Debounce (2s) → Tauri Command → 
Rust Handler → SQLite Transaction → Database File → Verification → 
Success/Error → Frontend Feedback
```

### Save Flow
- User makes change (tags video, etc.)
- React state updates immediately (optimistic UI)
- 2-second debounce timer starts
- After quiet period: `save_user_data` Tauri command called
- Rust: SQLite transaction (delete old, insert new)
- Verification: Query count to confirm save
- Return success/error to frontend

### Load Flow
- App starts → `get_user_data` Tauri command
- Rust: Query SQLite database
- If user doesn't exist: Copy from 'default' user
- Return playlists, tabs, colors, progress
- Frontend updates React state
- UI renders

### Key Technical Concepts

**1. Tauri Commands:**
- Rust functions exposed to JavaScript
- Serialization: JavaScript camelCase ↔ Rust snake_case
- Error handling: Rust `Result<T, String>` → JavaScript Promise

**2. Database:**
- SQLite file in AppData
- WAL mode for concurrency
- JSON fields for complex data (playlists, groups, progress)
- Transactions for atomic operations

**3. Resource Bundling:**
- `default-channels.json` bundled in installer
- Located in `_up_/` directory (Tauri NSIS)
- Loaded on first run into database

**4. State Management:**
- Persistent: SQLite database (playlists, tabs, progress)
- Session: React useRef (shuffle orders, positions)
- Separation ensures fresh shuffle each session

---

## 🎉 The Breakthrough: Packaging Solution

### The Problem
App worked on developer's machine but failed on fresh installs:
- Default channels not loading (only 6 playlists instead of 20+)
- Saves not persisting

### The Discovery
**Critical Finding:** Tauri NSIS installers place bundled resources in `_up_/` subdirectory, NOT in standard `resources/` or next to executable.

**File Location:**
```
%LOCALAPPDATA%\YouTube TV\_up_\default-channels.json
```

### The Solution
Added `_up_/` directory to search paths in `db.rs`:
```rust
// Try _up_ subdirectory (Tauri NSIS installer resource location)
let up_dir = exe_dir.join("_up_").join("default-channels.json");
```

**Why It Worked for Developer:**
- Dev environment had file in project root (checked first)
- Different paths in dev vs production

**Why It Failed on Fresh Installs:**
- File only existed in `_up_/` directory
- Code wasn't checking that location
- Result: File existed but was never found

**Impact:**
- Before: Users got 6 playlists (empty fallback)
- After: Users get 20+ playlists with 20,000+ videos
- Professional first-run experience

**Key Lesson:** Always test on fresh environments! Dev machines can have files in different locations.

---

## 📦 Build Protocol & Core Criteria

### Build Process

```powershell
.\build-tauri.ps1 -Clean
```

**What It Does:**
1. Cleans `out/` and `src-tauri/target/`
2. Builds Next.js static export → `out/`
3. Compiles Rust backend
4. Bundles everything into installer
5. Creates installer at: `src-tauri\target\release\bundle\nsis\YouTube TV_0.1.0_x64-setup.exe`

### Core Criteria (MUST Meet All)

**1. ✅ App Functionality**
- Launches without errors
- UI renders correctly
- All features work
- No console errors

**2. ✅ Working Local Database**
- Database created automatically
- Default channels load (20+ playlists)
- Saves persist across restarts
- Database writable

**3. ✅ Zero Node.js Dependency**
- No Node.js processes spawned
- Completely standalone
- Works on fresh Windows installs

### Verification Checklist
Before distributing:
- [ ] Tested on fresh install (Windows Sandbox/VM)
- [ ] Default channels load (20+ playlists)
- [ ] Saves persist after close/reopen
- [ ] No Node.js processes
- [ ] Console shows no critical errors
- [ ] `test_db_connection` command works

---

## 💻 Code Structure

### Frontend (app/page.jsx)

**Single File Architecture:**
- ~6000 lines in one React component
- All logic, state, and UI in one file
- No component splitting (monolithic by design)

**Key Sections:**
- **Lines 1-295:** Imports, config, utilities
- **Lines 296-600:** State declarations
- **Lines 601-1200:** Data loading
- **Lines 1201-2000:** Save operations
- **Lines 2001-3000:** Playback control
- **Lines 3001-4000:** Organization features
- **Lines 4001-5000:** UI rendering
- **Lines 5001-6000:** Event handlers

**Tauri Integration:**
```javascript
// Detect Tauri
const isTauri = typeof window !== 'undefined' && (
  window.__TAURI_INTERNALS__ !== undefined ||
  window.__TAURI__ !== undefined
);

// Get invoke function
const getInvoke = async () => {
  if (!isTauri) return null;
  const { invoke } = await import('@tauri-apps/api/core');
  return invoke;
};

// Call command
const invoke = await getInvoke();
if (invoke) {
  const data = await invoke('get_user_data', { userId: 'user123' });
}
```

### Backend (src-tauri/src/)

**main.rs - Entry Point:**
- Registers Tauri commands
- Sets up resource directory
- Handles app lifecycle

**db.rs - Database Operations:**
- Connection management
- Schema initialization
- Default channels loading
- User data CRUD operations
- Video progress tracking

**Key Patterns:**
- Transactions for atomic operations
- Serialization with `serde` attributes
- Error handling with `Result<T, String>`
- Multi-path resource search

---

## 📋 MANDATORY Code Patterns

### 1. Debounced Save Pattern (CRITICAL)

**Purpose:** Prevent excessive database writes by accumulating changes and saving after a quiet period.

**Pattern:**
```javascript
useEffect(() => {
  if (!userId || !initialVideoLoaded.current) {
    return;
  }
  
  if (mainDataSaveTimer.current) {
    clearTimeout(mainDataSaveTimer.current);
  }
  
  mainDataSaveTimer.current = setTimeout(() => {
    performStagedSave();
  }, 2000); // 2 second debounce
  
  return () => {
    if (mainDataSaveTimer.current) {
      clearTimeout(mainDataSaveTimer.current);
    }
  };
}, [playlists, playlistTabs]);
```

**Key Points:**
- Always clear existing timer before setting new one
- Use ref for timer (not state)
- Cleanup in return function
- Check prerequisites before saving
- Use latest ref values, not closure values

### 2. Session-Specific Data in Refs

**Purpose:** Store data that should reset each session (not saved to database).

**Pattern:**
```javascript
// Declare ref
const playlistShuffleOrders = useRef({});

// Update directly (no setter)
playlistShuffleOrders.current[playlistId] = {
  all: generateNewShuffleOrder(playlist, 'all'),
  red: generateNewShuffleOrder(playlist, 'red'),
};

// Read value
const currentOrder = playlistShuffleOrders.current[playlistId]?.[filter];
```

**Key Points:**
- Use `useRef` for session data
- Update with `.current` directly
- Never save to database
- Reset on page load (automatic with refs)

### 3. Functional State Updates

**Purpose:** Update state that depends on previous state correctly.

**Pattern:**
```javascript
// ✅ Correct: Functional update
setPlaylists(prev => prev.map(p => {
  if (p.id !== playlistId) return p;
  return { ...p, videos: newVideos };
}));

// ❌ Wrong: Direct update (stale closure)
setPlaylists(playlists.map(p => {
  if (p.id !== playlistId) return p;
  return { ...p, videos: newVideos };
}));
```

**Key Points:**
- Always use functional updates for dependent state
- Use `prev` parameter, not closure variable
- Spread existing object before updating
- Return unchanged items as-is

### 4. Tauri Command Pattern

**Purpose:** Call Rust functions from JavaScript.

**Pattern:**
```javascript
// Get invoke function
const invoke = await getInvoke();
if (invoke) {
  try {
    const data = await invoke('get_user_data', { userId: 'user123' });
    // Handle success
  } catch (error) {
    console.error('❌ Tauri command failed:', error);
    // Handle error
  }
} else {
  // Fallback to API routes (dev mode)
  const response = await fetch(`/api/user/${userId}`);
}
```

**Rust Side:**
```rust
#[tauri::command]
pub fn get_user_data(user_id: String) -> Result<UserData, String> {
    // Database operations...
    Ok(user_data)
}
```

**Key Points:**
- Always check if Tauri is available
- Handle errors gracefully
- Provide fallback for dev mode
- Use proper serialization (camelCase ↔ snake_case)

**Adding a New Tauri Command:**

1. **Define in Rust (`src-tauri/src/db.rs`):**
```rust
#[tauri::command]
pub fn my_new_command(param: String) -> Result<String, String> {
    // Do work...
    Ok("success".to_string())
}
```

2. **Register in `main.rs`:**
```rust
.invoke_handler(tauri::generate_handler![
    // ... existing commands
    my_new_command
])
```

3. **Call from Frontend:**
```javascript
const invoke = await getInvoke();
if (invoke) {
    const result = await invoke('my_new_command', { param: 'value' });
}
```

**Error Handling Pattern:**
```rust
.map_err(|e| {
    eprintln!("Error: {}", e);  // Log for debugging
    e.to_string()  // Convert to String for Tauri return
})?
```

### 5. Serialization Pattern (JavaScript ↔ Rust)

**Purpose:** Handle naming convention differences between JavaScript and Rust.

**JavaScript sends:**
```javascript
{
  playlistTabs: [...],
  customColors: {...},
  videoProgress: {...}
}
```

**Rust receives:**
```rust
#[derive(Serialize, Deserialize, Debug)]
pub struct UserData {
    #[serde(rename = "playlistTabs")]
    pub playlist_tabs: Vec<PlaylistTab>,
    #[serde(rename = "customColors")]
    pub custom_colors: serde_json::Value,
    #[serde(rename = "videoProgress", default = "default_video_progress")]
    pub video_progress: serde_json::Value,
}
```

**Key Points:**
- Use `#[serde(rename = "...")]` for field mapping
- Provide defaults for optional fields
- Handle both formats when loading

### 6. Cache-First API Pattern

**Purpose:** Check cache before making API calls to reduce quota usage.

**Pattern:**
```javascript
// Check cache first
const cachedTitles = await checkVideoMetadataCache(videoIds);

// Only fetch uncached items
const idsToFetch = videoIds.filter(id => !cachedTitles[id]);

// Fetch from API only if needed
if (idsToFetch.length > 0) {
  // Make API call...
  // Save to cache
}
```

**Key Points:**
- Always check cache first
- Only fetch uncached items
- Save fetched data to cache
- Track fetched items in session

### 7. API Call Minimization (CRITICAL)

**Core Principle:** "If at a fork in the road, lean in the direction of NOT making API calls for titles and metadata. As long as thumbnails provide playback and videos are in the right playlists/colored folders, that's sufficient."

**Rules:**
1. **Cache-First Always:** Check cache FIRST, session cache SECOND, API LAST
2. **Use Free Data:** Thumbnails (direct URLs), titles from playlistItems response
3. **Skip Non-Essential:** Missing title but has thumbnail? → Skip API call
4. **Only Fetch When:** User explicitly requests (bulk add, search), first-time video (not in cache)

**Never Make API Calls For:**
- Background title fetching if cache exists
- Metadata that's "nice to have" but not essential
- Redundant fetches (check cache first!)

---

## 🚨 Critical Gotchas

### 1. Resource File Location (`_up_/` Directory)

**Problem:** `default-channels.json` not found on fresh installs.

**Solution:** Must check `_up_/` directory (Tauri NSIS installer resource location).

**Prevention:**
```rust
// Check multiple paths in order:
// 1. Project root (development)
// 2. Tauri resource directory
// 3. Executable directory
// 4. resources/ subdirectory
// 5. _up_/ subdirectory ← Critical for NSIS installers
```

### 2. Serialization Mismatch

**Problem:** JavaScript camelCase vs Rust snake_case.

**Solution:** Use `#[serde(rename = "...")]` attributes in Rust structs.

**Prevention:**
```rust
#[serde(rename = "playlistTabs")]
pub playlist_tabs: Vec<PlaylistTab>,
```

### 3. Transaction Borrowing

**Problem:** Can't commit transaction while statement borrows it.

**Solution:** Wrap statement in block `{}` so it's dropped before commit.

**Prevention:**
```rust
let tx = conn.transaction()?;
{
    let mut stmt = tx.prepare("INSERT INTO ...")?;
    // Use stmt...
}  // stmt dropped here
tx.commit()?;  // Now safe to commit
```

### 4. PRAGMA Returns Value

**Problem:** `PRAGMA journal_mode = WAL` returns a value.

**Solution:** Use `query_row` instead of `execute`.

**Prevention:**
```rust
// ❌ Wrong
conn.execute("PRAGMA journal_mode = WAL", [])?;

// ✅ Correct
conn.query_row("PRAGMA journal_mode = WAL", [], |row| {
    Ok(row.get::<_, String>(0)?)
})?;
```

### 5. Stale Closures in useEffect

**Problem:** useEffect captures old state values, causing stale data.

**Solution:** Use functional updates and refs for latest values.

**Prevention:**
```javascript
// ❌ Wrong: Uses closure value
useEffect(() => {
  saveToDatabase(playlists); // Uses old playlists
}, [playlists]);

// ✅ Correct: Uses ref
useEffect(() => {
  latestPlaylistsRef.current = playlists;
}, [playlists]);

const performSave = () => {
  const playlistsToSave = latestPlaylistsRef.current; // Latest value
};
```

### 6. Orphaned Video IDs in Groups

**Problem:** Video IDs in colored folder groups don't have corresponding video objects.

**Solution:** Always verify group video IDs exist in videos array before saving.

**Prevention:**
```javascript
// Before saving, check for orphaned IDs
const videoIdsInArray = new Set((p.videos || []).map(v => v?.id).filter(Boolean));
const orphanedIds = group.videos.filter(id => !videoIdsInArray.has(id));
if (orphanedIds.length > 0) {
  // Remove orphaned IDs
  fixedGroups[color] = {
    ...group,
    videos: group.videos.filter(id => videoIdsInArray.has(id))
  };
}
```

### 7. Excessive API Usage

**Problem:** Hitting YouTube Data API daily quota limits.

**Solution:** Cache-first, skip non-essential fetches, use free data sources.

**Prevention:**
- Check cache FIRST
- Use thumbnails (free, no quota)
- Only fetch when user explicitly requests
- Skip if video has thumbnail but missing title

---

## 🔧 Development Workflow

### Local Development

```powershell
# Terminal 1
npm run dev              # Next.js dev server (http://localhost:3000)

# Terminal 2
npx tauri dev            # Tauri dev mode (opens window, hot reload)
```

**Dev Mode:**
- Uses API routes as fallback if Tauri not available
- Hot reload for both frontend and backend
- Fast iteration

### Making Changes

**Frontend:**
1. Edit `app/page.jsx`
2. Save → Hot reload
3. See changes immediately

**Backend:**
1. Edit `src-tauri/src/*.rs`
2. Save → Tauri recompiles
3. App restarts with new code

### Production Build

```powershell
.\build-tauri.ps1 -Clean
# Creates installer: src-tauri\target\release\bundle\nsis\YouTube TV_0.1.0_x64-setup.exe
```

### Testing

**Quick Test:** Use dev mode  
**Production Test:** Run built `.exe`  
**Fresh Install Test:** Windows Sandbox or new user account

**Testing Procedures:**
- **Windows Sandbox:** Settings → Apps → Optional Features → Windows Sandbox (resets automatically)
- **New User Account:** `net user TestUser /add` → test → `net user TestUser /delete`
- **Test Script:** `.\test-fresh-install.ps1` - Creates fresh test database

**Test Checklist:**
- [ ] App installs successfully
- [ ] App launches without errors
- [ ] Default channels load (check console for "Default playlists in DB: X")
- [ ] Can make changes (tag videos, etc.)
- [ ] Changes persist after closing/reopening app
- [ ] Database file exists in `%APPDATA%\Roaming\YouTube TV\`
- [ ] No Node.js processes spawned (check Task Manager)
- [ ] Console shows no critical errors

**Testing Procedures:**
- **Windows Sandbox:** Settings → Apps → Optional Features → Windows Sandbox (resets automatically)
- **New User Account:** `net user TestUser /add` → test → `net user TestUser /delete`
- **Test Script:** `.\test-fresh-install.ps1` - Creates fresh test database

**Test Checklist:**
- [ ] App installs successfully
- [ ] App launches without errors
- [ ] Default channels load (check console for "Default playlists in DB: X")
- [ ] Can make changes (tag videos, etc.)
- [ ] Changes persist after closing/reopening app
- [ ] Database file exists in `%APPDATA%\Roaming\YouTube TV\`
- [ ] No Node.js processes spawned (check Task Manager)
- [ ] Console shows no critical errors

---

## 📊 Database Schema

### Users Table
```sql
CREATE TABLE users (
    user_id TEXT PRIMARY KEY,
    custom_colors TEXT,        -- JSON: { "red": "#ff0000", ... }
    color_order TEXT,          -- JSON: ["red", "green", "blue", ...]
    playlist_tabs TEXT,        -- JSON: [{ "name": "All", "playlistIds": [...] }]
    video_progress TEXT,       -- JSON: { "videoId1": 123.45, "videoId2": 67.89 }
    updated_at INTEGER          -- Unix timestamp
);
```

### Playlists Table
```sql
CREATE TABLE playlists (
    user_id TEXT NOT NULL,
    playlist_id TEXT NOT NULL,
    name TEXT NOT NULL,
    videos TEXT NOT NULL,      -- JSON: ["videoId1", "videoId2", ...]
    groups TEXT,               -- JSON: { "red": { "name": "...", "videos": [...] } }
    starred TEXT,              -- JSON: ["videoId1", "videoId2"]
    category TEXT,
    description TEXT,
    thumbnail TEXT,
    is_converted_from_colored_folder INTEGER DEFAULT 0,
    representative_video_id TEXT,
    is_default INTEGER DEFAULT 0,
    updated_at INTEGER,
    PRIMARY KEY (user_id, playlist_id),
    FOREIGN KEY (user_id) REFERENCES users(user_id)
);
```

---

## 🎯 Tauri Commands Reference

### Available Commands

**Data Operations:**
- `get_user_data(userId)` - Load user's playlists and settings
- `save_user_data(userId, data)` - Persist user changes
- `save_video_progress(userId, videoProgress)` - Save watch progress

**Diagnostics:**
- `test_db_connection()` - Test database connectivity and permissions
- `check_default_channels()` - Check if default channels loaded
- `force_initialize_default_channels()` - Manually reload default channels

### Usage in Frontend

```javascript
const invoke = await getInvoke();
if (invoke) {
  const data = await invoke('get_user_data', { userId: 'user123' });
  await invoke('save_user_data', { userId: 'user123', data: {...} });
  await invoke('test_db_connection', {});
}
```

---

## 📁 File Locations

**Installer:**
```
src-tauri\target\release\bundle\nsis\YouTube TV_0.1.0_x64-setup.exe
```

**Database (User's Machine):**
```
%APPDATA%\Roaming\YouTube TV\youtube-tv.db
```

**Default Channels (Bundled):**
```
%LOCALAPPDATA%\YouTube TV\_up_\default-channels.json
```

---

## 🚨 Critical Rules

### ⚠️ ALWAYS

1. **Follow patterns above** - Mandatory patterns
2. **Use Tauri commands** - Not API routes for data
3. **Debounce saves** - 2 seconds
4. **Verify saves persist** - Check database
5. **Test on fresh install** - Not just dev machine
6. **Check `_up_/` directory** - Critical for resource loading
7. **Use functional state updates** - Prevent stale closures
8. **Cache-first API calls** - Minimize quota usage
9. **Handle serialization** - camelCase ↔ snake_case mapping

### 🚫 NEVER

1. **Don't use API routes** - Use Tauri commands
2. **Don't assume Node.js** - Tauri apps are standalone
3. **Don't mutate state directly** - Use functional updates
4. **Don't skip `_up_/` check** - Critical for resource loading
5. **Don't forget serialization** - camelCase ↔ snake_case mapping
6. **Don't skip verification** - Always verify saves persist
7. **Don't make unnecessary API calls** - Cache-first, skip non-essential

---

## 📝 When Making Changes

### Process

1. **Read Relevant Sections:**
   - Patterns section (above)
   - Gotchas section (above)
   - Code structure section (above)

2. **Make Changes:**
   - Follow patterns exactly
   - Use Tauri commands for data
   - Debounce all saves
   - Verify saves persist

3. **Test:**
   - Quick test in dev mode
   - Production build test
   - Fresh install test (if critical)

4. **Update Documentation (see Documentation Maintenance Protocol below):**
   - Update affected sections immediately
   - Document challenges as they arise
   - Document solutions when challenges are solved

### For Specific Tasks

**Adding Tauri Command:**
1. Define in `db.rs`: `#[tauri::command] pub fn my_command(...)`
2. Register in `main.rs`: Add to `generate_handler![...]`
3. Call from frontend: `await invoke('my_command', {...})`
4. Handle serialization: Add `#[serde(rename = "...")]` if needed

**Adding Frontend Feature:**
1. Check patterns section for similar patterns
2. Add state if needed (useState/useRef)
3. Add UI in appropriate section
4. Connect to Tauri commands for persistence
5. Test and verify

**Fixing Bugs:**
1. Check gotchas section for similar issues
2. Trace data flow to find root cause
3. Apply fix following patterns
4. Document fix

---

## 🎯 Current Status

**✅ Production Ready:**
- Core features: Complete
- Tauri Migration: Complete
- Database: Working (SQLite)
- Resource Bundling: Fixed
- Save Persistence: Fixed
- Build Protocol: Documented
- Zero Dependencies: Confirmed

**📊 Project Metrics:**
- Frontend: ~6000 lines (single file)
- Backend: ~700 lines (Rust)
- Database: SQLite (local file)
- Installer Size: ~5-10MB
- Default Playlists: 20+ with 20,000+ videos

---

## 🎓 Key Principles

1. **Local-First:** All data stored locally, no cloud dependency
2. **Zero Dependencies:** Works on fresh Windows installs
3. **Debounced Saves:** 2-second quiet period prevents excessive writes
4. **Session vs Persistent:** Shuffle orders are session-only (fresh each time)
5. **API Minimization:** Cache aggressively, minimize YouTube API calls
6. **Error Handling:** Always verify operations, show user feedback
7. **Resource Bundling:** Always check `_up_/` directory for bundled files

---

## 💡 Quick Tips

**For New Features:**
- Check patterns section for similar patterns
- Test on fresh install before distributing

**For Bug Fixes:**
- Check gotchas section first
- Trace data flow to find root cause

**For Questions:**
- Read this document completely
- Check [PROJECT-MASTER-DOCUMENTATION.md](./PROJECT-MASTER-DOCUMENTATION.md) for deep dives

---

## 🚀 Ready to Code

You now have complete context on:
- ✅ What the app is and does
- ✅ How it's built and packaged
- ✅ How everything works fundamentally
- ✅ The breakthrough solutions
- ✅ User experience
- ✅ Tools and dependencies
- ✅ Code structure
- ✅ Development workflow
- ✅ Critical rules and patterns
- ✅ Common gotchas and how to avoid them

**You're ready to vibe code or provide expert advice!**

What would you like to work on?

---

## 🔧 Scripts & Automation

### Tauri Build Scripts (Current)

**build-tauri.ps1** - Main build script for Tauri app
```powershell
.\build-tauri.ps1          # Quick build (no clean)
.\build-tauri.ps1 -Clean    # Full clean build (recommended)
```
**What it does:**
- Cleans `out/` and `src-tauri/target/` (if `-Clean` flag)
- Builds Next.js static export → `out/`
- Compiles Rust backend
- Bundles everything into installer
- Copies `default-channels.json` to release directory
- Creates installer at: `src-tauri\target\release\bundle\nsis\YouTube TV_0.1.0_x64-setup.exe`

**test-fresh-install.ps1** - Test with fresh database
```powershell
.\test-fresh-install.ps1
```
**What it does:**
- Sets `DATABASE_PATH` environment variable to test location
- Creates fresh test database directory
- Allows testing persistence without affecting real database
- Note: Environment variable only set for current PowerShell session

**audit-node-processes.ps1** - Check for Node.js processes
```powershell
.\audit-node-processes.ps1
```
**What it does:**
- Scans for all Node.js processes
- Shows process paths and command lines
- Identifies source (Tauri dev, Electron, VS Code/Cursor, etc.)
- Verifies Tauri app is running from release build
- Helps diagnose if Node.js processes are from app (shouldn't be) or editor

### Git/Workflow Scripts

**save-session.ps1** - Create session checkpoint
```powershell
.\save-session.ps1
```
**What it does:**
- Commits all changes with timestamp
- Pushes to GitHub
- Creates session tag (e.g., `session-20250109-1430`)
- Useful for saving work after each AI conversation

**cleanup-old-sessions.ps1** - Cleanup old session tags
```powershell
.\cleanup-old-sessions.ps1
```
**What it does:**
- Keeps only last 5 session tags
- Deletes older session tags (local and remote)
- Prevents tag clutter

**push-to-github.ps1** - Push to GitHub (AI updates commit message before user runs)
```powershell
.\push-to-github.ps1
```
**Protocol:**
- When user requests a push, AI analyzes all changes since last push
- AI updates the script's commit message with current, accurate information
- User then runs the script to commit and push
- Ensures commit messages are always accurate and reflect current state

**What it does:**
- Stages all changes (`git add .`)
- Commits with AI-updated message
- Pushes to GitHub (`git push origin main`)

### Legacy Scripts (Electron Era - Outdated)

**scripts/verify-standalone.js** - Verify Electron standalone build
- **Status:** ❌ Outdated (for Electron, not Tauri)
- **Purpose:** Was used to verify Next.js standalone build for Electron
- **Current:** Not needed for Tauri (uses static export)

**scripts/ensure-complete-build.js** - Ensure Electron build complete
- **Status:** ❌ Outdated (for Electron, not Tauri)
- **Purpose:** Was used to verify Electron build completeness
- **Current:** Not needed for Tauri

**scripts/ensure-node-modules-in-package.js** - Ensure node_modules in Electron package
- **Status:** ❌ Outdated (for Electron, not Tauri)
- **Purpose:** Was used to copy node_modules for Electron packaging
- **Current:** Not needed for Tauri (no Node.js required)

**scripts/verify-packaged.js** - Verify Electron package
- **Status:** ❌ Outdated (for Electron, not Tauri)
- **Purpose:** Was used to verify Electron package contents
- **Current:** Not needed for Tauri

**scripts/prune-standalone.js** - Prune Electron standalone build
- **Status:** ❌ Outdated (for Electron, not Tauri)
- **Purpose:** Was used to reduce Electron package size
- **Current:** Not needed for Tauri

### Utility Scripts (May Need Updates)

**export-to-template.js** - Export data to template format
```bash
node export-to-template.js [userId]
```
- **Status:** ⚠️ Uses `better-sqlite3` (Node.js)
- **Purpose:** Export user data to `default-channels.json` format
- **Note:** May need update to work with Tauri database location

**view-your-data.js** - View database data
```bash
node view-your-data.js [userId]
```
- **Status:** ⚠️ Uses `better-sqlite3` (Node.js)
- **Purpose:** View user's playlists and data from database
- **Note:** May need update to work with Tauri database location

**analyze-bottlenecks.js** - Analyze database
```bash
node analyze-bottlenecks.js
```
- **Status:** ⚠️ Uses `better-sqlite3` (Node.js)
- **Purpose:** Analyze database size and structure
- **Note:** May need update to work with Tauri database location

### Script Usage Summary

**For Tauri Development:**
- ✅ `build-tauri.ps1` - Main build script (use this!)
- ✅ `test-fresh-install.ps1` - Test fresh installs
- ✅ `audit-node-processes.ps1` - Diagnose Node.js processes

**For Git Workflow:**
- ✅ `save-session.ps1` - Save work checkpoints
- ✅ `cleanup-old-sessions.ps1` - Cleanup old tags

**Legacy (Don't Use):**
- ❌ All `scripts/*.js` files (Electron era)
- ⚠️ Utility scripts may need updates for Tauri

---

## 📝 Documentation Maintenance Protocol

### After Each Code Change

**Immediately update documentation:**

1. **Identify affected sections:**
   - New functions → Update "Code Structure" section
   - New state/patterns → Update "Mandatory Code Patterns" section
   - New gotchas → Update "Critical Gotchas" section
   - Architecture changes → Update "How Everything Works" section

2. **Update AI-ONBOARDING-PROMPT.md:**
   - Add/update relevant sections
   - Update "Last Updated" date at top
   - Add cross-references if new sections created

3. **Update PROJECT-MASTER-DOCUMENTATION.md (if significant):**
   - Add detailed explanations
   - Update "Recent Developments" section
   - Add to change log

**Don't wait for review - update immediately after code changes.**

### When Challenges Arise and Get Solved

**As challenges arise:**
1. **Document the problem** in "Critical Gotchas" section
2. **Note the investigation** in relevant sections
3. **Update status** if it affects project status

**When challenges are solved:**
1. **Update "Critical Gotchas"** - Mark as resolved, document solution
2. **Add to "Mandatory Code Patterns"** - If solution becomes a pattern
3. **Update "Recent Developments"** - Document the breakthrough
4. **Update "Last Updated" date**

**Key principle:** Documentation should reflect current state. Update as you go, not later.

---

## 🔄 Git Workflow

### Push Protocol (When User Requests)

**⚠️ IMPORTANT: Only commit/push when the user explicitly requests it. Do NOT automatically commit changes.**

**When the user requests a git push:**

1. **Analyze all changes** since last git push:
   - Check `git status` to see modified/deleted/new files
   - Review what changes were made in the current session
   - Identify all files affected

2. **Update `push-to-github.ps1` script** with current information:
   - Update the commit message in the script with accurate changes
   - List all files modified/deleted/created
   - Include user's exact request
   - Ensure commit message reflects current state

3. **User runs the script:**
   ```powershell
   .\push-to-github.ps1
   ```

4. **Script handles:**
   - Stages all changes (`git add .`)
   - Commits with the updated message
   - Pushes to GitHub (`git push origin main`)

**Commit Message Format (in script):**
```
[AI] User Request: "[exact user prompt]"

Changes:
- [List of specific changes made since last push]
- [Files modified]
- [Files deleted]
- [Files created]

Files Modified:
- [List with brief descriptions]

Files Deleted:
- [List of deleted files]

Files Created:
- [List of new files]
```

**This ensures the commit message is always accurate and up-to-date when the user pushes.**

### Session Checkpoints (When User Requests)

**When the user requests a session checkpoint:**
```powershell
.\save-session.ps1
```

**What it does:**
- Commits all changes with timestamp
- Pushes to GitHub
- Creates session tag (e.g., `session-20250109-1430`)

**Cleanup old sessions (when user requests):**
```powershell
.\cleanup-old-sessions.ps1  # Keeps only last 5 session tags
```

### Version Tags

**For major milestones:**
```bash
git tag -a v1.0.0 -m "Description"
git push origin v1.0.0
```

---

## 📚 Related Documentation

**Optional Deep Dive:**
- [PROJECT-MASTER-DOCUMENTATION.md](./PROJECT-MASTER-DOCUMENTATION.md) - Comprehensive reference with detailed explanations

**All documentation is cross-referenced. Use links to navigate.**

---

**Remember:** This is a production-ready, fully functional application. All critical issues have been resolved. The build protocol is documented and working. You can confidently make changes, add features, or provide advice based on this comprehensive context.
