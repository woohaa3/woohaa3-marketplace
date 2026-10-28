// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from "vitest";
// @ts-expect-error browser-native JS asset
import { createRuntime, seedDefaultPreferences } from "./app-assets/host-bridge-core.js";
import type { DirectRuntime } from "./direct-runtime.js";
import type { PhotoCraftState } from "./protocol.js";
let runtime: DirectRuntime, snapshot: PhotoCraftState, canvas: HTMLCanvasElement;
let callbacks: Map<number, FrameRequestCallback>, sequence: number, clock: number;
let bitmap: ReturnType<typeof vi.fn>, emit: ReturnType<typeof vi.fn>, wasm: Record<string, ReturnType<typeof vi.fn>>;
const flush = async () => { for (let i = 0; i < 8; i++) await Promise.resolve(); };
async function paint() { clock += 110; const pending = [...callbacks.values()]; callbacks.clear(); for (const cb of pending) cb(clock); await flush(); }
const frames = () => emit.mock.calls.map(([v]) => v).filter(v => v.type === "photocraft:frame");
beforeEach(async () => {
  localStorage.clear();
  snapshot = { documentId: "doc", documentName: "image.png", docWidth: 2, docHeight: 2, revision: 0,
    documentView: { width: 2, height: 2, x: 1, y: 1, zoom: 1 }, viewReady: true,
    dirty: false, rect: [0, 0, 2, 2], operation: false, modal: false, escOwned: false };
  callbacks = new Map(); sequence = 0; clock = 0;
  vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => { callbacks.set(++sequence, cb); return sequence; });
  vi.stubGlobal("cancelAnimationFrame", (id: number) => callbacks.delete(id));
  vi.spyOn(performance, "now").mockImplementation(() => clock);
  vi.spyOn(document, "hidden", "get").mockReturnValue(false);
  const stage = document.createElement("div"); canvas = document.createElement("canvas"); stage.append(canvas); document.body.append(stage);
  canvas.tabIndex = 0; canvas.width = canvas.height = 2; Object.defineProperties(canvas, { clientWidth: { value: 2 }, clientHeight: { value: 2 } });
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation(((type: string) => type === "webgl2"
    ? { getContextAttributes: () => ({ preserveDrawingBuffer: true }) }
    : { drawImage() {}, getImageData: () => ({ data: new Uint8ClampedArray(16).fill(255) }) }) as never);
  bitmap = vi.fn(async () => ({ close: vi.fn() })); vi.stubGlobal("createImageBitmap", bitmap); emit = vi.fn();
  wasm = { default: vi.fn(async () => {}), runtime_create: vi.fn(async () => {}), runtime_destroy: vi.fn(), runtime_presentation: vi.fn(),
    runtime_documents: vi.fn(() => JSON.stringify({ documentId: snapshot.documentId, documents: [{ id: snapshot.documentId, revision: snapshot.revision }] })), runtime_requests: vi.fn(() => "[]"), overlay_state: vi.fn(() => JSON.stringify(snapshot)), overlay_set_capture_clean: vi.fn(),
    runtime_activate: vi.fn(), runtime_open: vi.fn(() => "opened"), runtime_close: vi.fn(), runtime_export: vi.fn(() => new Uint8Array(8)) };
  runtime = await createRuntime({ canvas, assetBaseUrl: `${location.origin}/prefix/extensions/pc/`, onEvent: emit }, async () => wasm);
  runtime.show();
});
afterEach(() => { runtime?.dispose(); canvas.parentElement?.remove(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });
it("uses explicit canvas and prefixed assets without changing location or creating an iframe", () => {
  expect(wasm.runtime_create).toHaveBeenCalledWith(canvas, `${location.origin}/prefix/extensions/pc/`);
  expect(location.search).toBe(""); expect(document.querySelector("iframe")).toBeNull();
  runtime.open("op", "a.png", new Uint8Array(2)); expect(wasm.runtime_open).toHaveBeenCalledOnce();
});
it("starts PhotoCraft on the light default and migrates the old default once", () => {
  localStorage.clear();
  seedDefaultPreferences();
  expect(JSON.parse(localStorage.getItem("photocraft.preferences")!)).toMatchObject({
    interface: { appearanceMode: "light", lightTheme: "proLight" }
  });

  localStorage.clear();
  localStorage.setItem("photocraft.preferences", JSON.stringify({
    general: { beepWhenDone: true },
    interface: { appearanceMode: "dark", darkTheme: "proMedium" }
  }));
  seedDefaultPreferences();
  expect(JSON.parse(localStorage.getItem("photocraft.preferences")!)).toMatchObject({
    general: { beepWhenDone: true },
    interface: { appearanceMode: "light", lightTheme: "proLight" }
  });
  expect(localStorage.getItem("photocraft.integration-light-default-v1")).toBe("1");

  localStorage.clear();
  localStorage.setItem("photocraft.preferences", JSON.stringify({
    interface: { appearanceMode: "dark", darkTheme: "studio" }
  }));
  seedDefaultPreferences();
  expect(JSON.parse(localStorage.getItem("photocraft.preferences")!)).toMatchObject({
    interface: { appearanceMode: "dark", darkTheme: "studio" }
  });
});

it("stops scheduling/capture on hide and releases listeners and runner idempotently", async () => {
  await paint(); expect(frames()).toHaveLength(1); runtime.hide(); expect(callbacks.size).toBe(0);
  await paint(); expect(frames()).toHaveLength(1); runtime.show(); await paint(); expect(frames()).toHaveLength(2);
  runtime.dispose(); runtime.dispose(); expect(wasm.runtime_destroy).toHaveBeenCalledOnce(); expect(callbacks.size).toBe(0);
});
it("never consumes other input fields or Escape owned by egui", () => {
  const field = document.createElement("input"); document.body.append(field); field.focus();
  const e = new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true }); field.dispatchEvent(e);
  expect(e.defaultPrevented).toBe(false); expect(emit).not.toHaveBeenCalled(); field.remove();
  canvas.dispatchEvent(new Event("pointerdown")); snapshot.escOwned = true;
  canvas.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true })); expect(emit).not.toHaveBeenCalled();
  snapshot.escOwned = false; canvas.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
  expect(emit).toHaveBeenCalledWith({ type: "photocraft:escape" });
});
it("rejects an in-flight capture after activation", async () => {
  let release!: (v: unknown) => void; bitmap.mockImplementationOnce(() => new Promise(resolve => { release = resolve; }));
  await paint(); runtime.activate("other"); release({ close() {} }); await flush(); expect(frames()).toHaveLength(0);
  await paint(); expect(frames()).toHaveLength(1);
});
it("captures a changed camera even when pixels and rectangle are unchanged; waits for viewReady", async () => {
  snapshot.viewReady = false; await paint(); expect(bitmap).not.toHaveBeenCalled(); snapshot.viewReady = true;
  await paint(); const first = frames()[0]; runtime.ack(first.id, true);
  snapshot.viewReady = false; snapshot.documentView = { ...snapshot.documentView!, x: 20 }; await paint(); expect(frames()).toHaveLength(2);
});
it("keeps document memory on context loss and blocks unsettled tools", async () => {
  snapshot.operation = true; expect(() => runtime.settle()).toThrow("当前操作"); snapshot.operation = false;
  canvas.dispatchEvent(new Event("webglcontextlost", { cancelable: true })); await paint(); expect(bitmap).not.toHaveBeenCalled();
  expect(wasm.runtime_destroy).not.toHaveBeenCalled(); canvas.dispatchEvent(new Event("webglcontextrestored")); await paint(); expect(frames()).toHaveLength(1);
});
it("reports a fatal engine fault once and stops the loop without silently destroying documents", async()=>{
  wasm.overlay_state.mockImplementationOnce(()=>{throw new Error("runner unavailable");});
  await paint();expect(emit).toHaveBeenCalledWith(expect.objectContaining({type:"photocraft:error",fatal:true}));
  expect(callbacks.size).toBe(0);expect(wasm.runtime_destroy).not.toHaveBeenCalled();
});

