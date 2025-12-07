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
3. **Keep Persistent User ID** - Same user ID system
4. **Remove Firebase Limits** - No more 1MB document constraints
5. **Offline-First** - Works completely offline
6. **Same User Experience** - UI/UX remains identical

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

## Next Steps

1. **Decide on Framework:** Electron vs Tauri
2. **Decide on Database:** SQLite vs IndexedDB
3. **Create Proof of Concept:** Basic desktop app with local DB
4. **Test Migration:** Small dataset first
5. **Plan Detailed Implementation:** Week-by-week breakdown
6. **Begin Migration:** Start with Phase 1

## Related Documentation

- **[MASTER-CONTEXT.md](./MASTER-CONTEXT.md)** - Current architecture
- **[DATA-FLOW.md](./DATA-FLOW.md)** - Current data flows (will need updates)
- **[PATTERNS.md](./PATTERNS.md)** - Current patterns (will need updates)
- **[CODE-STRUCTURE.md](./CODE-STRUCTURE.md)** - Code organization (will need updates)

---

**Status:** Ready for implementation planning  
**Next Action:** Create proof of concept with Electron + SQLite

