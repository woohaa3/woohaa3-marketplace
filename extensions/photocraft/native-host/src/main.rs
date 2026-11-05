#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]
fn main() {
    // Run before Tauri, egui, Rayon or any service threads exist.
    if std::env::var_os("WOOHAA_DESKTOP_DATA_DIR").is_none() {
        let base = if cfg!(target_os = "macos") {
            std::env::var_os("HOME")
                .map(std::path::PathBuf::from)
                .map(|p| p.join("Library/Application Support"))
        } else {
            std::env::var_os("LOCALAPPDATA")
                .or_else(|| std::env::var_os("XDG_DATA_HOME"))
                .map(std::path::PathBuf::from)
        };
        let path = base
            .unwrap_or_else(std::env::temp_dir)
            .join(woohaa_photocraft_native_host::DATA_DIRECTORY);
        unsafe {
            std::env::set_var("WOOHAA_DESKTOP_DATA_DIR", path);
        }
    }
    if let Err(error) = woohaa_desktop_host::host::run_host_with_editors(vec![
        woohaa_photocraft_native_host::editor_factory(),
    ]) {
        eprintln!("PhotoCraft Experimental failed: {error}");
        std::process::exit(1);
    }
}
