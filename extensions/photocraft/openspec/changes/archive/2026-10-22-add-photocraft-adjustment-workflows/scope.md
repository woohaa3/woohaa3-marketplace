# 范围与追溯

本 change 是 19 项拆分中的「直接调整与调整图层」，唯一负责 U40, U41, U42, U43, U44。审计依据为固定上游 `4e7a17cd5d5723313f459753663d0d155f047e19`，原审计基线 `a5f0d9e2` + 当时工作区；现在实现已提交为 `bdc3c0847fa7d2ed5db82128dafcf3f47ad1bfa1`。以下保留审计原始描述/源码定位，实施开始时按新基线再核对。

处置原则：未另述项均计划接入；U05 的不兼容色彩/缺 feature 格式、U76 的原生 Droplet/任意脚本、U77 的无浏览器 codec 路径明确暂缓。暂缓部分仍列在本 change 的追溯和验收报告中，不从清单删去，也不能算成已完成。

同级前置：无新增同级 change 的硬依赖。另需前置结构 change；同级完成依赖无环，开发并行与最终验收分别判定。执行者无需读取未复制的审计附件才能理解本 change；本页保存了本域必要描述与来源。

## U40

**直接作用于像素的图像调整** · 内核已开放，UI 缺失

本机已允许 brightnessContrast/hueSaturation/curves/levels/vibrance/blackWhite 的 image.adjustments.*，但当前“调整”面板主要提供新建/编辑调整图层；没有对应的像素直接调整流程。两者历史与图层结果不同。

