# Context Document for Working on Installed YouTube TV App

## Overview
This document provides context for working on the installed YouTube TV desktop application files. The app is built with Electron + Next.js and uses SQLite for local data storage.

## Installation Location
**Windows Default:** `C:\Program Files\YouTube TV\` (or user-selected directory)

## Key File Structure
```
YouTube TV/
├── resources/
│   ├── app.asar                    # Main app bundle (packaged)
│   ├── app/
│   │   └── .next/
│   │       ├── standalone/         # Next.js standalone server
│   │       │   ├── server.js       # Main server entry point
│   │       │   ├── node_modules/   # Dependencies (including 'next')
│   │       │   ├── .next/          # Next.js build output
│   │       │   └── package.json
│   │       └── static/             # Static assets
│   └── default-channels.json       # Default channel template
├── YouTube TV.exe                  # Main executable
└── [other Electron files]
```

## Database Location
**User Data:** `%APPDATA%\Roaming\youtube-tv\youtube-tv.db`
- Each user has their own database
- Database is SQLite (better-sqlite3)
- Contains: users, playlists, custom colors, tabs, video progress

## Current Issue
The Next.js standalone server cannot find the `next` module when starting.

**Error:** `Error: Cannot find module 'next'`

**Root Cause:** Node.js module resolution isn't finding `next` in the standalone `node_modules` directory.

## How the App Starts
1. Electron main process (`YouTube TV.exe`) launches
2. Sets `DATABASE_PATH` environment variable to `%APPDATA%\Roaming\youtube-tv\youtube-tv.db`
3. Spawns Node.js process: `node "C:\Program Files\YouTube TV\resources\app\.next\standalone\server.js"`
4. Server should start on `http://localhost:3000`
5. Electron window loads `http://localhost:3000`

## Environment Variables Set
- `DATABASE_PATH`: Database file path
- `PORT`: 3000
- `NODE_ENV`: production
- `ELECTRON_IS_PACKAGED`: true
- `NODE_PATH`: Should point to `resources/app/.next/standalone/node_modules`

## Key Files to Modify

### 1. Server Startup (if modifying installed files)
**Location:** `resources/app/.next/standalone/server.js`
- This is the Next.js standalone server entry point
- Requires `next` module to be in `node_modules/next`

### 2. Database Path Logic
**Location:** `resources/app.asar` (unpacked: `lib/db.js`)
- Checks `process.env.DATABASE_PATH` first
- Falls back to AppData if packaged
- Creates database and loads default channels on first run

### 3. Default Channels
**Location:** `resources/default-channels.json`
- Contains all default playlists, colors, tabs
- Loaded into database on first user creation

## Testing Changes

### To Test Server Manually:
1. Open terminal in: `C:\Program Files\YouTube TV\resources\app\.next\standalone`
2. Set environment variables:
   ```powershell
   $env:DATABASE_PATH = "$env:APPDATA\Roaming\youtube-tv\youtube-tv.db"
   $env:NODE_PATH = "$PWD\node_modules"
   $env:NODE_ENV = "production"
   $env:PORT = "3000"
   ```
3. Run: `node server.js`
4. Should see: "Ready on http://localhost:3000"

### To Test Full App:
1. Make changes to installed files
2. Restart `YouTube TV.exe`
3. Check if server starts and app loads

## Common Issues & Fixes

### Issue: "Cannot find module 'next'"
**Fix:** Ensure `NODE_PATH` environment variable points to the standalone `node_modules` directory:
```javascript
NODE_PATH: path.join(nextPath, 'node_modules')
```

### Issue: "Cannot find module 'C:\Program'"
**Fix:** Quote paths with spaces when using spawn/exec:
```javascript
const command = `node "${serverPath}"`;
```

### Issue: Server not starting
**Check:**
- `server.js` exists at expected path
- `node_modules/next` exists in standalone directory
- `NODE_PATH` is set correctly
- Port 3000 is not already in use

## Development vs Production

### Development Mode
- Database: `C:\Projects\yttv1\youtube-tv.db` (project root)
- Server: Next.js dev server on `localhost:3000`
- Hot reload: Enabled

### Production Mode (Installed App)
- Database: `%APPDATA%\Roaming\youtube-tv\youtube-tv.db`
- Server: Next.js standalone server spawned by Electron
- No hot reload

## Master Prompt for Cursor Agent

```
You are working on a YouTube TV desktop application built with Electron + Next.js.

CONTEXT:
- The app is installed at: C:\Program Files\YouTube TV\
- Next.js standalone server is at: resources/app/.next/standalone/
- Database is at: %APPDATA%\Roaming\youtube-tv\youtube-tv.db
- The app spawns a Node.js process to run the Next.js server

CURRENT ISSUE:
The Next.js server cannot find the 'next' module when starting. The error is:
"Error: Cannot find module 'next'"

The 'next' module exists at: resources/app/.next/standalone/node_modules/next

TASK:
Fix the module resolution so Node.js can find the 'next' module when the server starts.

APPROACH:
1. Check if NODE_PATH environment variable is set correctly
2. Verify the server.js is being run from the correct directory
3. Ensure node_modules path is accessible
4. Test by manually running: node server.js from the standalone directory

The server should start on http://localhost:3000 and the Electron window should load it.
```

## Important Notes
- The installed app files are read-only by default (in Program Files)
- Changes to installed files will be lost on reinstall
- Better to fix the build process than modify installed files
- The source code is in: `C:\Projects\yttv1\`
- Rebuild installer after fixes: `npm run dist`







