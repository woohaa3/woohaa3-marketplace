# 验收计划与记录

## 本次状态

本次在**用户明确授权下**同时修改本域目录与必要的共享文件（外壳、画布手势、门禁接口、能力表、
契约 fixture、基线快照、公共说明与地图），未提交 Git。逐 U 的实际结果记录于下文「逐 U 记录」；
仍未达成的条目只剩**真实 GPU 应用内走查**与**真笔/>512 笔刷的硬件证据**，在
[tasks.md](tasks.md) 与下面的「阻塞与待人工验证」中写明真实原因。

本轮（继续实施）的净变化：

- **3.3 共享门禁旁路已修**：`WorkspaceFeatureContext` 新增 `frozen()`/`documentGeneration()`，
  `EditorWorkspaceController` 抽出 `frozenGate()` 与 `dispatch()` 共用；`type`/`vectors`/`views`
  的直连内核写入口同步补门禁。`workspace-gate.test.ts` 从 7 项扩到 **9 项**（含「保存进行中
  像素命令被冻结且内核零调用」与「`dispose()` 后代际失效」）；
- **3.4 工具轨与手势接线完成**：9 个绘画工具发布在工具轨，`gesture-settings.ts` 持有逐工具设置
  并编译命令，`photo-editor-app.tsx` 接 `canvasTool`/`beginPaintStroke`/`commitPaintPoint`，
  `photo-editor-canvas.tsx` 接拖动/单击/采样三条分支与真实笔姿态采样（单击类工具按下即一个事务；
  吸管不需 Alt、拖动持续取色；真笔 `tiltX`/`tiltY`/`twist` 随 coalesced 采样进入点位，鼠标保持
  短编码），吸管与色板经新的可写颜色端口 `FeaturePanelContext.setColor` 写回前景/背景色；
- **4.4 能力发布**：11 个 P1b 能力 id 同步进 Rust 能力表、协议镜像、`tests/fixtures/contract.json`
  （82 项）与基线 `stages.P1b`；重取真实 WASM 快照（82 capabilities / 212 commands），
  `pnpm run features:check` **通过**；
- **5.2 跨域回归落地**：新增 `tests/features/painting/cross-domain.mjs`（25 条），覆盖绘画 ×
  选区/图层/蒙版/分组/对称事务/撤销重做/保存重开身份/原生核验/PSD；
- 能力矩阵、模块地图、`packages/editor/README.md`、`photocraft/README.md` 的 P1b 阶段表同步。

规划/结构校验：`openspec validate 2026-10-22-add-photocraft-painting-color-workflows --strict --no-interactive`。

## 必须验证的主线

选择不同笔刷不重载编辑器 → 非 normal 笔迹/纹理动态 → 渐变拖动与桶填充 → 对称 → 分组选区笔尖 → 色板/工具预设；真笔另录倾斜旋转证据。

本轮实测到：非 normal 笔迹/纹理动态、桶填充、对称、分组选区笔尖、色板/工具预设（真实 WASM），
以及绘画 × 选区/图层/蒙版/分组/历史/保存/核验/PSD 的跨域一致性（`cross-domain.mjs` 25/25）。
未实测：真实的「选择不同笔刷不重载编辑器」**应用内**走查（本机 Linux 的 `/dev/dri` 下没有
`renderD*`，无真实 GPU 渲染会话）与真笔倾斜旋转（无真实数位笔硬件）。工具轨入口与渐变拖动/
单击手势本轮已接线，所以这两项现在缺的只是设备。

## 非渲染检查（实际执行）

在 `photocraft/` 下执行，结果为本轮实际输出：

