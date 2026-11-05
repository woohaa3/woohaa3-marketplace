# PhotoCraft experimental composition root

`build-native.mjs --build [--release]` generates the isolated Cargo workspace and
builds `woohaa-photocraft-experimental`, with the adapter's `native-ui` feature.
Compilation overrides Tauri identity to `com.woohaa3.photocraft.experimental` and
product name `WooHaa3 PhotoCraft Experimental`. Startup sets a separate default
data directory before any threads start. An explicit `WOOHAA_DESKTOP_DATA_DIR`
remains supported for trial workspaces. Never point two running hosts at one database.

The executable needs the ordinary packaged desktop resources plus bundled
`native-assets/fonts/` files. Packaging must copy the executable/resources, set the
matching app identifier and sign the final bundle. This crate does not update,
publish, or install over the ordinary application. Release builds enable the generic
`diagnostic-performance` feature; collecting remains explicitly opt-in.
