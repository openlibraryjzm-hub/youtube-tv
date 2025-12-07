# Code Structure & Organization
**Last Updated:** 2025-01-06  
**Version:** 1.0  
**Document Type:** Code Reference

> **🤖 AI Agent Note:** Use this document to find where specific functions, state, and UI elements are located in the codebase. Line numbers are approximate and may shift with code changes.
>
> **Quick Navigation:**
> - State declarations: Lines 297-438
> - Core functions: Lines 900-2700
> - Data persistence: Lines 1200-2300
> - UI rendering: Lines 4000-5954

This document outlines the organization of the codebase, primarily focusing on `app/page.jsx` which contains the entire application logic (~5954 lines).

> **Related Documentation:**
> - [MASTER-CONTEXT.md](./MASTER-CONTEXT.md) - Project overview and architecture
> - [STATE-MANAGEMENT.md](./STATE-MANAGEMENT.md) - State variables by line/section
> - [PATTERNS.md](./PATTERNS.md) - Code patterns used in these sections
> - [DATA-FLOW.md](./DATA-FLOW.md) - How functions in these sections interact
> - [GOTCHAS.md](./GOTCHAS.md) - Common issues in these code sections

## File Overview

**Main File:** `app/page.jsx`
- Single React component: `YouTubePlaylistPlayer`
- Contains all application logic, state, and UI
- No component splitting (monolithic architecture)
- Client-side only (`"use client"` directive)

## Code Organization (app/page.jsx)

### Section 1: Imports & Configuration (Lines 1-295)

#### Console Log Capture (Lines 1-49)
- Overrides console methods to capture logs
- Stores logs in localStorage
- Exposes `window.getConsoleLogs()` and `window.downloadConsoleLogs()`

#### Icon Imports (Lines 50-69)
- Lucide React icons for UI elements
- Icons: ChevronLeft, ChevronRight, Shuffle, Trash2, X, Grid3X3, Star, Check, Pencil, Clock, Play, Search, Plus, ListFilter, GitMerge, Pin

#### Firebase Imports (Lines 70-75)
- Firestore functions: `collection`, `query`, `orderBy`, `limit`, `deleteDoc`, `setDoc`, `doc`, `onSnapshot`, `updateDoc`, `getDocs`, `writeBatch`, `where`
- Firebase v9 modular API: `initializeApp`, `getFirestore`, `getAuth`
- Firebase v8 compatibility: `firestoreDoc`, `firestoreOnSnapshot`, `firestoreSetDoc`, etc.

#### Configuration Management (Lines 77-295)
- **Storage Keys:** `CONFIG_STORAGE_KEY`, `PRIMARY_USER_ID_KEY`, `PERSISTENT_USER_ID_KEY`
- **getPersistentUserId():** Generates/retrieves persistent user ID from localStorage
- **Default Firebase Config:** Fallback configuration object
- **Default API Key:** YouTube API key fallback
- **loadConfig():** Loads configuration from localStorage or defaults
- **saveConfig():** Saves configuration to localStorage
- **Utility Functions:**
  - `parseISO8601Duration()`: Parses YouTube ISO8601 duration strings
  - `formatMinutes()`: Formats seconds to MM:SS or HH:MM:SS
  - `formatViews()`: Formats view counts (1.2M, 500K, etc.)
  - `formatTimestamp()`: Formats timestamps (2 hours ago, etc.)
  - `fetchChannelVideos()`: Fetches videos from a YouTube channel

### Section 2: Component Definition & State (Lines 296-600)

#### Component Declaration (Line 296)
```javascript
export default function YouTubePlaylistPlayer() {
```

#### useState Hooks (Lines 297-417)

> **See [STATE-MANAGEMENT.md](./STATE-MANAGEMENT.md) for complete state variable reference with purposes and update patterns**

**Playback State:**
- `currentPlaylistIndex`: Current playlist in playlists array
- `currentVideoIndex`: Current video in current playlist
- `isPlayerReady`: YouTube player ready state
- `isPlaying`: Video playback state
- `activeShuffleOrder`: Current playback order (array of indices)
- `currentShufflePosition`: Position in shuffle order
- `playlistFilters`: Active filter per playlist `{ [playlistId]: 'all' | 'red' | ... }`

**Data State:**
- `playlists`: Master array of all playlists
- `playlistTabs`: Array of tab objects
- `videoProgress`: Object mapping videoId to timestamp
- `videoHistory`: Array of watch history entries (last 100)