| 命令 | 实际结果 |
| --- | --- |
| `pnpm run typecheck` | 通过：`packages/editor`、`packages/protocol`、`packages/project-verifier`、`dev` 四个项目 `tsc --noEmit` 全部 Done |
| `pnpm run test` | 通过：protocol **86**（4 文件）、project-verifier **40**（2 文件）、editor **339**（45 文件；含共享画布新增的 3 项手势/姿态用例） |
| `pnpm -C dev test` | 通过：**8** |
| Woohaa 适配包测试（`integrations/woohaa`，34 文件） | 通过：**275**，含 `paint-interaction.test.tsx` 6 项（真实 `PhotoEditorApp` 指针链路） |
| `pnpm --filter @woohaa3/photocraft-woohaa run typecheck` | 通过 |
| `cargo test --manifest-path rust/Cargo.toml --workspace --offline` | 通过：editor-core 单测 **214**、`contract_fixture` **4**、`tests/editor.rs` **13**、`tests/interaction_state.rs` **25**、project-verify 单测 **8**、main **0**、`limits_agree` **1**、`native_binary` **3**、`smart_source` **10**、`verify` **15**；0 失败 |
| `cargo check --manifest-path rust/Cargo.toml --workspace --offline` | 通过；6 个 `never used` 警告全部在 `features/layers/contour_presets.rs`（非本域文件） |
| wasm32 目标检查（`cargo check --manifest-path rust/Cargo.toml --target wasm32-unknown-unknown -p photocraft-embed-editor --offline`） | 通过；3 个警告在 vendor 的 `engine` crate |
| `pnpm run features:check` | **通过**：「commands, capabilities, errors, 8 content/state snapshots, undo/redo/cancel and PNG bytes match bdc3c084」。重建后的真实 WASM 握手 **82 capabilities / 212 commands**；命令表 +27、能力表 +11 都是本 change 的声明增量，已重取 `notes/feature-boundary*-baseline.json` 与 `tests/fixtures/contract.json` 的 SHA-256 |
| `pnpm codemap:check` | 通过：47 个 manifest、11 篇文档、**1362** 个本地链接、8 个模块入口清单 |
| `openspec validate … --strict` | 通过 |
| `pnpm boundary:check` | **失败**，原因与本 change 无关：`docs/design/desktop-runtime-boundary.md` 列出的 `artifacts`/`logs` 目录在本工作区不存在（既有环境问题） |

**本轮修改的共享文件（逐项理由见 tasks.md 5.1）**：
`packages/editor/src/features/workspace-context.ts`（`frozen()`/`documentGeneration()`）、
`packages/editor/src/editor-workspace.ts`（`frozenGate()`/`documentGeneration()`）、
`packages/editor/src/photo-editor-app.tsx`（`canvasTool`、落笔/单击/采样接线、`setColor` 端口）、
`packages/editor/src/photo-editor-canvas.tsx`（`pointerPose()`、单击/采样分支、抬笔姿态沿用）、
`packages/editor/src/photo-editor-shortcuts.ts`（`pencil:"N"`、`eyedropper:"I"`）、
`packages/editor/src/features/index.ts`（`featureGesture`/`isFeaturePointTool`）、
`packages/editor/src/features/shared/tool-parameters.ts`（`DocumentPoint` 姿态字段）、
`packages/editor/src/features/panel-context.ts`（可选 `setColor`）、
`packages/editor/src/features/{type,vectors,views}/workspace.ts`（各 2 行 `frozen()` 门禁）、
`packages/editor/src/features/boundaries.test.ts`（工具清单/9 个 stroke 工具/分区总数 13）、
`packages/editor/src/photo-editor-canvas.test.tsx`（新增 3 项手势/姿态用例）、
`packages/protocol/src/index.ts`（1 行域契约再导出）、
`tests/fixtures/contract.json`（capabilities 82）、
`notes/feature-boundary-baseline.json` 与 `notes/feature-boundary-wasm-baseline.json`（重快照）、
`packages/editor/README.md`、`notes/capability-matrix.md`、`photocraft/README.md`、
`docs/code-map/photocraft.md`、`integrations/woohaa/tests/editor-workspace.test.ts`（fake 内核补 14 个桩）。
其余改动全部落在本域目录、`tests/features/painting/` 与本 change 文档内。

真实 WASM 证据（先 `node scripts/build-wasm.mjs` 产出 `packages/editor/dist/wasm`）：

本轮已把上述证据从 `/tmp` 一次性脚本**固化为仓库内可复跑套件** `tests/features/painting/`
（`parallel-work.md`「本域测试独立放置」），任何人不必重现对话即可复核：

```bash
cd photocraft
node scripts/build-wasm.mjs
node tests/features/painting/run.mjs      # 14 个文件 / 164 条断言，全部通过
```

