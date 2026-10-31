# 范围与追溯

本 change 是 19 项拆分中的「通道与通道计算」，唯一负责 U25, U26。审计依据为固定上游 `4e7a17cd5d5723313f459753663d0d155f047e19`，原审计基线 `a5f0d9e2` + 当时工作区；现在实现已提交为 `bdc3c0847fa7d2ed5db82128dafcf3f47ad1bfa1`。以下保留审计原始描述/源码定位，实施开始时按新基线再核对。

处置原则：未另述项均计划接入；U05 的不兼容色彩/缺 feature 格式、U76 的原生 Droplet/任意脚本、U77 的无浏览器 codec 路径明确暂缓。暂缓部分仍列在本 change 的追溯和验收报告中，不从清单删去，也不能算成已完成。

同级前置：无新增同级 change 的硬依赖。另需前置结构 change；同级完成依赖无环，开发并行与最终验收分别判定。执行者无需读取未复制的审计附件才能理解本 change；本页保存了本域必要描述与来源。

## U25

**Channels 面板和通道操作** · 未接包装及 UI

只有复合图像/图层蒙版目标的局部包装；缺 RGB 单通道查看/编辑、Alpha/专色通道新建/复制/排序/改名/可见性/选取和拆分/合并。保存选区命令开放不等于 Channels 面板已经接入。

依据：[channel_cmds.rs:1908](../../../vendor/photocraft/crates/engine/src/channel_cmds.rs#L1908)；[channel_cmds.rs:1840](../../../vendor/photocraft/crates/engine/src/channel_cmds.rs#L1840)；[channel_cmds.rs:1849](../../../vendor/photocraft/crates/engine/src/channel_cmds.rs#L1849)；[channel_cmds.rs:1858](../../../vendor/photocraft/crates/engine/src/channel_cmds.rs#L1858)；[channel_cmds.rs:1869](../../../vendor/photocraft/crates/engine/src/channel_cmds.rs#L1869)；[channel_cmds.rs:1870](../../../vendor/photocraft/crates/engine/src/channel_cmds.rs#L1870)；[channel_cmds.rs:1879](../../../vendor/photocraft/crates/engine/src/channel_cmds.rs#L1879)；[channel_cmds.rs:1898](../../../vendor/photocraft/crates/engine/src/channel_cmds.rs#L1898)；[channel_cmds.rs:1899](../../../vendor/photocraft/crates/engine/src/channel_cmds.rs#L1899)；[channels_panel.rs:1](../../../vendor/photocraft/crates/ui-egui/src/channels_panel.rs#L1)；[photo-editor-panels.tsx:18](../../../packages/editor/src/photo-editor-panels.tsx#L18)；[capability.rs:250](../../../rust/crates/editor-core/src/capability.rs#L250)

交付约束：提供 RGB 单通道查看/编辑及 Alpha/屏幕专色通道的创建/复制/改名/排序/显隐/选择、拆分/合并；通道目标与查看分离。

结果证据：Alpha/专色数据与元数据可重开，分量编辑只改所选分量，拆合结果和预算正确。

## U26

**应用图像、计算和亮度选区** · 未接包装及 UI

缺 Apply Image/Calculations 的源文档/图层/通道混合与结果输出，以及载入亮度选区入口。

依据：[channel_cmds.rs:1822](../../../vendor/photocraft/crates/engine/src/channel_cmds.rs#L1822)；[channel_cmds.rs:1831](../../../vendor/photocraft/crates/engine/src/channel_cmds.rs#L1831)；[channel_cmds.rs:1925](../../../vendor/photocraft/crates/engine/src/channel_cmds.rs#L1925)；[channel_cmds.rs:1](../../../vendor/photocraft/crates/engine/src/channel_cmds.rs#L1)；[photo-editor-menu.ts:39](../../../packages/editor/src/photo-editor-menu.ts#L39)；[capability.rs:250](../../../rust/crates/editor-core/src/capability.rs#L250)

交付约束：提供应用图像/计算的源文档/层/通道、混合/不透明度/反相和输出选择，以及亮度选区入口，使用源快照。

结果证据：受控通道 fixture 的实际结果正确，计算仅修改目标，亮度选区不是简单全选。

## 明确边界

CMYK/Lab/ICC 多色彩管理、印刷专色保真和任意外部文件路径保持排除。
