# 精确文字排版与文字工具

审计归属：U67, U68, U69。**域内实现已完成、自动化检查通过**；真实设备/渲染画面验收待人工，
原因写在 [验收记录](verification.md#未采集项待人工验证含真实原因)。

[提案](proposal.md) · [设计](design.md) · [任务](tasks.md) · [范围与生产源码依据](scope.md) ·
[逐项能力矩阵](matrix.md) · [验收计划与记录](verification.md) · [并行边界](parallel-work.md)

实现基线：`bdc3c0847fa7d2ed5db82128dafcf3f47ad1bfa1`；结构前置
`2026-10-22-refactor-photocraft-feature-boundaries`（`b61da631`）已合入。本 change 的改动
**尚未提交**。原 change `2026-10-22-complete-photocraft-webui-editing` 仍有真实设备/外部应用
验收，不能把本次实施视作其归档。

## 交付内容

- **U67**：指定字符对/数值字偶距、9 项段落选项、点↔段落转换、字符/段落样式库（9 个动作）、
  10 个 OpenType 特性、字体列表与缺失字体替换。
- **U68**：7 种抗锯齿、Warp Text（16 种样式 + 取消）、创建工作路径、转换为形状、栅格化文字。
- **U69**：水平文字蒙版（含"建立选区并删除文字层"）、当前文档查找/替换、内置英文拼写检查、
  缺字体发现/按映射替换/全部替换。

命令只经域入口 `typeCommand`/`typeQuery`（白名单 + 参数校验在内核），界面经
`controller.features.type.*` 接入；命令清单与内核两张白名单由测试双向核对，另有回归要求
**清单里每条命令都有真实界面入口**（样式复制/样式选项、逐处替换、字族列表都曾被漏接，现已补齐）。
本域新增的 48 个命令 id 只有一份清单 `tests/features/type/type-commands.json`：增量脚本用它核对
内核白名单只新增这些 id，主线冒烟用它核对每条命令都在**真实调用记录**里出现过（脚本包裹
`execute`/`typeCommand`/`typeQuery` 记录实际执行的 id）。详见 [逐项能力矩阵](matrix.md)。

域内额外补齐了一处上游缺口：抗锯齿/OpenType/变形/样式/文字蒙版/缺字体替换等命令在上游**不检查图层锁定**，
会让"全部锁定"的文字层仍被改写甚至转成形状。本域在 `domain.rs::refuse_locked_text_target`
按 Photoshop 语义拒绝（缺字体替换作用于全文档文字层，因此按**全文档**范围判定锁定），
界面同时在 `activeLayer.effectiveLocks.all` 时禁用入口并显示原因；
只读查询、样式表重命名/删除、纯选区与「列出缺字体」不受影响。

## 快速核对

```bash
pnpm -C photocraft run check && pnpm -C photocraft run rust:test
pnpm -C photocraft run wasm && pnpm -C photocraft run verifier
node photocraft/tests/features/type/typecraft-smoke.mjs        # 主线 + 撤销 + 工程重开 + 命令覆盖
node photocraft/tests/features/type/feature-boundary-delta.mjs # 与重构基线的增量核对
```

`pnpm -C photocraft run features:check` 目前**必然失败**，两处都在共享冻结范围内：共享文件摘要
（本 change 授权的 `contract.json` 排版基线与 `identity.rs` 白名单）与命令白名单（有意新增 48 个）。
上面的增量脚本已逐项证明「除这两类改动外全部全等、无移除」，并等同一个集成动作
（更新 `notes/feature-boundary-baseline.json` 与 `notes/feature-boundary-wasm-baseline.json`）。

## 内容身份与核验

排版字段**已进入内容身份**（任务 3.2）：取值与默认值折叠在本域
`features/type/content.rs::attach_typography`，校验与拼接在 `identity.rs::canonicalize_text`，
两者之间的调用点在 `document_content.rs` 的文字分支。覆盖全部字符 run（行距/字距/基线/字偶距策略/
手工字偶距/OpenType/字符样式引用/字体族/字号/颜色/字重/斜体/伪粗体/伪斜体/下划线等字符属性，
多 run 时逐 run 写入 `charRuns`）、全部段落 run（对齐/四向缩进/段前后距/
自动行距/方向/连字符/样式表引用；多段时写入 `paragraphRuns`）、Warp、抗锯齿，以及文档级样式表
内容（`textStyles` 摘要）；默认值与空表一律不写，旧工程指纹逐字节不变。

宿主与内核的一致性由 `tests/fixtures/contract.json` 的 `contentHashes.typography*` 固定：
TS 与 Rust 各自独立复现同一规范文本与指纹，任一侧少写字段就失败。

`project-verify` 的文档级钩子也已接通：悬空样式引用与样式表预算由
`features/type/mod.rs::inspect_document` 检查，真实工程字节经公开 `verify` 入口即被拒。

已知**不属本域**的一处 P0 缺口：直接调共享命令 `type.setStyle` 的 `postscriptName` 会换掉真实字面
（PNG 变化、`type.info` 的 `postscript_name` 变化），但内容身份不动。本域两条写入路径
（`applyTypography`、字符样式 `attrs`）都写不到该字段，故未在身份里补它——补了会把每个
`type.create` 产出的 `Inter-Regular` 也算成内容，破坏旧工程兼容。详见
[verification.md 已知缺口 5](verification.md#已知缺口)。

## 剩余边界

1. **`features:check` 快照仍需集成负责人更新**（共享冻结文件，本域不能改）。
2. **协议公共入口是冻结文件**，命令清单因此落在
   `packages/editor/src/features/type/commands.ts`。
3. **真实设备/GPU 走查与像素观感未采集**：本机无 `renderD*`、无显示会话，不用软件渲染替代。
4. **P0 `type.setStyle` 的 `postscriptName` 不进内容身份**：本域命令写不到它，补进身份会破坏旧工程
   兼容，留给集成负责人在 P0 收口（见 [verification.md 已知缺口 5](verification.md#已知缺口)）。

前两项由集成负责人顺序处理；域内没有自建第二套摘要、也没有放行未校验内容。
