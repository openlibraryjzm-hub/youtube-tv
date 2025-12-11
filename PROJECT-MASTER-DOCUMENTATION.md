# YouTube TV - Complete Master Documentation

**Last Updated:** 2025-01-09  
**Version:** 2.0 (Tauri Production Ready)  
**Status:** ✅ **PRODUCTION READY - FULLY FUNCTIONAL**

> **🎯 Purpose:** This is the definitive, comprehensive documentation for the YouTube TV desktop application. Read this to understand everything: architecture, tools, dependencies, code structure, user experience, build process, and the breakthrough solutions that made it work.
>
> **🤖 For AI Agents:** This document provides complete context. Combined with [AI-ONBOARDING-PROMPT.md](./AI-ONBOARDING-PROMPT.md), you'll have everything needed to code, debug, or provide expert advice.
>
> **👤 For Developers:** This is your complete reference. Everything you need to understand, modify, or extend the application is documented here.

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [What This App Is](#what-this-app-is)
3. [User Experience](#user-experience)
4. [Tools & Dependencies](#tools--dependencies)
5. [Architecture Overview](#architecture-overview)
6. [How Everything Works](#how-everything-works)
7. [The Breakthrough: Packaging Solution](#the-breakthrough-packaging-solution)
8. [Build Process & Distribution](#build-process--distribution)
9. [Code Structure Deep Dive](#code-structure-deep-dive)
10. [Database & Data Flow](#database--data-flow)
11. [Development Workflow](#development-workflow)
12. [Troubleshooting & Common Issues](#troubleshooting--common-issues)
13. [Future Roadmap](#future-roadmap)

---

## Executive Summary

**YouTube TV** is a desktop application that transforms YouTube playlists into a Netflix-like, lean-back viewing experience. Built with Next.js (React) frontend and Tauri (Rust) backend, it provides:

- **TV-Style Interface:** Full-screen video player with splitscreen browsing
- **Advanced Organization:** Colored folders, custom tabs, drag-and-drop
- **Local-First Architecture:** SQLite database, no cloud dependency
- **Zero Dependencies:** Works on fresh Windows installs (no Node.js required)
- **Production Ready:** Fully functional, tested, and distributable

**Key Achievement:** Successfully migrated from Electron (100MB+, Node.js required) to Tauri (5-10MB, standalone) while maintaining all functionality and adding local database persistence.

---

## What This App Is

### The Problem It Solves

YouTube's native interface isn't optimized for:
- Large playlists (thousands of videos)
- Lean-back, TV-style viewing
- Advanced organization and categorization
- Resume-watching across sessions
- Managing multiple playlists simultaneously

### The Solution

A desktop application that:
- Loads YouTube playlists via API
- Provides Netflix-like interface (full-screen player, grid browsing)
- Organizes videos into colored folders (red, green, pink, yellow, etc.)
- Groups playlists into custom tabs
- Tracks watch progress and resumes automatically
- Works completely offline (after initial load)
- Saves all data locally (no cloud account needed)

### Target Users

- People with large "Watch Later" playlists
- Content creators managing multiple playlists
- Users who want better organization than YouTube provides
- Anyone wanting a distraction-free YouTube viewing experience

---

## User Experience

### First Launch Experience

1. **User installs** the `.exe` installer (standard Windows installer)
2. **App launches** - Clean, modern interface appears
3. **Default channels load** - 20+ pre-configured playlists with 20,000+ videos appear
4. **Ready to use** - No setup, no login, no configuration needed

### Daily Usage Experience

**Main Interface:**
- **Left Side:** Full-screen YouTube video player (Netflix-style)
- **Right Side:** Splitscreen menu (opens/closes with button, 50% width)
- **Top Bar:** Playlist name, navigation arrows, controls
- **Background:** Dynamically colored based on current video thumbnail (average color calculation)

**Core Actions Users Can Perform:**

1. **Watch Videos:**
   - Click any video thumbnail to play
   - Use arrow keys or buttons to navigate next/previous
   - Video auto-advances when finished
   - Progress automatically saved every 5 seconds (resumes where left off)
   - Resume from last position if < 95% watched
   - Full YouTube player controls (play, pause, volume, fullscreen)

2. **Organize Videos:**
   - **Colored Folders:** Drag videos into colored folders (red, green, pink, yellow, blue, cyan, indigo, lime, orange, purple, amber, emerald, violet, rose, sky, teal)
   - **Bulk Operations:** Select multiple videos, assign to folder in one action
   - **Star System:** Star videos for quick access
   - **Pin/Queue:** Pin up to 10 videos to watch next (accessible from top menu)
   - **Rename Folders:** Customize colored folder names
   - **Convert Folders:** Convert colored folders to standalone playlists

3. **Manage Playlists:**
   - **Custom Tabs:** Create tabs to group related playlists
   - **Add/Remove:** Add playlists to tabs, remove as needed
   - **Rename:** Customize playlist and tab names (inline editing)
   - **Merge:** Merge colored folders or playlists into others
   - **Delete:** Remove playlists (with confirmation)
   - **Bulk Tag:** Tag multiple playlists to colored folders at once

4. **Browse & Search:**
   - **Splitscreen Menu:** Browse all videos in current playlist (grid view)
   - **Search:** Search videos by title (instant results)
   - **Author Lookup:** Find all videos from a specific channel
   - **Filter:** Show watched/unwatched, filter by colored folder
   - **Video Grid:** Scrollable grid with thumbnails, titles, progress bars
   - **Context Menu:** Right-click videos for actions (remove, send to playlist, pin)

5. **Navigation:**
   - **Shuffle Mode:** Videos play in random order (fresh each session, not saved)
   - **Chronological:** Play in upload order
   - **Tab Cycling:** Switch between custom tabs (remembers position per tab)
   - **Playlist Switching:** Navigate between playlists with arrows (remembers position)
   - **Filter Cycling:** Cycle through colored folders for playback
   - **Scroll Memory:** Remembers scroll position in video grids

6. **Advanced Features:**
   - **Watch History:** View last 100 watched videos with timestamps
   - **Representative Thumbnails:** Set any video as playlist cover image
   - **Drag & Drop:** Reorder videos within playlists
   - **Bulk Add:** Add multiple playlists at once via bulk add modal
   - **Video Metadata:** Automatic fetching when adding playlists, manual fetch button per playlist
     - Metadata (title, author, views, channelId, publishedYear) stored permanently in database
     - ONE-TIME fetch per video (like thumbnails - fetch once, use forever)
     - Displayed in video grid and current video info card
   - **Settings:** View persistent user ID, copy ID, configuration options

### Visual Experience

**Interface Elements:**
- **Video Player:** Full-screen YouTube IFrame player with controls
- **Thumbnail Grids:** Beautiful responsive grid (1-3 columns based on screen size)
- **Color-Coded Folders:** Visual organization with color labels and borders
- **Smooth Animations:** 500ms transitions, hover effects, drag-and-drop feedback
- **Dynamic Backgrounds:** App background matches video thumbnail average color
- **Responsive Layout:** Adapts to window size, mobile-friendly splitscreen
- **Backdrop Blur:** Top menu bars have backdrop blur effect
- **Video Info Bar:** Shows year, author, view count, current filter mode

**User Feedback:**
- **Save Indicators:** Console logs show save status (can be enhanced with UI indicators)
- **Progress Tracking:** Progress bars on video thumbnails show watch percentage
- **Search Results:** Instant search with results highlighting
- **Drag Feedback:** Visual indicators during drag-and-drop operations
- **Hover Effects:** Buttons and videos highlight on hover
- **Current Video:** Blue ring highlight on currently playing video
- **Current Playlist:** Blue ring highlight on active playlist in grid
- **Loading States:** Visual feedback during data fetching

**Color System:**
- **16 Color Options:** red, green, blue, yellow, pink, purple, orange, cyan, indigo, lime, amber, emerald, violet, rose, sky, teal
- **Custom Colors:** Users can customize color values
- **Color Order:** Customizable order of colored folders
- **Visual Distinction:** Colored folders show colored borders in playlist grid

### Data Persistence (What Users See)

- **Playlists:** All user playlists persist across app restarts
- **Organization:** Colored folder assignments saved automatically
- **Progress:** Video watch positions remembered
- **Tabs:** Custom tab configurations persist
- **Settings:** Color preferences, sort orders remembered

**No Cloud Account Needed:**
- Everything stored locally on user's computer
- No login, no internet required after initial playlist load
- Privacy-first: user data never leaves their machine

---

## Tools & Dependencies

### Development Tools Required

**For Building (Developer Only):**
- **Node.js** (v18+) - For building Next.js frontend
- **npm** - Package manager (comes with Node.js)
- **Rust** (latest stable) - For compiling Tauri backend
- **Cargo** - Rust package manager (comes with Rust)
- **Windows SDK** - For Windows builds (usually pre-installed)

**Installation:**
```powershell
# Install Node.js from nodejs.org
# Install Rust from rustup.rs
# Both are one-click installers
```

### Frontend Dependencies (package.json)

**Production Dependencies:**
```json
{
  "next": "^14.2.5",              // Next.js framework
  "react": "^18.3.1",             // React UI library
  "react-dom": "^18.3.1",         // React DOM rendering
  "lucide-react": "^0.441.0",     // Icon library
  "react-window": "^2.2.0",       // Virtual scrolling for large lists
  "@tauri-apps/api": "^2.9.1"     // Tauri frontend API
}
```

**Development Dependencies:**
```json
{
  "@tauri-apps/cli": "^2.9.5",    // Tauri CLI for building
  "@types/react": "^18.3.3",      // TypeScript types
  "tailwindcss": "^3.4.10",        // CSS framework
  "postcss": "^8.4.41",           // CSS processing
  "autoprefixer": "^10.4.20",      // CSS vendor prefixes
  "eslint": "^9.0.0"               // Code linting
}
```

**Note:** `better-sqlite3` and Electron dependencies are legacy (from Electron version) and not used in Tauri build.

### Backend Dependencies (Cargo.toml)

**Rust Dependencies:**
```toml
[dependencies]
tauri = { version = "2.9.4", features = ["devtools"] }  // Tauri framework
rusqlite = { version = "0.31", features = ["bundled"] } // SQLite database
serde = { version = "1.0", features = ["derive"] }     // JSON serialization
serde_json = "1.0"                                      // JSON parsing
log = "0.4"                                             // Logging
tauri-plugin-log = "2"                                  // Tauri logging plugin
dirs = "5.0"                                            // System directory access
```

**Build Dependencies:**
```toml
[build-dependencies]
tauri-build = { version = "2.5.3", features = [] }  // Tauri build system
```

### Runtime Dependencies (What Users Need)

**✅ ZERO RUNTIME DEPENDENCIES**

Users do NOT need:
- ❌ Node.js
- ❌ npm
- ❌ Rust
- ❌ Any development tools
- ❌ Internet connection (after initial playlist load)

**What Users Get:**
- ✅ Standalone `.exe` installer
- ✅ Self-contained application
- ✅ System WebView (Edge WebView2 - pre-installed on Windows 10/11)
- ✅ Everything bundled in installer

### External APIs Used

**YouTube Data API v3:**
- **Purpose:** Fetch playlist data, video metadata
- **Usage:** Cached permanently in database (ONE-TIME fetch per video)
- **Key Endpoints:**
  - `playlistItems.list` - Get videos in playlist (titles included, no extra cost)
  - `videos.list` - Get video details (title, duration, author, view count, etc.) - 1 quota unit per call, up to 50 videos per call
  - `channels.list` - Get channel information
- **Caching Strategy:**
  - Video metadata stored permanently in `video_metadata` table (like thumbnails)
  - ONE-TIME fetch per video - stored forever, never auto-refetched
  - Automatic fetching when adding playlists (single or bulk)
  - Manual "Fetch Metadata" button per playlist
  - Only fetches if not in database
- **Quota Management:**
  - ~400 API calls for 20,000 videos (one-time cost)
  - Free tier: 10,000 units/day (covers all metadata in one day)
  - After initial fetch: ZERO cost (stored permanently)
- **User Preference:** OK with outdated metadata - just want it stored permanently
- **API Key:** Required but managed separately (not bundled in app, user provides)

**YouTube IFrame Player API:**
- **Purpose:** Video playback
- **Usage:** Embedded in React component via `<iframe>`
- **Features:**
  - Autoplay enabled
  - Controls visible
  - Progress tracking (every 5 seconds)
  - State change events (video ended, playing, paused)
  - Resume from last position
- **Integration:** Loaded via script tag, initialized in React component

---

## Architecture Overview

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    User's Computer                      │
│                                                         │
│  ┌──────────────────────────────────────────────────┐  │
│  │         YouTube TV Desktop App                   │  │
│  │                                                   │  │
│  │  ┌──────────────┐         ┌──────────────┐     │  │
│  │  │   Frontend   │         │   Backend    │     │  │
│  │  │  (Next.js)   │◄───────►│   (Rust)     │     │  │
│  │  │  React UI    │  Tauri  │  Tauri       │     │  │
│  │  │  Static HTML │  Commands│  Commands    │     │  │
│  │  └──────────────┘         └──────────────┘     │  │
│  │         │                         │             │  │
│  │         │                         │             │  │
│  │         ▼                         ▼             │  │
│  │  ┌──────────────────────────────────────────┐   │  │
│  │  │      SQLite Database (Local File)        │   │  │
│  │  │  %APPDATA%\Roaming\YouTube TV\          │   │  │
│  │  └──────────────────────────────────────────┘   │  │
│  │                                                   │  │
│  │  ┌──────────────────────────────────────────┐   │  │
│  │  │   Bundled Resources                      │   │  │
│  │  │   %LOCALAPPDATA%\YouTube TV\_up_\        │   │  │
│  │  │   default-channels.json                  │   │  │
│  │  └──────────────────────────────────────────┘   │  │
│  └───────────────────────────────────────────────────┘  │
│                                                         │
│  ┌──────────────────────────────────────────────────┐  │
│  │         System WebView (Edge WebView2)           │  │
│  │         (Pre-installed on Windows)               │  │
│  └──────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
         │
         │ Internet (for YouTube API)
         ▼
┌─────────────────────────────────────────────────────────┐
│              YouTube APIs                               │
│  - YouTube Data API v3                                  │
│  - YouTube IFrame Player API                           │
└─────────────────────────────────────────────────────────┘
```

### Component Breakdown

**Frontend (Next.js/React):**
- **Single File:** `app/page.jsx` (~6000 lines)
- **Build Output:** Static HTML/CSS/JS in `out/` directory
- **Framework:** Next.js with static export (no server needed)
- **Styling:** Tailwind CSS (utility-first CSS)
- **State Management:** React hooks (useState, useRef, useEffect)
- **Data Access:** Conditional - Tauri commands or API routes (dev fallback)

**Backend (Rust/Tauri):**
- **Entry Point:** `src-tauri/src/main.rs` - Registers Tauri commands
- **Database Module:** `src-tauri/src/db.rs` - All database operations
- **Commands:** Rust functions exposed to JavaScript via Tauri
- **Database:** SQLite via `rusqlite` crate (bundled SQLite, no external dependency)

**Build System:**
- **Next.js Build:** `npm run build` → Creates `out/` directory
- **Tauri Build:** `npx tauri build` → Compiles Rust, bundles frontend, creates installer
- **Automation:** `build-tauri.ps1` script orchestrates both builds

### Data Flow Architecture

```
User Action (Click, Drag, etc.)
    ↓
React Event Handler (app/page.jsx)
    ↓
State Update (useState/useRef)
    ↓
Debounced Save Trigger (2 second delay)
    ↓
Tauri Command Call (invoke('save_user_data', ...))
    ↓
Rust Handler (src-tauri/src/db.rs)
    ↓
SQLite Transaction
    ↓
Database File (youtube-tv.db)
    ↓
Verification (query count)
    ↓
Success/Error Return
    ↓
Frontend Update (UI feedback)
```

### Communication Pattern

**Frontend → Backend:**
```javascript
// JavaScript calls Rust
const invoke = await import('@tauri-apps/api/core').then(m => m.invoke);
const result = await invoke('get_user_data', { userId: 'user123' });
```

**Backend → Frontend:**
```rust
// Rust returns to JavaScript
#[tauri::command]
pub fn get_user_data(user_id: String) -> Result<UserData, String> {
    // ... database operations ...
    Ok(user_data)  // Serialized to JSON automatically
}
```

**Serialization:**
- JavaScript sends: `{ playlistTabs: [...], customColors: {...} }` (camelCase)
- Rust receives: `UserData { playlist_tabs: ..., custom_colors: ... }` (snake_case)
- Mapping handled by `serde` attributes: `#[serde(rename = "playlistTabs")]`

---

## How Everything Works

### Application Startup Flow

1. **User Launches App:**
   - Tauri loads Rust backend
   - Rust initializes SQLite database connection
   - Database schema created if first run
   - Default channels loaded from `_up_/default-channels.json`

2. **Frontend Loads:**
   - Next.js static files loaded from `out/` directory
   - React app initializes
   - Tauri detection: Checks for `window.__TAURI__`
   - If Tauri: Uses `invoke()` commands
   - If not Tauri: Falls back to API routes (dev mode)

3. **Data Loading:**
   - Frontend calls `get_user_data(userId)`
   - Rust queries SQLite database
   - If user doesn't exist: Copies from 'default' user
   - Returns playlists, tabs, colors, progress
   - Frontend updates React state

4. **UI Renders:**
   - Playlist grid displays
   - Video thumbnails load
   - User can start watching immediately

### Video Playback Flow

1. **User Clicks Video:**
   - React state updates: `setCurrentVideoId(videoId)`
   - YouTube IFrame Player loads video
   - Player autoplays

2. **Progress Tracking:**
   - Every 5 seconds: Current time saved to state
   - Debounced save (2 seconds): `save_video_progress` Tauri command
   - Rust writes to SQLite: `video_progress` JSON field

3. **Video Ends:**
   - YouTube Player fires `onStateChange` event
   - React detects video ended
   - Automatically advances to next video in playlist
   - Shuffle order determines next video

### Save Flow (Critical)

1. **User Makes Change:**
   - Tags video to colored folder
   - React state updates immediately (optimistic UI)
   - Change tracked in `lastChangeTimeRef`

2. **Debounce Timer:**
   - 2-second quiet period starts
   - If another change: Timer resets
   - After 2 seconds of no changes: Save triggered

3. **Save Operation:**
   - Frontend calls `save_user_data(userId, data)`
   - Rust starts SQLite transaction
   - Deletes existing playlists for user
   - Inserts new playlists
   - Commits transaction
   - Verifies save (queries count)

4. **Error Handling:**
   - If save fails: Error logged, user alerted
   - If verification fails: Error returned
   - Frontend shows error message

### Default Channels Loading Flow

1. **First Run:**
   - Database initialized
   - `initialize_default_channels()` called
   - Searches for `default-channels.json` in multiple paths:
     - Project root (development)
     - Tauri resource directory
     - Executable directory
     - `resources/` subdirectory
     - **`_up_/` subdirectory** ← Critical for NSIS installers

2. **File Found:**
   - JSON parsed
   - Playlists inserted into database as `user_id = 'default'`
   - Marked with `is_default = 1` flag

3. **User Data Load:**
   - When user loads data, if empty: Copies from 'default' user
   - User gets all default playlists
   - User can then customize without affecting defaults

### Shuffle System

1. **Playlist Load:**
   - Videos loaded from database
   - Shuffle order generated (session-specific, not saved)
   - Stored in `useRef` (not in database)
   - Fresh shuffle each app session

2. **Navigation:**
   - Next/Previous uses shuffle order
   - Position in shuffle order tracked
   - Not persisted (ensures fresh experience)

3. **Filtering:**
   - Can filter shuffle by colored folder
   - Only videos in selected folder play
   - Shuffle order regenerated for filtered set

---

## The Breakthrough: Packaging Solution

### The Problem

After migrating to Tauri, the app worked perfectly on the developer's machine but failed on fresh installs:
- **Default channels not loading:** Users only got 6 playlists instead of 20+ with 20k+ videos
- **Saves not persisting:** Changes were lost after app restart
- **Silent failures:** No error messages, just missing data

**Impact:**
- Poor first impression for users
- Missing 20,000+ videos from default template
- App appeared broken or incomplete

### The Investigation

**Initial Assumptions:**
- Resource file should be in `resources/` subdirectory
- Or next to executable
- Or in Tauri resource directory

**What We Tried:**
- Added file to `tauri.conf.json` → `bundle.resources`
- Checked multiple paths in code
- Added diagnostic logging
- Verified file was in installer package

**The Discovery:**
Console logs from a fresh install showed:
```
Searched:
"C:\Users\Josh\AppData\Local\YouTube TV\default-channels.json"
"C:\Users\Josh\AppData\Local\YouTube TV\resources\default-channels.json"
```

But the file was actually at:
```
C:\Users\GGPC\AppData\Local\YouTube TV\_up_\default-channels.json
```

### The Breakthrough

**Critical Finding:**
Tauri NSIS installers place bundled resources in a `_up_/` subdirectory, NOT in the standard `resources/` subdirectory or next to the executable.

**Why This Wasn't Documented:**
- Tauri documentation mentions `resources/` directory
- NSIS installer behavior differs from standard resource placement
- `_up_/` is an internal NSIS directory name
- Not mentioned in standard Tauri v2 documentation

### The Solution

**Code Changes:**

1. **Added `_up_/` to Search Paths (`db.rs`):**
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

2. **Updated Resource Directory Setup (`main.rs`):**
```rust
// Try _up_ subdirectory first (Tauri NSIS installer location)
let up_path = exe_dir.join("_up_");
if up_path.exists() {
    set_resource_dir(Some(up_path));
}
```

3. **Complete Search Order (Final):**
   - Project root (development)
   - Tauri resource directory
   - Executable directory
   - `resources/` subdirectory
   - **`_up_/` subdirectory** ← **THE FIX**

### Why It Worked for Developer But Not Users

**Developer's Machine:**
- Development environment had file in project root (checked first)
- Testing may have used different paths
- Resource resolver may have worked differently

**Fresh Installs:**
- File only existed in `_up_/` directory
- Code wasn't checking that location
- Result: File existed but was never found

### Impact of the Fix

**Before:**
- Users got 6 playlists (empty database fallback)
- Missing 20,000+ videos from default template
- Poor first impression

**After:**
- Users get 20+ playlists with 20,000+ videos
- Full default template loads
- Professional first-run experience

### Key Lesson

**Always test on fresh environments!** Dev machines can have files in different locations. The `_up_/` directory discovery was only possible by testing on a clean Windows install.

**Why This Matters:**
- Dev environments can mask production issues
- File paths differ between dev and production
- Resource bundling behavior varies by installer type
- Fresh install testing is critical for desktop apps

**The Solution Pattern:**
- Check multiple paths (don't assume one location)
- Add diagnostic logging (`eprintln!()` in Rust)
- Test on fresh installs (Windows Sandbox, VM, new user)
- Verify file exists in expected location
- Fallback gracefully if file not found

---

## Build Process & Distribution

### Complete Build Protocol

**Step 1: Prerequisites Check**
```powershell
# Verify tools installed
node --version    # Should be v18+
rustc --version   # Should be latest stable
cargo --version   # Should match rustc
```

**Step 2: Clean Build (Recommended)**
```powershell
.\build-tauri.ps1 -Clean
```

**What This Does:**
1. Cleans `out/` directory (removes old Next.js build)
2. Cleans `src-tauri/target/` (removes old Rust build)
3. Runs `npm run build` → Creates fresh `out/` with static files
4. Runs `npx tauri build` → Compiles Rust, bundles everything
5. Copies `default-channels.json` to release directory (legacy, not needed)

**Step 3: Build Output**
```
src-tauri/target/release/app.exe                    # Standalone executable
src-tauri/target/release/bundle/nsis/
  YouTube TV_0.1.0_x64-setup.exe                    # Installer
```

**Step 4: Verification**
- Installer size: ~5-10MB (vs 100MB+ for Electron)
- Test on fresh environment (Windows Sandbox)
- Verify default channels load
- Verify saves persist

### Core Criteria (Must Meet All)

**1. ✅ App Functionality**
- App launches without errors
- UI renders correctly
- All features work (playback, organization, etc.)
- No console errors on startup

**2. ✅ Working Local Database**
- Database file created automatically
- Default channels load (20+ playlists)
- Saves persist across app restarts
- Database is writable

**3. ✅ Zero Node.js Dependency**
- No Node.js processes spawned
- No npm/node_modules required
- Completely standalone
- Works on fresh Windows installs

### Distribution

**Installer Distribution:**
- Single `.exe` installer file
- Standard Windows installer (NSIS)
- Creates Start Menu shortcut
- Includes uninstaller
- No additional setup required

**User Installation:**
1. Download installer
2. Run installer (standard Windows installer)
3. App installed to `%LOCALAPPDATA%\YouTube TV\`
4. Launch from Start Menu
5. Ready to use immediately

**No User Setup Required:**
- No Node.js installation
- No configuration
- No account creation
- No internet (after initial playlist load)

---

## Code Structure Deep Dive

### Frontend Architecture (app/page.jsx)

**File Structure (~6000 lines):**
- **Lines 1-295:** Imports, configuration, utilities, console log capture
- **Lines 296-600:** State declarations (useState, useRef hooks)
- **Lines 601-1200:** Data fetching and loading (Tauri commands, API fallback)
- **Lines 1201-2000:** Save operations and persistence (debounced saves)
- **Lines 2001-3000:** Playback control and navigation (video switching, shuffle)
- **Lines 3001-4000:** Organization features (colored folders, tabs, bulk operations)
- **Lines 4001-5000:** UI rendering (player, menus, grids, modals)
- **Lines 5001-6000:** Event handlers and interactions (clicks, drag-drop, keyboard)

**Key Functions:**
- `fetchUserData()` - Load user data from database
- `saveUserData()` - Persist user changes
- `fetchAllVideos()` - Load videos from YouTube API
- `performStagedSave()` - Debounced save operation
- `goToNextVideo()` / `goToPreviousVideo()` - Navigation
- `assignVideoToColor()` - Organize videos
- `changePlaylist()` - Switch playlists

**Key Patterns:**

**1. Tauri Detection:**
```javascript
const isTauri = typeof window !== 'undefined' && (
  window.__TAURI_INTERNALS__ !== undefined ||
  window.__TAURI__ !== undefined
);
```

**2. Conditional Data Access:**
```javascript
const getInvoke = async () => {
  if (typeof window === 'undefined') return null;
  try {
    const { invoke } = await import('@tauri-apps/api/core');
    return invoke;
  } catch {
    return null;  // Fallback to API routes in dev
  }
};
```

**3. Debounced Saves:**
```javascript
useEffect(() => {
  const timer = setTimeout(() => {
    if (Date.now() - lastChangeTimeRef.current > 2000) {
      performStagedSave();
    }
  }, 2000);
  return () => clearTimeout(timer);
}, [playlists, playlistTabs]);
```

### Backend Architecture (src-tauri/src/)

**main.rs - Entry Point:**
```rust
fn main() {
  tauri::Builder::default()
    .invoke_handler(tauri::generate_handler![
      test_db_connection,
      get_user_data,
      save_user_data,
      save_video_progress,
      check_default_channels,
      force_initialize_default_channels
    ])
    .setup(|_app| {
      // Set resource directory for bundled files
      // ...
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
```

**db.rs - Database Operations:**
- **Connection Management:** `get_connection()` - Creates SQLite connection with WAL mode
- **Schema Initialization:** `initialize_schema()` - Creates tables if needed
- **Default Channels:** `initialize_default_channels()` - Loads template file
- **User Data:** `get_user_data()`, `save_user_data()` - CRUD operations
- **Progress:** `save_video_progress()` - High-frequency updates

**Key Patterns:**

**1. Database Path:**
```rust
fn get_db_path() -> Result<PathBuf, String> {
    let mut db_path = dirs::data_dir()?;  // AppData\Roaming
    db_path.push("YouTube TV");
    db_path.push("youtube-tv.db");
    Ok(db_path)
}
```

**2. Transaction Pattern:**
```rust
let tx = conn.transaction()?;
{
    let mut stmt = tx.prepare("INSERT INTO ...")?;
    // Use stmt...
}  // stmt dropped here
tx.commit()?;  // Now safe to commit
```

**3. Serialization:**
```rust
#[derive(Serialize, Deserialize, Debug)]
pub struct UserData {
    #[serde(rename = "playlistTabs")]  // Maps JS camelCase to Rust snake_case
    pub playlist_tabs: Vec<PlaylistTab>,
    // ...
}
```

---

## Database & Data Flow

### Database Schema

**Tables:**

1. **`users`** - User-specific settings
   - `user_id` (PRIMARY KEY)
   - `custom_colors` (JSON)
   - `color_order` (JSON)
   - `playlist_tabs` (JSON)
   - `video_progress` (JSON)
   - `created_at`, `updated_at`

2. **`playlists`** - All playlists
   - `id` (AUTOINCREMENT PRIMARY KEY)
   - `user_id` (FOREIGN KEY)
   - `playlist_id` (YouTube PL* or local ID)
   - `name`, `videos` (JSON), `groups` (JSON), `starred` (JSON)
   - `is_default`, `can_delete`
   - `category`, `description`, `thumbnail`
   - `is_converted_from_colored_folder`, `representative_video_id`
   - `created_at`, `updated_at`

3. **`video_metadata`** - Video metadata (PERMANENT STORAGE - like thumbnails)
   - `video_id` (PRIMARY KEY)
   - `title`, `author`, `view_count`, `channel_id`, `published_year`
   - `duration` (INTEGER)
   - `fetched_at`, `updated_at`
   - **Purpose:** ONE-TIME fetch per video, stored forever, never auto-refetched
   - **Cost:** ~400 API calls for 20,000 videos (one-time, free tier covers it)

**Users Table:**
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

**Playlists Table:**
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

**Video Metadata Table (PERMANENT STORAGE):**
```sql
CREATE TABLE video_metadata (
    video_id TEXT PRIMARY KEY,
    title TEXT,
    author TEXT,
    view_count TEXT,
    channel_id TEXT,
    published_year TEXT,
    duration INTEGER DEFAULT 1,
    fetched_at INTEGER,
    updated_at INTEGER
);
```
**Purpose:** Stores video metadata (title, author, views, etc.) permanently - ONE-TIME fetch per video, never auto-refetched (like thumbnails). Fetched automatically when adding playlists, or manually via "Fetch Metadata" button.

### Data Flow Examples

**Loading User Data:**
```
App Start
    ↓
Frontend: fetchUserData(userId)
    ↓
Tauri: invoke('get_user_data', { userId })
    ↓
Rust: get_user_data() command
    ↓
SQLite: SELECT * FROM users WHERE user_id = ?
    ↓
If not found: Copy from 'default' user
    ↓
SQLite: SELECT * FROM playlists WHERE user_id = ?
    ↓
Rust: Deserialize JSON fields
    ↓
Return: UserData struct
    ↓
Frontend: Update React state
    ↓
UI: Render playlists
```

**Saving User Changes:**
```
User tags video to colored folder
    ↓
React: State update (optimistic UI)
    ↓
Debounce: Wait 2 seconds
    ↓
Frontend: saveUserData(userId, data)
    ↓
Tauri: invoke('save_user_data', { userId, data })
    ↓
Rust: save_user_data() command
    ↓
SQLite: BEGIN TRANSACTION
    ↓
SQLite: DELETE FROM playlists WHERE user_id = ?
    ↓
SQLite: INSERT INTO playlists (...) VALUES (...)
    ↓
SQLite: COMMIT TRANSACTION
    ↓
Rust: Verify (SELECT COUNT(*) FROM playlists WHERE user_id = ?)
    ↓
Return: Success/Error
    ↓
Frontend: Show feedback
```

---

## Development Workflow

### Local Development

**Terminal 1 - Next.js Dev Server:**
```powershell
npm run dev
# Starts on http://localhost:3000
# Hot reload enabled
```

**Terminal 2 - Tauri Dev Mode:**
```powershell
npx tauri dev
# Opens Tauri window
# Uses Next.js dev server
# Hot reload for both frontend and backend
```

**Development Mode:**
- Uses API routes (fallback) if Tauri not available
- Database can be in project directory (set `DATABASE_PATH` env var)
- Fast iteration with hot reload

### Making Changes

**Frontend Changes:**
1. Edit `app/page.jsx`
2. Save file
3. Next.js hot reloads
4. See changes immediately

**Backend Changes:**
1. Edit `src-tauri/src/*.rs`
2. Save file
3. Tauri recompiles Rust
4. App restarts with new code

**Configuration Changes:**
1. Edit `tauri.conf.json` or `next.config.js`
2. Restart dev server
3. Changes applied

### Testing Changes

**Quick Test:**
- Use dev mode (`npx tauri dev`)
- Test functionality
- Check console for errors

**Production Test:**
```powershell
.\build-tauri.ps1 -Clean
# Test the built .exe
src-tauri\target\release\app.exe
```

**Fresh Install Test:**
- Use Windows Sandbox
- Install from installer
- Verify all functionality

---

## Troubleshooting & Common Issues

### Default Channels Not Loading

**Symptoms:**
- Only 6-7 playlists instead of 20+
- Console shows "default-channels.json found: false"

**Solutions:**
1. Check `_up_/` directory search in `db.rs`
2. Verify `default-channels.json` in project root
3. Check `tauri.conf.json` → `bundle.resources`
4. Try `force_initialize_default_channels` command
5. Check console logs for file path searches

### Saves Not Persisting

**Symptoms:**
- Changes lost after app restart
- No error messages

**Solutions:**
1. Run `test_db_connection` command
2. Check database path: `%APPDATA%\Roaming\YouTube TV\`
3. Verify file permissions (should be writable)
4. Check console for transaction errors
5. Verify save verification passes (count matches)

### Node.js Processes Appearing

**Symptoms:**
- Node.js in Task Manager
- Worried about dependencies

**Solutions:**
1. Run `audit-node-processes.ps1` script
2. Verify running installed `.exe`, not `tauri dev`
3. Check process paths in Task Manager
4. Normal: VS Code/Cursor extensions (editor)
5. Problem: If from Tauri app itself

### Build Failures

**Next.js Build Fails:**
- Check `next.config.js` has `output: 'export'`
- Remove any API routes (incompatible with static export)
- Check for TypeScript syntax in `.jsx` files

**Tauri Build Fails:**
- Check Rust compilation errors
- Verify `Cargo.toml` dependencies
- Check `tauri.conf.json` syntax
- Ensure `out/` directory exists

---

## Future Roadmap

### Planned Features

1. **Playlist Import/Export:** ✅ **COMPLETE**
   - **Import:** Users can import JSON playlist files
     - Smart import auto-detects playlist vs tab files
     - File picker via Tauri dialog
     - Merge with existing playlists (skips duplicates)
     - Validate structure before import
   - **Export:** Export playlists to JSON
     - Export individual playlists (`name - playlist.json`)
     - Export full tab structures (`name - tab.json`)
     - Backup user data
     - Share playlists between users
     - Full playlist structure with colored folders
   - **Overwrite:** Replace existing playlist via import

2. **Enhanced Organization:**
   - Nested colored folders
   - Custom folder colors (beyond 16 default)
   - Advanced filtering (multiple criteria)
   - Smart suggestions (auto-organize by category)

3. **Performance Optimizations:**
   - Virtual scrolling for very large playlists (10,000+ videos)
   - Lazy loading of thumbnails
   - Background data prefetching
   - Indexed database queries for faster searches

4. **User Experience:**
   - Keyboard shortcuts customization
   - Themes (dark/light mode)
   - Playback speed controls
   - Subtitle support
   - Playlist sharing (export/import)

5. **Advanced Features:**
   - Playlist templates
   - Auto-playlist generation (by channel, date, etc.)
   - Watch statistics and analytics
   - Recommendations based on watch history

### Technical Improvements

1. **Error Reporting:**
   - Telemetry for production issues
   - User-friendly error dialogs
   - Diagnostic export feature

2. **Database Migrations:**
   - Version tracking
   - Migration system for schema changes
   - Backup/restore functionality

3. **Testing:**
   - Automated tests for Tauri commands
   - Integration tests for save/load cycle
   - CI/CD pipeline

---

## Quick Reference

### Essential Commands

```powershell
# Build
.\build-tauri.ps1 -Clean

# Dev mode
npm run dev          # Terminal 1
npx tauri dev        # Terminal 2

# Test fresh install
.\test-fresh-install.ps1

# Audit processes
.\audit-node-processes.ps1
```

### File Locations

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

### Tauri Commands

```javascript
// Get user data
await invoke('get_user_data', { userId: 'user123' });

// Save user data
await invoke('save_user_data', { userId: 'user123', data: {...} });

// Test database
await invoke('test_db_connection', {});

// Check default channels
await invoke('check_default_channels', {});

// Force reload defaults
await invoke('force_initialize_default_channels', {});
```

---

## Related Documentation

- [TAURI-MIGRATION-COMPLETE-CONTEXT.md](./TAURI-MIGRATION-COMPLETE-CONTEXT.md) - Complete migration journey
- [TAURI-DEVELOPMENT-GUIDE.md](./TAURI-DEVELOPMENT-GUIDE.md) - Tauri development patterns
- [TAURI-QUICK-REFERENCE.md](./TAURI-QUICK-REFERENCE.md) - Quick command reference
- [TEST-FRESH-ENVIRONMENT.md](./TEST-FRESH-ENVIRONMENT.md) - Testing procedures
- [MASTER-CONTEXT.md](./MASTER-CONTEXT.md) - Legacy Firestore context
- [CODE-STRUCTURE.md](./CODE-STRUCTURE.md) - Detailed code organization
- [PATTERNS.md](./PATTERNS.md) - Code patterns
- [GOTCHAS.md](./GOTCHAS.md) - Common pitfalls

---

## Summary: What Makes This Project Special

### Technical Achievements

1. **Successful Migration:** Electron (100MB+, Node.js required) → Tauri (5-10MB, standalone)
2. **Zero Dependencies:** Works on fresh Windows installs without any prerequisites
3. **Local-First:** Complete privacy, no cloud account needed
4. **Breakthrough Discovery:** Found undocumented `_up_/` directory for NSIS resource bundling
5. **Production Ready:** Fully tested, verified, and distributable

### User Value

1. **Netflix-Like Experience:** TV-style interface for YouTube
2. **Advanced Organization:** 16 colored folders, custom tabs, drag-and-drop
3. **Progress Tracking:** Automatic resume from last position
4. **Large Playlist Support:** Handles thousands of videos efficiently
5. **Privacy-First:** All data stored locally, never leaves user's machine

### Developer Experience

1. **Comprehensive Documentation:** Everything documented for easy onboarding
2. **Clear Architecture:** Single-file frontend, modular backend
3. **Working Build Protocol:** Documented process with core criteria
4. **Tested Solutions:** All issues encountered and resolved
5. **Future-Ready:** Extensible architecture for new features

---

**End of Master Documentation**

*This document is the definitive reference for the YouTube TV project. It contains everything: tools, dependencies, architecture, user experience, breakthrough solutions, build protocol, and development workflow. Keep it updated as the project evolves.*

**Last Updated:** 2025-01-09  
**Status:** Production Ready - Fully Functional

