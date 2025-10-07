"use client"
import { useState, useEffect, useRef, useMemo } from "react"
import {
  ChevronLeft,
  ChevronRight,
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
import { collection, query, orderBy, limit, deleteDoc, setDoc, doc, onSnapshot, updateDoc, getDocs, writeBatch, where } from "firebase/firestore";

// Firebase Imports
import { initializeApp } from "firebase/app";
import { getFirestore, doc as firestoreDoc, onSnapshot as firestoreOnSnapshot, setDoc as firestoreSetDoc, collection as firestoreCollection, getDocs as firestoreGetDocs, deleteDoc as firestoreDeleteDoc } from "firebase/firestore";
import { getAuth, signInAnonymously, onAuthStateChanged } from "firebase/auth";

// Configuration management
const CONFIG_STORAGE_KEY = 'youtube-tv-config';

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
  try {
    const config = { firebaseConfig, apiKey };
    localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(config));
    return true;
  } catch (error) {
    console.error('Error storing config:', error);
    return false;
  }
};

// Get initial configuration
const initialConfig = getStoredConfig();

// Only initialize Firebase if we have stored config (not first visit)
let app, db, auth;
if (localStorage.getItem(CONFIG_STORAGE_KEY)) {
  app = initializeApp(initialConfig.firebaseConfig);
  db = getFirestore(app);
  auth = getAuth(app);
}

// Optional: Emulator support for local testing
if (process.env.NODE_ENV === "development" && process.env.NEXT_PUBLIC_FIREBASE_EMULATOR === "true" && app) {
  import("firebase/firestore").then(({ connectFirestoreEmulator }) => {
    connectFirestoreEmulator(db, "localhost", 8080);
  });
  import("firebase/auth").then(({ connectAuthEmulator }) => {
    connectAuthEmulator(auth, "http://localhost:9099");
  });
}

const initialPlaylists = [
  { name: "Meme Songs", id: "PLV2ewAgCPCq0DVamOw2sQSAVdFVjA6x78", videos: [], groups: { red: {name: 'Red', videos: []}, green: {name: 'Green', videos: []}, pink: {name: 'Pink', videos: []}, yellow: {name: 'Yellow', videos: []} }, starred: [] },
  { name: "Game List", id: "PLyZI3qCmOZ9uamxj6bd3P5oEkmXbu8-RT", videos: [], groups: { red: {name: 'Red', videos: []}, green: {name: 'Green', videos: []}, pink: {name: 'Pink', videos: []}, yellow: {name: 'Yellow', videos: []} }, starred: [] },
  { name: "Minecraft", id: "PLyZI3qCmOZ9tWQIohuuMHJZjruHkDs5gE", videos: [], groups: { red: {name: 'Red', videos: []}, green: {name: 'Green', videos: []}, pink: {name: 'Pink', videos: []}, yellow: {name: 'Yellow', videos: []} }, starred: [] },
  { name: "Gameplay", id: "PLyZI3qCmOZ9sju_zQ0fcc8ND-qIJEB9Ce", videos: [], groups: { red: {name: 'Red', videos: []}, green: {name: 'Green', videos: []}, pink: {name: 'Pink', videos: []}, yellow: {name: 'Yellow', videos: []} }, starred: [] },
  { name: "TF2", id: "PLyZI3qCmOZ9umIkxOGjUMiDLxGtsn6so7", videos: [], groups: { red: {name: 'Red', videos: []}, green: {name: 'Green', videos: []}, pink: {name: 'Pink', videos: []}, yellow: {name: 'Yellow', videos: []} }, starred: [] },
  { name: "Documentary", id: "PLyZI3qCmOZ9tUvdotGRyiKWdFEkkD2xQu", videos: [], groups: { red: {name: 'Red', videos: []}, green: {name: 'Green', videos: []}, pink: {name: 'Pink', videos: []}, yellow: {name: 'Yellow', videos: []} }, starred: [] },
  { name: "Unsorted", id: "_unsorted_", videos: [], groups: { red: {name: 'Red', videos: []}, green: {name: 'Green', videos: []}, pink: {name: 'Pink', videos: []}, yellow: {name: 'Yellow', videos: []} }, starred: [] },
]

