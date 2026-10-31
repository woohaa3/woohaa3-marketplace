## 0. 实施顺序与完成规则

本 change 按 P0 → P1a → P1b → P2 → P3 → P4 → P5 → P6 → P7 分阶段交付；P5/P6/P7 的独立项可在契约稳定后推进。每项实现及对应验证完成后立即勾选。尚未验收的硬件／外部应用项目保持未勾选；不得以某个阶段完成代替整个 change 完成。

状态说明：`[x]` = 实现与可自动化的验证都已完成；`[ ]`（带「待人工验证」） = 实现已完成、只有真实设备／外部应用证据缺失，证据与原因记在 `verification.md`。

## 1. P0：实现矩阵与共享契约

- [x] 1.1 核对每项新能力的上游算法、当前 Rust 包装、WASM 绑定、React 入口、内容身份与核验器现状，产出 `notes/capability-matrix.md`，区分已完成基础和待实现链路。
- [x] 1.2 建立 PSD 导入／导出逐特性矩阵和 fixture 清单；包含像素、组、像素蒙版、混合、填充不透明度、文字、三类调整和样式，后续智能对象／新调整／矢量按阶段扩展。（矩阵即代码：`rust/crates/editor-core/src/psd.rs::compatibility_matrix`，由 `matrix_lists_every_declared_feature_with_a_reason` 覆盖；P4/P5/P7 项已随阶段追加。）
- [x] 1.3 在 protocol、Rust 和共享 fixture 中定义分阶段能力／版本／参数／错误；保持未交付项关闭，验证 UI、命令与运行时不一致时拒绝可写实例。（`capability.rs`、`image-project-editor.ts`、`tests/fixtures/contract.json` 三处一致；`verify_handshake` / `verifyPhotocraftHandshake` 与两端测试覆盖。）
- [x] 1.4 在 `rust/project-limits.json` 定义 PSD／跨文档载荷和 ABR／笔刷资源上限，补 TS/Rust 累计预算及分配前预检验证，保持现有工程上限。（新增 PSD／载荷／ABR／滤镜／选区／直方图／文档数上限；`limits_agree.rs` 与 `image-project.test.ts` 双端核对；`charge_bytes`/`charge_pixels` 累计预算。）
- [x] 1.5 定义无 Woohaa 身份的公共工作区协调接口、素材字节端口、跨文档剪贴板与子文档关联；验证核心边界。（`EditorWorkspaceController` 的 `copyLayers`/`pasteLayers`/`placeAsset`/`beginSmartChild`…；`dev-workspace.ts` 的 A/B 装配；边界门禁通过。）

## 2. P1a：笔刷基础工作流与手感

- [x] 2.1 扩展 BrushSettings／命令／WASM，支持间距、角度、圆度和翻转；保留现有圆笔默认值与画笔／橡皮独立设置。（`brush.dynamics` 补丁 + `dynamicsPatch`；`paint.stroke` 的 `brush` 深合并；画笔/橡皮分别记忆。）
- [x] 2.2 接通大小／不透明度／流量的压力控制、最小值和压力曲线；传递每个 coalesced sample，定义鼠标与无 tilt 数据回退，验证缩放不改变源坐标笔迹。（`ShapeDynamics`/`Transfer`/`ResponseCurve`；`photo-editor-canvas` 已逐 sample 传 pressure；鼠标无 pressure 用内核对默认值；预览与正式笔迹共用源坐标。）
- [x] 2.3 接通平滑量、拉绳及追赶选项，补轻压点击、长笔、抬笔收尾、取消和迟到采样的一笔一步回归。（`Smoothing` 全字段；`tests_stroke_selection.rs`、`interaction_state.rs`、`editor-workspace-tools.test.ts` 覆盖取消/一步/迟到。）
- [x] 2.4 实现预设选择器、真实内核笔尖／笔迹预览和笔刷设置面板，提供程序性硬圆／软圆和有来源的默认采样预设。（`brush-panels.tsx`、`brush_library.rs` 的 5 个程序性默认预设；预览走 `render_stroke`，`preview_uses_the_real_kernel_and_is_deterministic`。）
- [x] 2.5 实现预设保存／覆盖／重命名／删除／分组和版本化存储；验证存储失败保留内存、旧／坏数据不覆盖有效库，工具设置不制造工程 dirty。（`snapshot`/`restore` 带签名与摘要；`brush-library-state.test.ts` 覆盖持久化失败与坏快照；`brush_preset_writes_never_dirty_the_document_and_gate_on_drafts`。）
- [ ] 2.6 在真实数位笔设备验证轻压、压力渐变、缩放光标、延迟和长笔收尾，按 verification 模板记录硬件和未解决差距。— **待人工验证**：当前环境为 Windows 桌面（NVIDIA RTX 4060 + Intel UHD 770，驱动 32.0.15.7270），但本次会话未连接数位板，也没有可核对的笔设备；不能用鼠标合成压力数据冒充。

