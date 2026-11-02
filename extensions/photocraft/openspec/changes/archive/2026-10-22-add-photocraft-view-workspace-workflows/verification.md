# 验收计划与记录

## 本次实施状态

本次在本 worktree 实施本 change：Rust 内核命令/白名单/WASM 导出、协议有界契约、TS 适配/面板/
坐标变换/画布手势/落点请求、原生核验调用点、能力发布、PSD 视图损失报告、两侧回归与受影响模块地图。
没有提交 Git，没有修改 vendor。

按用户「完成这个 change」的指示，本轮把此前记为「集成阻塞」的共享调用点全部接通（清单与理由见
[tasks.md](tasks.md) 5.1）：画布参考线手势、原生核验调用、能力/命令发布、PSD 损失报告、
Hand/Zoom 取景读数、计数/注释落点。会话恢复后，本轮又补上了**同文档并排双视图**与
**Info 光标跟随读数 + 持久颜色采样点**。**现在只剩 2 项未完成**，都不是本域能独立解决的：

| 未完成项 | 类别 | 真实原因 |
| --- | --- | --- |
| 2.3 **旋转后的像素呈现 / 落笔** | 宿主渲染端口 | `renderCanvasBackground(origin, zoom)` 没有旋转参数，Woohaa 节点模式的 Bevy 节点同理；旋转只能作用于叠加层与几何反算 |
| 4.2 真实设备主线走查 | 硬件 | 容器无 `renderD*`、无 `DISPLAY`/`WAYLAND_DISPLAY` |

本轮（会话恢复后）已解除两项：
- **2.4 持久颜色采样点**：不改 vendor，把会话点投影进文档元数据命名空间键
  `photocraft.views.colorSamplers`（保存副本写入、打开灌回），内容指纹与历史不受影响；
  核验器有界检查，PSD 导出产出 `view.color-samplers` 损失行。
- **2.3 同文档并排双视图**：两块真实 `PhotoCanvas` 用同一段渲染代码，共享内容与撤销历史、
  视口与输入归属独立；不需要新的宿主端口。

其余横切要求都已补成真实现并有回归：**来源失效不误写目标**（`viewSnapshot.document.id` +
`targetDocument`）、**解码前累计预算**、**仅活动视图接收输入**、
**声明=入口=实际放行**（能力协商）、**PSD 逐项损失（含文档级视图数据）**。

规划校验：`npx --no-install openspec validate 2026-10-22-add-photocraft-view-workspace-workflows --strict --no-interactive` → `Change '…' is valid`。

## 环境探测（按 AGENTS.md 规则，先探测后判断）

```sh
ls /dev/dri 2>/dev/null | grep '^renderD'          # 无输出 → 无 renderD*
echo "DISPLAY=${DISPLAY:-<unset>} WAYLAND_DISPLAY=${WAYLAND_DISPLAY:-<unset>}"
# DISPLAY=<unset> WAYLAND_DISPLAY=<unset>
```

结论：**Linux 容器，无 `renderD*` 设备，也没有任何显示会话**。因此本次不采集渲染/帧率/GPU 计时/
视觉截图，也不声称完成真实 UI 验收。这里的真实原因是「容器无 GPU 且无显示会话」，不是「依赖没装」
或「工具缺失」。软件渲染不用于替代硬件结论。

## 逐项矩阵（命令 → 包装 → WASM → UI → 内容/核验 → 验收）

