# Build Fix Summary - Node Modules Issue

## Problem
The Next.js standalone build was missing `node_modules` directory, causing the error:
```
Error: Cannot find module 'next'
```

## Root Cause
Next.js standalone build with `output: 'standalone'` should automatically copy required dependencies to `.next/standalone/node_modules/`, but this wasn't happening consistently.

## Solutions Implemented

### 1. Post-Build Verification Script (`scripts/verify-standalone.js`)
- **Purpose**: Verifies that `node_modules` exists in standalone directory after build
- **Actions**:
  - Checks if `node_modules` exists
  - If missing, copies from root `node_modules` (with smart filtering)
  - Verifies critical modules (`next`, `react`, `react-dom`) exist
  - Cleans up nested build artifacts (`dist/` inside standalone)
  - Removes database file if it exists in standalone (should be in AppData)

### 2. Enhanced Electron Main Process (`electron/main.js`)
- **Added**: Pre-flight checks before spawning server
- **Checks**:
  - Verifies `node_modules` directory exists
  - Verifies `next` module exists
  - Shows helpful error messages if missing
- **Result**: Better error reporting instead of cryptic module errors

### 3. Updated Build Scripts (`package.json`)
- **Added**: `postbuild` script that runs verification
- **Updated**: `electron:build` and `electron:build:win` to run verification before packaging
- **Result**: Automatic verification after every Next.js build

### 4. Updated Electron-Builder Config (`electron-builder.json`)
- **Added**: `asarUnpack` for native modules (`better-sqlite3`, `@next/swc-*`)
- **Result**: Native modules properly unpacked from asar archive

### 5. Updated `.gitignore`
- **Added**: Exclusions for build artifacts:
  - `.next/standalone/dist/` (nested builds)
  - `.next/standalone/youtube-tv.db` (database files)
  - `dist/` (build output)

## How It Works Now

### Build Process:
1. `npm run build` - Builds Next.js app
2. `npm run postbuild` - Verifies standalone has `node_modules`
   - If missing, copies from root
   - Cleans up artifacts
3. `electron-builder` - Packages everything into installer

### Runtime Process:
1. Electron main process starts
2. Sets `DATABASE_PATH` environment variable
3. **NEW**: Verifies `node_modules` exists before spawning server
4. Sets `NODE_PATH` to standalone `node_modules`
5. Spawns Node.js process with correct environment
6. Server starts successfully

## Testing

### To Test the Fix:
```bash
# Clean build
rm -rf .next dist

# Build
npm run dist

# Verify standalone has node_modules
ls .next/standalone/node_modules/next
# Should show next module exists

# Install and test
# Run the installer from dist/
```

### Expected Results:
- ✅ `node_modules` exists in `.next/standalone/`
- ✅ `next` module exists in `.next/standalone/node_modules/next`
- ✅ No nested `dist/` directory in standalone
- ✅ No database file in standalone
- ✅ App starts without "Cannot find module 'next'" error

## Files Modified

1. `package.json` - Added postbuild script
2. `electron-builder.json` - Added asarUnpack for native modules
3. `electron/main.js` - Added pre-flight checks
4. `.gitignore` - Added build artifact exclusions
5. `scripts/verify-standalone.js` - **NEW** - Verification script

## Notes

- The verification script is smart: it only copies what's needed
- It skips unnecessary directories (`.git`, `test`, etc.)
- Database location is already correct (uses AppData via `DATABASE_PATH` env var)
- The fix is backward compatible - works even if Next.js fixes the issue in future versions

## If Issues Persist

1. **Check build logs**: Look for verification script output
2. **Manual verification**: Check `.next/standalone/node_modules/` exists after build
3. **Rebuild clean**: Delete `.next` and `dist`, then rebuild
4. **Check Node.js version**: Ensure using compatible Node.js version
5. **Check Next.js version**: Ensure `next@^14.2.5` is installed

---

**Date**: 2025-01-06  
**Status**: ✅ Fixed - Ready for testing
