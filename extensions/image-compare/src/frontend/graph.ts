/**
 * 对比节点的图结构读取：纯函数，不依赖宿主，便于单测。
 *
 * 对比节点是一个 `image` 节点，`nodeData.imageCompare` 是它的身份标记。输入就是连到它上面的
 * 两条边：边的顺序（画布文档里的先后，也就是连线的先后）决定谁是 A、谁是 B。
 */

export const COMPARE_MARKER = "imageCompare";

export type CompareNodeState = {
  schemaVersion: 1;
  /** 最近一次对比的结论全文。同时画在节点图片下方；留一份在 nodeData 里便于复制和被下游读取。 */
  conclusion?: string;
};

type LooseRecord = Record<string, unknown>;

/** 宿主 `ServerCanvas` 的结构子集；字段都放宽成 unknown，宿主的真实类型可直接赋值。 */
export type CanvasLike = {
  document: {
    nodes: ReadonlyArray<{ id: string; type: string; position?: { x: number; y: number }; width?: number; height?: number }>;
    edges: ReadonlyArray<{ source: string; target: string }>;
  };
  nodeData: Readonly<Record<string, LooseRecord | undefined>>;
  assets: ReadonlyArray<{ id: string; mediaKind: string; title?: string }>;
};

export type CompareSource = { nodeId: string; title: string; assetId: string };

export type InputResolution =
  | { ok: true; sources: [CompareSource, CompareSource] }
  | { ok: false; reason: string };

export function readCompareState(data: LooseRecord | undefined): CompareNodeState | null {
  const raw = data?.[COMPARE_MARKER];
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const state = raw as LooseRecord;
  if (state.schemaVersion !== 1) return null;
  return {
    schemaVersion: 1,
    ...(typeof state.conclusion === "string" ? { conclusion: state.conclusion } : {})
  };
}

export function isCompareNode(canvas: CanvasLike, nodeId: string): boolean {
  const node = canvas.document.nodes.find((n) => n.id === nodeId);
  return node?.type === "image" && readCompareState(canvas.nodeData[nodeId]) !== null;
}

function titleOf(canvas: CanvasLike, nodeId: string, assetTitle: string | undefined): string {
  const title = canvas.nodeData[nodeId]?.title;
  if (typeof title === "string" && title.trim()) return title.trim();
  return assetTitle?.trim() || nodeId;
}

/** 找出连到对比节点上的两张图片。数量不对、或有输入还没有产物时给出可读的原因。 */
export function resolveInputs(canvas: CanvasLike, nodeId: string): InputResolution {
  const incoming: string[] = [];
  for (const edge of canvas.document.edges) {
    if (edge.target !== nodeId || edge.source === nodeId || incoming.includes(edge.source)) continue;
    const source = canvas.document.nodes.find((n) => n.id === edge.source);
    // 其它类型的节点不算输入。
    if (source?.type === "image") incoming.push(source.id);
  }
  if (incoming.length < 2) return { ok: false, reason: `需要连入两张图片（现在 ${incoming.length} 张）` };
  if (incoming.length > 2) return { ok: false, reason: `只能连入两张图片（现在 ${incoming.length} 张）` };

  const sources: CompareSource[] = [];
  for (const id of incoming) {
    const assetId = canvas.nodeData[id]?.outputAssetId;
    const asset = typeof assetId === "string" ? canvas.assets.find((a) => a.id === assetId) : undefined;
    if (!asset || asset.mediaKind !== "image") {
      return { ok: false, reason: `「${titleOf(canvas, id, undefined)}」还没有图片产物` };
    }
    sources.push({ nodeId: id, title: titleOf(canvas, id, asset.title), assetId: asset.id });
  }
  return { ok: true, sources: [sources[0]!, sources[1]!] };
}
