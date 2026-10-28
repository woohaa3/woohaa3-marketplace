/** PhotoCraft compatibility policy over the host's editor-neutral snapshot envelope. */
import { decodeImageEditDocument as decodeEnvelope, decodeImageEditProjectObjectRef as decodeReference,
  isImageProjectDocument, type ImageEditProjectObjectRef, type ImageEditValidationResult } from "@woohaa3/contracts";
export { IMAGE_EDIT_ALLOWED_COLORS, IMAGE_EDIT_DOCUMENT_VERSION, IMAGE_EDIT_LIMITS,
  IMAGE_PROJECT_DOCUMENT_VERSION, decodeSourceAssetIds, imageEditContentIdentity, imageEditDefinitionHash,
  imageEditDocumentContentIdentity, imageEditHasNetChange, imageEditShapesHash, imageEditShapesOf,
  isEmptyImageEditDocument, isImageProjectDocument, isLegacyImageEditDocument, normalizeImageEditPoint,
  normalizeImageEditWidth, sanitizeImageEditPoint, sanitizeImageEditShape } from "@woohaa3/contracts";
export type { ImageEditDocument, ImageEditDocumentVersion, ImageEditPoint, ImageEditTool, ImageEditShape,
  ImageEditValidationResult, ImageProjectDocument, ImageProjectDocumentVersion, LegacyImageEditDocument,
  ImageEditProjectObjectRef } from "@woohaa3/contracts";
/** 受支持的图片编辑引擎标识。 */
export const IMAGE_PROJECT_ENGINE = "photocraft" as const;

/**
 * 宿主编辑能力版本。上游提交仍由 PHOTOCRAFT_ENGINE_COMMIT 单独核对；
 * 分组产物使用新标识，旧应用不能将其按扁平文档继续改写。
 */
export const PHOTOCRAFT_ENGINE_VERSION = "4e7a17cd5d5723313f459753663d0d155f047e19+woohaa-patterns-v1" as const;

/** 受支持的引擎版本集合：未知/过新引擎只读，不静默降级。 */
export const SUPPORTED_PHOTOCRAFT_ENGINE_VERSIONS: readonly string[] = [
  "4e7a17cd5d5723313f459753663d0d155f047e19",
  "4e7a17cd5d5723313f459753663d0d155f047e19+woohaa-groups-v1",
  "4e7a17cd5d5723313f459753663d0d155f047e19+woohaa-blends-v1",
  "4e7a17cd5d5723313f459753663d0d155f047e19+woohaa-fill-v1",
  "4e7a17cd5d5723313f459753663d0d155f047e19+woohaa-styles-v1",
  PHOTOCRAFT_ENGINE_VERSION
];

/**
 * 受支持的 `.pcraft` 文档格式版本集合（上游 `photocraft-format::FORMAT_VERSION`）。
 * 过新的格式版本被拒绝，工程保持只读。
 */
export const SUPPORTED_PHOTOCRAFT_FORMAT_VERSIONS: readonly number[] = [1];

/** 工程媒体类型：只在受控工程上传/读取链路使用。 */
export const IMAGE_PROJECT_CONTENT_TYPE = "application/vnd.woohaa.photocraft-project" as const;


