# 绘画、笔刷动态与颜色

实施已在本分支完成（域内实现 + 本域所需的共享接线），未提交 Git。审计归属：
U27, U28, U29, U30, U31, U32, U33, U34, U35, U36。

[提案](proposal.md) · [设计](design.md) · [任务](tasks.md) · [范围与生产源码依据](scope.md) · [验收计划](verification.md)

实现基线：`bdc3c0847fa7d2ed5db82128dafcf3f47ad1bfa1`；原地分支 HEAD 为 `b0cd6cbc`。
原 change `2026-10-22-complete-photocraft-webui-editing` 仍有真实设备/外部应用验收，不能把本次
实施视作其归档；本 change 的归档动作属发布流程，由全部 change 收敛后统一执行。
剩余未完成项只有真实 GPU 应用内走查与真笔/>512 笔刷的硬件证据，原因写在
[tasks.md](tasks.md)（2.5、4.2）与 [verification.md](verification.md)「阻塞与待人工验证」。

并行施工必须先读 [单一写入归属与依赖](parallel-work.md)（含本轮授权的共享改动范围）。
