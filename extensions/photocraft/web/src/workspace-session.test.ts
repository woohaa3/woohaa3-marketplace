// @vitest-environment jsdom
import { beforeEach, expect, it, vi } from "vitest";
import type { Context } from "@woohaa3/frontend/extension-api";
import { WorkspaceSession } from "./workspace-session.js";
import type { DirectRuntime, EngineState, RuntimeFactory } from "./direct-runtime.js";
vi.mock("@woohaa3/frontend/extension-api", () => ({ resolvePublicUrl: (path: string) => path }));
export function sessionHarness() {
  let state: EngineState = { documents: [], documentId: null, documentName: null, docWidth: null, docHeight: null, revision: 0, dirty: false, modal: false, operation: false, escOwned: false, rect: null, viewReady: true };
  let count = 0;
  const engine = {
    state: () => state, show: vi.fn(() => 1), hide: vi.fn(), input: vi.fn(), focus: vi.fn(), ack: vi.fn(), dispose: vi.fn(),
    settle: vi.fn(() => { if (state.operation) throw new Error("当前操作"); return state; }),
    open: vi.fn((_op: string, name: string) => { const id = `doc-${++count}`; state = { ...state, documentId: id, documents: [...state.documents!, { id, name, revision: 0, dirty: false }] }; return id; }),
    activate: vi.fn((id: string) => { state = { ...state, documentId: id }; return 1; }),
    close: vi.fn((id: string) => { state = { ...state, documents: state.documents!.filter(d => d.id !== id) }; }),
    export: vi.fn(() => png())
  } satisfies DirectRuntime;
  const factory = vi.fn(async () => engine) as RuntimeFactory;
  const session = new WorkspaceSession("https://app.test/assets/", factory);
  const publish = () => session.receive({ type: "photocraft:state", state });
  const revision = (id: string, rev: number) => { state = { ...state, revision: rev, documents: state.documents!.map(d => d.id === id ? { ...d, revision: rev, dirty: true } : d) }; publish(); };
  return { session, engine, factory, publish, revision, get state() { return state; } };
}
export function png() { const b = new Uint8Array(33); b.set([137,80,78,71,13,10,26,10]); b.set([73,72,68,82],12); const v = new DataView(b.buffer); v.setUint32(16,2);v.setUint32(20,2);return b; }
export function page(canvasId = "a", initialCanvas: unknown = null) {
  let working = initialCanvas;
  const listeners = new Set<() => void>();
  const ctx = { canvasScope: { canvasId: () => canvasId }, canvasState: {
      getWorkingCanvas: () => working,
      subscribe: (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; }
    },
    canvasNavigation: { requestEnterNodeFocus: vi.fn(async () => ({ ok: true })), requestEnterDocumentWorkspace: vi.fn(async () => ({ ok: true })), requestExitNodeFocus: vi.fn(async () => ({ ok: true })) },
    canvasSession: { isWritable: () => true }, appRouter: { navigate: vi.fn() },
    canvasRemote: { editBegin: vi.fn(async () => ({ ok: true, value: { baselineContentIdentity: "media:base.png" } })), editComplete: vi.fn(async () => ({ ok: true, receipt: { contentCommitted: true } })), editStatus: vi.fn(), editAbandon: vi.fn(async () => ({ ok: true })) },
    mediaRemote: { upload: vi.fn(async () => ({ ok: true, media: { storageKey: "new.png", checksum: "a".repeat(64), contentType: "image/png", size: 33 } })) },
    /** 测试钩子：替换工作画布并通知（模拟 WebSocket 权威回流）。 */
    __setWorkingCanvas(next: unknown) { working = next; for (const listener of listeners) listener(); }
  };
  return ctx as unknown as Context & typeof ctx;
}
const image = { url: "/api/media/base.png", name: "image.png", baselineContentIdentity: "media:base.png", asset: { id: "asset", storageKey: "base.png" } };
const flush = async () => { for (let index = 0; index < 12; index += 1) await Promise.resolve(); };
function canonicalCanvas(revision: number, storageKey: string) {
  return {
    id: "a",
    revision,
    document: { nodes: [{ id: "n", type: "image" }] },
    nodeData: { n: { outputAssetId: "asset-restored" } },
    assets: [{ id: "asset-restored", status: "ready", mediaKind: "image", url: "/api/media/a/restored.png", metadata: { storageKey } }]
  };
}
beforeEach(() => vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, arrayBuffer: async () => new ArrayBuffer(8) }))));
it("initialization merges, node identity deduplicates, copied nodes and same-name files stay separate", async () => {
  const h = sessionHarness(); h.session.attachPage(page(), "a"); const canvas = document.createElement("canvas");
  const [a,b] = await Promise.all([h.session.initialize(canvas),h.session.initialize(canvas)]); expect(a).toBe(b); expect(h.factory).toHaveBeenCalledOnce();
  const id = await h.session.openNode("a","n",image); h.publish(); h.session.hide(); await h.session.openNode("a","n",image);
  expect(h.engine.open).toHaveBeenCalledOnce(); expect(h.session.documents.has(id)).toBe(true);
  await h.session.openNode("a","copy",image); await h.session.openFile(new File(["x"],"same.png")); await h.session.openFile(new File(["x"],"same.png"));
  expect(h.session.documents.size).toBe(4);
});
it("a revoked page stops new network stages while a frozen attempt can resume with new ports", async () => {
  const h = sessionHarness(), ctx = page(); const detach = h.session.attachPage(ctx,"a"); await h.session.initialize(document.createElement("canvas"));
  const id = await h.session.openNode("a","n",image); h.publish(); h.session.documents.get(id)!.conflict = undefined;
  let resolve!: (value: unknown) => void; ctx.canvasRemote.editBegin.mockImplementationOnce(() => new Promise(r => { resolve = r as never; }));
  const apply = h.session.apply(id); await Promise.resolve(); await Promise.resolve(); detach();
  resolve({ ok: true, value: { baselineContentIdentity: "media:base.png" } });
  await expect(apply).rejects.toThrow("绑定已撤销"); expect(ctx.mediaRemote.upload).not.toHaveBeenCalled();
  const next = page(); h.session.attachPage(next,"a"); h.session.documents.get(id)!.conflict = undefined;
  await h.session.apply(id); expect(next.mediaRemote.upload).toHaveBeenCalledOnce(); expect(ctx.canvasRemote.editComplete).not.toHaveBeenCalled();
});
it("r10 receipt never marks r11 applied, and a later apply gets fresh request identity", async () => {
  const h = sessionHarness(), ctx = page(); h.session.attachPage(ctx,"a"); await h.session.initialize(document.createElement("canvas"));
  const id = await h.session.openNode("a","n",image); h.publish(); h.revision(id,10);
  let resolve!: (v: unknown) => void; ctx.canvasRemote.editComplete.mockImplementationOnce(() => new Promise(r => { resolve = r as never; }));
  const apply = h.session.apply(id); for(let i=0;i<8;i++) await Promise.resolve(); h.revision(id,11);
  resolve({ ok: true, receipt: { contentCommitted: true } }); await apply; expect(h.session.documents.get(id)!.appliedRevision).toBe(10);
  const first = ctx.canvasRemote.editBegin.mock.calls[0];
  ctx.canvasRemote.editBegin.mockResolvedValueOnce({ ok: true, value: { baselineContentIdentity: "media:new.png" } });
  await h.session.apply(id); expect(ctx.canvasRemote.editBegin.mock.calls[1]).not.toEqual(first); expect(h.session.documents.get(id)!.appliedRevision).toBe(11);
});
it("enforces window capacity and single decoding without evicting documents", async () => {
  const h=sessionHarness(); h.session.attachPage(page(),"a"); await h.session.initialize(document.createElement("canvas"));
  for(let i=0;i<8;i++) await h.session.openFile(new File(["x"],`${i}.png`));
  await expect(h.session.openFile(new File(["x"],"overflow.png"))).rejects.toThrow("8"); expect(h.session.documents.size).toBe(8);
  await h.session.close("doc-4"); await h.session.openFile(new File(["x"],"allowed.png")); expect(h.session.documents.size).toBe(8);
});
it("closing chooses left neighbour, last close returns; recovery refuses edits and only exports/closes", async () => {
  const h=sessionHarness(); h.session.attachPage(page(),"a"); await h.session.initialize(document.createElement("canvas"));
  await h.session.openFile(new File(["x"],"a.png")); await h.session.openFile(new File(["x"],"b.png"));
  h.publish(); await h.session.close("doc-2"); expect(h.engine.activate).toHaveBeenLastCalledWith("doc-1");
  expect(h.session.revoke("disabled")).toBe(true); await expect(h.session.openFile(new File(["x"],"x.png"))).rejects.toThrow("停用");
  expect(h.session.export("doc-1")).toEqual(png()); h.session.onEmpty=vi.fn(); await h.session.close("doc-1"); expect(h.session.onEmpty).toHaveBeenCalledOnce();
  h.session.dispose(); h.session.dispose(); expect(h.engine.dispose).toHaveBeenCalledOnce();
});
it("discarded late node read does not open a document after leaving its page", async () => {
  const h=sessionHarness(); const detach=h.session.attachPage(page(),"a"); await h.session.initialize(document.createElement("canvas"));
  let finish!: (v: unknown) => void; vi.stubGlobal("fetch",vi.fn(() => new Promise(r=>{finish=r;})));
  const open=h.session.openNode("a","n",image); detach(); finish({ok:true,arrayBuffer:async()=>new ArrayBuffer(8)});
  await expect(open).rejects.toThrow("页面已离开"); expect(h.engine.open).not.toHaveBeenCalled();
});
it("routes A/B/file tabs through fresh page leases without rebuilding the engine or reopening documents", async () => {
  const h=sessionHarness(), a=page("a"), b=page("b");
  const disposeA=h.session.attachPage(a,"a"); await h.session.initialize(document.createElement("canvas"));
  const A=await h.session.openNode("a","node-a",image);h.publish();
  h.session.attachPage(b,"b");disposeA();
  const B=await h.session.openNode("b","node-b",image);h.publish();const C=await h.session.openFile(new File(["x"],"external.png"));h.publish();
  b.appRouter.navigate.mockImplementation(()=>{h.session.attachPage(a,"a");});
  await h.session.activate(A);h.publish();expect(b.appRouter.navigate).toHaveBeenCalledWith({page:"canvas",canvasId:"a",nodeId:"node-a"});
  expect(h.session.page?.ctx).toBe(a);expect(h.session.documents.size).toBe(3);expect(h.factory).toHaveBeenCalledOnce();expect(h.engine.open).toHaveBeenCalledTimes(3);
  a.appRouter.navigate.mockImplementation(()=>{h.session.attachPage(b,"b");});await h.session.activate(B);h.publish();await h.session.activate(C);h.publish();
  expect(h.engine.show).toHaveBeenLastCalledWith(false);h.session.hide();expect(h.session.documents.size).toBe(3);
});
it("a decode in progress rejects another open without inserting a partial tab", async()=>{
  const h=sessionHarness();h.session.attachPage(page(),"a");await h.session.initialize(document.createElement("canvas"));
  let finish!: (value: unknown)=>void;vi.stubGlobal("fetch",vi.fn(()=>new Promise(r=>{finish=r;})));
  const pending=h.session.openNode("a","n",image);
  await expect(h.session.openFile(new File(["x"],"second.png"))).rejects.toThrow("正在打开");expect(h.session.documents.size).toBe(0);
  finish({ok:true,arrayBuffer:async()=>new ArrayBuffer(8)});await pending;expect(h.session.documents.size).toBe(1);
});
it("rejects opening before decode when the official editor owns an unfinished operation",async()=>{
  const h=sessionHarness();h.session.attachPage(page(),"a");await h.session.initialize(document.createElement("canvas"));h.state.operation=true;
  await expect(h.session.openFile(new File(["x"],"blocked.png"))).rejects.toThrow("当前操作");expect(h.engine.open).not.toHaveBeenCalled();expect(h.session.documents.size).toBe(0);
});
it("a failed replacement read restores the previous document without reopening it",async()=>{
  const h=sessionHarness();h.session.attachPage(page(),"a");await h.session.initialize(document.createElement("canvas"));
  const id=await h.session.openFile(new File(["x"],"kept.png"));h.publish();vi.stubGlobal("fetch",vi.fn(async()=>({ok:false,status:500})));
  await expect(h.session.openNode("a","new",image)).rejects.toThrow("HTTP 500");
  expect(h.session.targetId).toBe(id);expect(h.session.visible).toBe(true);expect(h.engine.open).toHaveBeenCalledOnce();expect(h.session.documents.size).toBe(1);
});
it("retrying a failed first boot opens the remembered node without a second canvas",async()=>{
  const h=sessionHarness();h.session.attachPage(page(),"a");h.session.rememberNode("a","n",image);
  vi.mocked(h.factory).mockRejectedValueOnce(new Error("boot failed"));const canvas=document.createElement("canvas");
  await expect(h.session.initialize(canvas)).rejects.toThrow("boot failed");await h.session.initialize(canvas);await h.session.retry();
  expect(h.session.documents.size).toBe(1);expect(h.engine.open).toHaveBeenCalledOnce();
  expect(vi.mocked(h.factory).mock.calls[0][0].canvas).toBe(vi.mocked(h.factory).mock.calls[1][0].canvas);
});

