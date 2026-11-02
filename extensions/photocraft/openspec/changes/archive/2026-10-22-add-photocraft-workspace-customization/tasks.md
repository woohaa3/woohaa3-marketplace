# 命令搜索与工作区定制任务

状态约定：`[x]` = 已实现并有可自动化的验证；`[ ]` = 未完成或需真实设备/人工验收，行内写明原因。
逐子能力矩阵、实际命令结果与集成清单见 [验收计划与记录](verification.md)。

## 1. 前置与逐项能力矩阵

- [x] 1.0 合入 `2026-10-22-refactor-photocraft-feature-boundaries` 的实际完成提交，核对 parallel-work 的域目录/冻结接口/共享文件归属；不得并改旧集中入口。— 前置提交 `b61da631`（含全部 4 组前置任务）已是基线祖先；本轮实现只在 `packages/editor/src/features/customization/`、本域文档、`photocraft/notes/feature-boundaries.md`、`docs/code-map/photocraft.md` 与本 change 目录内。
- [x] 1.1 核对实现提交 `bdc3c0847fa7d2ed5db82128dafcf3f47ad1bfa1` 与上游固定来源，处理原 change 同名 capability 的归档前置；保留原 change 未验收记录。— `bdc3c084` 为祖先；原 change 的 11 个 capability 目录与本 change 的 `workspace-customization` 不同名，无归档冲突；原 change 的 `2.6`/`3.5` 等待人工验证项保持未勾选。
- [x] 1.2 将 scope 中每组所有子能力列成生产命令/参数 → 包装 → WASM → UI 手势 → 内容/核验 → 验收的矩阵；列明平台暂缓，不能使用菜单占位证明实现。— 见 `verification.md`「逐子能力矩阵（U78）」；本域是纯 UI/本机偏好，没有生产命令、WASM 与内容/核验链路，矩阵逐项标注。
- [x] 1.3 确认同级依赖 无新增同级 change 的硬依赖；先稳定公共端口、预算与数据归属，不导入宿主私有模块。— `parallel-work.md` 记为「同级完成前置：无」；本域只 import 包内模块与 `@woohaa3/photocraft-protocol` 类型，`pnpm boundary:check` 通过。

## 2. 逐项贯通

- [x] 2.1 U78：提供命令搜索、键位/菜单/工具栏/工作区保存重载与默认恢复；只绑定当前已接通动作并保留鼠标入口。 成功证据：搜索执行同一门禁动作，冲突有明确处理，重载保留偏好，IME 和浏览器占用键不误触发编辑。— 域内功能、外壳适配层与共享外壳消费端均已接通：搜索/键位/工具栏/菜单/工作区/存储实现于 `features/customization/`，`shell-adapter.ts` 把偏好翻译成外壳既有分派/渲染形状，`photo-editor-app.tsx` 与 `photo-editor-chrome.tsx` 已实际调用（见任务 4.5）。回归含「每个出厂绑定翻译出的形状与 `resolveEditorShortcut` 完全相同」「改绑/解绑后旧出厂组合不再触发」「可定制命令 id 与菜单叶子 id 一致」，以及**真实外壳层**的 `shell-consumption.test.tsx`（5 项）与宿主应用层 `customization-interaction.test.tsx`（5 项）。`pnpm -C photocraft run check` 全绿，`features:check` 与 `bdc3c084` 字节等价。

## 3. 事务、核验与宿主

