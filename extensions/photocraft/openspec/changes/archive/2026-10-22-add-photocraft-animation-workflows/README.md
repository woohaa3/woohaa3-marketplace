# 时间轴与浏览器视频工作流

实施已落地到域内可自动验证的程度；验收记录见 [verification.md](verification.md) 与逐项
[能力矩阵](matrix.md)。审计归属：U77。

[提案](proposal.md) · [设计](design.md) · [任务](tasks.md) · [范围与生产源码依据](scope.md) · [验收计划](verification.md) · [逐项能力矩阵](matrix.md)

实现基线：`bdc3c0847fa7d2ed5db82128dafcf3f47ad1bfa1`；原 change `2026-10-22-complete-photocraft-webui-editing` 仍有真实设备/外部应用验收，不能把本 change 视作其归档。归档本 change 前须先处理原 change 的同名 capability 基线；实施可直接基于上述实现提交。

并行施工必须先读 [单一写入归属与依赖](parallel-work.md)。核验器分派、窗口菜单、Woohaa codec 端口、
能力发布（4 个 `animation.*`）与内容身份跨语言接线均已完成；重构前基线保持冻结，新增项登记在
`notes/feature-boundary-additions.json`。只剩真实设备 UI 走查与真实 WebCodecs 编解码端到端待人工验证
（原因见 verification）。
