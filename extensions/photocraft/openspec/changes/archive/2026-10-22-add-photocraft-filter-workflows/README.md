# 滤镜参数、画廊与摄影滤镜

领域实现完成（含实施期间发现并修复的 7 处缺陷：能开草稿但用不了、改了没反应，或报错指向错误命令）；声明/入口/结果一致性已由 5 个 Rust 用例自动钉住，跨域回归（选区/蒙版/非像素目标/混合历史/undo-redo）用真实 WASM 通过。「重复上次」的快捷键入口 `Cmd/Ctrl+Alt+F` 也已接通（登记在本域自有的快捷键清单，复用既有命令分派）。剩余未勾选只有真实设备 UI 走查（4.2）与原 change 的归档（1.1，需改另一个 change），见 verification.md。审计归属：U46, U47, U48, U49。

[提案](proposal.md) · [设计](design.md) · [任务](tasks.md) · [范围与生产源码依据](scope.md) · [验收计划与记录](verification.md)

实现基线：`bdc3c0847fa7d2ed5db82128dafcf3f47ad1bfa1`；原 change `2026-10-22-complete-photocraft-webui-editing` 仍有真实设备/外部应用验收，不能把本次实施视作其归档。归档本 change 前须先处理原 change 的同名 capability 基线；实施可直接基于上述实现提交。

范围外继续关闭：液化、智能滤镜栈、RAW 解码、HDR、仅原生路径。本 change **不新增 capability id**（`proposal.md` 的 New Capabilities 为空），能力清单不变；`features:check` 基线刷新与原 change 归档属集成负责人，见 verification.md。

并行施工必须先读 [单一写入归属与依赖](parallel-work.md)。
