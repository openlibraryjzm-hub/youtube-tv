# Frontend Integration Plan: Unified Design → YouTube TV

## Overview
Integrating the unified frontend redesign (Aero-Pastel aesthetic) into the YouTube TV app, replacing the current top menu system with PlayerController.jsx and integrating other unified components.

## Current State Analysis

### What Needs to Be Replaced
1. **Top Playlist Menu** (lines ~9923-10056 in `app/page.jsx`)
   - Playlist navigation (prev/next)
   - Playlist tabs (All, custom tabs)
   - Grid view toggle
   - Quadrant mode toggle
   - ~300px wide, positioned top-left-center

2. **Top Video Menu** (lines ~10058-10120 in `app/page.jsx`)
   - Video navigation (prev/next)
   - Video title display
   - Search, grid, history buttons
   - Filter/shuffle controls
   - ~480px wide, positioned top-center

3. **TOP_MENU_HEIGHT constant** (105px)
   - Used throughout for window positioning
   - Needs to be updated to match PlayerController height

### What Must Be Preserved
1. **Backend Integration**
   - Tauri commands (`get_user_data`, `save_user_data`, etc.)
   - SQLite database operations
   - Local file support
   - Progress tracking

2. **Core Functionality**
   - Playlist management (import/export, colored folders)
   - Video playback (YouTube IFrame API)
   - Window management (draggable/resizable windows)
   - Side menus (playlists, videos, search, history)
   - Quadrant modes
   - Radial menu (if still needed)

3. **State Management**
   - All existing state variables
   - Playlist/video selection logic
   - Filter/shuffle systems
   - Tab memory

## Integration Steps

### Phase 1: Setup & Dependencies
1. **Copy unified components** to `app/components/unified/`:
   - `PlayerController.jsx` (HIGH PRIORITY)
   - `UnifiedPanel.jsx` (integration wrapper)
   - `DataNavigator.jsx` (if replacing side menu)
   - `SupportOrbital.jsx` (if using)
   - `CreativeMode.jsx` (if using)
   - `PlaceholderPage.jsx` (template)

2. **Verify dependencies** in `package.json`:
   ```json
   {
     "lucide-react": "^0.562.0",
     "tailwindcss": "^4.1.18",
     "@tailwindcss/postcss": "^4.1.18"
   }
   ```
   - Check if versions need updating
   - Current app uses `lucide-react ^0.441.0` - may need upgrade

3. **Check Tailwind config** compatibility
   - Unified uses Tailwind v4.1.18
   - Current app may use different version
   - May need to update or configure both

### Phase 2: PlayerController Integration
1. **Replace top menu area** (lines ~9921-10120)
   - Remove existing top playlist menu
   - Remove existing top video menu
   - Add PlayerController component

2. **Connect PlayerController to existing state**:
   - Map `playlists` state → PlayerController props
   - Map `currentPlaylistIndex` → active playlist
   - Map `currentVideoIndex` → active video
   - Map playlist tabs → PlayerController tabs
   - Connect navigation functions (`goToPreviousPlaylist`, `goToNextPlaylist`, etc.)

3. **Update TOP_MENU_HEIGHT**:
   - Measure PlayerController actual height
   - Update constant throughout app
   - Update window positioning logic

4. **Preserve functionality**:
   - Playlist navigation
   - Video navigation
   - Tab switching
   - Grid view toggle
   - Search/history buttons
   - Filter/shuffle controls
   - Quadrant mode toggles

### Phase 3: UnifiedPanel Integration (Optional)
If integrating other unified components:
1. **Create container refs** for half/quarter views
2. **Integrate UnifiedPanel** in appropriate areas
3. **Connect state** for view modes and tabs

### Phase 4: Styling & Polish
1. **Aero-Pastel theme**:
   - Primary: `#f0f9ff` (Light Blue)
   - White: `#ffffff`
   - Accent: `#0ea5e9` (Sky Blue)
   - Soft shadows, radial backgrounds

2. **Z-index management**:
   - PlayerController: z-50
   - NavBar: z-[60]
   - Modals: z-[100]
   - Ensure no conflicts with existing z-index values

3. **Responsive adjustments**:
   - Ensure PlayerController works in all view modes
   - Test with windowed player
   - Test with quadrant modes

## Questions for User

1. **PlayerController Functionality**:
   - Does PlayerController have all the features of current top menus?
   - What features need to be added/adapted?
   - Should we keep the side menus or replace with DataNavigator?

2. **State Management**:
   - Should PlayerController use existing state directly?
   - Or should we create adapters/wrappers?
   - How to handle state synchronization?

3. **Backend Integration**:
   - Does PlayerController need Tauri command integration?
   - Or will it work with props/callbacks from main app?

4. **Other Components**:
   - Should we integrate DataNavigator, SupportOrbital, CreativeMode?
   - Or just focus on PlayerController for now?

5. **Migration Strategy**:
   - Big bang replacement or gradual migration?
   - Keep old code commented for rollback?

## File Structure After Integration

```
app/
├── components/
│   ├── unified/
│   │   ├── PlayerController.jsx
│   │   ├── UnifiedPanel.jsx
│   │   ├── DataNavigator.jsx
│   │   ├── SupportOrbital.jsx
│   │   ├── CreativeMode.jsx
│   │   └── PlaceholderPage.jsx
│   ├── PlayerAreaMapper.jsx (existing)
│   └── RadialMenu.jsx (existing)
└── page.jsx (modified - top menu replaced)
```

## Testing Checklist

After integration:
- [ ] PlayerController renders at top
- [ ] Playlist navigation works
- [ ] Video navigation works
- [ ] Tab switching works
- [ ] All buttons/controls functional
- [ ] Window positioning accounts for new menu height
- [ ] No z-index conflicts
- [ ] Styling matches Aero-Pastel theme
- [ ] Backend integration still works
- [ ] Side menus still work (if kept)
- [ ] Quadrant modes still work

## Next Steps

1. **User provides PlayerController.jsx** and other unified components
2. **Review PlayerController** to understand its API/props
3. **Create integration branch** or backup current code
4. **Start with PlayerController** replacement
5. **Test thoroughly** before moving to other components


