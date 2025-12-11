use rusqlite::{Connection, Result, params};
use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use std::sync::OnceLock;
use std::fs;

#[derive(Serialize, Deserialize, Debug)]
pub struct UserData {
    pub playlists: Vec<Playlist>,
    #[serde(rename = "playlistTabs")]
    pub playlist_tabs: Vec<PlaylistTab>,
    #[serde(rename = "customColors")]
    pub custom_colors: serde_json::Value,
    #[serde(rename = "colorOrder")]
    pub color_order: Vec<String>,
    #[serde(rename = "videoProgress", default = "default_video_progress")]
    pub video_progress: serde_json::Value,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct Playlist {
    pub id: String,
    pub name: String,
    pub videos: Vec<String>,
    pub groups: serde_json::Value,
    pub starred: Vec<String>,
    pub category: Option<String>,
    pub description: Option<String>,
    pub thumbnail: Option<String>,
    #[serde(rename = "isConvertedFromColoredFolder", default = "default_false")]
    pub is_converted_from_colored_folder: bool,
    #[serde(rename = "representativeVideoId", default)]
    pub representative_video_id: Option<String>,
}

fn default_false() -> bool {
    false
}

fn default_video_progress() -> serde_json::Value {
    serde_json::json!({})
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct PlaylistTab {
    pub name: String,
    #[serde(rename = "playlistIds")]
    pub playlist_ids: Vec<String>,
}

static DB_PATH: OnceLock<PathBuf> = OnceLock::new();
static RESOURCE_DIR: OnceLock<Option<PathBuf>> = OnceLock::new();

pub fn set_resource_dir(dir: Option<PathBuf>) {
    let _ = RESOURCE_DIR.set(dir);
}

fn get_db_path() -> Result<PathBuf, String> {
    if let Some(path) = DB_PATH.get() {
        return Ok(path.clone());
    }
    
    // Check for DATABASE_PATH environment variable first
    if let Ok(path) = std::env::var("DATABASE_PATH") {
        let pb = PathBuf::from(path);
        let _ = DB_PATH.set(pb.clone());
        return Ok(pb);
    }

    // Use user's AppData directory
    let mut db_path = dirs::data_dir()
        .ok_or_else(|| "Could not find data directory".to_string())?;
    db_path.push("YouTube TV");
    
    // Create directory if it doesn't exist
    std::fs::create_dir_all(&db_path)
        .map_err(|e| format!("Could not create data directory: {}", e))?;
    
    db_path.push("youtube-tv.db");
    
    // Verify we can write to the directory
    let test_file = db_path.parent().unwrap().join(".write_test");
    if let Err(e) = std::fs::write(&test_file, b"test") {
        eprintln!("⚠️ Warning: Cannot write to database directory: {}", e);
    } else {
        let _ = std::fs::remove_file(&test_file);
    }
    
    let _ = DB_PATH.set(db_path.clone());
    eprintln!("📁 Database path: {}", db_path.display());
    Ok(db_path)
}

fn get_connection() -> Result<Connection> {
    let db_path = get_db_path().map_err(|e| {
        eprintln!("❌ Failed to get database path: {}", e);
        rusqlite::Error::SqliteFailure(
            rusqlite::ffi::Error::new(rusqlite::ffi::SQLITE_CANTOPEN),
            Some(format!("Database path error: {}", e))
        )
    })?;
    
    eprintln!("🔌 Opening database connection to: {}", db_path.display());
    
    // Always create a new connection (SQLite handles concurrency with WAL mode)
    let conn = Connection::open(&db_path).map_err(|e| {
        eprintln!("❌ Failed to open database at {}: {}", db_path.display(), e);
        e
    })?;
    
    // Enable WAL mode for better concurrency (PRAGMA journal_mode returns a value)
    let _: String = conn.query_row("PRAGMA journal_mode = WAL", [], |row| row.get(0))?;
    conn.execute("PRAGMA foreign_keys = ON", [])?;
    conn.execute("PRAGMA synchronous = NORMAL", [])?;
    conn.execute("PRAGMA cache_size = -64000", [])?;
    
    // Initialize schema (idempotent)
    initialize_schema(&conn)?;
    
    // Load default channels on first run
    initialize_default_channels(&conn)?;
    
    Ok(conn)
}

fn initialize_schema(conn: &Connection) -> Result<()> {
    conn.execute(
        "CREATE TABLE IF NOT EXISTS users (
            user_id TEXT PRIMARY KEY,
            custom_colors TEXT,
            color_order TEXT,
            playlist_tabs TEXT,
            video_progress TEXT,
            created_at INTEGER DEFAULT (strftime('%s', 'now')),
            updated_at INTEGER DEFAULT (strftime('%s', 'now'))
        )",
        [],
    )?;

    conn.execute(
        "CREATE TABLE IF NOT EXISTS playlists (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT NOT NULL,
            playlist_id TEXT NOT NULL,
            name TEXT NOT NULL,
            videos TEXT NOT NULL,
            groups TEXT,
            starred TEXT,
            is_default INTEGER DEFAULT 0,
            can_delete INTEGER DEFAULT 1,
            category TEXT,
            description TEXT,
            thumbnail TEXT,
            is_converted_from_colored_folder INTEGER DEFAULT 0,
            representative_video_id TEXT,
            created_at INTEGER DEFAULT (strftime('%s', 'now')),
            updated_at INTEGER DEFAULT (strftime('%s', 'now')),
            UNIQUE(user_id, playlist_id),
            FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
        )",
        [],
    )?;

    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_playlists_user_id ON playlists(user_id)",
        [],
    )?;

    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_playlists_playlist_id ON playlists(playlist_id)",
        [],
    )?;

    Ok(())
}