| 套件文件 | 结果 | 覆盖 |
| --- | --- | --- |
| `panel-commands.mjs` | **24/24** | 面板实际发出的每条命令在真实内核上可执行（含参数形状） |
| `u27-tools.mjs` | **15/15** | 铅笔跟随前景色/硬边；颜色替换只改匹配色；两工具尺寸独立 |
| `u28-gradient-bucket.mjs` | **14/14** | 渐变端点/反向/插值方式/平滑度；桶填充选区与连通域 |
| `u29-erasers.mjs` | **8/8** | 魔术橡皮按区域；背景橡皮按取样色（两种取样模式差异）；保护前景色 |
| `u30-dynamics.mjs` | **13/13** | 混合模式/纹理/颜色/形状/散布/压力曲线改真实像素；预览不写文档；seed 可复现 |
| `u31-pen-pose.mjs` | **6/6** | 倾斜/旋转经槽位编码进入内核动态；槽位对齐；一步撤销 |
| `u32-brush-library.mjs` | **8/8** | 选区笔尖尺寸；分组改名/排序/删除/默认组保护；快照往返；删库不影响已提交像素 |
| `u33-symmetry.mjs` | **9/9** | 垂直/水平/双轴/对角镜像；一次撤销移除全部镜像；从路径定义；对称不改内容指纹 |
| `u34-eyedropper.mjs` | **6/6** | 点采样/平均采样/图层策略；图外与透明返回空；非法尺寸拒绝 |
| `u35-swatches-gradients.mjs` | **9/9** | 色板增改/移动/分组/ACO 往返/重置；渐变预设用于绘画；偏好不推进修订 |
| `u36-tool-presets.mjs` | **10/10** | 预设保存/套用/过滤/改名/删除/快照；单工具与全部重置只改偏好 |
| `content-roundtrip.mjs` | **12/12** | 7 类像素命令参战后的工程往返逐像素一致；偏好不进内容与工程字节；旧工程兼容 |
| `psd-cross-format.mjs` | **5/5** | PSD 矩阵声明、导出预检、导出/再导入尺寸一致 |
| `cross-domain.mjs` | **25/25** | 绘画 × 选区裁剪 × 混合/不透明度 × 蒙版 × 分组 × 对称事务 × 撤销重做 × 保存重开身份 × 原生核验 × PSD 往返（tasks 5.2） |

套件产出的工程字节同时经原生核验器复核：
`photocraft-project-verify <run 打印的 painted-project.pcraft>` → `{"ok":true}`
（96×64、1 层 raster、4 条目、18215 解压字节、`upstreamCommit 4e7a17cd…`，与套件内 WASM 结论一致）。

### 测量口径的两处修正（本轮发现）

写入记录前先纠正了两个会制造假通过的测量错误，避免把无效证据留进验收：

1. **跨会话比内容 hash 无效**。内容指纹含文档/图层身份，两个新文档的 hash 天生不同
   （两个空文档分别 `44655891…` 与 `e15b742d…`）。因此**所有 hash 比较都必须在同一会话内**
   （落笔 → 取 hash → `edit.undo` 回基线）；`wasm-paint-pose.mjs` 已按此重写。已复核
   `wasm-paint-advanced.mjs` 与 `wasm-paint-evidence.mjs` 原本就是单会话比较，结论不变。
2. **空断言**。PSD 脚本最初读 `report.failed`/`editor.canvasWidth` 等不存在的字段，得到
   `undefined === undefined` 的假通过；改为读真实形态 `{blocking, editable, layers,
   rasterizable}` 与 `{warnings, lossy, rasterized, version, bytes}` 后，断言才有意义。

## 逐 U 记录

格式：U / 子能力 / 入口与参数 / 操作 / 预期与实际 / 证据 / 结论。

### U27 铅笔与颜色替换

- 入口：`panels.tsx` → `buildPencil`/`buildColorReplacement` → `paintCommand("paint.pencil"|"paint.colorReplacement")`。
- 铅笔：`paint.pencil {points, size:3, color:"#000000", autoErase:false, mode:"normal"}`；像素变 `#000000`，
  `edit.undo` 后内容指纹回到原值 → **通过**。
- **铅笔颜色修复（本轮）**：此前面板用 `DEFAULT_PENCIL.color`（`#000000`）编译，用户改前景色后
  铅笔仍画黑，与油漆桶/颜色替换不一致。现在面板以 `{...pencil, color: colors.foreground}` 编译。
  证据 `u27-tools.mjs` 铅笔段 **6/6**：传 `#00ff00` 落笔得 `#00ff00`（两点都为纯绿）、
  同路径改传 `#000000` 得不同像素、`edit.undo` 回基线且 `#ffffff`；硬边笔尖在 x=24 的
  y=13..16 全为纯 `#ff0000`（无软边过渡）；全部用例后内容指纹回基线。
  回归：`workflow-state.test.ts`「铅笔颜色跟随当前前景色，不写死默认黑」、
  `panels.test.tsx`「铅笔参数预览跟随面板传入的前景色」。