| U | 子能力 | 生产命令 / 参数 | 包装 | WASM | UI 入口 | 内容 / 核验 | 状态 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| U70 | 数值加线 | `view.newGuide {orientation,position}` | `guideCommand` | `guideCommand` | 参考线页「添加参考线」（支持 `%`） | 文档字段，有历史，不改 hash | ✅ 内核+UI 表单 |
| U70 | 逐条移动 / 编辑 | `view.moveGuide` / `view.editGuide {orientation,index,position,newOrientation,color}` | `guideCommand` | `guideCommand` | 参考线页逐行数值框、「改水平/改垂直」、「颜色」取色器 | 同上 | ✅ 内核+UI 表单（含单条换向与改色） |
| U70 | 单条删除 / 全清 | `view.deleteGuide {index}` / `view.clearGuides` | `guideCommand` | `guideCommand` | 每行「删除」/「清除参考线」 | 同上 | ✅ 内核+UI 表单 |
| U70 | 参考线命中 / 拖动 | `viewPointer("hit-guide"/"drag-guide")`（只读）+ `view.moveGuide` 提交 | `viewPointer` | `viewPointerJson` | 画布 `onGuideDown/Move/Up` → `ViewGestureSession` | 拖动只画预览线，松手才提交；值未变不提交 | ✅ 已接通（13+4 条回归） |
| U70 | 标尺拖出参考线 | `viewPointer("drag-guide")` 反算 + `view.newGuide` | `viewPointer` | `viewPointerJson` | 叠加层标尺条 `onRulerDown`（上边出竖线、左边出横线；角落留给原点） | 未移动就松手不建线；锁定不建 | ✅ 已接通（5+3 条回归） |
| U70 | 原点设置 / 复位 | `view.setRulerOrigin {x,y}` / `view.resetRulerOrigin` | `guideCommand` | `guideCommand` | 参考线页 X/Y + 「原点归零」 | 文档字段，有历史 | ✅ 内核+UI 表单 |
| U70 | 原点拖动 | `viewPointer("drag-origin")` + `view.setRulerOrigin` | `viewPointer` | `viewPointerJson` | 画布 `onGuideDown` 命中标尺角落时优先取原点 | 只读反算；提交走文档字段 | ✅ 已接通 |
| U70 | 锁定参考线拒绝 | 同上（`lockGuides=true`） | `guideCommand` | 同上 | 辅助页锁定开关 | 拒绝并保留旧线 | ✅ 回归 |
| U71 | New Guide Layout | `view.newGuideLayout {columns,rows,width,height,gutter,rowGutter,margin[4],clearExisting,centerColumns}` | `guideLayoutCommand` | `guideLayoutCommand` | 布局页 | 改 `guides`，不改 hash | ✅ |
| U71 | 从形状建线 | `view.newGuidesFromShape {layer?}` | `guideLayoutCommand` | 同上 | 布局页「从形状建线」 | 需真实形状层，否则拒绝 | ✅ |
| U71 | 清空画布参考线 | `view.clearCanvasGuides` | `guideLayoutCommand` | 同上 | 布局页 | 同上 | ✅ |
| U71 | 单位 / 网格间距 / 细分 | `setViewAids {units,gridStep,gridSubdivisions}` | `setViewAids` | `setViewAids` | 辅助页 | 会话偏好，无历史 | ✅ |
| U71 | 五种吸附目标 | `setViewAids {snap:{document,guides,grid,layers,selection}}` + `snapPoint` | `setViewAids`/`snapPoint` | 同名 | 辅助页逐目标复选框 | 会话；阈值 `tolerance/zoom` 稳定 | ✅ |
| U71 | 智能参考线 / 临时关闭 | `setViewAids {smartGuides,suspend}` + `snapPoint.lines[].smart` | 同上 | 同上 | 辅助页 | 会话 | ✅ |
| U72 | Rotate View / 复位 | `setViewAids {rotation}`（`"reset"`） | `setViewAids` | `setViewAids` | 导航页角度 + 「复位视图」 | 会话，不改像素/历史 | ✅ |
| U72 | 旋转变换数学 | — | `DocumentToView`/`ViewToDocument` + `viewPointer` | `viewPointerJson` | 叠加层/面板共用 | 两侧同公式，5+11+2 条回归 | ✅ |
| U72 | Navigator | `setViewAids {navigator}` + `viewSnapshot` | `setViewAids`/`viewSnapshot` | 同名 | 导航页开关 + 取景框 | 会话 | ✅ |
| U72 | 多视图 / 切换 | `setViewAids {viewAction:"new"|"close"|"activate",viewId?}` | `setViewAids` | `setViewAids` | 导航页视图列表 | 共享内容/历史，取景独立 | ✅ 内核+面板 |
| U72 | 仅活动视图接收输入 | `viewPointer(action,{viewId})` | `viewPointer` | `viewPointerJson` | 手势会话透传 `viewId` | 非活动视图指针被拒 | ✅ 内核+真实 WASM+调用点 |
| U72 | 独立 Hand/Zoom | 状态栏缩放 / 快捷键 / 空格拖拽（改宿主视口） | — | — | 状态栏、键盘、画布手势 | 不进历史，不改像素 | ✅ 真实入口（面板只读读数） |
| U72 | 同文档并排渲染 | `setViewAids {sideBySide}` + `setViewAids {viewId,zoom,offset}` | `setViewAids` | `setViewAids` | 导航页「并排」开关 → `panes-view.tsx` 渲染两块真实画布 | 同一控制器：内容/历史共享，取景与输入归属独立 | ✅ 内核+UI（2 条内核 + 6+4 条 TS + 2 条面板 + 1 条真实 WASM） |
| U72 | 画布取景回写内核 | —（`onFrame` 端口） | `setViewAids {viewId,zoom,offset}` | `setViewAids` | `photo-editor-canvas.tsx` → `photo-editor-app.tsx` | 只写会话取景，不写文档 | ✅ 画布 1 条回归；修正缩放/平移后命中与读数偏移 |
| U72 | 旋转后命中 / 叠加层 | `viewPointer` 反算 + `aids.rotation` 投影 | `viewPointer` | `viewPointerJson` | 手势按同一公式反算；叠加层按 `aids.rotation`/`rulerOrigin` 回退取值 | 旋转下同一客户点落到不同源坐标（几何）；Info 读数按像素平面，不随旋转 | ✅ 命中/参考线/网格已接通；**落笔像素与 Info 读数**仍走无旋转的像素平面（共享 `coordinates.ts` + probe 去旋转） |
| U73 | Info 读数 | `image.analysis.info` | `viewCommand` | `viewCommand` | Info 页只读读板 | 只读，无历史 | ✅ 面板读板 |
| U73 | Info 跟随光标读数 | `viewPointer("probe")`（只读） | `viewPointer` | `viewPointerJson` | 画布 `onProbe` → 40ms 节流 → `hover.ts` → Info 页「光标读数」 | 只读；画布外 `reading:null`；**按像素平面取，不算旋转**（像素不随视图旋转） | ✅ 内核 3 条 + 解码 1 条 + `hover` 5 条 + 画布 1 条 + 真实 WASM 1 条 |
| U73 | 取样点增删/移动/列表/读数 | `view.colorSamplers.add|move|delete|clear|list` + `samplerReadout` | `viewCommand`/`samplerReadout` | 同名 | Info 页（含改写位置） | 会话状态 + **保存投影**（元数据键 `photocraft.views.colorSamplers`），`MAX_SAMPLERS=10`，重开恢复 | ✅ 实测（保存重开恢复，指纹不变，见下） |
| U73 | 测量比例 | `image.analysis.setMeasurementScale {preset,pixelLength,logicalLength,units}` | `viewCommand` | `viewCommand` | Info 页 | 文档字段，有历史 | ✅ |
| U73 | 标尺 / 拉直 | `image.analysis.rulerTool {start,end}` / `straightenLayer` | `viewCommand` | `viewCommand` | Info 页码值输入 | 文档；角度/长度按源单位 | ✅ 表单（画布拖动未接入，见 tasks 2.4） |
| U73 | 测量日志 | `recordMeasurements` / `measurementLog.list|delete|export` | `viewCommand`/`measurementLog` | 同名 | Info 页列表、逐条删除、全清、导出 CSV 文本 | 会话日志，不进 hash；写文件属宿主 io 端口 | ✅ |
| U73 | Count 分组 / 标记 | `count.newGroup|add|remove|move|clear|setGroup|deleteGroup` | `viewCommand` | `viewCommand` | 计数页（分组开关/尺寸/切换/删组 + 逐条标记移动与删除） | 文档字段，有历史，可撤销 | ✅ |
| U73 | Note 注释 | `notes.add|set|delete|list` | `viewCommand` | `viewCommand` | 注释页（作者/文本/位置/展开/删除） | 文档字段（随 .pcraft/PSD） | ✅ |
| U73 | 画布计数/注释落点 | `viewCommand("count.add"/"notes.add")` | `viewCommand` | `viewCommand` | 面板「在画布上放置」→ `placement.ts` 一次性请求 → 画布 `onViewPoint` | 消费即清，写入一条历史 | ✅ 已接通（6+3+2 条回归） |
| U73 | 画布取样/标尺落点 | `onViewPoint` + `view.colorSamplers.add` / `image.analysis.rulerTool` | `viewCommand` | `viewCommand` | Info 页「在画布上放置取样点」/「在画布上取标尺起点→终点」 | 一次性请求，标尺第二步才提交一次测量 | ✅ 已接通（标尺两步 1 条 + 取样点落点 1 条 + 一次性/取消 3 条） |
| U73 | 跨格式：PSD | `export_psd`/`import_psd_project` | — | — | 文件菜单（io 域） | 实测：参考线/注释/测量比例往返；参考线颜色/标尺原点/计数分组丢失；**有采样点时**另有 `view.color-samplers` 损失行 | ✅ 报告已接通：`viewLosses` 逐项列出（5 条实测回归） |
| U73 | 跨文档：切工程 | `open_project` | — | — | 文档标签 | 实测：各文档视图数据互不泄漏，工作区旋转/单位保持 | ✅ 域内回归实测 |
| 3.3 | 来源失效不误写目标 | `viewSnapshot.document.id` + 写入 `targetDocument` | 三个写入口 | 同名 | 面板自动回传（仅在快照带回身份时） | 目标不符返回 `view.stale` 且写入前拒绝 | ✅ 内核+面板+真实 WASM |

