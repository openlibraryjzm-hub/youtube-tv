# Import Guide: Radial Menu 3 → Main Project

This guide explains how to import the Radial Menu 3 animated menu system into your main Next.js/React/Tauri project.

---

## 📋 Pre-Import Checklist

### ✅ Files You Need to Copy

1. **Component Files**:
   - `components/ElementEditor.tsx` - The main menu component with all animation logic
   - `components/FaceMaker.tsx` - (Optional) If you want the face maker tool
   - `components/LetterEditor.tsx` - (Optional) If you want the letter editor tool

2. **Configuration Files**:
   - `public/dictionary.json` - Your letter template definitions
   - `container-config.json` - Your exported container configuration (from ElementEditor)

3. **Type Definitions** (if not already present):
   - All TypeScript interfaces are defined within the components themselves

### ✅ Dependencies to Install

```bash
npm install gsap perspective-transform
# or
yarn add gsap perspective-transform
# or
pnpm add gsap perspective-transform
```

**Required Versions**:
- `gsap`: `^3.14.2` or higher
- `perspective-transform`: `^1.1.3` or higher

### ✅ Project Requirements

Your main project must have:
- **Next.js** (App Router or Pages Router - both work)
- **React** 18+
- **TypeScript** (recommended, but can be converted to JavaScript)
- **Canvas API support** (browser environment)

---

## 🚀 Step-by-Step Import Process

### Step 1: Install Dependencies

In your main project root:

```bash
npm install gsap perspective-transform
```

### Step 2: Copy Component File

Copy `components/ElementEditor.tsx` to your main project's components directory:

```
your-main-project/
└── components/
    └── ElementEditor.tsx  ← Copy here
```

### Step 3: Copy Dictionary File

Copy your `dictionary.json` to the `public` folder:

```
your-main-project/
└── public/
    └── dictionary.json  ← Copy here
```

**Note**: The component loads the dictionary from `/dictionary.json` at runtime, so it must be in the `public` folder.

### Step 4: Copy Container Configuration

Copy your exported `container-config.json` file. You can either:

**Option A**: Store it in `public/` and load it programmatically
**Option B**: Import it directly as a JSON module
**Option C**: Store it in your SQLite database and load it on demand

### Step 5: Create a Route/Page

Create a page to use the ElementEditor component:

**For Next.js App Router** (`app/menu/page.tsx`):
```typescript
import ElementEditor from '@/components/ElementEditor'

export default function MenuPage() {
  return <ElementEditor />
}
```

**For Next.js Pages Router** (`pages/menu.tsx`):
```typescript
import ElementEditor from '@/components/ElementEditor'

export default function MenuPage() {
  return <ElementEditor />
}
```

**For Tauri + React** (`src/pages/Menu.tsx`):
```typescript
import ElementEditor from '../components/ElementEditor'

export default function Menu() {
  return <ElementEditor />
}
```

### Step 6: Import Container Configuration (Optional)

If you want to load a saved container configuration, you can modify the component or create a wrapper:

```typescript
import { useState, useEffect } from 'react'
import ElementEditor from '@/components/ElementEditor'
import containerConfig from '@/public/container-config.json'

export default function MenuPage() {
  // If you want to pre-load a configuration
  // You'll need to modify ElementEditor to accept initial props
  return <ElementEditor />
}
```

---

## 🔧 Integration with SQLite Database

Since your main project uses SQLite, you can:

### Option 1: Store Configurations in Database

