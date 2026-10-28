import type { Context } from "@woohaa3/frontend/extension-api";
import type {} from "@woohaa3/frontend/extension-api";
import type { ImageFocusImage } from "./focus-targets.js";
import { imageEditRequestId, imageEditSessionId } from "./session.js";

/** Read the actual export dimensions, never substitute the downsampled preview dimensions. */
export function pngSize(bytes: Uint8Array): { width: number; height: number } {
  const signature = [137, 80, 78, 71, 13, 10, 26, 10];
  if (bytes.length < 33 || signature.some((n, i) => bytes[i] !== n)
    || String.fromCharCode(...bytes.subarray(12, 16)) !== "IHDR") throw new Error("导出结果不是有效的 PNG");
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const width = view.getUint32(16), height = view.getUint32(20);
  if (!width || !height || width > 100000 || height > 100000) throw new Error("PNG 尺寸无效");
  return { width, height };
}

type Dependencies = Pick<Context, "canvasRemote" | "mediaRemote" | "canvasSession">;
/** One frozen request survives retries, including lost complete responses. */
export function createWriteBack(dependencies: Dependencies | (() => Dependencies), canvasId: string, nodeId: string, image: ImageFocusImage) {
  const deps = () => typeof dependencies === "function" ? dependencies() : dependencies;
  const sessionId = imageEditSessionId(), requestId = imageEditRequestId();
  const outputAssetId = `asset-${crypto.randomUUID()}`;
  let begun = false, finished = false, attemptedComplete = false;
  let baselineError: Error | null = null;
  let frozen: Uint8Array | null = null;
  let uploaded: { storageKey: string; checksum: string; contentType: string; size: number } | null = null;
  let flight: Promise<void> | null = null;
  const baselineContentIdentity = image.baselineContentIdentity ?? `media:${image.asset?.storageKey ?? ""}`;
  const ids = { canvasId, nodeId, requestId };
  const settle = async (allowConflict = false) => {
    const status = await deps().canvasRemote.editStatus(ids);
    if (status.ok && status.value.contentCommitted) { finished = true; return true; }
    if (status.ok && status.value.status === "conflict") {
      if (!allowConflict) throw new Error(status.value.errorMessage ?? "图片已被其他操作修改，请放弃本次写回或另存文件");
      return false;
    }
    // Unknown transport state must never be interpreted as a safe retry.
    if (!status.ok && !/not.found|NOT_FOUND/.test(status.code)) throw new Error(status.error);
    return false;
  };
  return {
    apply(exportPng: () => Promise<Uint8Array>) {
      if (flight) return flight;
      flight = (async () => {
        if (finished) return;
        if (baselineError) throw baselineError;
        if (!deps().canvasSession.isWritable()) throw new Error("当前画布只读，无法应用修改");
        if (!image.asset) throw new Error("原图缺少稳定媒体身份，无法写回；可用 PhotoCraft 文件菜单另存");
        if (attemptedComplete && await settle()) return;
        frozen ??= await exportPng();
        const size = pngSize(frozen);
        if (!begun) {
          const begin = await deps().canvasRemote.editBegin({ ...ids, sessionId, kind: "image", baselineContentIdentity });
          if (!begin.ok) throw new Error(begin.error);
          begun = true;
          if (begin.value.baselineContentIdentity !== baselineContentIdentity) {
            baselineError = new Error("原图已变化，请放弃本次写回或另存文件");
            throw baselineError;
          }
        }
        if (!uploaded) {
          const upload = await deps().mediaRemote.upload({ file: new File([new Uint8Array(frozen)], "output.png", { type: "image/png" }), canvasId });
          if (!upload.ok) throw new Error(upload.error);
          uploaded = upload.media;
        }
        if (!deps().canvasSession.isWritable()) throw new Error("画布已变为只读，请恢复连接后重试");
        attemptedComplete = true;
        const result = await deps().canvasRemote.editComplete({ ...ids, sessionId, kind: "image", baselineContentIdentity,
          media: {
            baseAssetId: image.asset.id, baseStorageKey: image.asset.storageKey,
            sourceWidth: size.width, sourceHeight: size.height,
            outputAssetId, outputStorageKey: uploaded.storageKey,
            checksum: uploaded.checksum, contentType: uploaded.contentType, size: uploaded.size,
            ...(image.asset.checksum ? { baseChecksum: image.asset.checksum } : {}),
            ...(image.asset.contentType ? { baseContentType: image.asset.contentType } : {}),
            ...(image.asset.size !== undefined ? { baseSize: image.asset.size } : {})
          }
        });
        if (!result.ok) throw new Error(result.error);
        if (!result.receipt.contentCommitted) throw new Error(result.receipt.errorMessage ?? "修改尚未提交，请重试");
        finished = true;
      })().finally(() => { flight = null; });
      return flight;
    },
    async abandon() {
      if (finished || !begun) return;
      if (attemptedComplete && await settle(true)) return;
      // begin uses a separate durable key; abandon it even when upload failed before complete.
      if (attemptedComplete) {
        const result = await deps().canvasRemote.editAbandon(ids);
        if (!result.ok && !/not.found|NOT_FOUND/.test(result.code)) throw new Error(result.error);
      }
      const result = await deps().canvasRemote.editAbandon({ ...ids, requestId: `begin:${sessionId}` });
      if (!result.ok) throw new Error(result.error);
    },
    committedImage: (): ImageFocusImage | null => finished && uploaded ? {
      ...image, baselineContentIdentity: `media:${uploaded.storageKey}`,
      asset: { id: outputAssetId, ...uploaded }
    } : null,
    isPending: () => !finished && (begun || frozen !== null),
    isFrozen: () => frozen !== null
  };
}
