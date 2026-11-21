// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { createFocusSession, frameProjection } from "./focus-session.js";
import { validFrame, type PhotoCraftFrame } from "./protocol.js";
const frame: PhotoCraftFrame = { id: 1, width: 1000, height: 600, buffer: new ArrayBuffer(1000 * 600 * 4), rect: [40, 80, 500, 300], documentId: "d" };
describe("document frame projection", () => {
  it("maps DPR/downsampled pixels to CSS coordinates with a shifted header and surface", () => {
    const projection = frameProjection("n", frame,
      { x: 20, y: 48, width: 1000, height: 700 },
      { x: 10, y: 8, width: 1100, height: 800 }, { x: 100, y: 50, width: 800, height: 600 });
    expect(projection.viewport).toEqual({ x: -200, y: -80, zoom: .5 });
    expect(projection.presentationReady).toBe(true);
  });
  it("falls back to the surface center and reprojects a changed viewport", () => {
    const rect = { x: 0, y: 0, width: 1000, height: 700 };
    expect(frameProjection("n", frame, rect, rect, null).viewport).toEqual({ x: -210, y: -120, zoom: .5 });
    expect(frameProjection("n", { ...frame, rect: [0, 0, 1000, 600] }, rect, rect, null).viewport).toEqual({ x: 0, y: -50, zoom: 1 });
  });
  it("reprojects when the drawer shrinks the shared content rect", () => {
    const stage = { x: 0, y: 0, width: 1000, height: 700 };
    const surface = { x: 0, y: 0, width: 1200, height: 800 };
    const wide = frameProjection("n", frame, stage, surface, { x: 0, y: 0, width: 1200, height: 800 });
    const narrow = frameProjection("n", frame, stage, surface, { x: 0, y: 0, width: 800, height: 800 });
    expect(narrow.viewport.x - wide.viewport.x).toBe(200);
    expect(narrow.viewport.y).toBe(wide.viewport.y);
  });
  it("projects the document camera independently of downsampled frame pixels", () => {
    const stage = { x: 20, y: 48, width: 1000, height: 700 };
    const surface = { x: 10, y: 8, width: 1100, height: 800 };
    const content = { x: 100, y: 50, width: 800, height: 600 };
    const documentView = { width: 4000, height: 3000, x: 250, y: 200, zoom: .125 };
    const projection = frameProjection("n", { ...frame, documentView }, stage, surface, content);
    expect(projection.documentView).toEqual({ sourceWidth: 4000, sourceHeight: 3000,
      viewport: { x: -240, y: -110, zoom: .125 } });
    const panned = frameProjection("n", { ...frame, documentView: { ...documentView, x: 300, zoom: .25 } }, stage, surface, content);
    expect(panned.viewport).toEqual(projection.viewport);
    expect(panned.documentView?.viewport).toEqual({ x: -190, y: -110, zoom: .25 });
  });
  it("rejects oversized, truncated and invalid coordinate frames before upload", () => {
    expect(validFrame(frame)).toBe(true);
    expect(validFrame({ ...frame, width: 2049 })).toBe(false);
    expect(validFrame({ ...frame, buffer: new ArrayBuffer(4) })).toBe(false);
    expect(validFrame({ ...frame, rect: [0, NaN, 1, 1] })).toBe(false);
  });
});

// --- renderer access identity (canvas visit / scope) -----------------------------------------

const visit = (token: string) => Object.freeze({ canvasId: "canvas", token, sequence: Number(token) });

function stageWithSurface() {
  const stage = document.createElement("div");
  stage.getBoundingClientRect = () => ({ x: 0, y: 0, width: 800, height: 600, top: 0, left: 0, right: 800, bottom: 600, toJSON() {} }) as DOMRect;
  const surface = document.createElement("div");
  surface.className = "bevy-canvas-surface";
  surface.getBoundingClientRect = () => ({ x: 0, y: 0, width: 1000, height: 800, top: 0, left: 0, right: 1000, bottom: 800, toJSON() {} }) as DOMRect;
  document.body.append(surface);
  return stage;
}