1. Create a table for menu configurations:
```sql
CREATE TABLE menu_configurations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  config_json TEXT NOT NULL,  -- Store container-config.json as JSON string
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

2. Load configuration from database:
```typescript
// In your page component
useEffect(() => {
  // Load from SQLite
  const config = await loadMenuConfigFromDB(configId)
  // Pass to ElementEditor or modify component to accept initial config
}, [])
```

### Option 2: Store Dictionary in Database

Similarly, you can store dictionary.json in the database and load it dynamically.

---

## 📦 What Gets Imported

### Core Functionality
- ✅ Container-based menu system
- ✅ Perspective text warping
- ✅ GSAP morphing animations
- ✅ Scroll wheel controls
- ✅ Viewport clipping
- ✅ Wrap-around animations
- ✅ Teleport containers
- ✅ Export/Import configuration
- ✅ Dictionary upload

### Dependencies
- ✅ All logic is self-contained in `ElementEditor.tsx`
- ✅ No external utility files needed
- ✅ All types/interfaces defined in component

### Assets
- ✅ `dictionary.json` - Letter templates
- ✅ `container-config.json` - Your menu layout

---

## 🎨 Styling Considerations

The component uses **inline styles** exclusively, so:
- ✅ No CSS files needed
- ✅ No global style conflicts
- ✅ Fully self-contained styling
- ✅ Easy to customize by modifying inline styles

If you want to use your project's design system, you can:
1. Replace inline styles with CSS modules
2. Use Tailwind classes (requires refactoring)
3. Keep inline styles for isolation

---

## 🔍 Key Interfaces & Types

All types are defined in `ElementEditor.tsx`. Key interfaces:

```typescript
interface Point {
  x: number
  y: number
}

interface Container {
  id: string
  name: string
  points: Point[]
  color: string
  contentColor: string
  aboveContainerId: string | null
  belowContainerId: string | null
  aboveTeleportContainerId: string | null
  belowTeleportContainerId: string | null
  teleportType: 'top' | 'bottom' | null
}

interface ContentElement {
  id: string
  containerId: string
  text: string
  color: string
  points: Point[]
  opacity: number
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

## 🐛 Troubleshooting

### Issue: "Module not found: gsap"
**Solution**: Run `npm install gsap`

### Issue: "Module not found: perspective-transform"
**Solution**: Run `npm install perspective-transform`

### Issue: Dictionary not loading
**Solution**: Ensure `dictionary.json` is in the `public/` folder and accessible at `/dictionary.json`

### Issue: Canvas not rendering
**Solution**: Ensure you're in a browser environment (not SSR). The component uses `'use client'` directive.

### Issue: TypeScript errors
**Solution**: Ensure you have `@types/react` and `@types/react-dom` installed

---

## 📝 Customization Options

### Modify Canvas Size
In `ElementEditor.tsx`, find:
```typescript
const canvasWidth = 1200
const canvasHeight = 1000
```

### Change Default Colors
Find:
```typescript
const [defaultColor, setDefaultColor] = useState<string>('#1a1a1a')
```

### Adjust Animation Speed
In the `animateDirection` function, modify:
```typescript
const minDuration = 0.2
const maxDuration = 2
```

### Modify Scroll Sensitivity
In `handleWheel`, adjust:
```typescript
const throttleTime = 1100 // milliseconds
```

---

## 🔐 Security Considerations

- ✅ All processing is client-side
- ✅ No external API calls
- ✅ Dictionary files are static JSON (validate before loading)
- ✅ Container configs are user-generated (validate JSON structure)

---

## 📚 Additional Resources

- **GSAP Documentation**: https://greensock.com/docs/
- **perspective-transform**: https://www.npmjs.com/package/perspective-transform
- **Canvas API**: https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API

---

## ✅ Final Checklist

Before deploying:

- [ ] Dependencies installed (`gsap`, `perspective-transform`)
- [ ] `ElementEditor.tsx` copied to components folder
- [ ] `dictionary.json` in `public/` folder
- [ ] Container configuration exported and saved
- [ ] Route/page created to render component
- [ ] Tested in development environment
- [ ] Tested scroll wheel controls
- [ ] Tested export/import functionality
- [ ] Verified dictionary upload works
- [ ] Checked for TypeScript errors
- [ ] Tested in Tauri app (if applicable)

---

## 🎉 You're Ready!

Once all steps are complete, your animated menu should work perfectly in your main project. The component is fully self-contained and requires no additional setup beyond the dependencies and files listed above.

