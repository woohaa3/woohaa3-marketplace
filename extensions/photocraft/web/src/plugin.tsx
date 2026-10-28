/** A page adapter leases host ports; the app owner retains the official document session. */
import { useEffect, useRef } from "react";
import type { Context, Plugin, PersistentSurface } from "@woohaa3/frontend/extension-api";
import { defineExtensionPlugin as definePlugin, IMAGE_EDIT_SERVICE } from "@woohaa3/frontend/extension-api";
import { PhotoCraftOverlay } from "./PhotoCraftOverlay.js";
import { createImageEditService } from "./image-edit-service.js";
import { imageFocusTargetIds, resolveImageFocusImage, type ImageFocusImage } from "./focus-targets.js";
import { WorkspaceSession } from "./workspace-session.js";

export const PHOTOCRAFT_WEB_PLUGIN_ID = "photocraft";
export type PhotoCraftWebPluginOptions = { canvasId?: string; src?: string; assetBaseUrl?: string };

/**
 * 工作区目标占位（change: 2026-10-27-add-image-history-to-photocraft-focus，design D2）。
 *
 * 覆盖层表面由持久 surface 按本目标的 bounding rect 定位；目标自身落在公共聚焦内容矩形内，
 * 因此历史 drawer 打开、内容宽度收缩时目标与表面一起跟随，canvas 仍挂在同一表面上，不重挂、
 * 不重开文档。CSS 变量由公共 `.app[data-focus-kind]` 投影。
 */
export const PHOTOCRAFT_TARGET_STYLE = {
  position: "absolute",
  left: "var(--focus-content-x, 0px)",
  top: "var(--focus-content-y, 0px)",
  width: "var(--focus-content-width, 100%)",
  height: "var(--focus-content-height, 100%)",
  pointerEvents: "none"
} as const;

function WorkspaceTarget({ owner, canvasId, nodeId, image }: {
  owner: PersistentSurface<WorkspaceSession>; canvasId: string; nodeId: string | null; image: ImageFocusImage | null;
}) {
  const target = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!target.current) return;
    if (!owner.value.mounted) { owner.value.mounted = true; owner.render(<PhotoCraftOverlay session={owner.value} onRelease={() => owner.release()} />); }
    owner.value.targets++;
    const detach = owner.bind(target.current);
    let alive = true;
    if (nodeId && image) owner.value.rememberNode(canvasId, nodeId, image);
    void owner.value.ready().then(async () => {
      if (!alive) return;
      if (nodeId && image) await owner.value.openNode(canvasId, nodeId, image);
    }).catch(error => { if (alive) owner.value.fail(error); });
    return () => { alive = false; detach(); owner.value.targets--; queueMicrotask(() => { if (!owner.value.targets) owner.value.hide(false); }); };
  }, [owner, canvasId, nodeId]);
  return <div ref={target} style={PHOTOCRAFT_TARGET_STYLE} />;
}
export function createPhotoCraftExtension(options: PhotoCraftWebPluginOptions = {}): Plugin.Function<void> {
  return definePlugin((ctx: Context) => {
    const canvasId = options.canvasId ?? ctx.canvasScope.canvasId();
    if (!canvasId) return;
    let owner: PersistentSurface<WorkspaceSession> | null = null;
    let detachPage: (() => void) | null = null;
    const acquire = () => {
      if (owner?.element.isConnected) return owner;
      detachPage?.(); owner = null;
      const base = options.assetBaseUrl ?? new URL("./", options.src ?? new URL("../assets/photocraft/", import.meta.url).href).href;
      owner = ctx.persistentSurfaces.acquire(PHOTOCRAFT_WEB_PLUGIN_ID, () => {
        const session = new WorkspaceSession(base);

        return session;
      });
      owner.value.adopt(); detachPage = owner.value.attachPage(ctx, canvasId); return owner;
    };
    // Rebind a previously loaded owner before a cross-canvas activation waits for this page.
    // Acquire is lazy in WASM, so this allocates no renderer or decoding work.
    acquire();
    // 图片编辑 capability：宿主节点历史经公共契约读取活动身份、草稿与只读预览（design D4）。
    // 每次调用活取当前 owner，页面解除绑定后仍不会持有已释放的会话。
    ctx.provide(IMAGE_EDIT_SERVICE as never, createImageEditService(() => owner?.value ?? null) as never);
    let lastTargets = "";
    const syncTargets = () => {
      const ids = imageFocusTargetIds(ctx.canvasState.getWorkingCanvas()), key = JSON.stringify(ids);
      if (key !== lastTargets) { lastTargets = key; ctx.canvasRuntime.setImageFocusTargets(ids); }
    };
    syncTargets(); const unsubscribe = ctx.canvasState.subscribe(syncTargets);
    const render = (props: { canvas?: unknown; focus?: { nodeId: string; kind: string } | null }) => {
      const nodeId = props.focus?.nodeId ?? null;
      const image = nodeId ? resolveImageFocusImage(props.canvas ?? ctx.canvasState.getWorkingCanvas(), nodeId) : null;
      const surface = acquire();
      return <WorkspaceTarget owner={surface} canvasId={canvasId} nodeId={nodeId} image={image} />;
    };
    const removeFocus = ctx.slots.register("canvas.focus-workspace", { id: "photocraft-focus", owner: "photocraft", kind: "image", exclusive: true, available: () => true, layout: { chromeOwner: "workspace" }, render });
    const removeDocument = ctx.slots.register("canvas.document-workspace", { id: "photocraft-document", owner: "photocraft", isAvailable: () => true, layout: { chromeOwner: "workspace" }, render });
    ctx.effect(() => () => {
      detachPage?.(); unsubscribe(); ctx.canvasRuntime.setImageFocusTexture(null); ctx.canvasRuntime.setImageFocus(null);
      ctx.canvasRuntime.setImageFocusTargets([]); removeFocus(); removeDocument(); owner = null;
    }, "photocraft-page-lease");
  }, { name: PHOTOCRAFT_WEB_PLUGIN_ID, inject: ["persistentSurfaces", "appRouter", "pageLeave", "dialogs", "canvasState", "slots", "canvasNavigation", "canvasRuntime", "canvasRemote", "mediaRemote", "canvasSession", "canvasScope", "focusExit"] });
}
