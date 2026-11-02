# raster-file-interchange Specification

## Purpose
TBD - created by archiving change 2026-10-22-add-photocraft-raster-interchange. Update Purpose after archive.

## Requirements

### Requirement: U05 更多栅格格式的打开

系统 SHALL 维护逐格式读写/位深/metadata/feature 的真实矩阵，接入可用 RGB/U8 解码路径并明确只读项；HDR 和缺 codec 项列为暂缓。

#### Scenario: U05 更多栅格格式的打开的实际结果
- **WHEN** 用户在栅格格式与导出交付入口使用本项已发布功能并确认有效操作
- **THEN** 每个开放扩展名以实际签名字节完成 WASM 解码、预检与可编辑打开，损坏/伪扩展名不误接受。

#### Scenario: U05 更多栅格格式的打开的失败与取消
- **WHEN** 发生颜色位深不支持、解码器缺失、解压超限、数据截断
- **THEN** 拒绝或取消当前操作并说明具体原因；保留原文档及可恢复输入，不提交半成品，不刷新编辑器；会话/偏好类操作失败不得伪造已保存。

### Requirement: U06 通用导出及 Save for Web

系统 SHALL 提供通用导出/Save for Web 的格式、质量、压缩、尺寸、透明及元数据设置、真实编码预览和预设；至少完成 JPEG/WebP 及矩阵内可写 TIFF。

#### Scenario: U06 通用导出及 Save for Web的实际结果
- **WHEN** 用户在栅格格式与导出交付入口使用本项已发布功能并确认有效操作
- **THEN** 预览和交付使用同一设置与快照，真实输出可解码且尺寸正确；导出不覆盖工程保存基线。

#### Scenario: U06 通用导出及 Save for Web的失败与取消
- **WHEN** 发生该格式只读、编码不支持透明、非法参数、旧预览或编码取消
- **THEN** 拒绝或取消当前操作并说明具体原因；保留原文档及可恢复输入，不提交半成品，不刷新编辑器；会话/偏好类操作失败不得伪造已保存。

### Requirement: U07 逐层导出与自动切图

系统 SHALL 提供逐层/所选层 Export As、Layers to Files 和按图层名称生成 Image Assets 的用户触发交付，处理重名、非法文件名和资源包预算。

#### Scenario: U07 逐层导出与自动切图的实际结果
- **WHEN** 用户在栅格格式与导出交付入口使用本项已发布功能并确认有效操作
- **THEN** 包中逐层像素/边界/命名与选择一致，导出报告能定位失败项，不启动后台磁盘生成器。

#### Scenario: U07 逐层导出与自动切图的失败与取消
- **WHEN** 发生重名未解决、目标层失效、包超限或交付取消
- **THEN** 拒绝或取消当前操作并说明具体原因；保留原文档及可恢复输入，不提交半成品，不刷新编辑器；会话/偏好类操作失败不得伪造已保存。

### Requirement: 栅格格式与导出交付（raster-file-interchange）的发布 SHALL 以可验证工作流为单位

系统 SHALL 仅在逐项参数、命令、真实 WASM、React、身份/历史、保存重开及需要的核验器均接通后开放对应能力；平台暂缓项 MUST 明确记录原因并保持关闭。

#### Scenario: 栅格格式与导出交付（raster-file-interchange）的发布 SHALL 以可验证工作流为单位的实际结果
- **WHEN** 当前 UI 加载匹配运行时并使用合法已交付内容
- **THEN** 入口可操作且结果/保存/重开一致；旧工程兼容，空新字段不改变旧身份。

#### Scenario: 栅格格式与导出交付（raster-file-interchange）的发布 SHALL 以可验证工作流为单位的失败与取消
- **WHEN** 加载旧运行时、缺宿主端口、未知能力或超预算内容
- **THEN** 拒绝相关写入，不静默丢数据、自动降位深或用压平图冒充可编辑工程。

### Requirement: 栅格格式与导出交付（raster-file-interchange）的草稿 SHALL 保持文档归属

系统 SHALL 使用既有草稿/笔迹门禁；内容预览不推进正式修订/hash/历史，确认一次、取消恢复；只读/查看/工具偏好不造内容修改。

#### Scenario: 栅格格式与导出交付（raster-file-interchange）的草稿 SHALL 保持文档归属的实际结果
- **WHEN** 用户预览后确认、取消，或请求保存/切文档/关闭
- **THEN** 遵守本域声明的提交边界，非法最后输入不能提交旧候选；未结算操作先经过门禁。

#### Scenario: 栅格格式与导出交付（raster-file-interchange）的草稿 SHALL 保持文档归属的失败与取消
- **WHEN** 文档释放/代际变化后旧计算完成，或指针取消
- **THEN** 丢弃晚到结果，不写入其他文档、不补交半笔；保留已经成功结算的独立队列项。
