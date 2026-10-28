import { decodeImageEditDocument, imageEditDocumentContentIdentity } from "../../protocol/src/index.js";
/**
 * 图片聚焦目标的解析。
 *
 * 画布的 focus adapter 在双击节点时要问「这个节点能不能聚焦」。旧方案由
 * `@woohaa3/photocraft-woohaa` 在每次画布变化时把可聚焦节点 id 推给 `canvasRuntime`：
 *
 *   canvasRuntime.setImageFocusTargets(ids)
 *
 * 聚焦编辑仍然必须注册目标：导航层的图片目标校验以「已注册集合」为**正向**证据，未注册时
 * 才回落到宿主的 canonical 判定（`client/web/frontend/src/cordis/focus/image-focus-target.ts`）。
 * 编辑器在场却没有注册，会让扩展自己的校验（工程/草稿/历史）被宿主兜底绕过，
 * 因此这里仍是必须的。
 *
 * 本模块判断目标是否可用，并解析媒体地址、资产 metadata 和进入时的内容身份，供写回冲突检查。
 *
 * 参数用 `unknown` + 局部结构类型，而不是 import 宿主的 `ServerCanvas`：覆盖层只需要画布
 * 的一小块形状，反向依赖 contracts 的完整类型会把整个 contracts 源码拉进本包的独立
 * 类型检查，制造大量与这里无关的错误。
 */

/** 本模块实际读取的画布形状（`ServerCanvas` 的结构子集）。 */
type FocusCanvas = {
  id?: string;
  document: { nodes: ReadonlyArray<{ id: string; type: string }> };
  nodeData: Record<string, { outputAssetId?: unknown; imageEdit?: unknown } | undefined>;
  assets: ReadonlyArray<{
    id: string;
    status: string;
    mediaKind: string;
    url?: string;
    title?: string;
    metadata?: { storageKey?: string; checksum?: string; contentType?: string; size?: number };
    storageKey?: string;
    checksum?: string;
    contentType?: string;
    size?: number;
  }>;
};

/** 与宿主 `isAllowedMediaUrl` 一致：受控同源相对路径。 */
const MEDIA_BASE_PATH = "/api/media";

/**
 * 节点是否是可聚焦的图片目标。
 *
 * 条件（与旧实现一致）：
 *   1. 节点存在且 `type === "image"`；
 *   2. `nodeData[nodeId].outputAssetId` 指向一个资产；
 *   3. 该资产 `status === "ready"` 且 `mediaKind === "image"`；
 *   4. 资产有受控的媒体地址（`url` 是 `/api/media/...` 下的站内相对路径）。
 */
export function isImageFocusTarget(canvas: unknown, nodeId: string): boolean {
  return focusedAsset(canvas, nodeId) !== null;
}

/** 当前画布上所有可聚焦图片节点的 id（保持节点顺序）。 */
export function imageFocusTargetIds(canvas: unknown): string[] {
  const value = asFocusCanvas(canvas);
  if (!value) return [];
  return value.document.nodes
    .filter((node) => node.type === "image")
    .filter((node) => isImageFocusTarget(value, node.id))
    .map((node) => node.id);
}

/** 可聚焦图片节点对应的素材（供覆盖层把同一张图喂给 PhotoCraft）。 */
export type ImageFocusImage = {
  url: string; name: string; baselineContentIdentity?: string;
  asset?: { id: string; storageKey: string; checksum?: string; contentType?: string; size?: number };
};

/**
 * 取节点的图片素材地址与展示名。
 *
 * 覆盖层需要把这张图交给 PhotoCraft 打开——PhotoCraft 只有在**有文档**时才会上报文档区
 * 矩形，而那是挖洞的依据。返回逻辑同源地址（`/api/media/...`），由宿主再加挂载前缀。
 */