fn initialize_default_channels(conn: &Connection) -> Result<()> {
    // Check if defaults already loaded
    let has_defaults: i64 = conn.query_row(
        "SELECT COUNT(*) FROM playlists WHERE is_default = 1",
        [],
        |row| row.get(0),
    ).unwrap_or(0);

    if has_defaults > 0 {
        eprintln!("✅ Default channels already loaded ({} playlists)", has_defaults);
        return Ok(());
    }

    eprintln!("📦 Initializing default channels from template...");

    // Try to find default-channels.json in multiple locations
    let mut default_data: Option<serde_json::Value> = None;
    
    // Try project root first (for development - most reliable)
    if let Ok(current_dir) = std::env::current_dir() {
        let project_resource = current_dir.join("default-channels.json");
        eprintln!("🔍 Checking for default-channels.json at: {:?}", project_resource);
        if project_resource.exists() {
            if let Ok(content) = fs::read_to_string(&project_resource) {
                if let Ok(data) = serde_json::from_str::<serde_json::Value>(&content) {
                    eprintln!("✅ Found default-channels.json in project root");
                    default_data = Some(data);
                }
            }
        }
    }
    
    // Try Tauri resource directory (for packaged app)
    if default_data.is_none() {
        if let Some(resource_dir) = RESOURCE_DIR.get().and_then(|d| d.as_ref()) {
            let resource_path = resource_dir.join("default-channels.json");
            eprintln!("🔍 Checking for default-channels.json at: {:?}", resource_path);
            if resource_path.exists() {
                if let Ok(content) = fs::read_to_string(&resource_path) {
                    if let Ok(data) = serde_json::from_str::<serde_json::Value>(&content) {
                        eprintln!("✅ Found default-channels.json in Tauri resource directory");
                        default_data = Some(data);
                    }
                }
            }
        }
    }
    
    // Try next to the executable (fallback for packaged app)
    if default_data.is_none() {
        if let Ok(exe_path) = std::env::current_exe() {
            if let Some(exe_dir) = exe_path.parent() {
                // In Tauri, resources are typically in the same directory as the exe
                let exe_resource = exe_dir.join("default-channels.json");
                eprintln!("🔍 Checking for default-channels.json at: {:?}", exe_resource);
                if exe_resource.exists() {
                    if let Ok(content) = fs::read_to_string(&exe_resource) {
                        if let Ok(data) = serde_json::from_str::<serde_json::Value>(&content) {
                            eprintln!("✅ Found default-channels.json next to executable");
                            default_data = Some(data);
                        }
                    }
                }
                
                // Also try in a resources subdirectory (common Tauri pattern)
                if default_data.is_none() {
                    let resources_dir = exe_dir.join("resources").join("default-channels.json");
                    eprintln!("🔍 Checking for default-channels.json at: {:?}", resources_dir);
                    if resources_dir.exists() {
                        if let Ok(content) = fs::read_to_string(&resources_dir) {
                            if let Ok(data) = serde_json::from_str::<serde_json::Value>(&content) {
                                eprintln!("✅ Found default-channels.json in resources directory");
                                default_data = Some(data);
                            }
                        }
                    }
                }
                
                // Try _up_ subdirectory (Tauri NSIS installer resource location)
                if default_data.is_none() {
                    let up_dir = exe_dir.join("_up_").join("default-channels.json");
                    eprintln!("🔍 Checking for default-channels.json at: {:?}", up_dir);
                    if up_dir.exists() {
                        if let Ok(content) = fs::read_to_string(&up_dir) {
                            if let Ok(data) = serde_json::from_str::<serde_json::Value>(&content) {
                                eprintln!("✅ Found default-channels.json in _up_ directory");
                                default_data = Some(data);
                            }
                        }
                    }
                }
            }
        }
    }

    let data = match default_data {
        Some(d) => {
            eprintln!("📦 Loaded default-channels.json successfully");
            d
        },
        None => {
            eprintln!("⚠️ default-channels.json not found in any location, skipping initialization");
            eprintln!("   Searched: app data dir, exe dir, project root");
            return Ok(());
        }
    };

    // Extract data
    let custom_colors = data.get("customColors").cloned().unwrap_or(serde_json::json!({}));
    let color_order: Vec<String> = data
        .get("colorOrder")
        .and_then(|v| v.as_array())
        .map(|arr| {
            arr.iter()
                .filter_map(|v| v.as_str().map(|s| s.to_string()))
                .collect()
        })
        .unwrap_or_default();
    let playlist_tabs = data.get("playlistTabs").cloned().unwrap_or(serde_json::json!([]));
    let video_progress = data.get("videoProgress").cloned().unwrap_or(serde_json::json!({}));
    let playlists = data
        .get("playlists")
        .and_then(|v| v.as_array())
        .map(|arr| arr.to_vec())
        .unwrap_or_default();

    // Create a default user with the template data
    // Users will get a copy of this on first load
    conn.execute(
        "INSERT OR IGNORE INTO users (user_id, custom_colors, color_order, playlist_tabs, video_progress)
         VALUES ('default', ?, ?, ?, ?)",
        params![
            serde_json::to_string(&custom_colors).unwrap_or_default(),
            serde_json::to_string(&color_order).unwrap_or_default(),
            serde_json::to_string(&playlist_tabs).unwrap_or_default(),
            serde_json::to_string(&video_progress).unwrap_or_default(),
        ],
    )?;

    // Insert playlists
    if !playlists.is_empty() {
        let mut stmt = conn.prepare(
            "INSERT INTO playlists (
                user_id, playlist_id, name, videos, groups, starred, is_default, can_delete,
                category, description, thumbnail, is_converted_from_colored_folder, representative_video_id
            )
            VALUES ('default', ?, ?, ?, ?, ?, 1, 0, ?, ?, ?, ?, ?)"
        )?;

        for playlist in playlists.iter() {
            if let Some(playlist_obj) = playlist.as_object() {
                let id = playlist_obj.get("id")
                    .and_then(|v| v.as_str())
                    .unwrap_or("")
                    .to_string();
                let name = playlist_obj.get("name")
                    .and_then(|v| v.as_str())
                    .unwrap_or("")
                    .to_string();
                let videos = playlist_obj.get("videos").cloned().unwrap_or(serde_json::json!([]));
                let groups = playlist_obj.get("groups").cloned().unwrap_or(serde_json::json!({}));
                let starred = playlist_obj.get("starred").cloned().unwrap_or(serde_json::json!([]));
                let category = playlist_obj.get("category").and_then(|v| v.as_str()).map(|s| s.to_string());
                let description = playlist_obj.get("description").and_then(|v| v.as_str()).map(|s| s.to_string());
                let thumbnail = playlist_obj.get("thumbnail").and_then(|v| v.as_str()).map(|s| s.to_string());
                let is_converted = playlist_obj.get("isConvertedFromColoredFolder")
                    .and_then(|v| v.as_bool())
                    .unwrap_or(false);
                let rep_video_id = playlist_obj.get("representativeVideoId")
                    .and_then(|v| v.as_str())
                    .map(|s| s.to_string());

                stmt.execute(params![
                    id,
                    name,
                    serde_json::to_string(&videos).unwrap_or_default(),
                    serde_json::to_string(&groups).unwrap_or_default(),
                    serde_json::to_string(&starred).unwrap_or_default(),
                    category,
                    description,
                    thumbnail,
                    if is_converted { 1 } else { 0 },
                    rep_video_id,
                ])?;
            }
        }
        eprintln!("✅ Loaded {} default playlists into database", playlists.len());
    } else {
        eprintln!("⚠️ No playlists found in default-channels.json");
    }

    Ok(())
}

