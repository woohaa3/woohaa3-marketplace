/** Actual HTTP adapters, Media ingest, edit receipts and domain commands; no renderer. */
import http from "node:http";
import { afterEach, expect, it } from "vitest";
import { applyCanvasCommands, createEmptyWoohaa3ServerCanvas, type ServerCanvas, type MediaStorage } from "@woohaa3/contracts";
import { createCanvasRemote } from "../../../../../client/web/frontend/src/cordis/services/canvas-remote.js";
import { createMediaRemote } from "../../../../../client/web/frontend/src/cordis/services/media-remote.js";
import { createWriteBack } from "./write-back.js";
import { resolveImageFocusImage } from "./focus-targets.js";
import { createMediaRequestHandler } from "../../../../../client/web/services/media-service/src/api/public-handler.js";
import { createEditCompletionRequestHandler } from "../../../../../client/web/services/canvas-service/src/api/edit-completion-api.js";
import { EditCompletionService } from "../../../../../client/web/services/canvas-service/src/storage/core/edit-completion-service.js";
import { InMemoryEditCompletionRepository } from "../../../../../client/web/services/canvas-service/src/storage/core/in-memory-edit-completion-repository.js";
import { InMemoryNodeHistoryRepository } from "../../../../../client/web/services/canvas-service/src/storage/core/in-memory-node-history-repository.js";
import { NodeHistoryApplicationService } from "../../../../../client/web/services/canvas-service/src/storage/core/node-history-service.js";
import type { CanvasRoom } from "../../../../../client/web/services/canvas-service/src/sync/index.js";
const closers: Array<() => Promise<void>> = [];
afterEach(async () => { await Promise.all(closers.splice(0).map(close => close())); });
// A fixed 1×1 PNG fixture; pixel rendering is outside this protocol test.
const png = Uint8Array.from(Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLttAAAAABJRU5ErkJggg==", "base64"));
async function harness(options = { loseCompleteResponse: false }) {
  const now = "2026-10-25T00:00:00.000Z", key = `sha256-${"a".repeat(64)}`;
  let canvas = { ...createEmptyWoohaa3ServerCanvas("canvas-1", now), revision: 1,
    document: { nodes: [{ id: "image", type: "image", position: { x: 0, y: 0 }, width: 200, height: 200 }], edges: [] },
    assets: [{ id: "original", title: "image.png", mediaKind: "image", source: "uploaded", status: "ready", createdAt: now,
      url: `/api/media/${key}`, metadata: { storageKey: key, checksum: "a".repeat(64), contentType: "image/png", size: png.length } }],
    nodeData: { image: { title: "image.png", outputAssetId: "original", taskStatus: "successed" } }
  } as unknown as ServerCanvas;
  const durable = new Map<string, { revision: number }>();
  let submissions = 0, uploads = 0;
  const room = { exportCanvas: () => ({ ok: true, canvas }), lookupCommand: async (id: string) => durable.get(id) ?? null,
    async submit(batch: { commandId: string; commands: Parameters<typeof applyCanvasCommands>[1] }) {
      const applied = applyCanvasCommands(canvas, batch.commands, { now });
      if (!applied.ok) throw new Error(applied.rejection.message);
      canvas = { ...applied.canvas, revision: canvas.revision + 1 }; submissions++;
      durable.set(batch.commandId, { revision: canvas.revision });
      return { ok: true, status: "accepted", revision: canvas.revision, commandId: batch.commandId, noop: false, update: null };
    }
  } as unknown as CanvasRoom;
  const objects = new Map<string, { bytes: Uint8Array; contentType: string }>([[key, { bytes: png, contentType: "image/png" }]]);
  const storage = { async put(id: string, bytes: Uint8Array, contentType: string) { uploads++; objects.set(id, { bytes, contentType }); },
    async get(id: string) { const value = objects.get(id); if (!value) throw new Error("not found"); return value; },
    async exists(id: string) { return objects.has(id); }
  } as MediaStorage;
  const repository = new InMemoryNodeHistoryRepository();
  const history = new NodeHistoryApplicationService({ repository, resolveRoom: async () => room });
  const edit = new EditCompletionService({ completions: new InMemoryEditCompletionRepository(), resolveRoom: async () => room,
    publisher: { registerEntry: entry => history.registerEntry(entry), listEntriesForNode: (id, node) => history.listEntriesForNode(id, node) },
    mediaVerifier: { exists: async id => objects.has(id) }, now: () => now });
  const mediaHandler = createMediaRequestHandler({ storage });
  const editHandler = createEditCompletionRequestHandler({ service: edit, canvasExists: async id => id === canvas.id });
  const server = http.createServer((req, res) => { void (async () => {
    if (await mediaHandler(req, res) || await editHandler(req, res)) return;
    res.writeHead(404); res.end();
  })().catch(error => { res.writeHead(500); res.end(String(error)); }); });
  await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve));
  closers.push(() => new Promise<void>(resolve => { server.closeAllConnections(); server.close(() => resolve()); }));
  const address = server.address(); if (!address || typeof address === "string") throw new Error("No port");
  const origin = `http://127.0.0.1:${address.port}`;
  let lost = false;
  const fetchImpl: typeof fetch = async (url, init) => {
    const response = await fetch(new URL(String(url), origin), init);
    if (options.loseCompleteResponse && !lost && String(url).endsWith("edit-complete")) { lost = true; await response.text(); throw new Error("response lost"); }
    return response;
  };
  const deps = { canvasRemote: createCanvasRemote({ canvasId: canvas.id, fetchImpl }), mediaRemote: createMediaRemote({ fetchImpl }),
    canvasSession: { isWritable: () => true } };
  const source = resolveImageFocusImage(canvas, "image")!;
  return { writer: createWriteBack(deps as never, canvas.id, "image", source), canvas: () => canvas,
    counts: () => ({ submissions, uploads }), objects, changeSource: () => { canvas = { ...canvas, assets: canvas.assets.map(asset => ({ ...asset, metadata: { ...asset.metadata, storageKey: "sha256-" + "b".repeat(64) } })) }; } };
}
it("applies a PNG through real HTTP services and publishes exactly one media result", async () => {
  const h = await harness(); await h.writer.apply(async () => png);
  const data = h.canvas().nodeData.image; const asset = h.canvas().assets.find(item => item.id === data.outputAssetId)!;
  expect(data.imageEdit).toBeNull(); expect(asset.id).not.toBe("original");
  expect(h.objects.get(asset.metadata!.storageKey as string)?.bytes).toEqual(png);
  expect(h.counts()).toEqual({ submissions: 1, uploads: 1 });
});
it("recovers a lost complete response from the real receipt without another upload or commit", async () => {
  const h = await harness({ loseCompleteResponse: true });
  await expect(h.writer.apply(async () => png)).rejects.toThrow();
  await h.writer.apply(async () => { throw new Error("must reuse frozen export"); });
  expect(h.counts()).toEqual({ submissions: 1, uploads: 1 });
});
it("rejects a changed canonical baseline before upload", async () => {
  const h = await harness(); h.changeSource();
  await expect(h.writer.apply(async () => png)).rejects.toThrow("原图已变化");
  expect(h.counts()).toEqual({ submissions: 0, uploads: 0 }); await h.writer.abandon();
});
