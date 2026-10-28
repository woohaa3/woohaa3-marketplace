//! The JS side of the external-canvas seam (`photocraft_ui_egui::overlay`).
//!
//! A page can hand PhotoCraft the picture for the document area without touching the Rust API:
//!
//! ```js
//! const { overlay_set_rgba, overlay_set_transparent, overlay_clear } = await import('./app/photocraft-web.js');
//! const bytes = ctx.getImageData(0, 0, w, h).data;      // Uint8ClampedArray, RGBA
//! overlay_set_rgba(w, h, new Uint8Array(bytes.buffer), true);
//! ```
//!
//! Frames are copied into an egui texture, so no wgpu texture sharing is involved and the same
//! code works on WebGPU and WebGL2, and on the CPU canvas path.

use wasm_bindgen::prelude::*;

/// Say whether a takeover is live.
#[wasm_bindgen]
pub fn overlay_active() -> bool {
    photocraft_ui_egui::overlay::is_active()
}

/// The document area's last on-screen rectangle, in CSS pixels (`[x, y, w, h]`), so a host can
/// position its own element over it. `null` before the first frame with a takeover.
#[wasm_bindgen]
pub fn overlay_rect() -> Option<Box<[f32]>> {
    photocraft_ui_egui::overlay::last_rect().map(|r| Box::new(r) as Box<[f32]>)
}

/// Hand the document area to the host: PhotoCraft draws nothing there.
#[wasm_bindgen]
pub fn overlay_set_transparent() {
    photocraft_ui_egui::overlay::set_transparent();
}

/// Show `rgba` (row-major, top row first, 4 bytes per pixel) in the document area.
///
/// `fill` stretches it to the whole area; otherwise it keeps `width / height` inside the
/// document's rectangle, so it does not distort as the camera moves.
#[wasm_bindgen]
pub fn overlay_set_rgba(width: u32, height: u32, rgba: &[u8], fill: bool) -> Result<(), JsError> {
    let expected = (width as usize) * (height as usize) * 4;
    if width == 0 || height == 0 {
        return Err(JsError::new("overlay: width and height must be positive"));
    }
    if rgba.len() != expected {
        return Err(JsError::new(&format!("overlay: expected {expected} bytes of RGBA, got {}", rgba.len())));
    }
    photocraft_ui_egui::overlay::set_image(photocraft_ui_egui::overlay::Frame {
        width,
        height,
        rgba: rgba.to_vec(),
        fill,
    });
    Ok(())
}

/// Show a solid colour (a quick way to check the seam).
#[wasm_bindgen]
pub fn overlay_set_solid(width: u32, height: u32, rgba: Box<[u8]>) -> Result<(), JsError> {
    let px: [u8; 4] = rgba.as_ref().try_into().map_err(|_| JsError::new("overlay: expected exactly 4 bytes"))?;
    photocraft_ui_egui::overlay::set_image(photocraft_ui_egui::overlay::Frame::solid(width.max(1), height.max(1), px));
    Ok(())
}

/// Give the document area back to PhotoCraft.
#[wasm_bindgen]
pub fn overlay_clear() {
    photocraft_ui_egui::overlay::clear();
}

#[wasm_bindgen]
pub fn overlay_set_capture_clean(on: bool) { photocraft_ui_egui::overlay::set_capture_clean(on); }
#[wasm_bindgen]
pub fn overlay_state() -> String { photocraft_ui_egui::overlay::state() }
#[wasm_bindgen]
pub fn overlay_request_fit() { photocraft_ui_egui::overlay::request_fit(); }
#[wasm_bindgen]
pub fn overlay_request_export(max_side: u32) { photocraft_ui_egui::overlay::request_export(max_side); }
#[wasm_bindgen]
pub fn overlay_take_export() -> Option<Vec<u8>> { photocraft_ui_egui::overlay::take_export() }
#[wasm_bindgen]
pub fn overlay_export_error() -> Option<String> { photocraft_ui_egui::overlay::export_error() }
