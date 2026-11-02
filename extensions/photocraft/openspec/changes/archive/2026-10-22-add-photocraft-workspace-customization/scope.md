# 范围与追溯

本 change 是 19 项拆分中的「命令搜索与工作区定制」，唯一负责 U78。审计依据为固定上游 `4e7a17cd5d5723313f459753663d0d155f047e19`，原审计基线 `a5f0d9e2` + 当时工作区；现在实现已提交为 `bdc3c0847fa7d2ed5db82128dafcf3f47ad1bfa1`。以下保留审计原始描述/源码定位，实施开始时按新基线再核对。

处置原则：未另述项均计划接入；U05 的不兼容色彩/缺 feature 格式、U76 的原生 Droplet/任意脚本、U77 的无浏览器 codec 路径明确暂缓。暂缓部分仍列在本 change 的追溯和验收报告中，不从清单删去，也不能算成已完成。

同级前置：无新增同级 change 的硬依赖。另需前置结构 change；同级完成依赖无环，开发并行与最终验收分别判定。执行者无需读取未复制的审计附件才能理解本 change；本页保存了本域必要描述与来源。

## U78

**命令搜索、自定义快捷键/工具栏/工作区** · 未接包装及 UI

缺上游命令搜索、键位/菜单/工具栏定制与工具选项记忆等完整设置。当前三个面板的独立浮动/重新停靠与文档标签重排已经实现，不列为缺失。

依据：[prefs.rs:2149](../../../vendor/photocraft/crates/engine/src/prefs.rs#L2149)；[prefs.rs:2167](../../../vendor/photocraft/crates/engine/src/prefs.rs#L2167)；[prefs.rs:2158](../../../vendor/photocraft/crates/engine/src/prefs.rs#L2158)；[prefs.rs:2111](../../../vendor/photocraft/crates/engine/src/prefs.rs#L2111)；[palette.rs:1](../../../vendor/photocraft/crates/ui-egui/src/palette.rs#L1)；[photo-editor-chrome.tsx:19](../../../packages/editor/src/photo-editor-chrome.tsx#L19)；[capability.rs:250](../../../rust/crates/editor-core/src/capability.rs#L250)

交付约束：提供命令搜索、键位/菜单/工具栏/工作区保存重载与默认恢复；只绑定当前已接通动作并保留鼠标入口。

结果证据：搜索执行同一门禁动作，冲突有明确处理，重载保留偏好，IME 和浏览器占用键不误触发编辑。

## 明确边界

不重做已经交付的标签位置、面板浮动、鼠标滚轮语义；手机布局及无障碍专项不在范围。
