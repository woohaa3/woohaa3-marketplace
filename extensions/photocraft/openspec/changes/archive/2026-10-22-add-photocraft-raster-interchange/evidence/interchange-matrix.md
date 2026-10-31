# 栅格交换矩阵与暂缓清单

change: `2026-10-22-add-photocraft-raster-interchange`（U05 / U06 / U07），任务 1.2 / 4.4。

本文件是**代码即声明**的对照说明：权威数据由内核按真实构建给出
（`interchangeMatrixJson()` / `exportMatrixJson()`），本页只记录来源与判定规则，不另存一份格式表。
以下实测值取自本机真实 WASM 构建（`pnpm -C photocraft run wasm`，见
[verification.md](verification.md) 的执行记录）。

## 判定规则（`rust/crates/editor-core/src/features/io/formats.rs`）

| 状态 | 含义 | 规则 |
| --- | --- | --- |
| `open` | 可编辑打开 + 可写 | 解码器已编入、含 U8 采样、（若可写）编码路径可用 |
| `read-only` | 只读打开 | 解码器已编入且含 U8，但本构建没有写路径 |
| `deferred` | 暂缓 | 原因见下表；**不自动降位深**，不静默转码 |

打开准入只按**签名字节**判定，扩展名不参与（伪扩展名因此不会被误接受）。`open_status` 在真实
解码后再核对位深/布局/尺寸，超出文档模型（RGB/U8）即拒绝。

## U05 打开矩阵（实测）

矩阵共 20 个格式行：10 个 `open`、3 个 `read-only`、7 个 `deferred`；可打开扩展名 27 个
（一个格式可有多个扩展名）。

| 格式 | 状态 | 说明 |
| --- | --- | --- |
| PNG / APNG | open | 可写 |
| JPEG（jpg/jpeg/jpe/jfif） | open | 可写 |
| TIFF（tif/tiff） | open | 可写 |
| WebP | open | 可写 |
| GIF | open | 可写 |
| BMP / DIB | open | 可写 |
| TGA（tga/icb/vda/vst） | open | 可写 |
| ICO | open | 可写 |
| QOI | open | 可写 |
| PNM（pnm/pbm/pgm/ppm/pam/pfm） | open | 可写 |
| PCX / XPM / DDS | **read-only** | 上游只提供解码；不承诺双向 |
| FITS | deferred | 常见 16 位/多 HDU，缺少无损 U8 路径 |
| DPX | deferred | 常见 10/12/16 位，缺少无损 U8 路径 |
| Cineon | deferred | 只有 U16 及以上编码 |
| OpenEXR | deferred | HDR/浮点（F16/F32） |
| Radiance HDR | deferred | 浮点线性光 |
| AVIF / HEIF | deferred | 本构建未编入该解码器（feature 关闭） |

暂缓项在矩阵里仍然出现并带原因，面板可见；不从清单删除，也不算已交付。

### 打开实测（每个格式的真实字节）

脚本对 10 个可写格式用**自己的真实编码产物**、对 3 个只读格式用**手工构造的真实签名字节**
各跑一遍 `inspectRaster` + `openRaster`，结果全部 `status` 与 `depth=u8` 正确、尺寸与源一致：

```json
[{"format":"png","via":"own-encoder","status":"open","depth":"u8","size":"32x24"},
 {"format":"jpg","via":"own-encoder","status":"open","depth":"u8","size":"32x24"},
 {"format":"tif","via":"own-encoder","status":"open","depth":"u8","size":"32x24"},
 {"format":"webp","via":"own-encoder","status":"open","depth":"u8","size":"32x24"},
 {"format":"gif","via":"own-encoder","status":"open","depth":"u8","size":"32x24"},
 {"format":"bmp","via":"own-encoder","status":"open","depth":"u8","size":"32x24"},
 {"format":"tga","via":"own-encoder","status":"open","depth":"u8","size":"32x24"},
 {"format":"ico","via":"own-encoder","status":"open","depth":"u8","size":"32x24"},
 {"format":"qoi","via":"own-encoder","status":"open","depth":"u8","size":"32x24"},
 {"format":"pnm","via":"own-encoder","status":"open","depth":"u8","size":"32x24"},
 {"format":"pcx","via":"handmade-fixture","status":"read-only","depth":"u8","size":"2x1"},
 {"format":"xpm","via":"handmade-fixture","status":"read-only","depth":"u8","size":"2x2"},
 {"format":"dds","via":"handmade-fixture","status":"read-only","depth":"u8","size":"2x2"}]
```

