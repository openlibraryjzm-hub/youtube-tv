# Code Patterns & Idioms
**Last Updated:** 2025-01-06  
**Version:** 1.0  
**Document Type:** Pattern Reference

> **🤖 AI Agent Note:** These patterns are MANDATORY to follow. Deviating from these patterns will likely cause bugs documented in GOTCHAS.md. Each pattern includes code examples and related documentation links.

Recurring code patterns used throughout the project. Follow these patterns when adding new features or modifying existing code.

> **Related Documentation:**
> - [MASTER-CONTEXT.md](./MASTER-CONTEXT.md) - Project overview and architecture
> - [CODE-STRUCTURE.md](./CODE-STRUCTURE.md) - Where these patterns are used in code
> - [DATA-FLOW.md](./DATA-FLOW.md) - How these patterns fit into data flow
> - [GOTCHAS.md](./GOTCHAS.md) - What happens when patterns aren't followed
> - [STATE-MANAGEMENT.md](./STATE-MANAGEMENT.md) - State patterns and update strategies

## 1. Debounced Save Pattern

> **🤖 AI Agent Note:** This is a CRITICAL pattern. All Firestore saves MUST use this pattern. Violating this will cause excessive writes and potential rate limiting.
>
> **Related:** [DATA-FLOW.md#2-save-flow-user-action--firestore](./DATA-FLOW.md#2-save-flow-user-action--firestore) - Save flow diagram
> **Related:** [CODE-STRUCTURE.md#save-functions](./CODE-STRUCTURE.md#save-functions) - Where this is implemented
> **Related:** [STATE-MANAGEMENT.md#2-debounced-saves](./STATE-MANAGEMENT.md#2-debounced-saves) - State update pattern
> **Related:** [GOTCHAS.md#4-stale-closures-in-useeffect](./GOTCHAS.md#4-stale-closures-in-useeffect) - Common bug if not followed

**Purpose:** Prevent excessive Firestore writes by accumulating changes and saving after a quiet period.

**Pattern:**
```javascript
useEffect(() => {
  if (!userId || !initialVideoLoaded.current || !isFirebaseInitialized) {
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

**Used In:**
- Main data saves (playlists, tabs)
- Video progress saves

## 2. Session-Specific Data in Refs

> **Related:** [STATE-MANAGEMENT.md#6-session-specific-state-useref](./STATE-MANAGEMENT.md#6-session-specific-state-useref) - Complete ref documentation
> **Related:** [MASTER-CONTEXT.md#132-separation-of-concerns-persistent-data-firestore-vs-session-specific-data-react-refs](./MASTER-CONTEXT.md#13-key-design-principles) - Design principle

**Purpose:** Store data that should reset each session (not saved to Firestore).

**Pattern:**
```javascript
// Declare ref
const playlistShuffleOrders = useRef({});

// Update directly (no setter)
playlistShuffleOrders.current[playlistId] = {
  all: generateNewShuffleOrder(playlist, 'all'),
  red: generateNewShuffleOrder(playlist, 'red'),
  // ...
};

// Read value
const currentOrder = playlistShuffleOrders.current[playlistId]?.[filter];
```

**Key Points:**
- Use `useRef` for session data
- Update with `.current` directly
- Never save to Firestore
- Reset on page load (automatic with refs)

**Used For:**
- Shuffle orders
- Playback positions
- Fetch tracking
- Title fetching cache

## 3. Data Loss Prevention Pattern

> **Related:** [DATA-FLOW.md#10-data-loss-prevention-flow](./DATA-FLOW.md#10-data-loss-prevention-flow) - Prevention flow diagram
> **Related:** [GOTCHAS.md#2-snapshot-race-conditions](./GOTCHAS.md#2-snapshot-race-conditions) - What this prevents
> **Related:** [CODE-STRUCTURE.md#onsnapshot-listener-lines-1100-1600](./CODE-STRUCTURE.md#onsnapshot-listener-lines-1100-1600) - Implementation location

**Purpose:** Prevent incoming Firestore snapshots from overwriting newer local changes.

**Pattern:**
```javascript
// In onSnapshot callback
if (isSavingRef.current) {
  console.log('⏸️ Snapshot received during save, skipping...');
  return;
}

// Check if we would lose data
let wouldLoseData = false;

// Check for locally added playlists
const localPlaylistsNotInSnapshot = playlists.filter(localPlaylist => {
  if (snapshotPlaylistIds.has(localPlaylist.id)) return false;
  if (localPlaylist.id === '_unsorted_') return false;
  return !playlistsLoadedFromFirestore.current.has(localPlaylist.id);
});

if (localPlaylistsNotInSnapshot.length > 0) {
  wouldLoseData = true;
}

// Check for reduced group counts
finalPlaylists.forEach(snapshotPlaylist => {
  const localPlaylist = playlists.find(p => p.id === snapshotPlaylist.id);
  if (localPlaylist && localPlaylist.groups && snapshotPlaylist.groups) {
    Object.keys(allColorKeys).forEach(color => {
      const localCount = localPlaylist.groups[color]?.videos?.length || 0;
      const snapshotCount = snapshotPlaylist.groups[color]?.videos?.length || 0;
      if (localCount > snapshotCount) {
        wouldLoseData = true;
      }
    });
  }
});

if (wouldLoseData) {
  console.log('⚠️ Would lose data, rejecting snapshot');
  return;
}
```

**Key Points:**
- Always check `isSavingRef` first
- Compare local vs snapshot data
- Preserve locally added playlists
- Preserve larger group counts
- Log warnings for debugging

**Used In:**
- `onSnapshot` callback
- Before applying snapshot updates

## 4. Functional State Updates

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

**Used In:**
- All state updates that depend on previous state
- Array/object mutations

## 5. Staged Save Pattern

**Purpose:** Accumulate changes and save final state after all rapid updates.

**Pattern:**
```javascript
// Update refs on state changes
useEffect(() => {
  latestPlaylistsRef.current = playlists;
  latestPlaylistTabsRef.current = playlistTabs;
}, [playlists, playlistTabs]);

// In save function, use ref values
const performStagedSave = () => {
  const playlistsToSave = latestPlaylistsRef.current || playlists;
  const tabsToSave = latestPlaylistTabsRef.current || playlistTabs;
  
  // Save to Firestore...
};
```

**Key Points:**
- Keep refs in sync with state
- Use refs in save function (not closure values)
- Fallback to state if ref is null
- Ensures latest state is saved

**Used In:**
- `performStagedSave()`
- Main data persistence

## 6. Cache-First API Pattern

> **Related:** [DATA-FLOW.md#5-title-fetching-flow](./DATA-FLOW.md#5-title-fetching-flow) - Title fetching flow
> **Related:** [GOTCHAS.md#5-duplicate-api-calls](./GOTCHAS.md#5-duplicate-api-calls) - What this prevents
> **Related:** [MASTER-CONTEXT.md#42-api-usage-optimization-current-challenge](./MASTER-CONTEXT.md#42-api-usage-optimization-current-challenge) - Current challenge

**Purpose:** Check cache before making API calls to reduce quota usage.

**Pattern:**
```javascript
// Check cache first
const metadataCacheRef = collection(db, 'users', userId, 'videoMetadata');
const cachedTitles = {};

// Batch check (30 items per query limit)
for (let i = 0; i < videoIds.length; i += 30) {
  const batchIds = videoIds.slice(i, i + 30);
  const q = query(metadataCacheRef, where('__name__', 'in', batchIds));
  const querySnapshot = await getDocs(q);
  querySnapshot.forEach(doc => {
    const meta = doc.data();
    if (meta.title && meta.title.trim() !== '') {
      cachedTitles[doc.id] = meta.title;
    }
  });
}

// Only fetch uncached items
const idsToFetch = videoIds.filter(id => !cachedTitles[id]);

// Fetch from API
if (idsToFetch.length > 0) {
  // Make API call...
  // Save to cache
  const batch = writeBatch(db);
  Object.entries(titleMap).forEach(([videoId, title]) => {
    const metaRef = doc(db, 'users', userId, 'videoMetadata', videoId);
    batch.set(metaRef, { title }, { merge: true });
  });
  await batch.commit();
}
```

**Key Points:**
- Always check cache first
- Batch cache queries (30 item limit)
- Only fetch uncached items
- Save fetched data to cache
- Track fetched items in session

**Used In:**
- Title fetching
- Video metadata fetching
- Duration fetching

## 7. Orphaned ID Fix Pattern

> **Related:** [GOTCHAS.md#3-orphaned-video-ids-in-groups](./GOTCHAS.md#3-orphaned-video-ids-in-groups) - Orphaned ID problem
> **Related:** [CODE-STRUCTURE.md#save-functions](./CODE-STRUCTURE.md#save-functions) - Where this is implemented
> **Related:** [DATA-FLOW.md#7-merge-flow](./DATA-FLOW.md#7-merge-flow) - How merges can create orphaned IDs

**Purpose:** Fix video IDs in groups that don't have corresponding video objects.

**Pattern:**
```javascript
// Before saving, verify all group video IDs exist in videos array
const fixedPlaylists = playlistsToSave.map(p => {
  if (!p.groups || !p.videos) return p;
  
  const videoIdsInArray = new Set((p.videos || []).map(v => v?.id).filter(Boolean));
  let needsFix = false;
  const fixedGroups = { ...p.groups };
  
  Object.entries(p.groups).forEach(([color, group]) => {
    if (Array.isArray(group.videos)) {
      const orphanedIds = group.videos.filter(id => !videoIdsInArray.has(id));
      if (orphanedIds.length > 0) {
        console.error(`❌ CRITICAL: ${p.name} ${color} group has ${orphanedIds.length} orphaned video IDs!`);
        // Remove orphaned IDs
        fixedGroups[color] = {
          ...group,
          videos: group.videos.filter(id => videoIdsInArray.has(id))
        };
        needsFix = true;
      }
    }
  });
  
  if (needsFix) {
    return { ...p, groups: fixedGroups };
  }
  return p;
});
```

**Key Points:**
- Check before every save
- Log errors for debugging
- Remove orphaned IDs (can't restore without video objects)
- Prevents data loss on refresh

**Used In:**
- `performStagedSave()`
- Pre-save validation

## 8. Concurrent Fetch Control Pattern

> **Related:** [DATA-FLOW.md#6-bulk-add-flow](./DATA-FLOW.md#6-bulk-add-flow) - Bulk add flow
> **Related:** [GOTCHAS.md#6-concurrent-fetch-conflicts](./GOTCHAS.md#6-concurrent-fetch-conflicts) - Fetch conflicts
> **Related:** [CODE-STRUCTURE.md#data-fetching-functions](./CODE-STRUCTURE.md#data-fetching-functions) - Implementation

**Purpose:** Control concurrent API calls to respect rate limits.

**Pattern:**
```javascript
const fetchAllVideos = async (playlistId, playlistIndex) => {
  // Check for stale locks
  const now = Date.now();
  const STALE_LOCK_TIMEOUT = 5 * 60 * 1000; // 5 minutes
  if (fetchStartTimes.current.has(playlistId)) {
    const startTime = fetchStartTimes.current.get(playlistId);
    if (now - startTime > STALE_LOCK_TIMEOUT) {
      fetchingPlaylists.current.delete(playlistId);
      fetchStartTimes.current.delete(playlistId);
    }
  }
  
  // Prevent duplicate fetching
  if (fetchingPlaylists.current.has(playlistId)) {
    return Promise.resolve();
  }
  
  // Check concurrency limits
  const isBulkAdd = bulkAddProgress.total > 0;
  const currentFetchingCount = fetchingPlaylists.current.size;
  const maxConcurrentFetches = isBulkAdd ? 3 : 1;
  
  if (!isBulkAdd && isFetchingAnyPlaylist.current) {
    return Promise.resolve();
  }
  
  if (isBulkAdd && currentFetchingCount >= maxConcurrentFetches) {
    return Promise.resolve();
  }
  
  // Set locks
  if (!isBulkAdd) {
    isFetchingAnyPlaylist.current = true;
  }
  fetchingPlaylists.current.add(playlistId);
  fetchStartTimes.current.set(playlistId, now);
  
  try {
    // Fetch logic...
  } finally {
    // Clear locks
    fetchingPlaylists.current.delete(playlistId);
    fetchStartTimes.current.delete(playlistId);
    if (fetchingPlaylists.current.size === 0) {
      isFetchingAnyPlaylist.current = false;
    }
  }
};
```

**Key Points:**
- Check for stale locks (timeout)
- Prevent duplicate fetches
- Respect concurrency limits
- Set locks before fetching
- Clear locks in finally block
- Different limits for bulk vs normal operations

**Used In:**
- `fetchAllVideos()`
- Playlist fetching

## 9. Video ID Optimization Pattern

> **Related:** [GOTCHAS.md#1-firestore-document-size-limit-1mb](./GOTCHAS.md#1-firestore-document-size-limit-1mb) - Document size limit
> **Related:** [MASTER-CONTEXT.md#41-firestore-document-size-optimization-critical](./MASTER-CONTEXT.md#41-firestore-document-size-optimization-critical) - Optimization details
> **Related:** [DATA-FLOW.md#3-snapshot-flow-firestore--state](./DATA-FLOW.md#3-snapshot-flow-firestore--state) - ID expansion flow

**Purpose:** Save only video IDs to reduce Firestore document size.

**Pattern:**
```javascript
// When saving: Convert to IDs only
const optimizedPlaylists = playlists.map(playlist => {
  const optimizedVideos = (playlist.videos || []).map(video => {
    if (typeof video === 'string') return video;
    const videoId = video.id || video;
    return typeof videoId === 'string' ? videoId : String(videoId);
  });
  return { ...playlist, videos: optimizedVideos };
});

// When loading: Expand IDs to objects
const expandedVideos = playlist.videos.map(v => {
  let videoId, existingTitle, existingDuration;
  if (typeof v === 'string') {
    videoId = v;
    existingTitle = '';
    existingDuration = 1;
  } else if (v && typeof v === 'object') {
    videoId = v.id || v;
    existingTitle = v.title || '';
    existingDuration = v.duration || 1;
  } else {
    videoId = v;
    existingTitle = '';
    existingDuration = 1;
  }
  return { id: videoId, title: existingTitle, duration: existingDuration };
});
```

**Key Points:**
- Save: Convert objects to IDs (strings)
- Load: Expand IDs to minimal objects
- Fetch titles in background
- Handle both string and object formats
- Preserve existing titles if present

**Used In:**
- `performStagedSave()` (saving)
- `onSnapshot` callback (loading)

## 10. Local Playlist Preservation Pattern

> **Related:** [GOTCHAS.md#9-bulk-add-playlist-deletion](./GOTCHAS.md#9-bulk-add-playlist-deletion) - What this prevents
> **Related:** [DATA-FLOW.md#3-snapshot-flow-firestore--state](./DATA-FLOW.md#3-snapshot-flow-firestore--state) - Snapshot flow
> **Related:** [CODE-STRUCTURE.md#onsnapshot-listener-lines-1100-1600](./CODE-STRUCTURE.md#onsnapshot-listener-lines-1100-1600) - Implementation

**Purpose:** Preserve locally added playlists not yet in Firestore snapshot.

**Pattern:**
```javascript
// Identify locally added playlists
const snapshotPlaylistIds = new Set(snapshotPlaylists.map(p => p.id));
const localPlaylistsNotInSnapshot = playlists.filter(localPlaylist => {
  // Skip if in snapshot
  if (snapshotPlaylistIds.has(localPlaylist.id)) return false;
  // Skip _unsorted_
  if (localPlaylist.id === '_unsorted_') return false;
  // Only preserve if not loaded from Firestore (genuinely new)
  return !playlistsLoadedFromFirestore.current.has(localPlaylist.id);
});

// Merge preserved playlists
if (localPlaylistsNotInSnapshot.length > 0) {
  console.log(`🔒 Preserving ${localPlaylistsNotInSnapshot.length} locally added playlist(s)`);
  finalPlaylists = [...finalPlaylists, ...localPlaylistsNotInSnapshot];
}
```

**Key Points:**
- Check if playlist exists in snapshot
- Only preserve genuinely new playlists
- Track loaded playlists in ref
- Merge into final playlists array
- Log for debugging

**Used In:**
- `onSnapshot` callback
- Bulk add persistence

## 11. Batch Firestore Operations Pattern

**Purpose:** Batch multiple Firestore operations efficiently.

**Pattern:**
```javascript
// Process in batches (400 operations per batch, 500 is limit)
const FIRESTORE_BATCH_SIZE = 400;
const titleEntries = Object.entries(titleMap);

for (let i = 0; i < titleEntries.length; i += FIRESTORE_BATCH_SIZE) {
  const batch = writeBatch(db);
  const batchEntries = titleEntries.slice(i, i + FIRESTORE_BATCH_SIZE);
  
  batchEntries.forEach(([videoId, title]) => {
    const metaRef = doc(db, 'users', userId, 'videoMetadata', videoId);
    batch.set(metaRef, { title }, { merge: true });
  });
  
  await batch.commit();
}
```

**Key Points:**
- Use 400 operations per batch (500 is limit)
- Create new batch for each chunk
- Commit each batch
- Handle errors per batch

**Used In:**
- Title caching
- Video metadata caching
- Bulk operations

## 12. Session Storage Persistence Pattern

**Purpose:** Persist temporary state across page refreshes.

**Pattern:**
```javascript
// Restore on mount
const [bulkAddProgress, setBulkAddProgress] = useState(() => {
  if (typeof window !== 'undefined') {
    const saved = sessionStorage.getItem('youtube-tv-bulk-add-progress');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
  }
  return defaultValue;
});

// Persist on changes
useEffect(() => {
  if (isBulkAdding && bulkAddProgress.total > 0 && typeof window !== 'undefined') {
    sessionStorage.setItem('youtube-tv-bulk-add-progress', JSON.stringify(bulkAddProgress));
  } else {
    // Clear when done
    sessionStorage.removeItem('youtube-tv-bulk-add-progress');
  }
}, [isBulkAdding, bulkAddProgress]);
```

**Key Points:**
- Restore in useState initializer
- Check `typeof window !== 'undefined'`
- Handle JSON parse errors
- Clear when no longer needed
- Use sessionStorage (not localStorage) for temporary data

**Used In:**
- Bulk add progress
- Temporary UI state

## 13. Error Handling Pattern

**Purpose:** Handle errors gracefully without breaking the app.

**Pattern:**
```javascript
try {
  // Operation that might fail
  const result = await someAsyncOperation();
  // Handle success
} catch (error) {
  console.error('❌ Error description:', error);
  // Log for debugging
  // Optionally show user-friendly message
  // Don't throw - handle gracefully
}
```

**Key Points:**
- Always wrap async operations in try/catch
- Log errors with context
- Use emoji prefixes for log visibility (❌, ⚠️, ✅)
- Don't break user experience
- Provide fallbacks when possible

**Used In:**
- All async operations
- API calls
- Firestore operations

## 14. Conditional Rendering Pattern

**Purpose:** Conditionally render UI based on state.

**Pattern:**
```javascript
{showSideMenu === 'playlists' && (
  <>
    {/* Playlists screen */}
  </>
)}

{showSideMenu === 'videos' && (
  <>
    {/* Video grid screen */}
  </>
)}

{showSideMenu === 'history' && (
  <>
    {/* History screen */}
  </>
)}
```

**Key Points:**
- Use strict equality (`===`)
- Use fragments (`<>`) for multiple elements
- Group related UI together
- Keep conditions simple

**Used In:**
- Side menu screens
- Modal rendering
- Conditional UI elements

## 15. Memoization Pattern

**Purpose:** Optimize expensive calculations.

**Pattern:**
```javascript
const topMenuPlaylists = useMemo(() => {
  if (activeTopMenuTab === 0) {
    return playlists.filter(p => p.id !== '_unsorted_');
  }
  const tab = playlistTabs[activeTopMenuTab];
  return playlists.filter(p => tab.playlistIds.includes(p.id));
}, [playlists, playlistTabs, activeTopMenuTab]);
```

**Key Points:**
- Use `useMemo` for expensive calculations
- Include all dependencies
- Return computed value
- Only recalculate when dependencies change

**Used In:**
- Filtered playlist lists
- Video lists
- Computed values

## 16. API Call Minimization Pattern (CRITICAL)

> **🤖 AI Agent Note:** This is a CRITICAL pattern. API calls cost quota and money. When in doubt, DON'T make API calls. Thumbnails, playback, and organization are more important than titles/metadata.

> **Related:** [MASTER-CONTEXT.md#13-api-optimization](./MASTER-CONTEXT.md#13-api-optimization) - API usage strategy
> **Related:** [GOTCHAS.md#11-excessive-api-usage](./GOTCHAS.md#11-excessive-api-usage) - What happens when this pattern isn't followed

**Purpose:** Minimize YouTube Data API calls to stay within quota limits and reduce costs.

**Core Principle:**
> **"If at a fork in the road, lean in the direction of NOT making API calls for titles and metadata. As long as thumbnails provide playback and videos are in the right playlists/colored folders, that's sufficient."**

**Key Facts:**
- **Thumbnails:** Use direct image URLs (`img.youtube.com`) - NO API quota usage ✅
- **Titles/Metadata:** Require YouTube Data API calls - COUNT against quota ❌
- **Playback:** Uses YouTube IFrame Player API - Different from Data API ✅

**Pattern Rules:**

1. **Cache-First Always:**
   - Check `videoMetadata` subcollection FIRST
   - Check session cache (`titlesFetchedThisSession`) SECOND
   - Only make API call if NOT in cache

2. **Use Free Data When Available:**
   - Titles from `playlistItems` API response (already paid for) ✅
   - Thumbnails from direct image URLs (free) ✅
   - Only fetch what's truly missing

3. **When to Skip API Calls:**
   - If title is missing but video has thumbnail → Skip API call
   - If metadata is missing but video plays → Skip API call
   - If user can still use the feature → Skip API call

4. **When API Calls Are Acceptable:**
   - Bulk add new playlists (user explicitly requested)
   - First-time video metadata (not in cache)
   - User explicitly searches (user action)

5. **Never Make API Calls For:**
   - Background title fetching if cache exists
   - Metadata that's "nice to have" but not essential
   - Redundant fetches (check cache first!)

**Code Example:**
```javascript
// ✅ GOOD: Cache-first, skip if not essential
const videosNeedingTitles = expandedVideos.filter(v => {
  // Skip if already has title
  if (v.title && v.title.trim() !== '') return false;
  // Skip if already fetched this session
  if (titlesFetchedThisSession.current.has(videoId)) return false;
  return true;
});

// Check cache FIRST
const cachedTitles = await checkVideoMetadataCache(videoIds);
const idsToFetch = videoIds.filter(id => !cachedTitles[id]);

// Only fetch if truly necessary AND not in cache
if (idsToFetch.length > 0) {
  // Make API call
}

// ❌ BAD: Fetching titles just because they're missing
if (!video.title) {
  fetchTitleFromAPI(video.id); // Don't do this!
}
```

**Current API Call Locations:**
1. **Background title fetching** (onSnapshot) - Only if not in cache ✅
2. **Bulk add** (fetchAllVideos) - User explicitly requested ✅
3. **Current video metadata** (fetchVideoMetadata) - Optional, could be skipped ⚠️
4. **Search** - User explicitly requested ✅

**Future Optimization Opportunities:**
- Make `fetchVideoMetadata` optional (skip if not in cache)
- Skip background title fetching entirely if cache is good
- Only fetch metadata during bulk add (user action)

**Related Patterns:**
- [Pattern 8: Cache-First API Pattern](#8-cache-first-api-pattern) - How to implement caching
- [Pattern 2: Session-Specific Data in Refs](#2-session-specific-data-in-refs) - Session caching

---

**Remember:** When adding new code, follow these patterns for consistency and reliability.

## Related Documentation

- **[MASTER-CONTEXT.md](./MASTER-CONTEXT.md)** - Project overview and architecture
- **[CODE-STRUCTURE.md](./CODE-STRUCTURE.md)** - Where these patterns are used in code
- **[DATA-FLOW.md](./DATA-FLOW.md)** - How these patterns fit into data flow
- **[GOTCHAS.md](./GOTCHAS.md)** - What happens when patterns aren't followed
- **[STATE-MANAGEMENT.md](./STATE-MANAGEMENT.md)** - State patterns and update strategies
