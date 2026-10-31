# 结构重构验收

在用户指定的当前 worktree 实施，重构前实现为 `bdc3c0847fa7d2ed5db82128dafcf3f47ad1bfa1`。
仅重组代码和装配，未实现后续 18 个功能 change，未修改 vendor。

## 基线与等价

- 重构前先运行 Rust 全量测试，并从原有真实 WASM 采集固定命令序列。基线保存于
  [共享契约摘要](../../../notes/feature-boundary-baseline.json) 和
  [WASM 行为快照](../../../notes/feature-boundary-wasm-baseline.json)。
- `pnpm -C photocraft features:check` 加载重构后的真实 WASM，逐项比较命令白名单、能力握手、
  拒绝错误、8 组完整状态/内容 hash、选区修改与滤镜取消、绘画撤销/重做、导出摘要和 PNG 字节。
  同时核对 limits、contract fixture、identity 算法及 pnpm/Cargo 锁文件未变。
- 旧 JSON 方法保留签名和既有内核校验；没有通过重构打开新能力。现有 wire/hash/version 和
  资源总额保持，域贡献均在原有累计预算下运行。

## 自动检查

| 检查 | 结果 |
| --- | --- |
| PhotoCraft `check`（build + typecheck + test） | 通过：protocol 70、editor 269、project-verifier 40 |
| PhotoCraft `rust:test` / `rust:check` | 通过：全 workspace 单元、契约、交互、内容身份、核验与预算测试 |
| PhotoCraft `wasm` | 真实 release + wasm-bindgen + wasm-opt 构建通过 |
| PhotoCraft `verifier` | 当前 Windows 原生 release 构建通过，2.76 MiB |
| PhotoCraft `features:check` | 与重构前快照完全相同 |
| Woohaa adapter test / typecheck | 通过：275 测试，类型通过 |
| Woohaa frontend typecheck | 通过 |
| `boundary:check` | 通过：6 测试 |
| `codemap:check` | 通过：47 manifests、11 篇地图、1353 本地链接、8 模块入口 |
| OpenSpec strict validate | 通过；skip_specs 仅表示不改产品规格 |

## 真实 UI

Windows 先通过 `Win32_VideoController` 探测：Intel UHD 770、RTX 4060。Chrome 的实际
WebGL renderer 为 **ANGLE / Intel UHD Graphics 770 / Direct3D11**，不是软件渲染。
在当前源码的独立 dev 宿主 `127.0.0.1:4318` 加载真实 WASM；[机器记录](evidence/probe.json)。

- 选框松手后边界保留；取消下一次拖动保留已有选区；切画笔及选预设后边界仍保留。
- 选预设前后仅一次主框架导航，未刷新编辑器；无 page error。
- 实际绘画后 dirty，撤销恢复净状态，重做恢复 dirty；保存后交付原始 `.pcraft` / PNG 两份字节。
  工程 ZIP 头为 `504b0304`，PNG 头为 `89504e470d0a1a0a`。
- 新装配的滤镜菜单可打开本域功能面板；桌面与 Pad 正常窗口截图：
  [1440×1000](evidence/desktop.png)、[1024×768](evidence/pad.png)。Pad document scrollWidth=1024，
  画布宽 692，侧栏右沿 1024；无横向溢出。
- 保存草稿门禁、失焦取消、异步回执/关闭结算和原始字节不转码由既有 editor/adapter 全量回归复核。

本次没有 Pad 实机、真笔压力硬件或 Photoshop 外部应用操作。这些属于原 change 尚未完成的验收，
继续待人工验证；窗口布局与鼠标操作通过不替代这些项目，也未采集帧率/GPU 性能结论。

## 两域并行试验

在共同结构树上构造两份独立 Git commit，使用 `git merge-tree --write-tree --merge-base`
实际合并，并逐文件核对合并内容。没有切换当前 worktree，没有向其他会话发送实施任务。
完整 tree/commit 与写集见 [试验记录](evidence/parallel.json)。

| 域 | 实际实现修改 | 独立验证 |
| --- | --- | --- |
| selections | 从 workspace 会话拆出 `session-gate.ts`，保留 unavailable / active-draft 的原错误顺序；增加本域回归 | typecheck + 23 回归通过 |
| painting | 从工具参数拆出 `stroke-points.ts`，保留点编码/笔压/蒙版/动态参数；增加本域回归 | typecheck + 33 回归通过 |

两域各改 3 个本域文件，**写集交集为空**。未改共同装配、公共版本、预算或 fixtures。
合并后的完整子项目检查、宿主回归与类型通过；两个试验都是保留行为的真实实现重构，
没有新增产品能力。该证据证明冻结接口下可独立修改，不表示尚未实现的 Channels/IO 等提供方
已经交付；各功能 change 的最终集成依赖仍需遵守。

## 交付边界

[接口、18 域输入/输出和唯一集成职责](../../../notes/feature-boundaries.md)已冻结，模块地图与
editor README 已同步。当前 worktree 的结构实现、本文和证据单独形成结构前置提交；后续分支
应基于该实际提交，不能继续从旧 `bdc3c084` 直接实施。已存在的 ATC 空闲会话/worktree 未自动
覆盖或重置；本次没有启动后续 18 个 change。
