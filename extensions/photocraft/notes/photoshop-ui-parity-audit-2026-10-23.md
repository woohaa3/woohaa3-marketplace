# PhotoCraft Web 与 Photoshop 的交互对齐走查

> **历史快照。** 走查对象是旧独立子项目的 React 编辑器，代码已在 client `64765113` 删除；
> 下文源码路径同样失效，当前实现见 [`../web`](../web/README.md)。

日期：2026-10-23。基线：`photocraft` 分支 `b0cd6cbc` 加当前未提交的 18 域集成代码。
范围：Web 编辑器工具列、上下文参数栏、菜单、属性与面板的装配和手势入口；下文保留走查时的缺陷与原始证据，文末记录后续修复与验证。

## 方法与边界

- 阅读当前 Web 源码及固定上游快照中的菜单目录、工具快捷键实现。Photoshop 对照采用常用默认工作区与默认按键；不同版本、自定义工作区可能有差异，未运行 Photoshop 做逐像素比较。
- 使用真实 React 组件在 jsdom 中捕获菜单定义、运行实际快捷键解析与绘画参数编译，并改变绘画面板输入复核设置传递。没有启动 WASM 或执行图像渲染。
- 本轮无可用的浏览器自动化工具，未提供应用截图；尺寸、遮挡、Pad 点按、GPU 画面与性能不在本轮验证结论内。
- 组件探针 1/1 通过，表示下述观察被复现，**不表示这些错误行为通过了验收**。临时探针已从产品源码目录移除。
- 本轮原始记录：`/data/tmp/photocraft-photoshop-audit-20261023/` 下的 `component-evidence.json`、`probe.test.tsx`、`probe.log`。

## 已确认问题

P1 为优先修复的行为问题或核心交互缺口，P2 为操作效率与信息组织差距。各条的证据层级单独说明，源码确认不等于浏览器交互验收。

