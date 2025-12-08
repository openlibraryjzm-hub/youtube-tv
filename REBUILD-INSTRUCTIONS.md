# Rebuild Instructions - After Fix

## Quick Rebuild

```bash
# Clean previous builds
rm -rf .next dist

# Rebuild everything
npm run dist
```

## What Was Fixed

1. **Missing `node_modules` in standalone** - Now automatically copied if missing
2. **Better error messages** - Electron shows helpful errors if modules are missing
3. **Build verification** - Post-build script ensures everything is correct
4. **Cleanup** - Removes nested builds and database files from standalone

## Verification Steps

After building, verify:

```bash
# Check standalone has node_modules
ls .next/standalone/node_modules/next

# Should show: next module directory exists

# Check no nested dist
ls .next/standalone/dist
# Should show: No such file or directory

# Check no database in standalone
ls .next/standalone/youtube-tv.db
# Should show: No such file or directory
```

## If Build Fails

1. **Check Node.js version**: `node --version` (should be 18+)
2. **Reinstall dependencies**: `rm -rf node_modules && npm install`
3. **Check Next.js version**: `npm list next` (should be ^14.2.5)
4. **Clean build**: `rm -rf .next dist && npm run dist`

## Testing the Installer

1. Build: `npm run dist`
2. Installer location: `dist/YouTube TV Setup 0.1.0.exe`
3. Install the app
4. Launch - should start without "Cannot find module 'next'" error
5. Database will be created in: `%APPDATA%\Roaming\youtube-tv\youtube-tv.db`

## Expected Behavior

✅ App launches successfully  
✅ No "Cannot find module" errors  
✅ Database created in AppData (not Program Files)  
✅ Server starts on localhost:3000  
✅ Electron window loads the app  

---

**Note**: The first build after these changes may take longer as it verifies and copies node_modules.