- **颜色替换尺寸独立（本轮）**：原先面板把「笔头尺寸」绑在 `backgroundEraser.size` 上，在
  颜色替换里改笔头会同时改掉背景橡皮的笔头，违反「逐工具冻结笔迹设置」。现在
  `ColorReplacementSettings.size` 独立（省略时回落旧行为，保持其它调用方不变）。
  证据 `u27-tools.mjs` 逐工具尺寸段 **7/7**：同一路径 `size 4` 在 x=48 着色 6 行、
  `size 20` 着色 24 行；背景橡皮 `size 4` 擦除 2 行、`size 20` 擦除 18 行；两工具连续两笔
  可分别撤销并逐步回基线。回归 `workflow-state.test.ts`「颜色替换用自己的笔头尺寸」。
- 颜色替换 `mode:"color"`：`#808080` → `#ff4a4a`（保留亮度，不是纯红），无关的蓝色笔迹仍是
  `#0000ff`，撤销回原指纹 → **通过**；半灰半白文档里白色半边保持 `#ffffff`，撤销回原指纹 → **通过**。
- 工具轨入口：**已发布**（本轮接线）。铅笔/颜色替换进入 `features/painting/index.ts` 的工具清单，
  共享外壳 `photo-editor-app.tsx` 的 `canvasTool` 白名单与 `beginPaintStroke` 分支按
  `tool-manifest.ts` 契约接线；`beginPaintStroke` 传当前前景色，不再落回默认黑。

### U28 渐变与油漆桶

- 渐变：`paint.gradient {from:[0,16], to:[47,16], style:"linear", stops:[[0,"#000000"],[1,"#ffffff"]], dither:false}`；
  x=1 得 `#080808`、x=46 得 `#fcfcfc`，端点按源坐标生效 → **通过**。
- 插值方式 `method` + `smoothness`（本轮补齐入口并验证，`u28-gradient-bucket.mjs` 插值段
  **8/8**，单会话每笔撤销回基线；该文件整体 **14/14**）：

  | 设置 | x=16 | x=128 | x=240 |
  | --- | --- | --- | --- |
  | 直线色标（不发 `method`） | `#111111` | `#818181` | `#f1f1f1` |
  | `classic`, smoothness 100 | `#0a0a0a` | `#818181` | `#f7f7f7` |
  | `perceptual`, smoothness 100 | `#000000` | `#646464` | `#f4f4f4` |
  | `linear` | `#373737` | `#bcbcbc` | `#fbfbfb` |

  `smoothness` 0→100 对 classic/perceptual/linear **有**影响（如 classic x=16：`#111111`→`#0a0a0a`），
  对 `smooth` **无**影响——内核 `gradient_bake::eval` 的 Smooth 分支直接走 `smooth_ease`，不读该参数，
  属内核语义而非本域丢参数，因此断言按方式区分而不是一律要求不同。
  未知 `method` 内核会**静默退回直线色标**，所以拒绝必须由域校验器负责：`buildGradient` 对未知
  方式返回 `null`（已加回归），不依赖内核报错。
- 透明度色标：同一红色双色标下加 `transparency:[[0,100],[1,0]]` 后 x=8/32/56 得
  `#ff2222`/`#ff8484`/`#ffe5e5`，反序得 `#ffdddd`/`#ff7b7b`/`#ff1a1a`（白底透出，呈镜像）→ **通过**。
- 油漆桶选区：8×16 选区外 `#ffffff` 未被填 → **通过**。
- 连通域：整幅竖直分割线下 `contiguous:true` 只填左半（右半仍 `#ffffff`），`contiguous:false` 两侧都变
  `#ff0000` → **通过**。
- 渐变拖动方向：**已接线**（本轮）。共享画布把渐变归到 `stroke` 手势：按下记起点、移动更新终点、
  抬笔用首末点提交一次 `paint.gradient`（不在拖动中落像素）。选区裁剪证据见
  `cross-domain.mjs`「渐变被选区裁剪」。

### U29 背景橡皮与魔术橡皮

- 魔术橡皮：左半 `#808080`、右半 `#0000ff`；`paint.magicEraser {x:8,y:8,tolerance:10,contiguous:true}` 后
  左半采样返回 `null`（透明），右半仍 `#0000ff`，撤销回原指纹 → **通过**。
