# 范围与追溯

本 change 是 19 项拆分中的「图像模式与调色板」，唯一负责 U45。审计依据为固定上游 `4e7a17cd5d5723313f459753663d0d155f047e19`，原审计基线 `a5f0d9e2` + 当时工作区；现在实现已提交为 `bdc3c0847fa7d2ed5db82128dafcf3f47ad1bfa1`。以下保留审计原始描述/源码定位，实施开始时按新基线再核对。

处置原则：未另述项均计划接入；U05 的不兼容色彩/缺 feature 格式、U76 的原生 Droplet/任意脚本、U77 的无浏览器 codec 路径明确暂缓。暂缓部分仍列在本 change 的追溯和验收报告中，不从清单删去，也不能算成已完成。

同级前置：2026-10-22-add-photocraft-channel-workflows。另需前置结构 change；同级完成依赖无环，开发并行与最终验收分别判定。执行者无需读取未复制的审计附件才能理解本 change；本页保存了本域必要描述与来源。

## U45

**灰度/位图/索引色/双色调与颜色表** · 未接包装及 UI

上游有这些图像模式转换、颜色表以及陷印；当前没有模式菜单或包装。与 RGB 图片上添加黑白调整层不是同一操作。CMYK/Lab/高位深等另列于范围排除说明。

依据：[image_cmds.rs:803](../../../vendor/photocraft/crates/engine/src/image_cmds.rs#L803)；[mode_cmds.rs:522](../../../vendor/photocraft/crates/engine/src/mode_cmds.rs#L522)；[mode_cmds.rs:502](../../../vendor/photocraft/crates/engine/src/mode_cmds.rs#L502)；[mode_cmds.rs:530](../../../vendor/photocraft/crates/engine/src/mode_cmds.rs#L530)；[mode_cmds.rs:514](../../../vendor/photocraft/crates/engine/src/mode_cmds.rs#L514)；[trap_cmds.rs:49](../../../vendor/photocraft/crates/engine/src/trap_cmds.rs#L49)；[mode_cmds.rs:1](../../../vendor/photocraft/crates/engine/src/mode_cmds.rs#L1)；[photo-editor-menu.ts:39](../../../packages/editor/src/photo-editor-menu.ts#L39)；[capability.rs:250](../../../rust/crates/editor-core/src/capability.rs#L250)

交付约束：提供真实灰度/位图/索引色/双色调模式、颜色表与陷印的转换和编辑，先完成模式数据/工具矩阵/身份核验。

结果证据：模式及调色板在工程重开仍保留，转换报告层结构损失，不能用黑白层假装模式转换。

## 明确边界

LUT、ICC/CMYK/Lab/HDR、16/32 位与真正 RAW 解码不进入本次范围；陷印需 CMYK，同属范围外。索引色/双色调与颜色表已全链路接通并发布（实现、内容身份、能力、入口、核验与跨域门禁），仍未验收的只有真实 UI 走查、通道域联合验收与 Photoshop 往返，原因见 [verification.md](verification.md)。