- [x] 3.1 覆盖每项 spec 的特有拒绝条件、取消、无变化、一步历史及只读；验证预览不改正式 hash、非法最后输入不提交旧预览。— 拒绝/取消/无变化：未开放命令不可搜索且不可执行、键位冲突「覆盖/取消」、存储写入失败整体回滚并保留原设置、非法 JSON/版本失配整份拒绝、工作区空名/超长名/非法布局/超量均拒绝、IME 不触发；只读门禁只挡命令执行（偏好编辑不碰文档）。本域无预览与历史，「一步历史/预览 hash」由 `features:check` 的撤销/PNG 字节等价证明为不适用。
- [x] 3.2 逐持久字段同步内容身份、旧工程兼容、解码前累计预算、TS/原生核验及跨文档/PSD 矩阵；偏好/查看与内容分开。— 偏好按设计**不进入**工程字节、内容身份与核验器，因此无内容字段需要身份/旧工程/PSD 同步；适用部分已核对：解码前累计预算（`CUSTOMIZATION_LIMITS`，超限条目丢弃而非整份失效）与「偏好/内容分开」（`features:check` 的 8 组快照与 PNG 字节和 `bdc3c084` 等价）。
- [x] 3.3 接入匹配运行时协商、活动文档/代际/请求序号和保存/切标签/关闭/父子回写门禁；来源失效不误写目标。— 本域不产生异步来源：偏好读写是同步本机存储，无运行时协商、请求序号或父子回写；写入失败按「写后提交」处理（失败即回滚内存并报错，不伪造已保存）。命令执行仍由 `dispatch` 复校验活动文档与只读/草稿门禁，不存在跨文档误写路径。
- [x] 3.4 在独立 dev 与 Woohaa 消费同一实现，补必要公共端口与错误恢复，保持菜单/标签/面板布局及已有工具交互。— dev 与 Woohaa 共用 `@woohaa3/photocraft-editor` 的同一实现；本域补齐公共端口 `shell-adapter.ts` + 会话转发（`preferredCustomizationShortcut`/`customizationToolbarOrder`/`customizationToolOptions`/`customizationPanelLayout`）与错误恢复（存储不可用降级、导出不可下载、工作区几何非法保持现状），并已由共享外壳实际消费。`pnpm -C photocraft/integrations/woohaa test` 35 文件 280 项通过（新增宿主层 `customization-interaction.test.tsx` 5 项），既有 `photo-editor-app` 54 项回归未受影响。

## 4. 验收与交付

