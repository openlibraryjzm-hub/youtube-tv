# Final Fix: node_modules in Installer

## The Problem

Electron-builder is **excluding `node_modules`** from the packaged app, even though they exist in the source `.next/standalone` directory.

## The Solution

I've created a **post-build script** that automatically copies `node_modules` from the source to the packaged app **after** electron-builder runs.

### What Changed

1. **Created `scripts/ensure-node-modules-in-package.js`**
   - Runs after electron-builder packages the app
   - Checks if `node_modules` exist in `dist/win-unpacked`
   - If missing, copies them from `.next/standalone/node_modules`
   - Verifies the copy was successful

2. **Updated `package.json`**
   - `electron:build:win` now runs the fix script after packaging

## How To Rebuild

Run these commands:

```bash
cd c:\Projects\yttv1
npm run build
node scripts/verify-standalone.js
npm run electron:build:win
```

The last command will:
1. Build Next.js
2. Verify standalone has node_modules
3. Package with electron-builder
4. **Automatically copy node_modules if missing** ← NEW!

## Verification

After building, check:

```bash
dir "dist\win-unpacked\resources\app\.next\standalone\node_modules\next\server.js"
```

Or run:
```bash
node scripts/verify-packaged.js
```

## Why This Works

Instead of fighting electron-builder's exclusions, we:
1. Let electron-builder package everything it wants
2. **After** packaging, check if node_modules are missing
3. If missing, copy them from the source
4. This happens **before** the installer is created

This ensures `node_modules` are always in the final package, regardless of electron-builder's behavior.

---

**Now rebuild and the installer should work!** 🎉





