"use client"
import { useState, useEffect, useRef, useMemo } from "react"

// Console log capture for debugging
if (typeof window !== 'undefined') {
  const originalConsole = { ...console };
  const logBuffer = [];
  const MAX_LOG_BUFFER = 1000;
  
  // Override console methods to capture logs
  ['log', 'warn', 'error', 'info', 'debug'].forEach(method => {
    console[method] = (...args) => {
      originalConsole[method](...args);
      const logEntry = {
        timestamp: new Date().toISOString(),
        level: method,
        message: args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : String(arg)).join(' '),
        stack: new Error().stack
      };
      logBuffer.push(logEntry);
      if (logBuffer.length > MAX_LOG_BUFFER) {
        logBuffer.shift();
      }
      
      // Store in localStorage for persistence
      try {
        localStorage.setItem('youtube-tv-console-logs', JSON.stringify(logBuffer.slice(-100)));
      } catch (e) {
        // Ignore storage errors
      }
    };
  });
  
  // Expose function to get logs
  window.getConsoleLogs = () => {
    return logBuffer;
  };
  
  // Expose function to download logs
  window.downloadConsoleLogs = () => {
    const blob = new Blob([JSON.stringify(logBuffer, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `console-logs-${new Date().toISOString()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };
}
import {
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  Shuffle,
  Trash2,
  X,
  Grid3X3,
  Star,
  Check,
  Pencil,
  Clock,
  Play,
  Search,
  Plus,
  ListFilter,
  GitMerge,
  Pin,
} from "lucide-react"
// Firebase imports removed - using local database via API routes instead
// import { collection, query, orderBy, limit, deleteDoc, setDoc, doc, onSnapshot, updateDoc, getDocs, writeBatch, where, deleteField } from "firebase/firestore";

// Local Database API Helpers
const API_BASE = '/api/user';

// Fetch user data from local database
const fetchUserData = async (userId) => {
  const response = await fetch(`${API_BASE}/${userId}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch user data: ${response.statusText}`);
  }
  return await response.json();
};

// Save user data to local database
const saveUserData = async (userId, data) => {
  const response = await fetch(`${API_BASE}/${userId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!response.ok) {
    throw new Error(`Failed to save user data: ${response.statusText}`);
  }
  return await response.json();
};

// Save video progress to local database
const saveVideoProgress = async (userId, videoProgress) => {
  const response = await fetch(`${API_BASE}/${userId}/progress`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ videoProgress })
  });
  if (!response.ok) {
    throw new Error(`Failed to save video progress: ${response.statusText}`);
  }
  return await response.json();
};

// Configuration management
const CONFIG_STORAGE_KEY = 'youtube-tv-config';
const PRIMARY_USER_ID_KEY = 'youtube-tv-primary-user-id';
const PERSISTENT_USER_ID_KEY = 'youtube-tv-persistent-user-id';

// Generate or retrieve a persistent user ID
const getPersistentUserId = () => {
  if (typeof window === 'undefined') return null;
  
  let persistentId = localStorage.getItem(PERSISTENT_USER_ID_KEY);
  if (!persistentId) {
    // Generate a new persistent ID (similar format to Firebase UIDs)
    persistentId = 'persistent_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    localStorage.setItem(PERSISTENT_USER_ID_KEY, persistentId);
    console.log(`🆔 Generated new persistent user ID: ${persistentId}`);
  } else {
    console.log(`🆔 Using existing persistent user ID: ${persistentId}`);
  }
  return persistentId;
};

// Default configuration (fallback)
const defaultFirebaseConfig = {
  apiKey: "AIzaSyBgyAi3j6SAWDkCxKN1EpWMwKdw50XIwJU",
  authDomain: "yttv-b3008.firebaseapp.com",
  projectId: "yttv-b3008",
  storageBucket: "yttv-b3008.firebasestorage.app",
  messagingSenderId: "579182513471",
  appId: "1:579182513471:web:c916b392f2f3e527ce178a",
  measurementId: "G-0LRNV56DPG"
};

const defaultApiKey = "AIzaSyBYPwv0a-rRbTrvMA9nF4Wa1ryC0b6l7xw";

// Get stored configuration or return defaults
const getStoredConfig = () => {
  // Check if we're in a browser environment
  if (typeof window === 'undefined') {
    return {
      firebaseConfig: defaultFirebaseConfig,
      apiKey: defaultApiKey
    };
  }
  
  try {
    const stored = localStorage.getItem(CONFIG_STORAGE_KEY);
    if (stored) {
      const config = JSON.parse(stored);
      return {
        firebaseConfig: config.firebaseConfig || defaultFirebaseConfig,
        apiKey: config.apiKey || defaultApiKey
      };
    }
  } catch (error) {
    console.error('Error loading stored config:', error);
  }
  return {
    firebaseConfig: defaultFirebaseConfig,
    apiKey: defaultApiKey
  };
};

// Store configuration
const storeConfig = (firebaseConfig, apiKey) => {
  // Check if we're in a browser environment
  if (typeof window === 'undefined') {
    return false;
  }
  
  try {
    const config = { firebaseConfig, apiKey };
    localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(config));
    return true;
  } catch (error) {
    console.error('Error storing config:', error);
    return false;
  }
};

// Local database - no initialization needed, handled by API routes

const groupColors = {
  red: 'bg-red-500', 
  green: 'bg-green-500', 
  blue: 'bg-blue-500', 
  yellow: 'bg-yellow-500',
  orange: 'bg-orange-500', 
  purple: 'bg-purple-500', 
  pink: 'bg-pink-500', 
  cyan: 'bg-cyan-500', 
  indigo: 'bg-indigo-500',
  teal: 'bg-teal-500',
  lime: 'bg-lime-500',
  amber: 'bg-amber-500',
  emerald: 'bg-emerald-500',
  violet: 'bg-violet-500',
  rose: 'bg-rose-500',
  sky: 'bg-sky-500',
}

// Helper function to create default groups structure with all colors
function createDefaultGroups() {
  return {
    red: {name: 'Red', videos: []}, 
    green: {name: 'Green', videos: []}, 
    blue: {name: 'Blue', videos: []}, 
    yellow: {name: 'Yellow', videos: []},
    orange: {name: 'Orange', videos: []}, 
    purple: {name: 'Purple', videos: []}, 
    pink: {name: 'Pink', videos: []}, 
    cyan: {name: 'Cyan', videos: []}, 
    indigo: {name: 'Indigo', videos: []}
  };
}

const initialPlaylists = [
  { name: "Meme Songs", id: "PLV2ewAgCPCq0DVamOw2sQSAVdFVjA6x78", videos: [], groups: createDefaultGroups(), starred: [] },
  { name: "Game List", id: "PLyZI3qCmOZ9uamxj6bd3P5oEkmXbu8-RT", videos: [], groups: createDefaultGroups(), starred: [] },
  { name: "Minecraft", id: "PLyZI3qCmOZ9tWQIohuuMHJZjruHkDs5gE", videos: [], groups: createDefaultGroups(), starred: [] },
  { name: "Gameplay", id: "PLyZI3qCmOZ9sju_zQ0fcc8ND-qIJEB9Ce", videos: [], groups: createDefaultGroups(), starred: [] },
  { name: "TF2", id: "PLyZI3qCmOZ9umIkxOGjUMiDLxGtsn6so7", videos: [], groups: createDefaultGroups(), starred: [] },
  { name: "Documentary", id: "PLyZI3qCmOZ9tUvdotGRyiKWdFEkkD2xQu", videos: [], groups: createDefaultGroups(), starred: [] },
  { name: "Unsorted", id: "_unsorted_", videos: [], groups: createDefaultGroups(), starred: [] },
]

function parseISO8601Duration(duration) {
  if (!duration || typeof duration !== 'string') {
    return 1;
  }
  const match = duration.match(/P(?:(\d+)D)?T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) {
    return 1;
  }
  let seconds = 0;
  if (match[1]) seconds += parseInt(match[1]) * 86400;
  if (match[2]) seconds += parseInt(match[2]) * 3600;
  if (match[3]) seconds += parseInt(match[3]) * 60;
  if (match[4]) seconds += parseInt(match[4]);
  return seconds || 1;
}

function formatTime(seconds) {
  if (!seconds || seconds <= 0) return '0:00';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return `${h ? h + ':' : ''}${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

function formatMinutes(seconds) {
  return Math.floor(seconds / 60) + ' min';
}

function formatViews(count) {
  if (!count || isNaN(Number(count))) return '';
  const n = Number(count);
  if (n < 1000) return n.toString();
  if (n < 1000000) return (n / 1000).toFixed(n % 1000 === 0 ? 0 : 1) + 'K';
  if (n < 1000000000) return (n / 1000000).toFixed(n % 1000000 === 0 ? 0 : 1) + 'M';
  return (n / 1000000000).toFixed(n % 1000000000 === 0 ? 0 : 1) + 'B';
}

function formatTimestamp(timestamp) {
  const now = new Date();
  const date = new Date(timestamp);
  const diffMs = now - date;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffDay > 1) return `${date.toLocaleDateString()}`;
  if (diffHr > 1) return `${diffHr} hours ago`;
  if (diffMin > 1) return `${diffMin} minutes ago`;
  return `Just now`;
}

async function fetchVideosByChannel(channelId, maxResults = 5, apiKey) {
    try {
        const channelRes = await fetch(`https://www.googleapis.com/youtube/v3/channels?part=contentDetails&id=${channelId}&key=${apiKey}`);
        const channelData = await channelRes.json();
        const uploadsPlaylistId = channelData?.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;

        if (!uploadsPlaylistId) { throw new Error("Could not find uploads playlist."); }

        const playlistItemsRes = await fetch(`https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId=${uploadsPlaylistId}&maxResults=${maxResults}&key=${apiKey}`);
        const playlistItemsData = await playlistItemsRes.json();
        
        let recentVideos = playlistItemsData.items
            .filter(item => item.snippet.title !== "Deleted video" && item.snippet.title !== "Private video")
            .map(item => ({ id: item.snippet.resourceId.videoId, title: item.snippet.title, duration: 0 }));

        if (recentVideos.length === 0) { return []; }

        const videoIds = recentVideos.map(v => v.id).join(',');
        const durationsRes = await fetch(`https://www.googleapis.com/youtube/v3/videos?part=contentDetails&id=${videoIds}&key=${apiKey}`);
        const durationsData = await durationsRes.json();
        
        const durationsMap = {};
        durationsData.items.forEach(item => { durationsMap[item.id] = parseISO8601Duration(item.contentDetails.duration); });

        return recentVideos.map(video => ({ ...video, duration: durationsMap[video.id] || 1 }));
    } catch (error) {
        console.error("Error fetching channel videos:", error);
        return [];
    }
}

