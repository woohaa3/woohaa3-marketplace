// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { beforeEach, afterEach, expect, it, vi } from "vitest";
import { PhotoCraftOverlay } from "./PhotoCraftOverlay.js";
import { WorkspaceSession } from "./workspace-session.js";
import type { DirectRuntime, EngineState } from "./direct-runtime.js";
vi.mock("@woohaa3/frontend/extension-api", () => ({ resolvePublicUrl: (p: string) => p }));
let root: Root, host: HTMLDivElement, session: WorkspaceSession;
let engine: DirectRuntime;
beforeEach(async () => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  vi.stubGlobal("ResizeObserver", class { observe() {} disconnect() {} });
  host=document.createElement("div");document.body.append(host);root=createRoot(host);
  const state: EngineState={ documentId:"a",documentName:"a.png",docWidth:2,docHeight:2,revision:0,dirty:true,rect:[0,0,2,2],modal:false,operation:false,escOwned:false,viewReady:true,documents:[{id:"a",name:"a.png",revision:0,dirty:true}] };
  engine={state:()=>state,show:vi.fn(()=>1),hide:vi.fn(),input:vi.fn(),focus:vi.fn(),open:()=>"a",activate:()=>1,close:vi.fn(),export:()=>new Uint8Array(33),ack:vi.fn(),settle:()=>state,dispose:vi.fn()};
  session=new WorkspaceSession("https://app.test/assets/",async()=>engine);
  await act(async()=>root.render(<PhotoCraftOverlay session={session} onRelease={()=>session.dispose()}/>));
});
afterEach(async()=>{await act(async()=>root.unmount());session.dispose();host.remove();vi.unstubAllGlobals();});
it("retains the actual canvas across hiding and recovery; never renders an iframe", async()=>{
  const canvas=host.querySelector("canvas");expect(canvas).not.toBeNull();expect(host.querySelector("iframe")).toBeNull();
  await act(async()=>{session.visible=true;session.publish();session.hide();session.revoke("disabled");});
  expect(host.querySelector("canvas")).toBe(canvas);expect(engine.dispose).not.toHaveBeenCalled();
});
it("keeps the editor masked while a target has no valid ready state",async()=>{
  expect(host.querySelector("canvas")!.style.visibility).toBe("hidden");
  await act(async()=>{session.visible=true;session.targetId="b";session.receive({type:"photocraft:state",state:engine.state()});});
  expect(host.querySelector("canvas")!.style.visibility).toBe("hidden");expect(host.textContent).toContain("正在准备画布");
});
it("asks explicitly before closing and keeps the document when cancelled",async()=>{
  await act(async()=>{session.documents.set("a",{id:"a",lifetime:1,source:{kind:"file",id:"external"},appliedRevision:null});session.onClose?.("a");});
  expect(host.textContent).toContain("不保存，关闭");
  const cancel=[...host.querySelectorAll("button")].find(b=>b.textContent==="取消")!;
  await act(async()=>cancel.click());expect(engine.close).not.toHaveBeenCalled();expect(session.documents.size).toBe(1);
});

it("keeps a revealed document visible during zoom, then gates the next activation and restores focus", async()=>{
  await act(async()=>{
    session.documents.set("a",{id:"a",lifetime:1,source:{kind:"file",id:"external"},appliedRevision:null});
    session.visible=true;session.targetId="a";session.receive({type:"photocraft:state",state:engine.state()});
  });
  expect(host.querySelector("canvas")!.style.visibility).toBe("visible");expect(engine.focus).toHaveBeenCalledTimes(1);
  await act(async()=>session.receive({type:"photocraft:state",state:{...engine.state(),viewReady:false}}));
  expect(host.querySelector("canvas")!.style.visibility).toBe("visible");expect(host.textContent).not.toContain("正在准备画布");
  await act(async()=>{session.activation++;session.publish();});
  expect(host.querySelector("canvas")!.style.visibility).toBe("hidden");
  await act(async()=>session.receive({type:"photocraft:state",state:engine.state()}));
  expect(host.querySelector("canvas")!.style.visibility).toBe("visible");expect(engine.focus).toHaveBeenCalledTimes(2);
});
it("reports progress on the node before the document exists", async()=>{
  await act(async()=>session.rememberNode("c","node-1",{url:"/api/media/a.png",name:"a.png"}));
  expect(host.querySelector(".photocraft-overlay--pending")).not.toBeNull();
  expect(host.querySelector(".photocraft-overlay__pending")).not.toBeNull();
  expect(host.querySelector(".photocraft-overlay__loading")).toBeNull();
  // The canvas keeps receiving input: inline styles, not only the imported stylesheet.
  expect((host.querySelector(".photocraft-overlay__stage") as HTMLElement).style.pointerEvents).toBe("none");
  expect((host.querySelector(".photocraft-overlay") as HTMLElement).style.pointerEvents).toBe("none");
  expect((host.querySelector(".photocraft-overlay__header") as HTMLElement).style.visibility).toBe("hidden");
});
it("reports node loading on the node instead of covering the canvas, and keeps the take-over for files", async()=>{
  await act(async()=>{
    session.documents.set("n",{id:"n",lifetime:1,source:{kind:"node",canvasId:"c",nodeId:"node-1",image:{url:"/api/media/a.png",name:"a.png"}},appliedRevision:null});
    session.visible=true;session.targetId="n";
    session.receive({type:"photocraft:state",state:{...engine.state(),documentId:"n",documentName:"a.png"}});
  });
  expect(host.querySelector(".photocraft-overlay--pending")).not.toBeNull();
  expect(host.querySelector(".photocraft-overlay__header--pending")).not.toBeNull();
  expect(host.querySelector(".photocraft-overlay__stage--pending")).not.toBeNull();
  expect(host.querySelector(".photocraft-overlay__pending")?.textContent).toContain("正在准备画布");
  expect(host.querySelector(".photocraft-overlay__loading")).toBeNull();
  expect(host.querySelector("canvas")!.style.visibility).toBe("hidden");
  await act(async()=>{
    session.documents.clear();
    session.documents.set("a",{id:"a",lifetime:2,source:{kind:"file",id:"external"},appliedRevision:null});
    session.targetId="a";
    session.receive({type:"photocraft:state",state:{...engine.state(),viewReady:false}});
  });
  expect(host.querySelector(".photocraft-overlay--pending")).toBeNull();
  expect(host.querySelector(".photocraft-overlay__header--pending")).toBeNull();
  expect((host.querySelector(".photocraft-overlay__stage") as HTMLElement).style.pointerEvents).toBe("");
  expect(host.querySelector(".photocraft-overlay__loading")?.textContent).toContain("正在准备画布");
});

