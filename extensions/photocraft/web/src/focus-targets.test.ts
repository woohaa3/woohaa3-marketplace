/**
 * 聚焦目标解析的单元测试。
 *
 * 这里防的是一类**回归**：新覆盖层如果忘了把可聚焦图片节点注册给画布运行时，
 * 双击图片节点会被导航层以 `focus-target-invalid` 拒绝，用户看到的是
 * 「聚焦目标不可用」。判断逻辑本身很简单，但漏掉整条链路是很容易犯的错。
 */
import { describe, expect, it } from "vitest";
import { imageFocusTargetIds, isImageFocusTarget, resolveImageFocusImage } from "./focus-targets.js";

/** 造一个最小可用的画布：一个已就绪的图片节点。 */
function canvasWith(overrides: {
  nodeType?: string;
  status?: string;
  mediaKind?: string;
  url?: string;
  outputAssetId?: string;
} = {}) {
  const nodeType = overrides.nodeType ?? "image";
  return {
    id: "canvas-1",
    document: {
      nodes: [{ id: "node-1", type: nodeType }],
      edges: []
    },
    nodeData: {
      "node-1": { outputAssetId: overrides.outputAssetId ?? "asset-1" }
    },
    assets: [
      {
        id: "asset-1",
        status: overrides.status ?? "ready",
        mediaKind: overrides.mediaKind ?? "image",
        url: overrides.url ?? "/api/media/canvas-1/asset-1.png",
        title: ""
      }
    ]
  };
}

describe("图片聚焦目标", () => {
  it("已就绪的图片节点可聚焦", () => {
    expect(isImageFocusTarget(canvasWith(), "node-1")).toBe(true);
  });

  it("非图片节点不可聚焦", () => {
    expect(isImageFocusTarget(canvasWith({ nodeType: "model" }), "node-1")).toBe(false);
  });

  it("资产未就绪时不可聚焦", () => {
    expect(isImageFocusTarget(canvasWith({ status: "pending" }), "node-1")).toBe(false);
  });

  it("媒体类型不是图片时不可聚焦", () => {
    expect(isImageFocusTarget(canvasWith({ mediaKind: "video" }), "node-1")).toBe(false);
  });

  it("没有输出资产时不可聚焦", () => {
    expect(isImageFocusTarget(canvasWith({ outputAssetId: "" }), "node-1")).toBe(false);
  });

  it("媒体地址不是受控同源路径时不可聚焦", () => {
    // 旧实现（resolveCanonicalMediaUrl）同样拒绝这些。
    for (const url of ["https://cdn.example.com/a.png", "/other/a.png", "data:image/png;base64,AA"]) {
      expect(isImageFocusTarget(canvasWith({ url }), "node-1"), url).toBe(false);
    }
  });

  it("不存在的节点不可聚焦", () => {
    expect(isImageFocusTarget(canvasWith(), "nope")).toBe(false);
    expect(isImageFocusTarget(null, "node-1")).toBe(false);
  });

  it("可聚焦节点能取出要喂给 PhotoCraft 的素材地址与文件名", () => {
    expect(resolveImageFocusImage(canvasWith(), "node-1")).toEqual({
      url: "/api/media/canvas-1/asset-1.png?canvas=canvas-1",
      name: "asset-1.png"
    });
  });

  it("资产业务标题用作文件名，缺扩展名时按地址补", () => {
    const canvas = canvasWith({ url: "/api/media/c/b.webp" });
    canvas.assets[0]!.title = "主视觉";
    expect(resolveImageFocusImage(canvas, "node-1")).toEqual({
      url: "/api/media/c/b.webp?canvas=canvas-1",
      name: "主视觉.webp"
    });
  });

  it("不可聚焦的节点取不到素材", () => {
    expect(resolveImageFocusImage(canvasWith({ status: "pending" }), "node-1")).toBeNull();
    expect(resolveImageFocusImage(null, "node-1")).toBeNull();
  });

  it("目标集合只含可聚焦节点，且保持节点顺序", () => {
    const canvas = {
      id: "canvas-1",
      document: {
        nodes: [
          { id: "a", type: "image" },
          { id: "b", type: "model" },
          { id: "c", type: "image" }
        ],
        edges: []
      },
      nodeData: {
        a: { outputAssetId: "asset-a" },
        c: { outputAssetId: "asset-c" }
      },
      assets: [
        { id: "asset-a", status: "ready", mediaKind: "image", url: "/api/media/x/a.png" },
        { id: "asset-c", status: "ready", mediaKind: "image", url: "/api/media/x/c.png" }
      ]
    };
    expect(imageFocusTargetIds(canvas)).toEqual(["a", "c"]);
  });
});


it("reads stable metadata from the real StoredAsset metadata object", () => {
  const canvas = canvasWith();
  Object.assign(canvas.assets[0]!, { metadata: { storageKey: "original.png", checksum: "a".repeat(64), contentType: "image/png", size: 100 } });
  expect(resolveImageFocusImage(canvas, "node-1")).toMatchObject({
    baselineContentIdentity: "media:original.png", asset: { id: "asset-1", storageKey: "original.png", size: 100 }
  });
});
