const fs = require('fs');
const path = require('path');

// Your initialPlaylists (from page.jsx)
const initialPlaylists = [
  { name: "Meme Songs", id: "PLV2ewAgCPCq0DVamOw2sQSAVdFVjA6x78", videos: [], savedShuffles: {}, groups: { red: {name: 'Red', videos: []}, green: {name: 'Green', videos: []}, pink: {name: 'Pink', videos: []}, yellow: {name: 'Yellow', videos: []} }, starred: [] },
  { name: "Game List", id: "PLyZI3qCmOZ9uamxj6bd3P5oEkmXbu8-RT", videos: [], savedShuffles: {}, groups: { red: {name: 'Red', videos: []}, green: {name: 'Green', videos: []}, pink: {name: 'Pink', videos: []}, yellow: {name: 'Yellow', videos: []} }, starred: [] },
  { name: "Minecraft", id: "PLyZI3qCmOZ9tWQIohuuMHJZjruHkDs5gE", videos: [], savedShuffles: {}, groups: { red: {name: 'Red', videos: []}, green: {name: 'Green', videos: []}, pink: {name: 'Pink', videos: []}, yellow: {name: 'Yellow', videos: []} }, starred: [] },
  { name: "Gameplay", id: "PLyZI3qCmOZ9sju_zQ0fcc8ND-qIJEB9Ce", videos: [], savedShuffles: {}, groups: { red: {name: 'Red', videos: []}, green: {name: 'Green', videos: []}, pink: {name: 'Pink', videos: []}, yellow: {name: 'Yellow', videos: []} }, starred: [] },
  { name: "TF2", id: "PLyZI3qCmOZ9umIkxOGjUMiDLxGtsn6so7", videos: [], savedShuffles: {}, groups: { red: {name: 'Red', videos: []}, green: {name: 'Green', videos: []}, pink: {name: 'Pink', videos: []}, yellow: {name: 'Yellow', videos: []} }, starred: [] },
  { name: "Documentary", id: "PLyZI3qCmOZ9tUvdotGRyiKWdFEkkD2xQu", videos: [], savedShuffles: {}, groups: { red: {name: 'Red', videos: []}, green: {name: 'Green', videos: []}, pink: {name: 'Pink', videos: []}, yellow: {name: 'Yellow', videos: []} }, starred: [] },
];

const API_URL = "http://localhost:3001";

const loadData = async () => {
  try {
    console.log('🚀 Starting loadData debug...');
    let savedPlaylists = [];
    let savedLastPositions = {};
    let savedLastFilters = {};
    try {
      const [playlistsRes, positionsRes, filtersRes] = await Promise.all([
        fetch(`${API_URL}/playlists`),
        fetch(`${API_URL}/lastChronologicalPositions`),
        fetch(`${API_URL}/lastActiveFilters`)
      ]);
      savedPlaylists = await playlistsRes.json();
      savedLastPositions = await positionsRes.json();
      savedLastFilters = await filtersRes.json();
      console.log('📥 Raw fetch from /playlists:', JSON.stringify(savedPlaylists, null, 2)); // Full dump
      console.log('📥 Loaded playlists count & sample groups:', savedPlaylists.length, savedPlaylists[0]?.groups?.red?.videos?.length || 0); // Nests peek
    } catch (fetchError) {
      console.log('⚠️ Server not up yet—skipping fetch, seeding fresh. (Error:', fetchError.message, ')');
    }

    const loadedPlaylists = savedPlaylists.length > 0 ? [...savedPlaylists] : initialPlaylists; // Deep copy demo
    console.log('📥 Deep copy sample (Meme Songs starred):', loadedPlaylists[0]?.starred?.length || 0);

    // Write to db.json (seed/merge)
    let db = { playlists: loadedPlaylists, lastChronologicalPositions: savedLastPositions, lastActiveFilters: savedLastFilters };
    fs.writeFileSync(path.join(__dirname, 'db.json'), JSON.stringify(db, null, 2));
    console.log('💾 db.json seeded/updated! Check http://localhost:3001/playlists after starting server.');

    // Debug dump
    fs.writeFileSync(path.join(__dirname, 'debug-load.json'), JSON.stringify(db, null, 2));
    console.log('💾 Debug dump saved to debug-load.json.');
  } catch (error) {
    console.error("Error in loadData:", error);
  }
};

// Run it
loadData();