# 为 PhotoCraft 并行实施拆分代码边界

## Why

当前功能集中在同一 React App/Canvas/控制器和 Rust/WASM/身份/核验文件。仅按 78 组功能拆成 change，会让多个分支同时改同一入口，也会产生通道、模式和资源语义冲突。需要先建立单一写入边界，才能让后续 18 个功能 change 实际并行。

## What Changes

- 抽出按域的 UI/控制器、协议、Rust 包装和验证贡献，保持当前已开放功能行为与工程格式不变。
- 建立稳定的动作/工具/面板/草稿、文档与文件交付、目标/取景、内容与核验贡献接口；为所有域一次建立装配槽位，后续仅修改各自目录。
- 把全局版本/预算/fixture、共享宿主和编排文件的修改交给唯一集成负责人，域内功能不再同时修改集中入口。
- 迁移现有业务实现到归属域，不顺带新增缺失功能；新增能力只在对应功能 change 验收后开放。

## Capabilities

### New Capabilities

无。

### Modified Capabilities

无。纯结构重构，`.openspec.yaml` 设置 `skip_specs: true`；既有行为和规格不变，不虚构 Requirement 作为门禁。

## Impact

涉及 React 集中入口、公共协议与 Rust/WASM/核验装配，以及对应测试/地图。vendor 不修改。无新图层类型、文件格式、可见工具或 wire/container 版本变更。所有后续 change 以本 change 的实际完成提交为前置，不能只以文档就绪为前置。
