# Browser Storage Analysis - Data Loss Risk Assessment

**Last Updated:** 2025-01-06  
**Purpose:** Document what's stored in browser storage and assess data loss risk

## Summary: You're Safe! 🎉

**Good News:** All critical data (playlists, videos, tabs) is stored in **Firebase Firestore**, NOT in browser storage. Browser storage is primarily for **caching and performance**, not primary data storage.

## What's Stored in localStorage

### 1. Persistent User ID ⚠️ **CRITICAL**
**Key:** `youtube-tv-persistent-user-id`  
**Purpose:** Your unique identifier that links to your Firebase data  
**Risk if Lost:** 
- If cleared, a new ID is generated
- You'd lose access to your Firebase data unless you remember/backup the old ID
- **Mitigation:** This ID is also used to access Firebase, so as long as you can access Firebase, you can recover it

**How to Backup:**
```javascript
// Run in browser console to see your ID:
console.log(localStorage.getItem('youtube-tv-persistent-user-id'));
```

### 2. Firebase Config & API Key ✅ **Safe (Has Defaults)**
**Key:** `youtube-tv-config`  
**Purpose:** Stores Firebase configuration and YouTube API key  
**Risk if Lost:** 
- **LOW** - App has default Firebase config and API key hardcoded
- You'd just need to re-enter custom config if you changed it
- Defaults are in code, so app still works

### 3. Video Metadata Cache ✅ **Cache Only (Also in Firestore)**
**Key:** `youtube-tv-metadata-cache`  
**Purpose:** Caches video titles, durations, authors, etc. for faster loading  
**Size:** Can be large (up to 40k entries, trimmed to ~40MB)  
**Risk if Lost:**
- **LOW** - This is just a cache
- Same data exists in Firestore `videoMetadata` subcollection
- App will just be slower loading titles (fetches from Firestore instead)
- Cache rebuilds automatically as you use the app

### 4. Video Progress ✅ **Dual Storage (Also in Firestore)**
**Key:** `videoProgress`  
**Purpose:** Watch progress timestamps for videos  
**Risk if Lost:**
- **LOW** - Also saved to Firestore (debounced, 2 seconds)
- If localStorage cleared, progress loads from Firestore
- Only risk: Progress saved in last 2 seconds might be lost (minimal)

### 5. Console Logs ❌ **Not Critical**
**Key:** `youtube-tv-console-logs`  
**Purpose:** Last 100 console log entries for debugging  
**Risk if Lost:** None - just debugging info

## What's Stored in sessionStorage

### 1. Bulk Add Progress ❌ **Temporary Only**
**Key:** `youtube-tv-bulk-add-progress`  
**Purpose:** Tracks progress during bulk playlist adding  
**Risk if Lost:**
- **NONE** - This is session-only (cleared on browser close anyway)
- Just tracks in-progress operations
- If lost, bulk add just restarts

## What's NOT in Browser Storage (Safe in Firestore)

✅ **All Critical Data is in Firebase:**
- Playlists (all your playlists)
- Videos (all video IDs and organization)
- Playlist Tabs (your tab organization)
- Colored Folders (red, green, pink, yellow groups)
- Video Metadata (titles, durations, authors - in subcollection)
- Watch History (last 100 videos - in subcollection)
- Video Progress (also in Firestore as backup)

## Data Loss Scenarios

### Scenario 1: localStorage Cleared
**What Happens:**
- New persistent user ID generated
- You lose access to your Firebase data (unless you remember/backup the ID)
- Metadata cache cleared (but rebuilds from Firestore)
- Video progress cache cleared (but loads from Firestore)

**Recovery:**
- If you have your persistent user ID backed up, restore it
- All other data is safe in Firestore

### Scenario 2: sessionStorage Cleared
**What Happens:**
- Bulk add progress lost (if in progress)
- Everything else unaffected

**Recovery:**
- Just restart bulk add if needed

### Scenario 3: Both Cleared
**What Happens:**
- Same as Scenario 1
- All critical data still safe in Firestore

## How to Backup Your Critical Data

### 1. Backup Persistent User ID (Most Important!)
```javascript
// Run in browser console:
const userId = localStorage.getItem('youtube-tv-persistent-user-id');
console.log('Your User ID:', userId);
// Copy this somewhere safe!
```

### 2. Export from Firebase Console
1. Go to Firebase Console → Firestore Database
2. Navigate to `/users/{yourUserId}`
3. Export the document as JSON
4. Save this file - contains all your playlists, tabs, etc.

### 3. Export Video Metadata (Optional)
- Go to Firebase Console → Firestore Database
- Navigate to `/users/{yourUserId}/videoMetadata`
- Export all documents (or use script)

## Recommendations

### Immediate Actions:
1. **Backup your persistent user ID** - This is the key to your data
2. **Export your Firebase data** - Full backup of everything
3. **Document your user ID** - Write it down somewhere safe

### For Migration:
- When we migrate to desktop app, we'll:
  - Export all Firebase data
  - Import to local SQLite database
  - No data loss during migration
  - User ID will be preserved

## Risk Assessment

| Data Type | Storage Location | Risk if Lost | Recovery |
|-----------|-----------------|--------------|----------|
| Playlists | Firestore | ✅ None | Export from Firebase |
| Videos | Firestore | ✅ None | Export from Firebase |
| Tabs | Firestore | ✅ None | Export from Firebase |
| User ID | localStorage | ⚠️ Medium | Backup ID, or lose Firebase access |
| Metadata Cache | localStorage + Firestore | ✅ None | Rebuilds from Firestore |
| Video Progress | localStorage + Firestore | ✅ None | Loads from Firestore |
| Config | localStorage | ✅ None | Has defaults in code |

## Conclusion

**You're Safe!** 🎉

- All critical data is in Firebase Firestore
- Browser storage is just for caching and performance
- Only risk: Losing persistent user ID (but you can backup it)
- Everything else can be recovered from Firestore

**Action Items:**
1. ✅ Backup your persistent user ID (run console command above)
2. ✅ Export Firebase data when quota resets
3. ✅ Keep user ID documented somewhere safe

---

**Note:** The migration to desktop app will preserve all this data and make it even safer (local database, no quota limits, no cloud dependency).







