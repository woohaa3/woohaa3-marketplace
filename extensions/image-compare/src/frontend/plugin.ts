/**
 * 图片对比：在「在此处新建」里新建一个对比节点，或从图片拉出连线后直接选「对比」。
 * 把两张图片连线到它上面，选中它点「对比」。
 *
 * 对比节点是一个带标记的 `image` 节点（画布不接受新的节点类型，未知类型会被规范化成 custom
 * 并丢掉 nodeData）。差异图（只有差异一格，A、B 已在画布上）和结论都写回它自己：结论画在图片下方，全文存在 nodeData.imageCompare.conclusion。
 * 失败（尺寸不一致、读取失败等）同样画在节点里。节点带 suppressModelPanel，不打开模型生成面板。
 */
import type { CanvasCommand } from "@woohaa3/contracts";
import {
  SwapColorsIcon,
  buildUploadedAsset,
  defineExtensionPlugin,
  planReplaceImage,
  type CanvasCommandsService,
  type CanvasScopeService,
  type CanvasStoreFacade,
  type Context,
  type MediaRemoteService,
  type SlotsService
} from "@woohaa3/frontend/extension-api";
import { captionLines, compareImages, describeReport, ImageSizeMismatchError, type RgbaImage } from "./compare.js";
import { COMPARE_MARKER, isCompareNode, resolveInputs, type CompareSource } from "./graph.js";
import { metadata } from "./metadata.js";
import { decodeImage, encodeWithCaption } from "./pixels.js";
import { renderComparison } from "./render.js";

type CompareContext = Context & {
  slots: SlotsService;
  canvasState: CanvasStoreFacade;
  canvasCommands: CanvasCommandsService;
  canvasScope: CanvasScopeService;
  mediaRemote: MediaRemoteService;
};

const TEMPLATE_ID = "image-compare.node";
const ACTION_ID = "image-compare.compare";
const NODE_TITLE = "图片对比";
const RESULT_WIDTH = 720;

export function imageCompareExtension() {
  return defineExtensionPlugin<CompareContext>((ctx) => {
    const log = ctx.log.scope(metadata.extensionId);
    const running = new Set<string>();

    const submit = (commands: CanvasCommand[]) => {
      const result = ctx.canvasCommands.submit(
        commands,
        `image-compare-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
      );
      if (!result.ok) throw new Error(result.reason);
    };

    /**
     * 把一张图（差异图或失败卡片）和结论写回对比节点本身：
     * 图片替换成 outputAssetId，结论存进 nodeData，并确保不打开模型执行面板。
     */
    const writeResult = async (nodeId: string, canvasId: string, image: RgbaImage | null, lines: readonly string[], conclusion: string, fileName: string) => {
      const encoded = await encodeWithCaption(image, lines);
      const file = new File([encoded.blob], `${fileName}.png`, { type: "image/png" });
      const uploaded = await ctx.mediaRemote.upload({ file, canvasId });
      if (!uploaded.ok) throw new Error(`上传失败：${uploaded.error}`);
      const asset = buildUploadedAsset({ media: uploaded.media, mediaKind: "image", file });
      submit([
        ...planReplaceImage({ nodeId, asset }),
        {
          type: "node.update",
          nodeId,
          width: RESULT_WIDTH,
          height: Math.round((RESULT_WIDTH * encoded.height) / encoded.width)
        },
        {
          type: "nodeData.patch",
          nodeId,
          value: { suppressModelPanel: true, [COMPARE_MARKER]: { schemaVersion: 1, conclusion } }
        }
      ]);
      return encoded.captioned;
    };

    const run = async (nodeId: string, sources: readonly [CompareSource, CompareSource]) => {
      const canvasId = ctx.canvasScope.canvasId();
      const names = { a: sources[0].title, b: sources[1].title };
      try {
        const canvas = ctx.canvasState.getWorkingCanvas();
        const assets = sources.map((s) => canvas?.assets.find((a) => a.id === s.assetId));
        const urls = assets.map((asset) => (asset ? ctx.mediaRemote.resolveCanonicalUrl(asset, canvasId) : null));
        if (!urls[0] || !urls[1]) throw new Error("图片地址不可用（资产缺失或不受信任）");
        const [a, b] = await Promise.all([decodeImage(urls[0]), decodeImage(urls[1])]);
        const result = compareImages(a, b);

        const picture = renderComparison(b, result);
        const conclusion = describeReport(result.report, names);
        await writeResult(nodeId, canvasId, picture, captionLines(result.report, names), conclusion, `${NODE_TITLE}：${names.a} vs ${names.b}`);
      } catch (error) {
        const message =
          error instanceof ImageSizeMismatchError
            ? `${error.message}。逐像素比对要求尺寸相同，不做缩放。`
            : error instanceof Error
              ? error.message
              : String(error);
        log({ level: "warn", message: "image-compare failed", error: message });
        // 失败也画在节点里：扩展没有公共的提示出口，节点本身就是呈现面。
        await writeResult(
          nodeId,
          canvasId,
          null,
          [`A「${names.a}」 vs B「${names.b}」`, `对比失败：${message}`],
          `对比失败：${message}`,
          `${NODE_TITLE}失败`
        );
      }
    };

    ctx.effect(
      () => ctx.slots.register("canvas.node-template", {
        id: TEMPLATE_ID,
        owner: metadata.extensionId,
        nodeType: "image",
        label: "对比",
        icon: SwapColorsIcon,
        order: 10,
        acceptsConnection: true,
        createNodeData: (context) => {
          // 只有从图片拉出的线才能直接落成对比节点；其它类型连过来没有可对比的像素。
          if (context.connectFrom && context.connectFrom.nodeType !== "image") return undefined;
          return { title: NODE_TITLE, suppressModelPanel: true, [COMPARE_MARKER]: { schemaVersion: 1 } };
        }
      }),
      "image-compare-node-template"
    );

    ctx.effect(
      () => ctx.slots.register("canvas.node-action", {
        id: ACTION_ID,
        owner: metadata.extensionId,
        order: 50,
        available: ({ nodeId }) => {
          const canvas = ctx.canvasState.getWorkingCanvas();
          return canvas !== null && isCompareNode(canvas, nodeId);
        },
        describe: ({ nodeId, writable }) => {
          const canvas = ctx.canvasState.getWorkingCanvas();
          if (!canvas || !isCompareNode(canvas, nodeId)) return null;
          if (!writable) return { label: "对比", enabled: false, reason: "画布只读" };
          const inputs = resolveInputs(canvas, nodeId);
          if (!inputs.ok) return { label: "对比", enabled: false, reason: inputs.reason };
          return { label: "对比", enabled: true, tone: "primary" };
        },
        activate: ({ nodeId, writable, menu }) => {
          if (menu || !writable || running.has(nodeId)) return;
          const canvas = ctx.canvasState.getWorkingCanvas();
          if (!canvas || !isCompareNode(canvas, nodeId)) return;
          const inputs = resolveInputs(canvas, nodeId);
          if (!inputs.ok) return;
          running.add(nodeId);
          void run(nodeId, inputs.sources)
            .catch((error: unknown) => log({ level: "error", message: "image-compare crashed", error: String(error) }))
            .finally(() => running.delete(nodeId));
        }
      }),
      "image-compare-node-action"
    );
  }, { name: metadata.extensionId, inject: ["slots", "canvasState", "canvasCommands", "canvasScope", "mediaRemote", "log"] });
}
