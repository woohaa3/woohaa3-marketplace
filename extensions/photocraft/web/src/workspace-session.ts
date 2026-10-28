/** Only origins and transactions live here. Engine documents/undo/views remain in PhotoCraft. */
import type { Context } from "@woohaa3/frontend/extension-api";
import { resolvePublicUrl } from "@woohaa3/frontend/extension-api";
import { createDirectRuntime, type DirectRuntime, type RuntimeFactory, type RuntimeEvent, type EngineState } from "./direct-runtime.js";
import { resolveImageFocusImage, type ImageFocusImage } from "./focus-targets.js";
import { createWriteBack } from "./write-back.js";
import type { PhotoCraftFrame } from "./protocol.js";

export type Origin = { kind: "node"; canvasId: string; nodeId: string; image: ImageFocusImage } | { kind: "file"; id: string };
export type DocumentEntry = { id: string; lifetime: number; source: Origin; appliedRevision: number | null;
  attempt?: { writer: ReturnType<typeof createWriteBack>; revision: number | null }; conflict?: string; unbound?: boolean };
export type PageLease = { ctx: Context; canvasId: string; generation: number };
export class WorkspaceSession {
  engine: DirectRuntime | null = null;
  state: EngineState | null = null;
  documents = new Map<string, DocumentEntry>();
  page: PageLease | null = null;
  visible = false;
  mounted = false;
  targets = 0;
  recovery: "disabled" | "identity" | null = null;
  error: string | null = null;
  fatal = false;
  opening = false;
  applying = new Set<string>();
  activation = 0;
  targetId: string | null = null;
  /** 按节点安装的只读历史预览（由节点历史经 imageEdit capability 写入）。 */
  historyOverrides = new Map<string, { url: string }>();
  onFrame?: (frame: PhotoCraftFrame) => boolean;
  onEscape?: () => void;
  onClose?: (id: string) => void;
  onEmpty?: () => void;
  private listeners = new Set<() => void>();
  private flight: Promise<DirectRuntime> | null = null;
  private lastNode: { canvasId: string; nodeId: string; image: ImageFocusImage } | null = null;
  private pendingNodes = new Map<string, Promise<string>>();
  private startWaiters = new Set<() => void>();
  private pageWaiters = new Set<() => void>();
  private pendingRefresh: { documentId: string; nodeId: string; revision: number } | null = null;
  private refreshing = false;
  /** 读取失败后暂停自动重试，等用户从错误提示显式重试（design D6）。 */
  private refreshPaused = false;
  private lastRefreshRevision: { documentId: string; revision: number } | null = null;
  private lifetime = 0;
  private generation = 0;
  private disposed = false;
  private abort = new AbortController();
  private unsubscribePage?: () => void;
  constructor(readonly assetBaseUrl: string, private factory: RuntimeFactory = createDirectRuntime) {}
  subscribe = (fn: () => void) => { this.listeners.add(fn); return () => { this.listeners.delete(fn); }; };
  publish = () => { for (const listener of this.listeners) listener(); };
  fail(error: unknown) { this.error = String(error instanceof Error ? error.message : error); this.publish(); }
  async initialize(canvas: HTMLCanvasElement) {
    if (this.engine) return this.engine;
    if (this.disposed) throw new Error("工作区已释放");
    this.flight ??= this.factory({ canvas, assetBaseUrl: this.assetBaseUrl, onEvent: this.receive }).then(engine => {
      if (this.disposed) { engine.dispose(); throw new Error("工作区已释放"); }
      this.engine = engine; return engine;
    }).catch(error => { this.flight = null; this.fail(error); throw error; });
    for (const wake of this.startWaiters) wake();
    return this.flight;
  }
  async ready() {
    if (this.disposed) throw new Error("工作区已释放");
    if (this.engine) return this.engine;
    if (!this.flight) await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => { this.startWaiters.delete(wake); reject(new Error("编辑器尚未挂载，请重试")); }, 60000);
      const wake = () => { clearTimeout(timer); this.startWaiters.delete(wake); resolve(); };
      this.startWaiters.add(wake);
    });
    return this.flight!;
  }
  attachPage(ctx: Context, canvasId: string) {
    this.unsubscribePage?.();
    const lease = { ctx, canvasId, generation: ++this.generation }; this.page = lease;
    const sync = () => {
      for (const doc of this.documents.values()) {
        if (doc.source.kind !== "node" || doc.source.canvasId !== canvasId || this.applying.has(doc.id)) continue;
        // 正在等待历史恢复回流：由 flushCanonicalRefresh 统一判定，避免把恢复结果误标为冲突。
        if (this.pendingRefresh?.documentId === doc.id) continue;
        const current = resolveImageFocusImage(ctx.canvasState.getWorkingCanvas(), doc.source.nodeId);
        doc.unbound = !current;
        doc.conflict = !current ? "源节点已删除或不可访问，可保存本地工程" : current.baselineContentIdentity !== doc.source.image.baselineContentIdentity ? "源内容已变化，请保存工程或明确重载" : undefined;
      }
      void this.flushCanonicalRefresh();
      this.publish();
    };
    const removeCanvas = ctx.canvasState.subscribe(sync);
    const removeStatus = ctx.canvasSession.subscribe?.(() => this.publish());
    this.unsubscribePage = () => { removeCanvas(); removeStatus?.(); }; sync();
    for (const wake of this.pageWaiters) wake();
    return () => {
      if (this.page !== lease) return;
      this.unsubscribePage?.(); this.unsubscribePage = undefined;
      this.hide(false); this.page = null; ++this.generation; for (const wake of this.pageWaiters) wake(); this.publish();
    };
  }
  private requirePage(canvasId: string) {
    if (this.recovery || !this.page || this.page.canvasId !== canvasId) throw new Error("页面绑定已撤销，请返回来源画布后重试");
    return this.page;
  }
  private async navigate(canvasId: string, nodeId: string) {
    if (this.page?.canvasId === canvasId) return this.page;
    const router = this.page?.ctx.appRouter;
    if (!router) throw new Error("请先进入来源画布");
    this.hide(false); router.navigate({ page: "canvas", canvasId, nodeId });
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => { cleanup(); reject(new Error("来源画布尚未就绪，请重新打开该节点")); }, 30000);
      const check = () => { if (this.disposed || this.recovery) { cleanup(); reject(new Error("工作区已撤销")); return; } if (this.page?.canvasId === canvasId) { cleanup(); resolve(); } };
      const cleanup = () => { clearTimeout(timer); this.pageWaiters.delete(check); };
      this.pageWaiters.add(check); check();
    });
    const lease = this.requirePage(canvasId);
    if (lease.ctx.canvasSession.getStatus && !lease.ctx.canvasSession.getStatus().hydrated) {
      await new Promise<void>((resolve, reject) => {
        let remove = () => {};
        const finish = (error?: Error) => { clearTimeout(timer); remove(); this.pageWaiters.delete(check); error ? reject(error) : resolve(); };
        const check = () => {
          if (this.page !== lease) return finish(new Error("来源页面绑定已撤销"));
          const status = lease.ctx.canvasSession.getStatus();
          if (status.phase === "error") finish(new Error(status.error ?? "来源画布加载失败"));
          else if (status.hydrated) finish();
        };
        const timer = setTimeout(() => finish(new Error("来源画布尚未准备好，请重试")), 30000);
        this.pageWaiters.add(check); remove = lease.ctx.canvasSession.subscribe(check); check();
      });
    }
    if (this.page !== lease) throw new Error("来源页面绑定已撤销");
    return lease;
  }
  rememberNode(canvasId: string, nodeId: string, image: ImageFocusImage) { this.lastNode = { canvasId, nodeId, image }; this.publish(); }
  /** 引擎或文档尚未就绪时的目标节点：覆盖层据此把加载进度放到节点上，而不是接管画布。 */
  get pendingNode() { return this.lastNode; }
  async openNode(canvasId: string, nodeId: string, image: ImageFocusImage) {
    this.lastNode = { canvasId, nodeId, image };
    const key = JSON.stringify([canvasId, nodeId]);
    const existing = [...this.documents.values()].find(d => d.source.kind === "node" && d.source.canvasId === canvasId && d.source.nodeId === nodeId);
    if (existing) { if (this.targetId !== existing.id || !this.visible) await this.activate(existing.id); this.lastNode = null; return existing.id; }
    const pending = this.pendingNodes.get(key); if (pending) return pending;
    const flight = this.open({ kind: "node", canvasId, nodeId, image }, async () => {
      const lease = this.requirePage(canvasId);
      const response = await fetch(resolvePublicUrl(image.url), { credentials: "same-origin", signal: this.abort.signal });
      if (!response.ok) throw new Error(`无法读取图片（HTTP ${response.status}）`);
      const bytes = new Uint8Array(await response.arrayBuffer());
      if (this.page !== lease) throw new Error("页面已离开，图片未打开，请重试");
      return bytes;
    }, image.name).then(id => { if (this.lastNode?.canvasId === canvasId && this.lastNode.nodeId === nodeId) this.lastNode = null; return id; }).finally(() => this.pendingNodes.delete(key));
    this.pendingNodes.set(key, flight); return flight;
  }
  async retry() {
    this.error = null;
    // 历史恢复后的 canonical 重读：只重新读取，不重复提交 apply（design D6）。
    if (this.pendingRefresh) { this.refreshPaused = false; this.publish(); this.flushCanonicalRefresh(); return; }
    if (this.lastNode) { const { canvasId, nodeId, image } = this.lastNode; await this.openNode(canvasId, nodeId, image); }
    else if (this.targetId && this.documents.has(this.targetId)) await this.activate(this.targetId);
    this.publish();
  }
  async openFile(file: File) {
    return this.open({ kind: "file", id: crypto.randomUUID() }, async () => new Uint8Array(await file.arrayBuffer()), file.name);
  }
  private async open(source: Origin, read: () => Promise<Uint8Array>, name: string) {
    if (this.recovery) throw new Error("扩展已停用，只能保存或关闭已有文档");
    if (this.opening) throw new Error("正在打开另一份文档，请稍候");
    if (!this.engine) throw new Error("PhotoCraft 尚未就绪");
    if ((this.state?.documents?.length ?? this.documents.size) >= 8) throw new Error("工作区最多保留 8 份文档，请先关闭一份");
    this.engine.settle();
    const previous = this.targetId, wasVisible = this.visible, lease = this.page;
    this.opening = true; this.visible = false; this.engine.hide(); this.error = null; this.publish();
    try {
      const bytes = await read();
      if (this.disposed || this.recovery || this.page !== lease) throw new Error("打开已取消");
      const id = this.engine.open(crypto.randomUUID(), name, bytes);
      this.documents.set(id, { id, lifetime: ++this.lifetime, source, appliedRevision: null });
      await this.activate(id); return id;
    } catch (error) {
      if (wasVisible && previous && this.documents.has(previous) && this.page === lease && !this.recovery && !this.disposed) {
        await this.activate(previous).catch(() => {});
      }
      throw error;
    } finally { this.opening = false; this.publish(); }
  }
  async activate(id: string) {
    const doc = this.documents.get(id); if (!doc || !this.engine) return;
    if (this.recovery) throw new Error("扩展已停用，请先保存或关闭本地文档");
    this.engine.settle(); const token = ++this.activation; this.targetId = id;
    if (doc.source.kind === "node" && !doc.unbound) {
      const page = await this.navigate(doc.source.canvasId, doc.source.nodeId);
      if (token !== this.activation || this.documents.get(id) !== doc) return;
      const result = await page.ctx.canvasNavigation.requestEnterNodeFocus({ nodeId: doc.source.nodeId, kind: "image", preserveOverviewReturn: true });
      if (this.page !== page) return;
      if (!result.ok) throw new Error("无法进入来源节点，可用文件菜单保存工程");
    } else if (this.page) {
      const lease = this.page;
      const result = await lease.ctx.canvasNavigation.requestEnterDocumentWorkspace(id, { preserveOverviewReturn: true });
      if (this.page !== lease) return;
      if (!result.ok) throw new Error("无法切换到文件工作区");
    }
    if (token !== this.activation || this.documents.get(id) !== doc) return;
    this.engine.activate(id); this.state = null; this.visible = true;
    this.engine.show(doc.source.kind === "node" && !doc.unbound); this.publish();
  }
  hide(invalidate = true) { this.visible = false; if (invalidate) ++this.activation; this.engine?.hide(); this.publish(); }
  settle() { this.engine?.settle(); }
  active() { return this.state?.documentId ? this.documents.get(this.state.documentId) : undefined; }
  /** 当前活动文档的来源节点（文件文档或无活动文档时为 null）。 */
  activeNodeId(): string | null {
    const doc = this.active();
    return doc?.source.kind === "node" ? doc.source.nodeId : null;
  }
  historyOverrideFor(nodeId: string): { url: string } | null { return this.historyOverrides.get(nodeId) ?? null; }
  /**
   * 当前草稿状态（change: 2026-10-27-add-image-history-to-photocraft-focus，design D4）。
   *
   * 冲突/致命错误 → error；应用事务进行中 → saving；有未保存修改 → unsaved；否则 saved。
   * 不产生 history-pending：写回回执与历史列表刷新已经覆盖「历史保存中」。
   */
  draftState(): "saved" | "unsaved" | "saving" | "error" {
    const doc = this.active();
    if (!doc) return "saved";
    if (this.fatal || doc.conflict) return "error";
    if (this.refreshing || this.applying.has(doc.id)) return "saving";
    const engineDoc = this.state?.documents?.find((candidate) => candidate.id === doc.id);
    return (engineDoc?.dirty ?? this.state?.dirty) ? "unsaved" : "saved";
  }
  /**
   * 安装/清除只读历史预览 override（design D4/D5）。
   *
   * 目标节点优先用调用方给出的 `nodeId`（多标签下活动文档可能是另一篇）；无 `nodeId` 的
   * `null` 清除全部。覆盖层只对活动节点的 override 呈现只读媒体，恢复当前版本后自行恢复捕获。
   */
  setHistoryOverride(override: { url: string } | null, nodeId?: string): void {
    if (override === null && nodeId === undefined) {
      this.historyOverrides.clear();
      this.publish();
      return;
    }
    const target = nodeId ?? this.activeNodeId();
    if (!target) return;
    if (override === null) this.historyOverrides.delete(target);
    else this.historyOverrides.set(target, { url: override.url });
    this.publish();
  }
  /**
   * 历史恢复后的 canonical 刷新（design D6）。
   *
   * 回执可能早于 WebSocket 回流：先记住待刷新的修订，等工作画布 revision 追上后再读取
   * canonical，settle → 关闭旧 tab → 用 canonical 字节打开同一来源的新 tab。同一修订重复
   * 调用是 no-op；期间出现新编辑不覆盖本地内容，只标记 conflict 提示显式重载。
   */
  refreshFromCanonical(revision: number): void {
    const doc = this.active();
    if (!doc || doc.source.kind !== "node" || !this.engine) return;
    if (this.lastRefreshRevision?.documentId === doc.id && this.lastRefreshRevision.revision === revision) return;
    if (this.pendingRefresh?.documentId === doc.id && this.pendingRefresh.revision === revision) return;
    this.pendingRefresh = { documentId: doc.id, nodeId: doc.source.nodeId, revision };
    this.refreshPaused = false;
    this.flushCanonicalRefresh();
  }
  private async flushCanonicalRefresh(): Promise<void> {
    const pending = this.pendingRefresh;
    if (!pending || this.refreshing || this.refreshPaused || this.disposed || this.recovery) return;
    const doc = this.documents.get(pending.documentId);
    const lease = this.page;
    if (!doc || !lease || doc.source.kind !== "node" || doc.source.canvasId !== lease.canvasId) {
      this.pendingRefresh = null;
      return;
    }
    const canvas = lease.ctx.canvasState.getWorkingCanvas() as { revision?: number } | null | undefined;
    if ((canvas?.revision ?? 0) < pending.revision) return;
    const image = resolveImageFocusImage(canvas, pending.nodeId);
    if (!image) {
      this.pendingRefresh = null;
      this.fail(new Error("无法读取恢复后的节点图片，请从历史面板重试"));
      return;
    }
    // 文档已不是活动节点：不关闭后台 tab，也不覆盖用户正在看的内容。
    if (this.targetId !== doc.id) { this.pendingRefresh = null; return; }
    const dirty = (): boolean => Boolean(this.state?.documents?.find((candidate) => candidate.id === doc.id)?.dirty);
    if (dirty()) {
      if (image.baselineContentIdentity !== doc.source.image.baselineContentIdentity) {
        doc.conflict = "节点已恢复为历史版本，当前仍有未保存修改；请先保存或明确重载";
      }
      this.pendingRefresh = null;
      this.publish();
      return;
    }
    this.refreshing = true;
    try {
      this.engine?.settle();
      const response = await fetch(resolvePublicUrl(image.url), { credentials: "same-origin", signal: this.abort.signal });
      if (!response.ok) throw new Error(`无法读取恢复后的图片（HTTP ${response.status}）`);
      const bytes = new Uint8Array(await response.arrayBuffer());
      if (this.page !== lease || this.recovery || this.disposed) return;
      if (this.documents.get(pending.documentId) !== doc) return;
      if (this.targetId !== doc.id) {
        // 读取期间用户切到别的 tab：不抢回呈现，也不覆盖另一篇的现场；只标记可显式重载。
        doc.conflict = "节点已恢复为历史版本，请明确重载来源";
        this.pendingRefresh = null;
        this.publish();
        return;
      }
      if (dirty()) {
        doc.conflict = "节点已恢复为历史版本，当前仍有未保存修改；请先保存或明确重载";
        this.pendingRefresh = null;
        this.publish();
        return;
      }
      // 解码前不丢旧 tab 之外的任何内容：canonical 已在服务端生效，且本地文档是干净的。
      this.engine!.close(doc.id);
      this.documents.delete(doc.id);
      this.targetId = null;
      // 同步镜像，避免同一事件循环内的后续打开按陈旧文档数误判超限。
      const remaining = this.engine!.state().documents?.filter((candidate) => candidate.id !== doc.id) ?? [];
      this.state = this.state ? { ...this.state, documentId: null, documents: remaining } : this.state;
      try {
        const next = this.engine!.open(crypto.randomUUID(), image.name, bytes);
        this.documents.set(next, {
          id: next, lifetime: ++this.lifetime, source: { ...doc.source, image }, appliedRevision: pending.revision
        });
        this.pendingRefresh = null;
        this.lastRefreshRevision = { documentId: next, revision: pending.revision };
        await this.activate(next);
      } catch (error) {
        // canonical 已恢复，但本地 tab 已关闭：保留可重试的来源，不伪造成成功。
        this.lastNode = { canvasId: doc.source.canvasId, nodeId: pending.nodeId, image };
        this.pendingRefresh = null;
        this.targetId = null;
        this.visible = false;
        this.fail(error);
      }
    } catch (error) {
      // 读取失败：旧 tab 与编辑现场仍在，保留待刷新身份并暂停自动重试，等用户显式重试。
      this.refreshPaused = true;
      this.fail(error);
    } finally {
      this.refreshing = false;
    }
  }
  async apply(id: string) {
    const doc = this.documents.get(id); if (!doc || doc.source.kind !== "node" || !this.engine) throw new Error("此文档没有来源节点");
    if (this.applying.has(id)) return;
    const source = doc.source;
    const page = this.requirePage(source.canvasId);
    if (!page.ctx.canvasSession.isWritable() || doc.conflict) throw new Error(doc.conflict ?? "当前画布只读");
    this.engine.settle();
    doc.attempt ??= { writer: createWriteBack(() => this.requirePage(source.canvasId).ctx, source.canvasId, source.nodeId, source.image), revision: this.engine.state().documents?.find(d => d.id === id)?.revision ?? this.state?.revision ?? null };
    const attempt = doc.attempt;
    this.applying.add(id); this.publish();
    try {
      await attempt.writer.apply(async () => this.engine!.export(id));
      if (this.documents.get(id) !== doc) return;
      doc.appliedRevision = attempt.revision;
      const image = attempt.writer.committedImage(); if (image) source.image = image;
      doc.attempt = undefined; doc.conflict = undefined;
    } finally { this.applying.delete(id); this.publish(); }
  }
  async reload(id: string) {
    const doc = this.documents.get(id);
    if (!doc || doc.source.kind !== "node" || !this.engine) throw new Error("找不到来源节点");
    if (this.applying.has(id)) throw new Error("请等待应用完成后重载");
    const source = doc.source, lease = this.requirePage(source.canvasId);
    const image = resolveImageFocusImage(lease.ctx.canvasState.getWorkingCanvas(), source.nodeId);
    if (!image) throw new Error("源节点不可访问，请保存本地工程");
    this.engine.settle();
    if (this.documents.size >= 8) throw new Error("请先关闭另一份文档，为重载保留安全解码空间");
    const response = await fetch(resolvePublicUrl(image.url), { credentials: "same-origin", signal: this.abort.signal });
    if (!response.ok) throw new Error(`无法读取来源（HTTP ${response.status}）`);
    const bytes = new Uint8Array(await response.arrayBuffer());
    if (this.page !== lease || this.recovery) throw new Error("页面绑定已撤销");
    if (doc.attempt) await doc.attempt.writer.abandon();
    // Decode before closing the old tab. A corrupt replacement must never destroy local work.
    const next = this.engine.open(crypto.randomUUID(), image.name, bytes);
    this.documents.set(next, { id: next, lifetime: ++this.lifetime, source: { ...source, image }, appliedRevision: null });
    this.engine.close(id); this.documents.delete(id); await this.activate(next);
  }
  async close(id: string) {
    const doc = this.documents.get(id); if (!doc || !this.engine) return;
    if (this.applying.has(id)) throw new Error("正在应用，请等待回执后关闭");
    this.engine.settle();
    if (doc.attempt && !this.recovery) await doc.attempt.writer.abandon();
    const ids = this.engine.state().documents?.map(d => d.id) ?? [...this.documents.keys()], index = ids.indexOf(id);
    const next = this.targetId === id ? ids[index - 1] ?? ids[index + 1] : this.targetId;
    this.engine.close(id); this.documents.delete(id);
    const remaining = this.engine.state().documents?.filter(d => d.id !== id) ?? [];
    this.state = { ...this.state!, documentId: null, documents: remaining };
    this.targetId = null; this.publish();
    if (!this.documents.size) { this.onEmpty?.(); return; }
    if (next && !this.recovery) await this.activate(next);
  }
  export(id: string, project = true) { if (!this.documents.has(id) || !this.engine) throw new Error("文档已关闭"); return this.engine.export(id, project); }
  revoke(reason: "disabled" | "identity") {
    this.hide(); this.recovery = reason; this.unsubscribePage?.(); this.unsubscribePage = undefined; this.page = null;
    this.historyOverrides.clear(); this.pendingRefresh = null; this.refreshPaused = false;
    this.abort.abort(); this.abort = new AbortController(); for (const wake of this.pageWaiters) wake(); this.publish(); return this.documents.size > 0;
  }
  adopt() { if (this.recovery === "disabled") { this.recovery = null; this.publish(); } }
  receive = (event: RuntimeEvent) => {
    if (this.disposed) return;
    if (event.type === "photocraft:state") {
      this.state = event.state as EngineState;
      for (const d of this.state.documents ?? []) if (!this.documents.has(d.id)) this.documents.set(d.id, {
        id: d.id, lifetime: ++this.lifetime, source: { kind: "file", id: crypto.randomUUID() }, appliedRevision: null
      });
      for (const d of this.state.documents ?? []) {
        const entry = this.documents.get(d.id);
        if (entry && entry.appliedRevision === null && entry.source.kind === "node") entry.appliedRevision = d.revision;
      }
      if (this.visible && this.state.documentId && this.state.documentId !== this.targetId && !this.opening && !this.recovery) {
        void this.activate(this.state.documentId).catch(error => this.fail(error));
      }
      this.publish();
    } else if (event.type === "photocraft:frame") {
      let accepted = false;
      if (this.visible && !this.opening && event.documentId === this.state?.documentId) accepted = this.onFrame?.(event) ?? false;
      this.engine?.ack(event.id, accepted);
    } else if (event.type === "photocraft:error") { this.fatal = event.fatal === true; this.fail(event.message); }
    else if (event.type === "photocraft:escape") this.onEscape?.();
    else if (event.type === "photocraft:document-request") {
      if (event.kind === "close") this.onClose?.(event.id);
      else void this.activate(event.id).catch(error => this.fail(error));
    }
  };
  dispose() {
    if (this.disposed) return; this.disposed = true; this.abort.abort(); this.hide(); this.unsubscribePage?.(); this.page = null; for (const wake of this.pageWaiters) wake();
    this.engine?.dispose(); this.engine = null; this.documents.clear(); this.listeners.clear();
  }
}
