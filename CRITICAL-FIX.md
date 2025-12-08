# CRITICAL FIX - node_modules Still Missing

## The Real Problem

Even though `node_modules` exist in `.next/standalone`, **electron-builder is excluding them** when copying via `extraResources`. This is a known electron-builder behavior - it excludes `node_modules` by default.

## The Solution

I've updated the script to ensure `node_modules` are in the source BEFORE electron-builder runs, and updated the filter to explicitly include them.

## What Changed

1. **`scripts/ensure-node-modules-in-package.js`** - Now ensures node_modules are in `.next/standalone` BEFORE electron-builder runs
2. **`electron-builder.json`** - Added explicit filter to include node_modules (with some exclusions for cache/git)

## Rebuild Steps

```bash
cd c:\Projects\yttv1
npm run build
node scripts/verify-standalone.js
npm run electron:build:win
```

The `prepack:electron` hook will now:
1. Check if node_modules exist in `.next/standalone`
2. Verify they're complete (has next/server.js, next/index.js)
3. If missing/incomplete, copy from root `node_modules`
4. This happens BEFORE electron-builder packages

## If It Still Doesn't Work

If electron-builder STILL excludes node_modules, we need to use electron-builder's `afterPack` hook to copy them AFTER packaging but the installer creation reads from the packaged files, so we'd need to rebuild the installer.

**Alternative**: Use a custom build script that manually copies node_modules into the final package structure after electron-builder creates `dist/win-unpacked` but before the installer is created.

---

**Try rebuilding now with the updated script.**