- 背景橡皮：参数编译、命令可达（`panel-commands.mjs`）与**拖动落笔已接线**（`stroke` 手势，
  整笔提交一次）；`u29-erasers.mjs` 8/8 覆盖取样模式差异与保护前景色。

### U30 高级笔刷动态与混合模式

- 混合模式：`#808080` 背景上逐模式落笔，内容 hash 互不相同（白底会把差异抹平，已用中灰底复测）；
  `dissolve` 合法，`passThrough`/`clear` 由 `isPaintableBlendMode` 拒绝；`buildStroke` 对未知模式返回
  `null` 而不是静默 `normal`。
- 纹理、颜色动态（前背景/逐笔尖/色相/饱和/亮度/纯度）、角度/圆度动态、双轴散布、数量抖动：均在真实
  WASM 下改变像素；越界散布（jitter 99 > 上限 10）被拒绝。
- 压力曲线：points 带 pressure 时落笔尺寸改变（不带 pressure 时曲线不参与，这是内核语义）。
- 预览：`brushPreview` 不写文档（内容指纹不变）；非法画笔（未知模式/未知纹理模式/类型错）被拒绝且不
  改动文档。
- 证据：`u30-dynamics.mjs` **13/13**（含 seed 可复现与换 seed 变像素）；整组 U27–U36 的逐项
  结果见 `tests/features/painting/` 各文件。

### U31 数位笔倾斜/旋转与大笔刷

- **域内序列化已完成并验证**：`stroke-points.ts` 按内核 `parse_points` 槽位
  `[x, y, pressure?, tiltX?, tiltY?, rotation?, timeMs?, wheel?]` 编码，`buildStroke`/`buildPencil`/
  `buildColorReplacement`/`buildBackgroundEraser` 的点参数放宽到同类型。回归
  `stroke-points.test.ts`（**9** 项）覆盖：短编码保持、姿态必须先写压力、只有旋转也算姿态、
  全 0 姿态按缺传感器处理、时间/滚轮只在非缺省时追加且不超 8 槽、越界收敛、非有限值按缺省。
- 真实 WASM `u31-pen-pose.mjs` **6/6**（单会话、每笔撤销回基线）：
  - 无倾斜动态时姿态不改变像素（内核语义，证明差异确实来自动态而不是别处）；
  - `shapeDynamics.size.control = "penTilt"` + `tiltScale:1` 时，倾斜改变笔尖；
  - `brushProjection:true` + `roundness:0.3` 时，`rotation` 改变笔尖角度；
  - 倾斜误写进压力槽会被 `penPressure` 动态读到并改变结果（证明槽位确实按位置解析）；
  - 带姿态的笔迹一步撤销回原内容；越界姿态收敛后仍能落笔。
- **仍未完成（只剩硬件与共享预算）**：
  - tilt/twist **采集已接线**（本轮）：共享 `photo-editor-canvas.tsx` 新增 `pointerPose()`，
    `pointerType === "pen"` 时读真实 `pressure`/`tiltX`/`tiltY`/`twist`（twist → `rotation` 槽）；
    coalesced 采样各自带姿态，抬笔沿用最后一个真实姿态而不补 0（不制造「垂直笔」）。
    **验收仍待人工**：本机无任何数位笔设备，没有真实读数可采；不合成事件冒充。
  - >512 笔刷卡在 `rust/project-limits.json` 的 `maxBrushSizeSourcePixels`（共享预算，本域未改，
    `clampBrushSize` 按 512 收敛）；大笔刷性能属真实 GPU 项。

### U32 选区定义笔尖与分组管理

- 选区 10×6 定义笔尖：`defineBrushFromSelection("证据笔尖","证据分组")` → `width:10, height:6`，分组表新增
  `{"group":"证据分组","count":1}` → **通过**。
- 组管理：改名 `renamed:1`、置顶 `index:0`、`deleteBrushGroup(..., keepPresets:true)` 后条目回到 `general`
  且内容指纹不变 → **通过**；`deleteBrushGroup("general", false)` 被拒并给出原因 → **通过**。
