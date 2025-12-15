# Window Management System - Complete Documentation

**Last Updated:** 2025-01-13  
**Status:** ✅ Complete and Working - Shelved for Future Use  
**Feature:** Advanced windowed video player system with proportional scaling

---

## Executive Summary

This document explains the complete window management system implemented for the YouTube TV desktop application. The system provides:

- **Windowed video players** that can be dragged and resized
- **8-direction resizing** (4 corners + 4 edges) with smooth operation
- **Proportional scaling** when transitioning between fullscreen, half-view, and quarter-view modes
- **Boundary constraints** preventing windows from entering the top menu area
- **Fullscreen layout tracking** to maintain window sizes across mode transitions

**Key Achievement:** Solved the fundamental problem of mouse events being absorbed by YouTube embed players, enabling smooth window manipulation even when dragging/resizing over video content.

---

## Table of Contents

1. [Problem Statement](#problem-statement)
2. [Solution Overview](#solution-overview)
3. [Core Architecture](#core-architecture)
4. [Window Dragging System](#window-dragging-system)
5. [Window Resizing System](#window-resizing-system)
6. [Proportional Scaling System](#proportional-scaling-system)
7. [Boundary Constraints](#boundary-constraints)
8. [State Management](#state-management)
9. [Implementation Details](#implementation-details)
10. [Key Design Decisions](#key-design-decisions)
11. [Code Locations](#code-locations)
12. [Future Enhancements](#future-enhancements)

---

## Problem Statement

### The Challenge

When implementing windowed video players, we encountered several critical issues:

1. **Mouse Event Absorption**: YouTube embed players absorb mouse events, making it impossible to drag or resize windows when the cursor moves over the video player
2. **Pointer Lock Issues**: Using browser pointer lock API caused cursor to disappear and required ESC key to restore, creating poor UX
3. **Proportional Scaling Conflicts**: When transitioning between fullscreen, half-view, and quarter-view modes, windows would rapidly resize or get corrupted sizes
4. **Duplicate Players**: Non-windowed versions of players would appear underneath windowed versions during mode transitions
5. **Size Corruption**: Window sizes would shrink repeatedly when opening/closing menus due to layout state being overwritten

### Why Traditional Approaches Failed

- **Direct Mouse Tracking**: Failed because embed players intercept mouse events before React handlers can process them
- **Pointer Lock API**: Required user permission, hid cursor, and had browser compatibility issues
- **Event Delegation**: Couldn't capture events that were already absorbed by iframe
- **CSS-only Solutions**: Couldn't provide the dynamic positioning and sizing needed

---

## Solution Overview

### The Breakthrough: Full-Screen Overlay Approach

Instead of trying to capture events at the window level, we create a **transparent full-screen overlay** that sits above all content (including embed players) and captures all mouse events during drag/resize operations.

**Key Insight**: The overlay has `z-index: 9999` and `pointer-events: all`, ensuring it intercepts mouse events before they reach any underlying content, including YouTube iframes.

### How It Works

1. **User initiates drag/resize**: Clicks on title bar or resize handle
2. **Overlay created**: Transparent div covers entire screen with high z-index
3. **Events captured**: All mouse movements captured by overlay, not by embed player
4. **Window updated**: Position/size calculated and applied to window
5. **Overlay removed**: When user releases mouse, overlay is cleaned up

### Benefits

- ✅ Works even when cursor is over embed player
- ✅ Cursor stays visible (no pointer lock needed)
- ✅ No browser permissions required
- ✅ Smooth, responsive interaction
- ✅ Works for both dragging and resizing

---

## Core Architecture

### System Components

```
┌─────────────────────────────────────────────────────────┐
│              Window Management System                    │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌──────────────┐  ┌──────────────┐                    │
│  │ Main Window  │  │Floating Window│                   │
│  │   Handler    │  │   Handler     │                   │
│  └──────┬───────┘  └──────┬───────┘                   │
│         │                  │                            │
│         └────────┬──────────┘                            │
│                  │                                       │
│         ┌────────▼────────┐                             │
│         │ Overlay System │                             │
│         │ (Event Capture) │                             │
│         └────────┬────────┘                             │
│                  │                                       │
│         ┌────────▼────────┐                             │
│         │ State Manager   │                             │
│         │ (Layout Tracking)│                            │
│         └────────┬────────┘                             │
│                  │                                       │
│         ┌────────▼────────┐                             │
│         │ Proportional    │                             │
│         │ Scaling Engine  │                             │
│         └─────────────────┘                             │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### Data Flow

1. **User Interaction** → Mouse event on window element
2. **Handler Activation** → Drag/resize handler creates overlay
3. **Event Capture** → Overlay captures all mouse movements
4. **Calculation** → New position/size calculated based on mouse delta
5. **State Update** → React state updated with new values
6. **Rendering** → Window re-rendered at new position/size
7. **Cleanup** → Overlay removed when interaction ends

---

## Window Dragging System

### Implementation

**Location**: Lines 6985-7049 (main window), 6708-6774 (floating window)

### How It Works

```javascript
// 1. User clicks title bar
onMouseDown={(e) => {
  setIsDraggingMainWindow(true);
  setMainWindowDragStart({ x: e.clientX, y: e.clientY });
}}

// 2. useEffect creates overlay and handles dragging
useEffect(() => {
  if (!isDraggingMainWindow) return;
  
  // Create full-screen overlay
  const overlay = document.createElement('div');
  overlay.style.cssText = `
    position: fixed;
    top: 0; left: 0;
    width: 100%; height: 100%;
    z-index: 9999;
    cursor: grabbing;
    background: transparent;
    pointer-events: all;
  `;
  document.body.appendChild(overlay);
  
  // Handle mouse movement
  const handleMouseMove = (e) => {
    const deltaX = e.clientX - mainWindowDragStart.x;
    const deltaY = e.clientY - mainWindowDragStart.y;
    const newPosition = {
      x: mainPlayerWindowPosition.x + deltaX,
      y: Math.max(TOP_MENU_HEIGHT, mainPlayerWindowPosition.y + deltaY)
    };
    setMainPlayerWindowPosition(newPosition);
    setMainWindowDragStart({ x: e.clientX, y: e.clientY });
  };
  
  // Attach listeners
  overlay.addEventListener('mousemove', handleMouseMove);
  overlay.addEventListener('mouseup', handleMouseUp);
  
  // Cleanup on unmount
  return () => {
    document.body.removeChild(overlay);
    // ... remove listeners
  };
}, [isDraggingMainWindow, ...]);
```

### Key Features

- **Boundary Constraint**: `Math.max(TOP_MENU_HEIGHT, ...)` prevents window from moving above 105px
- **Delta Calculation**: Uses relative movement from drag start position
- **Fullscreen Layout Sync**: Updates `fullscreenLayout` state when dragging in fullscreen mode
- **Smooth Operation**: Overlay ensures events are always captured, even over embed players

---

## Window Resizing System

### Implementation

**Location**: Lines 6880-6980 (main window), 6777-6860 (floating window)

### 8-Direction Resizing

The system supports resizing from all 8 positions:

- **4 Corners**: `'nw'`, `'ne'`, `'sw'`, `'se'`
- **4 Edges**: `'n'`, `'s'`, `'e'`, `'w'`

### How It Works

```javascript
// Resize handle with direction
<div
  className="absolute top-0 left-0 w-4 h-4 bg-gray-600 cursor-nwse-resize"
  onMouseDown={(e) => {
    setIsResizingMainWindow(true);
    setMainWindowResizeDirection('nw'); // Top-left corner
    setMainWindowResizeStart({
      x: e.clientX,
      y: e.clientY,
      width: mainPlayerWindowSize.width,
      height: mainPlayerWindowSize.height,
      posX: mainPlayerWindowPosition.x,
      posY: mainPlayerWindowPosition.y
    });
  }}
/>

// Resize handler
const handleMouseMove = (e) => {
  const deltaX = e.clientX - mainWindowResizeStart.x;
  const deltaY = e.clientY - mainWindowResizeStart.y;
  const dir = mainWindowResizeDirection;
  
  let newSize = { width: mainWindowResizeStart.width, height: mainWindowResizeStart.height };
  let newPosition = { x: mainWindowResizeStart.posX, y: mainWindowResizeStart.posY };
  
  // Handle width changes
  if (dir.includes('e')) {
    // Resizing from right edge
    newSize.width = Math.max(400, mainWindowResizeStart.width + deltaX);
  } else if (dir.includes('w')) {
    // Resizing from left edge
    const newWidth = Math.max(400, mainWindowResizeStart.width - deltaX);
    newPosition.x = mainWindowResizeStart.posX + (mainWindowResizeStart.width - newWidth);
    newSize.width = newWidth;
  }
  
  // Handle height changes
  if (dir.includes('s')) {
    // Resizing from bottom edge
    newSize.height = Math.max(300, mainWindowResizeStart.height + deltaY);
  } else if (dir.includes('n')) {
    // Resizing from top edge
    const newHeight = Math.max(300, mainWindowResizeStart.height - deltaY);
    const calculatedY = mainWindowResizeStart.posY + (mainWindowResizeStart.height - newHeight);
    // Prevent window top edge from going above top menu
    newPosition.y = Math.max(TOP_MENU_HEIGHT, calculatedY);
    // Adjust height if we hit the boundary
    if (calculatedY < TOP_MENU_HEIGHT) {
      newSize.height = mainWindowResizeStart.height - (TOP_MENU_HEIGHT - mainWindowResizeStart.posY);
    } else {
      newSize.height = newHeight;
    }
  }
  
  // Ensure window top edge never goes above top menu (for corner resizing)
  if (newPosition.y < TOP_MENU_HEIGHT) {
    const heightAdjustment = TOP_MENU_HEIGHT - newPosition.y;
    newPosition.y = TOP_MENU_HEIGHT;
    newSize.height = Math.max(300, newSize.height - heightAdjustment);
  }
  
  setMainPlayerWindowSize(newSize);
  setMainPlayerWindowPosition(newPosition);
};
```

### Key Features

- **Direction-Based Logic**: Different calculations for edges vs corners
- **Position Adjustment**: When resizing from left/top, position must be adjusted
- **Boundary Constraints**: Prevents resizing above 105px boundary
- **Minimum Sizes**: Enforces minimum window sizes (400×300 for main, 300×200 for floating)
- **Cursor Styles**: Each direction has appropriate cursor (nwse-resize, nesw-resize, ns-resize, ew-resize)

---

## Proportional Scaling System

### The Problem

When transitioning between modes (fullscreen → half-view → quarter-view), windows need to scale proportionally while maintaining their relative size and position. However, this created several issues:

1. **Rapid Resizing**: Windows would rapidly resize between sizes during transitions
2. **Size Corruption**: `fullscreenLayout` would be overwritten with scaled sizes
3. **Race Conditions**: Multiple useEffects would conflict during transitions

### The Solution

**Three-Part System**:

1. **Fullscreen Layout Tracking**: Separate state that stores the "true" fullscreen size
2. **Proportional Scaling Calculations**: Scale from fullscreen layout, not current size
3. **Restoration Flag**: Prevents layout corruption during transitions

### Implementation

**Location**: Lines 7051-7112 (initialization), 7114-7204 (proportional scaling), 7206-7242 (quadrant mode)

#### Fullscreen Layout State

```javascript
const [fullscreenLayout, setFullscreenLayout] = useState({
  mainPlayer: { x: 0, y: 0, width: 0, height: 0 },
  floatingWindow: { x: 0, y: 0, width: 0, height: 0 }
});
```

This state stores the "canonical" fullscreen size. It's only updated when:
- User manually resizes/drags in fullscreen mode
- Window size is clearly fullscreen-sized (not scaled)
- Not during proportional scaling restoration

#### Proportional Scaling (Half View)

```javascript
useEffect(() => {
  if (!showSideMenu) {
    // Fullscreen mode - restore from fullscreenLayout
    if (fullscreenLayout.mainPlayer.width > 0) {
      isRestoringFromProportionalScaling.current = true;
      setMainPlayerWindowSize({
        width: fullscreenLayout.mainPlayer.width,
        height: fullscreenLayout.mainPlayer.height
      });
      setMainPlayerWindowPosition({
        x: fullscreenLayout.mainPlayer.x,
        y: fullscreenLayout.mainPlayer.y
      });
      setTimeout(() => {
        isRestoringFromProportionalScaling.current = false;
      }, 300);
    }
  } else if (!playerQuadrantMode) {
    // Menu open - scale to left half
    const screenWidth = window.innerWidth;
    const screenHeight = window.innerHeight;
    const topMenuHeight = TOP_MENU_HEIGHT; // 105px
    const availableHeight = screenHeight - topMenuHeight;
    const leftHalfWidth = screenWidth / 2;
    
    const scaleFactorX = leftHalfWidth / screenWidth; // 0.5
    const scaleFactorY = availableHeight / screenHeight; // Scale based on available height
    
    if (fullscreenLayout.mainPlayer.width > 0) {
      isRestoringFromProportionalScaling.current = true;
      
      const scaledWidth = fullscreenLayout.mainPlayer.width * scaleFactorX;
      const scaledHeight = fullscreenLayout.mainPlayer.height * scaleFactorY;
      const scaledX = fullscreenLayout.mainPlayer.x * scaleFactorX;
      const scaledY = (fullscreenLayout.mainPlayer.y * scaleFactorY) + topMenuHeight;
      
      setMainPlayerWindowSize({ width: scaledWidth, height: scaledHeight });
      setMainPlayerWindowPosition({ x: scaledX, y: scaledY });
      
      setTimeout(() => {
        isRestoringFromProportionalScaling.current = false;
      }, 100);
    }
  }
}, [showSideMenu, fullscreenLayout, playerQuadrantMode]);
```

#### Quadrant Mode Scaling

```javascript
useEffect(() => {
  if (playerQuadrantMode && showSideMenu && !quarterSplitscreenMode) {
    const screenWidth = window.innerWidth;
    const screenHeight = window.innerHeight;
    const topMenuHeight = TOP_MENU_HEIGHT;
    const availableHeight = screenHeight - topMenuHeight;
    const leftHalfWidth = screenWidth / 2;
    const bottomHalfHeight = availableHeight / 2;
    
    const scaleFactorX = leftHalfWidth / screenWidth; // 0.5
    const scaleFactorY = bottomHalfHeight / screenHeight;
    
    if (fullscreenLayout.mainPlayer.width > 0) {
      const scaledWidth = fullscreenLayout.mainPlayer.width * scaleFactorX;
      const scaledHeight = fullscreenLayout.mainPlayer.height * scaleFactorY;
      const scaledX = fullscreenLayout.mainPlayer.x * scaleFactorX;
      const scaledY = (fullscreenLayout.mainPlayer.y * scaleFactorY) + topMenuHeight + bottomHalfHeight;
      
      setMainPlayerWindowSize({ width: scaledWidth, height: scaledHeight });
      setMainPlayerWindowPosition({ x: scaledX, y: scaledY });
    }
  }
}, [playerQuadrantMode, showSideMenu, fullscreenLayout]);
```

### Key Features

- **Always Scale from Fullscreen Layout**: Never scales from current (potentially scaled) size
- **Restoration Flag**: `isRestoringFromProportionalScaling` prevents layout corruption
- **Available Height Calculation**: Accounts for top menu area (105px) in all calculations
- **Smooth Transitions**: 300ms timeout ensures state updates complete before allowing layout updates

---

## Boundary Constraints

### Top Menu Boundary (105px)

Windows cannot move or resize above the 105px line (top playlist menu area).

**Implementation**:

```javascript
const TOP_MENU_HEIGHT = 105;

// In drag handler
const newPosition = {
  x: mainPlayerWindowPosition.x + deltaX,
  y: Math.max(TOP_MENU_HEIGHT, mainPlayerWindowPosition.y + deltaY)
};

// In resize handler (top edge)
const calculatedY = mainWindowResizeStart.posY + (mainWindowResizeStart.height - newHeight);
newPosition.y = Math.max(TOP_MENU_HEIGHT, calculatedY);
if (calculatedY < TOP_MENU_HEIGHT) {
  // Adjust height to prevent going above boundary
  newSize.height = mainWindowResizeStart.height - (TOP_MENU_HEIGHT - mainWindowResizeStart.posY);
}
```

### Why 105px?

Measured using a visible ruler on the black screen. The top playlist menu (including padding and content) occupies approximately 105px from the top of the screen.

---

## State Management

### State Variables

```javascript
// Window positions and sizes
const [mainPlayerWindowPosition, setMainPlayerWindowPosition] = useState({ x: 0, y: 0 });
const [mainPlayerWindowSize, setMainPlayerWindowSize] = useState({ width: 0, height: 0 });
const [floatingWindowPosition, setFloatingWindowPosition] = useState({ x: 100, y: 100 });
const [floatingWindowSize, setFloatingWindowSize] = useState({ width: 400, height: 300 });

// Fullscreen layout tracking (canonical sizes)
const [fullscreenLayout, setFullscreenLayout] = useState({
  mainPlayer: { x: 0, y: 0, width: 0, height: 0 },
  floatingWindow: { x: 0, y: 0, width: 0, height: 0 }
});

// Interaction states
const [isDraggingMainWindow, setIsDraggingMainWindow] = useState(false);
const [isResizingMainWindow, setIsResizingMainWindow] = useState(false);
const [isDraggingWindow, setIsDraggingWindow] = useState(false);
const [isResizingWindow, setIsResizingWindow] = useState(false);

// Resize direction tracking
const [mainWindowResizeDirection, setMainWindowResizeDirection] = useState(null);
const [floatingWindowResizeDirection, setFloatingWindowResizeDirection] = useState(null);

// Drag/resize start positions
const [mainWindowDragStart, setMainWindowDragStart] = useState({ x: 0, y: 0 });
const [mainWindowResizeStart, setMainWindowResizeStart] = useState({ 
  x: 0, y: 0, width: 0, height: 0, posX: 0, posY: 0 
});
const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
const [resizeStart, setResizeStart] = useState({ 
  x: 0, y: 0, width: 0, height: 0, posX: 0, posY: 0 
});

// Transition flags
const isRestoringFromProportionalScaling = useRef(false);
```

### State Flow

1. **User Interaction** → Sets interaction state (`isDraggingMainWindow`, etc.)
2. **useEffect Triggered** → Creates overlay, attaches handlers
3. **Mouse Movement** → Calculates new position/size, updates state
4. **React Re-render** → Window moves/resizes to new state
5. **Interaction End** → Cleans up overlay, resets interaction state

---

## Implementation Details

### Overlay Creation

```javascript
const overlay = document.createElement('div');
overlay.style.cssText = `
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 9999;
  cursor: ${cursorStyle};
  background: transparent;
  pointer-events: all;
`;
document.body.appendChild(overlay);
```

**Key Properties**:
- `position: fixed` - Covers entire viewport
- `z-index: 9999` - Above all content including embed players
- `pointer-events: all` - Captures all mouse events
- `background: transparent` - Invisible to user
- `cursor: grabbing/nwse-resize/etc` - Shows appropriate cursor

### Cleanup

```javascript
return () => {
  overlay.removeEventListener('mousemove', handleMouseMove);
  overlay.removeEventListener('mouseup', handleMouseUp);
  document.removeEventListener('mousemove', handleMouseMove);
  document.removeEventListener('mouseup', handleMouseUp);
  if (document.body.contains(overlay)) {
    document.body.removeChild(overlay);
  }
};
```

**Important**: Always clean up overlay to prevent memory leaks and event listener accumulation.

### Resize Handle UI

```javascript
{/* Top-left corner */}
<div
  className="absolute top-0 left-0 w-4 h-4 bg-gray-600 cursor-nwse-resize z-50"
  onMouseDown={(e) => {
    e.stopPropagation();
    setIsResizingMainWindow(true);
    setMainWindowResizeDirection('nw');
    setMainWindowResizeStart({ /* ... */ });
  }}
  style={{ clipPath: 'polygon(0 0, 100% 0, 0 100%)' }}
/>

{/* Top edge */}
<div
  className="absolute top-0 left-4 right-4 h-2 bg-gray-600 cursor-ns-resize z-50"
  onMouseDown={(e) => {
    e.stopPropagation();
    setIsResizingMainWindow(true);
    setMainWindowResizeDirection('n');
    setMainWindowResizeStart({ /* ... */ });
  }}
/>
```

**8 Handles Total**:
- 4 corners: `top-0 left-0`, `top-0 right-0`, `bottom-0 left-0`, `bottom-0 right-0`
- 4 edges: `top-0 left-4 right-4`, `bottom-0 left-4 right-4`, `left-0 top-4 bottom-4`, `right-0 top-4 bottom-4`

---

## Key Design Decisions

### Why Full-Screen Overlay Instead of Pointer Lock?

1. **User Experience**: Cursor stays visible, no ESC key needed
2. **Browser Compatibility**: No permission prompts or browser-specific issues
3. **Flexibility**: Can show different cursors for different operations
4. **Reliability**: Works consistently across all browsers

### Why Separate Fullscreen Layout State?

1. **Prevents Corruption**: Scaled sizes never overwrite true fullscreen size
2. **Accurate Scaling**: Always scales from known good fullscreen size
3. **Smooth Transitions**: No rapid resizing between modes
4. **User Intent Preservation**: User's manually set fullscreen size is preserved

### Why Restoration Flag?

1. **Race Condition Prevention**: Prevents initialization useEffect from running during restoration
2. **State Stability**: Ensures state updates complete before allowing layout updates
3. **Timing Control**: 300ms timeout allows React to finish reconciliation

### Why 8-Direction Resizing?

1. **User Expectation**: Standard desktop window behavior
2. **Flexibility**: Users can resize from any edge/corner
3. **Professional Feel**: Matches native OS window behavior

### Why Boundary Constraints?

1. **UI Consistency**: Prevents windows from obscuring top menu
2. **User Experience**: Clear visual boundary (105px line)
3. **Layout Integrity**: Ensures windows stay in usable area

---

## Code Locations

### Main Window

- **Drag Handler**: Lines 6985-7049
- **Resize Handler**: Lines 6880-6980
- **Resize Handles**: Lines 7504-7635
- **Window Container**: Lines 7470-7520

### Floating Window

- **Drag Handler**: Lines 6708-6774
- **Resize Handler**: Lines 6777-6860
- **Resize Handles**: Lines 9329-9446
- **Window Container**: Lines 9239-9338

### Proportional Scaling

- **Initialization**: Lines 7051-7112
- **Half View Scaling**: Lines 7114-7204
- **Quadrant Mode Scaling**: Lines 7206-7242

### Constants

- **TOP_MENU_HEIGHT**: Line 900

### State Declarations

- **Window State**: Lines 655-668
- **Fullscreen Layout**: Lines 659-662
- **Interaction States**: Lines 663-668

---

## Future Enhancements

### Potential Improvements

1. **Window Snapping**: Snap windows to edges or corners
2. **Window Minimize/Maximize**: Standard window controls
3. **Multi-Monitor Support**: Handle multiple displays
4. **Window Persistence**: Save window positions/sizes across sessions
5. **Keyboard Shortcuts**: Keyboard controls for window operations
6. **Window Groups**: Group related windows together
7. **Custom Window Themes**: User-customizable window appearance

### Known Limitations

1. **Single Top Menu Boundary**: Currently only enforces top boundary (105px)
2. **No Window Stacking Control**: Can't bring windows to front/back
3. **No Window Minimize**: Windows can only be closed, not minimized
4. **Fixed Minimum Sizes**: Minimum sizes are hardcoded (400×300, 300×200)

---

## Troubleshooting

### Windows Not Dragging/Resizing

1. **Check Overlay Creation**: Verify overlay is being created in useEffect
2. **Check Event Listeners**: Ensure listeners are attached to overlay
3. **Check Z-Index**: Overlay must have z-index 9999
4. **Check State Updates**: Verify state is updating correctly

### Rapid Resizing During Transitions

1. **Check Restoration Flag**: Ensure `isRestoringFromProportionalScaling` is set during restoration
2. **Check Timeout**: Verify 300ms timeout is sufficient for state updates
3. **Check Layout Updates**: Ensure initialization useEffect isn't running during restoration

### Windows Moving Above Top Menu

1. **Check Boundary Constraint**: Verify `Math.max(TOP_MENU_HEIGHT, ...)` is applied
2. **Check TOP_MENU_HEIGHT**: Ensure constant is set to 105
3. **Check Resize Logic**: Verify top edge resizing respects boundary

### Size Corruption

1. **Check Fullscreen Layout**: Ensure `fullscreenLayout` is only updated with fullscreen sizes
2. **Check Size Validation**: Verify size threshold checks (50% width, 40% height)
3. **Check Restoration Flag**: Ensure flag prevents updates during restoration

---

## Conclusion

The window management system provides a robust, user-friendly way to interact with windowed video players. The full-screen overlay approach solves the fundamental problem of mouse event absorption by embed players, enabling smooth dragging and resizing operations.

The proportional scaling system ensures windows maintain their relative sizes across mode transitions, while boundary constraints keep windows in the usable area.

**Status**: ✅ Complete and working. Ready to be shelved and revisited when needed.

---

**Last Updated**: 2025-01-13  
**Author**: AI Assistant  
**Feature Status**: Shelved for Future Use
