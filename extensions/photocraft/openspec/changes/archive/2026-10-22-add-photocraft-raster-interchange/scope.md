# 范围与追溯

本 change 是 19 项拆分中的「栅格格式与导出交付」，唯一负责 U05, U06, U07。审计依据为固定上游 `4e7a17cd5d5723313f459753663d0d155f047e19`，原审计基线 `a5f0d9e2` + 当时工作区；现在实现已提交为 `bdc3c0847fa7d2ed5db82128dafcf3f47ad1bfa1`。以下保留审计原始描述/源码定位，实施开始时按新基线再核对。

处置原则：未另述项均计划接入；U05 的不兼容色彩/缺 feature 格式、U76 的原生 Droplet/任意脚本、U77 的无浏览器 codec 路径明确暂缓。暂缓部分仍列在本 change 的追溯和验收报告中，不从清单删去，也不能算成已完成。

> 实施状态（2026-10-23）：U05 / U06 / U07 三个 U 组的下述交付约束均已实现并通过真实产物与真实
> Chromium 走查，含宿主接线。下面各节的「未接包装及 UI」是**审计当时的基线描述**，保留用于追溯；
> 当前状态、实测值与剩余未验收项见 [tasks.md](tasks.md) 与 [verification.md](verification.md)。

同级前置：无新增同级 change 的硬依赖。另需前置结构 change；同级完成依赖无环，开发并行与最终验收分别判定。执行者无需读取未复制的审计附件才能理解本 change；本页保存了本域必要描述与来源。

## U05

**更多栅格格式的打开** · 未接包装及 UI

当前打开入口接受 PNG/JPEG/WebP/工程，PSD 单独导入；上游 codecs 另有 TIFF、GIF、BMP、TGA、ICO、QOI、PNM、PCX、XPM、DDS、FITS、DPX/Cineon 和 EXR 等读取路径。部分格式只读，AVIF/HEIF 另受 feature 限制，不能一概称为可直接双向接入。

依据：[format.rs:1](../../../vendor/photocraft/crates/codecs/src/format.rs#L1)；[photo-editor-menu.ts:39](../../../packages/editor/src/photo-editor-menu.ts#L39)；[capability.rs:250](../../../rust/crates/editor-core/src/capability.rs#L250)

交付约束：维护逐格式读写/位深/metadata/feature 的真实矩阵，接入可用 RGB/U8 解码路径并明确只读项；HDR 和缺 codec 项列为暂缓。

结果证据：每个开放扩展名以实际签名字节完成 WASM 解码、预检与可编辑打开，损坏/伪扩展名不误接受。

## U06

**通用导出及 Save for Web** · 未接包装及 UI

当前已有 PNG、PSD 与工程保存；JPEG/WebP/TIFF 等格式选择、质量、压缩、尺寸、元数据选项、Save for Web 以及导出预设没有 Web UI。PNG 导出本身不是缺失。

依据：[web_cmds.rs:1466](../../../vendor/photocraft/crates/engine/src/web_cmds.rs#L1466)；[web_cmds.rs:1475](../../../vendor/photocraft/crates/engine/src/web_cmds.rs#L1475)；[export_dialog.rs:1](../../../vendor/photocraft/crates/ui-egui/src/export_dialog.rs#L1)；[photo-editor-menu.ts:39](../../../packages/editor/src/photo-editor-menu.ts#L39)；[capability.rs:250](../../../rust/crates/editor-core/src/capability.rs#L250)

交付约束：提供通用导出/Save for Web 的格式、质量、压缩、尺寸、透明及元数据设置、真实编码预览和预设；至少完成 JPEG/WebP 及矩阵内可写 TIFF。

结果证据：预览和交付使用同一设置与快照，真实输出可解码且尺寸正确；导出不覆盖工程保存基线。

## U07

**逐层导出与自动切图** · 未接包装及 UI

缺 Layers to Files、单层快速导出/Export As 与按图层名称生成 Image Assets。

依据：[file_cmds.rs:1692](../../../vendor/photocraft/crates/engine/src/file_cmds.rs#L1692)；[layer_menu_cmds.rs:993](../../../vendor/photocraft/crates/engine/src/layer_menu_cmds.rs#L993)；[layer_menu_cmds.rs:987](../../../vendor/photocraft/crates/engine/src/layer_menu_cmds.rs#L987)；[web_cmds.rs:1493](../../../vendor/photocraft/crates/engine/src/web_cmds.rs#L1493)；[photo-editor-menu.ts:39](../../../packages/editor/src/photo-editor-menu.ts#L39)；[capability.rs:250](../../../rust/crates/editor-core/src/capability.rs#L250)

交付约束：提供逐层/所选层 Export As、Layers to Files 和按图层名称生成 Image Assets 的用户触发交付，处理重名、非法文件名和资源包预算。

结果证据：包中逐层像素/边界/命名与选择一致，导出报告能定位失败项，不启动后台磁盘生成器。

## 明确边界

原生路径保存/恢复、持续目录监听、PSB、ICC/CMYK/HDR 和依赖未编入 WASM 的解码器暂缓；不承诺所有上游格式双向可用。
