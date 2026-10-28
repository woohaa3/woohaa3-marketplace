import { describe, expect, it } from "vitest";
import { frameProjection } from "./focus-session.js";
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
