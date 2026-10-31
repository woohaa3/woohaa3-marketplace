# 范围与追溯

本 change 是 19 项拆分中的「视图导航、参考线与分析辅助」，唯一负责 U70, U71, U72, U73。审计依据为固定上游 `4e7a17cd5d5723313f459753663d0d155f047e19`，原审计基线 `a5f0d9e2` + 当时工作区；现在实现已提交为 `bdc3c0847fa7d2ed5db82128dafcf3f47ad1bfa1`。以下保留审计原始描述/源码定位，实施开始时按新基线再核对。

处置原则：未另述项均计划接入；U05 的不兼容色彩/缺 feature 格式、U76 的原生 Droplet/任意脚本、U77 的无浏览器 codec 路径明确暂缓。暂缓部分仍列在本 change 的追溯和验收报告中，不从清单删去，也不能算成已完成。

同级前置：无新增同级 change 的硬依赖。另需前置结构 change；同级完成依赖无环，开发并行与最终验收分别判定。执行者无需读取未复制的审计附件才能理解本 change；本页保存了本域必要描述与来源。

## U70

**参考线单条编辑、拖动和标尺原点** · 内核已开放，UI 缺失

标尺/网格/参考线显示、数值加线和全清已有；缺从标尺拖线、现有线命中/拖动/单条编辑删除和标尺原点拖动/复位。相关单线和原点命令已开放。

依据：[edit_cmds.rs:1046](../../../vendor/photocraft/crates/engine/src/edit_cmds.rs#L1046)；[edit_cmds.rs:1055](../../../vendor/photocraft/crates/engine/src/edit_cmds.rs#L1055)；[edit_cmds.rs:1064](../../../vendor/photocraft/crates/engine/src/edit_cmds.rs#L1064)；[edit_cmds.rs:1066](../../../vendor/photocraft/crates/engine/src/edit_cmds.rs#L1066)；[edit_cmds.rs:1075](../../../vendor/photocraft/crates/engine/src/edit_cmds.rs#L1075)；[guide_select.rs:1](../../../vendor/photocraft/crates/ui-egui/src/guide_select.rs#L1)；[view-aids-overlay.tsx:1](../../../packages/editor/src/view-aids-overlay.tsx#L1)；[capability.rs:250](../../../rust/crates/editor-core/src/capability.rs#L250)

交付约束：提供标尺拖出参考线、已有线命中/拖动/数值编辑/单条删除、原点拖动与复位。

结果证据：缩放/旋转后操作保持源坐标，取消只恢复辅助数据，不制造内容 dirty。

## U71

**参考线布局及吸附的完整参数** · 接入不完整

缺列/行/边距的 New Guide Layout、从形状建立参考线，以及完整单位/网格细分/吸附目标/智能参考线选项。当前网格/吸附开关已存在。

依据：[file_cmds.rs:1710](../../../vendor/photocraft/crates/engine/src/file_cmds.rs#L1710)；[file_cmds.rs:1719](../../../vendor/photocraft/crates/engine/src/file_cmds.rs#L1719)；[guide_layout_ui.rs:1](../../../vendor/photocraft/crates/ui-egui/src/guide_layout_ui.rs#L1)；[editor-tool-panels.tsx:23](../../../packages/editor/src/editor-tool-panels.tsx#L23)；[capability.rs:250](../../../rust/crates/editor-core/src/capability.rs#L250)

交付约束：提供 New Guide Layout 列/行/间距/边距、从形状建线、单位/网格细分/吸附目标和智能参考线选项。

结果证据：生成线位置正确，独立吸附目标真实生效且屏幕阈值稳定，不改文档内容。

## U72

**旋转视图、导航器与多视图** · 接入不完整

空格平移、滚轮/按钮缩放、适合窗口/100% 已存在；缺 Rotate View/复位、Navigator 缩略导航和同一文档 New Window/并排布局等。工具栏也无独立 Hand/Zoom，不能据此说平移/缩放全无。

依据：[rotate_view.rs:1](../../../vendor/photocraft/crates/ui-egui/src/rotate_view.rs#L1)；[photo-editor-chrome.tsx:19](../../../packages/editor/src/photo-editor-chrome.tsx#L19)；[capability.rs:250](../../../rust/crates/editor-core/src/capability.rs#L250)

交付约束：提供独立 Hand/Zoom、Rotate View/复位、Navigator 和同文档多视图/并排；视图共用内容和保存历史。

结果证据：旋转后落笔/命中准确，两视图同步内容而取景独立，仅活动视图接收输入。

## U73

**信息、颜色取样器、标尺测量、计数和注释** · 未接包装及 UI

缺 Info 面板、持久颜色采样点、Ruler/拉直与测量日志、Count 分组标记、Note 注释。状态栏尺寸不等同这些分析功能。

依据：[sampler_cmds.rs:149](../../../vendor/photocraft/crates/engine/src/sampler_cmds.rs#L149)；[analysis_cmds.rs:1211](../../../vendor/photocraft/crates/engine/src/analysis_cmds.rs#L1211)；[analysis_cmds.rs:1202](../../../vendor/photocraft/crates/engine/src/analysis_cmds.rs#L1202)；[analysis_cmds.rs:1248](../../../vendor/photocraft/crates/engine/src/analysis_cmds.rs#L1248)；[notes_cmds.rs:193](../../../vendor/photocraft/crates/engine/src/notes_cmds.rs#L193)；[analysis_ui.rs:1](../../../vendor/photocraft/crates/ui-egui/src/analysis_ui.rs#L1)；[photo-editor-chrome.tsx:19](../../../packages/editor/src/photo-editor-chrome.tsx#L19)；[capability.rs:250](../../../rust/crates/editor-core/src/capability.rs#L250)

交付约束：提供 Info、持久颜色采样点、Ruler/拉直/测量日志、Count 分组和 Note 注释，明确持久与会话数据。

结果证据：读数来自真实源像素，测量按源单位，保存的点/计数/注释可重开且不污染像素。

## 明确边界

不重做已经交付的标签位置、面板浮动、鼠标滚轮语义；手机布局及无障碍专项不在范围。
