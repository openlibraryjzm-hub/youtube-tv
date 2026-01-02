import React, { useState, useRef } from 'react';
import { 
  Play, 
  Shuffle, 
  Grid3X3, 
  Star, 
  ChevronLeft, 
  ChevronRight,
  ChevronUp, 
  ChevronDown,
  Check, 
  CheckCircle2, 
  X, 
  Settings2, 
  Maximize2, 
  Minimize2,
  Pin, 
  Share2, 
  Info, 
  BarChart2, 
  Bookmark, 
  MoreHorizontal, 
  Heart, 
  ListMusic, 
  Zap, 
  Radio, 
  Flame, 
  Scissors,
  Search,
  Menu as MenuIcon,
  Youtube,
  Upload,
  Palette,
  Clock,
  History as HistoryIcon,
  Layout,
  Settings,
  Layers,
  Compass,
  Library,
  Eye,
  EyeOff,
  RotateCcw,
  ThumbsUp,
  Plus,
  Anchor as AnchorIcon,
  Type,
  MousePointer2,
  ArrowLeftRight,
  Circle,
  Move,
  LayoutGrid
} from 'lucide-react';

const THEMES = {
  blue: {
    name: 'Cool Blue',
    bg: 'from-sky-400 via-sky-200 to-sky-100',
    menuBg: 'bg-sky-100/95',
    menuBorder: 'border-sky-400/40',
    tabActive: 'bg-white text-sky-600', 
    tabInactive: 'bg-sky-200 text-sky-700 border-sky-300', 
    accent: 'text-sky-700',
    accentBg: 'bg-sky-600',
    orbBorder: 'border-sky-500',
    bottomBar: 'bg-sky-200/60 border-sky-300'
  },
  midnight: {
    name: 'Midnight',
    bg: 'from-slate-950 via-slate-900 to-black',
    menuBg: 'bg-slate-900/90',
    menuBorder: 'border-slate-700',
    tabActive: 'bg-white text-slate-900',
    tabInactive: 'bg-slate-800 text-slate-500 border-slate-700',
    accent: 'text-sky-400',
    accentBg: 'bg-sky-500',
    orbBorder: 'border-slate-700',
    bottomBar: 'bg-slate-800/50 border-slate-700'
  }
};

const MODE_1_VIDEOS = [
  { title: "Indie Game Trailers - September 2024", author: "Indie Central", viewers: "125K", verified: true },
  { title: "Lo-fi Hip Hop Radio", author: "Lofi Girl", viewers: "42K", verified: true },
  { title: "Coffee Shop Ambience", author: "Coffee House", viewers: "12K", verified: true },
  { title: "Synthwave Mix 2024", author: "Neon Nights", viewers: "8K", verified: false },
  { title: "Deep Focus: Ambient", author: "The Algorithm", viewers: "15K", verified: true },
];

const MODE_2_VIDEOS = [
  { title: "Gundam Battle Operations #5055", author: "Mech Pilot X", viewers: "4.2K", verified: false },
  { title: "Extreme Overclocking", author: "Tech Titans", viewers: "145K", verified: true },
  { title: "Build a Robot", author: "Mad Inventor", viewers: "89K", verified: true },
  { title: "Warp Drives Physics", author: "Cosmos Explained", viewers: "210K", verified: true },
  { title: "Cooking Wagyu Steak", author: "Meat Master", viewers: "340K", verified: true },
];

const PLAYLISTS = [
  { title: "Summer Favorites Mix 2024", image: "https://picsum.photos/seed/summer/800/600" },
  { title: "Late Night Lo-Fi Beats", image: "https://picsum.photos/seed/lofi/800/600" },
  { title: "High-Energy Tech House", image: "https://picsum.photos/seed/tech/800/600" },
  { title: "Acoustic Morning Melodies", image: "https://picsum.photos/seed/acoustic/800/600" },
  { title: "Cyberpunk Synthwave Core", image: "https://picsum.photos/seed/synth/800/600" },
];

const COLORS = [
  { hex: '#38bdf8', name: 'Sky' }, { hex: '#0ea5e9', name: 'Ocean' }, 
  { hex: '#2563eb', name: 'Blue' }, { hex: '#4f46e5', name: 'Indigo' }, 
  { hex: '#a855f7', name: 'Purple' }, { hex: '#ec4899', name: 'Pink' }, 
  { hex: '#f43f5e', name: 'Rose' }, { hex: '#10b981', name: 'Emerald' }, 
  { hex: '#84cc16', name: 'Lime' }, { hex: '#eab308', name: 'Yellow' }, 
  { hex: '#f97316', name: 'Orange' }, { hex: '#ef4444', name: 'Red' },
  { hex: '#71717a', name: 'Zinc' }, { hex: '#18181b', name: 'Black' }
];

const TAB_GROUPS = {
  primary: [
    { id: 'playlists', label: 'Playlists', icon: ListMusic, previewImg: "https://picsum.photos/seed/playlist_tab/800/600" },
    { id: 'trending', label: 'Trending', icon: Flame, previewImg: "https://picsum.photos/seed/trending_tab/800/600" },
    { id: 'recent', label: 'Recent', icon: HistoryIcon, previewImg: "https://picsum.photos/seed/recent_tab/800/600" },
  ],
  secondary: [
    { id: 'discover', label: 'Discover', icon: Compass, previewImg: "https://picsum.photos/seed/discover_tab/800/600" },
    { id: 'library', label: 'Library', icon: Library, previewImg: "https://picsum.photos/seed/lib_tab/800/600" },
    { id: 'live', label: 'Live', icon: Radio, previewImg: "https://picsum.photos/seed/live_tab/800/600" },
  ]
};

