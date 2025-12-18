# Radial Menu 3 - Complete Project Documentation

## Table of Contents
1. [Project Overview](#project-overview)
2. [Architecture & Structure](#architecture--structure)
3. [Components Breakdown](#components-breakdown)
4. [Data Structures & Interfaces](#data-structures--interfaces)
5. [Key Features & Functionality](#key-features--functionality)
6. [Technical Implementation Details](#technical-implementation-details)
7. [Dependencies & Setup](#dependencies--setup)
8. [File Structure](#file-structure)
9. [Known Issues & Limitations](#known-issues--limitations)
10. [Future Enhancements](#future-enhancements)

---

## Project Overview

**Radial Menu 3** is a Next.js/React web application that implements **Projective Homography** to map letter templates onto custom-defined quadrilateral faces. The project consists of three main modules:

1. **Face Maker** - Main interface for creating custom faces and warping letters onto them
2. **Letter Editor** - Tool for creating and editing SVG letter templates
3. **Elements Editor** - Advanced menu element system with morphing animations

### Core Concept
The application uses **perspective transformation** (homography) to warp 2D letter templates from a standard coordinate system onto user-defined quadrilaterals. This allows letters to be rendered with perspective distortion, creating dynamic text effects.

---

## Architecture & Structure

### Technology Stack
- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **UI Library**: React 18
- **Animation**: GSAP (GreenSock Animation Platform)
- **Math Library**: perspective-transform (for homography calculations)
- **Rendering**: HTML5 Canvas API

### Project Structure
```
radial-menu-3/
├── app/                    # Next.js app directory
│   ├── page.tsx           # Home page (Face Maker)
│   ├── editor/
│   │   └── page.tsx       # Letter Editor route
│   ├── elements/
│   │   └── page.tsx       # Elements Editor route
│   ├── layout.tsx         # Root layout
│   └── globals.css        # Global styles
├── components/            # React components
│   ├── FaceMaker.tsx     # Main face maker component
│   ├── LetterEditor.tsx  # Letter editing component
│   └── ElementEditor.tsx # Elements/animation editor
├── public/
│   └── dictionary.json   # Letter template definitions
├── package.json          # Dependencies
└── tsconfig.json         # TypeScript config
```

---

## Components Breakdown

### 1. FaceMaker Component (`components/FaceMaker.tsx`)

**Purpose**: Main interface for creating custom faces and applying letter transformations.

#### Key Features:
- **Custom Face Creation**: Users can create multiple quadrilateral faces by defining 4 corner points
- **Letter Warping**: Letters from dictionary are warped onto faces using projective homography
- **Image Background**: Upload and resize background images
- **Face Bundles**: Group multiple faces together to type text across them (1 letter per face)
- **Multi-Letter Mode**: Type multiple letters that warp into sub-quadrilaterals within a single face
- **Dictionary Upload**: Upload custom dictionary.json files to change letter definitions

#### State Management:
```typescript
- faces: Face[]                    // Array of custom faces
- selectedFaceId: string           // Currently selected face
- dictionary: Record<string, LetterData>  // Letter templates
- uploadedImage: HTMLImageElement  // Background image
- bundles: FaceBundle[]            // Face groupings
- defaultLetterColor: string      // Default color for new faces
```

#### Key Functions:
- `drawTransformedPath()`: Renders SVG paths with perspective transformation
- `handleMouseDown/Move/Up()`: Vertex point dragging
- `addFace()`: Creates new face with default points
- `removeFace()`: Deletes a face
- `createBundle()`: Groups faces together
- `applyBundleText()`: Renders text across face bundle

#### Canvas Dimensions:
- Width: 1200px
- Height: 1000px

---

### 2. LetterEditor Component (`components/LetterEditor.tsx`)

**Purpose**: Create and edit SVG letter templates for the dictionary.

#### Key Features:
- **Letter Selection**: Choose from existing letters or create new ones
- **SVG Path Editing**: Direct editing of SVG path data
- **Drawing Mode**: Freehand drawing to create letter shapes
- **Point Tracing Mode**: Click points on uploaded images to trace letter outlines
- **Multiple Paths**: Support for complex letters with multiple paths (e.g., O with inner/outer rings)
- **Export Dictionary**: Export all edited letters as dictionary.json

#### State Management:
```typescript
- letters: Record<string, string>  // Letter SVG paths
- selectedLetter: string           // Currently editing letter
- drawingMode: boolean             // Freehand drawing active
- tracingMode: boolean             // Point tracing active
- completedStrokes: string[]       // Multiple drawing strokes
- uploadedImage: HTMLImageElement  // Image for tracing
```

#### Key Functions:
- `drawSvgPath()`: Renders SVG path on canvas
- `finishDrawing()`: Converts drawing strokes to SVG path
- `addTracingPoint()`: Adds point in tracing mode
- `finishTracingPath()`: Converts traced points to SVG path
- `exportDictionary()`: Exports all letters as JSON

#### Canvas Dimensions:
- Width: 1000px
- Height: 1000px
- Letter box: 100x100px centered

---

### 3. ElementEditor Component (`components/ElementEditor.tsx`)

**Purpose**: Create animated menu elements with morphing capabilities.

#### Key Features:
- **Container System**: Define invisible "container" elements that act as position slots
- **Content Elements**: Visible elements that animate between containers
- **Morphing Animation**: Elements morph their shape to match target containers
- **Teleport System**: Instant movement option for elements (no animation)
- **Directional Animation**: Animate elements up or down based on container relationships
- **Wrap-Around Animation**: Seamless transitions from top to bottom and vice versa with fade effects
- **Teleport Containers**: Special invisible containers that hold duplicate elements for smooth wrap-around
- **Viewport Clipping**: Define visible area in animate mode with partial element visibility
- **Color Customization**: Set colors for containers and content elements
- **Drag-and-Drop Reordering**: Reorder containers in sidebar to define animation sequence

#### State Management:
```typescript
- containers: Container[]          // Invisible position slots
- contentElements: ContentElement[] // Visible animated elements
- isAnimateMode: boolean          // Animation mode toggle
- selectedContainerId: string      // Currently selected container
- isAnimating: boolean            // Animation in progress
- animationRefs: Record<string, gsap.core.Tween[]> // GSAP animation refs
- viewportBox: {x, y, width, height} | null  // Visible area in animate mode
- isDraggingViewport: boolean     // Viewport box dragging state
- isResizingViewport: boolean     // Viewport box resizing state
- viewportResizeHandle: 'nw'|'ne'|'sw'|'se' | null  // Active resize handle
```

#### Key Functions:
- `addContainer()`: Creates new container
- `enterAnimateMode()`: Generates content elements from containers and creates duplicates in teleport containers
- `animateDirection()`: Triggers up/down animations with wrap-around support
- `animateContentMorph()`: GSAP-based morphing animation with point-by-point interpolation
- `teleportContentElement()`: Instant element movement (no animation)
- `updateContainerRelationship()`: Sets above/below container links
- `updateContainerTeleport()`: Sets teleport targets for instant movement
- `updateContainerTeleportType()`: Designates container as top/bottom teleport staging area
- `reorderContainers()`: Moves container to new position in menu array (defines animation order)
- `handleContainerDragStart/Over/Drop/End()`: Drag-and-drop handlers for container reordering
- `isPointInViewportBox()`: Checks if point is inside viewport box
- `getViewportResizeHandleAt()`: Detects which resize handle is at mouse position
- Canvas clipping: Uses `ctx.save()`, `ctx.clip()`, and `ctx.restore()` to show only viewport area in animate mode

#### Canvas Dimensions:
- Width: 1200px
- Height: 1000px

---

## Data Structures & Interfaces

### FaceMaker Interfaces

```typescript
interface Point {
  x: number
  y: number
}

interface LetterData {
  guidePoints: {
    TL: [number, number]    // Top-left
    TR: [number, number]    // Top-right
    BR: [number, number]    // Bottom-right
    BL: [number, number]    // Bottom-left
    Center: [number, number] // Center point
  }
  svgPathD: string          // SVG path data
}

interface Face {
  id: string
  points: Point[]           // 4 corner points
  selectedLetter: string | null
  letterColor: string
  text: string              // Multi-letter text
}

interface FaceBundle {
  id: string
  name: string
  faceIds: string[]         // Array of face IDs in bundle
}
```

### LetterEditor Interfaces

```typescript
interface LetterData {
  guidePoints: {
    TL: [number, number]
    TR: [number, number]
    BR: [number, number]
    BL: [number, number]
    Center: [number, number]
  }
  svgPathD: string
}
```

### ElementEditor Interfaces

```typescript
interface Point {
  x: number
  y: number
}

interface Container {
  id: string
  name: string
  points: Point[]                    // 4 corner points
  color: string                      // Container outline color
  contentColor: string               // Color for content element
  aboveContainerId: string | null    // Container above this one
  belowContainerId: string | null    // Container below this one
  aboveTeleportContainerId: string | null  // Teleport target when going up
  belowTeleportContainerId: string | null  // Teleport target when going down
  teleportType: 'top' | 'bottom' | null  // Designates container as teleport staging area
}

interface ContentElement {
  id: string
  containerId: string                // Current container location
  text: string                       // Display text (warped with perspective)
  color: string                      // Element color
  points: Point[]                    // Current shape (animated)
  opacity: number                    // Opacity for fade in/out effects (0-1)
}

interface LetterData {
  guidePoints: {
    TL: [number, number]
    TR: [number, number]
    BR: [number, number]
    BL: [number, number]
    Center: [number, number]
  }
  svgPathD: string
}
```

---

## Key Features & Functionality

### 0. Scroll Wheel Controls (ElementEditor) ⭐ NEW

**Purpose**: Natural, intuitive navigation using mouse scroll wheel.

**How It Works:**
- Scroll wheel events are captured when hovering over the canvas in animate mode
- Scroll UP (negative deltaY) → triggers "Animate Up"
- Scroll DOWN (positive deltaY) → triggers "Animate Down"
- Scroll speed determines animation speed:
  - **Faster scroll** (larger deltaY) = **shorter duration** (faster animation)
  - **Slower scroll** (smaller deltaY) = **longer duration** (slower animation)
- Throttled to prevent rapid overlapping animations (1100ms cooldown)

**Implementation:**
```typescript
const handleWheel = (e: WheelEvent) => {
  if (!isAnimateMode || isAnimating) return
  
  const scrollSpeed = Math.abs(e.deltaY)
  const duration = calculateDurationFromScrollSpeed(scrollSpeed)
  
  if (e.deltaY < 0) {
    animateDirection('up', scrollSpeed)
  } else {
    animateDirection('down', scrollSpeed)
  }
  
  e.preventDefault() // Prevent page scroll
}
```

**Duration Calculation:**
- Maps scroll speed (deltaY magnitude) to animation duration
- Range: 0.2s (very fast scroll) to 2s (very slow scroll)
- Uses inverse relationship: `duration = maxDuration / (1 + speed/maxSpeed)`

**User Experience:**
- Feels natural and responsive
- Scroll speed directly controls animation speed
- Works seamlessly with button controls
- Prevents accidental triggers with throttling

### 1. Projective Homography (FaceMaker)

**How It Works:**
1. Each letter template has guide points (TL, TR, BR, BL, Center) in a 100x100 coordinate system
2. User defines 4 corner points for a custom face
3. `perspective-transform` library calculates the homography matrix
4. SVG path commands are parsed and each coordinate is transformed
5. Transformed path is rendered on canvas

**Implementation:**
```typescript
// Create transform from source (letter guide) to target (face)
const transform = new PerspectiveTransform(
  [sourceTL, sourceTR, sourceBR, sourceBL],
  [targetTL, targetTR, targetBR, targetBL]
)

// Transform each point in SVG path
const [tx, ty] = transform.transform(x, y)
```

**SVG Path Parsing:**
- Supports: M (move), L (line), Z (close), H (horizontal), V (vertical), A (arc), C (cubic bezier)
- Uses `evenodd` fill rule for correct hole rendering (e.g., letter O)
- Handles multiple subpaths (each M command starts new path)

### 2. Face Bundles (FaceMaker)

**Purpose**: Type text across multiple faces, one letter per face.

**Workflow:**
1. Create multiple faces
2. Create a bundle and add face IDs to it
3. Type text in bundle input
4. Letters are distributed: letter[0] → face[0], letter[1] → face[1], etc.

**Implementation:**
- Bundle stores array of face IDs in order
- Text is split character-by-character
- Each character is rendered on corresponding face

### 3. Multi-Letter Text Mode (FaceMaker)

**Purpose**: Type multiple letters that warp into sub-quadrilaterals within a single face.

**How It Works:**
1. User types text (e.g., "HELLO")
2. Face is divided into N sub-quadrilaterals (where N = text length)
3. Each letter is warped into its corresponding sub-quadrilateral
4. Sub-quadrilaterals are calculated by interpolating between face corners

**Sub-Quadrilateral Calculation:**
- For letter at index `i` in text of length `N`:
  - Horizontal interpolation: `i / N` to `(i + 1) / N`
  - Creates 4 corners for sub-quadrilateral
  - Letter is warped into this smaller quadrilateral

### 4. Letter Editor Drawing Modes

**Freehand Drawing:**
- Mouse down: Start new stroke
- Mouse move: Add points to stroke
- Mouse up: Complete stroke
- Multiple strokes can be drawn
- Strokes converted to SVG path commands

**Point Tracing:**
- Upload image
- Click points along letter edges
- Click "Finish Path" to convert points to SVG path
- Supports multiple paths for complex letters

### 5. Element Editor Animation System (Perfected Menu System)

**Status**: ✅ **PRODUCTION READY** - Perfect menu system for integration into main projects.

**Container/Content Architecture:**
- **Containers**: Invisible position slots (dashed outlines, low opacity in animate mode, more visible in edit mode)
- **Content Elements**: Visible elements that animate (solid fill, text, with opacity support)
- **Teleport Containers**: Special containers (`teleportType: 'top' | 'bottom'`) that hold duplicate elements for wrap-around animations

**Animation Flow:**
1. User creates containers and sets relationships (above/below)
2. User designates containers as "Top Teleport Container" or "Bottom Teleport Container" (optional)
3. User enters "Animate Mode"
4. Content elements are auto-generated, one per normal container
5. Duplicate elements are created in teleport containers:
   - **Topmost element** → duplicate in **BOTTOM teleport container** (invisible, opacity: 0)
   - **Bottommost element** → duplicate in **TOP teleport container** (invisible, opacity: 0)
6. User clicks "Animate Up" or "Animate Down"
7. Elements check their current container's relationships
8. Elements either:
   - **Teleport** (if teleport target set) - instant movement
   - **Morph** (if normal target set) - animated shape transformation
   - **Wrap-around** (if at top/bottom) - dual animation with fade effects

**GSAP Animation:**
- Each point in content element is animated individually
- Uses `gsap.to()` with `power2.inOut` easing
- Duration: Variable (0.2s - 2s) based on scroll speed, default 1s for button clicks
- Updates canvas on each frame via `onUpdate` callback
- Supports opacity animation for fade in/out effects
- Animation refs track all active tweens for cleanup

**Teleport vs Morph:**
- **Teleport**: Instant, no animation, used when multiple elements would collide
- **Morph**: Smooth animation, used for normal transitions
- Teleport takes priority if both are set
- Teleport containers are never targets for normal teleport operations (they only act as staging areas)

**Menu Order Navigation:**
- Containers can be dragged up/down in the sidebar to reorder them
- Animation follows menu order: up = move to container above (index-1), down = move to container below (index+1)
- The visual order in the sidebar directly determines animation sequence

**Wrap-Around Animation (Perfected):**
When animating from the topmost or bottommost container:

**Animating UP (from topmost container):**
1. Topmost element fades out while morphing into **TOP teleport container**
2. Simultaneously, duplicate in **BOTTOM teleport container** fades in and morphs into bottommost container
3. After animation, duplicates are updated:
   - New topmost element → duplicate in bottom teleport container
   - New bottommost element → duplicate in top teleport container

**Animating DOWN (from bottommost container):**
1. Bottommost element fades out while morphing into **BOTTOM teleport container**
2. Simultaneously, duplicate in **TOP teleport container** fades in and morphs into topmost container
3. After animation, duplicates are updated to reflect new top/bottom elements

**Key Points:**
- Duplicates are **reversed**: topmost element stored in bottom teleport container, bottommost in top teleport container
- Dual animations run simultaneously using `Promise.all()`
- Fade-in starts at 30% animation progress for smooth transition
- Duplicates are dynamically updated after each wrap-around to always reflect current top/bottom elements

**Teleport Containers:**
- Designated via "Teleport Type" dropdown: "Top Teleport Container" or "Bottom Teleport Container"
- Invisible in both edit and animate mode (except faint outline when selected in edit mode for positioning)
- Never receive elements via normal teleport operations
- Always hold invisible duplicates (opacity: 0) of the opposite end element
- Used exclusively for staging wrap-around animations

**Viewport Box:**
- Defines the visible area in animate mode
- Created/edited in edit mode using "Create Viewport" button in sidebar
- Draggable (click and drag inside box) and resizable (corner handles)
- In animate mode, canvas is clipped to viewport box using `ctx.clip()`
- Elements partially inside viewport show only the visible portion (partial clipping)
- Elements completely outside viewport are hidden
- Viewport box is drawn with red dashed border in edit mode, invisible in animate mode

**Text Input for Containers:**
- In animate mode, select a container to edit its text
- "Type Text (Multiple Letters)" input appears in sidebar
- Text is warped using perspective transform (same as FaceMaker)
- Letters are divided into sub-quadrilaterals for multi-letter text
- Uses the same `drawTransformedPath` function as FaceMaker
- Text persists as elements animate between containers

**Dictionary Upload (ElementEditor):**
- Upload custom `dictionary.json` files to change letter definitions
- Button located at top of sidebar: "Upload Dictionary JSON"
- Validates JSON structure before loading
- Shows success message with letter count
- Immediately applies to all text rendering
- Same functionality as FaceMaker dictionary upload

---

## Technical Implementation Details

### SVG Path Rendering with Evenodd Fill

**Problem**: Letters like O, A, B need holes (inner paths) to render correctly.

**Solution**: Use Canvas `fill('evenodd')` rule:
```typescript
ctx.beginPath()
// Build entire path (outer + inner)
ctx.fill('evenodd')
ctx.stroke()
```

This ensures inner paths create holes instead of being filled.

### Perspective Transform Library Usage

**Installation**: `npm install perspective-transform`

**Usage**:
```typescript
import PerspectiveTransform from 'perspective-transform'

// Create transform instance
const transform = new PerspectiveTransform(
  sourcePoints,  // Array of 4 [x, y] pairs
  targetPoints   // Array of 4 [x, y] pairs
)

// Transform a point
const [tx, ty] = transform.transform(x, y)
```

**Important**: The library exports a constructor, not a direct function.

### Canvas Rendering Optimization

**Redraw Strategy**:
- Single `useEffect` hook handles all drawing
- Dependencies: All state that affects rendering
- Clears canvas on each render
- Draws in layers: background → image → containers → content elements

**Performance Considerations**:
- Canvas redraws on every state change
- GSAP animations trigger frequent redraws via `onUpdate`
- Consider `requestAnimationFrame` throttling for complex scenes

### State Management Patterns

**Local State Only**: No global state management (Redux, Zustand, etc.)
- Each component manages its own state
- Props passed down when needed
- Local storage used for letter persistence (LetterEditor)

**State Updates**:
- Functional updates: `setState(prev => ...)` for array/object updates
- Prevents stale closure issues
- Ensures correct state dependencies

### Dictionary Loading

**Location**: `public/dictionary.json`

**Loading Method**:
```typescript
useEffect(() => {
  fetch('/dictionary.json')
    .then(res => res.json())
    .then(data => {
      const { description, unitSize, ...letters } = data
      setDictionary(letters)
    })
}, [])
```

**Why Fetch Instead of Import**:
- Next.js build-time JSON parsing can fail with large/complex JSON
- Runtime fetch is more reliable
- Allows hot-reloading dictionary without rebuild

### GSAP Animation Management

**Animation Refs**:
```typescript
const animationRefs = useRef<Record<string, gsap.core.Tween[]>>({})
```

**Killing Animations**:
```typescript
if (animationRefs.current[elementId]) {
  animationRefs.current[elementId].forEach(tween => tween.kill())
}
```

**Promise-Based Completion**:
- Each tween has `onComplete` callback
- Count completed tweens
- Resolve promise when all complete
- Enables sequential animations

---

## Dependencies & Setup

### Required Dependencies

```json
{
  "next": "^14.0.0",
  "react": "^18.2.0",
  "react-dom": "^18.2.0",
  "perspective-transform": "^1.1.3",
  "gsap": "^3.14.2"
}
```

### Development Dependencies

```json
{
  "typescript": "^5.0.0",
  "@types/node": "^20.0.0",
  "@types/react": "^18.2.0",
  "@types/react-dom": "^18.2.0"
}
```

### Installation

```bash
npm install
```

### Running the Project

```bash
# Development server
npm run dev

# Production build
npm run build
npm start
```

**Default URL**: `http://localhost:3000`

### Environment Requirements

- Node.js 18+ recommended
- Modern browser with Canvas API support
- No environment variables required

---

## File Structure

### Core Application Files

```
app/
├── page.tsx              # Home page - Face Maker
├── editor/page.tsx       # Letter Editor route
├── elements/page.tsx     # Elements Editor route
├── layout.tsx           # Root layout wrapper
└── globals.css          # Global CSS styles

components/
├── FaceMaker.tsx        # Main face maker (1430 lines)
├── LetterEditor.tsx     # Letter editor (1356 lines)
└── ElementEditor.tsx   # Elements editor (~1300 lines)

public/
└── dictionary.json      # Letter template definitions
```

### Configuration Files

- `package.json` - Dependencies and scripts
- `tsconfig.json` - TypeScript configuration
- `next.config.js` - Next.js configuration

---

## Export/Import Functionality

### Container Configuration Export

**Purpose**: Save your complete menu setup for reuse or sharing.

**What Gets Exported:**
- All containers (with all properties: points, colors, relationships, teleport settings)
- Viewport box configuration
- Default color setting
- Export timestamp

**Export Format:**
```json
{
  "containers": [...],
  "viewportBox": { "x": 200, "y": 200, "width": 800, "height": 600 },
  "defaultColor": "#1a1a1a",
  "exportedAt": "2024-01-01T00:00:00.000Z"
}
```

**Usage:**
1. Configure your containers, relationships, and viewport
2. Click "Export Configuration" button
3. File downloads as `container-config.json`
4. Can be imported later or shared with others

### Container Configuration Import

**Purpose**: Load a previously saved menu configuration.

**How It Works:**
1. Click "Import Configuration" button
2. Select a `container-config.json` file
3. All containers, relationships, and settings are restored
4. First container is automatically selected

**Validation:**
- Checks for valid JSON structure
- Validates containers array exists
- Shows error alert if import fails

**Use Cases:**
- Restore previous menu layouts
- Share menu configurations between projects
- Create menu templates
- Backup/restore functionality

---

## Known Issues & Limitations

### SVG Path Parsing

**Current Limitations**:
- Arc (A) commands use linear approximation (not true elliptical arcs)
- Complex bezier curves may have slight rendering differences
- Some SVG path commands not fully supported (Q, T, S)

**Workaround**: Use simpler paths or convert complex paths to cubic beziers.

### Canvas Performance

**Potential Issues**:
- Frequent redraws during animations may cause lag
- Large number of faces/elements can slow rendering
- Image uploads/resizing can be memory-intensive

**Optimizations Applied**:
- Single drawing function in useEffect
- GSAP handles animation frame timing
- Canvas cleared before each redraw

### Dictionary Format

**Required Structure**:
```json
{
  "A": {
    "guidePoints": {
      "TL": [0, 0],
      "TR": [100, 0],
      "BR": [100, 100],
      "BL": [0, 100],
      "Center": [50, 50]
    },
    "svgPathD": "M 10 90 L 50 10 L 90 90 ..."
  }
}
```

**Validation**: No automatic validation - malformed dictionaries may cause errors.

### Browser Compatibility

**Tested Browsers**:
- Chrome/Edge (Chromium) - Full support
- Firefox - Full support
- Safari - May have minor Canvas API differences

**Required Features**:
- HTML5 Canvas API
- ES6+ JavaScript
- Fetch API
- FileReader API

---

## Future Enhancements

### Potential Improvements

1. **SVG Path Parser Enhancement**
   - True elliptical arc support
   - Better bezier curve handling
   - Support for all SVG path commands

2. **Performance Optimizations**
   - Canvas layer caching
   - RequestAnimationFrame throttling
   - Virtual rendering for large scenes

3. **Export/Import Features**
   - Export face configurations as JSON
   - Import saved face layouts
   - Export animations as video/GIF

4. **Advanced Animation**
   - Custom easing functions
   - Animation timeline/sequencing
   - Keyframe-based animations

5. **UI/UX Improvements**
   - Undo/redo functionality
   - Keyboard shortcuts
   - Touch gesture support for mobile

6. **Letter Editor Enhancements**
   - Bezier curve editing tools
   - Path simplification
   - Auto-trace from images (AI-based)

7. **Element Editor Enhancements**
   - Animation preview/scrubbing
   - Multiple animation sequences
   - Element grouping/hierarchies

---

## Critical Code Sections

### Perspective Transformation (FaceMaker)

**Location**: `components/FaceMaker.tsx`, `drawTransformedPath()` function

**Key Logic**:
```typescript
// Create transform from letter guide to face corners
const transform = new PerspectiveTransform(
  [
    [letterGuide.TL[0], letterGuide.TL[1]],
    [letterGuide.TR[0], letterGuide.TR[1]],
    [letterGuide.BR[0], letterGuide.BR[1]],
    [letterGuide.BL[0], letterGuide.BL[1]]
  ],
  [
    [facePoints[0].x, facePoints[0].y],
    [facePoints[1].x, facePoints[1].y],
    [facePoints[2].x, facePoints[2].y],
    [facePoints[3].x, facePoints[3].y]
  ]
)

// Transform each coordinate in SVG path
const [tx, ty] = transform.transform(x, y)
```

### GSAP Morphing Animation (ElementEditor)

**Location**: `components/ElementEditor.tsx`, `animateContentMorph()` function

**Key Logic**:
```typescript
// Animate each point individually
contentElement.points.forEach((point, index) => {
  const targetPoint = targetContainer.points[index]
  const proxy = { x: point.x, y: point.y }
  
  const tween = gsap.to(proxy, {
    x: targetPoint.x,
    y: targetPoint.y,
    duration: 1,
    ease: 'power2.inOut',
    onUpdate: () => {
      // Update state to trigger canvas redraw
      setContentElements(prev => prev.map(ce => {
        if (ce.id === contentElementId) {
          const newPoints = [...ce.points]
          newPoints[index] = { x: proxy.x, y: proxy.y }
          return { ...ce, points: newPoints }
        }
        return ce
      }))
    }
  })
})
```

### Multi-Letter Sub-Quadrilateral Calculation (FaceMaker)

**Location**: `components/FaceMaker.tsx`, multi-letter text rendering

**Key Logic**:
```typescript
// Divide face into N sub-quadrilaterals
const numLetters = text.length
text.split('').forEach((char, index) => {
  const t1 = index / numLetters
  const t2 = (index + 1) / numLetters
  
  // Interpolate corners
  const subTL = interpolatePoint(facePoints[0], facePoints[1], t1)
  const subTR = interpolatePoint(facePoints[0], facePoints[1], t2)
  const subBR = interpolatePoint(facePoints[3], facePoints[2], t2)
  const subBL = interpolatePoint(facePoints[3], facePoints[2], t1)
  
  // Warp letter into sub-quadrilateral
  warpLetter(char, [subTL, subTR, subBR, subBL])
})
```

---

## Troubleshooting Guide

### Common Issues

**1. Letters not rendering correctly**
- Check dictionary.json format
- Verify guide points are correct
- Ensure SVG path uses valid commands
- Check browser console for errors

**2. Animations not working**
- Verify GSAP is installed: `npm install gsap`
- Check that containers have relationships set
- Ensure in "Animate Mode" before clicking animate buttons
- Check browser console for GSAP errors

**3. Dictionary not loading**
- Verify `public/dictionary.json` exists
- Check file format (valid JSON)
- Ensure fetch URL is correct (`/dictionary.json`)
- Check browser network tab for 404 errors

**4. Canvas not updating**
- Verify state updates are triggering
- Check useEffect dependencies
- Ensure canvas ref is not null
- Check for JavaScript errors in console

**5. Teleports not working**
- Verify teleport targets are set in container dropdowns
- Ensure clicking "Animate Up/Down" (not just entering animate mode)
- Check that element is in container with teleport settings
- Verify teleport target container exists
- Note: Teleport containers (with teleportType set) cannot be teleport targets

**6. Wrap-around animation not smooth**
- Ensure both top and bottom teleport containers are created
- Verify duplicates are being created correctly (check opacity: 0 elements in teleport containers)
- Check that fade-in/fade-out animations are running simultaneously
- Verify duplicates are being updated after each wrap-around animation

---

## Development Notes

### Code Style
- TypeScript strict mode enabled
- Functional components with hooks
- Inline styles (no CSS modules)
- Descriptive variable names
- Comments for complex logic

### State Management Philosophy
- Local state preferred
- Props for parent-child communication
- No global state library
- LocalStorage for persistence (LetterEditor only)

### Testing Considerations
- No automated tests currently
- Manual testing required
- Browser compatibility testing needed
- Performance testing for large scenes

---

## Contact & Maintenance

### Project Status
- Active development
- All three modules functional
- Ready for feature additions

### Key Decisions Made
1. **Canvas over SVG**: Better performance for dynamic rendering
2. **GSAP for animations**: Industry-standard, reliable library
3. **Runtime dictionary loading**: More flexible than build-time
4. **Container/Content separation**: Clean architecture for animations
5. **Teleport system**: Solves collision issues elegantly
6. **Reversed duplicate system**: Topmost element in bottom teleport container ensures correct wrap-around flow
7. **Dual animation with fade effects**: Creates seamless wrap-around transitions
8. **Dynamic duplicate updates**: Ensures teleport containers always hold current top/bottom elements

---

## Appendix: Quick Reference

### Key Functions by Component

**FaceMaker**:
- `drawTransformedPath()` - Render warped letter
- `addFace()` - Create new face
- `createBundle()` - Group faces
- `applyBundleText()` - Render text across bundle

**LetterEditor**:
- `drawSvgPath()` - Render SVG on canvas
- `finishDrawing()` - Convert strokes to SVG
- `exportDictionary()` - Save all letters

**ElementEditor**:
- `enterAnimateMode()` - Generate content elements and create duplicates in teleport containers
- `animateDirection()` - Trigger animations with wrap-around support
- `teleportContentElement()` - Instant movement
- `animateContentMorph()` - GSAP morphing with point-by-point animation
- `updateContainerTeleportType()` - Set container as top/bottom teleport staging area
- `reorderContainers()` - Reorder containers in menu (defines animation sequence)
- `isPointInViewportBox()` - Check viewport bounds
- `getViewportResizeHandleAt()` - Detect resize handle

### Important Constants

- Canvas sizes: 1200x1000px (FaceMaker, ElementEditor), 1000x1000px (LetterEditor)
- Letter template size: 100x100px
- Animation duration: 1 second
- Default colors: '#1a1a1a' (dark gray)

---

**Last Updated**: Menu system perfected - wrap-around animations with teleport containers and reversed duplicates
**Version**: 1.0.0
**Maintainer**: Development team

---

## Wrap-Around Animation Details (Final Implementation)

### Duplicate Creation Logic

When entering animate mode:
1. Normal containers get visible content elements (opacity: 1)
2. **Topmost normal container's element** → duplicate created in **BOTTOM teleport container** (opacity: 0)
3. **Bottommost normal container's element** → duplicate created in **TOP teleport container** (opacity: 0)

### Wrap-Around Animation Sequence

**Animating UP from topmost container:**
```typescript
// 1. Original element fades out while morphing to TOP teleport container
animateContentMorph(topmostElement.id, topTeleportContainer.id)
gsap.to({}, { onUpdate: () => opacity = 1 - progress }) // Fade out

// 2. Simultaneously, duplicate in BOTTOM teleport container fades in and morphs to bottommost
animateContentMorph(bottomTeleportDuplicate.id, bottommostContainer.id)
gsap.to({}, { delay: 0.3, onUpdate: () => opacity = progress }) // Fade in

// 3. After completion:
// - Remove original element (now invisible in top teleport container)
// - Rename duplicate to original ID
// - Update duplicates: new topmost → bottom teleport, new bottommost → top teleport
```

**Animating DOWN from bottommost container:**
```typescript
// 1. Original element fades out while morphing to BOTTOM teleport container
animateContentMorph(bottommostElement.id, bottomTeleportContainer.id)
gsap.to({}, { onUpdate: () => opacity = 1 - progress }) // Fade out

// 2. Simultaneously, duplicate in TOP teleport container fades in and morphs to topmost
animateContentMorph(topTeleportDuplicate.id, topmostContainer.id)
gsap.to({}, { delay: 0.3, onUpdate: () => opacity = progress }) // Fade in

// 3. After completion: same cleanup and duplicate update
```

### Why Reversed Duplicates?

The reversed system ensures:
- When animating UP, the element coming into bottommost container is already a copy of the topmost element (which just left)
- When animating DOWN, the element coming into topmost container is already a copy of the bottommost element (which just left)
- This creates a seamless loop where elements appear to continuously cycle

### Teleport Container Behavior

- **Visibility**: Invisible in both edit and animate mode (except faint outline when selected in edit mode)
- **Purpose**: Staging areas for wrap-around animations only
- **Content**: Always hold invisible duplicates (opacity: 0) of the opposite end element
- **Restrictions**: Cannot be targets for normal teleport operations
- **Updates**: Duplicates are refreshed after each wrap-around animation to match current top/bottom elements

