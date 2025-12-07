# Migration Plan: Next.js/Firebase → Desktop App/Local Database

**Last Updated:** 2025-01-06  
**Version:** 2.0  
**Status:** Planning Phase  
**Priority:** Critical - App-Breaking Change

> **🤖 AI Agent Note:** This is a MAJOR architectural migration. The entire application will be ported from a Next.js web app using Firebase to a desktop application with a local database. This document outlines the strategy, risks, and implementation plan.

## Migration Overview

### Current Architecture
- **Platform:** Next.js web application
- **Database:** Firebase Firestore (cloud)
- **Deployment:** Vercel (web hosting)
- **Limitations:** 
  - 1MB Firestore document limit
  - API quota limits
  - Requires internet connection
  - Cloud dependency

### Target Architecture
- **Platform:** Desktop application (Electron)
- **Database:** Local SQLite database
- **Deployment:** Installable desktop app
- **Benefits:**
  - No document size limits
  - No API quota limits (local storage)
  - Works offline
  - No cloud dependency
  - Faster (local access)
  - Privacy (data stays local)
  - Simple installation (Discord-level simplicity)

## Migration Goals

1. **Preserve All Functionality** - Every feature must work identically
2. **Maintain Data Structure** - Keep same data model/logic
3. **Keep Persistent User ID** - Same user ID system (tied to local database)
4. **Remove Firebase Limits** - No more 1MB document constraints
5. **Offline-First** - Works completely offline
6. **Same User Experience** - UI/UX remains identical
7. **Simple Installation** - As easy as installing Discord (one-click installer)
8. **Default Channels** - 100s of universal default channels pre-loaded for all users
9. **User Customization** - Users can modify/add their own channels beyond defaults
10. **Completely Free** - No costs, no subscriptions, open source

## Technology Stack

### Desktop Framework: Electron
**Why Electron:**
- Mature ecosystem with large community
- Easy React integration (can reuse existing code)
- Cross-platform (Windows, Mac, Linux)
- Simple build and distribution
- Well-documented

**Bundle Size:** ~100MB+ (acceptable for desktop app)

### Database: SQLite
**Why SQLite:**
- Mature, battle-tested
- Full SQL support
- Excellent performance
- No size limits (practical)
- Easy migrations
- Single file database (easy backup)
- No server required

## Installation & User Experience

### Installation Process (Discord-Level Simplicity)

**Target:** Installation should be as simple as Discord:
1. Download installer (Windows: `.exe`, Mac: `.dmg`, Linux: `.AppImage`)
2. Double-click installer
3. Follow simple wizard (optional: choose install location)
4. App launches automatically
5. **First Launch:** User ID generated automatically, database initialized with defaults
6. Ready to use immediately

**No Complex Setup:**
- No manual database configuration
- No API key entry required (unless user wants to add their own)
- No account creation
- No internet required after installation
- Works completely offline

### User ID & Database Initialization

**On First Launch:**
1. Generate persistent user ID (UUID v4)
2. Store user ID in local config file
3. Initialize local SQLite database
4. Create user record with generated ID
5. **Pre-load 100s of default universal channels** (see Default Channels section)
6. User can immediately start using the app

**User ID Storage:**
- **Windows:** `%APPDATA%/youtube-tv/user-config.json`
- **Mac:** `~/Library/Application Support/youtube-tv/user-config.json`
- **Linux:** `~/.config/youtube-tv/user-config.json`
- **Content:** `{ "userId": "uuid-here", "createdAt": "timestamp" }`

**Database Location:**
- **Windows:** `%APPDATA%/youtube-tv/youtube-tv.db`
- **Mac:** `~/Library/Application Support/youtube-tv/youtube-tv.db`
- **Linux:** `~/.config/youtube-tv/youtube-tv.db`
- Single SQLite file, portable, can be backed up easily

### Default Universal Channels (100s Pre-Loaded)

**Requirements:**
- **100s of default channels** pre-loaded for every new user
- Channels are **universal** (same for everyone)
- Users can **modify** default channels (rename, hide, reorganize)
- Users can **add their own** channels beyond defaults
- Default channels serve as starting point/curated content

**Default Channels Data Structure:**
```javascript
// Structure matches the JSON file format
const defaultChannels = {
  version: "1.0.0",
  lastUpdated: "2025-01-06",
  channels: [
    {
      id: "PLrAXtmRdnEQy6nuLMH7Fby8lE0s8j2kZ1",
      name: "Popular Music",
      type: "playlist",
      category: "Music",
      description: "Curated popular music playlist"
    }
    // ... 100s more channels
  ]
};
```

