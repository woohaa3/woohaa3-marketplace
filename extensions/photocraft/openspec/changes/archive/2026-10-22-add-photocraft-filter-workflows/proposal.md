# 滤镜参数、画廊与摄影滤镜

## Why

目前所谓“滤镜库”实际只有高斯模糊和 amount 单参数 USM，不能代替上游画廊。 2026-10-22 的固定上游接入审计确认了 U46, U47, U48, U49；需要以真实可操作工作流补齐，不能以已开放命令或阶段声明代替交互完成。

## What Changes

- **U46 USM 完整参数和重复上次滤镜**：补 USM radius/threshold/amount 和重复上次滤镜入口；重复保存规范参数与资源而非旧目标。
- **U47 其余模糊/锐化/降噪**：逐项接生产实现中的普通/进一步/方框/动感/径向/表面/智能/形状/镜头模糊、智能/边缘锐化及加噪/去斑/划痕/中间值/降噪。
- **U48 像素化、扭曲、风格化、渲染和其他滤镜**：逐项接生产实现中的像素化/扭曲/风格化/渲染/其他滤镜，包括位移/自定卷积/高反差/最大最小及颜色转透明的资源参数。
- **U49 滤镜画廊、模糊画廊和摄影滤镜**：提供真实 Filter Gallery、场景/光圈/移轴/路径/旋转模糊图内控件，以及 RGB 摄影调节、镜头校正/广角/消失点工作区。

## Capabilities

### New Capabilities

无。

### Modified Capabilities

- `retouch-filter-workflow`：复用前置 change `2026-10-22-complete-photocraft-webui-editing` 中的同名能力，追加本域要求，不复制已有 Requirement。该能力尚在 changes 中，归档顺序须先建立原 capability。

## Dependencies and Non-goals

优先级：第二批，画廊第三批。前置实现提交 `bdc3c0847fa7d2ed5db82128dafcf3f47ad1bfa1`，同级依赖：无新增同级 change 的硬依赖。各自保持唯一 U 编号 owner；共用接口的提供方不代替本 change 的用户流程验收。

液化、智能滤镜栈、RAW 解码、HDR 和不能编译到 WASM 的原生执行路径继续关闭。 全局明确非目标仍保留；不建设独立应用外壳、手机布局或无障碍专项。

## Impact

涉及 `packages/editor`、纯 `packages/protocol`、`rust/crates/editor-core`，有新内容时同步 `rust/crates/project-verify` / `packages/project-verifier`、limits 与 fixture。`dev` 和 `integrations/woohaa` 消费相同公共端口；只在确有宿主能力需求时更新适配和相关接口。vendor 快照不修改。交付完整规划和空闲 ATC 会话；本次不启动实施。

## Parallel implementation

先完成 `2026-10-22-refactor-photocraft-feature-boundaries`；本 change 仅写 `features/filters/` 相关域目录，通过冻结接口接入。共享文件和具体同级前置见 [parallel-work.md](parallel-work.md)。
