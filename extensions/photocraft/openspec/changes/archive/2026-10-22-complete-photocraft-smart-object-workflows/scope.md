# 范围与追溯

本 change 是 19 项拆分中的「智能对象子文档与还原图层」，唯一负责 U65, U66。审计依据为固定上游 `4e7a17cd5d5723313f459753663d0d155f047e19`，原审计基线 `a5f0d9e2` + 当时工作区；现在实现已提交为 `bdc3c0847fa7d2ed5db82128dafcf3f47ad1bfa1`。以下保留审计原始描述/源码定位，实施开始时按新基线再核对。

处置原则：未另述项均计划接入；U05 的不兼容色彩/缺 feature 格式、U76 的原生 Droplet/任意脚本、U77 的无浏览器 codec 路径明确暂缓。暂缓部分仍列在本 change 的追溯和验收报告中，不从清单删去，也不能算成已完成。

同级前置：无新增同级 change 的硬依赖。另需前置结构 change；同级完成依赖无环，开发并行与最终验收分别判定。执行者无需读取未复制的审计附件才能理解本 change；本页保存了本域必要描述与来源。

## U65

**源替换/导出入口与子文档界面** · 接入不完整

转换、共享/独立复制、栅格化、打开子文档已有。替换内容/源导出错误地只在 state.active 时出现；子编辑器组件虽已实现，但宿主后代定位规则会裁掉其工具/菜单。沿用上一轮行为记录并在本轮核对源码，未宣称本轮重做子文档操作。

依据：[smart_ui.rs:1](../../../vendor/photocraft/crates/ui-egui/src/smart_ui.rs#L1)；[smart-object-panel.tsx:6](../../../packages/editor/src/smart-object-panel.tsx#L6)；[capability.rs:250](../../../rust/crates/editor-core/src/capability.rs#L250)

交付约束：按选中智能层提供替换源/导出，不要求已打开子会话；修正嵌套编辑器裁切，让菜单/工具和回写/返回完整可用。

结果证据：未开子文档也能替换/导出，桌面/Pad 子菜单不裁切，回写仍幂等并保留冲突恢复。

## U66

**智能对象转回图层** · 未接包装及 UI

上游有 Convert to Layers 的解包能力；当前只暴露栅格化，没有还原为内部可编辑图层的流程。

依据：[smart_cmds.rs:1237](../../../vendor/photocraft/crates/engine/src/smart_cmds.rs#L1237)；[smart-object-panel.tsx:6](../../../packages/editor/src/smart-object-panel.tsx#L6)；[capability.rs:250](../../../rust/crates/editor-core/src/capability.rs#L250)

交付约束：提供 Convert to Layers，解包嵌入源为规范可编辑层/组并保留实例布局/适用样式蒙版，不等同栅格化。

结果证据：单实例转回图层后可编辑原内部层，其他共享实例不变，工程重开和一次撤销正确。

## 明确边界

外链智能对象、任意路径重链接和智能滤镜栈保持 NON_GOALS。
