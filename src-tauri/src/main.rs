#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod db;

use db::{get_user_data, save_user_data, save_video_progress, test_db_connection, check_default_channels, force_initialize_default_channels, set_resource_dir, import_playlist_file, export_playlist, overwrite_playlist_file, export_tab, import_tab_file, save_video_metadata, get_video_metadata_batch, save_video_metadata_batch, scan_local_folder, save_thumbnail, get_thumbnail_path_command, get_thumbnail_data_url, extract_video_thumbnail, get_file_size, convert_mkv_to_mp4, convert_mkv_folder_to_mp4, make_video_web_ready, add_faststart_in_place, convert_hevc_to_h264};
use serde::{Serialize, Deserialize};
use tauri::Manager;
use tiny_http::{Header, Response, Server, ListenAddr};
use std::fs::File;
use std::io::{Read, Seek, SeekFrom};
use std::sync::{Arc, Mutex};
use std::thread;

#[derive(Default)]
struct AppState {
    port: Mutex<u16>,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct VideoDebugInfo {
    pub server_port: u16,
    pub server_running: bool,
    pub file_exists: bool,
    pub file_size: u64,
    pub file_readable: bool,
    pub ffmpeg_available: bool,
    pub ffmpeg_version: Option<String>,
    pub ffprobe_available: bool,
    pub moov_at_start: Option<bool>,
    pub file_format: Option<String>,
    pub video_codec: Option<String>,
    pub audio_codec: Option<String>,
    pub duration: Option<f64>,
    pub errors: Vec<String>,
}

#[tauri::command]
fn get_video_debug_info(app: tauri::AppHandle, file_path: String) -> Result<VideoDebugInfo, String> {
    let mut info = VideoDebugInfo {
        server_port: 0,
        server_running: false,
        file_exists: false,
        file_size: 0,
        file_readable: false,
        ffmpeg_available: false,
        ffmpeg_version: None,
        ffprobe_available: false,
        moov_at_start: None,
        file_format: None,
        video_codec: None,
        audio_codec: None,
        duration: None,
        errors: Vec::new(),
    };

    // Check server status
    let state = app.state::<Arc<AppState>>();
    if let Ok(port_lock) = state.port.lock() {
        info.server_port = *port_lock;
        info.server_running = *port_lock != 0;
    } else {
        info.errors.push("Failed to access server state".to_string());
    }

    // Check file
    let path = std::path::PathBuf::from(&file_path);
    info.file_exists = path.exists();
    
    if info.file_exists {
        if let Ok(metadata) = std::fs::metadata(&path) {
            info.file_size = metadata.len();
        } else {
            info.errors.push("File exists but cannot read metadata".to_string());
        }

        // Check if file is readable
        if let Ok(_) = std::fs::File::open(&path) {
            info.file_readable = true;
        } else {
            info.errors.push("File exists but cannot be opened".to_string());
        }
    } else {
        info.errors.push(format!("File does not exist: {}", file_path));
    }

    // Check FFmpeg availability
    match std::process::Command::new("ffmpeg")
        .arg("-version")
        .output()
    {
        Ok(output) => {
            info.ffmpeg_available = output.status.success();
            if info.ffmpeg_available {
                info.ffmpeg_version = String::from_utf8_lossy(&output.stdout)
                    .lines()
                    .next()
                    .map(|s| s.to_string());
            }
        }
        Err(e) => {
            info.errors.push(format!("FFmpeg not found: {}", e));
        }
    }

    // Check FFprobe availability
    match std::process::Command::new("ffprobe")
        .arg("-version")
        .output()
    {
        Ok(output) => {
            info.ffprobe_available = output.status.success();
        }
        Err(e) => {
            info.errors.push(format!("FFprobe not found: {}", e));
        }
    }

    // Use FFprobe to get detailed file info
    if info.ffprobe_available && info.file_exists {
        match std::process::Command::new("ffprobe")
            .args([
                "-v", "error",
                "-print_format", "json",
                "-show_format",
                "-show_streams",
                &file_path,
            ])
            .output()
        {
            Ok(output) => {
                if output.status.success() {
                    if let Ok(json_str) = String::from_utf8(output.stdout) {
                        if let Ok(json) = serde_json::from_str::<serde_json::Value>(&json_str) {
                            // Extract format info
                            if let Some(format) = json.get("format") {
                                if let Some(duration) = format.get("duration")
                                    .and_then(|d| d.as_str())
                                    .and_then(|s| s.parse::<f64>().ok())
                                {
                                    info.duration = Some(duration);
                                }
                                
                                // Check for faststart tag (indicates moov at start)
                                if let Some(tags) = format.get("tags") {
                                    if let Some(faststart) = tags.get("faststart") {
                                        info.moov_at_start = faststart.as_str().map(|s| s == "1" || s == "yes");
                                    }
                                }
                                
                                // Get format name
                                if let Some(format_name) = format.get("format_name") {
                                    info.file_format = format_name.as_str().map(|s| s.to_string());
                                }
                            }

                            // Extract codec info
                            if let Some(streams) = json.get("streams").and_then(|s| s.as_array()) {
                                for stream in streams {
                                    if let Some(codec_type) = stream.get("codec_type").and_then(|t| t.as_str()) {
                                        if let Some(codec_name) = stream.get("codec_name").and_then(|n| n.as_str()) {
                                            match codec_type {
                                                "video" => info.video_codec = Some(codec_name.to_string()),
                                                "audio" => info.audio_codec = Some(codec_name.to_string()),
                                                _ => {}
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                } else {
                    let stderr = String::from_utf8_lossy(&output.stderr);
                    info.errors.push(format!("FFprobe failed: {}", stderr));
                }
            }
            Err(e) => {
                info.errors.push(format!("Failed to run FFprobe: {}", e));
            }
        }
    }

    Ok(info)
}

fn get_port_from_listen_addr(addr: &ListenAddr) -> Result<u16, String> {
    // Convert ListenAddr to string and parse port
    // Format is typically "127.0.0.1:PORT" or "[::1]:PORT"
    let addr_str = format!("{}", addr);
    
    // Extract port from string like "127.0.0.1:12345" or "[::1]:12345"
    if let Some(colon_pos) = addr_str.rfind(':') {
        let port_str = &addr_str[colon_pos + 1..];
        if let Ok(port) = port_str.parse::<u16>() {
            return Ok(port);
        }
    }
    
    Err("Could not extract port from server address".to_string())
}

fn parse_range(header: &str, size: u64) -> Option<(u64, u64)> {
    header.strip_prefix("bytes=")?
        .split_once('-')
        .and_then(|(s, e)| {
            let start = s.parse().ok()?;
            let end = if e.is_empty() { size - 1 } else { e.parse().ok()? };
            Some((start, end.min(size - 1)))
        })
}

#[tauri::command]
fn start_video_server(app: tauri::AppHandle) -> Result<u16, String> {
    let state = app.state::<Arc<AppState>>();
    let mut port_lock = state.port.lock().map_err(|e| e.to_string())?;

    if *port_lock != 0 {
        return Ok(*port_lock); // Already running
    }

    let server = Arc::new(Server::http("127.0.0.1:0").map_err(|e| e.to_string())?);
    // Get port from server address
    let listen_addr = server.server_addr();
    let port = get_port_from_listen_addr(&listen_addr)?;
    *port_lock = port;

    let server_clone = server.clone();
    thread::spawn(move || {
        for request in server_clone.incoming_requests() {
            if !request.url().starts_with("/video/") {
                let _ = request.respond(Response::from_string("404").with_status_code(404));
                continue;
            }

            let encoded_path = request.url().strip_prefix("/video/").unwrap();
            let path = match urlencoding::decode(encoded_path) {
                Ok(p) => p.into_owned(),
                Err(_) => {
                    let _ = request.respond(Response::from_string("Bad path").with_status_code(400));
                    continue;
                }
            };

            let mut file = match File::open(&path) {
                Ok(f) => f,
                Err(_) => {
                    let _ = request.respond(Response::from_string("Not found").with_status_code(404));
                    continue;
                }
            };
            
            let file_size = match file.metadata() {
                Ok(m) => m.len(),
                Err(_) => {
                    let _ = request.respond(Response::from_string("Cannot read file").with_status_code(500));
                    continue;
                }
            };

            let (start, end, partial) = request.headers()
                .iter()
                .find(|h| h.field.equiv("Range"))
                .and_then(|h| parse_range(h.value.as_str(), file_size))
                .map(|(s, e)| (s, e, true))
                .unwrap_or((0, file_size.saturating_sub(1), false));

            let length = end - start + 1;
            if let Err(_) = file.seek(SeekFrom::Start(start)) {
                let _ = request.respond(Response::from_string("Seek error").with_status_code(500));
                continue;
            }

            // Determine MIME type from file extension (Grok's fix - use as_ref() for proper type)
            let mime = mime_guess::from_path(&path).first_or_octet_stream();

            let mut resp = Response::empty(if partial { 206 } else { 200 })
                .with_header(Header::from_bytes("Accept-Ranges", b"bytes").unwrap())
                .with_header(Header::from_bytes("Content-Length", length.to_string().as_bytes()).unwrap())
                .with_header(Header::from_bytes("Content-Type", mime.as_ref().as_bytes()).unwrap());

            if partial {
                resp = resp.with_header(
                    Header::from_bytes(
                        "Content-Range",
                        format!("bytes {start}-{end}/{file_size}").as_bytes()
                    ).unwrap()
                );
            }

            let _ = request.respond(resp.with_data(file.take(length), Some(length as usize)));
        }
    });

    Ok(port)
}

// Devtools will be handled via frontend JavaScript
// No Rust command needed - the frontend can use Tauri API directly

fn main() {
  tauri::Builder::default()
    .manage(Arc::new(AppState::default()))
    .invoke_handler(tauri::generate_handler![
      test_db_connection,
      get_user_data,
      save_user_data,
      save_video_progress,
      check_default_channels,
      force_initialize_default_channels,
      import_playlist_file,
      export_playlist,
      overwrite_playlist_file,
      export_tab,
      import_tab_file,
      save_video_metadata,
      get_video_metadata_batch,
      save_video_metadata_batch,
      scan_local_folder,
      save_thumbnail,
      get_thumbnail_path_command,
      get_thumbnail_data_url,
      extract_video_thumbnail,
      get_file_size,
      convert_mkv_to_mp4,
      convert_mkv_folder_to_mp4,
      make_video_web_ready,
      add_faststart_in_place,
      convert_hevc_to_h264,
      start_video_server,
      get_video_debug_info
    ])
    .plugin(tauri_plugin_dialog::init())
    .plugin(tauri_plugin_fs::init())
    .plugin(tauri_plugin_shell::init())
    .setup(|_app| {
      // Set resource directory for accessing bundled files like default-channels.json
      // Tauri NSIS installers place resources in _up_ subdirectory
      if let Ok(exe_path) = std::env::current_exe() {
        if let Some(exe_dir) = exe_path.parent() {
          // Try _up_ subdirectory first (Tauri NSIS installer location)
          let up_path = exe_dir.join("_up_");
          if up_path.exists() {
            eprintln!("📁 Resource directory set to: {:?}", up_path);
            set_resource_dir(Some(up_path));
          } else {
            // Fallback: check if resources subdirectory exists
            let resources_path = exe_dir.join("resources");
            if resources_path.exists() {
              eprintln!("📁 Resource directory set to: {:?}", resources_path);
              set_resource_dir(Some(resources_path));
            } else {
              // Last fallback: use exe directory
              eprintln!("📁 Resource directory set to: {:?}", exe_dir);
              set_resource_dir(Some(exe_dir.to_path_buf()));
            }
          }
        }
      }
      
      // Devtools will be opened via keyboard shortcut or JavaScript
      // In debug mode, we can enable it via config if needed
      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
