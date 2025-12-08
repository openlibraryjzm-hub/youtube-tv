# 🎉 Build Victory Documentation - Electron + Next.js Standalone

## Overview
This document chronicles the complete journey from a broken Electron installer to a fully functional desktop application. It serves as both a celebration of our success and a technical reference for future builds.

**Date Completed:** December 2024  
**Final Status:** ✅ **WORKING** - App launches, serves static files, persists data correctly

---

## The Challenge

### Initial Problem
The Electron app was packaged but failed to launch with critical errors:
1. **Module Resolution Error:** `Error: Cannot find module 'next'`
2. **Static Files 404:** All JavaScript and CSS chunks returning 404 errors
3. **Infinite Loading:** App stuck on "YouTube TV setting up your configuration"

### Root Causes Identified
1. Next.js standalone build missing `node_modules` directory
2. Static files not being packaged correctly
3. Static files in wrong location (Next.js expects them inside `standalone/.next/static`)
4. Electron-builder excluding `node_modules` by default

---

## The Journey: Challenges & Solutions

### Challenge 1: Missing `node_modules` in Standalone Build

**Problem:**
- Next.js standalone build wasn't including complete `node_modules`
- The `next` module was missing, causing server startup failure

**Solution Implemented:**
1. Created `scripts/verify-standalone.js` - Post-build verification script
2. Created `scripts/ensure-node-modules-in-package.js` - Pre-packaging verification
3. Added `electron-builder-hooks.js` with `afterPack` hook to copy `node_modules` after packaging
4. Updated `package.json` build chain:
   ```json
   "postbuild": "node scripts/verify-standalone.js",
   "prepack:electron": "node scripts/ensure-node-modules-in-package.js",
   "electron:build:win": "npm run build && npm run postbuild && npm run prepack:electron && electron-builder --win"
   ```

**Key Files:**
- `scripts/verify-standalone.js` - Verifies and copies missing node_modules
- `scripts/ensure-node-modules-in-package.js` - Ensures node_modules exist before packaging
- `electron-builder-hooks.js` - Copies node_modules after electron-builder packages

### Challenge 2: Static Files Returning 404 Errors

**Problem:**
- Server was running but couldn't find static files (JS/CSS chunks)
- Files were being copied to wrong location
- Next.js standalone expects static files at `.next/standalone/.next/static`, not `.next/static`

**Solution Implemented:**
1. Updated `electron-builder-hooks.js` to copy static files to correct location:
   ```javascript
   const staticDestInStandalone = path.join(packagedStandalone, '.next', 'static');
   ```
2. Added verification to ensure static files are complete
3. Also copied to backup location for compatibility

**Key Insight:**
According to Next.js documentation, standalone mode requires static files to be manually copied into `.next/standalone/.next/static` - they don't go next to standalone, they go INSIDE it.

### Challenge 3: Electron-Builder Excluding `node_modules`

**Problem:**
- Electron-builder excludes `node_modules` by default when using `extraResources`
- Even with explicit filters, some modules were missing

**Solution Implemented:**
1. Used `afterPack` hook to copy `node_modules` AFTER electron-builder packages but BEFORE installer is created
2. This ensures `node_modules` are in the final package regardless of electron-builder's exclusions
3. Added robust error handling and path resolution

### Challenge 4: Duplicate Variable Declaration

**Problem:**
- Syntax error: `Identifier 'staticPath' has already been declared`
- Caused app to crash on launch

**Solution:**
- Removed duplicate `const staticPath` declaration in `electron/main.js`
- Used existing variable declared earlier in the function

### Challenge 5: Path Resolution Issues

**Problem:**
- `afterPack` hook couldn't determine `appOutDir` and `projectDir`
- Context structure varied between electron-builder versions

**Solution:**
- Added defensive path resolution with multiple fallbacks:
  ```javascript
  const projectDir = (context?.packager?.projectDir || context?.projectDir || process.cwd());
  const appOutDir = (context?.packager?.appOutDir || context?.appOutDir || context?.outDir);
  ```
- Wrapped in try/catch to prevent build failures

---

## Final Working Configuration

### File Structure (Packaged App)
```
YouTube TV/
├── resources/
│   ├── app.asar                    # Main app bundle
│   ├── app/
│   │   └── .next/
│   │       ├── standalone/          # Next.js standalone server
│   │       │   ├── server.js       # Server entry point
│   │       │   ├── node_modules/   # ✅ Complete dependencies
│   │       │   ├── .next/
│   │       │   │   └── static/     # ✅ Static files (CORRECT LOCATION)
│   │       │   └── package.json
│   │       └── static/             # Backup location
│   └── default-channels.json
├── YouTube TV.exe                  # Main executable
└── [other Electron files]
```

### Key Configuration Files

#### `electron-builder.json`
```json
{
  "extraResources": [
    {
      "from": ".next/standalone",
      "to": "app/.next/standalone",
      "filter": ["**/*", "!**/node_modules/.cache/**"]
    },
    {
      "from": ".next/static",
      "to": "app/.next/static"
    }
  ],
  "asarUnpack": [
    "**/node_modules/better-sqlite3/**",
    "**/node_modules/@next/swc-*/**"
  ],
  "afterPack": "./electron-builder-hooks.js"
}
```

#### `electron-builder-hooks.js` (Critical)
- Copies `node_modules` from source to packaged app
- Copies static files to `standalone/.next/static` (correct location)
- Verifies completeness of both
- Runs AFTER electron-builder packages but BEFORE installer creation

#### `electron/main.js`
- Sets `DATABASE_PATH` to user's AppData folder
- Verifies `node_modules` and static files exist before starting server
- Sets `NODE_PATH` environment variable for module resolution
- Spawns Next.js server with correct working directory

