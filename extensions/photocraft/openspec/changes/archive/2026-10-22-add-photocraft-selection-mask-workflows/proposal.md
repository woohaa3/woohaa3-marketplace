# 选区与蒙版完整交互

## Why

基础选框、套索、魔棒、选区组合、像素蒙版和参数式细化已有；真实修边预览和高级手势仍缺。 2026-10-22 的固定上游接入审计确认了 U17, U18, U19, U20, U21, U22, U23, U24；需要以真实可操作工作流补齐，不能以已开放命令或阶段声明代替交互完成。

## What Changes

- **U17 单行/单列选框**：在选框组增加单行/单列工具，按源像素创建一行/一列并支持既有选择组合模式。
- **U18 多边形套索、磁性套索**：提供多边形逐点套索与磁性边缘追踪，支持回退锚点、双击/闭合完成和取消，预览使用实际追踪结果。
- **U19 命名选区、扩大选取和选取相似**：提供命名保存/加载选区、覆盖确认及按色彩 Grow/Similar 的参数与真实预览，区别几何 Expand。
- **U20 快速蒙版及其画笔编辑**：提供 Q/鼠标 Quick Mask 切换、覆盖色查看、临时黑白画笔编辑及退出转选区；取消恢复进入选区。
- **U21 对象/主体/天空/焦点选择和移除背景**：接入传统 Object/Subject/Sky/Focus Area 和 Remove Background 的采样区域、参数、候选遮罩/选区及输出，不标记为 AI 模型能力。
- **U22 色彩范围的画布取样和高级选项**：色彩范围支持画布多点/增减取样、局部颜色群组/范围、色调区间和采样层选项，已有单色/反相功能保留。
- **U23 选择并遮住的修边画笔和预览**：选择并遮住提供真实像素边缘预览、前景/背景修边笔、smartRadius/采样层、净化颜色及选择/蒙版/新层/新文档等输出。
- **U24 像素蒙版密度、非破坏羽化和显示模式**：提供像素蒙版 density、非破坏 feather 及独立/覆盖显示模式，密度羽化属于内容而查看属于会话。

## Capabilities

### New Capabilities

无。

### Modified Capabilities

- `selection-refinement`：复用前置 change `2026-10-22-complete-photocraft-webui-editing` 中的同名能力，追加本域要求，不复制已有 Requirement。该能力尚在 changes 中，归档顺序须先建立原 capability。

## Dependencies and Non-goals

优先级：第一批。前置实现提交 `bdc3c0847fa7d2ed5db82128dafcf3f47ad1bfa1`，同级依赖：2026-10-22-add-photocraft-channel-workflows。各自保持唯一 U 编号 owner；共用接口的提供方不代替本 change 的用户流程验收。

AI 主体/发丝模型和上游未实现的 detectFaces 不在本 change；传统 select.subject/object 不按名称误禁为 AI。 全局明确非目标仍保留；不建设独立应用外壳、手机布局或无障碍专项。

## Impact

涉及 `packages/editor`、纯 `packages/protocol`、`rust/crates/editor-core`，有新内容时同步 `rust/crates/project-verify` / `packages/project-verifier`、limits 与 fixture。`dev` 和 `integrations/woohaa` 消费相同公共端口；只在确有宿主能力需求时更新适配和相关接口。vendor 快照不修改。交付完整规划和空闲 ATC 会话；本次不启动实施。

## Parallel implementation

先完成 `2026-10-22-refactor-photocraft-feature-boundaries`；本 change 仅写 `features/selections/` 相关域目录，通过冻结接口接入。共享文件和具体同级前置见 [parallel-work.md](parallel-work.md)。