**Default Channels Management:**
- Stored in app bundle as JSON file: `default-channels.json`
- Loaded into database on first launch
- Users can:
  - Hide default channels (soft delete)
  - Rename default channels
  - Add videos to default channels
  - Create new channels beyond defaults
  - Import/export their custom channels

## What You Need to Provide

### 1. Default Channels List (REQUIRED) ⭐

**Format:** JSON file with list of YouTube playlist/channel IDs

**File:** `default-channels.json` (to be created in project root)

**Structure:**
```json
{
  "version": "1.0.0",
  "lastUpdated": "2025-01-06",
  "channels": [
    {
      "id": "PLrAXtmRdnEQy6nuLMH7Fby8lE0s8j2kZ1",
      "name": "Popular Music",
      "type": "playlist",
      "category": "Music",
      "description": "Curated popular music playlist"
    },
    {
      "id": "UCXuqSBlHAE6Xw-yeJA0Tunw",
      "name": "Tech Channel",
      "type": "channel",
      "category": "Technology",
      "description": "Technology news and reviews"
    }
  ]
}
```

**What to Include:**
- [ ] List of 100+ YouTube playlist IDs or channel IDs
- [ ] Names for each channel/playlist
- [ ] Optional: Categories (Music, Tech, Gaming, etc.)
- [ ] Optional: Descriptions
- [ ] Optional: Thumbnail URLs (or let app fetch them)

**How to Provide:**
- Create `default-channels.json` file in project root
- Or provide as spreadsheet/CSV that I can convert
- Or provide as list and I'll create the JSON structure

**Note:** The `type` field should be either `"playlist"` (for playlist IDs starting with `PL`) or `"channel"` (for channel IDs starting with `UC`).

### 2. YouTube API Key Decision (REQUIRED) ⭐

**Current Status:** App uses YouTube Data API v3 for fetching video metadata

**Options:**

**Option A: Embed API Key (Simplest for Users)**
- You provide API key, embed in app
- Users don't need to enter anything
- **Pro:** Seamless experience
- **Con:** API quota shared across all users (may hit limits with many users)

**Option B: User-Entered API Key (Recommended)**
- Users enter their own API key on first launch (optional)
- App works without API key (just slower metadata fetching)
- **Pro:** No quota limits per user, users get free 10,000 units/day
- **Con:** Slightly more setup (but still simple - one text field)

**Option C: Hybrid**
- Use embedded API key for default channel metadata
- Users can add their own API key for custom channels
- **Pro:** Best of both worlds
- **Con:** More complex implementation

**Recommendation:** **Option B** - Let users optionally add their own API key for unlimited usage, but app works without it (just slower metadata fetching). This keeps it free and simple.

