# 实测证据（真实 WASM）

两套脚本都用真实匹配 WASM（`packages/editor/dist/wasm`，由 `pnpm -C photocraft run wasm` 生成），
只调用 WasmEditor 的公开导出，不修改仓库文件。

复现（在 `photocraft/` 目录、已构建 WASM 后）：

```bash
node openspec/changes/2026-10-22-add-photocraft-layer-workflows/evidence/mainline-real-wasm.mjs
node openspec/changes/2026-10-22-add-photocraft-layer-workflows/evidence/per-unit-real-wasm.mjs
```

## 1. 主线（顺序执行，一个文档走完）

- `mainline-real-wasm.mjs`：按 verification「必须验证的主线」顺序执行
  可编辑渐变填充 → 链接多层 → 粘贴入选区 → 分离 Blend If → 样式跨层复制/转层 → 去边 → 两个图层复合往返
  → 保存重开。
- `mainline-real-wasm.txt`：最近一次运行的完整输出（146 项检查，0 失败）。

## 2. 逐 U 组（每 U 组独立新文档）

- `per-unit-real-wasm.mjs`：按 U57–U64 分组，每组新起文档，重点覆盖主线脚本没有逐条断言的部分
  ——三类填充的创建/读回/重开与空图案库拒绝、用工作路径建矢量蒙版填充层且编辑期拒绝 `path`、
  `advancedBlending`/`channels`/`blendIf` 的真实读回、四条去边命令各自的预览像素与撤销、
  三种图层过滤主条件、U61 全部跨层样式动作与预设应用（含 `transferEffects` 六种前置拒绝、
  `defaultFor`/`makeDefault` 只推进 `presetsRevision`）、U64 缺失层报告、快照裁剪与导出 JSON 往返。
- `per-unit-real-wasm.txt`：最近一次运行的完整输出（126 项检查全绿，末尾一行 `PASS`）。

两套脚本分工是「顺序主线」+「逐组穷举」，不是重复。任何一个失败都会以非零退出码结束。

脚本输出的是**结构/身份/历史/预览像素尺寸**证据，不含**视觉外观**结论：预览像素确实取到并校验了
形状（`width*height*4`），但「看起来对不对」需要人眼在真实 GPU 上判断。本机为无 GPU 的 Linux 容器
（`/dev/dri` 无 `renderD*`），按仓库约定不采集渲染与视觉证据，相关项在 verification 中标
「待人工验证」。脚本运行在内存中的 WasmEditor 实例上，不需要 UI。
