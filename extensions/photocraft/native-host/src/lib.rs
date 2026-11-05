//! Optional composition root; no default desktop manifest depends on this crate.
//! This executable is an isolated experimental variant; ordinary clients retain an empty registry.
pub const APPLICATION_ID: &str = "com.woohaa3.photocraft.experimental";
pub const UPDATE_CHANNEL: &str = "photocraft-experimental";
pub const DATA_DIRECTORY: &str = "woohaa3-photocraft-experimental";

pub fn editor_factory()
-> std::sync::Arc<dyn woohaa_desktop_host::document_editor::NativeDocumentEditorFactory> {
    std::sync::Arc::new(woohaa_photocraft_native_adapter::desktop::PhotoCraftFactory)
}