「🟡」= 端口已接通且可选，但界面还没有对应工具入口；未传端口时行为与之前完全一致。
「✅ 已接通」= 真实调用点已在 `photo-editor-canvas.tsx` / `photo-editor-app.tsx` 里，并有回归锁住
「不传端口时行为不变」。

## 非渲染检查（实际命令与实际结果）

| 命令 | 结果 |
| --- | --- |
| `pnpm -C photocraft run check`（build + typecheck + test） | 通过：protocol **79**、editor **413**（+1 条件跳过）、project-verifier **40**；build/typecheck 全绿 |
| `cargo test --offline -p photocraft-embed-editor --lib features::views` | 通过：本域 **66** 条（61 tests_views + 5 view_geometry） |
| `cargo test --manifest-path rust/Cargo.toml --offline --workspace` | 通过：全部 crate 全绿（**359** 条通过 / 0 failed）；`photocraft-project-verify` 含集成测试（新增 1 条视图数据端到端拒绝） |
| `cargo test --offline -p photocraft-embed-editor --lib view_loss_tests` | 通过：**4** 条（PSD 视图损失预检/导出报告/纯文档不报/实测往返） |
| `cargo test --offline -p photocraft-project-verify features::views` | 通过：**8** 条（含新增持久采样点有界核验） |
| `pnpm -C photocraft run wasm` | 通过：release + wasm-bindgen + wasm-opt，产物 17.40 MiB / glue 96.1 KiB |
| `pnpm -C photocraft run verifier` | 通过：原生 release 3.83 MiB |
| `pnpm -C photocraft run features:check` | 通过：在**增量基线**（新增 27 命令 + 2 能力，记在 `publication`）之后，`steps`/`errors`/`output` 8 组快照、撤销重做与 PNG 字节仍与 `bdc3c084` 逐字节一致——发布没有顺带掩盖别的行为漂移 |
| `npx vitest run src/features/views/wasm-real.test.ts`（editor 包，加载真实 `dist/wasm`） | 通过：**14 通过 / 1 跳过**（跳过项是「未构建 WASM」的哨兵用例）。断言布局生成 `[0,60,120]`、命中 `distance=4`、拖动钳到画布内、锁定后 `guideCommand` 抛错、旋转 90° 后客户 (30,40)→源 (55,75)、`formatLength(72,"mm")` == `"25.4 mm"`、`.pcraft` 重开后计数/注释仍在且取样点清空、内容指纹一致、参考线换向/取样点移动/注释位置与展开/日志 CSV 五条逐条命令可达、切到另一份文档后旧 `targetDocument` 被拒且新文档保持干净、多视图下非活动视图指针被拒、**发布后的能力可用且未登记命令被拒**、**标尺新建参考线一步成线**、**Hand/Zoom 只改活动视图取景**、**PSD 报告逐项列出视图损失**、**并排按 `viewId` 定向写取景且单视图开并排被拒**、**`probe` 读数与取样点逐值一致且不改内容指纹**、**采样点保存重开后恢复（无点工程字节更短）** |
| `pnpm -C web --filter @woohaa3/photocraft-woohaa run typecheck` | 通过 |
| Woohaa 适配 `npx vitest run`（用仓库外临时配置，见下方说明） | 通过：**35 文件 / 279 测试**（含 `tests/view-domain-integration.test.ts` 4 条跨域接线回归，其中 2 条为并排真实渲染） |
| Woohaa 适配 `npx tsc --noEmit` | 通过 |
| 根目录 `pnpm boundary:check` | 通过：**6 tests**。首次失败是 `artifacts`/`logs` 两个 `.gitignore` 里的运行期目录在本 worktree 中不存在（清单要求目录存在）；`mkdir artifacts logs` 后通过，未改代码 |
| 根目录 `pnpm codemap:check` | 通过：47 个 manifest、11 篇文档、**1368** 个本地链接、8 个模块入口清单 |
| `npx openspec validate <change> --strict` | 通过：`Change '…' is valid` |
| 根目录 `pnpm extensions:check` | **环境未就绪，未通过**：`EXTENSION_MODULE_MISSING：扩展 ark-provider 的模块不存在（./shared → 试过 ./dist/shared.js）；先构建该扩展`。该检查要求先 `pnpm build`（`assemble:extensions` 又要求 `web/frontend/dist`），属仓库既有构建前置，与本 change 无关（`web/extensions/` 未改动，`git status` 为空） |
| `pnpm -C web --filter @woohaa3/frontend run typecheck` | 通过 |
| `npx --no-install openspec validate … --strict --no-interactive` | 通过 |
| `pnpm boundary:check` | **失败**：`artifacts`、`logs` 两个目录不存在（`web/tooling/open-closed-boundary.test.ts` 的清单要求它们存在，`PLANNED_DIRS` 为空）。与本 change 无关：两者都未被本 change 触碰，也未被 Git 跟踪；属仓库根目录缺失的既有问题。 |
| `pnpm -C photocraft run features:check` 之前跑过一次 | 曾因 `packages/editor/dist/wasm` 未构建而 `ERR_MODULE_NOT_FOUND`；先跑 `wasm` 后通过（非代码缺陷） |
| `cargo fmt --all -- --check` | **未作为判据**：整仓库约 130 个文件（含本 change 未触碰的 `capability.rs`、`features/mod.rs` 等）都有 import 排序/行宽差异，仓库当前不是 rustfmt-clean 状态。本域文件属于同一类差异，没有引入新风格。 |

