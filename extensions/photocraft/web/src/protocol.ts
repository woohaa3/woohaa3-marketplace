/** Direct instance port. Rectangles are local CSS pixels; buffers are straight RGBA. */
export type DocumentRect = [number, number, number, number];
export type PhotoCraftDocumentView = { width: number; height: number; x: number; y: number; zoom: number };
export type PhotoCraftState = {
  documentId: string | null;
  documentName: string | null;
  docWidth: number | null;
  docHeight: number | null;
  revision: number | null;
  dirty: boolean;
  rect: DocumentRect | null;
  modal: boolean;
  escOwned: boolean;
  operation: boolean;
  documentView?: PhotoCraftDocumentView | null;
  viewReady?: boolean;
};
export type PhotoCraftFrame = {
  id: number; revision?: number; generation?: number; width: number; height: number; buffer: ArrayBuffer;
  rect: DocumentRect; documentId: string;
  documentView?: PhotoCraftDocumentView;
};
export type PhotoCraftMessage =
  | { type: "photocraft:ready" }
  | { type: "photocraft:opened"; requestId: string; state: PhotoCraftState }
  | { type: "photocraft:state"; state: PhotoCraftState }
  | ({ type: "photocraft:frame" } & PhotoCraftFrame)
  | { type: "photocraft:escape" }
  | { type: "photocraft:error"; message: string; fatal?: boolean }
  | { type: "photocraft:response"; requestId: string; buffer?: ArrayBuffer; error?: string; state: PhotoCraftState };

export function validRect(rect: unknown): rect is DocumentRect {
  return Array.isArray(rect) && rect.length === 4 && rect.every(Number.isFinite) && rect[2] > 0 && rect[3] > 0;
}
export function validDocumentView(view: PhotoCraftDocumentView | null | undefined): view is PhotoCraftDocumentView {
  return Boolean(view && [view.width, view.height, view.x, view.y, view.zoom].every(Number.isFinite)
    && view.width > 0 && view.height > 0 && view.zoom > 0);
}
export function validFrame(frame: PhotoCraftFrame): boolean {
  return Number.isSafeInteger(frame.id) && frame.id > 0 && Number.isSafeInteger(frame.width)
    && Number.isSafeInteger(frame.height) && frame.width > 0 && frame.height > 0
    && frame.width <= 2048 && frame.height <= 2048 && validRect(frame.rect)
    && typeof frame.documentId === "string" && frame.buffer instanceof ArrayBuffer
    && (frame.documentView === undefined || validDocumentView(frame.documentView))
    && frame.buffer.byteLength === frame.width * frame.height * 4;
}