it("projects node/file drafts, applying and conflicts for the imageEdit capability", () => {
  const h = sessionHarness();
  expect(h.session.activeNodeId()).toBeNull();
  expect(h.session.draftState()).toBe("saved");
  h.session.documents.set("node-doc", { id: "node-doc", lifetime: 1, source: { kind: "node", canvasId: "a", nodeId: "n1", image }, appliedRevision: null });
  h.session.state = { ...h.state, documentId: "node-doc", documents: [{ id: "node-doc", name: "a.png", revision: 0, dirty: true }] };
  expect(h.session.activeNodeId()).toBe("n1");
  expect(h.session.draftState()).toBe("unsaved");
  h.session.state = { ...h.session.state!, documents: [{ id: "node-doc", name: "a.png", revision: 0, dirty: false }] };
  expect(h.session.draftState()).toBe("saved");
  h.session.applying.add("node-doc");
  expect(h.session.draftState()).toBe("saving");
  h.session.applying.delete("node-doc");
  h.session.documents.get("node-doc")!.conflict = "源内容已变化";
  expect(h.session.draftState()).toBe("error");
  h.session.documents.get("node-doc")!.conflict = undefined;
  h.session.fatal = true;
  expect(h.session.draftState()).toBe("error");
  h.session.fatal = false;
  h.session.state = { ...h.state, documentId: "file-doc" };
  h.session.documents.set("file-doc", { id: "file-doc", lifetime: 2, source: { kind: "file", id: "f" }, appliedRevision: null });
  expect(h.session.activeNodeId()).toBeNull();
});

