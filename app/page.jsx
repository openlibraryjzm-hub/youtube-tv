"use client"
import { useState, useEffect, useLayoutEffect, useRef, useMemo } from "react"

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
  Maximize2,
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
  Download,
  Upload,
  Database,
  Folder,
  CornerDownRight,
  MoveDown,
} from "lucide-react"
import YouTube from "react-youtube"
// Firebase imports removed - using local database via API routes instead
// import { collection, query, orderBy, limit, deleteDoc, setDoc, doc, onSnapshot, updateDoc, getDocs, writeBatch, where, deleteField } from "firebase/firestore";

// Tauri Database Helpers (for packaged app) or API routes (for dev)
// Check for Tauri in multiple ways (Tauri v2)
const isTauri = typeof window !== 'undefined' && (
  window.__TAURI_INTERNALS__ !== undefined ||
  window.__TAURI__ !== undefined ||
  (window.__TAURI_METADATA__ !== undefined)
);

// Log detection result on load
if (typeof window !== 'undefined') {
  console.log('🔍 Tauri detection:', {
    isTauri,
    __TAURI_INTERNALS__: window.__TAURI_INTERNALS__ !== undefined,
    __TAURI__: window.__TAURI__ !== undefined,
    __TAURI_METADATA__: window.__TAURI_METADATA__ !== undefined,
    userAgent: navigator.userAgent,
  });
}

// Helper to get Tauri invoke function with better error handling
const getInvoke = async () => {
  if (!isTauri) {
    console.log('🔍 Not in Tauri environment, will use API routes');
    return null;
  }
  
  try {
    // Tauri v2 uses @tauri-apps/api/core
    const { invoke } = await import('@tauri-apps/api/core');
    console.log('✅ Tauri API loaded successfully');
    return invoke;
  } catch (error) {
    console.error('❌ Failed to load Tauri API:', error);
    console.log('⚠️ Falling back to API routes');
    return null;
  }
};

// Fetch user data from local database
const fetchUserData = async (userId) => {
  console.log(`📥 fetchUserData called for userId: ${userId}`);
  console.log(`🔍 Tauri detected: ${isTauri}`);
  
  const invoke = await getInvoke();
  if (invoke) {
    try {
      console.log('📞 Calling Tauri command: get_user_data');
      const result = await invoke('get_user_data', { userId });
      console.log('✅ Tauri command succeeded:', result);
      return result;
    } catch (error) {
      console.error('❌ Tauri command failed:', error);
      // Show error to user
      if (typeof window !== 'undefined') {
        alert(`Database Error: ${error}\n\nCheck console for details.`);
      }
      throw error;
    }
  } else {
    // Fallback to API route for development
    console.log('📡 Using API route fallback');
    try {
      const response = await fetch(`/api/user/${userId}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch user data: ${response.statusText}`);
      }
      return await response.json();
    } catch (error) {
      console.error('❌ API route failed:', error);
      throw error;
    }
  }
};

