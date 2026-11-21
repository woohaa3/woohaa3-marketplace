import type { CanvasRuntimeService } from "@woohaa3/frontend/extension-api";
import type { PhotoCraftFrame } from "./protocol.js";

export type PhotoCraftFrameMetadata = Pick<PhotoCraftFrame, "width" | "height" | "rect" | "documentView">;
type Rect = { x: number; y: number; width: number; height: number };

/**
 * Renderer lease the session was created under: the canvas visit (and, on the same canvas, the
 * renderer scope) that owned the runtime when the editor took over. Frames and cleanup produced
 * under this lease are only allowed to touch that visit.
 *
 * Structurally identical to the host `CanvasScope`; imported type-only so the two packages do not
 * need a runtime dependency, and the text-format editor (legacy runtime, no native access) keeps
 * working with `undefined`.
 */
export type PhotoCraftCanvasLease = Readonly<{ canvasId: string; token: string; sequence: number }>;

/** The host runtime as this extension needs it: every optional part is old-host compatible. */
export type PhotoCraftFocusRuntime = Pick<CanvasRuntimeService,
  "setImageFocus" | "setImageFocusTexture" | "focusContentRect" | "subscribeFocusContentRect"> & {
  currentCanvasScope?(): PhotoCraftCanvasLease | null;
  subscribeCanvasScope?(listener: () => void): () => void;
};

/** All offsets are CSS pixels, independently of captured resolution/DPR. */
export function frameProjection(nodeId: string, frame: PhotoCraftFrameMetadata, stage: Rect, surface: Rect, content: Rect | null) {
  const host = content ?? { x: 0, y: 0, width: surface.width, height: surface.height };
  return {
    version: "woohaa-image-focus-v1" as const, nodeId, presentationReady: true,
    sourceWidth: frame.width, sourceHeight: frame.height,
    ...(frame.documentView ? { documentView: {
      sourceWidth: frame.documentView.width, sourceHeight: frame.documentView.height,
      viewport: {
        x: stage.x - surface.x + frame.documentView.x - host.x - host.width / 2,
        y: stage.y - surface.y + frame.documentView.y - host.y - host.height / 2,
        zoom: frame.documentView.zoom
      }
    } } : {}),
    viewport: {
      x: stage.x - surface.x + frame.rect[0] + frame.rect[2] / 2 - host.x - host.width / 2,
      y: stage.y - surface.y + frame.rect[1] + frame.rect[3] / 2 - host.y - host.height / 2,
      zoom: frame.rect[2] / frame.width
    }
  };
}

/**
 * @param frozenLease Lease captured when the editor lease was taken (`enter`). Every texture,
 *   projection and clear is routed through it, so a frame decoded after the user switched
 *   canvases (or after the renderer was recreated on the same canvas) cannot paint into the new
 *   visit, and a stale cleanup cannot clear the new visit's focus.
 *   `undefined` means a legacy runtime: calls keep their old single-argument shape.
 */
export function createFocusSession(
  runtime: PhotoCraftFocusRuntime,
  nodeId: string,
  stage: () => HTMLElement | null,
  frozenLease?: PhotoCraftCanvasLease | null,
) {
  let latest: PhotoCraftFrameMetadata | null = null;
  let disposed = false;
  const scoped = frozenLease ?? undefined;
  /** The frozen visit is still the one the runtime is rendering. */
  const leaseCurrent = () => {
    if (!scoped) return true;
    const live = runtime.currentCanvasScope;
    // A runtime that only exposes the capability but not the query cannot be verified.
    return typeof live === "function" ? live.call(runtime) === scoped : false;
  };
  const setTexture = (texture: Parameters<CanvasRuntimeService["setImageFocusTexture"]>[0]) =>
    scoped ? runtime.setImageFocusTexture(texture, scoped) : runtime.setImageFocusTexture(texture);
  const setProjection = (projection: Parameters<CanvasRuntimeService["setImageFocus"]>[0]) =>
    scoped ? runtime.setImageFocus(projection, scoped) : runtime.setImageFocus(projection);
  const project = () => {
    const element = stage();
    const surface = document.querySelector<HTMLElement>(".bevy-canvas-surface");
    if (!latest || !element || !surface || disposed || !leaseCurrent()) return false;
    const a = element.getBoundingClientRect(), b = surface.getBoundingClientRect();
    if (b.width <= 0 || b.height <= 0) return false;
    setProjection(frameProjection(nodeId, latest, a, b, runtime.focusContentRect()));
    return true;
  };
  const unsubscribe = runtime.subscribeFocusContentRect(project);
  // Renderer recreation on the same canvas changes the scope without a user action: drop the
  // frozen projections right away and stop projecting under the stale lease.
  const stopScope = runtime.subscribeCanvasScope ? runtime.subscribeCanvasScope(() => {
    if (disposed || !scoped || leaseCurrent()) return;
    latest = null;
    setTexture(null);
    setProjection(null);
  }) : () => {};
  window.addEventListener("resize", project);
  const observer = new ResizeObserver(project);
  if (stage()) observer.observe(stage()!);
  return {
    lease: scoped ?? null,
    present(frame: PhotoCraftFrame) {
      if (disposed || !leaseCurrent()) return false;
      latest = frame;
      setTexture({ nodeId, width: frame.width, height: frame.height, pixels: new Uint8Array(frame.buffer) });
      return project();
    },
    presentMetadata(frame: PhotoCraftFrameMetadata) {
      if (disposed || !leaseCurrent()) return false;
      latest = frame;
      return project();
    },
    clear() {
      latest = null;
      setTexture(null);
      setProjection(null);
    },
    dispose() {
      disposed = true;
      unsubscribe(); stopScope(); observer.disconnect(); window.removeEventListener("resize", project);
      this.clear();
    }
  };
}
