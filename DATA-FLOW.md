# Data Flow Documentation
**Last Updated:** 2025-01-06  
**Version:** 1.0  
**Document Type:** Flow Diagrams

> **🤖 AI Agent Note:** Use this to understand HOW data moves through the system. Each flow includes step-by-step diagrams and links to implementation code. Essential for debugging and adding features.

How data flows through the application: from Firestore to UI, from user actions to saves, and everything in between.

> **Related Documentation:**
> - [MASTER-CONTEXT.md](./MASTER-CONTEXT.md) - Project overview and architecture
> - [CODE-STRUCTURE.md](./CODE-STRUCTURE.md) - Functions that implement these flows
> - [PATTERNS.md](./PATTERNS.md) - Patterns used in these flows
> - [STATE-MANAGEMENT.md](./STATE-MANAGEMENT.md) - State variables involved in flows
> - [GOTCHAS.md](./GOTCHAS.md) - What can go wrong in these flows

## Overview

> **🤖 AI Agent Note:** Understanding data flow is essential for debugging and adding features. Each flow section includes step-by-step diagrams and links to implementation code.

The application follows a **local-first architecture** with Firestore for persistence:
1. **Load:** Firestore → onSnapshot → State → UI
2. **Save:** User Action → State Update → Debounced Save → Firestore
3. **Sync:** Real-time Firestore updates → Snapshot Listener → Merge with Local State

