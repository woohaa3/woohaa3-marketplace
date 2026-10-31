# 智能对象子文档与还原图层

域内实施已完成（U65/U66），自动化证据齐全；`dev` 与 Woohaa 宿主包都能编译与跑测。剩下的只有真实设备 UI 走查和 Photoshop 外部 PSD 验证这类必须人工采集的项（见 [verification.md](verification.md)）。审计归属：U65, U66。

[提案](proposal.md) · [设计](design.md) · [任务](tasks.md) · [范围与生产源码依据](scope.md) · [验收计划与记录](verification.md) · [子能力矩阵](matrix.md)

实现基线：`bdc3c0847fa7d2ed5db82128dafcf3f47ad1bfa1`；原 change `2026-10-22-complete-photocraft-webui-editing` 仍有真实设备/外部应用验收，不能把本次新建规划视作其归档。归档本 change 前须先处理原 change 的同名 capability 基线；实施可直接基于上述实现提交。

并行施工必须先读 [单一写入归属与依赖](parallel-work.md)。