#[tauri::command]
pub fn test_db_connection() -> Result<String, String> {
    let db_path = get_db_path().map_err(|e| format!("Failed to get database path: {}", e))?;
    eprintln!("🧪 Testing database connection at: {}", db_path.display());
    
    // Check if directory is writable
    if let Some(parent) = db_path.parent() {
        let test_file = parent.join(".write_test");
        match std::fs::write(&test_file, b"test") {
            Ok(_) => {
                let _ = std::fs::remove_file(&test_file);
                eprintln!("✅ Database directory is writable");
            },
            Err(e) => {
                eprintln!("⚠️ Warning: Database directory may not be writable: {}", e);
            }
        }
    }
    
    match get_connection() {
        Ok(conn) => {
            // Try a simple query to verify it works
            let _: i64 = conn.query_row("SELECT 1", [], |row| row.get(0))
                .map_err(|e| format!("Query test failed: {}", e))?;
            eprintln!("✅ Database connection and query test successful");
            Ok(format!("✅ Database connection successful at: {}\nDirectory is writable: Yes", db_path.display()))
        },
        Err(e) => {
            eprintln!("❌ Database connection failed: {}", e);
            Err(format!("❌ Database connection failed: {}\nPath: {}", e, db_path.display()))
        }
    }
}

#[tauri::command]
pub fn check_default_channels() -> Result<String, String> {
    let conn = get_connection().map_err(|e| e.to_string())?;
    
    // Check if defaults are loaded
    let default_count: i64 = conn.query_row(
        "SELECT COUNT(*) FROM playlists WHERE is_default = 1",
        [],
        |row| row.get(0),
    ).unwrap_or(0);
    
    // Check if default user exists
    let default_user_exists: bool = conn.query_row(
        "SELECT EXISTS(SELECT 1 FROM users WHERE user_id = 'default')",
        [],
        |row| row.get(0),
    ).unwrap_or(false);
    
    // Try to find the file
    let mut file_found = false;
    let mut file_path = String::new();
    
    // Try project root first
    if let Ok(current_dir) = std::env::current_dir() {
        let project_resource = current_dir.join("default-channels.json");
        if project_resource.exists() {
            file_found = true;
            file_path = format!("{:?}", project_resource);
        }
    }
    
    // Try next to executable
    if !file_found {
        if let Ok(exe_path) = std::env::current_exe() {
            if let Some(exe_dir) = exe_path.parent() {
                let exe_resource = exe_dir.join("default-channels.json");
                if exe_resource.exists() {
                    file_found = true;
                    file_path = format!("{:?}", exe_resource);
                } else {
                    // Try resources subdirectory
                    let resources_path = exe_dir.join("resources").join("default-channels.json");
                    if resources_path.exists() {
                        file_found = true;
                        file_path = format!("{:?}", resources_path);
                    } else {
                        // Try _up_ subdirectory (Tauri NSIS installer resource location)
                        let up_path = exe_dir.join("_up_").join("default-channels.json");
                        if up_path.exists() {
                            file_found = true;
                            file_path = format!("{:?}", up_path);
                        }
                    }
                }
            }
        }
    }
    
    Ok(format!(
        "Default channels status:\n- Default playlists in DB: {}\n- Default user exists: {}\n- default-channels.json found: {}\n- File path: {}",
        default_count,
        default_user_exists,
        file_found,
        if file_found { &file_path } else { "Not found" }
    ))
}

