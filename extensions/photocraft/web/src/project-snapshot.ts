import { fnv1a64Hex, IMAGE_PROJECT_LIMITS } from '../../protocol/src/index.js';

/** Read the STORE manifest emitted by the pinned official writer, not imported ZIPs.
 * The server still performs full container/resource verification before ingest. */
export function projectSnapshot(bytes: Uint8Array) {
  const fail = () => { throw new Error('工程导出清单无效，未保存到节点'); };
  if (bytes.length > IMAGE_PROJECT_LIMITS.maxProjectBytes) return fail();
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const text = new TextDecoder('utf-8', { fatal: true });
  for (let offset = 0, count = 0; offset + 30 <= bytes.length && count < IMAGE_PROJECT_LIMITS.maxEntries; count++) {
    if (view.getUint32(offset, true) !== 0x04034b50) break;
    const flags = view.getUint16(offset + 6, true), method = view.getUint16(offset + 8, true);
    const size = view.getUint32(offset + 18, true), expanded = view.getUint32(offset + 22, true);
    const nameLength = view.getUint16(offset + 26, true), extra = view.getUint16(offset + 28, true);
    const start = offset + 30 + nameLength + extra, end = start + size;
    if ((flags & 9) || end > bytes.length || start > end) return fail();
    const name = text.decode(bytes.subarray(offset + 30, offset + 30 + nameLength));
    if (name === 'manifest.json') {
      if (method !== 0 || expanded !== size || size > IMAGE_PROJECT_LIMITS.maxSerializedBytes) return fail();
      const manifest = JSON.parse(text.decode(bytes.subarray(start, end)));
      const doc = manifest.document;
      if (manifest.format_version !== 1 || !doc || !Array.isArray(doc.layers) || !doc.layers.length) return fail();
      const { width, height } = doc.size ?? {};
      if (![width, height].every(n => Number.isInteger(n) && n > 0 && n <= IMAGE_PROJECT_LIMITS.maxCanvasSide)) return fail();
      // Session/UI state and document naming never identify the saved picture.
      const { id, name, selection, work_path, quick_mask, quick_mask_unselected, ...content } = doc;
      const stable = (value: unknown): unknown => Array.isArray(value) ? value.map(stable)
        : value && typeof value === 'object' ? Object.fromEntries(Object.entries(value).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0).map(([key, item]) => [key, stable(item)])) : value;
      return { width: width as number, height: height as number, formatVersion: 1,
        documentContentHash: fnv1a64Hex(JSON.stringify(stable(content))) };
    }
    offset = end;
  }
  return fail();
}