`wasm-real.test.ts` 依赖 `packages/editor/dist/wasm`（生成物，`.gitignore` 忽略）：未构建时用
`describe.skipIf` 跳过并保留一条哨兵用例，不会把「没构建」伪装成通过。它只跑内核（CPU）逻辑，
不涉及渲染，因此不需要 GPU 或显示会话。

### Woohaa 用例的本地 React 解析

仓库的 `photocraft/integrations/woohaa/vitest.config.ts` 把 React 别名硬编码为
`photocraft/node_modules/.pnpm/react@18.3.1/...`，而本容器的 pnpm 虚拟 store 外置到
`/root/.local/share/pnpm/store/v11/links`，该路径不存在，直接运行会得到 28 个
`Failed to resolve import "react/jsx-dev-runtime"` 的**环境性**失败。为取得真实验收结果，本次用
`/data/tmp/opencode/vitest.woohaa.local.config.ts`（仓库外临时文件，未入库）把同一组别名指到
`photocraft/integrations/woohaa/node_modules/react`，其余 include/setup/inline 与原配置一致，
得到 275/275 通过。仓库配置本身未修改；`typecheck` 不需要它，直接通过。

## 新增回归

| 位置 | 数量 | 覆盖 |
| --- | --- | --- |
| `rust/crates/editor-core/src/features/views/tests_views.rs` | 66 | U70–U73 命令语义、白名单、草稿门禁（只读命令不受挡）、两个写入口与布局入口的锁定一致、拒错保留现场、hash 不变、工程往返、跨文档隔离、PSD 实际往返能力、参考线换向只加一步历史、取样点移动、注释位置/展开状态与非法坐标不落盘；**5 条能力协商/声明一致性**（白名单命令都映射到已开放能力且不落在保持关闭的能力上、发布清单与实际一致、别的域命令不混入、未登记命令按能力关闭拒绝且不留写入、声明的能力都有真实命令）；**本轮新增 9 条**：`probe` 三条（源像素读数、画布外 `null`、未知视图/坏通道拒绝）、并排两条（≥2 视图才能开、按 `viewId` 定向写取景不抢活动）、采样点持久化四条（保存写入/重开灌回/无点不写键/PSD 损失行） |
| `rust/crates/editor-core/src/features/views/view_geometry.rs` | 5 | 旋转可逆、四分之一转轴映射、非法变换、阈值随缩放/旋转 |
| `rust/crates/project-verify/src/features/views/mod.rs` | 8 | 文档级有界核验（参考线/原点/比例/标尺/计数/注释/图层级不插手）+ **持久采样点元数据**（条数、字节数、坐标范围；坏键静默忽略、越界拒绝整份工程） |
| `packages/protocol/src/features/views/content.test.ts` | 9 | 同一组上限的 TS 侧契约、旧工程兼容、非空判定、标记预算先于逐点校验、上限常量锁值 |
| `packages/editor/src/features/views/views.test.ts` | 23 | 快照/读数有界解码、草稿门禁、数据归属、缺端口 `capability-disabled`、指针几何三动作解码与非法响应、文档身份可选但坏值拒绝、跨组合计标记预算、`viewId` 原样透传；**新增 `probe` 解码**（源坐标/RGB/CMYK 逐值校验，画布外 `null`，5 组坏数据拒绝） |
| `packages/editor/src/features/views/view-transform.test.ts` | 11 | 与 Rust 同公式的双向变换、阈值、四角、参考线段、命中/拖动/原点反算与旋转 |
| `packages/editor/src/features/views/panels.test.tsx` | 36 | 面板页签、只读禁用、缺端口不渲染、布局参数形状、读取真实快照、逐项会话偏好写回、取样/标尺/计数/注释写入参数、失焦提交 + `coalesce` 合并历史、Navigator 不画假取景框、参考线换向与改色、标记逐条移动/删除、取样点移动、注释位置与展开、测量 CSV 导出、CMYK 与单位换算来自内核端口；**新增**多视图取景读数来自内核、取景区没有「点了不动」的按钮、计数/注释落点发起与取消；**新增**并排开关（单视图禁用并说明、两视图可开且写回 `{sideBySide:true}`）、Info 光标读数 2 条（无读数时「—」、发布读数逐值显示且画布外清空）、**取样点/标尺画布落点 2 条**（取样点按源坐标添加并同步数值框；标尺第一次只记起点、第二次才提交一次测量） |
| `packages/editor/src/features/views/guide-gesture.ts` → `.test.ts` | 18 | 画布参考线/原点拖动会话：命中只读、松手一条历史、无命中不接管、锁定不进入拖动、值未变不提交、取消不写、非法位置保持上一草稿、切文档 `targetDocument` 回传、拒绝原样上报、原点三条、`viewId` 透传；**从标尺拖出新线** 5 条（按下建草稿、未移动不建线、锁定不建、取消不建、带目标身份） |
| `packages/editor/src/features/views/placement.ts` → `.test.ts` | 6 | 一次性落点：消费即清、无请求不消费、取消后不消费、后发覆盖、订阅通知、回调抛错后无残留 |
| `packages/editor/src/features/views/view-aids-overlay.test.tsx` | 8 | 网格细分等分、标尺步长与原点、旋转后参考线两端点投影、单位格式化、关闭辅助不画图层；**新增**标尺条按下交出竖线/横线意图、角落不建线、无接管方保持纯展示、标尺按下不冒泡成画布落笔（锁定时也不漏） |
| `packages/editor/src/photo-editor-canvas.test.tsx` | 38（原 30 + 6 + 2） | 原有用例全绿；**新增**参考线拖动优先接管按下、不接管行为不变、取消不提交、预览不改数据、落点优先于当前工具、无落点请求时照常落笔；**本轮新增** `onProbe` 只转发客户坐标且 `pointerout` 清空、`onFrame` 报真实取景且值不变不重复回调 |
| `packages/editor/src/features/views/wasm-real.test.ts` | 14（+1 条件跳过） | 真实 `dist/wasm`：布局生成、命中/拖动/锁定、旋转反算、取样读数/单位换算/重开保留、逐条编辑命令可达、`targetDocument` 切文档拒绝、多视图输入归属、Hand/Zoom 只改活动视图取景、发布后能力可用且未登记命令被拒、标尺新建参考线一步成线；**本轮新增**并排按 `viewId` 定向取景且单视图开关被拒、`probe` 读数与取样点逐值一致且不改内容身份、采样点保存重开恢复（无点工程字节更短）、`probe` 在视图旋转后读数不变而几何动作仍可用 |
| `rust/crates/editor-core/src/features/io/editor_psd.rs`（`view_loss_tests`） | 4 | PSD 预检/导出报告含文档级视图损失、纯文档不报、**实测往返**（保留参考线位置/注释/测量比例，丢失参考线颜色/标尺原点/计数分组） |
| `rust/crates/project-verify/tests/verify.rs` | +1 | 真实 `.pcraft` 字节里 4097 条参考线被 `UnsupportedObject` 拒绝；边界内数据通过；NaN 在写入端即被拒 |
| `packages/editor/src/features/views/panes.test.ts` | 11 | 并排的纯布局决定：未开开关/单视图不并排、两视图按内核顺序给窗格并保留活动标记、窗格名取内核标签、活动视图用宿主视口而非活动视图用各自记忆的取景、未单独调过时沿用当前取景、两窗格取景互不影响；**取景同步** 5 条（新窗格从当前取景开始、活动窗格跟随宿主而非活动窗格锁住自己的、无变化时同一引用、窗格消失丢记录、不并排原样返回） |
| `packages/editor/src/features/views/panes-view.test.tsx` | 4 | 窗格容器：两块画布都渲染且各自绑定归属、按非活动窗格只切归属且吞掉这次按下（不落笔）、活动窗格第一笔不被吞、标签来自内核视图名并标出输入归属 |
| `packages/editor/src/features/views/hover.test.ts` | 5 | Info 读数发布/订阅：发布后可读、`null` 清空、相同引用不重复通知、取消订阅、无读数但带单位的合法形状 |
| `integrations/woohaa/tests/view-domain-integration.test.ts` | 4 | 跨域：宿主无 `features.views` 时编辑器照常渲染且不显示做不到的入口；只读宿主下视图写入入口关闭；**并排真实渲染 2 条**（两个窗格/两块画布/只有活动窗格可交互；宿主平移活动画布时非活动窗格锁住自己的取景） |

