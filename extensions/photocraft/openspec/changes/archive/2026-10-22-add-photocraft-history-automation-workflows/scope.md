# 范围与追溯

本 change 是 19 项拆分中的「历史快照、动作与数据驱动编辑」，唯一负责 U74, U75, U76。审计依据为固定上游 `4e7a17cd5d5723313f459753663d0d155f047e19`，原审计基线 `a5f0d9e2` + 当时工作区；现在实现已提交为 `bdc3c0847fa7d2ed5db82128dafcf3f47ad1bfa1`。以下保留审计原始描述/源码定位，实施开始时按新基线再核对。

处置原则：未另述项均计划接入；U05 的不兼容色彩/缺 feature 格式、U76 的原生 Droplet/任意脚本、U77 的无浏览器 codec 路径明确暂缓。暂缓部分仍列在本 change 的追溯和验收报告中，不从清单删去，也不能算成已完成。

同级前置：2026-10-22-add-photocraft-file-workflows, 2026-10-22-add-photocraft-raster-interchange。另需前置结构 change；同级完成依赖无环，开发并行与最终验收分别判定。执行者无需读取未复制的审计附件才能理解本 change；本页保存了本域必要描述与来源。

## U74

**历史快照、新建自历史和清理历史** · 未接包装及 UI

当前撤销/重做与点选历史状态已有；缺命名快照、从历史状态建新文档、删除快照/状态及 Purge。

依据：[history_cmds.rs:257](../../../vendor/photocraft/crates/engine/src/history_cmds.rs#L257)；[history_cmds.rs:247](../../../vendor/photocraft/crates/engine/src/history_cmds.rs#L247)；[history_cmds.rs:287](../../../vendor/photocraft/crates/engine/src/history_cmds.rs#L287)；[history_cmds.rs:237](../../../vendor/photocraft/crates/engine/src/history_cmds.rs#L237)；[edit_menu_cmds.rs:1162](../../../vendor/photocraft/crates/engine/src/edit_menu_cmds.rs#L1162)；[edit_history.rs:1](../../../vendor/photocraft/crates/ui-egui/src/edit_history.rs#L1)；[photo-editor-panels.tsx:18](../../../packages/editor/src/photo-editor-panels.tsx#L18)；[capability.rs:250](../../../rust/crates/editor-core/src/capability.rs#L250)

交付约束：提供命名历史快照、从状态建新文档、删除快照/状态和按范围 Purge；清理前说明不可恢复范围并确认。

结果证据：快照指向真实内容，自历史新建独立，清理不改变当前像素/保存基线且正确失效历史画笔源。

## U75

**动作录制与 ATN** · 未接包装及 UI

缺 Actions 面板、录制/停止/播放、步骤编辑/条件、动作集/快捷键及 ATN 导入导出。

依据：[actions_cmds.rs:613](../../../vendor/photocraft/crates/engine/src/actions_cmds.rs#L613)；[actions_cmds.rs:633](../../../vendor/photocraft/crates/engine/src/actions_cmds.rs#L633)；[actions_edit_cmds.rs:248](../../../vendor/photocraft/crates/engine/src/actions_edit_cmds.rs#L248)；[actions_edit_cmds.rs:268](../../../vendor/photocraft/crates/engine/src/actions_edit_cmds.rs#L268)；[atn_cmds.rs:3251](../../../vendor/photocraft/crates/engine/src/atn_cmds.rs#L3251)；[atn_cmds.rs:3261](../../../vendor/photocraft/crates/engine/src/atn_cmds.rs#L3261)；[actions.rs:1](../../../vendor/photocraft/crates/ui-egui/src/actions.rs#L1)；[photo-editor-panels.tsx:18](../../../packages/editor/src/photo-editor-panels.tsx#L18)；[capability.rs:250](../../../rust/crates/editor-core/src/capability.rs#L250)

交付约束：提供动作录制/停止/播放、步骤/条件编辑、动作集/快捷键和受限 ATN 导入导出，逐步骤能力预检。

结果证据：录制只含成功规范命令，播放逐步结果与手动一致，未知 ATN 步骤有报告而非静默跳过。

## U76

**批处理、脚本、数据集和变量** · 未接包装及 UI

缺 Batch/Image Processor/Contact Sheet/Droplet、脚本事件、载入文件堆栈、像素/文字/可见性变量与数据集替换/导入导出。部分原生文件/进程流程需浏览器宿主重新设计；batch.background/automation.mcp 是明确排除项，不承诺一键开放。

依据：[file_cmds.rs:1655](../../../vendor/photocraft/crates/engine/src/file_cmds.rs#L1655)；[file_cmds.rs:1664](../../../vendor/photocraft/crates/engine/src/file_cmds.rs#L1664)；[automate_cmds.rs:549](../../../vendor/photocraft/crates/engine/src/automate_cmds.rs#L549)；[automate_cmds.rs:557](../../../vendor/photocraft/crates/engine/src/automate_cmds.rs#L557)；[automate_cmds.rs:589](../../../vendor/photocraft/crates/engine/src/automate_cmds.rs#L589)；[file_cmds.rs:1673](../../../vendor/photocraft/crates/engine/src/file_cmds.rs#L1673)；[variables_cmds.rs:463](../../../vendor/photocraft/crates/engine/src/variables_cmds.rs#L463)；[variables_cmds.rs:477](../../../vendor/photocraft/crates/engine/src/variables_cmds.rs#L477)；[variables_cmds.rs:484](../../../vendor/photocraft/crates/engine/src/variables_cmds.rs#L484)；[variables_ui.rs:1](../../../vendor/photocraft/crates/ui-egui/src/variables_ui.rs#L1)；[photo-editor-menu.ts:39](../../../packages/editor/src/photo-editor-menu.ts#L39)；[capability.rs:250](../../../rust/crates/editor-core/src/capability.rs#L250)

交付约束：提供前台 Batch/Image Processor/Contact Sheet/Load Stack、受限声明式脚本、文本/像素/显隐变量与数据集导入替换导出；原生 Droplet/任意脚本事件暂缓。

结果证据：有界队列逐文件报告，数据集替换可重复，取消后不启动下一项，不调用原生路径/进程。

## 明确边界

MCP、后台批处理、任意脚本执行、原生 Droplet/进程/路径和打印仍为排除或平台暂缓，不从 NON_GOALS 一次移除。
