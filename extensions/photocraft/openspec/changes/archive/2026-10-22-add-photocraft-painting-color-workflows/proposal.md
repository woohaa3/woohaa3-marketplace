# 绘画、笔刷动态与颜色

## Why

已有基础画笔/橡皮、预设与部分动态，但笔迹 mode 固定 normal，倾斜选项没有真实输入链。 2026-10-22 的固定上游接入审计确认了 U27, U28, U29, U30, U31, U32, U33, U34, U35, U36；需要以真实可操作工作流补齐，不能以已开放命令或阶段声明代替交互完成。

## What Changes

- **U27 铅笔和颜色替换**：提供铅笔和颜色替换工具及各自模式/容差/采样参数，逐工具冻结笔迹设置。
- **U28 渐变和油漆桶**：提供 Gradient 拖动方向、类型、色标/透明度与 Paint Bucket 的容差/连续/采样控制，区别整层前背景填充。
- **U29 背景橡皮擦和魔术橡皮擦**：提供背景橡皮的采样/边界/保护颜色与魔术橡皮容差/连续等工具参数。
- **U30 高级笔刷动态与混合模式**：让绘画混合模式、纹理/模式、颜色/角度/圆度动态、压力曲线与双轴散布/数量抖动真实进入内核笔迹及预览。
- **U31 数位笔倾斜/旋转数据和大笔刷范围**：贯通真实 coalesced pen 的倾斜/旋转输入；在共享限额和真实性能证据下开放超过 512 的有界笔刷，鼠标/缺传感器明确回退。
- **U32 选区定义笔刷与笔刷分组管理**：从当前选区定义静态笔尖，提供笔刷移动组、分组改名/排序/删除及库持久化错误反馈。
- **U33 对称绘画**：提供水平/垂直/径向等对称及从路径定义/编辑对称轴，所有复制笔迹同一事务。
- **U34 独立吸管和采样选项**：增加独立吸管、平均采样尺寸、当前/全部/下方图层和前/背景色取样，保留 Alt 临时取色。
- **U35 颜色/色板/渐变预设面板**：提供颜色/色板的分组、导入导出/常用色，以及共享渐变预设/色标编辑，应用后的资源与库独立。
- **U36 工具预设与重置工具**：提供保存/选择工具预设以及当前/全部工具恢复默认，明确重置的参数范围而不删除文档和工作区。

## Capabilities

### New Capabilities

无。

### Modified Capabilities

- `brush-workflow`：复用前置 change `2026-10-22-complete-photocraft-webui-editing` 中的同名能力，追加本域要求，不复制已有 Requirement。该能力尚在 changes 中，归档顺序须先建立原 capability。

## Dependencies and Non-goals

优先级：第一批。前置实现提交 `bdc3c0847fa7d2ed5db82128dafcf3f47ad1bfa1`，同级依赖：无新增同级 change 的硬依赖。各自保持唯一 U 编号 owner；共用接口的提供方不代替本 change 的用户流程验收。

双重笔刷、湿边/混合器、特殊鬃毛以及未经预算和真笔验收的大范围参数仍关闭。 全局明确非目标仍保留；不建设独立应用外壳、手机布局或无障碍专项。

## Impact

涉及 `packages/editor`、纯 `packages/protocol`、`rust/crates/editor-core`，有新内容时同步 `rust/crates/project-verify` / `packages/project-verifier`、limits 与 fixture。`dev` 和 `integrations/woohaa` 消费相同公共端口；只在确有宿主能力需求时更新适配和相关接口。vendor 快照不修改。交付完整规划和空闲 ATC 会话；本次不启动实施。

## Parallel implementation

先完成 `2026-10-22-refactor-photocraft-feature-boundaries`；本 change 仅写 `features/painting/` 相关域目录，通过冻结接口接入。共享文件和具体同级前置见 [parallel-work.md](parallel-work.md)。