**What I Need:**
- [ ] Decision: Option A, B, or C?
- [ ] If Option A: Your YouTube API key (keep it secure, I'll handle embedding)
- [ ] If Option B or C: I'll add simple API key entry UI

### 3. Platform Priorities (REQUIRED) ⭐

**Which platforms should I build installers for?**

- [ ] Windows (.exe installer) - **Required?**
- [ ] macOS (.dmg installer) - **Required?**
- [ ] Linux (.AppImage or .deb) - **Required?**

**Recommendation:** Start with Windows, add Mac/Linux as needed.

### 4. App Branding Assets (OPTIONAL)

**For Installer/App:**
- [ ] App icon (`.ico` for Windows, `.icns` for Mac)
- [ ] App name (default: "YouTube TV" or your preferred name)
- [ ] Company/Publisher name (for code signing)
- [ ] App description for stores/installers

**If Not Provided:**
- I'll use generic icons and default branding
- Can be updated later

### 5. Distribution Method (OPTIONAL)

**How should users download the app?**

- [ ] GitHub Releases (free, recommended) - Easy, automatic updates possible
- [ ] Direct download from website
- [ ] App stores (Windows Store, Mac App Store - requires accounts/costs)

**Recommendation:** GitHub Releases - Free, easy, automatic updates possible

### 6. Default Channel Organization (OPTIONAL)

**If you want default channels organized:**
- [ ] Category structure (Music, Gaming, Tech, etc.)
- [ ] Tab organization for defaults
- [ ] Featured/default tab setup

**If Not Provided:**
- I'll organize defaults in a single "Default Channels" tab
- Users can reorganize as they wish

## Implementation Plan

### Phase 1: Setup & Preparation (Week 1)

#### 1.1 Set Up Electron
- Install Electron
- Create basic desktop app structure
- Set up build system
- Test basic window/app lifecycle

#### 1.2 Set Up SQLite
- Install SQLite (better-sqlite3)
- Create database schema matching Firestore structure
- Set up database connection/initialization
- Create migration utilities

#### 1.3 Create Default Channels System
- Create `default-channels.json` structure (using your provided list)
- Implement default channel loading logic
- Test with sample default channels

### Phase 2: Core Migration (Week 2-3)

#### 2.1 Replace Firebase with SQLite
**Files to Modify:**
- `app/page.jsx` - Replace all Firestore calls
- Firebase initialization → SQLite initialization
- `onSnapshot` → SQLite change listeners
- `updateDoc` → SQLite UPDATE queries
- `getDocs` → SQLite SELECT queries
- `writeBatch` → SQLite transactions

**Key Functions to Replace:**
- Firebase initialization (~line 600-900)
- `onSnapshot` listener (~line 1100-1600)
- `performStagedSave()` (~line 1864-2050)
- All Firestore read/write operations

#### 2.2 Update Data Access Layer
- Create database service layer
- Abstract database operations
- Keep same data structure
- Maintain same patterns (debouncing, etc.)

#### 2.3 Update State Management
- Remove Firebase dependencies
- Keep same state structure
- Update save/load patterns
- Maintain session vs persistent data distinction

### Phase 3: Feature Parity (Week 4)

#### 3.1 Verify All Features Work
- Playlist management
- Video playback
- Colored folders
- Bulk operations
- Tabs system
- Search functionality
- History tracking
- Progress saving

#### 3.2 Update Patterns
- Remove Firestore-specific patterns
- Update PATTERNS.md with new patterns
- Update GOTCHAS.md with new gotchas
- Document local DB patterns

#### 3.3 Performance Optimization
- Optimize database queries
- Add indexes where needed
- Optimize save operations
- Test with large datasets

### Phase 4: Installation & Distribution (Week 5)

#### 4.1 Create Installers
- Set up Electron Builder
- Create Windows installer (.exe)
- Create Mac installer (.dmg)
- Create Linux installer (.AppImage or .deb)

#### 4.2 User ID & Database Initialization
- Implement user ID generation
- Implement database initialization
- Implement default channel loading
- Test first launch flow

#### 4.3 Testing & Polish
- Test installation on clean systems
- Test first launch experience
- Test offline functionality
- Test data persistence

## Database Schema

### Main User Data Table
```sql
CREATE TABLE users (
  user_id TEXT PRIMARY KEY,
  playlists TEXT, -- JSON array of playlists
  playlist_tabs TEXT, -- JSON array of tabs
  video_progress TEXT, -- JSON object
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

### Playlists Table (Normalized)
```sql
CREATE TABLE playlists (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  playlist_id TEXT NOT NULL,
  name TEXT NOT NULL,
  videos TEXT, -- JSON array of video IDs
  groups TEXT, -- JSON object of colored folders
  is_default INTEGER DEFAULT 0,
  can_delete INTEGER DEFAULT 1,
  category TEXT,
  description TEXT,
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  UNIQUE(user_id, playlist_id)
);
```

### Video Metadata Table
```sql
CREATE TABLE video_metadata (
  user_id TEXT,
  video_id TEXT,
  title TEXT,
  duration INTEGER,
  published_year TEXT,
  author TEXT,
  view_count TEXT,
  channel_id TEXT,
  PRIMARY KEY (user_id, video_id)
);
```

### Watch History Table
```sql
CREATE TABLE watch_history (
  user_id TEXT,
  history_id TEXT PRIMARY KEY,
  video_id TEXT,
  title TEXT,
  playlist_id TEXT,
  playlist_name TEXT,
  filter TEXT,
  timestamp TEXT,
  FOREIGN KEY (user_id) REFERENCES users(user_id)
);
```

## Code Changes Required

### 1. Remove Firebase Imports
```javascript
// REMOVE:
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, doc, onSnapshot, updateDoc } from 'firebase/firestore';

// ADD:
import Database from 'better-sqlite3';
import { app } from 'electron';
import path from 'path';
```

### 2. Replace Firebase Initialization
```javascript
// OLD:
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// NEW:
const userDataPath = app.getPath('userData');
const dbPath = path.join(userDataPath, 'youtube-tv.db');
const db = new Database(dbPath);

// Initialize schema
db.exec(`
  CREATE TABLE IF NOT EXISTS users (...);
  CREATE TABLE IF NOT EXISTS playlists (...);
  -- etc.
`);
```

### 3. Replace onSnapshot
```javascript
// OLD:
onSnapshot(userDocRef, (snapshot) => {
  const data = snapshot.data();
  // Process data
});

