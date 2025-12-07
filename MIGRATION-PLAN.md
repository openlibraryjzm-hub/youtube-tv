# Migration Plan: Next.js/Firebase → Desktop App/Local Database

**Last Updated:** 2025-01-06  
**Version:** 1.0  
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
- **Platform:** Desktop application (Electron or Tauri)
- **Database:** Local database (SQLite or IndexedDB)
- **Deployment:** Installable desktop app
- **Benefits:**
  - No document size limits
  - No API quota limits (local storage)
  - Works offline
  - No cloud dependency
  - Faster (local access)
  - Privacy (data stays local)

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

## Technology Choices

### Desktop Framework Options

#### Option A: Electron (Recommended)
**Pros:**
- Mature ecosystem
- Large community
- Easy React integration
- Cross-platform (Windows, Mac, Linux)
- Can reuse Next.js code with modifications

**Cons:**
- Larger bundle size (~100MB+)
- Higher memory usage
- Slower startup

**Best For:** Quick migration, maximum compatibility

#### Option B: Tauri
**Pros:**
- Smaller bundle size (~5-10MB)
- Lower memory usage
- Faster performance
- Better security model
- Native feel

**Cons:**
- Newer technology
- Smaller community
- More setup required
- Requires Rust knowledge for advanced features

**Best For:** Performance-focused, modern approach

**Recommendation:** Start with **Electron** for faster migration, can migrate to Tauri later if needed.

### Database Options

#### Option A: SQLite (Recommended)
**Pros:**
- Mature, battle-tested
- Full SQL support
- Excellent performance
- No size limits (practical)
- Easy migrations
- Good tooling

**Cons:**
- Requires SQL knowledge
- More setup than IndexedDB

**Best For:** Complex queries, relationships, migrations

#### Option B: IndexedDB
**Pros:**
- Browser-native (if using Electron)
- NoSQL-like (similar to Firestore)
- Already familiar pattern
- Works in browser context

**Cons:**
- More complex API
- Limited query capabilities
- No SQL
- Harder migrations

**Recommendation:** **SQLite** - Better for long-term, easier migrations, more powerful.

## Migration Strategy

### Phase 1: Preparation (Week 1)

#### 1.1 Create Migration Branch
```bash
git checkout -b migration/desktop-app
```

#### 1.2 Set Up Desktop Framework
- Install Electron (or Tauri)
- Create basic desktop app structure
- Set up build system
- Test basic window/app lifecycle

#### 1.3 Set Up Local Database
- Install SQLite (or IndexedDB wrapper)
- Create database schema matching Firestore structure
- Set up database connection/initialization
- Create migration utilities

#### 1.4 Create Data Migration Scripts
- Export current Firestore data
- Convert Firestore format to local DB format
- Import script for existing users
- Test migration with sample data

### Phase 2: Core Migration (Week 2-3)

#### 2.1 Replace Firebase with Local DB
**Files to Modify:**
- `app/page.jsx` - Replace all Firestore calls
- Firebase initialization → Local DB initialization
- `onSnapshot` → Local DB change listeners
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

### Phase 4: Testing & Polish (Week 5)

#### 4.1 Comprehensive Testing
- Test all user flows
- Test with large playlists (1000+ videos)
- Test offline functionality
- Test data persistence
- Test migrations

#### 4.2 Documentation Updates
- Update MASTER-CONTEXT.md
- Update CODE-STRUCTURE.md
- Update DATA-FLOW.md
- Update PATTERNS.md
- Update GOTCHAS.md
- Create MIGRATION-GUIDE.md for users

#### 4.3 Build & Distribution
- Set up build process
- Create installers (Windows, Mac, Linux)
- Test installation process
- Create distribution package

## Detailed Implementation Plan

### Database Schema Design

#### Main User Data Table
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

#### Video Metadata Table
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

#### Watch History Table
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

### Code Changes Required