- 已冻结笔迹：删除刚定义的预设后内容指纹不变 → **通过**。
- 重载保持：**控制器链路完整、宿主端口未注入**。`ensureEditor()` 成功后调用 `brushes.restore()`，
  改库后 `persist()` 经 `EditorWorkspaceOptions.brushStorage` 落盘，`createIndexedDbBrushStorage`
  提供 IndexedDB 适配器，Rust 侧有往返与损坏拒绝单测；快照→恢复在真实 WASM 下成员与分组原样回来
  （`u32-brush-library.mjs`）。但**两个宿主都没注入该端口**：`dev/src/PhotoCraftDevApp.tsx` 声明
  「不写入任何持久状态」，`integrations/woohaa/src/image-editor-plugin.tsx` 未传 `brushStorage`，
  因此应用内重载落回 `persistence:"unsaved"`，面板如实显示「本机库只在本次会话内」而**不**宣称已保存。
  未在本域注入的原因：每个文档一个内核实例即一份独立库，共享同一存储键会让后保存的文档用
  「不含另一文档新增预设」的快照覆盖前者；正确做法要有库的单一归属者，属宿主的共享设计决定。

### U33 对称

- `paint.setSymmetry {mode:"vertical", center:[24,16], rotation:0}`；单笔在 x=11 与镜像 x=37 同时出现
  `#ff0000`；`edit.undo` 一次同时移除，内容指纹回到基线 → **通过**。
- `paint.symmetryDisable` → `symmetryStateJson()` 为 `{enabled:false}` → **通过**。
- 视图旋转/缩放后对称仍绕源坐标轴：**待人工验证**（需真实 GPU 渲染会话；本机 `ls /dev/dri` 无
  `renderD*`，无渲染会话可用）。

### U34 吸管与采样

- 源像素 `#123456`：点采样与 5×5 平均都得 `#123456`；图外（x=-4 与 x=1000）返回 `null`；透明文档
  （`background:"transparent"`）返回 `null`；采样前后内容指纹不变 → **通过**。
- 采样层策略：`current` 与 `all` 取得同值，参数由 `buildSampleColor` 校验（非法尺寸/层返回 `null`）。
- 写回前景/背景色：**已接**（本轮）。`FeaturePanelContext` 新增可选 `setColor` 端口，
  `photo-editor-app.tsx` 接到工具轨同一份 `setColor`/`setBackground`；吸管工具走
  `gesture:"sample"` 单击取色，`decodeSampledColor` 为 `null` 时提示「该点没有有效颜色」而不写回。
  宿主不提供端口时面板退回只读报告（不留假控件）。Alt 临时取色仍走共享画布。

### U35 色板与渐变预设

- 色板：`swatches.add {color:"#123456", name:"往返色"}` → `swatches.list` 可查到；`swatches.export {format:"aco"}`
  返回 47 条；导入该 ACO（`mode:"replace"`）后同名色仍是 `#123456`；`swatches.use` 返回同值；全程内容
  指纹不变 → **通过**。
- 渐变预设：`gradient.presets.list` 有分组；`gradient.presets.select {preset, applyToLayer:false}` 返回
  当前预设且**不新建填充层**；取其 stops 交给 `paint.gradient` 后 x=1 与 x=46 颜色不同 → **通过**。
- 面板修复：`selectPreset` 原先把已解码的 groups 再喂给解码器（`[[t,color]]` 与 `{location,color}`
  形状不符）导致选中预设拿不到色标——已修，并加回归断言「选预设不自动改色标、点套用后才替换且端点/
  样式不变」。

### U36 工具预设与重置

- `saveToolPreset {name:"证据预设", tool:"brush", includeColor:true}` → 把 size 改成 9 → `selectToolPreset`
  回到 **33** → **通过**。
- `tool.reset {tool:"brush"}` 返回 `scope:["brush","toolOptions"]`，`brush.get` 回到内核默认 **20** →
  **通过**；`tool.resetAll` 返回 `reset:"all"`、`scope` 追加 `presetSelection` → **通过**。
- 删除预设：`editToolPreset {action:"delete"}` 后内容指纹不变 → **通过**。
- 未结算笔迹时重置被拒（Rust 单测 `reset_tools_changes_only_declared_preferences`）。

### 未开放能力

- `paint.mixerBrush`、`paint.wetEdges`、`brush.dual` 经本域入口调用全部被拒（`command_allowed` 复核 +
  真实 WASM）→ **通过**。

### 工程往返、旧工程兼容与跨格式（3.2 域内部分）

- **工程往返** `content-roundtrip.mjs` 往返段 **6/6**（该文件整体 **12/12**）：7 类真实像素命令画满 96×64 后保存，
  用新实例重开——内容指纹、96×64 全量逐像素、修订号一致；二次保存字节稳定；重开后仍能落笔并撤销。
