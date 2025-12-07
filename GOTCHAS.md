# Gotchas & Common Pitfalls
**Last Updated:** 2025-01-06  
**Version:** 1.0  
**Document Type:** Problem Reference

> **🤖 AI Agent Note:** Read this BEFORE making changes. These are real problems that have occurred. Each gotcha links to prevention patterns in PATTERNS.md. Status indicators: ✅ = Resolved, ⚠️ = Known Issue, 🚨 = Critical.

Things that break easily, edge cases to watch for, and common mistakes to avoid.

> **Related Documentation:**
> - [PATTERNS.md](./PATTERNS.md) - Patterns that prevent these gotchas
> - [DATA-FLOW.md](./DATA-FLOW.md) - Understanding data flow helps avoid these issues
> - [STATE-MANAGEMENT.md](./STATE-MANAGEMENT.md) - State-related gotchas
> - [CODE-STRUCTURE.md](./CODE-STRUCTURE.md) - Code locations for these issues
> - [MASTER-CONTEXT.md](./MASTER-CONTEXT.md) - Context for why these are problems

## Critical Gotchas

### 1. Firestore Document Size Limit (1MB) ⚠️ CRITICAL

> **🤖 AI Agent Note:** This is a HARD LIMIT. Exceeding it will cause save failures. Always check document size before saving large playlists.
>
> **Related:** [PATTERNS.md#9-video-id-optimization-pattern](./PATTERNS.md#9-video-id-optimization-pattern) - Solution pattern
> **Related:** [MASTER-CONTEXT.md#41-firestore-document-size-optimization-critical](./MASTER-CONTEXT.md#41-firestore-document-size-optimization-critical) - Optimization details
> **Related:** [DATA-FLOW.md#2-save-flow-user-action--firestore](./DATA-FLOW.md#2-save-flow-user-action--firestore) - Save flow

**Problem:** Firestore documents have a 1MB (1,048,576 bytes) limit per document.

**Symptoms:**
- Save failures with error: `Document '...' cannot be written because its size exceeds the maximum allowed size`
- Document size around 1,100KB

**Solution:**
- Store only video IDs (strings) in main document
- Use `videoMetadata` subcollection for detailed data
- Monitor document size as playlists grow

**Prevention:**
- Always optimize data before saving
- Check document size in console logs
- Use subcollections for large data

**Code Location:**
- `performStagedSave()` - Optimizes to IDs only
- `onSnapshot` - Expands IDs to objects on load

---

### 2. Snapshot Race Conditions

> **Related:** [PATTERNS.md#3-data-loss-prevention-pattern](./PATTERNS.md#3-data-loss-prevention-pattern) - Prevention pattern
> **Related:** [DATA-FLOW.md#10-data-loss-prevention-flow](./DATA-FLOW.md#10-data-loss-prevention-flow) - Prevention flow
> **Related:** [CODE-STRUCTURE.md#onsnapshot-listener-lines-1100-1600](./CODE-STRUCTURE.md#onsnapshot-listener-lines-1100-1600) - Implementation

**Problem:** Incoming Firestore snapshots can overwrite newer local changes.

**Symptoms:**
- Changes disappear after refresh
- Merged videos get removed
- Bulk added playlists disappear

**Solution:**
- Always check `isSavingRef` before processing snapshots
- Use `wouldLoseData` checks to compare local vs snapshot
- Preserve locally added playlists not in snapshot
- Set `isSavingRef` before saves, clear after

**Prevention:**
```javascript
// Always check before processing snapshot
if (isSavingRef.current) {
  return; // Skip snapshot during save
}

// Check if we would lose data
if (wouldLoseData) {
  return; // Reject snapshot
}
```

**Code Location:**
- `onSnapshot` callback (lines ~1100-1600)

---

### 3. Orphaned Video IDs in Groups

> **Related:** [PATTERNS.md#7-orphaned-id-fix-pattern](./PATTERNS.md#7-orphaned-id-fix-pattern) - Fix pattern
> **Related:** [DATA-FLOW.md#7-merge-flow](./DATA-FLOW.md#7-merge-flow) - How merges create orphaned IDs
> **Related:** [CODE-STRUCTURE.md#save-functions](./CODE-STRUCTURE.md#save-functions) - Where fix is implemented

**Problem:** Video IDs in colored folder groups don't have corresponding video objects in videos array.

**Symptoms:**
- Videos disappear from colored folders on refresh
- Console errors: "orphaned video IDs"
- Data loss on save

**Solution:**
- Always verify group video IDs exist in videos array before saving
- Remove orphaned IDs (can't restore without video objects)
- Fix merge functions to add videos to array AND groups

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

**Code Location:**
- `performStagedSave()` - Pre-save validation

---

### 4. Stale Closures in useEffect

> **Related:** [PATTERNS.md#4-functional-state-updates](./PATTERNS.md#4-functional-state-updates) - Solution pattern
> **Related:** [PATTERNS.md#5-staged-save-pattern](./PATTERNS.md#5-staged-save-pattern) - Using refs for latest values
> **Related:** [STATE-MANAGEMENT.md#state-update-patterns](./STATE-MANAGEMENT.md#state-update-patterns) - Update patterns

**Problem:** useEffect captures old state values, causing stale data.

**Symptoms:**
- State updates don't reflect latest values
- Saves use old data
- Functions use outdated state

**Solution:**
- Use functional updates: `setState(prev => ...)`
- Use refs for latest values: `latestPlaylistsRef.current`
- Include all dependencies in dependency array

**Prevention:**
```javascript
// ❌ Wrong: Uses closure value
useEffect(() => {
  saveToFirestore(playlists); // Uses old playlists
}, [playlists]);

// ✅ Correct: Uses ref
useEffect(() => {
  latestPlaylistsRef.current = playlists;
}, [playlists]);

const performSave = () => {
  const playlistsToSave = latestPlaylistsRef.current; // Latest value
};
```

**Code Location:**
- All useEffect hooks
- Save functions

---

### 5. Duplicate API Calls (Partially Resolved)

> **Related:** [PATTERNS.md#6-cache-first-api-pattern](./PATTERNS.md#6-cache-first-api-pattern) - Prevention pattern
> **Related:** [DATA-FLOW.md#5-title-fetching-flow](./DATA-FLOW.md#5-title-fetching-flow) - Title fetching flow
> **Related:** [MASTER-CONTEXT.md#42-api-usage-optimization-current-challenge](./MASTER-CONTEXT.md#42-api-usage-optimization-current-challenge) - Current challenge

**Problem:** Same video titles fetched multiple times, exceeding API quota.

**Symptoms:**
- API quota exceeded
- Slow loading
- Duplicate network requests

**Solution:**
- Check `videoMetadata` subcollection cache first
- Track fetched titles in `titlesFetchedThisSession` ref
- Only fetch uncached videos
- Save fetched titles to cache

**Prevention:**
```javascript
// Check cache first
const cachedTitles = {};
// ... check videoMetadata subcollection ...

// Track in session
if (titlesFetchedThisSession.current.has(videoId)) {
  return; // Skip already fetched
}

// Only fetch uncached
const idsToFetch = videoIds.filter(id => 
  !cachedTitles[id] && !titlesFetchedThisSession.current.has(id)
);
```

**Code Location:**
- Title fetching in `onSnapshot` callback

---

### 6. Concurrent Fetch Conflicts

> **Related:** [PATTERNS.md#8-concurrent-fetch-control-pattern](./PATTERNS.md#8-concurrent-fetch-control-pattern) - Control pattern
> **Related:** [DATA-FLOW.md#6-bulk-add-flow](./DATA-FLOW.md#6-bulk-add-flow) - Bulk add flow
> **Related:** [CODE-STRUCTURE.md#data-fetching-functions](./CODE-STRUCTURE.md#data-fetching-functions) - Implementation

**Problem:** Multiple playlists fetching simultaneously can hit rate limits or cause conflicts.

**Symptoms:**
- Rate limit errors (403, 429)
- Stale fetch locks
- Playlists stuck in "fetching" state

**Solution:**
- Use global lock (`isFetchingAnyPlaylist`) for normal operations
- Allow 3 concurrent during bulk add
- Check for stale locks (5 minute timeout)
- Clear locks in finally block

**Prevention:**
```javascript
// Check for stale locks
const STALE_LOCK_TIMEOUT = 5 * 60 * 1000;
if (fetchStartTimes.current.has(playlistId)) {
  const startTime = fetchStartTimes.current.get(playlistId);
  if (now - startTime > STALE_LOCK_TIMEOUT) {
    // Clear stale lock
    fetchingPlaylists.current.delete(playlistId);
  }
}

// Set locks
fetchingPlaylists.current.add(playlistId);
fetchStartTimes.current.set(playlistId, now);

try {
  // Fetch...
} finally {
  // Always clear locks
  fetchingPlaylists.current.delete(playlistId);
}
```

**Code Location:**
- `fetchAllVideos()` function

---

### 7. Video ID Format Inconsistency

> **Related:** [PATTERNS.md#9-video-id-optimization-pattern](./PATTERNS.md#9-video-id-optimization-pattern) - Format handling
> **Related:** [DATA-FLOW.md#3-snapshot-flow-firestore--state](./DATA-FLOW.md#3-snapshot-flow-firestore--state) - ID expansion
> **Related:** [CODE-STRUCTURE.md#onsnapshot-listener-lines-1100-1600](./CODE-STRUCTURE.md#onsnapshot-listener-lines-1100-1600) - Expansion code

**Problem:** Videos stored as strings (IDs) but code expects objects, or vice versa.

**Symptoms:**
- Videos not displaying
- Titles missing
- Errors accessing video properties

**Solution:**
- Handle both formats when loading
- Always normalize to objects in state
- Save as IDs only to Firestore
- Check format before accessing properties

**Prevention:**
```javascript
// Handle both formats
const videoId = typeof v === 'string' ? v : (v?.id || v);
const title = typeof v === 'string' ? '' : (v?.title || '');
const duration = typeof v === 'string' ? 1 : (v?.duration || 1);
```

**Code Location:**
- `onSnapshot` - Video expansion
- `performStagedSave()` - ID optimization

---

### 8. Missing Dependency Warnings

**Problem:** useEffect missing dependencies causes stale closures or infinite loops.

**Symptoms:**
- ESLint warnings
- Effects not running when they should
- Infinite loops

**Solution:**
- Include all used variables in dependency array
- Use refs for values that shouldn't trigger re-runs
- Use functional updates to avoid dependencies

**Prevention:**
```javascript
// Include all dependencies
useEffect(() => {
  // Uses playlists, userId, db
}, [playlists, userId, db]); // All dependencies included

// Or use refs for values that shouldn't trigger
const latestPlaylistsRef = useRef(playlists);
useEffect(() => {
  latestPlaylistsRef.current = playlists;
}, [playlists]);

useEffect(() => {
  // Uses latestPlaylistsRef.current (not in deps)
}, [otherDeps]);
```

**Code Location:**
- All useEffect hooks

---

### 9. Bulk Add Playlist Deletion

> **Related:** [PATTERNS.md#10-local-playlist-preservation-pattern](./PATTERNS.md#10-local-playlist-preservation-pattern) - Preservation pattern
> **Related:** [DATA-FLOW.md#6-bulk-add-flow](./DATA-FLOW.md#6-bulk-add-flow) - Bulk add flow
> **Related:** [CODE-STRUCTURE.md#onsnapshot-listener-lines-1100-1600](./CODE-STRUCTURE.md#onsnapshot-listener-lines-1100-1600) - Preservation code

**Problem:** Newly bulk-added playlists get deleted by incoming Firestore snapshots.

**Symptoms:**
- Playlists appear, then disappear
- Bulk add seems to work but playlists vanish

**Solution:**
- Preserve locally added playlists not in snapshot
- Track which playlists were loaded from Firestore
- Only preserve genuinely new playlists

**Prevention:**
```javascript
// Identify locally added playlists
const localPlaylistsNotInSnapshot = playlists.filter(localPlaylist => {
  if (snapshotPlaylistIds.has(localPlaylist.id)) return false;
  if (localPlaylist.id === '_unsorted_') return false;
  // Only preserve if not loaded from Firestore
  return !playlistsLoadedFromFirestore.current.has(localPlaylist.id);
});

// Merge preserved playlists
if (localPlaylistsNotInSnapshot.length > 0) {
  finalPlaylists = [...finalPlaylists, ...localPlaylistsNotInSnapshot];
}
```

**Code Location:**
- `onSnapshot` callback

---

### 10. Firestore Batch Size Limits

**Problem:** Firestore batches are limited to 500 operations, but we use 400 to be safe.

**Symptoms:**
- Batch commit errors
- "Too many operations" errors

**Solution:**
- Split into batches of 400 operations
- Create new batch for each chunk
- Commit each batch separately

**Prevention:**
```javascript
const FIRESTORE_BATCH_SIZE = 400; // 500 is limit, use 400 for safety

for (let i = 0; i < items.length; i += FIRESTORE_BATCH_SIZE) {
  const batch = writeBatch(db);
  const batchItems = items.slice(i, i + FIRESTORE_BATCH_SIZE);
  
  batchItems.forEach(item => {
    // Add to batch
  });
  
  await batch.commit(); // Commit each batch
}
```

**Code Location:**
- Title caching
- Video metadata caching

---

## Edge Cases

### 1. Empty Playlists
- Playlists with no videos need special handling
- Don't try to generate shuffle orders for empty playlists
- Skip fetching for empty playlists

### 2. Deleted Videos
- YouTube videos can be deleted
- Filter out "Deleted video" and "Private video" titles
- Handle missing video data gracefully

### 3. Very Large Playlists (1000+ videos)
- May still approach 1MB limit even with ID-only storage
- Consider pagination or splitting playlists
- Monitor document size

### 4. Rapid State Changes
- Multiple rapid changes can cause multiple saves
- Use debouncing to batch changes
- Use refs to track latest state

### 5. Browser Refresh During Save
- Save might be in progress when page refreshes
- Use `isSavingRef` to prevent snapshot overwrites
- Save state to localStorage for recovery

---

## Common Mistakes

### 1. Forgetting to Clear Timers
```javascript
// ❌ Wrong: Timer not cleared
useEffect(() => {
  setTimeout(() => save(), 2000);
}, [data]);

// ✅ Correct: Clear timer
useEffect(() => {
  if (timer.current) clearTimeout(timer.current);
  timer.current = setTimeout(() => save(), 2000);
  return () => clearTimeout(timer.current);
}, [data]);
```

### 2. Mutating State Directly
```javascript
// ❌ Wrong: Direct mutation
playlists[0].videos.push(newVideo);

// ✅ Correct: Immutable update
setPlaylists(prev => prev.map((p, i) => 
  i === 0 ? { ...p, videos: [...p.videos, newVideo] } : p
));
```

### 3. Not Handling Async Errors
```javascript
// ❌ Wrong: No error handling
const data = await fetch(url);

// ✅ Correct: Try/catch
try {
  const data = await fetch(url);
} catch (error) {
  console.error('Fetch failed:', error);
  // Handle error
}
```

### 4. Using State in Save Functions
```javascript
// ❌ Wrong: Uses closure value
const performSave = () => {
  saveToFirestore(playlists); // Old value
};

// ✅ Correct: Uses ref
const performSave = () => {
  const playlistsToSave = latestPlaylistsRef.current; // Latest value
  saveToFirestore(playlistsToSave);
};
```

---

## Debugging Tips

1. **Check Console Logs:** All major operations are logged with emoji prefixes
2. **Check Firestore Console:** Verify data structure matches expectations
3. **Check Network Tab:** Monitor API calls and Firestore operations
4. **Check localStorage:** Video progress and config stored there
5. **Check sessionStorage:** Bulk add progress stored there
6. **Use React DevTools:** Inspect state and props
7. **Add Temporary Logs:** Log state values to understand flow

---

## Prevention Checklist

When adding new code, check:

- [ ] Are Firestore saves debounced?
- [ ] Are API calls cached first?
- [ ] Are errors handled gracefully?
- [ ] Are state updates functional?
- [ ] Are refs used for latest values in saves?
- [ ] Are timers cleared?
- [ ] Are locks cleared in finally blocks?
- [ ] Are orphaned IDs checked before saving?
- [ ] Are snapshots checked for data loss?
- [ ] Are dependencies included in useEffect?

---

**Remember:** Most bugs come from these common patterns. Follow the patterns in PATTERNS.md to avoid them.

## 11. Excessive API Usage (CRITICAL)

> **🤖 AI Agent Note:** This is a CRITICAL gotcha. API calls cost quota and money. Always prioritize avoiding API calls when possible.

**Symptoms:**
- Hitting YouTube Data API daily quota limits
- High API usage costs
- Rate limit errors (403, 429)
- Slow performance due to API calls

**Root Causes:**
1. Fetching titles/metadata when not in cache
2. Making redundant API calls for same videos
3. Not using free data sources (thumbnails, playlistItems titles)
4. Background fetching when not essential

**Solution:**
**Core Principle:** "If at a fork in the road, lean in the direction of NOT making API calls for titles and metadata. As long as thumbnails provide playback and videos are in the right playlists/colored folders, that's sufficient."

**Prevention:**
1. **Cache-First Always:**
   - Check `videoMetadata` subcollection FIRST
   - Check session cache SECOND
   - Only make API call if NOT in cache

2. **Use Free Data:**
   - Thumbnails: Direct image URLs (`img.youtube.com`) - NO quota ✅
   - Titles from `playlistItems` response - Already paid for ✅
   - Only fetch what's truly missing

3. **Skip Non-Essential Fetches:**
   - Missing title but has thumbnail? → Skip API call
   - Missing metadata but video plays? → Skip API call
   - User can still use feature? → Skip API call

4. **Only Fetch When:**
   - User explicitly requests (bulk add, search)
   - First-time video (not in cache)
   - Essential for functionality

**Code Locations:**
- `app/page.jsx` ~line 1395-1564: Background title fetching (cache-first)
- `app/page.jsx` ~line 2167-2226: Current video metadata (could be optional)
- `app/page.jsx` ~line 2996-3124: Bulk add metadata (user action)
- `app/page.jsx` ~line 2498-2520: Search (user action)

**Related:**
- [PATTERNS.md#16-api-call-minimization-pattern](./PATTERNS.md#16-api-call-minimization-pattern) - Detailed pattern
- [MASTER-CONTEXT.md#13-api-optimization](./MASTER-CONTEXT.md#13-api-optimization) - Optimization strategy

## Related Documentation

- **[PATTERNS.md](./PATTERNS.md)** - Patterns that prevent these gotchas
- **[DATA-FLOW.md](./DATA-FLOW.md)** - Understanding data flow helps avoid these issues
- **[STATE-MANAGEMENT.md](./STATE-MANAGEMENT.md)** - State-related gotchas and solutions
- **[CODE-STRUCTURE.md](./CODE-STRUCTURE.md)** - Code locations for these issues
- **[MASTER-CONTEXT.md](./MASTER-CONTEXT.md)** - Context for why these are problems