## 3. P1b：ABR 与高级笔刷参数

- [x] 3.1 包装 ABR v1/v2/v6 预检与解析，接通 WASM；覆盖截断、数量／像素／解压超限、未知参数及整批拒绝。（`brush_library::inspect_abr` + `inspectBrushAbr`；`abr_inspection_rejects_bad_files_and_reports_without_publishing` 覆盖坏文件、超限、空分组、整批不发布。）
- [x] 3.2 实现 ABR 导入报告及明确的“仅导入可支持笔刷”，发布和持久化原子化，支持本地 PNG 定义静态采样笔尖。（`PendingAbr` + `commit_abr` 原子替换同组；`import_tip` + `image_tip`（暗像素作画、裁剪、预算）；图片采样测试。）
- [x] 3.3 接通形状动态、散布／数量、纹理、颜色动态和 opacity／flow 传递；使用固定 seed fixture 核对笔迹预览和实际渲染。（`dynamicsPatch` 编译 + `PREVIEW_SEED` 固定种子；`preview_uses_the_real_kernel_and_is_deterministic` 断言可复现且不同笔尖结果不同。）
- [x] 3.4 接通经过像素 fixture 验证的绘画混合模式、明确目标和蒙版约束；不解锁尚未接通的双重／湿画／特殊笔尖。（`brush.paint-blend-modes` 开放；`check_preset` 拒绝 `dual_brush`/`wet_edges`；非目标清单保持关闭。）
- [ ] 3.5 验证 ABR 导入、编辑预设、重载、蒙版绘画和工程重开完整流程，并在真实设备测量批量导入和大笔尖响应。— **部分待人工验证**：导入/编辑/重载/蒙版绘画/工程重开的功能链路已由自动化覆盖；批量导入与大笔尖的**响应测量**需真实设备，未采集。

## 4. P2：跨文档编辑与像素素材置入

- [x] 4.1 实现版本化 LayerTransferBundle 的 Rust 导出／导入及 TS 严格解码，覆盖层组、像素蒙版、样式、图案、文字和现有调整资源。（`transfer.rs`：签名+版本+摘要+工程容器；`export_and_import_round_trip_a_group_with_mask_styles_and_text`。）
- [x] 4.2 实现工作区范围剪贴板、原位／中心粘贴、复制合并，以及图层／资源身份重映射；验证源关闭后可粘贴、等价资源复用和冲突引用改写。（`copyLayers`/`pasteLayers` + `DevWorkspace`；图案冲突换新 id 并改写，等价资源复用；`pattern_identity_conflicts_are_remapped_and_all_references_rewritten`。）
- [x] 4.3 实现目标候选文档预检与一步原子粘贴，覆盖锁定、只读、超限、坏载荷、过期目标、重复回执，失败不改变双方文档或历史。（`canPasteLayerTransfer` + `paste` 在候选文档构造后才提交；`corrupt_truncated_or_tampered_payloads_are_rejected_without_touching_the_target`、`export_refuses_empty_selection_and_paste_refuses_layer_overflow`。）
- [x] 4.4 实现公共图片字节置入入口和像素层置入预览／确认／取消，名称／MIME／实际解码一致；不把打开文件误作置入。（`placeAsset`/`inspectPlaceAsset` + `place-file.ts`；`place_asset_validates_real_decoding_and_writes_one_layer` 断言真实解码与坏字节不建层。）
- [x] 4.5 在 dev 最小双文档装配及 Woohaa 既有工作区复用上述功能；宿主提供文件／节点图片字节适配，验证不新增私有核心依赖。（`dev-workspace.ts` + `dev-workspace.test.ts`；Woohaa `place-file.ts` 只做选择/字节转发；`place-file.test.ts`；边界门禁通过。）

## 5. P3：受限 PSD 导入导出

