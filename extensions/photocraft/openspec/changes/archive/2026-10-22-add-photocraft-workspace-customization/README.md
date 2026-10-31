# 命令搜索与工作区定制

实现与自动化验证完成（`packages/editor/src/features/customization/`，含外壳适配层、共享外壳消费端；
域内 10 文件 108 项 + 外壳/宿主层 10 项回归）。偏好已实际接管运行中的按键、菜单、工具栏、工作区
重排与工具选项恢复。电脑/Pad（1440×1000 / 1024×768）两套真实 Chromium 主线已执行并留证 34 张截图
（`evidence/`），覆盖搜索**执行**、工具栏顺序、工作区当场重排、工具选项跨重载记忆、导入导出的失败
路径。过程中修掉三个真实缺陷：中文命令搜不到、面板被侧栏裁掉、出厂组合无法直接解绑。仅桌面 GUI
人工观感与真实 GPU 渲染待有显示会话的环境验收（任务 4.7）。审计归属：U78。

[提案](proposal.md) · [设计](design.md) · [任务](tasks.md) · [范围与生产源码依据](scope.md) · [验收计划](verification.md)

实现基线：`bdc3c0847fa7d2ed5db82128dafcf3f47ad1bfa1`；原 change `2026-10-22-complete-photocraft-webui-editing` 仍有真实设备/外部应用验收（其 `2.6`、`3.5` 等），不能把本 change 视作其归档。原 change 的 capability 目录（`editor-workspace`、`project-format` 等 11 项）不含 `workspace-customization`，故无同名 capability 冲突需要先行处理；但归档前仍须确认原 change 的未验收项状态未被本 change 覆盖。

并行施工必须先读 [单一写入归属与依赖](parallel-work.md) 与 [验收计划与记录](verification.md)（含逐子能力矩阵、实际检查结果、外壳接入验证与共享基线测试变更说明）。