function scopedRuntime(initial: ReturnType<typeof visit> | null) {
  let current = initial as ReturnType<typeof visit> | null;
  const listeners = new Set<() => void>();
  const textures: unknown[][] = [], focuses: unknown[][] = [];
  const runtime = {
    setImageFocusTexture: (...args: unknown[]) => { textures.push(args); },
    setImageFocus: (...args: unknown[]) => { focuses.push(args); },
    focusContentRect: () => null,
    subscribeFocusContentRect: () => () => {},
    currentCanvasScope: () => current,
    subscribeCanvasScope: (listener: () => void) => { listeners.add(listener); return () => listeners.delete(listener); },
  };
  return {
    runtime, textures, focuses,
    switchTo: (next: ReturnType<typeof visit> | null) => { current = next; listeners.forEach(listener => listener()); },
  };
}

const liveFrame = (id: number): PhotoCraftFrame => ({ ...frame, id, buffer: new ArrayBuffer(1000 * 600 * 4) });

describe("renderer access identity", () => {
  afterEach(() => { document.body.innerHTML = ""; (globalThis as { ResizeObserver?: unknown }).ResizeObserver = undefined; });
  it("keeps a stale frame out of the next visit and only cleans up its own visit", () => {
    (globalThis as { ResizeObserver?: unknown }).ResizeObserver = class { observe() {} disconnect() {} };
    const a = visit("1"), b = visit("2");
    const host = scopedRuntime(a);
    const stage = stageWithSurface();
    const sessionA = createFocusSession(host.runtime as never, "node", () => stage, a);
    expect(sessionA.present(liveFrame(1))).toBe(true);
    // Canvas switches to B while A's capture is still on its way.
    host.switchTo(b);
    expect(sessionA.present(liveFrame(2))).toBe(false);
    // A's cleanup is routed through A's lease, never through B.
    sessionA.dispose();
    expect(host.textures.at(-1)).toEqual([null, a]);
    expect(host.focuses.at(-1)).toEqual([null, a]);
    // Every accepted call carried the frozen lease.
    expect(host.textures[0]).toHaveLength(2);
    expect(host.textures[0][1]).toBe(a);
  });

  it("same-canvas renderer recreation stops the old session from projecting", () => {
    (globalThis as { ResizeObserver?: unknown }).ResizeObserver = class { observe() {} disconnect() {} };
    const first = Object.freeze({ canvasId: "canvas", token: "1", sequence: 1 });
    const recreated = Object.freeze({ canvasId: "canvas", token: "2", sequence: 2 });
    const host = scopedRuntime(first);
    const stage = stageWithSurface();
    const session = createFocusSession(host.runtime as never, "node", () => stage, first);
    expect(session.present(liveFrame(1))).toBe(true);
    host.switchTo(recreated);
    expect(session.present(liveFrame(2))).toBe(false);
    expect(session.presentMetadata({ ...frame })).toBe(false);
    session.dispose();
  });

  it("legacy runtime keeps single-argument calls", () => {
    (globalThis as { ResizeObserver?: unknown }).ResizeObserver = class { observe() {} disconnect() {} };
    const textures: unknown[][] = [], focuses: unknown[][] = [];
    const legacy = {
      setImageFocusTexture: (...args: unknown[]) => { textures.push(args); },
      setImageFocus: (...args: unknown[]) => { focuses.push(args); },
      focusContentRect: () => null,
      subscribeFocusContentRect: () => () => {},
    };
    const stage = stageWithSurface();
    const session = createFocusSession(legacy as never, "node", () => stage);
    expect(session.present(liveFrame(1))).toBe(true);
    session.dispose();
    for (const call of [...textures, ...focuses]) expect(call).toHaveLength(1);
  });
});