- [x] 4.1 运行 verification 的相关 TS/Rust/真实 WASM/核验器与宿主检查，保存实际结果；只对相关范围加有意义回归。— 实际命令与结果见 `verification.md` 表格；域内 10 文件 108 项回归，另有外壳层 `shell-consumption.test.tsx` 5 项与宿主应用层 `customization-interaction.test.tsx` 5 项。
- [x] 4.2 在探测后的真实环境执行电脑/Pad 正常窗口主线：搜索并执行已有/新增命令 → 定制键位/工具栏/菜单 → 保存工作区重载 → 冲突处理和恢复默认；不改文档内容。— 已在**真实 Chromium**（Playwright，真实 WASM + 真实 React 外壳，`dev` 独立宿主）于 1440×1000 与 1024×768 各跑两套主线、共留证 34 张截图，控制台零错误。**本轮补齐上一轮没有真跑的子能力**：搜索**执行**真的改动文档（修订 1→2）、工具栏**顺序**真的按偏好重排、工作区应用后侧栏**当场** 280→420、工具选项**重载后**仍恢复 96、菜单隐藏真的从菜单消失、共用按钮组只隐藏组内一项时**整组不消失**、解绑后按键真的不再触发、导入损坏/版本失配分别给出具体原因且不破坏原设置。逐项见 `verification.md`「真实 UI 主线执行记录」与「补充主线」。`Ctrl+Z` 改绑后失效、`Ctrl+U` 生效（rev 2→2 / 2→3）。**未采集**的只有桌面 GUI 人工观感与真实 GPU 渲染（本机无显示会话、无 `renderD*`），已单列在 4.7。
- [x] 4.3 逐 U 组/子能力记录成功、失败、取消、像素/结构、历史和工程重开证据；缺真实设备/外部应用/codec 的项目保持待人工验证，并写真实原因。— 子能力级成功/失败/取消/无变化证据已在 `verification.md` 落表；真实 UI 证据见 4.2 的两套主线共 34 张截图，逐行对应「逐子能力矩阵（U78）」。失败路径也在真实浏览器里走过：损坏 JSON 整体拒绝且存储字节不变、版本失配给出「期望 1，实际 99」、冲突「取消」保留原绑定。「像素/结构、历史、工程重开」：偏好不进入工程，由 `features:check` 的 8 组内容/状态快照与 PNG 字节等价覆盖（与 `bdc3c084` 一致），补充主线里修订号只在主动建图层时推进（1→2），偏好操作本身不改文档。
- [x] 4.4 更新能力矩阵、兼容矩阵、公共包说明和受影响模块地图；通过声明/入口/实际结果一致性核对后再开放能力，不用组数或阶段名宣称全部完成。— 已更新域 `README.md`（含已落地的外壳接入点）、`photocraft/notes/feature-boundaries.md`、`docs/code-map/photocraft.md`；`pnpm codemap:check` 通过（47 manifest / 11 篇文档 / 1358 链接）。一致性核对：`features/boundaries.test.ts` 已从「本域为空」更新为「一个 section、无新增工具」，`features:check` 证明未开放新内核能力，`shell-contract.test.ts` 锁定偏好 id 与共享菜单/工具栏 id 一致，`shell-consumption.test.tsx` 锁定外壳真的消费这些 id。
- [x] 4.5 共享外壳消费端接入：把键盘分派、菜单隐藏、工具栏隐藏/排序、工作区实时重排、工具选项恢复与「窗口」菜单入口接上本域端口。— 已实际接入 `photo-editor-app.tsx`（键盘分派 `resolveWithPreferences`、工具选项恢复/记忆、工作区几何经 `FeaturePanelContext.applyPanelLayout`）与 `photo-editor-chrome.tsx`（`filterHiddenMenuItems`、`shortcutHint`、`toolbarRenderGroups`、窗口菜单渲染 `featureMenuSections("窗口")`），`sections.tsx` 入口改挂「窗口」。回归：`shell-consumption.test.tsx` 5 项（真实菜单栏/工具栏消费偏好）+ 宿主应用层 `customization-interaction.test.tsx` 5 项（真实按键改绑/解绑、工具选项记忆、工作区当场重排）。三条都做过**反向验证**：撤掉接入改动后对应用例确实失败（旧组合仍触发、画笔仍是出厂 24、面板宽度仍是 280px），恢复后通过。用户本轮明确授权修改共享文件，因此不再留作补丁。
- [x] 4.6 共享功能入口已统一对账：18 域、32 个唯一 section；`features/boundaries.test.ts` 明确断言完整入口集合，已通过。见 [集成核验记录](../../../notes/integration-2026-10-23.md)。
- [ ] 4.7 桌面 GUI 人工观感与真实 GPU 渲染验收。— **待人工验证**：本机为无显示会话的 Linux 容器（`DISPLAY` 未设置、无 `renderD*` 渲染节点），4.2 的真浏览器自动化覆盖了功能与布局可达性，但字体/对比/动画/真实鼠标拖拽手感与硬件渲染帧率未采集。需在有显示会话与真实 GPU 的机器上人工走查。

## 5. 并行集成

- [x] 5.1 逐项确认仅修改本域归属；共享接口需求由唯一集成负责人顺序提交并同步，不本地复制替代实现。— 代码改动在本域目录、`features/boundaries.test.ts`（声明同步）与用户本轮明确授权的共享外壳接入点（`photo-editor-app.tsx`、`photo-editor-chrome.tsx`、`features/panel-context.ts`）。接入方式是把偏好交给外壳**既有**的菜单渲染、工具轨与 `applyShortcut`，没有复制第二套渲染或分派实现。另在共享 `photo-editor.css` 追加的定制面板规则逐条限定在 `[data-advanced-section="customization"]` 下，已用浏览器核对其他 9 个功能的高级面板外观未变（`padding: 0`、`border-width: 0`）。
- [x] 5.2 满足 parallel-work 列出的真实同级完成依赖后执行跨域 UI/像素/身份/保存/核验回归；未接真实提供方的用例不得勾选。— 同级完成前置为「无」；跨域回归已执行：`pnpm -C photocraft run check`（protocol 70 / editor 49 文件 377 项 / verifier 40 全通过）、`rust:test` 280 项、真实 WASM 与 verifier 构建、`features:check` 字节等价、Woohaa 适配包 35 文件 280 项、`frontend`/`photocraft-woohaa` typecheck、`boundary:check`、`codemap:check`。未接真实设备的部分（桌面 GUI 观感与真实 GPU 渲染）已单列在 4.7。