同一批断言在 `packages/editor/src/features/io/wasm-integration.test.ts` 里也有自动化回归
（产物缺失时 `skipIf` 明示跳过，不伪装通过）。工程往返实测：
`reencodedEqualsSource` / `canvasEqual` / `layersEqual` / `nameEqual` / `hashStableAfterReopen`
全为 `true`。

## U06 可写格式（实测 `exportMatrixJson`）

`png` · `jpg` · `tif` · `webp` · `gif` · `bmp` · `tga` · `ico` · `qoi` · `pnm`

每个格式声明自己的 `options`（质量/压缩/透明/元数据/尺寸）；不在列表内的参数不会被静默忽略，
而是由 `parse_settings` 拒绝。Save for Web 的格式词是 `png24` / `png8` / `gif` / `jpeg`，
与通用导出的扩展名不是同一套词，二者混用时拒绝而不是互相覆盖。

## U07 交付形态

| 入口 | 输出 | 说明 |
| --- | --- | --- |
| 单层 Export As | 单个图像文件 | 缺省 PNG；像素为图层隔离后的真实边界 |
| Layers to Files | 内存 ZIP + `report.json` | 逐项 `ok`/`error`，无可见像素的层标为跳过 |
| Image Assets | 内存 ZIP + `report.json` | 仅按资产语法命名的图层；重名与非法名改写后记录 |
| 包复核 `inspectIoBundle` | 条目 + 报告 | 交付后可独立复核包内内容 |

三者都是**一次用户触发 → 一个内存包**，没有目录监听、没有后台磁盘生成器，也不写本机路径。

## 预算

唯一权威是 [`interchange-budgets.json`](../../../../packages/protocol/src/features/io/interchange-budgets.json)：
TypeScript 直接 import，Rust `include_str!` 读同一份。它只约束本域打开预检、导出参数与包体，
**不抬高** `rust/project-limits.json` 的工程上限（核验器测试
`interchange_budgets_never_raise_the_project_limits` 锁定这一点）。

## 与宿主菜单的关系

本域贡献一个「图像 ▸ 格式与导出…」面板入口，并已接到共享「文件」菜单的两个条目
（`file.exportRaster`「导出为…」、`file.exportWeb`「Save for Web…」）。共享层只负责「打开本域
面板」，页签与模式语义仍归本域（`features/io/menu-request.ts`，一次性意图，用户后续切换不被覆盖）。
能力是否「已开放」仍以本域面板的真实调用结果为准，不能只以菜单项存在作为证据。

实测（真实 Chromium，1440×1000 与 1024×768）：

```
文件菜单: ["打开文件…","保存","导出 PNG…","导出为…","Save for Web…"]
图像 ▸ 格式与导出… → mode=export
文件 ▸ 导出为…       → mode=export（10 个格式）
文件 ▸ Save for Web… → mode=web（png24/png8/gif/jpeg）
```

## 宿主文件选择器的 `accept`

宿主不该自己维护一份格式清单，也不该等到内核实例化才有值（`<input accept>` 在首帧就要有）。
因此清单以静态常量落在协议域 `packages/protocol/src/features/io/index.ts`
（`OPEN_RASTER_EXTENSIONS` / `OPEN_RASTER_MIMES` / `OPEN_RASTER_ACCEPT`），域会话另有
`controller.features.io.openAccept()` 供需要运行时协商的场景使用；两者同源于下面这张内核矩阵：