#[tauri::command]
pub fn force_initialize_default_channels() -> Result<String, String> {
    let conn = get_connection().map_err(|e| e.to_string())?;
    
    // Delete existing defaults first
    conn.execute("DELETE FROM playlists WHERE is_default = 1", [])
        .map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM users WHERE user_id = 'default'", [])
        .map_err(|e| e.to_string())?;
    
    // Re-initialize (this will print diagnostic info via eprintln!)
    initialize_default_channels(&conn).map_err(|e| format!("Failed to initialize: {}", e))?;
    
    // Count what was loaded
    let count: i64 = conn.query_row(
        "SELECT COUNT(*) FROM playlists WHERE is_default = 1",
        [],
        |row| row.get(0),
    ).unwrap_or(0);
    
    if count == 0 {
        // Try to provide helpful error message
        let mut search_paths = Vec::new();
        if let Ok(current_dir) = std::env::current_dir() {
            search_paths.push(format!("{:?}", current_dir.join("default-channels.json")));
        }
        if let Ok(exe_path) = std::env::current_exe() {
            if let Some(exe_dir) = exe_path.parent() {
                search_paths.push(format!("{:?}", exe_dir.join("default-channels.json")));
                search_paths.push(format!("{:?}", exe_dir.join("resources").join("default-channels.json")));
            }
        }
        
        Err(format!(
            "❌ No playlists loaded (file not found). Searched:\n{}",
            search_paths.join("\n")
        ))
    } else {
        Ok(format!("✅ Force initialized default channels: {} playlists loaded", count))
    }
}