- [x] 5.1 实现 PSD v1 RGB/U8 头部与结构预算预检，拒绝 PSB／其他位深色彩、损坏及资源超限，在候选文档完成解析。（`psd::inspect_psd` + `import_psd`；`preflight_rejects_wrong_container_version_color_and_depth_before_pixels`。）
- [x] 5.2 按 P0 矩阵接通可编辑图层、组、像素蒙版、混合、填充不透明度及已验证文字／调整／样式；逐项记录不支持结构。（`compatibility_matrix()` + `import_psd_structure` 损失清单；`round_trip_keeps_groups_masks_text_and_adjustments_editable`。）
- [x] 5.3 实现导入结果报告、默认拒绝和显式扁平副本打开，验证原文档不被替换、文件扩展名和 MIME 不绕过能力门。（`import_psd_flat` 报告丢失结构；`import_replaces_the_document_only_after_a_successful_candidate` 断言坏 PSD 不改当前文档；`openPsd` 拒绝路径由 `editor-workspace-tools.test.ts` 覆盖。）
- [x] 5.4 实现 PSD 导出预检、逐层损失报告、默认可编辑导出与明确栅格化副本选择；导出使用冻结修订和现有文件交付端口。（`inspect_psd_export`/`export_psd`；`export_reports_lossy_layers_and_requires_explicit_rasterization`；`deliverPsd` 只报 `download-started`，不推进基线。）
- [x] 5.5 完成 PSD → 编辑 → `.pcraft` → PSD fixture 往返和非法／不支持数据回归，PSD 导出不得清除原工程未保存状态。（`import_replaces_the_document_only_after_a_successful_candidate` 的往返 + `exportPsd` 不推进基线由 `editor-workspace-tools.test.ts` 断言；`export_rejects_non_rgb_and_linked_sources_without_byte_output`。）
- [ ] 5.6 在真实 Photoshop 验证受支持结构可继续编辑、合成效果和副本转换报告，提交版本／文件／截图证据并更新矩阵。— **待人工验证**：当前环境无 Photoshop，也未交换外部 PSD fixture；不能用本引擎自导自读代替。

## 6. P4：嵌入智能对象与子文档

- [x] 6.1 审核并接通已有智能对象 Rust 基础、WASM 和能力门，补转换／嵌入置入／替换／显式栅格化入口与参数。（`smart_convert`/`smart_copy`/`smart_source_edit` 复用；`convertToSmartObject`/`replaceSmartContents`/`rasterizeSmartObject`；`placeAsset` 的 `smartObject` 模式。）
- [x] 6.2 实现实例与 contentsId 关系、普通复制共享源和“通过拷贝新建”独立源，保持变换／样式并验证 undo/redo。（`smart_copy.rs` 已有 `CopyKind`；`duplicate_smart_object`；`smart_object_identity_is_shared_inside_the_payload_and_independent_across_documents`。）
- [x] 6.3 在共享协调器实现编辑内容、同源子文档复用、父关联／源基线、文档名额及嵌套预算；dev 和 Woohaa 均消费同一协议。（`begin_smart_child` 复用同源；`opening_a_child_reports_association_and_reuses_the_same_source`；文档名额沿用工作区政策。）
- [x] 6.4 实现显式更新父文档：完整候选、共享实例重算、父一步历史和子基线同步；相同 attemptId 回执重试不重复提交，无变化不增历史。（`update_smart_parent`；`changed_child_writeback_recomputes_all_instances_in_one_step_and_is_idempotent`、`unchanged_child_writeback_adds_no_parent_history`。）
- [x] 6.5 实现父修订冲突、只读、关闭／删层／撤销失效后的保留与恢复，提供重载父源、导出子工程或独立对象副本，验证不覆盖父修改。（`reload_smart_child`/`export_smart_child`/`detach_smart_child`；`parent_revision_change_is_a_conflict_and_keeps_the_child_file`。）
- [x] 6.6 将嵌入源加入跨文档载荷、PSD 矩阵、内容 hash、TS／原生核验；验证普通复制／独立复制／跨文档复制及循环／深度／累计解压上限。（载荷 `smart_sources` + 身份独立化；矩阵已列 `smart-object.embedded`；`smart_source.rs` 既有循环/深度/累计预算测试继续通过。）
- [ ] 6.7 验证 A/B 父文档＋智能对象子文档切换、回写、失败重试、关闭和工程重开，并在 Photoshop 验证声明支持的嵌入 PSD 子集。— **部分待人工验证**：A/B 切换与回写/重试/关闭/重开已由 Rust 与 dev 工作区测试覆盖；Photoshop 侧嵌入子集需外部应用，未采集。

