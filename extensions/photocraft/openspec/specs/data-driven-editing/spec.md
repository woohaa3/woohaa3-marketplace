# data-driven-editing Specification

## Purpose
TBD - created by archiving change 2026-10-22-add-photocraft-history-automation-workflows. Update Purpose after archive.

## Requirements

### Requirement: U76 批处理、脚本、数据集和变量

系统 SHALL 提供前台 Batch/Image Processor/Contact Sheet/Load Stack、受限声明式脚本、文本/像素/显隐变量与数据集导入替换导出；原生 Droplet/任意脚本事件暂缓。

#### Scenario: U76 批处理、脚本、数据集和变量的实际结果
- **WHEN** 用户在历史快照、动作与数据驱动编辑入口使用本项已发布功能并确认有效操作
- **THEN** 有界队列逐文件报告，数据集替换可重复，取消后不启动下一项，不调用原生路径/进程。

#### Scenario: 数据集 MUST 能删除单条且其余条目保持原样
- **WHEN** 用户删除某个数据集
- **THEN** 系统按整份替换语义重发其余全部数据集，其取值（变量名、种类与值）逐字段保持不变；无法取得原始取值时 MUST 拒绝删除而不是用编造的取值重发。

#### Scenario: 「当前生效」的数据集 MUST 跟随同一组而不是同一个下标
- **WHEN** 删除或重排数据集
- **THEN** 生效项按名称重新定位；生效的那组被删掉时清空「当前生效」，并说明画布仍保留它最后一次应用的像素。

#### Scenario: ATN 解析警告 MUST 如实上报
- **WHEN** 导入的 `.atn` 解析出警告（例如尾部多余字节被忽略）
- **THEN** 系统列出逐条警告并说明文件可能不完整，MUST NOT 只报「已导入」；未产生警告时也不得虚构警告。

#### Scenario: U76 批处理、脚本、数据集和变量的失败与取消
- **WHEN** 发生任意代码/后台执行请求、循环脚本事件、无效 CSV/资源或队列超限
- **THEN** 拒绝或取消当前操作并说明具体原因；保留原文档及可恢复输入，不提交半成品，不刷新编辑器；会话/偏好类操作失败不得伪造已保存。

### Requirement: 历史快照、动作与数据驱动编辑（data-driven-editing）的发布 SHALL 以可验证工作流为单位

系统 SHALL 仅在逐项参数、命令、真实 WASM、React、身份/历史、保存重开及需要的核验器均接通后开放对应能力；平台暂缓项 MUST 明确记录原因并保持关闭。

#### Scenario: 历史快照、动作与数据驱动编辑（data-driven-editing）的发布 SHALL 以可验证工作流为单位的实际结果
- **WHEN** 当前 UI 加载匹配运行时并使用合法已交付内容
- **THEN** 入口可操作且结果/保存/重开一致；旧工程兼容，空新字段不改变旧身份。

#### Scenario: 历史快照、动作与数据驱动编辑（data-driven-editing）的发布 SHALL 以可验证工作流为单位的失败与取消
- **WHEN** 加载旧运行时、缺宿主端口、未知能力或超预算内容
- **THEN** 拒绝相关写入，不静默丢数据、自动降位深或用压平图冒充可编辑工程。

### Requirement: 历史快照、动作与数据驱动编辑（data-driven-editing）的草稿 SHALL 保持文档归属

系统 SHALL 使用既有草稿/笔迹门禁；内容预览不推进正式修订/hash/历史，确认一次、取消恢复；只读/查看/工具偏好不造内容修改。

#### Scenario: 历史快照、动作与数据驱动编辑（data-driven-editing）的草稿 SHALL 保持文档归属的实际结果
- **WHEN** 用户预览后确认、取消，或请求保存/切文档/关闭
- **THEN** 遵守本域声明的提交边界，非法最后输入不能提交旧候选；未结算操作先经过门禁。

#### Scenario: 历史快照、动作与数据驱动编辑（data-driven-editing）的草稿 SHALL 保持文档归属的失败与取消
- **WHEN** 文档释放/代际变化后旧计算完成，或指针取消
- **THEN** 丢弃晚到结果，不写入其他文档、不补交半笔；保留已经成功结算的独立队列项。