> **Key Concept:** Local state takes precedence during saves. See [PATTERNS.md#3-data-loss-prevention-pattern](./PATTERNS.md#3-data-loss-prevention-pattern) for how this works.

## 1. Initial Load Flow

```
Page Load
  ↓
Firebase Initialization
  ↓
Anonymous Authentication
  ↓
Get/Generate User ID
  ↓
onSnapshot Listener (Firestore)
  ↓
Load User Document
  ├─ playlists (video IDs only)
  ├─ playlistTabs
  └─ videoProgress
  ↓
Expand Video IDs to Objects
  ├─ Check videoMetadata cache
  ├─ Fetch missing titles from API
  └─ Update playlists state
  ↓
Load Watch History
  ↓
Resume from Last Watched Video
  ↓
UI Renders
```

### Key Steps:

1. **Firebase Setup:** Initialize app, get Firestore instance
2. **Authentication:** Anonymous sign-in, get/create user ID
3. **Snapshot Listener:** Subscribe to user document changes
4. **Data Expansion:** Convert video IDs to objects, fetch titles
5. **History Load:** Load watch history from subcollection
6. **Resume:** Find last watched video and play it

## 2. Save Flow (User Action → Firestore)

> **Related:** [PATTERNS.md#1-debounced-save-pattern](./PATTERNS.md#1-debounced-save-pattern) - Debounce pattern
> **Related:** [PATTERNS.md#5-staged-save-pattern](./PATTERNS.md#5-staged-save-pattern) - Staged save pattern
> **Related:** [CODE-STRUCTURE.md#save-functions](./CODE-STRUCTURE.md#save-functions) - Implementation
> **Related:** [GOTCHAS.md#4-stale-closures-in-useeffect](./GOTCHAS.md#4-stale-closures-in-useeffect) - Common bug

```
User Action (e.g., assign video to colored folder)
  ↓
State Update (setPlaylists with functional update)
  ↓
Update Latest Refs (latestPlaylistsRef.current = playlists)
  ↓
Debounce Timer Starts (2 seconds)
  ↓
[If another change within 2 seconds, timer resets]
  ↓
Timer Expires
  ↓
performStagedSave()
  ├─ Get latest state from refs
  ├─ Optimize to IDs only
  ├─ Fix orphaned video IDs
  ├─ Set isSavingRef = true
  ├─ updateDoc to Firestore
  └─ Set isSavingRef = false
  ↓
Firestore Updates
  ↓
onSnapshot Triggered (but skipped due to isSavingRef)
```

### Key Points:

- **Debouncing:** All saves wait 2 seconds for quiet period
- **Staged Saves:** Use refs to get latest state (not closure values)
- **Optimization:** Convert video objects to IDs before saving
- **Data Loss Prevention:** Fix orphaned IDs before saving
- **Lock During Save:** `isSavingRef` prevents snapshot processing

## 3. Snapshot Flow (Firestore → State)

> **Related:** [PATTERNS.md#3-data-loss-prevention-pattern](./PATTERNS.md#3-data-loss-prevention-pattern) - Prevention pattern
> **Related:** [PATTERNS.md#10-local-playlist-preservation-pattern](./PATTERNS.md#10-local-playlist-preservation-pattern) - Local preservation
> **Related:** [GOTCHAS.md#2-snapshot-race-conditions](./GOTCHAS.md#2-snapshot-race-conditions) - Race conditions
> **Related:** [CODE-STRUCTURE.md#onsnapshot-listener-lines-1100-1600](./CODE-STRUCTURE.md#onsnapshot-listener-lines-1100-1600) - Implementation

```
Firestore Document Changes
  ↓
onSnapshot Callback Triggered
  ↓
Check isSavingRef
  ├─ If true: Skip (we're currently saving)
  └─ If false: Continue
  ↓
Load Snapshot Data
  ├─ playlists (video IDs)
  ├─ playlistTabs
  └─ videoProgress
  ↓
Normalize Data
  ├─ Remove duplicates
  ├─ Fix missing groups
  └─ Validate structure
  ↓
Check Would Lose Data
  ├─ Compare local vs snapshot group counts
  ├─ Check for locally added playlists
  └─ If would lose: Reject snapshot
  ↓
Preserve Local Playlists
  ├─ Identify locally added playlists
  └─ Merge into final playlists
  ↓
Expand Video IDs to Objects
  ├─ Create minimal objects { id, title: '', duration: 1 }
  └─ Check videoMetadata cache
  ↓
Fetch Missing Titles (Background)
  ├─ Check cache first
  ├─ Only fetch uncached
  ├─ Save to cache
  └─ Update playlists state
  ↓
Update State
  ├─ setPlaylists(finalPlaylists)
  ├─ setPlaylistTabs(snapshotTabs)
  └─ setVideoProgress(snapshotProgress)
  ↓
UI Updates
```

### Key Points:

- **Data Loss Prevention:** Always check `wouldLoseData` before applying
- **Local Preservation:** Preserve locally added playlists
- **Normalization:** Fix data structure issues
- **Background Fetching:** Titles fetched asynchronously
- **Cache First:** Check cache before API calls

## 4. Video Progress Flow

```
Video Playing
  ↓
Player onStateChange Event
  ├─ PLAYING: Set isPlaying = true
  └─ PAUSED: Set isPlaying = false, Save Progress
  ↓
Every 5 Seconds (while playing)
  ↓
getCurrentTime() from Player
  ↓
saveVideoProgress(videoId, time)
  ├─ Update videoProgress state
  ├─ Save to localStorage immediately
  └─ Trigger debounced Firestore save
  ↓
Debounce Timer (2 seconds)
  ↓
Save to Firestore
  ├─ updateDoc with videoProgress object
  └─ Granular update (only progress, not full document)
  ↓
On Video Load
  ├─ Check videoProgress for videoId
  ├─ If < 95% watched: Resume from progress
  └─ If >= 95%: Start from beginning
```

### Key Points:

- **Dual Storage:** localStorage (immediate) + Firestore (debounced)
- **Frequent Updates:** Every 5 seconds while playing
- **Granular Saves:** Only update videoProgress field
- **Resume Logic:** Only resume if < 95% watched

## 5. Title Fetching Flow

```
Playlist Loaded (video IDs only)
  ↓
onSnapshot Expands IDs to Objects
  ├─ Create { id, title: '', duration: 1 }
  └─ Identify videos needing titles
  ↓
Background Fetch (setTimeout, 1 second delay)
  ↓
Check videoMetadata Subcollection Cache
  ├─ Batch query (30 items per query)
  ├─ Load cached titles
  └─ Update playlists state immediately
  ↓
Identify Uncached Videos
  ├─ Filter out cached videos
  ├─ Filter out already fetched this session
  └─ Only fetch unique videos
  ↓
Fetch from YouTube API
  ├─ Batch requests (50 videos per request)
  ├─ Get titles from API response
  └─ Mark as fetched in session
  ↓
Save to Cache
  ├─ Batch write to videoMetadata (400 per batch)
  ├─ Store { title } in subcollection
  └─ Future loads will use cache
  ↓
Update Playlists State
  └─ setPlaylists with fetched titles
```

### Key Points:

- **Cache First:** Always check cache before API
- **Session Tracking:** Prevent duplicate fetches in same session
- **Background:** Non-blocking, doesn't delay UI
- **Batching:** Efficient API and Firestore usage
- **Persistence:** Cached for future loads

## 6. Bulk Add Flow

> **Related:** [PATTERNS.md#8-concurrent-fetch-control-pattern](./PATTERNS.md#8-concurrent-fetch-control-pattern) - Concurrency pattern
> **Related:** [GOTCHAS.md#6-concurrent-fetch-conflicts](./GOTCHAS.md#6-concurrent-fetch-conflicts) - Fetch conflicts
> **Related:** [CODE-STRUCTURE.md#data-fetching-functions](./CODE-STRUCTURE.md#data-fetching-functions) - Fetch implementation

```
User Clicks "Bulk Add"
  ↓
Opens Modal, Enters Playlist IDs
  ↓
handleBulkAddPlaylists()
  ├─ Parse playlist IDs
  ├─ Initialize progress tracking
  └─ Set isBulkAdding = true
  ↓
For Each Playlist ID:
  ├─ Add to playlists state (empty, pending)
  ├─ Mark as "pending" in progress
  └─ Queue fetchAllVideos()
  ↓
Concurrent Fetching (up to 3 at once)
  ├─ fetchAllVideos() for each playlist
  ├─ Update progress as fetching
  └─ Update progress when complete
  ↓
fetchAllVideos() for Each Playlist
  ├─ Fetch from YouTube API
  ├─ Check videoMetadata cache
  ├─ Fetch uncached videos
  ├─ Update playlists state with videos
  └─ Mark as "complete" in progress
  ↓
Progress Updates
  ├─ Update bulkAddProgress state
  ├─ Persist to sessionStorage
  └─ UI shows progress
  ↓
All Playlists Complete
  ├─ Set isBulkAdding = false
  └─ Clear sessionStorage
```

### Key Points:

- **Concurrent:** Up to 3 playlists fetch simultaneously
- **Progress Tracking:** Real-time updates to UI
- **Persistence:** Progress saved to sessionStorage
- **State Updates:** Playlists update as videos are fetched

## 7. Merge Flow

> **Related:** [GOTCHAS.md#3-orphaned-video-ids-in-groups](./GOTCHAS.md#3-orphaned-video-ids-in-groups) - Orphaned IDs from merges
> **Related:** [PATTERNS.md#7-orphaned-id-fix-pattern](./PATTERNS.md#7-orphaned-id-fix-pattern) - Fix pattern
> **Related:** [CODE-STRUCTURE.md#merge-functions](./CODE-STRUCTURE.md#merge-functions) - Merge implementation

```
User Initiates Merge
  ├─ mergeColoredFolderToPlaylist()
  └─ mergePlaylistToPlaylist()
  ↓
Identify Source Videos
  ├─ Get videos from source (colored folder or playlist)
  └─ Get video objects (not just IDs)
  ↓
Add Videos to Target
  ├─ Add to target playlist videos array
  ├─ Add to target colored folder (if merging folder)
  └─ Remove duplicates
  ↓
Update State
  ├─ setPlaylists with merged data
  └─ Functional update to preserve other playlists
  ↓
Debounced Save
  ├─ Wait 2 seconds
  └─ Save to Firestore
  ↓
Verify No Orphaned IDs
  ├─ Check all group video IDs exist in videos array
  └─ Fix any orphaned IDs before saving
```

### Key Points:

- **Video Objects:** Must add video objects to array, not just IDs
- **No Orphans:** Ensure group IDs have corresponding video objects
- **State Update:** Use functional updates
- **Verification:** Check for orphaned IDs before save

## 8. Filter Change Flow

```
User Changes Filter (e.g., clicks "Red" folder)
  ↓
setVideoFilterSafe('red')
  ├─ setVideoFilter('red')
  └─ Update activeShuffleOrder if needed
  ↓
getSideMenuVideos() Recalculates
  ├─ Filter videos by color
  ├─ Get chronological order
  └─ Return filtered video list
  ↓
UI Updates
  ├─ Video grid shows filtered videos
  └─ Filter button highlights
  ↓
If User Clicks Video in Filtered View
  ├─ selectVideoFromMenu()
  ├─ Sets chronologicalFilter to match videoFilter
  └─ Updates activeShuffleOrder to filtered order
  ↓
Main Player Updates
  ├─ Only plays videos from filtered folder
  └─ Chronological order (not shuffled)
```

### Key Points:

- **Two Filters:** `videoFilter` (side menu) vs `chronologicalFilter` (main player)
- **Order Generation:** Chronological for folders, shuffle for "all"
- **State Sync:** Filters can be synced or independent

## 9. Shuffle Order Flow

```
Playlist Loaded with Videos
  ↓
useEffect Detects New Videos
  ↓
Generate Shuffle Orders
  ├─ For 'all' filter: Shuffled order
  ├─ For each colored folder: Chronological order
  └─ Store in playlistShuffleOrders.current
  ↓
User Plays Video
  ├─ Get shuffle order for current filter
  ├─ Set activeShuffleOrder
  └─ Set currentShufflePosition
  ↓
User Clicks "Shuffle" Button
  ├─ startNewShuffle()
  ├─ Regenerate shuffle order
  └─ Update activeShuffleOrder if in 'all' view
  ↓
Navigation
  ├─ goToNextVideo(): Increment position
  └─ goToPreviousVideo(): Decrement position
```

### Key Points:

- **Session-Specific:** Shuffle orders not saved to Firestore
- **Per Filter:** Separate orders for each filter
- **Regeneration:** Can regenerate shuffle order
- **Position Memory:** Remember position per playlist per filter

## 10. Data Loss Prevention Flow

> **Related:** [PATTERNS.md#3-data-loss-prevention-pattern](./PATTERNS.md#3-data-loss-prevention-pattern) - Prevention pattern
> **Related:** [GOTCHAS.md#2-snapshot-race-conditions](./GOTCHAS.md#2-snapshot-race-conditions) - What this prevents
> **Related:** [CODE-STRUCTURE.md#onsnapshot-listener-lines-1100-1600](./CODE-STRUCTURE.md#onsnapshot-listener-lines-1100-1600) - Implementation

```
Local Change Made (e.g., merge videos)
  ↓
State Updated
  ├─ setPlaylists(newPlaylists)
  └─ lastLocalChangeTimeRef.current = Date.now()
  ↓
Debounce Timer Starts
  ↓
Firestore Snapshot Arrives (before save completes)
  ↓
onSnapshot Callback
  ├─ Check isSavingRef (false, not saving yet)
  ├─ Check wouldLoseData()
  │   ├─ Compare local vs snapshot group counts
  │   ├─ Check for locally added playlists
  │   └─ If local > snapshot: wouldLoseData = true
  └─ If wouldLoseData: Reject snapshot
  ↓
Save Completes
  ├─ Set isSavingRef = true
  ├─ Save to Firestore
  └─ Set isSavingRef = false
  ↓
Next Snapshot
  ├─ Check isSavingRef (false, save complete)
  ├─ Check wouldLoseData (false, data matches)
  └─ Apply snapshot
```

### Key Points:

- **Timing Checks:** Compare local vs snapshot data
- **Count Comparison:** Local group counts vs snapshot counts
- **Playlist Preservation:** Preserve locally added playlists
- **Save Lock:** `isSavingRef` prevents snapshot during save

## Data Flow Diagrams

### Save Flow (Simplified)
```
User Action → State → Ref Update → Debounce → Save → Firestore
```

### Load Flow (Simplified)
```
Firestore → Snapshot → Normalize → Expand IDs → Cache Check → API (if needed) → State → UI
```

### Sync Flow (Simplified)
```
Local Change → State → [Debounce] → Save → Firestore → Snapshot → Merge → State
```

## Key Data Structures

### Playlist Object (In State)
```javascript
{
  id: string,
  name: string,
  videos: [{ id, title, duration }], // Full objects in state
  groups: {
    red: { name: string, videos: [videoIds] },
    // ...
  }
}
```

### Playlist Object (In Firestore)
```javascript
{
  id: string,
  name: string,
  videos: [string], // IDs only (optimized)
  groups: {
    red: { name: string, videos: [videoIds] },
    // ...
  }
}
```

### Video Metadata (In Subcollection)
```javascript
{
  duration: number,
  publishedYear: string,
  author: string,
  viewCount: string,
  channelId: string,
  title: string
}
```

## Critical Paths

1. **Initial Load:** Must complete before user interaction
2. **Save Operations:** Must prevent data loss
3. **Snapshot Processing:** Must merge correctly with local state
4. **Title Fetching:** Must not block UI
5. **Bulk Operations:** Must handle concurrency correctly

---

**Remember:** Understanding data flow is crucial for debugging and adding new features. Always trace data from source to destination.

## Related Documentation

- **[MASTER-CONTEXT.md](./MASTER-CONTEXT.md)** - Project overview and architecture
- **[CODE-STRUCTURE.md](./CODE-STRUCTURE.md)** - Functions that implement these flows
- **[PATTERNS.md](./PATTERNS.md)** - Patterns used in these flows
- **[STATE-MANAGEMENT.md](./STATE-MANAGEMENT.md)** - State variables involved in flows
- **[GOTCHAS.md](./GOTCHAS.md)** - What can go wrong in these flows
