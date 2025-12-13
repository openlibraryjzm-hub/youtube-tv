use rusqlite::{Connection, Result, params};
use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use std::sync::OnceLock;
use std::fs;
use std::collections::HashSet;
use std::ffi::OsStr;
use std::io::Write;

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

fn get_thumbnails_dir() -> Result<PathBuf, String> {
    let db_path = get_db_path()?;
    let thumbnails_dir = db_path.parent().unwrap().join("thumbnails");
    
    // Create thumbnails directory if it doesn't exist
    std::fs::create_dir_all(&thumbnails_dir)
        .map_err(|e| format!("Could not create thumbnails directory: {}", e))?;
    
    Ok(thumbnails_dir)
}

fn get_thumbnail_path(video_id: &str) -> Result<PathBuf, String> {
    use std::hash::{Hash, Hasher};
    use std::collections::hash_map::DefaultHasher;
    
    // Create a hash of the video ID for the filename
    let mut hasher = DefaultHasher::new();
    video_id.hash(&mut hasher);
    let hash = hasher.finish();
    let filename = format!("{:x}.jpg", hash);
    
    let thumbnails_dir = get_thumbnails_dir()?;
    Ok(thumbnails_dir.join(filename))
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

    // Video metadata table - stores title, author, views, etc. (one-time fetch, use forever)
    conn.execute(
        "CREATE TABLE IF NOT EXISTS video_metadata (
            video_id TEXT PRIMARY KEY,
            title TEXT,
            author TEXT,
            view_count TEXT,
            channel_id TEXT,
            published_year TEXT,
            duration INTEGER DEFAULT 1,
            fetched_at INTEGER DEFAULT (strftime('%s', 'now')),
            updated_at INTEGER DEFAULT (strftime('%s', 'now'))
        )",
        [],
    )?;

    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_video_metadata_video_id ON video_metadata(video_id)",
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

/// Import a playlist from a JSON file (safe - only adds, never deletes or modifies existing)
/// File should contain a single playlist object or an array with one playlist
#[tauri::command]
pub fn import_playlist_file(user_id: String, file_path: String) -> Result<String, String> {
    eprintln!("📥 import_playlist_file called for user_id: {}, file: {}", user_id, file_path);
    
    // Read and parse the file
    let file_content = fs::read_to_string(&file_path)
        .map_err(|e| format!("Failed to read file: {}", e))?;
    
    let json_data: serde_json::Value = serde_json::from_str(&file_content)
        .map_err(|e| format!("Invalid JSON: {}", e))?;
    
    // Extract playlist(s) from the JSON
    // Support both single playlist object and array of playlists
    let playlists_to_import: Vec<Playlist> = if let Some(playlists_array) = json_data.get("playlists").and_then(|v| v.as_array()) {
        // File has "playlists" array
        playlists_array.iter()
            .filter_map(|p| serde_json::from_value(p.clone()).ok())
            .collect()
    } else if json_data.is_object() && json_data.get("id").is_some() {
        // Single playlist object
        vec![serde_json::from_value(json_data)
            .map_err(|e| format!("Invalid playlist format: {}", e))?]
    } else if let Some(playlists_array) = json_data.as_array() {
        // Array of playlists at root
        playlists_array.iter()
            .filter_map(|p| serde_json::from_value(p.clone()).ok())
            .collect()
    } else {
        return Err("File must contain a playlist object or array of playlists".to_string());
    };
    
    if playlists_to_import.is_empty() {
        return Err("No valid playlists found in file".to_string());
    }
    
    eprintln!("   Found {} playlist(s) to import", playlists_to_import.len());
    
    // Get current user data (preserves all existing playlists, tabs, colors, etc.)
    let mut current_data = get_user_data(user_id.clone())
        .map_err(|e| format!("Failed to get current user data: {}", e))?;
    
    // Get existing playlist IDs to avoid duplicates
    let existing_ids: HashSet<String> = current_data.playlists.iter()
        .map(|p| p.id.clone())
        .collect();
    
    // Add new playlists (skip duplicates by ID)
    let mut added_count = 0;
    let mut skipped_count = 0;
    
    for playlist in playlists_to_import {
        if existing_ids.contains(&playlist.id) {
            eprintln!("   ⚠️ Skipping playlist '{}' (ID: {}) - already exists", playlist.name, playlist.id);
            skipped_count += 1;
        } else {
            eprintln!("   ✅ Adding playlist '{}' (ID: {})", playlist.name, playlist.id);
            current_data.playlists.push(playlist);
            added_count += 1;
        }
    }
    
    // Save the updated data (this will preserve tabs, colors, progress - only playlists change)
    save_user_data(user_id.clone(), current_data)
        .map_err(|e| format!("Failed to save imported playlists: {}", e))?;
    
    if added_count == 0 {
        Ok(format!("No new playlists imported. {} playlist(s) skipped (already exist).", skipped_count))
    } else {
        Ok(format!("Successfully imported {} playlist(s). {} skipped (already exist).", added_count, skipped_count))
    }
}