it("restores shortcuts on reveal after switching documents, preserving IME and blocked input", () => {
  const field = document.createElement("input"); document.body.append(field); field.focus();
  runtime.activate("doc"); runtime.show(); runtime.focus();
  expect(document.activeElement).toBe(canvas);
  expect(wasm.runtime_presentation).toHaveBeenLastCalledWith(true, true);
  canvas.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
  expect(emit).toHaveBeenCalledWith({ type: "photocraft:escape" });
  const ime = document.createElement("input"); canvas.parentElement!.append(ime); ime.focus(); runtime.focus();
  expect(document.activeElement).toBe(ime);
  runtime.input(false); field.focus(); runtime.focus(); expect(document.activeElement).toBe(field);
  runtime.hide(); runtime.focus(); expect(document.activeElement).toBe(field); field.remove();
});
it("delivers animation pixels with their captured camera while newer camera steps render", async () => {
  await paint(); runtime.ack(frames()[0].id, true);
  let release!: (v: unknown) => void;
  bitmap.mockImplementationOnce(() => new Promise(resolve => { release = resolve; }));
  snapshot.viewReady = false; snapshot.documentView = { ...snapshot.documentView!, zoom: 1.2 };
  await paint(); snapshot.documentView = { ...snapshot.documentView!, zoom: 1.4 };
  release({ close() {} }); await flush();
  expect(frames()).toHaveLength(2); expect(frames()[1].documentView.zoom).toBe(1.2);
  runtime.ack(frames()[1].id, true); await paint(); expect(frames()[2].documentView.zoom).toBe(1.4);
  runtime.activate("doc"); await paint(); expect(frames()).toHaveLength(3);
});
