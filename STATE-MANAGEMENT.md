# State Management Guide
**Last Updated:** 2025-01-06  
**Version:** 1.0  
**Document Type:** State Reference

> **🤖 AI Agent Note:** This document catalogs ALL state variables. When modifying state, check here first to understand dependencies and update patterns. State is declared in CODE-STRUCTURE.md lines 297-438.

Complete reference for all state variables, their purposes, update patterns, and dependencies.

> **Related Documentation:**
> - [MASTER-CONTEXT.md#22-state-management](./MASTER-CONTEXT.md#22-state-management) - State overview in master context
> - [CODE-STRUCTURE.md#section-2-component-definition--state-lines-296-600](./CODE-STRUCTURE.md#section-2-component-definition--state-lines-296-600) - Where state is declared
> - [PATTERNS.md#4-functional-state-updates](./PATTERNS.md#4-functional-state-updates) - State update patterns
> - [DATA-FLOW.md](./DATA-FLOW.md) - How state flows through the system
> - [GOTCHAS.md#4-stale-closures-in-useeffect](./GOTCHAS.md#4-stale-closures-in-useeffect) - Common state bugs

## State Variable Categories

### 1. Playback State (useState)

#### `currentPlaylistIndex` (number)
- **Purpose:** Index of currently playing playlist in `playlists` array
- **Initial:** `-1`
- **Updates:** Set via `changePlaylist()`, `goToNextPlaylist()`, `goToPreviousPlaylist()`
- **Used By:** Video player, playlist navigation, side menu
- **Notes:** `-1` means no playlist selected

#### `currentVideoIndex` (number)
- **Purpose:** Index of currently playing video in current playlist's `videos` array
- **Initial:** `-1`
- **Updates:** Set via `setCurrentVideoIndexWithDebug()`, `goToNextVideo()`, `goToPreviousVideo()`
- **Used By:** Video player, video navigation
- **Notes:** Wrapped in debug function for logging

#### `isPlayerReady` (boolean)
- **Purpose:** YouTube IFrame Player API ready state
- **Initial:** `false`
- **Updates:** Set to `true` in player `onReady` event
- **Used By:** Player initialization checks

#### `isPlaying` (boolean)
- **Purpose:** Video playback state
- **Initial:** `false`
- **Updates:** Set in player `onStateChange` event
- **Used By:** Progress saving logic

#### `activeShuffleOrder` (array of numbers)
- **Purpose:** Current playback order (array of video indices)
- **Initial:** `[]`
- **Updates:** Set via `generateNewShuffleOrder()`, `generateFilteredChronologicalOrder()`
- **Used By:** Video navigation, playback order
- **Notes:** Can be shuffle order or chronological order

#### `currentShufflePosition` (number)
- **Purpose:** Current position in `activeShuffleOrder`
- **Initial:** `0`
- **Updates:** Incremented/decremented in navigation functions
- **Used By:** Video navigation

#### `playlistFilters` (object)
- **Purpose:** Active filter per playlist `{ [playlistId]: 'all' | 'red' | 'green' | 'pink' | 'yellow' }`
- **Initial:** `{}`
- **Updates:** Set via `handleFolderCycleClick()`, `selectVideoFromMenu()`
- **Used By:** Filter cycling, playback filtering
- **Notes:** Session-specific, not saved to Firestore

### 2. Data State (useState)

#### `playlists` (array)
- **Purpose:** Master array of all playlist objects
- **Initial:** `[]`
- **Updates:** 
  - Loaded from Firestore via `onSnapshot`
  - Modified via `setPlaylists()` with functional updates
  - Saved to Firestore via `performStagedSave()` (debounced)
- **Structure:**
  ```javascript
  {
    id: string,
    name: string,
    videos: [string], // Video IDs only (optimized for size)
    groups: {
      red: { name: string, videos: [videoIds] },
      green: { name: string, videos: [videoIds] },
      pink: { name: string, videos: [videoIds] },
      yellow: { name: string, videos: [videoIds] }
    }
  }
  ```
- **Used By:** Everything (primary data source)
- **Notes:** Videos stored as IDs only to save Firestore space

#### `playlistTabs` (array)
- **Purpose:** Array of tab objects for organizing playlists
- **Initial:** `[{ name: 'All', playlistIds: [] }]`
- **Updates:** Modified via tab management functions
- **Structure:**
  ```javascript
  {
    name: string,
    playlistIds: [string],
    coloredFolderPlaylists: [string] // Format: "playlistId_color"
  }
  ```
- **Used By:** Tab navigation, playlist filtering
- **Saved:** Yes, to Firestore (debounced)

#### `videoProgress` (object)
- **Purpose:** Maps videoId to watch progress timestamp
- **Initial:** `{}`
- **Updates:** 
  - Updated every 5 seconds while playing
  - Saved to localStorage immediately
  - Saved to Firestore (debounced, 2 seconds)
- **Structure:** `{ [videoId]: number }` (timestamp in seconds)
- **Used By:** Video player resume, progress bars
- **Notes:** Dual storage (localStorage + Firestore)

#### `videoHistory` (array)
- **Purpose:** Watch history (last 100 videos)
- **Initial:** `[]`
- **Updates:** 
  - Loaded from Firestore subcollection
  - Updated via `saveVideoHistory()` when video plays
- **Structure:**
  ```javascript
  {
    id: string,
    videoId: string,
    title: string,
    playlistId: string,
    playlistName: string,
    filter: string,
    timestamp: string (ISO)
  }
  ```
- **Used By:** History screen, resume on load
- **Saved:** Yes, to Firestore subcollection `/users/{userId}/history/`

### 3. UI State (useState)

#### `showSideMenu` (string | null)
- **Purpose:** Which side menu is open
- **Values:** `'playlists' | 'videos' | 'history' | 'search' | 'author' | null`
- **Initial:** `null`
- **Updates:** Set via button clicks, navigation
- **Used By:** Side menu rendering, layout

#### `sideMenuPlaylistIndex` (number)
- **Purpose:** Which playlist to show in video grid
- **Initial:** `0`
- **Updates:** Set when opening video grid
- **Used By:** Video grid screen

#### `videoFilter` (string)
- **Purpose:** Current filter in video grid
- **Values:** `'all' | 'unsorted' | 'red' | 'green' | 'pink' | 'yellow'`
- **Initial:** `'all'`
- **Updates:** Set via filter buttons, `setVideoFilterSafe()`
- **Used By:** Video grid filtering, `getSideMenuVideos()`

#### `visibleCount` (number)
- **Purpose:** Number of videos to show in grid (pagination)
- **Initial:** `12`
- **Updates:** Incremented via "Show More" button
- **Used By:** Video grid pagination
- **Notes:** Stored in `scrollMemory` per playlist/filter

#### `historyVisibleCount` (number)
- **Purpose:** Number of history entries to show
- **Initial:** `12`
- **Updates:** Incremented via "Show More History" button
- **Used By:** History screen pagination

#### `isTitleExpanded` (boolean)
- **Purpose:** Video title expansion state
- **Initial:** `false`
- **Updates:** Set on hover (2 second delay)
- **Used By:** Video title display

#### `averageColor` (string)
- **Purpose:** Dynamic background color from video thumbnail
- **Initial:** `'rgba(16, 16, 16, 0.7)'`
- **Updates:** Calculated from thumbnail in useEffect
- **Used By:** Top menu background, side menu background

### 4. Bulk Operations State (useState)

#### `bulkMode` (boolean)
- **Purpose:** Bulk video assignment mode
- **Initial:** `false`
- **Updates:** Toggled via button
- **Used By:** Video grid bulk operations

#### `pendingBulkAssignments` (Map)
- **Purpose:** Map of videoId -> color for bulk assignment
- **Initial:** `new Map()`
- **Updates:** Modified when selecting videos in bulk mode
- **Used By:** Bulk video assignment

#### `bulkDeleteMode` (boolean)
- **Purpose:** Bulk playlist deletion mode
- **Initial:** `false`
- **Updates:** Toggled via button
- **Used By:** Playlist grid bulk delete

#### `selectedPlaylistsForDelete` (Set)
- **Purpose:** Set of playlist IDs selected for deletion
- **Initial:** `new Set()`
- **Updates:** Modified via checkboxes
- **Used By:** Bulk playlist deletion

#### `bulkTagMode` (boolean)
- **Purpose:** Bulk playlist tagging mode
- **Initial:** `false`
- **Updates:** Toggled via button
- **Used By:** Playlist grid bulk tagging

#### `targetPlaylistForBulkTag` (string | null)
- **Purpose:** Target playlist ID for bulk tagging
- **Initial:** `null`
- **Updates:** Set when selecting target playlist
- **Used By:** Bulk playlist tagging

#### `pendingPlaylistBulkAssignments` (Map)
- **Purpose:** Map of playlistId -> color for bulk tagging
- **Initial:** `new Map()`
- **Updates:** Modified when tagging playlists
- **Used By:** Bulk playlist tagging

#### `isBulkAdding` (boolean)
- **Purpose:** Bulk add in progress
- **Initial:** Restored from sessionStorage
- **Updates:** Set during bulk add operations
- **Used By:** Bulk add progress tracking
- **Notes:** Persisted to sessionStorage

#### `bulkAddProgress` (object)
- **Purpose:** Progress tracking for bulk add
- **Initial:** Restored from sessionStorage or default
- **Structure:**
  ```javascript
  {
    loaded: number,
    inProgress: number,
    total: number,
    playlists: [{ id, name, status, videoCount, totalVideos }],
    totalVideosLoaded: number,
    totalVideosExpected: number
  }
  ```
- **Updates:** Updated as playlists are fetched
- **Used By:** Bulk add progress display
- **Notes:** Persisted to sessionStorage

### 5. Modal State (useState)

All modals follow the same pattern:
- `show[ModalName]Modal` (boolean): Controls visibility
- Related state for modal data

**Modals:**
- `showAddPlaylistModal`
- `showBulkAddModal`
- `showSendToPlaylistModal`
- `showMergeColoredFolderModal`
- `showMergePlaylistModal`
- `showConfigModal`
- `showColorPickerModal`
- `showPersistentIdModal`
- `showSettingsMenu`

### 6. Session-Specific State (useRef)

**Important:** These are NOT saved to Firestore. They reset each session.

#### `playlistShuffleOrders` (object)
- **Structure:** `{ [playlistId]: { [filterName]: [videoIndices] } }`
- **Purpose:** Shuffle orders per playlist per filter
- **Updates:** Generated via `generateNewShuffleOrder()`
- **Used By:** Playback order, shuffle logic

#### `playlistShufflePositions` (object)
- **Structure:** `{ [playlistId]: { [filterName]: position } }`
- **Purpose:** Playback positions per playlist per filter
- **Updates:** Updated during navigation
- **Used By:** Position memory

#### `titlesFetchedThisSession` (Set)
- **Purpose:** Track video IDs that have had titles fetched
- **Updates:** Added when titles are fetched
- **Used By:** Prevent duplicate API calls

#### `playlistsLoadedFromFirestore` (Set)
- **Purpose:** Track playlists loaded from Firestore
- **Updates:** Set in `onSnapshot` callback
- **Used By:** Prevent unnecessary re-fetching

#### `playlistsFetchedThisSession` (Set)
- **Purpose:** Track playlists fetched this session
- **Updates:** Added when playlists are fetched
- **Used By:** Prevent duplicate fetching

### 7. Timer & Lock State (useRef)

#### `mainDataSaveTimer` (Timeout)
- **Purpose:** Timer for debounced main data saves
- **Updates:** Cleared and reset on state changes
- **Used By:** `performStagedSave()`

#### `progressSaveTimer` (Timeout)
- **Purpose:** Timer for debounced video progress saves
- **Updates:** Cleared and reset on progress changes
- **Used By:** Video progress saving

#### `isFetchingAnyPlaylist` (boolean)
- **Purpose:** Global lock to prevent parallel fetching
- **Updates:** Set/cleared during fetch operations
- **Used By:** `fetchAllVideos()`
- **Notes:** Disabled during bulk add (allows 3 concurrent)

#### `fetchingPlaylists` (Set)
- **Purpose:** Track playlists being fetched
- **Updates:** Added/removed during fetch operations
- **Used By:** Fetch concurrency control

### 8. Data Loss Prevention (useRef)

#### `isSavingRef` (boolean)
- **Purpose:** Flag to prevent snapshot overwrites during saves
- **Updates:** Set before save, cleared after
- **Used By:** `onSnapshot` callback

#### `lastSaveTimeRef` (number)
- **Purpose:** Timestamp of last save
- **Updates:** Updated after successful save
- **Used By:** Data loss prevention checks

#### `lastLocalChangeTimeRef` (number)
- **Purpose:** Timestamp of last local change
- **Updates:** Updated on state changes
- **Used By:** `wouldLoseData` checks

#### `latestPlaylistsRef` (object)
- **Purpose:** Latest playlists state for staged saves
- **Updates:** Updated on playlists changes
- **Used By:** `performStagedSave()`

#### `latestPlaylistTabsRef` (object)
- **Purpose:** Latest tabs state for staged saves
- **Updates:** Updated on tabs changes
- **Used By:** `performStagedSave()`

## State Update Patterns

> **See [PATTERNS.md#4-functional-state-updates](./PATTERNS.md#4-functional-state-updates) for detailed examples**

### 1. Functional Updates
Always use functional updates for state that depends on previous state:
```javascript
setPlaylists(prev => prev.map(p => {
  if (p.id !== playlistId) return p;
  return { ...p, videos: newVideos };
}));
```

### 2. Debounced Saves

> **See [PATTERNS.md#1-debounced-save-pattern](./PATTERNS.md#1-debounced-save-pattern) for complete pattern**

All Firestore saves are debounced:
```javascript
useEffect(() => {
  if (timer.current) clearTimeout(timer.current);
  timer.current = setTimeout(() => {
    performSave();
  }, 2000);
}, [dependencies]);
```

### 3. Ref Updates

> **See [PATTERNS.md#2-session-specific-data-in-refs](./PATTERNS.md#2-session-specific-data-in-refs) for ref patterns**

Refs are updated directly (no setter):
```javascript
playlistShuffleOrders.current[playlistId] = newOrder;
```

### 4. Batch Updates
Multiple state updates can be batched:
```javascript
setPlaylists(newPlaylists);
setPlaylistTabs(newTabs);
// Both trigger single re-render
```

## State Dependencies

### Critical Dependencies
- `playlists` → Used by almost everything
- `currentPlaylistIndex` → Used by video player
- `currentVideoIndex` → Used by video player
- `showSideMenu` → Controls layout

### Effect Dependencies
- Save effects depend on `playlists`, `playlistTabs`
- Fetch effects depend on `playlists`
- Player effects depend on `currentVideoId`

## Common State Bugs

> **See [GOTCHAS.md#4-stale-closures-in-useeffect](./GOTCHAS.md#4-stale-closures-in-useeffect) for detailed solutions**

### 1. Stale Closures
**Problem:** useEffect captures old state
**Solution:** Use functional updates or refs

### 2. Race Conditions
**Problem:** Multiple updates conflict
**Solution:** Use `isSavingRef` and `wouldLoseData` checks

### 3. Missing Dependencies
**Problem:** Effect doesn't run when it should
**Solution:** Include all dependencies in dependency array

### 4. Infinite Loops
**Problem:** Effect updates state that triggers effect
**Solution:** Add conditions to prevent unnecessary updates

## Best Practices

1. **Use useState for UI and persistent data**
2. **Use useRef for session-specific data**
3. **Always use functional updates for dependent state**
4. **Debounce all Firestore saves**
5. **Track state in refs for staged saves**
6. **Prevent data loss with `wouldLoseData` checks**
7. **Use `isSavingRef` to prevent snapshot overwrites**

---

**Note:** This guide covers all state variables in the application. When adding new state, follow these patterns and document it here.

## Related Documentation

- **[MASTER-CONTEXT.md#22-state-management](./MASTER-CONTEXT.md#22-state-management)** - State overview in master context
- **[CODE-STRUCTURE.md#section-2-component-definition--state-lines-296-600](./CODE-STRUCTURE.md#section-2-component-definition--state-lines-296-600)** - Where state is declared
- **[PATTERNS.md#4-functional-state-updates](./PATTERNS.md#4-functional-state-updates)** - State update patterns
- **[DATA-FLOW.md](./DATA-FLOW.md)** - How state flows through the system
- **[GOTCHAS.md#4-stale-closures-in-useeffect](./GOTCHAS.md#4-stale-closures-in-useeffect)** - Common state bugs