```
accept 扩展名: 27 项
  png,apng,jpg,jpeg,jpe,jfif,tif,tiff,webp,gif,bmp,dib,tga,icb,vda,vst,
  ico,qoi,pnm,pbm,pgm,ppm,pam,pfm,pcx,xpm,dds
MIME: 13 项
  image/png, image/jpeg, image/tiff, image/webp, image/gif, image/bmp,
  image/x-tga, image/x-icon, image/qoi, image/x-portable-anymap,
  image/x-pcx, image/x-xpixmap, image/vnd-ms.dds
```

与 `matrix().openable` 逐项一致（实测 27/27 扩展名、13/13 MIME，证据脚本 `hostAcceptParity`）。
暂缓格式（EXR/HDR/Cineon/FITS/DPX/AVIF/HEIF）**不在** accept 里：放进去只会让用户选中后立刻
被拒绝。`.pcraft` 也不在：工程打开是另一条共享管线，不能和栅格打开混在同一个 accept。

两个宿主都已改成读这一份清单（dev 的 `<input accept>`、Woohaa 的 `OPEN_FILE_ACCEPT` 与
`classifyOpenFile`）；宿主接入只剩：

```ts
const accept = controller.features.io.openAccept();
if (accept.ok) input.accept = accept.value.accept; // 27 个扩展名 / 13 个 MIME
```

## 内核反馈必须显示（不得只报成功）

| 内核字段 | 含义 | 界面位置 |
| --- | --- | --- |
| 导出报告 `warnings[]` | 不可逆能力损失（GIF 量化、DPI 被丢弃等） | 预览区 `[data-io-warnings]` + 交付提示文本 |
| 逐层/资产 `rejected[]` | 超预算、目标层失效等原因 | 与失败项并列的错误提示 |
| 逐层/资产 `renames[]` | 重名追加序号、非法字符替换、Windows 保留名前缀 | `[data-io-renames]` 列表（原名 → 交付名 + 原因） |
| 矩阵行 `layouts/alpha/icc/exif/xmp/dpi/text/animation/lossy/extensions` | 格式真实能力 | 「格式矩阵」页逐行 |

样例（真实内核，图层名 `同名/同名/../escape/a b/CON`）：

```
交付名: _CON.png | a_b.png | _escape.png | 同名.png | 同名-2.png | Background.png
改名原因: Windows 保留设备名已加前缀 / 非法文件名字符已替换为 _ / 开头的点已移除 / 重名已追加序号
路径逃逸检查（含 ..、/、CON）: 无
```

## 如何重跑实测

```sh
pnpm -C photocraft run wasm
node photocraft/openspec/changes/2026-10-22-add-photocraft-raster-interchange/evidence/check-interchange-wasm.mjs
# 置入是否与打开同一套解码能力（accept 放宽是否诚实）
node photocraft/openspec/changes/2026-10-22-add-photocraft-raster-interchange/evidence/check-place-formats.mjs
```

脚本只调用真实 WASM 导出（不经 UI），输出即本页「实测」列的来源。若与页面记录不一致，
以脚本输出为准并更新本页。

`check-place-formats.mjs` 逐格式调用 `inspectPlaceAsset` + `placeAsset`：12 种可打开格式全部置入
成功（含 pcx/xpm/dds 等只读打开项——置入只需要解码），暂缓的 EXR 在预检处即被拒并带原因。
这正是「置入」与「打开」共用 `OPEN_RASTER_ACCEPT` 的依据：两边能力同源，不存在「能打开却
选不中置入」的割裂。

界面部分（菜单入口、面板落点、预览==下载、逐层 ZIP）在真实 Chromium 里跑，步骤与实测值见
[verification.md](../verification.md)「真实浏览器界面走查」。渲染结论（GPU 帧率/画质）不在该环境采集。