export default function YouTubePlaylistPlayer() {
  const [currentPlaylistIndex, setCurrentPlaylistIndex] = useState(-1)
  const [sideMenuPlaylistIndex, setSideMenuPlaylistIndex] = useState(0);
  const [currentVideoIndex, setCurrentVideoIndex] = useState(-1)
  const [isPlayerReady, setIsPlayerReady] = useState(false)
  const [playlists, setPlaylists] = useState([])
  const [isPlaying, setIsPlaying] = useState(false)
  const [playlistFilters, setPlaylistFilters] = useState({}); // { [playlistId]: 'all' | 'red' | ... }
  const [videoProgress, setVideoProgress] = useState({});
  const [activeShuffleOrder, setActiveShuffleOrder] = useState([]); // Currently playing shuffle order
  const [currentShufflePosition, setCurrentShufflePosition] = useState(0);
  const [shuffleSessionLog, setShuffleSessionLog] = useState([]);
  const [showSideMenu, setShowSideMenu] = useState(null);
  const [videoFilter, setVideoFilter] = useState('all'); // Filter for the side menu display
  const [draggingVideoId, setDraggingVideoId] = useState(null);
  const [renamingGroup, setRenamingGroup] = useState(null);
  const [groupRenameInput, setGroupRenameInput] = useState("");
  const [newPlaylistId, setNewPlaylistId] = useState('');
  const [userId, setUserId] = useState(null);
  const [videoPublishedYear, setVideoPublishedYear] = useState('');
  const [videoAuthorName, setVideoAuthorName] = useState('');
  const [videoViewCount, setVideoViewCount] = useState('');
  const [videoChannelId, setVideoChannelId] = useState('');
  const [authorVideos, setAuthorVideos] = useState([]);
  const [sideMenuAuthorName, setSideMenuAuthorName] = useState('');
  const [videoHistory, setVideoHistory] = useState([]);
  const [historyVisibleCount, setHistoryVisibleCount] = useState(12);
  const [visibleCount, setVisibleCount] = useState(12);
  const [selectedStarColor, setSelectedStarColor] = useState('yellow');
  const [showStarColorMenu, setShowStarColorMenu] = useState(false);
  const [isTitleExpanded, setIsTitleExpanded] = useState(false);
  const [bulkMode, setBulkMode] = useState(false); // Bulk assignment mode
  const [pendingBulkAssignments, setPendingBulkAssignments] = useState(new Map()); // Map of videoId -> color
  const [bulkDeleteMode, setBulkDeleteMode] = useState(false); // Bulk delete mode for playlists
  const [selectedPlaylistsForDelete, setSelectedPlaylistsForDelete] = useState(new Set()); // Set of playlist IDs selected for deletion
  const [bulkTagMode, setBulkTagMode] = useState(false); // Bulk tag mode for playlists
  const [targetPlaylistForBulkTag, setTargetPlaylistForBulkTag] = useState(null); // Target playlist ID for bulk tagging
  const [pendingPlaylistBulkAssignments, setPendingPlaylistBulkAssignments] = useState(new Map()); // Map of playlistId -> color
  const [hoveredStarVideoId, setHoveredStarVideoId] = useState(null);
  const [showCardStarColorMenu, setShowCardStarColorMenu] = useState(false);
  const [averageColor, setAverageColor] = useState('rgba(16, 16, 16, 0.7)');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [playlistTabs, setPlaylistTabs] = useState([{ name: 'All', playlistIds: [] }]);
  const [activePlaylistTab, setActivePlaylistTab] = useState(0);
  const [tabLastPlaylists, setTabLastPlaylists] = useState({}); // { [tabIndex]: playlistIndex }
  const [viewingPlaylistTab, setViewingPlaylistTab] = useState(0); // Which tab's contents to show in playlist grid menu
  const [activeTopMenuTab, setActiveTopMenuTab] = useState(0);
  const [showAddPlaylistModal, setShowAddPlaylistModal] = useState(false);
  const [renamingPlaylist, setRenamingPlaylist] = useState(null);
  const [playlistRenameInput, setPlaylistRenameInput] = useState("");
  const [showColoredFolders, setShowColoredFolders] = useState(true);
  const [showPlaylists, setShowPlaylists] = useState(true);
  const [sortMode, setSortMode] = useState('chronological');
  const [showColorPickerModal, setShowColorPickerModal] = useState(false);
  const [colorPickerVideo, setColorPickerVideo] = useState(null);
  const [customColors, setCustomColors] = useState({}); // { colorKey: { bg: 'bg-xxx-500', ring: 'ring-xxx-500', fill: 'text-xxx-500' } }
  const [colorOrder, setColorOrder] = useState([]); // Array of color keys in preferred order
  const [watchedFilter, setWatchedFilter] = useState('all');
  const [pinnedVideos, setPinnedVideos] = useState([]);
  const [scrollMemory, setScrollMemory] = useState({});
  const [contextMenuVideo, setContextMenuVideo] = useState(null);
  const [contextMenuPosition, setContextMenuPosition] = useState({ x: 0, y: 0 });
  const [showSendToPlaylistModal, setShowSendToPlaylistModal] = useState(false);
  const [sendToPlaylistVideo, setSendToPlaylistVideo] = useState(null);
  const [sendToPlaylistAction, setSendToPlaylistAction] = useState('copy'); // 'copy' or 'move'
  const [showMergeColoredFolderModal, setShowMergeColoredFolderModal] = useState(false);
  const [mergeColoredFolder, setMergeColoredFolder] = useState(null);
  const [showMergePlaylistModal, setShowMergePlaylistModal] = useState(false);
  const [mergePlaylist, setMergePlaylist] = useState(null);
  const [selectedTargetColor, setSelectedTargetColor] = useState(null);
  const [showBulkAddModal, setShowBulkAddModal] = useState(false);
  const [bulkPlaylistIds, setBulkPlaylistIds] = useState(Array(10).fill(''));
  const [isBulkAdding, setIsBulkAdding] = useState(() => {
    // Restore from sessionStorage on mount
    if (typeof window !== 'undefined') {
      const saved = sessionStorage.getItem('youtube-tv-bulk-add-progress');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (parsed.total > 0 && (parsed.inProgress > 0 || parsed.loaded < parsed.total)) {
            return true; // Still in progress
          }
        } catch (e) {}
      }
    }
    return false;
  });
  const [bulkAddProgress, setBulkAddProgress] = useState(() => {
    // Restore from sessionStorage on mount
    if (typeof window !== 'undefined') {
      const saved = sessionStorage.getItem('youtube-tv-bulk-add-progress');
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch (e) {}
      }
    }
    return { 
      loaded: 0, 
      inProgress: 0, 
      total: 0, 
      playlists: [], // Array of {id, name, status: 'pending' | 'fetching' | 'complete', videoCount: 0, totalVideos: 0}
      totalVideosLoaded: 0,
      totalVideosExpected: 0
    };
  });
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [configForm, setConfigForm] = useState({
    firebaseApiKey: '',
    firebaseAuthDomain: '',
    firebaseProjectId: '',
    firebaseStorageBucket: '',
    firebaseMessagingSenderId: '',
    firebaseAppId: '',
    firebaseMeasurementId: '',
    youtubeApiKey: ''
  });
  const [configError, setConfigError] = useState('');
  const [isConfigValidating, setIsConfigValidating] = useState(false);
  const [currentApiKey, setCurrentApiKey] = useState(defaultApiKey);
  const [isFirebaseInitialized, setIsFirebaseInitialized] = useState(false);
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  const [showPersistentIdModal, setShowPersistentIdModal] = useState(false);
  const [restoreIdInput, setRestoreIdInput] = useState('');

  const initialVideoLoaded = useRef(false);
  const hasMigratedStarsRef = useRef(false);
  const playlistShuffleOrders = useRef({}); 
  const playlistShufflePositions = useRef({});
  const progressSaveTimer = useRef(null);
  const mainDataSaveTimer = useRef(null);
  const fetchingPlaylists = useRef(new Set()); // Track playlists being fetched
  const isFetchingAnyPlaylist = useRef(false); // Global lock to prevent parallel fetching
  const fetchStartTimes = useRef(new Map()); // Track when fetches started to detect stale locks
  const pendingAssignments = useRef(new Set()); // Track pending color assignments to prevent duplicates
  const latestPlaylistsRef = useRef(null); // Track latest playlists state for staged saves
  const latestPlaylistTabsRef = useRef(null); // Track latest tabs state for staged saves
  const lastChangeTimeRef = useRef(0); // Track when last change was made
  const playlistsLoadedFromFirestore = useRef(new Set()); // Track playlists that were loaded from Firestore (to prevent re-fetching)
  const playlistsFetchedThisSession = useRef(new Set()); // Track playlists that have been fetched in this session (to prevent re-fetching on refresh)
  const titlesFetchedThisSession = useRef(new Set()); // Track video IDs that have had titles fetched in this session (to prevent duplicate API calls)
  const metadataCacheCheckedThisSession = useRef(new Set()); // Track video IDs that we've already checked in Firestore metadata cache (to prevent excessive reads)
  const metadataCacheInMemory = useRef(new Map()); // In-memory cache of metadata we've already fetched from Firestore
  
  // Load metadata cache from localStorage on mount (persists across refreshes)
  useEffect(() => {
    try {
      const cached = localStorage.getItem('youtube-tv-metadata-cache');
      if (cached) {
        const parsed = JSON.parse(cached);
        // Convert array back to Map
        Object.entries(parsed).forEach(([id, meta]) => {
          metadataCacheInMemory.current.set(id, meta);
        });
        console.log(`📦 Loaded ${Object.keys(parsed).length} cached metadata entries from localStorage`);
      }
    } catch (error) {
      console.warn('⚠️ Error loading metadata cache from localStorage:', error);
    }
  }, []);
  
  // Save metadata cache to localStorage periodically (debounced)
  const saveMetadataCacheToStorage = useRef(null);
  const persistMetadataCache = () => {
    if (saveMetadataCacheToStorage.current) {
      clearTimeout(saveMetadataCacheToStorage.current);
    }
    saveMetadataCacheToStorage.current = setTimeout(() => {
      try {
        // Convert Map to object for JSON serialization
        const cacheObj = {};
        metadataCacheInMemory.current.forEach((meta, id) => {
          cacheObj[id] = meta;
        });
        // Limit cache size to 10MB (roughly 50k videos with titles)
        const cacheStr = JSON.stringify(cacheObj);
        if (cacheStr.length > 10 * 1024 * 1024) {
          // If too large, keep only most recent 40k entries
          const entries = Object.entries(cacheObj);
          const recent = entries.slice(-40000);
          localStorage.setItem('youtube-tv-metadata-cache', JSON.stringify(Object.fromEntries(recent)));
          console.log(`💾 Saved metadata cache (trimmed to 40k entries, ${(JSON.stringify(Object.fromEntries(recent)).length / 1024 / 1024).toFixed(2)}MB)`);
        } else {
          localStorage.setItem('youtube-tv-metadata-cache', cacheStr);
        }
      } catch (error) {
        console.warn('⚠️ Error saving metadata cache to localStorage:', error);
      }
    }, 5000); // Debounce: save 5 seconds after last update
  };
  const titlesPendingFetch = useRef(new Set()); // Track video IDs currently being fetched (to prevent duplicate concurrent fetches)
  const apiCallQueue = useRef([]); // Queue for API calls to prevent rate limit issues
  const isProcessingApiQueue = useRef(false); // Track if API queue is being processed
  const lastApiCallTime = useRef(0); // Track last API call time for rate limiting
  const isSavingRef = useRef(false); // Track if we're currently saving to prevent snapshot overwrites
  const lastSaveTimeRef = useRef(0); // Track when we last saved
  const lastLocalChangeTimeRef = useRef(0); // Track when we last made a local change
  const hasLoadedInitialDataRef = useRef(false); // Track if we've loaded initial data from Firestore

  const playerRef = useRef(null)
  const playerContainerRef = useRef(null);
  const titleHoverTimerRef = useRef(null);
  const starHoverTimer = useRef(null);
  const starLeaveTimer = useRef(null);
  const cardStarHoverTimer = useRef(null);
  const cardStarLeaveTimer = useRef(null);

  const currentPlaylist = playlists[currentPlaylistIndex] || { videos: [], groups: {}, starred: [] };
  const chronologicalFilter = playlistFilters[currentPlaylist.id] || 'all';
  const currentVideoId = currentPlaylist.videos[currentVideoIndex]?.id || "";
  const currentVideoTitle = currentPlaylist.videos[currentVideoIndex]?.title || "No Video Selected";

  const groupRingColors = { 
    red: 'ring-red-500', green: 'ring-green-500', blue: 'ring-blue-500', yellow: 'ring-yellow-500',
    orange: 'ring-orange-500', purple: 'ring-purple-500', pink: 'ring-pink-500', cyan: 'ring-cyan-500', indigo: 'ring-indigo-500',
    teal: 'ring-teal-500', lime: 'ring-lime-500', amber: 'ring-amber-500', emerald: 'ring-emerald-500',
    violet: 'ring-violet-500', rose: 'ring-rose-500', sky: 'ring-sky-500'
  };
  const groupFillColors = { 
    red: 'text-red-400 fill-red-400', green: 'text-green-400 fill-green-400', blue: 'text-blue-400 fill-blue-400', yellow: 'text-yellow-400 fill-yellow-400',
    orange: 'text-orange-400 fill-orange-400', purple: 'text-purple-400 fill-purple-400', pink: 'text-pink-400 fill-pink-400', cyan: 'text-cyan-400 fill-cyan-400', indigo: 'text-indigo-400 fill-indigo-400',
    teal: 'text-teal-400 fill-teal-400', lime: 'text-lime-400 fill-lime-400', amber: 'text-amber-400 fill-amber-400', emerald: 'text-emerald-400 fill-emerald-400',
    violet: 'text-violet-400 fill-violet-400', rose: 'text-rose-400 fill-rose-400', sky: 'text-sky-400 fill-sky-400'
  };

  // Use only the 16 built-in colors, ignore custom colors for now
  const allColorKeys = Object.keys(groupColors);
  
  // Helper to get color classes (supports both built-in and custom colors)
  const getColorClass = (color) => customColors[color]?.bg || groupColors[color] || 'bg-gray-500';
  const getRingColor = (color) => customColors[color]?.ring || groupRingColors[color] || 'ring-gray-500';
  const getFillColor = (color) => customColors[color]?.fill || groupFillColors[color] || 'text-gray-500';
  
  const currentVideoGroupColor = (allColorKeys.find(c => (currentPlaylist.groups[c]?.videos || []).includes(currentVideoId))) || null;
  const activeStarBorderColor = currentVideoGroupColor || selectedStarColor;

  const getVideoGroupColor = (playlist, videoId) => (allColorKeys.find(c => (playlist.groups[c]?.videos || []).includes(videoId))) || null;


  const assignCurrentVideoToColor = (color) => {
    const videoId = currentVideoId;
    if (!videoId || !Object.keys(groupRingColors).includes(color)) return;
    
    // Prevent duplicate/rapid assignments
    const assignmentKey = `${currentPlaylistIndex}_${videoId}_${color}`;
    if (pendingAssignments.current.has(assignmentKey)) {
      console.log('⏭️ Skipping duplicate assignment:', assignmentKey);
      return;
    }
    pendingAssignments.current.add(assignmentKey);
    
    setPlaylists(prev => {
      const updated = prev.map((playlist, idx) => {
      if (idx !== currentPlaylistIndex) return playlist;
        
        // Check if already assigned to this color (idempotent check)
        const currentColor = (allColorKeys.find(c => (playlist.groups[c]?.videos || []).includes(videoId)));
        if (currentColor === color) {
          pendingAssignments.current.delete(assignmentKey);
          return playlist; // Already assigned, no change needed
        }
        
        
        // Ensure video exists in playlist's videos array (for persistence)
        const videoExists = playlist.videos.some(v => v.id === videoId);
        let updatedVideos = playlist.videos;
        if (!videoExists && currentVideo) {
          // Add video to playlist if it doesn't exist (for videos from search/unsorted)
          updatedVideos = [...playlist.videos, currentVideo];
        }
        
        // Update groups
      const newGroups = { ...playlist.groups };
      Object.keys(groupColors).forEach(c => {
          newGroups[c] = { 
            ...(newGroups[c] || { name: c, videos: [] }), 
            videos: (newGroups[c]?.videos || []).filter(id => id !== videoId) 
          };
      });
        
      const targetList = newGroups[color]?.videos || [];
      if (!targetList.includes(videoId)) {
          newGroups[color] = { 
            ...(newGroups[color] || { name: color, videos: [] }), 
            videos: [...targetList, videoId] 
          };
      }
        
        // Clear the pending assignment after a short delay
        setTimeout(() => {
          pendingAssignments.current.delete(assignmentKey);
        }, 300);
        
        return { 
          ...playlist, 
          videos: updatedVideos,
          groups: newGroups, 
          starred: (playlist.starred || []).filter(id => id !== videoId) 
        };
      });
      
      return updated;
    });
  };

  const assignVideoToColor = (playlistIndex, videoId, color) => {
    if (!videoId || !Object.keys(groupRingColors).includes(color)) return;
    
    // Prevent duplicate/rapid assignments
    const assignmentKey = `${playlistIndex}_${videoId}_${color}`;
    if (pendingAssignments.current.has(assignmentKey)) {
      console.log('⏭️ Skipping duplicate assignment:', assignmentKey);
      return;
    }
    pendingAssignments.current.add(assignmentKey);
    
    setPlaylists(prev => {
      const updated = prev.map((playlist, idx) => {
      if (idx !== playlistIndex) return playlist;
        
        // Check if already assigned to this color (idempotent check)
        const currentColor = (allColorKeys.find(c => (playlist.groups[c]?.videos || []).includes(videoId)));
        if (currentColor === color) {
          pendingAssignments.current.delete(assignmentKey);
          return playlist; // Already assigned, no change needed
        }
        
        
        // Find the video object to ensure it exists in the playlist
        let videoObj = playlist.videos.find(v => v.id === videoId);
        
        // If video not in playlist, try to find it in side menu videos
        if (!videoObj) {
          const sideMenuVideos = getSideMenuVideos(playlist);
          videoObj = sideMenuVideos.find(v => v.id === videoId);
        }
        
        // If still not found, try current video
        if (!videoObj && currentVideo && currentVideo.id === videoId) {
          videoObj = currentVideo;
        }
        
        // Ensure video exists in playlist's videos array (for persistence)
        let updatedVideos = playlist.videos;
        if (!playlist.videos.some(v => v.id === videoId) && videoObj) {
          updatedVideos = [...playlist.videos, videoObj];
        }
        
        // Update groups - ensure we're working with the latest state
      const newGroups = { ...playlist.groups };
      Object.keys(groupColors).forEach(c => {
          newGroups[c] = { 
            ...(newGroups[c] || { name: c, videos: [] }), 
            videos: (newGroups[c]?.videos || []).filter(id => id !== videoId) 
          };
      });
        
      const targetList = newGroups[color]?.videos || [];
      if (!targetList.includes(videoId)) {
          newGroups[color] = { 
            ...(newGroups[color] || { name: color, videos: [] }), 
            videos: [...targetList, videoId] 
          };
      }
        
        // Clear the pending assignment after a short delay
        setTimeout(() => {
          pendingAssignments.current.delete(assignmentKey);
        }, 300);
        
        return { 
          ...playlist, 
          videos: updatedVideos,
          groups: newGroups, 
          starred: (playlist.starred || []).filter(id => id !== videoId) 
        };
      });
      
      return updated;
    });
  };

  // Bulk assignment save handler
  const handleBulkSave = () => {
    if (pendingBulkAssignments.size === 0) return;
    
    console.log(`💾 Bulk saving ${pendingBulkAssignments.size} assignments...`);
    
    setPlaylists(prev => {
      const updated = prev.map((playlist, idx) => {
        if (idx !== sideMenuPlaylistIndex) return playlist;
        
        // Process all pending assignments for this playlist
        let updatedVideos = [...playlist.videos];
        const newGroups = { ...playlist.groups };
        
        // Initialize groups if needed
        Object.keys(groupColors).forEach(c => {
          if (!newGroups[c]) {
            newGroups[c] = { name: c.charAt(0).toUpperCase() + c.slice(1), videos: [] };
          }
        });
        
        // Process each pending assignment
        const usedColors = new Set();
        pendingBulkAssignments.forEach((color, videoId) => {
          usedColors.add(color);
          
          // Find video object
          let videoObj = playlist.videos.find(v => v.id === videoId);
          if (!videoObj) {
            const sideMenuVideos = getSideMenuVideos(playlist);
            videoObj = sideMenuVideos.find(v => v.id === videoId);
          }
          
          // Add video to playlist if not present
          if (!playlist.videos.some(v => v.id === videoId) && videoObj) {
            updatedVideos.push(videoObj);
          }
          
          // Remove from all groups first
          Object.keys(groupColors).forEach(c => {
            newGroups[c] = {
              ...newGroups[c],
              videos: (newGroups[c]?.videos || []).filter(id => id !== videoId)
            };
          });
          
          // Add to target color group
          const targetList = newGroups[color]?.videos || [];
          if (!targetList.includes(videoId)) {
            newGroups[color] = {
              ...newGroups[color],
              videos: [...targetList, videoId]
            };
          }
        });
        
        return {
          ...playlist,
          videos: updatedVideos,
          groups: newGroups
        };
      });
      
      return updated;
    });
    
    // Clear pending assignments
    setPendingBulkAssignments(new Map());
    console.log(`✅ Bulk save complete!`);
    
    // Force update the latest refs to ensure staged save picks up the changes
    // The staged save useEffect should trigger automatically, but let's ensure it sees the update
    setTimeout(() => {
      console.log(`🔄 Bulk save: Waiting for staged save to trigger...`);
    }, 100);
  };

  // Persistent ID management functions
  const copyPersistentId = () => {
    const persistentId = getPersistentUserId();
    if (persistentId) {
      navigator.clipboard.writeText(persistentId).then(() => {
        alert('✅ Persistent ID copied to clipboard! Save it somewhere safe.');
      }).catch(() => {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = persistentId;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        alert('✅ Persistent ID copied to clipboard! Save it somewhere safe.');
      });
    }
  };

  const restorePersistentId = () => {
    if (!restoreIdInput.trim()) {
      alert('⚠️ Please enter a persistent ID');
      return;
    }
    
    const inputId = restoreIdInput.trim();
    if (!inputId.startsWith('persistent_')) {
      alert('⚠️ Invalid persistent ID format. It should start with "persistent_"');
      return;
    }
    
    if (confirm(`⚠️ WARNING: This will replace your current persistent ID (${userId}) with ${inputId}.\n\nThis will change which user data you see. If you have data under the old ID, you may lose access to it.\n\nAre you sure you want to continue?`)) {
      localStorage.setItem(PERSISTENT_USER_ID_KEY, inputId);
      alert('✅ Persistent ID restored! The page will reload to apply the change.');
      window.location.reload();
    }
  };

  // Configuration management functions
  const validateConfig = async (config) => {
    setIsConfigValidating(true);
    setConfigError('');

    try {
      // Validate YouTube API key
      if (config.youtubeApiKey) {
        const testResponse = await fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=1&q=test&key=${config.youtubeApiKey}`);
        if (!testResponse.ok) {
          throw new Error('Invalid YouTube API key');
        }
      }

      // Validate Firebase config by attempting to initialize
      if (config.firebaseApiKey && config.firebaseProjectId) {
        const testFirebaseConfig = {
          apiKey: config.firebaseApiKey,
          authDomain: config.firebaseAuthDomain,
          projectId: config.firebaseProjectId,
          storageBucket: config.firebaseStorageBucket,
          messagingSenderId: config.firebaseMessagingSenderId,
          appId: config.firebaseAppId,
          measurementId: config.firebaseMeasurementId
        };

        // Firebase connection test removed - using local SQLite database instead
        // No need to test Firebase connection since we're not using it
        // Just validate the config format is correct (all fields present)
        // Config validation passed if we got here
      }

      return true;
    } catch (error) {
      setConfigError(error.message || 'Configuration validation failed');
      return false;
    } finally {
      setIsConfigValidating(false);
    }
  };

  const handleConfigSubmit = async (e) => {
    e.preventDefault();
    
    const firebaseConfig = {
      apiKey: configForm.firebaseApiKey,
      authDomain: configForm.firebaseAuthDomain,
      projectId: configForm.firebaseProjectId,
      storageBucket: configForm.firebaseStorageBucket,
      messagingSenderId: configForm.firebaseMessagingSenderId,
      appId: configForm.firebaseAppId,
      measurementId: configForm.firebaseMeasurementId
    };

    const isValid = await validateConfig({
      firebaseConfig,
      youtubeApiKey: configForm.youtubeApiKey
    });

    if (isValid) {
      const success = storeConfig(firebaseConfig, configForm.youtubeApiKey);
      if (success) {
        setCurrentApiKey(configForm.youtubeApiKey);
        setShowConfigModal(false);
        // Reload the page to reinitialize with new config
        window.location.reload();
      } else {
        setConfigError('Failed to save configuration');
      }
    }
  };

  const handleConfigChange = (field, value) => {
    setConfigForm(prev => ({ ...prev, [field]: value }));
    setConfigError('');
  };

  const useDefaultConfig = () => {
    const success = storeConfig(defaultFirebaseConfig, defaultApiKey);
    if (success) {
      setCurrentApiKey(defaultApiKey);
      setShowConfigModal(false);
      window.location.reload();
    }
  };

  const resetConfiguration = () => {
    if (confirm('Are you sure you want to reset your configuration? This will clear your stored API keys and Firebase settings, and you\'ll need to set them up again.')) {
      localStorage.removeItem(CONFIG_STORAGE_KEY);
      setShowConfigModal(true);
      setIsFirebaseInitialized(false);
      setCurrentApiKey('');
      // Clear any existing Firebase data
      window.location.reload();
    }
  };

  // Check if API key exists on app load (local DB doesn't need Firebase)
  useEffect(() => {
    const stored = localStorage.getItem(CONFIG_STORAGE_KEY);
    if (!stored) {
      setShowConfigModal(true);
      setIsFirebaseInitialized(false);
    } else {
      // Load API key from stored config
      try {
        const config = JSON.parse(stored);
        setCurrentApiKey(config.apiKey || defaultApiKey);
        setIsFirebaseInitialized(true); // Reuse this flag to indicate app is ready
      } catch (error) {
        console.error('Error loading config:', error);
        setShowConfigModal(true);
        setIsFirebaseInitialized(false);
      }
    }
  }, []);

  // Close settings menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showSettingsMenu && !event.target.closest('.settings-menu')) {
        setShowSettingsMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showSettingsMenu]);

  // Initialize persistent user ID (independent of Firebase auth)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const persistentUserId = getPersistentUserId();
    console.log(`🆔 Using persistent user ID: ${persistentUserId}`);
    setUserId(persistentUserId);
  }, []);

  // Expose recovery function (disabled for local database - data is per-user)
  useEffect(() => {
    if (!userId) return;
    
    window.recoverDataFromUser = async (sourceUserId) => {
      console.warn('⚠️ Data recovery from other users is not supported with local database');
      alert('Data recovery from other users is not supported with local database. Each user has their own isolated data.');
    };
  }, [userId]);

  // Load data from local database
  useEffect(() => {
    if (!userId || !isFirebaseInitialized) return; // Reuse isFirebaseInitialized flag to indicate app is ready

    console.log(`📥 Loading data from local database for user: ${userId}`);
    
    const loadData = async () => {
      try {
        if (!hasLoadedInitialDataRef.current) {
          hasLoadedInitialDataRef.current = true;
          console.log(`📥 Initial data load from local database`);
        }
        
        const data = await fetchUserData(userId);
        console.log(`📦 Local database data loaded:`, {
          playlistCount: data.playlists?.length || 0,
          tabCount: data.playlistTabs?.length || 0,
          videoProgressCount: Object.keys(data.videoProgress || {}).length
        });
        
        let finalPlaylists = data.playlists || initialPlaylists;
        const finalTabs = data.playlistTabs || [{ name: 'All', playlistIds: [] }];
        
        // Load custom colors and color order
        if (data.customColors) {
          setCustomColors(data.customColors);
        }
        if (data.colorOrder) {
          setColorOrder(data.colorOrder);
        }
        
        setVideoProgress(data.videoProgress || {});

        // Remove duplicates by keeping the first occurrence of each playlist ID
        const seenIds = new Set();
        const originalLength = finalPlaylists.length;
        console.log(`🔍 Processing ${originalLength} playlists from local database`);
        finalPlaylists = finalPlaylists.filter(playlist => {
          if (seenIds.has(playlist.id)) {
            console.warn(`⚠️ Removing duplicate playlist: ${playlist.id} (${playlist.name})`);
            return false;
          }
          seenIds.add(playlist.id);
          return true;
        });
        if (finalPlaylists.length < originalLength) {
          console.log(`🧹 Filtered ${originalLength - finalPlaylists.length} duplicate playlists`);
        }
        
        // Normalize playlists: ensure all have groups structure
      let needsNormalization = false;
      finalPlaylists = finalPlaylists.map(playlist => {
        let playlistNeedsNormalization = false;
        let normalizedPlaylist = playlist;
        
        if (!playlist.groups || typeof playlist.groups !== 'object') {
          playlistNeedsNormalization = true;
          normalizedPlaylist = {
            ...playlist,
            groups: createDefaultGroups()
          };
        } else {
        // Ensure each color group has the proper structure and validate video IDs
        const normalizedGroups = { ...playlist.groups };
        // Only create video ID set if playlist has videos (prevents errors and incorrect filtering)
        const playlistVideoIds = new Set((playlist.videos || []).map(v => v && v.id ? v.id : null).filter(Boolean));
        Object.keys(groupColors).forEach(color => {
          if (!normalizedGroups[color] || typeof normalizedGroups[color] !== 'object') {
            playlistNeedsNormalization = true;
            normalizedGroups[color] = { name: color.charAt(0).toUpperCase() + color.slice(1), videos: [] };
          } else {
            const group = normalizedGroups[color];
            let updatedGroup = { ...group };
            
            if (!group.name) {
              playlistNeedsNormalization = true;
              updatedGroup.name = color.charAt(0).toUpperCase() + color.slice(1);
            }
            if (!Array.isArray(group.videos)) {
              playlistNeedsNormalization = true;
              updatedGroup.videos = [];
            } else {
              // CRITICAL: Always preserve the original video IDs array
              // Never filter out video IDs - they might be from merged videos
              // Even if they're not in the videos array yet, they should be preserved
              updatedGroup.videos = [...group.videos]; // Explicitly preserve all IDs
              
              // Validate that all video IDs in the group exist in the playlist
              // BUT: Only log warnings, never filter
              if (playlist.videos && playlist.videos.length > 0) {
                const validVideoIds = group.videos.filter(videoId => playlistVideoIds.has(videoId));
                if (validVideoIds.length !== group.videos.length) {
                  const orphanedCount = group.videos.length - validVideoIds.length;
                  const orphanedIds = group.videos.filter(videoId => !playlistVideoIds.has(videoId));
                  console.warn(`⚠️ ${playlist.name} ${color} group has ${orphanedCount} video IDs not in playlist videos array:`, orphanedIds.slice(0, 5), orphanedIds.length > 5 ? `... (${orphanedCount} total)` : '');
                  console.log(`🔒 PRESERVING all ${group.videos.length} video IDs in ${color} group (including ${orphanedCount} orphaned) - these may be merged videos that will be restored`);
                  // CRITICAL: DON'T filter them out - keep all video IDs to preserve user assignments
                  // The videos might be from merges that haven't been fully saved yet
                } else {
                  console.log(`✅ ${playlist.name} ${color} group: all ${group.videos.length} video IDs exist in videos array`);
                }
              } else {
                // Playlist has no videos yet - keep the group videos as-is (they'll be validated when videos are loaded)
                console.log(`⚠️ Playlist ${playlist.name} has no videos yet, keeping ${color} group with ${group.videos.length} video IDs`);
              }
            }
            
            normalizedGroups[color] = updatedGroup;
          }
        });
          if (playlistNeedsNormalization) {
            normalizedPlaylist = { ...playlist, groups: normalizedGroups };
          }
        }
        
        if (playlistNeedsNormalization) {
          needsNormalization = true;
        }
        
        return normalizedPlaylist;
      });
      
        // Ensure _unsorted_ playlist exists
        if (!finalPlaylists.some(p => p.id === '_unsorted_')) {
          finalPlaylists.push({
            name: "Unsorted", id: "_unsorted_", videos: [],
            groups: createDefaultGroups(),
            starred: []
          });
        }
        
        // Track which playlists have videos (so we know they don't need fetching)
        const playlistsWithVideos = new Set(finalPlaylists.filter(p => p.videos && p.videos.length > 0).map(p => p.id));
        playlistsLoadedFromFirestore.current = new Set(finalPlaylists.map(p => p.id));
      
        // Expand video IDs to full video objects if needed
        finalPlaylists = finalPlaylists.map(playlist => {
          if (!playlist.videos || playlist.videos.length === 0) return playlist;
          
          // Check if videos are already full objects or just IDs
          const firstVideo = playlist.videos[0];
          const videosAreIds = typeof firstVideo === 'string';
          
          if (!videosAreIds) {
            // Videos are already full objects, no expansion needed
            return playlist;
          }
          
          // Videos are just IDs (strings) - expand them to minimal objects
          const expandedVideos = playlist.videos.map(v => ({
            id: typeof v === 'string' ? v : (v?.id || v),
            title: '',
            duration: 1
          }));
          
          return {
            ...playlist,
            videos: expandedVideos
          };
        });
        
        // Mark playlists with videos as fetched this session
        playlistsWithVideos.forEach(id => playlistsFetchedThisSession.current.add(id));
        
        setPlaylists(finalPlaylists);
        setPlaylistTabs(finalTabs);
      } catch (error) {
        console.error("Error fetching data from local database:", error);
        alert("Failed to load data from local database. Please check the console for details.");
      }
    };
    
    loadData();
  }, [userId, isFirebaseInitialized]);


  // Load video history and set initial video (simplified for local database)
  useEffect(() => {
    if (!userId || !isFirebaseInitialized || playlists.length === 0) return;

    // TODO: Add video history API endpoint and load from local database
    // For now, just set empty history and start with first playlist
    setVideoHistory([]);

    if (initialVideoLoaded.current || !playlists.some(p => p.videos.length > 0)) {
      return;
    }
    
    // Start with first playlist that has videos
    const memeSongsIndex = playlists.findIndex(p => p.id === "PLV2ewAgCPCq0DVamOw2sQSAVdFVjA6x78");
    const targetPlaylistIndex = memeSongsIndex !== -1 ? memeSongsIndex : 0;
    const targetPlaylist = playlists[targetPlaylistIndex];
    
    if (targetPlaylist && targetPlaylist.videos.length > 0) {
      if (!playlistShuffleOrders.current[targetPlaylist.id]?.['all'] || playlistShuffleOrders.current[targetPlaylist.id]['all'].length !== targetPlaylist.videos.length) {
        playlistShuffleOrders.current = {
          ...playlistShuffleOrders.current,
          [targetPlaylist.id]: {
            ...playlistShuffleOrders.current[targetPlaylist.id],
            'all': generateNewShuffleOrder(targetPlaylist, 'all')
          }
        };
      }

      const currentShuffleOrder = playlistShuffleOrders.current[targetPlaylist.id]['all'];
      const randomIndex = Math.floor(Math.random() * currentShuffleOrder.length);
      const randomVideoIndex = currentShuffleOrder[randomIndex];
      
      setCurrentPlaylistIndex(targetPlaylistIndex);
      setCurrentVideoIndex(randomVideoIndex);
      setActiveShuffleOrder(currentShuffleOrder);
      setCurrentShufflePosition(randomIndex);
      setPlaylistFilters(prev => ({ ...prev, [targetPlaylist.id]: 'all' }));
      playlistShufflePositions.current = {
        ...playlistShufflePositions.current,
        [targetPlaylist.id]: {
          ...playlistShufflePositions.current[targetPlaylist.id],
          'all': randomIndex
        }
      };
      
      initialVideoLoaded.current = true;
    }
  }, [userId, playlists, isFirebaseInitialized]);

  // One-time migration: move all starred videos into yellow group and clear starred arrays
  useEffect(() => {
    if (!userId || hasMigratedStarsRef.current || playlists.length === 0) return;
    const anyStarred = playlists.some(p => (p.starred || []).length > 0);
    if (!anyStarred) { hasMigratedStarsRef.current = true; return; }
    setPlaylists(prev => prev.map(playlist => {
      const starred = playlist.starred || [];
      if (starred.length === 0) return playlist;
      const currentYellow = playlist.groups?.yellow?.videos || [];
      const mergedYellow = Array.from(new Set([...currentYellow, ...starred]));
      return {
        ...playlist,
        groups: {
          ...playlist.groups,
          yellow: { ...(playlist.groups?.yellow || { name: 'Yellow', videos: [] }), videos: mergedYellow }
        },
        starred: []
      };
    }));
    hasMigratedStarsRef.current = true;
  }, [userId, playlists]);

  // Track latest state in refs for staged saves (prevents saving intermediate states)
  useEffect(() => {
    latestPlaylistsRef.current = playlists;
    latestPlaylistTabsRef.current = playlistTabs;
    lastChangeTimeRef.current = Date.now();
    lastLocalChangeTimeRef.current = Date.now(); // Track when local state changes
    
    // Log when playlists change to help debug staged saves
    if (playlists.length > 0) {
      const groupCounts = playlists.map(p => {
        if (p.groups) {
          const counts = Object.entries(p.groups).map(([color, group]) => 
            `${color}:${Array.isArray(group.videos) ? group.videos.length : 0}`
          ).join(', ');
          return `${p.name}[${counts}]`;
        }
        return `${p.name}[no groups]`;
      }).join(' | ');
      console.log(`🔄 Playlists state updated: ${groupCounts}`);
    }
  }, [playlists, playlistTabs]);

  // Persist bulk add progress to sessionStorage whenever it changes
  useEffect(() => {
    if (isBulkAdding && bulkAddProgress.total > 0 && typeof window !== 'undefined') {
      sessionStorage.setItem('youtube-tv-bulk-add-progress', JSON.stringify(bulkAddProgress));
      sessionStorage.setItem('youtube-tv-bulk-adding', 'true');
    } else if (!isBulkAdding && typeof window !== 'undefined') {
      // Clear when not bulk adding
      const saved = sessionStorage.getItem('youtube-tv-bulk-add-progress');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          // Only clear if all playlists are complete
          if (parsed.inProgress === 0 && parsed.loaded === parsed.total && parsed.total > 0) {
            sessionStorage.removeItem('youtube-tv-bulk-add-progress');
            sessionStorage.removeItem('youtube-tv-bulk-adding');
          }
        } catch (e) {}
      }
    }
  }, [isBulkAdding, bulkAddProgress]);

  // Calculate bulk add progress message - must be at top level (Rules of Hooks)
  const bulkAddProgressMessage = useMemo(() => {
    if (!isBulkAdding || bulkAddProgress.total === 0) return '';
    
    // Count playlists that are complete AND have videos in the current state
    const filledCount = bulkAddProgress.playlists.filter(p => {
      if (p.status !== 'complete') return false;
      const currentPlaylist = playlists.find(pl => pl.id === p.id);
      return currentPlaylist && currentPlaylist.videos && currentPlaylist.videos.length > 0;
    }).length;
    
    const workingCount = bulkAddProgress.inProgress;
    const pendingCount = bulkAddProgress.total - bulkAddProgress.loaded - bulkAddProgress.inProgress;
    
    if (filledCount > 0 && workingCount > 0) {
      return `${filledCount} playlist${filledCount !== 1 ? 's' : ''} filled with videos. Working on ${workingCount} more...`;
    } else if (filledCount > 0) {
      return `${filledCount} playlist${filledCount !== 1 ? 's' : ''} filled with videos${pendingCount > 0 ? `. ${pendingCount} pending.` : '.'}`;
    } else if (workingCount > 0) {
      return `Working on ${workingCount} playlist${workingCount !== 1 ? 's' : ''}...`;
    } else if (bulkAddProgress.loaded > 0) {
      return `${bulkAddProgress.loaded} of ${bulkAddProgress.total} complete`;
    } else {
      return `Starting...`;
    }
  }, [isBulkAdding, bulkAddProgress, playlists]);

  // Persist bulk add progress to sessionStorage whenever it changes
  useEffect(() => {
    if (isBulkAdding && bulkAddProgress.total > 0 && typeof window !== 'undefined') {
      sessionStorage.setItem('youtube-tv-bulk-add-progress', JSON.stringify(bulkAddProgress));
      sessionStorage.setItem('youtube-tv-bulk-adding', 'true');
    }
  }, [isBulkAdding, bulkAddProgress]);

  // **STAGED SAVE** - Wait for quiet period before saving to local database
  // This ensures all rapid changes are captured before saving
  useEffect(() => {
    if (!userId || !initialVideoLoaded.current || !isFirebaseInitialized) {
      if (!userId) console.log(`⏭️ Staged save skipped: no userId`);
      if (!initialVideoLoaded.current) console.log(`⏭️ Staged save skipped: initial video not loaded yet (initialVideoLoaded=${initialVideoLoaded.current})`);
      if (!isFirebaseInitialized) console.log(`⏭️ Staged save skipped: app not initialized yet (isFirebaseInitialized=${isFirebaseInitialized})`);
      return;
    }
    
    console.log(`⏱️ Staged save effect triggered (playlists changed, waiting for quiet period...)`);

    if (mainDataSaveTimer.current) {
      clearTimeout(mainDataSaveTimer.current);
    }

    const performStagedSave = async () => {
      // Always use the latest ref values, not the state at effect time
      // This ensures we save the final state after all rapid changes
      const playlistsToSave = latestPlaylistsRef.current || playlists;
      const tabsToSave = latestPlaylistTabsRef.current || playlistTabs;
      const playlistCounts = playlistsToSave.map(p => ({ 
        id: p.id, 
        name: p.name, 
        videoCount: p.videos?.length || 0,
        groups: p.groups ? {
          red: p.groups.red?.videos?.length || 0,
          green: p.groups.green?.videos?.length || 0,
          pink: p.groups.pink?.videos?.length || 0,
          yellow: p.groups.yellow?.videos?.length || 0
        } : 'missing'
      }));
      console.log(`💾 Staged save: Saving playlists to Firestore:`, playlistCounts);
      
      // Log detailed group information for debugging
      playlistsToSave.forEach(p => {
        if (p.groups) {
          const groupCounts = Object.entries(p.groups).map(([color, group]) => 
            `${color}: ${Array.isArray(group.videos) ? group.videos.length : 'invalid'}`
          ).join(', ');
          console.log(`  📁 Saving ${p.name} (${p.id}): videos=${p.videos?.length || 0}, groups=[${groupCounts}]`);
          
          // CRITICAL: Verify all video IDs in groups have corresponding video objects
          const videoIdsInArray = new Set((p.videos || []).map(v => v?.id).filter(Boolean));
          Object.entries(p.groups).forEach(([color, group]) => {
            if (!Array.isArray(group.videos)) {
              console.error(`  ❌ ERROR: ${p.name} ${color} group videos is not an array!`, group);
            } else {
              const orphanedIds = group.videos.filter(id => !videoIdsInArray.has(id));
              if (orphanedIds.length > 0) {
                console.error(`  ❌ CRITICAL: ${p.name} ${color} group has ${orphanedIds.length} video IDs without video objects:`, orphanedIds.slice(0, 5));
                console.error(`  ❌ This will cause data loss on refresh! Video IDs:`, orphanedIds);
              }
            }
          });
        } else {
          console.warn(`  ⚠️ ${p.name} (${p.id}) has no groups object!`);
        }
      });
      
      // CRITICAL: Before saving, fix any orphaned video IDs in groups
      // This prevents data loss on refresh
      const fixedPlaylists = playlistsToSave.map(p => {
        if (!p.groups || !p.videos) return p;
        
        const videoIdsInArray = new Set((p.videos || []).map(v => v?.id).filter(Boolean));
        let needsFix = false;
        const fixedGroups = { ...p.groups };
        
        Object.entries(p.groups).forEach(([color, group]) => {
          if (Array.isArray(group.videos)) {
            const orphanedIds = group.videos.filter(id => !videoIdsInArray.has(id));
            if (orphanedIds.length > 0) {
              console.error(`❌ CRITICAL PRE-SAVE ERROR: ${p.name} ${color} group has ${orphanedIds.length} orphaned video IDs without video objects!`, orphanedIds);
              console.error(`  📊 ${p.name} has ${p.videos.length} videos in array, but ${color} group references ${group.videos.length} IDs`);
              console.error(`  🔍 This indicates a merge bug - video IDs were added to group but video objects weren't added to videos array`);
              console.error(`  ⚠️ Removing orphaned IDs to prevent data loss, but this will cause the merged videos to be lost!`);
              // Remove orphaned IDs - they can't be restored if video objects don't exist
              fixedGroups[color] = {
                ...group,
                videos: group.videos.filter(id => videoIdsInArray.has(id))
              };
              needsFix = true;
            }
          }
        });
        
        if (needsFix) {
          console.error(`🔧 Fixed orphaned video IDs in ${p.name} before saving - THIS WILL CAUSE DATA LOSS IF VIDEOS WEREN'T PROPERLY ADDED TO ARRAY`);
          return { ...p, groups: fixedGroups };
        }
        
        return p;
      });
      
      // Mark that we're saving to prevent snapshot from overwriting
      isSavingRef.current = true;
      lastSaveTimeRef.current = Date.now();
      
      // Calculate total size of data being saved for debugging
      const totalVideos = fixedPlaylists.reduce((sum, p) => sum + (p.videos?.length || 0), 0);
      const totalGroupIds = fixedPlaylists.reduce((sum, p) => {
        if (!p.groups) return sum;
        return sum + Object.values(p.groups).reduce((s, g) => s + (Array.isArray(g.videos) ? g.videos.length : 0), 0);
      }, 0);
      console.log(`💾 Saving to Firestore: ${fixedPlaylists.length} playlists, ${totalVideos} total videos, ${totalGroupIds} total group video IDs`);
      
      // CRITICAL FIX: Firestore has a 1MB document size limit (1,048,576 bytes)
      // At 1100KB, we're exceeding the limit. Store ONLY video IDs (no titles) to minimize size.
      // Each video: ~11 bytes (ID only) vs ~100+ bytes (ID + title) = ~90% size reduction
      // Titles will be fetched on-demand from YouTube API or videoMetadata subcollection
      const optimizedPlaylists = fixedPlaylists.map(playlist => {
        // Store ONLY video IDs as strings - this is the smallest possible format
        // This reduces document size by ~90% compared to storing ID + title
        const optimizedVideos = (playlist.videos || []).map(video => {
          // Extract just the ID - convert to string format for minimal size
          if (typeof video === 'string') return video; // Already a string ID
          // Extract ID from object and return as string
          const videoId = video.id || video;
          return typeof videoId === 'string' ? videoId : String(videoId);
        });
        
        // Build playlist object, preserving representativeVideoId
        const playlistToSave = {
          ...playlist,
          videos: optimizedVideos
        };
        
        // Explicitly preserve representativeVideoId if it exists (even if it's an empty string, we want to preserve it)
        // Only exclude it if it's explicitly undefined or null
        if (playlist.representativeVideoId !== undefined && playlist.representativeVideoId !== null) {
          playlistToSave.representativeVideoId = playlist.representativeVideoId;
          console.log(`💾 Saving representativeVideoId for ${playlist.name}: ${playlist.representativeVideoId}`);
        } else {
          // Explicitly remove it if it's undefined/null to prevent Firestore errors
          delete playlistToSave.representativeVideoId;
        }
        
        return playlistToSave;
      });
      
      // Estimate document size (rough calculation)
      const estimatedSize = JSON.stringify({
        playlists: optimizedPlaylists,
        playlistTabs: tabsToSave,
        customColors: customColors
      }).length;
      
      console.log(`📊 Estimated document size: ${(estimatedSize / 1024).toFixed(2)} KB (limit: 1024 KB)`);
      
      if (estimatedSize > 1000000) { // 1MB in bytes
        console.error(`❌ CRITICAL: Document size (${(estimatedSize / 1024).toFixed(2)} KB) exceeds Firestore limit!`);
        console.error(`   This will cause save to fail. Consider splitting large playlists or storing videos in subcollections.`);
      }
      
      try {
        await saveUserData(userId, {
          playlists: optimizedPlaylists,
          playlistTabs: tabsToSave,
          customColors: customColors,
          colorOrder: colorOrder
        });
        
        console.log(`✅ Successfully saved playlists to local database (including groups)`);
        // Log what was actually saved to verify - use optimizedPlaylists
        optimizedPlaylists.forEach(p => {
          if (p.groups) {
            const groupCounts = Object.entries(p.groups).map(([color, group]) => 
              `${color}: ${Array.isArray(group.videos) ? group.videos.length : 'invalid'}`
            ).join(', ');
            console.log(`  ✅ Confirmed saved ${p.name}: videos=${p.videos?.length || 0}, groups=[${groupCounts}]`);
          } else {
            console.log(`  ✅ Confirmed saved ${p.name}: videos=${p.videos?.length || 0}, groups=missing`);
          }
        });
        
        isSavingRef.current = false;
        lastSaveTimeRef.current = Date.now();
      } catch (error) {
        console.error("❌ CRITICAL ERROR saving main data to local database:", error);
        console.error("  Error details:", {
          message: error.message,
          stack: error.stack
        });
        console.error("  Attempted to save:", {
          playlistCount: optimizedPlaylists.length,
          totalVideos: optimizedPlaylists.reduce((sum, p) => sum + (p.videos?.length || 0), 0),
          estimatedSize: `${(estimatedSize / 1024).toFixed(2)} KB`
        });
        isSavingRef.current = false;
      }
    };

    // Wait for a "quiet period" - no changes for 2 seconds
    // This ensures we capture all rapid clicks before saving
    mainDataSaveTimer.current = setTimeout(() => {
      // Check if there were any changes in the last 2 seconds
      const timeSinceLastChange = Date.now() - lastChangeTimeRef.current;
      if (timeSinceLastChange < 1900) {
        // Changes happened recently, wait a bit more for quiet period
        mainDataSaveTimer.current = setTimeout(() => {
          performStagedSave();
        }, 2000);
        return;
      }
      
      // Quiet period achieved, save now
      performStagedSave();
    }, 2000);

    return () => {
      if (mainDataSaveTimer.current) {
        clearTimeout(mainDataSaveTimer.current);
      }
    };
  }, [playlists, playlistTabs, customColors, colorOrder, userId, isFirebaseInitialized]);

  // **OPTIMIZED** Save high-frequency video progress data with debouncing and targeted updates
  useEffect(() => {
      if (!userId || Object.keys(videoProgress).length === 0 || !isFirebaseInitialized) return;

      if (progressSaveTimer.current) {
          clearTimeout(progressSaveTimer.current);
      }

      progressSaveTimer.current = setTimeout(async () => {
          try {
            await saveVideoProgress(userId, videoProgress);
            console.log(`✅ Saved video progress for ${Object.keys(videoProgress).length} videos`);
          } catch (error) {
            console.error("Error saving video progress to local database:", error);
          }
      }, 2000); // Longer debounce for progress

      return () => {
          if (progressSaveTimer.current) {
              clearTimeout(progressSaveTimer.current);
          }
      };
  }, [videoProgress, userId, isFirebaseInitialized]);

  // Fetch and cache video metadata (simplified for local database - uses localStorage cache only)
  useEffect(() => {
    if (!userId || !currentVideoId) {
      setVideoPublishedYear('');
      setVideoAuthorName('');
      setVideoViewCount('');
      setVideoChannelId('');
      return;
    }

    // Check in-memory cache (loaded from localStorage)
    const cachedMeta = metadataCacheInMemory.current.get(currentVideoId);
    if (cachedMeta) {
      setVideoPublishedYear(cachedMeta.publishedYear || '');
      setVideoAuthorName(cachedMeta.author || '');
      setVideoViewCount(cachedMeta.viewCount || '');
      setVideoChannelId(cachedMeta.channelId || '');
    } else {
      // No metadata in cache - set empty values
      setVideoPublishedYear('');
      setVideoAuthorName('');
      setVideoViewCount('');
      setVideoChannelId('');
    }
  }, [currentVideoId, userId]);

  // Reset visibleCount when videoFilter or playlist changes, but restore from scroll memory
  useEffect(() => {
    const memoryKey = `${sideMenuPlaylistIndex}_${videoFilter}`;
    const savedCount = scrollMemory[memoryKey];
    setVisibleCount(savedCount || 12);
    setHistoryVisibleCount(12);
  }, [videoFilter, sideMenuPlaylistIndex, scrollMemory]);

  // Save video history
  const saveVideoHistory = async (videoId, title, playlistId, playlistName, filter = 'all') => {
    // TODO: Add video history API endpoint for local database
    // For now, this is a no-op
    if (!userId || !videoId) return;
    console.log(`📝 Video history: ${title} (${videoId}) - not saved (local DB history not implemented yet)`);
  };

  // **OPTIMIZED** Video progress handling with local storage
  const saveVideoProgress = (videoId, time) => {
    if (!videoId || !Number.isFinite(time)) return;
    const progress = Math.floor(time);
    setVideoProgress(prev => ({ ...prev, [videoId]: progress }));
    // Save to localStorage immediately for better performance
    try {
      const existingProgress = JSON.parse(localStorage.getItem('videoProgress') || '{}');
      existingProgress[videoId] = progress;
      localStorage.setItem('videoProgress', JSON.stringify(existingProgress));
    } catch (error) {
      console.error('Error saving video progress to localStorage:', error);
    }
  };
  
  const getVideoProgress = (videoId) => {
    // Try localStorage first for better performance
    try {
      const localProgress = JSON.parse(localStorage.getItem('videoProgress') || '{}');
      if (localProgress[videoId] !== undefined) {
        return localProgress[videoId];
      }
    } catch (error) {
      console.error('Error reading video progress from localStorage:', error);
    }
    // Fallback to state
    return videoProgress[videoId] || 0;
  };

  // Generates a new shuffle order for a given playlist and filter
  const generateNewShuffleOrder = (playlist, filter = 'all', startIndex = -1) => {
    const targetPlaylist = playlist || currentPlaylist;
    let videoIndices = [];
    if (filter === 'all') videoIndices = Array.from(targetPlaylist.videos.keys());
    else if (allColorKeys.includes(filter)) videoIndices = targetPlaylist.videos.filter(v => targetPlaylist.groups[filter]?.videos.includes(v.id)).map(v => targetPlaylist.videos.indexOf(v));
    if (videoIndices.length === 0) return [];
    let shuffledIndices = [...videoIndices];
    for (let i = shuffledIndices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffledIndices[i], shuffledIndices[j]] = [shuffledIndices[j], shuffledIndices[i]];
    }
    if (startIndex >= 0 && startIndex < targetPlaylist.videos.length && videoIndices.includes(startIndex)) {
      const indexInShuffled = shuffledIndices.indexOf(startIndex);
      if (indexInShuffled !== -1) {
        shuffledIndices.splice(indexInShuffled, 1);
        shuffledIndices.unshift(startIndex);
      }
    }
    return shuffledIndices;
  };

  // Starts a new shuffle for the current playlist and current filter
  const startNewShuffle = (playlist = currentPlaylist, startIndex = -1) => {
    if (playlist.videos.length === 0) return [];
    const activeFilter = playlistFilters[playlist.id] || 'all';
    const newOrder = generateNewShuffleOrder(playlist, activeFilter, startIndex);
    playlistShuffleOrders.current = { ...playlistShuffleOrders.current, [playlist.id]: { ...playlistShuffleOrders.current[playlist.id], [activeFilter]: newOrder } };
    if (playlist.id === currentPlaylist.id) {
      destroyPlayer();
      const newVideoIndex = newOrder.length > 0 ? newOrder[0] : -1;
      setCurrentVideoIndex(newVideoIndex);
      setActiveShuffleOrder(newOrder);
      setCurrentShufflePosition(0);
      playlistShufflePositions.current = { ...playlistShufflePositions.current, [playlist.id]: { ...playlistShufflePositions.current[playlist.id], [activeFilter]: 0 } };
      if (newVideoIndex !== -1 && playlist.videos[newVideoIndex]) saveVideoHistory(playlist.videos[newVideoIndex].id, playlist.videos[newVideoIndex].title, playlist.id, playlist.name, activeFilter);
    }
    if (showSideMenu === 'videos' && sideMenuPlaylistIndex === currentPlaylistIndex) setVideoFilter(activeFilter);
    return newOrder;
  };

  const goToNextVideo = () => {
    if (playerRef.current && currentVideoId && typeof playerRef.current.getCurrentTime === 'function') saveVideoProgress(currentVideoId, playerRef.current.getCurrentTime());
    destroyPlayer();
    if (activeShuffleOrder.length === 0) return;
    const nextPosition = (currentShufflePosition + 1) % activeShuffleOrder.length;
    setCurrentShufflePosition(nextPosition);
    if (currentPlaylist.id) playlistShufflePositions.current = { ...playlistShufflePositions.current, [currentPlaylist.id]: { ...playlistShufflePositions.current[currentPlaylist.id], [chronologicalFilter]: nextPosition } };
    const newIndex = activeShuffleOrder[nextPosition];
    setCurrentVideoIndex(newIndex);
    if (currentPlaylist.videos[newIndex]) saveVideoHistory(currentPlaylist.videos[newIndex].id, currentPlaylist.videos[newIndex].title, currentPlaylist.id, currentPlaylist.name, chronologicalFilter);
  };

  const goToPreviousVideo = () => {
    if (playerRef.current && currentVideoId && typeof playerRef.current.getCurrentTime === 'function') saveVideoProgress(currentVideoId, playerRef.current.getCurrentTime());
    destroyPlayer();
    if (activeShuffleOrder.length === 0) return;
    const prevPosition = (currentShufflePosition - 1 + activeShuffleOrder.length) % activeShuffleOrder.length;
    setCurrentShufflePosition(prevPosition);
    if (currentPlaylist.id) playlistShufflePositions.current = { ...playlistShufflePositions.current, [currentPlaylist.id]: { ...playlistShufflePositions.current[currentPlaylist.id], [chronologicalFilter]: prevPosition } };
    const newIndex = activeShuffleOrder[prevPosition];
    setCurrentVideoIndex(newIndex);
    if (currentPlaylist.videos[newIndex]) saveVideoHistory(currentPlaylist.videos[newIndex].id, currentPlaylist.videos[newIndex].title, currentPlaylist.id, currentPlaylist.name, chronologicalFilter);
  };

  const changePlaylist = (newIndex, options = {}) => {
    const { keepSideMenuMode = false, updateTabMemory = true } = options;
    if (playerRef.current && currentVideoId && typeof playerRef.current.getCurrentTime === 'function') saveVideoProgress(currentVideoId, playerRef.current.getCurrentTime());
    destroyPlayer();
    if (currentPlaylist.id) playlistShufflePositions.current = { ...playlistShufflePositions.current, [currentPlaylist.id]: { ...playlistShufflePositions.current[currentPlaylist.id], [chronologicalFilter]: currentShufflePosition } };
    setCurrentPlaylistIndex(newIndex);
    const newPlaylist = playlists[newIndex];
    if (!newPlaylist) return;
    const newActiveFilter = playlistFilters[newPlaylist.id] || 'all';
    setPlaylistFilters(prev => ({ ...prev, [newPlaylist.id]: newActiveFilter }));
    if (showSideMenu === 'videos') {
      setSideMenuPlaylistIndex(newIndex);
      setVideoFilter(newActiveFilter);
    } else if (showSideMenu === 'playlists') {
      if (!keepSideMenuMode) {
        setSideMenuPlaylistIndex(newIndex);
        setVideoFilter(newActiveFilter);
        setShowSideMenu('videos');
      }
    }
    let newActiveOrderForPlayback;
    let newStartingPosition = 0;
    if (!playlistShuffleOrders.current[newPlaylist.id]?.[newActiveFilter] || playlistShuffleOrders.current[newPlaylist.id][newActiveFilter].length !== (newActiveFilter === 'all' ? newPlaylist.videos.length : newPlaylist.groups[newActiveFilter]?.videos.length || 0)) {
      playlistShuffleOrders.current = { ...playlistShuffleOrders.current, [newPlaylist.id]: { ...playlistShuffleOrders.current[newPlaylist.id], [newActiveFilter]: generateNewShuffleOrder(newPlaylist, newActiveFilter) } };
    }
    newActiveOrderForPlayback = playlistShuffleOrders.current[newPlaylist.id][newActiveFilter];
    newStartingPosition = playlistShufflePositions.current[newPlaylist.id]?.[newActiveFilter] || 0;
    newStartingPosition = Math.min(newStartingPosition, newActiveOrderForPlayback.length - 1);
    newStartingPosition = newStartingPosition >= 0 ? newStartingPosition : 0;
    setActiveShuffleOrder(newActiveOrderForPlayback);
    setCurrentShufflePosition(newStartingPosition);
    const newVideoIndex = newActiveOrderForPlayback[newStartingPosition] ?? -1;
    setCurrentVideoIndex(newVideoIndex);
    if (newVideoIndex !== -1 && newPlaylist.videos[newVideoIndex]) saveVideoHistory(newPlaylist.videos[newVideoIndex].id, newPlaylist.videos[newVideoIndex].title, newPlaylist.id, newPlaylist.name, newActiveFilter);
    
    // Remember this playlist for the current tab (only if not switching tabs)
    if (updateTabMemory) {
      setTabLastPlaylists(prev => ({ ...prev, [activePlaylistTab]: newIndex }));
    }
  };

  const goToNextPlaylist = () => {
    // Get playlists for current tab
    const currentTabPlaylists = activePlaylistTab === 0 
      ? playlists.filter(p => p.id !== '_unsorted_')
      : playlists.filter(p => playlistTabs[activePlaylistTab].playlistIds.includes(p.id));
    
    // Find current playlist index within the tab
    const currentIndexInTab = currentTabPlaylists.findIndex(p => p.id === playlists[currentPlaylistIndex].id);
    const nextIndexInTab = (currentIndexInTab + 1) % currentTabPlaylists.length;
    const nextPlaylist = currentTabPlaylists[nextIndexInTab];
    
    // Find the actual index in the main playlists array
      const actualIndex = playlists.findIndex(p => p.id === nextPlaylist.id);
    changePlaylist(actualIndex);
  };

  const goToPreviousPlaylist = () => {
    // Get playlists for current tab
    const currentTabPlaylists = activePlaylistTab === 0 
      ? playlists.filter(p => p.id !== '_unsorted_')
      : playlists.filter(p => playlistTabs[activePlaylistTab].playlistIds.includes(p.id));
    
    // Find current playlist index within the tab
    const currentIndexInTab = currentTabPlaylists.findIndex(p => p.id === playlists[currentPlaylistIndex].id);
    const prevIndexInTab = (currentIndexInTab - 1 + currentTabPlaylists.length) % currentTabPlaylists.length;
    const prevPlaylist = currentTabPlaylists[prevIndexInTab];
    
    // Find the actual index in the main playlists array
      const actualIndex = playlists.findIndex(p => p.id === prevPlaylist.id);
    changePlaylist(actualIndex);
  };

  const selectVideoFromMenu = (videoIndex, playlistId) => {
    const targetPlaylistIndex = playlists.findIndex(p => p.id === playlistId);
    if (targetPlaylistIndex === -1) return;
    if (targetPlaylistIndex !== currentPlaylistIndex) changePlaylist(targetPlaylistIndex);
    const targetPlaylist = playlists[targetPlaylistIndex];
    if (showSideMenu === 'videos' && allColorKeys.includes(videoFilter)) {
      setPlaylistFilters(prev => ({ ...prev, [targetPlaylist.id]: videoFilter }));
      if (!playlistShuffleOrders.current[targetPlaylist.id]?.[videoFilter] || playlistShuffleOrders.current[targetPlaylist.id][videoFilter].length !== targetPlaylist.groups[videoFilter]?.videos.length) {
        playlistShuffleOrders.current = { ...playlistShuffleOrders.current, [targetPlaylist.id]: { ...playlistShuffleOrders.current[targetPlaylist.id], [videoFilter]: generateNewShuffleOrder(targetPlaylist, videoFilter, videoIndex) } };
      }
      const newOrder = playlistShuffleOrders.current[targetPlaylist.id][videoFilter];
      const positionInShuffle = newOrder.indexOf(videoIndex);
      setActiveShuffleOrder(newOrder);
      setCurrentShufflePosition(positionInShuffle);
      playlistShufflePositions.current = { ...playlistShufflePositions.current, [targetPlaylist.id]: { ...playlistShufflePositions.current[targetPlaylist.id], [videoFilter]: positionInShuffle } };
    } else {
      setPlaylistFilters(prev => ({ ...prev, [targetPlaylist.id]: 'all' }));
      if (!playlistShuffleOrders.current[targetPlaylist.id]?.['all'] || playlistShuffleOrders.current[targetPlaylist.id]['all'].length !== targetPlaylist.videos.length) {
        playlistShuffleOrders.current = { ...playlistShuffleOrders.current, [targetPlaylist.id]: { ...playlistShuffleOrders.current[targetPlaylist.id], 'all': generateNewShuffleOrder(targetPlaylist, 'all', videoIndex) } };
      }
      const newOrder = playlistShuffleOrders.current[targetPlaylist.id]['all'];
      const positionInShuffle = newOrder.indexOf(videoIndex);
      setActiveShuffleOrder(newOrder);
      setCurrentShufflePosition(positionInShuffle);
      playlistShufflePositions.current = { ...playlistShufflePositions.current, [targetPlaylist.id]: { ...playlistShufflePositions.current[targetPlaylist.id], 'all': positionInShuffle } };
    }
    destroyPlayer();
    setCurrentVideoIndex(videoIndex);
    if (targetPlaylist.videos[videoIndex]) saveVideoHistory(targetPlaylist.videos[videoIndex].id, targetPlaylist.videos[videoIndex].title, targetPlaylist.id, targetPlaylist.name, playlistFilters[targetPlaylist.id] || 'all');
  };

  const selectPlaylistAndPlay = (index) => changePlaylist(index, { keepSideMenuMode: true });
  const handleViewPlaylistGrid = (index) => { setSideMenuPlaylistIndex(index); setVideoFilter('all'); setShowSideMenu('videos'); };

  const handleFolderCycleClick = () => {
    const availableColorFilters = allColorKeys.filter(color => (currentPlaylist.groups[color]?.videos?.length || 0) > 0);
    const filters = ['all', ...availableColorFilters];
    const currentFilterIndex = Math.max(0, filters.indexOf(chronologicalFilter));
    const nextFilter = filters[(currentFilterIndex + 1) % filters.length];
    setPlaylistFilters(prev => ({ ...prev, [currentPlaylist.id]: nextFilter }));
    let newActiveOrder;
    if (nextFilter === 'all') {
      if (!playlistShuffleOrders.current[currentPlaylist.id]?.['all'] || playlistShuffleOrders.current[currentPlaylist.id]['all'].length !== currentPlaylist.videos.length) {
        playlistShuffleOrders.current = { ...playlistShuffleOrders.current, [currentPlaylist.id]: { ...playlistShuffleOrders.current[currentPlaylist.id], 'all': generateNewShuffleOrder(currentPlaylist, 'all') } };
      }
      newActiveOrder = playlistShuffleOrders.current[currentPlaylist.id]['all'];
    } else {
      if (!playlistShuffleOrders.current[currentPlaylist.id]?.[nextFilter] || playlistShuffleOrders.current[currentPlaylist.id][nextFilter].length !== currentPlaylist.groups[nextFilter]?.videos.length) {
        playlistShuffleOrders.current = { ...playlistShuffleOrders.current, [currentPlaylist.id]: { ...playlistShuffleOrders.current[currentPlaylist.id], [nextFilter]: generateNewShuffleOrder(currentPlaylist, nextFilter) } };
      }
      newActiveOrder = playlistShuffleOrders.current[currentPlaylist.id][nextFilter];
    }
    const newPosition = playlistShufflePositions.current[currentPlaylist.id]?.[nextFilter] || 0;
    setActiveShuffleOrder(newActiveOrder);
    setCurrentShufflePosition(newPosition);
    const newVideoIndex = newActiveOrder[newPosition] ?? -1;
    setCurrentVideoIndex(newVideoIndex);
    if (newVideoIndex !== -1 && currentPlaylist.videos[newVideoIndex]) saveVideoHistory(currentPlaylist.videos[newVideoIndex].id, currentPlaylist.videos[newVideoIndex].title, currentPlaylist.id, currentPlaylist.name, nextFilter);
    if (showSideMenu === 'videos' && sideMenuPlaylistIndex === currentPlaylistIndex) setVideoFilter(nextFilter);
  };
  
  const playOffPlaylistVideo = (video) => {
    const unsortedPlaylistId = "_unsorted_";
    const unsortedPlaylistIndex = playlists.findIndex(p => p.id === unsortedPlaylistId);
    if (unsortedPlaylistIndex === -1) { console.error("Unsorted playlist not found!"); return; }
    const unsortedPlaylist = playlists[unsortedPlaylistIndex];
    const existingVideoIndex = unsortedPlaylist.videos.findIndex(v => v.id === video.id);
    let targetVideoIndex;
    if (existingVideoIndex !== -1) {
      targetVideoIndex = existingVideoIndex;
    } else {
      const newUnsortedVideos = [...unsortedPlaylist.videos, video];
      targetVideoIndex = newUnsortedVideos.length - 1;
      const updatedPlaylists = playlists.map(p => p.id === unsortedPlaylistId ? { ...p, videos: newUnsortedVideos } : p);
      setPlaylists(updatedPlaylists);
    }
    setCurrentPlaylistIndex(unsortedPlaylistIndex);
    setCurrentVideoIndex(targetVideoIndex);
  };

  const handleAuthorClick = async () => {
    if (!videoChannelId || !videoAuthorName) return;
    setShowSideMenu('author');
    setSideMenuAuthorName(videoAuthorName);
    setAuthorVideos([]); // Indicate loading
    const videos = await fetchVideosByChannel(videoChannelId, 5, currentApiKey);
    if (videos.length > 0) setAuthorVideos(videos);
    else { alert("Failed to fetch videos from this author."); setShowSideMenu(null); }
  };

  const handleSearch = async (e) => {
    if (e.key !== 'Enter' || !searchQuery.trim()) return;
    setShowSideMenu('search');
    setSearchResults([]); // Clear old results to indicate loading
    try {
      // CRITICAL: Check cache for durations before making API call
      const res = await fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=5&q=${encodeURIComponent(searchQuery)}&key=${currentApiKey}`);
      const data = await res.json();
      if (data.items) {
        const videos = data.items.map(item => ({ id: item.id.videoId, title: item.snippet.title, duration: 0 }));
        const videoIds = videos.map(v => v.id);
        
        // Check videoMetadata cache for durations first
        const cachedDurations = {};
        const idsNeedingDuration = [];
        
        // TODO: Add metadata caching to local database if needed
        if (false && userId && videoIds.length > 0) {
          // const metadataCacheRef = collection(db, 'users', userId, 'videoMetadata');
          // Batch check (30 items per query limit)
          for (let i = 0; i < videoIds.length; i += 30) {
            const batchIds = videoIds.slice(i, i + 30);
            if (batchIds.length > 0) {
              try {
                const q = query(metadataCacheRef, where('__name__', 'in', batchIds));
                const querySnapshot = await getDocs(q);
                querySnapshot.forEach(doc => {
                  const meta = doc.data();
                  if (meta.duration) {
                    cachedDurations[doc.id] = meta.duration;
                  }
                });
              } catch (error) {
                console.warn('Error checking duration cache:', error);
              }
            }
          }
        }
        
        // Only fetch durations for videos not in cache
        videoIds.forEach(id => {
          if (!cachedDurations[id]) {
            idsNeedingDuration.push(id);
          }
        });
        
        const durationsMap = { ...cachedDurations };
        
        // Only make API call if we need durations
        if (idsNeedingDuration.length > 0) {
          // Rate limiting
          const timeSinceLastCall = Date.now() - lastApiCallTime.current;
          if (timeSinceLastCall < 200) {
            await new Promise(resolve => setTimeout(resolve, 200 - timeSinceLastCall));
          }
          lastApiCallTime.current = Date.now();
          
          const videoIdsString = idsNeedingDuration.join(',');
          const durRes = await fetch(`https://www.googleapis.com/youtube/v3/videos?part=contentDetails&id=${videoIdsString}&key=${currentApiKey}`);
          const durData = await durRes.json();
          if (durData.items) {
            durData.items.forEach(item => { 
              durationsMap[item.id] = parseISO8601Duration(item.contentDetails.duration);
            });
            
            // Cache the durations we just fetched
            // TODO: Add metadata caching to local database if needed
            if (false && userId) {
              setTimeout(async () => {
                try {
                  // const metadataCacheRef = collection(db, 'users', userId, 'videoMetadata');
                  // const batch = writeBatch(db);
                  let batchCount = 0;
                  durData.items.forEach(item => {
                    const metaRef = doc(db, 'users', userId, 'videoMetadata', item.id);
                    batch.set(metaRef, { duration: parseISO8601Duration(item.contentDetails.duration) }, { merge: true });
                    batchCount++;
                    if (batchCount >= 400) {
                      batch.commit();
                      batchCount = 0;
                    }
                  });
                  if (batchCount > 0) {
                    await batch.commit();
                  }
                } catch (error) {
                  console.warn('Error caching search durations:', error);
                }
              }, 100);
            }
          }
        }
        
        const videosWithDuration = videos.map(v => ({...v, duration: durationsMap[v.id] || 1}));
        setSearchResults(videosWithDuration);
      } else setSearchResults([]);
    } catch (error) { console.error("Error searching YouTube:", error); alert("Failed to perform search."); }
  };

  const handleDrop = (groupId, videoId) => {
    setPlaylists(prev => prev.map((playlist, index) => {
      if (index === sideMenuPlaylistIndex) {
        const newGroups = { ...playlist.groups };
        Object.keys(newGroups).forEach(key => { newGroups[key].videos = (newGroups[key].videos || []).filter(id => id !== videoId) });
        if (!(newGroups[groupId].videos || []).includes(videoId)) {
          newGroups[groupId].videos = [...(newGroups[groupId].videos || []), videoId];
        }
        return { ...playlist, groups: newGroups, starred: (playlist.starred || []).filter(id => id !== videoId) };
      }
      return playlist;
    }));
  };

  const handleRemoveFromGroup = (videoId) => {
    setPlaylists(prev => prev.map((playlist, index) => {
      if (index === sideMenuPlaylistIndex) {
        const newGroups = { ...playlist.groups };
        newGroups[videoFilter].videos = (newGroups[videoFilter].videos || []).filter(id => id !== videoId);
        return { ...playlist, groups: newGroups };
      }
      return playlist;
    }));
  };

  const handleRenameGroup = (color) => {
    if (!groupRenameInput.trim()) { setRenamingGroup(null); return; }
    setPlaylists(prev => prev.map((p, i) => i === sideMenuPlaylistIndex ? {...p, groups: {...p.groups, [color]: {...p.groups[color], name: groupRenameInput}}} : p));
    setRenamingGroup(null);
  };

  const handleCreateNewColoredFolder = (folderName) => {
    // Generate a new color key that doesn't exist
    const existingColors = [...Object.keys(groupColors), ...Object.keys(customColors)];
    const colorNames = ['teal', 'lime', 'amber', 'emerald', 'violet', 'rose', 'sky', 'fuchsia', 'slate', 
                        'stone', 'neutral', 'zinc', 'gray', 'coolGray', 'trueGray', 'warmGray'];
    
    // Find first available color name
    let newColorKey = null;
    for (const colorName of colorNames) {
      if (!existingColors.includes(colorName)) {
        newColorKey = colorName;
        break;
      }
    }
    
    if (!newColorKey) {
      // If all predefined colors are used, generate a unique key
      newColorKey = `custom_${Date.now()}`;
    }
    
    // Add the new color to customColors
    const colorClassMap = {
      teal: { bg: 'bg-teal-500', ring: 'ring-teal-500', fill: 'text-teal-500' },
      lime: { bg: 'bg-lime-500', ring: 'ring-lime-500', fill: 'text-lime-500' },
      amber: { bg: 'bg-amber-500', ring: 'ring-amber-500', fill: 'text-amber-500' },
      emerald: { bg: 'bg-emerald-500', ring: 'ring-emerald-500', fill: 'text-emerald-500' },
      violet: { bg: 'bg-violet-500', ring: 'ring-violet-500', fill: 'text-violet-500' },
      rose: { bg: 'bg-rose-500', ring: 'ring-rose-500', fill: 'text-rose-500' },
      sky: { bg: 'bg-sky-500', ring: 'ring-sky-500', fill: 'text-sky-500' },
      fuchsia: { bg: 'bg-fuchsia-500', ring: 'ring-fuchsia-500', fill: 'text-fuchsia-500' },
      slate: { bg: 'bg-slate-500', ring: 'ring-slate-500', fill: 'text-slate-500' },
    };
    
    setCustomColors(prev => ({
      ...prev,
      [newColorKey]: colorClassMap[newColorKey] || { bg: 'bg-gray-500', ring: 'ring-gray-500', fill: 'text-gray-500' }
    }));
    
    // Add the new colored folder to the current playlist
    setPlaylists(prev => prev.map((p, i) => {
      if (i !== sideMenuPlaylistIndex) return p;
      return {
        ...p,
        groups: {
          ...p.groups,
          [newColorKey]: {
            name: folderName,
            videos: []
          }
        }
      };
    }));
  };

  const getSideMenuVideos = (playlist) => {
    // Use the same logic as the navigation system
    let baseListIndices;
    if (allColorKeys.includes(videoFilter)) {
      const expectedLength = playlist.groups[videoFilter]?.videos?.length || 0;
      const currentOrder = playlistShuffleOrders.current[playlist.id]?.[videoFilter];
      // Regenerate if missing or length doesn't match
      if (!currentOrder || currentOrder.length !== expectedLength) {
        baseListIndices = generateNewShuffleOrder(playlist, videoFilter);
        // Save the new order
        playlistShuffleOrders.current = {
          ...playlistShuffleOrders.current,
          [playlist.id]: {
            ...playlistShuffleOrders.current[playlist.id],
            [videoFilter]: baseListIndices
          }
        };
      } else {
        baseListIndices = currentOrder;
      }
    } else {
      baseListIndices = playlistShuffleOrders.current[playlist.id]?.['all'] || generateNewShuffleOrder(playlist, 'all');
    }
    
    let baseList = baseListIndices.map(index => playlist.videos[index]).filter(Boolean);
    
    // Apply filter logic
    if (videoFilter === 'unsorted') {
    const allVideoIdsInGroups = Object.values(playlist.groups || {}).flatMap(g => g.videos || []);
      baseList = baseList.filter(v => !allVideoIdsInGroups.includes(v.id));
    } else if (allColorKeys.includes(videoFilter)) {
      // For colored folders, ensure we only show videos that are actually in that group
      const groupVideoIds = new Set(playlist.groups[videoFilter]?.videos || []);
      baseList = baseList.filter(v => v && groupVideoIds.has(v.id));
    }
    
    // Apply watched filter
    if (watchedFilter !== 'all') {
      baseList = baseList.filter(video => {
        const progress = getVideoProgress(video.id);
        const duration = video.duration || 1;
        const isWatched = progress >= duration * 0.95;
        return watchedFilter === 'watched' ? isWatched : !isWatched;
      });
    }
    
    // Apply sort mode
    if (sortMode === 'chronological') {
      baseList.sort((a, b) => {
        const dateA = new Date(a.publishedAt || 0);
        const dateB = new Date(b.publishedAt || 0);
        return dateA - dateB;
      });
    }
    // For shuffle mode, the baseList is already shuffled from the shuffle order
    
    return baseList;
  };

  const handleShowMore = () => {
    const newCount = visibleCount + 12;
    setVisibleCount(newCount);
    // Save to scroll memory
    const memoryKey = `${sideMenuPlaylistIndex}_${videoFilter}`;
    setScrollMemory(prev => ({ ...prev, [memoryKey]: newCount }));
  };
  const handleShowMoreHistory = () => setHistoryVisibleCount(prev => prev + 12);

  // Helper function to get playlist thumbnail video ID (representative video or first video)
  const getPlaylistThumbnailVideoId = (playlist) => {
    if (!playlist || !playlist.videos || playlist.videos.length === 0) return null;
    
    // Check if representative video is set
    if (playlist.representativeVideoId) {
      const representativeVideo = playlist.videos.find(v => {
        const videoId = typeof v === 'string' ? v : (v?.id || v);
        return videoId === playlist.representativeVideoId;
      });
      if (representativeVideo) {
        return typeof representativeVideo === 'string' ? representativeVideo : (representativeVideo.id || representativeVideo);
      }
    }
    
    // Fall back to first video
    const firstVideo = playlist.videos[0];
    if (!firstVideo) return null;
    return typeof firstVideo === 'string' ? firstVideo : (firstVideo.id || firstVideo);
  };

  // Context menu functions
  const handleVideoContextMenu = (e, video) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenuVideo(video);
    setContextMenuPosition({ x: e.clientX, y: e.clientY });
  };

  const handleRemoveFromPlaylist = (videoId) => {
    setPlaylists(prev => prev.map((playlist, index) => {
      if (index === sideMenuPlaylistIndex) {
        return {
          ...playlist,
          videos: playlist.videos.filter(v => v.id !== videoId),
          groups: Object.keys(playlist.groups).reduce((acc, color) => ({
            ...acc,
            [color]: {
              ...playlist.groups[color],
              videos: playlist.groups[color].videos.filter(id => id !== videoId)
            }
          }), {})
        };
      }
      return playlist;
    }));
    setContextMenuVideo(null);
  };

  const handleSendToPlaylist = (video, action = 'copy') => {
    setSendToPlaylistVideo(video);
    setSendToPlaylistAction(action);
    setShowSendToPlaylistModal(true);
    setContextMenuVideo(null);
  };

  const handleSetRepresentativeVideo = (video) => {
    // Find the playlist containing this video
    const playlistIndex = playlists.findIndex(p => 
      p.videos.some(v => {
        const videoId = typeof v === 'string' ? v : (v?.id || v);
        return videoId === video.id;
      })
    );
    
    if (playlistIndex !== -1) {
      const currentPlaylist = playlists[playlistIndex];
      const isCurrentlyRepresentative = currentPlaylist.representativeVideoId === video.id;
      
      setPlaylists(prev => prev.map((playlist, idx) => {
        if (idx === playlistIndex) {
          // Toggle: if already representative, remove it; otherwise set it
          const updatedPlaylist = { ...playlist };
          if (isCurrentlyRepresentative) {
            // Remove the field by not including it (Firestore doesn't allow undefined)
            delete updatedPlaylist.representativeVideoId;
          } else {
            updatedPlaylist.representativeVideoId = video.id;
          }
          return updatedPlaylist;
        }
        return playlist;
      }));
      
      const action = isCurrentlyRepresentative ? 'Removed' : 'Set';
      console.log(`✅ ${action} ${video.id} as representative video for ${currentPlaylist.name}`);
    }
    setContextMenuVideo(null);
  };

  const handleMultiPlaybackSelect = (video, position) => {
    setMultiPlaybackVideos(prev => {
      // Create array with 4 slots (may have nulls)
      const slots = Array(4).fill(null);
      // Copy existing videos to their positions
      prev.forEach(v => {
        if (v && v.index !== undefined && v.index < 4) {
          slots[v.index] = v;
        }
      });
      
      // If video is already in this position, remove it
      if (slots[position - 1]?.id === video.id) {
        slots[position - 1] = null;
      } else {
        // Remove video from any other position first
        slots.forEach((slot, idx) => {
          if (slot && slot.id === video.id) {
            slots[idx] = null;
          }
        });
        // Add video to new position
        slots[position - 1] = { id: video.id, index: position - 1 };
      }
      
      // Return only non-null slots, maintaining order
      return slots.filter(v => v !== null);
    });
  };

  const handlePinVideo = (video) => {
    setPinnedVideos(prev => {
      const isPinned = prev.some(p => p.id === video.id);
      if (isPinned) {
        return prev.filter(p => p.id !== video.id);
      } else {
        return [...prev, video].slice(0, 10); // Limit to 10 pins
      }
    });
    setContextMenuVideo(null);
  };

  // Wipe colored folders and added playlists function
  const wipeColoredFoldersAndPlaylists = async () => {
    if (confirm('This will wipe all colored folder data and newly added playlists. Tab data will be preserved. Are you sure?')) {
      try {
        // Keep only hardcoded playlists (those without underscores in ID)
        const hardcodedPlaylists = playlists.filter(p => !p.id.includes('_'));
        
        // Reset playlists to hardcoded ones only
        setPlaylists(hardcodedPlaylists);
        
        // Clear colored folder data from all remaining playlists
        const cleanedPlaylists = hardcodedPlaylists.map(playlist => ({
          ...playlist,
          groups: {} // Clear all colored folder data
        }));
        
        // Data is saved automatically via the staged save effect
        // No need to manually save here - the main save handler will pick up the changes
        if (false && userId) {
          // Data saved via API routes automatically
        }
        
        alert('Colored folder data and added playlists wiped! Tab data preserved.');
      } catch (error) {
        console.error('Error wiping colored folders and playlists:', error);
        alert('Error wiping data. Check console for details.');
      }
    }
  };

  // **OPTIMIZED** Effect to fetch all videos for a playlist and initialize/update session-specific shuffle order
  useEffect(() => {
    if (!userId || !isFirebaseInitialized) return;
    
    // Process playlists - during bulk add, allow concurrent fetches
    const processPlaylists = async () => {
      const isBulkAdd = bulkAddProgress.total > 0;
      const playlistsToFetch = [];
      
      // Collect all playlists that need fetching
      for (const [index, playlist] of playlists.entries()) {
        if (playlist.videos.length === 0 && playlist.id && playlist.id !== "_unsorted_") {
          // Skip if we've already fetched this playlist in this session
          if (playlistsFetchedThisSession.current.has(playlist.id)) {
            console.log(`⏭️ Skipping fetch for ${playlist.id} - already fetched this session`);
            continue;
          }
          
          // Only fetch if this is a genuinely new playlist (not loaded from Firestore with videos)
          const wasLoadedFromFirestore = playlistsLoadedFromFirestore.current.has(playlist.id);
          if (!wasLoadedFromFirestore || (wasLoadedFromFirestore && playlist.id.startsWith('PL'))) {
            playlistsToFetch.push({ playlist, index });
          }
        } else if (playlist.videos.length > 0) {
          // Update shuffle orders for playlists that already have videos
          const filters = ['all', ...allColorKeys];
          let needsUpdate = false;
          const currentOrders = playlistShuffleOrders.current[playlist.id] || {};
          filters.forEach(filter => {
            const expectedLength = filter === 'all' ? playlist.videos.length : playlist.groups[filter]?.videos.length || 0;
            if (!currentOrders[filter] || currentOrders[filter].length !== expectedLength) {
              currentOrders[filter] = generateNewShuffleOrder(playlist, filter);
              needsUpdate = true;
            }
          });
          if (needsUpdate) {
            playlistShuffleOrders.current = { ...playlistShuffleOrders.current, [playlist.id]: currentOrders };
            if (playlist.id === currentPlaylist.id) {
              setActiveShuffleOrder(currentOrders[chronologicalFilter]);
            }
          }
        }
      }
      
      // During bulk add, start all fetches in parallel (up to 3 concurrent)
      // Otherwise, fetch sequentially
      if (isBulkAdd) {
        // Start all fetches - fetchAllVideos will handle concurrency limits
        playlistsToFetch.forEach(({ playlist, index }) => {
          console.log(`🔄 Queueing fetch for new playlist: ${playlist.id} (${playlist.name})`);
          playlistsFetchedThisSession.current.add(playlist.id);
          fetchAllVideos(playlist.id, index).catch(error => {
            console.error(`Error fetching playlist ${playlist.id}:`, error);
          });
        });
      } else {
        // Sequential fetching for non-bulk operations
        for (const { playlist, index } of playlistsToFetch) {
          console.log(`🔄 Fetching new playlist: ${playlist.id} (${playlist.name})`);
          playlistsFetchedThisSession.current.add(playlist.id);
          await fetchAllVideos(playlist.id, index);
        }
      }
    };
    
    processPlaylists();
  }, [playlists, userId, currentPlaylistIndex, chronologicalFilter, isFirebaseInitialized, bulkAddProgress]);

  // **OPTIMIZED** Fetches all videos and their details, using a permanent cache to minimize API calls
  const fetchAllVideos = async (playlistId, playlistIndex) => {
    if (!isFirebaseInitialized) {
      console.log('🚫 Skipping fetch for', playlistId, '- app not initialized');
      return Promise.resolve(); // Return resolved promise instead of undefined
    }
    
    // Check for stale locks (older than 5 minutes) and clear them FIRST
    const now = Date.now();
    const STALE_LOCK_TIMEOUT = 5 * 60 * 1000; // 5 minutes
    if (fetchStartTimes.current.has(playlistId)) {
      const startTime = fetchStartTimes.current.get(playlistId);
      if (now - startTime > STALE_LOCK_TIMEOUT) {
        console.warn(`⚠️ Clearing stale fetch lock for ${playlistId} (${Math.round((now - startTime) / 1000)}s old)`);
        fetchingPlaylists.current.delete(playlistId);
        fetchStartTimes.current.delete(playlistId);
        if (fetchingPlaylists.current.size === 0) {
          isFetchingAnyPlaylist.current = false;
        }
      }
    }
    
    // Prevent duplicate fetching of the same playlist
    if (fetchingPlaylists.current.has(playlistId)) {
      console.log('🚫 Skipping fetch for', playlistId, '- this playlist is already being fetched');
      return Promise.resolve(); // Return resolved promise instead of undefined
    }
    
    // For bulk adds, allow multiple playlists to fetch in parallel (up to 3 concurrent)
    // This allows faster processing while still respecting API rate limits
    const isBulkAdd = bulkAddProgress.total > 0;
    const currentFetchingCount = fetchingPlaylists.current.size;
    const maxConcurrentFetches = isBulkAdd ? 3 : 1; // Allow 3 concurrent during bulk add, 1 otherwise
    
    if (!isBulkAdd && isFetchingAnyPlaylist.current) {
      console.log('🚫 Skipping fetch for', playlistId, '- another playlist is being fetched');
      return Promise.resolve();
    }
    
    if (isBulkAdd && currentFetchingCount >= maxConcurrentFetches) {
      console.log(`🚫 Skipping fetch for ${playlistId} - ${currentFetchingCount} playlists already fetching (max ${maxConcurrentFetches})`);
      return Promise.resolve();
    }
    
    // Set locks
    if (!isBulkAdd) {
      isFetchingAnyPlaylist.current = true;
    }
    fetchingPlaylists.current.add(playlistId);
    fetchStartTimes.current.set(playlistId, now);
    console.log('🚀 Starting fetch for playlist:', playlistId);
    
    let allVideoSnippets = [], nextPageToken = "";
    try {
      // 1. Fetch all video IDs and titles from the playlist
      console.log(`📥 Fetching playlist items for ${playlistId}...`);
      let pageCount = 0;
      do {
        const res = await fetch(`https://www.googleapis.com/youtube/v3/playlistItems?part=snippet,contentDetails&maxResults=50&playlistId=${playlistId}&key=${currentApiKey}${nextPageToken ? `&pageToken=${nextPageToken}` : ""}`);
        const data = await res.json();
        if (data.items) {
          // CRITICAL OPTIMIZATION: Use titles from playlistItems API response (already available, no extra API call needed)
          // Also immediately cache these titles to prevent future API calls
          const videoSnippets = data.items
            .filter(item => item.snippet.title !== "Deleted video" && item.snippet.title !== "Private video")
            .map(item => {
              const videoId = item.snippet.resourceId.videoId;
              const title = item.snippet.title || '';
              // Mark as fetched to prevent duplicate API calls
              if (title) {
                titlesFetchedThisSession.current.add(videoId);
              }
              return { id: videoId, title };
            });
          allVideoSnippets.push(...videoSnippets);
          
          // Immediately cache titles from playlistItems to videoMetadata (async, non-blocking)
          // TODO: Add metadata caching to local database if needed
          if (videoSnippets.length > 0 && false && userId) {
            setTimeout(async () => {
              try {
                // const metadataCacheRef = collection(db, 'users', userId, 'videoMetadata');
                // const batch = writeBatch(db);
                let batchCount = 0;
                
                for (const snippet of videoSnippets) {
                  if (snippet.title && snippet.id) {
                    const metaRef = doc(db, 'users', userId, 'videoMetadata', snippet.id);
                    batch.set(metaRef, { title: snippet.title }, { merge: true });
                    // Update in-memory cache immediately to prevent future Firestore reads
                    const existingCache = metadataCacheInMemory.current.get(snippet.id) || {};
                    metadataCacheInMemory.current.set(snippet.id, { ...existingCache, title: snippet.title });
                    metadataCacheCheckedThisSession.current.add(snippet.id);
                    // Persist to localStorage
                    persistMetadataCache();
                    batchCount++;
                    
                    // Firestore batch limit is 500, so commit in chunks of 400
                    if (batchCount >= 400) {
                      await batch.commit();
                      batchCount = 0;
                    }
                  }
                }
                
                if (batchCount > 0) {
                  await batch.commit();
                }
                console.log(`💾 Cached ${videoSnippets.filter(v => v.title).length} titles from playlistItems API`);
              } catch (error) {
                console.warn(`⚠️ Error caching titles from playlistItems:`, error);
              }
            }, 100); // Small delay to not block main flow
          }
          nextPageToken = data.nextPageToken || "";
          pageCount++;
          if (pageCount % 10 === 0 || !nextPageToken) {
            console.log(`📄 Fetched ${allVideoSnippets.length} videos so far (${pageCount} pages)...`);
          }
        } else { nextPageToken = ""; }
      } while (nextPageToken);
      console.log(`✅ Fetched ${allVideoSnippets.length} total videos from playlist`);
      
      // Update progress with total video count for this playlist
      if (bulkAddProgress.total > 0) {
        setBulkAddProgress(prev => {
          const existingPlaylist = prev.playlists.find(p => p.id === playlistId);
          if (existingPlaylist && existingPlaylist.status === 'fetching') {
            const oldTotal = existingPlaylist.totalVideos || 0;
            return {
              ...prev,
              playlists: prev.playlists.map(p => 
                p.id === playlistId 
                  ? { ...p, totalVideos: allVideoSnippets.length }
                  : p
              ),
              totalVideosExpected: prev.totalVideosExpected - oldTotal + allVideoSnippets.length
            };
          }
          return prev;
        });
      }

      // 2. Check the cache for existing video details
      console.log(`🔍 Checking cache for ${allVideoSnippets.length} videos...`);
      const videoIds = allVideoSnippets.map(v => v.id);
      const cachedVideos = {};
      const idsToCheckInFirestore = [];
      
      // CRITICAL: Check in-memory cache FIRST to avoid Firestore reads
      videoIds.forEach(id => {
        const cached = metadataCacheInMemory.current.get(id);
        if (cached) {
          cachedVideos[id] = cached;
        } else if (!metadataCacheCheckedThisSession.current.has(id)) {
          // Only check Firestore if we haven't checked this ID in this session
          idsToCheckInFirestore.push(id);
        }
      });
      
      // Only query Firestore for IDs we haven't checked yet this session
      // TODO: Add metadata caching to local database if needed
      if (false && idsToCheckInFirestore.length > 0) {
        // const metadataCacheRef = collection(db, 'users', userId, 'videoMetadata');
        
        // Firestore 'in' queries are limited to 30 items, so we batch our checks
        for (let i = 0; i < idsToCheckInFirestore.length; i += 30) {
          const batchIds = idsToCheckInFirestore.slice(i, i + 30);
          if (batchIds.length > 0) {
            const q = query(metadataCacheRef, where('__name__', 'in', batchIds));
            const querySnapshot = await getDocs(q);
            querySnapshot.forEach(doc => {
              const meta = doc.data();
              // Store in in-memory cache for future use
              metadataCacheInMemory.current.set(doc.id, meta);
              metadataCacheCheckedThisSession.current.add(doc.id);
              cachedVideos[doc.id] = meta;
            });
            // Mark all queried IDs as checked (even if not found)
            batchIds.forEach(id => {
              if (!metadataCacheCheckedThisSession.current.has(id)) {
                metadataCacheCheckedThisSession.current.add(id);
                // Store empty object if not found
                if (!metadataCacheInMemory.current.has(id)) {
                  metadataCacheInMemory.current.set(id, {});
                }
              }
            });
            // Persist to localStorage after batch
            persistMetadataCache();
          }
          if ((i + 30) % 300 === 0 || (i + 30) >= idsToCheckInFirestore.length) {
            console.log(`🔍 Cache check progress: ${Math.min(i + 30, idsToCheckInFirestore.length)}/${idsToCheckInFirestore.length} videos checked in Firestore`);
          }
        }
      }
      
      const idsToFetch = videoIds.filter(id => !cachedVideos[id]);
      
      console.log(`💾 Found ${Object.keys(cachedVideos).length} cached videos, need to fetch ${idsToFetch.length} new ones`);

      // 3. Fetch details ONLY for videos not in the cache
      if (idsToFetch.length > 0) {
        // CRITICAL: NO API CALLS FOR METADATA (duration, author, views, etc.)
        // Only use cached metadata - thumbnails and playback are sufficient
        // Titles from playlistItems API response are already in allVideoSnippets
        console.log(`⏭️ Skipping metadata fetch for ${idsToFetch.length} uncached videos - NO API CALLS. Using cached data and titles from playlistItems only. Thumbnails are sufficient.`);
        // Use titles from playlistItems (already in allVideoSnippets) and default values for other metadata
        idsToFetch.forEach(id => {
          const snippet = allVideoSnippets.find(s => s.id === id);
          cachedVideos[id] = {
            duration: 1, // Default duration
            publishedYear: '',
            author: '',
            viewCount: '0',
            channelId: '',
            title: snippet?.title || '' // Use title from playlistItems if available
          };
        });
      }

      // 4. Combine titles with cached/fetched details
      const allVideos = allVideoSnippets.map(snippet => ({
        ...snippet,
        duration: cachedVideos[snippet.id]?.duration || 1,
      }));

      console.log(`📦 Updating playlist ${playlistId} with ${allVideos.length} videos`);
      
      // Update playlist state FIRST - this triggers UI update immediately
      setPlaylists(prev => {
        // Find playlist by ID instead of index (index might have changed)
        const playlistIndexById = prev.findIndex(p => p.id === playlistId);
        if (playlistIndexById === -1) {
          console.warn(`⚠️ Playlist ${playlistId} not found in playlists array. Current playlists:`, prev.map(p => p.id));
          return prev;
        }
        
        const newPlaylists = prev.map((playlist, idx) => {
          if (idx === playlistIndexById) {
            // Create a new object instead of mutating
            const updatedPlaylist = {
              ...playlist,
              videos: allVideos
            };
            
            // Generate shuffle orders for the updated playlist
            const filters = ['all', ...allColorKeys];
          const newOrders = {};
            filters.forEach(filter => { 
              newOrders[filter] = generateNewShuffleOrder(updatedPlaylist, filter); 
            });
            playlistShuffleOrders.current = { 
              ...playlistShuffleOrders.current, 
              [playlist.id]: newOrders 
            };
            
            console.log(`✅ Updated playlist "${playlist.name}" with ${allVideos.length} videos (LIVE UPDATE)`);
            return updatedPlaylist;
        }
          return playlist;
        });
        
        // Update the ref immediately so staged save and other effects have the latest data
        latestPlaylistsRef.current = newPlaylists;
        
        return newPlaylists;
      });
      
      // Update progress AFTER playlist state update - this ensures progress reflects the actual loaded state
      if (bulkAddProgress.total > 0) {
        setBulkAddProgress(prev => {
          const playlistProgress = prev.playlists.find(p => p.id === playlistId);
          if (playlistProgress && (playlistProgress.status === 'fetching' || playlistProgress.status === 'pending')) {
            const newVideoCount = allVideos.length;
            const oldVideoCount = playlistProgress.videoCount || 0;
            const wasInProgress = playlistProgress.status === 'fetching';
            const updated = {
              ...prev,
              playlists: prev.playlists.map(p => 
                p.id === playlistId 
                  ? { ...p, videoCount: newVideoCount, status: 'complete' } // Mark as complete when videos are loaded
                  : p
              ),
              loaded: wasInProgress ? prev.loaded + 1 : prev.loaded, // Increment loaded count
              inProgress: wasInProgress ? Math.max(0, prev.inProgress - 1) : prev.inProgress, // Decrement in progress
              totalVideosLoaded: prev.totalVideosLoaded + (newVideoCount - oldVideoCount)
            };
            
            // Persist to sessionStorage
            if (typeof window !== 'undefined') {
              sessionStorage.setItem('youtube-tv-bulk-add-progress', JSON.stringify(updated));
            }
            
            return updated;
          }
          return prev;
        });
      }
      
    } catch (error) { 
      console.error("Error fetching playlist videos/details:", error); 
      alert("Failed to fetch playlist videos."); 
    } finally {
      // Always clean up the fetch locks
      fetchingPlaylists.current.delete(playlistId);
      fetchStartTimes.current.delete(playlistId);
      if (fetchingPlaylists.current.size === 0) {
        isFetchingAnyPlaylist.current = false;
      }
      console.log('✅ Completed fetch for playlist:', playlistId);
      
      // If this was a bulk add and there are more playlists to fetch, trigger the next one
      // The useEffect will pick up playlists with 0 videos and fetch them
      if (bulkAddProgress.total > 0) {
        // Force a small delay to allow state to update, then check for more playlists to fetch
        setTimeout(() => {
          // This will be handled by the useEffect that watches playlists
          // But we can trigger it by ensuring the playlists state is up to date
        }, 100);
      }
    }
  };

  const handleCreateEmptyPlaylist = () => {
    if (!userId) {
      alert('Please sign in to create playlists.');
      return;
    }
    
    const name = prompt('Enter a name for the new playlist:');
    if (!name || !name.trim()) {
      return; // User cancelled or entered empty name
    }
    
    // Generate a unique ID for the empty playlist
    // Use timestamp + random string to ensure uniqueness
    const uniqueId = `empty_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    
    const newPlaylist = { 
      name: name.trim(), 
      id: uniqueId, 
      videos: [], 
      groups: createDefaultGroups(), 
      starred: [] 
    };
    
    setPlaylists(prev => {
      const newPlaylists = [...prev];
      const unsortedIndex = newPlaylists.findIndex(p => p.id === '_unsorted_');
      if (unsortedIndex > -1) newPlaylists.splice(unsortedIndex, 0, newPlaylist);
      else newPlaylists.push(newPlaylist);
      return newPlaylists;
    });
    
    console.log(`✅ Created empty playlist: ${name.trim()} (${uniqueId})`);
  };

  const handleAddPlaylist = async () => {
    if (!newPlaylistId || !userId) return;
    if (!isFirebaseInitialized) {
      alert('⚠️ App not ready yet. Please wait a moment and try again.');
      return;
    }
    try {
      const res = await fetch(`https://www.googleapis.com/youtube/v3/playlists?part=snippet&id=${newPlaylistId}&key=${currentApiKey}`);
      const data = await res.json();
      
      console.log('Playlist API response:', data);
      
      if (data.error) {
        console.error('YouTube API Error:', data.error);
        if (data.error.code === 404) {
          alert('Playlist not found. Please check the playlist ID.');
        } else if (data.error.code === 403) {
          alert('Access denied. The playlist might be private or you may have exceeded API quota.');
        } else {
          alert(`Error: ${data.error.message || 'Unknown error occurred'}`);
        }
        return;
      }
      
      if (data.items && data.items[0]) {
        const name = data.items[0].snippet.title;
        setPlaylists(prev => {
          // Check if playlist already exists
          const existingIndex = prev.findIndex(p => p.id === newPlaylistId);
          
          if (existingIndex > -1) {
            // Playlist already exists - update name if it changed, and re-fetch if videos are empty
            const existingPlaylist = prev[existingIndex];
            const updatedPlaylists = [...prev];
            
            // Update name if it changed
            if (existingPlaylist.name !== name) {
              updatedPlaylists[existingIndex] = { ...existingPlaylist, name };
            }
            
            // Re-fetch videos if playlist is empty (failed previous import)
            if (existingPlaylist.videos.length === 0) {
              console.log(`🔄 Re-fetching videos for existing playlist: ${name}`);
              // Clear any stale locks for this playlist before re-fetching
              fetchingPlaylists.current.delete(newPlaylistId);
              fetchStartTimes.current.delete(newPlaylistId);
              // Wait a bit to ensure any ongoing fetch completes
              setTimeout(() => {
                fetchAllVideos(newPlaylistId, existingIndex);
              }, 500);
            } else {
              console.log(`ℹ️ Playlist "${name}" already exists with ${existingPlaylist.videos.length} videos. Skipping duplicate.`);
            }
            
            return updatedPlaylists;
          } else {
            // New playlist - add it
            const newPlaylist = { name, id: newPlaylistId, videos: [], groups: createDefaultGroups(), starred: [] };
          const newPlaylists = [...prev];
          const unsortedIndex = newPlaylists.findIndex(p => p.id === '_unsorted_');
          if (unsortedIndex > -1) newPlaylists.splice(unsortedIndex, 0, newPlaylist);
          else newPlaylists.push(newPlaylist);
          const newPlaylistIndex = newPlaylists.findIndex(p => p.id === newPlaylistId);
          fetchAllVideos(newPlaylistId, newPlaylistIndex);
          return newPlaylists;
          }
        });
        setNewPlaylistId('');
      } else { 
        alert('Invalid playlist ID. Please check the playlist ID and try again.'); 
      }
    } catch (e) { 
      console.error("Error adding playlist:", e); 
      alert('Error adding playlist. Please check your internet connection and try again.'); 
    }
  };

  // Extract playlist ID from URL or return as-is if already an ID
  const extractPlaylistId = (input) => {
    if (!input || !input.trim()) return null;
    const trimmed = input.trim();
    
    // If it's already a playlist ID format (starts with PL)
    if (/^PL[a-zA-Z0-9_-]+$/.test(trimmed)) {
      return trimmed;
    }
    
    // Try to extract from YouTube URL
    const urlPatterns = [
      /[?&]list=([a-zA-Z0-9_-]+)/,  // ?list=PLxxx or &list=PLxxx
      /\/playlist\?list=([a-zA-Z0-9_-]+)/,  // /playlist?list=PLxxx
      /youtube\.com\/.*[?&]list=([a-zA-Z0-9_-]+)/,  // Full YouTube URL
    ];
    
    for (const pattern of urlPatterns) {
      const match = trimmed.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }
    
    return null;
  };

  const handleBulkAddPlaylists = async () => {
    if (!bulkPlaylistIds.some(id => id.trim()) || !userId) {
      alert('Please enter at least one playlist ID/URL.');
      return;
    }
    if (!isFirebaseInitialized) {
      alert('⚠️ App not ready yet. Please wait a moment and try again.');
      return;
    }

    setIsBulkAdding(true);
    const initialProgress = { loaded: 0, inProgress: 0, total: 0, playlists: [], totalVideosLoaded: 0, totalVideosExpected: 0 };
    setBulkAddProgress(initialProgress);
    // Persist to sessionStorage
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('youtube-tv-bulk-add-progress', JSON.stringify(initialProgress));
      sessionStorage.setItem('youtube-tv-bulk-adding', 'true');
    }

    try {
      // Parse playlist IDs from input array
      const playlistIds = [];
      
      for (const input of bulkPlaylistIds) {
        const trimmed = input.trim();
        if (!trimmed) continue; // Skip empty inputs
        
        const id = extractPlaylistId(trimmed);
        if (id) {
          playlistIds.push(id);
        } else {
          console.warn(`Could not extract playlist ID from: ${trimmed}`);
        }
      }

      if (playlistIds.length === 0) {
        alert('No valid playlist IDs found. Please check your input.');
        setIsBulkAdding(false);
        setBulkAddProgress({ loaded: 0, inProgress: 0, total: 0, playlists: [], totalVideosLoaded: 0, totalVideosExpected: 0 });
        return;
      }

      // Remove duplicates
      const uniqueIds = [...new Set(playlistIds)];
      
      // Initialize progress tracking
      const playlistProgress = uniqueIds.map(id => ({ id, name: '', status: 'pending', videoCount: 0, totalVideos: 0 }));
      const initialProgress = { loaded: 0, inProgress: 0, total: uniqueIds.length, playlists: playlistProgress, totalVideosLoaded: 0, totalVideosExpected: 0 };
      setBulkAddProgress(initialProgress);
      // Persist to sessionStorage
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('youtube-tv-bulk-add-progress', JSON.stringify(initialProgress));
      }

      console.log(`📦 Bulk adding ${uniqueIds.length} playlists`);

      // Add all playlists and start fetching
      const addedPlaylistIds = [];
      for (let i = 0; i < uniqueIds.length; i++) {
        const playlistId = uniqueIds[i];

        try {
          const res = await fetch(`https://www.googleapis.com/youtube/v3/playlists?part=snippet&id=${playlistId}&key=${currentApiKey}`);
          const data = await res.json();

          if (data.error) {
            console.error(`Error fetching playlist ${playlistId}:`, data.error);
            // Update status to error
            setBulkAddProgress(prev => ({
              ...prev,
              playlists: prev.playlists.map(p => p.id === playlistId ? { ...p, status: 'error' } : p)
            }));
            continue;
          }

          if (data.items && data.items[0]) {
            const name = data.items[0].snippet.title;
            
            // Check if playlist already exists
            const existingPlaylist = playlists.find(p => p.id === playlistId);
            
            if (!existingPlaylist) {
              // Add new playlist
              const newPlaylist = { name, id: playlistId, videos: [], groups: createDefaultGroups(), starred: [] };
              setPlaylists(prev => {
                const newPlaylists = [...prev];
                const unsortedIndex = newPlaylists.findIndex(p => p.id === '_unsorted_');
                if (unsortedIndex > -1) newPlaylists.splice(unsortedIndex, 0, newPlaylist);
                else newPlaylists.push(newPlaylist);
                return newPlaylists;
              });
              
              // Update progress to fetching
              setBulkAddProgress(prev => {
                const updated = {
                  ...prev,
                  playlists: prev.playlists.map(p => p.id === playlistId ? { ...p, name, status: 'fetching' } : p),
                  inProgress: prev.inProgress + 1
                };
                // Persist to sessionStorage
                if (typeof window !== 'undefined') {
                  sessionStorage.setItem('youtube-tv-bulk-add-progress', JSON.stringify(updated));
                }
                return updated;
              });
              
              // Start fetching videos (this is async, will happen in background)
              // Progress will be updated in fetchAllVideos when videos are actually loaded
              const newPlaylistIndex = playlists.length;
              
              // Start fetching - allow it to run in parallel with others during bulk add
              // The fetchAllVideos function will handle concurrent fetches (up to 3)
              fetchAllVideos(playlistId, newPlaylistIndex).catch(error => {
                console.error(`Error fetching videos for ${playlistId}:`, error);
                setBulkAddProgress(prev => {
                  const updated = {
                    ...prev,
                    inProgress: Math.max(0, prev.inProgress - 1),
                    playlists: prev.playlists.map(p => p.id === playlistId ? { ...p, status: 'error' } : p)
                  };
                  if (typeof window !== 'undefined') {
                    sessionStorage.setItem('youtube-tv-bulk-add-progress', JSON.stringify(updated));
                  }
                  return updated;
                });
              });
            } else {
              // Playlist already exists, mark as complete
              setBulkAddProgress(prev => {
                const updated = {
                  ...prev,
                  loaded: prev.loaded + 1,
                  playlists: prev.playlists.map(p => p.id === playlistId ? { ...p, name, status: 'complete' } : p)
                };
                // Persist to sessionStorage
                if (typeof window !== 'undefined') {
                  sessionStorage.setItem('youtube-tv-bulk-add-progress', JSON.stringify(updated));
                }
                return updated;
              });
            }
            
            addedPlaylistIds.push(playlistId);
          }
        } catch (error) {
          console.error(`Error processing playlist ${playlistId}:`, error);
          setBulkAddProgress(prev => ({
            ...prev,
            playlists: prev.playlists.map(p => p.id === playlistId ? { ...p, status: 'error' } : p)
          }));
        }
      }

      if (addedPlaylistIds.length === 0) {
        alert('No playlists were successfully added.');
        setIsBulkAdding(false);
        setBulkAddProgress({ loaded: 0, inProgress: 0, total: 0, playlists: [], totalVideosLoaded: 0, totalVideosExpected: 0 });
        return;
      }

      // Don't close modal immediately - let progress continue
      // Close modal but keep progress banner visible
      setShowBulkAddModal(false);
      setBulkPlaylistIds(Array(10).fill(''));
      
      // Don't set isBulkAdding to false yet - keep progress banner visible
      // It will be set to false when all playlists complete
      
      // Set up completion check
      const checkCompletion = setInterval(() => {
        setBulkAddProgress(prev => {
          if (prev.inProgress === 0 && prev.loaded === prev.total && prev.total > 0) {
            // All done, hide progress after a delay
            clearInterval(checkCompletion);
            setTimeout(() => {
              setIsBulkAdding(false);
              setBulkAddProgress({ loaded: 0, inProgress: 0, total: 0, playlists: [], totalVideosLoaded: 0, totalVideosExpected: 0 });
            }, 3000); // Show completion message for 3 seconds
          }
          return prev;
        });
      }, 1000);
      
    } catch (error) {
      console.error('Error in bulk add:', error);
      alert('An error occurred while bulk adding playlists. Please try again.');
      setIsBulkAdding(false);
      setBulkAddProgress({ loaded: 0, inProgress: 0, total: 0, playlists: [] });
      setBulkPlaylistIds(Array(10).fill(''));
    }
  };

  const handleAddTab = () => {
    const name = prompt("Enter new tab name:");
    if (name) {
      setPlaylistTabs(prev => [...prev, { name, playlistIds: [] }]);
    }
  };

  const addPlaylistToTab = (playlistId) => {
    setPlaylistTabs(prev => {
      const newTabs = [...prev];
        if (!newTabs[viewingPlaylistTab].playlistIds.includes(playlistId)) {
          newTabs[viewingPlaylistTab].playlistIds.push(playlistId);
        }
      return newTabs;
    });
    setShowAddPlaylistModal(false);
  };

  const handleRenamePlaylist = (playlistId, newName) => {
    if (!newName || !newName.trim()) return;
    
    setPlaylists(prev => prev.map(p => 
      p.id === playlistId 
        ? { ...p, name: newName.trim() }
        : p
    ));
    console.log(`✅ Renamed playlist ${playlistId} to "${newName.trim()}"`);
  };

  const deletePlaylist = async (playlistId) => {
    console.log('Deleting playlist:', playlistId);
    try {
      // Remove from playlists
      setPlaylists(prev => {
        const filtered = prev.filter(p => p.id !== playlistId);
        console.log('Filtered playlists:', filtered);
        return filtered;
      });
      
      // Remove from all tabs
      setPlaylistTabs(prev => prev.map(tab => ({
        ...tab,
        playlistIds: tab.playlistIds.filter(id => id !== playlistId)
      })));
      
      // Delete from Firebase - playlists are stored in the main user document
      // The staged save will automatically update Firebase with the new playlists array
      // No need to manually delete since we're removing it from the array
      
      console.log(`Deleted playlist: ${playlistId}`);
    } catch (error) {
      console.error('Error deleting playlist:', error);
    }
  };

  const handleBulkDeletePlaylists = async () => {
    if (selectedPlaylistsForDelete.size === 0) return;
    
    const playlistNames = Array.from(selectedPlaylistsForDelete)
      .map(id => playlists.find(p => p.id === id)?.name)
      .filter(Boolean);
    
    if (!confirm(`Delete ${selectedPlaylistsForDelete.size} playlist(s) permanently?\n\n${playlistNames.slice(0, 5).join('\n')}${playlistNames.length > 5 ? `\n...and ${playlistNames.length - 5} more` : ''}`)) {
      return;
    }
    
    console.log(`🗑️ Bulk deleting ${selectedPlaylistsForDelete.size} playlists`);
    
    // Delete all selected playlists
    const deletePromises = Array.from(selectedPlaylistsForDelete).map(playlistId => deletePlaylist(playlistId));
    await Promise.all(deletePromises);
    
    // Clear selection and exit bulk delete mode
    setSelectedPlaylistsForDelete(new Set());
    setBulkDeleteMode(false);
    
    console.log(`✅ Bulk delete complete!`);
  };

  const handleBulkTagPlaylists = () => {
    if (!targetPlaylistForBulkTag || pendingPlaylistBulkAssignments.size === 0) return;
    
    const targetPlaylist = playlists.find(p => p.id === targetPlaylistForBulkTag);
    if (!targetPlaylist) {
      alert('Target playlist not found!');
      return;
    }
    
    console.log(`🏷️ Bulk tagging ${pendingPlaylistBulkAssignments.size} playlist(s) to ${targetPlaylist.name}`);
    
    // Process each pending assignment
    setPlaylists(prev => {
      const updated = prev.map(playlist => {
        if (playlist.id !== targetPlaylistForBulkTag) return playlist;
        
        // This is the target playlist - add videos from source playlists
        const updatedVideos = [...playlist.videos];
        const newGroups = { ...playlist.groups };
        
        // Initialize groups if needed
        Object.keys(groupColors).forEach(c => {
          if (!newGroups[c]) {
            newGroups[c] = { name: c.charAt(0).toUpperCase() + c.slice(1), videos: [] };
          }
        });
        
        // Process each source playlist assignment
        pendingPlaylistBulkAssignments.forEach((color, sourcePlaylistId) => {
          const sourcePlaylist = prev.find(p => p.id === sourcePlaylistId);
          if (!sourcePlaylist || sourcePlaylist.isColoredFolder) return;
          
          // Get existing video IDs in target to avoid duplicates
          const existingVideoIds = new Set(updatedVideos.map(v => v.id));
          
          // Add videos from source playlist to target playlist
          sourcePlaylist.videos.forEach(video => {
            if (!existingVideoIds.has(video.id)) {
              updatedVideos.push(video);
              existingVideoIds.add(video.id);
            }
            
            // Remove from all groups first
            Object.keys(groupColors).forEach(c => {
              newGroups[c] = {
                ...newGroups[c],
                videos: (newGroups[c]?.videos || []).filter(id => id !== video.id)
              };
            });
            
            // Add to target color group
            const targetList = newGroups[color]?.videos || [];
            if (!targetList.includes(video.id)) {
              newGroups[color] = {
                ...newGroups[color],
                videos: [...targetList, video.id]
              };
            }
          });
        });
        
        return {
          ...playlist,
          videos: updatedVideos,
          groups: newGroups
        };
      });
      
      return updated;
    });
    
    // Clear pending assignments and exit bulk tag mode
    setPendingPlaylistBulkAssignments(new Map());
    setTargetPlaylistForBulkTag(null);
    setBulkTagMode(false);
    
    console.log(`✅ Bulk tag complete!`);
  };

  const deleteColoredFolder = async (coloredFolder) => {
    console.log('Deleting colored folder:', coloredFolder);
    try {
      // Find the parent playlist
      const parentPlaylist = coloredFolder.parentPlaylist;
      console.log('Parent playlist:', parentPlaylist);
      
      // Check if this colored folder has been converted to a regular playlist
      const hasBeenConverted = playlists.some(p => 
        p.isConvertedFromColoredFolder && 
        p.name === coloredFolder.name &&
        p.videos.some(v => coloredFolder.videos.some(cfV => cfV.id === v.id))
      );
      
      console.log('Has been converted:', hasBeenConverted);
      
      let updatedVideos = parentPlaylist.videos;
      
      // Only remove videos from parent playlist if the colored folder hasn't been converted
      if (!hasBeenConverted) {
        // Remove all videos from the colored folder
        updatedVideos = parentPlaylist.videos.filter(video => 
          !coloredFolder.videos.some(cfVideo => cfVideo.id === video.id)
        );
        console.log('Updated videos (removed from parent):', updatedVideos);
      } else {
        console.log('Skipping video removal - colored folder has been converted');
      }
      
      // Always clean up the group structure - remove the colored folder's group entirely
      const updatedGroups = { ...parentPlaylist.groups };
      if (updatedGroups[coloredFolder.color]) {
        delete updatedGroups[coloredFolder.color];
      }
      console.log('Updated groups:', updatedGroups);
      
      // Update the parent playlist
      setPlaylists(prev => prev.map(p => 
        p.id === parentPlaylist.id 
          ? { ...p, videos: updatedVideos, groups: updatedGroups }
          : p
      ));
      
      // Data is saved automatically via the staged save effect
      // No need to manually save - the staged save effect will handle it
      
      if (hasBeenConverted) {
        console.log(`Deleted colored folder group: ${coloredFolder.name} (videos preserved in converted playlist)`);
      } else {
        console.log(`Emptied colored folder: ${coloredFolder.name}`);
      }
    } catch (error) {
      console.error('Error deleting colored folder:', error);
    }
  };

  const mergeColoredFolderToPlaylist = async (coloredFolder, targetPlaylistId) => {
    try {
      console.log('Merging colored folder:', coloredFolder, 'into playlist:', targetPlaylistId);
      
      // Mark this as a local change FIRST to prevent snapshot overwrites
      lastLocalChangeTimeRef.current = Date.now();
      
      // Find the target playlist
      const targetPlaylist = playlists.find(p => p.id === targetPlaylistId);
      if (!targetPlaylist) {
        console.error('Target playlist not found');
        return;
      }
      
      // Get existing video IDs in target playlist to avoid duplicates
      const existingVideoIds = new Set(targetPlaylist.videos.map(v => v.id));
      
      // Filter out videos that already exist in the target playlist
      const videosToAdd = coloredFolder.videos.filter(video => !existingVideoIds.has(video.id));
      
      if (videosToAdd.length === 0) {
        alert('All videos from this colored folder are already in the target playlist.');
        return;
      }
      
      // Add videos to target playlist
      const updatedVideos = [...targetPlaylist.videos, ...videosToAdd];
      
      // Update the target playlist
      // This will trigger the staged save mechanism automatically
      setPlaylists(prev => {
        const updated = prev.map(p => 
        p.id === targetPlaylistId 
          ? { ...p, videos: updatedVideos }
          : p
        );
      
        // Update the ref immediately so staged save has the latest data
        latestPlaylistsRef.current = updated;
        lastChangeTimeRef.current = Date.now();
        
        return updated;
      });
      
      // The staged save useEffect will automatically save this change
      // No need to save directly - let the staged save mechanism handle it
      console.log('✅ Merge complete - staged save will handle persistence');
      
      alert(`Successfully merged ${videosToAdd.length} videos from "${coloredFolder.name}" into "${targetPlaylist.name}". ${coloredFolder.videos.length - videosToAdd.length} duplicates were skipped.`);
      
      console.log(`Merged ${videosToAdd.length} videos from colored folder to playlist`);
    } catch (error) {
      console.error('Error merging colored folder to playlist:', error);
      alert('Error merging colored folder. Please try again.');
    }
  };

  const mergePlaylistToPlaylist = async (sourcePlaylistId, targetPlaylistId, deleteSource = false, targetColor = null) => {
    try {
      console.log('Merging playlist:', sourcePlaylistId, 'into playlist:', targetPlaylistId, 'deleteSource:', deleteSource, 'targetColor:', targetColor);
      
      // Mark this as a local change FIRST to prevent snapshot overwrites
      lastLocalChangeTimeRef.current = Date.now();
      
      // Find both playlists
      const sourcePlaylist = playlists.find(p => p.id === sourcePlaylistId);
      const targetPlaylist = playlists.find(p => p.id === targetPlaylistId);
      
      if (!sourcePlaylist || !targetPlaylist) {
        console.error('Source or target playlist not found');
        alert('Error: Could not find playlists to merge.');
        return;
      }
      
      if (sourcePlaylistId === targetPlaylistId) {
        alert('Cannot merge a playlist into itself.');
        return;
      }
      
      // Get existing video IDs in target playlist to avoid duplicates
      const existingVideoIds = new Set(targetPlaylist.videos.map(v => v.id));
      
      // Filter out videos that already exist in the target playlist
      // CRITICAL: Only include videos that have both an ID and are valid objects
      const videosToAdd = sourcePlaylist.videos.filter(video => {
        if (!video || !video.id) {
          console.warn(`⚠️ Merge: Skipping invalid video object:`, video);
          return false;
        }
        if (existingVideoIds.has(video.id)) {
          return false; // Already exists
        }
        return true;
      });
      
      if (videosToAdd.length === 0) {
        alert('No new videos to merge (all videos already exist in target playlist).');
        return;
      }
      
      console.log(`🔗 Merge: Adding ${videosToAdd.length} video objects from ${sourcePlaylist.name} to ${targetPlaylist.name}${targetColor ? ` (${targetColor} folder)` : ''}`);
      console.log(`🔗 Merge: Video IDs being added:`, videosToAdd.map(v => v.id).slice(0, 10));
      
      // Merge videos - CRITICAL: Ensure we're adding actual video objects, not just IDs
      const updatedVideos = [...targetPlaylist.videos, ...videosToAdd];
      
      // Verify all videos have proper structure
      const invalidVideos = updatedVideos.filter(v => !v || !v.id);
      if (invalidVideos.length > 0) {
        console.error(`❌ CRITICAL: ${invalidVideos.length} invalid video objects in updatedVideos!`, invalidVideos);
      }
      
      // Merge colored folder groups
      const updatedGroups = { ...targetPlaylist.groups };
      
      if (targetColor && allColorKeys.includes(targetColor)) {
        // Merge ALL videos into the specified colored folder
        const targetGroup = updatedGroups[targetColor] || { name: targetColor.charAt(0).toUpperCase() + targetColor.slice(1), videos: [] };
        const existingGroupVideoIds = new Set(targetGroup.videos || []);
        
        // CRITICAL: Ensure all videosToAdd are actually in updatedVideos array
        // Filter to only include videos that are being added to the videos array
        const videosActuallyAdded = videosToAdd.filter(v => v && v.id);
        
        // Add all video IDs from source playlist to the target color folder
        const newGroupVideoIds = videosActuallyAdded.map(v => v.id).filter(id => id && !existingGroupVideoIds.has(id));
        
        updatedGroups[targetColor] = {
          name: targetGroup.name,
          videos: [...(targetGroup.videos || []), ...newGroupVideoIds]
        };
        
        // Log to verify videos are in both arrays
        console.log(`🔗 Merge: Added ${videosActuallyAdded.length} videos to ${targetPlaylist.name} videos array and ${newGroupVideoIds.length} IDs to ${targetColor} group`);
      } else {
        // Normal merge - merge colored folder groups
        if (sourcePlaylist.groups) {
          Object.keys(allColorKeys).forEach(color => {
            const sourceGroup = sourcePlaylist.groups[color];
            const targetGroup = updatedGroups[color] || { name: color.charAt(0).toUpperCase() + color.slice(1), videos: [] };
            
            if (sourceGroup && Array.isArray(sourceGroup.videos)) {
              // Merge video IDs from source group into target group, avoiding duplicates
              const existingGroupVideoIds = new Set(targetGroup.videos || []);
              const newGroupVideoIds = sourceGroup.videos.filter(id => !existingGroupVideoIds.has(id));
              updatedGroups[color] = {
                name: targetGroup.name || sourceGroup.name || color.charAt(0).toUpperCase() + color.slice(1),
                videos: [...(targetGroup.videos || []), ...newGroupVideoIds]
              };
            } else if (!updatedGroups[color]) {
              // Ensure all colors exist
              updatedGroups[color] = { name: color.charAt(0).toUpperCase() + color.slice(1), videos: [] };
            }
          });
        }
      }
      
      // Update the target playlist and optionally delete source
      // This will trigger the staged save mechanism automatically
      setPlaylists(prev => {
        const updated = prev.map(p => {
          if (p.id === targetPlaylistId) {
            // CRITICAL: Verify all video IDs in groups exist in videos array
            const videoIdsInArray = new Set(updatedVideos.map(v => v?.id).filter(Boolean));
            const allGroupVideoIds = new Set();
            Object.values(updatedGroups).forEach(group => {
              if (Array.isArray(group.videos)) {
                group.videos.forEach(id => allGroupVideoIds.add(id));
              }
            });
            
            // Check for orphaned IDs and log them
            const orphanedIds = Array.from(allGroupVideoIds).filter(id => !videoIdsInArray.has(id));
            if (orphanedIds.length > 0) {
              console.warn(`⚠️ Merge: ${orphanedIds.length} video IDs in groups but not in videos array:`, orphanedIds.slice(0, 5));
            }
            
            // Verify videos are actually in the array
            const videosInGroups = new Set();
            if (targetColor && allColorKeys.includes(targetColor)) {
              const groupVideoIds = updatedGroups[targetColor]?.videos || [];
              groupVideoIds.forEach(id => videosInGroups.add(id));
            }
            
            const videosInArrayButNotInGroup = videosToAdd.filter(v => {
              const id = v?.id;
              return id && videoIdsInArray.has(id) && !videosInGroups.has(id);
            });
            
            if (videosInArrayButNotInGroup.length > 0 && targetColor) {
              console.warn(`⚠️ Merge: ${videosInArrayButNotInGroup.length} videos in array but not in ${targetColor} group - this should not happen!`);
            }
            
            // CRITICAL FIX: Ensure all video IDs in the target color group have corresponding video objects
            if (targetColor && allColorKeys.includes(targetColor)) {
              const groupVideoIds = updatedGroups[targetColor]?.videos || [];
              const videoIdsInArray = new Set(updatedVideos.map(v => v?.id).filter(Boolean));
              const missingVideoObjects = groupVideoIds.filter(id => !videoIdsInArray.has(id));
              
              if (missingVideoObjects.length > 0) {
                console.warn(`⚠️ Merge: ${missingVideoObjects.length} video IDs in ${targetColor} group but missing video objects. Attempting to restore...`);
                
                // Try to find missing video objects in source playlist
                const restoredVideos = [];
                missingVideoObjects.forEach(missingId => {
                  const video = sourcePlaylist.videos.find(v => v?.id === missingId);
                  if (video && !updatedVideos.some(v => v?.id === missingId)) {
                    restoredVideos.push(video);
                    console.log(`  ✅ Restored video object for ${missingId} from source playlist`);
                  }
                });
                
                if (restoredVideos.length > 0) {
                  updatedVideos.push(...restoredVideos);
                  console.log(`🔧 Restored ${restoredVideos.length} missing video objects during merge`);
                } else {
                  console.error(`❌ CRITICAL: Could not restore ${missingVideoObjects.length} video objects for ${targetColor} group! Video IDs:`, missingVideoObjects);
                }
              }
            }
            
            return { ...p, videos: updatedVideos, groups: updatedGroups };
          }
          return p;
        }).filter(p => !(deleteSource && p.id === sourcePlaylistId));
        
        // Update the ref immediately so staged save has the latest data
        latestPlaylistsRef.current = updated;
        lastChangeTimeRef.current = Date.now();
        
        // Log the merge for debugging
        const mergedPlaylist = updated.find(p => p.id === targetPlaylistId);
        if (mergedPlaylist && mergedPlaylist.groups) {
          const groupCounts = Object.entries(mergedPlaylist.groups).map(([color, group]) => 
            `${color}: ${Array.isArray(group.videos) ? group.videos.length : 'invalid'}`
          ).join(', ');
          console.log(`📊 Merge state updated: ${mergedPlaylist.name} videos=${mergedPlaylist.videos?.length || 0}, groups=[${groupCounts}]`);
          
          // Verify the merge was correct
          if (targetColor && allColorKeys.includes(targetColor)) {
            const groupVideoIds = mergedPlaylist.groups[targetColor]?.videos || [];
            const videoIdsInArray = new Set((mergedPlaylist.videos || []).map(v => v?.id).filter(Boolean));
            const validGroupIds = groupVideoIds.filter(id => videoIdsInArray.has(id));
            const missingIds = groupVideoIds.filter(id => !videoIdsInArray.has(id));
            console.log(`✅ Merge verification: ${targetColor} group has ${groupVideoIds.length} IDs, ${validGroupIds.length} exist in videos array${missingIds.length > 0 ? `, ${missingIds.length} MISSING!` : ''}`);
            if (missingIds.length > 0) {
              console.error(`❌ CRITICAL MERGE ERROR: ${missingIds.length} video IDs in group but video objects missing:`, missingIds);
            }
          }
        }
        
        return updated;
      });
      
      // The staged save useEffect will automatically save this change
      // No need to save directly - let the staged save mechanism handle it
      console.log('✅ Merge complete - staged save will handle persistence');
      console.log(`📊 Merge details: Added ${videosToAdd.length} videos to ${targetPlaylist.name}${targetColor ? ` (${targetColor} folder)` : ''}`);
      if (targetColor) {
        const finalGroupCount = updatedGroups[targetColor]?.videos?.length || 0;
        console.log(`📊 Final ${targetColor} folder count: ${finalGroupCount} videos`);
      }
      
      const skippedVideos = sourcePlaylist.videos.length - videosToAdd.length;
      const message = deleteSource 
        ? `Successfully merged ${videosToAdd.length} videos from "${sourcePlaylist.name}" into "${targetPlaylist.name}". ${skippedVideos} duplicates were skipped. The source playlist has been deleted.`
        : `Successfully merged ${videosToAdd.length} videos from "${sourcePlaylist.name}" into "${targetPlaylist.name}". ${skippedVideos} duplicates were skipped.`;
      
      alert(message);
      console.log(`Merged ${videosToAdd.length} videos from playlist to playlist`);
      
      // Close modal
      setShowMergePlaylistModal(false);
      setMergePlaylist(null);
    } catch (error) {
      console.error('Error merging playlist to playlist:', error);
      alert('Error merging playlists. Please try again.');
    }
  };

  const convertColoredFolderToPlaylist = async (coloredFolder) => {
    console.log('Converting colored folder:', coloredFolder);
    try {
      // Create a new regular playlist from the colored folder
      const newPlaylist = {
        id: `converted_${coloredFolder.id}_${Date.now()}`, // Unique ID
        name: coloredFolder.name, // Use the colored folder's custom name (e.g., "yellow", "My Custom Name")
        videos: [...coloredFolder.videos], // Copy the videos
        groups: {}, // Start with empty groups
        thumbnail: coloredFolder.videos[0]?.id ? `https://img.youtube.com/vi/${coloredFolder.videos[0].id}/mqdefault.jpg` : '/no-thumb.jpg',
        isConvertedFromColoredFolder: true // Mark as converted to distinguish from regular colored folders
      };

      console.log('Created new playlist:', newPlaylist);

      // Add to playlists
      setPlaylists(prev => {
        const updated = [...prev, newPlaylist];
        console.log('Updated playlists:', updated);
        return updated;
      });

      // Data is saved automatically via the staged save effect
      // No need to manually save - the staged save effect will handle it

      console.log(`Converted colored folder to regular playlist: ${newPlaylist.name}`);
    } catch (error) {
      console.error('Error converting colored folder to playlist:', error);
    }
  };

  const getVideoGridTitle = (displayedPlaylist) => {
    if (videoFilter === 'all') return `All Videos in ${displayedPlaylist.name}`;
    if (videoFilter === 'unsorted') return 'Unsorted Videos';
    if (displayedPlaylist.groups[videoFilter]) return displayedPlaylist.groups[videoFilter].name;
    return `Videos in ${displayedPlaylist.name}`;
  };

  const destroyPlayer = () => {
    if (playerRef.current && typeof playerRef.current.destroy === 'function') {
      try { playerRef.current.destroy(); } catch (error) { console.error("Error destroying YouTube player:", error); }
    }
    playerRef.current = null;
    if (playerContainerRef.current) playerContainerRef.current.innerHTML = '';
    setIsPlayerReady(false);
    setIsPlaying(false);
  };

  const initializePlayer = () => {
    if (!currentVideoId || !window.YT || !playerContainerRef.current) {
      console.warn("Cannot initialize player: missing video ID, YouTube API, or player container");
      return;
    }
    playerContainerRef.current.innerHTML = '';
    try {
      playerRef.current = new window.YT.Player(playerContainerRef.current, {
        height: "100%", width: "100%", videoId: currentVideoId,
        playerVars: { autoplay: 1, controls: 1, disablekb: 1, fs: 0, iv_load_policy: 3, modestbranding: 1, playsinline: 1, rel: 0, showinfo: 0, start: getVideoProgress(currentVideoId) / (currentPlaylist.videos.find(v => v.id === currentVideoId)?.duration || 1) < 0.95 ? getVideoProgress(currentVideoId) : 0, origin: window.location.origin },
        events: {
          onReady: () => setIsPlayerReady(true),
          onStateChange: (event) => {
            if (event.data === window.YT.PlayerState.PLAYING) setIsPlaying(true);
            else if (event.data === window.YT.PlayerState.PAUSED) {
              setIsPlaying(false);
              if (playerRef.current && typeof playerRef.current.getCurrentTime === 'function') saveVideoProgress(currentVideoId, playerRef.current.getCurrentTime());
            } else if (event.data === window.YT.PlayerState.ENDED) goToNextVideo();
          },
          onError: (event) => {
            console.error("YouTube player error:", event.data);
            if ([100, 101, 150].includes(event.data)) goToNextVideo();
          }
        },
      });
    } catch (error) { console.error("Error initializing YouTube player:", error); destroyPlayer(); }
  };

  useEffect(() => {
    if (!window.YT) {
      const tag = document.createElement('script');
      tag.src = "https://www.youtube.com/iframe_api";
      window.onYouTubeIframeAPIReady = initializePlayer;
      document.head.appendChild(tag);
    } else initializePlayer();
    return () => {
      if (playerRef.current && currentVideoId && typeof playerRef.current.getCurrentTime === 'function') saveVideoProgress(currentVideoId, playerRef.current.getCurrentTime());
      destroyPlayer();
    };
  }, [currentVideoId]);

  useEffect(() => {
    let interval;
    if (isPlaying && playerRef.current && currentVideoId && typeof playerRef.current.getCurrentTime === 'function') {
      interval = setInterval(() => {
        if (playerRef.current && typeof playerRef.current.getCurrentTime === 'function') saveVideoProgress(currentVideoId, playerRef.current.getCurrentTime());
      }, 5000);
    }
    return () => clearInterval(interval);
  }, [isPlaying, currentVideoId]);

  // Effect to calculate average color from thumbnail for the top video menu background
  useEffect(() => {
    if (!currentVideoId) {
      setAverageColor('rgba(16, 16, 16, 0.7)');
      return;
    }
    const getAverageColor = (imgUrl) => {
      const img = new Image();
      img.crossOrigin = "Anonymous";
      img.src = imgUrl;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const size = 120;
        canvas.width = size; canvas.height = size;
        ctx.drawImage(img, 0, 0, size, size);
        try {
            const imageData = ctx.getImageData(0, 0, size, size);
            const data = imageData.data;
            let r = 0, g = 0, b = 0, count = 0;
            for (let i = 0; i < data.length; i += 20) {
              r += data[i]; g += data[i + 1]; b += data[i + 2]; count++;
            }
            r = Math.floor(r / count); g = Math.floor(g / count); b = Math.floor(b / count);
            const brightness = (r * 299 + g * 587 + b * 114) / 1000;
            if (brightness > 140) {
                const factor = 140 / brightness;
                r = Math.floor(r * factor); g = Math.floor(g * factor); b = Math.floor(b * factor);
            }
            setAverageColor(`rgba(${r}, ${g}, ${b}, 0.7)`);
        } catch (e) {
            console.error("Error processing image data (CORS issue?):", e);
            setAverageColor('rgba(16, 16, 16, 0.7)');
        }
      };
      img.onerror = () => { setAverageColor('rgba(16, 16, 16, 0.7)'); };
    };
    getAverageColor(`https://img.youtube.com/vi/${currentVideoId}/hqdefault.jpg`);
  }, [currentVideoId]);

  // Don't render the main UI if Firebase isn't initialized
  if (!isFirebaseInitialized) {
    return (
      <div className="h-screen w-screen bg-black flex items-center justify-center">
        <div className="text-white text-center">
          <h1 className="text-2xl font-bold mb-4">YouTube TV</h1>
          <p className="text-white/70">Setting up your configuration...</p>
        </div>
        
        {/* Show configuration modal even when Firebase isn't initialized */}
        {showConfigModal && (
          <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4">
            <div className="bg-gray-900 rounded-lg p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-white">YouTube TV Setup</h2>
                <button onClick={() => setShowConfigModal(false)} className="p-2 rounded-full hover:bg-white/10"><X size={24} /></button>
              </div>
              
              <div className="mb-6 p-4 bg-blue-900/20 border border-blue-500/30 rounded-lg">
                <h3 className="text-lg font-semibold text-blue-400 mb-2">Welcome to YouTube TV!</h3>
                <p className="text-white/80 text-sm">
                  To get started, you&apos;ll need to provide your own API keys. This ensures your data stays private and you have full control over your usage quotas.
                </p>
              </div>

              <form onSubmit={handleConfigSubmit} className="space-y-6">
                {/* YouTube API Key */}
                <div>
                  <label className="block text-white font-semibold mb-2">
                    YouTube Data API v3 Key *
                  </label>
                  <input
                    type="text"
                    value={configForm.youtubeApiKey}
                    onChange={(e) => handleConfigChange('youtubeApiKey', e.target.value)}
                    placeholder="AIzaSy..."
                    className="w-full bg-white/10 text-white p-3 rounded-lg border border-white/20 focus:border-blue-500 focus:outline-none"
                    required
                  />
                  <p className="text-white/60 text-xs mt-1">
                    Get your API key from the <a href="https://console.developers.google.com/" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">Google Cloud Console</a>
                  </p>
                </div>

                {/* Firebase Configuration */}
                <div>
                  <h3 className="text-lg font-semibold text-white mb-4">Firebase Configuration *</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-white font-semibold mb-2">API Key</label>
                      <input
                        type="text"
                        value={configForm.firebaseApiKey}
                        onChange={(e) => handleConfigChange('firebaseApiKey', e.target.value)}
                        placeholder="AIzaSy..."
                        className="w-full bg-white/10 text-white p-3 rounded-lg border border-white/20 focus:border-blue-500 focus:outline-none"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-white font-semibold mb-2">Auth Domain</label>
                      <input
                        type="text"
                        value={configForm.firebaseAuthDomain}
                        onChange={(e) => handleConfigChange('firebaseAuthDomain', e.target.value)}
                        placeholder="project.firebaseapp.com"
                        className="w-full bg-white/10 text-white p-3 rounded-lg border border-white/20 focus:border-blue-500 focus:outline-none"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-white font-semibold mb-2">Project ID</label>
                      <input
                        type="text"
                        value={configForm.firebaseProjectId}
                        onChange={(e) => handleConfigChange('firebaseProjectId', e.target.value)}
                        placeholder="your-project-id"
                        className="w-full bg-white/10 text-white p-3 rounded-lg border border-white/20 focus:border-blue-500 focus:outline-none"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-white font-semibold mb-2">Storage Bucket</label>
                      <input
                        type="text"
                        value={configForm.firebaseStorageBucket}
                        onChange={(e) => handleConfigChange('firebaseStorageBucket', e.target.value)}
                        placeholder="project.appspot.com"
                        className="w-full bg-white/10 text-white p-3 rounded-lg border border-white/20 focus:border-blue-500 focus:outline-none"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-white font-semibold mb-2">Messaging Sender ID</label>
                      <input
                        type="text"
                        value={configForm.firebaseMessagingSenderId}
                        onChange={(e) => handleConfigChange('firebaseMessagingSenderId', e.target.value)}
                        placeholder="123456789"
                        className="w-full bg-white/10 text-white p-3 rounded-lg border border-white/20 focus:border-blue-500 focus:outline-none"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-white font-semibold mb-2">App ID</label>
                      <input
                        type="text"
                        value={configForm.firebaseAppId}
                        onChange={(e) => handleConfigChange('firebaseAppId', e.target.value)}
                        placeholder="1:123:web:abc123"
                        className="w-full bg-white/10 text-white p-3 rounded-lg border border-white/20 focus:border-blue-500 focus:outline-none"
                        required
                      />
                    </div>
                  </div>
                  <div className="mt-4">
                    <label className="block text-white font-semibold mb-2">Measurement ID (Optional)</label>
                    <input
                      type="text"
                      value={configForm.firebaseMeasurementId}
                      onChange={(e) => handleConfigChange('firebaseMeasurementId', e.target.value)}
                      placeholder="G-XXXXXXXXXX"
                      className="w-full bg-white/10 text-white p-3 rounded-lg border border-white/20 focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                  <p className="text-white/60 text-xs mt-2">
                    Get your Firebase config from the <a href="https://console.firebase.google.com/" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">Firebase Console</a>
                  </p>
                </div>

                {configError && (
                  <div className="p-4 bg-red-900/20 border border-red-500/30 rounded-lg">
                    <p className="text-red-400 text-sm">{configError}</p>
                  </div>
                )}

                <div className="flex gap-4 pt-4">
                  <button
                    type="submit"
                    disabled={isConfigValidating}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
                  >
                    {isConfigValidating ? 'Validating...' : 'Save Configuration'}
                  </button>
                  <button
                    type="button"
                    onClick={useDefaultConfig}
                    className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white font-semibold rounded-lg transition-colors"
                  >
                    Use Demo Config
                  </button>
                </div>
              </form>

              <div className="mt-6 p-4 bg-yellow-900/20 border border-yellow-500/30 rounded-lg">
                <h4 className="text-yellow-400 font-semibold mb-2">Demo Configuration</h4>
                <p className="text-white/80 text-sm">
                  You can use the demo configuration to try out the app, but your data will be shared with other users. 
                  For personal use, please set up your own Firebase project and YouTube API key.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="h-screen w-screen bg-black relative overflow-hidden flex font-sans">
      <div className={`transition-all duration-500 ease-in-out ${showSideMenu ? 'w-1/2' : 'w-full'}`}>
        <div ref={playerContainerRef} className="relative w-full h-full" />
      </div>
      
      <div 
        className={`transition-all duration-500 ease-in-out backdrop-blur-sm overflow-y-auto ${showSideMenu ? 'w-1/2' : 'w-0'}`}
        style={{ backgroundColor: showSideMenu ? averageColor : 'transparent' }}
      >
        {showSideMenu && (
          <div className="p-4 relative pt-20">
            {showSideMenu === 'playlists' && (
              <>
                <div className="sticky top-0 bg-black/80 backdrop-blur-sm z-30 pt-4 -mx-4 px-4 pb-2">
                  <div className="flex justify-end gap-2 mb-4">
                  <button onClick={() => { setSideMenuPlaylistIndex(currentPlaylistIndex); setVideoFilter('all'); setShowSideMenu('videos'); }} className="text-white bg-white/10 hover:bg-white/20 p-2 rounded-full"><ChevronRight size={24} /></button>
                  <button onClick={() => setShowSideMenu(null)} className="text-white bg-white/10 hover:bg-white/20 p-2 rounded-full"><X size={24} /></button>
                </div>
                  <div className="flex items-center gap-2 mb-4 border-b border-white/10">
                    {playlistTabs.map((tab, index) => (
                      <div key={index} className="flex items-center gap-1">
                        <button 
                          onClick={() => setViewingPlaylistTab(index)}
                          className={`px-4 py-2 text-sm font-semibold ${viewingPlaylistTab === index ? 'text-white border-b-2 border-blue-500' : 'text-white/60 hover:text-white'}`}
                        >
                          {tab.name}
                        </button>
                            {index !== 0 && (
                              <button 
                            onClick={() => {
                              if (confirm(`Delete tab "${tab.name}" and remove all its contents?`)) {
                                setPlaylistTabs(prev => prev.filter((_, i) => i !== index));
                                if (activePlaylistTab === index) {
                                  setActivePlaylistTab(0);
                                  if (playlists.length > 0) {
                                    changePlaylist(0);
                                  }
                                } else if (activePlaylistTab > index) {
                                  setActivePlaylistTab(activePlaylistTab - 1);
                                }
                                if (viewingPlaylistTab === index) {
                                  setViewingPlaylistTab(0);
                                } else if (viewingPlaylistTab > index) {
                                  setViewingPlaylistTab(viewingPlaylistTab - 1);
                                }
                                // Clean up tab memory for deleted tab and shift indices
                                setTabLastPlaylists(prev => {
                                  const newMemory = {};
                                  Object.keys(prev).forEach(key => {
                                    const tabIndex = parseInt(key);
                                    if (tabIndex < index) {
                                      newMemory[tabIndex] = prev[key];
                                    } else if (tabIndex > index) {
                                      newMemory[tabIndex - 1] = prev[key];
                                    }
                                    // Skip the deleted tab (tabIndex === index)
                                  });
                                  return newMemory;
                                });
                              }
                            }}
                            className="p-1 text-red-400 hover:text-red-300 hover:bg-red-500/20 rounded"
                            title={`Delete tab "${tab.name}"`}
                          >
                            <X size={12} />
                              </button>
                        )}
                      </div>
                    ))}
                    <button onClick={handleAddTab} className="p-2 text-white/60 hover:text-white"><Plus size={16}/></button>
                  </div>
                </div>
                
                <h2 className="text-2xl font-bold text-white mb-4 pt-4">All Playlists</h2>
                <div className="flex gap-2 mb-4">
                  <input className="flex-grow bg-white/10 text-white p-2 rounded" type="text" placeholder="Paste YouTube Playlist ID" value={newPlaylistId} onChange={e => setNewPlaylistId(e.target.value)} />
                  <div className="flex items-center gap-2">
                    <button className="bg-blue-500 text-white p-2 rounded" onClick={handleAddPlaylist} disabled={!userId}>Add Playlist</button>
                    <button className="bg-gray-600 text-white p-2 rounded hover:bg-gray-700" onClick={handleCreateEmptyPlaylist} disabled={!userId} title="Create an empty placeholder playlist">
                      Create Empty
                    </button>
                    <button 
                      onClick={() => {
                        setBulkDeleteMode(!bulkDeleteMode);
                        if (bulkDeleteMode) {
                          setSelectedPlaylistsForDelete(new Set()); // Clear selection when turning off
                        }
                        if (bulkDeleteMode) setBulkTagMode(false); // Disable bulk tag when enabling delete
                      }} 
                      className={`px-3 py-1 rounded-full text-sm ${bulkDeleteMode ? 'bg-red-600' : 'bg-white/10'} text-white`}
                      title="Bulk delete mode - select playlists to delete"
                    >
                      Bulk Delete {bulkDeleteMode && selectedPlaylistsForDelete.size > 0 && `(${selectedPlaylistsForDelete.size})`}
                    </button>
                    {bulkDeleteMode && selectedPlaylistsForDelete.size > 0 && (
                      <button 
                        onClick={handleBulkDeletePlaylists}
                        className="px-3 py-1 rounded-full text-sm bg-red-600 hover:bg-red-700 font-semibold text-white"
                        title={`Delete ${selectedPlaylistsForDelete.size} playlist(s)`}
                      >
                        Delete ({selectedPlaylistsForDelete.size})
                      </button>
                    )}
                    <button 
                      onClick={() => {
                        setBulkTagMode(!bulkTagMode);
                        if (!bulkTagMode) {
                          setTargetPlaylistForBulkTag(null);
                          setPendingPlaylistBulkAssignments(new Map());
                        }
                        if (bulkTagMode) setBulkDeleteMode(false); // Disable bulk delete when enabling tag
                      }} 
                      className={`px-3 py-1 rounded-full text-sm ${bulkTagMode ? 'bg-green-600' : 'bg-white/10'} text-white`}
                      title="Bulk tag mode - assign playlists to colored folders in target playlist"
                    >
                      Bulk Tag {bulkTagMode && pendingPlaylistBulkAssignments.size > 0 && `(${pendingPlaylistBulkAssignments.size})`}
                    </button>
                    {bulkTagMode && targetPlaylistForBulkTag && (
                      <div className="text-white/70 text-sm">
                        Target: {playlists.find(p => p.id === targetPlaylistForBulkTag)?.name || 'Select playlist'}
                      </div>
                    )}
                    {bulkTagMode && pendingPlaylistBulkAssignments.size > 0 && targetPlaylistForBulkTag && (
                      <button 
                        onClick={handleBulkTagPlaylists}
                        className="px-3 py-1 rounded-full text-sm bg-green-600 hover:bg-green-700 font-semibold text-white"
                        title={`Tag ${pendingPlaylistBulkAssignments.size} playlist(s) to target`}
                      >
                        Save ({pendingPlaylistBulkAssignments.size})
                      </button>
                    )}
                  </div>
                  <button className="bg-purple-500 text-white p-2 rounded" onClick={() => setShowBulkAddModal(true)} disabled={!userId}>Bulk Add</button>
                </div>
                <div className="flex gap-2 mb-4">
                  <button 
                    onClick={() => setShowColoredFolders(!showColoredFolders)}
                    className={`px-3 py-1 rounded-full text-sm ${showColoredFolders ? 'bg-blue-600' : 'bg-white/10'}`}
                  >
                    Show Colored Folders
                  </button>
                  <button 
                    onClick={() => setShowPlaylists(!showPlaylists)}
                    className={`px-3 py-1 rounded-full text-sm ${showPlaylists ? 'bg-blue-600' : 'bg-white/10'}`}
                  >
                    Show Playlists
                  </button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  { (() => {
                    let filteredPlaylists = viewingPlaylistTab === 0 ? playlists.filter(p => p.id !== '_unsorted_') : playlists.filter(p => playlistTabs[viewingPlaylistTab].playlistIds.includes(p.id));
                    
                    // Store regular playlists separately
                    const regularPlaylists = [...filteredPlaylists];
                    
                    // Add colored folders as virtual playlists (only in "All" tab)
                      const coloredFolders = [];
                    if (showColoredFolders && activePlaylistTab === 0) {
                      regularPlaylists.forEach(playlist => {
                        Object.entries(playlist.groups || {}).forEach(([color, group]) => {
                          if (group.videos && group.videos.length > 0) {
                            const coloredFolderVideos = group.videos.map(videoId => playlist.videos.find(v => v.id === videoId)).filter(Boolean);
                            // Only create colored folder if it actually has videos after filtering
                            if (coloredFolderVideos.length > 0) {
                              coloredFolders.push({
                                id: `${playlist.id}_${color}`,
                                name: group.name || `${playlist.name} - ${color}`,
                                videos: coloredFolderVideos,
                                parentPlaylist: playlist,
                                color: color,
                                isColoredFolder: true
                              });
                            }
                          }
                        });
                      });
                    }
                    
                    // Apply toggles to determine what to show
                    if (!showPlaylists && !showColoredFolders) {
                      // Both off - show nothing
                      filteredPlaylists = [];
                    } else if (!showPlaylists && showColoredFolders) {
                      // Only colored folders
                      filteredPlaylists = coloredFolders;
                    } else if (showPlaylists && !showColoredFolders) {
                      // Only regular playlists
                      filteredPlaylists = regularPlaylists;
                    } else {
                      // Both on - show everything
                      filteredPlaylists = [...regularPlaylists, ...coloredFolders];
                    }
                    
                    return filteredPlaylists;
                  })().map((playlist, index) => {
                       const originalIndex = playlists.findIndex(p => p.id === playlist.id);
                       const isSelectedForDelete = bulkDeleteMode && selectedPlaylistsForDelete.has(playlist.id);
                       const canDelete = !playlist.isColoredFolder && playlist.id !== '_unsorted_';
                       const canTag = !playlist.isColoredFolder && playlist.id !== '_unsorted_';
                       const pendingColor = bulkTagMode ? pendingPlaylistBulkAssignments.get(playlist.id) : null;
                       const isTargetPlaylist = bulkTagMode && targetPlaylistForBulkTag === playlist.id;
                       return (
                        <div key={playlist.id} className={`text-left group relative ${originalIndex === currentPlaylistIndex ? 'ring-2 ring-blue-500 rounded-lg' : ''} ${isSelectedForDelete ? 'ring-4 ring-red-500 rounded-lg' : ''} ${isTargetPlaylist ? 'ring-4 ring-green-500 rounded-lg' : ''} ${pendingColor ? `ring-4 ${getRingColor(pendingColor)} rounded-lg` : ''}`}>
                          <div className={`aspect-video bg-gray-800 rounded-lg overflow-hidden relative ${originalIndex === currentPlaylistIndex ? 'outline-none' : ''} ${playlist.isColoredFolder && !playlist.isConvertedFromColoredFolder ? `border-2 ${groupColors[playlist.color]}` : ''}`}>
                        <img src={(() => {
                          const videoId = getPlaylistThumbnailVideoId(playlist);
                          return videoId ? `https://img.youtube.com/vi/${videoId}/mqdefault.jpg` : '/no-thumb.jpg';
                        })()} alt={playlist.name} className="w-full h-full object-cover" loading="lazy" />
                        {/* Bulk delete checkbox overlay */}
                        {bulkDeleteMode && canDelete && (
                          <div className="absolute top-2 left-2 z-10">
                            <input
                              type="checkbox"
                              checked={isSelectedForDelete}
                              onChange={(e) => {
                                setSelectedPlaylistsForDelete(prev => {
                                  const newSet = new Set(prev);
                                  if (e.target.checked) {
                                    newSet.add(playlist.id);
                                  } else {
                                    newSet.delete(playlist.id);
                                  }
                                  return newSet;
                                });
                              }}
                              onClick={(e) => e.stopPropagation()}
                              className="w-6 h-6 cursor-pointer"
                            />
                          </div>
                        )}
                        {/* Bulk tag mode - select target playlist button */}
                        {bulkTagMode && !targetPlaylistForBulkTag && canTag && (
                          <div className="absolute top-2 left-2 z-10">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setTargetPlaylistForBulkTag(playlist.id);
                              }}
                              className="px-2 py-1 bg-green-600 hover:bg-green-700 text-white text-xs rounded font-semibold"
                              title="Select as target playlist"
                            >
                              Target
                            </button>
                          </div>
                        )}
                        {/* Bulk tag mode - show target indicator */}
                        {bulkTagMode && isTargetPlaylist && (
                          <div className="absolute top-2 left-2 z-10">
                            <div className="px-2 py-1 bg-green-600 text-white text-xs rounded font-semibold">
                              ✓ Target
                            </div>
                          </div>
                        )}
                        {/* Bulk tag mode - 4x4 colored folders grid overlay */}
                        {bulkTagMode && targetPlaylistForBulkTag && canTag && !isTargetPlaylist && (() => {
                          const displayColors = allColorKeys.slice(0, 16);
                          const targetPlaylist = playlists.find(p => p.id === targetPlaylistForBulkTag);
                          if (!targetPlaylist) return null;
                          
                          const getBorderClasses = (index) => {
                            const borders = [];
                            if (index % 4 !== 3) borders.push('border-r');
                            if (index < 12) borders.push('border-b');
                            return borders.join(' ') + ' border-white/20';
                          };
                          
                          return (
                            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-auto z-10">
                              <div className="absolute inset-0 grid grid-cols-4 grid-rows-4 pointer-events-auto">
                                {displayColors.map((color, index) => {
                                  const defaultName = color.charAt(0).toUpperCase() + color.slice(1);
                                  const groupName = targetPlaylist.groups[color]?.name || defaultName;
                                  const isSelected = pendingColor === color;
                                  const colorClass = getColorClass(color);
                                  const ringColor = getRingColor(color);
                                  
                                  return (
                                    <div
                                      key={color}
                                      className={`${getBorderClasses(index)} relative cursor-pointer flex items-center justify-center transition-colors ${
                                        isSelected
                                          ? `${colorClass} ring-2 ${ringColor}` 
                                          : `${colorClass} hover:${colorClass} brightness-110`
                                      }`}
                                      onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        setPendingPlaylistBulkAssignments(prev => {
                                          const newMap = new Map(prev);
                                          if (prev.get(playlist.id) === color) {
                                            newMap.delete(playlist.id);
                                          } else {
                                            newMap.set(playlist.id, color);
                                          }
                                          return newMap;
                                        });
                                      }}
                                      title={groupName}
                                    >
                                      {(isSelected || groupName !== defaultName) && (
                                        <span className="text-white font-bold text-xs leading-tight opacity-0 group-hover:opacity-100 text-center px-1 break-words line-clamp-2" style={{ textShadow: '1px 1px 2px black, -1px -1px 2px black, 1px -1px 2px black, -1px 1px 2px black' }}>
                                          {isSelected ? '✓' : groupName}
                                        </span>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })()}
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 p-2">
                              {!bulkDeleteMode && !bulkTagMode && (
                                <>
                                  <button onClick={() => {
                                    if (playlist.isColoredFolder) {
                                      // For colored folders, open the parent playlist with the colored folder filter
                                      const parentIndex = playlists.findIndex(p => p.id === playlist.parentPlaylist.id);
                                      setSideMenuPlaylistIndex(parentIndex);
                                      setVideoFilter(playlist.color);
                                      setPlaylistFilters(prev => ({ ...prev, [playlist.parentPlaylist.id]: playlist.color })); // This updates the top video menu
                                      setShowSideMenu('videos');
                                      // Change to the first video in the colored folder
                                      if (playlist.videos.length > 0) {
                                        const firstVideo = playlist.videos[0];
                                        const videoIndex = playlist.parentPlaylist.videos.findIndex(v => v.id === firstVideo.id);
                                        if (videoIndex !== -1) {
                                          setCurrentVideoIndex(videoIndex);
                                        }
                                      }
                                    } else {
                                      handleViewPlaylistGrid(originalIndex);
                                    }
                                  }} title="View Videos" className="bg-white/20 p-3 rounded-full hover:bg-white/30"><Grid3X3 size={20}/></button>
                                  <button onClick={() => {
                                    if (playlist.isColoredFolder) {
                                      // For colored folders, switch to parent playlist and colored folder
                                      const parentIndex = playlists.findIndex(p => p.id === playlist.parentPlaylist.id);
                                      changePlaylist(parentIndex);
                                      setVideoFilter(playlist.color);
                                      setPlaylistFilters(prev => ({ ...prev, [playlist.parentPlaylist.id]: playlist.color })); // This updates the top video menu
                                      // Change to the first video in the colored folder
                                      if (playlist.videos.length > 0) {
                                        const firstVideo = playlist.videos[0];
                                        const videoIndex = playlist.parentPlaylist.videos.findIndex(v => v.id === firstVideo.id);
                                        if (videoIndex !== -1) {
                                          setCurrentVideoIndex(videoIndex);
                                        }
                                      }
                                    } else {
                                      selectPlaylistAndPlay(originalIndex);
                                    }
                                  }} title="Play" className="bg-blue-500/80 p-3 rounded-full hover:bg-blue-500"><Play size={20}/></button>
                                </>
                              )}
                              {!bulkDeleteMode && !bulkTagMode && playlist.isColoredFolder && !playlist.isConvertedFromColoredFolder && (
                                <button 
                                  onClick={() => {
                                    console.log('Convert button clicked for:', playlist);
                                    convertColoredFolderToPlaylist(playlist);
                                  }}
                                  title="Convert to Regular Playlist" 
                                  className="bg-green-500/80 p-3 rounded-full hover:bg-green-500"
                                >
                                  <Plus size={20}/>
                                </button>
                              )}
                              {!bulkDeleteMode && !bulkTagMode && playlist.isColoredFolder && !playlist.isConvertedFromColoredFolder && (
                                <button 
                                  onClick={() => {
                                    console.log('Merge colored folder button clicked for:', playlist);
                                    setMergeColoredFolder(playlist);
                                    setShowMergeColoredFolderModal(true);
                                  }}
                                  title="Merge into Playlist" 
                                  className="bg-purple-500/80 p-3 rounded-full hover:bg-purple-500"
                                >
                                  <GitMerge size={20}/>
                                </button>
                              )}
                              {!bulkDeleteMode && !bulkTagMode && playlist.isColoredFolder && !playlist.isConvertedFromColoredFolder && (
                                <button 
                                  onClick={() => {
                                    console.log('Delete colored folder button clicked for:', playlist);
                                    if (confirm(`Delete colored folder "${playlist.name}" and remove all its contents?`)) {
                                      deleteColoredFolder(playlist);
                                    }
                                  }}
                                  title="Delete Colored Folder" 
                                  className="bg-red-500/80 p-3 rounded-full hover:bg-red-500"
                                >
                                  <Trash2 size={20}/>
                                </button>
                              )}
                              {!playlist.isColoredFolder && playlist.id !== '_unsorted_' && !bulkDeleteMode && !bulkTagMode && (
                                <>
                                  <button 
                                    onClick={() => {
                                      setRenamingPlaylist(playlist.id);
                                      setPlaylistRenameInput(playlist.name);
                                    }}
                                    title="Rename Playlist" 
                                    className="bg-blue-500/80 p-3 rounded-full hover:bg-blue-500"
                                  >
                                    <Pencil size={20}/>
                                  </button>
                                  <button 
                                    onClick={() => {
                                      console.log('Merge playlist button clicked for:', playlist);
                                      setMergePlaylist(playlist);
                                      setShowMergePlaylistModal(true);
                                    }}
                                    title="Merge into Playlist" 
                                    className="bg-purple-500/80 p-3 rounded-full hover:bg-purple-500"
                                  >
                                    <GitMerge size={20}/>
                                  </button>
                                <button 
                                  onClick={() => {
                                    console.log('Delete playlist button clicked for:', playlist);
                                    if (confirm(`Delete playlist "${playlist.name}" permanently?`)) {
                                      deletePlaylist(playlist.id);
                                    }
                                  }}
                                  title="Delete Playlist" 
                                  className="bg-red-500/80 p-3 rounded-full hover:bg-red-500"
                                >
                                  <Trash2 size={20}/>
                                </button>
                                </>
                              )}
                              {!bulkDeleteMode && !bulkTagMode && activePlaylistTab !== 0 && !playlist.isColoredFolder && (
                                <button 
                                  onClick={() => {
                                    setPlaylistTabs(prev => prev.map((tab, idx) => 
                                      idx === activePlaylistTab 
                                        ? { ...tab, playlistIds: tab.playlistIds.filter(id => id !== playlist.id) }
                                        : tab
                                    ));
                                  }}
                                  title="Remove from Tab" 
                                  className="bg-orange-500/80 p-3 rounded-full hover:bg-orange-500"
                                >
                                  <X size={20}/>
                                </button>
                              )}
                        </div>
                      </div>
                          {renamingPlaylist === playlist.id ? (
                            <input 
                              type="text" 
                              value={playlistRenameInput} 
                              onChange={e => setPlaylistRenameInput(e.target.value)} 
                              onKeyDown={e => { 
                                if (e.key === 'Enter') {
                                  handleRenamePlaylist(playlist.id, playlistRenameInput);
                                  setRenamingPlaylist(null);
                                } else if (e.key === 'Escape') {
                                  setRenamingPlaylist(null);
                                  setPlaylistRenameInput("");
                                }
                              }} 
                              onBlur={() => {
                                if (playlistRenameInput.trim()) {
                                  handleRenamePlaylist(playlist.id, playlistRenameInput);
                                }
                                setRenamingPlaylist(null);
                                setPlaylistRenameInput("");
                              }} 
                              className="mt-2 bg-transparent border-b-2 border-blue-500 text-white font-semibold focus:outline-none w-full" 
                              autoFocus
                            />
                          ) : (
                            <h3 className={`mt-2 truncate ${originalIndex === currentPlaylistIndex ? 'text-blue-400 font-bold' : 'text-white font-semibold'}`}>
                              {playlist.name}
                              {playlist.isColoredFolder && !playlist.isConvertedFromColoredFolder && (
                                <span className={`ml-2 inline-block w-3 h-3 rounded-full ${groupColors[playlist.color]}`}></span>
                              )}
                            </h3>
                          )}
                          <p className="text-white/60 text-sm">
                            {playlist.videos.length} videos
                            {playlist.isColoredFolder && !playlist.isConvertedFromColoredFolder && (
                              <span className="ml-2 text-white/40">from {playlist.parentPlaylist.name}</span>
                            )}
                          </p>
                    </div>
                      )
                  })}
                  {viewingPlaylistTab !== 0 && (
                     <button onClick={() => setShowAddPlaylistModal(true)} className="aspect-video bg-white/5 rounded-lg flex items-center justify-center text-white/30 hover:bg-white/10 hover:text-white transition-colors" title="Add playlist to tab">
                        <Plus size={48} />
                        <span className="text-xs mt-1">Add</span>
                     </button>
                  )}
                  {/* Create Empty Playlist button in grid */}
                  <button 
                    onClick={handleCreateEmptyPlaylist} 
                    className="aspect-video bg-white/5 rounded-lg flex flex-col items-center justify-center text-white/30 hover:bg-white/10 hover:text-white transition-colors border-2 border-dashed border-white/20"
                    title="Create an empty placeholder playlist"
                    disabled={!userId}
                  >
                    <Plus size={32} />
                    <span className="text-xs mt-2">Empty</span>
                  </button>
                </div>

                {showAddPlaylistModal && (
                  <div className="fixed inset-0 bg-black/80 z-40 flex items-center justify-center p-4">
                    <div className="bg-gray-900 rounded-lg p-6 max-w-4xl w-full max-h-[80vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-4">
                           <h2 className="text-xl font-bold text-white">Add Playlist to &quot;{playlistTabs[viewingPlaylistTab].name}&quot;</h2>
                           <button onClick={() => setShowAddPlaylistModal(false)} className="p-2 rounded-full hover:bg-white/10"><X size={20} /></button>
                        </div>
                        {playlists.filter(p => p.id !== '_unsorted_' && !playlistTabs[viewingPlaylistTab].playlistIds.includes(p.id)).length === 0 ? (
                          <div className="text-center py-8">
                            <p className="text-white/60">All available playlists are already in this tab.</p>
                          </div>
                        ) : (
                          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                            {playlists.filter(p => p.id !== '_unsorted_' && !playlistTabs[viewingPlaylistTab].playlistIds.includes(p.id)).map(playlist => {
                              const thumbnailVideoId = getPlaylistThumbnailVideoId(playlist);
                              return (
                                <button key={playlist.id} onClick={() => addPlaylistToTab(playlist.id)} className="text-left group">
                                  <div className="aspect-video bg-gray-800 rounded-lg overflow-hidden relative">
                                    <img src={thumbnailVideoId ? `https://img.youtube.com/vi/${thumbnailVideoId}/mqdefault.jpg` : '/no-thumb.jpg'} alt={playlist.name} className="w-full h-full object-cover"/>
                                  </div>
                                  <h3 className="mt-2 text-sm truncate text-white group-hover:text-blue-400">{playlist.name}</h3>
                                  <p className="text-xs text-white/40 mt-1">{playlist.videos.length} videos</p>
                                </button>
                              );
                            })}
                          </div>
                        )}
                    </div>
                  </div>
                )}
              </>
            )}
            {showSideMenu === 'videos' && (() => {
              const displayedPlaylist = playlists[sideMenuPlaylistIndex] || { videos: [], groups: {}, name: '', starred: [] };
              const allVideos = getSideMenuVideos(displayedPlaylist);
              const visibleVideos = allVideos.slice(0, visibleCount);
              return (
                <>
                  <div className="sticky top-0 z-20 bg-black/80 backdrop-blur-sm pt-4 -mx-4 px-4 pb-4">
                    <div className="flex justify-end gap-2 mb-4">
                      <button onClick={() => setShowSideMenu('playlists')} className="text-white bg-white/10 hover:bg-white/20 p-2 rounded-full"><ChevronLeft size={24} /></button>
                      <button onClick={() => setShowSideMenu(null)} className="text-white bg-white/10 hover:bg-white/20 p-2 rounded-full"><X size={24} /></button>
                    </div>
                    <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-3 pt-0">
                      {renamingGroup === videoFilter ? (
                        <input type="text" value={groupRenameInput} onChange={e => setGroupRenameInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') handleRenameGroup(videoFilter) }} onBlur={() => handleRenameGroup(videoFilter)} className="bg-transparent border-b-2 border-blue-500 text-2xl font-bold text-white focus:outline-none" autoFocus/>
                      ) : (
                        <>
                          <span>{getVideoGridTitle(displayedPlaylist)}</span>
                          {allColorKeys.includes(videoFilter) && (<button onClick={() => { setRenamingGroup(videoFilter); setGroupRenameInput(displayedPlaylist.groups[videoFilter].name) }} className="text-white/50 hover:text-white"><Pencil size={18} /></button>)}
                        </>
                      )}
                    </h2>
                    <div className="flex items-center gap-2 mb-4">
                      <button onClick={() => setVideoFilter('all')} className={`px-3 py-1 rounded-full text-sm ${videoFilter === 'all' ? 'bg-blue-600' : 'bg-white/10'}`}>
                        All {displayedPlaylist.videos.length > 0 && `(${displayedPlaylist.videos.length})`}
                      </button>
                      <button onClick={() => setVideoFilter('unsorted')} className={`px-3 py-1 rounded-full text-sm ${videoFilter === 'unsorted' ? 'bg-blue-600' : 'bg-white/10'}`}>
                        Unsorted {(() => {
                          const allVideoIdsInGroups = Object.values(displayedPlaylist.groups || {}).flatMap(g => g.videos || []);
                          const unsortedCount = displayedPlaylist.videos.filter(v => !allVideoIdsInGroups.includes(v.id)).length;
                          return unsortedCount > 0 && `(${unsortedCount})`;
                        })()}
                      </button>
                      <div className="flex items-center gap-1 flex-wrap">
                        {allColorKeys.map((color) => {
                          const colorClass = getColorClass(color);
                          return (
                            <div 
                              key={color} 
                              onDragOver={e => e.preventDefault()} 
                              onDrop={() => handleDrop(color, draggingVideoId)} 
                              onClick={() => setVideoFilter(color)} 
                              className={`w-8 h-8 rounded-full cursor-pointer flex items-center justify-center text-white font-bold text-xs ${colorClass} ${videoFilter === color ? 'ring-2 ring-white' : ''}`}
                              title={displayedPlaylist.groups[color]?.name || color}
                            >
                          {(displayedPlaylist.groups[color]?.videos || []).length > 0 && <span>{(displayedPlaylist.groups[color]?.videos || []).length}</span>}
                        </div>
                          );
                        })}
                      </div>
                      <div className="ml-auto flex items-center gap-2">
                        <button 
                          onClick={() => {
                            setBulkMode(!bulkMode);
                            if (bulkMode) {
                              setPendingBulkAssignments(new Map()); // Clear pending when turning off
                            }
                          }} 
                          className={`px-3 py-1 rounded-full text-sm ${bulkMode ? 'bg-green-600' : 'bg-white/10'}`}
                          title="Bulk assignment mode - click colors to mark videos, then save"
                        >
                          Bulk {bulkMode && `(${pendingBulkAssignments.size})`}
                        </button>
                        {bulkMode && pendingBulkAssignments.size > 0 && (
                          <button 
                            onClick={handleBulkSave}
                            className="px-3 py-1 rounded-full text-sm bg-blue-600 hover:bg-blue-700 font-semibold"
                            title={`Save ${pendingBulkAssignments.size} assignments`}
                          >
                            Save ({pendingBulkAssignments.size})
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mb-4">
                      <button 
                        onClick={() => setSortMode(sortMode === 'chronological' ? 'shuffle' : 'chronological')}
                        className={`px-3 py-1 rounded-full text-sm ${sortMode === 'chronological' ? 'bg-blue-600' : 'bg-white/10'}`}
                      >
                        {sortMode === 'chronological' ? 'Chronological' : 'Shuffle'}
                      </button>
                      <button 
                        onClick={() => setWatchedFilter(watchedFilter === 'all' ? 'watched' : watchedFilter === 'watched' ? 'unwatched' : 'all')}
                        className={`px-3 py-1 rounded-full text-sm ${watchedFilter === 'all' ? 'bg-blue-600' : 'bg-white/10'}`}
                      >
                        {watchedFilter === 'all' ? 'All' : watchedFilter === 'watched' ? 'Watched' : 'Unwatched'}
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {visibleVideos.map(video => {
                      if (!video) return null;
                      const originalIndex = displayedPlaylist.videos.findIndex(v => v.id === video.id);
                      const progress = getVideoProgress(video.id);
                      const duration = video.duration || 1;
                      const isWatched = progress >= duration * 0.95;
                      const progressPercent = isWatched ? 100 : Math.min(100, (progress / duration) * 100);
                      return (
                        <div key={video.id} draggable onDragStart={() => setDraggingVideoId(video.id)} className="relative group">
                          {(() => {
                            const pendingColor = bulkMode ? pendingBulkAssignments.get(video.id) : null;
                            const currentColor = getVideoGroupColor(displayedPlaylist, video.id);
                            const borderColor = pendingColor ? groupRingColors[pendingColor] : (currentVideoId === video.id && chronologicalFilter === videoFilter ? 'ring-blue-500' : '');
                            return (
                          <button 
                            onClick={() => {
                              if (!bulkMode) {
                                selectVideoFromMenu(originalIndex, displayedPlaylist.id);
                              }
                            }} 
                            onContextMenu={(e) => handleVideoContextMenu(e, video)} 
                            className={`w-full text-left ${borderColor ? `ring-2 ${borderColor} rounded-lg` : ''} ${pendingColor ? 'ring-4' : ''}`}
                          >
                            <div className="aspect-video bg-gray-800 rounded-lg overflow-hidden relative group/thumbnail">
                              <img src={video.id ? `https://img.youtube.com/vi/${video.id}/mqdefault.jpg` : '/no-thumb.jpg'} alt={video.title} className="w-full h-full object-cover" loading="lazy" />
                              {/* Bulk mode 3x3 overlay */}
                              {bulkMode && (() => {
                                // Show all 16 colors in a 4x4 grid
                                const displayColors = allColorKeys.slice(0, 16);
                                
                                const getBorderClasses = (index) => {
                                  const borders = [];
                                  // Right border: not last column (indices 0-3, 4-7, 8-11, 12-15)
                                  if (index % 4 !== 3) borders.push('border-r');
                                  // Bottom border: not last row (indices 0-11)
                                  if (index < 12) borders.push('border-b');
                                  return borders.join(' ') + ' border-white/20';
                                };
                                
                                return (
                                  <div className="absolute inset-0 opacity-0 group-hover/thumbnail:opacity-100 transition-opacity duration-200 pointer-events-auto z-10">
                                    <div className="absolute inset-0 grid grid-cols-4 grid-rows-4 pointer-events-auto">
                                      {displayColors.map((color, index) => {
                                        const defaultName = color.charAt(0).toUpperCase() + color.slice(1);
                                        const groupName = displayedPlaylist.groups[color]?.name || defaultName;
                                        const isCustomName = groupName !== defaultName;
                                        const isSelected = pendingBulkAssignments.get(video.id) === color;
                                        const colorClass = getColorClass(color);
                                        const ringColor = getRingColor(color);
                                        
                                        return (
                                          <div
                                            key={color}
                                            className={`${getBorderClasses(index)} relative cursor-pointer flex items-center justify-center transition-colors ${
                                              isSelected
                                                ? `${colorClass} ring-2 ${ringColor}` 
                                                : `${colorClass} hover:${colorClass} brightness-110`
                                            }`}
                                          >
                                            {/* Pen icon for renaming */}
                                            <button
                                              onClick={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                const currentName = displayedPlaylist.groups[color]?.name || defaultName;
                                                const newName = prompt(`Enter a name for the ${defaultName} folder:`, currentName === defaultName ? '' : currentName);
                                                if (newName !== null && newName.trim()) {
                                                  // Rename the folder
                                                  setPlaylists(prev => prev.map(p => {
                                                    if (p.id === displayedPlaylist.id) {
                                                      return {
                                                        ...p,
                                                        groups: {
                                                          ...p.groups,
                                                          [color]: {
                                                            ...(p.groups[color] || { name: defaultName, videos: [] }),
                                                            name: newName.trim()
                                                          }
                                                        }
                                                      };
                                                    }
                                                    return p;
                                                  }));
                                                }
                                              }}
                                              className="absolute top-1 right-1 p-0.5 rounded bg-black/50 hover:bg-black/70 opacity-0 group-hover/thumbnail:opacity-100 transition-opacity z-20"
                                              title="Rename folder"
                                              onMouseEnter={(e) => e.stopPropagation()}
                                            >
                                              <Pencil size={10} className="text-white" />
                                            </button>
                                            
                                            {/* Main clickable area for assignment */}
                                            <button
                                              onClick={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                setPendingBulkAssignments(prev => {
                                                  const newMap = new Map(prev);
                                                  if (prev.get(video.id) === color) {
                                                    newMap.delete(video.id);
                                                  } else {
                                                    newMap.set(video.id, color);
                                                  }
                                                  return newMap;
                                                });
                                              }}
                                              className="absolute inset-0 flex items-center justify-center"
                                              title={groupName}
                                            >
                                              {(isSelected || isCustomName) && (
                                                <span className="text-white font-bold text-xs leading-tight opacity-0 group-hover/thumbnail:opacity-100 text-center px-1 break-words line-clamp-2" style={{ textShadow: '1px 1px 2px black, -1px -1px 2px black, 1px -1px 2px black, -1px 1px 2px black' }}>
                                                {isSelected ? '✓' : groupName}
                                              </span>
                                              )}
                                            </button>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                );
                              })()}
                              {progressPercent > 0 && (
                                <div className="absolute bottom-0 left-0 w-full h-2 bg-gray-500 overflow-hidden" title={`Watched ${formatTime(progress)} / ${formatTime(duration)}`}>
                                  <div className="h-full bg-red-500" style={{width: `${progressPercent}%`}} />
                                  {isWatched && <div className="absolute right-1 top-1/2 -translate-y-1/2 text-green-400"><Check size={14}/></div>}
                                </div>
                              )}
                              {/* Pin Icon */}
                              <button
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  handlePinVideo(video);
                                }}
                                className="absolute bottom-2 left-2 p-1 rounded-full bg-black/50 hover:bg-black/70 transition-colors opacity-0 group-hover:opacity-100"
                                title={pinnedVideos.some(pv => pv.id === video.id) ? "Unpin video" : "Pin video"}
                              >
                                <Pin size={14} className={pinnedVideos.some(pv => pv.id === video.id) ? "text-yellow-400" : "text-white/70"} />
                              </button>
                              <div className="absolute top-2 right-2"
                                   onMouseEnter={() => { setHoveredStarVideoId(video.id); if (cardStarLeaveTimer.current) { clearTimeout(cardStarLeaveTimer.current); cardStarLeaveTimer.current = null; } if (cardStarHoverTimer.current) clearTimeout(cardStarHoverTimer.current); cardStarHoverTimer.current = setTimeout(() => setShowCardStarColorMenu(true), 600); }}
                                   onMouseLeave={() => { if (cardStarHoverTimer.current) { clearTimeout(cardStarHoverTimer.current); cardStarHoverTimer.current = null; } cardStarLeaveTimer.current = setTimeout(() => { setShowCardStarColorMenu(false); setHoveredStarVideoId(null); }, 300); }}>
                                {(() => {
                                  const vColor = getVideoGroupColor(displayedPlaylist, video.id);
                                  const ringColor = vColor || selectedStarColor;
                                  // Get pending color for this video in bulk mode
                                  const pendingColor = bulkMode ? pendingBulkAssignments.get(video.id) : null;
                                  const displayColor = pendingColor || vColor || (bulkMode ? selectedStarColor : null);
                                  const displayRingColor = displayColor || ringColor;
                                  
                                  return (
                                    <div className={`p-1.5 rounded-full bg-black/50 hover:bg-black ring-2 ${groupRingColors[displayRingColor]} cursor-pointer ${bulkMode && pendingColor ? 'ring-4' : ''}`}
                                         onClick={(e) => { 
                                           e.preventDefault(); 
                                           e.stopPropagation(); 
                                           if (bulkMode) {
                                             // In bulk mode, just update pending assignments
                                             setPendingBulkAssignments(prev => {
                                               const newMap = new Map(prev);
                                               if (prev.get(video.id) === selectedStarColor) {
                                                 // Toggle off if same color
                                                 newMap.delete(video.id);
                                               } else {
                                                 // Set new color
                                                 newMap.set(video.id, selectedStarColor);
                                               }
                                               return newMap;
                                             });
                                           } else {
                                             // Normal mode - assign immediately
                                             assignVideoToColor(sideMenuPlaylistIndex, video.id, selectedStarColor);
                                           }
                                         }}
                                         onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); if (chronologicalFilter === 'all') { setSelectedStarColor(ringColor); } }}
                                         title={bulkMode ? (pendingColor ? `${pendingColor} (click to remove)` : `Mark as ${selectedStarColor}`) : (vColor ? `In ${vColor}` : `Send to ${selectedStarColor}`)}>
                                      <Star size={14} className={`${displayColor ? groupFillColors[displayColor] : 'text-white'}`} />
                                    </div>
                                  );
                                })()}
                                {(showCardStarColorMenu && hoveredStarVideoId === video.id) && (
                                  <div className="absolute right-0 mt-2 bg-black/90 backdrop-blur-sm border border-white/10 rounded-lg p-2 flex gap-2 z-50"
                                       onMouseEnter={() => { if (cardStarLeaveTimer.current) { clearTimeout(cardStarLeaveTimer.current); cardStarLeaveTimer.current = null; } }}
                                       onMouseLeave={() => { cardStarLeaveTimer.current = setTimeout(() => { setShowCardStarColorMenu(false); setHoveredStarVideoId(null); }, 300); }}>
                                    {(Object.keys(groupColors)).map(color => (
                                      <button key={color}
                                              onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); if (chronologicalFilter === 'all') { setSelectedStarColor(color); } }}
                                              onClick={(e) => { 
                                                e.preventDefault(); 
                                                e.stopPropagation(); 
                                                if (bulkMode) {
                                                  // In bulk mode, just update pending assignments
                                                  setPendingBulkAssignments(prev => {
                                                    const newMap = new Map(prev);
                                                    if (prev.get(video.id) === color) {
                                                      // Toggle off if same color
                                                      newMap.delete(video.id);
                                                    } else {
                                                      // Set new color
                                                      newMap.set(video.id, color);
                                                    }
                                                    return newMap;
                                                  });
                                                } else {
                                                  // Normal mode - assign immediately
                                                  assignVideoToColor(sideMenuPlaylistIndex, video.id, color);
                                                }
                                              }}
                                              className={`w-7 h-7 rounded-full ring-2 ${groupRingColors[color]} ${groupColors[color]} ${selectedStarColor === color ? 'scale-110' : ''} ${bulkMode && pendingBulkAssignments.get(video.id) === color ? 'ring-4' : ''}`}
                                              title={bulkMode ? `${color} (click to mark, right-click to set default)` : `${color} (Left: assign, Right: set default)`} />
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                            <h3 className="text-white font-semibold mt-2 text-sm truncate">{video.title}</h3>
                          </button>
                            );
                          })()}
                          <div className="absolute top-2 left-2 px-2 py-1 rounded-full bg-black/50 text-white text-xs font-bold">{formatMinutes(duration)}</div>
                          {allColorKeys.includes(videoFilter) && (<button onClick={() => handleRemoveFromGroup(video.id)} className="absolute bottom-2 right-2 p-1.5 rounded-full bg-black/50 hover:bg-red-500 opacity-0 group-hover:opacity-100"><Trash2 size={14} /></button>)}
                          {!bulkMode && (
                            <button 
                              onClick={(e) => handleVideoContextMenu(e, video)}
                              className="absolute bottom-2 right-2 p-1.5 rounded-full bg-black/50 hover:bg-white/20 opacity-0 group-hover:opacity-100"
                              style={{ right: allColorKeys.includes(videoFilter) ? '3.5rem' : '0.5rem' }}
                            >
                              <div className="flex flex-col gap-0.5">
                                <div className="w-1 h-1 bg-white rounded-full"></div>
                                <div className="w-1 h-1 bg-white rounded-full"></div>
                                <div className="w-1 h-1 bg-white rounded-full"></div>
                              </div>
                            </button>
                          )}
                        </div>
                      )
                    })}
                  </div>
                  {visibleVideos.length < allVideos.length && (<div className="mt-4 text-center"><button onClick={handleShowMore} className="bg-blue-500 text-white p-2 rounded hover:bg-blue-600">Show More Videos</button></div>)}
                </>
              )
            })()}
            {showSideMenu === 'history' && (
              <>
                <div className="sticky top-0 z-20 bg-black/80 backdrop-blur-sm pt-4 -mx-4 px-4 pb-4">
                  <div className="flex justify-end gap-2 mb-4">
                    <button onClick={() => setShowSideMenu('playlists')} className="text-white bg-white/10 hover:bg-white/20 p-2 rounded-full"><ChevronLeft size={24} /></button>
                    <button onClick={() => setShowSideMenu(null)} className="text-white bg-white/10 hover:bg-white/20 p-2 rounded-full"><X size={24} /></button>
                  </div>
                  <h2 className="text-2xl font-bold text-white mb-4 pt-0">Watch History</h2>
                </div>
                <div className="flex flex-col gap-4">
                  {videoHistory.slice(0, historyVisibleCount).map(entry => (
                    <div key={entry.id} className="group">
                      <button onClick={() => { const pIdx = playlists.findIndex(p => p.id === entry.playlistId); if (pIdx !== -1) { const vIdx = playlists[pIdx].videos.findIndex(v => v.id === entry.videoId); if (vIdx !== -1) selectVideoFromMenu(vIdx, entry.playlistId) } }} className={`w-full text-left flex items-center gap-4 p-2 rounded-lg hover:bg-white/10 ${currentVideoId === entry.videoId ? 'ring-2 ring-blue-500' : ''}`}>
                        <div className="w-32 aspect-video bg-gray-800 rounded-lg overflow-hidden relative flex-shrink-0">
                          <img src={entry.videoId ? `https://img.youtube.com/vi/${entry.videoId}/mqdefault.jpg` : '/no-thumb.jpg'} alt={entry.title} className="w-full h-full object-cover" loading="lazy"/>
                        </div>
                        <div>
                          <h3 className="text-white font-semibold text-sm truncate">{entry.title}</h3>
                          <p className="text-white/60 text-xs">{entry.playlistName} • {formatTimestamp(entry.timestamp)}</p>
                        </div>
                      </button>
                    </div>
                  ))}
                </div>
                {historyVisibleCount < videoHistory.length && (<div className="mt-4 text-center"><button onClick={handleShowMoreHistory} className="bg-blue-500 text-white p-2 rounded hover:bg-blue-600">Show More History</button></div>)}
              </>
            )}
            {showSideMenu === 'author' && (
              <>
                <div className="sticky top-0 z-20 bg-black/80 backdrop-blur-sm pt-4 -mx-4 px-4 pb-4">
                  <div className="flex justify-end gap-2 mb-4">
                    <button onClick={() => setShowSideMenu('playlists')} className="text-white bg-white/10 hover:bg-white/20 p-2 rounded-full"><ChevronLeft size={24} /></button>
                    <button onClick={() => setShowSideMenu(null)} className="text-white bg-white/10 hover:bg-white/20 p-2 rounded-full"><X size={24} /></button>
          </div>
                  <h2 className="text-2xl font-bold text-white mb-4 pt-0">Latest from {sideMenuAuthorName}</h2>
                </div>
                {authorVideos.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {authorVideos.map(video => (
                      <div key={video.id} className="relative group">
                        <button onClick={() => playOffPlaylistVideo(video)} className={`w-full text-left ${currentVideoId === video.id ? 'ring-2 ring-blue-500 rounded-lg' : ''}`}>
                          <div className="aspect-video bg-gray-800 rounded-lg overflow-hidden relative">
                            <img src={`https://img.youtube.com/vi/${video.id}/mqdefault.jpg`} alt={video.title} className="w-full h-full object-cover" loading="lazy" />
                          </div>
                          <h3 className="text-white font-semibold mt-2 text-sm truncate">{video.title}</h3>
                        </button>
                        <div className="absolute top-2 left-2 px-2 py-1 rounded-full bg-black/50 text-white text-xs font-bold">{formatMinutes(video.duration)}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-white/70 text-center py-10">Loading videos...</div>
                )}
              </>
            )}
            {showSideMenu === 'search' && (
              <>
                <div className="sticky top-0 z-20 bg-black/80 backdrop-blur-sm pt-4 -mx-4 px-4 pb-4">
                  <div className="flex justify-end gap-2 mb-4">
                    <button onClick={() => setShowSideMenu('playlists')} className="text-white bg-white/10 hover:bg-white/20 p-2 rounded-full"><ChevronLeft size={24} /></button>
                    <button onClick={() => setShowSideMenu(null)} className="text-white bg-white/10 hover:bg-white/20 p-2 rounded-full"><X size={24} /></button>
                  </div>
                  <h2 className="text-2xl font-bold text-white mb-4 pt-0">Search YouTube</h2>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Search for videos..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyDown={handleSearch}
                      className="w-full bg-white/10 text-white p-2 rounded-lg pl-10"
                      autoFocus
                    />
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/50" size={20} />
                  </div>
                </div>
                {searchResults.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {searchResults.map(video => (
                      <div key={video.id} className="relative group">
                        <button onClick={() => playOffPlaylistVideo(video)} className={`w-full text-left ${currentVideoId === video.id ? 'ring-2 ring-blue-500 rounded-lg' : ''}`}>
                          <div className="aspect-video bg-gray-800 rounded-lg overflow-hidden relative">
                            <img src={`https://img.youtube.com/vi/${video.id}/mqdefault.jpg`} alt={video.title} className="w-full h-full object-cover" loading="lazy" />
                          </div>
                          <h3 className="text-white font-semibold mt-2 text-sm truncate">{video.title}</h3>
                        </button>
                         <div className="absolute top-2 left-2 px-2 py-1 rounded-full bg-black/50 text-white text-xs font-bold">{formatMinutes(video.duration)}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-white/70 text-center py-10">Press Enter to search.</div>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* Context Menu */}
      {contextMenuVideo && (
        <div 
          className="fixed bg-black/90 backdrop-blur-sm border border-white/10 rounded-lg p-2 z-50"
          style={{ 
            left: contextMenuPosition.x, 
            top: contextMenuPosition.y,
            transform: 'translate(-50%, -100%)'
          }}
          onMouseLeave={() => setContextMenuVideo(null)}
        >
          <div className="flex flex-col gap-1">
            <button 
              onClick={() => {
                // Find the playlist containing this video
                const playlistIndex = playlists.findIndex(p => 
                  p.videos.some(v => v.id === contextMenuVideo.id)
                );
                if (playlistIndex !== -1) {
                  const videoIndex = playlists[playlistIndex].videos.findIndex(v => v.id === contextMenuVideo.id);
                  if (videoIndex !== -1) {
                    selectVideoFromMenu(videoIndex, playlists[playlistIndex].id);
                  }
                }
                setContextMenuVideo(null);
              }}
              className="px-3 py-2 text-white hover:bg-white/10 rounded text-sm"
            >
              Play Video
            </button>
            <button 
              onClick={() => handleRemoveFromPlaylist(contextMenuVideo.id)}
              className="px-3 py-2 text-white hover:bg-white/10 rounded text-sm"
            >
              Remove from Playlist
            </button>
            <button 
              onClick={() => handleSendToPlaylist(contextMenuVideo, 'copy')}
              className="px-3 py-2 text-white hover:bg-white/10 rounded text-sm"
            >
              Copy to Playlist
            </button>
            <button 
              onClick={() => handleSendToPlaylist(contextMenuVideo, 'move')}
              className="px-3 py-2 text-white hover:bg-white/10 rounded text-sm"
            >
              Move to Playlist
            </button>
            <button 
              onClick={() => handlePinVideo(contextMenuVideo)}
              className="px-3 py-2 text-white hover:bg-white/10 rounded text-sm"
            >
              {pinnedVideos.some(p => p.id === contextMenuVideo.id) ? 'Unpin' : 'Pin'}
            </button>
            {!bulkMode && (() => {
              // Find the playlist containing this video
              const playlistIndex = playlists.findIndex(p => 
                p.videos.some(v => {
                  const videoId = typeof v === 'string' ? v : (v?.id || v);
                  return videoId === contextMenuVideo.id;
                })
              );
              const playlist = playlistIndex !== -1 ? playlists[playlistIndex] : null;
              const isRepresentative = playlist && playlist.representativeVideoId === contextMenuVideo.id;
              
              return playlist ? (
                <button 
                  onClick={() => handleSetRepresentativeVideo(contextMenuVideo)}
                  className="px-3 py-2 text-white hover:bg-white/10 rounded text-sm"
                >
                  {isRepresentative ? 'Remove as Playlist Cover' : 'Set as Playlist Cover'}
                </button>
              ) : null;
            })()}
          </div>
        </div>
      )}

      {/* Send to Playlist Modal */}
      {showSendToPlaylistModal && sendToPlaylistVideo && (
        <div className="fixed inset-0 bg-black/80 z-40 flex items-center justify-center p-4">
          <div className="bg-gray-900 rounded-lg p-6 max-w-2xl w-full">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-white">{sendToPlaylistAction === 'move' ? 'Move' : 'Copy'} &quot;{sendToPlaylistVideo.title}&quot; to Playlist</h2>
              <button onClick={() => setShowSendToPlaylistModal(false)} className="p-2 rounded-full hover:bg-white/10"><X size={20} /></button>
            </div>
            <p className="text-white/70 mb-4">
              {sendToPlaylistAction === 'move' 
                ? 'Select a playlist to move this video to. The video will be removed from the current playlist.'
                : 'Select a playlist to copy this video to. The video will remain in the current playlist.'
              }
            </p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {playlists.filter(p => p.id !== '_unsorted_').map(playlist => (
                <button 
                  key={playlist.id} 
                  onClick={() => {
                    if (sendToPlaylistAction === 'move') {
                      // Move video: remove from current playlist and add to target playlist
                      setPlaylists(prev => prev.map(p => {
                        if (p.id === playlist.id) {
                          // Add to target playlist
                          return { ...p, videos: [...p.videos, sendToPlaylistVideo] };
                        } else if (p.id === currentPlaylist.id) {
                          // Remove from current playlist
                          return { ...p, videos: p.videos.filter(v => v.id !== sendToPlaylistVideo.id) };
                        }
                        return p;
                      }));
                    } else {
                      // Copy video: just add to target playlist
                      setPlaylists(prev => prev.map(p => 
                        p.id === playlist.id 
                          ? { ...p, videos: [...p.videos, sendToPlaylistVideo] }
                          : p
                      ));
                    }
                    setShowSendToPlaylistModal(false);
                    setSendToPlaylistVideo(null);
                  }}
                  className="text-left group"
                >
                  <div className="aspect-video bg-gray-800 rounded-lg overflow-hidden relative">
                    <img src={playlist.videos[0]?.id ? `https://img.youtube.com/vi/${playlist.videos[0].id}/mqdefault.jpg` : '/no-thumb.jpg'} alt={playlist.name} className="w-full h-full object-cover"/>
                  </div>
                  <h3 className="mt-2 text-sm truncate text-white group-hover:text-blue-400">{playlist.name}</h3>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
      
      <div className="fixed top-4 left-0 right-0 z-20 flex justify-center items-start gap-4 pointer-events-none">
        <div className="relative rounded-lg p-2 text-white pointer-events-auto overflow-hidden w-[300px] order-1">
          <div className="absolute inset-0 -z-10">
            <div className="absolute inset-0 transition-all duration-1000" style={{
              backgroundImage: currentVideoId ? `url(https://img.youtube.com/vi/${currentVideoId}/hqdefault.jpg)` : 'none',
              backgroundSize: 'cover',
              backgroundPosition: 'center'
            }} />
            <div className="absolute inset-0 bg-black/20" />
          </div>
          <div className="bg-black/0 rounded-lg">
          <h3 className="text-xs text-white/70 uppercase font-bold px-1 mb-1">Playlist</h3>
          <div className="flex items-center gap-2">
            <button onClick={goToPreviousPlaylist} className="p-1 hover:bg-white/20 rounded-md"><ChevronLeft size={20} /></button>
            <span className="font-semibold text-sm w-48 truncate text-center">{currentPlaylist.name || "..."}</span>
            <button onClick={goToNextPlaylist} className="p-1 hover:bg-white/20 rounded-md"><ChevronRight size={20} /></button>
            <button onClick={() => setShowSideMenu(showSideMenu === 'playlists' ? null : 'playlists')} className="p-2 rounded-full bg-white/10 hover:bg-white/20"><Grid3X3 size={16} /></button>
          </div>
          {/* Tab Cycler */}
          {playlistTabs.length > 1 && (
            <div className="flex items-center gap-1 mt-2">
              {playlistTabs.map((tab, index) => (
            <button 
                  key={index}
                  onClick={() => {
                    // Update tab memory and switch tabs
                    setTabLastPlaylists(prev => {
                      const newMemory = { ...prev, [activePlaylistTab]: currentPlaylistIndex };
                      
                      // Check if we have a remembered playlist for the target tab
                      const rememberedPlaylistIndex = newMemory[index];
                      
                      if (index !== 0 && tab.playlistIds.length > 0) {
                        // Custom tab with playlists
                        if (rememberedPlaylistIndex !== undefined) {
                          // Check if the remembered playlist is still in this tab
                          const rememberedPlaylist = playlists[rememberedPlaylistIndex];
                          if (rememberedPlaylist && tab.playlistIds.includes(rememberedPlaylist.id)) {
                            setTimeout(() => changePlaylist(rememberedPlaylistIndex, { updateTabMemory: false }), 0);
                          } else {
                            // Fallback to first playlist in tab
                            const firstPlaylistId = tab.playlistIds[0];
                            const playlistIndex = playlists.findIndex(p => p.id === firstPlaylistId);
                            if (playlistIndex !== -1) {
                              setTimeout(() => changePlaylist(playlistIndex, { updateTabMemory: false }), 0);
                            }
                          }
                        } else {
                          // No remembered playlist, use first in tab
                          const firstPlaylistId = tab.playlistIds[0];
                          const playlistIndex = playlists.findIndex(p => p.id === firstPlaylistId);
                          if (playlistIndex !== -1) {
                            setTimeout(() => changePlaylist(playlistIndex, { updateTabMemory: false }), 0);
                          }
                        }
                      } else if (index === 0) {
                        // "All" tab
                        if (rememberedPlaylistIndex !== undefined && playlists[rememberedPlaylistIndex]) {
                          setTimeout(() => changePlaylist(rememberedPlaylistIndex, { updateTabMemory: false }), 0);
                        } else if (playlists.length > 0) {
                          setTimeout(() => changePlaylist(0, { updateTabMemory: false }), 0);
                        }
                      }
                      
                      return newMemory;
                    });
                    
                    setActivePlaylistTab(index);
                  }}
                  className={`px-2 py-1 text-xs rounded ${activePlaylistTab === index ? 'bg-white/20 text-white' : 'text-white/60 hover:text-white'}`}
                >
                  {tab.name}
            </button>
              ))}
          </div>
          )}
        </div>
          </div>

        <div
          style={{ backgroundColor: averageColor }}
          className="backdrop-blur-sm rounded-lg p-2 text-white pointer-events-auto w-[480px] max-w-[90vw] order-2 transition-colors duration-1000 ease-in-out">
          <div className="text-xs text-white/70 px-1 mb-1">
          <div className="flex items-center gap-2">
              {videoPublishedYear && <span className="uppercase font-bold">{videoPublishedYear}</span>}
              {videoAuthorName && <button onClick={handleAuthorClick} className="opacity-80 hover:opacity-100 hover:text-white transition-opacity cursor-pointer">{videoAuthorName}</button>}
              {videoViewCount && <span className="opacity-80">{formatViews(videoViewCount)} views</span>}
              <span className="capitalize">{chronologicalFilter === 'all' ? 'shuffle' : chronologicalFilter}</span>
            </div>
          </div>
          <div className="flex items-center gap-2 relative">
            <button onClick={goToPreviousVideo} className="p-1 hover:bg-white/20 rounded-md"><ChevronLeft size={20} /></button>
            <span
              className={`font-semibold text-sm ${isTitleExpanded ? 'flex-1 text-left whitespace-nowrap overflow-hidden' : 'w-48 truncate text-center whitespace-nowrap'}`}
              onMouseEnter={() => { if (titleHoverTimerRef.current) clearTimeout(titleHoverTimerRef.current); titleHoverTimerRef.current = setTimeout(() => setIsTitleExpanded(true), 2000); }}
              onMouseLeave={() => { if (titleHoverTimerRef.current) { clearTimeout(titleHoverTimerRef.current); titleHoverTimerRef.current = null; } setIsTitleExpanded(false); }}
            >
              {currentVideoTitle}
            </span>
            <button onClick={goToNextVideo} className={`p-1 hover:bg-white/20 rounded-md ${isTitleExpanded ? 'ml-auto' : ''}`}><ChevronRight size={20} /></button>
            <div className={`${isTitleExpanded ? 'absolute -top-6 right-0 opacity-0 pointer-events-none' : 'relative translate-y-0 opacity-100'} transition-all duration-300 flex items-center gap-2`}>
              <button onClick={() => setShowSideMenu(showSideMenu === 'search' ? null : 'search')} className={`p-2 rounded-full transition-colors ${showSideMenu === 'search' ? 'bg-blue-500' : 'bg-white/10 hover:bg-white/20'}`}><Search size={16} /></button>
            <button onClick={() => { setShowSideMenu(showSideMenu === 'videos' ? null : (setSideMenuPlaylistIndex(currentPlaylistIndex), setVideoFilter(chronologicalFilter), 'videos')) }} className="p-2 rounded-full bg-white/10 hover:bg-white/20"><Grid3X3 size={16} /></button>
            <button onClick={() => setShowSideMenu(showSideMenu === 'history' ? null : 'history')} className={`p-2 rounded-full transition-colors ${showSideMenu === 'history' ? 'bg-blue-500' : 'bg-white/10 hover:bg-white/20'}`}><Clock size={16} /></button>
            <button onClick={handleFolderCycleClick} className={`p-2 rounded-full transition-colors ${chronologicalFilter !== 'all' ? groupColors[chronologicalFilter] : 'bg-blue-500'}`}><Play size={16} /></button>
                <button onClick={() => startNewShuffle()} className={`p-2 rounded-full bg-blue-500 hover:bg-blue-600`} title="Regenerate shuffle order for current filter"><Shuffle size={16} /></button>
                <button onClick={wipeColoredFoldersAndPlaylists} className={`p-2 rounded-full bg-red-500 hover:bg-red-600`} title="Wipe colored folders and added playlists (preserves tabs)"><Trash2 size={16} /></button>
                <div className="relative settings-menu">
                  <button 
                    onClick={() => setShowSettingsMenu(!showSettingsMenu)} 
                    className={`p-2 rounded-full bg-gray-500 hover:bg-gray-600`} 
                    title="Settings"
                  >
                    <Pencil size={16} />
                  </button>
                  {showSettingsMenu && (
                    <div className="absolute right-0 mt-2 bg-black/90 backdrop-blur-sm border border-white/10 rounded-lg p-2 z-50 min-w-[200px]">
                      <div className="px-3 py-2 border-b border-white/10 mb-2">
                        <div className="text-xs text-white/60 mb-1">Persistent User ID</div>
                        <div className="text-xs text-white/80 font-mono break-all mb-2">{userId || 'Not set'}</div>
                        <button
                          onClick={() => {
                            copyPersistentId();
                            setShowSettingsMenu(false);
                          }}
                          className="w-full px-2 py-1 text-xs bg-blue-600 hover:bg-blue-700 rounded text-white"
                        >
                          Copy ID
                        </button>
                      </div>
                      <button
                        onClick={() => {
                          setShowPersistentIdModal(true);
                          setShowSettingsMenu(false);
                        }}
                        className="w-full text-left px-3 py-2 text-white hover:bg-white/10 rounded text-sm"
                      >
                        Restore ID
                      </button>
                      <button
                        onClick={() => {
                          setShowConfigModal(true);
                          setShowSettingsMenu(false);
                        }}
                        className="w-full text-left px-3 py-2 text-white hover:bg-white/10 rounded text-sm"
                      >
                        Configure API Keys
                      </button>
                      <button
                        onClick={() => {
                          resetConfiguration();
                          setShowSettingsMenu(false);
                        }}
                        className="w-full text-left px-3 py-2 text-red-400 hover:bg-red-500/20 rounded text-sm"
                      >
                        Reset Configuration
                      </button>
                    </div>
                  )}
                </div>
              <div className="relative"
                 onMouseEnter={() => { if (starLeaveTimer.current) { clearTimeout(starLeaveTimer.current); starLeaveTimer.current = null; } if (starHoverTimer.current) clearTimeout(starHoverTimer.current); starHoverTimer.current = setTimeout(() => setShowStarColorMenu(true), 800); }}
                 onMouseLeave={() => { if (starHoverTimer.current) { clearTimeout(starHoverTimer.current); starHoverTimer.current = null; } starLeaveTimer.current = setTimeout(() => setShowStarColorMenu(false), 400); }}>
              <button onClick={() => assignCurrentVideoToColor(selectedStarColor)}
                      className={`p-2 rounded-full bg-white/10 hover:bg-white/20 ring-2 ${groupRingColors[activeStarBorderColor]}`}
                      title={`Send to ${selectedStarColor} group`}>
                <Star size={16} className={`${currentVideoGroupColor ? groupFillColors[currentVideoGroupColor] : 'text-white'}`} />
              </button>
              {showStarColorMenu && (
                <div className="absolute right-0 mt-2 bg-black/90 backdrop-blur-sm border border-white/10 rounded-lg p-2 flex gap-2 z-50"
                     onMouseEnter={() => { if (starLeaveTimer.current) { clearTimeout(starLeaveTimer.current); starLeaveTimer.current = null; } }}
                     onMouseLeave={() => { starLeaveTimer.current = setTimeout(() => setShowStarColorMenu(false), 400); }}>
                  {(Object.keys(groupColors)).map(color => (
                    <button key={color}
                            onContextMenu={(e) => { e.preventDefault(); if (chronologicalFilter === 'all') { setSelectedStarColor(color); } }}
                            onClick={() => assignCurrentVideoToColor(color)}
                            className={`w-8 h-8 rounded-full ring-2 ${groupRingColors[color]} ${groupColors[color]} ${selectedStarColor === color ? 'scale-110' : ''}`}
                            title={`${color} (Left: assign, Right: set default)`} />
                  ))}
                </div>
              )}
               </div>
            </div>
          </div>
          {/* Pin System */}
          <div className="mt-2 pt-2 border-t border-white/10">
            <div className="flex items-center gap-1">
              {pinnedVideos.length > 0 ? (
                pinnedVideos.map((video, index) => (
                  <button
                    key={video.id}
                    onClick={() => {
                      const playlistIndex = playlists.findIndex(p => p.videos.some(v => v.id === video.id));
                      if (playlistIndex !== -1) {
                        const videoIndex = playlists[playlistIndex].videos.findIndex(v => v.id === video.id);
                        selectVideoFromMenu(videoIndex, playlists[playlistIndex].id);
                      }
                    }}
                    className="p-1 hover:bg-white/20 rounded"
                    title={video.title}
                  >
                    <div className="w-4 h-4 bg-white/20 rounded flex items-center justify-center">
                      <div className="w-2 h-2 bg-white rounded-full"></div>
                    </div>
                  </button>
                ))
              ) : (
                <div className="text-white/40 text-xs">No pins</div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Merge Colored Folder Modal */}
      {showMergeColoredFolderModal && mergeColoredFolder && (
        <div className="fixed inset-0 bg-black/80 z-40 flex items-center justify-center p-4">
          <div className="bg-gray-900 rounded-lg p-6 max-w-2xl w-full">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-white">Merge &quot;{mergeColoredFolder.name}&quot; into Playlist</h2>
              <button onClick={() => setShowMergeColoredFolderModal(false)} className="p-2 rounded-full hover:bg-white/10"><X size={20} /></button>
            </div>
            <p className="text-white/70 mb-4">Select a playlist to merge the colored folder contents into. Duplicates will be automatically skipped.</p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {playlists.filter(p => p.id !== '_unsorted_' && !p.isColoredFolder).map(playlist => (
                <button 
                  key={playlist.id} 
                  onClick={() => {
                    mergeColoredFolderToPlaylist(mergeColoredFolder, playlist.id);
                    setShowMergeColoredFolderModal(false);
                    setMergeColoredFolder(null);
                  }}
                  className="text-left group"
                >
                  <div className="aspect-video bg-gray-800 rounded-lg overflow-hidden relative">
                    <img src={playlist.videos[0]?.id ? `https://img.youtube.com/vi/${playlist.videos[0].id}/mqdefault.jpg` : '/no-thumb.jpg'} alt={playlist.name} className="w-full h-full object-cover"/>
                  </div>
                  <h3 className="mt-2 text-sm truncate text-white group-hover:text-blue-400">{playlist.name}</h3>
                  <p className="text-white/60 text-xs">{playlist.videos.length} videos</p>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Merge Playlist Modal */}
      {showMergePlaylistModal && mergePlaylist && (
        <div className="fixed inset-0 bg-black/80 z-40 flex items-center justify-center p-4">
          <div className="bg-gray-900 rounded-lg p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-white">Merge &quot;{mergePlaylist.name}&quot; into Playlist</h2>
              <button onClick={() => { setShowMergePlaylistModal(false); setMergePlaylist(null); setSelectedTargetColor(null); }} className="p-2 rounded-full hover:bg-white/10"><X size={20} /></button>
            </div>
            <p className="text-white/70 mb-4">Select a playlist to merge &quot;{mergePlaylist.name}&quot; into. You can optionally merge all videos into a specific colored folder.</p>
            <div className="mb-4 p-3 bg-blue-500/20 border border-blue-500/50 rounded-lg">
              <label className="flex items-center gap-2 text-white cursor-pointer">
                <input 
                  type="checkbox" 
                  id="deleteSourceCheckbox"
                  className="w-4 h-4"
                />
                <span className="text-sm">Delete source playlist after merging</span>
              </label>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {playlists.filter(p => p.id !== '_unsorted_' && !p.isColoredFolder && p.id !== mergePlaylist.id).map(playlist => {
                const isSelected = selectedTargetColor && selectedTargetColor.playlistId === playlist.id;
                return (
                  <div key={playlist.id} className="space-y-2">
                    <button 
                      onClick={() => {
                        const deleteSource = document.getElementById('deleteSourceCheckbox')?.checked || false;
                        const targetColor = isSelected ? selectedTargetColor.color : null;
                        mergePlaylistToPlaylist(mergePlaylist.id, playlist.id, deleteSource, targetColor);
                        setShowMergePlaylistModal(false);
                        setMergePlaylist(null);
                        setSelectedTargetColor(null);
                      }}
                      className="text-left group w-full"
                    >
                      <div className="aspect-video bg-gray-800 rounded-lg overflow-hidden relative">
                        <img src={playlist.videos[0]?.id ? `https://img.youtube.com/vi/${playlist.videos[0].id}/mqdefault.jpg` : '/no-thumb.jpg'} alt={playlist.name} className="w-full h-full object-cover"/>
                      </div>
                      <h3 className="mt-2 text-sm truncate text-white group-hover:text-blue-400">{playlist.name}</h3>
                      <p className="text-white/60 text-xs">{playlist.videos.length} videos</p>
                    </button>
                    <div className="text-xs text-white/70 mb-1">Or merge into colored folder:</div>
                    <div className="grid grid-cols-4 gap-1">
                      {allColorKeys.map(color => {
                        const groupName = playlist.groups[color]?.name || color.charAt(0).toUpperCase() + color.slice(1);
                        const isColorSelected = isSelected && selectedTargetColor.color === color;
                        return (
                          <button
                            key={color}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (isColorSelected) {
                                setSelectedTargetColor(null);
                              } else {
                                setSelectedTargetColor({ playlistId: playlist.id, color });
                              }
                            }}
                            className={`p-2 rounded text-xs font-bold transition-all ${
                              isColorSelected 
                                ? `${getColorClass(color)} ring-2 ${getRingColor(color)}` 
                                : `${getColorClass(color)} opacity-70 hover:opacity-100`
                            }`}
                            title={groupName}
                          >
                            {groupName.length > 6 ? groupName.substring(0, 6) : groupName}
                          </button>
                        );
                      })}
                    </div>
                    {isSelected && (
                      <div className="text-xs text-blue-400 mt-1">
                        ✓ Will merge into {playlist.groups[selectedTargetColor.color]?.name || selectedTargetColor.color} folder
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Bulk Add Playlists Modal */}
      {showBulkAddModal && (
        <div className="fixed inset-0 bg-black/80 z-40 flex items-center justify-center p-4">
          <div className="bg-gray-900 rounded-lg p-6 max-w-2xl w-full">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-white">Bulk Add Playlists</h2>
              <button 
                onClick={() => { 
                  setShowBulkAddModal(false); 
                  setBulkPlaylistIds(Array(10).fill('')); 
                }} 
                className="p-2 rounded-full hover:bg-white/10"
              >
                <X size={20} />
              </button>
            </div>
            <p className="text-white/70 mb-4">
              Enter playlist IDs or URLs (one per box). Each playlist will be added separately.
            </p>

            <div className="mb-4">
              <label className="block text-white mb-2">Playlist IDs or URLs (one per box):</label>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {bulkPlaylistIds.map((id, index) => (
                  <input
                    key={index}
                    type="text"
                    value={id}
                    onChange={(e) => {
                      const newIds = [...bulkPlaylistIds];
                      newIds[index] = e.target.value;
                      setBulkPlaylistIds(newIds);
                    }}
                    placeholder={`Playlist ${index + 1} ID or URL`}
                    className="w-full bg-white/10 text-white p-2 rounded font-mono text-sm"
                  />
                ))}
              </div>
            </div>

            <div className="flex gap-2 justify-end">
              <button
                onClick={() => {
                  setShowBulkAddModal(false);
                  setBulkPlaylistIds(Array(10).fill(''));
                }}
                className="px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-600"
              >
                Cancel
              </button>
              <button
                onClick={handleBulkAddPlaylists}
                className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 disabled:bg-gray-700 disabled:cursor-not-allowed"
                disabled={!bulkPlaylistIds.some(id => id.trim())}
              >
                Add Playlists
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Configuration Setup Modal */}
      {showConfigModal && isFirebaseInitialized && (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 rounded-lg p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-white">YouTube TV Setup</h2>
              <button onClick={() => setShowConfigModal(false)} className="p-2 rounded-full hover:bg-white/10"><X size={24} /></button>
            </div>
            
            <div className="mb-6 p-4 bg-blue-900/20 border border-blue-500/30 rounded-lg">
              <h3 className="text-lg font-semibold text-blue-400 mb-2">Update Configuration</h3>
              <p className="text-white/80 text-sm">
                Update your API keys and Firebase configuration. Changes will take effect after saving.
              </p>
            </div>

            <form onSubmit={handleConfigSubmit} className="space-y-6">
              {/* YouTube API Key */}
              <div>
                <label className="block text-white font-semibold mb-2">
                  YouTube Data API v3 Key *
                </label>
                <input
                  type="text"
                  value={configForm.youtubeApiKey}
                  onChange={(e) => handleConfigChange('youtubeApiKey', e.target.value)}
                  placeholder="AIzaSy..."
                  className="w-full bg-white/10 text-white p-3 rounded-lg border border-white/20 focus:border-blue-500 focus:outline-none"
                  required
                />
                <p className="text-white/60 text-xs mt-1">
                  Get your API key from the <a href="https://console.developers.google.com/" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">Google Cloud Console</a>
                </p>
              </div>

              {/* Firebase Configuration */}
              <div>
                <h3 className="text-lg font-semibold text-white mb-4">Firebase Configuration *</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-white font-semibold mb-2">API Key</label>
                    <input
                      type="text"
                      value={configForm.firebaseApiKey}
                      onChange={(e) => handleConfigChange('firebaseApiKey', e.target.value)}
                      placeholder="AIzaSy..."
                      className="w-full bg-white/10 text-white p-3 rounded-lg border border-white/20 focus:border-blue-500 focus:outline-none"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-white font-semibold mb-2">Auth Domain</label>
                    <input
                      type="text"
                      value={configForm.firebaseAuthDomain}
                      onChange={(e) => handleConfigChange('firebaseAuthDomain', e.target.value)}
                      placeholder="project.firebaseapp.com"
                      className="w-full bg-white/10 text-white p-3 rounded-lg border border-white/20 focus:border-blue-500 focus:outline-none"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-white font-semibold mb-2">Project ID</label>
                    <input
                      type="text"
                      value={configForm.firebaseProjectId}
                      onChange={(e) => handleConfigChange('firebaseProjectId', e.target.value)}
                      placeholder="your-project-id"
                      className="w-full bg-white/10 text-white p-3 rounded-lg border border-white/20 focus:border-blue-500 focus:outline-none"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-white font-semibold mb-2">Storage Bucket</label>
                    <input
                      type="text"
                      value={configForm.firebaseStorageBucket}
                      onChange={(e) => handleConfigChange('firebaseStorageBucket', e.target.value)}
                      placeholder="project.appspot.com"
                      className="w-full bg-white/10 text-white p-3 rounded-lg border border-white/20 focus:border-blue-500 focus:outline-none"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-white font-semibold mb-2">Messaging Sender ID</label>
                    <input
                      type="text"
                      value={configForm.firebaseMessagingSenderId}
                      onChange={(e) => handleConfigChange('firebaseMessagingSenderId', e.target.value)}
                      placeholder="123456789"
                      className="w-full bg-white/10 text-white p-3 rounded-lg border border-white/20 focus:border-blue-500 focus:outline-none"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-white font-semibold mb-2">App ID</label>
                    <input
                      type="text"
                      value={configForm.firebaseAppId}
                      onChange={(e) => handleConfigChange('firebaseAppId', e.target.value)}
                      placeholder="1:123:web:abc123"
                      className="w-full bg-white/10 text-white p-3 rounded-lg border border-white/20 focus:border-blue-500 focus:outline-none"
                      required
                    />
                  </div>
                </div>
                <div className="mt-4">
                  <label className="block text-white font-semibold mb-2">Measurement ID (Optional)</label>
                  <input
                    type="text"
                    value={configForm.firebaseMeasurementId}
                    onChange={(e) => handleConfigChange('firebaseMeasurementId', e.target.value)}
                    placeholder="G-XXXXXXXXXX"
                    className="w-full bg-white/10 text-white p-3 rounded-lg border border-white/20 focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <p className="text-white/60 text-xs mt-2">
                  Get your Firebase config from the <a href="https://console.firebase.google.com/" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">Firebase Console</a>
                </p>
              </div>

              {configError && (
                <div className="p-4 bg-red-900/20 border border-red-500/30 rounded-lg">
                  <p className="text-red-400 text-sm">{configError}</p>
                </div>
              )}

              <div className="flex gap-4 pt-4">
                <button
                  type="submit"
                  disabled={isConfigValidating}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
                >
                  {isConfigValidating ? 'Validating...' : 'Save Configuration'}
                </button>
                <button
                  type="button"
                  onClick={useDefaultConfig}
                  className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white font-semibold rounded-lg transition-colors"
                >
                  Use Demo Config
                </button>
              </div>
            </form>

            <div className="mt-6 p-4 bg-yellow-900/20 border border-yellow-500/30 rounded-lg">
              <h4 className="text-yellow-400 font-semibold mb-2">Demo Configuration</h4>
              <p className="text-white/80 text-sm">
                You can use the demo configuration to try out the app, but your data will be shared with other users. 
                For personal use, please set up your own Firebase project and YouTube API key.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Persistent ID Restore Modal */}
      {showPersistentIdModal && (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 rounded-lg p-6 max-w-2xl w-full">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-white">Restore Persistent User ID</h2>
              <button onClick={() => {
                setShowPersistentIdModal(false);
                setRestoreIdInput('');
              }} className="p-2 rounded-full hover:bg-white/10"><X size={24} /></button>
            </div>
            
            <div className="mb-6 p-4 bg-yellow-900/20 border border-yellow-500/30 rounded-lg">
              <h3 className="text-lg font-semibold text-yellow-400 mb-2">⚠️ Important: Back Up Your ID</h3>
              <p className="text-white/80 text-sm mb-2">
                Your persistent user ID is your key to accessing your saved data. If you lose it (e.g., by clearing browser storage), you won't be able to access your playlists, colored folders, and video progress.
              </p>
              <p className="text-white/80 text-sm font-semibold">
                Current ID: <span className="font-mono text-yellow-300">{userId || 'Not set'}</span>
              </p>
            </div>

            <div className="mb-6 p-4 bg-blue-900/20 border border-blue-500/30 rounded-lg">
              <h3 className="text-lg font-semibold text-blue-400 mb-2">How to Restore</h3>
              <p className="text-white/80 text-sm mb-2">
                If you previously saved your persistent ID and need to restore it (e.g., after clearing browser storage), enter it below.
              </p>
              <p className="text-white/60 text-xs">
                Your ID should start with "persistent_" followed by random characters.
              </p>
            </div>

            <div className="mb-6">
              <label className="block text-white font-semibold mb-2">
                Enter Your Persistent User ID
              </label>
              <input
                type="text"
                value={restoreIdInput}
                onChange={(e) => setRestoreIdInput(e.target.value)}
                placeholder="persistent_xxxxxxxxxxxxx"
                className="w-full bg-white/10 text-white p-3 rounded-lg border border-white/20 focus:border-blue-500 focus:outline-none font-mono text-sm"
              />
            </div>

            <div className="flex gap-4">
              <button
                onClick={restorePersistentId}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
              >
                Restore ID
              </button>
              <button
                onClick={() => {
                  setShowPersistentIdModal(false);
                  setRestoreIdInput('');
                }}
                className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white font-semibold rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Color Picker Modal */}
      {showColorPickerModal && colorPickerVideo && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 rounded-lg p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold text-white">Select Color Folder</h2>
              <button
                onClick={() => {
                  setShowColorPickerModal(false);
                  setColorPickerVideo(null);
                }}
                className="text-white/60 hover:text-white"
              >
                <X size={24} />
              </button>
            </div>
            <div className="grid grid-cols-4 md:grid-cols-6 gap-3">
              {allColorKeys.map((color) => {
                const groupName = displayedPlaylist.groups[color]?.name || color.charAt(0).toUpperCase() + color.slice(1);
                const isSelected = pendingBulkAssignments.get(colorPickerVideo.id) === color;
                const colorClass = getColorClass(color);
                const ringColor = getRingColor(color);
                
                return (
                  <button
                    key={color}
                    onClick={() => {
                      setPendingBulkAssignments(prev => {
                        const newMap = new Map(prev);
                        if (prev.get(colorPickerVideo.id) === color) {
                          newMap.delete(colorPickerVideo.id);
                        } else {
                          newMap.set(colorPickerVideo.id, color);
                        }
                        return newMap;
                      });
                      setShowColorPickerModal(false);
                      setColorPickerVideo(null);
                    }}
                    className={`p-4 rounded-lg flex flex-col items-center justify-center gap-2 transition-all ${
                      isSelected
                        ? `${colorClass} ring-2 ${ringColor} ring-offset-2 ring-offset-gray-900`
                        : `${colorClass} hover:brightness-110`
                    }`}
                    title={groupName}
                  >
                    <div className={`w-12 h-12 rounded-full ${colorClass} ${isSelected ? 'ring-2 ring-white' : ''}`}></div>
                    <span className="text-white font-semibold text-sm text-center">{groupName}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

    </div>
  )
}