// NEW:
// Use React state updates directly (no real-time sync needed for local DB)
// Or implement file watcher if needed
```

### 4. Replace Save Operations
```javascript
// OLD:
await updateDoc(userDocRef, {
  playlists: optimizedPlaylists,
  playlistTabs: tabsToSave
});

// NEW:
const stmt = db.prepare(`
  UPDATE users 
  SET playlists = ?, playlist_tabs = ?, updated_at = ? 
  WHERE user_id = ?
`);
stmt.run(
  JSON.stringify(optimizedPlaylists),
  JSON.stringify(tabsToSave),
  Date.now(),
  userId
);
```

### 5. Default Channels Loading
```javascript
// On first launch
async function initializeDefaultChannels(userId) {
  // Check if defaults already loaded
  const hasDefaults = db.prepare(
    'SELECT COUNT(*) as count FROM playlists WHERE user_id = ? AND is_default = 1'
  ).get(userId);
  
  if (hasDefaults.count === 0) {
    // Load default-channels.json
    const defaultChannels = require('./default-channels.json');
    
    // Insert each default channel
    const insertStmt = db.prepare(`
      INSERT INTO playlists (
        user_id, playlist_id, name, videos, is_default, can_delete, category, description
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    for (const channel of defaultChannels.channels) {
      insertStmt.run(
        userId,
        channel.id,
        channel.name,
        JSON.stringify([]), // Empty videos array, will be fetched
        1, // is_default = true
        0, // can_delete = false
        channel.category || null,
        channel.description || null
      );
    }
  }
}
```

## User Customization

**Users Can:**
- Hide default channels (soft delete, can restore)
- Rename default channels
- Add videos to default channels
- Create unlimited custom channels
- Export/import their custom channels
- Delete custom channels (but not defaults)

## Free & Open Source

### Cost Structure
- **Development:** Free (open source)
- **Distribution:** Free (GitHub Releases)
- **Database:** Free (SQLite, no hosting costs)
- **API:** Optional (users can use their own free YouTube API key - 10,000 units/day free)
- **No Subscriptions:** Completely free forever

### Open Source Considerations
- License: MIT or similar permissive license
- Repository: Public GitHub repo
- Contributions: Welcome community contributions
- Documentation: Comprehensive (already have this!)

## Timeline Estimate

- **Phase 1 (Setup):** 1 week
- **Phase 2 (Core Migration):** 2-3 weeks
- **Phase 3 (Feature Parity):** 1 week
- **Phase 4 (Installation & Distribution):** 1 week

**Total:** 5-6 weeks for complete migration

## Success Criteria

- [ ] All features work identically
- [ ] No data loss during migration
- [ ] Performance equal or better
- [ ] Works completely offline
- [ ] No Firebase dependencies
- [ ] Simple installation (Discord-level)
- [ ] Default channels pre-loaded
- [ ] User ID generation working
- [ ] Documentation updated
- [ ] Build system working
- [ ] Installers created for all target platforms

## Next Steps

### What I Need From You:

1. **Default Channels List** (REQUIRED)
   - [ ] Create `default-channels.json` with 100+ playlist/channel IDs
   - [ ] Include names, types, categories, descriptions

2. **API Key Decision** (REQUIRED)
   - [ ] Choose: Option A (embed), B (user-entered), or C (hybrid)
   - [ ] If Option A: Provide your YouTube API key

3. **Platform Priorities** (REQUIRED)
   - [ ] Which platforms: Windows, Mac, Linux?

4. **App Branding** (OPTIONAL)
   - [ ] App icon, name, description

5. **Distribution Method** (OPTIONAL)
   - [ ] GitHub Releases, website, or app stores?

### What I'll Do:

- [ ] Set up Electron + SQLite
- [ ] Create database schema
- [ ] Implement default channel loading
- [ ] Replace Firebase with SQLite
- [ ] Create installer system
- [ ] Implement user ID generation
- [ ] Create installers for all platforms
- [ ] Update all documentation
- [ ] Test everything thoroughly

## Related Documentation

- **[MASTER-CONTEXT.md](./MASTER-CONTEXT.md)** - Current architecture
- **[DATA-FLOW.md](./DATA-FLOW.md)** - Current data flows (will need updates)
- **[PATTERNS.md](./PATTERNS.md)** - Current patterns (will need updates)
- **[CODE-STRUCTURE.md](./CODE-STRUCTURE.md)** - Code organization (will need updates)

---

**Status:** Ready for your input  
**Next Action:** Waiting for default channels list and decisions on API key approach and platforms

