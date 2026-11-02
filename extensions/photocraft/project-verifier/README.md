# photocraft-project-verifier

`@woohaa3/photocraft-project-verifier`：PhotoCraft 工程核验（Node-only，浏览器不可达）。

默认用进程内的有界 TS 核验（[project-verification.ts](src/project-verification.ts)）：ZIP/manifest、
资源预算与嵌入内容的安全解析，失败一律 fail closed，不落盘。部署时可选接入**原生无 UI 核验工具**
（[native-project-verifier.ts](src/native-project-verifier.ts)），二进制路径由宿主侧
`WOOHAA3_PROJECT_VERIFIER_PATH`（绝对路径、可执行）提供；它和编辑器共用同一份固定文档解析实现，
能力边界与格式解析不会漂移。该工具源码不在本仓，未配置时完全走进程内核验。

适配器本身的进程纪律：只以参数数组启动（不经 shell）、字节只走 stdin、单次调用有墙钟超时并
SIGKILL、stdout/stderr 有字节上限、并发上限在实例内生效。`createNativeProjectVerifier()` 返回可释放
实例，`dispose()` 立即关闭并唤醒排队者。

```sh
pnpm run build       # 产出 dist/
pnpm run typecheck
pnpm run test
```

依赖 `@woohaa3/photocraft-protocol`（同一工作区）与公开客户端的 `@woohaa3/contracts`、
`@woohaa3/media-service`。
