# YouTube TV - Complete Project Context Summary

**Generated:** 2025-01-13  
**Purpose:** Comprehensive context document for project reorganization and future development  
**Status:** Current state snapshot including all challenges and architectural concerns

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Project Overview](#project-overview)
3. [Architecture & Technical Stack](#architecture--technical-stack)
4. [Code Structure Analysis](#code-structure-analysis)
5. [Current State & Working Features](#current-state--working-features)
6. [Known Issues & Technical Debt](#known-issues--technical-debt)
7. [Integration Challenges](#integration-challenges)
8. [State Management Complexity](#state-management-complexity)
9. [Memory & Performance Concerns](#memory--performance-concerns)
10. [Development Workflow Issues](#development-workflow-issues)
11. [Recommendations for Reorganization](#recommendations-for-reorganization)
12. [Critical Files & Dependencies](#critical-files--dependencies)

---

## Executive Summary

**YouTube TV** is a desktop application that transforms YouTube playlists into a Netflix-like viewing experience. Built with Tauri (Rust backend) and Next.js (React frontend), it provides a lean-back, TV-style interface for managing and watching YouTube content.

### Current Status
- ✅ **Core functionality working** - Playback, playlists, organization features all functional
- ⚠️ **Architectural concerns** - Single 6000+ line React component, complex state management
- ⚠️ **Integration challenges** - Recent attempts to integrate new UI components have been problematic
- ⚠️ **Memory/context issues** - Cursor AI repeatedly crashes, suggesting codebase complexity issues
- ⚠️ **Technical debt** - "Spaghetti code" concerns, foundational/long-term fears

### Key Problem Areas
1. **Monolithic frontend** - Single massive component file makes changes risky
2. **Complex state management** - 150+ useState/useRef hooks, tightly coupled logic
3. **Integration difficulties** - New components struggle to integrate with existing architecture
4. **Context loss** - AI tools lose context, suggesting code organization issues
5. **Recent integration failures** - RadialMenu and unified frontend integration attempts failed

---

## Project Overview

### What This App Does

**User Perspective:**
- Desktop app for watching YouTube playlists in a Netflix-like interface
- Full-screen video player with splitscreen browsing menu
- Advanced organization: colored folders, custom tabs, drag-and-drop
- Local-first: all data stored in SQLite, no cloud account needed
- First launch: 20+ default playlists with 20,000+ videos

**Core Features:**
- Video playback (YouTube IFrame API + local file support)
- Playlist management (import/export, colored folders, tabs)
- Progress tracking (resume where you left off)
- Multiple viewing modes (fullscreen, splitscreen, quadrant, windowed)
- Local video file support (.mp4, .webm, etc.)
- Video metadata caching (permanent storage, one-time fetch)

### Technical Overview

**Platform:** Windows desktop application  
**Frontend:** Next.js 14 (React 18) - Static export  
**Backend:** Tauri v2 (Rust)  
**Database:** SQLite (rusqlite) - Local file storage  
**Build:** Standalone Windows installer (.exe) - Zero dependencies for users

**Key Technical Achievements:**
- ✅ Migrated from Electron (100MB+) to Tauri (5-10MB)
- ✅ Zero runtime dependencies (no Node.js required)
- ✅ Local-first architecture (SQLite database)
- ✅ Resource bundling solution (`_up_/` directory discovery)

---

## Architecture & Technical Stack

### Frontend Architecture

**Current Structure:**
```
app/
├── page.jsx (~6000 lines) ← SINGLE MASSIVE COMPONENT
├── components/
│   ├── RadialMenu.jsx (1237 lines) ← Complex animation component
│   ├── PlayerAreaMapper.jsx ← Recent addition, save issues
│   └── unified/ ← New components being integrated
│       ├── App.jsx
│       ├── PlayerController.jsx ← Should replace top menus
│       ├── UnifiedPanel.jsx
│       ├── DataNavigator.jsx
│       ├── CreativeMode.jsx
│       ├── SupportOrbital.jsx
│       └── PlaceholderPage.jsx
├── api/ ← API routes (dev fallback, not used in Tauri)
└── globals.css
```

**Problem:** Single-file architecture (`app/page.jsx`) contains:
- All state management (150+ hooks)
- All business logic
- All UI rendering
- All event handlers
- All data fetching
- All save operations

### Backend Architecture

**Tauri Structure:**
```
src-tauri/
├── src/
│   ├── main.rs ← Entry point, command registration
│   └── db.rs ← Database operations (SQLite)
├── tauri.conf.json ← Build configuration
└── Cargo.toml ← Rust dependencies
```

**Database:**
- Location: `%APPDATA%\Roaming\YouTube TV\youtube-tv.db`
- Tables: `users`, `playlists`, `video_metadata`
- Operations: All via Tauri commands (Rust functions exposed to JS)

### Data Flow

```
User Action
    ↓
React State Update (app/page.jsx)
    ↓
Debounce (2 seconds)
    ↓
Tauri Command Call (invoke('save_user_data', ...))
    ↓
Rust Handler (db.rs)
    ↓
SQLite Transaction
    ↓
Database File
    ↓
Verification
    ↓
Success/Error → Frontend Feedback
```

---

## Code Structure Analysis

### app/page.jsx - The Monolith

**File Statistics:**
- **Lines:** ~6000+ (exact count varies with changes)
- **State Hooks:** 150+ useState/useRef declarations
- **Effects:** 50+ useEffect hooks
- **Functions:** 100+ handler/utility functions
- **JSX:** Massive nested component tree

**Key Sections (Approximate Line Ranges):**
- **Lines 1-295:** Imports, config, utilities, console log capture
- **Lines 296-600:** State declarations (useState, useRef)
- **Lines 601-1200:** Data loading (Tauri commands, API fallback)
- **Lines 1201-2000:** Save operations (debounced saves)
- **Lines 2001-3000:** Playback control (video switching, shuffle)
- **Lines 3001-4000:** Organization features (colored folders, tabs)
- **Lines 4001-5000:** UI rendering (player, menus, grids, modals)
- **Lines 5001-6000:** Event handlers (clicks, drag-drop, keyboard)

**Critical Patterns:**
1. **Debounced Saves:** 2-second delay, prevents excessive database writes
2. **Session Data in Refs:** Shuffle orders, positions (not persisted)
3. **Functional State Updates:** Prevents stale closures
4. **Tauri Command Pattern:** Conditional invoke() calls with fallback

### State Management Complexity

**State Variables (Sample):**
```javascript
// Playlist state
const [playlists, setPlaylists] = useState([])
const [currentPlaylistIndex, setCurrentPlaylistIndex] = useState(0)
const [playlistTabs, setPlaylistTabs] = useState([])

// Video state
const [currentVideoId, setCurrentVideoId] = useState(null)
const [currentVideoIndex, setCurrentVideoIndex] = useState(0)
const [videoProgress, setVideoProgress] = useState({})

// UI state
const [showSideMenu, setShowSideMenu] = useState(null)
const [showUnifiedPanel, setShowUnifiedPanel] = useState(false)
const [unifiedPanelActiveTab, setUnifiedPanelActiveTab] = useState('content')

// ... 150+ more state variables
```

**Refs (Session Data):**
```javascript
const playlistShuffleOrders = useRef({})
const lastChangeTimeRef = useRef(0)
const mainDataSaveTimer = useRef(null)
const playerRef = useRef(null)
// ... many more refs
```

**Problem:** State is tightly coupled, making changes risky. One state change can trigger cascading effects through multiple useEffect hooks.

---

## Current State & Working Features

### ✅ Working Features

**Core Functionality:**
- ✅ Video playback (YouTube + local files)
- ✅ Playlist management (CRUD operations)
- ✅ Colored folder organization
- ✅ Custom tabs
- ✅ Progress tracking
- ✅ Import/export playlists
- ✅ Local video file support
- ✅ Video metadata caching
- ✅ Multiple viewing modes (fullscreen, splitscreen, quadrant, windowed)
- ✅ Dual player support (quarter splitscreen mode)
- ✅ Windowed players (draggable, resizable)

**Backend:**
- ✅ Tauri commands working
- ✅ SQLite database persistence
- ✅ Resource bundling (`_up_/` directory)
- ✅ Default channels loading
- ✅ Save verification

### ⚠️ Partially Working / Problematic

**Recent Integration Attempts:**
- ⚠️ **RadialMenu:** Scroll snap-back issues, dragging not working, save functionality broken
- ⚠️ **Unified Frontend:** Integration started but incomplete, syntax errors during integration
- ⚠️ **PlayerController:** Should replace top menus but integration not complete

**Known Issues:**
- ⚠️ **PlayerAreaMapper:** Save button not triggering downloads reliably
- ⚠️ **State synchronization:** New components struggle to sync with existing state
- ⚠️ **Z-index conflicts:** Multiple overlapping UI layers causing pointer-events issues

---

## Known Issues & Technical Debt

### Critical Issues

1. **Monolithic Component**
   - **Problem:** Single 6000+ line file makes changes risky
   - **Impact:** Hard to understand, easy to break, difficult to test
   - **Risk:** High - any change can have unintended side effects

2. **State Management Complexity**
   - **Problem:** 150+ state variables, tightly coupled
   - **Impact:** Cascading effects, hard to trace data flow
   - **Risk:** High - state bugs are hard to debug

3. **Integration Challenges**
   - **Problem:** New components struggle to integrate
   - **Impact:** Recent integration attempts failed
   - **Risk:** Medium - blocks new features

4. **Memory/Context Issues**
   - **Problem:** Cursor AI repeatedly crashes
   - **Impact:** Development workflow disrupted
   - **Risk:** High - suggests codebase complexity issues

### Technical Debt

1. **No Component Splitting**
   - All logic in one file
   - No separation of concerns
   - Hard to maintain

2. **Complex Dependencies**
   - Many useEffect hooks with complex dependency arrays
   - Circular dependencies between state updates
   - Hard to reason about execution order

3. **Mixed Concerns**
   - UI rendering mixed with business logic
   - Data fetching mixed with state management
   - Event handlers mixed with side effects

4. **Inconsistent Patterns**
   - Some features use one pattern, others use different patterns
   - No clear architecture guidelines
   - Technical debt accumulates

---

## Integration Challenges

### Recent Integration Attempts

**1. RadialMenu Integration**
- **Goal:** Integrate radial menu for playlist navigation
- **Status:** ❌ Failed
- **Issues:**
  - Scroll snap-back: Elements move then return to original position
  - Dragging: Border detection not working
  - Save: PlayerAreaMapper save button not triggering downloads
- **Root Cause:** State synchronization issues, effect dependencies

**2. Unified Frontend Integration**
- **Goal:** Replace top menus with PlayerController.jsx
- **Status:** ⚠️ In Progress (syntax errors)
- **Issues:**
  - Syntax errors during integration (JSX structure)
  - State mapping unclear
  - Z-index conflicts
- **Root Cause:** Complex state management, unclear integration points

### Why Integrations Fail

1. **State Coupling**
   - New components need access to existing state
   - State is spread across 150+ variables
   - No clear state management pattern

2. **Effect Dependencies**
   - Many useEffect hooks depend on multiple state variables
   - Adding new components triggers unexpected effects
   - Circular dependencies cause infinite loops

3. **Z-Index & Pointer Events**
   - Multiple overlapping UI layers
   - Pointer-events conflicts
   - Click handlers not firing

4. **Component Lifecycle**
   - React reconciliation issues with YouTube IFrame API
   - Local video blob URLs need cleanup
   - Window management conflicts

---

## State Management Complexity

### State Variables Breakdown

**Playlist State (10+ variables):**
- `playlists`, `currentPlaylistIndex`, `playlistTabs`, `sideMenuPlaylistIndex`, etc.

**Video State (15+ variables):**
- `currentVideoId`, `currentVideoIndex`, `videoProgress`, `isPlaying`, etc.

**UI State (20+ variables):**
- `showSideMenu`, `showUnifiedPanel`, `unifiedPanelActiveTab`, `menuQuadrantMode`, etc.

**Filter/Shuffle State (10+ variables):**
- `videoFilter`, `chronologicalFilter`, `playlistShuffleOrders`, etc.

**Window/Player State (10+ variables):**
- `playerQuadrantMode`, `secondaryPlayerVideoId`, `quarterSplitscreenMode`, etc.

**Total:** 150+ state variables across multiple categories

### Effect Dependencies

**Example Problem:**
```javascript
useEffect(() => {
  // This effect depends on multiple state variables
  if (currentVideoId && currentPlaylistIndex !== null && !isAnimating) {
    // Complex logic that can trigger other effects
  }
}, [currentVideoId, currentPlaylistIndex, isAnimating, /* ... 10 more dependencies */])
```

**Issue:** One state change triggers multiple effects, which can trigger more state changes, creating cascading effects that are hard to trace.

### Ref Usage

**Session Data (Not Persisted):**
- `playlistShuffleOrders` - Shuffle orders per playlist
- `lastChangeTimeRef` - Last change timestamp for debouncing
- `mainDataSaveTimer` - Save timer reference
- `playerRef` - YouTube player instance
- `localVideoRef` - HTML5 video element

**Problem:** Refs are used to avoid re-renders, but they make state management harder to reason about.

---

## Memory & Performance Concerns

### Memory Issues

**Symptoms:**
- Cursor AI repeatedly crashes
- Context loss during development
- Long response times

**Possible Causes:**
1. **Large File Size:** 6000+ line component file
2. **Complex State:** 150+ state variables
3. **Many Effects:** 50+ useEffect hooks
4. **Deep Nesting:** Complex component tree
5. **Circular Dependencies:** State updates triggering more updates

### Performance Concerns

**Potential Issues:**
1. **Re-renders:** Large component re-renders on every state change
2. **Effect Execution:** Many effects running on every render
3. **Memory Leaks:** Blob URLs, YouTube player instances not cleaned up
4. **Large Playlists:** 20,000+ videos can cause performance issues

**Not Confirmed:** These are concerns based on code structure, not measured performance issues.

---

## Development Workflow Issues

### Current Workflow Problems

1. **Context Loss**
   - AI tools lose context frequently
   - Need to re-explain project structure
   - Slows down development

2. **Integration Failures**
   - Recent integration attempts failed
   - Multiple attempts to fix same issues
   - No clear path forward

3. **Testing Difficulties**
   - Hard to test individual features
   - Changes affect multiple areas
   - Regression risk high

4. **Documentation Gaps**
   - Code is self-documenting but complex
   - No clear architecture documentation
   - Patterns not clearly defined

### What's Working

1. **Build Process**
   - Tauri build script works
   - Fresh install testing works
   - Database persistence verified

2. **Core Features**
   - All main features functional
   - User experience is good
   - Performance acceptable for users

---

## Recommendations for Reorganization

### Short-Term (Immediate)

1. **Document Current State**
   - ✅ This document (you're reading it)
   - Map all state variables
   - Document all effects and their dependencies

2. **Fix Integration Issues**
   - Resolve RadialMenu scroll snap-back
   - Fix PlayerAreaMapper save functionality
   - Complete unified frontend integration

3. **Add Integration Tests**
   - Test state synchronization
   - Test component lifecycle
   - Test save/load cycles

### Medium-Term (Next Phase)

1. **Component Extraction**
   - Extract logical components from `app/page.jsx`
   - Start with leaf components (buttons, inputs)
   - Move to feature components (playlist grid, video player)

2. **State Management Refactor**
   - Consider state management library (Zustand, Jotai)
   - Separate UI state from business logic
   - Create clear data flow patterns

3. **Architecture Documentation**
   - Document component structure
   - Document state management patterns
   - Document integration patterns

### Long-Term (Future)

1. **Full Refactor**
   - Split `app/page.jsx` into multiple files
   - Create clear component hierarchy
   - Implement proper separation of concerns

2. **Testing Infrastructure**
   - Unit tests for components
   - Integration tests for features
   - E2E tests for user flows

3. **Performance Optimization**
   - Measure actual performance
   - Optimize re-renders
   - Optimize effect execution

---

## Critical Files & Dependencies

### Must-Read Files

1. **AI-ONBOARDING-PROMPT.md**
   - Complete project overview
   - Architecture details
   - Development patterns

2. **PROJECT-MASTER-DOCUMENTATION.md**
   - Deep dive documentation
   - Technical details
   - Build process

3. **app/page.jsx**
   - Main component (6000+ lines)
   - All business logic
   - All state management

4. **src-tauri/src/db.rs**
   - Database operations
   - Tauri commands
   - Data persistence

### Key Dependencies

**Frontend:**
- `next: ^14.2.5` - Next.js framework
- `react: ^18.3.1` - React library
- `lucide-react: ^0.562.0` - Icons
- `gsap: ^3.14.2` - Animations (RadialMenu)
- `perspective-transform: ^1.1.3` - Math library (RadialMenu)

**Backend:**
- `tauri: ^2.9.4` - Tauri framework
- `rusqlite: ^0.31` - SQLite database

### Configuration Files

- `next.config.js` - Next.js configuration (static export)
- `tailwind.config.js` - Tailwind CSS configuration
- `tauri.conf.json` - Tauri build configuration
- `package.json` - Node.js dependencies

---

## Current Challenges Summary

### Immediate Challenges

1. **RadialMenu Integration**
   - Scroll snap-back issue
   - Dragging not working
   - Save functionality broken

2. **Unified Frontend Integration**
   - Syntax errors
   - State mapping unclear
   - Z-index conflicts

3. **Memory/Context Issues**
   - Cursor AI crashes
   - Context loss
   - Development workflow disrupted

### Long-Term Challenges

1. **Code Organization**
   - Monolithic component
   - Complex state management
   - No clear architecture

2. **Technical Debt**
   - Mixed concerns
   - Inconsistent patterns
   - Hard to maintain

3. **Integration Patterns**
   - No clear integration guidelines
   - New components struggle
   - State synchronization issues

---

## Conclusion

**Current State:**
- ✅ Core functionality working
- ⚠️ Architectural concerns
- ⚠️ Integration challenges
- ⚠️ Memory/context issues

**Key Insights:**
1. The app works for users, but code organization is a concern
2. Recent integration attempts reveal architectural issues
3. Memory/context issues suggest codebase complexity problems
4. Need for reorganization is clear, but approach must be careful

**Next Steps:**
1. Fix immediate integration issues
2. Document current state (this document)
3. Plan component extraction strategy
4. Consider state management refactor
5. Implement testing infrastructure

**Recommendation:**
Take a step back, document everything (this document), then plan a careful refactoring strategy. Don't rush - the app works, so changes should be incremental and well-tested.

---

**End of Context Summary**

*This document represents a snapshot of the project at this moment in time. It should be updated as the project evolves and challenges are resolved.*

