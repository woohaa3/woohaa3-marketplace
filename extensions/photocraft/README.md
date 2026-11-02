# PhotoCraft

Woohaa 的图片编辑扩展。可加载的扩展包在 [`extension/`](extension/README.md)，运行时的官方
egui/WASM 编辑器与宿主桥接在 [`web/`](web/README.md)，工程格式协议与核验分别在
[`protocol/`](protocol/README.md) 与 [`project-verifier/`](project-verifier/README.md)。

本目录是一个独立 pnpm 工作区（`protocol`、`project-verifier`、`web`、`extension`），不属于宿主
workspace；它通过 `link:` 依赖公开客户端里的 `@woohaa3/contracts`、`@woohaa3/frontend` 等包。

## 目录

| 路径 | 内容 |
| --- | --- |
| [extension/](extension/README.md) | 可加载扩展包：`extension.json` 声明、前端入口、`hostPlugin` 后端工厂 |
| [web/](web/README.md) | 官方 egui/WASM 编辑器宿主适配、固定上游补丁（[patch/SOURCE.md](web/patch/SOURCE.md)）、字体与构建脚本 |
| [protocol/](protocol/README.md) | `@woohaa3/photocraft-protocol`：工程内容结构、版本、上限与内容身份 |
| [project-verifier/](project-verifier/README.md) | `@woohaa3/photocraft-project-verifier`：ZIP/manifest 有界核验与可选的原生子进程核验 |
| [notes/](notes/README.md) | **历史快照**：旧独立子项目的能力矩阵、领域边界与 PS/UI 走查记录 |
| [openspec/](openspec/README.md) | **历史快照**：旧独立子项目的 22 份规格与 20 个已归档 change |

`notes/` 与 `openspec/` 随旧子项目源码一起迁来，描述的是已删除的 React 编辑器 + 自建 Rust 内核
方案，只作追溯依据；当前生效的能力规格在主仓 `openspec/specs/photocraft-*`。

## 构建与验证

在父仓根目录执行：

```sh
pnpm -C marketplace/extensions/photocraft install --ignore-scripts
pnpm -C marketplace/extensions/photocraft typecheck
pnpm -C marketplace/extensions/photocraft test
pnpm -C marketplace/extensions/photocraft build:app        # 生成 web/app（WASM + glue + 字体）
pnpm -C marketplace/extensions/photocraft build:extension  # 生成 .local/photocraft 本地安装单元
```

发布包由 `client/scripts/pack-extension.mjs` 生成并上传本仓 GitHub Release，客户端从市场安装；
构建细节与验证边界见 [extension/README.md](extension/README.md) 和 [web/README.md](web/README.md)。
