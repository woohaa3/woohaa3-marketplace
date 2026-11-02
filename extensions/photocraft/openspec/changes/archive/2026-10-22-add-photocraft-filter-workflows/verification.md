# 验收计划与记录

## 本次规划状态

本页最初只含规划要求；实施完成后按下表逐项追加**实际执行结果**。未执行的项保持「待人工验证」并
写明真实原因，不用组名或命令存在性代替证据。

## 必须验证的主线

完整 USM → 切层重复上次 → 动感模糊 → 固定 seed 云彩 → 真实画廊组合 → 操作移轴控制点 → 摄影校正；
每个已发布子项独立验证取消和保存。

每个 U 编号及其子能力分别记录：实际入口/参数、预览、确认/取消、内容 hash/修订/历史、工程往返、
核验器结果，以及 spec 中特有的失败条件。只验证菜单存在或只检查命令字符串不算完成。

## 非渲染检查

从所属项目/仓库按影响范围运行并记录实际命令与计数：

```sh
pnpm -C photocraft run check
pnpm -C photocraft run rust:test
pnpm -C photocraft run wasm
pnpm -C photocraft run verifier
pnpm -C web --filter @woohaa3/photocraft-woohaa test
pnpm -C web --filter @woohaa3/photocraft-woohaa run typecheck
pnpm -C web --filter @woohaa3/frontend run typecheck
pnpm boundary:check
pnpm codemap:check
```

协议/limits/持久内容变化还需 contract fixture、旧工程身份/错误能力拒绝、TS 与真实原生核验子进程对照；
只改 UI 时选择相关包检查，不能把未执行的上表命令标记通过。

## 实际执行结果（2026-10-22，Linux x86_64，无 `renderD*`、无 `DISPLAY`/`WAYLAND_DISPLAY`）

| 检查 | 结果 |
| --- | --- |
| `pnpm -C photocraft run check` | 通过：build + 全包 typecheck；protocol 4 文件 / 74 用例，project-verifier 2 文件 / 40 用例，editor 42 文件 / 346 用例 |
| `pnpm -C photocraft run rust:test` | 通过：12 个 test target 全 ok，合计 325 用例 / 0 失败；其中 embed-editor lib 244（含 `features::filters` 29 + `filters_implementation` 12）、contract_fixture 4、editor 13、interaction_state 25、verifier lib 10、limits_agree 1、native_binary 3、smart_source 10、verify 15 |
| `pnpm -C photocraft run wasm` | 通过：wasm 17.41 MiB，glue 96.0 KiB |
| `pnpm -C photocraft run verifier` | 通过：原生核验工具 3.84 MiB |
| `pnpm -C web --filter @woohaa3/photocraft-woohaa test` | 通过：34 文件 / 275 用例 |
| `pnpm -C web --filter @woohaa3/photocraft-woohaa run typecheck` | 通过 |
| `pnpm -C web --filter @woohaa3/frontend run typecheck` | 通过 |
| `pnpm boundary:check` | 通过：6 用例 |
| `pnpm codemap:check` | 通过：47 manifest / 11 文档 / 1353 链接 / 8 模块 |
| `pnpm -C photocraft exec openspec validate … --strict --no-interactive` | `Change '2026-10-22-add-photocraft-filter-workflows' is valid` |
| `pnpm run evidence:filters:check`（入库套件判定） | 通过：41 项判定全部 PASS |
| `pnpm run evidence:drift`（基线漂移归因） | 通过（exit 0）：仅新增 119 条 `filter.*` 命令，其余字段与重构前基线一致 |

分模块自测另外确认：`pnpm -C packages/editor test`（42 文件 / 346 用例）、`pnpm -C packages/editor run typecheck`、
`pnpm -C packages/protocol run typecheck` 均通过；`cargo test -p photocraft-embed-editor --lib features::filters`
29 通过、`--lib filters_implementation` 12 通过、`cargo test -p photocraft-project-verify --lib features::filters`
2 通过。`cargo test -p photocraft-embed-editor --lib --no-run` 在本域文件上无新增 warning。

