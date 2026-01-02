# YouTube TV - Project Summary

## What Is This App?

**YouTube TV** is a desktop application that transforms YouTube playlists into a Netflix-like, lean-back viewing experience. Instead of browsing YouTube's website, users get a dedicated desktop app that makes watching YouTube playlists feel like watching a streaming service.

## User Experience

### Main Interface
- **Full-screen YouTube player** on the left side
- **Splitscreen menu** on the right side showing playlists and videos
- Clean, focused interface designed for watching, not browsing

### Core Features

1. **Playlist Management**
   - Import YouTube playlists by ID
   - Organize videos into colored folders within playlists (red, green, blue, etc.)
   - Create custom tabs to group multiple playlists together
   - Import/export playlists and tabs as JSON files

2. **Video Organization**
   - Tag videos with colors to organize them into folders
   - Star/favorite videos
   - Track watch progress (resume where you left off)
   - Shuffle playlists with different orders each session

3. **Viewing Modes**
   - **Fullscreen mode**: Player takes up full screen
   - **Splitscreen mode**: Player on left, menu on right
   - **Quadrant mode**: Player in lower-left quadrant with menu overlay
   - **Windowed mode**: Draggable, resizable player window

4. **Local Video Support**
   - Play local video files (.mp4, .webm) alongside YouTube videos
   - Add videos by selecting folders or individual files
   - Seamlessly integrated with YouTube playlists

5. **Data Management**
   - All data stored locally (SQLite database)
   - No cloud account required
   - First launch includes 20+ default playlists with 20,000+ videos
   - Progress tracking, custom colors, and organization all saved locally

### Key User Benefits

- **Netflix-like experience**: Lean back and watch, no endless scrolling
- **Offline-first**: All metadata cached locally (titles, thumbnails, etc.)
- **Privacy-focused**: No cloud sync, everything stays on your machine
- **Zero dependencies**: Standalone Windows app, no Node.js or other tools needed
- **Customizable**: Organize videos your way with colored folders and tabs

## Technical Overview

- **Platform**: Windows desktop application
- **Frontend**: Next.js (React) - single-page application
- **Backend**: Tauri (Rust) - provides desktop integration and local database
- **Database**: SQLite - stores playlists, videos, progress, settings locally
- **APIs Used**: YouTube Data API v3 (for fetching playlist data), YouTube IFrame Player API (for playback)
- **Build**: Creates standalone Windows installer (.exe) - no dependencies for end users

## Current Status

✅ **Production Ready** - Fully functional desktop application
- All core features working
- Local database persistence
- Standalone installer
- Zero runtime dependencies

## Development Status

The app is actively developed with ongoing work on:
- Radial menu integration for playlist navigation
- Player area mapping tools
- UI/UX improvements

---

*This is a user-focused summary. For technical details, see `AI-ONBOARDING-PROMPT.md` and `PROJECT-MASTER-DOCUMENTATION.md`.*