export function resolveImageFocusImage(canvas: unknown, nodeId: string): ImageFocusImage | null {
  const asset = focusedAsset(canvas, nodeId);
  if (!asset) return null;
  const value = asFocusCanvas(canvas)!;
  const metadata = asset.metadata ?? asset;
  const storageKey = metadata.storageKey;
  const edit = decodeImageEditDocument(value.nodeData[nodeId]?.imageEdit);
  const base = edit.ok ? value.assets.find((candidate) => candidate.id === edit.value.baseAssetId) : null;
  const baseStorageKey = base?.metadata?.storageKey ?? base?.storageKey ?? "";
  const baselineContentIdentity = storageKey
    ? edit.ok ? imageEditDocumentContentIdentity({ document: edit.value, baseStorageKey, outputStorageKey: storageKey }) : `media:${storageKey}`
    : undefined;
  return { url: valueUrl(asset.url as string, value.id), name: fileNameFor(asset.url as string, asset.title ?? ""),
    ...(storageKey ? { baselineContentIdentity, asset: { id: asset.id, storageKey,
      checksum: metadata.checksum, contentType: metadata.contentType, size: metadata.size } } : {}) };
}

function valueUrl(url: string, canvasId?: string): string {
  if (!canvasId) return url;
  const parsed = new URL(url, "https://media.invalid");
  parsed.searchParams.set("canvas", canvasId);
  return parsed.pathname + parsed.search;
}

/**
 * 决定交给 PhotoCraft 的文件名。
 *
 * 有标题就用标题（并按地址补扩展名）；没有就用地址的最后一段——PhotoCraft 会按扩展名选择
 * 解码器，名字里没有扩展名时它会当成无法识别的格式。
 */
function fileNameFor(url: string, name: string): string {
  const base = url.split(/[?#]/)[0]?.split("/").pop() ?? "";
  const fromUrl = /\.([a-z0-9]{2,5})$/i.exec(base)?.[1]?.toLowerCase();
  const extension = fromUrl ?? "png";
  if (name !== "") {
    return /\.[a-z0-9]{2,5}$/i.test(name) ? name : `${name}.${extension}`;
  }
  return base !== "" && fromUrl ? base : `image.${extension}`;
}

/** 可聚焦节点的输出资产（未就绪 / 类型不符 / 无受控地址返回 null）。 */
function focusedAsset(canvas: unknown, nodeId: string): FocusCanvas["assets"][number] | null {
  const value = asFocusCanvas(canvas);
  if (!value) return null;
  const node = value.document.nodes.find((candidate) => candidate.id === nodeId);
  if (!node || node.type !== "image") return null;

  const data = value.nodeData[nodeId];
  const outputId = typeof data?.outputAssetId === "string" ? data.outputAssetId : "";
  if (!outputId) return null;

  const asset = value.assets.find((candidate) => candidate.id === outputId);
  if (!asset || asset.status !== "ready" || asset.mediaKind !== "image") return null;

  return hasControlledMediaUrl(asset.url) ? asset : null;
}

/** 无运行时校验的窄化：调用方给的是宿主画布，这里只读取固定字段。 */
function asFocusCanvas(canvas: unknown): FocusCanvas | null {
  if (!canvas || typeof canvas !== "object") return null;
  const value = canvas as Partial<FocusCanvas>;
  if (!value.document || !Array.isArray(value.document.nodes)) return null;
  if (!value.nodeData || typeof value.nodeData !== "object") return null;
  if (!Array.isArray(value.assets)) return null;
  return value as FocusCanvas;
}

/**
 * 资产是否有受控的媒体地址。
 *
 * 与宿主 `resolveCanonicalMediaUrl` 的校验同义：只接受 `/api/media/` 下的站内相对路径，
 * 拒绝显式协议、协议相对地址与路径回溯。这里不 import 宿主模块（覆盖层不应反向依赖
 * frontend 私有实现），保持一份等价的窄检查。
 */
function hasControlledMediaUrl(url: unknown): boolean {
  if (typeof url !== "string" || url === "") return false;
  if (/^[a-z][a-z0-9+.-]*:/i.test(url)) return false;
  if (url.startsWith("//") || url.includes("..")) return false;
  return url.startsWith(`${MEDIA_BASE_PATH}/`);
}