// Save user data to local database
const saveUserData = async (userId, data) => {
  console.log(`💾 saveUserData called for userId: ${userId}`);
  const invoke = await getInvoke();
  if (invoke) {
    try {
      console.log('📞 Calling Tauri command: save_user_data');
      await invoke('save_user_data', { userId, data });
      console.log('✅ Tauri command succeeded');
      return { success: true };
    } catch (error) {
      console.error('❌ Tauri command failed:', error);
      throw error;
    }
  } else {
    // Fallback to API route for development
    console.log('📡 Using API route fallback');
    const response = await fetch(`/api/user/${userId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!response.ok) {
      throw new Error(`Failed to save user data: ${response.statusText}`);
    }
    return await response.json();
  }
};

// Save video progress to local database
const saveVideoProgress = async (userId, videoProgress) => {
  const invoke = await getInvoke();
  if (invoke) {
    try {
      await invoke('save_video_progress', { userId, videoProgress });
      return { success: true };
    } catch (error) {
      console.error('❌ Tauri command failed:', error);
      throw error;
    }
  } else {
    // Fallback to API route for development
    const response = await fetch(`/api/user/${userId}/progress`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ videoProgress })
    });
    if (!response.ok) {
      throw new Error(`Failed to save video progress: ${response.statusText}`);
    }
    return await response.json();
  }
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

// Component to handle async thumbnail loading
function ThumbnailImage({ videoId, alt }) {
  const [src, setSrc] = useState('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIwIiBoZWlnaHQ9IjE4MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMzIwIiBoZWlnaHQ9IjE4MCIgZmlsbD0iIzFmMjkzNyIvPjxwYXRoIGQ9Ik0xMjggOTBsNDAgMjV2LTUwbC00MCAyNXoiIGZpbGw9IiM2YjcyODAiLz48L3N2Zz4=');
  
  useEffect(() => {
    let mounted = true;
    let retryCount = 0;
    const MAX_RETRIES = 3;
    
    const loadThumbnail = async (isRetry = false) => {
      try {
        const thumbnailSrc = await getVideoThumbnail(videoId);
        if (mounted) {
          // Only update if we got a real thumbnail (not placeholder)
          if (thumbnailSrc && !thumbnailSrc.includes('data:image/svg')) {
            setSrc(thumbnailSrc);
          } else if (!isRetry && retryCount < MAX_RETRIES) {
            // Retry after a short delay if we got placeholder
            retryCount++;
            setTimeout(() => {
              if (mounted) {
                loadThumbnail(true);
              }
            }, 1000 * retryCount); // Exponential backoff: 1s, 2s, 3s
          } else {
            // Keep placeholder if all retries failed
            setSrc(thumbnailSrc);
          }
        }
      } catch (error) {
        console.error("❌ Error loading thumbnail:", error);
        // Keep placeholder on error
      }
    };
    
    loadThumbnail();
    
    // Listen for thumbnail ready events
    const handleThumbnailReady = (event) => {
      if (event.detail?.videoId === videoId && mounted) {
        retryCount = 0; // Reset retry count on new event
        loadThumbnail();
      }
    };
    
    window.addEventListener('thumbnailReady', handleThumbnailReady);
    
    return () => {
      mounted = false;
      window.removeEventListener('thumbnailReady', handleThumbnailReady);
    };
  }, [videoId]);
  
  return (
    <img 
      src={src} 
      alt={alt} 
      className="w-full h-full object-cover" 
      loading="lazy"
      onError={(e) => {
        // Silently fail - we'll show placeholder
        // Don't spam console with errors for placeholders
        if (!src.includes('data:image/svg')) {
          console.error("❌ Image failed to load for video:", videoId);
          console.error("❌ Image src:", e.target.src?.substring(0, 100));
        }
      }}
    />
  );
}

// Initialize thumbnail blob cache on window object for global access
if (typeof window !== 'undefined' && !window.thumbnailBlobCache) {
  window.thumbnailBlobCache = new Map();
}

// Synchronous helper function to get thumbnail URL (for use in src attributes)
// Returns placeholder for local files, actual URL for YouTube
function getVideoThumbnailSync(videoId) {
  if (!videoId) {
    return '/no-thumb.jpg';
  }
  
  // Check if it's a local file
  if (typeof videoId === 'string' && videoId.startsWith('local:file://')) {
    // Check if we have a thumbnail path stored (synchronously accessible)
    if (window.localVideoThumbnails && window.localVideoThumbnails.has(videoId)) {
      const thumbnail = window.localVideoThumbnails.get(videoId);
      
      // If it's a file path, we'll need to convert it async, but for now return placeholder
      // The ThumbnailImage component will handle the async conversion
      if (thumbnail && typeof thumbnail === 'string' && !thumbnail.startsWith('data:image/')) {
        // Return URL-encoded SVG placeholder (avoids CSP issues)
        return "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='320' height='180'%3E%3Crect width='320' height='180' fill='%231f2937'/%3E%3Cpath d='M128 90l40 25v-50l-40 25z' fill='%236b7280'/%3E%3C/svg%3E";
      }
      
      // If it's a data URL, return it
      if (thumbnail && typeof thumbnail === 'string' && thumbnail.startsWith('data:image/')) {
        return thumbnail;
      }
    }
    
    // Fallback: Use URL-encoded SVG placeholder (avoids CSP issues)
    return "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='320' height='180'%3E%3Crect width='320' height='180' fill='%231f2937'/%3E%3Cpath d='M128 90l40 25v-50l-40 25z' fill='%236b7280'/%3E%3C/svg%3E";
  }
  
  // Only use YouTube thumbnail URL if it's a valid YouTube video ID
  if (typeof videoId === 'string' && !videoId.includes('local:file://') && !videoId.includes('://') && videoId.length === 11) {
    return `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;
  }
  
  return '/no-thumb.jpg';
}

// Async helper function to get thumbnail URL (for ThumbnailImage component)
async function getVideoThumbnail(videoId) {
  if (!videoId) {
    return '/no-thumb.jpg';
  }
  
  // Check if it's a local file
  if (typeof videoId === 'string' && videoId.startsWith('local:file://')) {
    // Check if we have a thumbnail path stored
    if (window.localVideoThumbnails && window.localVideoThumbnails.has(videoId)) {
      const thumbnail = window.localVideoThumbnails.get(videoId);
      
      // If it's a file path (not a data URL), convert it using Tauri's convertFileSrc
      if (thumbnail && typeof thumbnail === 'string' && !thumbnail.startsWith('data:image/')) {
        // Check cache first (now stores convertFileSrc URLs, not blob URLs)
        if (window.thumbnailBlobCache && window.thumbnailBlobCache.has(thumbnail)) {
          return window.thumbnailBlobCache.get(thumbnail);
        }
        
        if (isTauri && window.__TAURI_INTERNALS__) {
          // Use Tauri fs plugin to read file and create blob URL - same approach as videos
          try {
            const { readFile } = await import('@tauri-apps/plugin-fs');
            // Read thumbnail file as binary
            const fileData = await readFile(thumbnail);
            // Create blob from binary data
            const blob = new Blob([fileData], { type: 'image/jpeg' });
            const blobUrl = URL.createObjectURL(blob);
            
            // Cache the blob URL
            if (!window.thumbnailBlobCache) {
              window.thumbnailBlobCache = new Map();
            }
            window.thumbnailBlobCache.set(thumbnail, blobUrl);
            console.log("✅ Loaded thumbnail as blob URL:", blobUrl);
            return blobUrl;
          } catch (fsError) {
            // If file read fails, file might not exist yet or still extracting
            console.warn("⚠️ Thumbnail file not available yet:", fsError);
            // Return placeholder - file might still be extracting
            return "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='320' height='180'%3E%3Crect width='320' height='180' fill='%231f2937'/%3E%3Cpath d='M128 90l40 25v-50l-40 25z' fill='%236b7280'/%3E%3C/svg%3E";
          }
        }
        // Fallback: try to use the path directly (won't work but won't crash)
        return thumbnail;
      }
      
      // If it's still a data URL (fallback), return it
      if (thumbnail && typeof thumbnail === 'string' && thumbnail.startsWith('data:image/')) {
        return thumbnail;
      }
    }
    
    // Try to get thumbnail path from backend and load as blob URL (in case it exists but wasn't loaded yet)
    if (isTauri && window.__TAURI_INTERNALS__) {
      try {
        const { invoke } = await import('@tauri-apps/api/core');
        const { readFile } = await import('@tauri-apps/plugin-fs');
        const filePath = await invoke('get_thumbnail_path_command', { videoId });
        if (filePath) {
          // Read file and create blob URL
          const fileData = await readFile(filePath);
          const blob = new Blob([fileData], { type: 'image/jpeg' });
          const blobUrl = URL.createObjectURL(blob);
          
          // Store in Map for future use
          if (!window.localVideoThumbnails) {
            window.localVideoThumbnails = new Map();
          }
          window.localVideoThumbnails.set(videoId, filePath);
          
          // Cache the blob URL
          if (!window.thumbnailBlobCache) {
            window.thumbnailBlobCache = new Map();
          }
          window.thumbnailBlobCache.set(filePath, blobUrl);
          
          console.log("✅ Loaded thumbnail as blob URL from backend (backend check)");
          return blobUrl;
        }
      } catch (error) {
        // Thumbnail doesn't exist yet, that's OK
      }
    }
    
    // Fallback: Use URL-encoded SVG placeholder (avoids CSP issues)
    return "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='320' height='180'%3E%3Crect width='320' height='180' fill='%231f2937'/%3E%3Cpath d='M128 90l40 25v-50l-40 25z' fill='%236b7280'/%3E%3C/svg%3E";
  }
  
  // Only use YouTube thumbnail URL if it's a valid YouTube video ID
  if (typeof videoId === 'string' && !videoId.includes('local:file://') && !videoId.includes('://') && videoId.length === 11) {
    return `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;
  }
  
  return '/no-thumb.jpg';
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
  const [quarterSplitscreenMode, setQuarterSplitscreenMode] = useState(false); // Quarter splitscreen: two players in left quadrants
  const [secondaryPlayerVideoId, setSecondaryPlayerVideoId] = useState(null); // Video ID for second player in quarter splitscreen
  const [menuQuadrantMode, setMenuQuadrantMode] = useState(false); // Menu in bottom right quadrant mode
  const [playerQuadrantMode, setPlayerQuadrantMode] = useState(false); // Player pushed to bottom quadrants mode
  const [draggingVideoId, setDraggingVideoId] = useState(null);
  // Floating window player state
  const [floatingWindowVideoId, setFloatingWindowVideoId] = useState(null);
  const [floatingWindowPosition, setFloatingWindowPosition] = useState({ x: 100, y: 100 });
  const [floatingWindowSize, setFloatingWindowSize] = useState({ width: 400, height: 300 });
  const [isDraggingWindow, setIsDraggingWindow] = useState(false);
  const [isResizingWindow, setIsResizingWindow] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, width: 0, height: 0 });
  // Main player window state (windowed by default)
  const [mainPlayerWindowPosition, setMainPlayerWindowPosition] = useState({ x: 50, y: 50 });
  const [mainPlayerWindowSize, setMainPlayerWindowSize] = useState({ width: 800, height: 600 });
  const [mainPlayerFullSize, setMainPlayerFullSize] = useState({ width: 800, height: 600 }); // Store full size when menu is closed
  const [isDraggingMainWindow, setIsDraggingMainWindow] = useState(false);
  const [isResizingMainWindow, setIsResizingMainWindow] = useState(false);
  const [mainWindowDragStart, setMainWindowDragStart] = useState({ x: 0, y: 0 });
  const [mainWindowResizeStart, setMainWindowResizeStart] = useState({ x: 0, y: 0, width: 0, height: 0 });
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
  const [showColoredFolders, setShowColoredFolders] = useState(false);
  const [thumbnailUpdateTrigger, setThumbnailUpdateTrigger] = useState(0);
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
  const [bulkAddMode, setBulkAddMode] = useState('bulk'); // 'bulk' or 'configure'
  const [configurePlaylistName, setConfigurePlaylistName] = useState('');
  const [configurePlaylistEntries, setConfigurePlaylistEntries] = useState([{ id: '', color: 'red', folderName: '' }]);
  const [configurePlaylistMode, setConfigurePlaylistMode] = useState('new'); // 'new' or 'existing'
  const [configureSelectedPlaylistId, setConfigureSelectedPlaylistId] = useState('');
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
  
  // Listen for thumbnail extraction events to trigger UI updates
  useEffect(() => {
    const handleThumbnailReady = (event) => {
      console.log("🎨 Thumbnail ready event received for:", event.detail?.videoId);
      setThumbnailUpdateTrigger(prev => prev + 1);
    };
    
    window.addEventListener('thumbnailReady', handleThumbnailReady);
    
    return () => {
      window.removeEventListener('thumbnailReady', handleThumbnailReady);
    };
  }, []);
  const isProcessingApiQueue = useRef(false); // Track if API queue is being processed
  const lastApiCallTime = useRef(0); // Track last API call time for rate limiting
  const isSavingRef = useRef(false); // Track if we're currently saving to prevent snapshot overwrites
  const lastSaveTimeRef = useRef(0); // Track when we last saved
  const lastLocalChangeTimeRef = useRef(0); // Track when we last made a local change
  const hasLoadedInitialDataRef = useRef(false); // Track if we've loaded initial data from Firestore

  const playerRef = useRef(null)
  const playerContainerRef = useRef(null);
  const localVideoRef = useRef(null);
  // Track if we've already seeked to resume position for current video
  const hasSeekedToResume = useRef(false);
  // Secondary player refs for quarter splitscreen mode
  const secondaryPlayerRef = useRef(null);
  const secondaryPlayerContainerRef = useRef(null);
  const secondaryLocalVideoRef = useRef(null);
  // Floating window refs
  const floatingWindowRef = useRef(null);
  const floatingPlayerRef = useRef(null);
  const floatingPlayerContainerRef = useRef(null);
  // Main player window ref
  const mainPlayerWindowRef = useRef(null);
  const titleHoverTimerRef = useRef(null);
  const starHoverTimer = useRef(null);
  const starLeaveTimer = useRef(null);
  const menuQuadrantHoverTimer = useRef(null);
  const playerQuadrantHoverTimer = useRef(null);
  const cardStarHoverTimer = useRef(null);
  const cardStarLeaveTimer = useRef(null);
  const isInFullscreenTransition = useRef(false); // Track fullscreen transitions to prevent cleanup conflicts

  const currentPlaylist = playlists[currentPlaylistIndex] || { videos: [], groups: {}, starred: [] };
  const chronologicalFilter = playlistFilters[currentPlaylist.id] || 'all';
  const currentVideoId = currentPlaylist.videos[currentVideoIndex]?.id || "";
  const currentVideoTitle = currentPlaylist.videos[currentVideoIndex]?.title || "No Video Selected";
  
  // Helper to get video title by ID
  const getVideoTitle = (videoId) => {
    if (!videoId) return "No Video";
    // Search through all playlists
    for (const playlist of playlists) {
      const video = playlist.videos.find(v => v.id === videoId);
      if (video) return video.title;
    }
    return "Unknown Video";
  };

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

  // Initialize video streaming server on app start (Tauri only)
  useEffect(() => {
    if (isTauri && window.__TAURI_INTERNALS__) {
      const initVideoServer = async () => {
        try {
          console.log("🔄 [DEBUG] Initializing video streaming server...");
          const invoke = await getInvoke();
          if (invoke) {
            const port = await invoke('start_video_server');
            console.log("✅ [DEBUG] Video streaming server initialized on port:", port);
            // Store port globally for debugging
            window.videoServerPort = port;
          } else {
            console.error("❌ [DEBUG] getInvoke returned null");
          }
        } catch (error) {
          console.error("❌ [DEBUG] Failed to initialize video server:", error);
          console.error("❌ [DEBUG] Error details:", error.message, error.stack);
        }
      };
      initVideoServer();
    } else {
      console.log("⚠️ [DEBUG] Not in Tauri environment, skipping video server init");
    }
  }, []);

  // Add keyboard shortcut for devtools (F12 or Ctrl+Shift+I)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleKeyDown = async (event) => {
      // F12 or Ctrl+Shift+I
      if (event.key === 'F12' || (event.ctrlKey && event.shiftKey && event.key === 'I')) {
        event.preventDefault();
        if (isTauri) {
          try {
            // Use Tauri API directly to open devtools
            const { getCurrentWindow } = await import('@tauri-apps/api/window');
            const appWindow = getCurrentWindow();
            // Toggle devtools - try to open it
            // Note: In Tauri v2, devtools might need to be enabled in config
            await appWindow.setFocus();
            // For now, just log - devtools opening might need different approach
            console.log('Devtools shortcut pressed - check Tauri config for devtools support');
          } catch (error) {
            console.error('Failed to toggle devtools:', error);
            console.log('Tip: Devtools may need to be enabled in tauri.conf.json');
          }
        } else {
          // In browser, just use the default behavior
          console.log('Devtools shortcut pressed (browser mode)');
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
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
        // Test Tauri connection first if in Tauri environment
        if (isTauri) {
          const invoke = await getInvoke();
          if (invoke) {
            try {
              console.log('🧪 Testing database connection...');
              const testResult = await invoke('test_db_connection', {});
              console.log('✅ Database test result:', testResult);
              
              // Check default channels status
              console.log('🔍 Checking default channels status...');
              const channelsStatus = await invoke('check_default_channels', {});
              console.log('📊 Default channels status:', channelsStatus);
              
              // If no defaults loaded, try to force initialize
              if (channelsStatus.includes('Default playlists in DB: 0')) {
                console.log('⚠️ No default channels found, attempting to initialize...');
                try {
                  const initResult = await invoke('force_initialize_default_channels', {});
                  console.log('✅', initResult);
                } catch (initError) {
                  console.error('❌ Failed to initialize default channels:', initError);
                }
              }
            } catch (testError) {
              console.error('❌ Database test failed:', testError);
              alert(`Database Connection Error: ${testError}\n\nThis might be a build issue. Make sure you ran "npm run build" before "npx tauri build".`);
            }
          }
        }
        
        if (!hasLoadedInitialDataRef.current) {
          hasLoadedInitialDataRef.current = true;
          console.log(`📥 Initial data load from local database`);
        }
        
        let data;
        try {
          data = await fetchUserData(userId);
          console.log(`📦 Local database data loaded:`, {
            playlistCount: data.playlists?.length || 0,
            tabCount: data.playlistTabs?.length || 0,
            videoProgressCount: Object.keys(data.videoProgress || {}).length
          });
        } catch (error) {
          console.error('❌ Failed to load user data, using defaults:', error);
          // Use empty data structure if fetch fails
          data = {
            playlists: [],
            playlistTabs: [],
            customColors: {},
            colorOrder: [],
            videoProgress: {}
          };
        }
        
        // Use data from database, or fall back to initial playlists if empty
        let finalPlaylists = data.playlists && data.playlists.length > 0 
          ? data.playlists 
          : initialPlaylists;
        const finalTabs = data.playlistTabs && data.playlistTabs.length > 0
          ? data.playlistTabs
          : [{ name: 'All', playlistIds: [] }];
        
        console.log(`📊 Final playlists count: ${finalPlaylists.length}, tabs: ${finalTabs.length}`);
        
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
        
        console.log(`✅ Setting ${finalPlaylists.length} playlists and ${finalTabs.length} tabs`);
        setPlaylists(finalPlaylists);
        setPlaylistTabs(finalTabs);
        
        // Log summary
        const totalVideos = finalPlaylists.reduce((sum, p) => sum + (p.videos?.length || 0), 0);
        console.log(`📊 Data load complete: ${finalPlaylists.length} playlists, ${totalVideos} total videos`);
        
        if (totalVideos === 0) {
          console.log('ℹ️ No videos found. User needs to add a playlist first.');
        }
      } catch (error) {
        console.error("❌ Error fetching data from local database:", error);
        console.error("Error details:", error.message, error.stack);
        
        // Use initial playlists as fallback even on error
        console.log("🔄 Falling back to initial playlists due to error");
        setPlaylists(initialPlaylists);
        setPlaylistTabs([{ name: 'All', playlistIds: [] }]);
        
        alert(`Failed to load data from database: ${error.message}\n\nUsing default playlists. Check console for details.`);
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
        
        // Build playlist object, preserving representativeVideoId and ensuring all required fields
        const playlistToSave = {
          ...playlist,
          videos: optimizedVideos,
          // Ensure isConvertedFromColoredFolder is always present (default to false)
          isConvertedFromColoredFolder: playlist.isConvertedFromColoredFolder || false
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
        
        // Show alert to user so they know saves aren't working
        if (typeof window !== 'undefined' && isTauri) {
          alert(`⚠️ Failed to save data to local database!\n\nError: ${error.message || error}\n\nYour changes may not persist. Please check console for details.`);
        }
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

  // Fetch and cache video metadata from database (PERMANENT STORAGE)
  useEffect(() => {
    if (!userId || !currentVideoId) {
      setVideoPublishedYear('');
      setVideoAuthorName('');
      setVideoViewCount('');
      setVideoChannelId('');
      return;
    }

    const loadMetadataFromDatabase = async () => {
      if (isTauri) {
        try {
          const invoke = await getInvoke();
          if (invoke) {
            const dbMetadata = await invoke('get_video_metadata_batch', { videoIds: [currentVideoId] });
            if (dbMetadata && dbMetadata[currentVideoId]) {
              const meta = dbMetadata[currentVideoId];
              setVideoPublishedYear(meta.publishedYear || '');
              setVideoAuthorName(meta.author || '');
              setVideoViewCount(meta.viewCount || '');
              setVideoChannelId(meta.channelId || '');
              // Also update in-memory cache
              metadataCacheInMemory.current.set(currentVideoId, {
                publishedYear: meta.publishedYear || '',
                author: meta.author || '',
                viewCount: meta.viewCount || '0',
                channelId: meta.channelId || ''
              });
              return;
            }
          }
        } catch (error) {
          console.error('Error loading metadata from database:', error);
        }
      }

      // Fallback: Check in-memory cache (loaded from localStorage)
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
    };

    loadMetadataFromDatabase();
  }, [currentVideoId, userId, isTauri]);

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

      // 2. Check database for existing video metadata (PERMANENT STORAGE - NEVER AUTO-REFETCHED)
      console.log(`🔍 Checking database for metadata on ${allVideoSnippets.length} videos...`);
      const videoIds = allVideoSnippets.map(v => v.id);
      let cachedVideos = {};
      
      // CRITICAL: Check database FIRST (permanent storage, like thumbnails - fetch once, use forever)
      if (isTauri) {
        try {
          const invoke = await getInvoke();
          if (invoke) {
            // Batch lookup from database (handles up to 999 IDs per query)
            const dbMetadata = await invoke('get_video_metadata_batch', { videoIds });
            if (dbMetadata) {
              // Convert database format to our format
              Object.keys(dbMetadata).forEach(videoId => {
                const meta = dbMetadata[videoId];
                cachedVideos[videoId] = {
                  title: meta.title || '',
                  author: meta.author || '',
                  viewCount: meta.viewCount || '0',
                  channelId: meta.channelId || '',
                  publishedYear: meta.publishedYear || '',
                  duration: meta.duration || 1
                };
              });
              console.log(`✅ Found ${Object.keys(cachedVideos).length} videos with metadata in database`);
            }
          }
        } catch (error) {
          console.error('Error checking database for metadata:', error);
        }
      }
      
      // Identify videos missing metadata
      const idsToFetch = videoIds.filter(id => !cachedVideos[id]);
      console.log(`💾 Found ${Object.keys(cachedVideos).length} cached videos, need to fetch ${idsToFetch.length} new ones`);

      // 3. Fetch missing metadata from YouTube API (ONE-TIME FETCH PER VIDEO - STORED PERMANENTLY)
      // CRITICAL: This is a ONE-TIME cost. After fetching, metadata is stored in database FOREVER.
      // We NEVER auto-refetch. User is OK with outdated info - just want it there.
      if (idsToFetch.length > 0 && currentApiKey) {
        console.log(`📥 Fetching metadata for ${idsToFetch.length} videos (ONE-TIME FETCH - will be stored permanently in database)`);
        
        // Fetch in batches of 50 (YouTube API limit)
        const metadataToSave = [];
        
        for (let i = 0; i < idsToFetch.length; i += 50) {
          const batch = idsToFetch.slice(i, i + 50);
          const batchIds = batch.join(',');
          
          try {
            // Rate limiting
            const timeSinceLastCall = Date.now() - lastApiCallTime.current;
            if (timeSinceLastCall < 200) {
              await new Promise(resolve => setTimeout(resolve, 200 - timeSinceLastCall));
            }
            lastApiCallTime.current = Date.now();
            
            const res = await fetch(
              `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics,contentDetails&id=${batchIds}&key=${currentApiKey}`
            );
            const data = await res.json();
            
            if (data.items) {
              data.items.forEach(item => {
                const videoId = item.id;
                const snippet = allVideoSnippets.find(s => s.id === videoId);
                const title = item.snippet?.title || snippet?.title || '';
                const author = item.snippet?.channelTitle || '';
                const viewCount = item.statistics?.viewCount || '0';
                const channelId = item.snippet?.channelId || '';
                const publishedYear = item.snippet?.publishedAt 
                  ? new Date(item.snippet.publishedAt).getFullYear().toString() 
                  : '';
                const duration = item.contentDetails?.duration 
                  ? parseISO8601Duration(item.contentDetails.duration) 
                  : 1;
                
                // Store in cache for immediate use
                cachedVideos[videoId] = {
                  title,
                  author,
                  viewCount,
                  channelId,
                  publishedYear,
                  duration
                };
                
                // Prepare for database save
                metadataToSave.push({
                  videoId,
                  title,
                  author,
                  viewCount,
                  channelId,
                  publishedYear,
                  duration
                });
              });
              
              console.log(`✅ Fetched metadata for batch ${Math.floor(i / 50) + 1} (${Math.min(i + 50, idsToFetch.length)}/${idsToFetch.length} videos)`);
            }
          } catch (error) {
            console.error(`Error fetching metadata for batch starting at ${i}:`, error);
            // Continue with next batch even if this one fails
          }
        }
        
        // Save all fetched metadata to database PERMANENTLY (ONE-TIME STORAGE - NEVER AUTO-REFETCHED)
        if (metadataToSave.length > 0 && isTauri) {
          try {
            const invoke = await getInvoke();
            if (invoke) {
              await invoke('save_video_metadata_batch', { metadata: metadataToSave });
              console.log(`💾 Saved ${metadataToSave.length} video metadata entries to database (PERMANENT STORAGE - will never be refetched)`);
            }
          } catch (error) {
            console.error('Error saving metadata to database:', error);
          }
        }
      } else if (idsToFetch.length > 0) {
        // No API key or not in Tauri - use defaults
        console.log(`⚠️ No API key or not in Tauri - using default metadata for ${idsToFetch.length} videos`);
        idsToFetch.forEach(id => {
          const snippet = allVideoSnippets.find(s => s.id === id);
          cachedVideos[id] = {
            title: snippet?.title || '',
            author: '',
            viewCount: '0',
            channelId: '',
            publishedYear: '',
            duration: 1
          };
        });
      }

      // 4. Combine titles with cached/fetched details
      const allVideos = allVideoSnippets.map(snippet => {
        const meta = cachedVideos[snippet.id] || {};
        return {
          ...snippet,
          title: meta.title || snippet.title || '', // Use database title if available, fallback to snippet
          author: meta.author || '',
          viewCount: meta.viewCount || '0',
          channelId: meta.channelId || '',
          publishedYear: meta.publishedYear || '',
          duration: meta.duration || 1,
        };
      });

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

  // Fetch metadata for all videos in a playlist (ONE-TIME FETCH - STORED PERMANENTLY)
  // Add local video files to current playlist
  const handleAddLocalVideosToPlaylist = async (playlistId) => {
    if (!isTauri) {
      console.log('Add local videos is only available in the desktop app.');
      return;
    }

    try {
      const { open } = await import('@tauri-apps/plugin-dialog');
      const selected = await open({
        multiple: true,
        filters: [
          {
            name: 'Video Files',
            extensions: ['mp4', 'webm', 'avi', 'mov', 'wmv', 'flv', 'm4v', 'mkv', 'MP4', 'WEBM', 'AVI', 'MOV', 'WMV', 'FLV', 'M4V', 'MKV']
          },
          {
            name: 'MKV Files',
            extensions: ['mkv', 'MKV']
          },
          {
            name: 'All Files',
            extensions: ['*']
          }
        ],
        title: 'Select video files to add to playlist'
      });

      if (!selected || (Array.isArray(selected) && selected.length === 0)) {
        return; // User cancelled
      }

      const files = Array.isArray(selected) ? selected : [selected];
      console.log('📁 Selected video files:', files);

      // Convert file paths to video objects
      let videoFiles = files.map(filePath => {
        const fileName = filePath.split(/[/\\]/).pop() || 'Unknown';
        const videoId = `local:file://${filePath}`;
        
        return {
          id: videoId,
          title: fileName,
          duration: 0,
          filePath: filePath
        };
      });

      if (videoFiles.length === 0) {
        console.log('⚠️ No video files selected.');
        return;
      }

      console.log(`✅ Adding ${videoFiles.length} video file(s) to playlist`);

      // Automatically preprocess large files in the background (fast conversion)
      const invoke = await getInvoke();
      if (!invoke) {
        throw new Error('Tauri invoke not available');
      }

      // Check file sizes and identify which need preprocessing
      const filesToProcess = [];
      const filesToKeep = [];
      
      for (const video of videoFiles) {
        try {
          const originalPath = video.filePath || video.id.replace('local:file://', '');
          
          // Check file size
          const fileSizeBytes = await invoke('get_file_size', { filePath: originalPath });
          const fileSizeMB = fileSizeBytes / 1024 / 1024;
          
          // Preprocess if file is >50MB (fast conversion, enables streaming)
          if (fileSizeMB > 50) {
            filesToProcess.push({ video, originalPath, fileSizeMB });
          } else {
            filesToKeep.push(video);
          }
        } catch (error) {
          console.warn(`⚠️ Could not check size for ${video.title}, keeping as-is:`, error);
          filesToKeep.push(video);
        }
      }

      // Process large files in background (in-place faststart - no new files, fast)
      const processedFiles = await Promise.all(
        filesToProcess.map(async ({ video, originalPath, fileSizeMB }) => {
          try {
            const fileName = originalPath.split(/[/\\]/).pop() || 'Unknown';
            const extension = originalPath.split('.').pop()?.toLowerCase();
            
            // Only process MP4 files in-place (MKV/WebM would need conversion to MP4)
            if (extension === 'mp4') {
              // First check codec - H.265/HEVC needs conversion to H.264 for browser compatibility
              try {
                const debugInfo = await invoke('get_video_debug_info', { filePath: originalPath });
                if (debugInfo.video_codec === 'hevc' || debugInfo.video_codec === 'h265') {
                  console.log(`🔄 Converting H.265/HEVC to H.264 (${fileSizeMB.toFixed(1)}MB): ${fileName}`);
                  console.log(`   This will take a few minutes - re-encoding required for browser compatibility`);
                  
                  await invoke('convert_hevc_to_h264', {
                    inputPath: originalPath
                  });
                  
                  console.log(`✅ Converted H.265 to H.264: ${fileName} (now browser-compatible)`);
                  // File is now H.264, return it (faststart already added during conversion)
                  return video;
                } else {
                  // Not H.265, just add faststart
                  console.log(`⚡ Adding +faststart in-place (${fileSizeMB.toFixed(1)}MB, no new file): ${fileName}`);
                  
                  // In-place conversion: same file, just reorganizes structure
                  // Fast: seconds even for GB files, no re-encoding, no extra disk space
                  await invoke('add_faststart_in_place', {
                    filePath: originalPath
                  });

                  console.log(`✅ Added +faststart in-place: ${fileName} (file is now streamable)`);
                  
                  // Return same video object (file path unchanged, but now has +faststart)
                  return video;
                }
              } catch (codecError) {
                console.warn(`⚠️ Could not check codec for ${fileName}, attempting faststart anyway:`, codecError);
                // Fallback: try faststart anyway
                await invoke('add_faststart_in_place', {
                  filePath: originalPath
                });
                return video;
              }
            } else {
              // Non-MP4 files: would need conversion to MP4, skip for now
              console.log(`⚠️ Skipping ${fileName} - in-place faststart only works for MP4 files`);
              return video;
            }
          } catch (error) {
            console.error(`❌ Failed to add +faststart to ${video.title}:`, error);
            // Keep original file if preprocessing fails
            return video;
          }
        })
      );

      // Combine processed and unprocessed files
      videoFiles = [...processedFiles, ...filesToKeep];
      
      if (filesToProcess.length > 0) {
        const mp4Count = processedFiles.filter((v, i) => {
          const ext = (filesToProcess[i].originalPath.split('.').pop() || '').toLowerCase();
          return ext === 'mp4';
        }).length;
        console.log(`✅ +faststart added in-place to ${mp4Count} MP4 file(s) - files are now streamable`);
      }

      // Find the playlist and add videos to it
      const playlistIndex = playlists.findIndex(p => p.id === playlistId);
      if (playlistIndex === -1) {
        console.error('Playlist not found');
        return;
      }

      const playlist = playlists[playlistIndex];
      const updatedVideos = [...playlist.videos, ...videoFiles];

      // Extract thumbnails for new videos in background
      if (isTauri && window.__TAURI_INTERNALS__) {
        videoFiles.forEach(async (video) => {
          try {
            const { invoke } = await import('@tauri-apps/api/core');
            const thumbnailPath = await invoke('extract_video_thumbnail', {
              videoPath: video.filePath,
              videoId: video.id
            });
            
            // Store thumbnail path in Map
            if (!window.localVideoThumbnails) {
              window.localVideoThumbnails = new Map();
            }
            window.localVideoThumbnails.set(video.id, thumbnailPath);
            
            // Trigger UI update via custom event
            window.dispatchEvent(new CustomEvent('thumbnailReady', { detail: { videoId: video.id } }));
            
            console.log("✅ Thumbnail extracted for:", video.id);
            console.log("📁 Thumbnail path:", thumbnailPath);
          } catch (error) {
            console.warn("⚠️ Failed to extract thumbnail for", video.id, ":", error);
            // Continue anyway - thumbnail extraction is not critical
          }
        });
      }

      // Update playlist in state
      setPlaylists(prev => prev.map((p, idx) => 
        idx === playlistIndex 
          ? { ...p, videos: updatedVideos }
          : p
      ));

      // Save to database - use playlist ID instead of index to avoid mapping issues
      const currentData = await fetchUserData(userId || 'default');
      if (currentData) {
        // Convert video objects to just IDs (strings) for database storage
        const videosAsIds = updatedVideos.map(v => typeof v === 'string' ? v : (v?.id || v));
        
        const updatedPlaylists = currentData.playlists.map((p) => 
          p.id === playlistId
            ? { ...p, videos: videosAsIds }
            : p
        );

        // Ensure data structure matches UserData format expected by Rust
        const updatedData = {
          playlists: updatedPlaylists,
          playlistTabs: currentData.playlistTabs || [],
          customColors: currentData.customColors || {},
          colorOrder: currentData.colorOrder || [],
          videoProgress: currentData.videoProgress || {}
        };

        console.log('💾 Saving updated data with', updatedPlaylists.length, 'playlists');
        await saveUserData(userId || 'default', updatedData);
      }

      console.log(`✅ Added ${videoFiles.length} video(s) to playlist: "${playlist.name}"`);
    } catch (error) {
      console.error('❌ Add local videos to playlist failed:', error);
      console.log(`Add local videos failed: ${error.message || error}`);
    }
  };

  const handleFetchPlaylistMetadata = async (playlistId) => {
    if (!isTauri) {
      alert('Metadata fetching is only available in the desktop app.');
      return;
    }

    if (!currentApiKey) {
      console.error('❌ Please configure your YouTube API key in settings first.');
      return;
    }

    const playlist = playlists.find(p => p.id === playlistId);
    if (!playlist || !playlist.videos || playlist.videos.length === 0) {
      console.error('❌ This playlist has no videos to fetch metadata for.');
      return;
    }

    const videoIds = playlist.videos.map(v => typeof v === 'string' ? v : v.id);
    if (videoIds.length === 0) {
      console.error('❌ No video IDs found in this playlist.');
      return;
    }

    // Check database first to see what's already stored
    try {
      const invoke = await getInvoke();
      if (!invoke) {
        throw new Error('Tauri invoke not available');
      }

      const cachedMetadata = await invoke('get_video_metadata_batch', { videoIds });
      const cachedCount = Object.keys(cachedMetadata || {}).length;
      const missingCount = videoIds.length - cachedCount;

      if (missingCount === 0) {
        console.log(`✅ All ${videoIds.length} videos in this playlist already have metadata stored in the database.`);
        // Still refresh metadata display
        const playlist = playlists.find(p => p.id === playlistId);
        if (playlist && playlist.videos.length > 0) {
          try {
            const invoke = await getInvoke();
            if (invoke) {
              const playlistVideoIds = playlist.videos.map(v => typeof v === 'string' ? v : v.id);
              const dbMetadata = await invoke('get_video_metadata_batch', { videoIds: playlistVideoIds });
              
              // Update playlist videos with metadata
              setPlaylists(prev => prev.map(p => {
                if (p.id !== playlistId) return p;
                return {
                  ...p,
                  videos: p.videos.map(v => {
                    const videoId = typeof v === 'string' ? v : v.id;
                    const meta = dbMetadata[videoId];
                    if (meta) {
                      return {
                        ...v,
                        title: meta.title || (typeof v === 'string' ? '' : v.title) || '',
                        author: meta.author || '',
                        viewCount: meta.viewCount || '0',
                        publishedYear: meta.publishedYear || ''
                      };
                    }
                    return v;
                  })
                };
              }));
            }
          } catch (error) {
            console.error('Error refreshing metadata display:', error);
          }
        }
        return;
      }

      // Use console.log instead of alert/confirm in Tauri to avoid ACL issues
      console.log(`📊 Ready to fetch metadata for ${missingCount} videos (${Math.ceil(missingCount / 50)} API calls)`);
      console.log(`💡 This is a ONE-TIME fetch - metadata will be stored permanently in the database (like thumbnails)`);
      
      // For now, auto-proceed (user can cancel by closing the app if needed)
      // TODO: Add a proper modal dialog for confirmation

      // Fetch missing metadata in batches of 50
      const missingIds = videoIds.filter(id => !cachedMetadata[id]);
      const metadataToSave = [];
      let fetchedCount = 0;
      let errorCount = 0;

      console.log(`📥 Fetching metadata for ${missingIds.length} videos in playlist "${playlist.name}"...`);

      for (let i = 0; i < missingIds.length; i += 50) {
        const batch = missingIds.slice(i, i + 50);
        const batchIds = batch.join(',');

        try {
          // Rate limiting
          const timeSinceLastCall = Date.now() - lastApiCallTime.current;
          if (timeSinceLastCall < 200) {
            await new Promise(resolve => setTimeout(resolve, 200 - timeSinceLastCall));
          }
          lastApiCallTime.current = Date.now();

          const res = await fetch(
            `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics,contentDetails&id=${batchIds}&key=${currentApiKey}`
          );
          const data = await res.json();

          if (data.error) {
            console.error(`API Error for batch starting at ${i}:`, data.error);
            errorCount += batch.length;
            continue;
          }

          if (data.items) {
            data.items.forEach(item => {
              const videoId = item.id;
              const title = item.snippet?.title || '';
              const author = item.snippet?.channelTitle || '';
              const viewCount = item.statistics?.viewCount || '0';
              const channelId = item.snippet?.channelId || '';
              const publishedYear = item.snippet?.publishedAt 
                ? new Date(item.snippet.publishedAt).getFullYear().toString() 
                : '';
              const duration = item.contentDetails?.duration 
                ? parseISO8601Duration(item.contentDetails.duration) 
                : 1;

              metadataToSave.push({
                videoId,
                title,
                author,
                viewCount,
                channelId,
                publishedYear,
                duration
              });
              fetchedCount++;
            });

            console.log(`✅ Fetched batch ${Math.floor(i / 50) + 1} (${Math.min(i + 50, missingIds.length)}/${missingIds.length} videos)`);
          }
        } catch (error) {
          console.error(`Error fetching batch starting at ${i}:`, error);
          errorCount += batch.length;
        }
      }

      // Save all fetched metadata to database PERMANENTLY
      if (metadataToSave.length > 0) {
        await invoke('save_video_metadata_batch', { metadata: metadataToSave });
        console.log(`💾 Saved ${metadataToSave.length} video metadata entries to database (PERMANENT STORAGE)`);
      }

      // Show completion message
      if (errorCount === 0) {
        console.log(`✅ Successfully fetched and stored metadata for ${fetchedCount} videos!`);
        console.log(`💾 This metadata is now stored permanently in the database and will never need to be refetched.`);
      } else {
        console.log(`⚠️ Fetched metadata for ${fetchedCount} videos, but ${errorCount} failed.`);
        console.log(`💾 The successful fetches are now stored permanently in the database.`);
      }

      // Refresh metadata display immediately by reloading from database
      // Update current video metadata if it's in this playlist
      if (currentVideoId && videoIds.includes(currentVideoId)) {
        try {
          const invoke = await getInvoke();
          if (invoke) {
            const dbMetadata = await invoke('get_video_metadata_batch', { videoIds: [currentVideoId] });
            if (dbMetadata && dbMetadata[currentVideoId]) {
              const meta = dbMetadata[currentVideoId];
              setVideoPublishedYear(meta.publishedYear || '');
              setVideoAuthorName(meta.author || '');
              setVideoViewCount(meta.viewCount || '');
              setVideoChannelId(meta.channelId || '');
            }
          }
        } catch (error) {
          console.error('Error refreshing metadata display:', error);
        }
      }

      // Also update playlist videos with metadata from database
      const playlist = playlists.find(p => p.id === playlistId);
      if (playlist && playlist.videos.length > 0) {
        try {
          const invoke = await getInvoke();
          if (invoke) {
            const playlistVideoIds = playlist.videos.map(v => typeof v === 'string' ? v : v.id);
            const dbMetadata = await invoke('get_video_metadata_batch', { videoIds: playlistVideoIds });
            
            // Update playlist videos with metadata
            setPlaylists(prev => prev.map(p => {
              if (p.id !== playlistId) return p;
              return {
                ...p,
                videos: p.videos.map(v => {
                  const videoId = typeof v === 'string' ? v : v.id;
                  const meta = dbMetadata[videoId];
                  if (meta) {
                    return {
                      ...v,
                      title: meta.title || (typeof v === 'string' ? '' : v.title) || '',
                      author: meta.author || '',
                      viewCount: meta.viewCount || '0',
                      publishedYear: meta.publishedYear || ''
                    };
                  }
                  return v;
                })
              };
            }));
          }
        } catch (error) {
          console.error('Error updating playlist with metadata:', error);
        }
      }
    } catch (error) {
      console.error('Error fetching playlist metadata:', error);
      alert(`Error fetching metadata: ${error.message || error}`);
    }
  };

  // Overwrite playlist from file (replaces existing playlist)
  const handleOverwritePlaylist = async (playlistId) => {
    if (!isTauri) {
      alert('Overwrite is only available in the desktop app.');
      return;
    }

    try {
      const { open } = await import('@tauri-apps/plugin-dialog');
      const selected = await open({
        multiple: false,
        filters: [{
          name: 'Playlist Files',
          extensions: ['json']
        }]
      });

      if (!selected || typeof selected !== 'string') {
        return; // User cancelled
      }

      const invoke = await getInvoke();
      if (!invoke) {
        throw new Error('Tauri invoke not available');
      }

      const result = await invoke('overwrite_playlist_file', {
        userId: userId || 'default',
        playlistId: playlistId,
        filePath: selected
      });

      alert(result);
      
      // Reload user data and update state properly
      const newData = await fetchUserData(userId || 'default');
      if (newData) {
        // Process playlists (expand video IDs if needed)
        let processedPlaylists = newData.playlists || [];
        processedPlaylists = processedPlaylists.map(playlist => {
          if (!playlist.videos || playlist.videos.length === 0) return playlist;
          const firstVideo = playlist.videos[0];
          const videosAreIds = typeof firstVideo === 'string';
          if (!videosAreIds) return playlist;
          return {
            ...playlist,
            videos: playlist.videos.map(v => ({
              id: typeof v === 'string' ? v : (v?.id || v),
              title: '',
              duration: 1
            }))
          };
        });
        
        setPlaylists(processedPlaylists);
        setPlaylistTabs(newData.playlistTabs || [{ name: 'All', playlistIds: [] }]);
        if (newData.customColors) setCustomColors(newData.customColors);
        if (newData.colorOrder) setColorOrder(newData.colorOrder);
        if (newData.videoProgress) setVideoProgress(newData.videoProgress);
        console.log(`✅ Import complete: ${processedPlaylists.length} playlists, ${newData.playlistTabs?.length || 0} tabs`);
      }
    } catch (error) {
      console.error('❌ Overwrite failed:', error);
      alert(`Overwrite failed: ${error.message || error}`);
    }
  };

  // Export tab with all playlists
  const handleExportTab = async (tabIndex) => {
    if (!isTauri) {
      alert('Export is only available in the desktop app.');
      return;
    }

    try {
      const invoke = await getInvoke();
      if (!invoke) {
        throw new Error('Tauri invoke not available');
      }

      const tabJson = await invoke('export_tab', {
        userId: userId || 'default',
        tabIndex: tabIndex
      });

      if (!tabJson) {
        throw new Error('No tab data returned from backend');
      }

      const { save } = await import('@tauri-apps/plugin-dialog');
      const tabName = playlistTabs[tabIndex]?.name || `tab-${tabIndex}`;
      const filePath = await save({
        filters: [{
          name: 'Tab Files',
          extensions: ['json']
        }],
        defaultPath: `${tabName.replace(/[^a-z0-9]/gi, '_')} - tab.json`
      });

      if (!filePath || typeof filePath !== 'string') {
        return; // User cancelled
      }

      const { writeTextFile } = await import('@tauri-apps/plugin-fs');
      await writeTextFile(filePath, tabJson);

      alert(`✅ Tab "${tabName}" exported successfully!\n\nSaved to: ${filePath}`);
    } catch (error) {
      console.error('❌ Export tab failed:', error);
      alert(`Export failed: ${error.message || error}`);
    }
  };

  // Smart import - detects if file is a tab or playlist and imports accordingly
  const handleSmartImport = async () => {
    if (!isTauri) {
      alert('Import is only available in the desktop app.');
      return;
    }

    try {
      const { open } = await import('@tauri-apps/plugin-dialog');
      const selected = await open({
        multiple: false,
        filters: [{
          name: 'Playlist/Tab Files',
          extensions: ['json']
        }]
      });

      if (!selected || typeof selected !== 'string') {
        return; // User cancelled
      }

      const invoke = await getInvoke();
      if (!invoke) {
        throw new Error('Tauri invoke not available');
      }

      // Read file to detect type
      const { readTextFile } = await import('@tauri-apps/plugin-fs');
      const fileContent = await readTextFile(selected);
      const jsonData = JSON.parse(fileContent);

      // Detect if it's a tab file (has "tab" key) or playlist file
      if (jsonData.tab && jsonData.playlists) {
        // It's a tab file
        const result = await invoke('import_tab_file', {
          userId: userId || 'default',
          filePath: selected
        });
        alert(result);
      } else if (jsonData.playlists && Array.isArray(jsonData.playlists)) {
        // It's a playlist file (array of playlists)
        const result = await invoke('import_playlist_file', {
          userId: userId || 'default',
          filePath: selected
        });
        alert(result);
      } else if (jsonData.id || (Array.isArray(jsonData) && jsonData.length > 0 && jsonData[0].id)) {
        // Single playlist or array of playlists
        const result = await invoke('import_playlist_file', {
          userId: userId || 'default',
          filePath: selected
        });
        alert(result);
      } else {
        throw new Error('Unknown file format. File must contain a playlist or tab structure.');
      }
      
      // Reload user data and update state properly
      const newData = await fetchUserData(userId || 'default');
      if (newData) {
        // Process playlists (expand video IDs if needed, same as initial load)
        let processedPlaylists = newData.playlists || [];
        
        // Expand video IDs to full video objects if needed
        processedPlaylists = processedPlaylists.map(playlist => {
          if (!playlist.videos || playlist.videos.length === 0) return playlist;
          const firstVideo = playlist.videos[0];
          const videosAreIds = typeof firstVideo === 'string';
          
          if (!videosAreIds) {
            return playlist; // Already full objects
          }
          
          // Expand IDs to minimal objects
          return {
            ...playlist,
            videos: playlist.videos.map(v => ({
              id: typeof v === 'string' ? v : (v?.id || v),
              title: '',
              duration: 1
            }))
          };
        });
        
        // Update state
        setPlaylists(processedPlaylists);
        setPlaylistTabs(newData.playlistTabs || [{ name: 'All', playlistIds: [] }]);
        if (newData.customColors) setCustomColors(newData.customColors);
        if (newData.colorOrder) setColorOrder(newData.colorOrder);
        if (newData.videoProgress) setVideoProgress(newData.videoProgress);
        
        console.log(`✅ Import complete: ${processedPlaylists.length} playlists, ${newData.playlistTabs?.length || 0} tabs`);
      }
    } catch (error) {
      console.error('❌ Import failed:', error);
      alert(`Import failed: ${error.message || error}`);
    }
  };

  // Import tab from file (kept for backward compatibility, but use handleSmartImport)
  const handleImportTab = async () => {
    return handleSmartImport();
  };

  // Import playlist from file
  const handleImportPlaylist = async () => {
    if (!isTauri) {
      alert('Import is only available in the desktop app.');
      return;
    }

    try {
      const { open } = await import('@tauri-apps/plugin-dialog');
      const selected = await open({
        multiple: false,
        filters: [{
          name: 'Playlist Files',
          extensions: ['json']
        }]
      });

      if (!selected || typeof selected !== 'string') {
        return; // User cancelled
      }

      const invoke = await getInvoke();
      if (!invoke) {
        throw new Error('Tauri invoke not available');
      }

      const result = await invoke('import_playlist_file', {
        userId: userId || 'default',
        filePath: selected
      });

      alert(result);
      
      // Reload user data and update state properly
      const newData = await fetchUserData(userId || 'default');
      if (newData) {
        // Process playlists (expand video IDs if needed)
        let processedPlaylists = newData.playlists || [];
        processedPlaylists = processedPlaylists.map(playlist => {
          if (!playlist.videos || playlist.videos.length === 0) return playlist;
          const firstVideo = playlist.videos[0];
          const videosAreIds = typeof firstVideo === 'string';
          if (!videosAreIds) return playlist;
          return {
            ...playlist,
            videos: playlist.videos.map(v => ({
              id: typeof v === 'string' ? v : (v?.id || v),
              title: '',
              duration: 1
            }))
          };
        });
        
        setPlaylists(processedPlaylists);
        setPlaylistTabs(newData.playlistTabs || [{ name: 'All', playlistIds: [] }]);
        if (newData.customColors) setCustomColors(newData.customColors);
        if (newData.colorOrder) setColorOrder(newData.colorOrder);
        if (newData.videoProgress) setVideoProgress(newData.videoProgress);
        console.log(`✅ Import complete: ${processedPlaylists.length} playlists, ${newData.playlistTabs?.length || 0} tabs`);
      }
    } catch (error) {
      console.error('❌ Import failed:', error);
      alert(`Import failed: ${error.message || error}`);
    }
  };

  // Add local files/folder as playlist
  const handleAddLocalFolder = async () => {
    if (!isTauri) {
      console.log('Add local files is only available in the desktop app.');
      return;
    }

    try {
      // Show dialog to choose between folder or files
      const choice = confirm('Select "OK" to choose a folder, or "Cancel" to select individual video files');
      
      const { open } = await import('@tauri-apps/plugin-dialog');
      let videoFiles = [];

      if (choice) {
        // User chose folder
        const selected = await open({
          multiple: false,
          directory: true,
          title: 'Select folder with video files'
        });

        if (!selected || typeof selected !== 'string') {
          return; // User cancelled
        }

        const invoke = await getInvoke();
        if (!invoke) {
          throw new Error('Tauri invoke not available');
        }

        console.log('📁 Scanning folder for video files:', selected);
        try {
          videoFiles = await invoke('scan_local_folder', {
            folderPath: selected
          });
          console.log('📥 Scan result:', videoFiles);
        } catch (error) {
          console.error('❌ Error scanning folder:', error);
          console.log(`Error scanning folder: ${error.message || error}`);
          return;
        }

        if (!videoFiles || videoFiles.length === 0) {
          console.log('⚠️ No video files found in selected folder.');
          return;
        }
      } else {
        // User chose individual files
        const selected = await open({
          multiple: true,
          filters: [
            {
              name: 'Video Files',
              extensions: ['mp4', 'webm', 'avi', 'mov', 'wmv', 'flv', 'm4v', 'mkv', 'MP4', 'WEBM', 'AVI', 'MOV', 'WMV', 'FLV', 'M4V', 'MKV']
            },
            {
              name: 'MKV Files',
              extensions: ['mkv', 'MKV']
            },
            {
              name: 'All Files',
              extensions: ['*']
            }
          ],
          title: 'Select video files'
        });

        if (!selected || (Array.isArray(selected) && selected.length === 0)) {
          return; // User cancelled
        }

        const files = Array.isArray(selected) ? selected : [selected];
        console.log('📁 Selected video files:', files);

        // Convert file paths to video objects
        videoFiles = files.map(filePath => {
          const fileName = filePath.split(/[/\\]/).pop() || 'Unknown';
          const videoId = `local:file://${filePath}`;
          
          return {
            id: videoId,
            title: fileName,
            duration: 0,
            filePath: filePath
          };
        });
      }

      if (videoFiles.length === 0) {
        console.log('⚠️ No video files selected.');
        return;
      }

      console.log(`✅ Found ${videoFiles.length} video file(s)`);

      // Automatically preprocess large files in the background (fast conversion)
      // This enables streaming without memory explosion
      const invoke = await getInvoke();
      if (!invoke) {
        throw new Error('Tauri invoke not available');
      }

      // Check file sizes and identify which need preprocessing
      const filesToProcess = [];
      const filesToKeep = [];
      
      for (const video of videoFiles) {
        try {
          const originalPath = video.filePath || video.id.replace('local:file://', '');
          
          // Check file size
          const fileSizeBytes = await invoke('get_file_size', { filePath: originalPath });
          const fileSizeMB = fileSizeBytes / 1024 / 1024;
          
          // Preprocess if file is >50MB (fast conversion, enables streaming)
          if (fileSizeMB > 50) {
            filesToProcess.push({ video, originalPath, fileSizeMB });
          } else {
            filesToKeep.push(video);
          }
        } catch (error) {
          console.warn(`⚠️ Could not check size for ${video.title}, keeping as-is:`, error);
          filesToKeep.push(video);
        }
      }

      // Show progress if we have files to process
      if (filesToProcess.length > 0) {
        console.log(`⚡ Auto-adding +faststart to ${filesToProcess.length} large MP4 file(s) (in-place, no new files)...`);
        // Don't block - runs in background, fast (seconds per file)
      }

      // Process large files in background (in-place faststart - no new files, fast)
      const processedFiles = await Promise.all(
        filesToProcess.map(async ({ video, originalPath, fileSizeMB }) => {
          try {
            const fileName = originalPath.split(/[/\\]/).pop() || 'Unknown';
            const extension = originalPath.split('.').pop()?.toLowerCase();
            
            // Only process MP4 files in-place (MKV/WebM would need conversion to MP4)
            if (extension === 'mp4') {
              // First check codec - H.265/HEVC needs conversion to H.264 for browser compatibility
              try {
                const debugInfo = await invoke('get_video_debug_info', { filePath: originalPath });
                if (debugInfo.video_codec === 'hevc' || debugInfo.video_codec === 'h265') {
                  console.log(`🔄 Converting H.265/HEVC to H.264 (${fileSizeMB.toFixed(1)}MB): ${fileName}`);
                  console.log(`   This will take a few minutes - re-encoding required for browser compatibility`);
                  
                  await invoke('convert_hevc_to_h264', {
                    inputPath: originalPath
                  });
                  
                  console.log(`✅ Converted H.265 to H.264: ${fileName} (now browser-compatible)`);
                  // File is now H.264, return it (faststart already added during conversion)
                  return video;
                } else {
                  // Not H.265, just add faststart
                  console.log(`⚡ Adding +faststart in-place (${fileSizeMB.toFixed(1)}MB, no new file): ${fileName}`);
                  
                  // In-place conversion: same file, just reorganizes structure
                  // Fast: seconds even for GB files, no re-encoding, no extra disk space
                  await invoke('add_faststart_in_place', {
                    filePath: originalPath
                  });

                  console.log(`✅ Added +faststart in-place: ${fileName} (file is now streamable)`);
                  
                  // Return same video object (file path unchanged, but now has +faststart)
                  return video;
                }
              } catch (codecError) {
                console.warn(`⚠️ Could not check codec for ${fileName}, attempting faststart anyway:`, codecError);
                // Fallback: try faststart anyway
                await invoke('add_faststart_in_place', {
                  filePath: originalPath
                });
                return video;
              }
            } else {
              // Non-MP4 files: would need conversion to MP4, skip for now
              console.log(`⚠️ Skipping ${fileName} - in-place faststart only works for MP4 files`);
              return video;
            }
          } catch (error) {
            console.error(`❌ Failed to add +faststart to ${video.title}:`, error);
            // Keep original file if preprocessing fails
            return video;
          }
        })
      );

      // Combine processed and unprocessed files
      videoFiles = [...processedFiles, ...filesToKeep];
      
      if (filesToProcess.length > 0) {
        const mp4Count = processedFiles.filter((v, i) => {
          const ext = (filesToProcess[i].originalPath.split('.').pop() || '').toLowerCase();
          return ext === 'mp4';
        }).length;
        console.log(`✅ +faststart added in-place to ${mp4Count} MP4 file(s) - files are now streamable`);
      }

      // Get name for playlist (folder name or "Local Videos")
      let playlistName = 'Local Videos';
      if (choice && videoFiles.length > 0) {
        // Try to extract folder name from first file path
        const firstPath = videoFiles[0].filePath || videoFiles[0].id.replace('local:file://', '');
        const pathParts = firstPath.split(/[/\\]/);
        if (pathParts.length > 1) {
          playlistName = pathParts[pathParts.length - 2]; // Parent folder name
        }
      } else if (!choice && videoFiles.length === 1) {
        // Single file - use filename without extension
        const fileName = videoFiles[0].title || 'Local Video';
        playlistName = fileName.replace(/\.[^/.]+$/, ''); // Remove extension
      }
      
      // Extract thumbnails for new videos in background
      if (isTauri && window.__TAURI_INTERNALS__) {
        videoFiles.forEach(async (video) => {
          try {
            const { invoke } = await import('@tauri-apps/api/core');
            const filePath = video.filePath || video.id.replace('local:file://', '');
            const thumbnailPath = await invoke('extract_video_thumbnail', {
              videoPath: filePath,
              videoId: video.id
            });
            
            // Store thumbnail path in Map
            if (!window.localVideoThumbnails) {
              window.localVideoThumbnails = new Map();
            }
            window.localVideoThumbnails.set(video.id, thumbnailPath);
            
            // Trigger UI update via custom event
            window.dispatchEvent(new CustomEvent('thumbnailReady', { detail: { videoId: video.id } }));
            
            console.log("✅ Thumbnail extracted for:", video.id);
            console.log("📁 Thumbnail path:", thumbnailPath);
          } catch (error) {
            console.warn("⚠️ Failed to extract thumbnail for", video.id, ":", error);
            // Continue anyway - thumbnail extraction is not critical
          }
        });
      }

      // Create a new playlist with local videos
      const newPlaylist = {
        id: `local_${Date.now()}`,
        name: playlistName,
        videos: videoFiles,
        groups: {
          red: {name: 'Red', videos: []}, 
          green: {name: 'Green', videos: []}, 
          blue: {name: 'Blue', videos: []}, 
          yellow: {name: 'Yellow', videos: []},
          orange: {name: 'Orange', videos: []}, 
          purple: {name: 'Purple', videos: []}, 
          pink: {name: 'Pink', videos: []}, 
          cyan: {name: 'Cyan', videos: []}, 
          indigo: {name: 'Indigo', videos: []}
        },
        starred: []
      };

      // Add to playlists
      setPlaylists(prev => [...prev, newPlaylist]);
      
      // Add to current tab
      if (playlistTabs.length > 0 && activePlaylistTab < playlistTabs.length) {
        setPlaylistTabs(prev => {
          const updated = [...prev];
          updated[activePlaylistTab].playlistIds.push(newPlaylist.id);
          return updated;
        });
      }

      // Save to database - convert video objects to IDs for storage
      const currentData = await fetchUserData(userId || 'default');
      if (currentData) {
        // Convert video objects to just IDs (strings) for database storage
        const videosAsIds = videoFiles.map(v => typeof v === 'string' ? v : (v?.id || v));
        const playlistToSave = {
          ...newPlaylist,
          videos: videosAsIds
        };
        
        const updatedPlaylists = [...(currentData.playlists || []), playlistToSave];
        const updatedTabs = [...(currentData.playlistTabs || [])];
        if (updatedTabs.length > 0 && activePlaylistTab < updatedTabs.length) {
          updatedTabs[activePlaylistTab].playlistIds.push(newPlaylist.id);
        }

        const updatedData = {
          playlists: updatedPlaylists,
          playlistTabs: updatedTabs,
          customColors: currentData.customColors || {},
          colorOrder: currentData.colorOrder || [],
          videoProgress: currentData.videoProgress || {}
        };

        await saveUserData(userId || 'default', updatedData);
      }

      console.log(`✅ Local files added as playlist: "${playlistName}" with ${videoFiles.length} video(s)`);
    } catch (error) {
      console.error('❌ Add local files failed:', error);
      console.log(`Add local files failed: ${error.message || error}`);
    }
  };

  const handleConvertMkvFolder = async () => {
    if (!isTauri) {
      alert('MKV conversion is only available in the desktop app.');
      return;
    }

    try {
      const { open } = await import('@tauri-apps/plugin-dialog');
      
      // Ask user to select folder with MKV files
      const selected = await open({
        multiple: false,
        directory: true,
        title: 'Select folder containing MKV files to convert'
      });

      if (!selected || typeof selected !== 'string') {
        return; // User cancelled
      }

      // Ask user to choose conversion mode
      const useFastMode = confirm(
        `Choose conversion mode:\n\n` +
        `✅ OK = FAST MODE (recommended)\n` +
        `   - Copies streams without re-encoding\n` +
        `   - Nearly instant (seconds per file)\n` +
        `   - Works if video is H.264 and audio is AAC\n` +
        `   - If it fails, try slow mode\n\n` +
        `❌ Cancel = SLOW MODE\n` +
        `   - Full re-encoding\n` +
        `   - Takes much longer (minutes per file)\n` +
        `   - Works with any codec\n\n` +
        `Click OK for FAST mode, or Cancel for SLOW mode:`
      );

      // Confirm conversion
      const modeText = useFastMode ? 'FAST (remux)' : 'SLOW (re-encode)';
      const timeText = useFastMode ? 'seconds' : 'minutes';
      const confirmMsg = `This will convert all MKV files in:\n\n${selected}\n\nto MP4 format using ${modeText} mode.\n\nConverted files will be saved in a "converted" subfolder.\n\nEstimated time: ${timeText} per file.\n\nContinue?`;
      if (!confirm(confirmMsg)) {
        return;
      }

      const invoke = await getInvoke();
      if (!invoke) {
        throw new Error('Tauri invoke not available');
      }

      // Show progress message
      const progressMsg = 'Converting MKV files to MP4...\n\nThis may take several minutes depending on file sizes.\n\nPlease wait...';
      alert(progressMsg);

      console.log('🔄 Starting MKV to MP4 conversion for folder:', selected);
      
      // Call Rust command to convert all MKV files in folder
      const result = await invoke('convert_mkv_folder_to_mp4', {
        folderPath: selected,
        outputFolder: null, // Use default "converted" subfolder
        fastMode: useFastMode
      });

      console.log('✅ Conversion result:', result);

      // Show results
      const successCount = result.success || 0;
      const errorCount = result.errors || 0;
      const totalCount = result.total || 0;
      const outputFolder = result.output_folder || 'converted subfolder';

      let resultMsg = `Conversion complete!\n\n`;
      resultMsg += `Total files: ${totalCount}\n`;
      resultMsg += `Successfully converted: ${successCount}\n`;
      resultMsg += `Errors: ${errorCount}\n\n`;
      resultMsg += `Converted files saved to:\n${outputFolder}`;

      if (errorCount > 0) {
        resultMsg += `\n\nSome files failed to convert. Check console for details.`;
      }

      alert(resultMsg);

      // Optionally open the output folder
      if (successCount > 0 && confirm('Would you like to open the converted folder?')) {
        const { shell } = await import('@tauri-apps/plugin-shell');
        await shell.open(outputFolder);
      }

    } catch (error) {
      console.error('❌ Error converting MKV folder:', error);
      alert(`Failed to convert MKV files:\n\n${error.message || error}\n\nMake sure FFmpeg is installed and in your PATH.`);
    }
  };

  // Export playlist to file
  const handleExportPlaylist = async (playlistId, playlistName) => {
    if (!isTauri) {
      alert('Export is only available in the desktop app.');
      return;
    }

    try {
      console.log('📤 Starting export for playlist:', playlistId, playlistName);
      
      const invoke = await getInvoke();
      if (!invoke) {
        throw new Error('Tauri invoke not available');
      }

      // Get playlist JSON from backend
      console.log('📥 Fetching playlist data from backend...');
      const playlistJson = await invoke('export_playlist', {
        userId: userId || 'default',
        playlistId: playlistId
      });
      
      if (!playlistJson) {
        throw new Error('No playlist data returned from backend');
      }
      
      console.log('✅ Got playlist data, length:', playlistJson.length);

      // Use Tauri dialog to save file
      console.log('💾 Opening save dialog...');
      const { save } = await import('@tauri-apps/plugin-dialog');
      const filePath = await save({
        filters: [{
          name: 'Playlist Files',
          extensions: ['json']
        }],
        defaultPath: `${playlistName.replace(/[^a-z0-9]/gi, '_')} - playlist.json`
      });

      console.log('📁 Save dialog result:', filePath);

      if (!filePath || typeof filePath !== 'string') {
        console.log('❌ User cancelled or no path returned');
        return; // User cancelled
      }

      // Write file using Tauri fs API
      console.log('✍️ Writing file to:', filePath);
      const { writeTextFile } = await import('@tauri-apps/plugin-fs');
      
      // Write file - filePath from save dialog is already absolute
      await writeTextFile(filePath, playlistJson);
      console.log('✅ File written successfully');
      alert(`✅ Playlist "${playlistName}" exported successfully!\n\nSaved to: ${filePath}`);
    } catch (error) {
      console.error('❌ Export failed:', error);
      console.error('Error stack:', error.stack);
      alert(`Export failed: ${error.message || error}\n\nCheck console for details.`);
    }
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

  // Handle configure playlist mode - creates one playlist with colored folders
  const handleConfigurePlaylist = async () => {
    if (!configurePlaylistName.trim() || !userId) {
      alert('Please enter a playlist name.');
      return;
    }
    if (!configurePlaylistEntries.some(e => e.id.trim())) {
      alert('Please enter at least one playlist ID/URL.');
      return;
    }
    if (!isFirebaseInitialized) {
      alert('⚠️ App not ready yet. Please wait a moment and try again.');
      return;
    }

    try {
      // Extract and validate playlist IDs
      const validEntries = [];
      for (const entry of configurePlaylistEntries) {
        const trimmed = entry.id.trim();
        if (!trimmed) continue;
        
        const id = extractPlaylistId(trimmed);
        if (id) {
          validEntries.push({ id, color: entry.color });
        } else {
          console.warn(`Could not extract playlist ID from: ${trimmed}`);
        }
      }

      if (validEntries.length === 0) {
        alert('No valid playlist IDs found. Please check your input.');
        return;
      }

      // Group by color and track folder names
      const groupsByColor = {};
      const folderNamesByColor = {}; // Store folder names for each color
      
      validEntries.forEach((entry) => {
        if (!groupsByColor[entry.color]) {
          groupsByColor[entry.color] = [];
        }
        groupsByColor[entry.color].push(entry.id);
        
        // Store folder name for this color (use custom name if provided, otherwise keep existing or use default)
        if (!folderNamesByColor[entry.color]) {
          if (entry.folderName && entry.folderName.trim()) {
            // User provided custom folder name - use it
            folderNamesByColor[entry.color] = entry.folderName.trim();
          } else if (configurePlaylistMode === 'existing' && targetPlaylist.groups[entry.color]) {
            // Use existing folder name from selected playlist
            folderNamesByColor[entry.color] = targetPlaylist.groups[entry.color].name || '';
          } else {
            // Default to capitalized color name
            folderNamesByColor[entry.color] = '';
          }
        }
      });

      // Update or create groups structure
      const groups = configurePlaylistMode === 'existing' 
        ? { ...targetPlaylist.groups } // Start with existing groups
        : createDefaultGroups(); // Start with default groups
      
      Object.keys(groupsByColor).forEach(color => {
        const folderName = folderNamesByColor[color] || (groups[color]?.name || color.charAt(0).toUpperCase() + color.slice(1));
        groups[color] = {
          name: folderName,
          videos: groups[color]?.videos || [] // Preserve existing videos if updating
        };
      });

      // Generate a unique ID for the new playlist
      const newPlaylistId = `configured_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Create the new playlist
      const newPlaylist = {
        name: configurePlaylistName.trim(),
        id: newPlaylistId,
        videos: [],
        groups: groups,
        starred: []
      };

      // Add to playlists
      setPlaylists(prev => {
        const newPlaylists = [...prev];
        const unsortedIndex = newPlaylists.findIndex(p => p.id === '_unsorted_');
        if (unsortedIndex > -1) newPlaylists.splice(unsortedIndex, 0, newPlaylist);
        else newPlaylists.push(newPlaylist);
        return newPlaylists;
      });

      // Fetch videos for each source playlist and add to corresponding colored folder
      for (const entry of validEntries) {
        try {
          // Fetch playlist info
          const res = await fetch(`https://www.googleapis.com/youtube/v3/playlists?part=snippet&id=${entry.id}&key=${currentApiKey}`);
          const data = await res.json();
          
          if (data.error || !data.items || !data.items[0]) {
            console.error(`Error fetching playlist ${entry.id}:`, data.error);
            continue;
          }

          // Fetch videos from this playlist
          let allVideos = [];
          let nextPageToken = null;
          
          do {
            const videosRes = await fetch(
              `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet,contentDetails&playlistId=${entry.id}&maxResults=50${nextPageToken ? `&pageToken=${nextPageToken}` : ''}&key=${currentApiKey}`
            );
            const videosData = await videosRes.json();
            
            if (videosData.items) {
              const videos = videosData.items.map(item => ({
                id: item.contentDetails.videoId,
                title: item.snippet.title,
                duration: 1 // Will be fetched later if needed
              }));
              allVideos.push(...videos);
            }
            
            nextPageToken = videosData.nextPageToken;
          } while (nextPageToken);

          // Add videos to the target playlist and to the corresponding colored folder
          setPlaylists(prev => prev.map(p => {
            if (p.id !== targetPlaylistId) return p;
            
            // Add videos to main playlist
            const existingVideoIds = new Set(p.videos.map(v => typeof v === 'string' ? v : v.id));
            const newVideos = allVideos.filter(v => !existingVideoIds.has(v.id));
            const updatedVideos = [...p.videos, ...newVideos];
            
            // Add video IDs to the colored folder group
            const updatedGroups = { ...p.groups };
            if (updatedGroups[entry.color]) {
              const existingGroupVideoIds = new Set(updatedGroups[entry.color].videos || []);
              const newGroupVideoIds = allVideos
                .map(v => v.id)
                .filter(id => !existingGroupVideoIds.has(id));
              updatedGroups[entry.color] = {
                ...updatedGroups[entry.color],
                videos: [...(updatedGroups[entry.color].videos || []), ...newGroupVideoIds]
              };
            }
            
            return {
              ...p,
              videos: updatedVideos,
              groups: updatedGroups
            };
          }));
        } catch (error) {
          console.error(`Error processing playlist ${entry.id}:`, error);
        }
      }

      // Reset form and close modal
      setConfigurePlaylistName('');
      setConfigurePlaylistEntries([{ id: '', color: 'red', folderName: '' }]);
      setConfigurePlaylistMode('new');
      setConfigureSelectedPlaylistId('');
      setShowBulkAddModal(false);
      setBulkAddMode('bulk');
      
      const playlistName = configurePlaylistMode === 'existing' 
        ? targetPlaylist.name 
        : configurePlaylistName.trim();
      console.log(`✅ Playlist "${playlistName}" ${configurePlaylistMode === 'existing' ? 'updated' : 'created'} successfully! Videos are being fetched...`);
    } catch (error) {
      console.error('Error in configure playlist:', error);
      alert(`An error occurred: ${error.message || error}`);
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
        thumbnail: getVideoThumbnailSync(coloredFolder.videos[0]?.id),
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

  // Helper functions for local file handling
  const isLocalFile = (videoId) => {
    return videoId && videoId.startsWith('local:file://');
  };

  const getLocalFilePath = (videoId) => {
    if (!isLocalFile(videoId)) return null;
    
    // First, try to get filePath from the video object if available
    const currentVideo = currentPlaylist.videos.find(v => v.id === videoId);
    if (currentVideo && currentVideo.filePath) {
      console.log("📁 Using filePath from video object:", currentVideo.filePath);
      return currentVideo.filePath;
    }
    
    // Otherwise, extract from videoId - keep original path format (don't convert slashes)
    let path = videoId.replace('local:file://', '');
    console.log("📁 Extracted path from videoId:", path);
    return path;
  };

  const destroyPlayer = () => {
    // Cleanup blob URL when destroying player
    if (window.currentVideoBlobUrl) {
      URL.revokeObjectURL(window.currentVideoBlobUrl);
      window.currentVideoBlobUrl = null;
    }

    // For YouTube videos, react-youtube handles cleanup automatically
    // Only manually destroy if it's a local video or if we need to clear the container
    if (playerRef.current && typeof playerRef.current.destroy === 'function') {
      try { 
        // Only destroy if it's not a react-youtube managed player (local videos use raw video element)
        // react-youtube handles its own cleanup
        if (currentVideoId && isLocalFile(currentVideoId)) {
          playerRef.current.destroy();
        }
      } catch (error) { 
        console.error("Error destroying player:", error); 
      }
    }
    playerRef.current = null;
    // Only clear innerHTML for local videos - react-youtube manages its own DOM
    if (playerContainerRef.current && currentVideoId && isLocalFile(currentVideoId)) {
      playerContainerRef.current.innerHTML = '';
    }
    setIsPlayerReady(false);
    setIsPlaying(false);
  };

  // Secondary player functions for quarter splitscreen mode
  const destroySecondaryPlayer = () => {
    // Cleanup secondary player blob URL
    if (window.secondaryVideoBlobUrl) {
      URL.revokeObjectURL(window.secondaryVideoBlobUrl);
      window.secondaryVideoBlobUrl = null;
    }
    
    // Destroy YouTube player if it exists - check if container is still in DOM first
    if (secondaryPlayerRef.current && typeof secondaryPlayerRef.current.destroy === 'function') {
      try {
        // Check if container is still in DOM before destroying
        if (secondaryPlayerContainerRef.current && secondaryPlayerContainerRef.current.parentNode) {
          secondaryPlayerRef.current.destroy();
        }
      } catch (error) { 
        console.error("Error destroying secondary YouTube player:", error); 
      }
    }
    secondaryPlayerRef.current = null;
    
    // Clear container safely - only if it's still in the DOM
    if (secondaryPlayerContainerRef.current && secondaryPlayerContainerRef.current.parentNode) {
      try {
        secondaryPlayerContainerRef.current.innerHTML = '';
      } catch (error) {
        console.error("Error clearing secondary player container:", error);
      }
    }
  };

  const initializeSecondaryPlayer = async () => {
    console.log('initializeSecondaryPlayer called with:', { secondaryPlayerVideoId, containerExists: !!secondaryPlayerContainerRef.current });
    if (!secondaryPlayerVideoId || !secondaryPlayerContainerRef.current) {
      console.warn("Cannot initialize secondary player: missing video ID or container", { secondaryPlayerVideoId, containerExists: !!secondaryPlayerContainerRef.current });
      return;
    }

    // Handle local files - use same logic as primary player
    if (isLocalFile(secondaryPlayerVideoId)) {
      const filePath = getLocalFilePath(secondaryPlayerVideoId);
      if (!filePath) {
        console.error("❌ Invalid local file path for secondary player:", secondaryPlayerVideoId);
        return;
      }

      console.log("🎬 Initializing secondary local video player for:", filePath);
      secondaryPlayerContainerRef.current.innerHTML = '';
      const video = document.createElement('video');
      video.style.width = '100%';
      video.style.height = '100%';
      video.style.objectFit = 'contain';
      video.controls = true;
      video.playsInline = true;
      video.autoplay = true;

      try {
        if (isTauri) {
          // Use same streaming logic as primary player - simplified version
          const { readFile, metadata } = await import('@tauri-apps/plugin-fs');
          const fileMetadata = await metadata(filePath);
          const fileSizeMB = fileMetadata.size / (1024 * 1024);
          
          if (fileSizeMB > 100) {
            // Large file: Use streaming
            const { open } = await import('@tauri-apps/plugin-fs');
            const streamUrl = await open(filePath, { read: true });
            const extension = filePath.split('.').pop()?.toLowerCase();
            const mimeType = extension === 'mp4' ? 'video/mp4' : 
                            extension === 'webm' ? 'video/webm' :
                            extension === 'mkv' ? 'video/x-matroska' :
                            extension === 'mov' ? 'video/quicktime' : 'video/mp4';
            const source = document.createElement('source');
            source.src = streamUrl;
            source.type = mimeType;
            video.appendChild(source);
            video.load();
          } else {
            // Small file: Use blob URL
            const fileData = await readFile(filePath);
            const extension = filePath.split('.').pop()?.toLowerCase();
            const mimeTypes = {
              'mp4': 'video/mp4',
              'webm': 'video/webm',
              'mkv': 'video/x-matroska',
              'avi': 'video/x-msvideo',
              'mov': 'video/quicktime',
              'wmv': 'video/x-ms-wmv',
              'flv': 'video/x-flv',
              'm4v': 'video/x-m4v'
            };
            const mimeType = mimeTypes[extension] || 'video/mp4';
            const blob = new Blob([fileData], { type: mimeType });
            window.secondaryVideoBlobUrl = URL.createObjectURL(blob);
            video.src = window.secondaryVideoBlobUrl;
          }
        } else {
          console.warn("Secondary local video not supported in browser mode");
          return;
        }
      } catch (error) {
        console.error("Error loading secondary local video:", error);
        return;
      }

      secondaryPlayerContainerRef.current.appendChild(video);
      secondaryLocalVideoRef.current = video;
      console.log("✅ Secondary local video element added");
      return;
    }

    // YouTube videos are now handled by react-youtube component
    // This function only handles local files for secondary player
    console.log("initializeSecondaryPlayer called for YouTube video - using react-youtube component instead");
  };

  // Comprehensive debug function - collects all video playback diagnostics
  // Expose directly to window to avoid scope issues
  if (typeof window !== 'undefined') {
    window.getVideoDebugReport = function() {
      // Access React component state via closure
      var videoId = currentVideoId;
      var video = localVideoRef.current;
      var isTauriEnv = isTauri;
      
      // Return a promise to handle async operations
      return new Promise(function(resolve, reject) {
        // Use async IIFE to handle await
        (function() {
          var asyncFunc = async function() {
            try {
              if (!isLocalFile(videoId)) {
                console.log("🔍 Debug: Current video is not a local file");
                resolve(null);
                return;
              }

              var filePath = getLocalFilePath(videoId);
              if (!filePath) {
                console.error("🔍 Debug: No file path available");
                resolve(null);
                return;
              }

            console.log("🔍 ========== COMPREHENSIVE VIDEO DEBUG REPORT ==========");
            console.log("🔍 File:", filePath);
            console.log("🔍 Video ID:", videoId);
            console.log("");

            // Helper functions using traditional syntax
            function getVideoProp(prop, defaultValue) {
              return video && video[prop] !== undefined ? video[prop] : defaultValue;
            }
            
            var networkStates = ["EMPTY", "IDLE", "LOADING", "NO_SOURCE", "LOADED_METADATA", "LOADED_FIRST_FRAME", "LOADED"];
            var readyStates = ["HAVE_NOTHING", "HAVE_METADATA", "HAVE_CURRENT_DATA", "HAVE_FUTURE_DATA", "HAVE_ENOUGH_DATA"];
            var errorCodes = ["MEDIA_ERR_ABORTED", "MEDIA_ERR_NETWORK", "MEDIA_ERR_DECODE", "MEDIA_ERR_SRC_NOT_SUPPORTED"];
            
            var frontendInfo = {
        videoElementExists: !!video,
        videoSrc: getVideoProp('src', "N/A"),
        videoCurrentSrc: getVideoProp('currentSrc', "N/A"),
        videoNetworkState: getVideoProp('networkState', -1),
        videoNetworkStateText: video && video.networkState !== undefined 
          ? (networkStates[video.networkState] || "N/A")
          : "N/A",
        videoReadyState: getVideoProp('readyState', -1),
        videoReadyStateText: video && video.readyState !== undefined
          ? (readyStates[video.readyState] || "N/A")
          : "N/A",
        videoError: video && video.error ? {
          code: video.error.code,
          message: video.error.message || "No error message",
          codeText: errorCodes[video.error.code - 1] || "UNKNOWN"
        } : null,
        videoDuration: getVideoProp('duration', NaN),
        videoPaused: getVideoProp('paused', null),
        videoMuted: getVideoProp('muted', null),
        videoVolume: getVideoProp('volume', null),
        videoWidth: getVideoProp('videoWidth', 0),
        videoHeight: getVideoProp('videoHeight', 0),
        videoBuffered: video && video.buffered ? {
          length: video.buffered.length,
          ranges: (function() {
            var result = [];
            for (var i = 0; i < video.buffered.length; i++) {
              result.push({
                start: video.buffered.start(i),
                end: video.buffered.end(i)
              });
            }
            return result;
          })()
        } : null,
        videoSeekable: video && video.seekable ? {
          length: video.seekable.length,
          ranges: (function() {
            var result = [];
            for (var i = 0; i < video.seekable.length; i++) {
              result.push({
                start: video.seekable.start(i),
                end: video.seekable.end(i)
              });
            }
            return result;
          })()
        } : null,
              isPlayerReady: isPlayerReady,
              isPlaying: isPlaying,
            };

            console.log("🔍 ========== FRONTEND (VIDEO ELEMENT) STATE ==========");
            console.log(JSON.stringify(frontendInfo, null, 2));
            console.log("");

            // Collect backend info via Tauri command
            if (isTauriEnv) {
              try {
                var getInvokeFunc = getInvoke;
                var invoke = await getInvokeFunc();
                if (invoke) {
                  console.log("🔍 ========== BACKEND (RUST) STATE ==========");
                  var backendInfo = await invoke('get_video_debug_info', { filePath: filePath });
                  console.log(JSON.stringify(backendInfo, null, 2));
                  console.log("");

                  // Combined analysis
                  console.log("🔍 ========== DIAGNOSIS ==========");
                  
                  // Check server
                  if (!backendInfo.server_running) {
                    console.error("❌ ISSUE: Video server is not running!");
                  } else {
                    console.log("✅ Server running on port " + backendInfo.server_port);
                  }

                  // Check file
                  if (!backendInfo.file_exists) {
                    console.error("❌ ISSUE: File does not exist!");
                  } else {
                    var fileSizeMB = (backendInfo.file_size / 1024 / 1024).toFixed(2);
                    console.log("✅ File exists (" + fileSizeMB + " MB)");
                  }

                  if (!backendInfo.file_readable) {
                    console.error("❌ ISSUE: File exists but cannot be read (may be locked)!");
                  } else {
                    console.log("✅ File is readable");
                  }

                  // Check FFmpeg
                  if (!backendInfo.ffmpeg_available) {
                    console.error("❌ ISSUE: FFmpeg is not available!");
                  } else {
                    var ffmpegVersion = backendInfo.ffmpeg_version || "version unknown";
                    console.log("✅ FFmpeg available: " + ffmpegVersion);
                  }

                  if (!backendInfo.ffprobe_available) {
                    console.warn("⚠️ FFprobe not available (detailed file info unavailable)");
                  } else {
                    console.log("✅ FFprobe available");
                  }

                  // Check moov atom
                  if (backendInfo.moov_at_start === false) {
                    console.error("❌ CRITICAL ISSUE: Moov atom is at the END of the file!");
                    console.error("   → This prevents streaming - browser needs metadata at start");
                    console.error("   → Solution: Run add_faststart_in_place() on this file");
                  } else if (backendInfo.moov_at_start === true) {
                    console.log("✅ Moov atom is at the start (file is streamable)");
                  } else {
                    console.warn("⚠️ Could not determine moov atom location");
                  }

                  // Check codecs
                  if (backendInfo.video_codec) {
                    console.log("✅ Video codec: " + backendInfo.video_codec);
                  }
                  if (backendInfo.audio_codec) {
                    console.log("✅ Audio codec: " + backendInfo.audio_codec);
                  }

                  // Check video element state
                  if (frontendInfo.videoError) {
                    console.error("❌ VIDEO ELEMENT ERROR: " + frontendInfo.videoError.codeText + " (" + frontendInfo.videoError.code + ")");
                    console.error("   Message: " + (frontendInfo.videoError.message || "No message"));
                  }

                  if (frontendInfo.videoReadyState === 0) {
                    console.error("❌ VIDEO READY STATE: HAVE_NOTHING - video has no information");
                    if (backendInfo.moov_at_start === false) {
                      console.error("   → Likely cause: Moov atom at end of file");
                    }
                  }

                  if (frontendInfo.videoNetworkState === 3) {
                    console.error("❌ VIDEO NETWORK STATE: NO_SOURCE - no video source loaded");
                  }

                  // Check if using streaming URL
                  if (frontendInfo.videoSrc && frontendInfo.videoSrc.indexOf('127.0.0.1') !== -1) {
                    console.log("✅ Using streaming URL: " + frontendInfo.videoSrc);
                    if (!backendInfo.server_running) {
                      console.error("   → But server is not running! This is a problem.");
                    }
                  } else if (frontendInfo.videoSrc && frontendInfo.videoSrc.indexOf('blob:') === 0) {
                    console.log("✅ Using blob URL (small file, loaded into memory)");
                  } else {
                    console.warn("⚠️ Video src: " + (frontendInfo.videoSrc || "Not set"));
                  }

                  // List all errors
                  if (backendInfo.errors && backendInfo.errors.length > 0) {
                    console.log("");
                    console.error("❌ BACKEND ERRORS:");
                    for (var i = 0; i < backendInfo.errors.length; i++) {
                      console.error("   - " + backendInfo.errors[i]);
                    }
                  }

                  console.log("");
                  console.log("🔍 ========== END DEBUG REPORT ==========");

                  // Return combined info for programmatic access
                  resolve({
                    frontend: frontendInfo,
                    backend: backendInfo,
                    timestamp: new Date().toISOString()
                  });
                }
              } catch (error) {
                console.error("❌ Failed to get backend debug info:", error);
                reject(error);
              }
            } else {
              console.warn("⚠️ Not in Tauri environment - backend debug info unavailable");
              resolve({ frontend: frontendInfo, backend: null, timestamp: new Date().toISOString() });
            }
            } catch (error) {
              console.error("❌ Debug function error:", error);
              reject(error);
            }
          };
          asyncFunc().then(resolve).catch(reject);
        })();
      });
    };
  }

  const initializePlayer = async () => {
    if (!currentVideoId || !playerContainerRef.current) {
      console.warn("Cannot initialize player: missing video ID or player container");
      return;
    }

    // Handle local files
    if (isLocalFile(currentVideoId)) {
      const filePath = getLocalFilePath(currentVideoId);
      if (!filePath) {
        console.error("❌ Invalid local file path:", currentVideoId);
        return;
      }

      console.log("🎬 Initializing local video player for:", filePath);

      playerContainerRef.current.innerHTML = '';
      const video = document.createElement('video');
      video.style.width = '100%';
      video.style.height = '100%';
      video.style.objectFit = 'contain';
      video.controls = true;
      video.playsInline = true;
      video.autoplay = true;
      // Local videos always start at 0:00 - simple system
      
      // Smart approach: Use streaming for large files/web-ready files, blob URLs for small files
      // This prevents memory explosion on large files while keeping reliability for small ones
      try {
        if (isTauri) {
          const isWebReady = filePath.includes('.webready.mp4');
          
          // Check file size to decide between streaming and blob URL
          const { invoke } = await import('@tauri-apps/api/core');
          let fileSizeMB = 0;
          let useStreaming = false;
          
          try {
            const fileSizeBytes = await invoke('get_file_size', { filePath });
            fileSizeMB = fileSizeBytes / 1024 / 1024;
            console.log("📊 File size:", fileSizeMB.toFixed(2), "MB");
            
            // Use streaming for:
            // 1. Web-ready files (always - they're optimized for streaming)
            // 2. Large files (>100MB) - prevents memory explosion
            // 3. MP4 files >50MB (MP4 can stream even without +faststart, though not as efficiently)
            const extension = filePath.split('.').pop()?.toLowerCase();
            const isMP4 = extension === 'mp4';
            
            useStreaming = isWebReady || fileSizeMB > 100 || (isMP4 && fileSizeMB > 50);
          } catch (sizeError) {
            console.warn("⚠️ Could not get file size, defaulting to blob URL:", sizeError);
            useStreaming = false;
          }
          
          if (useStreaming) {
            // Use mini HTTP server for streaming - professional solution!
            console.log("🌐 [DEBUG] Loading file via mini HTTP server (no memory load):", filePath);
            console.log("🌐 [DEBUG] File size:", fileSizeMB.toFixed(2), "MB, isWebReady:", isWebReady);
            setIsPlayerReady(false);
            
            // Initialize video server if not already running
            const invoke = await getInvoke();
            if (!invoke) {
              console.error("❌ [DEBUG] Tauri invoke not available");
              throw new Error('Tauri invoke not available');
            }
            
            // Start server and get port (cached, so it's fast after first call)
            let port;
            try {
              port = await invoke('start_video_server');
              console.log("✅ [DEBUG] Video server running on port:", port);
            } catch (serverError) {
              console.error("❌ [DEBUG] Failed to start video server:", serverError);
              throw new Error(`Failed to start video server: ${serverError.message || serverError}`);
            }
            
            // Create HTTP URL with encoded file path
            const encodedPath = encodeURIComponent(filePath);
            const streamUrl = `http://127.0.0.1:${port}/video/${encodedPath}`;
            console.log("✅ [DEBUG] Using HTTP streaming URL:", streamUrl);
            console.log("✅ [DEBUG] Encoded path:", encodedPath);
            
            // Add error handlers for debugging
            video.addEventListener('error', (e) => {
              console.error("❌ [DEBUG] Video element error:", e);
              console.error("❌ [DEBUG] Video error code:", video.error?.code);
              console.error("❌ [DEBUG] Video error message:", video.error?.message);
              console.error("❌ [DEBUG] Video src:", video.src);
              console.error("❌ [DEBUG] Video currentSrc:", video.currentSrc);
              console.error("❌ [DEBUG] Video networkState:", video.networkState);
              console.error("❌ [DEBUG] Video readyState:", video.readyState);
              console.error("❌ [DEBUG] Video videoWidth:", video.videoWidth, "videoHeight:", video.videoHeight);
            });
            
            video.addEventListener('loadstart', () => {
              console.log("🔄 [DEBUG] Video loadstart - beginning to load");
            });
            
            video.addEventListener('loadedmetadata', async () => {
              console.log("✅ [DEBUG] Video metadata loaded - duration:", video.duration);
              console.log("✅ [DEBUG] Video actual src:", video.currentSrc);
              console.log("✅ [DEBUG] Video videoWidth:", video.videoWidth, "videoHeight:", video.videoHeight);
              console.log("✅ [DEBUG] Video readyState:", video.readyState);
              console.log("✅ [DEBUG] Video networkState:", video.networkState);
              if (video.videoWidth === 0 && video.videoHeight === 0) {
                console.error("⚠️ [DEBUG] WARNING: Video has no dimensions - video track may not be loading!");
                console.error("⚠️ [DEBUG] This usually means the video codec is not supported by the browser.");
                console.error("⚠️ [DEBUG] Checking video codec...");
                
                // Check codec using Tauri command
                try {
                  const invoke = await getInvoke();
                  if (invoke) {
                    const debugInfo = await invoke('get_video_debug_info', { filePath });
                    if (debugInfo.video_codec) {
                      console.error("⚠️ [DEBUG] Video codec:", debugInfo.video_codec);
                      if (debugInfo.video_codec === 'hevc' || debugInfo.video_codec === 'h265') {
                        console.error("❌ [DEBUG] PROBLEM: H.265/HEVC codec is NOT supported in most browsers!");
                        console.error("❌ [DEBUG] Solution: Convert video to H.264 (AVC) codec");
                      } else if (debugInfo.video_codec !== 'h264' && debugInfo.video_codec !== 'avc') {
                        console.error("⚠️ [DEBUG] Video codec may not be supported:", debugInfo.video_codec);
                        console.error("⚠️ [DEBUG] Browsers typically only support: H.264 (AVC), VP8, VP9");
                      }
                    }
                    if (debugInfo.audio_codec) {
                      console.log("✅ [DEBUG] Audio codec:", debugInfo.audio_codec, "(working - that's why you hear audio)");
                    }
                  }
                } catch (error) {
                  console.error("❌ [DEBUG] Failed to check codec:", error);
                }
              }
              setIsPlayerReady(true);
            });
            
            video.addEventListener('canplay', () => {
              console.log("✅ [DEBUG] Video can play");
              setIsPlayerReady(true);
            });
            
            video.addEventListener('canplaythrough', () => {
              console.log("✅ [DEBUG] Video can play through");
              setIsPlayerReady(true);
            });
            
            // Add timeout to detect if metadata never loads (moov atom at end issue)
            let metadataTimeout;
            let faststartAttempted = false;
            
            const checkMetadata = async () => {
              if (video.readyState === 0 && video.networkState !== 3 && !faststartAttempted) {
                faststartAttempted = true;
                console.error("❌ [DEBUG] Video metadata timeout - file may need +faststart (moov atom at end)");
                console.error("❌ [DEBUG] File structure issue: MP4 metadata (moov atom) is likely at the end of the file");
                console.error("❌ [DEBUG] Attempting to add +faststart automatically...");
                
                // Try to add +faststart automatically
                try {
                  const invoke = await getInvoke();
                  if (invoke) {
                    console.log("🔄 [FASTSTART] Processing file (this takes a few seconds)...");
                    await invoke('add_faststart_in_place', { filePath });
                    console.log("✅ [FASTSTART] Success! File is now streamable. Reloading video...");
                    
                    // Force a complete reload - clear src and set it again
                    video.src = '';
                    video.load();
                    
                    // Re-initialize the player with the same file (now with faststart)
                    setTimeout(() => {
                      initializePlayer();
                    }, 500);
                  }
                } catch (faststartError) {
                  console.error("❌ [FASTSTART] Failed:", faststartError);
                  alert("Large video file cannot stream - metadata is at the end of the file.\n\nAutomatic fix failed:\n" + (faststartError.message || faststartError) + "\n\nThe file may be locked by another process, or FFmpeg may not be available.");
                }
              }
            };
            
            metadataTimeout = setTimeout(checkMetadata, 5000); // 5 second timeout
            
            video.addEventListener('loadedmetadata', () => {
              clearTimeout(metadataTimeout);
            });
            
            video.addEventListener('error', () => {
              clearTimeout(metadataTimeout);
              // Also try faststart on error
              if (!faststartAttempted) {
                checkMetadata();
              }
            });
            
            // Use <source> element for better codec detection
            // Clear any existing sources first
            while (video.firstChild) {
              video.removeChild(video.firstChild);
            }
            
            // Detect MIME type from file extension
            const extension = filePath.split('.').pop()?.toLowerCase();
            const mimeType = extension === 'mp4' ? 'video/mp4' : 
                            extension === 'webm' ? 'video/webm' :
                            extension === 'mkv' ? 'video/x-matroska' :
                            extension === 'mov' ? 'video/quicktime' : 'video/mp4';
            
            const source = document.createElement('source');
            source.src = streamUrl;
            source.type = mimeType;
            video.appendChild(source);
            
            // Force video element to reload with new source
            video.load();
            
            console.log("✅ [DEBUG] Video src set to:", streamUrl);
            console.log("✅ [DEBUG] MIME type:", mimeType);
          } else {
            // Small file: Use blob URL (works reliably, acceptable memory usage)
            console.log("📁 Loading small file as blob URL:", filePath);
            setIsPlayerReady(false);
            
            // Read file and create blob URL
            const { readFile } = await import('@tauri-apps/plugin-fs');
            const fileData = await readFile(filePath);
            console.log("✅ File read successfully, size:", fileSizeMB.toFixed(2), "MB");
            
            // Detect MIME type from file extension
            const extension = filePath.split('.').pop()?.toLowerCase();
            const mimeTypes = {
              'mp4': 'video/mp4',
              'webm': 'video/webm',
              'mkv': 'video/x-matroska',
              'avi': 'video/x-msvideo',
              'mov': 'video/quicktime',
              'wmv': 'video/x-ms-wmv',
              'flv': 'video/x-flv',
              'm4v': 'video/x-m4v'
            };
            const mimeType = mimeTypes[extension] || 'video/mp4';
            
            // Create blob from binary data
            const blob = new Blob([fileData], { type: mimeType });
            const blobUrl = URL.createObjectURL(blob);
            console.log("✅ Created blob URL with MIME type:", mimeType);
            video.src = blobUrl;
          }
          
          // Initialize thumbnail Map if needed
          if (!window.localVideoThumbnails) {
            window.localVideoThumbnails = new Map();
          }
          
          // Extract thumbnail from video frame - create a hidden video element for extraction
          let thumbnailExtracted = false;
          let extractionAttempts = 0;
          const maxAttempts = 3;
          
          const extractThumbnail = () => {
            if (thumbnailExtracted) {
              console.log("✅ Thumbnail already extracted for:", currentVideoId);
              return;
            }
            
            // Don't extract thumbnail if video is playing - wait until it's paused
            if (!video.paused) {
              console.log("⏸️ Video is playing, waiting to extract thumbnail...");
              setTimeout(extractThumbnail, 2000);
              return;
            }
            
            extractionAttempts++;
            if (extractionAttempts > maxAttempts) {
              console.warn("⚠️ Max thumbnail extraction attempts reached");
              return;
            }
            
            // Check if video is ready
            if (!video.duration || isNaN(video.duration) || video.duration === 0) {
              console.log("⏳ Video duration not ready yet, attempt:", extractionAttempts);
              if (extractionAttempts < maxAttempts) {
                setTimeout(extractThumbnail, 500);
              }
              return;
            }
            
            // Check if video dimensions are available
            if (!video.videoWidth || !video.videoHeight || video.videoWidth === 0 || video.videoHeight === 0) {
              console.log("⏳ Video dimensions not ready yet, attempt:", extractionAttempts);
              if (extractionAttempts < maxAttempts) {
                setTimeout(extractThumbnail, 500);
              }
              return;
            }
            
            try {
              console.log("🎬 Starting thumbnail extraction for:", currentVideoId, "attempt:", extractionAttempts);
              console.log("📐 Video dimensions:", video.videoWidth, "x", video.videoHeight);
              console.log("⏱️ Video duration:", video.duration);
              
              const canvas = document.createElement('canvas');
              // Use standard thumbnail size (320x180) for consistency
              canvas.width = 320;
              canvas.height = 180;
              const ctx = canvas.getContext('2d');
              
              if (!ctx) {
                console.error("❌ Could not get canvas context");
                return;
              }
              
              // Local videos always start at 0:00 - no progress to restore
              // Seek to a good frame (1 second or 10% of duration, whichever is smaller, but at least 0.5s)
              const seekTime = Math.max(0.5, Math.min(1, video.duration * 0.1));
              const targetTime = 0; // Always return to 0:00 for local videos
              console.log("⏩ Seeking to:", seekTime, "for thumbnail extraction (will return to 0:00)");
              
              const extractThumb = () => {
                try {
                  console.log("📸 Drawing video frame to canvas...");
                  console.log("📐 Canvas size:", canvas.width, "x", canvas.height);
                  console.log("📐 Video size:", video.videoWidth, "x", video.videoHeight);
                  
                  // Draw the video frame to canvas - scale to fit
                  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                  
                  // Check if canvas has content by checking multiple pixels
                  const testPixels = [
                    ctx.getImageData(0, 0, 1, 1),
                    ctx.getImageData(canvas.width / 2, canvas.height / 2, 1, 1),
                    ctx.getImageData(canvas.width - 1, canvas.height - 1, 1, 1)
                  ];
                  
                  const hasContent = testPixels.some(pixel => pixel.data[3] > 0);
                  
                  if (!hasContent) {
                    console.warn("⚠️ Canvas appears empty, retrying...");
                    thumbnailExtracted = false;
                    if (extractionAttempts < maxAttempts) {
                      setTimeout(() => {
                        if (!window.localVideoThumbnails.has(currentVideoId)) {
                          extractThumbnail();
                        }
                      }, 1000);
                    }
                    video.removeEventListener('seeked', extractThumb);
                    return;
                  }
                  
                  // Validate canvas has actual content before creating data URL
                  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                  const hasValidContent = Array.from(imageData.data).some((val, idx) => idx % 4 === 3 && val > 0); // Check alpha channel
                  
                  if (!hasValidContent) {
                    console.error("❌ Canvas has no valid content, cannot create thumbnail");
                    thumbnailExtracted = false;
                    video.removeEventListener('seeked', extractThumb);
                    if (extractionAttempts < maxAttempts) {
                      setTimeout(() => {
                        if (!window.localVideoThumbnails.has(currentVideoId)) {
                          extractThumbnail();
                        }
                      }, 1000);
                    }
                    return;
                  }
                  
                  // Create data URL with error handling
                  let thumbnailDataUrl;
                  try {
                    thumbnailDataUrl = canvas.toDataURL('image/jpeg', 0.85);
                    
                    // Validate the data URL was created successfully
                    if (!thumbnailDataUrl || thumbnailDataUrl.length < 100 || !thumbnailDataUrl.startsWith('data:image/jpeg')) {
                      throw new Error('Invalid data URL created');
                    }
                    
                    console.log("✅ Thumbnail extracted successfully!");
                    console.log("📊 Thumbnail data URL length:", thumbnailDataUrl.length, "chars");
                  } catch (dataUrlError) {
                    console.error("❌ Error creating data URL:", dataUrlError);
                    thumbnailExtracted = false;
                    video.removeEventListener('seeked', extractThumb);
                    if (extractionAttempts < maxAttempts) {
                      setTimeout(() => {
                        if (!window.localVideoThumbnails.has(currentVideoId)) {
                          extractThumbnail();
                        }
                      }, 1000);
                    }
                    return;
                  }
                  
                  thumbnailExtracted = true;
                  
                  // Save thumbnail to file system instead of using data URL
                  if (isTauri && window.__TAURI_INTERNALS__) {
                    (async () => {
                      try {
                        const { invoke } = await import('@tauri-apps/api/core');
                        const filePath = await invoke('save_thumbnail', {
                          videoId: currentVideoId,
                          base64Data: thumbnailDataUrl
                        });
                        console.log("💾 Thumbnail saved to file:", filePath);
                        
                        // Store file path in Map for quick lookup
                        if (!window.localVideoThumbnails) {
                          window.localVideoThumbnails = new Map();
                        }
                        window.localVideoThumbnails.set(currentVideoId, filePath);
                        console.log("🗺️ Thumbnail path stored in Map for:", currentVideoId);
                        
                        // Reset video to saved progress or start
                        video.currentTime = targetTime;
                        
                        // Set player ready after thumbnail extraction
                        setIsPlayerReady(true);
                        
                        // Force UI update
                        setTimeout(() => {
                          if (window.setThumbnailUpdateTrigger) {
                            console.log("🔄 Triggering UI update for thumbnail");
                            window.setThumbnailUpdateTrigger(prev => prev + 1);
                          }
                        }, 100);
                        
                        // Trigger custom event
                        window.dispatchEvent(new CustomEvent('thumbnailReady', { detail: { videoId: currentVideoId } }));
                      } catch (error) {
                        console.error("❌ Failed to save thumbnail to file:", error);
                        // Fallback: still try to use data URL (might work in some cases)
                        if (!window.localVideoThumbnails) {
                          window.localVideoThumbnails = new Map();
                        }
                        window.localVideoThumbnails.set(currentVideoId, thumbnailDataUrl);
                        // Don't reset currentTime after thumbnail extraction - user might have been watching
                        setIsPlayerReady(true);
                      }
                    })();
                  } else {
                    // Fallback for non-Tauri: use data URL
                    if (!window.localVideoThumbnails) {
                      window.localVideoThumbnails = new Map();
                    }
                    window.localVideoThumbnails.set(currentVideoId, thumbnailDataUrl);
                    // Don't reset currentTime after thumbnail extraction - user might have been watching
                    setIsPlayerReady(true);
                  }
                  
                  video.removeEventListener('seeked', extractThumb);
                } catch (thumbError) {
                  console.error("❌ Error extracting thumbnail:", thumbError);
                  console.error("❌ Error stack:", thumbError.stack);
                  thumbnailExtracted = false;
                  video.removeEventListener('seeked', extractThumb);
                  // Don't reset currentTime on error - let video continue playing
                  
                  // Retry if we haven't exceeded max attempts
                  if (extractionAttempts < maxAttempts) {
                    setTimeout(() => {
                      if (!window.localVideoThumbnails.has(currentVideoId)) {
                        extractThumbnail();
                      }
                    }, 1000);
                  }
                }
              };
              
              // Set up seek handler before seeking
              video.addEventListener('seeked', extractThumb, { once: true });
              
              // Only seek if video is paused (don't interrupt playback)
              if (video.paused) {
                // Now seek to extract frame
                video.currentTime = seekTime;
              } else {
                // Video is playing, skip extraction for now
                console.log("⏸️ Video is playing, skipping thumbnail extraction");
                video.removeEventListener('seeked', extractThumb);
              }
            } catch (error) {
              console.error("❌ Error setting up thumbnail extraction:", error);
              console.error("❌ Error stack:", error.stack);
              thumbnailExtracted = false;
              
              // Retry if we haven't exceeded max attempts
              if (extractionAttempts < maxAttempts) {
                setTimeout(() => {
                  if (!window.localVideoThumbnails.has(currentVideoId)) {
                    extractThumbnail();
                  }
                }, 1000);
              }
            }
          };
          
          // Try extraction when metadata is loaded (duration available)
          // Delay it a bit to let video start playing smoothly first
          video.addEventListener('loadedmetadata', () => {
            console.log("✅ Video metadata loaded, duration:", video.duration);
            console.log("📐 Video dimensions:", video.videoWidth, "x", video.videoHeight);
            // Delay thumbnail extraction to avoid interfering with initial playback
            setTimeout(extractThumbnail, 1000);
          });
          
          // Fallback: try when video can play through (video is definitely ready)
          video.addEventListener('canplaythrough', () => {
            console.log("▶️ Video can play through");
            // Only extract if not already extracted and video is paused (not interfering with playback)
            if (!thumbnailExtracted && video.paused) {
              setTimeout(extractThumbnail, 500);
            }
          });
          
        } else {
          // Fallback for non-Tauri (shouldn't happen, but just in case)
          video.src = `file:///${filePath}`;
        }
        
        // Store blob URL for cleanup when video changes (streaming URLs don't need cleanup)
        if (video.src && video.src.startsWith('blob:')) {
          // Store reference for cleanup later (when switching to different video)
          if (!window.currentVideoBlobUrl) {
            window.currentVideoBlobUrl = null;
          }
          // Clean up previous blob URL if it exists
          if (window.currentVideoBlobUrl && window.currentVideoBlobUrl !== video.src) {
            URL.revokeObjectURL(window.currentVideoBlobUrl);
          }
          window.currentVideoBlobUrl = video.src;
        }
      } catch (error) {
        console.error("❌ Error setting up video stream:", error);
        console.error("❌ Error details:", error.message, error.stack);
        console.error("❌ File path was:", filePath);
        setIsPlayerReady(false);
        alert(`Failed to load video file. The file may be corrupted or inaccessible.\n\nFile: ${filePath.split(/[/\\]/).pop()}\n\nError: ${error.message || error}`);
      }

      // Local videos always start at 0:00 - set it once when metadata loads
      let initialTimeSet = false;
      
      video.addEventListener('loadedmetadata', () => {
        console.log("📊 Video metadata loaded");
        // Set to 0:00 once when metadata is loaded, before any playback
        if (!initialTimeSet) {
          video.currentTime = 0;
          initialTimeSet = true;
          console.log("⏩ Set initial time to 0:00");
        }
      });

      video.addEventListener('error', (e) => {
        console.error("❌ Video error:", e);
        console.error("❌ Video error code:", video.error?.code);
        console.error("❌ Video error message:", video.error?.message);
        console.error("❌ Video src:", video.src);
      });

      video.addEventListener('play', () => {
        console.log("▶️ Video playing");
        setIsPlaying(true);
      });

      video.addEventListener('pause', () => {
        console.log("⏸️ Video paused");
        setIsPlaying(false);
        // Don't save progress for local videos - always start at 0:00
      });

          video.addEventListener('ended', () => {
            console.log("⏹️ Video ended - auto-playing next");
            // Local videos always start at 0:00, no need to save/clear progress
            // Auto-play next video
            goToNextVideo();
          });

      video.addEventListener('timeupdate', () => {
        // Don't save progress for local videos - always start at 0:00
      });

      playerContainerRef.current.appendChild(video);
      localVideoRef.current = video;
      
      // Expose setThumbnailUpdateTrigger to window for thumbnail extraction callback
      window.setThumbnailUpdateTrigger = setThumbnailUpdateTrigger;
      
      console.log("✅ Local video element added to player container");
      return;
    }

    // YouTube videos are now handled by react-youtube component
    // This function only handles local files
    console.log("initializePlayer called for YouTube video - using react-youtube component instead");
  };

  // Primary player initialization - now handled by react-youtube component
  // Local files still use initializePlayer(), YouTube uses <YouTube> component
  useEffect(() => {
    // Reset seek flag when video changes
    hasSeekedToResume.current = false;
    
    // For local files, initialize immediately
    if (isLocalFile(currentVideoId)) {
      initializePlayer();
      return () => {
        // Don't save progress for local videos - always start at 0:00
        destroyPlayer();
      };
    }
    // For YouTube videos, react-youtube component handles initialization
    // No manual initialization needed - component handles it
    return () => {
      if (playerRef.current && currentVideoId && !isLocalFile(currentVideoId) && typeof playerRef.current.getCurrentTime === 'function') {
        saveVideoProgress(currentVideoId, playerRef.current.getCurrentTime());
      }
      // react-youtube handles cleanup automatically
      playerRef.current = null;
      setIsPlayerReady(false);
      setIsPlaying(false);
    };
  }, [currentVideoId]);

  // Re-initialize primary player when quarter splitscreen mode changes (container ref moves)
  // NOTE: With react-youtube, the component handles re-rendering automatically
  // Only need to re-initialize for local videos
  useEffect(() => {
    if (currentVideoId && playerContainerRef.current && isLocalFile(currentVideoId)) {
      console.log('Quarter splitscreen mode changed, re-initializing local video player', { quarterSplitscreenMode, currentVideoId });
      // Destroy old player first
      destroyPlayer();
      // Longer delay to ensure DOM has updated, container has transitioned, and old player is cleaned up
      const timeoutId = setTimeout(() => {
        if (playerContainerRef.current && currentVideoId) {
          console.log('Re-initializing local video player in new container', { 
            containerExists: !!playerContainerRef.current,
            containerWidth: playerContainerRef.current.offsetWidth,
            containerHeight: playerContainerRef.current.offsetHeight
          });
          initializePlayer();
        } else {
          console.warn('Cannot re-initialize player - container or video ID missing', {
            containerExists: !!playerContainerRef.current,
            currentVideoId
          });
        }
      }, 300); // Increased delay to allow CSS transitions to complete
      return () => clearTimeout(timeoutId);
    }
    // For YouTube videos, react-youtube component will automatically re-render when container moves
  }, [quarterSplitscreenMode]);

  // When side menu closes in quarter splitscreen mode, exit quarter mode and close secondary player
  useEffect(() => {
    // Don't close quarter mode if we're in fullscreen - let it stay hidden
    if (!showSideMenu && quarterSplitscreenMode && !document.fullscreenElement) {
      console.log('Side menu closed in quarter mode, exiting quarter mode and closing secondary player');
      // Close secondary player first
      setSecondaryPlayerVideoId(null);
      // Reset menu quadrant mode
      setMenuQuadrantMode(false);
      // Small delay to ensure secondary player cleanup completes
      setTimeout(() => {
        setQuarterSplitscreenMode(false);
      }, 100);
    }
  }, [showSideMenu, quarterSplitscreenMode]);

  // Reset menu quadrant mode when side menu closes
  useEffect(() => {
    if (!showSideMenu) {
      setMenuQuadrantMode(false);
      setPlayerQuadrantMode(false);
    }
  }, [showSideMenu]);

  // Debug player quadrant mode changes
  useEffect(() => {
    console.log('Player quadrant mode changed:', { 
      playerQuadrantMode, 
      showSideMenu, 
      quarterSplitscreenMode,
      shouldShowQuadrant: playerQuadrantMode && showSideMenu && !quarterSplitscreenMode
    });
  }, [playerQuadrantMode, showSideMenu, quarterSplitscreenMode]);

  // Handle fullscreen mode - WORKAROUND: Prevent fullscreen when quarter mode is active
  // This avoids the React/YouTube API conflict that causes crashes
  useLayoutEffect(() => {
    const handleFullscreenChange = () => {
      if (document.fullscreenElement) {
        // Entering fullscreen
        console.log('Fullscreen entered');
        
        // WORKAROUND: If quarter mode is active, exit fullscreen immediately to prevent crash
        if (quarterSplitscreenMode && secondaryPlayerVideoId) {
          console.warn('⚠️ Fullscreen blocked - quarter splitscreen mode is active. Please close quarter mode first.');
          // Exit fullscreen immediately to prevent crash
          if (document.exitFullscreen) {
            document.exitFullscreen().catch(err => console.error('Error exiting fullscreen:', err));
          }
          // Show user-friendly message (you can add a toast/notification here)
          alert('Please close the second player before entering fullscreen mode to avoid crashes.');
          return;
        }
        
        // Normal fullscreen entry - reset quadrant modes
        isInFullscreenTransition.current = true;
        console.log('Fullscreen entered, resetting quadrant modes (container stays in DOM, cleanup disabled)');
        
        // Reset all modes - container will be hidden via CSS
        setPlayerQuadrantMode(false);
        setMenuQuadrantMode(false);
        
        // Clear flag after a delay to allow React to finish reconciliation
        setTimeout(() => {
          isInFullscreenTransition.current = false;
        }, 500);
      } else {
        // Exiting fullscreen - clear flag
        isInFullscreenTransition.current = false;
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, [quarterSplitscreenMode, secondaryPlayerVideoId]);

  // Handle secondary player lifecycle for quarter splitscreen mode
  useEffect(() => {
    console.log('Secondary player useEffect triggered:', { 
      quarterSplitscreenMode, 
      secondaryPlayerVideoId, 
      playerQuadrantMode, 
      isFullscreen: !!document.fullscreenElement,
      isInTransition: isInFullscreenTransition.current
    });
    
    // DON'T clean up if we're in fullscreen or during fullscreen transition
    if (!quarterSplitscreenMode && !document.fullscreenElement && !isInFullscreenTransition.current) {
      // Clean up secondary player when mode is closed (but not in fullscreen or transition)
      console.log('Cleaning up secondary player - mode closed (not in fullscreen/transition)');
      // Clear container immediately to prevent React from trying to remove YouTube iframe
      // Only clear for local videos - react-youtube handles its own cleanup
      if (secondaryPlayerContainerRef.current && secondaryPlayerVideoId && isLocalFile(secondaryPlayerVideoId)) {
        try {
          secondaryPlayerContainerRef.current.innerHTML = '';
        } catch (error) {
          console.warn('Error clearing secondary player container:', error);
        }
      }
      // Destroy player instance (only for local videos - react-youtube handles YouTube cleanup)
      destroySecondaryPlayer();
      // Clear state
      setSecondaryPlayerVideoId(null);
      return;
    }
    
    // If in fullscreen or transition, don't initialize or clean up - just let container stay hidden
    if (document.fullscreenElement || isInFullscreenTransition.current) {
      console.log('Skipping secondary player operations - in fullscreen mode or transition');
      return;
    }

    // Initialize secondary player if video ID is set
    if (secondaryPlayerVideoId) {
      console.log('Secondary player video ID set:', secondaryPlayerVideoId);
      if (isLocalFile(secondaryPlayerVideoId)) {
        console.log('Secondary player is local file - initializing');
        // Small delay to ensure container is in DOM
        const timeoutId = setTimeout(() => {
          if (secondaryPlayerContainerRef.current) {
            initializeSecondaryPlayer();
          }
        }, playerQuadrantMode ? 100 : 0);
        return () => {
          clearTimeout(timeoutId);
          console.log('Secondary player cleanup (local file)');
          destroySecondaryPlayer();
        };
      } else {
        // For YouTube videos, react-youtube component handles initialization automatically
        console.log('Secondary player is YouTube video - using react-youtube component');
        // No manual initialization needed - component handles it
      }
    } else {
      console.log('No secondary player video ID set yet');
    }
  }, [quarterSplitscreenMode, secondaryPlayerVideoId, playerQuadrantMode]);

  useEffect(() => {
    let interval;
    // Only save progress for YouTube videos (local files handle it via timeupdate event)
    if (isPlaying && !isLocalFile(currentVideoId) && playerRef.current && currentVideoId && typeof playerRef.current.getCurrentTime === 'function') {
      interval = setInterval(() => {
        if (playerRef.current && typeof playerRef.current.getCurrentTime === 'function') saveVideoProgress(currentVideoId, playerRef.current.getCurrentTime());
      }, 5000);
    }
    return () => clearInterval(interval);
  }, [isPlaying, currentVideoId]);

  // Floating window drag handler
  useEffect(() => {
    if (!isDraggingWindow) return;

    const handleMouseMove = (e) => {
      const deltaX = e.clientX - dragStart.x;
      const deltaY = e.clientY - dragStart.y;
      setFloatingWindowPosition(prev => ({
        x: prev.x + deltaX,
        y: prev.y + deltaY
      }));
      setDragStart({ x: e.clientX, y: e.clientY });
    };

    const handleMouseUp = () => {
      setIsDraggingWindow(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDraggingWindow, dragStart]);

  // Floating window resize handler
  useEffect(() => {
    if (!isResizingWindow) return;

    const handleMouseMove = (e) => {
      const deltaX = e.clientX - resizeStart.x;
      const deltaY = e.clientY - resizeStart.y;
      setFloatingWindowSize(prev => ({
        width: Math.max(300, resizeStart.width + deltaX),
        height: Math.max(200, resizeStart.height + deltaY)
      }));
    };

    const handleMouseUp = () => {
      setIsResizingWindow(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizingWindow, resizeStart]);

  // Main player window drag handler
  useEffect(() => {
    if (!isDraggingMainWindow) return;

    const handleMouseMove = (e) => {
      const deltaX = e.clientX - mainWindowDragStart.x;
      const deltaY = e.clientY - mainWindowDragStart.y;
      setMainPlayerWindowPosition(prev => ({
        x: prev.x + deltaX,
        y: prev.y + deltaY
      }));
      setMainWindowDragStart({ x: e.clientX, y: e.clientY });
    };

    const handleMouseUp = () => {
      setIsDraggingMainWindow(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDraggingMainWindow, mainWindowDragStart]);

  // Main player window resize handler
  useEffect(() => {
    if (!isResizingMainWindow) return;

    const handleMouseMove = (e) => {
      const deltaX = e.clientX - mainWindowResizeStart.x;
      const deltaY = e.clientY - mainWindowResizeStart.y;
      const newSize = {
        width: Math.max(400, mainWindowResizeStart.width + deltaX),
        height: Math.max(300, mainWindowResizeStart.height + deltaY)
      };
      setMainPlayerWindowSize(newSize);
      // Update full size if menu is closed (so scaling works correctly)
      if (!showSideMenu) {
        setMainPlayerFullSize(newSize);
      }
    };

    const handleMouseUp = () => {
      setIsResizingMainWindow(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizingMainWindow, mainWindowResizeStart, showSideMenu]);

  // Removed: Dynamic window scaling - main player is no longer windowed by default

  // Initialize floating window player
  useEffect(() => {
    if (!floatingWindowVideoId || !floatingPlayerContainerRef.current) return;

    // For YouTube videos, react-youtube will handle it via JSX
    // For local files, we'd need to handle them separately if needed
    console.log('Floating window player initialized for:', floatingWindowVideoId);
  }, [floatingWindowVideoId]);

  // Effect to calculate average color from thumbnail for the top video menu background
  useEffect(() => {
    if (!currentVideoId) {
      setAverageColor('rgba(16, 16, 16, 0.7)');
      return;
    }
    
    // For local files, use default color (could extract from video frame later)
    if (isLocalFile(currentVideoId)) {
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
      {/* Secondary player container - ALWAYS RENDER (NO CONDITIONS) - position and visibility with CSS only */}
      {/* This prevents React from EVER trying to unmount it - container is permanent in DOM */}
      <div 
        className={`absolute transition-all duration-500 ease-in-out ${
          quarterSplitscreenMode && secondaryPlayerVideoId && !document.fullscreenElement ? (
            playerQuadrantMode && showSideMenu ? 'bottom-0 right-0 w-1/2 h-1/2' : 'bottom-0 left-0 w-1/2 h-1/2'
          ) : 'hidden pointer-events-none opacity-0'
        }`}
        style={{
          zIndex: quarterSplitscreenMode && secondaryPlayerVideoId && !document.fullscreenElement ? 10 : -1,
          display: quarterSplitscreenMode && secondaryPlayerVideoId && !document.fullscreenElement ? 'block' : 'none'
        }}
      >
        {/* Window-style container with border and title bar */}
        <div className="relative w-full h-full min-h-0 bg-gray-800 border-2 border-gray-600 rounded-t-lg overflow-hidden shadow-2xl flex flex-col">
          {/* Title bar - desktop window style */}
          <div className="relative bg-gray-700 border-b border-gray-600 px-3 py-1.5 flex items-center justify-between z-30 flex-shrink-0">
            <span className="text-white text-xs font-medium truncate flex-1">
              {getVideoTitle(secondaryPlayerVideoId)}
            </span>
            <button
              onClick={() => {
                console.log('Closing secondary player');
                setSecondaryPlayerVideoId(null);
              }}
              className="ml-2 p-1 hover:bg-red-600 rounded text-white transition-colors flex-shrink-0"
              title="Close Player 2"
            >
              <X size={14} />
            </button>
          </div>
          {/* Secondary player container - using react-youtube for YouTube videos */}
          <div
            ref={secondaryPlayerContainerRef}
            className="relative w-full flex-1 min-h-0 bg-black"
            style={{ overflow: 'hidden' }}
          >
            {/* YouTube player using react-youtube - handles lifecycle better */}
            {secondaryPlayerVideoId && !isLocalFile(secondaryPlayerVideoId) && (
              <YouTube
                videoId={secondaryPlayerVideoId}
                opts={{
                  height: '100%',
                  width: '100%',
                  playerVars: {
                    autoplay: 1,
                    controls: 1,
                    disablekb: 1,
                    fs: 0,
                    iv_load_policy: 3,
                    modestbranding: 1,
                    playsinline: 1,
                    rel: 0,
                    showinfo: 0,
                    origin: typeof window !== 'undefined' ? window.location.origin : ''
                  }
                }}
                onReady={(event) => {
                  secondaryPlayerRef.current = event.target;
                  console.log('Secondary YouTube player ready');
                }}
                onStateChange={(event) => {
                  // Handle secondary player state changes if needed
                  console.log('Secondary player state changed:', event.data);
                }}
                onError={(event) => {
                  console.error("Secondary YouTube player error:", event.data);
                }}
                className="absolute inset-0 w-full h-full"
              />
            )}
          </div>
        </div>
      </div>
      
      <div className={`transition-all duration-500 ease-in-out h-full ${quarterSplitscreenMode ? 'w-1/2' : showSideMenu ? 'w-1/2' : 'w-full'}`}>
        {/* Quarter splitscreen mode: two players in left quadrants */}
        {quarterSplitscreenMode ? (
          <div 
            className={`relative w-full h-full transition-all duration-500 ease-in-out ${
              playerQuadrantMode && secondaryPlayerVideoId ? 'flex flex-col' : 'flex flex-col'
            }`}
          >
            {/* Black top section - only visible in quadrant mode with 2 players */}
            <div 
              className={`w-full bg-black transition-all duration-500 ease-in-out ${
                playerQuadrantMode && secondaryPlayerVideoId ? 'h-1/2 flex-shrink-0' : 'h-0 hidden'
              }`}
            />
            {/* Primary player container - moves to bottom in quadrant mode */}
            {/* Window-style container with border and title bar (only when secondary player exists) */}
            {secondaryPlayerVideoId ? (
              <div 
                className={`relative w-full transition-all duration-500 ease-in-out flex flex-col ${
                  playerQuadrantMode && secondaryPlayerVideoId ? 'h-1/2 flex-shrink-0' : secondaryPlayerVideoId ? 'h-1/2 flex-shrink-0' : 'h-full flex-1'
                } bg-gray-800 border-2 border-gray-600 rounded-t-lg overflow-hidden shadow-2xl`}
              >
                {/* Title bar - desktop window style */}
                <div className="relative bg-gray-700 border-b border-gray-600 px-3 py-1.5 flex items-center justify-between z-30 flex-shrink-0">
                  <span className="text-white text-xs font-medium truncate flex-1">
                    {getVideoTitle(currentVideoId)}
                  </span>
                  <button
                    onClick={() => {
                      if (secondaryPlayerVideoId) {
                        console.log('Closing Player 1, switching Player 2 to primary');
                        const secondaryId = secondaryPlayerVideoId;
                        setSecondaryPlayerVideoId(null);
                        const playlistIndex = playlists.findIndex(p => 
                          p.videos.some(v => v.id === secondaryId)
                        );
                        if (playlistIndex !== -1) {
                          const videoIndex = playlists[playlistIndex].videos.findIndex(v => v.id === secondaryId);
                          if (videoIndex !== -1) {
                            selectVideoFromMenu(videoIndex, playlists[playlistIndex].id);
                          }
                        }
                      }
                    }}
                    className="ml-2 p-1 hover:bg-red-600 rounded text-white transition-colors flex-shrink-0"
                    title="Close Player 1 (Player 2 will become main)"
                  >
                    <X size={14} />
                  </button>
                </div>
                {/* Player content */}
                <div 
                  ref={playerContainerRef} 
                  className="relative w-full flex-1 min-h-0 bg-black" 
                  style={{ overflow: 'hidden' }}
                >
                  {/* YouTube player using react-youtube - handles lifecycle better */}
                  {currentVideoId && !isLocalFile(currentVideoId) && (
                    <YouTube
                      key={currentVideoId}
                      videoId={currentVideoId}
                      opts={{
                        height: '100%',
                        width: '100%',
                        playerVars: {
                          autoplay: 1,
                          controls: 1,
                          disablekb: 1,
                          fs: 0,
                          iv_load_policy: 3,
                          modestbranding: 1,
                          playsinline: 1,
                          rel: 0,
                          showinfo: 0,
                          origin: typeof window !== 'undefined' ? window.location.origin : ''
                        }
                      }}
                      onReady={(event) => {
                        playerRef.current = event.target;
                        setIsPlayerReady(true);
                        
                        // Seek to resume position if available (only once per video load)
                        if (!hasSeekedToResume.current) {
                          const resumeTime = getVideoProgress(currentVideoId);
                          const videoDuration = currentPlaylist.videos.find(v => v.id === currentVideoId)?.duration || 1;
                          // Only seek if we have progress and it's not near the end (within 95%)
                          if (resumeTime > 0 && resumeTime / videoDuration < 0.95) {
                            try {
                              event.target.seekTo(resumeTime, true);
                              console.log('Seeking to resume position:', resumeTime);
                            } catch (error) {
                              console.error('Error seeking to resume position:', error);
                            }
                          }
                          hasSeekedToResume.current = true;
                        }
                      }}
                      onStateChange={(event) => {
                        if (event.data === 1) { // PLAYING
                          setIsPlaying(true);
                        } else if (event.data === 2) { // PAUSED
                          setIsPlaying(false);
                          if (playerRef.current && typeof playerRef.current.getCurrentTime === 'function') {
                            saveVideoProgress(currentVideoId, playerRef.current.getCurrentTime());
                          }
                        } else if (event.data === 0) { // ENDED
                          goToNextVideo();
                        }
                      }}
                      onError={(event) => {
                        console.error("YouTube player error:", event.data);
                        if ([100, 101, 150].includes(event.data)) {
                          goToNextVideo();
                        }
                      }}
                      className="absolute inset-0 w-full h-full"
                    />
                  )}
                </div>
              </div>
            ) : (
              <div 
                className={`relative w-full transition-all duration-500 ease-in-out ${
                  'h-full flex-1'
                }`}
              >
                <div 
                  ref={playerContainerRef} 
                  className="relative w-full h-full min-h-0" 
                  style={{ overflow: 'hidden' }}
                >
                  {/* YouTube player using react-youtube - handles lifecycle better */}
                  {currentVideoId && !isLocalFile(currentVideoId) && (
                    <YouTube
                      key={currentVideoId}
                      videoId={currentVideoId}
                      opts={{
                        height: '100%',
                        width: '100%',
                        playerVars: {
                          autoplay: 1,
                          controls: 1,
                          disablekb: 1,
                          fs: 0,
                          iv_load_policy: 3,
                          modestbranding: 1,
                          playsinline: 1,
                          rel: 0,
                          showinfo: 0,
                          origin: typeof window !== 'undefined' ? window.location.origin : ''
                        }
                      }}
                      onReady={(event) => {
                        playerRef.current = event.target;
                        setIsPlayerReady(true);
                        
                        // Seek to resume position if available (only once per video load)
                        if (!hasSeekedToResume.current) {
                          const resumeTime = getVideoProgress(currentVideoId);
                          const videoDuration = currentPlaylist.videos.find(v => v.id === currentVideoId)?.duration || 1;
                          // Only seek if we have progress and it's not near the end (within 95%)
                          if (resumeTime > 0 && resumeTime / videoDuration < 0.95) {
                            try {
                              event.target.seekTo(resumeTime, true);
                              console.log('Seeking to resume position:', resumeTime);
                            } catch (error) {
                              console.error('Error seeking to resume position:', error);
                            }
                          }
                          hasSeekedToResume.current = true;
                        }
                      }}
                      onStateChange={(event) => {
                        if (event.data === 1) { // PLAYING
                          setIsPlaying(true);
                        } else if (event.data === 2) { // PAUSED
                          setIsPlaying(false);
                          if (playerRef.current && typeof playerRef.current.getCurrentTime === 'function') {
                            saveVideoProgress(currentVideoId, playerRef.current.getCurrentTime());
                          }
                        } else if (event.data === 0) { // ENDED
                          goToNextVideo();
                        }
                      }}
                      onError={(event) => {
                        console.error("YouTube player error:", event.data);
                        if ([100, 101, 150].includes(event.data)) {
                          goToNextVideo();
                        }
                      }}
                      className="absolute inset-0 w-full h-full"
                    />
                  )}
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Normal single player container */
          <div 
            className={`relative w-full h-full transition-all duration-500 ease-in-out ${
              playerQuadrantMode && showSideMenu && !quarterSplitscreenMode ? 'flex flex-col' : ''
            }`}
          >
            {/* Black top section - only visible in quadrant mode */}
            <div 
              className={`w-full bg-black transition-all duration-500 ease-in-out ${
                playerQuadrantMode && showSideMenu && !quarterSplitscreenMode ? 'h-1/2 flex-shrink-0' : 'h-0 hidden'
              }`}
            />
            {/* Player container - always in same position, just changes height */}
            <div 
              ref={playerContainerRef} 
              className={`relative w-full transition-all duration-500 ease-in-out ${
                playerQuadrantMode && showSideMenu && !quarterSplitscreenMode ? 'h-1/2 flex-shrink-0' : 'h-full'
              }`}
            >
              {/* YouTube player using react-youtube - handles lifecycle better */}
              {currentVideoId && !isLocalFile(currentVideoId) && (
                <YouTube
                  key={currentVideoId}
                  videoId={currentVideoId}
                  opts={{
                    height: '100%',
                    width: '100%',
                    playerVars: {
                      autoplay: 1,
                      controls: 1,
                      disablekb: 1,
                      fs: 0,
                      iv_load_policy: 3,
                      modestbranding: 1,
                      playsinline: 1,
                      rel: 0,
                      showinfo: 0,
                      origin: typeof window !== 'undefined' ? window.location.origin : ''
                    }
                  }}
                  onReady={(event) => {
                    playerRef.current = event.target;
                    setIsPlayerReady(true);
                    
                    // Seek to resume position if available (only once per video load)
                    if (!hasSeekedToResume.current) {
                      const resumeTime = getVideoProgress(currentVideoId);
                      const videoDuration = currentPlaylist.videos.find(v => v.id === currentVideoId)?.duration || 1;
                      // Only seek if we have progress and it's not near the end (within 95%)
                      if (resumeTime > 0 && resumeTime / videoDuration < 0.95) {
                        try {
                          event.target.seekTo(resumeTime, true);
                          console.log('Seeking to resume position:', resumeTime);
                        } catch (error) {
                          console.error('Error seeking to resume position:', error);
                        }
                      }
                      hasSeekedToResume.current = true;
                    }
                  }}
                  onStateChange={(event) => {
                    if (event.data === 1) { // PLAYING
                      setIsPlaying(true);
                    } else if (event.data === 2) { // PAUSED
                      setIsPlaying(false);
                      if (playerRef.current && typeof playerRef.current.getCurrentTime === 'function') {
                        saveVideoProgress(currentVideoId, playerRef.current.getCurrentTime());
                      }
                    } else if (event.data === 0) { // ENDED
                      goToNextVideo();
                    }
                  }}
                  onError={(event) => {
                    console.error("YouTube player error:", event.data);
                    if ([100, 101, 150].includes(event.data)) {
                      goToNextVideo();
                    }
                  }}
                  className="absolute inset-0 w-full h-full"
                />
              )}
            </div>
          </div>
        )}
      </div>
      
      {/* Right side container - menu and secondary player (when in playerQuadrantMode with 2 players) */}
      {/* ALWAYS render to prevent React unmount conflicts - control visibility with CSS */}
      <div className={`relative transition-all duration-500 ease-in-out ${showSideMenu ? 'w-1/2' : 'w-0 overflow-hidden'}`}>
        {/* Menu container */}
        <div 
          className={`transition-all duration-500 ease-in-out backdrop-blur-sm overflow-y-auto ${showSideMenu ? (
            playerQuadrantMode && secondaryPlayerVideoId && quarterSplitscreenMode ? 'w-full absolute top-0 right-0 h-1/2' : 
            menuQuadrantMode ? 'w-full absolute bottom-0 right-0 h-1/2' : 'w-full'
          ) : 'w-0'}`}
          style={{ 
            backgroundColor: showSideMenu ? averageColor : 'transparent'
          }}
        >
        {showSideMenu && (
          <div className={`p-4 relative ${menuQuadrantMode ? 'pt-4' : 'pt-20'}`}>
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
                        {isTauri && index !== 0 && (
                          <button
                            onClick={() => handleExportTab(index)}
                            className="p-1.5 text-white/70 hover:text-white hover:bg-blue-500/50 rounded-full transition-colors"
                            title={`Export tab "${tab.name}" with all playlists`}
                          >
                            <Download size={16} />
                          </button>
                        )}
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
                    {isTauri && (
                      <button 
                        onClick={handleSmartImport}
                        className="bg-green-500/80 hover:bg-green-500 text-white p-2 rounded flex items-center gap-1"
                        title="Import playlist or tab from file (auto-detects file type)"
                      >
                        <Upload size={18} />
                      </button>
                    )}
                    {isTauri && (
                      <button 
                        onClick={handleAddLocalFolder}
                        className="bg-purple-500/80 hover:bg-purple-500 text-white p-2 rounded flex items-center gap-1"
                        title="Add local video files or folder as playlist"
                      >
                        <Folder size={18} />
                      </button>
                    )}
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
                        <ThumbnailImage videoId={getPlaylistThumbnailVideoId(playlist)} alt={playlist.name} />
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
                              {/* Show delete/rename/merge/export buttons for all regular playlists (not colored folders, not _unsorted_) */}
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
                                    onClick={() => handleExportPlaylist(playlist.id, playlist.name)}
                                    title="Export Playlist" 
                                    className="bg-green-500/80 p-3 rounded-full hover:bg-green-500"
                                  >
                                    <Download size={20}/>
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
                  {/* Import Playlist button */}
                  {isTauri && (
                    <button 
                      onClick={handleImportPlaylist}
                      className="aspect-video bg-white/5 rounded-lg flex flex-col items-center justify-center text-white/30 hover:bg-white/10 hover:text-white transition-colors border-2 border-dashed border-white/20"
                      title="Import playlist from JSON file"
                    >
                      <Upload size={32} />
                      <span className="text-xs mt-2">Import</span>
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
                                    <ThumbnailImage videoId={thumbnailVideoId} alt={playlist.name} />
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
                    <div className="flex justify-between items-center mb-4">
                      <div className="flex gap-2">
                        {isTauri && !displayedPlaylist.isColoredFolder && (
                          <>
                            <button 
                              onClick={() => handleFetchPlaylistMetadata(displayedPlaylist.id)}
                              className="text-white bg-blue-500/80 hover:bg-blue-500 p-2 rounded-full"
                              title="Fetch metadata for all videos (ONE-TIME - stored permanently in database)"
                            >
                              <Database size={20} />
                            </button>
                            <button 
                              onClick={() => handleAddLocalVideosToPlaylist(displayedPlaylist.id)}
                              className="text-white bg-purple-500/80 hover:bg-purple-500 p-2 rounded-full"
                              title="Add local video files (.mp4, .webm) to this playlist"
                            >
                              <Folder size={20} />
                            </button>
                            <button 
                              onClick={() => handleOverwritePlaylist(displayedPlaylist.id)}
                              className="text-white bg-orange-500/80 hover:bg-orange-500 p-2 rounded-full"
                              title="Overwrite playlist from file"
                            >
                              <Upload size={20} />
                            </button>
                          </>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => setShowSideMenu('playlists')} className="text-white bg-white/10 hover:bg-white/20 p-2 rounded-full"><ChevronLeft size={24} /></button>
                        <button onClick={() => setShowSideMenu(null)} className="text-white bg-white/10 hover:bg-white/20 p-2 rounded-full"><X size={24} /></button>
                      </div>
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
                        <div key={`${video.id}-${thumbnailUpdateTrigger}`} draggable onDragStart={() => setDraggingVideoId(video.id)} className="relative group">
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
                              <ThumbnailImage 
                                key={`thumb-${video.id}-${thumbnailUpdateTrigger}`}
                                videoId={video.id}
                                alt={video.title}
                              />
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
                            <h3 
                              className="text-white font-semibold mt-2 text-sm truncate hover:text-blue-400 cursor-pointer"
                              onClick={(e) => {
                                e.stopPropagation();
                                const url = `https://www.youtube.com/watch?v=${video.id}`;
                                if (isTauri) {
                                  // Use Tauri shell to open in default browser
                                  import('@tauri-apps/plugin-shell').then(({ open }) => {
                                    open(url).catch(err => console.error('Failed to open URL:', err));
                                  });
                                } else {
                                  window.open(url, '_blank');
                                }
                              }}
                              title="Click to open on YouTube"
                            >
                              {video.title}
                            </h3>
                            {(video.author || video.viewCount) && (
                              <div className="text-white/60 text-xs mt-1 flex items-center gap-2">
                                {video.author && <span>{video.author}</span>}
                                {video.viewCount && video.viewCount !== '0' && <span>• {formatViews(video.viewCount)} views</span>}
                              </div>
                            )}
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
                          <img src={getVideoThumbnailSync(entry.videoId)} alt={entry.title} className="w-full h-full object-cover" loading="lazy"/>
                        </div>
                        <div>
                          <h3 
                            className="text-white font-semibold text-sm truncate hover:text-blue-400 cursor-pointer"
                            onClick={(e) => {
                              e.stopPropagation();
                              const url = `https://www.youtube.com/watch?v=${entry.videoId}`;
                              if (isTauri) {
                                import('@tauri-apps/plugin-shell').then(({ open }) => {
                                  open(url).catch(err => console.error('Failed to open URL:', err));
                                });
                              } else {
                                window.open(url, '_blank');
                              }
                            }}
                            title="Click to open on YouTube"
                          >
                            {entry.title}
                          </h3>
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
                    {searchResults.map((video, idx) => (
                      <div key={`${video.id}-${thumbnailUpdateTrigger}`} className="relative group">
                        <button onClick={() => playOffPlaylistVideo(video)} className={`w-full text-left ${currentVideoId === video.id ? 'ring-2 ring-blue-500 rounded-lg' : ''}`}>
                          <div className="aspect-video bg-gray-800 rounded-lg overflow-hidden relative">
                            <ThumbnailImage videoId={video.id} alt={video.title} />
                          </div>
                          <h3 
                            className="text-white font-semibold mt-2 text-sm truncate hover:text-blue-400 cursor-pointer"
                            onClick={(e) => {
                              e.stopPropagation();
                              const url = `https://www.youtube.com/watch?v=${video.id}`;
                              if (isTauri) {
                                import('@tauri-apps/plugin-shell').then(({ open }) => {
                                  open(url).catch(err => console.error('Failed to open URL:', err));
                                });
                              } else {
                                window.open(url, '_blank');
                              }
                            }}
                            title="Click to open on YouTube"
                          >
                            {video.title}
                          </h3>
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
        
        {/* Secondary player is now rendered at root level to prevent unmount issues */}
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
            <button
              onClick={() => {
                console.log('Add to 2nd Player clicked, video ID:', contextMenuVideo.id);
                // If not in quarter splitscreen mode, switch to it first
                if (!quarterSplitscreenMode) {
                  setQuarterSplitscreenMode(true);
                }
                // Set the secondary player video ID
                setSecondaryPlayerVideoId(contextMenuVideo.id);
                setContextMenuVideo(null);
                console.log('Secondary player video ID set to:', contextMenuVideo.id);
              }}
              disabled={!!floatingWindowVideoId}
              className={`px-3 py-2 rounded text-sm ${
                floatingWindowVideoId 
                  ? 'text-white/40 cursor-not-allowed' 
                  : 'text-white hover:bg-white/10'
              }`}
              title={floatingWindowVideoId ? 'Close floating window first (max 2 players)' : 'Add to 2nd Player'}
            >
              Add to 2nd Player
            </button>
            <button
              onClick={() => {
                console.log('2nd Window Player clicked, video ID:', contextMenuVideo.id);
                setFloatingWindowVideoId(contextMenuVideo.id);
                setContextMenuVideo(null);
              }}
              disabled={!!secondaryPlayerVideoId}
              className={`px-3 py-2 rounded text-sm ${
                secondaryPlayerVideoId 
                  ? 'text-white/40 cursor-not-allowed' 
                  : 'text-white hover:bg-white/10'
              }`}
              title={secondaryPlayerVideoId ? 'Close 2nd player first (max 2 players)' : '2nd Window Player'}
            >
              2nd Window Player
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

      {/* Floating Window Player */}
      {floatingWindowVideoId && (
        <div
          ref={floatingWindowRef}
          className="fixed bg-gray-800 border-2 border-gray-600 rounded-t-lg overflow-hidden shadow-2xl flex flex-col z-50"
          style={{
            left: `${floatingWindowPosition.x}px`,
            top: `${floatingWindowPosition.y}px`,
            width: `${floatingWindowSize.width}px`,
            height: `${floatingWindowSize.height}px`,
            cursor: isDraggingWindow ? 'grabbing' : 'default'
          }}
        >
          {/* Title bar - draggable */}
          <div
            className="relative bg-gray-700 border-b border-gray-600 px-3 py-1.5 flex items-center justify-between z-30 flex-shrink-0 cursor-grab active:cursor-grabbing"
            onMouseDown={(e) => {
              setIsDraggingWindow(true);
              setDragStart({ x: e.clientX, y: e.clientY });
            }}
          >
            <span className="text-white text-xs font-medium truncate flex-1">
              {getVideoTitle(floatingWindowVideoId)}
            </span>
            <button
              onClick={() => {
                setFloatingWindowVideoId(null);
                if (floatingPlayerRef.current && typeof floatingPlayerRef.current.destroy === 'function') {
                  try {
                    floatingPlayerRef.current.destroy();
                  } catch (error) {
                    console.error('Error destroying floating player:', error);
                  }
                }
                floatingPlayerRef.current = null;
              }}
              className="ml-2 p-1 hover:bg-red-600 rounded text-white transition-colors flex-shrink-0"
              title="Close Window"
            >
              <X size={14} />
            </button>
          </div>
          {/* Player content */}
          <div
            ref={floatingPlayerContainerRef}
            className="relative w-full flex-1 min-h-0 bg-black"
            style={{ overflow: 'hidden' }}
          >
            {/* YouTube player using react-youtube */}
            {floatingWindowVideoId && !isLocalFile(floatingWindowVideoId) && (
              <YouTube
                key={floatingWindowVideoId}
                videoId={floatingWindowVideoId}
                opts={{
                  height: '100%',
                  width: '100%',
                  playerVars: {
                    autoplay: 1,
                    controls: 1,
                    disablekb: 1,
                    fs: 0,
                    iv_load_policy: 3,
                    modestbranding: 1,
                    playsinline: 1,
                    rel: 0,
                    showinfo: 0,
                    origin: typeof window !== 'undefined' ? window.location.origin : ''
                  }
                }}
                onReady={(event) => {
                  floatingPlayerRef.current = event.target;
                  console.log('Floating window player ready');
                }}
                onStateChange={(event) => {
                  console.log('Floating player state changed:', event.data);
                }}
                onError={(event) => {
                  console.error("Floating YouTube player error:", event.data);
                }}
                className="absolute inset-0 w-full h-full"
              />
            )}
          </div>
          {/* Resize handle */}
          <div
            className="absolute bottom-0 right-0 w-4 h-4 bg-gray-600 cursor-nwse-resize"
            onMouseDown={(e) => {
              e.stopPropagation();
              setIsResizingWindow(true);
              setResizeStart({
                x: e.clientX,
                y: e.clientY,
                width: floatingWindowSize.width,
                height: floatingWindowSize.height
              });
            }}
            style={{
              clipPath: 'polygon(100% 0, 100% 100%, 0 100%)'
            }}
          />
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
                    <ThumbnailImage videoId={getPlaylistThumbnailVideoId(playlist)} alt={playlist.name} />
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
            {(showSideMenu || quarterSplitscreenMode) && (
              <div
                className="relative"
                onMouseEnter={() => {
                  if (playerQuadrantHoverTimer.current) clearTimeout(playerQuadrantHoverTimer.current);
                  playerQuadrantHoverTimer.current = setTimeout(() => {
                    if (showSideMenu || quarterSplitscreenMode) {
                      console.log('Player quadrant mode activated', { 
                        showSideMenu, 
                        quarterSplitscreenMode, 
                        showSideMenuType: typeof showSideMenu,
                        showSideMenuTruthy: !!showSideMenu
                      });
                      setPlayerQuadrantMode(true);
                      // Force a re-render check
                      setTimeout(() => {
                        console.log('State after set:', { playerQuadrantMode: true });
                      }, 100);
                    } else {
                      console.log('Player quadrant mode NOT activated - conditions not met', { 
                        showSideMenu, 
                        quarterSplitscreenMode 
                      });
                    }
                  }, 2000);
                }}
                onMouseLeave={() => {
                  if (playerQuadrantHoverTimer.current) {
                    clearTimeout(playerQuadrantHoverTimer.current);
                    playerQuadrantHoverTimer.current = null;
                  }
                  // Return players to normal position when hovering stops
                  console.log('Player quadrant mode deactivated');
                  setPlayerQuadrantMode(false);
                }}
              >
                <button
                  className={`p-2 rounded-full transition-colors ${playerQuadrantMode ? 'bg-blue-500' : 'bg-white/10 hover:bg-white/20'}`}
                  title="Hover 2 seconds to push players to bottom quadrants"
                >
                  <MoveDown size={16} />
                </button>
              </div>
            )}
          </div>
          {/* Tab Cycler */}
          {playlistTabs.length > 1 && (
            <div className="flex items-center gap-1 mt-2">
              {playlistTabs.map((tab, index) => (
                <div key={index} className="flex items-center gap-1">
            <button
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
                  {isTauri && index !== 0 && (
                    <button
                      onClick={() => handleExportTab(index)}
                      className="p-1.5 text-white/70 hover:text-white hover:bg-blue-500/50 rounded-full transition-colors"
                      title={`Export tab "${tab.name}" with all playlists`}
                    >
                      <Download size={16} />
                    </button>
                  )}
                </div>
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
              <span
                className="hover:text-blue-400 cursor-pointer"
                onClick={() => {
                  if (currentVideoId) {
                    const url = `https://www.youtube.com/watch?v=${currentVideoId}`;
                    if (isTauri) {
                      import('@tauri-apps/plugin-shell').then(({ open }) => {
                        open(url).catch(err => console.error('Failed to open URL:', err));
                      });
                    } else {
                      window.open(url, '_blank');
                    }
                  }
                }}
                title="Click to open on YouTube"
              >
                {currentVideoTitle}
              </span>
            </span>
            <button onClick={goToNextVideo} className={`p-1 hover:bg-white/20 rounded-md ${isTitleExpanded ? 'ml-auto' : ''}`}><ChevronRight size={20} /></button>
            <div className={`${isTitleExpanded ? 'absolute -top-6 right-0 opacity-0 pointer-events-none' : 'relative translate-y-0 opacity-100'} transition-all duration-300 flex items-center gap-2`}>
              <button onClick={() => setShowSideMenu(showSideMenu === 'search' ? null : 'search')} className={`p-2 rounded-full transition-colors ${showSideMenu === 'search' ? 'bg-blue-500' : 'bg-white/10 hover:bg-white/20'}`}><Search size={16} /></button>
            <button onClick={() => { setShowSideMenu(showSideMenu === 'videos' ? null : (setSideMenuPlaylistIndex(currentPlaylistIndex), setVideoFilter(chronologicalFilter), 'videos')) }} className="p-2 rounded-full bg-white/10 hover:bg-white/20"><Grid3X3 size={16} /></button>
            <button onClick={() => setShowSideMenu(showSideMenu === 'history' ? null : 'history')} className={`p-2 rounded-full transition-colors ${showSideMenu === 'history' ? 'bg-blue-500' : 'bg-white/10 hover:bg-white/20'}`}><Clock size={16} /></button>
            <button onClick={handleFolderCycleClick} className={`p-2 rounded-full transition-colors ${chronologicalFilter !== 'all' ? groupColors[chronologicalFilter] : 'bg-blue-500'}`}><Play size={16} /></button>
                <button onClick={() => startNewShuffle()} className={`p-2 rounded-full bg-blue-500 hover:bg-blue-600`} title="Regenerate shuffle order for current filter"><Shuffle size={16} /></button>
                {(showSideMenu || quarterSplitscreenMode) && (
                  <div
                    className="relative"
                    onMouseEnter={() => {
                      // Don't activate menu quadrant mode if player quadrant mode is active with 2 players
                      if (playerQuadrantMode && secondaryPlayerVideoId && quarterSplitscreenMode) return;
                      if (menuQuadrantHoverTimer.current) clearTimeout(menuQuadrantHoverTimer.current);
                      menuQuadrantHoverTimer.current = setTimeout(() => {
                        if (showSideMenu || quarterSplitscreenMode) {
                          setMenuQuadrantMode(true);
                        }
                      }, 2000);
                    }}
                    onMouseLeave={() => {
                      if (menuQuadrantHoverTimer.current) {
                        clearTimeout(menuQuadrantHoverTimer.current);
                        menuQuadrantHoverTimer.current = null;
                      }
                      // Return menu to normal half size when hovering stops
                      setMenuQuadrantMode(false);
                    }}
                  >
                    <button
                      className={`p-2 rounded-full transition-colors ${menuQuadrantMode ? 'bg-blue-500' : 'bg-white/10 hover:bg-white/20'}`}
                      title="Hover 2 seconds to shrink menu to bottom right quadrant"
                    >
                      <CornerDownRight size={16} />
                    </button>
                  </div>
                )}
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
                      <div className="border-t border-white/10 my-2"></div>
                      <button
                        onClick={() => {
                          setQuarterSplitscreenMode(!quarterSplitscreenMode);
                          setShowSettingsMenu(false);
                        }}
                        className={`w-full text-left px-3 py-2 rounded text-sm ${
                          quarterSplitscreenMode 
                            ? 'bg-blue-500/20 text-blue-300 hover:bg-blue-500/30' 
                            : 'text-white hover:bg-white/10'
                        }`}
                      >
                        {quarterSplitscreenMode ? 'Exit Quarter Splitscreen' : 'Quarter Splitscreen Mode'}
                      </button>
                      <div className="border-t border-white/10 my-2"></div>
                      <button
                        onClick={async () => {
                          setShowSettingsMenu(false);
                          await handleConvertMkvFolder();
                        }}
                        className="w-full text-left px-3 py-2 text-white hover:bg-white/10 rounded text-sm"
                      >
                        Convert MKV Folder to MP4
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
                    <ThumbnailImage videoId={getPlaylistThumbnailVideoId(playlist)} alt={playlist.name} />
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
                        <img src={getVideoThumbnailSync(playlist.videos[0]?.id)} alt={playlist.name} className="w-full h-full object-cover"/>
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
          <div className="bg-gray-900 rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-white">Add Playlists</h2>
              <button 
                onClick={() => { 
                  setShowBulkAddModal(false); 
                  setBulkPlaylistIds(Array(10).fill(''));
                  setBulkAddMode('bulk');
                  setConfigurePlaylistName('');
                  setConfigurePlaylistEntries([{ id: '', color: 'red', folderName: '' }]);
                  setConfigurePlaylistMode('new');
                  setConfigureSelectedPlaylistId('');
                }} 
                className="p-2 rounded-full hover:bg-white/10"
              >
                <X size={20} />
              </button>
            </div>

            {/* Tab Switcher */}
            <div className="flex gap-2 mb-4 border-b border-white/10">
              <button
                onClick={() => setBulkAddMode('bulk')}
                className={`px-4 py-2 font-medium transition-colors ${
                  bulkAddMode === 'bulk'
                    ? 'text-white border-b-2 border-purple-500'
                    : 'text-white/60 hover:text-white/80'
                }`}
              >
                Bulk Add
              </button>
              <button
                onClick={() => setBulkAddMode('configure')}
                className={`px-4 py-2 font-medium transition-colors ${
                  bulkAddMode === 'configure'
                    ? 'text-white border-b-2 border-purple-500'
                    : 'text-white/60 hover:text-white/80'
                }`}
              >
                Configure Playlist
              </button>
            </div>

            {/* Bulk Add Mode */}
            {bulkAddMode === 'bulk' && (
              <>
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
              </>
            )}

            {/* Configure Playlist Mode */}
            {bulkAddMode === 'configure' && (
              <>
                <p className="text-white/70 mb-4">
                  Create one playlist with colored folders, or add to an existing playlist. Each source playlist will populate a colored folder.
                </p>

                <div className="mb-4">
                  <label className="block text-white mb-2">Mode:</label>
                  <div className="flex gap-4 mb-3">
                    <label className="flex items-center gap-2 text-white cursor-pointer">
                      <input
                        type="radio"
                        name="configureMode"
                        value="new"
                        checked={configurePlaylistMode === 'new'}
                        onChange={() => {
                          setConfigurePlaylistMode('new');
                          setConfigureSelectedPlaylistId('');
                        }}
                        className="w-4 h-4"
                      />
                      <span>Create New Playlist</span>
                    </label>
                    <label className="flex items-center gap-2 text-white cursor-pointer">
                      <input
                        type="radio"
                        name="configureMode"
                        value="existing"
                        checked={configurePlaylistMode === 'existing'}
                        onChange={() => {
                          setConfigurePlaylistMode('existing');
                          setConfigurePlaylistName('');
                        }}
                        className="w-4 h-4"
                      />
                      <span>Add to Existing Playlist</span>
                    </label>
                  </div>

                  {configurePlaylistMode === 'new' ? (
                    <input
                      type="text"
                      value={configurePlaylistName}
                      onChange={(e) => setConfigurePlaylistName(e.target.value)}
                      placeholder="Enter playlist name"
                      className="w-full bg-white/10 text-white p-2 rounded"
                    />
                  ) : (
                    <select
                      value={configureSelectedPlaylistId}
                      onChange={(e) => {
                        setConfigureSelectedPlaylistId(e.target.value);
                        // Reset entries when playlist changes
                        setConfigurePlaylistEntries([{ id: '', color: 'red', folderName: '' }]);
                      }}
                      className="w-full bg-white/10 text-white p-2 rounded border border-white/20"
                      style={{ color: 'white', backgroundColor: 'rgba(255, 255, 255, 0.1)' }}
                    >
                      <option value="" style={{ backgroundColor: '#1f2937', color: 'white' }}>Select a playlist...</option>
                      {playlists.filter(p => p.id !== '_unsorted_' && !p.isColoredFolder).map(playlist => (
                        <option key={playlist.id} value={playlist.id} style={{ backgroundColor: '#1f2937', color: 'white' }}>
                          {playlist.name}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                <div className="mb-4">
                  <label className="block text-white mb-2">Playlist IDs with Colors:</label>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {configurePlaylistEntries.map((entry, index) => (
                      <div key={index} className="flex gap-2 items-center">
                        <input
                          type="text"
                          value={entry.id}
                          onChange={(e) => {
                            const newEntries = [...configurePlaylistEntries];
                            newEntries[index].id = e.target.value;
                            setConfigurePlaylistEntries(newEntries);
                          }}
                          placeholder={`Playlist ${index + 1} ID or URL`}
                          className="flex-1 bg-white/10 text-white p-2 rounded font-mono text-sm"
                        />
                        <input
                          type="text"
                          value={entry.folderName}
                          onChange={(e) => {
                            const newEntries = [...configurePlaylistEntries];
                            newEntries[index].folderName = e.target.value;
                            setConfigurePlaylistEntries(newEntries);
                          }}
                          placeholder="Folder name (optional)"
                          className="flex-1 bg-white/10 text-white p-2 rounded text-sm"
                        />
                        <select
                          value={entry.color}
                          onChange={(e) => {
                            const newEntries = [...configurePlaylistEntries];
                            newEntries[index].color = e.target.value;
                            // If existing playlist is selected, use its folder name for this color
                            if (configurePlaylistMode === 'existing' && configureSelectedPlaylistId) {
                              const selectedPlaylist = playlists.find(p => p.id === configureSelectedPlaylistId);
                              if (selectedPlaylist && selectedPlaylist.groups[e.target.value]) {
                                newEntries[index].folderName = selectedPlaylist.groups[e.target.value].name || '';
                              }
                            }
                            setConfigurePlaylistEntries(newEntries);
                          }}
                          className="bg-white/10 text-white p-2 rounded text-sm appearance-none cursor-pointer border border-white/20"
                          style={{ color: 'white', backgroundColor: 'rgba(255, 255, 255, 0.1)' }}
                        >
                          {(() => {
                            const colorOrder = ['red', 'green', 'blue', 'yellow', 'orange', 'purple', 'pink', 'cyan', 'indigo', 'teal', 'lime', 'amber', 'emerald', 'violet', 'rose', 'sky'];
                            const selectedPlaylist = configurePlaylistMode === 'existing' && configureSelectedPlaylistId 
                              ? playlists.find(p => p.id === configureSelectedPlaylistId)
                              : null;
                            
                            return colorOrder.map(color => {
                              // Get folder name: custom name if existing playlist selected, otherwise default
                              const folderName = selectedPlaylist && selectedPlaylist.groups[color]
                                ? selectedPlaylist.groups[color].name
                                : color.charAt(0).toUpperCase() + color.slice(1);
                              
                              return (
                                <option key={color} value={color} style={{ backgroundColor: '#1f2937', color: 'white' }}>
                                  {folderName}
                                </option>
                              );
                            });
                          })()}
                        </select>
                        {configurePlaylistEntries.length > 1 && (
                          <button
                            onClick={() => {
                              const newEntries = configurePlaylistEntries.filter((_, i) => i !== index);
                              setConfigurePlaylistEntries(newEntries);
                            }}
                            className="p-2 text-red-400 hover:bg-red-500/20 rounded"
                          >
                            <X size={16} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={() => {
                      // Cycle through colors: red, green, blue, yellow, orange, purple, pink, cyan, indigo, teal, lime, amber, emerald, violet, rose, sky
                      const colorOrder = ['red', 'green', 'blue', 'yellow', 'orange', 'purple', 'pink', 'cyan', 'indigo', 'teal', 'lime', 'amber', 'emerald', 'violet', 'rose', 'sky'];
                      const lastColor = configurePlaylistEntries[configurePlaylistEntries.length - 1]?.color || 'red';
                      const lastColorIndex = colorOrder.indexOf(lastColor);
                      const nextColorIndex = (lastColorIndex + 1) % colorOrder.length;
                      const nextColor = colorOrder[nextColorIndex];
                      
                      // If existing playlist is selected, use its folder name for this color
                      let folderName = '';
                      if (configurePlaylistMode === 'existing' && configureSelectedPlaylistId) {
                        const selectedPlaylist = playlists.find(p => p.id === configureSelectedPlaylistId);
                        if (selectedPlaylist && selectedPlaylist.groups[nextColor]) {
                          folderName = selectedPlaylist.groups[nextColor].name || '';
                        }
                      }
                      
                      setConfigurePlaylistEntries([...configurePlaylistEntries, { id: '', color: nextColor, folderName }]);
                    }}
                    className="mt-2 px-3 py-1 bg-white/10 text-white rounded hover:bg-white/20 text-sm"
                  >
                    + Add Another
                  </button>
                </div>

                <div className="flex gap-2 justify-end">
                  <button
                    onClick={() => {
                      setShowBulkAddModal(false);
                      setConfigurePlaylistName('');
                      setConfigurePlaylistEntries([{ id: '', color: 'red', folderName: '' }]);
                      setConfigurePlaylistMode('new');
                      setConfigureSelectedPlaylistId('');
                    }}
                    className="px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-600"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleConfigurePlaylist}
                    className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 disabled:bg-gray-700 disabled:cursor-not-allowed"
                    disabled={
                      (configurePlaylistMode === 'new' && !configurePlaylistName.trim()) ||
                      (configurePlaylistMode === 'existing' && !configureSelectedPlaylistId) ||
                      !configurePlaylistEntries.some(e => e.id.trim())
                    }
                  >
                    {configurePlaylistMode === 'existing' ? 'Update Playlist' : 'Create Playlist'}
                  </button>
                </div>
              </>
            )}
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