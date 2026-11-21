import type { PhotoCraftMessage, PhotoCraftState } from "./protocol.js";
export type EngineDocument = { id: string; name: string; revision: number; dirty: boolean };
export type EngineState = PhotoCraftState & { documents?: EngineDocument[] };
export type RuntimeEvent = Exclude<PhotoCraftMessage, { type: "photocraft:state" }>
  | { type: "photocraft:state"; state: EngineState }
  | { type: "photocraft:document-opened" | "photocraft:document-changed"; documentId: string; operationId?: string; document: EngineDocument }
  | { type: "photocraft:document-closed" | "photocraft:document-activated"; documentId: string | null }
  | { type: "photocraft:document-request"; kind: "activate" | "close"; id: string };
export type DirectRuntime = {
  readonly backend?: "native" | "wasm";
  state(): EngineState;
  show(clean?: boolean): number;
  hide(): void;
  input(enabled: boolean): void;
  focus(): void;
  open(operationId: string, name: string, bytes: Uint8Array, nodeBinding?: string | null): string | Promise<string>;
  activate(id: string): number | Promise<number>;
  close(id: string): void | Promise<void>;
  export(id: string, project?: boolean, expectedRevision?: number): Uint8Array | Promise<Uint8Array>;
  markSaved?(id: string, revision: number): Promise<void>;
  ack(id: number, accepted: boolean): void;
  /**
   * Drops in-flight captures and their ack identity without touching presentation, input or the
   * rAF loop; returns the generation that the next accepted frame must carry. Used when the
   * renderer visit changes, so a frame captured under the previous visit can never be presented
   * (or acked as accepted) under the new one.
   */
  invalidateCapture?(): number;
  settle(): EngineState;
  dispose(): void;
};
export type RuntimeOptions = {
  target?: HTMLElement;
  canvas: HTMLCanvasElement;
  assetBaseUrl: string;
  onEvent(event: RuntimeEvent): void;
  /**
   * Renderer visit token captured when the document editor lease is taken. The native backend
   * sends it with every open so the desktop compositor can verify the visit before presenting;
   * old hosts (and the WASM backend) never need it.
   */
  canvasVisit?(): string | null;
};
export type RuntimeFactory = (options: RuntimeOptions) => Promise<DirectRuntime>;
export const createDirectRuntime: RuntimeFactory = async (options) => {
  const { tryCreateNativeRuntime } = await import("./native-runtime.js");
  const native = await tryCreateNativeRuntime(options);
  if (native) return native;
  const url = new URL("host-bridge.js", options.assetBaseUrl).href;
  const module = await import(/* @vite-ignore */ url) as { createRuntime: RuntimeFactory };
  return module.createRuntime(options);
};
