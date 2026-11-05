//! Explicit single-window runner. Importing the module never starts an editor.
use std::cell::RefCell;
use wasm_bindgen::{prelude::*, JsCast};
use photocraft_ui_egui::overlay;
thread_local! {
    static RUNNER: RefCell<Option<eframe::WebRunner>> = const { RefCell::new(None) };
    static LISTENERS: RefCell<Vec<Listener>> = const { RefCell::new(Vec::new()) };
    static OPENS: RefCell<std::collections::HashMap<String, String>> = RefCell::new(Default::default());
    static BASE: RefCell<String> = const { RefCell::new(String::new()) };
}
struct Listener { target: web_sys::EventTarget, kind: &'static str, callback: Closure<dyn FnMut(web_sys::Event)> }
pub fn retain_listener(target: web_sys::EventTarget, kind: &'static str, callback: Closure<dyn FnMut(web_sys::Event)>) {
    LISTENERS.with_borrow_mut(|v| v.push(Listener { target, kind, callback }));
}
pub fn install(runner: eframe::WebRunner) -> Result<(), JsValue> {
    RUNNER.with_borrow_mut(|r| { if r.is_some() { Err(JsValue::from_str("PhotoCraft already exists")) } else { *r = Some(runner); Ok(()) } })
}
pub fn asset_url(path: &str) -> String { BASE.with_borrow(|b| format!("{b}{path}")) }
#[wasm_bindgen]
pub async fn runtime_create(canvas: web_sys::HtmlCanvasElement, asset_base_url: String) -> Result<(), JsValue> {
    if RUNNER.with_borrow(|r| r.is_some()) { return Err(JsValue::from_str("PhotoCraft already exists")); }
    overlay::set_hosted(true);
    BASE.with_borrow_mut(|b| *b = asset_base_url);
    crate::web::start(canvas).await
}
#[wasm_bindgen]
pub fn runtime_destroy() {
    RUNNER.with_borrow_mut(|r| { if let Some(runner) = r.take() { runner.destroy(); } });
    LISTENERS.with_borrow_mut(|v| { for l in v.drain(..) { let _ = l.target.remove_event_listener_with_callback(l.kind, l.callback.as_ref().unchecked_ref()); } });
    OPENS.with_borrow_mut(|m| m.clear());
    overlay::set_hosted(false); overlay::set_presentation(true, true); overlay::reset();
}
fn with_app<T>(f: impl FnOnce(&mut photocraft_ui_egui::PhotocraftApp) -> Result<T, String>) -> Result<T, JsValue> {
    RUNNER.with_borrow(|r| {
        let runner = r.as_ref().ok_or("PhotoCraft is not running")?;
        let mut shell = runner.app_mut::<crate::web::WebShell>().ok_or("PhotoCraft is unavailable")?;
        f(&mut shell.app)
    }).map_err(|e| JsValue::from_str(&e))
}
#[wasm_bindgen]
pub fn runtime_open(operation_id: String, name: String, bytes: &[u8]) -> Result<String, JsValue> {
    if let Some(id) = OPENS.with_borrow(|m| m.get(&operation_id).cloned()) { return Ok(id); }
    let id = with_app(|app| photocraft_ui_egui::overlay_workspace::open(app, &name, bytes))?;
    OPENS.with_borrow_mut(|m| { m.insert(operation_id, id.clone()); });
    overlay::request_fit();
    Ok(id)
}
#[wasm_bindgen]
pub fn runtime_activate(id: String) -> Result<(), JsValue> {
    with_app(|app| photocraft_ui_egui::overlay_workspace::activate(app, &id))?;
    overlay::wake_runtime(); Ok(())
}
#[wasm_bindgen]
pub fn runtime_close(id: String) -> Result<(), JsValue> {
    with_app(|app| photocraft_ui_egui::overlay_workspace::close(app, &id))?;
    OPENS.with_borrow_mut(|m| m.retain(|_, doc| doc != &id));
    overlay::wake_runtime(); Ok(())
}
#[wasm_bindgen]
pub fn runtime_export(id: String, project: bool) -> Result<Vec<u8>, JsValue> {
    with_app(|app| {
        let st = app.session.documents().iter().find(|d| d.doc.id.0.to_string() == id).ok_or("Document is closed")?;
        photocraft_io::export(&st.doc, if project { "document.pcraft" } else { "export.png" }, &Default::default()).map(|r| r.bytes).map_err(|e| e.to_string())
    })
}

#[wasm_bindgen]
pub fn runtime_presentation(visible: bool, input: bool) { overlay::set_presentation(visible, input); }
#[wasm_bindgen]
pub fn runtime_requests() -> String { overlay::take_requests() }

#[wasm_bindgen]
pub fn runtime_documents() -> Result<String, JsValue> { with_app(|app| Ok(photocraft_ui_egui::overlay_workspace::list(app))) }