export const IMAGE_PROJECT_LIMITS = {
  /** 单个编辑画布/置入图单边上限。 */
  maxCanvasSide: 8192,
  /** 画布/置入图像素总量上限。 */
  maxCanvasPixels: 8192 * 8192,
  /** 文档层数上限（含背景、文字与调整层）。 */
  maxLayers: 64,
  /** 图案资源数量、单边及累计像素上限。 */
  maxPatterns: 64,
  maxPatternSide: 1024,
  maxPatternPixels: 4 * 1024 * 1024,
  /** 单工程压缩字节上限（64 MiB）；部署限制更低时取更低值。 */
  maxProjectBytes: 64 * 1024 * 1024,
  /** 工程解压后资源字节上限（256 MiB）。 */
  maxDecompressedResourceBytes: 256 * 1024 * 1024,
  /** 工程结构条目上限。 */
  maxEntries: 4096,
  /** 文档层级上限。 */
  maxDocumentDepth: 16,
  /** 单条目解压后上限。 */
  maxEntryDecompressedBytes: 128 * 1024 * 1024,
  /** 可引用的来源资产数量上限。 */
  maxSourceAssetIds: 64,
  /** 选区羽化范围（源像素）。 */
  maxFeatherSourcePixels: 100,
  /** 笔刷尺寸范围（源像素）。 */
  minBrushSizeSourcePixels: 1,
  maxBrushSizeSourcePixels: 512,
  /** 工程定义序列化字节上限。 */
  maxSerializedBytes: 256 * 1024,
  /**
   * PSD 交换预算（change: 2026-10-22-complete-photocraft-webui-editing，任务 1.4 / design D6）。
   *
   * 原始输入与单次导出各限 64 MiB；候选工程仍须满足既有保存预算。
   */
  maxPsdInputBytes: 64 * 1024 * 1024,
  maxPsdOutputBytes: 64 * 1024 * 1024,
  /** 跨文档图层载荷（`LayerTransferBundle`）原始字节与层数预算（design D5）。 */
  maxLayerTransferBytes: 64 * 1024 * 1024,
  maxLayerTransferLayers: 64,
  /** ABR／笔刷库预算（design D4）：单文件、单次导入、库总数、笔尖单边、累计像素与解码字节。 */
  maxAbrFileBytes: 32 * 1024 * 1024,
  maxAbrPresetsPerImport: 256,
  maxBrushLibraryPresets: 256,
  maxBrushTipSide: 1024,
  maxBrushResourcePixels: 16 * 1024 * 1024,
  maxBrushDecodedBytes: 128 * 1024 * 1024,
  /** 参数滤镜与选区修改的半径上限（源像素）。 */
  maxFilterRadius: 1000,
  maxSelectionRadius: 500,
  /** 直方图采样像素上限（与画布像素上限同量级，避免额外大分配）。 */
  maxHistogramSamples: 8192 * 8192,
  /** 工作区同时打开的文档数（含子文档）；运行政策，不写入工程格式。 */
  maxOpenDocuments: 8,
  /**
   * 矢量载荷预算（change: 2026-10-22-add-photocraft-vector-canvas-tools，任务 3.2）。
   *
   * 与 `rust/project-limits.json` 同名同值，由 `contract-fixture.test.ts` 与
   * `limits_agree.rs` 双向核对；**解码前**按 manifest 计数累计，超限整份拒绝。
   */
  maxVectorSavedPaths: 256,
  maxVectorSubpaths: 4096,
  maxVectorKnotsPerSubpath: 4096,
  maxVectorPathPoints: 32768
} as const;
export function decodeImageEditProjectObjectRef(input: unknown): ImageEditProjectObjectRef | null {
  const ref = decodeReference(input);
  return ref?.contentType === IMAGE_PROJECT_CONTENT_TYPE ? ref : null;
}
export function decodeImageEditDocument(input: unknown): ImageEditValidationResult {
  const result = decodeEnvelope(input);
  if (!result.ok || !isImageProjectDocument(result.value)) return result;
  const doc = result.value;
  if (doc.engine !== IMAGE_PROJECT_ENGINE) return { ok: false, error: "工程定义引擎不受支持" };
  if (!SUPPORTED_PHOTOCRAFT_ENGINE_VERSIONS.includes(doc.engineVersion)) return { ok: false, error: "工程定义引擎版本不受支持" };
  if (!SUPPORTED_PHOTOCRAFT_FORMAT_VERSIONS.includes(doc.formatVersion)) return { ok: false, error: "工程定义格式版本不受支持" };
  if (!decodeImageEditProjectObjectRef(doc.project)) return { ok: false, error: "工程定义缺少合法工程对象 metadata" };
  return result;
}