it("keeps read-only history overrides per node and clears them explicitly", () => {
  const h = sessionHarness();
  h.session.setHistoryOverride({ url: "/api/canvas-node-history/a/n1/e1/preview" }, "n1");
  h.session.setHistoryOverride({ url: "/api/canvas-node-history/a/n2/e2/preview" }, "n2");
  expect(h.session.historyOverrideFor("n1")).toEqual({ url: "/api/canvas-node-history/a/n1/e1/preview" });
  expect(h.session.historyOverrideFor("n2")).toEqual({ url: "/api/canvas-node-history/a/n2/e2/preview" });
  h.session.setHistoryOverride(null, "n1");
  expect(h.session.historyOverrideFor("n1")).toBeNull();
  expect(h.session.historyOverrideFor("n2")).not.toBeNull();
  h.session.setHistoryOverride(null);
  expect(h.session.historyOverrideFor("n2")).toBeNull();
});

it("refreshes a restored node document in place once the canonical revision arrives", async () => {
  const h = sessionHarness();
  const ctx = page("a", canonicalCanvas(3, "base.png"));
  h.session.attachPage(ctx, "a"); await h.session.initialize(document.createElement("canvas"));
  const id = await h.session.openNode("a", "n", image); h.publish();
  h.session.refreshFromCanonical(10);
  await flush();
  // 权威回流还没到：不提前重开（回执可能早于 WebSocket）。
  expect(h.engine.open).toHaveBeenCalledOnce();
  expect(h.session.documents.get(id)!.source.kind).toBe("node");
  ctx.__setWorkingCanvas(canonicalCanvas(10, "restored.png"));
  await flush();
  expect(h.session.documents.size).toBe(1);
  const [entry] = [...h.session.documents.values()];
  expect(entry!.id).not.toBe(id);
  expect(entry!.appliedRevision).toBe(10);
  expect(entry!.source.kind === "node" && entry!.source.image.asset?.storageKey).toBe("restored.png");
  expect(h.engine.close).toHaveBeenCalledWith(id);
  expect(h.engine.open).toHaveBeenCalledTimes(2);
  h.session.receive({ type: "photocraft:state", state: { ...h.state, documentId: entry!.id } });
  expect(h.session.activeNodeId()).toBe("n");
  // 同一修订重复调用是 no-op，不重复读取/重开。
  h.session.refreshFromCanonical(10);
  await flush();
  expect(h.engine.open).toHaveBeenCalledTimes(2);
});