/// Overwrite an existing playlist with imported data (replaces playlist by ID)
#[tauri::command]
pub fn overwrite_playlist_file(user_id: String, playlist_id: String, file_path: String) -> Result<String, String> {
    eprintln!("🔄 overwrite_playlist_file called for user_id: {}, playlist_id: {}, file: {}", user_id, playlist_id, file_path);
    
    // Read and parse the file
    let file_content = fs::read_to_string(&file_path)
        .map_err(|e| format!("Failed to read file: {}", e))?;
    
    let json_data: serde_json::Value = serde_json::from_str(&file_content)
        .map_err(|e| format!("Invalid JSON: {}", e))?;
    
    // Extract playlist from the JSON
    let playlist_to_import: Playlist = if let Some(playlists_array) = json_data.get("playlists").and_then(|v| v.as_array()) {
        // File has "playlists" array - take first one
        if playlists_array.is_empty() {
            return Err("No playlists found in file".to_string());
        }
        serde_json::from_value(playlists_array[0].clone())
            .map_err(|e| format!("Invalid playlist format: {}", e))?
    } else if json_data.is_object() && json_data.get("id").is_some() {
        // Single playlist object
        serde_json::from_value(json_data)
            .map_err(|e| format!("Invalid playlist format: {}", e))?
    } else {
        return Err("File must contain a playlist object".to_string());
    };
    
    // Get current user data
    let mut current_data = get_user_data(user_id.clone())
        .map_err(|e| format!("Failed to get current user data: {}", e))?;
    
    // Save playlist name before moving
    let playlist_name = playlist_to_import.name.clone();
    
    // Find and replace the playlist
    let playlist_index = current_data.playlists.iter()
        .position(|p| p.id == playlist_id);
    
    match playlist_index {
        Some(idx) => {
            eprintln!("   ✅ Replacing playlist '{}' (ID: {})", current_data.playlists[idx].name, playlist_id);
            // Replace with imported playlist (but keep the same ID to maintain tab references)
            current_data.playlists[idx] = Playlist {
                id: playlist_id.clone(), // Keep original ID
                ..playlist_to_import
            };
        }
        None => {
            return Err(format!("Playlist with ID '{}' not found. Use regular import to add new playlists.", playlist_id));
        }
    }
    
    // Save the updated data
    save_user_data(user_id.clone(), current_data)
        .map_err(|e| format!("Failed to save overwritten playlist: {}", e))?;
    
    Ok(format!("Successfully overwrote playlist '{}'", playlist_name))
}

/// Export a tab with all its playlists as JSON
#[tauri::command]
pub fn export_tab(user_id: String, tab_index: usize) -> Result<String, String> {
    eprintln!("📤 export_tab called for user_id: {}, tab_index: {}", user_id, tab_index);
    
    let current_data = get_user_data(user_id.clone())
        .map_err(|e| format!("Failed to get current user data: {}", e))?;
    
    if tab_index >= current_data.playlist_tabs.len() {
        return Err(format!("Tab index {} out of range ({} tabs available)", tab_index, current_data.playlist_tabs.len()));
    }
    
    let tab = &current_data.playlist_tabs[tab_index];
    
    // Get all playlists in this tab
    let tab_playlists: Vec<Playlist> = current_data.playlists.iter()
        .filter(|p| tab.playlist_ids.contains(&p.id))
        .cloned()
        .collect();
    
    // Create export structure
    let export_data = serde_json::json!({
        "tab": {
            "name": tab.name,
            "playlistIds": tab.playlist_ids
        },
        "playlists": tab_playlists
    });
    
    let json = serde_json::to_string_pretty(&export_data)
        .map_err(|e| format!("Failed to serialize tab: {}", e))?;
    
    eprintln!("   ✅ Exported tab '{}' with {} playlists", tab.name, tab_playlists.len());
    Ok(json)
}

/// Import a tab file (creates tab and imports playlists)
#[tauri::command]
pub fn import_tab_file(user_id: String, file_path: String) -> Result<String, String> {
    eprintln!("📥 import_tab_file called for user_id: {}, file: {}", user_id, file_path);
    
    // Read and parse the file
    let file_content = fs::read_to_string(&file_path)
        .map_err(|e| format!("Failed to read file: {}", e))?;
    
    let json_data: serde_json::Value = serde_json::from_str(&file_content)
        .map_err(|e| format!("Invalid JSON: {}", e))?;
    
    // Extract tab and playlists
    let tab_data = json_data.get("tab")
        .ok_or_else(|| "File must contain a 'tab' object".to_string())?;
    
    let tab_name = tab_data.get("name")
        .and_then(|v| v.as_str())
        .ok_or_else(|| "Tab must have a 'name' field".to_string())?
        .to_string();
    
    let tab_playlist_ids: Vec<String> = tab_data.get("playlistIds")
        .and_then(|v| v.as_array())
        .map(|arr| {
            arr.iter()
                .filter_map(|v| v.as_str().map(|s| s.to_string()))
                .collect()
        })
        .unwrap_or_default();
    
    let playlists_to_import: Vec<Playlist> = json_data.get("playlists")
        .and_then(|v| v.as_array())
        .map(|arr| {
            arr.iter()
                .filter_map(|p| serde_json::from_value(p.clone()).ok())
                .collect()
        })
        .unwrap_or_default();
    
    if playlists_to_import.is_empty() {
        return Err("No playlists found in file".to_string());
    }
    
    eprintln!("   Found tab '{}' with {} playlists", tab_name, playlists_to_import.len());
    
    // Get current user data
    let mut current_data = get_user_data(user_id.clone())
        .map_err(|e| format!("Failed to get current user data: {}", e))?;
    
    // Add new playlists (update if they exist, add if new)
    let mut added_count = 0;
    let mut updated_count = 0;
    
    for playlist in playlists_to_import {
        if let Some(existing_idx) = current_data.playlists.iter().position(|p| p.id == playlist.id) {
            // Update existing playlist
            eprintln!("   🔄 Updating existing playlist '{}' (ID: {})", playlist.name, playlist.id);
            current_data.playlists[existing_idx] = playlist;
            updated_count += 1;
        } else {
            // Add new playlist
            eprintln!("   ✅ Adding new playlist '{}' (ID: {})", playlist.name, playlist.id);
            current_data.playlists.push(playlist);
            added_count += 1;
        }
    }
    
    // Create new tab
    let new_tab = PlaylistTab {
        name: tab_name.clone(),
        playlist_ids: tab_playlist_ids.clone(),
    };
    
    current_data.playlist_tabs.push(new_tab);
    
    // Save the updated data
    save_user_data(user_id.clone(), current_data)
        .map_err(|e| format!("Failed to save imported tab: {}", e))?;
    
    Ok(format!("Successfully imported tab '{}': {} playlists added, {} updated", tab_name, added_count, updated_count))
}

