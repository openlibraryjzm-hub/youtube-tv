# Manual Rebuild Instructions

Since automated builds aren't working properly, here are the exact commands to run manually:

## Step-by-Step Rebuild

Open a **new Command Prompt or PowerShell window** and run these commands one at a time:

### 1. Navigate to project directory
```cmd
cd c:\Projects\yttv1
```

### 2. Clean old builds (optional but recommended)
```cmd
rmdir /s /q .next
rmdir /s /q dist
```

### 3. Build Next.js app
```cmd
npm run build
```
**Wait for this to complete** - it should take 30-60 seconds and show build progress.

### 4. Verify standalone build has node_modules
```cmd
node scripts/verify-standalone.js
```
This should show:
- ✅ node_modules exists
- ✅ All critical modules present and complete

### 5. Build the installer
```cmd
npx electron-builder --win
```
**This takes 1-2 minutes** - wait for it to complete.

### 6. Verify the installer was rebuilt
```cmd
dir "dist\YouTube TV Setup*.exe"
```
Check the timestamp - it should be **just now**, not 30+ minutes ago.

## Alternative: Use the Batch File

I've created `rebuild-installer.bat` in the project root. You can:

1. **Double-click** `rebuild-installer.bat` in Windows Explorer
2. Or run it from command prompt:
   ```cmd
   cd c:\Projects\yttv1
   rebuild-installer.bat
   ```

## Troubleshooting

If builds complete instantly:
- Make sure you're in the correct directory: `c:\Projects\yttv1`
- Check that `node_modules` exists: `dir node_modules`
- Try running `npm install` first if needed
- Check for error messages in the output

If the installer timestamp doesn't update:
- The build might be cached - delete `dist` folder first
- Check that electron-builder actually ran (you should see build output)
- Verify `.next\standalone\node_modules\next\server.js` exists before building installer

## Expected Output

When running `npm run build`, you should see:
```
> youtube-tv@0.1.0 build
> next build

   ▲ Next.js 14.2.5
   - Local:        http://localhost:3000

 ✓ Linting and checking validity of types
 ✓ Collecting page data
 ✓ Generating static pages (X/X)
 ✓ Finalizing page optimization

Route (app)                              Size     First Load JS
...
```

When running `npx electron-builder --win`, you should see:
```
  • electron-builder  version=26.0.12
  • loaded configuration  file=electron-builder.json
  • packaging       platform=win32 arch=x64
  • building        target=nsis
  ...
  • default        artifact=dist\YouTube TV Setup 0.1.0.exe
```

---

**If you're still having issues**, please share:
1. The output from `npm run build`
2. The output from `node scripts/verify-standalone.js`
3. The output from `npx electron-builder --win`




