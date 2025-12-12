# Tauri Migration - Complete Context & Knowledge Base

**Date Created:** 2025-01-09  
**Last Updated:** 2025-01-10  
**Project:** YouTube TV Desktop App  
**Migration:** Electron → Tauri v2  
**Status:** ✅ **PRODUCTION READY - FULLY FUNCTIONAL**

**Recent Updates (2025-01-10):**
- Fixed thumbnail loading: Switched to blob URLs for reliable local file thumbnails
- Improved local video playback: Always start at 0:00, smooth autoplay, fixed glitches
- Implemented lazy loading: Prevents crashes with large playlists (6GB+)
- Fixed MKV support: Added MKV to main "Video Files" filter with case-insensitive support (mkv, MKV)
  - Updated both file dialog locations ("Add videos" and "Add local folder")
  - MKV files now visible in file picker and can be uploaded successfully

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Migration Goals](#migration-goals)
3. [Technical Architecture](#technical-architecture)
4. [Build Process](#build-process)
5. [Database & Persistence](#database--persistence)
6. [Resource Bundling](#resource-bundling)
7. [Issues Encountered & Solutions](#issues-encountered--solutions)
8. [Testing Procedures](#testing-procedures)
9. [Distribution](#distribution)
10. [📦 Packaging Protocol](#-packaging-protocol-complete-working-build-process) ← **Complete build process**
11. [Known Issues & Future Work](#known-issues--future-work)
12. [Key Files & Their Purpose](#key-files--their-purpose)
13. [Troubleshooting Guide](#troubleshooting-guide)
14. [🎉 Victory: Final Solution](#-victory-final-solution--resolution) ← **How we got it working**

---

## Project Overview

### Original State
- **Framework:** Next.js application
- **Desktop Wrapper:** Electron
- **Database:** SQLite via `better-sqlite3` (Node.js)
- **API Routes:** Next.js API routes for data persistence
- **Build:** Next.js standalone build + Electron packaging

### Target State
- **Framework:** Next.js application (static export)
- **Desktop Wrapper:** Tauri v2 (Rust backend)
- **Database:** SQLite via `rusqlite` (Rust)
- **API:** Tauri commands (Rust functions exposed to frontend)
- **Build:** Next.js static export + Tauri bundling

### Why Migrate?
1. **Smaller Bundle Size:** Tauri produces much smaller executables (~5-10MB vs 100MB+)
2. **No Node.js Dependency:** Completely standalone, no runtime required
3. **Better Performance:** Native Rust backend vs Node.js
4. **Security:** Smaller attack surface, system WebView
5. **Zero-Install Experience:** Users don't need Node.js installed

---

## Migration Goals

### Primary Objectives
✅ Convert Next.js to static export  
✅ Replace Node.js API routes with Tauri commands  
✅ Migrate SQLite access from `better-sqlite3` to `rusqlite`  
✅ Bundle `default-channels.json` template file  
✅ Ensure saves persist across app restarts  
✅ Create standalone installer (no dependencies)

### Critical Requirements
1. **Default Channels Template:** Must be bundled and loaded on first run
2. **Data Persistence:** User changes must persist in local SQLite database
3. **Zero Dependencies:** App must work on fresh Windows installs
4. **Backward Compatibility:** Database structure should support future migrations

---

## Technical Architecture

### Frontend (Next.js)
- **Location:** `app/page.jsx`
- **Build Output:** `out/` directory (static HTML/CSS/JS)
- **Tauri Detection:** Checks for `window.__TAURI__` or `window.__TAURI_INTERNALS__`
- **Data Access:** Conditional - Tauri `invoke()` commands or fallback to API routes (dev mode)

### Backend (Rust/Tauri)
- **Entry Point:** `src-tauri/src/main.rs`
- **Database Module:** `src-tauri/src/db.rs`
- **Commands Exposed:**
  - `test_db_connection` - Diagnostic command
  - `get_user_data` - Load user's playlists and settings
  - `save_user_data` - Persist user changes
  - `save_video_progress` - Save video watch progress
  - `check_default_channels` - Check if default channels loaded
  - `force_initialize_default_channels` - Manually reload default channels

### Database Schema
```sql
-- Users table
CREATE TABLE IF NOT EXISTS users (
    user_id TEXT PRIMARY KEY,
    custom_colors TEXT,
    color_order TEXT,
    playlist_tabs TEXT,
    video_progress TEXT,
    updated_at INTEGER
);

-- Playlists table
CREATE TABLE IF NOT EXISTS playlists (
    user_id TEXT NOT NULL,
    playlist_id TEXT NOT NULL,
    name TEXT NOT NULL,
    videos TEXT NOT NULL,  -- JSON array
    groups TEXT NOT NULL,   -- JSON object
    starred TEXT NOT NULL,  -- JSON array
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

### Data Flow
```
Frontend (JavaScript)
    ↓
Tauri Invoke Command
    ↓
Rust Handler Function
    ↓
SQLite Database (rusqlite)
    ↓
AppData\Roaming\YouTube TV\youtube-tv.db
```

---

## Build Process

### Prerequisites
- Node.js (for building Next.js)
- Rust (for building Tauri)
- Windows SDK (for Windows builds)

### Build Steps

1. **Build Next.js Static Export:**
   ```powershell
   npm run build
   ```
   - Outputs to `out/` directory
   - Static HTML/CSS/JS files

2. **Build Tauri App:**
   ```powershell
   npx tauri build
   ```
   - Compiles Rust backend
   - Bundles frontend from `out/`
   - Creates installer in `src-tauri/target/release/bundle/nsis/`

### Automated Build Script
**File:** `build-tauri.ps1`

```powershell
.\build-tauri.ps1 [-Clean]
```

**What it does:**
1. Optionally cleans `out/` and `src-tauri/target/` (if `-Clean` flag)
2. Runs `npm run build` (Next.js static export)
3. Runs `npx tauri build` (Tauri compilation & bundling)
4. Copies `default-channels.json` to release directory

### Build Configuration

**`next.config.js`:**
```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',  // ← Critical: enables static export
  trailingSlash: true,
  images: { unoptimized: true },  // Required for static export
};
module.exports = nextConfig;
```

**`src-tauri/tauri.conf.json`:**
```json
{
  "productName": "YouTube TV",
  "version": "0.1.0",
  "build": {
    "beforeBuildCommand": "npm run build",
    "frontendDist": "../out"
  },
  "bundle": {
    "active": true,
    "targets": "nsis",
    "resources": [
      "../default-channels.json"
    ]
  }
}
```

---

## Database & Persistence

### Database Location
- **Path:** `%APPDATA%\Roaming\YouTube TV\youtube-tv.db`
- **Platform:** Windows: `C:\Users\<username>\AppData\Roaming\YouTube TV\`
- **Isolation:** Separate from Electron version (which uses `youtube-tv` folder)

### Database Initialization
1. **First Run:**
   - Database file created automatically
   - Schema initialized via `initialize_schema()`
   - Default channels loaded from `default-channels.json` template

2. **Default Channels Loading:**
   - Searches multiple locations (in order):
     1. Project root (development)
     2. Tauri resource directory (packaged app)
     3. Executable directory (fallback)
     4. `resources/` subdirectory (fallback)
     5. **`_up_/` subdirectory (Tauri NSIS installer location)** ← **Critical for fresh installs**
   - Loads into database as `user_id = 'default'`
   - User data copies from 'default' on first load if empty
   - **Location on Windows:** `%LOCALAPPDATA%\YouTube TV\_up_\default-channels.json`

### Data Persistence Flow

**Save Operation:**
```
User makes changes (tags videos, etc.)
    ↓
Frontend: saveUserData() called
    ↓
Tauri: invoke('save_user_data', { userId, data })
    ↓
Rust: save_user_data() command
    ↓
SQLite Transaction:
    1. Upsert user record
    2. Delete existing playlists
    3. Insert new playlists
    4. Commit transaction
    ↓
Verification: Query count to confirm save
    ↓
Return success/error
```

**Load Operation:**
```
App starts
    ↓
Frontend: fetchUserData() called
    ↓
Tauri: invoke('get_user_data', { userId })
    ↓
Rust: get_user_data() command
    ↓
SQLite Query:
    1. Check if user exists
    2. If not, copy from 'default' user
    3. Load playlists, tabs, colors, progress
    ↓
Return UserData struct
    ↓
Frontend: Update React state
```

### Serialization Challenges

**Problem:** JavaScript uses camelCase, Rust uses snake_case

**Solution:** `serde` rename attributes:
```rust
#[derive(Serialize, Deserialize, Debug)]
pub struct UserData {
    pub playlists: Vec<Playlist>,
    #[serde(rename = "playlistTabs")]  // ← Maps JS "playlistTabs" to Rust "playlist_tabs"
    pub playlist_tabs: Vec<PlaylistTab>,
    #[serde(rename = "customColors")]
    pub custom_colors: serde_json::Value,
    #[serde(rename = "colorOrder")]
    pub color_order: Vec<String>,
    #[serde(rename = "videoProgress", default = "default_video_progress")]
    pub video_progress: serde_json::Value,
}
```

---

## Resource Bundling

### Default Channels Template
**File:** `default-channels.json` (project root)

**Purpose:** Template with default playlists that users get on first install

**Bundling:**
- Listed in `tauri.conf.json` → `bundle.resources`
- Copied to installer package
- Accessed at runtime via resource directory

**Loading Logic:**
- Searches multiple paths (see Database Initialization)
- Logs diagnostic messages via `eprintln!()` for debugging
- Falls back gracefully if not found (user gets empty playlists)

### Resource Access Pattern
```rust
// In main.rs setup:
if let Ok(exe_path) = std::env::current_exe() {
    if let Some(exe_dir) = exe_path.parent() {
        // Try _up_ subdirectory first (Tauri NSIS installer location)
        let up_path = exe_dir.join("_up_");
        if up_path.exists() {
            set_resource_dir(Some(up_path));
        } else {
            // Fallback to resources or exe directory
            set_resource_dir(Some(exe_dir.to_path_buf()));
        }
    }
}

// In db.rs - initialize_default_channels():
// Checks multiple paths including _up_/default-channels.json
```

**Critical Discovery:**
- Tauri NSIS installers use `_up_` directory for bundled resources
- This is NOT documented in standard Tauri docs
- Must be explicitly checked in code

---

## Issues Encountered & Solutions

### Issue 1: Next.js Static Export
**Problem:** Next.js API routes incompatible with static export

**Solution:**
- Added `export const dynamic = 'force-static'` to API routes
- Added `generateStaticParams` for dynamic routes
- Deleted problematic nested API route files
- Converted all data operations to Tauri commands

### Issue 2: Tauri v1 vs v2 API Differences
**Problem:** Code written for Tauri v1, project uses v2

**Solution:**
- Removed `WebviewWindow::new()` calls (v1 API)
- Simplified to `tauri::Builder::default().run()`
- Removed `tauri-plugin-shell` (not needed)
- Updated to minimal v2 API usage

### Issue 3: SQLite PRAGMA Returns Value
**Problem:** `PRAGMA journal_mode = WAL` returns a value, can't use `execute()`

**Solution:**
```rust
// Wrong:
conn.execute("PRAGMA journal_mode = WAL", [])?;

// Correct:
let _: String = conn.query_row("PRAGMA journal_mode = WAL", [], |row| row.get(0))?;
```

### Issue 4: Rust Borrow Checker - Transaction
**Problem:** Can't commit transaction while statement borrows it

**Solution:**
```rust
// Wrap statement in block so it's dropped before commit
{
    let mut stmt = tx.prepare("...")?;
    // Use stmt...
}  // stmt dropped here
tx.commit()?;  // Now safe to commit
```

### Issue 5: Serialization Mismatch
**Problem:** Frontend sends camelCase, Rust expects snake_case

**Solution:** Added `#[serde(rename = "...")]` attributes to all structs:
- `playlistTabs` → `playlist_tabs`
- `customColors` → `custom_colors`
- `colorOrder` → `color_order`
- `playlistIds` → `playlist_ids`
- `isConvertedFromColoredFolder` → `is_converted_from_colored_folder`

### Issue 6: Default Channels Not Loading (FINAL FIX)
**Problem:** `default-channels.json` not found in packaged app on fresh installs

**Root Cause:** Tauri NSIS installers place bundled resources in `_up_` subdirectory, not standard locations

**Solution:**
- Added to `tauri.conf.json` → `bundle.resources`
- Implemented multi-path search including `_up_/` directory
- Added diagnostic logging
- Set resource directory during app setup
- **Critical Fix:** Added `exe_dir/_up_/default-channels.json` to search paths

**File Location on Windows:**
```
%LOCALAPPDATA%\YouTube TV\_up_\default-channels.json
```

**Search Order (Final):**
1. Project root (development)
2. Tauri resource directory
3. Executable directory
4. `resources/` subdirectory
5. **`_up_/` subdirectory** ← **This was the missing piece!**

### Issue 7: Saves Not Persisting
**Problem:** Saves appear to work but don't persist on restart

**Solution:**
- Added save verification (query count after save)
- Improved error handling (no silent failures)
- Added write permission checks
- Better error messages to frontend
- Alert dialogs when saves fail

### Issue 8: TypeScript Syntax in JSX
**Problem:** Used `(window as any)` in `.jsx` file

**Solution:** Removed type assertion, used direct property access

### Issue 9: Resource Directory API
**Problem:** `tauri::path::resource_dir()` doesn't exist in v2

**Solution:** Use executable directory as resource base, fallback to multiple paths

---

## Testing Procedures

### Local Testing
1. **Development Mode:**
   ```powershell
   npm run dev
   npx tauri dev
   ```
   - Uses API routes (fallback)
   - Hot reload enabled
   - Database in project directory (if `DATABASE_PATH` set)

2. **Production Build Test:**
   ```powershell
   .\build-tauri.ps1
   # Run: src-tauri\target\release\app.exe
   ```
   - Tests actual packaged app
   - Uses bundled resources
   - Database in AppData

### Fresh Environment Testing

**Option 1: Windows Sandbox** (Recommended)
- Enable: Settings → Apps → Optional Features → Windows Sandbox
- Launch: Search "Windows Sandbox"
- Test: Install app, verify behavior
- Reset: Close Sandbox (everything resets)

**Option 2: New User Account**
```powershell
# As Administrator
net user TestUser /add
# Switch user, test, then:
net user TestUser /delete
```

**Option 3: Test Script**
```powershell
.\test-fresh-install.ps1
# Sets DATABASE_PATH to test location
```

### Test Checklist
- [ ] App installs successfully
- [ ] App launches without errors
- [ ] Default channels load (check console: "Default playlists in DB: X")
- [ ] Can make changes (tag videos, etc.)
- [ ] Changes persist after close/reopen
- [ ] Database file exists in `%APPDATA%\Roaming\YouTube TV\`
- [ ] No Node.js processes spawned
- [ ] Console shows no critical errors
- [ ] `test_db_connection` command works
- [ ] Write permissions verified

---

## Distribution

### Installer Location
```
src-tauri\target\release\bundle\nsis\YouTube TV_0.1.0_x64-setup.exe
```

### Installer Contents
- Rust executable (`app.exe`)
- Static frontend files (from `out/`)
- Bundled resources (`default-channels.json` in `_up_/` directory)
- NSIS installer script
- Uninstaller

### User Experience
1. **Download installer**
2. **Run installer** (standard Windows installer)
3. **App installed** to `%LOCALAPPDATA%\YouTube TV\`
4. **Launch app** (Start Menu shortcut created)
5. **First run:**
   - Database created in `%APPDATA%\Roaming\YouTube TV\`
   - Default channels loaded from template (from `_up_/` directory)
   - Ready to use immediately

### No Dependencies Required
- ✅ No Node.js needed
- ✅ No npm/node_modules
- ✅ No separate runtime
- ✅ Works on fresh Windows installs
- ✅ Uses system WebView (Edge WebView2)

---

## 📦 Packaging Protocol: Complete Working Build Process

### Core Criteria for Production Builds

A successful build MUST meet these criteria:

1. **✅ App Functionality:**
   - App launches without errors
   - UI renders correctly
   - All features work (video playback, playlist management, etc.)
   - No console errors on startup

2. **✅ Working Local Database:**
   - Database file created automatically on first run
   - Location: `%APPDATA%\Roaming\YouTube TV\youtube-tv.db`
   - Default channels load from `_up_/default-channels.json`
   - Saves persist across app restarts
   - Database is writable (permissions verified)

3. **✅ Zero Node.js Dependency:**
   - No Node.js processes spawned by the app
   - No npm/node_modules required
   - Completely standalone executable
   - Works on fresh Windows installs (no prerequisites)

### Complete Packaging Protocol

**Step 1: Verify Prerequisites**
```powershell
# Ensure you have:
# - Node.js (for building only, not required by users)
# - Rust (for building only, not required by users)
# - default-channels.json in project root
```

**Step 2: Clean Build (Recommended)**
```powershell
.\build-tauri.ps1 -Clean
```

**What this does:**
1. Cleans `out/` directory (removes old Next.js build)
2. Cleans `src-tauri/target/` (removes old Rust build)
3. Runs `npm run build` → Creates fresh `out/` with static files
4. Runs `npx tauri build` → Compiles Rust, bundles everything
5. Copies `default-channels.json` to release directory

**Step 3: Verify Build Output**
```powershell
# Check installer exists
Test-Path "src-tauri\target\release\bundle\nsis\YouTube TV_0.1.0_x64-setup.exe"

# Check standalone exe exists
Test-Path "src-tauri\target\release\app.exe"
```

**Step 4: Test on Fresh Environment**
- Use Windows Sandbox or new user account
- Install the installer
- Verify:
  - ✅ App launches
  - ✅ Default channels load (check console: "Default playlists in DB: X")
  - ✅ Can make changes
  - ✅ Changes persist after close/reopen
  - ✅ No Node.js processes in Task Manager

### Critical Configuration Files

**`next.config.js` - MUST have:**
```javascript
output: 'export',  // ← Enables static export (critical!)
```

**`src-tauri/tauri.conf.json` - MUST have:**
```json
{
  "build": {
    "beforeBuildCommand": "npm run build",
    "frontendDist": "../out"  // ← Points to Next.js static output
  },
  "bundle": {
    "resources": [
      "../default-channels.json"  // ← Bundles template file
    ]
  }
}
```

**`src-tauri/src/db.rs` - MUST check `_up_/` directory:**
```rust
// Try _up_ subdirectory (Tauri NSIS installer resource location)
let up_dir = exe_dir.join("_up_").join("default-channels.json");
```

### Verification Checklist

Before distributing, verify:

- [ ] Installer file exists and is reasonable size (~5-10MB)
- [ ] Tested on fresh Windows install (Sandbox/VM/new user)
- [ ] Default channels load (20+ playlists, not just 6-7)
- [ ] Database file created in `%APPDATA%\Roaming\YouTube TV\`
- [ ] Saves persist after app restart
- [ ] No Node.js processes spawned (use `audit-node-processes.ps1`)
- [ ] Console shows no critical errors
- [ ] `test_db_connection` command works
- [ ] Write permissions verified

### Common Build Issues & Fixes

**Issue: Default channels not loading**
- **Fix:** Ensure `_up_/` directory check is in `db.rs`
- **Verify:** Check console for "Found default-channels.json in _up_ directory"

**Issue: Saves not persisting**
- **Fix:** Check database path permissions
- **Verify:** Run `test_db_connection` command

**Issue: Node.js processes appearing**
- **Fix:** Ensure running installed `.exe`, not `tauri dev`
- **Verify:** Use `audit-node-processes.ps1` script

**Issue: Build fails**
- **Fix:** Check `next.config.js` has `output: 'export'`
- **Fix:** Ensure `default-channels.json` exists in project root
- **Fix:** Verify Rust compilation errors are resolved

### Distribution Ready

Once all criteria are met:
- ✅ Installer is production-ready
- ✅ Can be distributed to users
- ✅ No additional setup required
- ✅ Works on any Windows 10/11 machine

---

## 🎉 VICTORY: Final Solution & Resolution

### Problem Summary
The app worked perfectly on the developer's machine but failed on fresh installs:
- **Default channels not loading:** Users only got 6 playlists instead of 20+ with 20k+ videos
- **Saves not persisting:** Changes were lost after app restart

### Root Cause Discovery

**The Critical Finding:**
Tauri NSIS installers place bundled resources in a `_up_` subdirectory, NOT in the standard `resources/` subdirectory or next to the executable.

**File Location on Fresh Installs:**
```
C:\Users\<username>\AppData\Local\YouTube TV\_up_\default-channels.json
```

**Why It Worked for Developer:**
- Development environment had file in project root (checked first)
- Testing may have used different paths
- Resource resolver may have worked differently in dev vs production

**Why It Failed on Fresh Installs:**
- Code was searching: project root, exe dir, `resources/` subdirectory
- But NOT checking `_up_/` subdirectory where Tauri actually places files
- Result: File existed but was never found

### Final Solution

**1. Added `_up_` Directory to Search Paths:**

Updated `src-tauri/src/db.rs` - `initialize_default_channels()`:
```rust
// Try _up_ subdirectory (Tauri NSIS installer resource location)
if default_data.is_none() {
    let up_dir = exe_dir.join("_up_").join("default-channels.json");
    eprintln!("🔍 Checking for default-channels.json at: {:?}", up_dir);
    if up_dir.exists() {
        // Load file...
    }
}
```

**2. Updated Resource Directory Setup:**

Updated `src-tauri/src/main.rs` - `.setup()`:
```rust
// Try _up_ subdirectory first (Tauri NSIS installer location)
let up_path = exe_dir.join("_up_");
if up_path.exists() {
    set_resource_dir(Some(up_path));
}
```

**3. Complete Search Order (Final):**
1. Project root (development only)
2. Tauri resource directory (from API if available)
3. Executable directory (`exe_dir/default-channels.json`)
4. Resources subdirectory (`exe_dir/resources/default-channels.json`)
5. **`_up_` subdirectory (`exe_dir/_up_/default-channels.json`)** ← **THE FIX**

### Resolution Status

✅ **Default Channels Loading:** FIXED
- File now found on fresh installs
- All 20+ playlists with 20k+ videos load correctly
- Verified working on multiple fresh installs

✅ **Save Persistence:** FIXED
- Database writes verified after each save
- Changes persist across app restarts
- Error handling improved with user alerts

✅ **Production Ready:** CONFIRMED
- Tested on fresh Windows installs
- No Node.js dependencies required
- Standalone installer works out of the box
- All core functionality verified

### Key Lessons Learned

1. **Tauri Resource Bundling:** NSIS installers use `_up_` directory, not standard `resources/`
2. **Environment Differences:** Dev vs production paths can differ significantly
3. **Diagnostic Logging:** `eprintln!()` messages were crucial for debugging
4. **Multi-Path Search:** Always check multiple locations for bundled resources
5. **Fresh Install Testing:** Critical to test on clean environments, not just dev machine

---

## Known Issues & Future Work

### Current Status: ✅ All Critical Issues Resolved

**Previously Known Issues (Now Fixed):**
1. ~~Default Channels Loading~~ - ✅ FIXED (added `_up_` directory check)
2. ~~Save Persistence~~ - ✅ FIXED (improved error handling and verification)

### Future Improvements

1. **Error Reporting:**
   - Add telemetry/logging for production issues
   - User-friendly error dialogs
   - Diagnostic export feature

2. **Database Migrations:**
   - Version tracking in database
   - Migration system for schema changes
   - Backup/restore functionality

3. **Resource Loading:**
   - More robust resource path resolution
   - Fallback to embedded resources if file not found
   - Better diagnostic logging

4. **Testing:**
   - Automated tests for Tauri commands
   - Integration tests for save/load cycle
   - CI/CD pipeline for builds

---

## Key Files & Their Purpose

### Frontend Files
- **`app/page.jsx`** - Main React component, UI logic, Tauri integration
- **`next.config.js`** - Next.js config (static export enabled)
- **`package.json`** - Dependencies and build scripts

### Backend Files
- **`src-tauri/src/main.rs`** - Tauri app entry point, command registration
- **`src-tauri/src/db.rs`** - Database operations, Tauri commands
- **`src-tauri/Cargo.toml`** - Rust dependencies
- **`src-tauri/tauri.conf.json`** - Tauri configuration

### Build Files
- **`build-tauri.ps1`** - Automated build script
- **`test-fresh-install.ps1`** - Testing script for fresh environments
- **`audit-node-processes.ps1`** - Diagnostic script for Node.js processes

### Configuration Files
- **`default-channels.json`** - Template file with default playlists
- **`.gitignore`** - Git ignore patterns

### Documentation Files
- **`TAURI-MIGRATION-COMPLETE-CONTEXT.md`** - This file
- **`TEST-FRESH-ENVIRONMENT.md`** - Testing guide

---

## Troubleshooting Guide

### App Won't Start
1. Check console for errors
2. Verify `out/` directory exists (run `npm run build`)
3. Check Rust compilation errors (`cargo check` in `src-tauri/`)

### Default Channels Not Loading
1. Check console for "default-channels.json found" messages
2. Verify file is in project root
3. Check `tauri.conf.json` has it in `bundle.resources`
4. Try `force_initialize_default_channels` command
5. Check resource directory path in logs

### Saves Not Persisting
1. Check console for save errors
2. Run `test_db_connection` command
3. Verify database path: `%APPDATA%\Roaming\YouTube TV\youtube-tv.db`
4. Check file permissions (should be writable)
5. Look for transaction commit errors in logs
6. Verify save verification count matches expected

### Node.js Processes Appearing
1. **Normal:** VS Code/Cursor extensions (editor)
2. **Problem:** If from Tauri app itself
   - Verify running installed `.exe`, not `tauri dev`
   - Check Task Manager for process paths
   - Use `audit-node-processes.ps1` script

### Database Connection Errors
1. Check database path in error message
2. Verify AppData directory exists and is writable
3. Check for file locks (close other instances)
4. Verify SQLite WAL files aren't corrupted
5. Try deleting database (will recreate on next run)

### Build Failures
1. **Next.js build fails:**
   - Check for API routes (should be removed or static)
   - Verify `next.config.js` has `output: 'export'`
   - Check for TypeScript syntax in `.jsx` files

2. **Tauri build fails:**
   - Check Rust compilation errors
   - Verify `Cargo.toml` dependencies
   - Check `tauri.conf.json` syntax
   - Ensure `out/` directory exists

3. **Resource bundling fails:**
   - Verify `default-channels.json` exists in project root
   - Check `tauri.conf.json` → `bundle.resources` path

---

## Critical Code Patterns

### Tauri Command Pattern
```rust
#[tauri::command]
pub fn my_command(param: String) -> Result<String, String> {
    // Do work...
    Ok("success".to_string())
}

// In main.rs:
.invoke_handler(tauri::generate_handler![my_command])
```

### Database Connection Pattern
```rust
fn get_connection() -> Result<Connection> {
    let db_path = get_db_path()?;
    let conn = Connection::open(&db_path)?;
    // Configure connection...
    Ok(conn)
}
```

### Frontend Tauri Integration
```javascript
const invoke = await import('@tauri-apps/api/core').then(m => m.invoke);
if (invoke) {
  const result = await invoke('my_command', { param: 'value' });
}
```

### Error Handling Pattern
```rust
.map_err(|e| {
    eprintln!("Error: {}", e);
    e.to_string()  // Convert to String for Tauri command return
})?
```

---

## Environment Variables

### Development
- `DATABASE_PATH` - Override database location (for testing)

### Production
- None required (uses AppData automatically)

---

## Dependencies

### Frontend (package.json)
- `next` - Next.js framework
- `react` - React UI library
- `@tauri-apps/api` - Tauri frontend API

### Backend (Cargo.toml)
- `tauri` - Tauri framework
- `rusqlite` - SQLite database driver
- `serde` / `serde_json` - JSON serialization
- `dirs` - System directory access
- `log` - Logging

---

## Build Artifacts

### Development
- `out/` - Next.js static export
- `src-tauri/target/debug/` - Debug Rust build

### Production
- `src-tauri/target/release/app.exe` - Standalone executable
- `src-tauri/target/release/bundle/nsis/YouTube TV_0.1.0_x64-setup.exe` - Installer

---

## Database Location Details

### Windows Paths
- **Tauri App:** `C:\Users\<user>\AppData\Roaming\YouTube TV\youtube-tv.db`
- **Electron App:** `C:\Users\<user>\AppData\Roaming\youtube-tv\youtube-tv.db`
- **Note:** Different folders, no conflicts

### Database Files
- `youtube-tv.db` - Main database
- `youtube-tv.db-wal` - Write-Ahead Log (SQLite WAL mode)
- `youtube-tv.db-shm` - Shared memory file (SQLite WAL mode)

---

## Migration Checklist (For Future Reference)

If migrating another app to Tauri:

- [ ] Convert Next.js to static export (`output: 'export'`)
- [ ] Remove or convert API routes to Tauri commands
- [ ] Replace Node.js database drivers with Rust equivalents
- [ ] Update serialization (camelCase ↔ snake_case)
- [ ] Bundle resources in `tauri.conf.json`
- [ ] Test on fresh environment (Sandbox/VM)
- [ ] Verify no Node.js dependencies
- [ ] Test save/load persistence
- [ ] Verify resource loading
- [ ] Create build automation scripts
- [ ] Document troubleshooting procedures

---

## Quick Reference Commands

```powershell
# Build
.\build-tauri.ps1 -Clean

# Test fresh install
.\test-fresh-install.ps1

# Audit processes
.\audit-node-processes.ps1

# Check database
Get-ChildItem "$env:APPDATA\Roaming\YouTube TV"

# Test database connection (in app console)
await invoke('test_db_connection', {})
```

---

## Contact & Support

For issues or questions:
1. Check this document first
2. Review console logs for errors
3. Run diagnostic commands
4. Test on fresh environment
5. Check Tauri documentation: https://v2.tauri.app/

---

## 🎉 VICTORY: Final Solution & Resolution

### Problem Summary
The app worked perfectly on the developer's machine but failed on fresh installs:
- **Default channels not loading:** Users only got 6 playlists instead of 20+ with 20k+ videos
- **Saves not persisting:** Changes were lost after app restart

### Root Cause Discovery

**The Critical Finding:**
Tauri NSIS installers place bundled resources in a `_up_` subdirectory, NOT in the standard `resources/` subdirectory or next to the executable.

**File Location on Fresh Installs:**
```
C:\Users\<username>\AppData\Local\YouTube TV\_up_\default-channels.json
```

**Why It Worked for Developer:**
- Development environment had file in project root (checked first)
- Testing may have used different paths
- Resource resolver may have worked differently in dev vs production

**Why It Failed on Fresh Installs:**
- Code was searching: project root, exe dir, `resources/` subdirectory
- But NOT checking `_up_/` subdirectory where Tauri actually places files
- Result: File existed but was never found

### Final Solution

**1. Added `_up_` Directory to Search Paths:**

Updated `src-tauri/src/db.rs` - `initialize_default_channels()`:
```rust
// Try _up_ subdirectory (Tauri NSIS installer resource location)
if default_data.is_none() {
    let up_dir = exe_dir.join("_up_").join("default-channels.json");
    eprintln!("🔍 Checking for default-channels.json at: {:?}", up_dir);
    if up_dir.exists() {
        if let Ok(content) = fs::read_to_string(&up_dir) {
            if let Ok(data) = serde_json::from_str::<serde_json::Value>(&content) {
                eprintln!("✅ Found default-channels.json in _up_ directory");
                default_data = Some(data);
            }
        }
    }
}
```

**2. Updated Resource Directory Setup:**

Updated `src-tauri/src/main.rs` - `.setup()`:
```rust
// Try _up_ subdirectory first (Tauri NSIS installer location)
let up_path = exe_dir.join("_up_");
if up_path.exists() {
    eprintln!("📁 Resource directory set to: {:?}", up_path);
    set_resource_dir(Some(up_path));
}
```

**3. Complete Search Order (Final):**
1. Project root (development)
2. Tauri resource directory (from API if available)
3. Executable directory (`exe_dir/default-channels.json`)
4. Resources subdirectory (`exe_dir/resources/default-channels.json`)
5. **`_up_` subdirectory (`exe_dir/_up_/default-channels.json`)** ← **THE FIX**

### Resolution Status

✅ **Default Channels Loading:** FIXED
- File now found on fresh installs
- All 20+ playlists with 20k+ videos load correctly
- Verified working on multiple fresh installs

✅ **Save Persistence:** FIXED
- Database writes verified after each save
- Changes persist across app restarts
- Error handling improved with user alerts

✅ **Production Ready:** CONFIRMED
- Tested on fresh Windows installs
- No Node.js dependencies required
- Standalone installer works out of the box
- All core functionality verified

### Key Lessons Learned

1. **Tauri Resource Bundling:** NSIS installers use `_up_` directory, not standard `resources/`
2. **Environment Differences:** Dev vs production paths can differ significantly
3. **Diagnostic Logging:** `eprintln!()` messages were crucial for debugging
4. **Multi-Path Search:** Always check multiple locations for bundled resources
5. **Fresh Install Testing:** Critical to test on clean environments, not just dev machine

---

**End of Document**

*This document captures all knowledge gained during the Electron → Tauri migration. Keep it updated as the project evolves.*

**Last Updated:** 2025-01-09 - Victory achieved! All critical issues resolved. App is production-ready.

