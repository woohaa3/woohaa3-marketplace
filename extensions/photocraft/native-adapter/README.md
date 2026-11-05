# Native PhotoCraft variant

The optional `native-ui` feature owns one official `PhotocraftApp`; every command,
UI edit, history operation, job commit and export snapshot uses `app.session`.
The CPU test variant owns one engine Session instead. They never coexist in one owner.

The native renderer borrows the host's Bevy adapter, instance, device and queue.
Official GpuCanvas callbacks render the document into a transparent RGBA8 target;
official egui meshes render tools, layers, selections, scrollbars and modals into a
separate UI target. Both outputs contain **gamma-encoded premultiplied alpha**.
The host compositor must unassociate/decode/premultiply before linear blending.
Two queue-ordered slots are reused; resize retains old resources through texture
references. Production rendering does no readback or document pixel serialization.
The upstream clean-canvas shader preserves real source alpha without checkerboard.

Native input includes layout generations, pointer pressure, wheel, zoom, keys and IME.
IME caret, clipboard output and persistent tab requests are returned in frame
snapshots. `native.ack-document-request` acknowledges a forwarded tab action.
Hosted dirty-tab settlement remains owned by the frontend workspace.

Remove/Spot Healing use engine snapshot/work/apply jobs. PNG/project exports run
on a bounded worker from immutable source-size snapshots; the encoding staging
budget is 256 MiB and the host result budget is 64 MiB. An oversized result fails
explicitly without downsampling or moving the saved baseline. Saved baselines
require a successfully exported revision. Native File menu dialogs use async rfd;
user-selected saves encode on the official background save worker and atomically
replace the chosen file. Host automation has no implicit file authority.

Fonts resolve from bundled assets, use the committed served-font manifest, and
must match its SHA-256. The official served-font hooks register UI and document
fallbacks; no development font path is consulted.

Compositor failure retains the same App and uses the official bounded background
CPU redraw worker (four 1024-pixel blocks in flight), with CPU viewport samples
identified separately. `simulate-renderer-failure` and `native.restore-gpu-viewport`
exercise fallback/retry on the still-live window GPU. Device loss releases
renderer/App GPU references, retains CPU-only job bookkeeping and export state,
and pauses presentation until a new injected device generation arrives. Recovery
retires old texture handles and reinstalls fonts while retaining Session/history.
`simulate-presentation-failure` exercises the paused owner; project export remains
available. Host GPU limits include viewport/UI reservation and a hard ceiling for
all cached document canvases and compositor/cache resources; refusal never resizes
the source document or evicts its history.

```sh
node build-native.mjs --client-root /checkout/client --photocraft-source /patched/photocraft
cargo +1.97.1 test --locked --manifest-path .local/native-assembly/Cargo.toml -p woohaa-photocraft-native-adapter --lib
cargo +1.97.1 test --locked --manifest-path .local/native-assembly/Cargo.toml -p woohaa-photocraft-native-adapter --features native-ui --lib official_gpu_ui_document_split_resize_and_alpha -- --ignored
node build-native.mjs --client-root /checkout/client --photocraft-source /patched/photocraft --build --release
```

The assembly requires the pinned source revision, complete replayable patch and
upstream lock. Its first lock seeds the public desktop lock; later runs are locked.
Build identity includes compiler/target, one wgpu 30.0.1 identity, API, locks, patch,
and sorted Rust source-tree hashes. Default client manifests remain independent.
The experimental host has its own identifier/data directory and embeds only the
client's startup loader; the real UI is served by the packaged loopback host.
A Metal offscreen smoke checks official brush edits/undo, source alpha, split
targets, resize, changed-pixel CPU fallback, GPU retry and resource-generation
recreation. It does not establish 60 Hz interaction, M1 Pro performance, native
dialog behavior, or full IME acceptance.

The host pauses underlying canvas scene/animation work and non-editor cameras while
this editor is visible, clears its own backdrop, and restores the previous canvas
state on exit. Safari cumulative pinch scales and ctrl-wheel events become bounded
incremental Zoom inputs; local DOM ownership prevents outer canvas capture.

Preparation diagnostics report renderer/font setup and CPU frame phases, with
first-ready markers and a maximum of 32 detailed reports per renderer. Nested UI
phases overlap their parent totals; these are not GPU duration measurements.

`../bench/run-diagnostic.mjs` is the checked-in portable launcher template for
`../package-native.mjs --launcher`. The resulting directory must also include
`export-webview-performance.mjs` from the public client. It creates an isolated
workspace and writes records beside the package; neither workspace nor raw user
records belong in source control. Runtime build artifacts and source caches must
be regenerated on a fresh machine.