| ID | 优先级 / 性质 | 当前行为与影响 | Photoshop 对齐方向 | 本轮证据 |
| --- | --- | --- | --- | --- |
| F01 | P1 / 功能缺陷 | 绘画面板与画布各持有独立工具参数。面板铅笔尺寸改成 **42** 后，实际编译的画布命令仍是 **4**；其他绘画参数也缺少同源传递。 | 工具列、顶部选项与画布执行消费同一份当前工具设置。 | 组件输入与命令实测；[panels.tsx](../packages/editor/src/features/painting/panels.tsx:157)、[gesture-settings.ts](../packages/editor/src/features/painting/gesture-settings.ts:69)、[app](../packages/editor/src/photo-editor-app.tsx:224) |
| F02 | P1 / 装配缺陷 | 内核提供 `filter.lastFilter` 且注入功能面板入口时，同一栏渲染两个“滤镜”，两边还重复追加功能入口。 | 单一“滤镜”菜单，重复滤镜与分类入口统一编排。 | React 菜单捕获实测；[chrome](../packages/editor/src/photo-editor-chrome.tsx:117)、[重复渲染](../packages/editor/src/photo-editor-chrome.tsx:206) |
| F03 | P1 / 空状态缺陷 | `readonly` 包含“无文档”，直接用于禁用“打开文件”。无文档且非真正只读时，打开仍不可用。 | 空工作区能新建、打开文件。 | React 菜单捕获实测；[chrome](../packages/editor/src/photo-editor-chrome.tsx:143)，既有 chrome-menu 测试还明确保留了此行为。 |
| F04 | P2 / 提示缺陷 | 解绑画笔快捷键后解析器正确不再响应 B，但工具栏通过 `?? TOOL_KEYS` 又回填 B，提示与实际操作矛盾。 | 显式解绑后提示不再显示旧组合。 | 偏好解析实测：有效提示 `null`、动作 `null`、工具栏回填 `B`；[chrome](../packages/editor/src/photo-editor-chrome.tsx:247) |
| F05 | P2 / 分组遗漏 | 31 个工具目前折成 20 个主按钮；画笔/铅笔/颜色替换、三种橡皮、渐变/油漆桶仍平铺，普通钢笔未加入自由/曲率钢笔组。 | 同族工具共享按钮，当前子工具作为代表，可展开选择。 | 工具清单与分组函数实测；[TOOLBAR_GROUPS](../packages/editor/src/features/customization/shell-adapter.ts:254) |
| F06 | P2 / 快捷键对齐缺口 | 铅笔默认 N；G、A 没有工具动作。Shift+B/E/P/U 返回空，组内循环仍只接魔棒/快速选择与修复/修饰。 | 按默认习惯用 B/E/G/P/U/A 选择同族工具，并统一 Shift 循环；自定义绑定另行尊重。 | 实际解析器检查；[TOOL_KEYS](../packages/editor/src/photo-editor-shortcuts.ts:7)、[组循环](../packages/editor/src/photo-editor-app.tsx:926) |
| F07 | P2 / 参数栏接入缺口 | 顶部通用绘画参数仅对画笔、橡皮显示。选铅笔、颜色替换、背景橡皮、渐变、桶、吸管，缺少其专用参数栏；需要另找高级面板里的第二个工具下拉。 | 切换当前工具即显示该工具的尺寸、容差、渐变、取样等选项。 | 源码装配确认；[ToolOptionsPanel](../packages/editor/src/photo-editor-tool-options.tsx:92)、[上下文栏](../packages/editor/src/photo-editor-app.tsx:1493) |
| F08 | P2 / 操作一致性缺口 | `[` / `]`、数字不透明度与 Shift+数字流量只处理画笔/橡皮，仿制、修复、铅笔等未接对应的适用项。 | 按各工具实际支持的参数复用笔头大小、不透明度等快捷操作。 | 源码分派确认；[app](../packages/editor/src/photo-editor-app.tsx:932) |
| F09 | P2 / 菜单归属错误 | 绘画工具与颜色、修饰工具挂在“滤镜”；文件信息、新建/最近放在“图像”；通道、直方图挂在“图像”，路径和图层复合也未作为窗口面板入口组织。 | 绘画/修饰从工具列与选项栏进入；文件信息/最近归文件；通道、路径、直方图、图层复合等提供窗口面板入口。 | 32 个 section 清单检查；[painting](../../client/photocraft/packages/editor/src/features/painting/sections.tsx)、[files](../../client/photocraft/packages/editor/src/features/files/sections.tsx)、[channels](../../client/photocraft/packages/editor/src/features/channels/sections.tsx)、上游 `menu_catalog.rs` |
| F10 | P2 / 菜单层级缺口 | 文件菜单把导出 PSD、PNG、导出为、Save for Web 直接平铺。 | 依据输出语义组织保存/另存与导出子菜单，保留所需快捷入口。 | 源码装配确认；[文件菜单](../packages/editor/src/photo-editor-menu.ts:74) |
| F11 | P2 / 高级区过载 | 点击“高级…”清空 section 限定，把所有 advanced section 同时挂载；整个功能表有 32 个 section，业务面板持续堆进属性区。 | 功能按工具选项、属性、独立面板或专用对话框归位；保留搜索入口。 | 源码渲染分支与 section 清单确认；[app](../packages/editor/src/photo-editor-app.tsx:1567)、[高级区](../packages/editor/src/photo-editor-app.tsx:1580) |
| F12 | P2 / 面板模型不足 | 侧栏只有属性、图层、历史三种独立面板。打开通道/路径/直方图等 feature 强制激活属性，替换当前页；无法将这些功能像图层面板一样独立组合、浮动。 | 通道/路径等有自己的面板身份和开关，可与图层共同组织。 | 源码结构确认；[PanelId](../packages/editor/src/editor-sidebar.tsx:6)、[revealProperties](../packages/editor/src/photo-editor-app.tsx:957)、[功能入口](../packages/editor/src/photo-editor-app.tsx:1479) |
| F13 | P2 / 命令发现路径偏差 | “图像→调整…”和“滤镜库…”先打开一个总面板再选命令，缺少常用调整命令与滤镜类别的直接菜单路径。图像大小/画布大小也合在“画布构图…”内。 | 常用调整、图像/画布尺寸提供直接命令入口；滤镜按类别展开，参数编辑在选定命令后进行。 | 源码菜单与面板确认；[adjustments](../../client/photocraft/packages/editor/src/features/adjustments/sections.tsx)、[filters](../../client/photocraft/packages/editor/src/features/filters/sections.tsx)、[composition](../../client/photocraft/packages/editor/src/features/composition/sections.tsx) |
| F14 | P1 / 交互未完成 | 多边形/磁性套索在高级面板里以“每行 x,y”文本输入锚点，再点预览/确认；工具列没有对应子工具，Web 画布无对应锚点输入接线。 | 套索工具组内选择，在主画布点击/沿边取点，支持回退和闭合；数值输入只能作为辅助。 | 源码入口与画布分派确认；[MagneticLassoPanel](../packages/editor/src/features/selections/workflow-panels.tsx:316)、[坐标框](../packages/editor/src/features/selections/workflow-panels.tsx:466)、工具贡献与 `canvasTool` 白名单 |
| F15 | P2 / 基础工具入口缺口 | 工具列无裁剪、抓手、缩放工具，C/H/Z 无工具动作。已有构图面板、空格平移、视图菜单不构成这些工具的完整交互。 | 裁剪有专用工具与确认/取消；抓手与缩放有显式工具入口及其默认按键。 | 工具列表与实际快捷键解析确认；[composition tools](../../client/photocraft/packages/editor/src/features/composition/index.ts)、[shortcuts](../packages/editor/src/photo-editor-shortcuts.ts:7) |