function attachPage() {
  const listeners = new Set<() => void>();
  const emit = () => listeners.forEach(listener => listener());
  let snapshot: any = { mode: { type: "node-focus", nodeId: "node-1", kind: "image", owner: "direct" }, panel: null, menu: null };
  const navigation = {
    subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; },
    getSnapshot: () => snapshot,
    openNodeHistory: vi.fn((input: { nodeId: string; kind: string }) => {
      snapshot = { ...snapshot, panel: { type: "node-history", nodeId: input.nodeId } };
      emit(); return { ok: true };
    }),
    requestCloseNodeHistory: vi.fn(async () => { snapshot = { ...snapshot, panel: null }; emit(); return { ok: true }; }),
    enterNodeFocus: vi.fn((input: { nodeId: string; kind: string; owner?: string }) => {
      snapshot = { ...snapshot, mode: { type: "node-focus", nodeId: input.nodeId, kind: input.kind, owner: input.owner ?? "direct" } };
      emit(); return { ok: true };
    }),
    requestExitNodeFocus: vi.fn(async () => ({ ok: true })),
    setSnapshot(next: any) { snapshot = next; emit(); }
  };
  const runtime = {
    setImageFocusTexture: vi.fn(), setImageFocus: vi.fn(), setImageFocusPending: vi.fn(),
    subscribeFocusContentRect: vi.fn(() => () => {}), focusContentRect: () => null
  };
  const ctx: any = {
    canvasNavigation: navigation, canvasRuntime: runtime,
    canvasSession: { isWritable: () => true },
    canvasState: { getWorkingCanvas: () => null, subscribe: () => () => {} },
    dialogs: { subscribe: () => () => {}, getSnapshot: () => ({ isModalActive: false }) },
    pageLeave: { register: () => () => {} }, focusExit: { register: () => () => {} }
  };
  act(() => { session.attachPage(ctx, "c"); });
  return { navigation, runtime };
}

async function openNodeDocument() {
  await act(async()=>{
    session.documents.set("n",{id:"n",lifetime:1,source:{kind:"node",canvasId:"c",nodeId:"node-1",image:{url:"/api/media/a.png",name:"a.png"}},appliedRevision:null});
    session.visible=true;session.targetId="n";
    session.receive({type:"photocraft:state",state:{...engine.state(),documentId:"n",documentName:"a.png"}});
  });
}

it("offers a history entry only for node documents and reflects the panel state", async()=>{
  const { navigation } = attachPage();
  await openNodeDocument();
  const button = () => host.querySelector('[data-photocraft-history]') as HTMLButtonElement | null;
  expect(button()).not.toBeNull();
  const header = host.querySelector(".photocraft-overlay__header")!;
  const status = header.querySelector(".photocraft-overlay__status")!;
  expect([...header.children].indexOf(button()!)).toBeGreaterThan([...header.children].indexOf(status));
  expect(button()!.getAttribute("aria-pressed")).toBe("false");
  await act(async()=>button()!.click());
  expect(navigation.openNodeHistory).toHaveBeenCalledWith({ nodeId: "node-1", kind: "image" });
  expect(button()!.getAttribute("aria-pressed")).toBe("true");
  await act(async()=>navigation.setSnapshot({
    mode: { type: "node-focus", nodeId: "node-1", kind: "image", owner: "history" },
    panel: { type: "node-history", nodeId: "node-1" }, menu: null
  }));
  expect(host.textContent).toContain("历史预览 · 只读");
  await act(async()=>button()!.click());
  expect(navigation.requestCloseNodeHistory).toHaveBeenCalledOnce();
  await act(async()=>{
    session.documents.set("f",{id:"f",lifetime:2,source:{kind:"file",id:"external"},appliedRevision:null});
    session.targetId="f";
    session.receive({type:"photocraft:state",state:{...engine.state(),documentId:"f",documentName:"f.png"}});
  });
  expect(button()).toBeNull();
});