`pnpm -C photocraft run features:check` **不在本 change 的验证清单内，且当前预期失败**：它把
`notes/feature-boundary-wasm-baseline.json`（重构前快照）与真实产物逐命令比对，本 change 新增 119 个
`filter.*` 命令并由集成负责人刷新基线。漂移归因由**入库**的 `scripts/evidence/feature-boundary-drift.mjs`
（按 `features:check` 自身的快照口径）打印并判定：

```
node scripts/evidence/feature-boundary-drift.mjs
build equal: true
commands equal: false | baseline 185 | now 304
capabilities equal: true
steps equal: true
errors equal: true
output equal: true
added: 119 (filter.*: 119) | removed: 0
exit=0
```

即：`build` / `capabilities` / 8 个 content/state 快照 / 3 个拒绝用例 / 导出 PNG 与工程字节
**全部与重构前基线一致**，差异只有新增的 119 条 `filter.*` 命令、无删除。脚本在出现其它漂移时
以非零码退出，便于集成负责人刷新基线前先确认「漂掉的只有新增命令」。

## 真实 WASM 主线证据（Node 加载 `packages/editor/dist/wasm`）

**前置说明（重要）**：本 change 前几轮把证据散在 `/data/tmp/opencode/*.mjs` 临时脚本里，那些文件随临时
目录清理已全部丢失（本轮核对：12 个引用中有 11 个已不存在，仅剩 1 个）。为使证据可复核，相关判定已
**合并进入库套件** `scripts/evidence/filter-suite.mjs` + `scripts/evidence/filter-suite-check.py`；
下面每条结论都对应套件里的一个具体判定名，重跑方式见后一节。仍只由 Rust 单测支撑的结论单独标注。

对应关系（旧临时脚本 → 套件判定）：`filter-mainline.mjs` / `control-audit*.mjs` / `gallery-audit.mjs` /
`scenario-audit.mjs` / `bg-fixed.mjs` / `custom-kernel.mjs` / `spin-pin.mjs` / `straighten-panel.mjs` /
`ntsc-check.mjs` / `filter-resources.mjs` / `filter-displace.mjs` / `filter-roundtrip.mjs` /
`cross-domain-final.mjs` / `lastfilter-dispatch.mjs` / `lastfilter-draft-guard.mjs` 覆盖的内容，
现分别落在 `consistency`、`coverage`、`controls`、`galleryControls`、`perCommand`、`seedReproducible`、
`roundtrip`、`repeatLast`、`lastFilterCommand`、`draftGuard`、`straighten`、`blurGallery`、`customKernel`、
`displace`、`crossDomain`、`shearCurve`、`galleryGlow` 以及本轮新增的
`cameraRaw`/`vanishClone`/`vanishPaste`/`flamePath` 上。

| 结论 | 套件判定 / 来源 |
| --- | --- |
| 目录 121 项、画廊 47 项、放行 `filter.*` 122 条；声明未放行 0、放行未进目录 0 | `consistency` |
| 每条命令都能用规范默认参数开草稿（118 起，0 拒绝） | `coverage` |
| **每条命令都有真实像素证据**：候选改变 → 确认恰好一步历史 → `undo` 复原（110 条逐条核对，0 失败） | `perCommand` |
| 规范默认下确实无变化的 11 条命令，每条都有书面理由，且另有专门断言覆盖其非默认参数 | `perCommand.noopReasons` + `each declared noop states its reason` |
| 425 个标量控件逐个取非默认值都能送进内核 | `controls` |
| 47 个画廊滤镜 / 150 个参数全部接受 | `galleryControls` |
| **固定 seed 可重现**：同 seed 同像素、草稿内不漂移；seed 参与的命令（13 条）不同 seed 结果不同 | `seedReproducible`（17 个带 `seed` 的命令） |
| `lensBlur` 的 seed 只在 `noise>0` 时参与——专项复核开噪声后不同 seed 确实不同 | `seedReproducible.results[].specific` |
| **资源型滤镜工程往返**：带资源参数提交 → `saveProject` → `openProject` 像素一致；`undo` 改变、`redo` 复原（自定卷积/切变/光源组/Camera Raw 曲线 4 项） | `roundtrip` |
| 重复上次：参数逐字节相同、目标换到活动层 | `repeatLast` |
| `filter.lastFilter` 命令直派：改变像素、恰好一步、`undo` 复原、元数据 `Cmd+Alt+F`、`enabled` 随历史变化 | `lastFilterCommand` |
| 草稿未结算时快捷键被拒、草稿参数不变、仍在编辑中 | `draftGuard` |
| 镜头校正拉直线：水平线不变、倾斜线改变、清除后字段消失 | `straighten` |
| 五个模糊画廊命令按**面板修复后**的真实载荷各开一次草稿并全部改变：光圈/场景/旋转用 `pins`，移轴用中心+角度+焦点带（不带 `pins`），路径用 `paths`；旋转模糊的模糊量键为 `blurAngle` | `blurGallery` |
| 自定卷积：恒等核不变、均值核改变、核长 25 | `customKernel` |
| 位移按文档名找到来源、本机路径被拒、缺图被拒；来源按文档带出可见像素图层；按图层取图与压平结果不同 | `displace` |
| 切变自定义曲线改变像素、与同 `amount` 的缺省曲线不同、零位移直线是合法空操作、乱序与空曲线被拒 | `shearCurve` |
| 霓虹光晕颜色改变像素、两种颜色结果不同、非法颜色被拒 | `galleryGlow` |
| 跨域：草稿期选区仍在、蒙版层可提交、调整图层被 `filter.draft` 拒绝、`undo`/`redo` 一致 | `crossDomain` |
| Camera Raw 全 neutral 默认不改变像素（合法空操作） | `cameraRaw.identity` |