#[tauri::command]
pub fn get_user_data(user_id: String) -> Result<UserData, String> {
    let conn = get_connection().map_err(|e| format!("Failed to connect to database: {}", e))?;
    
    // Get user record
    let mut stmt = conn.prepare(
        "SELECT custom_colors, color_order, playlist_tabs, video_progress 
         FROM users WHERE user_id = ?"
    ).map_err(|e| e.to_string())?;
    
    let user_row = stmt.query_row(params![user_id], |row| {
        Ok((
            row.get::<_, Option<String>>(0)?,
            row.get::<_, Option<String>>(1)?,
            row.get::<_, Option<String>>(2)?,
            row.get::<_, Option<String>>(3)?,
        ))
    });
    
    let (custom_colors, color_order, playlist_tabs, video_progress) = match user_row {
        Ok(row) => row,
        Err(_) => {
            // User doesn't exist - copy from default template
            let mut default_stmt = conn.prepare(
                "SELECT custom_colors, color_order, playlist_tabs, video_progress 
                 FROM users WHERE user_id = 'default'"
            ).map_err(|e| e.to_string())?;
            
            let default_row = default_stmt.query_row([], |row| {
                Ok((
                    row.get::<_, Option<String>>(0)?,
                    row.get::<_, Option<String>>(1)?,
                    row.get::<_, Option<String>>(2)?,
                    row.get::<_, Option<String>>(3)?,
                ))
            });
            
            match default_row {
                Ok(row) => {
                    // Create user record from default template
                    conn.execute(
                        "INSERT INTO users (user_id, custom_colors, color_order, playlist_tabs, video_progress)
                         VALUES (?, ?, ?, ?, ?)",
                        params![user_id, row.0.clone(), row.1.clone(), row.2.clone(), row.3.clone()],
                    ).map_err(|e| e.to_string())?;
                    
                    // Copy default playlists to this user
                    let copied = conn.execute(
                        "INSERT INTO playlists (user_id, playlist_id, name, videos, groups, starred, is_default, can_delete, category, description, thumbnail, is_converted_from_colored_folder, representative_video_id)
                         SELECT ?, playlist_id, name, videos, groups, starred, 0, 1, category, description, thumbnail, is_converted_from_colored_folder, representative_video_id
                         FROM playlists WHERE user_id = 'default'",
                        params![user_id],
                    ).map_err(|e| e.to_string())?;
                    eprintln!("✅ Copied {} default playlists to user {}", copied, user_id);
                    
                    row
                }
                Err(_) => (None, None, None, None),
            }
        }
    };
    
    // Get playlists
    let mut stmt = conn.prepare(
        "SELECT playlist_id, name, videos, groups, starred, category, description, 
                thumbnail, is_converted_from_colored_folder, representative_video_id
         FROM playlists WHERE user_id = ?"
    ).map_err(|e| e.to_string())?;
    
    let playlists: Vec<Playlist> = stmt.query_map(params![user_id], |row| {
        Ok(Playlist {
            id: row.get(0)?,
            name: row.get(1)?,
            videos: serde_json::from_str(&row.get::<_, String>(2)?).unwrap_or_default(),
            groups: serde_json::from_str(&row.get::<_, Option<String>>(3)?.unwrap_or_default()).unwrap_or(serde_json::json!({})),
            starred: serde_json::from_str(&row.get::<_, Option<String>>(4)?.unwrap_or_default()).unwrap_or_default(),
            category: row.get(5)?,
            description: row.get(6)?,
            thumbnail: row.get(7)?,
            is_converted_from_colored_folder: row.get::<_, i32>(8)? != 0,
            representative_video_id: row.get(9)?,
        })
    }).map_err(|e| e.to_string())?
    .collect::<Result<Vec<_>, _>>()
    .map_err(|e| e.to_string())?;
    
    Ok(UserData {
        playlists,
        playlist_tabs: serde_json::from_str(&playlist_tabs.unwrap_or_default()).unwrap_or_default(),
        custom_colors: serde_json::from_str(&custom_colors.unwrap_or_default()).unwrap_or(serde_json::json!({})),
        color_order: serde_json::from_str(&color_order.unwrap_or_default()).unwrap_or_default(),
        video_progress: serde_json::from_str(&video_progress.unwrap_or_default()).unwrap_or(serde_json::json!({})),
    })
}

