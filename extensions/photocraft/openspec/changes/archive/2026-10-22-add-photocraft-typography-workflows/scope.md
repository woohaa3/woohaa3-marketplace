# 范围与追溯

本 change 是 19 项拆分中的「精确文字排版与文字工具」，唯一负责 U67, U68, U69。审计依据为固定上游 `4e7a17cd5d5723313f459753663d0d155f047e19`，原审计基线 `a5f0d9e2` + 当时工作区；现在实现已提交为 `bdc3c0847fa7d2ed5db82128dafcf3f47ad1bfa1`。以下保留审计原始描述/源码定位，实施开始时按新基线再核对。

处置原则：未另述项均计划接入；U05 的不兼容色彩/缺 feature 格式、U76 的原生 Droplet/任意脚本、U77 的无浏览器 codec 路径明确暂缓。暂缓部分仍列在本 change 的追溯和验收报告中，不从清单删去，也不能算成已完成。

同级前置：无新增同级 change 的硬依赖。另需前置结构 change；同级完成依赖无环，开发并行与最终验收分别判定。执行者无需读取未复制的审计附件才能理解本 change；本页保存了本域必要描述与来源。

## U67

**精确排版、段落/字符样式和 OpenType** · 接入不完整

基本字号/字体/颜色/对齐、行距/字距/基线和三种字偶距模式已有；缺数字/指定字符对字偶距、更多段落选项、字符/段落样式库、OpenType 特性和点/段落文字转换入口。样式命令由上游工厂生成，未用字符串缺失判定。

依据：[type_extra_cmds.rs:685](../../../vendor/photocraft/crates/engine/src/type_extra_cmds.rs#L685)；[type_extra_cmds.rs:686](../../../vendor/photocraft/crates/engine/src/type_extra_cmds.rs#L686)；[type_extra_cmds.rs:668](../../../vendor/photocraft/crates/engine/src/type_extra_cmds.rs#L668)；[type_extra_cmds.rs:681](../../../vendor/photocraft/crates/engine/src/type_extra_cmds.rs#L681)；[type_styles_cmds.rs:1](../../../vendor/photocraft/crates/engine/src/type_styles_cmds.rs#L1)；[editor-tool-panels.tsx:23](../../../packages/editor/src/editor-tool-panels.tsx#L23)；[capability.rs:250](../../../rust/crates/editor-core/src/capability.rs#L250)

交付约束：补指定字符对/数值字偶距、完整已实现段落选项、点/段落转换、字符/段落样式库和真实可用 OpenType。

结果证据：内核排版/光标/选择与保存一致，样式可重用，切换布局不丢文字或 spans。

## U68

**文字抗锯齿、变形、转路径/形状和栅格化** · 接入不完整

缺抗锯齿方式、Warp Text、Create Work Path、Convert to Shape；type.rasterize 已允许但没有入口。路径文字和竖排另属明确排除范围。

依据：[type_extra_cmds.rs:656](../../../vendor/photocraft/crates/engine/src/type_extra_cmds.rs#L656)；[type_extra_cmds.rs:659](../../../vendor/photocraft/crates/engine/src/type_extra_cmds.rs#L659)；[type_extra_cmds.rs:687](../../../vendor/photocraft/crates/engine/src/type_extra_cmds.rs#L687)；[type_extra_cmds.rs:682](../../../vendor/photocraft/crates/engine/src/type_extra_cmds.rs#L682)；[type_extra_cmds.rs:683](../../../vendor/photocraft/crates/engine/src/type_extra_cmds.rs#L683)；[type_cmds.rs:976](../../../vendor/photocraft/crates/engine/src/type_cmds.rs#L976)；[type_panels_ui.rs:1](../../../vendor/photocraft/crates/ui-egui/src/type_panels_ui.rs#L1)；[photo-editor-tool-options.tsx:17](../../../packages/editor/src/photo-editor-tool-options.tsx#L17)；[capability.rs:250](../../../rust/crates/editor-core/src/capability.rs#L250)

交付约束：提供文字抗锯齿、Warp Text、Create Work Path、Convert to Shape 和现有 rasterize 命令入口。

结果证据：实际合成按抗锯齿/Warp 改变，转换产生可保存几何/像素，原文字可一步撤销恢复。

## U69

**文字蒙版、查找替换和拼写** · 未接包装及 UI

缺水平 Type Mask 直接生成字形选区、查找/替换文字、拼写检查和缺失字体处理等上游功能。

依据：[type_mask_cmds.rs:142](../../../vendor/photocraft/crates/engine/src/type_mask_cmds.rs#L142)；[edit_menu_cmds.rs:1204](../../../vendor/photocraft/crates/engine/src/edit_menu_cmds.rs#L1204)；[type_spell_cmds.rs:239](../../../vendor/photocraft/crates/engine/src/type_spell_cmds.rs#L239)；[type_extra_cmds.rs:710](../../../vendor/photocraft/crates/engine/src/type_extra_cmds.rs#L710)；[type_tool.rs:1](../../../vendor/photocraft/crates/ui-egui/src/type_tool.rs#L1)；[photo-editor-chrome.tsx:19](../../../packages/editor/src/photo-editor-chrome.tsx#L19)；[capability.rs:250](../../../rust/crates/editor-core/src/capability.rs#L250)

交付约束：提供水平文字蒙版、当前文档查找/替换、可用语言拼写和缺字体发现/替换，不扩竖排。

结果证据：文字蒙版产出真实字形选区，替换只改指定文本，缺字体操作保留原文并明确映射。

## 明确边界

竖排和沿路径排字明确排除；“转工作路径”不等于“路径文字”。不承诺未提供字典的中文拼写检查。