it("renders the controlled read-only preview, stops capture, then resumes the editor", async()=>{
  const surface = document.createElement("div");
  surface.className = "bevy-canvas-surface";
  surface.getBoundingClientRect = () => ({ x: 0, y: 0, width: 800, height: 600, top: 0, left: 0, right: 800, bottom: 600, toJSON: () => ({}) }) as DOMRect;
  document.body.append(surface);
  const { navigation, runtime } = attachPage();
  await openNodeDocument();
  const frame = { id: 1, width: 2, height: 2, buffer: new ArrayBuffer(16), rect: [0,0,2,2] as [number,number,number,number],
    documentId: "n", revision: 0, documentView: { width: 2, height: 2, x: 0, y: 0, zoom: 1 } };
  await act(async()=>{ session.receive({ type: "photocraft:frame", ...frame }); });
  expect(runtime.setImageFocusTexture).toHaveBeenCalled();
  await act(async()=>{
    navigation.setSnapshot({ mode: { type: "node-focus", nodeId: "node-1", kind: "image", owner: "history" },
      panel: { type: "node-history", nodeId: "node-1" }, menu: null });
    session.setHistoryOverride({ url: "/api/canvas-node-history/c/node-1/e1/preview" }, "node-1");
  });
  expect(engine.show).toHaveBeenLastCalledWith(false);
  expect(engine.input).toHaveBeenLastCalledWith(false);
  expect(runtime.setImageFocusTexture).toHaveBeenLastCalledWith(null);
  expect(runtime.setImageFocus).toHaveBeenLastCalledWith(null);
  expect(host.querySelector("canvas")!.style.visibility).toBe("hidden");
  const media = host.querySelector('[data-photocraft-history-media="true"]') as HTMLImageElement | null;
  expect(media?.getAttribute("src")).toBe("/api/canvas-node-history/c/node-1/e1/preview");
  // 预览期间不捕获、不投影迟到的帧。
  const textureCalls = runtime.setImageFocusTexture.mock.calls.length;
  await act(async()=>{ session.receive({ type: "photocraft:frame", ...frame, id: 2 }); });
  expect(runtime.setImageFocusTexture.mock.calls.length).toBe(textureCalls);
  await act(async()=>{
    navigation.setSnapshot({ mode: { type: "node-focus", nodeId: "node-1", kind: "image", owner: "direct" },
      panel: { type: "node-history", nodeId: "node-1" }, menu: null });
    session.setHistoryOverride(null, "node-1");
  });
  expect(engine.show).toHaveBeenLastCalledWith(true);
  expect(host.querySelector('[data-photocraft-history-media="true"]')).toBeNull();
  // 返回当前版本后按新内容矩形重新捕获并投影首帧。
  await act(async()=>{ session.receive({ type: "photocraft:frame", ...frame, id: 3 }); });
  expect(host.querySelector("canvas")!.style.visibility).toBe("visible");
  expect(runtime.setImageFocus).toHaveBeenCalled();
  surface.remove();
});

it("drops frames captured for a previous content rectangle after the drawer changes layout", async()=>{
  const { runtime } = attachPage();
  await openNodeDocument();
  const base = { id: 1, width: 2, height: 2, buffer: new ArrayBuffer(16), rect: [0,0,2,2] as [number,number,number,number],
    documentId: "n", revision: 0, documentView: { width: 2, height: 2, x: 0, y: 0, zoom: 1 } };
  await act(async()=>{ session.receive({ type: "photocraft:frame", ...base }); });
  const before = runtime.setImageFocusTexture.mock.calls.length;
  // 旧布局帧（新矩形）不得被发布。
  await act(async()=>{ session.receive({ type: "photocraft:frame", ...base, id: 2, rect: [0,0,500,300] }); });
  expect(runtime.setImageFocusTexture.mock.calls.length).toBe(before);
  // state 更新到新矩形后，新帧才被接受。
  await act(async()=>{ session.receive({ type: "photocraft:state", state: { ...engine.state(), documentId: "n", rect: [0,0,500,300] } }); });
  await act(async()=>{ session.receive({ type: "photocraft:frame", ...base, id: 3, rect: [0,0,500,300] }); });
  expect(runtime.setImageFocusTexture.mock.calls.length).toBeGreaterThan(before);
});