export default function PlayerController({
  // Props from main app (optional - falls back to placeholder data)
  playlists: externalPlaylists = null,
  currentPlaylistIndex: externalPlaylistIndex = null,
  currentVideoIndex: externalVideoIndex = null,
  playlistTabs: externalTabs = null,
  activePlaylistTab: externalActiveTab = null,
  currentVideoTitle: externalVideoTitle = null,
  videoAuthorName: externalAuthor = null,
  videoViewCount: externalViews = null,
  onPlaylistNext = null,
  onPlaylistPrev = null,
  onVideoNext = null,
  onVideoPrev = null,
  onTabChange = null,
  onGridToggle = null,
  onSearchToggle = null,
  onHistoryToggle = null,
  onShuffle = null,
}) {
  const fileInputRef = useRef(null);
  const hoverTimerRef = useRef(null);
  
  // --- UI State ---
  // Use external props if provided, otherwise use internal state
  const [internalVideoIndex, setInternalVideoIndex] = useState(0);
  const [internalPlaylistIndex, setInternalPlaylistIndex] = useState(0);
  const videoIndex = externalVideoIndex !== null ? externalVideoIndex : internalVideoIndex;
  const playlistIndex = externalPlaylistIndex !== null ? externalPlaylistIndex : internalPlaylistIndex;
  
  const [pins, setPins] = useState([]); 
  const [showPins, setShowPins] = useState(true);
  const [previewPinIndex, setPreviewPinIndex] = useState(null);
  const [previewTabImage, setPreviewTabImage] = useState(null);
  const [activePin, setActivePin] = useState(null);
  const [activeLeftPin, setActiveLeftPin] = useState('playlists');
  const [activeHeaderMode, setActiveHeaderMode] = useState('primary'); 
  const [isModeLeft, setIsModeLeft] = useState(true);
  const [playlistCheckpoint, setPlaylistCheckpoint] = useState(null);
  const [videoCheckpoint, setVideoCheckpoint] = useState(null);
  const [showColorPicker, setShowColorPicker] = useState(null);
  const [hoveredColorName, setHoveredColorName] = useState(null);
  const [starColor, setStarColor] = useState('#0ea5e9');
  const [shuffleColor, setShuffleColor] = useState('#6366f1');
  const [likeColor, setLikeColor] = useState('#0ea5e9');
  const [isEditMode, setIsEditMode] = useState(false);
  const [isConfigOnRight, setIsConfigOnRight] = useState(false);
  const [customOrbImage, setCustomOrbImage] = useState(null);
  const [currentThemeId, setCurrentThemeId] = useState('blue');
  const [isAdjustingImage, setIsAdjustingImage] = useState(false);

  // --- Handlers ---
  const handleNextVideo = () => {
    if (onVideoNext) {
      onVideoNext(); // Use external handler if provided
    } else {
      setInternalVideoIndex((prev) => (prev + 1) % 5); // Fallback to internal state
    }
  };
  const handlePrevVideo = () => {
    if (onVideoPrev) {
      onVideoPrev(); // Use external handler if provided
    } else {
      setInternalVideoIndex((prev) => (prev - 1 + 5) % 5); // Fallback to internal state
    }
  };

  const navigateTabs = (dir) => {
    const currentGroup = TAB_GROUPS[activeHeaderMode];
    if (!currentGroup) return;
    const currentIndex = currentGroup.findIndex(tab => tab.id === activeLeftPin);
    let nextIndex = dir === 'next' ? (currentIndex + 1) % currentGroup.length : (currentIndex - 1 + currentGroup.length) % currentGroup.length;
    setActiveLeftPin(currentGroup[nextIndex].id);
  };

  const navigatePlaylist = (dir) => {
    if (dir === 'up' && onPlaylistNext) {
      onPlaylistNext();
    } else if (dir === 'down' && onPlaylistPrev) {
      onPlaylistPrev();
    } else {
      // Fallback to internal state
      setInternalPlaylistIndex(curr => dir === 'up' ? (curr + 1) % PLAYLISTS.length : (curr - 1 + PLAYLISTS.length) % PLAYLISTS.length);
    }
  };

  const handleAltNav = (direction, type) => {
    if (type === 'playlist') {
      if (playlistCheckpoint === null) setPlaylistCheckpoint(playlistIndex);
      if (direction === 'up' && onPlaylistNext) {
        onPlaylistNext();
      } else if (direction === 'down' && onPlaylistPrev) {
        onPlaylistPrev();
      } else {
        setInternalPlaylistIndex(curr => direction === 'up' ? (curr + 1) % PLAYLISTS.length : (curr - 1 + PLAYLISTS.length) % PLAYLISTS.length);
      }
    } else {
      if (videoCheckpoint === null) setVideoCheckpoint(videoIndex);
      if (direction === 'up' && onVideoNext) {
        onVideoNext();
      } else if (direction === 'down' && onVideoPrev) {
        onVideoPrev();
      } else {
        setInternalVideoIndex(curr => direction === 'up' ? (curr + 1) % 5 : (curr - 1 + 5) % 5);
      }
    }
  };

  const handleRevert = (type) => {
    if (type === 'playlist' && playlistCheckpoint !== null) { 
      if (externalPlaylistIndex === null) {
        setInternalPlaylistIndex(playlistCheckpoint);
      }
      setPlaylistCheckpoint(null); 
    }
    else if (type === 'video' && videoCheckpoint !== null) { 
      if (externalVideoIndex === null) {
        setInternalVideoIndex(videoCheckpoint);
      }
      setVideoCheckpoint(null); 
    }
  };

  const handleCommit = (type) => {
    if (type === 'playlist') setPlaylistCheckpoint(null); else setVideoCheckpoint(null);
  };

  const handleToggleHeader = () => {
    setActiveHeaderMode(curr => {
      if (curr === 'primary') return 'secondary';
      if (curr === 'secondary') return 'info';
      return 'primary';
    });
  };

  const handleAddPin = () => {
    const newId = `pin-${Date.now()}`;
    setPins(curr => [...curr, { id: newId, icon: Pin }]);
    setActivePin(newId);
  };

  const handleDeletePin = (e, id) => {
    e.stopPropagation();
    const updated = pins.filter(p => p.id !== id);
    setPins(updated);
    if (activePin === id) {
      setActivePin(updated.length > 0 ? updated[updated.length - 1].id : null);
    }
    setPreviewPinIndex(null);
  };

  const handleRestockPins = () => {
    setPins([]);
    setActivePin(null);
  };

  const handleColorSelect = (hex) => {
    if (showColorPicker === 'star') setStarColor(hex);
    if (showColorPicker === 'shuffle') setShuffleColor(hex);
    if (showColorPicker === 'like') setLikeColor(hex);
    setShowColorPicker(null); setHoveredColorName(null);
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => { setCustomOrbImage(reader.result); setIsAdjustingImage(true); };
      reader.readAsDataURL(file);
    }
  };

  const startPreviewTimer = (callback) => {
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    hoverTimerRef.current = setTimeout(callback, 2000); 
  };

  const clearPreviewTimer = () => {
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    setPreviewPinIndex(null);
    setPreviewTabImage(null);
  };

  const clearPreviewTabImage = () => {
    clearPreviewTimer();
  };

  // --- Visual Layout States ---
  const [textContainerY, setTextContainerY] = useState(5); 
  const [textContainerHeight, setTextContainerHeight] = useState(54); 
  const [metadataYOffset, setMetadataYOffset] = useState(1); 
  const [playlistToggleX, setPlaylistToggleX] = useState(-5);
  const [playlistInfoX, setPlaylistInfoX] = useState(-12); 
  const [playlistInfoWidth, setPlaylistInfoWidth] = useState(220); 
  const [playlistTabsX, setPlaylistTabsX] = useState(0); 
  const [leftAltNavX, setLeftAltNavX] = useState(10); 
  const [rightAltNavX, setRightAltNavX] = useState(-10); 

  // --- Offsets ---
  const [videoChevronLeftX, setVideoChevronLeftX] = useState(-19);
  const [videoChevronRightX, setVideoChevronRightX] = useState(-31);
  const [modeSwitcherX, setModeSwitcherX] = useState(-24);
  const [shuffleButtonX, setShuffleButtonX] = useState(-37);
  const [gridButtonX, setGridButtonX] = useState(-35);
  const [starButtonX, setStarButtonX] = useState(-33);
  const [likeButtonX, setLikeButtonX] = useState(-31);
  const [pinAnchorX, setPinAnchorX] = useState(0); 
  const [pinAnchorY, setPinAnchorY] = useState(-19);  
  const [plusButtonX, setPlusButtonX] = useState(264); 
  const [plusButtonY, setPlusButtonY] = useState(0);   
  const [pinToggleY, setPinToggleY] = useState(17); 

  const [dotMenuWidth, setDotMenuWidth] = useState(221);
  const [dotMenuHeight, setDotMenuHeight] = useState(77);
  const [dotMenuY, setDotMenuY] = useState(-14);
  const [dotSize, setDotSize] = useState(27);
  const [playlistCapsuleX, setPlaylistCapsuleX] = useState(4); 
  const [playlistCapsuleY, setPlaylistCapsuleY] = useState(5); 
  const [playlistCapsuleWidth, setPlaylistCapsuleWidth] = useState(83); 
  const [playlistCapsuleHeight, setPlaylistCapsuleHeight] = useState(37); 
  const [playlistHandleSize, setPlaylistHandleSize] = useState(35); 
  const [playlistPlayIconSize, setPlaylistPlayIconSize] = useState(23); 
  const [playlistChevronIconSize, setPlaylistChevronIconSize] = useState(38); 
  const [playlistChevronLeftX, setPlaylistChevronLeftX] = useState(-10); 
  const [playlistChevronRightX, setPlaylistChevronRightX] = useState(-34); 
  const [playlistPlayCircleX, setPlaylistPlayCircleX] = useState(-21); 
  const [modeHandleSize, setModeHandleSize] = useState(24);
  const [modeHandleInternalSize, setModeHandleInternalSize] = useState(12);

  // --- Orb Spill States ---
  const [isSpillEnabled, setIsSpillEnabled] = useState(true); 
  const [orbImageScale, setOrbImageScale] = useState(1.0);
  const [orbImageScaleW, setOrbImageScaleW] = useState(1.1);
  const [orbImageScaleH, setOrbImageScaleH] = useState(1.1);
  const [orbImageXOffset, setOrbImageXOffset] = useState(0); 
  const [orbImageYOffset, setOrbImageYOffset] = useState(0); 
  const [spillMap, setSpillMap] = useState({
    tl: true, tr: true, bl: true, br: true
  });

  const [orbSize, setOrbSize] = useState(154); 
  const [menuWidth, setMenuWidth] = useState(264); 
  const [menuHeight, setMenuHeight] = useState(100); 
  const [bottomBarHeight, setBottomBarHeight] = useState(36);
  const [titleFontSize, setTitleFontSize] = useState(15);
  const [metadataFontSize, setMetadataFontSize] = useState(10);
  const [pinSize, setPinSize] = useState(25); 
  const [bottomIconSize, setBottomIconSize] = useState(34); 
  const [navChevronSize, setNavChevronSize] = useState(35); 
  const [orbMenuGap, setOrbMenuGap] = useState(0); 
  const [orbButtonSpread, setOrbButtonSpread] = useState(42); 

  // --- Derived Constants ---
  const theme = THEMES[currentThemeId] || THEMES.blue;
  const trackWidth = Math.max(0, plusButtonX - pinAnchorX);
  
  // Helper to format view count
  const formatViews = (count) => {
    if (!count) return '0';
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
  };
  
  // Use external playlists if provided, otherwise use placeholder
  const playlistsToUse = externalPlaylists || PLAYLISTS;
  const playlist = playlistsToUse[playlistIndex] || PLAYLISTS[0];
  const orbImageSrc = customOrbImage || playlist?.image || 'https://picsum.photos/seed/playlist/800/600';
  
  // Use external video data if provided
  const currentVideoSet = isModeLeft ? MODE_1_VIDEOS : MODE_2_VIDEOS;
  
  // Always ensure displayVideo has all required properties with safe defaults
  let displayVideo;
  if (externalVideoTitle !== null && externalVideoTitle !== undefined && externalVideoTitle !== '') {
    // Use real video data (even if some fields are missing, provide defaults)
    displayVideo = {
      title: String(externalVideoTitle || 'Untitled Video'),
      author: String(externalAuthor || 'Unknown'),
      viewers: externalViews ? formatViews(externalViews) : '0',
      verified: Boolean(false)
    };
  } else {
    // Fallback to placeholder
    const placeholderVideo = previewPinIndex !== null 
      ? (currentVideoSet[previewPinIndex] || currentVideoSet[0] || {})
      : (currentVideoSet[videoIndex] || currentVideoSet[0] || {});
    displayVideo = {
      title: String(placeholderVideo?.title || 'Untitled Video'),
      author: String(placeholderVideo?.author || 'Unknown'),
      viewers: String(placeholderVideo?.viewers || '0'),
      verified: Boolean(placeholderVideo?.verified || false)
    };
  }
  
  // Final safety check - ensure displayVideo always has all properties
  displayVideo = {
    title: displayVideo?.title || 'Untitled Video',
    author: displayVideo?.author || 'Unknown',
    viewers: displayVideo?.viewers || '0',
    verified: displayVideo?.verified || false
  };

  const getOrbButtonStyle = (index) => {
    const totalButtons = 8; const centerIndex = 3.5; const relativeIndex = index - centerIndex; const angle = 90 + (relativeIndex * orbButtonSpread); const radius = 50; const rad = (angle * Math.PI) / 180; const x = 50 + radius * Math.cos(rad); const y = 50 + radius * Math.sin(rad);
    return { left: `${x}%`, top: `${y}%`, transform: 'translate(-50%, -50%)' };
  };

  const toggleSpillQuadrant = (q) => {
    setSpillMap(prev => ({ ...prev, [q]: !prev[q] }));
  };

  const orbButtons = [
    { icon: Scissors, label: 'Editor', action: null },
    { icon: Search, label: 'Search', action: onSearchToggle || null },
    { icon: MenuIcon, label: 'Menu', action: null },
    { icon: Maximize2, label: 'Spill', action: () => setIsSpillEnabled(!isSpillEnabled) },
    { icon: Youtube, label: 'Channel', action: null },
    { icon: Settings, label: 'Config', action: () => setIsEditMode(!isEditMode) },
    { icon: Clock, label: 'History', action: onHistoryToggle || null },
    { icon: isSpillEnabled ? Minimize2 : Circle, label: 'Clipping', action: () => setIsSpillEnabled(!isSpillEnabled) }
  ];

  return (
    <div className="w-full pointer-events-none">
      <div className="max-w-5xl mx-auto py-4 px-6 pointer-events-auto">
        {/* SVG ClipPath Generator for Partial Spillover */}
        <svg width="0" height="0" className="absolute pointer-events-none">
          <defs>
            <clipPath id="orbClipPath" clipPathUnits="objectBoundingBox">
              <circle cx="0.5" cy="0.5" r="0.5" />
              {isSpillEnabled && spillMap.tl && <rect x="-50" y="-50" width="50.5" height="50.5" />}
              {isSpillEnabled && spillMap.tr && <rect x="0.5" y="-50" width="50.5" height="50.5" />}
              {isSpillEnabled && spillMap.bl && <rect x="-50" y="0.5" width="50.5" height="50.5" />}
              {isSpillEnabled && spillMap.br && <rect x="0.5" y="0.5" width="50.5" height="50.5" />}
            </clipPath>
          </defs>
        </svg>

        <div className={`w-full bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] ${theme.bg}`} />

        <div className="flex items-center relative overflow-visible">
          {/* Spacer to balance layout */}
          <div className="flex-1 flex items-center justify-end">
            {/* PLAYLIST SECTION */}
            <div className="flex items-center gap-4 relative z-10 flex-shrink-0">
            <div className="absolute right-full mr-4 transition-transform" style={{ transform: `translateX(${leftAltNavX}px)` }}>
              <div className="flex items-center gap-4 animate-in slide-in-from-right-2 duration-300">
                <div className="flex flex-col gap-3 w-9 h-24 items-center justify-center">
                  {playlistCheckpoint !== null && (
                    <><button onClick={() => handleCommit('playlist')} className="w-9 h-9 rounded-full flex items-center justify-center shadow-md bg-emerald-500 text-white active:scale-90"><Check size={20} strokeWidth={3} /></button><button onClick={() => handleRevert('playlist')} className="w-9 h-9 rounded-full flex items-center justify-center shadow-md bg-rose-500 text-white active:scale-90"><X size={20} strokeWidth={3} /></button></>
                  )}
                </div>
                <div className={`w-8 ${theme.menuBg} border ${theme.menuBorder} rounded-lg shadow-sm flex flex-col justify-between items-center py-2 shrink-0`} style={{ height: `${menuHeight}px` }}>
                  <button onClick={() => handleAltNav('up', 'playlist')} className="text-sky-400 p-1"><ChevronUp size={18} strokeWidth={3} /></button>
                  <div className={`w-full h-px ${theme.bottomBar} my-1`} />
                  <button onClick={() => handleAltNav('down', 'playlist')} className="text-sky-400 p-1"><ChevronDown size={18} strokeWidth={3} /></button>
                </div>
              </div>
            </div>
            <div className={`border shadow-2xl flex flex-col relative overflow-visible transition-all duration-300 ${isEditMode ? 'ring-4 ring-sky-400/30' : theme.menuBorder + ' ' + theme.menuBg + ' backdrop-blur-2xl rounded-2xl overflow-hidden'}`} style={{ width: `${menuWidth}px`, height: `${menuHeight}px` }}>
              <div className="absolute inset-0 z-0 rounded-2xl overflow-hidden"><img src={previewTabImage || playlist.image} alt="" className="w-full h-full object-cover" /></div>
              <div className="absolute top-0 left-0 w-full flex items-center -translate-y-1/2 z-40 px-2 pointer-events-none h-0">
                <button onClick={handleToggleHeader} className={`pointer-events-auto w-10 h-10 shrink-0 rounded-lg flex items-center justify-center shadow-lg transition-all ${theme.tabActive} border-white/20 active:scale-90`} style={{ transform: `translateX(${playlistToggleX}px)` }} title="Toggle Mode"><Layers size={20} /></button>
                <div className="flex-grow flex justify-center items-center h-10 ml-2 overflow-visible transition-transform" style={{ transform: `translateX(${playlistTabsX}px)` }}>
                  {activeHeaderMode === 'info' ? (
                    <div className="pointer-events-auto h-8 bg-sky-900/60 backdrop-blur-md border border-white/10 rounded-md flex items-center px-4" style={{ width: `${playlistInfoWidth}px`, transform: `translateX(${playlistInfoX}px)` }}><span className="text-[10px] font-black uppercase text-white tracking-[0.2em] truncate">{playlist.title}</span></div>
                  ) : (
                    <div className="flex items-center gap-1.5 pointer-events-auto">
                      <button onClick={() => navigateTabs('prev')} className={`text-white/40 hover:text-white transition-colors`}><ChevronLeft size={16} strokeWidth={4} /></button>
                      {TAB_GROUPS[activeHeaderMode].map((tab) => {
                        const TabIcon = tab.icon;
                        return (
                          <button key={tab.id} onClick={() => setActiveLeftPin(tab.id)} onMouseEnter={() => startPreviewTimer(() => setPreviewTabImage(tab.previewImg))} onMouseLeave={clearPreviewTabImage} className={`flex items-center justify-center transition-all border shadow-sm rounded-lg ${activeLeftPin === tab.id ? theme.tabActive + ' scale-110 border-white/20' : theme.tabInactive}`} style={{ width: `${pinSize * 2.2}px`, height: `${pinSize}px` }}><TabIcon size={Math.round(pinSize * 0.55)} /></button>
                        );
                      })}
                      <button onClick={() => navigateTabs('next')} className={`text-white/40 hover:text-white transition-colors`}><ChevronRight size={16} strokeWidth={4} /></button>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex-grow relative z-10" />
              <div className="absolute bottom-2 right-2 z-20 transition-transform" style={{ transform: `translate(${playlistCapsuleX}px, ${playlistCapsuleY}px)` }}>
                <div className={`flex items-center gap-1 p-1 rounded-full shadow-lg border border-white/20 bg-white overflow-hidden pointer-events-auto`} style={{ width: `${playlistCapsuleWidth}px`, height: `${playlistCapsuleHeight}px` }}>
                   <button onClick={() => navigatePlaylist('down')} className="flex-grow flex items-center justify-center text-sky-400 active:scale-90" style={{ transform: `translateX(${playlistChevronLeftX}px)` }}><ChevronLeft size={playlistChevronIconSize} strokeWidth={4} /></button>
                   <div className={`rounded-full flex items-center justify-center shadow-sm shrink-0 transition-transform ${theme.accentBg}`} style={{ width: `${playlistHandleSize}px`, height: `${playlistHandleSize}px`, transform: `translateX(${playlistPlayCircleX}px)` }}><Play size={playlistPlayIconSize} fill="white" color="white" /></div>
                   <button onClick={() => navigatePlaylist('up')} className="flex-grow flex items-center justify-center text-sky-400 active:scale-90" style={{ transform: `translateX(${playlistChevronRightX}px)` }}><ChevronRight size={playlistChevronIconSize} strokeWidth={4} /></button>
                </div>
              </div>
            </div>
          </div>
          </div>

          {/* THE ORB SECTION - Centered */}
          <div className="flex items-center justify-center relative group z-30 flex-shrink-0" style={{ marginLeft: `${orbMenuGap}px`, marginRight: `${orbMenuGap}px` }}>
            <div 
              className={`rounded-full bg-sky-50 backdrop-blur-3xl border-[6px] ${theme.orbBorder} shadow-2xl flex items-center justify-center transition-all relative overflow-visible`}
              style={{ width: `${orbSize}px`, height: `${orbSize}px` }}
            >
              {/* IMAGE LAYER */}
              <div className="absolute inset-0 pointer-events-none transition-all duration-500 flex items-center justify-center z-40" style={{ clipPath: 'url(#orbClipPath)', overflow: 'visible' }}>
                 <img 
                    src={orbImageSrc} 
                    alt="" 
                    className="max-w-none transition-all duration-500" 
                    style={{ 
                      width: isSpillEnabled ? `${orbSize * orbImageScale * orbImageScaleW}px` : '100%',
                      height: isSpillEnabled ? `${orbSize * orbImageScale * orbImageScaleH}px` : '100%',
                      transform: isSpillEnabled ? `translate(${orbImageXOffset}px, ${orbImageYOffset}px)` : 'none',
                      objectFit: isSpillEnabled ? 'contain' : 'cover'
                    }}
                 />
              </div>

              {/* Adjuster Border Guide */}
              {isAdjustingImage && (
                <div className="absolute inset-0 border-4 border-dashed border-sky-400/50 rounded-full animate-pulse z-50 pointer-events-none shadow-[0_0_20px_rgba(56,189,248,0.5)]" />
              )}

              {/* GLASS INTERLAY */}
              <div className="absolute inset-0 z-10 overflow-hidden rounded-full border-4 border-sky-100/50 pointer-events-none"><div className="absolute inset-0 bg-sky-900/10" /></div>
              <div className="absolute inset-0 bg-gradient-to-tr from-white/30 via-transparent to-transparent opacity-60 z-10 pointer-events-none rounded-full" />
              
              <input type="file" ref={fileInputRef} onChange={handleImageUpload} accept="image/*" className="hidden" />
              <button className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2 rounded-full flex items-center justify-center bg-white shadow-xl hover:scale-110 active:scale-95 group/btn z-50 border-2 border-sky-100 opacity-0 group-hover:opacity-100 transition-all duration-300" style={{ width: `28px`, height: `28px` }} onClick={() => fileInputRef.current.click()}><Upload size={16} className={theme.accent} strokeWidth={3} /></button>

              {orbButtons.map((btn, i) => {
                const BtnIcon = btn.icon;
                return (
                  <button key={i} onClick={btn.action} className="absolute rounded-full flex items-center justify-center bg-white shadow-xl hover:scale-110 active:scale-95 group/btn z-50 border-2 border-sky-50 opacity-0 group-hover:opacity-100 transition-all duration-300" style={{ ...getOrbButtonStyle(i), width: `28px`, height: `28px` }} title={btn.label}>
                    <BtnIcon size={14} className="text-slate-800" strokeWidth={2.5} />
                  </button>
                );
              })}
            </div>
          </div>

          {/* VIDEO SECTION */}
          <div className="flex-1 flex items-center justify-start">
            <div className="flex items-center gap-4 relative z-10 flex-shrink-0">
            <div className={`border shadow-2xl flex flex-col relative overflow-visible transition-all duration-300 ${isEditMode ? 'ring-4 ring-sky-400/30' : theme.menuBorder + ' ' + theme.menuBg + ' backdrop-blur-2xl rounded-2xl'}`} style={{ width: `${menuWidth}px`, height: `${menuHeight}px` }}>
              {showColorPicker && (<button onClick={() => { setShowColorPicker(null); setHoveredColorName(null); }} className="absolute -top-3 -right-3 w-7 h-7 bg-rose-500 text-white rounded-full flex items-center justify-center hover:bg-rose-600 z-50 shadow-lg border-2 border-white transition-all active:scale-90"><X size={16} strokeWidth={3} /></button>)}
              <div className="absolute top-0 left-0 w-full flex items-center -translate-y-1/2 z-40 px-2 pointer-events-none h-0">
                {!showColorPicker && (<button onClick={() => setShowPins(!showPins)} className="pointer-events-auto flex items-center justify-center active:scale-90 transition-transform absolute" style={{ width: `${pinSize}px`, height: `${pinSize}px`, transform: `translateY(${pinToggleY}px)`, left: '8px' }}>{showPins ? <Eye size={Math.round(pinSize * 0.7)} className="text-sky-600" /> : <EyeOff size={Math.round(pinSize * 0.7)} className="text-sky-300/60" />}</button>)}
                {showPins && !showColorPicker && (
                  <div className="absolute flex items-center justify-start transition-all overflow-hidden" style={{ left: `${pinAnchorX}px`, top: `${pinAnchorY}px`, width: `${trackWidth}px`, height: `${pinSize + 10}px` }}>
                    <div className="flex items-center gap-1 w-full h-full px-1 pointer-events-auto flex-nowrap">
                      <div className="flex gap-1 shrink-0">
                        {pins.map((pin, idx) => {
                          const IconComp = pin.icon;
                          return (
                            <div key={pin.id} className="relative group/pin shrink-0"><button onClick={() => setActivePin(pin.id)} onMouseEnter={() => startPreviewTimer(() => setPreviewPinIndex(idx))} onMouseLeave={clearPreviewTimer} className={`rounded-full flex items-center justify-center transition-all border shadow-sm ${activePin === pin.id ? theme.tabActive + ' border-sky-500 text-sky-600 scale-110 z-10' : theme.tabInactive + ' scale-90'}`} style={{ width: `${pinSize}px`, height: `${pinSize}px` }}><IconComp size={Math.round(pinSize * 0.55)} fill={activePin === pin.id ? 'currentColor' : 'transparent'} /></button><button className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover/pin:opacity-100 transition-opacity shadow-sm border border-white z-20" onClick={(e) => handleDeletePin(e, pin.id)}><X size={10} strokeWidth={4} /></button></div>
                          );
                        })}
                      </div>
                      <button onClick={handleAddPin} className={`shrink-0 rounded-full flex items-center justify-center shadow-lg transition-all ${theme.tabInactive} hover:scale-110 active:scale-95 ml-auto`} style={{ width: `${pinSize}px`, height: `${pinSize}px` }}><Plus size={Math.round(pinSize * 0.6)} strokeWidth={3} /></button>
                    </div>
                  </div>
                )}
              </div>
              <div className="flex-grow flex flex-col items-center justify-center px-4 relative z-10 overflow-hidden">
                {showColorPicker ? (
                   <div className="flex flex-col items-center animate-in zoom-in duration-200" style={{ transform: `translateY(${dotMenuY}px)` }}>
                      <p className="text-[9px] font-black uppercase text-sky-600 tracking-[0.2em] mb-3">Accent: {showColorPicker}</p>
                      <div className="grid grid-cols-7 gap-1.5 p-2.5 bg-white/60 backdrop-blur-md rounded-2xl border border-sky-200 shadow-inner overflow-hidden flex items-center justify-center" style={{ width: `${dotMenuWidth}px`, height: `${dotMenuHeight}px` }}>
                        {COLORS.map((c) => (<div key={c.hex} onMouseEnter={() => setHoveredColorName(c.name)} onMouseLeave={() => setHoveredColorName(null)} className="rounded-full cursor-pointer border-2 border-white shadow-sm hover:scale-125 transition-transform shrink-0" style={{ backgroundColor: c.hex, width: `${dotSize}px`, height: `${dotSize}px` }} onClick={() => handleColorSelect(c.hex)} />))}
                      </div>
                   </div>
                ) : (
                  <div className="w-full flex flex-col justify-start transition-all relative" style={{ height: `${textContainerHeight}px`, transform: `translateY(${textContainerY}px)` }}>
                    <div className={`flex items-center justify-center gap-1 ${theme.accent} font-black uppercase tracking-widest`} style={{ fontSize: `${metadataFontSize}px`, transform: `translateY(${metadataYOffset}px)` }}>
                      <span className="opacity-80">{displayVideo.author}</span>{displayVideo.verified && <CheckCircle2 size={metadataFontSize} className="fill-current" />}<span className="opacity-30 mx-1">|</span><span>{displayVideo.viewers} LIVE</span>
                    </div>
                    <h1 className="font-black text-sky-950 text-center leading-tight line-clamp-2 tracking-tight transition-all" style={{ fontSize: `${titleFontSize}px` }}>{displayVideo.title}</h1>
                  </div>
                )}
              </div>
              <div className={`border-t flex items-center px-3 shrink-0 relative rounded-b-2xl ${theme.bottomBar}`} style={{ height: `${bottomBarHeight}px` }}>
                {showColorPicker ? (<div className="flex items-center justify-center w-full h-full animate-in fade-in slide-in-from-bottom-1 duration-300"><span className="text-[10px] font-black uppercase tracking-[0.3em] text-sky-700/80">{hoveredColorName || `Select ${showColorPicker} color`}</span></div>) : (
                  <div className="flex items-center justify-around w-full h-full">
                    <div className="flex items-center gap-0.5">
                      <button onClick={handlePrevVideo} className="p-0.5 text-sky-400 transition-transform" style={{ transform: `translateX(${videoChevronLeftX}px)` }}><ChevronLeft size={navChevronSize} strokeWidth={3} /></button>
                      <button onClick={() => setIsModeLeft(!isModeLeft)} className={`w-16 h-8 rounded-full border transition-all flex items-center px-1 shadow-inner shrink-0 relative overflow-hidden`} style={{ backgroundColor: isModeLeft ? '#0ea5e9' : '#cbd5e1', borderColor: isModeLeft ? '#0284c7' : '#94a3b8', transform: `translateX(${modeSwitcherX}px)` }}><div className={`rounded-full shadow-md transition-all flex items-center justify-center font-black absolute bg-white`} style={{ width: `${modeHandleSize}px`, height: `${modeHandleSize}px`, fontSize: `${modeHandleInternalSize}px`, color: isModeLeft ? '#0ea5e9' : '#475569', left: '4px', transform: `translateX(${isModeLeft ? 0 : (64 - modeHandleSize - 8)}px)` }}>{isModeLeft ? '1' : '2'}</div></button>
                      <button onClick={handleNextVideo} className="p-0.5 text-sky-400 transition-transform" style={{ transform: `translateX(${videoChevronRightX}px)` }}><ChevronRight size={navChevronSize} strokeWidth={3} /></button>
                    </div>
                    <button 
                      onClick={() => onShuffle ? onShuffle() : null}
                      onContextMenu={(e) => { e.preventDefault(); setShowColorPicker('shuffle'); }} 
                      className="relative flex items-center justify-center transition-all hover:scale-110 active:scale-95 group/tool" 
                      style={{ transform: `translateX(${shuffleButtonX}px)` }}
                    >
                      <div className="rounded-full flex items-center justify-center border-2 border-sky-200 shadow-sm bg-white" style={{ width: `${bottomIconSize}px`, height: `${bottomIconSize}px`, borderColor: shuffleColor }}>
                        <Shuffle size={Math.round(bottomIconSize * 0.5)} color={shuffleColor} strokeWidth={3} />
                      </div>
                    </button>
                    <button 
                      onClick={() => onGridToggle ? onGridToggle() : null}
                      className="relative flex items-center justify-center transition-all hover:scale-110 active:scale-95 group/tool" 
                      style={{ transform: `translateX(${gridButtonX}px)` }}
                    >
                      <div className="rounded-full flex items-center justify-center border-2 border-sky-200 shadow-sm bg-white" style={{ width: `${bottomIconSize}px`, height: `${bottomIconSize}px` }}>
                        <Grid3X3 size={Math.round(bottomIconSize * 0.5)} className="text-slate-600" strokeWidth={3} />
                      </div>
                    </button>
                    <button onContextMenu={(e) => { e.preventDefault(); setShowColorPicker('star'); }} className="relative flex items-center justify-center transition-all hover:scale-110 active:scale-95 group/tool" style={{ transform: `translateX(${starButtonX}px)` }}><div className="rounded-full flex items-center justify-center border-2 border-sky-200 shadow-sm bg-white" style={{ width: `${bottomIconSize}px`, height: `${bottomIconSize}px`, borderColor: starColor }}><Star size={Math.round(bottomIconSize * 0.5)} color={starColor} fill={starColor} strokeWidth={3} /></div></button>
                    <button className="relative flex items-center justify-center transition-all hover:scale-110 active:scale-95 group/tool" style={{ transform: `translateX(${likeButtonX}px)` }}><div className="rounded-full flex items-center justify-center border-2 border-sky-200 shadow-sm bg-white" style={{ width: `${bottomIconSize}px`, height: `${bottomIconSize}px`, borderColor: likeColor }}><ThumbsUp size={Math.round(bottomIconSize * 0.5)} color={likeColor} fill={likeColor} strokeWidth={3} /></div></button>
                  </div>
                )}
              </div>
            </div>
            <div className="absolute left-full ml-4 transition-transform" style={{ transform: `translateX(${rightAltNavX}px)` }}>
              <div className="flex items-center gap-4 animate-in slide-in-from-left-2 duration-300">
                <div className={`w-8 ${theme.menuBg} border ${theme.menuBorder} rounded-lg shadow-sm flex flex-col justify-between items-center py-2 shrink-0`} style={{ height: `${menuHeight}px` }}>
                  <button onClick={() => handleAltNav('up', 'video')} className="text-sky-400 p-1"><ChevronUp size={18} strokeWidth={3} /></button>
                  <div className={`w-full h-px ${theme.bottomBar} my-1`} />
                  <button onClick={() => handleAltNav('down', 'video')} className="text-sky-400 p-1"><ChevronDown size={18} strokeWidth={3} /></button>
                </div>
                <div className="flex flex-col gap-3 w-9 h-24 items-center justify-center">
                  {videoCheckpoint !== null && (
                    <><button onClick={() => handleCommit('video')} className="w-9 h-9 rounded-full flex items-center justify-center shadow-md bg-emerald-500 text-white transition-all active:scale-90 animate-in zoom-in duration-200"><Check size={20} strokeWidth={3} /></button><button onClick={() => handleRevert('video')} className="w-9 h-9 rounded-full flex items-center justify-center shadow-md bg-rose-500 text-white transition-all active:scale-90 animate-in zoom-in duration-200"><X size={20} strokeWidth={3} /></button></>
                  )}
                </div>
              </div>
            </div>
            </div>
          </div>
        </div>

        {/* SETTINGS PANEL */}
        {isEditMode && (
          <div className={`absolute bottom-4 z-50 bg-white p-6 rounded-2xl border border-sky-200 shadow-2xl w-80 max-h-[80vh] overflow-y-auto text-slate-800 animate-in duration-300 ${isConfigOnRight ? 'right-4 slide-in-from-right-4' : 'left-4 slide-in-from-left-4'}`}>
            <div className="flex items-center justify-between border-b border-sky-50 pb-2 mb-4">
              <h2 className="text-sm font-black uppercase tracking-widest text-sky-600 flex items-center gap-2"><Layout size={16} /> System Config</h2>
              <button onClick={() => setIsConfigOnRight(!isConfigOnRight)} className="p-1.5 rounded-lg bg-sky-50 text-sky-600 hover:bg-sky-100 transition-colors active:scale-90" title="Switch Side"><ArrowLeftRight size={14} /></button>
            </div>
            <div className="space-y-8">
              <ConfigSection title="Pin Track & Header" icon={AnchorIcon}>
                <button onClick={handleRestockPins} className="w-full flex items-center justify-center gap-2 py-2 bg-rose-50 text-rose-700 border border-rose-200 rounded-lg text-[10px] font-black uppercase hover:bg-rose-100 mb-4"><RotateCcw size={12} /> Clear All Pins</button>
                <ControlSlider label="Anchor X" value={pinAnchorX} onChange={setPinAnchorX} min={0} max={1000} unit="px" />
                <ControlSlider label="Anchor Y" value={pinAnchorY} onChange={setPinAnchorY} min={-100} max={100} unit="px" />
                <ControlSlider label="Plus Icon X" value={plusButtonX} onChange={setPlusButtonX} min={0} max={1000} unit="px" />
                <ControlSlider label="Plus Icon Y" value={plusButtonY} onChange={setPlusButtonY} min={-100} max={100} unit="px" />
                <ControlSlider label="Eye Toggle Y" value={pinToggleY} onChange={setPinToggleY} min={-100} max={100} unit="px" />
              </ConfigSection>
              <ConfigSection title="Playlist Header" icon={Layers}>
                <ControlSlider label="Toggle X" value={playlistToggleX} onChange={setPlaylistToggleX} min={-100} max={150} unit="px" />
                <ControlSlider label="Tabs X" value={playlistTabsX} onChange={setPlaylistTabsX} min={-200} max={200} unit="px" />
                <ControlSlider label="Info Bar X" value={playlistInfoX} onChange={setPlaylistInfoX} min={-150} max={150} unit="px" />
                <ControlSlider label="Info Width" value={playlistInfoWidth} onChange={setPlaylistInfoWidth} min={50} max={400} unit="px" />
              </ConfigSection>
              <ConfigSection title="Playlist Capsule" icon={ListMusic}>
                <div className="grid grid-cols-2 gap-2">
                  <ControlSlider label="X" value={playlistCapsuleX} onChange={setPlaylistCapsuleX} min={-100} max={100} unit="px" />
                  <ControlSlider label="Y" value={playlistCapsuleY} onChange={setPlaylistCapsuleY} min={-100} max={100} unit="px" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <ControlSlider label="W" value={playlistCapsuleWidth} onChange={setPlaylistCapsuleWidth} min={40} max={300} unit="px" />
                  <ControlSlider label="H" value={playlistCapsuleHeight} onChange={setPlaylistCapsuleHeight} min={20} max={100} unit="px" />
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <ControlSlider label="L-Chev X" value={playlistChevronLeftX} onChange={setPlaylistChevronLeftX} min={-50} max={50} unit="px" />
                  <ControlSlider label="Play X" value={playlistPlayCircleX} onChange={setPlaylistPlayCircleX} min={-50} max={50} unit="px" />
                  <ControlSlider label="R-Chev X" value={playlistChevronRightX} onChange={setPlaylistChevronRightX} min={-50} max={50} unit="px" />
                </div>
              </ConfigSection>
              <ConfigSection title="Orb Image Tuning" icon={Maximize2}>
                <div className="flex items-center justify-between p-2 bg-sky-50 rounded-lg mb-2">
                  <span className="text-[9px] font-black uppercase text-sky-700">Spillover</span>
                  <button onClick={() => setIsSpillEnabled(!isSpillEnabled)} className={`w-8 h-4 rounded-full transition-colors relative ${isSpillEnabled ? 'bg-sky-500' : 'bg-slate-300'}`}><div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-transform ${isSpillEnabled ? 'translate-x-4' : 'translate-x-0.5'}`} /></button>
                </div>
                <ControlSlider label="Master Size" value={Math.round(orbImageScale * 100)} onChange={(v) => setOrbImageScale(v / 100)} min={20} max={300} unit="%" />
                <div className="grid grid-cols-2 gap-3 mt-2">
                  <ControlSlider label="Width %" value={Math.round(orbImageScaleW * 100)} onChange={(v) => setOrbImageScaleW(v / 100)} min={20} max={300} unit="%" />
                  <ControlSlider label="Height %" value={Math.round(orbImageScaleH * 100)} onChange={(v) => setOrbImageScaleH(v / 100)} min={20} max={300} unit="%" />
                </div>
                <div className="grid grid-cols-2 gap-3 mt-2">
                  <ControlSlider label="Offset X" value={orbImageXOffset} onChange={setOrbImageXOffset} min={-150} max={150} unit="px" />
                  <ControlSlider label="Offset Y" value={orbImageYOffset} onChange={setOrbImageYOffset} min={-150} max={150} unit="px" />
                </div>
              </ConfigSection>
              <ConfigSection title="Video Menu Toolbar" icon={Maximize2}>
                <ControlSlider label="Mode Toggle Circle" value={modeHandleSize} onChange={setModeHandleSize} min={10} max={40} unit="px" />
                <ControlSlider label="Mode Number Size" value={modeHandleInternalSize} onChange={setModeHandleInternalSize} min={6} max={40} unit="px" />
                <div className="h-2" />
                <ControlSlider label="Left Chevron X" value={videoChevronLeftX} onChange={setVideoChevronLeftX} min={-100} max={100} unit="px" />
                <ControlSlider label="Right Chevron X" value={videoChevronRightX} onChange={setVideoChevronRightX} min={-100} max={100} unit="px" />
                <ControlSlider label="Mode Toggle X" value={modeSwitcherX} onChange={setModeSwitcherX} min={-100} max={100} unit="px" />
                <ControlSlider label="Shuffle X" value={shuffleButtonX} onChange={setShuffleButtonX} min={-100} max={100} unit="px" />
                <ControlSlider label="Grid Menu X" value={gridButtonX} onChange={setGridButtonX} min={-100} max={100} unit="px" />
                <ControlSlider label="Star X" value={starButtonX} onChange={setStarButtonX} min={-100} max={100} unit="px" />
                <ControlSlider label="Like X" value={likeButtonX} onChange={setLikeButtonX} min={-100} max={100} unit="px" />
              </ConfigSection>
              <ConfigSection title="Global Layout" icon={Layout}>
                <div className="grid grid-cols-2 gap-2">
                  <ControlSlider label="Menu W" value={menuWidth} onChange={setMenuWidth} min={200} max={1000} unit="px" />
                  <ControlSlider label="Menu H" value={menuHeight} onChange={setMenuHeight} min={60} max={300} unit="px" />
                </div>
                <ControlSlider label="Orb Size" value={orbSize} onChange={setOrbSize} min={20} max={400} unit="px" />
              </ConfigSection>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ConfigSection({ title, icon: Icon, children }) {
  return (
    <div className="space-y-4 border-t border-sky-50 pt-4 first:border-0 first:pt-0">
      <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-2">{Icon && <Icon size={12} />} {title}</h3>
      <div className="space-y-3 px-1">{children}</div>
    </div>
  );
}

function ControlSlider({ label, value, onChange, min, max, unit }) {
  return (
    <div className="space-y-1 group">
      <div className="flex justify-between items-center text-[9px] font-bold uppercase text-slate-400 group-hover:text-sky-600 transition-colors"><span>{label}</span><span className="text-sky-600 font-black tracking-tighter bg-sky-50 px-1.5 py-0.5 rounded">{value}{unit}</span></div>
      <input type="range" min={min} max={max} value={value} onChange={(e) => onChange(parseInt(e.target.value))} className="w-full h-1 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-sky-600 hover:bg-sky-100 transition-all" />
    </div>
  );
}