it("does not overwrite a dirty editor when canonical changes during refresh", async () => {
  const h = sessionHarness();
  const ctx = page("a", canonicalCanvas(3, "base.png"));
  h.session.attachPage(ctx, "a"); await h.session.initialize(document.createElement("canvas"));
  const id = await h.session.openNode("a", "n", image); h.publish(); h.revision(id, 5);
  h.session.refreshFromCanonical(10);
  ctx.__setWorkingCanvas(canonicalCanvas(10, "restored.png"));
  await flush();
  expect(h.engine.close).not.toHaveBeenCalled();
  expect(h.session.documents.size).toBe(1);
  expect(h.session.documents.get(id)!.conflict).toContain("未保存修改");
  expect(h.session.error).toBeNull();
});

it("keeps the old tab on a read failure and retries only the canonical read", async () => {
  const h = sessionHarness();
  const ctx = page("a", canonicalCanvas(3, "base.png"));
  h.session.attachPage(ctx, "a"); await h.session.initialize(document.createElement("canvas"));
  const id = await h.session.openNode("a", "n", image); h.publish();
  vi.mocked(fetch).mockResolvedValueOnce({ ok: false, status: 503 } as never);
  h.session.refreshFromCanonical(10);
  ctx.__setWorkingCanvas(canonicalCanvas(10, "restored.png"));
  await flush();
  expect(h.session.error).toContain("503");
  expect(h.engine.close).not.toHaveBeenCalled();
  expect(h.session.documents.has(id)).toBe(true);
  await h.session.retry();
  await flush();
  expect(h.session.documents.size).toBe(1);
  expect(h.session.error).toBeNull();
  expect(h.engine.close).toHaveBeenCalledWith(id);
});

