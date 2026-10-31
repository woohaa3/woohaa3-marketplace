# 直接调整与调整图层

## Why

已有六类调整层及直方图；直接像素调整、分通道草稿和更多类型未贯通。 2026-10-22 的固定上游接入审计确认了 U40, U41, U42, U43, U44；需要以真实可操作工作流补齐，不能以已开放命令或阶段声明代替交互完成。

## What Changes

- **U40 直接作用于像素的图像调整**：为现有和新增已开放调整提供直接像素流程，入口区别调整图层，尊重选区和实际可写目标。
- **U41 色阶/曲线的分通道、吸管和完整选项**：补 RGB/R/G/B 曲线与色阶、输出端点、黑灰白场吸管、曲线铅笔/平滑，并同步草稿校验和参数序列化。
- **U42 色相/饱和度和黑白的高级参数**：补色相按六色域范围、Colorize 和黑白 Tint/颜色；保留现有总参数和黑白六色权重。
- **U43 更多调整类型**：逐类接入曝光、色彩平衡、照片滤镜、通道混合器、反相、色调分离、阈值、渐变映射、可选颜色的直接调整和调整层。
- **U44 自动校正和匹配/替换颜色**：提供自动色调/对比度/颜色、去色/均衡、阴影高光和匹配/替换颜色，跨文档匹配冻结源快照。

## Capabilities

### New Capabilities

无。

### Modified Capabilities

- `adjustment-workflow`：复用前置 change `2026-10-22-complete-photocraft-webui-editing` 中的同名能力，追加本域要求，不复制已有 Requirement。该能力尚在 changes 中，归档顺序须先建立原 capability。

## Dependencies and Non-goals

优先级：第二批（分通道优先）。前置实现提交 `bdc3c0847fa7d2ed5db82128dafcf3f47ad1bfa1`，同级依赖：无新增同级 change 的硬依赖。各自保持唯一 U 编号 owner；共用接口的提供方不代替本 change 的用户流程验收。

LUT、ICC/CMYK/Lab/HDR、16/32 位与真正 RAW 解码不进入本次范围；索引/双色调尚未全链路接通时保持不发布。 全局明确非目标仍保留；不建设独立应用外壳、手机布局或无障碍专项。

## Impact

涉及 `packages/editor`、纯 `packages/protocol`、`rust/crates/editor-core`，有新内容时同步 `rust/crates/project-verify` / `packages/project-verifier`、limits 与 fixture。`dev` 和 `integrations/woohaa` 消费相同公共端口；只在确有宿主能力需求时更新适配和相关接口。vendor 快照不修改。交付完整规划和空闲 ATC 会话；本次不启动实施。

## Parallel implementation

先完成 `2026-10-22-refactor-photocraft-feature-boundaries`；本 change 仅写 `features/adjustments/` 相关域目录，通过冻结接口接入。共享文件和具体同级前置见 [parallel-work.md](parallel-work.md)。