**UI State:**
- `showSideMenu`: Which side menu is open (`'playlists' | 'videos' | 'history' | 'search' | 'author' | null`)
- `sideMenuPlaylistIndex`: Which playlist to show in video grid
- `videoFilter`: Current filter in video grid (`'all' | 'unsorted' | 'red' | 'green' | 'pink' | 'yellow'`)
- `visibleCount`: Number of videos to show in grid (pagination)
- `historyVisibleCount`: Number of history entries to show

**Bulk Operations State:**
- `bulkMode`: Bulk video assignment mode
- `pendingBulkAssignments`: Map of videoId -> color
- `bulkDeleteMode`: Bulk playlist deletion mode
- `selectedPlaylistsForDelete`: Set of playlist IDs
- `bulkTagMode`: Bulk playlist tagging mode
- `targetPlaylistForBulkTag`: Target playlist ID for bulk tagging
- `pendingPlaylistBulkAssignments`: Map of playlistId -> color
- `isBulkAdding`: Bulk add in progress
- `bulkAddProgress`: Progress tracking object

**Modal State:**
- `showAddPlaylistModal`: Add playlist modal visibility
- `showBulkAddModal`: Bulk add modal visibility
- `showSendToPlaylistModal`: Send video modal visibility
- `showMergeColoredFolderModal`: Merge colored folder modal visibility
- `showMergePlaylistModal`: Merge playlist modal visibility
- `showConfigModal`: Configuration modal visibility
- `showColorPickerModal`: Color picker modal visibility
- `showPersistentIdModal`: Persistent ID modal visibility

**Other UI State:**
- `draggingVideoId`: Currently dragging video ID
- `renamingGroup`: Currently renaming group color
- `groupRenameInput`: Input value for group rename
- `isTitleExpanded`: Video title expansion state
- `averageColor`: Dynamic background color from thumbnail
- `contextMenuVideo`: Video for context menu
- `contextMenuPosition`: Context menu position
- `showSettingsMenu`: Settings dropdown visibility

#### useRef Hooks (Lines 419-438)

