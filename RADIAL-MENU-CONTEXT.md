# Radial Menu Implementation - Complete Context Document

## Overview
This document contains all knowledge about the radial menu implementation, current design, and known issues from the development session.

## Current Radial Menu Design

### Component Location
- **File**: `app/components/RadialMenu.jsx`
- **Integration**: Imported and used in `app/page.jsx` at line 8282

### Key Features Implemented

1. **Dynamic Playlist Scrolling**
   - Displays playlist names from the `playlists` prop
   - Circular scrolling with wrap-around animations
   - Scroll behavior:
     - **Scrolling DOWN**: Bottommost playlist wraps to top
       - Example: 1,2,3,4,5,6,7 → 49,1,2,3,4,5,6 → 48,49,1,2,3,4,5
     - **Scrolling UP**: Topmost playlist moves down, new appears at bottom
       - Example: 1,2,3,4,5,6,7 → 2,3,4,5,6,7,8 → 3,4,5,6,7,8,9

2. **Visual Styling**
   - Element 2 (index 1) text is always **yellow** (`#ffff00`)
   - All other elements are **white** (`#ffffff`)
   - Hover highlight: Text turns **yellow** when hovering over any element
   - Thumbnail display: Playlist thumbnail appears to the left of element 2

3. **Animation System**
   - Uses GSAP (GreenSock Animation Platform) for smooth animations
   - Perspective-warped text rendering using `perspective-transform`
   - Canvas-based rendering with fixed dimensions (1200x1000)
   - Wrap-around animations with teleport containers (top/bottom)

4. **Configuration**
   - Loads container configuration from `/radial-menu-config.json`
   - Loads letter dictionary from `/dictionary.json`
   - Supports 7 visible containers (normal containers)
   - Has teleport containers for seamless wrap-around

### State Management

```javascript
const [containers, setContainers] = useState([])
const [contentElements, setContentElements] = useState([])
const [dictionary, setDictionary] = useState({})
const [isAnimating, setIsAnimating] = useState(false)
const [isInitialized, setIsInitialized] = useState(false)
const [scrollOffset, setScrollOffset] = useState(0) // Tracks which set of playlists is visible
const [hoveredElementIndex, setHoveredElementIndex] = useState(null) // For hover highlighting
const [position, setPosition] = useState({ x: 0, y: -100 }) // Draggable position (starts partially off-screen)
const [isDragging, setIsDragging] = useState(false)
const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
```

### Refs
- `canvasRef`: Canvas element reference
- `canvasContainerRef`: Container div reference
- `scrollThrottleRef`: Throttles scroll events
- `animationRefs`: Tracks GSAP animations
- `contentElementsRef`: Latest content elements (avoids stale closures)
- `scrollOffsetRef`: Latest scroll offset (avoids stale closures)
- `thumbnailImagesRef`: Caches loaded thumbnail images
- `wrapperRef`: Wrapper div for dragging

### Scroll Offset Logic

The `scrollOffset` determines which set of playlists is currently visible:
- **Initial**: `scrollOffset = 0` shows playlists 0-6
- **Scrolling DOWN**: `scrollOffset` decrements (e.g., 0 → 48 for 49 playlists)
- **Scrolling UP**: `scrollOffset` increments (e.g., 0 → 1)

Playlist index calculation: `(scrollOffset + containerIndex) % playlists.length`

### Text Update Mechanism

There are TWO separate `useEffect` hooks for content element management:

1. **Initialization Effect** (lines 58-222):
   - Dependencies: `[isInitialized, containers, playlists]`
   - Only runs when containers/playlists are first loaded
   - Creates initial content elements with positions

2. **Text Update Effect** (lines 224-280):
   - Dependencies: `[scrollOffset, isInitialized, containers, playlists, contentElements.length, isAnimating]`
   - Only updates TEXT when `scrollOffset` changes
   - Does NOT reset positions (prevents snap-back)
   - Skips if `isAnimating` is true

## Integration with Main App