#### `next.config.mjs`
```javascript
{
  output: 'standalone',
  images: { unoptimized: true },
  distDir: '.next'
}
```

---

## Build Process (Final Working Version)

### Step-by-Step Build Command
```bash
npm run electron:build:win
```

### What Happens Behind the Scenes

1. **`npm run build`**
   - Next.js builds the app
   - Creates `.next/standalone` directory
   - Creates `.next/static` directory

2. **`npm run postbuild`** (runs `scripts/verify-standalone.js`)
   - Verifies `node_modules` exist in `.next/standalone`
   - Copies missing modules from root `node_modules`
   - Verifies critical modules (`next`, `react`, `react-dom`)
   - Cleans up nested build artifacts

3. **`npm run prepack:electron`** (runs `scripts/ensure-node-modules-in-package.js`)
   - Final check before packaging
   - Ensures `node_modules` are complete
   - Verifies `next/server.js` exists

4. **`electron-builder --win`**
   - Packages app into `dist/win-unpacked`
   - Copies files via `extraResources`
   - Runs `afterPack` hook (`electron-builder-hooks.js`)
     - Copies `node_modules` to packaged app
     - Copies static files to `standalone/.next/static`
     - Verifies everything is complete
   - Creates installer in `dist/` folder

---

## Data Persistence (Verified Working)

### Database Location
- **Windows:** `%APPDATA%\Roaming\youtube-tv\youtube-tv.db`
- **Mac:** `~/Library/Application Support/youtube-tv/youtube-tv.db`
- **Linux:** `~/.config/youtube-tv/youtube-tv.db`

### How It Works
1. Electron main process sets `DATABASE_PATH` environment variable
2. Next.js server reads `DATABASE_PATH` from environment
3. SQLite database created in user's AppData folder
4. Each user has isolated database
5. Data persists across app restarts ✅

### Server Behavior
- Server runs locally on `localhost:3000`
- Only accessible from Electron window
- Shuts down when app closes
- No external server required
- Perfect for distribution ✅

---

## Key Learnings

### 1. Next.js Standalone Static Files Location
**Critical Discovery:** Next.js standalone mode expects static files at `.next/standalone/.next/static`, NOT at `.next/static` next to standalone. This is documented but easy to miss.

### 2. Electron-Builder `afterPack` Hook Timing
The `afterPack` hook runs AFTER electron-builder packages the app but BEFORE the installer is created. This is the perfect place to ensure files are in the correct location.

### 3. Node Modules Must Be Explicitly Copied
Electron-builder excludes `node_modules` by default. You must explicitly copy them in the `afterPack` hook or use `extraResources` with proper filters.

### 4. Verification Scripts Are Essential
Multiple verification points in the build chain catch issues early:
- Post-build verification
- Pre-packaging verification
- Post-packaging verification (afterPack hook)

### 5. Path Resolution Requires Fallbacks
Electron-builder context structure can vary. Always provide fallbacks:
```javascript
const projectDir = context?.packager?.projectDir || context?.projectDir || process.cwd();
```

---

## Testing Checklist (All Passed ✅)

- [x] App launches without errors
- [x] Server starts successfully
- [x] Static files load (no 404 errors)
- [x] App UI renders correctly
- [x] Database created in AppData
- [x] Data persists across app restarts
- [x] Videos can be saved to folders
- [x] Multiple users can use app independently
- [x] No external server required
- [x] Installer works on clean Windows machine

---

## File Sizes (Current)

- **Installer:** ~180MB
- **Installed App:** ~800MB
- **Note:** Optimization opportunities exist but functionality is priority

---

## Distribution

### Installer Location
- `dist/YouTube TV Setup [version].exe`

### Distribution Requirements
- Windows x64
- No additional dependencies needed
- No internet required (except for YouTube video playback)
- Each user gets isolated database

### Distribution Methods
- GitHub Releases (recommended for software)
- WeTransfer (quick sharing, 7-day link)
- MediaFire (permanent link, no account)
- Google Drive / MEGA (requires account)

---

## Future Optimization Opportunities

1. **Reduce Bundle Size**
   - Tree-shake unused dependencies
   - Optimize Next.js build
   - Remove development dependencies from production

2. **Code Splitting**
   - Lazy load components
   - Split vendor bundles

3. **Asset Optimization**
   - Compress static assets
   - Optimize images

4. **Native Module Optimization**
   - Only include necessary native modules
   - Platform-specific builds

---

## Troubleshooting Reference

### If App Won't Launch
1. Check console for error messages
2. Verify `node_modules` exist in `resources/app/.next/standalone/node_modules`
3. Verify static files exist in `resources/app/.next/standalone/.next/static`
4. Check `DATABASE_PATH` is set correctly

### If Static Files 404
1. Verify static files are in `standalone/.next/static` (not just `standalone/../static`)
2. Check `afterPack` hook ran successfully
3. Verify static files were copied correctly

### If Module Not Found
1. Check `NODE_PATH` environment variable
2. Verify `node_modules` are complete
3. Check `next/server.js` exists in `node_modules/next`

---

## Victory Metrics

- **Total Challenges Overcome:** 5 major issues
- **Scripts Created:** 4 verification/copy scripts
- **Hooks Implemented:** 1 critical `afterPack` hook
- **Build Time:** ~5-10 minutes
- **Final Status:** ✅ **FULLY FUNCTIONAL**

---

## Conclusion

This was a complex journey involving:
- Next.js standalone mode intricacies
- Electron-builder packaging quirks
- Module resolution challenges
- Static file path resolution
- Multiple verification layers

The final solution is robust, with multiple checkpoints ensuring the app packages correctly every time. The app is now ready for distribution! 🎉

---

**Document Created:** December 2024  
**Last Updated:** December 2024  
**Status:** Complete and Working ✅
