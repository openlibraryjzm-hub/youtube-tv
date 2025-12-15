# Quadrant Mode Feature Summary

**Last Updated:** 2025-01-13  
**Status:** ✅ Working - Windowed players implemented, 2-player limit enforced

---

## Current State

### ✅ Working Features
1. **Quarter Splitscreen Mode** - Two players in left quadrants (top/bottom)
2. **Closing Windows** - Both players can be closed independently
3. **Returning to Fullscreen** - ✅ Works correctly (black gap fixed)
4. **Menu Quadrant Mode** - Hover 2 seconds on CornerDownRight button to push menu to bottom-right quadrant
5. **Player Quadrant Mode (Single Player)** - ✅ Hover 2 seconds on MoveDown button to push player to bottom-left quadrant
6. **Windowed Main Player (Fullscreen Mode)** - ✅ Main player is windowed and resizable in fullscreen mode, scales proportionally when menu opens
7. **Floating Window Player** - ✅ "2nd Window Player" option creates resizable, draggable floating window
8. **2-Player Limit** - ✅ Hard rule: Only 2 players max - menu options disabled when limit reached
9. **Proportional Scaling** - ✅ Main player and floating window maintain relative sizes when menu opens or quadrant mode activates

### ⚠️ Issues to Fix
1. ~~**Fullscreen Black Gap** - Right side shows black when it should be hidden in fullscreen~~ ✅ **FIXED**
2. ~~**Player Quadrant Mode Button** - Currently on video top menu, needs to be moved to playlist top menu~~ ✅ **FIXED**
3. **Player Quadrant Mode Functionality** - ✅ **SINGLE PLAYER WORKING** - ✅ **TWO-PLAYER MODE WORKING** - ✅ **FULLSCREEN CRASH FIXED** - **react-youtube implementation complete**

### Known Limitations
- ~~**Fullscreen from Quarter Mode**: Entering fullscreen when 2 quarter videos are active will automatically exit fullscreen and show an alert. This prevents the React/YouTube API crash. User must close quarter mode first before entering fullscreen.~~ ✅ **FIXED** - react-youtube handles React lifecycle properly, no more crashes

---

## Feature Details

### Menu Quadrant Mode
- **Button:** CornerDownRight icon
- **Location:** Video top menu (with other video controls)
- **Behavior:** Hover 2 seconds → menu shrinks to bottom-right quadrant
- **State:** `menuQuadrantMode` (boolean)
- **Ref:** `menuQuadrantHoverTimer`

### Player Quadrant Mode (In Progress)
- **Button:** MoveDown icon
- **Location:** ✅ Playlist top menu (with playlist name, nav buttons, thumbnail) - **MOVED**
- **Behavior:** 
  - ✅ **Single player + side menu (CURRENT FOCUS):** 
    - Hover 2 seconds → Player shrinks to bottom-left quadrant
    - Top-left quadrant becomes black
    - On hover end → Returns to half view
  - Two players + quarter mode (TODO): 
    - Primary player → bottom-left quadrant
    - Secondary player → bottom-right quadrant
    - Menu → top-right quadrant
    - Top-left → black
- **State:** `playerQuadrantMode` (boolean)
- **Ref:** `playerQuadrantHoverTimer`
- **Layout:** Line 6937-6947 - Conditional rendering based on `playerQuadrantMode && showSideMenu`

---

## Code Locations

### State Declarations
- Line 643: `menuQuadrantMode`
- Line 644: `playerQuadrantMode`
- Line 860: `menuQuadrantHoverTimer`
- Line 861: `playerQuadrantHoverTimer`

### Layout Structure
- **Main Container:** Line 6828-6949
  - Left side: Player area (w-full when no menu, w-1/2 when menu open)
  - Right side: Menu area (w-1/2) - ✅ **FIXED: Now only visible when showSideMenu is truthy**

### Button Locations
- **Menu Quadrant Button:** Lines 8366-8392 (video top menu)
- **Player Quadrant Button:** Lines 8258-8284 (playlist top menu) - ✅ **MOVED**
- **Playlist Top Menu:** Lines 8233-8280
- **Debug useEffect:** Lines 6535-6542 (tracks playerQuadrantMode state changes)

---

## Layout Logic

### Fullscreen Mode (showSideMenu === null)
- Left container: `w-full`
- Right container: Should be `w-0` or hidden - **CURRENTLY SHOWING BLACK**

### Splitscreen Mode (showSideMenu !== null)
- Left container: `w-1/2`
- Right container: `w-1/2` (menu visible)

### Quarter Splitscreen Mode
- Left container: `w-1/2` (contains two players)
- Right container: `w-1/2` (menu)

### Player Quadrant Mode (when active)
- Single player: Player moves to bottom-left, top-left black
- Two players: 
  - Primary → bottom-left
  - Secondary → bottom-right (absolute positioned)
  - Menu → top-right (height: 50%)
  - Top-left → black

---

## Next Steps

1. ~~**Fix Fullscreen Black Gap**~~ ✅ **DONE**
   - Wrapped right container in `{showSideMenu && (...)}` conditional

2. ~~**Move Player Quadrant Button**~~ ✅ **DONE**
   - Removed from video top menu
   - Added to playlist top menu after Grid3X3 button

3. ~~**Fix Player Quadrant Mode Functionality**~~ ✅ **DONE (Single Player)**
   - ✅ Layout structure exists (line 6937-6947)
   - ✅ Hover logic implemented (lines 8252-8278)
   - ✅ Added smooth transitions (500ms) to layout elements
   - ✅ Single player + side menu behavior working
   - ⏳ TODO: Two players + quarter mode behavior (future enhancement)

---

## Technical Notes

- Both quadrant modes use 2-second hover timers
- State resets when mouse leaves button
- Layout uses Tailwind classes with conditional rendering
- Transitions are 500ms duration with ease-in-out
- Console logs added for debugging (can be removed later)
- useEffect added to debug state changes and verify condition logic
- Condition: `playerQuadrantMode && showSideMenu && !quarterSplitscreenMode`
- **react-youtube implementation**: Both primary and secondary players now use react-youtube component for better React lifecycle management
- **Video playback fix**: Using `key` prop and `seekTo` in `onReady` instead of `start` parameter to prevent video resets on re-render
- **Windowed players**: Main player (in fullscreen) and floating window player are draggable and resizable with desktop window styling
- **2-player limit**: Menu options automatically disable when 2 players are active (quarter splitscreen OR floating window)
- **Proportional scaling**: When menu opens, both players scale to left half maintaining relative proportions. When quadrant mode activates, both scale to bottom-left quadrant maintaining relative proportions
- **Fullscreen layout tracking**: System tracks fullscreen layout state and applies proportional scaling based on menu/quadrant mode
- **Window Management System**: Complete window dragging, resizing, and proportional scaling system implemented. See [WINDOW-MANAGEMENT-SYSTEM.md](./WINDOW-MANAGEMENT-SYSTEM.md) for comprehensive documentation

## Implementation Details

### Single Player Quadrant Mode
- **Trigger:** Hover MoveDown button in playlist top menu for 2 seconds
- **Layout Change:** 
  - Normal: Player takes full left half (`w-1/2 h-full`)
  - Active: Player in bottom-left quadrant (`h-1/2`), top-left is black (`h-1/2 bg-black`)
- **Revert:** Automatically when mouse leaves button
- **Code:** Lines 6937-6947 (layout), 8252-8278 (button)