**测量方法上踩过的坑（已修正，记录以免复现误判）**：

- `renderPreview` 会缩放到固定宽度。锐化/去斑/表面模糊这类「通道只差 1–2 级」的滤镜在缩放取整后可能
  与原图完全相同，会被误判成「没有效果」。逐命令核对改用 **1:1 `renderRegion`**（`regionDigest`）。
- 只靠 1:1 仍不够：交错色带图案上这些滤镜的差异也近乎为零。改用**硬边高对比图案**（`hardEdges`）后，
  锐化/锐化更多/锐化边缘/去斑/表面模糊全部可测出显著差异。
- 图案笔画数必须**远离 `history_states`（默认 50）上限**：历史顶满后长度不再增长，「确认恰好一步」
  会被量成 0 步而误报失败。`hardEdges` 只用 10 笔。
- 默认参数下无变化并不都是缺陷：`shear`/`offset` 的默认 amount/位移就是 0，`colorToAlpha` 默认把白色
  转透明（硬边图案合成后不可见），`cameraRaw`/`lensCorrection`/`adaptiveWideAngle` 全 neutral。
  这些在 `noopByDesign` 里逐条写明理由，并用非默认参数的专门断言证明「改了就有反应」。

## 汇总验证套件 `filter-suite.mjs`

此前证据分散在多个临时脚本里，会随临时目录清理而丢失（本轮确实丢了 11 个，已重建）。现合并为
**入库**的套件 `scripts/evidence/filter-suite.mjs`，配合判定层 `scripts/evidence/filter-suite-check.py`
一次输出 **41 项判定，全部 PASS**（任一失败以非零码退出）。重跑：

```bash
cd photocraft
pnpm run wasm
npx esbuild packages/editor/src/features/filters/catalogue.ts \
  --bundle --format=esm --platform=node --outfile=.local/catalogue-bundle.mjs
node scripts/evidence/filter-suite.mjs          # 原始数据
python3 scripts/evidence/filter-suite-check.py  # PASS/FAIL 判定
```

面板模块缺失时图内几何用例会明确标 `skipped` 而不是伪造通过。

