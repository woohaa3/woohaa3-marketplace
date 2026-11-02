# cross-document-editing Specification

## Purpose
TBD - created by archiving change 2026-10-22-complete-photocraft-webui-editing. Update Purpose after archive.

## Requirements

### Requirement: 跨文档复制 SHALL 产生自包含层载荷

同一工作区 SHALL 支持复制图层／组及复制合并结果到另一个文档，载荷 SHALL 由内核导出且带版本、摘要和完整依赖资源。源文档关闭 SHALL 不使已复制载荷失效；复制 SHALL 不改变源内容，跨文档剪切不在本能力范围。

#### Scenario: 关闭源后粘贴
- **WHEN** 用户在 A 复制含蒙版、样式、图案、文字和调整的层组，关闭 A 后在 B 粘贴
- **THEN** B 得到完整可编辑结构和原层间顺序，不依赖 A 的活动内核或宿主节点

#### Scenario: 无效载荷
- **WHEN** 载荷版本不支持、摘要不符、资源缺失或超过预算
- **THEN** 拒绝粘贴，目标文档、工作区有效剪贴板和历史保持原状

### Requirement: 粘贴 SHALL 原子迁移身份与布局

粘贴 SHALL 在候选文档中重映射层和资源身份，等价资源可以复用，冲突资源不得覆盖。原位粘贴 SHALL 保持源像素位置，普通粘贴 SHALL 将整个集合定位到目标可见中心；一次确认 SHALL 仅产生目标一步历史。

#### Scenario: 资源身份冲突
- **WHEN** A 的图案 id 与 B 已有不同内容的图案 id 相同
- **THEN** 导入分配新身份并改写全部引用，双方原内容保留，撤销一次移除本次粘贴

#### Scenario: 目标失效或只读
- **WHEN** 粘贴期间目标关闭、变为只读、存在活动草稿或候选超限
- **THEN** 拒绝提交，不留下部分图层或资源；恢复可编辑状态后允许重新尝试

### Requirement: 图片置入 SHALL 通过共享字节端口

编辑器 SHALL 提供置入当前文档的显式入口，经公共端口读取名称、MIME 和字节并核验真实类型。置入 SHALL 支持像素层，智能对象能力开放后 SHALL 支持嵌入对象；预览确认和取消 SHALL 使用同一草稿。打开独立文件 SHALL 不隐式置入当前文档。

#### Scenario: 置入图片并调整位置
- **WHEN** 用户选择图片置入，调整预览位置后确认
- **THEN** 新层与布局作为一步历史提交，可在保存重开后继续编辑

#### Scenario: 取消或来源不可读
- **WHEN** 用户取消选择／预览，或文件不可读、类型不符及超限
- **THEN** 不新增图层，不访问任意宿主路径或未经端口授权的远端资源
