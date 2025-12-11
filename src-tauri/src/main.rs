#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod db;

use db::{get_user_data, save_user_data, save_video_progress, test_db_connection, check_default_channels, force_initialize_default_channels, set_resource_dir, import_playlist_file, export_playlist, overwrite_playlist_file, export_tab, import_tab_file, save_video_metadata, get_video_metadata_batch, save_video_metadata_batch, scan_local_folder};

// Devtools will be handled via frontend JavaScript
// No Rust command needed - the frontend can use Tauri API directly

fn main() {
  tauri::Builder::default()
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
      scan_local_folder
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