| 判定 | 结果 |
| --- | --- |
| 目录 / 白名单 / 上游注册表一致 | 121 目录、47 画廊、122 放行命令；声明未放行 0、放行未进目录 0 |
| 每条命令都能按规范默认参数开草稿 | 118 起（121 − 组合入口 / 置换 / 消失点，这三项由专门断言覆盖），0 拒绝 |
| **每条命令的真实像素 + 一步历史 + undo** | 110 条逐条 verified、0 失败；11 条默认无变化的命令各有书面理由 |
| **固定 seed 可重现** | 17 条带 `seed` 的命令：同 seed 同像素、草稿内不漂移；参与 seed 的命令不同 seed 结果不同；`lensBlur` 另有「开噪声后 seed 生效」专项 |
| **资源型滤镜工程往返** | 4 项（自定卷积 / 切变 / 光源组 / Camera Raw 曲线）：保存重开像素一致、undo 改变、redo 复原 |
| **位移图按图层** | 来源按文档带出可见像素图层；按图层取图与压平给出不同候选 |
| **切变曲线** | 自定义曲线改变像素且不同于 `amount` 曲线；零位移直线是合法空操作；乱序/空曲线被拒 |
| **霓虹光晕颜色** | 默认改变像素、两种颜色结果不同、非法颜色被拒 |
| 每个标量控件都能送进内核 | 425 个，0 失败 |
| 每个画廊效果参数都能送进内核 | 47 个效果、150 个参数，0 失败 |
| 重复上次 | 参数逐字节相同、目标换到新层 |
| `filter.lastFilter` 命令（快捷键所走路径） | 已启用、`Cmd+Alt+F`、改变像素、恰好一步、`undo` 复原 |
| 草稿门禁 | 被拒、草稿参数不变、仍在编辑中 |
| 镜头校正拉直线 | 水平线（=不旋转）不变、倾斜线改变、清除后字段消失 |
| 五个模糊画廊命令 | 全部 `ok`+`changed`；`pinKey` 旋转模糊为 `blurAngle`、其余为 `blur` |
| 自定卷积 | 恒等核不变、均值核改变、核长 25 |
| 置换 | 按文档名找到来源、本机路径被拒、缺图被拒 |
| 跨域 | 选区在草稿期仍在、蒙版层可提交、调整图层被 `filter.draft` 拒绝、undo/redo 一致 |
| Camera Raw 曲线 | 恒等曲线不改像素；`pointCurve` / `pointCurveRed` 改变像素 |
| Camera Raw HSL | 色相/饱和/明度三组都改变像素（落在图案真实色带 1/4/5 上）；改无关色带（0/7）**不**改变像素，反证是色带权重而非「整图随便一动」 |
| Camera Raw 分级与分离点 | `gradeShadows`、`curveSplits` 改变像素；单点坏曲线被写成空曲线（内核接受的不调整），不让草稿失败 |
| 光照效果光源组 | 单光源与双光源都改变像素 |
| 消失点透视克隆 | 跨色区取样（右蓝→左红）改变像素、左侧被覆盖、右侧不动；只给平面不改像素；缺 `source` 的条目被丢弃；默认克隆落在画布内 |
| 消失点透视粘贴 | 端口列出可见像素图层；写 `layer` id；来源像素真的贴到平面上（绿色像素数增加）；缺 `layer` 且无剪贴板时被拒绝 |
| 火焰路径来源 | 端口形状正确；面板写出的路径名原样回达到内核；缺省时不写字段；`path.*` 在本构建全部被门禁关闭，像素级「换路径换火焰」待路径能力开放后验证 |

## 实施期间发现并修复的域内缺陷

这些是「命令能开草稿」但用户实际用不了、改了没反应，或报错指向错误命令的缺陷，均在自有目录内修复并补了回归：

1. **单位型数值被当成结构参数**（`catalog.rs`）：`px=0` / `mm=0` 记法落到 `Resource`，面板因此跳过
   位移滤镜的水平/垂直位移，默认参数里没有这两个字段——「位移」选中后是空操作。改为带默认值的数字。
2. **返回注解污染参数表**（`catalog.rs`）：火焰/画框/树的记法带 `→ {…}` 返回注解，`rsplit_once('}')`
   把注解并进最后一个字段，`newLayer` 由布尔变成结构参数。先切掉 `→` 再解析。
3. **移轴/路径模糊被塞了未声明的 `pins`**（`panels.tsx` + `catalogue.ts`）：面板对所有模糊画廊命令无条件
   写 `pins`，而移轴没有该字段、路径用的是 `paths`，内核以「没有参数 pins」拒绝整次草稿——这两条命令
   在面板里完全不可用。改为由命令声明驱动，并新增路径编辑器。
4. **旋转模糊的模糊量写进了被忽略的字段**（同上）：控制点一律写 `blur`，而旋转模糊读的是 `blurAngle`，
   滑块改动对画面无影响。字段名与范围改用命令声明。
