# YouTube TV - Master Context Document
**Last Updated:** 2025-01-09  
**Version:** 2.0  
**Document Type:** Project Overview & Architecture

> **🤖 AI Agent Note:** This document contains legacy Firestore architecture context. **For current Tauri architecture, see [TAURI-MIGRATION-COMPLETE-CONTEXT.md](./TAURI-MIGRATION-COMPLETE-CONTEXT.md) and [TAURI-DEVELOPMENT-GUIDE.md](./TAURI-DEVELOPMENT-GUIDE.md) first.**
>
> **🆕 Current Architecture:** Tauri v2 desktop app with local SQLite database
> - **Backend:** Rust (Tauri commands)
> - **Frontend:** Next.js static export
> - **Database:** Local SQLite (no cloud dependency)
> - **Status:** ✅ Production Ready
>
> **Related Documentation:**
> - **[TAURI-MIGRATION-COMPLETE-CONTEXT.md](./TAURI-MIGRATION-COMPLETE-CONTEXT.md)** 🆕 **START HERE** - Complete Tauri migration and working build protocol
> - **[TAURI-DEVELOPMENT-GUIDE.md](./TAURI-DEVELOPMENT-GUIDE.md)** 🆕 - Tauri-specific development patterns
> - [CODE-STRUCTURE.md](./CODE-STRUCTURE.md) - Detailed code organization and structure
> - [STATE-MANAGEMENT.md](./STATE-MANAGEMENT.md) - Complete state variable reference
> - [PATTERNS.md](./PATTERNS.md) - Recurring code patterns and idioms
> - [GOTCHAS.md](./GOTCHAS.md) - Common pitfalls and edge cases
> - [DATA-FLOW.md](./DATA-FLOW.md) - How data flows through the system
> - [DOCUMENTATION-GUIDE.md](./DOCUMENTATION-GUIDE.md) - Guide to all documentation
> - [DOCUMENTATION-MAINTENANCE.md](./DOCUMENTATION-MAINTENANCE.md) - How to keep docs updated

---

## 1. PROJECT OVERVIEW

> **🤖 AI Agent Note:** This section provides the high-level understanding. For implementation details, see CODE-STRUCTURE.md. For state management, see STATE-MANAGEMENT.md.

### 1.1 Purpose
A sophisticated single-page web application built with Next.js and React, designed as an enhanced front-end for YouTube. Provides a "lean-back," TV-like interface (Netflix-style) for managing and watching large YouTube playlists, particularly those with thousands of videos.

### 1.2 Core Technologies

**Current (Tauri Desktop App):**
- **Framework:** Next.js 14.2.33 (static export) with React 18
- **Desktop Wrapper:** Tauri v2 (Rust backend)
- **Database:** SQLite via `rusqlite` (local file, no cloud)
- **Styling:** Tailwind CSS
- **Icons:** lucide-react
- **Video Playback:** YouTube IFrame Player API
- **YouTube Data:** YouTube Data API v3 (playlist details, video metadata)
- **Drag & Drop:** jQuery UI Sortable

**Legacy (Electron/Cloud):**
- ~~**Database:** Google Firebase Firestore (data persistence)~~ → Migrated to local SQLite
- ~~**Authentication:** Firebase Anonymous Sign-In~~ → Not needed (local app)
- **Note:** See [TAURI-MIGRATION-COMPLETE-CONTEXT.md](./TAURI-MIGRATION-COMPLETE-CONTEXT.md) for migration details

### 1.3 Key Design Principles
- **Aggressive caching** to minimize API usage
- **API call minimization:** When in doubt, DON'T make API calls for titles/metadata. Thumbnails, playback, and organization are sufficient.
- **Separation of concerns:** Persistent data (SQLite database) vs session-specific data (React Refs)
- **Optimized database writes** with debouncing (2 seconds)
- **Session-specific shuffle orders** for fresh experience each visit
- **Local-first architecture** to prevent race conditions
- **Zero dependencies:** App works on fresh Windows installs (no Node.js required)
- **Representative video thumbnails:** Users can assign any video as a playlist's cover image
- **Resource bundling:** Default channels template bundled in `_up_/` directory

---

## 2. ARCHITECTURE & DATA STRUCTURE

> **🤖 AI Agent Note:** **Current architecture uses local SQLite database. See [TAURI-DEVELOPMENT-GUIDE.md](./TAURI-DEVELOPMENT-GUIDE.md) for database schema and [TAURI-MIGRATION-COMPLETE-CONTEXT.md](./TAURI-MIGRATION-COMPLETE-CONTEXT.md) for migration details.**

### 2.1 Current Data Model (Tauri/SQLite)

**Database Location:** `%APPDATA%\Roaming\YouTube TV\youtube-tv.db`

**Users Table:**
```sql
CREATE TABLE users (
    user_id TEXT PRIMARY KEY,
    custom_colors TEXT,        -- JSON object
    color_order TEXT,          -- JSON array
    playlist_tabs TEXT,       -- JSON array
    video_progress TEXT,       -- JSON object
    updated_at INTEGER
);
```

**Playlists Table:**
```sql
CREATE TABLE playlists (
    user_id TEXT NOT NULL,
    playlist_id TEXT NOT NULL,
    name TEXT NOT NULL,
    videos TEXT NOT NULL,      -- JSON array of video IDs
    groups TEXT,               -- JSON object (colored folders)
    starred TEXT,              -- JSON array
    category TEXT,
    description TEXT,
    thumbnail TEXT,
    is_converted_from_colored_folder INTEGER DEFAULT 0,
    representative_video_id TEXT,
    is_default INTEGER DEFAULT 0,
    updated_at INTEGER,
    PRIMARY KEY (user_id, playlist_id)
);
```

**Data Access:** Via Tauri commands (`get_user_data`, `save_user_data`, etc.)

