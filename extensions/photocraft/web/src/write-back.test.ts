import { describe, expect, it, vi } from "vitest";
import { createWriteBack, pngSize } from "./write-back.js";
function png(width = 1234, height = 987) {
  const bytes = new Uint8Array(33); bytes.set([137, 80, 78, 71, 13, 10, 26, 10]); bytes.set([73, 72, 68, 82], 12);
  const view = new DataView(bytes.buffer); view.setUint32(16, width); view.setUint32(20, height); return bytes;
}
function harness() {
  const receipt = { contentCommitted: true, status: "completed" };
  const deps = {
    canvasSession: { isWritable: vi.fn(() => true) },
    canvasRemote: {
      editBegin: vi.fn(async () => ({ ok: true, value: { baselineContentIdentity: "media:base.png" } })),
      editComplete: vi.fn(async (_input?: unknown) => ({ ok: true, receipt })),
      editStatus: vi.fn(async () => ({ ok: false, code: "EDIT_SESSION_NOT_FOUND", error: "not found" })),
      editAbandon: vi.fn(async (_input?: unknown) => ({ ok: true }))
    },
    mediaRemote: { upload: vi.fn(async () => ({ ok: true, media: { storageKey: "new.png", checksum: "a".repeat(64), contentType: "image/png", size: 99 } })) }
  };
  const image = { url: "/api/media/base.png", name: "image.png", asset: { id: "base", storageKey: "base.png" } };
  const writer = createWriteBack(deps as never, "c", "n", image);
  return { deps, writer, exportPng: vi.fn(async () => png()), receipt };
}
describe("PNG application transaction", () => {
  it("begins only on apply, uses exported dimensions and omits the old imageEdit", async () => {
    const { deps, writer, exportPng } = harness();
    expect(deps.canvasRemote.editBegin).not.toHaveBeenCalled();
    await writer.apply(exportPng);
    const input = deps.canvasRemote.editComplete.mock.calls[0]![0] as { media: Record<string, unknown> };
    expect(input.media).toMatchObject({ sourceWidth: 1234, sourceHeight: 987, outputStorageKey: "new.png" });
    expect(input.media).not.toHaveProperty("imageEdit");
    await writer.apply(exportPng);
    expect(exportPng).toHaveBeenCalledTimes(1); expect(deps.mediaRemote.upload).toHaveBeenCalledTimes(1);
  });
  it("checks the durable receipt after a lost response, without uploading or submitting twice", async () => {
    const { deps, writer, exportPng, receipt } = harness();
    deps.canvasRemote.editComplete.mockRejectedValueOnce(new Error("network lost"));
    await expect(writer.apply(exportPng)).rejects.toThrow("network lost");
    deps.canvasRemote.editStatus.mockResolvedValueOnce({ ok: true, value: receipt } as never);
    await writer.apply(exportPng);
    expect(deps.canvasRemote.editComplete).toHaveBeenCalledTimes(1);
    expect(deps.mediaRemote.upload).toHaveBeenCalledTimes(1);
  });
  it("retains the identical payload for a safe retry of an unobserved request", async () => {
    const { deps, writer, exportPng } = harness();
    deps.canvasRemote.editComplete.mockRejectedValueOnce(new Error("lost"));
    await expect(writer.apply(exportPng)).rejects.toThrow();
    await writer.apply(exportPng);
    expect(deps.canvasRemote.editComplete.mock.calls[1]![0]).toEqual(deps.canvasRemote.editComplete.mock.calls[0]![0]);
    expect(exportPng).toHaveBeenCalledTimes(1);
  });
  it("a baseline change stays rejected on retry, with no upload", async () => {
    const { deps, writer, exportPng } = harness();
    deps.canvasRemote.editBegin.mockResolvedValue({ ok: true, value: { baselineContentIdentity: "media:other.png" } });
    await expect(writer.apply(exportPng)).rejects.toThrow("原图已变化");
    await expect(writer.apply(exportPng)).rejects.toThrow("原图已变化");
    expect(deps.mediaRemote.upload).not.toHaveBeenCalled();
    await writer.abandon();
    expect(deps.canvasRemote.editAbandon.mock.calls[0]![0]).toMatchObject({ requestId: expect.stringMatching(/^begin:/) });
  });
  it("read-only and malformed export fail before creating a durable edit session", async () => {
    const { deps, writer, exportPng } = harness();
    deps.canvasSession.isWritable.mockReturnValue(false);
    await expect(writer.apply(exportPng)).rejects.toThrow("只读");
    deps.canvasSession.isWritable.mockReturnValue(true);
    await expect(writer.apply(async () => new Uint8Array(10))).rejects.toThrow("PNG");
    expect(deps.canvasRemote.editBegin).not.toHaveBeenCalled();
    expect(() => pngSize(png(0, 2))).toThrow("尺寸");
  });
  it("unavailable status never becomes permission to resubmit", async () => {
    const { deps, writer, exportPng } = harness();
    deps.canvasRemote.editComplete.mockRejectedValueOnce(new Error("lost"));
    await expect(writer.apply(exportPng)).rejects.toThrow();
    deps.canvasRemote.editStatus.mockResolvedValueOnce({ ok: false, code: "unavailable", error: "offline" });
    await expect(writer.apply(exportPng)).rejects.toThrow("offline");
    expect(deps.canvasRemote.editComplete).toHaveBeenCalledTimes(1);
  });
});

it("a confirmed conflict can be discarded without resubmitting the image", async () => {
  const { deps, writer, exportPng } = harness();
  deps.canvasRemote.editComplete.mockResolvedValueOnce({ ok: false, error: "conflict" } as never);
  await expect(writer.apply(exportPng)).rejects.toThrow("conflict");
  deps.canvasRemote.editStatus.mockResolvedValueOnce({ ok: true, value: { status: "conflict", contentCommitted: false } } as never);
  await writer.abandon();
  expect(deps.canvasRemote.editAbandon).toHaveBeenCalledTimes(2);
  expect(deps.canvasRemote.editComplete).toHaveBeenCalledTimes(1);
});