/// Export a single playlist as JSON string (frontend will handle file save dialog)
#[tauri::command]
pub fn export_playlist(user_id: String, playlist_id: String) -> Result<String, String> {
    eprintln!("📤 export_playlist called for user_id: {}, playlist_id: {}", user_id, playlist_id);
    
    let conn = get_connection().map_err(|e| e.to_string())?;
    
    // Get the playlist
    let mut stmt = conn.prepare(
        "SELECT playlist_id, name, videos, groups, starred, category, description, 
                thumbnail, is_converted_from_colored_folder, representative_video_id
         FROM playlists WHERE user_id = ? AND playlist_id = ?"
    ).map_err(|e| e.to_string())?;
    
    let playlist: Playlist = stmt.query_row(params![user_id, playlist_id], |row| {
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
    }).map_err(|e| format!("Playlist not found: {}", e))?;
    
    // Format as JSON (single playlist object)
    let json = serde_json::to_string_pretty(&playlist)
        .map_err(|e| format!("Failed to serialize playlist: {}", e))?;
    
    eprintln!("   ✅ Exported playlist '{}'", playlist.name);
    Ok(json)
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

/// Save video metadata (title, author, views, etc.) - one-time fetch, use forever
#[tauri::command]
pub fn save_video_metadata(video_id: String, title: String, author: String, view_count: String, channel_id: String, published_year: String, duration: i32) -> Result<(), String> {
    let conn = get_connection().map_err(|e| e.to_string())?;
    
    conn.execute(
        "INSERT INTO video_metadata (video_id, title, author, view_count, channel_id, published_year, duration, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, strftime('%s', 'now'))
         ON CONFLICT(video_id) DO UPDATE SET
           title = excluded.title,
           author = excluded.author,
           view_count = excluded.view_count,
           channel_id = excluded.channel_id,
           published_year = excluded.published_year,
           duration = excluded.duration,
           updated_at = strftime('%s', 'now')",
        params![video_id, title, author, view_count, channel_id, published_year, duration],
    ).map_err(|e| e.to_string())?;
    
    Ok(())
}

/// Get video metadata for multiple videos (batch lookup)
#[tauri::command]
pub fn get_video_metadata_batch(video_ids: Vec<String>) -> Result<serde_json::Value, String> {
    let conn = get_connection().map_err(|e| e.to_string())?;
    
    if video_ids.is_empty() {
        return Ok(serde_json::json!({}));
    }
    
    // SQLite 'IN' clause limit is 999, so we batch if needed
    let mut results = serde_json::Map::new();
    
    for chunk in video_ids.chunks(999) {
        let placeholders = chunk.iter().map(|_| "?").collect::<Vec<_>>().join(",");
        let query = format!(
            "SELECT video_id, title, author, view_count, channel_id, published_year, duration
             FROM video_metadata
             WHERE video_id IN ({})",
            placeholders
        );
        
        let mut stmt = conn.prepare(&query).map_err(|e| e.to_string())?;
        let rows = stmt.query_map(
            rusqlite::params_from_iter(chunk.iter()),
            |row| {
                Ok((
                    row.get::<_, String>(0)?, // video_id
                    row.get::<_, Option<String>>(1)?, // title
                    row.get::<_, Option<String>>(2)?, // author
                    row.get::<_, Option<String>>(3)?, // view_count
                    row.get::<_, Option<String>>(4)?, // channel_id
                    row.get::<_, Option<String>>(5)?, // published_year
                    row.get::<_, i32>(6)?, // duration
                ))
            },
        ).map_err(|e| e.to_string())?;
        
        for row_result in rows {
            let (video_id, title, author, view_count, channel_id, published_year, duration) = row_result.map_err(|e| e.to_string())?;
            results.insert(
                video_id.clone(),
                serde_json::json!({
                    "title": title.unwrap_or_default(),
                    "author": author.unwrap_or_default(),
                    "viewCount": view_count.unwrap_or_default(),
                    "channelId": channel_id.unwrap_or_default(),
                    "publishedYear": published_year.unwrap_or_default(),
                    "duration": duration
                })
            );
        }
    }
    
    Ok(serde_json::Value::Object(results))
}

/// Save multiple video metadata entries at once (batch insert)
#[tauri::command]
pub fn save_video_metadata_batch(metadata: Vec<serde_json::Value>) -> Result<(), String> {
    let mut conn = get_connection().map_err(|e| e.to_string())?;
    
    let tx = conn.transaction().map_err(|e| e.to_string())?;
    
    {
        let mut stmt = tx.prepare(
            "INSERT INTO video_metadata (video_id, title, author, view_count, channel_id, published_year, duration, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, strftime('%s', 'now'))
             ON CONFLICT(video_id) DO UPDATE SET
               title = excluded.title,
               author = excluded.author,
               view_count = excluded.view_count,
               channel_id = excluded.channel_id,
               published_year = excluded.published_year,
               duration = excluded.duration,
               updated_at = strftime('%s', 'now')"
        ).map_err(|e| e.to_string())?;
        
        for item in metadata {
            let video_id = item["videoId"].as_str().ok_or("Missing videoId")?;
            let title = item["title"].as_str().unwrap_or("");
            let author = item["author"].as_str().unwrap_or("");
            let view_count = item["viewCount"].as_str().unwrap_or("0");
            let channel_id = item["channelId"].as_str().unwrap_or("");
            let published_year = item["publishedYear"].as_str().unwrap_or("");
            let duration = item["duration"].as_i64().unwrap_or(1) as i32;
            
            stmt.execute(params![video_id, title, author, view_count, channel_id, published_year, duration])
                .map_err(|e| e.to_string())?;
        }
    }
    
    tx.commit().map_err(|e| e.to_string())?;
    
    Ok(())
}

/// Scan a folder for video files (.mp4, .webm) recursively
#[tauri::command]
pub fn scan_local_folder(folder_path: String) -> Result<Vec<serde_json::Value>, String> {
    eprintln!("📁 Received folder path: {}", folder_path);
    
    let path = PathBuf::from(&folder_path);
    eprintln!("📁 Converted to PathBuf: {:?}", path);
    
    if !path.exists() {
        eprintln!("❌ Path does not exist: {:?}", path);
        return Err(format!("Folder does not exist: {}", folder_path));
    }
    
    if !path.is_dir() {
        eprintln!("❌ Path is not a directory: {:?}", path);
        return Err(format!("Path is not a directory: {}", folder_path));
    }
    
    eprintln!("✅ Path exists and is a directory");
    
    let mut video_files = Vec::new();
    let video_extensions = ["mp4", "webm", "mkv", "avi", "mov", "wmv", "flv", "m4v"]; // Will be compared case-insensitively
    
    fn scan_directory(dir: &PathBuf, extensions: &[&str], files: &mut Vec<serde_json::Value>) -> Result<(), String> {
        eprintln!("📂 Scanning directory: {:?}", dir);
        eprintln!("📂 Directory exists: {}", dir.exists());
        eprintln!("📂 Is directory: {}", dir.is_dir());
        
        let entries = fs::read_dir(dir).map_err(|e| {
            eprintln!("❌ Error reading directory {:?}: {}", dir, e);
            eprintln!("❌ Error kind: {:?}", e.kind());
            format!("Failed to read directory: {} (kind: {:?})", e, e.kind())
        })?;
        
        let mut entry_count = 0;
        let mut file_count = 0;
        let mut video_count = 0;
        let mut dir_count = 0;
        
        for entry in entries {
            entry_count += 1;
            let entry = entry.map_err(|e| {
                eprintln!("❌ Error reading entry #{}: {}", entry_count, e);
                format!("Failed to read entry: {}", e)
            })?;
            let path = entry.path();
            
            eprintln!("🔍 Processing entry #{}: {:?}", entry_count, path);
            
            if path.is_dir() {
                dir_count += 1;
                eprintln!("📁 Found subdirectory: {:?}", path);
                // Recursively scan subdirectories
                scan_directory(&path, extensions, files)?;
            } else if path.is_file() {
                file_count += 1;
                eprintln!("📄 Found file #{}: {:?}", file_count, path.file_name().unwrap_or_default());
                
                // Check if file has a video extension
                if let Some(ext) = path.extension().and_then(OsStr::to_str) {
                    eprintln!("   Extension: {}", ext);
                    let ext_lower = ext.to_lowercase();
                    eprintln!("   Extension (lowercase): {}", ext_lower);
                    
                    let is_video = extensions.iter().any(|&e| {
                        let e_lower = e.to_lowercase();
                        let matches = e_lower == ext_lower;
                        if matches {
                            eprintln!("   ✅ Matches extension: {}", e);
                        }
                        matches
                    });
                    
                    if is_video {
                        video_count += 1;
                        let file_path = path.to_string_lossy().to_string();
                        let file_name = path.file_name()
                            .and_then(OsStr::to_str)
                            .unwrap_or("Unknown")
                            .to_string();
                        
                        eprintln!("✅ Found video file #{}: {} ({})", video_count, file_name, file_path);
                        
                        // Use file:// prefix to identify local files
                        // Keep Windows backslashes as-is, they'll be handled by Tauri
                        let video_id = format!("local:file://{}", file_path);
                        
                        files.push(serde_json::json!({
                            "id": video_id,
                            "title": file_name,
                            "duration": 0, // Will be determined later if needed
                            "filePath": file_path
                        }));
                    } else {
                        eprintln!("   ❌ Not a video extension (looking for: {:?})", extensions);
                    }
                } else {
                    eprintln!("⚠️ File has no extension: {:?}", path.file_name().unwrap_or_default());
                }
            } else {
                eprintln!("⚠️ Entry is neither file nor directory: {:?}", path);
            }
        }
        
        eprintln!("📊 Directory scan complete: {} total entries, {} directories, {} files, {} videos", entry_count, dir_count, file_count, video_count);
        Ok(())
    }
    
    scan_directory(&path, &video_extensions, &mut video_files)?;
    
    eprintln!("✅ Total videos found: {}", video_files.len());
    Ok(video_files)
}

#[tauri::command]
pub fn save_thumbnail(video_id: String, base64_data: String) -> Result<String, String> {
    eprintln!("💾 save_thumbnail called for video_id: {}", video_id);
    
    // Remove data URL prefix if present
    let base64_data = base64_data
        .strip_prefix("data:image/jpeg;base64,")
        .or_else(|| base64_data.strip_prefix("data:image/png;base64,"))
        .unwrap_or(&base64_data);
    
    // Decode base64 using the new Engine API
    use base64::{Engine as _, engine::general_purpose};
    let image_data = general_purpose::STANDARD
        .decode(base64_data)
        .map_err(|e| format!("Failed to decode base64: {}", e))?;
    
    // Get thumbnail path
    let thumbnail_path = get_thumbnail_path(&video_id)?;
    
    // Write thumbnail file
    let mut file = std::fs::File::create(&thumbnail_path)
        .map_err(|e| format!("Failed to create thumbnail file: {}", e))?;
    file.write_all(&image_data)
        .map_err(|e| format!("Failed to write thumbnail file: {}", e))?;
    
    eprintln!("✅ Thumbnail saved to: {}", thumbnail_path.display());
    Ok(thumbnail_path.to_string_lossy().to_string())
}

#[tauri::command]
pub fn get_thumbnail_path_command(video_id: String) -> Result<String, String> {
    let path = get_thumbnail_path(&video_id)?;
    
    // Check if file exists
    if path.exists() {
        Ok(path.to_string_lossy().to_string())
    } else {
        Err("Thumbnail file does not exist".to_string())
    }
}

#[tauri::command]
pub fn get_file_size(file_path: String) -> Result<u64, String> {
    let path = PathBuf::from(&file_path);
    
    if !path.exists() {
        return Err(format!("File does not exist: {}", file_path));
    }
    
    let metadata = std::fs::metadata(&path)
        .map_err(|e| format!("Failed to get file metadata: {}", e))?;
    
    Ok(metadata.len())
}

#[tauri::command]
pub fn get_thumbnail_data_url(video_id: String) -> Result<String, String> {
    let path = get_thumbnail_path(&video_id)?;
    
    // Check if file exists
    if !path.exists() {
        return Err("Thumbnail file does not exist".to_string());
    }
    
    // Read file as bytes
    let image_data = std::fs::read(&path)
        .map_err(|e| format!("Failed to read thumbnail file: {}", e))?;
    
    // Encode as base64
    use base64::{Engine as _, engine::general_purpose};
    let base64_string = general_purpose::STANDARD.encode(&image_data);
    
    // Return as data URL
    Ok(format!("data:image/jpeg;base64,{}", base64_string))
}

#[tauri::command]
pub fn extract_video_thumbnail(video_path: String, video_id: String) -> Result<String, String> {
    eprintln!("🎬 extract_video_thumbnail called for: {}", video_path);
    
    // Get thumbnail path
    let thumbnail_path = get_thumbnail_path(&video_id)?;
    
    // Check if thumbnail already exists
    if thumbnail_path.exists() {
        eprintln!("✅ Thumbnail already exists: {}", thumbnail_path.display());
        return Ok(thumbnail_path.to_string_lossy().to_string());
    }
    
    // Try to extract thumbnail using FFmpeg
    use std::process::Command;
    
    // First, try to extract embedded cover art (if available in MP4)
    // For MP4 files, try to extract embedded cover art first
    if video_path.to_lowercase().ends_with(".mp4") || video_path.to_lowercase().ends_with(".m4v") {
        let mut extract_cover = Command::new("ffmpeg");
        extract_cover
            .arg("-i")
            .arg(&video_path)
            .arg("-map")
            .arg("0:v:0")
            .arg("-frames:v")
            .arg("1")
            .arg("-vf")
            .arg("scale=320:180:force_original_aspect_ratio=decrease,pad=320:180:(ow-iw)/2:(oh-ih)/2")
            .arg("-y")
            .arg(&thumbnail_path);
        
        // Hide output on Windows
        #[cfg(windows)]
        {
            extract_cover.stdout(std::process::Stdio::null())
                .stderr(std::process::Stdio::null());
        }
        
        let cover_result = extract_cover.output();
        
        if let Ok(output) = cover_result {
            if output.status.success() && thumbnail_path.exists() {
                eprintln!("✅ Extracted thumbnail using FFmpeg (first frame)");
                return Ok(thumbnail_path.to_string_lossy().to_string());
            }
        }
    }
    
    // If cover art extraction failed, try to get a frame at 5-10% of duration
    // First, get video duration using ffprobe
    let mut probe = Command::new("ffprobe");
    probe
        .arg("-v")
        .arg("error")
        .arg("-show_entries")
        .arg("format=duration")
        .arg("-of")
        .arg("default=noprint_wrappers=1:nokey=1")
        .arg(&video_path);
    
    #[cfg(windows)]
    {
        probe.stderr(std::process::Stdio::null());
    }
    
    let duration_str = probe.output()
        .ok()
        .and_then(|o| String::from_utf8(o.stdout).ok())
        .and_then(|s| s.trim().parse::<f64>().ok());
    
    let seek_time = if let Some(duration) = duration_str {
        // Seek to 5-10% of duration, but at least 0.5s and at most 5s
        let percent = duration * 0.075; // 7.5% as middle ground
        percent.max(0.5).min(5.0)
    } else {
        1.0 // Default to 1 second if we can't get duration
    };
    
    eprintln!("⏩ Seeking to {} seconds for thumbnail", seek_time);
    
    // Extract frame at specific time
    let mut extract_frame = Command::new("ffmpeg");
    extract_frame
        .arg("-i")
        .arg(&video_path)
        .arg("-ss")
        .arg(&format!("{:.2}", seek_time))
        .arg("-vframes")
        .arg("1")
        .arg("-vf")
        .arg("scale=320:180:force_original_aspect_ratio=decrease,pad=320:180:(ow-iw)/2:(oh-ih)/2")
        .arg("-y")
        .arg(&thumbnail_path);
    
    #[cfg(windows)]
    {
        extract_frame.stdout(std::process::Stdio::null())
            .stderr(std::process::Stdio::null());
    }
    
    let frame_result = extract_frame.output();
    
    if let Ok(output) = frame_result {
        if output.status.success() && thumbnail_path.exists() {
            eprintln!("✅ Extracted thumbnail using FFmpeg (frame at {}s)", seek_time);
            return Ok(thumbnail_path.to_string_lossy().to_string());
        }
    }
    
    // If FFmpeg extraction failed, return error
    Err(format!("Failed to extract thumbnail using FFmpeg. Make sure FFmpeg is installed and in PATH."))
}

#[tauri::command]
pub fn add_faststart_in_place(file_path: String) -> Result<String, String> {
    eprintln!("⚡ Adding +faststart in-place (no new file): {}", file_path);
    
    use std::process::Command;
    
    let path = PathBuf::from(&file_path);
    if !path.exists() {
        return Err(format!("File does not exist: {}", file_path));
    }
    
    let path_str = path.to_string_lossy().to_string();
    
    // First, check if file is valid by trying to probe it
    eprintln!("🔍 [FASTSTART] Checking if file is valid MP4...");
    
    // Check file size first - if it's 0 or very small, it's definitely incomplete
    let file_size = match std::fs::metadata(&path) {
        Ok(meta) => meta.len(),
        Err(e) => {
            return Err(format!("Cannot read file metadata: {}. File may not exist or be inaccessible.", e));
        }
    };
    
    if file_size == 0 {
        return Err("File is empty (0 bytes). File may be incomplete or corrupted.".to_string());
    }
    
    if file_size < 1024 {
        eprintln!("⚠️ [FASTSTART] File is very small ({} bytes) - may be incomplete", file_size);
    }
    
    let probe_output = Command::new("ffprobe")
        .args([
            "-v", "error",
            "-show_format",
            "-show_streams",
            &path_str,
        ])
        .output();
    
    let file_is_valid = match probe_output {
        Ok(output) => {
            if !output.status.success() {
                let stderr = String::from_utf8_lossy(&output.stderr);
                eprintln!("⚠️ [FASTSTART] ffprobe failed: {}", stderr.trim());
            }
            output.status.success()
        },
        Err(e) => {
            eprintln!("⚠️ [FASTSTART] ffprobe error: {}", e);
            false
        }
    };
    
    if !file_is_valid {
        eprintln!("⚠️ [FASTSTART] File appears corrupted or incomplete (moov atom not found)");
        eprintln!("   File size: {} bytes ({:.2} MB)", file_size, file_size as f64 / 1024.0 / 1024.0);
        eprintln!("   Attempting to repair file first...");
        eprintln!("   NOTE: If this file plays in VLC/Media Player, it may just need repair.");
        eprintln!("   If it doesn't play anywhere, the file is corrupted and needs re-downloading.");
        
        // Try to repair the file by remuxing it
        // Use .mp4 extension so FFmpeg knows the format
        let temp_repair = path.with_extension("mp4.repair");
        let temp_repair_str = temp_repair.to_string_lossy().to_string();
        
        // Use raw path for Windows to handle special characters better
        let repair_output = Command::new("ffmpeg")
            .args([
                "-v", "error",
                "-err_detect", "ignore_err",
                "-i", &path_str,
                "-c", "copy",  // Copy streams, no re-encode
                "-f", "mp4",  // Explicitly specify MP4 format
                "-movflags", "+faststart",  // Add faststart during repair
                "-y",
                &temp_repair_str,
            ])
            .output();
        
        match repair_output {
            Ok(output) if output.status.success() => {
                // Replace original with repaired file
                match std::fs::rename(&temp_repair, &path) {
                    Ok(_) => {
                        eprintln!("✅ [FASTSTART] File repaired and faststart added!");
                        return Ok(file_path);
                    }
                    Err(e) => {
                        let _ = std::fs::remove_file(&temp_repair);
                        return Err(format!("File was repaired but could not replace original: {}. The repaired file was saved as: {}", e, temp_repair_str));
                    }
                }
            }
            Ok(output) => {
                let _ = std::fs::remove_file(&temp_repair);
                let stderr = String::from_utf8_lossy(&output.stderr);
                return Err(format!("File appears corrupted and could not be repaired.\n\nFFmpeg error: {}\n\nThe file may be:\n- Still downloading/incomplete\n- Severely corrupted\n- Not a valid MP4 file\n\nTry re-downloading or checking the file with another tool.", stderr.trim()));
            }
            Err(e) => {
                return Err(format!("Failed to attempt file repair: {}. The file appears corrupted (moov atom not found).", e));
            }
        }
    }
    
    // File is valid, proceed with faststart
    // NOTE: FFmpeg on Windows refuses to overwrite the same file (even with -y)
    // So we MUST use temp file approach - write to temp, then rename
    eprintln!("🔄 [FASTSTART] File is valid, processing with temp file approach...");
    eprintln!("   (FFmpeg requires temp file on Windows - can't overwrite same file)");
    
    // Use .mp4.tmp extension so FFmpeg knows it's MP4 format
    let temp_path = path.with_extension("mp4.tmp");
    let temp_file = temp_path.to_string_lossy().to_string();
    
    // Try normal approach first
    let temp_output = Command::new("ffmpeg")
        .args([
            "-v", "error",
            "-i", &path_str,
            "-c", "copy",
            "-f", "mp4",  // Explicitly specify MP4 format
            "-movflags", "+faststart",
            "-y",
            &temp_file,
        ])
        .output()
        .map_err(|e| format!("FFmpeg temp file approach failed: {}", e))?;
    
    if temp_output.status.success() {
        // Replace original with temp file (atomic operation)
        std::fs::rename(&temp_path, &path)
            .map_err(|e| {
                let _ = std::fs::remove_file(&temp_path);
                format!("Failed to replace original file: {}", e)
            })?;
        eprintln!("✅ [FASTSTART] Success! (moov atom moved to front)");
        return Ok(file_path);
    }
    
    // If normal approach failed, try with ignore_err (for problematic files)
    let stderr = String::from_utf8_lossy(&temp_output.stderr);
    let exit_code = temp_output.status.code().unwrap_or(-1);
    eprintln!("⚠️ [FASTSTART] Normal approach failed (code {}), trying with ignore_err flag...", exit_code);
    eprintln!("   Error: {}", stderr.trim());
    
    // Clean up failed temp file
    let _ = std::fs::remove_file(&temp_path);
    
    let repair_output = Command::new("ffmpeg")
        .args([
            "-v", "error",
            "-err_detect", "ignore_err",  // Grok's magic flag for problematic files
            "-i", &path_str,
            "-c", "copy",
            "-f", "mp4",  // Explicitly specify MP4 format
            "-movflags", "+faststart",
            "-y",
            &temp_file,
        ])
        .output()
        .map_err(|e| format!("FFmpeg ignore_err approach failed: {}", e))?;
    
    if repair_output.status.success() {
        // Replace original with temp file (atomic operation)
        std::fs::rename(&temp_path, &path)
            .map_err(|e| {
                let _ = std::fs::remove_file(&temp_path);
                format!("Failed to replace original file: {}", e)
            })?;
        eprintln!("✅ [FASTSTART] Success with ignore_err flag! (handled problematic subtitles/attachments)");
        return Ok(file_path);
    }
    
    // Both approaches failed
    let _ = std::fs::remove_file(&temp_path);
    let repair_stderr = String::from_utf8_lossy(&repair_output.stderr);
    let repair_code = repair_output.status.code().unwrap_or(-1);
    
    eprintln!("❌ [FASTSTART] All strategies failed!");
    eprintln!("   Normal temp file (code {}): {}", exit_code, stderr.trim());
    eprintln!("   Ignore_err temp file (code {}): {}", repair_code, repair_stderr.trim());
    
    Err(format!(
        "Faststart failed on all strategies.\n\
        File: {}\n\
        Normal approach (code {}): {}\n\
        Ignore_err approach (code {}): {}\n\
        \n\
        The file may be locked by another process, or have unsupported codecs.\n\
        Try closing any media players that might have the file open.",
        file_path,
        exit_code, stderr.trim(),
        repair_code, repair_stderr.trim()
    ))
}

#[tauri::command]
pub fn convert_hevc_to_h264(input_path: String) -> Result<String, String> {
    eprintln!("🔄 Converting H.265/HEVC to H.264 (browser-compatible): {}", input_path);
    
    use std::process::Command;
    
    let path = PathBuf::from(&input_path);
    if !path.exists() {
        return Err(format!("File does not exist: {}", input_path));
    }
    
    // Create temp file for conversion (will replace original after)
    let temp_path = path.with_extension("h264.tmp");
    let temp_file = temp_path.to_string_lossy().to_string();
    let path_str = path.to_string_lossy().to_string();
    
    // Convert H.265 to H.264 with AAC audio
    // This is slower (re-encoding required) but necessary for browser compatibility
    let convert = Command::new("ffmpeg")
        .args([
            "-v", "error",
            "-i", &path_str,
            "-c:v", "libx264",      // Convert to H.264
            "-preset", "fast",       // Balance speed/quality
            "-crf", "23",            // Good quality (near-lossless)
            "-c:a", "aac",          // Convert audio to AAC
            "-b:a", "192k",         // Audio bitrate
            "-f", "mp4",            // Explicitly specify MP4 format
            "-movflags", "+faststart",  // Add faststart for streaming
            "-y",
            &temp_file,
        ])
        .output()
        .map_err(|e| format!("Failed to execute FFmpeg: {}. Make sure FFmpeg is installed and in PATH.", e))?;
    
    if !convert.status.success() {
        let _ = std::fs::remove_file(&temp_path);
        let stderr = String::from_utf8_lossy(&convert.stderr);
        return Err(format!("H.265 to H.264 conversion failed: {}", stderr.trim()));
    }
    
    // Replace original with converted file
    std::fs::rename(&temp_path, &path)
        .map_err(|e| {
            let _ = std::fs::remove_file(&temp_path);
            format!("Failed to replace original file: {}", e)
        })?;
    
    eprintln!("✅ Successfully converted H.265 to H.264: {}", input_path);
    Ok(input_path)
}

#[tauri::command]
pub fn make_video_web_ready(input_path: String, output_path: String) -> Result<String, String> {
    eprintln!("🌐 Making video web-ready: {} -> {}", input_path, output_path);
    
    use std::process::Command;
    
    let input = PathBuf::from(&input_path);
    if !input.exists() {
        return Err(format!("Input file does not exist: {}", input_path));
    }
    
    // Check if output directory exists, create if not
    let output = PathBuf::from(&output_path);
    if let Some(parent) = output.parent() {
        std::fs::create_dir_all(parent)
            .map_err(|e| format!("Failed to create output directory: {}", e))?;
    }
    
    // Industry-standard web-ready conversion:
    // Try to copy video first (fast), but if codec is incompatible, convert to H.264
    // -c:v copy: Preserve original video (zero re-encoding, fast) - but only if browser-compatible
    // -c:v libx264 -profile:v baseline: Convert to H.264 baseline (universally supported, but slower)
    // -c:a aac: Convert audio to AAC (universally supported by browsers)
    // -b:a 192k: Audio bitrate (good quality, reasonable size)
    // -movflags +faststart: Move metadata to beginning (enables streaming/progressive playback)
    // This is what Plex, Jellyfin, Stremio, Cloudflare Stream use
    
    // First, try fast mode (copy video codec) - works if original is H.264
    let mut convert = Command::new("ffmpeg");
    convert
        .arg("-i")
        .arg(&input_path)
        .arg("-c:v")
        .arg("copy")        // Try copying video stream first (fast!)
        .arg("-c:a")
        .arg("aac")         // Convert audio to AAC (browser-compatible)
        .arg("-b:a")
        .arg("192k")        // Audio bitrate
        .arg("-movflags")
        .arg("+faststart")  // Move moov atom to beginning (enables streaming)
        .arg("-y")          // Overwrite output
        .arg(&output_path);
    
    // Hide output on Windows
    #[cfg(windows)]
    {
        convert.stdout(std::process::Stdio::null())
            .stderr(std::process::Stdio::null());
    }
    
    let status = convert.status()
        .map_err(|e| format!("Failed to execute FFmpeg: {}. Make sure FFmpeg is installed and in PATH.", e))?;
    
    if !status.success() {
        // Fast mode failed - video codec might not be copyable to MP4
        // Try converting video to H.264 baseline (universally supported, but slower)
        eprintln!("⚠️ Fast mode failed, trying H.264 conversion (slower but guaranteed compatibility)");
        
        let mut convert_h264 = Command::new("ffmpeg");
        convert_h264
            .arg("-i")
            .arg(&input_path)
            .arg("-c:v")
            .arg("libx264")      // Convert to H.264 (browser-compatible)
            .arg("-profile:v")
            .arg("baseline")     // Baseline profile (maximum compatibility)
            .arg("-preset")
            .arg("veryfast")     // Fast encoding preset
            .arg("-crf")
            .arg("23")           // Quality setting
            .arg("-c:a")
            .arg("aac")          // Convert audio to AAC
            .arg("-b:a")
            .arg("192k")         // Audio bitrate
            .arg("-movflags")
            .arg("+faststart")   // Move moov atom to beginning
            .arg("-y")           // Overwrite output
            .arg(&output_path);
        
        #[cfg(windows)]
        {
            convert_h264.stdout(std::process::Stdio::null())
                .stderr(std::process::Stdio::null());
        }
        
        let status_h264 = convert_h264.status()
            .map_err(|e| format!("Failed to execute FFmpeg H.264 conversion: {}. Make sure FFmpeg is installed and in PATH.", e))?;
        
        if !status_h264.success() {
            return Err(format!("FFmpeg conversion failed (both fast and H.264 modes). Exit code: {:?}", status_h264.code()));
        }
        
        eprintln!("✅ Successfully made web-ready with H.264 conversion: {}", output_path);
        Ok(output_path)
    } else {
        eprintln!("✅ Successfully made web-ready (fast mode): {}", output_path);
        Ok(output_path)
    }
}

#[tauri::command]
pub fn convert_mkv_to_mp4(input_path: String, output_path: String, fast_mode: Option<bool>) -> Result<String, String> {
    eprintln!("🔄 Converting MKV to MP4: {} -> {} (fast_mode: {:?})", input_path, output_path, fast_mode);
    
    use std::process::Command;
    
    let input = PathBuf::from(&input_path);
    if !input.exists() {
        return Err(format!("Input file does not exist: {}", input_path));
    }
    
    // Check if output directory exists, create if not
    let output = PathBuf::from(&output_path);
    if let Some(parent) = output.parent() {
        std::fs::create_dir_all(parent)
            .map_err(|e| format!("Failed to create output directory: {}", e))?;
    }
    
    let use_fast_mode = fast_mode.unwrap_or(true); // Default to fast mode
    
    let mut convert = Command::new("ffmpeg");
    convert.arg("-i").arg(&input_path);
    
    if use_fast_mode {
        // FAST MODE: Remux (copy streams) - nearly instant if codecs are compatible
        // This copies video/audio streams without re-encoding
        // Works if video is H.264 and audio is AAC (most common case)
        eprintln!("⚡ Using FAST mode (remux/copy streams)");
        convert
            .arg("-c:v")
            .arg("copy")  // Copy video stream (no re-encoding)
            .arg("-c:a")
            .arg("copy")  // Copy audio stream (no re-encoding)
            .arg("-movflags")
            .arg("+faststart");  // Enable web streaming
    } else {
        // SLOW MODE: Full re-encode (for incompatible codecs)
        eprintln!("🐌 Using SLOW mode (full re-encode)");
        convert
            .arg("-c:v")
            .arg("libx264")  // Re-encode video to H.264
            .arg("-c:a")
            .arg("aac")      // Re-encode audio to AAC
            .arg("-preset")
            .arg("veryfast")  // Faster preset for speed
            .arg("-crf")
            .arg("23")       // Quality setting
            .arg("-movflags")
            .arg("+faststart");
    }
    
    convert.arg("-y").arg(&output_path);
    
    // Hide output on Windows
    #[cfg(windows)]
    {
        convert.stdout(std::process::Stdio::null())
            .stderr(std::process::Stdio::null());
    }
    
    let status = convert.status()
        .map_err(|e| format!("Failed to execute FFmpeg: {}. Make sure FFmpeg is installed and in PATH.", e))?;
    
    if !status.success() {
        // If fast mode failed, it might be due to incompatible codecs
        // Return error with suggestion to try slow mode
        if use_fast_mode {
            return Err(format!("Fast remux failed (codecs may be incompatible). Try slow mode for full re-encode. Exit code: {:?}", status.code()));
        }
        return Err(format!("FFmpeg conversion failed. Exit code: {:?}", status.code()));
    }
    
    eprintln!("✅ Successfully converted: {}", output_path);
    Ok(output_path)
}

#[tauri::command]
pub fn convert_mkv_folder_to_mp4(folder_path: String, output_folder: Option<String>, fast_mode: Option<bool>) -> Result<serde_json::Value, String> {
    eprintln!("🔄 Converting all MKV files in folder: {}", folder_path);
    
    let folder = PathBuf::from(&folder_path);
    if !folder.exists() || !folder.is_dir() {
        return Err(format!("Folder does not exist or is not a directory: {}", folder_path));
    }
    
    // Determine output folder
    let output_dir = if let Some(output) = output_folder {
        PathBuf::from(output)
    } else {
        // Default: create "converted" subfolder in same directory
        folder.join("converted")
    };
    
    std::fs::create_dir_all(&output_dir)
        .map_err(|e| format!("Failed to create output directory: {}", e))?;
    
    let mut results = Vec::new();
    let mut success_count = 0;
    let mut error_count = 0;
    
    // Scan folder for MKV files
    let entries = std::fs::read_dir(&folder)
        .map_err(|e| format!("Failed to read folder: {}", e))?;
    
    for entry in entries {
        let entry = entry.map_err(|e| format!("Failed to read entry: {}", e))?;
        let path = entry.path();
        
        if path.is_file() {
            if let Some(ext) = path.extension() {
                if ext.to_string_lossy().to_lowercase() == "mkv" {
                    let file_name = path.file_stem()
                        .and_then(|s| s.to_str())
                        .unwrap_or("unknown")
                        .to_string();
                    
                    let output_path = output_dir.join(format!("{}.mp4", file_name));
                    
                    eprintln!("📹 Converting: {} -> {}", path.display(), output_path.display());
                    
                    match convert_mkv_to_mp4(
                        path.to_string_lossy().to_string(),
                        output_path.to_string_lossy().to_string(),
                        fast_mode
                    ) {
                        Ok(output) => {
                            results.push(serde_json::json!({
                                "input": path.to_string_lossy().to_string(),
                                "output": output,
                                "status": "success"
                            }));
                            success_count += 1;
                        }
                        Err(e) => {
                            results.push(serde_json::json!({
                                "input": path.to_string_lossy().to_string(),
                                "output": null,
                                "status": "error",
                                "error": e
                            }));
                            error_count += 1;
                        }
                    }
                }
            }
        }
    }
    
    eprintln!("✅ Conversion complete: {} succeeded, {} failed", success_count, error_count);
    
    Ok(serde_json::json!({
        "total": results.len(),
        "success": success_count,
        "errors": error_count,
        "output_folder": output_dir.to_string_lossy().to_string(),
        "results": results
    }))
}

