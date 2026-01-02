# Integration Start: Unified Frontend → YouTube TV

## Current Understanding

### PlayerController Structure
- **Left Menu**: Playlist navigation (replaces top playlist menu)
  - Playlist prev/next navigation
  - Playlist tabs (with preview images)
  - Playlist info display
  - Alt navigation (up/down)
  
- **Center**: Orb menu (NEW - not in current app)
  - Circular orb with playlist image
  - 8 buttons around orb (Editor, Search, Menu, Spill, Channel, Config, History, Clipping)
  - Image upload capability
  - Spill effects (quadrant spillover)
  
- **Right Menu**: Video navigation (replaces top video menu)
  - Video title and metadata
  - Video prev/next navigation
  - Mode switcher (1/2 toggle)
  - Shuffle, Grid, Star, Like buttons
  - Pins system
  - Alt navigation (up/down)

### UnifiedPanel Structure
- **NavBar**: Icon-based navigation (permanently in right side menu)
  - Menu items: Playlist, Video, Main, Content, Creative, Support, Settings, History
  - View mode toggles: Full, Half, Quarter
  - Should be permanently visible in right splitscreen

### Integration Plan

#### Phase 1: Dependencies & Setup
1. Check/update `lucide-react` (current: ^0.441.0, unified needs: ^0.562.0)
2. Check Tailwind compatibility (current: ^3.4.10, unified needs: ^4.1.18)
3. Create wrapper components to connect placeholder UI to real data

#### Phase 2: PlayerController Integration
1. Replace top menu area (lines ~9921-10120 in page.jsx) with PlayerController
2. Connect PlayerController props to existing state:
   - `playlists` → playlist data
   - `currentPlaylistIndex` → active playlist
   - `currentVideoIndex` → active video
   - `playlistTabs` → tabs
   - Navigation functions → existing handlers
3. Update TOP_MENU_HEIGHT to match PlayerController height (~176px based on App.jsx)
4. Connect orb buttons to real functionality (search, history, etc.)

#### Phase 3: UnifiedPanel Integration
1. Add UnifiedPanel to right side menu area (permanently visible)
2. Connect menu items to existing functionality:
   - Content → DataNavigator (replace side menu)
   - Creative → CreativeMode
   - Support → SupportOrbital
   - Playlist/Video/Main → PlaceholderPages (for now)
   - Settings → Settings page
   - History → Existing history functionality
3. Connect view mode toggles to existing quadrant modes

#### Phase 4: Data Connection
1. Connect DataNavigator to real playlist data (Presets → Tabs → Playlists → Folders)
2. Replace placeholder videos in PlayerController with real video data
3. Connect all buttons/controls to existing handlers

## Next Steps
1. Review PlayerController props/state structure
2. Create adapter/wrapper to connect placeholder to real data
3. Start integration