**See:** [TAURI-DEVELOPMENT-GUIDE.md#database-schema](./TAURI-DEVELOPMENT-GUIDE.md#database-schema) for complete schema

### 2.2 Legacy Data Model (Firestore - Historical Reference)

> **Note:** This section is for historical reference. Current app uses SQLite.

**Main User Document:** `/users/{userId}/` (Firestore)
- **Size Constraint:** 1MB (1,048,576 bytes) per document limit
- **Current Optimization:** Stores only video IDs (as strings) in playlists array
- **Structure:** (See legacy documentation for full structure)

**Video Metadata Subcollection:** `/users/{userId}/videoMetadata/{videoId}` (Firestore)
- **Purpose:** Store detailed video information separately
- **Note:** Migrated to local SQLite database

### 2.2 State Management

> **See [STATE-MANAGEMENT.md](./STATE-MANAGEMENT.md) for complete state variable reference**

**useState Hooks:**
- `playlists`: Master array of all playlist objects
- `playlistTabs`: Array of tab objects for organizing playlists
- `currentPlaylistIndex`, `currentVideoIndex`: Active playlist and video
- `videoProgress`: Object mapping videoId to watch progress timestamps
- `activeShuffleOrder`, `currentShufflePosition`: Current playback order and position
- `showSideMenu`: Controls splitscreen visibility ('playlists', 'videos', 'history', 'search', 'author', null)
- `videoFilter`: Filter for side menu display ('all', 'search', 'red', 'green', 'pink', 'yellow')
- `activeTopMenuTab`: Index of active tab for top menu filtering
- `sortMode`: Video sorting mode ('chronological', 'shuffle')
- `watchedFilter`: Watch status filter ('all', 'watched', 'unwatched')
- `pinnedVideos`: Array of pinned videos (queue system, up to 10)
- `bulkDeleteMode`, `selectedPlaylistsForDelete`: Bulk delete state
- `bulkTagMode`, `targetPlaylistForBulkTag`, `pendingPlaylistBulkAssignments`: Bulk tag state

**useRef Hooks (Session-Specific, Not Saved to Firebase):**
- `playlistShuffleOrders`: Session-specific shuffle orders `{ [playlistId]: { [filterName]: [videoIndices] } }`
- `playlistShufflePositions`: Session-specific playback positions
- `fetchingPlaylists`: Set to track playlists being fetched
- `isFetchingAnyPlaylist`: Global lock to prevent parallel fetching (except during bulk add)
- `fetchStartTimes`: Map to track when fetches started (for stale lock detection)
- `pendingAssignments`: Set to track pending color assignments
- `latestPlaylistsRef`, `latestPlaylistTabsRef`: Track latest state for staged saves
- `lastChangeTimeRef`: Track when last change was made
- `playlistsLoadedFromFirestore`: Set to track playlists loaded from Firestore
- `playlistsFetchedThisSession`: Set to track playlists fetched in this session
- `titlesFetchedThisSession`: Set to track video IDs that have had titles fetched (prevents duplicate API calls)
- `isSavingRef`: Track if currently saving to prevent snapshot overwrites
- `lastSaveTimeRef`: Track last save time
- `lastLocalChangeTimeRef`: Track last local change time

---

## 3. USER INTERFACE & NAVIGATION

> **🤖 AI Agent Note:** This section documents all user-facing features. For code implementation, see CODE-STRUCTURE.md Section 7 (UI Rendering). Screenshots would be helpful but are not yet included - see DOCUMENTATION-GAPS.md.

### 3.1 Main Video Player Interface

**Layout:**
- Full-screen video player on the left (or full screen when side menu is closed)
- Splitscreen side menu on the right (50% width when open, animated transition)
- Background color dynamically adjusts based on current video thumbnail (average color calculation)

**Video Player:**
- YouTube IFrame Player embedded in main area
- Autoplay enabled, controls visible
- Video progress automatically saved every 5 seconds while playing
- Resumes from last watched position (if < 95% watched)
- Auto-advances to next video when current video ends

### 3.2 Top Menu Controls (Above Video Player)

**Playlist Navigation Bar:**
- **Background:** Dynamic color from video thumbnail with backdrop blur
- **Playlist Name Display:** Shows current playlist name (truncated, centered)
- **Previous/Next Playlist Buttons:** Left/right chevron buttons to cycle through playlists
- **Playlist Grid Button:** Opens/closes playlist management side menu
- **Tab Cycler:** If multiple tabs exist, shows tab buttons below playlist name
  - Clicking a tab switches to that tab's playlists
  - Remembers last playlist position per tab
  - "All" tab shows all playlists (except empty Unsorted)

**Video Info Bar:**
- **Background:** Dynamic color from video thumbnail
- **Metadata Display:**
  - Published year (uppercase, bold)
  - Author name (clickable, opens author videos)
  - View count (formatted, e.g., "1.2M views")
  - Current filter mode (shuffle/colored folder name)
- **Video Title:** 
  - Truncated to 48 characters by default
  - Expands on hover (2 second delay) to show full title
  - Previous/Next video buttons on either side
- **Control Buttons (Right Side):**
  - **Search Button:** Opens search side menu (blue when active)
  - **Video Grid Button:** Opens video grid for current playlist
  - **History Button:** Opens watch history side menu (blue when active)
  - **Filter Button (Play Icon):** Cycles through colored folders (colored when active)
  - **Shuffle Button:** Regenerates shuffle order for current filter
  - **Wipe Button (Trash Icon):** Deletes all colored folders and added playlists (preserves tabs)
  - **Settings Button (Pencil Icon):** Opens settings dropdown menu
    - Shows persistent user ID
    - Copy user ID button
    - Configuration button

### 3.3 Side Menu Screens

**Side Menu Behavior:**
- Opens from right side, splits screen 50/50 with video player
- Smooth animated transition (500ms)
- Background color matches video thumbnail average color
- Can be closed by clicking X button or clicking outside
- Navigation buttons in top-right corner of each screen

#### 3.3.1 Playlists Screen (`showSideMenu === 'playlists'`)

**Header:**
- Tab selector at top (All, Custom Tab 1, Custom Tab 2, etc.)
- "Add Tab" button (+ icon) to create new tabs
- Control buttons:
  - **"View Videos" Button:** Opens video grid for current playlist
  - **Close Button (X):** Closes side menu

**Controls:**
- **Add Playlist Button:** Opens modal to add YouTube playlist by ID
- **Create Empty Button:** Creates empty placeholder playlist
- **Bulk Add Button:** Opens bulk add modal for multiple playlists
- **Bulk Delete Toggle:** Enables bulk delete mode
  - Shows checkboxes on playlists
  - Red ring highlight on selected playlists
  - Delete button shows count of selected playlists
- **Bulk Tag Toggle:** Enables bulk tag mode
  - Select target playlist (green "Target" button)
  - Hover over other playlists to show 4x4 color grid
  - Click color to assign playlist to that colored folder
  - Save button shows count of pending assignments
- **Show Colored Folders Toggle:** Show/hide colored folder playlists
- **Show Playlists Toggle:** Show/hide regular playlists

**Playlist Grid:**
- Grid layout (1-3 columns based on screen size)
- Each playlist shows:
  - Thumbnail (representative video or first video thumbnail)
  - Playlist name overlay (editable via rename feature)
  - Video count badge
  - Current playlist highlighted with blue ring
  - Colored folders show colored border matching folder color
- **Playlist Actions (on hover/click):**
  - Click thumbnail: Switch to that playlist
  - "View Videos" button: Opens video grid for that playlist
  - "Play" button: Plays first video in playlist
  - **Rename button (blue pencil icon):** Rename playlist inline (Enter to save, Escape to cancel)
  - **"Add to Tab" button (+ icon):** Opens modal to add existing playlists to current tab (only visible in custom tabs, not "All")
  - Delete button (red trash icon): Deletes playlist
  - Merge buttons: Merge colored folder or playlist into another
  - Remove from Tab button (orange X icon): Removes playlist from current tab (only in custom tabs)
- **Tab System:**
  - Two separate tab systems:
    - `activePlaylistTab`: Controls which tab is active in main video player area (top menu)
    - `viewingPlaylistTab`: Controls which tab's playlists are shown in playlist grid menu (side menu)
  - "All" tab (index 0): Shows all playlists except empty Unsorted
  - Custom tabs: Show only playlists assigned to that tab
  - Tab selector at top of playlist grid menu
  - "Add Tab" button (+ icon) creates new tabs
  - Delete tab button (X icon) on each custom tab
  - Remembers last playlist position per tab

#### 3.3.2 Video Grid Screen (`showSideMenu === 'videos'`)

**Header:**
- Shows current playlist name
- Filter tabs: "All", "Unsorted", and colored folder buttons (Red, Green, Pink, Yellow)
- Rename button (pencil icon) appears when colored folder is selected
- Navigation buttons:
  - **Back Button:** Returns to playlists screen
  - **Close Button (X):** Closes side menu

**Video Grid:**
- Scrollable grid of video thumbnails
- Each video shows:
  - Thumbnail image
  - Video title
  - Duration badge (top-left)
  - Progress bar (if video has been watched)
  - Current video highlighted with blue ring
- **Video Actions:**
  - Click video: Plays that video
  - Right-click video: Opens context menu (3-dot menu)
  - Hover on colored folder videos: Shows "Remove from Group" button
  - Drag and drop: Reorder videos (jQuery UI Sortable)
  - **Pin button (yellow pin icon):** Pin video to queue (max 10 pins, accessible from top menu)
  - **Set as Playlist Cover (3-dot menu):** Assign video as representative thumbnail for its playlist
- **Sorting Options:**
  - Chronological (default)
  - Shuffle mode toggle
  - Watched/Unwatched filter
- **Pagination:**
  - Shows 12 videos initially
  - "Show More Videos" button to load more
  - Scroll position remembered per playlist/filter combination

**Context Menu (Right-click on video):**
- Remove from Playlist
- Send to Playlist (Copy)
- Send to Playlist (Move)
- Pin Video (adds to queue, max 10)
- Set as Playlist Cover / Remove as Playlist Cover (only when not in bulk mode)

#### 3.3.3 Watch History Screen (`showSideMenu === 'history'`)

**Header:**
- Title: "Watch History"
- Navigation buttons:
  - **Back Button:** Returns to playlists screen
  - **Close Button (X):** Closes side menu

**History List:**
- Vertical list of last 100 watched videos
- Each entry shows:
  - Video thumbnail (32px width, aspect-video)
  - Video title
  - Playlist name and timestamp (e.g., "Playlist Name • 2 hours ago")
  - Current video highlighted with blue ring
- **Interactions:**
  - Click entry: Plays that video from its playlist
  - Shows 12 entries initially
  - "Show More History" button to load more entries
- **Data:**
  - Stored in Firestore subcollection `/users/{userId}/history/`
  - Ordered by timestamp (newest first)
  - Automatically saves when video plays
  - Updates existing entry if video already in history (updates timestamp)

#### 3.3.4 Search Screen (`showSideMenu === 'search'`)

**Header:**
- Title: "Search YouTube"
- Search input field with search icon
- Auto-focus on open
- Navigation buttons:
  - **Back Button:** Returns to playlists screen
  - **Close Button (X):** Closes side menu

**Search Functionality:**
- Type search query and press Enter
- Searches YouTube using Data API v3
- Shows up to 5 results
- Each result shows:
  - Video thumbnail
  - Video title
  - Duration badge
  - Current video highlighted with blue ring
- **Interactions:**
  - Click video: Plays video (adds to "Unsorted" playlist if not in any playlist)
  - Videos from search are added to special "Unsorted" playlist

#### 3.3.5 Author Videos Screen (`showSideMenu === 'author'`)

**Header:**
- Title: "Latest from {Author Name}"
- Navigation buttons:
  - **Back Button:** Returns to playlists screen
  - **Close Button (X):** Closes side menu

**Author Videos Grid:**
- Triggered by clicking author name in video info bar
- Fetches latest videos from that channel
- Grid layout (1-3 columns)
- Each video shows:
  - Thumbnail
  - Video title
  - Duration badge
  - Current video highlighted with blue ring
- **Interactions:**
  - Click video: Plays video (adds to "Unsorted" playlist if needed)

### 3.4 Modals & Dialogs

#### 3.4.1 Configuration Modal
- **Trigger:** Settings button → Configuration button
- **Purpose:** Initial setup and API key configuration
- **Fields:**
  - YouTube API Key input
  - Firebase configuration (if needed)
- **Actions:**
  - Save configuration
  - Close modal

#### 3.4.2 Add Playlist Modal
- **Trigger:** "Add Playlist" button in playlists screen
- **Purpose:** Add single YouTube playlist
- **Fields:**
  - Playlist ID input
  - Playlist name (fetched automatically)
- **Actions:**
  - Add playlist
  - Cancel/Close

#### 3.4.3 Bulk Add Modal
- **Trigger:** "Bulk Add" button in playlists screen
- **Purpose:** Add multiple playlists at once
- **Fields:**
  - Textarea for playlist IDs (one per line)
- **Actions:**
  - Start bulk add (shows progress)
  - Close modal (progress continues in background)

#### 3.4.4 Send to Playlist Modal
- **Trigger:** Context menu → "Send to Playlist"
- **Purpose:** Move or copy video to another playlist
- **Fields:**
  - Playlist selector (dropdown/list)
  - Copy vs Move toggle
- **Actions:**
  - Send video
  - Cancel

#### 3.4.5 Merge Modals
- **Merge Colored Folder Modal:** Merge colored folder into playlist
- **Merge Playlist Modal:** Merge one playlist into another
- **Fields:**
  - Target playlist selector
- **Actions:**
  - Confirm merge
  - Cancel

#### 3.4.6 Add Playlist to Tab Modal
- **Trigger:** "Add to Tab" button on playlist thumbnail
- **Purpose:** Add playlist to a custom tab
- **Fields:**
  - Tab selector
- **Actions:**
  - Add to tab
  - Cancel

### 3.5 Pin/Queue System

**Location:** Visible in video grid when videos are pinned

**Features:**
- Up to 10 videos can be pinned
- Pinned videos appear at top of video grid
- Drag and drop to reorder pins
- **Pin Actions:**
  - Pin video: Right-click → "Pin Video"
  - Unpin video: Click pin icon on pinned video
  - Play pinned video: Click on pinned video thumbnail

### 3.6 Drag & Drop Features

**Video Reordering:**
- In video grid, drag videos to reorder
- Uses jQuery UI Sortable
- Long-press to drag (prevents accidental drags)
- Visual feedback during drag

**Pin Reordering:**
- Drag pinned videos to reorder queue
- Same drag system as video reordering

### 3.7 Keyboard & Mouse Interactions

**Video Title:**
- Hover for 2 seconds: Expands to show full title
- Click: No action (title is display-only)

**Playlist Navigation:**
- Click playlist thumbnail: Switch to that playlist
- Hover: Shows action buttons

**Video Selection:**
- Click video: Plays video
- Right-click video: Opens context menu
- Long-press: Initiates drag (for reordering)

**Color Assignment:**
- Hover over video in bulk mode: Shows 4x4 color grid
- Click color: Assigns video to that colored folder
- Same system for bulk tagging playlists

---

## 4. CORE FEATURES (Functional Overview)

### 4.1 Playback System
- YouTube IFrame Player API integration
- Robust shuffle logic with session-specific playback positions
- Next/Previous video navigation with progress saving
- Playlist switching with position memory
- Resume from last watched video on app load
- Video progress tracking with timestamps (stored in localStorage, synced to Firestore)
- Watch history tracking (last 100 videos)

### 4.2 Organization & Management
- **Colored Folders:** Red, green, pink, yellow for video organization within playlists
- **Main Player Filter:** Cycles through colored folders and "all" view
- **Drag and Drop:** Organize videos into colored folders
- **Renameable Groups:** Colored folder groups can be renamed
- **Star System:** Quick video organization (legacy, being migrated to yellow group)
- **Hover-Activated Menus:** Color selection menus on hover
- **Convert/Merge:** Convert colored folders to regular playlists, merge into existing playlists

### 4.3 Tabbed Interface System
- Custom tabs for organizing playlists
- Add/remove playlists from tabs
- Add colored folder playlists to tabs
- Tab renaming and deletion
- Tab cycling with content filtering
- Empty tab detection and skipping
- Top menu tab filtering for navigation

### 4.4 Advanced Sorting & Filtering
- Chronological sorting (default)
- Shuffle mode with multiple shuffle orders
- Watched/unwatched filtering
- "All" vs "Unsorted" (search) video filtering
- Sort settings remembered per playlist
- Scroll memory for video grids

### 4.5 Bulk Operations
- **Bulk Add Playlists:** Add multiple playlists at once with progress tracking
- **Bulk Delete Playlists:** Delete multiple playlists simultaneously
- **Bulk Tag Playlists:** Tag multiple playlists to colored folders using 4x4 color grid overlay
- **Create Empty Playlists:** Create placeholder playlists without videos

---

## 4. RECENT DEVELOPMENTS (Last 24 Hours)

### 4.1 Firestore Document Size Optimization (Critical)

**Problem Identified:**
- Firestore document exceeded 1MB limit (1,048,576 bytes)
- Document reached ~1,100KB, causing save failures
- Error: `Document '...' cannot be written because its size (1,050,776 bytes) exceeds the maximum allowed size of 1,048,576 bytes`

**Solution Implemented:**
1. **Initial Optimization:** Modified `performStagedSave` to save only essential video data (`id` and `title`) in playlists array
2. **Final Optimization:** Further reduced to save **only video IDs as strings** (removed titles entirely)
3. **Video Metadata Subcollection:** Utilized existing `videoMetadata` subcollection for detailed video information
4. **Background Title Fetching:** Implemented asynchronous title fetching on load since titles are no longer saved in main document

**Code Changes:**
- `performStagedSave`: Now saves only video IDs as strings
- `onSnapshot`: Expands video IDs to minimal objects `{ id, title: '', duration: 1 }` on load
- Background fetching: Fetches titles from YouTube API for videos without titles
- Video metadata: Titles are now cached in `videoMetadata` subcollection

### 4.2 API Usage Optimization (Current Challenge)

**Problem:**
- Document size reduction change exponentially increased API usage
- User reported going over daily API limit (was ~1000, now exceeded)
- 5000 videos added today triggered massive title fetching

**Root Cause:**
- Title fetching runs on every load for all videos without titles
- No caching mechanism to prevent duplicate API calls
- Each playlist load triggers title fetching for all videos

**Solution Implemented (In Progress):**
1. **Session-Level Caching:** Added `titlesFetchedThisSession` ref to track fetched video IDs
2. **VideoMetadata Cache Check:** Check `videoMetadata` subcollection FIRST before making API calls
3. **Title Persistence:** Save fetched titles to `videoMetadata` subcollection for future loads
4. **Batch Delays:** Increased delay from 500ms to 1000ms to batch multiple playlists
5. **Duplicate Prevention:** Filter out videos already fetched in session or cached in Firestore

**Current Status:**
- First load after adding videos: Still requires API calls (100 calls for 5000 videos at 50 per batch)
- Subsequent loads: Minimal API usage since titles are cached
- Over time: API usage decreases as more titles are cached

### 4.3 Bulk Operations Enhancements

**Bulk Add Playlists:**
- Implemented concurrent fetching (up to 3 playlists at once during bulk add)
- Removed global `isFetchingAnyPlaylist` lock for bulk operations
- Added persistence to prevent newly added playlists from being deleted by incoming snapshots
- Enhanced `onSnapshot` logic to preserve locally added playlists not yet in Firestore

**Bulk Delete Playlists:**
- Added `bulkDeleteMode` and `selectedPlaylistsForDelete` states
- Implemented `handleBulkDeletePlaylists` function
- Added "Bulk Delete" toggle button in playlist controls
- Modified playlist rendering to show checkboxes and red ring highlights in bulk delete mode
- Hid normal action buttons when in bulk delete mode

**Bulk Tag Playlists:**
- Added `bulkTagMode`, `targetPlaylistForBulkTag`, `pendingPlaylistBulkAssignments` states
- Implemented `handleBulkTagPlaylists` function
- Added "Bulk Tag" toggle button in playlist controls
- Modified playlist rendering to allow selecting target playlist
- Added 4x4 color grid overlay on hover for quick tagging (similar to video sorting system)

**Create Empty Playlists:**
- Implemented `handleCreateEmptyPlaylist` function
- Generates unique ID, prompts for name, adds to state
- Added "Create Empty" button next to "Add Playlist" in top controls
- Added "Empty" button in playlist grid itself

### 4.4 Data Persistence Fixes

**Bulk Add Persistence:**
- Fixed issue where bulk added playlists were being deleted after being populated
- Root cause: Incoming Firestore snapshots were overwriting local state
- Solution: Modified `onSnapshot` logic to explicitly identify and preserve locally added playlists not present in incoming snapshot
- Enhanced `wouldLoseData` check to account for locally added playlists

**Snapshot Rejection Logic:**
- Refined `onSnapshot` listener to be less aggressive
- Relies more on `wouldLoseData` check
- Allows valid snapshots to be processed while preventing data loss

---

## 5. CURRENT CHALLENGES

> **See [GOTCHAS.md](./GOTCHAS.md) for common pitfalls related to these challenges**

### 5.1 API Usage Optimization (High Priority)

> **Related:** [PATTERNS.md#6-cache-first-api-pattern](./PATTERNS.md#6-cache-first-api-pattern) - Caching pattern
> **Related:** [GOTCHAS.md#5-duplicate-api-calls](./GOTCHAS.md#5-duplicate-api-calls) - Duplicate API calls gotcha

**Problem:**
- Document size reduction caused exponential increase in API calls
- User exceeded daily API limit after adding 5000 videos
- Title fetching runs on every load without proper caching

**Current Implementation:**
- Session-level caching with `titlesFetchedThisSession` ref
- VideoMetadata subcollection cache checking
- Title persistence to Firestore
- Batch delays and duplicate prevention

**Remaining Issues:**
- First load still requires significant API calls for new videos
- No persistent cache for titles across sessions (only session-level)
- Background fetching may still trigger too many concurrent requests

**Additional Options (Pinned for Future Consideration):**
1. **Lazy Loading:** Fetch titles only when videos are viewed (not on playlist load)
2. **Manual Fetch Button:** Add a "Fetch Titles" button instead of automatic fetching
3. **Increased Delays:** Further increase delays between batches to slow down fetching
4. **Rate Limiting:** Implement more aggressive rate limiting to stay within quota
5. **Batch Size Reduction:** Reduce batch size from 50 to smaller number to spread out calls

### 5.2 Firestore Document Size Management

> **Related:** [GOTCHAS.md#1-firestore-document-size-limit-1mb](./GOTCHAS.md#1-firestore-document-size-limit-1mb) - Document size limit
> **Related:** [PATTERNS.md#9-video-id-optimization-pattern](./PATTERNS.md#9-video-id-optimization-pattern) - ID optimization

**Current Status:**
- Document optimized to store only video IDs
- Size reduced significantly but may still approach limit with very large playlists
- Video metadata stored in subcollection to manage size

**Potential Future Issues:**
- Very large playlists (1000+ videos) may still cause size issues
- Need to monitor document size as playlists grow
- May need to implement playlist splitting or pagination

### 5.3 Data Consistency

> **Related:** [DATA-FLOW.md](./DATA-FLOW.md) - Complete data flow documentation
> **Related:** [GOTCHAS.md#2-snapshot-race-conditions](./GOTCHAS.md#2-snapshot-race-conditions) - Race conditions
> **Related:** [GOTCHAS.md#3-orphaned-video-ids-in-groups](./GOTCHAS.md#3-orphaned-video-ids-in-groups) - Orphaned IDs

**Challenges:**
- Balancing local-first architecture with Firestore real-time updates
- Preventing race conditions between saves and snapshots
- Ensuring data integrity during bulk operations
- Handling concurrent modifications

**Current Solutions:**
- `isSavingRef` to prevent snapshot overwrites during saves
- `wouldLoseData` checks to prevent data loss
- Staged saves with debouncing
- Explicit preservation of locally added playlists

---

## 6. KEY CODE SECTIONS

> **See [CODE-STRUCTURE.md](./CODE-STRUCTURE.md) for complete code organization**

### 6.1 Document Size Optimization

> **Related:** [GOTCHAS.md#1-firestore-document-size-limit-1mb](./GOTCHAS.md#1-firestore-document-size-limit-1mb) - Document size limit gotcha

**Saving (performStagedSave, ~line 1876):**
```javascript
const optimizedPlaylists = fixedPlaylists.map(playlist => {
  const optimizedVideos = (playlist.videos || []).map(video => {
    if (typeof video === 'string') return video;
    const videoId = video.id || video;
    return typeof videoId === 'string' ? videoId : String(videoId);
  });
  return { ...playlist, videos: optimizedVideos };
});
```

**Loading (onSnapshot, ~line 1376):**
```javascript
// Expand video IDs to minimal objects
const expandedVideos = playlist.videos.map(v => {
  let videoId, existingTitle, existingDuration;
  if (typeof v === 'string') { 
    videoId = v; 
    existingTitle = ''; 
    existingDuration = 1; 
  }
  else if (v && typeof v === 'object') { 
    videoId = v.id || v; 
    existingTitle = v.title || ''; 
    existingDuration = v.duration || 1; 
  }
  else { 
    videoId = v; 
    existingTitle = ''; 
    existingDuration = 1; 
  }
  return { id: videoId, title: existingTitle, duration: existingDuration };
});

// Check cache and fetch titles in background
// (See section 6.2 for title fetching logic)
```

### 6.2 Title Fetching with Caching

> **Related:** [DATA-FLOW.md#5-title-fetching-flow](./DATA-FLOW.md#5-title-fetching-flow) - Title fetching flow diagram
> **Related:** [PATTERNS.md#6-cache-first-api-pattern](./PATTERNS.md#6-cache-first-api-pattern) - Cache-first pattern

**Cache Check and Fetch (~line 1382):**
```javascript
// Filter videos needing titles (skip if already fetched or cached)
const videosNeedingTitles = expandedVideos.filter(v => {
  const videoId = v.id;
  if (v.title && v.title.trim() !== '') return false;
  if (titlesFetchedThisSession.current.has(videoId)) return false;
  return true;
});

// Check videoMetadata subcollection FIRST
setTimeout(async () => {
  // Check cache in videoMetadata subcollection
  const metadataCacheRef = collection(db, 'users', userId, 'videoMetadata');
  const cachedTitles = {};
  
  // Batch check (30 items per query limit)
  for (let i = 0; i < videoIdsNeedingTitles.length; i += 30) {
    const batchIds = videoIdsNeedingTitles.slice(i, i + 30);
    const q = query(metadataCacheRef, where('__name__', 'in', batchIds));
    const querySnapshot = await getDocs(q);
    querySnapshot.forEach(doc => {
      const meta = doc.data();
      if (meta.title && meta.title.trim() !== '') {
        cachedTitles[doc.id] = meta.title;
        titlesFetchedThisSession.current.add(doc.id);
      }
    });
  }
  
  // Update playlists with cached titles immediately
  if (Object.keys(cachedTitles).length > 0) {
    setPlaylists(prev => prev.map(p => {
      // Update videos with cached titles
    }));
  }
  
  // Only fetch from API for videos not in cache
  const idsToFetchFromAPI = videoIdsNeedingTitles.filter(id => 
    !cachedTitles[id] && !titlesFetchedThisSession.current.has(id)
  );
  
  // Fetch in batches of 50, save to cache
  for (let i = 0; i < idsToFetchFromAPI.length; i += 50) {
    // API call...
    // Save titles to videoMetadata subcollection
    const batch = writeBatch(db);
    Object.entries(titleMap).forEach(([videoId, title]) => {
      const metaRef = doc(db, 'users', userId, 'videoMetadata', videoId);
      batch.set(metaRef, { title }, { merge: true });
    });
    await batch.commit();
  }
}, 1000);
```

### 6.3 Bulk Add with Concurrency

> **Related:** [DATA-FLOW.md#6-bulk-add-flow](./DATA-FLOW.md#6-bulk-add-flow) - Bulk add flow diagram
> **Related:** [PATTERNS.md#8-concurrent-fetch-control-pattern](./PATTERNS.md#8-concurrent-fetch-control-pattern) - Concurrency control

**fetchAllVideos (~line 2705):**
```javascript
const fetchAllVideos = async (playlistId, playlistIndex) => {
  // For bulk adds, allow multiple playlists to fetch in parallel (up to 3 concurrent)
  const isBulkAdd = bulkAddProgress.total > 0;
  const currentFetchingCount = fetchingPlaylists.current.size;
  const maxConcurrentFetches = isBulkAdd ? 3 : 1;
  
  if (!isBulkAdd && isFetchingAnyPlaylist.current) {
    return Promise.resolve();
  }
  
  if (isBulkAdd && currentFetchingCount >= maxConcurrentFetches) {
    return Promise.resolve();
  }
  
  // Set locks and fetch...
};
```

### 6.4 Data Loss Prevention

> **Related:** [DATA-FLOW.md#10-data-loss-prevention-flow](./DATA-FLOW.md#10-data-loss-prevention-flow) - Data loss prevention flow
> **Related:** [PATTERNS.md#3-data-loss-prevention-pattern](./PATTERNS.md#3-data-loss-prevention-pattern) - Prevention pattern
> **Related:** [GOTCHAS.md#2-snapshot-race-conditions](./GOTCHAS.md#2-snapshot-race-conditions) - Race condition gotcha

**onSnapshot with Local Playlist Preservation (~line 1345):**
```javascript
onSnapshot(userDocRef, async (snapshot) => {
  if (isSavingRef.current) {
    console.log('⏸️ Snapshot received during save, skipping...');
    return;
  }
  
  const data = snapshot.data();
  const snapshotPlaylists = data?.playlists || [];
  const snapshotPlaylistIds = new Set(snapshotPlaylists.map(p => p.id));
  
  // Identify locally added playlists not in snapshot
  const locallyAddedPlaylists = playlists.filter(p => 
    !snapshotPlaylistIds.has(p.id) && 
    playlistsLoadedFromFirestore.current.has(p.id) === false
  );
  
  // Preserve locally added playlists
  let finalPlaylists = [...snapshotPlaylists];
  if (locallyAddedPlaylists.length > 0) {
    finalPlaylists = [...finalPlaylists, ...locallyAddedPlaylists];
    console.log(`💾 Preserving ${locallyAddedPlaylists.length} locally added playlists`);
  }
  
  // Check if we would lose data
  const wouldLoseData = checkWouldLoseData(playlists, finalPlaylists, locallyAddedPlaylists);
  if (wouldLoseData) {
    console.log('⚠️ Would lose data, rejecting snapshot');
    return;
  }
  
  // Process snapshot...
});
```

---

## 7. FILE STRUCTURE

```
youtube-tv-grok444/
├── app/
│   ├── page.jsx          # Main application component (~5954 lines)
│   ├── layout.jsx         # Next.js layout wrapper
│   ├── globals.css        # Global styles
│   └── favicon.ico
├── public/
│   ├── next.svg
│   └── vercel.svg
├── package.json          # Dependencies and scripts
├── next.config.mjs       # Next.js configuration
├── tailwind.config.js    # Tailwind CSS configuration
├── postcss.config.mjs    # PostCSS configuration
├── jsconfig.json         # JavaScript configuration
├── .eslintrc.json        # ESLint configuration
├── .gitignore
├── .vercelignore
├── vercel.json           # Vercel deployment configuration
├── routes.json
├── docker-compose.yml
├── Dockerfile
├── server.js
├── setup.bat
├── setup.sh
├── loadData.js
├── db.json
├── debug-load.json
├── consolelog.txt        # Console logs for debugging
├── console-logs-*.json   # Timestamped console logs
├── context.txt           # Original project context
├── pho.txt              # Project handover documentation
├── project-handover-complete.txt  # Comprehensive handover doc
└── MASTER-CONTEXT.md    # This document
```

---

## 8. FIREBASE CONFIGURATION

**Firebase Config:**
```javascript
const firebaseConfig = {
  apiKey: "AIzaSyBgyAi3j6SAWDkCxKN1EpWMwKdw50XIwJU",
  authDomain: "yttv-b3008.firebaseapp.com",
  projectId: "yttv-b3008",
  storageBucket: "yttv-b3008.firebasestorage.app",
  messagingSenderId: "579182513471",
  appId: "1:579182513471:web:c916b392f2f3e527ce178a",
  measurementId: "G-0LRNV56DPG"
};
```

**YouTube API Key:**
- Stored in localStorage as `youtubeApiKey`
- Also available in config (legacy)
- Current key: `AIzaSyBYPwv0a-rRbTrvMA9nF4Wa1ryC0b6l7xw`

**Firestore Structure:**
```
/users/{userId}/
  ├── playlists: array
  ├── playlistTabs: array
  ├── videoProgress: object
  └── videoMetadata/{videoId}/
      ├── duration: number
      ├── publishedYear: string
      ├── author: string
      ├── viewCount: string
      ├── channelId: string
      └── title: string
```

---

## 9. DEPENDENCIES

**Key Dependencies:**
- `next`: ^14.0.0
- `react`: ^18.0.0
- `firebase`: ^10.0.0
- `lucide-react`: ^0.294.0
- `tailwindcss`: ^3.0.0
- `jquery`: For drag-and-drop functionality
- `jquery-ui`: For Sortable functionality

---

## 10. KNOWN ISSUES & DEBUGGING

### 10.1 Historical Issues (Resolved)
- ✅ Merged videos not persisting after refresh (Fixed with snapshot rejection logic refinement)
- ✅ Firestore document size limit exceeded (Fixed with ID-only storage)
- ✅ Video titles not showing after persistence fix (Fixed with background title fetching)
- ✅ Bulk add live updates stopping after 1-2 playlists (Fixed with concurrent fetching)
- ✅ "Rendered more hooks than during the previous render" error (Fixed by moving useMemo to top level)
- ✅ Bulk added playlists being deleted (Fixed with local playlist preservation)

### 10.2 Current Issues
- ⚠️ **API Usage:** First load after adding many videos requires significant API calls
- ⚠️ **Document Size:** May still approach limit with very large playlists (1000+ videos)
- ⚠️ **Rate Limiting:** May need more aggressive rate limiting for YouTube API

### 10.3 Debugging Tools
**Console Logging:**
- `🎬 setCurrentVideoIndex called:` - Tracks video index changes
- `🔄 setVideoFilterSafe:` - Tracks filter changes
- `🎲 Generating new shuffle order` - Tracks shuffle order creation
- `🎯 getSideMenuVideos called` - Tracks video list generation
- `📺 Video grid found:` - Tracks sortable initialization
- `💾 Preserving X locally added playlists` - Tracks data preservation
- `📡 Fetching titles for X videos` - Tracks title fetching
- `💾 Cached X titles in videoMetadata` - Tracks title caching

---

## 11. FUTURE CONSIDERATIONS

### 11.1 API Usage Optimization Options (Pinned)
1. **Lazy Loading Titles:** Fetch titles only when videos are viewed, not on playlist load
2. **Manual Fetch Button:** Add user-controlled "Fetch Titles" button instead of automatic fetching
3. **Increased Batch Delays:** Further increase delays between batches to spread out API calls
4. **Rate Limiting:** Implement more aggressive rate limiting to stay within YouTube API quota
5. **Batch Size Reduction:** Reduce batch size from 50 to smaller number (e.g., 25) to spread out calls

### 11.2 Potential Enhancements
- **Playlist Pagination:** Split very large playlists to manage document size
- **Progressive Title Loading:** Load titles in priority order (visible videos first)
- **Offline Support:** Cache titles in IndexedDB for offline access
- **API Quota Monitoring:** Add UI indicator for API quota usage
- **Smart Caching:** Implement TTL-based cache invalidation for video metadata

### 11.3 Technical Debt
- Consider refactoring large `page.jsx` component into smaller modules
- Improve error handling and user feedback for API failures
- Add comprehensive unit tests for critical functions
- Document API rate limits and quota management strategy

---

## 12. DEVELOPMENT WORKFLOW

### 12.1 Local Development
- Run `npm run dev` to start Next.js development server
- Hot reloading enabled
- Browser developer tools for debugging
- Console logging for tracking data flow

### 12.2 Deployment
- Vercel deployment configuration in `vercel.json`
- Environment variables for Firebase and YouTube API keys
- Production builds optimized automatically

### 12.3 Testing Strategy
- Manual testing for critical user flows
- Console log analysis for data persistence issues
- Firestore console for data structure verification
- YouTube API quota monitoring

---

## 13. KEY CONCEPTS FOR NEW DEVELOPERS

### 13.1 Session State vs Persistent State
- **Session State (useRef):** Shuffle orders, positions, fetch locks - reset every session
- **Persistent State (Firestore):** Playlists, tabs, video progress - saved across sessions

### 13.2 Data Flow
1. **Load:** Firestore snapshot → Expand video IDs → Check cache → Fetch missing titles
2. **Save:** Local changes → Debounced timer → Staged save → Firestore update
3. **Sync:** Real-time Firestore updates → Snapshot listener → Merge with local state

### 13.3 Critical Functions
- `performStagedSave`: Optimized save to Firestore (ID-only format)
- `onSnapshot`: Real-time data sync with data loss prevention
- `fetchAllVideos`: Playlist fetching with caching and concurrency control
- `handleBulkAddPlaylists`: Bulk operations with progress tracking

### 13.4 Important Patterns
- **Debouncing:** All saves are debounced to prevent excessive writes
- **Staged Saves:** Changes accumulated before single Firestore update
- **Local-First:** Local state takes precedence during saves
- **Cache-First:** Always check cache before API calls

---

## 14. CONCLUSION

This project is a sophisticated YouTube playlist management application with advanced features for organization, playback, and data management. Recent developments have focused on optimizing Firestore document size and reducing API usage through intelligent caching strategies.

**Current Status:**
- ✅ Core features implemented and working
- ✅ Document size optimization complete
- ✅ Bulk operations fully functional
- ⚠️ API usage optimization in progress
- ⚠️ Monitoring document size as playlists grow

**Priority Focus:**
1. API usage optimization (reduce calls through better caching)
2. Document size monitoring (prevent future 1MB limit issues)
3. Data consistency (ensure reliable saves and syncs)

**Next Steps:**
- Monitor API usage after caching improvements
- Consider implementing lazy loading or manual fetch options
- Continue optimizing data structures for scalability

---

**Document Version:** 1.0  
**Last Updated:** 2025-01-06  
**Maintained By:** Development Team  
**For Questions:** Refer to this document or review code comments in `app/page.jsx`

---

## Related Documentation Files

This master context document is part of a comprehensive documentation set. For detailed information on specific topics, see:

- **[CODE-STRUCTURE.md](./CODE-STRUCTURE.md)** - Detailed code organization, function locations, and file structure
- **[STATE-MANAGEMENT.md](./STATE-MANAGEMENT.md)** - Complete reference for all state variables, update patterns, and dependencies
- **[PATTERNS.md](./PATTERNS.md)** - Recurring code patterns, idioms, and best practices to follow
- **[GOTCHAS.md](./GOTCHAS.md)** - Common pitfalls, edge cases, and how to avoid them
- **[DATA-FLOW.md](./DATA-FLOW.md)** - Detailed data flow diagrams and explanations
- **[DOCUMENTATION-GUIDE.md](./DOCUMENTATION-GUIDE.md)** - Guide to all documentation and how to use it
- **[DOCUMENTATION-MAINTENANCE.md](./DOCUMENTATION-MAINTENANCE.md)** - Strategy for keeping documentation updated (includes automated update strategy)
- **[AI-QUICK-START.md](./AI-QUICK-START.md)** - Quick start guide for AI agents
- **[AI-ONBOARDING-PROMPT.md](./AI-ONBOARDING-PROMPT.md)** - Perfect prompt for onboarding fresh AI agents
- **[DOCUMENTATION-GAPS.md](./DOCUMENTATION-GAPS.md)** - Gap analysis and handover readiness
- **[README-DOCUMENTATION.md](./README-DOCUMENTATION.md)** - Documentation index

All documentation files are cross-referenced for easy navigation.

---

## Change Log

### 2025-01-06 (Latest)
- **Playlist Management Features:**
  - Rename playlists: Inline editing with pencil icon on hover (Enter to save, Escape to cancel)
  - Add existing playlists to tabs: Modal interface to add playlists to custom tabs (not "All" tab)
  - Representative video thumbnails: Users can assign any video as playlist cover via 3-dot menu
- **Tab System Clarification:**
  - Documented dual tab system: `activePlaylistTab` (main player) vs `viewingPlaylistTab` (playlist grid menu)
  - Tab selector in playlist grid menu controls which playlists are displayed
  - "Add to Tab" button (+ icon) appears in custom tabs to add existing playlists
- **Firestore Reads Optimization:**
  - Removed automatic metadata fetching on page load (was causing 10-15k read spikes)
  - Implemented localStorage persistence for metadata cache
  - Metadata now only fetched lazily when videos are actually viewed
  - Documented in FIRESTORE-READS.md
- **Documentation Updates:**
  - Updated MASTER-CONTEXT.md with all new UI features
  - Clarified tab system behavior and playlist management features
  - Documented representative video feature

### 2025-01-06 (Earlier)
- Added comprehensive UI and navigation documentation
- Documented all side menu screens (playlists, videos, history, search, author)
- Documented all modals and dialogs
- Added cross-references between all documentation files
- Created maintenance strategy document with automated update strategy
- Added AI-friendly formatting and quick start guide
- Created AI onboarding prompt
- Created documentation gaps analysis with strategies for all gaps
- Enhanced all docs with AI agent notes and status indicators
- Added prompt update reminders (only update prompt when docs actually exist)
- Created Git workflow guide with session checkpoint system

### Previous Updates
- Firestore document size optimization (ID-only storage)
- API usage optimization (caching strategy)
- Bulk operations (add, delete, tag, create empty)
- Data loss prevention enhancements
- Title fetching with cache-first pattern