const groupColors = {
  red: 'bg-red-500', green: 'bg-green-500', pink: 'bg-pink-500', yellow: 'bg-yellow-500',
}

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
  const [showColoredFolders, setShowColoredFolders] = useState(true);
  const [showPlaylists, setShowPlaylists] = useState(true);
  const [sortMode, setSortMode] = useState('chronological');
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
  const [currentApiKey, setCurrentApiKey] = useState(initialConfig.apiKey);
  const [isFirebaseInitialized, setIsFirebaseInitialized] = useState(!!app);
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);

  const initialVideoLoaded = useRef(false);
  const hasMigratedStarsRef = useRef(false);
  const playlistShuffleOrders = useRef({}); 
  const playlistShufflePositions = useRef({});
  const progressSaveTimer = useRef(null);
  const mainDataSaveTimer = useRef(null);
  const fetchingPlaylists = useRef(new Set()); // Track playlists being fetched
  const isFetchingAnyPlaylist = useRef(false); // Global lock to prevent parallel fetching

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

  const groupRingColors = { red: 'ring-red-500', green: 'ring-green-500', pink: 'ring-pink-500', yellow: 'ring-yellow-500' };
  const groupFillColors = { red: 'text-red-400 fill-red-400', green: 'text-green-400 fill-green-400', pink: 'text-pink-400 fill-pink-400', yellow: 'text-yellow-400 fill-yellow-400' };

  const currentVideoGroupColor = (['red','green','pink','yellow'].find(c => (currentPlaylist.groups[c]?.videos || []).includes(currentVideoId))) || null;
  const activeStarBorderColor = currentVideoGroupColor || selectedStarColor;

  const getVideoGroupColor = (playlist, videoId) => (['red','green','pink','yellow'].find(c => (playlist.groups[c]?.videos || []).includes(videoId))) || null;

  const assignCurrentVideoToColor = (color) => {
    const videoId = currentVideoId;
    if (!videoId || !Object.keys(groupRingColors).includes(color)) return;
    setPlaylists(prev => prev.map((playlist, idx) => {
      if (idx !== currentPlaylistIndex) return playlist;
      const newGroups = { ...playlist.groups };
      Object.keys(groupColors).forEach(c => {
        newGroups[c] = { ...(newGroups[c] || { name: c, videos: [] }), videos: (newGroups[c]?.videos || []).filter(id => id !== videoId) };
      });
      const targetList = newGroups[color]?.videos || [];
      if (!targetList.includes(videoId)) {
        newGroups[color] = { ...(newGroups[color] || { name: color, videos: [] }), videos: [...targetList, videoId] };
      }
      return { ...playlist, groups: newGroups, starred: (playlist.starred || []).filter(id => id !== videoId) };
    }));
  };

  const assignVideoToColor = (playlistIndex, videoId, color) => {
    if (!videoId || !Object.keys(groupRingColors).includes(color)) return;
    setPlaylists(prev => prev.map((playlist, idx) => {
      if (idx !== playlistIndex) return playlist;
      const newGroups = { ...playlist.groups };
      Object.keys(groupColors).forEach(c => {
        newGroups[c] = { ...(newGroups[c] || { name: c, videos: [] }), videos: (newGroups[c]?.videos || []).filter(id => id !== videoId) };
      });
      const targetList = newGroups[color]?.videos || [];
      if (!targetList.includes(videoId)) {
        newGroups[color] = { ...(newGroups[color] || { name: color, videos: [] }), videos: [...targetList, videoId] };
      }
      return { ...playlist, groups: newGroups, starred: (playlist.starred || []).filter(id => id !== videoId) };
    }));
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

        // Test Firebase connection
        const { initializeApp: testInitApp } = await import('firebase/app');
        const { getFirestore } = await import('firebase/firestore');
        const { getAuth } = await import('firebase/auth');
        
        const testApp = testInitApp(testFirebaseConfig);
        const testDb = getFirestore(testApp);
        const testAuth = getAuth(testApp);
        
        // Test Firestore connection
        await testDb._delegate._databaseId;
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

  // Check if configuration exists on app load
  useEffect(() => {
    const stored = localStorage.getItem(CONFIG_STORAGE_KEY);
    if (!stored) {
      setShowConfigModal(true);
      setIsFirebaseInitialized(false);
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

  // Initialize Firebase Authentication
  useEffect(() => {
    if (!auth) return;
    
    onAuthStateChanged(auth, user => {
      if (user) {
        setUserId(user.uid);
      } else {
        signInAnonymously(auth).catch(error => {
          console.error("Firebase anonymous sign-in error:", error);
          alert("Failed to authenticate with Firebase. Please try again.");
        });
      }
    });
  }, [auth]);

  // Load data from Firestore
  useEffect(() => {
    if (!userId || !db) return;

    const docRef = firestoreDoc(db, 'users', userId);
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      let finalPlaylists;
      let finalTabs;

      if (docSnap.exists()) {
        const data = docSnap.data();
        finalPlaylists = data.playlists || initialPlaylists;
        finalTabs = data.playlistTabs || [{ name: 'All', playlistIds: [] }];
        setVideoProgress(data.videoProgress || {});
      } else {
        finalPlaylists = initialPlaylists;
        finalTabs = [{ name: 'All', playlistIds: [] }];
        firestoreSetDoc(docRef, {
          playlists: finalPlaylists,
          playlistTabs: finalTabs,
          videoProgress: {}
        }).catch(error => console.error("Error initializing user data in Firestore:", error));
      }

      if (!finalPlaylists.some(p => p.id === '_unsorted_')) {
        finalPlaylists.push({
            name: "Unsorted", id: "_unsorted_", videos: [],
            groups: { red: {name: 'Red', videos: []}, green: {name: 'Green', videos: []}, pink: {name: 'Pink', videos: []}, yellow: {name: 'Yellow', videos: []} },
            starred: []
        });
      }
      
      setPlaylists(finalPlaylists);
      setPlaylistTabs(finalTabs);

    }, (error) => {
      console.error("Error fetching Firestore data:", error);
      alert("Failed to load data from Firestore. Please check your connection.");
    });

    return () => unsubscribe();
  }, [userId, db]);


  // Load video history from Firestore and set initial video
  useEffect(() => {
    if (!userId || !db) return;

    const historyRef = collection(db, 'users', userId, 'history');
    const q = query(historyRef, orderBy('timestamp', 'desc'), limit(100));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const history = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setVideoHistory(history);

      if (initialVideoLoaded.current || playlists.length === 0 || !playlists.some(p => p.videos.length > 0)) {
        return;
      }
      
      let loadedSuccessfully = false;

      if (history.length > 0) {
        const lastEntry = history[0];
        const playlistIndex = playlists.findIndex(p => p.id === lastEntry.playlistId);
        if (playlistIndex !== -1) {
          const targetPlaylist = playlists[playlistIndex];
          const videoIndex = targetPlaylist.videos.findIndex(v => v.id === lastEntry.videoId);
          if (videoIndex !== -1) {
            const lastFilter = lastEntry.filter || 'all'; 
            if (!playlistShuffleOrders.current[targetPlaylist.id]?.[lastFilter] || playlistShuffleOrders.current[targetPlaylist.id][lastFilter].length !== (lastFilter === 'all' ? targetPlaylist.videos.length : targetPlaylist.groups[lastFilter]?.videos.length || 0)) {
              playlistShuffleOrders.current = {
                ...playlistShuffleOrders.current,
                [targetPlaylist.id]: {
                  ...playlistShuffleOrders.current[targetPlaylist.id],
                  [lastFilter]: generateNewShuffleOrder(targetPlaylist, lastFilter, videoIndex)
                }
              };
            }
            
            const currentShuffleOrder = playlistShuffleOrders.current[targetPlaylist.id][lastFilter];
            const positionInShuffle = currentShuffleOrder.indexOf(videoIndex);

            if (positionInShuffle !== -1) {
              setCurrentPlaylistIndex(playlistIndex);
              setCurrentVideoIndex(videoIndex);
              setActiveShuffleOrder(currentShuffleOrder);
              setCurrentShufflePosition(positionInShuffle);
              setPlaylistFilters(prev => ({ ...prev, [targetPlaylist.id]: lastFilter }));
              playlistShufflePositions.current = {
                ...playlistShufflePositions.current,
                [targetPlaylist.id]: {
                  ...playlistShufflePositions.current[targetPlaylist.id],
                  [lastFilter]: positionInShuffle
                }
              };
              loadedSuccessfully = true;
            }
          }
        }
      }

      if (!loadedSuccessfully) {
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
          
          saveVideoHistory(
            targetPlaylist.videos[randomVideoIndex].id,
            targetPlaylist.videos[randomVideoIndex].title,
            targetPlaylist.id,
            targetPlaylist.name,
            'all'
          );
          loadedSuccessfully = true;
        }
      }
      
      if (loadedSuccessfully) {
        initialVideoLoaded.current = true;
      }

    }, (error) => {
      console.error("Error fetching video history:", error);
      alert("Failed to load video history from Firestore.");
    });

    return () => unsubscribe();
  }, [userId, playlists, db]);

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

  // **OPTIMIZED** Save main structural data (playlists, tabs) with debouncing
  useEffect(() => {
    if (!userId || !initialVideoLoaded.current || !db) return;

    if (mainDataSaveTimer.current) {
      clearTimeout(mainDataSaveTimer.current);
    }

    mainDataSaveTimer.current = setTimeout(() => {
      const userDocRef = firestoreDoc(db, 'users', userId);
      updateDoc(userDocRef, {
        playlists: playlists,
        playlistTabs: playlistTabs
      }).catch(error => console.error("Error saving main data to Firestore:", error));
    }, 1500);

    return () => {
      if (mainDataSaveTimer.current) {
        clearTimeout(mainDataSaveTimer.current);
      }
    };
  }, [playlists, playlistTabs, userId, db]);

  // **OPTIMIZED** Save high-frequency video progress data with debouncing and targeted updates
  useEffect(() => {
      if (!userId || Object.keys(videoProgress).length === 0 || !db) return;

      if (progressSaveTimer.current) {
          clearTimeout(progressSaveTimer.current);
      }

      progressSaveTimer.current = setTimeout(() => {
          const userDocRef = firestoreDoc(db, 'users', userId);
          const updates = {};
          // Create dot notation paths for each updated video progress
          for (const videoId in videoProgress) {
              updates[`videoProgress.${videoId}`] = videoProgress[videoId];
          }
          if (Object.keys(updates).length > 0) {
            updateDoc(userDocRef, updates).catch(error => {
                console.error("Error saving video progress to Firestore:", error);
            });
          }
      }, 2000); // Longer debounce for progress

      return () => {
          if (progressSaveTimer.current) {
              clearTimeout(progressSaveTimer.current);
          }
      };
  }, [videoProgress, userId, db]);

  // Fetch and cache video metadata
  useEffect(() => {
    if (!userId || !currentVideoId || !db) {
      setVideoPublishedYear('');
      setVideoAuthorName('');
      setVideoViewCount('');
      setVideoChannelId('');
      return;
    }

    const fetchVideoMetadata = async () => {
      const videoMetaRef = firestoreDoc(db, 'users', userId, 'videoMetadata', currentVideoId);
      const unsubscribe = onSnapshot(videoMetaRef, (snap) => {
        if (snap.exists()) {
          const meta = snap.data();
          setVideoPublishedYear(meta.publishedYear || '');
          setVideoAuthorName(meta.author || '');
          setVideoViewCount(meta.viewCount || '');
          setVideoChannelId(meta.channelId || '');
          if (!meta.author || !meta.viewCount || !meta.channelId) {
            fetch(`https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics&id=${currentVideoId}&key=${currentApiKey}`)
              .then(res => res.json())
              .then(data => {
                if (data.items && data.items[0]) {
                  const item = data.items[0];
                  const author = item.snippet.channelTitle || '';
                  const views = item.statistics?.viewCount || '';
                  const channelId = item.snippet.channelId || '';
                  if (author || views || channelId) {
                    setVideoAuthorName(author); setVideoViewCount(views); setVideoChannelId(channelId);
                    firestoreSetDoc(videoMetaRef, { author, viewCount: views, channelId }, { merge: true }).catch(err => console.error('Error updating video metadata in Firestore:', err));
                  }
                }
              })
              .catch(() => {});
          }
        } else {
          fetch(`https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics&id=${currentVideoId}&key=${currentApiKey}`)
            .then(res => res.json())
            .then(data => {
              if (data.items && data.items[0]) {
                const item = data.items[0];
                const publishedAt = item.snippet.publishedAt;
                const year = new Date(publishedAt).getFullYear().toString();
                const author = item.snippet.channelTitle || '';
                const views = item.statistics?.viewCount || '';
                const channelId = item.snippet.channelId || '';
                setVideoPublishedYear(year); setVideoAuthorName(author); setVideoViewCount(views); setVideoChannelId(channelId);
                firestoreSetDoc(videoMetaRef, { publishedYear: year, author, viewCount: views, channelId }, { merge: true }).catch(error => console.error("Error caching video metadata in Firestore:", error));
              } else {
                setVideoPublishedYear(''); setVideoAuthorName(''); setVideoViewCount(''); setVideoChannelId('');
              }
            })
            .catch(error => {
              console.error("Error fetching video metadata:", error);
              setVideoPublishedYear(''); setVideoAuthorName(''); setVideoViewCount(''); setVideoChannelId('');
            });
        }
      });
      return () => unsubscribe();
    };

    fetchVideoMetadata();
  }, [currentVideoId, userId, db]);

  // Reset visibleCount when videoFilter or playlist changes, but restore from scroll memory
  useEffect(() => {
    const memoryKey = `${sideMenuPlaylistIndex}_${videoFilter}`;
    const savedCount = scrollMemory[memoryKey];
    setVisibleCount(savedCount || 12);
    setHistoryVisibleCount(12);
  }, [videoFilter, sideMenuPlaylistIndex, scrollMemory]);

  // Save video history
  const saveVideoHistory = async (videoId, title, playlistId, playlistName, filter = 'all') => {
    if (!userId || !videoId || !db) return;

    const historyRef = collection(db, 'users', userId, 'history');
    const historyEntry = { videoId, title, playlistId, playlistName, filter, timestamp: new Date().toISOString() };
    const existingEntry = videoHistory.find(entry => entry.videoId === videoId);
    if (existingEntry) {
      await firestoreSetDoc(firestoreDoc(db, 'users', userId, 'history', existingEntry.id), { ...existingEntry, timestamp: historyEntry.timestamp, filter });
      return;
    }

    if (videoHistory.length >= 100) {
      const oldestEntry = videoHistory[videoHistory.length - 1];
      await deleteDoc(firestoreDoc(db, 'users', userId, 'history', oldestEntry.id));
    }

    const newEntryRef = firestoreDoc(historyRef);
    await firestoreSetDoc(newEntryRef, historyEntry);
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
    else if (Object.keys(groupColors).includes(filter)) videoIndices = targetPlaylist.videos.filter(v => targetPlaylist.groups[filter]?.videos.includes(v.id)).map(v => targetPlaylist.videos.indexOf(v));
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
    if (showSideMenu === 'videos' && Object.keys(groupColors).includes(videoFilter)) {
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
    const availableColorFilters = Object.keys(groupColors).filter(color => (currentPlaylist.groups[color]?.videos?.length || 0) > 0);
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
      const res = await fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=5&q=${encodeURIComponent(searchQuery)}&key=${currentApiKey}`);
      const data = await res.json();
      if (data.items) {
        const videos = data.items.map(item => ({ id: item.id.videoId, title: item.snippet.title, duration: 0 }));
        const videoIds = videos.map(v => v.id).join(',');
        const durRes = await fetch(`https://www.googleapis.com/youtube/v3/videos?part=contentDetails&id=${videoIds}&key=${currentApiKey}`);
        const durData = await durRes.json();
        const durationsMap = {};
        durData.items.forEach(item => { durationsMap[item.id] = parseISO8601Duration(item.contentDetails.duration); });
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

  const getSideMenuVideos = (playlist) => {
    // Use the same logic as the navigation system
    let baseListIndices;
    if (Object.keys(groupColors).includes(videoFilter)) {
      baseListIndices = playlistShuffleOrders.current[playlist.id]?.[videoFilter] || generateNewShuffleOrder(playlist, videoFilter);
    } else {
      baseListIndices = playlistShuffleOrders.current[playlist.id]?.['all'] || generateNewShuffleOrder(playlist, 'all');
    }
    
    let baseList = baseListIndices.map(index => playlist.videos[index]).filter(Boolean);
    
    // Apply filter logic
    if (videoFilter === 'unsorted') {
    const allVideoIdsInGroups = Object.values(playlist.groups || {}).flatMap(g => g.videos || []);
      baseList = baseList.filter(v => !allVideoIdsInGroups.includes(v.id));
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
        
        // Update Firebase with cleaned data
        if (userId && db) {
          const userRef = firestoreDoc(db, 'users', userId);
          
          // Update only playlists, preserve everything else using merge
          await firestoreSetDoc(userRef, {
            playlists: cleanedPlaylists
          }, { merge: true });
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
    if (!userId || !db) return;
    
    // Process playlists sequentially to prevent parallel fetching
    const processPlaylists = async () => {
      for (const [index, playlist] of playlists.entries()) {
      if (playlist.videos.length === 0 && playlist.id && playlist.id !== "_unsorted_") {
          await fetchAllVideos(playlist.id, index);
      } else if (playlist.videos.length > 0) {
        const filters = ['all', 'red', 'green', 'pink', 'yellow'];
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
    };
    
    processPlaylists();
  }, [playlists, userId, currentPlaylistIndex, chronologicalFilter, db]);

  // **OPTIMIZED** Fetches all videos and their details, using a permanent cache to minimize API calls
  const fetchAllVideos = async (playlistId, playlistIndex) => {
    // Prevent parallel fetching
    if (isFetchingAnyPlaylist.current || fetchingPlaylists.current.has(playlistId) || !db) {
      console.log('🚫 Skipping fetch for', playlistId, '- already in progress or no db');
      return;
    }
    
    isFetchingAnyPlaylist.current = true;
    fetchingPlaylists.current.add(playlistId);
    console.log('🚀 Starting fetch for playlist:', playlistId);
    
    let allVideoSnippets = [], nextPageToken = "";
    try {
      // 1. Fetch all video IDs and titles from the playlist
      do {
        const res = await fetch(`https://www.googleapis.com/youtube/v3/playlistItems?part=snippet,contentDetails&maxResults=50&playlistId=${playlistId}&key=${currentApiKey}${nextPageToken ? `&pageToken=${nextPageToken}` : ""}`);
        const data = await res.json();
        if (data.items) {
          allVideoSnippets.push(...data.items.filter(item => item.snippet.title !== "Deleted video" && item.snippet.title !== "Private video").map(item => ({ id: item.snippet.resourceId.videoId, title: item.snippet.title })));
          nextPageToken = data.nextPageToken || "";
        } else { nextPageToken = ""; }
      } while (nextPageToken);

      // 2. Check the cache for existing video details
      const videoIds = allVideoSnippets.map(v => v.id);
      const cachedVideos = {};
      const idsToFetch = [];
      const metadataCacheRef = collection(db, 'users', userId, 'videoMetadata');
      
      // Firestore 'in' queries are limited to 30 items, so we batch our checks
      for (let i = 0; i < videoIds.length; i += 30) {
        const batchIds = videoIds.slice(i, i + 30);
        if (batchIds.length > 0) {
          const q = query(metadataCacheRef, where('__name__', 'in', batchIds));
          const querySnapshot = await getDocs(q);
          querySnapshot.forEach(doc => {
            cachedVideos[doc.id] = doc.data();
          });
        }
      }
      
      videoIds.forEach(id => {
        if (!cachedVideos[id]) {
          idsToFetch.push(id);
        }
      });

      // 3. Fetch details ONLY for videos not in the cache
      if (idsToFetch.length > 0) {
        for (let i = 0; i < idsToFetch.length; i += 50) {
          const batchIds = idsToFetch.slice(i, i + 50).join(',');
          const durRes = await fetch(`https://www.googleapis.com/youtube/v3/videos?part=contentDetails,snippet,statistics&id=${batchIds}&key=${currentApiKey}`);
        const durData = await durRes.json();
          const batch = writeBatch(db);
          durData.items.forEach(item => {
            const videoData = {
              duration: parseISO8601Duration(item.contentDetails.duration),
              publishedYear: new Date(item.snippet.publishedAt).getFullYear().toString(),
              author: item.snippet.channelTitle,
              viewCount: item.statistics.viewCount,
              channelId: item.snippet.channelId
            };
            cachedVideos[item.id] = videoData;
            const docRef = doc(metadataCacheRef, item.id);
            batch.set(docRef, videoData);
          });
          await batch.commit();
        }
      }

      // 4. Combine titles with cached/fetched details
      const allVideos = allVideoSnippets.map(snippet => ({
        ...snippet,
        duration: cachedVideos[snippet.id]?.duration || 1,
      }));

      setPlaylists(prev => {
        const newPlaylists = [...prev];
        const playlist = newPlaylists[playlistIndex];
        if (playlist) {
          playlist.videos = allVideos;
          const filters = ['all', 'red', 'green', 'pink', 'yellow'];
          const newOrders = {};
          filters.forEach(filter => { newOrders[filter] = generateNewShuffleOrder(playlist, filter); });
          playlistShuffleOrders.current = { ...playlistShuffleOrders.current, [playlist.id]: newOrders };
        }
        return newPlaylists;
      });
    } catch (error) { 
      console.error("Error fetching playlist videos/details:", error); 
      alert("Failed to fetch playlist videos."); 
    } finally {
      // Always clean up the fetch locks
      isFetchingAnyPlaylist.current = false;
      fetchingPlaylists.current.delete(playlistId);
      console.log('✅ Completed fetch for playlist:', playlistId);
    }
  };

  const handleAddPlaylist = async () => {
    if (!newPlaylistId || !userId) return;
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
        const newPlaylist = { name, id: newPlaylistId, videos: [], groups: { red: {name: 'Red', videos: []}, green: {name: 'Green', videos: []}, pink: {name: 'Pink', videos: []}, yellow: {name: 'Yellow', videos: []} }, starred: [] };
        setPlaylists(prev => {
          const newPlaylists = [...prev];
          const unsortedIndex = newPlaylists.findIndex(p => p.id === '_unsorted_');
          if (unsortedIndex > -1) newPlaylists.splice(unsortedIndex, 0, newPlaylist);
          else newPlaylists.push(newPlaylist);
          const newPlaylistIndex = newPlaylists.findIndex(p => p.id === newPlaylistId);
          fetchAllVideos(newPlaylistId, newPlaylistIndex);
          return newPlaylists;
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
      
      // Delete from Firebase
      if (userId && db) {
        await firestoreDeleteDoc(firestoreDoc(db, 'users', userId, 'playlists', playlistId));
        console.log('Deleted from Firebase');
      }
      
      console.log(`Deleted playlist: ${playlistId}`);
    } catch (error) {
      console.error('Error deleting playlist:', error);
    }
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
      
      // Save to Firebase
      if (userId && db) {
        await firestoreSetDoc(firestoreDoc(db, 'users', userId, 'playlists', parentPlaylist.id), {
          ...parentPlaylist,
          videos: updatedVideos,
          groups: updatedGroups
        });
        console.log('Saved to Firebase');
      }
      
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
      setPlaylists(prev => prev.map(p => 
        p.id === targetPlaylistId 
          ? { ...p, videos: updatedVideos }
          : p
      ));
      
      // Save to Firebase
      if (userId && db) {
        await firestoreSetDoc(firestoreDoc(db, 'users', userId, 'playlists', targetPlaylistId), {
          ...targetPlaylist,
          videos: updatedVideos
        });
        console.log('Saved merged playlist to Firebase');
      }
      
      alert(`Successfully merged ${videosToAdd.length} videos from "${coloredFolder.name}" into "${targetPlaylist.name}". ${coloredFolder.videos.length - videosToAdd.length} duplicates were skipped.`);
      
      console.log(`Merged ${videosToAdd.length} videos from colored folder to playlist`);
    } catch (error) {
      console.error('Error merging colored folder to playlist:', error);
      alert('Error merging colored folder. Please try again.');
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

      // Save to Firebase
      if (userId && db) {
        await firestoreSetDoc(firestoreDoc(db, 'users', userId, 'playlists', newPlaylist.id), {
          ...newPlaylist,
          createdAt: new Date().toISOString()
        });
        console.log('Saved to Firebase');
      }

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
                  To get started, you'll need to provide your own API keys. This ensures your data stays private and you have full control over your usage quotas.
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
                  <button className="bg-blue-500 text-white p-2 rounded" onClick={handleAddPlaylist} disabled={!userId}>Add Playlist</button>
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
                    
                    // Apply show playlists toggle
                    if (!showPlaylists) {
                      filteredPlaylists = filteredPlaylists.filter(p => !p.id.includes('_'));
                    }
                    
                    // Apply show colored folders toggle
                    if (!showColoredFolders) {
                      filteredPlaylists = filteredPlaylists.filter(p => !p.id.includes('_'));
                    }
                    
                    // Add colored folders as virtual playlists (only in "All" tab)
                    if (showColoredFolders && activePlaylistTab === 0) {
                      const coloredFolders = [];
                      filteredPlaylists.forEach(playlist => {
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
                      filteredPlaylists = [...filteredPlaylists, ...coloredFolders];
                    }
                    
                    return filteredPlaylists;
                  })().map((playlist, index) => {
                       const originalIndex = playlists.findIndex(p => p.id === playlist.id);
                       return (
                        <div key={playlist.id} className={`text-left group relative ${originalIndex === currentPlaylistIndex ? 'ring-2 ring-blue-500 rounded-lg' : ''}`}>
                          <div className={`aspect-video bg-gray-800 rounded-lg overflow-hidden relative ${originalIndex === currentPlaylistIndex ? 'outline-none' : ''} ${playlist.isColoredFolder && !playlist.isConvertedFromColoredFolder ? `border-2 ${groupColors[playlist.color]}` : ''}`}>
                        <img src={playlist.videos[0]?.id ? `https://img.youtube.com/vi/${playlist.videos[0].id}/mqdefault.jpg` : '/no-thumb.jpg'} alt={playlist.name} className="w-full h-full object-cover" loading="lazy" />
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 p-2">
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
                              {playlist.isColoredFolder && !playlist.isConvertedFromColoredFolder && (
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
                              {playlist.isColoredFolder && !playlist.isConvertedFromColoredFolder && (
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
                              {playlist.isColoredFolder && !playlist.isConvertedFromColoredFolder && (
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
                              {!playlist.isColoredFolder && playlist.id !== '_unsorted_' && (
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
                              )}
                              {activePlaylistTab !== 0 && !playlist.isColoredFolder && (
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
                          <h3 className={`mt-2 truncate ${originalIndex === currentPlaylistIndex ? 'text-blue-400 font-bold' : 'text-white font-semibold'}`}>
                            {playlist.name}
                            {playlist.isColoredFolder && !playlist.isConvertedFromColoredFolder && (
                              <span className={`ml-2 inline-block w-3 h-3 rounded-full ${groupColors[playlist.color]}`}></span>
                            )}
                          </h3>
                          <p className="text-white/60 text-sm">
                            {playlist.videos.length} videos
                            {playlist.isColoredFolder && !playlist.isConvertedFromColoredFolder && (
                              <span className="ml-2 text-white/40">from {playlist.parentPlaylist.name}</span>
                            )}
                          </p>
                    </div>
                      )
                  })}
                  {activePlaylistTab !== 0 && (
                     <button onClick={() => setShowAddPlaylistModal(true)} className="aspect-video bg-white/5 rounded-lg flex items-center justify-center text-white/30 hover:bg-white/10 hover:text-white transition-colors">
                        <Plus size={48} />
                     </button>
                  )}
                </div>

                {showAddPlaylistModal && (
                  <div className="fixed inset-0 bg-black/80 z-40 flex items-center justify-center p-4">
                    <div className="bg-gray-900 rounded-lg p-6 max-w-4xl w-full max-h-[80vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-4">
                           <h2 className="text-xl font-bold text-white">Add Playlist to "{playlistTabs[viewingPlaylistTab].name}"</h2>
                           <button onClick={() => setShowAddPlaylistModal(false)} className="p-2 rounded-full hover:bg-white/10"><X size={20} /></button>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                          {playlists.filter(p => p.id !== '_unsorted_' && !playlistTabs[viewingPlaylistTab].playlistIds.includes(p.id)).map(playlist => (
                             <button key={playlist.id} onClick={() => addPlaylistToTab(playlist.id)} className="text-left group">
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
                          {Object.keys(groupColors).includes(videoFilter) && (<button onClick={() => { setRenamingGroup(videoFilter); setGroupRenameInput(displayedPlaylist.groups[videoFilter].name) }} className="text-white/50 hover:text-white"><Pencil size={18} /></button>)}
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
                      {Object.entries(groupColors).map(([color, className]) => (
                        <div key={color} onDragOver={e => e.preventDefault()} onDrop={() => handleDrop(color, draggingVideoId)} onClick={() => setVideoFilter(color)} className={`w-8 h-8 rounded-full cursor-pointer flex items-center justify-center text-white font-bold text-xs ${className} ${videoFilter === color ? 'ring-2 ring-white' : ''}`}>
                          {(displayedPlaylist.groups[color]?.videos || []).length > 0 && <span>{(displayedPlaylist.groups[color]?.videos || []).length}</span>}
                        </div>
                      ))}
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
                          <button onClick={() => selectVideoFromMenu(originalIndex, displayedPlaylist.id)} onContextMenu={(e) => handleVideoContextMenu(e, video)} className={`w-full text-left ${currentVideoId === video.id && chronologicalFilter === videoFilter ? 'ring-2 ring-blue-500 rounded-lg' : ''}`}>
                            <div className="aspect-video bg-gray-800 rounded-lg overflow-hidden relative">
                              <img src={video.id ? `https://img.youtube.com/vi/${video.id}/mqdefault.jpg` : '/no-thumb.jpg'} alt={video.title} className="w-full h-full object-cover" loading="lazy" />
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
                                  return (
                                    <div className={`p-1.5 rounded-full bg-black/50 hover:bg-black ring-2 ${groupRingColors[ringColor]} cursor-pointer`}
                                         onClick={(e) => { e.preventDefault(); e.stopPropagation(); assignVideoToColor(sideMenuPlaylistIndex, video.id, selectedStarColor); }}
                                         onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); if (chronologicalFilter === 'all') { setSelectedStarColor(ringColor); } }}
                                         title={vColor ? `In ${vColor}` : `Send to ${selectedStarColor}`}>
                                      <Star size={14} className={`${vColor ? groupFillColors[vColor] : 'text-white'}`} />
                                    </div>
                                  );
                                })()}
                                {(showCardStarColorMenu && hoveredStarVideoId === video.id) && (
                                  <div className="absolute right-0 mt-2 bg-black/90 backdrop-blur-sm border border-white/10 rounded-lg p-2 flex gap-2 z-50"
                                       onMouseEnter={() => { if (cardStarLeaveTimer.current) { clearTimeout(cardStarLeaveTimer.current); cardStarLeaveTimer.current = null; } }}
                                       onMouseLeave={() => { cardStarLeaveTimer.current = setTimeout(() => { setShowCardStarColorMenu(false); setHoveredStarVideoId(null); }, 300); }}>
                                    {(['red','green','pink','yellow']).map(color => (
                                      <button key={color}
                                              onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); if (chronologicalFilter === 'all') { setSelectedStarColor(color); } }}
                                              onClick={(e) => { e.preventDefault(); e.stopPropagation(); assignVideoToColor(sideMenuPlaylistIndex, video.id, color); }}
                                              className={`w-7 h-7 rounded-full ring-2 ${groupRingColors[color]} ${groupColors[color]} ${selectedStarColor === color ? 'scale-110' : ''}`}
                                              title={`${color} (Left: assign, Right: set default)`} />
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                            <h3 className="text-white font-semibold mt-2 text-sm truncate">{video.title}</h3>
                          </button>
                          <div className="absolute top-2 left-2 px-2 py-1 rounded-full bg-black/50 text-white text-xs font-bold">{formatMinutes(duration)}</div>
                          {Object.keys(groupColors).includes(videoFilter) && (<button onClick={() => handleRemoveFromGroup(video.id)} className="absolute bottom-2 right-2 p-1.5 rounded-full bg-black/50 hover:bg-red-500 opacity-0 group-hover:opacity-100"><Trash2 size={14} /></button>)}
                          <button 
                            onClick={(e) => handleVideoContextMenu(e, video)}
                            className="absolute bottom-2 right-2 p-1.5 rounded-full bg-black/50 hover:bg-white/20 opacity-0 group-hover:opacity-100"
                            style={{ right: Object.keys(groupColors).includes(videoFilter) ? '3.5rem' : '0.5rem' }}
                          >
                            <div className="flex flex-col gap-0.5">
                              <div className="w-1 h-1 bg-white rounded-full"></div>
                              <div className="w-1 h-1 bg-white rounded-full"></div>
                              <div className="w-1 h-1 bg-white rounded-full"></div>
                            </div>
                          </button>
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
          </div>
        </div>
      )}

      {/* Send to Playlist Modal */}
      {showSendToPlaylistModal && sendToPlaylistVideo && (
        <div className="fixed inset-0 bg-black/80 z-40 flex items-center justify-center p-4">
          <div className="bg-gray-900 rounded-lg p-6 max-w-2xl w-full">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-white">{sendToPlaylistAction === 'move' ? 'Move' : 'Copy'} "{sendToPlaylistVideo.title}" to Playlist</h2>
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
                  {(['red','green','pink','yellow']).map(color => (
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
              <h2 className="text-xl font-bold text-white">Merge "{mergeColoredFolder.name}" into Playlist</h2>
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

    </div>
  )
}