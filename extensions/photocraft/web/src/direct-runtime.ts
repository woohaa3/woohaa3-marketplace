import type { PhotoCraftMessage, PhotoCraftState } from "./protocol.js";
export type EngineDocument = { id: string; name: string; revision: number; dirty: boolean };
export type EngineState = PhotoCraftState & { documents?: EngineDocument[] };
export type RuntimeEvent = PhotoCraftMessage
  | { type: "photocraft:document-opened" | "photocraft:document-changed"; documentId: string; operationId?: string; document: EngineDocument }
  | { type: "photocraft:document-closed" | "photocraft:document-activated"; documentId: string | null }
  | { type: "photocraft:document-request"; kind: "activate" | "close"; id: string };
export type DirectRuntime = {
  state(): EngineState;
  show(clean?: boolean): number;
  hide(): void;
  input(enabled: boolean): void;
  focus(): void;
  open(operationId: string, name: string, bytes: Uint8Array): string;
  activate(id: string): number;
  close(id: string): void;
  export(id: string, project?: boolean): Uint8Array;
  ack(id: number, accepted: boolean): void;
  settle(): EngineState;
  dispose(): void;
};
export type RuntimeFactory = (options: { canvas: HTMLCanvasElement; assetBaseUrl: string; onEvent(event: RuntimeEvent): void }) => Promise<DirectRuntime>;
export const createDirectRuntime: RuntimeFactory = async (options) => {
  const url = new URL("host-bridge.js", options.assetBaseUrl).href;
  const module = await import(/* @vite-ignore */ url) as { createRuntime: RuntimeFactory };
  return module.createRuntime(options);
};
