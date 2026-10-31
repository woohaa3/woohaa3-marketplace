# @woohaa3/photocraft-protocol

PhotoCraft 的纯协议包：编辑定义严格联合、引擎/能力/格式版本、资源上限、内容身份与命令解码。
零宿主依赖，被客户端 `web/contracts` 和相邻的编辑器/工程核验包以 workspace 依赖引用。

该协议沿用旧 PhotoCraft 工程的内容身份与校验规则。当前位于 `marketplace/extensions/photocraft/protocol`，
与编辑器、Node 工程核验包一起独立安装构建，不依赖私有父仓。

## 唯一数据源

`fixtures/` 里的三份 JSON 是跨语言语义的**唯一权威来源**，Rust 与 TypeScript 各有一个测试读同一份：

| 文件 | 内容 |
|---|---|
| `contract.json` | 引擎/能力/格式版本、旧指纹基线 |
| `integrated-content.json` | 模式、通道、文字样式、路径、动画与变量同时存在时的身份对账 |
| `project-limits.json` | 图片工程与交换资源的资源上限 |

它们原本分别放在旧独立子项目的 `tests/fixtures/` 与 `rust/` 下。现在收在本目录下，测试用相对路径引用；
对应的 Rust workspace 已随独立子项目移除，只剩这些数据文件作跨语言基线。

## 命令

```bash
pnpm run build       # 产出 dist/（宿主 Vite 从 dist 解析）
pnpm run test        # 230 个测试
pnpm run typecheck
```
