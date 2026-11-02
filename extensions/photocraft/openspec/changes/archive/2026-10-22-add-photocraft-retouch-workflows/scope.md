# 范围与追溯

本 change 是 19 项拆分中的「修饰工具与仿制源」，唯一负责 U37, U38, U39。审计依据为固定上游 `4e7a17cd5d5723313f459753663d0d155f047e19`，原审计基线 `a5f0d9e2` + 当时工作区；现在实现已提交为 `bdc3c0847fa7d2ed5db82128dafcf3f47ad1bfa1`。以下保留审计原始描述/源码定位，实施开始时按新基线再核对。

处置原则：未另述项均计划接入；U05 的不兼容色彩/缺 feature 格式、U76 的原生 Droplet/任意脚本、U77 的无浏览器 codec 路径明确暂缓。暂缓部分仍列在本 change 的追溯和验收报告中，不从清单删去，也不能算成已完成。

同级前置：无新增同级 change 的硬依赖。另需前置结构 change；同级完成依赖无环，开发并行与最终验收分别判定。执行者无需读取未复制的审计附件才能理解本 change；本页保存了本域必要描述与来源。

## U37

**修补、内容识别移动、移除、红眼** · 未接包装及 UI

当前修饰下拉有污点修复、模糊/锐化/涂抹、减淡/加深/海绵，但缺 Patch/Content-Aware Move/Remove/Red Eye 的工具和手势。

依据：[retouch_cmds.rs:1269](../../../vendor/photocraft/crates/engine/src/retouch_cmds.rs#L1269)；[retouch_cmds.rs:1279](../../../vendor/photocraft/crates/engine/src/retouch_cmds.rs#L1279)；[retouch_cmds.rs:1289](../../../vendor/photocraft/crates/engine/src/retouch_cmds.rs#L1289)；[redeye_cmds.rs:254](../../../vendor/photocraft/crates/engine/src/redeye_cmds.rs#L254)；[retouch_ui.rs:1](../../../vendor/photocraft/crates/ui-egui/src/retouch_ui.rs#L1)；[photo-editor-chrome.tsx:19](../../../packages/editor/src/photo-editor-chrome.tsx#L19)；[capability.rs:250](../../../rust/crates/editor-core/src/capability.rs#L250)

交付约束：接入 Patch、Content-Aware Move、Remove、Red Eye 的工具、区域/拖动/笔迹手势与专用参数。

结果证据：实际像素结果可预览，确认统一一步；红眼不变普通画笔，取消不留下半次修补。

## U38

**图案图章和历史画笔** · 未接包装及 UI

缺 Pattern Stamp 的图案来源与对齐参数，以及 History Brush 的历史源指定/绘画。

依据：[retouch_cmds.rs:1235](../../../vendor/photocraft/crates/engine/src/retouch_cmds.rs#L1235)；[retouch_cmds.rs:1361](../../../vendor/photocraft/crates/engine/src/retouch_cmds.rs#L1361)；[retouch_ui.rs:1](../../../vendor/photocraft/crates/ui-egui/src/retouch_ui.rs#L1)；[photo-editor-chrome.tsx:19](../../../packages/editor/src/photo-editor-chrome.tsx#L19)；[capability.rs:250](../../../rust/crates/editor-core/src/capability.rs#L250)

交付约束：接入图案图章的来源/对齐和历史画笔的稳定历史源选择、取样与绘画。

结果证据：图案按源坐标对齐，历史画笔恢复所选源内容，不移动当前历史游标或静默普通画笔替代。

## U39

**修饰专用参数和取样源面板** · 接入不完整

当前已有仿制/修复、取样点和对齐，但其余参数复用普通画笔；缺减淡/加深范围/曝光、海绵增减饱和、涂抹等强度/专用选项，以及多仿制源、缩放/旋转/翻转与预览叠加。上一轮实测海绵因 mode=normal 报错；本轮不将旧行为冒充重测。

依据：[retouch_cmds.rs:1301](../../../vendor/photocraft/crates/engine/src/retouch_cmds.rs#L1301)；[retouch_cmds.rs:1311](../../../vendor/photocraft/crates/engine/src/retouch_cmds.rs#L1311)；[retouch_cmds.rs:1321](../../../vendor/photocraft/crates/engine/src/retouch_cmds.rs#L1321)；[clone_source.rs:415](../../../vendor/photocraft/crates/engine/src/presets/clone_source.rs#L415)；[clone_source.rs:435](../../../vendor/photocraft/crates/engine/src/presets/clone_source.rs#L435)；[retouch_ui.rs:1](../../../vendor/photocraft/crates/ui-egui/src/retouch_ui.rs#L1)；[photo-editor-app.tsx:163](../../../packages/editor/src/photo-editor-app.tsx#L163)；[capability.rs:250](../../../rust/crates/editor-core/src/capability.rs#L250)

交付约束：按工具提供减淡/加深范围/曝光、海绵增减饱和、涂抹强度等，增加多仿制源的缩放/旋转/翻转和叠加预览。

结果证据：海绵实际发送 saturate/desaturate 且不崩编辑器，仿制变换可见并冻结于一笔。

## 明确边界

不扩展云端 AI 移除、后台作业或混合器画笔；历史源不可用时不静默退化普通画笔。
