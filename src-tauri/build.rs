fn main() {
  tauri_build::build();
  
  // Copy default-channels.json to output directory if it exists
  let default_channels_src = std::path::Path::new("../default-channels.json");
  if default_channels_src.exists() {
    // Try to copy to target directory (for development/testing)
    let out_dir = std::env::var("OUT_DIR").unwrap();
    let target_dir = std::path::Path::new(&out_dir)
      .ancestors()
      .nth(3) // Go up from target/debug/build/.../out to target/debug
      .and_then(|p| p.parent()); // Go to target
    
    if let Some(target) = target_dir {
      let dest = target.join("default-channels.json");
      if let Err(e) = std::fs::copy(default_channels_src, &dest) {
        eprintln!("Warning: Could not copy default-channels.json: {}", e);
      } else {
        println!("Copied default-channels.json to {:?}", dest);
      }
    }
  }
}
