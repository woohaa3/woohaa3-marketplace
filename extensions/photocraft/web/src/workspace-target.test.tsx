// @vitest-environment jsdom
/**
 * 工作区目标几何回归
 * （change: 2026-10-27-add-image-history-to-photocraft-focus，task 2.1 / design D2）。
 *
 * 历史 drawer 打开时公共层只改变内容矩形变量，覆盖层目标必须继续引用这些变量，让持久
 * surface 随目标 resize 跟随；canvas 与文档会话不得因布局变化重挂或重开。
 */
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, it, vi } from "vitest";
import { createPhotoCraftExtension } from "./plugin.js";

vi.mock("@woohaa3/frontend/extension-api", () => ({
  defineExtensionPlugin: (body: unknown) => body,
  IMAGE_EDIT_SERVICE: "imageEdit",
  resolvePublicUrl: (path: string) => path
}));

afterEach(() => { document.body.innerHTML = ""; });

it("keeps the workspace target on the public content rect and does not remount the surface", async () => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  const canvas = {
    id: "c",
    document: { nodes: [{ id: "n1", type: "image" }], edges: [] },
    nodeData: { n1: { outputAssetId: "a1" } },
    assets: [{
      id: "a1", status: "ready", mediaKind: "image", url: "/api/media/c/a1.png",
      metadata: { storageKey: "a1.png" }
    }]
  };
  const element = document.createElement("div");
  document.body.append(element);
  const value = {
    mounted: false, targets: 0,
    adopt: vi.fn(), attachPage: vi.fn(() => () => {}),
    ready: vi.fn(async () => {}), rememberNode: vi.fn(), openNode: vi.fn(async () => {}),
    hide: vi.fn(), fail: vi.fn(), release: vi.fn()
  };
  const surface = { element, value, render: vi.fn(), bind: vi.fn(() => vi.fn()), release: vi.fn(), hide: vi.fn() };
  const registrations: Record<string, {
    layout: { chromeOwner?: string };
    render: (props: { canvas?: unknown; focus?: { nodeId: string; kind: string } | null }) => unknown;
  }> = {};
  const app = document.createElement("div");
  app.className = "app";
  app.style.setProperty("--focus-content-width", "1120px");
  document.body.append(app);
  const ctx = {
    canvasScope: { canvasId: () => "c" },
    persistentSurfaces: { acquire: () => surface },
    provide: vi.fn(),
    effect: vi.fn(),
    canvasState: { getWorkingCanvas: () => canvas, subscribe: () => () => {} },
    canvasRuntime: { setImageFocusTargets: vi.fn(), setImageFocusTexture: vi.fn(), setImageFocus: vi.fn() },
    slots: {
      register: (name: string, definition: (typeof registrations)[string]) => {
        registrations[name] = definition;
        return () => {};
      }
    }
  };
  createPhotoCraftExtension({ canvasId: "c" })(ctx as never);

  // 两个工作区都自绘顶部/底部 chrome，公共层不再预留宿主标题栏/底栏。
  expect(registrations["canvas.focus-workspace"]!.layout).toEqual({ chromeOwner: "workspace" });
  expect(registrations["canvas.document-workspace"]!.layout).toEqual({ chromeOwner: "workspace" });

  const route = document.createElement("div");
  app.append(route);
  const root = createRoot(route);
  const render = () => registrations["canvas.focus-workspace"]!.render({
    canvas, focus: { nodeId: "n1", kind: "image" }
  }) as never;
  await act(async () => root.render(render()));
  const target = route.firstElementChild as HTMLElement;
  expect(target).not.toBeNull();
  expect(target.style.position).toBe("absolute");
  expect(target.style.left).toBe("var(--focus-content-x, 0px)");
  expect(target.style.top).toBe("var(--focus-content-y, 0px)");
  expect(target.style.width).toBe("var(--focus-content-width, 100%)");
  expect(target.style.height).toBe("var(--focus-content-height, 100%)");
  expect(target.style.pointerEvents).toBe("none");
  expect(surface.bind).toHaveBeenCalledWith(target);
  expect(surface.value.openNode).toHaveBeenCalledWith("c", "n1", expect.objectContaining({ url: "/api/media/c/a1.png?canvas=c" }));
  expect(surface.value.mounted).toBe(true);
  expect(surface.render).toHaveBeenCalledOnce();

  // drawer 打开只改公共变量：目标仍引用变量，surface 不重绑 canvas、不重开文档。
  await act(async () => {
    app.style.setProperty("--focus-content-width", "800px");
    root.render(render());
  });
  expect(surface.bind).toHaveBeenCalledTimes(1);
  expect(surface.render).toHaveBeenCalledOnce();
  expect(surface.value.openNode).toHaveBeenCalledOnce();
  expect(target.style.width).toBe("var(--focus-content-width, 100%)");

  await act(async () => root.unmount());
});
