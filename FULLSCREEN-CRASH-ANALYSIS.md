# Fullscreen Crash Analysis - YouTube Player + React Conflict

## The Core Problem

**Error:** `NotFoundError: Failed to execute 'removeChild' on 'Node': The node to be removed is not a child of this node.`

### Why This Happens

1. **YouTube IFrame API** creates DOM nodes directly (iframes) - bypasses React's virtual DOM
2. **React's Reconciliation** tries to manage these nodes when components unmount
3. **Conditional Rendering** (`{condition && <Component />}`) causes React to unmount components
4. **When unmounting**, React tries to remove all child nodes from the container
5. **Conflict occurs** because:
   - YouTube player may have already removed/moved nodes
   - React expects nodes in certain positions
   - The iframe might not be where React thinks it is

### Why It's Hard to Fix

- **Timing issues**: React's unmount happens asynchronously, YouTube API cleanup happens at different times
- **State changes trigger unmounts**: When `quarterSplitscreenMode` or `secondaryPlayerVideoId` changes, React unmounts components
- **Multiple cleanup paths**: Both React and YouTube API try to clean up the same DOM nodes
- **useLayoutEffect helps but doesn't solve**: Even synchronous cleanup can't prevent React from trying to unmount

## The Solution: Never Unmount, Only Hide

Instead of conditionally rendering containers with YouTube players, **always render them** but control visibility with CSS.

### Current Problematic Pattern:
```jsx
{quarterSplitscreenMode && secondaryPlayerVideoId && (
  <div ref={secondaryPlayerContainerRef}>...</div>
)}
```

### Fixed Pattern:
```jsx
<div 
  ref={secondaryPlayerContainerRef}
  className={quarterSplitscreenMode && secondaryPlayerVideoId ? '' : 'hidden'}
  style={{ display: quarterSplitscreenMode && secondaryPlayerVideoId ? 'block' : 'none' }}
>
  ...
</div>
```

## Implementation Strategy

1. **Always render** all player containers (primary and secondary)
2. **Control visibility** with CSS classes (`hidden`, `opacity-0`, `pointer-events-none`)
3. **Never conditionally unmount** containers that have YouTube players
4. **Keep refs stable** - they should always point to the same DOM nodes

## Benefits

- React never tries to unmount containers with YouTube players
- YouTube API can manage its own cleanup without React interference
- No more "removeChild" errors
- Smoother transitions (containers stay in DOM)

## Trade-offs

- Slightly more DOM nodes (but they're hidden, minimal performance impact)
- Need to ensure containers are properly positioned when hidden
- Need to handle initialization only when visible

## Current Implementation Status

**Problem:** The right side container was conditionally rendered with `{showSideMenu && (`, causing React to unmount it when entering fullscreen.

**Fix Applied:**
1. Right side container now always renders (just hides with `w-0` when menu is closed)
2. Secondary player containers always render (both left and right versions)
3. Ref conditionally attaches to whichever container is visible

**Final Fix Applied:**
1. Secondary player container moved to ROOT LEVEL of component return
2. Container ALWAYS renders with NO CONDITIONS (permanent in DOM)
3. Position controlled with CSS (left side or right side)
4. Visibility controlled with `hidden` class + `display: none` + `opacity: 0` + `pointer-events-none`
5. Ref always attached to same container (never moves, never unmounts)
6. Right side container always renders (just hides with `w-0`)
7. z-index set to -1 when hidden to ensure it doesn't interfere

**Why This Should Work:**
- React NEVER tries to unmount the secondary player container (it's permanent in DOM)
- Ref stays stable (always points to same DOM node, never changes)
- YouTube API can manage its own cleanup without React interference
- Entering fullscreen just hides the container with CSS, doesn't unmount it
- No conditional rendering means React never tries to remove it

**Latest Fix:**
1. Secondary player cleanup useEffect now checks for fullscreen mode
2. If in fullscreen, cleanup is skipped entirely
3. Side menu close handler also checks for fullscreen before closing quarter mode
4. Container always renders, cleanup only happens when NOT in fullscreen

**If Still Crashing:**
The issue might be that the quarter splitscreen conditional `{quarterSplitscreenMode ? (` is causing React to unmount the entire left side section when quarter mode closes. We may need to always render that section too, or use React Portals to completely isolate YouTube players from React's reconciliation.
