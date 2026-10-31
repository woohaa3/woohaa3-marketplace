# 范围与追溯

本 change 是 19 项拆分中的「文档创建、来源与关闭结算」，唯一负责 U01, U02, U03, U04。审计依据为固定上游 `4e7a17cd5d5723313f459753663d0d155f047e19`，原审计基线 `a5f0d9e2` + 当时工作区；现在实现已提交为 `bdc3c0847fa7d2ed5db82128dafcf3f47ad1bfa1`。以下保留审计原始描述/源码定位，实施开始时按新基线再核对。

处置原则：未另述项均计划接入；U05 的不兼容色彩/缺 feature 格式、U76 的原生 Droplet/任意脚本、U77 的无浏览器 codec 路径明确暂缓。暂缓部分仍列在本 change 的追溯和验收报告中，不从清单删去，也不能算成已完成。

同级完成前置：`2026-10-22-add-photocraft-raster-interchange`（U04 导出预设入口）。另需前置结构 change；同级完成依赖无环，开发并行与最终验收分别判定。执行者无需读取未复制的审计附件才能理解本 change；本页保存了本域必要描述与来源。

## U01

**新建空白图像** · 内核已开放，UI 缺失

本机允许 file.new，但文件菜单和文档工作区没有宽高、分辨率、背景的新建对话框；宿主“新建作品”是新画布。

依据：[commands.rs:448](../../../vendor/photocraft/crates/engine/src/commands.rs#L448)；[photo-editor-menu.ts:39](../../../packages/editor/src/photo-editor-menu.ts#L39)；[capability.rs:250](../../../rust/crates/editor-core/src/capability.rs#L250)

交付约束：提供宽高、分辨率、背景/透明和尺寸预设的新建对话框，经资源预检后注册独立文档，不把新建图像解释为新建 Woohaa 画布。

结果证据：新建的透明/实色图像尺寸与 DPI 正确，当前文档保留，可绘画和保存重开。

## U02

**从剪贴板新建、复制整份文档** · 未接包装及 UI

跨文档复制图层已存在；从剪贴板建立新图像和复制当前整个文档没有用户入口。

依据：[edit_cmds.rs:1002](../../../vendor/photocraft/crates/engine/src/edit_cmds.rs#L1002)；[image_cmds.rs:830](../../../vendor/photocraft/crates/engine/src/image_cmds.rs#L830)；[photo-editor-menu.ts:39](../../../packages/editor/src/photo-editor-menu.ts#L39)；[capability.rs:250](../../../rust/crates/editor-core/src/capability.rs#L250)

交付约束：从工作区剪贴板或用户授权读取的图像建立新文档，支持复制整份当前文档并保留规范层树/资源，源与副本内容独立。

结果证据：复制含组/蒙版文档后修改副本不影响原文；剪贴板尺寸正确，关闭来源后仍可使用。

## U03

**另存为/副本、恢复文件、批量关闭** · 未接包装及 UI

上游有 Save As UI，以及保存副本、恢复磁盘版本、关闭全部/其他文档。当前宿主提供工程保存、PNG/PSD 交付和逐文档关闭，没有这些编辑器动作；Woohaa 节点历史不等同于 Revert。

依据：[file_cmds.rs:1592](../../../vendor/photocraft/crates/engine/src/file_cmds.rs#L1592)；[file_cmds.rs:1591](../../../vendor/photocraft/crates/engine/src/file_cmds.rs#L1591)；[file_cmds.rs:1564](../../../vendor/photocraft/crates/engine/src/file_cmds.rs#L1564)；[file_cmds.rs:1565](../../../vendor/photocraft/crates/engine/src/file_cmds.rs#L1565)；[menus.rs:1](../../../vendor/photocraft/crates/ui-egui/src/menus.rs#L1)；[photo-editor-menu.ts:39](../../../packages/editor/src/photo-editor-menu.ts#L39)；[capability.rs:250](../../../rust/crates/editor-core/src/capability.rs#L250)

交付约束：提供另存工程副本、保存副本、恢复到可取得的上次保存基线、关闭全部/其他；浏览器交付不声称写盘，关闭复用逐文档串行结算。

结果证据：副本交付不清原文档 dirty；恢复使用已声明基线，批量关闭在首个失败处停止并保留后续文档。

## U04

**新建/导出预设、最近文件、文件信息** · 未接包装及 UI

缺新建尺寸预设、导出参数预设、编辑器最近文件列表、EXIF/XMP/版权等 File Info 界面。

依据：[document_preset_cmds.rs:278](../../../vendor/photocraft/crates/engine/src/document_preset_cmds.rs#L278)；[document_preset_cmds.rs:318](../../../vendor/photocraft/crates/engine/src/document_preset_cmds.rs#L318)；[export_preset_cmds.rs:174](../../../vendor/photocraft/crates/engine/src/export_preset_cmds.rs#L174)；[file_cmds.rs:1628](../../../vendor/photocraft/crates/engine/src/file_cmds.rs#L1628)；[photo-editor-menu.ts:39](../../../packages/editor/src/photo-editor-menu.ts#L39)；[capability.rs:250](../../../rust/crates/editor-core/src/capability.rs#L250)

交付约束：提供新建/导出参数预设、编辑器最近文件和 File Info 已知 EXIF/XMP/版权字段；最近项说明是否能直接重开或需重新选择。

结果证据：预设重载保持参数，最近项重开真实字节，元数据保存/导出按格式支持矩阵保留或报告损失。

## 明确边界

原生路径保存/恢复、持续目录监听、PSB、ICC/CMYK/HDR 和依赖未编入 WASM 的解码器暂缓；不承诺所有上游格式双向可用。