### Rendering Location
```jsx
{/* Radial Menu - only visible in quadrant mode */}
<div 
  className={`relative transition-all duration-500 ease-in-out ${
    playerQuadrantMode && showSideMenu && !quarterSplitscreenMode ? 'h-1/2 flex-shrink-0' : 'h-0 hidden'
  }`}
  style={{
    overflow: 'visible' // Allow menu to be positioned outside container
  }}
>
  {playerQuadrantMode && showSideMenu && !quarterSplitscreenMode && (
    <RadialMenu onScrollRef={radialMenuScrollRef} playlists={playlists} />
  )}
</div>
```

### Activation
- Radial menu appears when:
  - `playerQuadrantMode === true`
  - `showSideMenu !== null` (menu is open)
  - `quarterSplitscreenMode === false` (not in quarter mode)

### Scroll Event Forwarding
- Scroll events are forwarded via `radialMenuScrollRef` from the main app
- The menu's `handleWheel` function processes scroll events
- Throttled to prevent excessive animations

## Current Problems

### Problem 1: Map Player Area Not Saving

**Location**: `app/components/PlayerAreaMapper.jsx`

**Issue**: The save functionality is not working - file download fails or doesn't trigger.

**Current Implementation** (lines 112-150):
```javascript
const handleSave = useCallback(() => {
  if (!containerRef.current || box.width === 0 || box.height === 0) {
    console.error('Cannot save: invalid box dimensions or container not found')
    return
  }
  
  const rect = containerRef.current.getBoundingClientRect()
  if (!rect || rect.width === 0 || rect.height === 0) {
    console.error('Cannot save: invalid container dimensions')
    return
  }
  
  const normalizedBox = {
    x: box.x / rect.width,
    y: box.y / rect.height,
    width: box.width / rect.width,
    height: box.height / rect.height,
    absolute: { x: box.x, y: box.y, width: box.width, height: box.height },
    viewport: { width: rect.width, height: rect.height },
    timestamp: new Date().toISOString()
  }
  
  // Save to file
  try {
    const jsonString = JSON.stringify(normalizedBox, null, 2)
    const blob = new Blob([jsonString], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `player-area-${new Date().toISOString().replace(/[:.]/g, '-')}.json`
    document.body.appendChild(a)
    a.click()
    setTimeout(() => {
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    }, 100)
  } catch (error) {
    console.error('Error saving file:', error)
    alert('Error saving file. Check console for details.')
  }
}, [box, onAreaSet])
```

**Potential Issues**:
- Browser security restrictions on file downloads
- Timing issues with DOM manipulation
- Missing error handling for specific browser limitations

**User Needs**: Save functionality to map playlist and video menu areas (similar to player area mapping)

---

### Problem 2: Scroll Snap Back on Radial Menu

**Location**: `app/components/RadialMenu.jsx`

**Issue**: When scrolling the radial menu, the content snaps back to the initial position instead of maintaining the scrolled state.

**Root Cause Analysis**:
The scroll offset update triggers a `useEffect` that re-initializes content elements. Even though there's a separate effect for text updates, something is causing position resets.

**Current Implementation**:
1. **Animation Completion** (lines 434-454): Updates `scrollOffset` after wrap-around animation completes
2. **Text Update Effect** (lines 224-280): Should only update text, not positions
3. **Initialization Effect** (lines 58-222): Should only run on initial load

**The Problem**:
- When `scrollOffset` changes, the text update effect runs
- However, if `contentElements.length === 0` or the initialization effect runs, it resets positions
- The condition `if (contentElements.length > 0) return` in the initialization effect might not be working correctly

**Attempted Fixes**:
- Added `isAnimating` check to prevent updates during animations
- Separated text update into its own effect
- Removed `scrollOffset` from initialization effect dependencies

**Current State**: Still experiencing snap-back issues

---

### Problem 3: Cannot Drag and Move Radial Menu Hitbox

**Location**: `app/components/RadialMenu.jsx`

**Issue**: The draggable hitbox (yellow border) around the radial menu is not responding to drag operations. User wants to position it higher up, partially clipping off screen.

