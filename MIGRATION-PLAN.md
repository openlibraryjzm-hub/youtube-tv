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

**Status:** ✅ **Using your current Firebase data as source**

**What I Need:**
I need the **YouTube playlist/channel IDs** from your Firebase, not the Firebase structure itself. Specifically:
- The `id` field from each playlist in your Firebase `playlists` array
- The `name` field for each playlist
- These will become the default channels that all new users get

**How to Provide:**
**Option A: Export from Firebase Console (Easiest)**
1. Go to Firebase Console → Firestore Database
2. Navigate to your user document: `/users/{yourUserId}`
3. Copy the `playlists` array (or export the document as JSON)
4. Send me the JSON - I'll extract the IDs and create `default-channels.json`

**Option B: Export via Script**
- I can create a script to export playlist IDs from your Firebase
- You run it and send me the output

**Option C: Manual List**
- Provide a list of playlist IDs and names
- I'll create the JSON structure

**What Gets Extracted:**
From your Firebase playlists, I'll extract:
- `id` → becomes the playlist/channel ID in default-channels.json
- `name` → becomes the name in default-channels.json
- `type` → automatically determined (playlist IDs start with `PL`, channel IDs start with `UC`)
- `category` → optional, can be added later
- `description` → optional, can be added later

**Example from your current data:**
```json
{
  "version": "1.0.0",
  "lastUpdated": "2025-01-06",
  "channels": [
    {
      "id": "PLV2ewAgCPCq0DVamOw2sQSAVdFVjA6x78",
      "name": "Meme Songs",
      "type": "playlist"
    },
    {
      "id": "PLyZI3qCmOZ9uamxj6bd3P5oEkmXbu8-RT",
      "name": "Game List",
      "type": "playlist"
    }
    // ... all your playlists from Firebase
  ]
}
```

**Note:** If you have 100s of playlists in Firebase, I'll extract all of them. If you want to curate which ones become defaults, let me know.

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

**Decision:** ✅ **Option B - User-Entered API Key**

**Implementation:**
- Users will be prompted to add their own Google/YouTube API key on first launch
- This will be optional - app works without it (just slower metadata fetching)
- Simple text input field in settings/first launch
- API key stored locally in user config
- I'll implement the UI for API key entry

### 3. Platform Priorities (REQUIRED) ⭐

**Decision:** ✅ **Windows is highest and only priority**

**Implementation:**
- Focus 100% on Windows (.exe installer)
- Mac/Linux support is bonus for later (not required now)
- All development and testing will prioritize Windows
- Installer will be Windows-only initially

### 4. App Branding Assets (OPTIONAL)

**Status:** ⏸️ **Doesn't matter right now**

**Implementation:**
- I'll use generic icons and default branding ("YouTube TV")
- Can be updated later when you're ready

### 5. Distribution Method (OPTIONAL)

**Status:** ⏸️ **Doesn't matter right now**

**Implementation:**
- Will default to GitHub Releases (free, easy)
- Can be changed later when ready for distribution

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

1. **Default Channels List** (REQUIRED) ⭐
   - [x] **Decision:** Using your current Firebase data as source
   - [ ] **Action Needed:** Export your Firebase playlists data
     - Option A: Export from Firebase Console (send me the JSON)
     - Option B: I create export script (you run it)
     - Option C: Manual list of playlist IDs and names
   - I'll extract playlist IDs and create `default-channels.json`

2. **API Key Decision** (REQUIRED) ⭐
   - [x] **Decision:** Option B - User-entered API key
   - [x] **Implementation:** I'll add API key entry UI

3. **Platform Priorities** (REQUIRED) ⭐
   - [x] **Decision:** Windows only (highest priority)
   - [x] **Implementation:** Focus 100% on Windows, Mac/Linux later

4. **App Branding** (OPTIONAL)
   - [x] **Decision:** Doesn't matter right now
   - [x] **Implementation:** Use generic branding, update later

5. **Distribution Method** (OPTIONAL)
   - [x] **Decision:** Doesn't matter right now
   - [x] **Implementation:** Default to GitHub Releases

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