#[tauri::command]
pub fn save_user_data(user_id: String, data: UserData) -> Result<(), String> {
    eprintln!("💾 save_user_data called for user_id: {}", user_id);
    eprintln!("   Saving {} playlists", data.playlists.len());
    
    let mut conn = get_connection().map_err(|e| {
        eprintln!("❌ Failed to get database connection: {}", e);
        e.to_string()
    })?;
    
    let tx = conn.transaction().map_err(|e| {
        eprintln!("❌ Failed to start transaction: {}", e);
        e.to_string()
    })?;
    
    // Upsert user record
    tx.execute(
        "INSERT INTO users (user_id, custom_colors, color_order, playlist_tabs, video_progress, updated_at)
         VALUES (?, ?, ?, ?, ?, strftime('%s', 'now'))
         ON CONFLICT(user_id) DO UPDATE SET
           custom_colors = excluded.custom_colors,
           color_order = excluded.color_order,
           playlist_tabs = excluded.playlist_tabs,
           video_progress = excluded.video_progress,
           updated_at = strftime('%s', 'now')",
        params![
            user_id,
            serde_json::to_string(&data.custom_colors).map_err(|e| e.to_string())?,
            serde_json::to_string(&data.color_order).map_err(|e| e.to_string())?,
            serde_json::to_string(&data.playlist_tabs).map_err(|e| e.to_string())?,
            serde_json::to_string(&data.video_progress).map_err(|e| e.to_string())?,
        ],
    ).map_err(|e| e.to_string())?;
    
    // Delete existing playlists for this user
    tx.execute("DELETE FROM playlists WHERE user_id = ?", params![user_id])
        .map_err(|e| e.to_string())?;
    
    // Store playlist count before we move data.playlists
    let playlist_count = data.playlists.len();
    
    // Insert playlists
    {
        let mut stmt = tx.prepare(
            "INSERT INTO playlists (user_id, playlist_id, name, videos, groups, starred, 
                                    category, description, thumbnail, is_converted_from_colored_folder, 
                                    representative_video_id, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, strftime('%s', 'now'))"
        ).map_err(|e| e.to_string())?;
        
        for playlist in data.playlists {
            stmt.execute(params![
                user_id,
                playlist.id,
                playlist.name,
                serde_json::to_string(&playlist.videos).map_err(|e| e.to_string())?,
                serde_json::to_string(&playlist.groups).map_err(|e| e.to_string())?,
                serde_json::to_string(&playlist.starred).map_err(|e| e.to_string())?,
                playlist.category,
                playlist.description,
                playlist.thumbnail,
                if playlist.is_converted_from_colored_folder { 1 } else { 0 },
                playlist.representative_video_id,
            ]).map_err(|e| e.to_string())?;
        }
        // stmt is dropped here, releasing the borrow
    }
    
    tx.commit().map_err(|e| {
        eprintln!("❌ Failed to commit transaction: {}", e);
        e.to_string()
    })?;
    
    // Verify the save by checking the database
    let verify_count: i64 = conn.query_row(
        "SELECT COUNT(*) FROM playlists WHERE user_id = ?",
        params![user_id],
        |row| row.get(0)
    ).unwrap_or(0);
    
    eprintln!("✅ Successfully saved user data for user_id: {}", user_id);
    eprintln!("   Verified: {} playlists in database for this user", verify_count);
    
    if verify_count == 0 && playlist_count > 0 {
        eprintln!("⚠️ WARNING: Saved {} playlists but database shows 0! This indicates a save failure.", playlist_count);
        return Err("Save verification failed: playlists were not persisted".to_string());
    }
    
    Ok(())
}