**Current Implementation** (lines 1123-1170):
```javascript
// Handle dragging
const handleMouseDown = useCallback((e) => {
  // Only start dragging if clicking on the border/wrapper, not the canvas content
  const target = e.target
  if (target === wrapperRef.current || (wrapperRef.current && target !== canvasRef.current && !canvasContainerRef.current?.contains(target))) {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
    const parent = wrapperRef.current?.parentElement
    if (parent) {
      const parentRect = parent.getBoundingClientRect()
      setDragStart({
        x: e.clientX - parentRect.left - position.x,
        y: e.clientY - parentRect.top - position.y
      })
    }
  }
}, [position])

const handleMouseMove = useCallback((e) => {
  if (isDragging && wrapperRef.current) {
    const parent = wrapperRef.current.parentElement
    if (parent) {
      const parentRect = parent.getBoundingClientRect()
      const newX = e.clientX - parentRect.left - dragStart.x
      const newY = e.clientY - parentRect.top - dragStart.y
      setPosition({
        x: newX,
        y: newY
      })
    }
  }
}, [isDragging, dragStart])
```

**Rendering** (lines 1172-1205):
```javascript
return (
  <div
    ref={wrapperRef}
    className="absolute border-2 border-yellow-400 bg-yellow-400/10"
    style={{
      left: `${position.x}px`,
      top: `${position.y}px`,
      width: '100%',
      height: '100%',
      zIndex: 20,
      cursor: isDragging ? 'grabbing' : 'grab'
    }}
    onMouseDown={handleMouseDown}
  >
    <div 
      ref={canvasContainerRef}
      className="w-full h-full relative pointer-events-auto"
      style={{ backgroundColor: '#000' }}
      onWheel={(e) => {
        if (onScrollRef?.current) {
          onScrollRef.current(e.nativeEvent)
        }
      }}
    >
      <canvas
        ref={canvasRef}
        className="w-full h-full pointer-events-auto"
        style={{ display: 'block' }}
      />
    </div>
  </div>
)
```

**The Problem**:
- The drag detection logic might be too restrictive
- Canvas content has `pointer-events-auto` which might be intercepting mouse events
- The condition for detecting border clicks might not work correctly
- Event propagation might be blocked

**User Needs**: 
- Visible yellow border around the menu
- Ability to drag the entire menu by clicking on the border
- Position it higher up (partially off-screen)
- Menu should stay in the new position

---

## Technical Architecture

### Animation Flow

1. **Scroll Event** → `handleWheel` (line 554)
2. **Throttle Check** → Prevents rapid successive scrolls
3. **Direction Detection** → `deltaY < 0 ? 'up' : 'down'`
4. **Animation Trigger** → `animateDirection(direction, scrollSpeed)`
5. **Wrap-Around Detection** → Checks if element is at top/bottom
6. **Dual Animation** → Fade out original + morph duplicate
7. **Scroll Offset Update** → After animation completes
8. **Text Update** → Separate effect updates text based on new offset

### Content Element Structure

```javascript
{
  id: 'content-{containerId}' | 'teleport-{top|bottom}-{containerId}',
  containerId: string,
  text: string,
  color: string,
  points: [{x, y}, {x, y}, {x, y}, {x, y}], // Quadrilateral corners
  opacity: number, // 0-1
  elementIndex: number | null, // For color logic (element 2 = index 1)
  playlistIndex: number | null // For thumbnail lookup
}
```

### Container Types

1. **Normal Containers**: Visible menu slots (7 total)
2. **Top Teleport Container**: Hidden, used for wrap-around when scrolling down
3. **Bottom Teleport Container**: Hidden, used for wrap-around when scrolling up

### Canvas Rendering

- Fixed dimensions: 1200x1000 pixels
- Black background
- Perspective-warped text using SVG paths from dictionary
- Debug outlines (can be removed in production)
- Thumbnail rendering for element 2

---

## Player Area Mapping Tool

### Component Location
- **File**: `app/components/PlayerAreaMapper.jsx`
- **Integration**: Used in `app/page.jsx` at the end of the component