5. **自定卷积无法编辑核**（同上）：面板不带 `kernel`，内核用恒等核，滤镜始终是空操作。新增 5×5 核编辑器
   与恒等核复位，系数按 -999–999 夹取。
6. **镜头校正的拉直线没有任何控件**（同上）：`straighten` 是镜头校正唯一的图内几何（两点定一个需要拉直的
   方向），面板却完全没接，用户只能用 `angle` 盲调。新增拉直线编辑器：端点用文档像素、夹在画布内并取整，
   可清除；真实验证水平线（等于不旋转）不变像素、倾斜线改变像素、清除后字段消失。
7. **滤镜目标不合规时把原因挂到笔刷名下**（`filter_draft.rs`）：目标检查复用共享的 `writable_pixel_layer`，
   而它同时服务笔刷，错误 id 写死为 `paint.target`。用户在调整图层上点滤镜会看到「命令 paint.target 被
   拒绝」，误以为误触画笔。改为在滤镜域把命令 id 换成 `filter.draft`，保留「该图层类型不支持像素绘画」
   「文字图层需要先栅格化」「目标图层已锁定像素」这些可操作原因；真实 WASM 与单测双向钉住。

8. **Camera Raw 的摄影调节只有声明、没有控件**（`catalogue.ts` + `panels.tsx`）：`pointCurve` /
   `pointCurveRed/Green/Blue`、`hslHue/hslSat/hslLum`、`gradeShadows/Midtones/Highlights/Global`、
   `curveSplits` 全是结构型参数，标量列表一律跳过，所以选中 Camera Raw 只有一半滑杆可用——上游的
   曲线、八段 HSL 与四轮色彩分级在界面上完全不存在。新增按声明驱动的编辑器（四条曲线含加点/删点/
   移动/清空、8 段 HSL 三通道、四个 round-trip 转盘、三点分离点），并把内核的约束前置到面板：
   曲线 2–16 点、输入严格递增且每段差 ≥1、坐标 0–255；HSL 恒为定长 8；分离点 5–95 且保持递增；
   转盘 hue 按 360 取模、sat 0–100、lum −100–100。坏数据在写回侧收敛成内核接受的「空曲线」，
   在读取侧判为「未调整」，不会把用户的编辑画成假状态。
9. **光照效果的光源组没有控件**（同上）：`lights` 是对象数组（类型/位置/目标/颜色/强度/锥角/热点/
   半径），面板完全没接，只能改顶层单灯字段。新增光源组编辑器（增删、按声明写回、颜色 0–255 转
   十六进制）；至少保留一盏——空数组会让内核退回顶层单灯字段，画面完全变样。
10. **消失点的透视克隆没有控件**（同上）：`clone` 在内核里是真实的透视克隆笔画（文档像素的
    `source` + `points`），面板没接时用户只能看到平面。新增克隆编辑器；默认来源与落笔点落在画布内，
   缺 `source` 或缺落笔点的条目在读取时丢弃（否则整条命令按「clone N: source」拒绝，错误信息与
   用户的操作无关）。
11. **消失点的透视粘贴没有入口**（`tools.rs` + `wasm.rs` + `wasm-handle/workspace/catalogue/panels`）：
    `paste[].layer` 只认内核图层 id，而本域没有任何列出图层的端口，用户除了「先把内容复制到剪贴板」
    （本应用尚未开放剪贴板命令）之外无路可走，粘贴功能实际不可用。新增本域端口 `filterLayerSourcesJson`
   （只列可见且带像素的图层，含尺寸与活动标记），并接上面板选择器与刷新；未指定图层时**不写**
   `layer` 字段（内核把 `null` 当非法类型，缺失才等于剪贴板）。
12. **火焰的 `path` 没有控件**（同上 + `filterPathSourcesJson`）：`path` 是**已保存路径的名字**，
    不是坐标数组；面板没接时火焰只能落在默认路径上。新增路径来源端口与选择器，明确「留空 = 跟随
    工作路径／第一条已保存路径」，并在选回默认时删掉字段而不是写空串。