> **See [STATE-MANAGEMENT.md#6-session-specific-state-useref](./STATE-MANAGEMENT.md#6-session-specific-state-useref) for complete ref documentation**

**Session-Specific Data (Not Saved to Firestore):**
- `playlistShuffleOrders`: Shuffle orders per playlist per filter
- `playlistShufflePositions`: Playback positions per playlist per filter
- `titlesFetchedThisSession`: Set of video IDs with fetched titles

**Timers:**
- `progressSaveTimer`: Timer for video progress saves
- `mainDataSaveTimer`: Timer for main data saves

**Fetching State:**
- `fetchingPlaylists`: Set of playlist IDs being fetched
- `isFetchingAnyPlaylist`: Global lock for fetching
- `fetchStartTimes`: Map of playlistId -> start time (for stale lock detection)

**Data Loss Prevention:**
- `isSavingRef`: Flag to prevent snapshot overwrites during saves
- `lastSaveTimeRef`: Timestamp of last save
- `lastLocalChangeTimeRef`: Timestamp of last local change
- `latestPlaylistsRef`: Latest playlists state for staged saves
- `latestPlaylistTabsRef`: Latest tabs state for staged saves

**Tracking:**
- `playlistsLoadedFromFirestore`: Set of playlist IDs loaded from Firestore
- `playlistsFetchedThisSession`: Set of playlist IDs fetched this session
- `pendingAssignments`: Set of pending color assignments
- `initialVideoLoaded`: Flag for initial video load
- `hasMigratedStarsRef`: Flag for star migration

### Section 3: Firebase Initialization (Lines 600-900)

#### Firebase Setup
- Loads configuration from localStorage
- Initializes Firebase app
- Gets Firestore instance
- Sets up anonymous authentication
- Handles persistent user ID

### Section 4: Core Logic Functions (Lines 900-2700)

#### Data Fetching Functions

> **Related:** [DATA-FLOW.md#6-bulk-add-flow](./DATA-FLOW.md#6-bulk-add-flow) - Fetch flow in bulk operations
> **Related:** [PATTERNS.md#8-concurrent-fetch-control-pattern](./PATTERNS.md#8-concurrent-fetch-control-pattern) - Concurrency pattern
> **Related:** [GOTCHAS.md#6-concurrent-fetch-conflicts](./GOTCHAS.md#6-concurrent-fetch-conflicts) - Fetch conflicts

- **fetchAllVideos(playlistId, playlistIndex):** Fetches all videos from a YouTube playlist
  - Checks cache first (videoMetadata subcollection)
  - Fetches uncached videos from YouTube API
  - Saves to cache
  - Updates playlists state
  - Handles concurrent fetching (up to 3 during bulk add)

#### Playback Control Functions
- **generateNewShuffleOrder(playlist, filterName):** Creates randomized video order
- **generateFilteredChronologicalOrder(videoIndices):** Creates chronological order
- **startNewShuffle():** Regenerates shuffle order
- **goToNextVideo():** Advances to next video
- **goToPreviousVideo():** Goes to previous video
- **changePlaylist(newIndex, options):** Switches playlists
- **setCurrentVideoIndexWithDebug(newIndex, reason):** Wrapper for video index changes

#### Organization Functions
- **assignCurrentVideoToColor(color):** Assigns current video to colored folder
- **assignVideoToColor(videoId, color):** Assigns video to colored folder
- **handleFolderCycleClick():** Cycles through colored folders
- **selectVideoFromMenu(videoIndex, playlistId):** Handles video selection from menu
- **getSideMenuVideos():** Determines videos to show in side menu (useMemo)
- **setVideoFilterSafe(newFilter):** Safely sets video filter

#### Tab Management Functions
- **handleAddTab():** Creates new tab
- **addPlaylistToTab(playlistId, tabIndex):** Adds playlist to tab
- **removePlaylistFromTab(playlistId, tabIndex):** Removes playlist from tab
- **handleRenameTab(tabIndex, newName):** Renames tab
- **handleDeleteTab(tabIndex):** Deletes tab

#### Video Grid Functions
- **handleViewPlaylistGrid(index):** Opens video grid for playlist
- **handleVideoReorder(oldIndex, newIndex):** Handles drag-and-drop reordering
- **handlePinVideo(video):** Adds/removes video from pin queue
- **handleSendVideoToPlaylist(video, action):** Sends video to playlist
- **handleDeleteVideo(videoId):** Removes video from playlist

#### Bulk Operation Functions
- **handleBulkAddPlaylists():** Adds multiple playlists
- **handleBulkDeletePlaylists():** Deletes multiple playlists
- **handleBulkTagPlaylists():** Tags multiple playlists to colored folders
- **handleCreateEmptyPlaylist():** Creates empty placeholder playlist

#### Merge Functions
- **mergeColoredFolderToPlaylist(sourcePlaylistId, color, targetPlaylistId):** Merges colored folder into playlist
- **mergePlaylistToPlaylist(sourcePlaylistId, targetPlaylistId):** Merges playlist into playlist

### Section 5: Data Persistence (Lines 1200-2300)

#### onSnapshot Listener (Lines 1100-1600)

> **Related:** [DATA-FLOW.md#3-snapshot-flow-firestore--state](./DATA-FLOW.md#3-snapshot-flow-firestore--state) - Snapshot flow diagram
> **Related:** [PATTERNS.md#3-data-loss-prevention-pattern](./PATTERNS.md#3-data-loss-prevention-pattern) - Data loss prevention
> **Related:** [PATTERNS.md#10-local-playlist-preservation-pattern](./PATTERNS.md#10-local-playlist-preservation-pattern) - Local preservation
> **Related:** [GOTCHAS.md#2-snapshot-race-conditions](./GOTCHAS.md#2-snapshot-race-conditions) - Race conditions

- Listens to Firestore user document
- Handles data normalization
- Prevents data loss with `wouldLoseData` checks
- Preserves locally added playlists
- Expands video IDs to objects
- Fetches titles from cache/API

#### Save Functions

> **Related:** [DATA-FLOW.md#2-save-flow-user-action--firestore](./DATA-FLOW.md#2-save-flow-user-action--firestore) - Save flow diagram
> **Related:** [PATTERNS.md#1-debounced-save-pattern](./PATTERNS.md#1-debounced-save-pattern) - Debounce pattern
> **Related:** [PATTERNS.md#5-staged-save-pattern](./PATTERNS.md#5-staged-save-pattern) - Staged save pattern
> **Related:** [GOTCHAS.md#3-orphaned-video-ids-in-groups](./GOTCHAS.md#3-orphaned-video-ids-in-groups) - Orphaned ID fixes

- **performStagedSave():** Debounced save to Firestore
  - Optimizes to save only video IDs (strings)
  - Fixes orphaned video IDs in groups
  - Batches updates
- **saveVideoProgress():** Saves video progress
  - Saves to localStorage immediately
  - Debounced save to Firestore
- **saveVideoHistory():** Saves watch history
  - Updates existing entries
  - Limits to 100 entries

### Section 6: useEffect Hooks (Lines 1600-2100)

#### Initialization Effects
- Firebase initialization
- User authentication
- Watch history loading
- Initial video selection

#### Data Fetching Effects
- Playlist fetching when playlists change
- Video metadata fetching for current video
- Title fetching in background

#### Save Effects
- Debounced main data save (playlists, tabs)
- Debounced video progress save
- Bulk add progress persistence

#### UI Effects
- Average color calculation from thumbnail
- YouTube player initialization
- Scroll memory restoration

### Section 7: UI Rendering (Lines 4000-5954)

#### Main Layout (Lines 4251-4260)
- Splitscreen layout (video player + side menu)
- Animated transitions
- Dynamic background colors

#### Side Menu Screens (Lines 4263-5166)
- **Playlists Screen:** Playlist grid, tabs, bulk operations
- **Video Grid Screen:** Video thumbnails, filters, sorting
- **History Screen:** Watch history list
- **Search Screen:** YouTube search
- **Author Screen:** Channel videos

#### Top Menu Controls (Lines 5280-5450)
- Playlist navigation
- Video info bar
- Control buttons (search, grid, history, filter, shuffle, wipe, settings)

#### Modals (Lines 4093-5300)
- Configuration modal
- Add playlist modal
- Bulk add modal
- Send to playlist modal
- Merge modals
- Color picker modal

#### Context Menus (Lines 5172-5230)
- Video context menu (right-click)
- Remove, send, pin options

## Key Architectural Patterns

### 1. Single-File Component
- All logic in one file for simplicity
- No component splitting
- Easy to search and navigate

### 2. State Management
- useState for UI and persistent data
- useRef for session-specific data
- Refs also used for timers and tracking

### 3. Data Flow
- Firestore → onSnapshot → State → UI
- User Action → State Update → Debounced Save → Firestore
- Local-first: Local state takes precedence during saves

### 4. Debouncing
- All saves are debounced (2 seconds)
- Prevents excessive Firestore writes
- Staged saves accumulate changes

### 5. Caching Strategy
- videoMetadata subcollection for video details
- Session-level caching for API calls
- localStorage for video progress

## Function Organization Principles

1. **Grouped by Concern:** Functions are organized by what they do (playback, organization, data, UI)
2. **Top-to-Bottom Flow:** Functions are defined before they're used
3. **Helper Functions First:** Utility functions defined early
4. **Complex Logic Separated:** Large functions broken into logical sections
5. **Comments for Sections:** Major sections have comments

## Code Size Considerations

- **Total Lines:** ~5954
- **State Variables:** ~60 useState hooks
- **Ref Variables:** ~20 useRef hooks
- **Functions:** ~50+ core functions
- **useEffect Hooks:** ~15 effects

## Navigation Tips

### Finding Functions
- Use IDE "Go to Symbol" (Ctrl+Shift+O in VS Code)
- Search for function names
- Look for comments marking sections

### Finding State
- Search for `useState` or `useRef`
- State variables are grouped by concern
- Check component start (lines 297-438)

### Finding UI Elements
- Search for JSX patterns (`<button`, `<div className`)
- Side menu screens start around line 4263
- Modals start around line 4093

## Common Code Locations

- **State Declarations:** Lines 297-438
- **Core Functions:** Lines 900-2700
- **Data Persistence:** Lines 1200-2300
- **useEffect Hooks:** Lines 1600-2100
- **UI Rendering:** Lines 4000-5954
- **YouTube Player:** Lines 3990-4041
- **onSnapshot:** Lines 1100-1600
- **Staged Save:** Lines 1864-2050

## Future Refactoring Opportunities

1. **Component Splitting:** Break into smaller components
2. **Custom Hooks:** Extract state logic into hooks
3. **Context API:** Share state across components
4. **Service Layer:** Separate data fetching logic
5. **Constants File:** Extract magic numbers and strings

---

**Note:** This structure reflects the current monolithic architecture. While it works, future refactoring could improve maintainability.

## Related Documentation

- **[MASTER-CONTEXT.md](./MASTER-CONTEXT.md)** - Project overview and architecture
- **[STATE-MANAGEMENT.md](./STATE-MANAGEMENT.md)** - State variables declared in Section 2
- **[PATTERNS.md](./PATTERNS.md)** - Patterns used in functions throughout this file
- **[DATA-FLOW.md](./DATA-FLOW.md)** - How functions in this file interact in data flows
- **[GOTCHAS.md](./GOTCHAS.md)** - Common issues in code sections documented here