### Features
- Resizable box with 8 handles (4 corners + 4 edges)
- Move box by dragging center
- Shows pixel and percentage coordinates
- Saves to JSON file with normalized coordinates

### Current Issue
Save functionality not working - needs debugging

---

## Player Positioning (From JSON Files)

### Half Player Mode
- **Position**: `left: 0%`, `top: 10.118918918918919%`
- **Size**: `width: 50%`, `height: 89.85945945945946%`
- **Applied when**: `showSideMenu === true`

### Full Player Mode
- **Position**: `left: 0%`, `top: 10.118918918918919%`
- **Size**: `width: 100.25%`, `height: 89.77297297297298%`
- **Applied when**: `showSideMenu === false`

### Quarter Player Mode
- **Position**: `left: 0%`, `top: 0%`
- **Size**: `width: 50%`, `height: 100%`
- **Status**: User says "quarter view is already perfect"

---

## Dependencies

- **GSAP**: `^3.14.2` - Animation library
- **perspective-transform**: `^1.1.3` - Perspective warping calculations
- **React**: `^18.3.1`
- **Next.js**: `^14.2.5`

---

## Configuration Files

1. **`/public/radial-menu-config.json`**: Container definitions with points, colors, teleport types
2. **`/public/dictionary.json`**: SVG path data for letters (A-Z)

---

## Key Code Patterns

### Preventing Stale Closures
```javascript
// Use refs to get latest values
const currentElements = contentElementsRef.current
const currentOffset = scrollOffsetRef.current
```

### Atomic State Updates
```javascript
setContentElements(prev => {
  // Single atomic update
  let updated = prev.filter(ce => ce.id !== oldId)
  updated = updated.map(ce => {
    if (ce.id === newId) {
      return { ...ce, /* updates */ }
    }
    return ce
  })
  return updated
})
```

### Animation Promise Chaining
```javascript
animations.push(
  Promise.all([
    fadeOutAndMorph,
    animateContentMorph(duplicateElement.id, targetContainerId, duration)
  ]).then(() => {
    // Update state after animation completes
    setScrollOffset(newScrollOffset)
  })
)
```

---

## Debugging Notes

### Console Logs
- Scroll offset changes
- Animation state changes
- Player quadrant mode activation/deactivation

### Visual Debugging
- Container outlines (green/magenta/cyan)
- Content element outlines (yellow)
- Element IDs and opacity values displayed on canvas

---

## Next Steps / TODO

1. **Fix Map Player Area Save**
   - Debug file download mechanism
   - Test in different browsers
   - Consider alternative save methods (copy to clipboard, localStorage)

2. **Fix Scroll Snap Back**
   - Verify initialization effect doesn't run when it shouldn't
   - Ensure text update effect never touches positions
   - Add guards to prevent position resets during animations

3. **Fix Radial Menu Dragging**
   - Simplify drag detection logic
   - Make border more clickable (increase hit area)
   - Test event propagation
   - Consider using a separate drag handle element

4. **Future Enhancements**
   - Persist radial menu position (localStorage)
   - Add save/load for menu position
   - Remove debug visualizations
   - Optimize thumbnail loading/caching

---

## File Structure Reference

```
app/
  components/
    RadialMenu.jsx          # Main radial menu component
    PlayerAreaMapper.jsx    # Area mapping tool
  page.jsx                  # Main app, integrates radial menu
public/
  radial-menu-config.json   # Container configuration
  dictionary.json          # Letter SVG paths
```

---

## Integration Points in page.jsx

- Line 78: `import RadialMenu from "./components/RadialMenu"`
- Line 78: `import PlayerAreaMapper from "./components/PlayerAreaMapper"`
- Line 897: `const radialMenuScrollRef = useRef(null)`
- Line 8275-8283: Radial menu rendering
- Line 10974: PlayerAreaMapper component
- Line 9917-9964: Large hitbox overlay (REMOVED - was causing issues)

---

*Last Updated: Current session*
*Status: Active development - 3 critical issues to resolve*