13. **切变的形状曲线没有控件**（`catalogue.ts` + `panels.tsx`）：`filter.distort.shear` 声明了
    `points`（`[t, offset]` 折线，内核按它逐行算水平位移），面板只给了 `amount` 一个滑杆，等于
    「自定义切变形状」这条能力不存在。新增曲线编辑器：未自定义时按 `amount` 画出内核会用的三点曲线
    （用户才知道拖哪一行），改动即接管；写回前保证 `t` 单调不减、1–64 点，乱序不送内核而是回退到
    `amount` 并归零（内核会以「x 必须单调不减」整条拒绝）。真实 WASM：自定义曲线改变像素、与同
    `amount` 的缺省曲线结果不同、两点零位移曲线是合法空操作、乱序与空曲线被拒。
14. **位移图不能用文档里的某一层**（`tools.rs` + `catalogue.ts` + `panels.tsx`）：内核 `mapLayer` 收的是
    **位移图文档内**的图层 id（不给就压平整份文档），而来源端口只列文档、不列图层，面板只能压平。
    让 `filterMapSourcesJson` 按文档带出可见且带像素的图层（与 `filterLayerSourcesJson` 同一过滤规则），
    并新增图层选择器；换文档时清掉旧文档的图层号，选「整份文档」时删字段而不是写 0。真实 WASM 用
    两层不同图案的位移图验证：按图层与压平给出**不同候选**，且 `mapLayer` 的 id 与文档图层 id 同值。
15. **霓虹光晕的颜色没有控件**（`panels.tsx`）：画廊编辑器跳过所有 `resource` 参数，而 `glowColor` 是
    画廊里唯一的用户颜色（其余 `foreground`/`background` 由会话状态注入），霓虹光晕因此永远停在默认色。
    新增颜色控件；真实 WASM：默认改变像素、两种颜色给出不同候选、非法颜色被内核拒绝（所以面板只给
    `#rrggbb`）。

**为什么前几轮没发现 13–15**：`structured_params_have_an_owner` 原是**举例式**清单（只列
`pointCurve*`/`hsl*`/`grade*`/`curveSplits`/`lights`/`clone`/`paste`/`path`），没被列进示例的字段就永远
不会被检查。本轮改成**穷举**：遍历目录里每一个 `resource`，按归属分类，未归类即失败；并反向要求归类表
里不能有目录已不声明的字段（防止分类腐坏）。已实测：把 `mapLayer` 从归类里拿掉，测试立刻报
「filter.distort.displace 的 mapLayer 声明了却没有归属」。归类表同时把归属分成四类并写清含义——
图内/专用编辑器、普通选择器、会话颜色注入、内核旁路（`mapPath` 本应用一律拒绝）。

**声明/入口/结果一致性核对**（`mod.rs` 6 个测试；运行时口径由套件 `consistency` 判定交叉验证）：

- `catalogue_and_command_whitelist_agree`：`catalog::ENTRIES`（121 项，面板与内核共用的参数 schema）
  与 `CONTRIBUTION.commands`（122 项）**双向逐项相等**，`filter.lastFilter` 单列（它没有参数 schema，
  但必须在白名单里）；
- `every_entry_exists_upstream`：每条目录命令都能在 `photocraft_engine::commands::find` 里找到，
  本域不会凭空登记上游没有的命令；
- `gallery_keys_map_to_catalogue_commands`：47 个画廊 key 全部对上 `filter.gallery.*` 目录条目与白名单；
- `whitelist_entries_are_all_p6` / `no_new_capability_ids`：本 change **只新增命令、不新增 capability id**，
  与 `proposal.md` 的「New Capabilities: 无」逐字一致；
- `structured_params_have_an_owner`（本轮改为穷举）：目录里**全部 29 个** `resource` 字段逐个归类，
  未归类即失败；归类表反向校验（已不声明的字段要删掉）；并单独钉住 Camera Raw / 光照 / 消失点 /
  火焰 / 切变 / 置换 / 霓虹光晕这七条命令的关键字段确实是 `Resource`——字段重新变成「只有声明」
  或新增字段忘了接控件时，测试立刻失败，而不是等人工发现；
- 运行时交叉核对：目录 121 / 画廊 47 / 放行的 `filter.*` 命令 122；**声明未被放行 0 项、放行未进目录 0 项**。

**跨域回归**（套件 `crossDomain` 判定，每个场景独立实例避免草稿日志串场）：

