# 裁剪、变换与画板切片

## Why

已有数字裁剪/尺寸、仿射自由变换、基础填充及规则图层对齐；缺图内裁剪和高级构图。 2026-10-22 的固定上游接入审计确认了 U50, U51, U52, U53, U54, U55, U56；需要以真实可操作工作流补齐，不能以已开放命令或阶段声明代替交互完成。

## What Changes

- **U50 画布裁剪工具和透视裁剪**：提供画布裁剪框的移动/缩放/旋转、比例预设/网格/遮罩/拉直和真实删除像素策略，并接四角透视裁剪。
- **U51 图像/画布尺寸的完整设置**：补 DPI/打印尺寸单位/重采样开关和算法、画布相对增减/锚点/扩展颜色，数值联动有明确单位。
- **U52 自动裁边、显示全部和任意角度旋转**：提供 Trim 的透明/角像素依据与四边控制、Reveal All、任意角度整图旋转，保留现有 90/180° 与翻转。
- **U53 斜切/扭曲/透视/网格变形及再次变换**：补 Skew/Distort/Perspective/Warp 及网格分割、Puppet/Perspective Warp，提供再次变换和再次变换副本。
- **U54 内容识别填充/缩放、选区描边和渐隐**：提供内容识别 Fill/Scale、任意颜色/图案 Fill、Stroke 宽度/位置和 Fade 不透明度/混合模式。
- **U55 自动对齐/混合和照片合并**：提供按图像内容 Auto-Align/Auto-Blend、Photomerge、自动裁切拉直与堆栈统计，区别规则对齐。
- **U56 画板、框架和切片**：提供 Artboard/Frame/Slice/Slice Select、布局与从层转换、从参考线建切片和画板/切片导出。

## Capabilities

### New Capabilities

无。

### Modified Capabilities

- `composition-type-vector`：复用前置 change `2026-10-22-complete-photocraft-webui-editing` 中的同名能力，追加本域要求，不复制已有 Requirement。该能力尚在 changes 中，归档顺序须先建立原 capability。

## Dependencies and Non-goals

优先级：第二批，画板第三批。前置实现提交 `bdc3c0847fa7d2ed5db82128dafcf3f47ad1bfa1`，同级依赖：无新增同级 change 的硬依赖。各自保持唯一 U 编号 owner；共用接口的提供方不代替本 change 的用户流程验收。

打印、原生文件夹输出和被明确排除的智能滤镜/液化不接入；新增结构接通前不批量开放命令。 全局明确非目标仍保留；不建设独立应用外壳、手机布局或无障碍专项。

## Impact

涉及 `packages/editor`、纯 `packages/protocol`、`rust/crates/editor-core`，有新内容时同步 `rust/crates/project-verify` / `packages/project-verifier`、limits 与 fixture。`dev` 和 `integrations/woohaa` 消费相同公共端口；只在确有宿主能力需求时更新适配和相关接口。vendor 快照不修改。交付完整规划和空闲 ATC 会话；本次不启动实施。

## Parallel implementation

先完成 `2026-10-22-refactor-photocraft-feature-boundaries`；本 change 仅写 `features/composition/` 相关域目录，通过冻结接口接入。共享文件和具体同级前置见 [parallel-work.md](parallel-work.md)。
