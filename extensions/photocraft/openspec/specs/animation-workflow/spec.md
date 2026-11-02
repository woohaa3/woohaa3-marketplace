# animation-workflow Specification

## Purpose
TBD - created by archiving change 2026-10-22-add-photocraft-animation-workflows. Update Purpose after archive.

## Requirements

### Requirement: U77 时间轴、视频图层和视频交付

系统 SHALL 分阶段提供时间轴/帧导航与属性、视频轨道/逐帧编辑、帧导入和浏览器实际支持的动画/视频交付；依赖真实 codec 端口。

#### Scenario: U77 时间轴、视频图层和视频交付的实际结果
- **WHEN** 用户在时间轴与浏览器视频工作流入口使用本项已发布功能并确认有效操作
- **THEN** 多帧工程持续时间/顺序/编辑可往返，播放不新增历史；真实支持的 codec 可导入导出而不只取首帧。

#### Scenario: U77 时间轴、视频图层和视频交付的失败与取消
- **WHEN** 发生codec/容器缺失、累计帧预算超限、损坏媒体、切帧旧结果或用户取消
- **THEN** 拒绝或取消当前操作并说明具体原因；保留原文档及可恢复输入，不提交半成品，不刷新编辑器；会话/偏好类操作失败不得伪造已保存。

### Requirement: 时间轴与浏览器视频工作流（animation-workflow）的发布 SHALL 以可验证工作流为单位

系统 SHALL 仅在逐项参数、命令、真实 WASM、React、身份/历史、保存重开及需要的核验器均接通后开放对应能力；平台暂缓项 MUST 明确记录原因并保持关闭。

#### Scenario: 时间轴与浏览器视频工作流（animation-workflow）的发布 SHALL 以可验证工作流为单位的实际结果
- **WHEN** 当前 UI 加载匹配运行时并使用合法已交付内容
- **THEN** 入口可操作且结果/保存/重开一致；旧工程兼容，空新字段不改变旧身份。

#### Scenario: 时间轴与浏览器视频工作流（animation-workflow）的发布 SHALL 以可验证工作流为单位的失败与取消
- **WHEN** 加载旧运行时、缺宿主端口、未知能力或超预算内容
- **THEN** 拒绝相关写入，不静默丢数据、自动降位深或用压平图冒充可编辑工程。

### Requirement: 时间轴与浏览器视频工作流（animation-workflow）的草稿 SHALL 保持文档归属

系统 SHALL 使用既有草稿/笔迹门禁；内容预览不推进正式修订/hash/历史，确认一次、取消恢复；只读/查看/工具偏好不造内容修改。

#### Scenario: 时间轴与浏览器视频工作流（animation-workflow）的草稿 SHALL 保持文档归属的实际结果
- **WHEN** 用户预览后确认、取消，或请求保存/切文档/关闭
- **THEN** 遵守本域声明的提交边界，非法最后输入不能提交旧候选；未结算操作先经过门禁。

#### Scenario: 时间轴与浏览器视频工作流（animation-workflow）的草稿 SHALL 保持文档归属的失败与取消
- **WHEN** 文档释放/代际变化后旧计算完成，或指针取消
- **THEN** 丢弃晚到结果，不写入其他文档、不补交半笔；保留已经成功结算的独立队列项。