## 7. P5：调整层、直方图和高级选区

- [x] 7.1 实现色阶、R/G/B 曲线、自然饱和度和黑白调整的内核参数、面板、重编、实时预览／取消和一步确认。（`adjustment_preview` 白名单扩到 `levels`/`vibrance`/`blackWhite`；`AdvancedAdjustmentPanel`；既有草稿测试覆盖取消与一步。）
- [x] 7.2 实现当前层／可见合成的 RGB／亮度直方图及迟到结果丢弃，验证只读采样不修改工程或历史。（`adjustment_ext::histogram` + `HistogramPanel` 代际丢弃；`histogram_samples_real_pixels_and_reports_counts`、`histogram_does_not_change_the_document_or_history`、控制器 `stale` 用例。）
- [x] 7.3 新调整接通合成、蒙版、内容身份、工程往返和核验，并逐项扩展 PSD／剪贴板矩阵。（`document_content::adjustment_content`、`identity.rs`、TS 规范化、核验器白名单；`new_adjustments_shapes_and_vector_masks_join_the_content_identity` 与 TS 对应用例。）
- [x] 7.4 实现魔棒容差／连续／采样模式、快速选择和色彩范围，统一替换／增加／减去／相交，覆盖取消、锁定和异步过期。（命令已加入白名单；选择统一走 `mode`；取消/锁定由既有选区门禁与 `adjustment_ext` 目标检查覆盖。）
- [x] 7.5 实现扩展／收缩／平滑／边界及手工边缘细化面板，提供半径／羽化／对比度／边缘偏移和选区／蒙版输出，拒绝非法参数。（`SelectionDraft` + `SelectionModifyPanel`、`RefineEdgePanel`；`selection_modify_rejects_missing_selection_bad_radius_and_empty_result`、`refine_edge_params_are_bounded_and_name_the_output`。）
- [x] 7.6 验证选区精确源坐标、边缘预览、一次确认／取消、已有蒙版保护、切 Tab 门禁和内容 hash 边界；不开放 AI 主体／发丝入口。（`selection_modify_draft_previews_then_commits_one_history_step` 断言 hash 不变；`hasActiveDraft` 门禁；`selection.ai-subject`/`hair-refine` 保持非目标。）

## 8. P6：修饰工具和参数滤镜

- [x] 8.1 为修饰接通统一笔迹草稿、冻结采样基线、当前层／当前及以下合成采样与可写像素目标检查。（`RetouchBaseline` + `prepare_retouch` + `writable_pixel_layer`；`retouch_requires_a_source_point_and_a_writable_target`。）
- [x] 8.2 实现仿制图章采样点、对齐开关和来源提示，覆盖源失效、无采样点、缩放、选区、取消和一步撤销。（`prepare_retouch` 强制 `source`/`offset`；`RetouchPanel` 的采样点/对齐；`replay_baseline_preview_matches_commit_and_does_not_recursively_sample`。）
- [x] 8.3 实现修复／污点修复预览及采样来源；先验证上游结果，对缺失实时预览补通路后才开放。（`LIVE_RETOUCH` 表明 clone/heal 走上游 `LiveRetouch`；污点修复明确采样来源；不支持的组合在 `prepare_retouch` 拒绝。）
- [x] 8.4 实现模糊／锐化／涂抹和减淡／加深／海绵的参数、目标、强度和实时笔迹；拒绝不可写文字／智能对象，不悄悄栅格化。（`REPLAY_RETOUCH` 基线+重放保证预览与提交一致；`writable_pixel_layer` 拒绝文字/智能对象/锁定层。）
- [x] 8.5 实现高斯模糊、USM 锐化的选区／像素层参数草稿、确认／取消及工程输出；不引入智能滤镜栈。（`FilterDraft` + `filter_draft_previews_commits_one_step_and_rejects_bad_params`；`layer.smart-filter` 保持非目标。）
- [ ] 8.6 验证源快照不递归污染、透明边、蒙版／选区限制、长笔、保存门禁和失败恢复，在真实 GPU／数位笔环境记录效果与响应。— **部分待人工验证**：源快照隔离、门禁与失败恢复已自动覆盖；真实 GPU／数位笔的效果与响应测量未采集（本机有真实 GPU，但本次会话未做交互式长笔测量）。

