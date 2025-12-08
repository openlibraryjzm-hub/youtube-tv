const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const os = require('os');

// Get database path - use user's AppData directory in production, project root in dev
function getDatabasePath() {
  // Check if DATABASE_PATH environment variable is set (set by Electron)
  if (process.env.DATABASE_PATH) {
    return process.env.DATABASE_PATH;
  }
  
  // Check if we're in a packaged Electron app
  // In Electron, process.resourcesPath exists when packaged
  // Also check for app.isPackaged (Electron property) or NODE_ENV
  const isPackaged = process.resourcesPath || process.env.ELECTRON_IS_PACKAGED === 'true' || process.env.NODE_ENV === 'production';
  
  if (isPackaged) {
    // Electron packaged app - use user's AppData directory
    let userDataPath;
    if (process.platform === 'win32') {
      userDataPath = path.join(os.homedir(), 'AppData', 'Roaming', 'youtube-tv');
    } else if (process.platform === 'darwin') {
      userDataPath = path.join(os.homedir(), 'Library', 'Application Support', 'youtube-tv');
    } else {
      userDataPath = path.join(os.homedir(), '.config', 'youtube-tv');
    }
    
    // Ensure directory exists
    if (!fs.existsSync(userDataPath)) {
      fs.mkdirSync(userDataPath, { recursive: true });
    }
    
    return path.join(userDataPath, 'youtube-tv.db');
  }
  
  // Development or Next.js server - use project root
  return path.join(process.cwd(), 'youtube-tv.db');
}

// Database file path
const DB_PATH = getDatabasePath();

// Initialize database connection
let db = null;

function getDatabase() {
  if (db) {
    return db;
  }

  // Log database path for debugging
  console.log('Initializing database at:', DB_PATH);
  console.log('DATABASE_PATH env:', process.env.DATABASE_PATH || 'not set');
  console.log('Is packaged:', !!(process.resourcesPath || process.env.ELECTRON_IS_PACKAGED === 'true'));

  // Create database file if it doesn't exist
  try {
    db = new Database(DB_PATH);
  } catch (error) {
    console.error('Failed to open database:', error);
    console.error('Database path was:', DB_PATH);
    throw error;
  }
  
  // Enable WAL mode for better concurrent access (reads don't block writes)
  db.pragma('journal_mode = WAL');
  
  // Enable foreign keys
  db.pragma('foreign_keys = ON');
  
  // Optimize for performance
  db.pragma('synchronous = NORMAL'); // Faster than FULL, still safe
  db.pragma('cache_size = -64000'); // 64MB cache (negative = KB)
  
  // Initialize schema
  initializeSchema(db);
  
  // Load default channels on first run
  initializeDefaultChannels(db);
  
  return db;
}

function initializeSchema(database) {
  // Users table - stores user-specific settings
  database.exec(`
    CREATE TABLE IF NOT EXISTS users (
      user_id TEXT PRIMARY KEY,
      custom_colors TEXT, -- JSON string
      color_order TEXT, -- JSON string
      playlist_tabs TEXT, -- JSON string
      video_progress TEXT, -- JSON string
      created_at INTEGER DEFAULT (strftime('%s', 'now')),
      updated_at INTEGER DEFAULT (strftime('%s', 'now'))
    )
  `);

  // Playlists table - stores all playlists
  database.exec(`
    CREATE TABLE IF NOT EXISTS playlists (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      playlist_id TEXT NOT NULL, -- The actual playlist ID (YouTube PL* or local ID)
      name TEXT NOT NULL,
      videos TEXT NOT NULL, -- JSON string array of video IDs
      groups TEXT, -- JSON string of colored folders
      starred TEXT, -- JSON string array of starred video IDs
      is_default INTEGER DEFAULT 0, -- 1 if from default-channels.json
      can_delete INTEGER DEFAULT 1, -- 0 if default channel
      category TEXT,
      description TEXT,
      thumbnail TEXT,
      is_converted_from_colored_folder INTEGER DEFAULT 0,
      representative_video_id TEXT,
      created_at INTEGER DEFAULT (strftime('%s', 'now')),
      updated_at INTEGER DEFAULT (strftime('%s', 'now')),
      UNIQUE(user_id, playlist_id),
      FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
    )
  `);

  // Create indexes for performance
  database.exec(`
    CREATE INDEX IF NOT EXISTS idx_playlists_user_id ON playlists(user_id);
    CREATE INDEX IF NOT EXISTS idx_playlists_playlist_id ON playlists(playlist_id);
  `);
}

function initializeDefaultChannels(database) {
  // Check if defaults already loaded (any user has default playlists)
  const hasDefaults = database.prepare(
    'SELECT COUNT(*) as count FROM playlists WHERE is_default = 1'
  ).get();

  if (hasDefaults.count > 0) {
    console.log('✅ Default channels already loaded');
    return;
  }

  // Load default-channels.json
  const defaultChannelsPath = path.join(process.cwd(), 'default-channels.json');
  
  if (!fs.existsSync(defaultChannelsPath)) {
    console.log('⚠️  default-channels.json not found, skipping default channel initialization');
    return;
  }

  try {
    const defaultData = JSON.parse(fs.readFileSync(defaultChannelsPath, 'utf8'));
    console.log('📦 Loading default channels from default-channels.json...');

    // Create a default user record first (required for foreign key constraint)
    database.prepare(`
      INSERT OR IGNORE INTO users (user_id, custom_colors, color_order, playlist_tabs, video_progress)
      VALUES (?, ?, ?, ?, ?)
    `).run(
      'default',
      JSON.stringify(defaultData.customColors || {}),
      JSON.stringify(defaultData.colorOrder || []),
      JSON.stringify(defaultData.playlistTabs || [{ name: 'All', playlistIds: [] }]),
      JSON.stringify(defaultData.videoProgress || {})
    );

    // The default data structure has: customColors, colorOrder, playlistTabs, playlists, videoProgress
    // We'll store the playlists, but customColors, colorOrder, playlistTabs will be set per-user on first load
    
    const insertPlaylist = database.prepare(`
      INSERT INTO playlists (
        user_id, playlist_id, name, videos, groups, starred, is_default, can_delete,
        category, description, thumbnail, is_converted_from_colored_folder, representative_video_id
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertTransaction = database.transaction((playlists) => {
      for (const playlist of playlists) {
        insertPlaylist.run(
          'default', // Special user_id for default channels
          playlist.id,
          playlist.name,
          JSON.stringify(playlist.videos || []),
          JSON.stringify(playlist.groups || {}),
          JSON.stringify(playlist.starred || []),
          1, // is_default = true
          0, // can_delete = false (defaults can't be deleted)
          playlist.category || null,
          playlist.description || null,
          playlist.thumbnail || null,
          playlist.isConvertedFromColoredFolder ? 1 : 0,
          playlist.representativeVideoId || null
        );
      }
    });

    insertTransaction(defaultData.playlists || []);
    console.log(`✅ Loaded ${defaultData.playlists?.length || 0} default channels`);
  } catch (error) {
    console.error('❌ Error loading default channels:', error);
  }
}

// Close database connection (for cleanup)
function closeDatabase() {
  if (db) {
    db.close();
    db = null;
  }
}

module.exports = {
  getDatabase,
  closeDatabase,
  DB_PATH
};