## 逐 U 组证据（自动化可采集部分）

| U | 成功 | 失败 / 取消 / 无变化 | 像素 / 结构 | 历史 | 工程重开 |
| --- | --- | --- | --- | --- | --- |
| U70 | 加线/移动/编辑/删除/清空、换向与改色、原点设置/归零、锁定拒绝、**画布命中/拖动/原点拖动/标尺拖出新线**（源坐标、容差 `screenPx/zoom`、旋转后同点不同源坐标） | 锁定与白名单显式拒绝；无文档拒绝；草稿期间写入拒绝、`cancel` 只恢复辅助数据；非法索引/单位拒绝且旧线保留；锁定时不从标尺建线 | 写入前后 `contentHash` 相同（`saved_view_data_changes_no_pixels_*`）；**拖动期间只画预览线、不写文档**；真实 WASM 断言布局后 hash 不变 | 一次编辑一步历史（换向同样只加一步）；**松手才提交，值未变不提交**；面板数值框/取色器失焦提交且带 `coalesce` 键 | 参考线/原点随 `.pcraft` 往返 |
| U71 | 列/行/间距/边距生成位置（真实 WASM `[0,60,120]`）、从形状建线、清空画布参考线、单位/细分/五目标吸附/智能参考线 | 过密与无形状拒绝、旧线保留；未发布 id 走 `capability-disabled` | 会话偏好，不进 hash、不进工程 | 无历史（会话状态） | 不适用（会话） |
| U72 | 旋转 15/90/复位、Navigator、多视图新建/切换/关闭、`MAX_VIEWS=4`、**并排双视图**（两块真实画布，取景各自独立）、**按 `viewId` 定向写取景** | 非法角度/视图动作/超上限/单视图开并排拒绝；关闭到 1 视图自动关并排；未知 `viewId` 是参数错误且不漏到活动视图 | 旋转后像素与 hash 不变；两视图共享内容与撤销历史；点非活动窗格只切归属不落笔 | 会话，无历史 | 旋转/并排属于工作区会话，重开工程不恢复（已写明） |
| U73 | Info 读数（含按当前单位换算的画布宽与取样点 CMYK）、**光标跟随读音**（`probe`：源坐标 + 真实像素 RGB/CMYK；画布外 `—`）、**持久采样点**（保存写入元数据键、重开灌回、指纹不变）、**画布落点放计数标记/注释/取样点/标尺端点**（`placement.ts` 一次性请求）、取样点增删移动（`MAX_SAMPLERS=10`）、测量比例、标尺/拉直、测量日志（含 CSV 导出）、Count 分组与标记（可逐条移动/删除）、Note 注释（可改位置与展开）、`formatLength` 单位换算 | 越界取样、非法通道、非法计数尺寸/分组、非法注释坐标均拒绝；无文档拒绝 | 文档字段写入不改 hash；真实 WASM 重开后计数/注释在、**采样点也恢复**且指纹不变（无点工程不写键，字节更短） | 计数/注释/测量可撤销；注释与标记尺寸连续输入合并一步 | `.pcraft` 保留参考线/原点/比例/计数/注释/采样点元数据；PSD 保留参考线/注释/比例，原点与计数不保留，采样点列为 `view.color-samplers` 损失行 |

