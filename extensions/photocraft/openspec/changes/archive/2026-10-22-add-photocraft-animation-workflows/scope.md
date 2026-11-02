# 范围与追溯

本 change 是 19 项拆分中的「时间轴与浏览器视频工作流」，唯一负责 U77。审计依据为固定上游 `4e7a17cd5d5723313f459753663d0d155f047e19`，原审计基线 `a5f0d9e2` + 当时工作区；现在实现已提交为 `bdc3c0847fa7d2ed5db82128dafcf3f47ad1bfa1`。以下保留审计原始描述/源码定位，实施开始时按新基线再核对。

处置原则：未另述项均计划接入；U05 的不兼容色彩/缺 feature 格式、U76 的原生 Droplet/任意脚本、U77 的无浏览器 codec 路径明确暂缓。暂缓部分仍列在本 change 的追溯和验收报告中，不从清单删去，也不能算成已完成。

同级前置：2026-10-22-add-photocraft-raster-interchange。另需前置结构 change；同级完成依赖无环，开发并行与最终验收分别判定。执行者无需读取未复制的审计附件才能理解本 change；本页保存了本域必要描述与来源。

## U77

**时间轴、视频图层和视频交付** · 未接包装及 UI

缺 Timeline、帧属性/导航、视频图层/逐帧编辑、导入帧到图层和 Render Video。存在上游实现，但涉及原生编解码/外部工具的路径不能直接等价为浏览器可用。

依据：[timeline_cmds.rs:137](../../../vendor/photocraft/crates/engine/src/timeline_cmds.rs#L137)；[timeline_cmds.rs:139](../../../vendor/photocraft/crates/engine/src/timeline_cmds.rs#L139)；[video_cmds.rs:529](../../../vendor/photocraft/crates/engine/src/video_cmds.rs#L529)；[video_cmds.rs:533](../../../vendor/photocraft/crates/engine/src/video_cmds.rs#L533)；[video_cmds.rs:534](../../../vendor/photocraft/crates/engine/src/video_cmds.rs#L534)；[timeline_ui.rs:1](../../../vendor/photocraft/crates/ui-egui/src/timeline_ui.rs#L1)；[photo-editor-menu.ts:39](../../../packages/editor/src/photo-editor-menu.ts#L39)；[capability.rs:250](../../../rust/crates/editor-core/src/capability.rs#L250)

交付约束：分阶段提供时间轴/帧导航与属性、视频轨道/逐帧编辑、帧导入和浏览器实际支持的动画/视频交付；依赖真实 codec 端口。

结果证据：多帧工程持续时间/顺序/编辑可往返，播放不新增历史；真实支持的 codec 可导入导出而不只取首帧。

## 明确边界

依赖原生进程的未移植视频编解码、后台转码、无限时长/超预算媒体保持关闭；有真实端口和验收前不宣称 Render Video 可用。