- 带矩形选区开滤镜：草稿期间选区仍在（`hasSelection: true`），候选改变，确认一步；
- 带图层蒙版的像素层：可开可确认；
- 调整图层做目标：在渲染前拒绝，原因现在是 `filter.draft`（见下条缺陷），不是笔刷的命令 id；
- 画布翻转后再开滤镜：两条独立历史，互不吞并；
- 滤镜提交后 undo 复原、redo 重现（像素级一致）。

## 真实 UI 与设备

**待人工验证。** 本机为无 GPU 显示的 CI 容器（`ls /dev/dri | grep renderD` 无输出，且无 `DISPLAY` /
`WAYLAND_DISPLAY`），无法启动真实窗口，因此未采集 1440×1000 与 1024×768 的应用内截图与逐项走查。
面板行为已由 jsdom 交互用例覆盖（参数写回、切滤镜取消、确认一次、重复上次、画廊栈、模糊画廊控制点、
消失点角点、广角约束线、位移图来源），但**不等于**真实窗口走查。备用原因如实记录为「容器无 GPU 与
显示会话」，不是依赖缺失。Pad 窗口走查不代表真实 Pad/数位笔硬件验证。

## 共享文件改动

只有一处共享文件被改动，且是**测试替身**而非生产代码：
`packages/editor/src/editor-workspace-tools.test.ts` 的 `fakeHandle` 原先让 `updateFilter` 返回
`{ active: true }`。真实内核自 P6 起就返回完整草稿回执（`filter` + 规范参数），面板现在依赖该字段回读
输入，因此替身对齐成真实形状。共享生产文件（`editor-workspace.ts`、`editor-wasm.ts`、`photo-editor-*`、
`image-project-*`、`editor.rs`、`capability.rs`、`document_content.rs`、`identity.rs`、共享 fixture）
零改动。

## 遗留阻塞项（集成负责人）

1. `notes/feature-boundary-wasm-baseline.json` 基线刷新：基线是重构前快照，本 change 新增 119 个
   `filter.*` 命令，`pnpm -C photocraft features:check` 因此预期失败；属集成负责人的聚合动作。
2. 原 change `2026-10-22-complete-photocraft-webui-editing` 的归档（任务 1.1）：它仍有 8 项真实设备 /
   Photoshop / 真 GPU 的人工验收未勾选，归档会移动该 change 目录并改写 `openspec/specs/`，属修改**另一个**
   change，按本任务约束不动。

> 已解除（本轮）：「重复上次」的快捷键入口已接通（`Cmd/Ctrl+Alt+F`）。它登记在本域自有的
> `photo-editor-shortcuts.ts` ——该文件不在 `parallel-work.md` 的共享核心清单内，而该清单把
> 「快捷键/动作 manifest」明确划给本域；分派复用既有的 `{kind:"command"}` 通用路径，未改
> `photo-editor-app.tsx`。菜单项仍走 `featureMenuSections("滤镜")`（section 上限 12 由共享测试钉住），
> 因此滤镜菜单里不新增第 13 个 section；快捷键 + 面板按钮已覆盖「重复上次」入口。

> 更正（前轮）：此前记的「新 capability id 需改共享 fixture」是**错的**。`proposal.md` 写着
> 「New Capabilities: 无」，本 change 有意只新增**命令**、复用前置 change 的同名能力
> `retouch-filter-workflow`，因此 `tests/fixtures/contract.json` 的能力清单本就不该变化；现已由
> `no_new_capability_ids` 与真实运行时（121 目录 / 122 放行命令）钉住。

## 发布记录格式

每项：U 编号 / 子能力 / 实现提交 / 主机与浏览器或设备 / 操作与参数 / 预期及实际结果 / 证据路径 /
通过或待验证 / 暂缓理由。液化、智能滤镜栈、RAW 解码、HDR 和不能编译到 WASM 的原生执行路径继续关闭。

## 2026-10-23 共享分支集成复核

本 change 的实现已与其余 17 域汇入 `photocraft` 分支，冲突由共享集成流程统一处理。
共同检查、跨域证据、源快照与仍未完成事项见
[18 域集成核验记录](../../../notes/integration-2026-10-23.md)。
本段只记录代码集成，不覆盖本文件原有证据；未勾选的真机/UI/外部应用验收仍保持未完成。