未采集：应用内截图、真实光标跟随的视觉跟随（读数本身已有内核+解码+订阅三层回归）、帧率与输入手感（见下节真实原因）。
画布手势本身已有自动化回归（会话层 18 条、画布仲裁 6 条、叠加层标尺 3 条、落点 6 条），
因此「代码是否接通」不需要真机；真机要确认的是手感、容差与视觉跟随。

## 真实 UI 与设备

**未执行，待人工验证。** 真实原因：本机为无 `renderD*` 的 Linux 容器，且 `DISPLAY` /
`WAYLAND_DISPLAY` 均未设置，没有可挂载的显示会话；即便装上浏览器也无 GPU 后端，不能产出可信的
帧率、视觉或输入证据。软件渲染（SwiftShader/lavapipe）不作为替代。

待人工验证清单（需电脑 1440×1000 与 Pad 正常窗口 1024×768，真实匹配 WASM）：

1. 参考线页新增/逐条改数值/删除/清空，确认无内容 dirty、撤销一步回退。
2. 布局页生成行列+间距+边距，核对线位置；过密参数被拒绝且旧线保留。
3. 辅助页逐目标切换吸附，确认提示线与 `tolerance/zoom` 手感；智能参考线独立生效。
4. 导航页旋转 15°/90°/复位，确认叠加层与参考线随之旋转、像素不动（像素级旋转未交付，见「剩余未完成项」）。
5. 多视图新建/切换/关闭，确认两视图内容与撤销同步、取景独立。
6. **打开「并排」**，确认两块画布同时呈现同一文档、各自缩放/平移不互相带动、点非活动窗格先切归属
   且第一笔只有激活、之后落笔只在活动窗格生效、撤销历史两窗格同步。