#### 1. Remove Firebase Imports
```javascript
// REMOVE:
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, doc, onSnapshot, updateDoc } from 'firebase/firestore';

// ADD:
import Database from 'better-sqlite3'; // or similar
```

#### 2. Replace Firebase Initialization
```javascript
// OLD:
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// NEW:
const db = new Database('youtube-tv.db');
// Initialize schema
```

#### 3. Replace onSnapshot
```javascript
// OLD:
onSnapshot(userDocRef, (snapshot) => {
  const data = snapshot.data();
  // Process data
});

// NEW:
// Polling or event-based updates
setInterval(() => {
  const data = db.prepare('SELECT * FROM users WHERE user_id = ?').get(userId);
  // Process data
}, 1000); // Or use better event system
```

#### 4. Replace Save Operations
```javascript
// OLD:
await updateDoc(userDocRef, {
  playlists: optimizedPlaylists,
  playlistTabs: tabsToSave
});

// NEW:
const stmt = db.prepare('UPDATE users SET playlists = ?, playlist_tabs = ?, updated_at = ? WHERE user_id = ?');
stmt.run(JSON.stringify(optimizedPlaylists), JSON.stringify(tabsToSave), Date.now(), userId);
```

### Data Migration Strategy

#### For Existing Users
1. **Export Script:**
   - Connect to Firebase
   - Export all user data
   - Convert to SQLite format
   - Save to local database

2. **Import on First Launch:**
   - Check if user has Firebase data
   - Prompt to import
   - Run migration script
   - Verify data integrity

#### For New Users
- Start fresh with local database
- No migration needed

## Risk Assessment

### High Risk Areas

1. **Data Loss During Migration**
   - **Mitigation:** Comprehensive backup, test migrations thoroughly
   - **Rollback:** Keep Firebase connection available during transition

2. **Breaking Changes**
   - **Mitigation:** Extensive testing, feature parity checklist
   - **Rollback:** Git version control, easy revert

3. **Performance Issues**
   - **Mitigation:** Optimize queries, add indexes, test with large datasets
   - **Rollback:** Profile and optimize iteratively

4. **User Experience Disruption**
   - **Mitigation:** Maintain same UI/UX, seamless transition
   - **Rollback:** Keep old version available

### Medium Risk Areas

1. **Database Corruption**
   - **Mitigation:** Regular backups, transaction safety
   - **Rollback:** Restore from backup

2. **Cross-Platform Compatibility**
   - **Mitigation:** Test on all platforms
   - **Rollback:** Platform-specific fixes

## Testing Strategy

### Unit Tests
- Database operations
- Data conversion functions
- Migration scripts

### Integration Tests
- Save/load cycles
- Data persistence
- State management

### End-to-End Tests
- Complete user flows
- Large dataset handling
- Offline functionality

### Performance Tests
- Query performance
- Save operation speed
- Memory usage
- Startup time

## Rollback Plan

### If Migration Fails

1. **Immediate Rollback:**
   - Revert to Firebase version
   - Restore from backup
   - Notify users

2. **Partial Rollback:**
   - Keep local DB for new features
   - Maintain Firebase for critical data
   - Gradual migration

3. **Data Recovery:**
   - Export from local DB
   - Convert back to Firebase format
   - Restore to Firebase

## Timeline Estimate

- **Phase 1 (Preparation):** 1 week
- **Phase 2 (Core Migration):** 2-3 weeks
- **Phase 3 (Feature Parity):** 1 week
- **Phase 4 (Testing & Polish):** 1 week

**Total:** 5-6 weeks for complete migration

## Success Criteria

- [ ] All features work identically
- [ ] No data loss during migration
- [ ] Performance equal or better
- [ ] Works completely offline
- [ ] No Firebase dependencies
- [ ] Documentation updated
- [ ] User migration path available
- [ ] Build system working
- [ ] Installers created

## Installation & User Experience Requirements