## 复核数据

组件捕获的顶层菜单（探针只注入一个内核命令，未注入的编辑菜单因此被过滤）：

```text
文件、图像、图层、选择、滤镜、滤镜、文字、视图、窗口
```

F01 的观测：

```json
{
  "panelSize": "42",
  "gestureSettings": { "autoErase": false, "size": 4, "color": "#000000" },
  "compiled": { "id": "paint.pencil", "params": { "size": 4 } }
}
```

F06 的观测：B→画笔、N→铅笔、E→橡皮、P→钢笔、U→矩形；G/A/H/Z→空；Shift+B/E/P/U→空。

## 建议处理顺序

1. 先修 F01/F02/F03/F04：参数确实生效、菜单不重复、空工作区可打开文件、提示与绑定一致。
2. 将工具分组、快捷键循环、专用参数栏、笔头快捷操作作为一组处理（F05–F08），共用工具元数据，避免再维护几张互不一致的表。
3. 重整菜单和面板装配（F09–F13），保留各域已经实现的控制器与命令，逐项接回合理的入口。
4. 补齐主画布交互（F14–F15），并在真实 GPU 的桌面与 Pad 环境验证。渲染、手感、遮挡和布局结论均仍待此轮验收。

本轮没有覆盖所有 Photoshop 能力，也没有将上次集成记录中的未完成视图旋转、PSD 往返矩阵和真机验收重新计作新发现。


## 修复复核（2026-10-23）

F01–F15 的实现已接入当前分支，以下是修复后的行为。原始问题表与探针数据保留为修复前证据。

| 问题 | 已落地行为 | 自动化覆盖 |
| --- | --- | --- |
| F01 | 绘画面板、顶部参数与画布编译器共享逐工具设置 | 面板尺寸改为 42 后编译参数与顶部输入均为 42；切工具保留各自设置 |
| F02–F04 | 单一滤镜菜单；空工作区可以打开；解绑工具不再回退显示默认键 | 菜单渲染/可用状态回归；快捷键偏好解析 |
| F05–F06 | 套索、画笔、橡皮、渐变/桶、钢笔、形状、路径选择等按工具族折叠；Shift 循环消费同一分组 | 工具贡献、分组、偏好冲突豁免与快捷键测试；H/C/Z 宿主分派 |
| F07–F08 | 专用绘画工具顶部参数生效；笔头操作扩展到铅笔、颜色替换、背景橡皮、修饰和快速选择；数字不透明度支持适用工具 | 共享设置、编译器、笔头状态与键位回归 |
| F09–F10 | 通道、直方图、路径、图层复合等面板归窗口；文件工作流归文件；导出收入子菜单 | 域菜单归属、真实 Radix 导出子菜单与回调测试 |
| F11–F12 | 功能面板按需打开独立页签，可独立浮动/停靠；切换页签保留已挂载控件 | 通道/路径独立浮动与停靠、控件状态、工作区恢复测试 |
| F13 | 运行时清单派生图像调整、滤镜分类、图像/画布大小等直接入口，选择后定位对应参数 | 分类菜单分派与域面板测试；活动草稿时禁止重新定位 |
| F14 | 多边形/磁性套索从主画布取点、预览、回退、闭合、取消；磁性追边交给内核 | 两类套索生命周期；双击闭合不重新起笔；不足三个点也阻止保存和其它写入 |
| F15 | C/H/Z 的裁剪、抓手、缩放；裁剪拖框/手柄与确认取消；缩放以点击点为锚、Alt 缩小 | 画布指针回归、裁剪候选生命周期及宿主工具分派 |

验证结果：

- 编辑器：170 个测试文件，1712 项通过、1 项跳过（`pnpm -C photocraft/packages/editor test`）。
- Woohaa 适配：40 个测试文件，350 项通过（`pnpm -C web --filter @woohaa3/photocraft-woohaa run test`）。
- 子项目 build/typecheck、宿主 frontend typecheck、Woohaa 适配 typecheck 均通过。
- `pnpm codemap:check`、`pnpm boundary:check`（6 项）、`pnpm -C photocraft features:check`、`git diff --check` 通过。
- 现有 dev 服务继续运行；页面与编辑器源模块 HTTP 200，Vite 已提供修复后的代码。
- 测试输出仍有既有 React `act(...)` 警告，不影响上述测试结果。日志存于 `/data/tmp/photocraft-photoshop-*.log`。


待人工验证：桌面与 Pad 的实际布局、工具组选取手感、磁性套索追边画面与裁剪结果。当前环境已探测为 Linux 容器，未发现 GPU render 节点；未采集渲染截图、真实设备性能或 Photoshop 逐像素对照。组件/协议测试通过不代表这些项目已验收。原集成记录中视图旋转、PSD 往返矩阵等未完成项仍保持原状态。