7. Info 页光标跟随读数（缩放/平移后位置与颜色仍对齐真实像素，画布外显示「—」）；取样点读数与
   真实源像素一致；`formatLength` 按源单位显示；**保存后重开，采样点/计数/注释仍在**。
8. 画布手势（已有自动化回归，待真机手感确认）：标尺拖出参考线、参考线命中/拖动、原点拖动、
   计数/注释落点。
9. 旋转视图后落笔（已知边界）：像素平面不随旋转，落笔走无旋转的共享 `coordinates.ts`，
   因此旋转后「叠加层/命中/读数」与「看到的像素」不同步——需要宿主渲染端口，见下节。

## 剩余未完成项（2 项，均非本域可独立解决）

1. **旋转后的像素呈现与落笔（2.3 的剩余部分）**：旋转在本域是**视图空间**变换——叠加层、参考线
   命中、标尺与 Info 读数都按同一公式反算且彼此一致；但像素平面由宿主按 `origin/zoom` 呈现
   （`renderCanvasBackground(origin, zoom)` 没有旋转参数，Woohaa 节点模式的 Bevy 节点同理），
   画布的落笔映射走共享 `coordinates.ts`（无旋转，冻结的共享文件）。因此旋转后「看到的像素」与
   「旋转后的叠加层/命中」不同步。补齐需要宿主渲染端口，属本 change 之外的范围。
   据此 `view.rotate-navigator` 能力**保持关闭**：能力协商、真实 WASM 与协议注释三处都断言它不在
   已开放清单里——不能靠改文案假装已交付。