依据：[commands.rs:1193](../../../vendor/photocraft/crates/engine/src/commands.rs#L1193)；[commands.rs:1206](../../../vendor/photocraft/crates/engine/src/commands.rs#L1206)；[commands.rs:1199](../../../vendor/photocraft/crates/engine/src/commands.rs#L1199)；[commands.rs:1194](../../../vendor/photocraft/crates/engine/src/commands.rs#L1194)；[commands.rs:1205](../../../vendor/photocraft/crates/engine/src/commands.rs#L1205)；[commands.rs:1216](../../../vendor/photocraft/crates/engine/src/commands.rs#L1216)；[photo-editor-app.tsx:163](../../../packages/editor/src/photo-editor-app.tsx#L163)；[capability.rs:250](../../../rust/crates/editor-core/src/capability.rs#L250)

交付约束：为现有和新增已开放调整提供直接像素流程，入口区别调整图层，尊重选区和实际可写目标。

结果证据：同一参数直接调整只改原像素/一步历史，调整层方式新增或编辑可重编层。

## U41

**色阶/曲线的分通道、吸管和完整选项** · 接入不完整

总 RGB 曲线与色阶输入端已有。缺 RGB 单通道、色阶输出端点、黑灰白场吸管、曲线铅笔/平滑等；本机调整草稿只允许 curves.points，分通道还需草稿包装。

依据：[commands.rs:1194](../../../vendor/photocraft/crates/engine/src/commands.rs#L1194)；[commands.rs:1199](../../../vendor/photocraft/crates/engine/src/commands.rs#L1199)；[adjust_editors.rs:1](../../../vendor/photocraft/crates/ui-egui/src/adjust_editors.rs#L1)；[photo-editor-tool-options.tsx:17](../../../packages/editor/src/photo-editor-tool-options.tsx#L17)；[capability.rs:250](../../../rust/crates/editor-core/src/capability.rs#L250)

交付约束：补 RGB/R/G/B 曲线与色阶、输出端点、黑灰白场吸管、曲线铅笔/平滑，并同步草稿校验和参数序列化。

结果证据：R 曲线只影响对应通道，切通道保留所有曲线，预览/重开/核验一致。

## U42

**色相/饱和度和黑白的高级参数** · 接入不完整

缺按红/黄/绿/青/蓝/洋红范围分别调整、色相着色 Colorize、黑白 Tint 及其颜色等；现有总色相/饱和度/明度和黑白六色权重已经接入。

依据：[commands.rs:1206](../../../vendor/photocraft/crates/engine/src/commands.rs#L1206)；[commands.rs:1216](../../../vendor/photocraft/crates/engine/src/commands.rs#L1216)；[adjust_params.rs:1](../../../vendor/photocraft/crates/engine/src/adjust_params.rs#L1)；[editor-tool-panels.tsx:23](../../../packages/editor/src/editor-tool-panels.tsx#L23)；[capability.rs:250](../../../rust/crates/editor-core/src/capability.rs#L250)

交付约束：补色相按六色域范围、Colorize 和黑白 Tint/颜色；保留现有总参数和黑白六色权重。

结果证据：指定色域和着色只按实际内核语义作用，切换高级项不丢已有参数。

## U43

**更多调整类型** · 未接包装及 UI

缺曝光、色彩平衡、照片滤镜、通道混合器、反相、色调分离、阈值、渐变映射、可选颜色，对应的直接调整与调整层均有上游注册实现。

依据：[commands.rs:1204](../../../vendor/photocraft/crates/engine/src/commands.rs#L1204)；[commands.rs:1211](../../../vendor/photocraft/crates/engine/src/commands.rs#L1211)；[commands.rs:1221](../../../vendor/photocraft/crates/engine/src/commands.rs#L1221)；[commands.rs:1226](../../../vendor/photocraft/crates/engine/src/commands.rs#L1226)；[commands.rs:1231](../../../vendor/photocraft/crates/engine/src/commands.rs#L1231)；[commands.rs:1232](../../../vendor/photocraft/crates/engine/src/commands.rs#L1232)；[commands.rs:1233](../../../vendor/photocraft/crates/engine/src/commands.rs#L1233)；[commands.rs:1234](../../../vendor/photocraft/crates/engine/src/commands.rs#L1234)；[commands.rs:1235](../../../vendor/photocraft/crates/engine/src/commands.rs#L1235)；[commands.rs:1](../../../vendor/photocraft/crates/engine/src/commands.rs#L1)；[photo-editor-layer-actions.ts:1](../../../packages/editor/src/photo-editor-layer-actions.ts#L1)；[capability.rs:250](../../../rust/crates/editor-core/src/capability.rs#L250)

交付约束：逐类接入曝光、色彩平衡、照片滤镜、通道混合器、反相、色调分离、阈值、渐变映射、可选颜色的直接调整和调整层。

结果证据：每类均能真实预览、确认、重编、撤销和保存重开，TS/原生核验接受合法参数。

## U44

**自动校正和匹配/替换颜色** · 未接包装及 UI

缺自动色调/对比度/颜色、去色/均衡、阴影高光、匹配颜色和替换颜色。

依据：[edit_cmds.rs:1023](../../../vendor/photocraft/crates/engine/src/edit_cmds.rs#L1023)；[edit_cmds.rs:1024](../../../vendor/photocraft/crates/engine/src/edit_cmds.rs#L1024)；[edit_cmds.rs:1025](../../../vendor/photocraft/crates/engine/src/edit_cmds.rs#L1025)；[commands.rs:1023](../../../vendor/photocraft/crates/engine/src/commands.rs#L1023)；[extra_cmds.rs:860](../../../vendor/photocraft/crates/engine/src/extra_cmds.rs#L860)；[adjust_cmds.rs:485](../../../vendor/photocraft/crates/engine/src/adjust_cmds.rs#L485)；[adjust_cmds.rs:501](../../../vendor/photocraft/crates/engine/src/adjust_cmds.rs#L501)；[adjust_cmds.rs:493](../../../vendor/photocraft/crates/engine/src/adjust_cmds.rs#L493)；[adjust_cmds.rs:1](../../../vendor/photocraft/crates/engine/src/adjust_cmds.rs#L1)；[photo-editor-menu.ts:39](../../../packages/editor/src/photo-editor-menu.ts#L39)；[capability.rs:250](../../../rust/crates/editor-core/src/capability.rs#L250)

交付约束：提供自动色调/对比度/颜色、去色/均衡、阴影高光和匹配/替换颜色，跨文档匹配冻结源快照。

结果证据：各命令对受控图真实产生预期差异，匹配来源不被修改，撤销恢复目标。

## 明确边界

LUT、ICC/CMYK/Lab/HDR、16/32 位与真正 RAW 解码不进入本次范围；索引/双色调尚未全链路接通时保持不发布。