- **偏好与内容分开** 同脚本（**2/2**）：16 条偏好命令（色板、渐变预设、笔刷预设与分组、工具预设与重置、
  对称）全部被接受，**没有一条**改变内容指纹或修订号；改完偏好再保存，工程字节逐字节相同。
- **旧工程兼容** 同脚本旧工程段 **4/4**：旧字节重开指纹/修订不变；在旧工程上用新
  命令绘画并能一步撤销；加偏好后内容不变；再保存仍可重开且内容一致。
- **原生核验**：对套件打印的 `painted-project.pcraft` 运行
  `packages/project-verifier/dist/bin/photocraft-project-verify` → `{"ok":true}`
  （1 层 raster、4 条目、18215 解压字节、`upstreamCommit` 与固定上游一致）；解码前累计预算、
  深度与条目上限在该工具里对同一份字节生效。
- **PSD** `psd-cross-format.mjs` **5/5**：矩阵声明 raster 可导出；绘制后工程
  `inspectPsdExport` 为 `editable:true, blocking:0, rasterizable:0`；导出 19132 字节、
  报告 `warnings:[]`、报告字节数与产物一致；再导入画布仍为 96×64。
- **基线一致性**：`pnpm run features:check` **通过**，输出「commands, capabilities, errors,
  8 content/state snapshots, undo/redo/cancel and PNG bytes match bdc3c084」。重建后的真实 WASM
  握手为 **82 capabilities / 212 commands**；相对基线的差异只有本 change 的声明增量
  （命令 +27、能力 +11），快照已按新声明重取。
- **共享 fixture 对照**：`cargo test --manifest-path rust/Cargo.toml --offline --test
  contract_fixture` → **4/4**。其中 `capability_stages_and_non_goals_match_the_shared_fixture`
  把 `capabilities` / `nonGoals` / `DELIVERED_STAGES` 与 `tests/fixtures/contract.json` 逐项比对，
  `build_info_reports_the_fixture_values_on_the_wire` 比对 engine/upstream/format 版本。
  本轮发布的 11 个 P1b id 已同步写入 fixture（82 项），协议 `contract-fixture.test.ts` 同时通过。
- **跨域一致性（5.2）** `cross-domain.mjs` **25/25**：见上文套件表。

### 共享门禁在域命令上的实测（3.3）

`workspace-gate.test.ts`（**9 项**）装配**真实** `EditorWorkspaceController`（内核为替身，只记录
调用），不再用手写 `WorkspaceFeatureContext` 替身自证：

| 场景 | 实测结果 |
| --- | --- |
| 像素命令正常提交 | `afterWrite` 真的跑了：内核修订 +1 且 `currentView().document.revision` 同步 |
| 滤镜草稿进行中提交像素命令 | `code:"filter-active"`，**内核调用计数不变、修订不变**（门禁在内核之前，无半个像素） |
| 草稿进行中改工具偏好 | 成功，且修订不变（偏好不被草稿门挡住） |
| **保存进行中提交像素命令** | 真 `save()` + 延迟保存端口把控制器推进 `saving` 后，像素命令返回 `{code:"frozen"}`，**内核调用计数与修订都不变**（本轮修掉的旁路） |
| `dispose()` 之后 | 像素/偏好/采样/对称四入口统一 `no-document`，内核零调用 |
| **`dispose()` 后的代际** | `documentGeneration()` 与写入口一致失效，异步结果不会被写进新文档 |
| 内核拒绝 | `capability-disabled` 原样冒泡，修订不变 |
| 错通道 id | 两条通道互相拒绝 `unsupported-command`，都不触达内核 |
| 未加载句柄 | 全部 `no-document` |

**旁路的根因与修复（本轮）**：此前 `WorkspaceFeatureContext` 只暴露 `blockingDraft()`，看不到
控制器私有的 `pendingArtifacts` 与 `state.phase === "freezing"|"saving"`，于是域里直连内核的写入口
（绘画像素命令、`applyTypography`、`vectorCommand`、`guideCommand`）能在保存期间改内容，而
`performSave` 成功后无条件 `commitBaseline` 清 dirty，可能把保存之后的改动当成已保存。现在
冻结判断抽成 `EditorWorkspaceController.frozenGate()`，`dispatch()` 与上述四个域入口共用它；
`documentGeneration()` 提供代际比较。共享层仍只有这一份实现，域内没有复制门禁逻辑。

## 真实 UI 与设备