2. **真实设备主线走查（4.2）**：容器无 `renderD*`、无 `DISPLAY`/`WAYLAND_DISPLAY`，见上文环境
   探测。按 AGENTS.md 此类环境不执行渲染相关验收，也不得用软件渲染或估算值替代。

### 本轮解除的两项阻塞

原记录里的「2.3 同文档并排渲染」与「2.4 持久颜色采样点」都已在本轮实现，且都不改 vendor：

- **并排**：不需要新宿主端口。两块画布复用同一段 `photo-editor-canvas.tsx` 渲染代码，内容与撤销
  历史来自同一个控制器；内核新增 `ViewAids.side_by_side` 与按 `viewId` 定向写取景，画布 `onFrame`
  把真实取景回写内核，使命中/标尺/读数在缩放平移后仍对齐。
- **持久采样点**：会话点仍在 `DocState::color_samplers`（不改历史/内容 hash），保存时投影进
  `Document::metadata.text` 的命名空间键 `photocraft.views.colorSamplers`（只改保存副本，
  `Cow` 借用：无点且无键时不克隆），打开工程时灌回。核验器按条数/字节/坐标三项有界检查；
  PSD 无法承载，改为 `view.color-samplers` 损失行显式报告。

### 此前已解除的阻塞（原先记为集成阻塞，已接通）

- 能力/命令发布：见 4.4（只开两条，`view.rotate-navigator` 保持关闭）。
- 画布手势与旋转输入路由：画布只加可选端口，命中/反算/提交全在本域手势会话里。
- 原生核验调用点：`project-verify/src/lib.rs` 已接线，域内 `allow(dead_code)` 已删。
- PSD 逐项损失报告：本域提供 `psd_loss_rows`，io 域汇总为 `viewLosses`。
- Hand/Zoom：真实入口是状态栏缩放 + 快捷键 + 空格拖拽（改宿主视口），面板只显示取景读数。

## 2026-10-23 共享分支集成复核

本 change 的实现已与其余 17 域汇入 `photocraft` 分支，冲突由共享集成流程统一处理。
共同检查、跨域证据、源快照与仍未完成事项见
[18 域集成核验记录](../../../notes/integration-2026-10-23.md)。
本段只记录代码集成，不覆盖本文件原有证据；未勾选的真机/UI/外部应用验收仍保持未完成。
