# Fix: node_modules Not Included in Installer

## The Problem

Electron-builder is **excluding `node_modules`** from the `extraResources` even though they exist in the source `.next/standalone` directory.

## Root Cause

Electron-builder has **default file patterns** that exclude `node_modules` directories unless explicitly configured. The `filter: ["**/*"]` wasn't working because electron-builder applies its own exclusions on top of filters.

## Solution

I've made these changes:

1. **Removed the filter** from `extraResources` - let electron-builder copy everything
2. **Created verification script** (`scripts/verify-packaged.js`) to check if node_modules are in the packaged app
3. **Updated build process** to verify after packaging

## What You Need To Do

### Step 1: Verify Source Has node_modules

```bash
cd c:\Projects\yttv1
dir .next\standalone\node_modules\next\server.js
```

If this file doesn't exist, run:
```bash
node scripts/verify-standalone.js
```

### Step 2: Rebuild the Installer

```bash
npm run build
node scripts/verify-standalone.js
npx electron-builder --win
```

### Step 3: Verify node_modules Are in Package

After building, check:
```bash
dir "dist\win-unpacked\resources\app\.next\standalone\node_modules\next\server.js"
```

Or run the verification script:
```bash
node scripts/verify-packaged.js
```

## If node_modules Still Missing

If `node_modules` are still not in the packaged app, electron-builder is actively excluding them. Try this workaround:

### Option 1: Copy node_modules Manually After Build

Create a script that copies node_modules after electron-builder runs but before creating the installer.

### Option 2: Use a Different Packaging Approach

Instead of `extraResources`, we could:
- Copy node_modules to a different location
- Use a custom build script
- Package them separately

### Option 3: Check electron-builder Version

Some versions of electron-builder have bugs with node_modules in extraResources. Try:
```bash
npm list electron-builder
```

If it's an old version, update:
```bash
npm install --save-dev electron-builder@latest
```

## Debugging

To see what electron-builder is actually packaging:

1. **Check the build output** - look for warnings about excluded files
2. **Check `dist/win-unpacked/resources/app/.next/standalone/`** - see what's actually there
3. **Run verification script** - `node scripts/verify-packaged.js`

## Expected Structure After Build

```
dist/win-unpacked/resources/app/.next/standalone/
├── server.js                    ✅
├── package.json                 ✅
├── node_modules/                ✅ MUST EXIST
│   ├── next/                    ✅
│   │   ├── server.js            ✅ MUST EXIST
│   │   ├── index.js             ✅
│   │   └── ...
│   ├── react/                   ✅
│   └── react-dom/               ✅
└── .next/                       ✅
```

If `node_modules` is missing here, electron-builder is excluding it.

---

**Next Steps**: Rebuild and check `dist/win-unpacked` to see if node_modules are now included.