- 电脑 1440×1000 / Pad 1024×768 的应用内逐项走查与截图：**待人工验证**。真实原因：本机为 Linux，
  `ls /dev/dri` 无 `renderD*`（无真实 GPU 渲染会话），按仓库规则不在该类环境采集渲染/截图证据。
  工具轨入口、拖动/单击/采样手势与吸管写回本轮均已接线，所以缺的只是具备 GPU 的显示会话。
- 真笔 tilt/twist：**待人工验证**。采集代码已接线（`pointerPose()` 读真实
  `tiltX`/`tiltY`/`twist`），但本机无任何数位笔设备，没有真实读数可采；不合成事件冒充。
- Photoshop PSD 往返：本 change 未改 PSD 兼容项，**不适用**。

## 阻塞与待人工验证（含真实原因）

| 项 | 卡点 | 下一步 |
| --- | --- | --- |
| >512 笔刷 | `rust/project-limits.json` 的 `maxBrushSizeSourcePixels` = 512（共享预算，本域未改） | 需预算所有者评估后放开，并用真实 GPU 采性能证据 |
| 真笔 tilt/twist 记录 | 采集与编码都已就绪，**缺真实数位笔硬件** | 具备硬件的人工验证录一份记录 |
| 应用内 UI/截图/帧率 | 本机 Linux 无 `renderD*`，无真实 GPU 渲染会话 | 待具备真实 GPU 的人工验证 |
| 笔刷库应用内重载保持（U32） | 控制器与 IndexedDB 适配器已就绪，但**两个宿主都未注入 `brushStorage`**；多文档各有独立内核库、共享单键会互相覆盖，需宿主决定库的单一归属者（非硬件项） | 由宿主/集成负责人确定归属与合并策略后注入端口；在那之前面板如实显示 `unsaved` |
| `integrations/woohaa` 的 `vitest.config.ts` React 别名 | 写死 `../../node_modules/.pnpm/react@18.3.1/...`，当前安装布局下该路径不存在（既有环境问题） | 用 `/data/tmp/pc-woohaa/vitest.config.ts`（`createRequire` 解析同一份 React）复跑；仓库配置归依赖安装方式所有者修正 |
| `pnpm boundary:check` | `docs/design/desktop-runtime-boundary.md` 列出的 `artifacts`/`logs` 目录在本工作区不存在（既有环境问题） | 由该文档/目录所有者对齐 |

### 复跑方式（交给集成负责人）

域内实现、共享接线与真实内核行为都可独立复核，不需要重现对话：

```bash
cd photocraft
node scripts/build-wasm.mjs            # 改了 Rust 就必须重跑
node tests/features/painting/run.mjs   # 14 文件 / 164 断言；退出码 0 才算全通过
pnpm run typecheck && pnpm run test
pnpm run features:check                # 真实 WASM 对基线：命令/能力/快照/PNG 字节
cargo test --manifest-path rust/Cargo.toml --workspace --offline
```

`run.mjs` 会打印产物目录，其中的 `painted-project.pcraft` 与 `cross-domain.pcraft` 可直接喂给
`packages/project-verifier/dist/bin/photocraft-project-verify` 复核原生侧结论。

### 共享文件改动

本轮在用户明确授权下直接修改共享文件，逐项清单见 tasks.md 5.1 与本文「非渲染检查」小节。
共享层只保留唯一实现（门禁、手势分发、颜色端口、能力表、契约 fixture、基线快照），
本域没有复制替代实现；`rust/project-limits.json`、`identity.rs`、`Cargo.lock`、`pnpm-lock.yaml`
的 SHA-256 仍与基线一致。

## 发布记录格式

每项：U 编号 / 子能力 / 实现提交 / 主机与浏览器或设备 / 操作与参数 / 预期及实际结果 / 证据路径 / 通过或待验证 / 暂缓理由。双重笔刷、湿边/混合器、特殊鬃毛以及未经预算和真笔验收的大范围参数仍关闭。

本轮的实现尚未提交（工作区未提交改动，基线 `b0cd6cbc`），因此「实现提交」一列暂记 `uncommitted`。

## 2026-10-23 共享分支集成复核

本 change 的实现已与其余 17 域汇入 `photocraft` 分支，冲突由共享集成流程统一处理。
共同检查、跨域证据、源快照与仍未完成事项见
[18 域集成核验记录](../../../notes/integration-2026-10-23.md)。
本段只记录代码集成，不覆盖本文件原有证据；未勾选的真机/UI/外部应用验收仍保持未完成。