## 9. P7：构图、文字和矢量

- [x] 9.1 实现裁剪比例／尺寸和明确的删除裁剪像素模式、图像尺寸重采样、画布尺寸锚点／背景，内核原子更新相关层／蒙版／路径／选区／智能实例并一次撤销。（`ComposeDraft` + `ComposePanel`；`crop_draft_previews_then_commits_one_step_and_rejects_out_of_bounds`、`canvas_and_image_size_validate_anchor_budget_and_keep_original_on_failure`。）
- [x] 9.2 实现独立平移工具、标尺、参考线、网格和文档／图层吸附及临时关闭，验证缩放坐标、辅助线反馈且不修改内容 hash。（`ViewAids` + `snap_point`（屏幕阈值/zoom）+ `ViewAidsPanel`；`view_aids_and_snapping_never_touch_document_content`。）
- [x] 9.3 实现图层名称／类型过滤，保证显示过滤不修改层树、内容选择或渲染。（`LayerFilter` + `filterLayers` + `LayerFilterPanel`；`layer_filter_only_hides_list_rows`。）
- [x] 9.4 实现水平文字行距／字距／字偶距策略／基线偏移及真实字体可用性／替换提示，复用内核布局、IME 和整次文字草稿边界。（`typography_patch` + `TypographyPanel` + `checkFont`；`typography_patch_accepts_supported_params_and_rejects_others`；内容身份含排版。）
- [x] 9.5 实现钢笔直线／贝塞尔路径、节点／控制柄和闭合／取消，矩形／圆角矩形／椭圆的填充／描边；内核保存权威几何。（`photo-editor-canvas` 的 `onPenPoint` + `PathOverlay`/`usePathDraft`；`shape.create` 的 `kind` 覆盖矩形/圆角/椭圆/路径；`vector_geometry_is_validated_and_applied_through_the_kernel`。）
- [x] 9.6 实现路径转选区、矢量蒙版及与像素蒙版的组合、变换和撤销；接通指纹、工程核验、剪贴板与 PSD 的已验证子集。（`vector_mask`/`path_to_selection`；`document_content` 的 `path_hash` 与 `vectorMask`；核验器接受有界矢量蒙版/形状；矩阵已列 `vector.shape-mask`。）
- [ ] 9.7 验证文字／路径／矢量蒙版保存重开、跨文档资源及真实 Photoshop 可编辑往返，不支持属性保持明确拒绝／转换报告。— **部分待人工验证**：保存重开、跨文档与拒绝报告已自动覆盖；Photoshop 可编辑往返需外部应用，未采集。

## 10. 综合验收与文档

- [x] 10.1 按阶段运行相关包类型／单元／交互／Rust 回归及真实 WASM 构建；完成新内容的 TS／原生核验和原生 verifier 构建，记录真实命令结果。（`pnpm -C photocraft run check`、`run rust:test`、`run wasm`、`run verifier` 均通过；结果与产品体积记在 `verification.md`。）
- [x] 10.2 运行核心无宿主依赖检查、Woohaa 适配回归及受影响 frontend／contracts 类型检查；引用和模块入口变化后运行 `pnpm codemap:check`，跨目录接入运行 `pnpm boundary:check`。（四项全部通过；`packages.generated.md` 归一化后与 HEAD 一致。）
- [ ] 10.3 在真实 GPU 的电脑和 Pad 正常窗口完成独立 dev／Woohaa 综合操作：笔刷蒙版、A/B 复制、PSD、子文档回写、调色、选区修边、修饰、文字矢量；记录取消／超限／冲突／关闭恢复。— **待人工验证**：本机确有真实 GPU（NVIDIA RTX 4060 + Intel UHD 770），但本次会话是无显示的自动化会话，未做交互式走查；Pad 设备未接入。
- [ ] 10.4 按 verification 模板记录真笔性能、外部 Photoshop 兼容及未通过项；未实测的项目保留待人工验证，不以单元测试或软件渲染代替。— **已记录未采集项与真实原因**；真笔与 Photoshop 数据仍待人工验证。
- [x] 10.5 更新子项目 README、公共包接口说明和主仓受影响模块地图，核对能力清单、兼容矩阵、实际 UI 与工程核验一致后再准备归档。（子项目 README、`packages/editor/README.md`、`docs/code-map/photocraft.md`、`notes/capability-matrix.md` 已更新；三处能力清单一致由 fixture 测试保证。）