#[tauri::command]
pub fn save_video_progress(user_id: String, video_progress: serde_json::Value) -> Result<(), String> {
    let conn = get_connection().map_err(|e| e.to_string())?;
    
    // Get current video progress
    let current_progress: serde_json::Value = conn.query_row(
        "SELECT video_progress FROM users WHERE user_id = ?",
        params![user_id],
        |row| {
            let progress_str: Option<String> = row.get(0)?;
            Ok(serde_json::from_str(&progress_str.unwrap_or_default()).unwrap_or(serde_json::json!({})))
        },
    ).unwrap_or(serde_json::json!({}));
    
    // Merge with new progress
    let mut merged = current_progress.as_object().cloned().unwrap_or_default();
    if let Some(new_obj) = video_progress.as_object() {
        merged.extend(new_obj.clone());
    }
    
    let merged_json = serde_json::to_string(&merged).map_err(|e| e.to_string())?;
    
    conn.execute(
        "INSERT INTO users (user_id, video_progress, updated_at)
         VALUES (?, ?, strftime('%s', 'now'))
         ON CONFLICT(user_id) DO UPDATE SET
           video_progress = excluded.video_progress,
           updated_at = strftime('%s', 'now')",
        params![user_id, merged_json],
    ).map_err(|e| e.to_string())?;
    
    Ok(())
}