### Installation Process (Discord-Level Simplicity)

**Target:** Installation should be as simple as Discord:
1. Download installer (Windows: `.exe`, Mac: `.dmg`, Linux: `.AppImage` or `.deb`)
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
1. Generate persistent user ID (UUID v4 or similar)
2. Store user ID in local config file
3. Initialize local SQLite database
4. Create user record with generated ID
5. **Pre-load 100s of default universal channels** (see Default Channels section)
6. User can immediately start using the app

**User ID Storage:**
- Location: `%APPDATA%/youtube-tv/user-config.json` (Windows)
- Location: `~/Library/Application Support/youtube-tv/user-config.json` (Mac)
- Location: `~/.config/youtube-tv/user-config.json` (Linux)
- Contains: `{ "userId": "uuid-here", "createdAt": "timestamp" }`

**Database Location:**
- Location: `%APPDATA%/youtube-tv/youtube-tv.db` (Windows)
- Location: `~/Library/Application Support/youtube-tv/youtube-tv.db` (Mac)
- Location: `~/.config/youtube-tv/youtube-tv.db` (Linux)
- Single SQLite file, portable, can be backed up easily

### Default Universal Channels (100s Pre-Loaded)

**Requirements:**
- **100s of default channels** pre-loaded for every new user
- Channels are **universal** (same for everyone)
- Users can **modify** default channels (rename, delete, reorganize)
- Users can **add their own** channels beyond defaults
- Default channels serve as starting point/curated content

**Default Channels Data Structure:**
```javascript
// Example default channels (you'll provide the full list)
// Note: Structure matches the JSON file format with 'channels' property
const defaultChannels = {
  version: "1.0.0",
  lastUpdated: "2025-01-06",
  channels: [
    {
      id: "PLrAXtmRdnEQy6nuLMH7Fby8lE0s8j2kZ1",
      name: "Popular Music",
      type: "playlist",
      category: "Music",
      description: "Curated popular music playlist",
      videos: [], // Will be fetched on first use or can be pre-populated
      groups: createDefaultGroups(),
      isDefault: true, // Flag to identify default channels
      canDelete: false, // Users can't delete defaults, but can hide them
    },
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

### 1. Default Channels List (REQUIRED)

**Format:** JSON file with list of YouTube playlist/channel IDs

**File:** `default-channels.json` (to be created)

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
  ]
}
```

**What to Include:**
- [ ] List of 100+ YouTube playlist IDs or channel IDs
- [ ] Names for each channel/playlist
- [ ] Optional: Categories (Music, Tech, Gaming, etc.)
- [ ] Optional: Descriptions
- [ ] Optional: Thumbnail URLs or let app fetch them

**How to Provide:**
- Create `default-channels.json` file in project root
- Or provide as spreadsheet/CSV that I can convert
- Or provide as list and I'll create the JSON structure

### 2. YouTube API Key (OPTIONAL - For Initial Setup)

**Current Status:** App uses YouTube Data API v3 for fetching video metadata

