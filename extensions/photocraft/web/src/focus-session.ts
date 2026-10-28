import type { CanvasRuntimeService } from "@woohaa3/frontend/extension-api";
import type { PhotoCraftFrame } from "./protocol.js";

type Rect = { x: number; y: number; width: number; height: number };
/** All offsets are CSS pixels, independently of captured resolution/DPR. */
export function frameProjection(nodeId: string, frame: PhotoCraftFrame, stage: Rect, surface: Rect, content: Rect | null) {
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

export function createFocusSession(runtime: CanvasRuntimeService, nodeId: string, stage: () => HTMLElement | null) {
  let latest: PhotoCraftFrame | null = null;
  let disposed = false;
  const project = () => {
    const element = stage();
    const surface = document.querySelector<HTMLElement>(".bevy-canvas-surface");
    if (!latest || !element || !surface || disposed) return false;
    const a = element.getBoundingClientRect(), b = surface.getBoundingClientRect();
    if (b.width <= 0 || b.height <= 0) return false;
    runtime.setImageFocus(frameProjection(nodeId, latest, a, b, runtime.focusContentRect()));
    return true;
  };
  const unsubscribe = runtime.subscribeFocusContentRect(project);
  window.addEventListener("resize", project);
  const observer = new ResizeObserver(project);
  if (stage()) observer.observe(stage()!);
  return {
    present(frame: PhotoCraftFrame) {
      if (disposed) return false;
      latest = frame;
      runtime.setImageFocusTexture({ nodeId, width: frame.width, height: frame.height, pixels: new Uint8Array(frame.buffer) });
      return project();
    },
    clear() {
      latest = null;
      runtime.setImageFocusTexture(null);
      runtime.setImageFocus(null);
    },
    dispose() {
      disposed = true;
      unsubscribe(); observer.disconnect(); window.removeEventListener("resize", project);
      this.clear();
    }
  };
}