it("closes the old tab without exceeding the window cap or faking success when reopen fails", async () => {
  const h = sessionHarness();
  const ctx = page("a", canonicalCanvas(3, "base.png"));
  h.session.attachPage(ctx, "a"); await h.session.initialize(document.createElement("canvas"));
  for (let index = 0; index < 7; index += 1) await h.session.openFile(new File(["x"], `f${index}.png`));
  const id = await h.session.openNode("a", "n", image); h.publish();
  expect(h.session.documents.size).toBe(8);
  h.engine.open.mockImplementationOnce(() => { throw new Error("解码失败"); });
  h.session.refreshFromCanonical(10);
  ctx.__setWorkingCanvas(canonicalCanvas(10, "restored.png"));
  await flush();
  expect(h.session.documents.size).toBe(7);
  expect(h.session.error).toContain("解码失败");
  expect(h.session.documents.has(id)).toBe(false);
  // 重试只重新读取 canonical 并打开同一来源，不重复 apply。
  await h.session.retry();
  await flush();
  expect(h.session.documents.size).toBe(8);
  const restored = [...h.session.documents.values()].find((entry) => entry.source.kind === "node");
  h.session.receive({ type: "photocraft:state", state: { ...h.state, documentId: restored!.id } });
  expect(h.session.activeNodeId()).toBe("n");
  expect(h.session.error).toBeNull();
});