**Options:**
- **Option A:** You provide API key, embed in app (users don't need to enter)
  - Pro: Seamless experience
  - Con: API quota shared across all users (may hit limits)
  
- **Option B:** Users enter their own API key on first launch (optional)
  - Pro: No quota limits per user
  - Con: Slightly more setup (but still simple)
  
- **Option C:** Hybrid - Use API key for default channel metadata, users add their own for custom channels
  - Pro: Best of both worlds
  - Con: More complex

**Recommendation:** Option B or C - Let users optionally add their own API key for unlimited usage, but app works without it (just slower metadata fetching)

**What I Need:**
- [ ] Decision: Embed API key or user-entered?
- [ ] If embedding: Your YouTube API key (keep it secure)
- [ ] If user-entered: I'll add simple API key entry UI

### 3. App Branding Assets (OPTIONAL)

**For Installer/App:**
- [ ] App icon (`.ico` for Windows, `.icns` for Mac)
- [ ] App name (default: "YouTube TV" or your preferred name)
- [ ] Company/Publisher name (for code signing)
- [ ] App description for stores/installers

**If Not Provided:**
- I'll use generic icons and default branding
- Can be updated later

### 4. Build & Distribution Preferences

**Platforms to Support:**
- [ ] Windows (.exe installer)
- [ ] macOS (.dmg installer)
- [ ] Linux (.AppImage or .deb)

**Distribution Method:**
- [ ] GitHub Releases (free, recommended)
- [ ] Direct download from website
- [ ] App stores (Windows Store, Mac App Store - requires accounts/costs)

**Recommendation:** GitHub Releases - Free, easy, automatic updates possible

### 5. Default Channel Categories/Organization (OPTIONAL)

**If you want default channels organized:**
- [ ] Category structure (Music, Gaming, Tech, etc.)
- [ ] Tab organization for defaults
- [ ] Featured/default tab setup

**If Not Provided:**
- I'll organize defaults in a single "Default Channels" tab
- Users can reorganize as they wish

## Implementation Details for Default Channels

### Database Schema Addition

```sql
-- Add flag to identify default channels
ALTER TABLE playlists ADD COLUMN is_default INTEGER DEFAULT 0;
ALTER TABLE playlists ADD COLUMN can_delete INTEGER DEFAULT 1;
ALTER TABLE playlists ADD COLUMN category TEXT;
ALTER TABLE playlists ADD COLUMN description TEXT;
```

### Default Channels Loading Logic

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
      INSERT INTO playlists (user_id, playlist_id, name, videos, is_default, can_delete, category, description)
      VALUES (?, ?, ?, ?, 1, 0, ?, ?)
    `);
    
    for (const channel of defaultChannels.channels) {
      insertStmt.run(
        userId,
        channel.id,
        channel.name,
        JSON.stringify([]), // Empty videos array, will be fetched
        channel.category || null,
        channel.description || null
      );
    }
  }
}
```

### User Customization

**Users Can:**
- Hide default channels (soft delete, can restore)
- Rename default channels
- Add videos to default channels
- Create unlimited custom channels
- Export/import their custom channels
- Delete custom channels (but not defaults)

## Free & Open Source Requirements

### Cost Structure
- **Development:** Free (open source)
- **Distribution:** Free (GitHub Releases)
- **Database:** Free (SQLite, no hosting costs)
- **API:** Optional (users can use their own free YouTube API key)
- **No Subscriptions:** Completely free forever

### Open Source Considerations
- License: MIT or similar permissive license
- Repository: Public GitHub repo
- Contributions: Welcome community contributions
- Documentation: Comprehensive (already have this!)

## Next Steps

1. **You Provide:**
   - [ ] Default channels list (100+ playlist/channel IDs) - **REQUIRED**
   - [ ] Decision on API key approach (embed vs user-entered) - **REQUIRED**
   - [ ] App branding preferences (optional)
   - [ ] Platform priorities (Windows/Mac/Linux) - **REQUIRED**

2. **I Implement:**
   - [ ] Create default-channels.json structure
   - [ ] Set up Electron + SQLite
   - [ ] Create installer system
   - [ ] Implement default channel loading
   - [ ] Add user ID generation
   - [ ] Create simple installation wizard
   - [ ] Build installers for all platforms

## Related Documentation

- **[MASTER-CONTEXT.md](./MASTER-CONTEXT.md)** - Current architecture
- **[DATA-FLOW.md](./DATA-FLOW.md)** - Current data flows (will need updates)
- **[PATTERNS.md](./PATTERNS.md)** - Current patterns (will need updates)
- **[CODE-STRUCTURE.md](./CODE-STRUCTURE.md)** - Code organization (will need updates)

---

**Status:** Ready for implementation planning  
**Next Action:** Create proof of concept with Electron + SQLite

