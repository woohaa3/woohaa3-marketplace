# 历史快照、动作与数据驱动编辑

**域内实施已完成；真实设备走查与两处外部依赖未完成。** 命令门、WASM 导出、面板/域会话、
菜单入口、内容身份、文档级核验与回归已落地，12 个能力 id 已在 `P7` 发布（见 [任务](tasks.md)
勾选与 [验收记录](verification.md)「自动检查」）。交互主线已在本地 Chromium 里以真实 WASM
跑通（软件渲染，仅功能证据；当场修掉三处真实缺陷，补齐取样读取点后补跑同一主线又修掉一处，
最后补做取样预览/来源校验时再修掉四处的相邻问题），但真实 GPU 下的电脑/Pad 视觉与性能验收
未采集。U74 的「失效历史画笔源」在本域一侧已做成**可执行的取样读取点**（`history_sample` /
`sampleHistory`：带取源 `epoch` 取样，过期即拒绝，浏览器里已验证「取样→清理→再取样被拒→重新
取源恢复」；`preview: false` 时同一套校验但不合成像素，供历史画笔落笔前廉价判定「源还能用吗」），
消费方 `paint.historyBrush` 仍要等 sibling `add-photocraft-retouch-workflows`（U38）
接线；派生文档登记为活动标签需要 `document.activate` 与未命名文档保存目标的产品决策。逐条见
[验收记录](verification.md)「剩余阻塞」与「真实 UI 与设备」。
审计归属：U74, U75, U76。

[提案](proposal.md) · [设计](design.md) · [任务](tasks.md) · [范围与生产源码依据](scope.md) · [验收计划](verification.md)

实现基线：`bdc3c0847fa7d2ed5db82128dafcf3f47ad1bfa1`；原 change `2026-10-22-complete-photocraft-webui-editing` 仍有真实设备/外部应用验收，不能把本次新建规划视作其归档。本 change 的同名 capability 基线已处理（12 个能力 id 随 `P7` 发布，两个共享快照已重新采集，`features:check` 通过）；归档前仍需完成真实设备走查与 sibling 依赖。

并行施工必须先读 [单一写入归属与依赖](parallel-work.md)。
