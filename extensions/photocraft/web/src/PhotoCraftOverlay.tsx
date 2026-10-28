/** One mounted canvas per app owner; page transitions only change the presentation lease. */
import { useEffect, useId, useRef, useState } from "react";
import { resolvePublicUrl } from "@woohaa3/frontend/extension-api";
import { createFocusSession } from "./focus-session.js";
import { validDocumentView, validFrame, validRect, type DocumentRect } from "./protocol.js";
import { WorkspaceSession } from "./workspace-session.js";
import "./photocraft-overlay.css";
export type { PhotoCraftMessage } from "./protocol.js";
export type PhotoCraftOverlayProps = { session: WorkspaceSession; onRelease(): void };

export function PhotoCraftOverlay({ session, onRelease }: PhotoCraftOverlayProps) {
  const [, update] = useState(0);
  const canvas = useRef<HTMLCanvasElement>(null), stage = useRef<HTMLDivElement>(null);
  const [hole, setHole] = useState<DocumentRect | null>(null), [shown, setShown] = useState(false);
  const [closeId, setCloseId] = useState<string | null>(null), [downloaded, setDownloaded] = useState(false);
  const [reload, setReload] = useState(false);
  const [busy, setBusy] = useState(false), [boot, setBoot] = useState(0);
  const prepared = useRef<string | null>(null);
  const previewing = useRef(false);
  const maskId = `photocraft-${useId().replace(/:/g, "")}`;
  const page = session.page, state = session.state, active = session.active();
  // 历史入口是 Navigation intent：覆盖层在 body 级持久 surface 上渲染，不能使用宿主 React
  // context，因此直接订阅页面导航快照（change: 2026-10-27-add-image-history-to-photocraft-focus，D3）。
  const navigation = page?.ctx.canvasNavigation;
  const [, refreshNavigation] = useState(0);
  useEffect(() => navigation?.subscribe(() => refreshNavigation(value => value + 1)), [navigation]);
  const navigationState = navigation?.getSnapshot();
  const engineDoc = state?.documents?.find(d => d.id === closeId);
  const closeDoc = closeId ? session.documents.get(closeId) : undefined;
  const node = active?.source.kind === "node" && !active.unbound ? active.source : null;
  const historyOpen = Boolean(node && navigationState?.panel?.type === "node-history" && navigationState.panel.nodeId === node.nodeId);
  const historyPreview = Boolean(node && navigationState?.mode.type === "node-focus"
    && navigationState.mode.kind === "image" && navigationState.mode.nodeId === node.nodeId && navigationState.mode.owner === "history");
  // 只读预览只对活动文档的来源节点生效；多标签下别的节点 override 不应该接管当前画面。
  const preview = node && active?.source.kind === "node" && active.source.nodeId === node.nodeId
    ? session.historyOverrideFor(node.nodeId) : null;
  const targetKey = `${session.activation}:${session.targetId}`;
  if (!session.visible || session.opening || state?.documentId !== session.targetId) prepared.current = null;
  else if (state?.viewReady) prepared.current = targetKey;
  const ready = session.visible && !session.opening && state?.documentId === session.targetId && prepared.current === targetKey;
  const report = (error: unknown) => session.fail(error);
  const exit = async () => {
    try { session.settle(); ++session.activation; if (session.page) await session.page.ctx.canvasNavigation.requestExitNodeFocus(); else session.hide(); }
    catch (error) { report(error); }
  };
  useEffect(() => session.subscribe(() => update(value => value + 1)), [session]);
  useEffect(() => { if (canvas.current) void session.initialize(canvas.current).then(() => { if (boot > 0) return session.retry(); }).catch(report); }, [session, boot]);
  useEffect(() => {
    session.onEscape = () => void exit();
    session.onClose = id => { setReload(false); setDownloaded(false); setCloseId(id); };
    session.onEmpty = () => {
      if (session.recovery) onRelease();
      else void exit();
    };
    return () => { session.onEscape = undefined; session.onClose = undefined; session.onEmpty = undefined; };
  }, [session, onRelease]);
  useEffect(() => {
    if (!page) return;
    const settle = async () => {
      try { session.settle(); return { ok: true as const }; }
      catch (error) { return { ok: false as const, reason: String(error) }; }
    };
    const removeFocus = page.ctx.focusExit.register({ id: "photocraft", hasUnsavedChanges: () => Boolean(session.state?.operation || session.state?.modal), prepare: settle,
      afterPrepare: async () => { session.settle(); } });
    const removeLeave = page.ctx.pageLeave.register({ id: "photocraft", hasUnsaved: () => Boolean(session.state?.operation || session.state?.modal), settle });
    return () => { removeFocus(); removeLeave(); };
  }, [session, page]);
  useEffect(() => {
    const engine = session.engine;
    if (!page || !engine) return;
    const sync = () => engine.input(session.visible && !session.recovery && !closeId && !preview && !page.ctx.dialogs.getSnapshot().isModalActive);
    const remove = page.ctx.dialogs.subscribe(sync); sync(); return remove;
  }, [session, page, closeId, session.visible, session.engine, session.recovery, preview]);
  useEffect(() => {
    // 只读历史预览：停止官方 UI/捕获与输入，撤去聚焦纹理/投影，中央改为受控媒体平面；
    // 返回当前版本后恢复捕获，下一帧按新内容矩形重新投影（design D5/D7）。
    const engine = session.engine;
    if (preview) {
      previewing.current = true;
      setShown(false); setHole(null);
      engine?.show(false);
      engine?.input(false);
      page?.ctx.canvasRuntime.setImageFocusTexture(null);
      page?.ctx.canvasRuntime.setImageFocus(null);
      return;
    }
    if (!previewing.current) return;
    previewing.current = false;
    if (!engine || !session.visible || session.recovery) return;
    const doc = session.active();
    if (doc?.source.kind !== "node") return;
    engine.show(!doc.unbound);
  }, [preview?.url, session, page, session.engine, session.visible, session.recovery]);
  useEffect(() => {
    setShown(false); setHole(null);
    if (!session.visible || !page || !node || preview) { session.onFrame = undefined; return; }
    const focus = createFocusSession(page.ctx.canvasRuntime, node.nodeId, () => stage.current);
    const activation = session.activation;
    session.onFrame = frame => {
      if (activation !== session.activation || frame.documentId !== session.targetId || !validFrame(frame) || !validDocumentView(frame.documentView)
        || frame.revision !== session.state?.revision || String(frame.rect) !== String(session.state?.rect)) return false;
      const accepted = focus.present(frame);
      if (accepted) { setShown(true); setHole(frame.rect); }
      return accepted;
    };
    return () => { session.onFrame = undefined; focus.dispose(); };
  }, [session, page, node?.nodeId, session.visible, session.activation, preview?.url]);
  const download = (id: string) => {
    try {
      const bytes = session.export(id), url = URL.createObjectURL(new Blob([new Uint8Array(bytes)], { type: "application/x-photocraft" }));
      const link = document.createElement("a"); link.href = url;
      link.download = `${state?.documents?.find(d => d.id === id)?.name.replace(/\.[^.]+$/, "") ?? "document"}.pcraft`;
      link.click(); setTimeout(() => URL.revokeObjectURL(url), 30000); setDownloaded(true);
    } catch (error) { report(error); }
  };
  const finishClose = async (apply = false) => {
    if (!closeId) return; setBusy(true);
    try {
      if (apply) { await session.apply(closeId); return; }
      if (reload) await session.reload(closeId); else await session.close(closeId); setCloseId(null); setDownloaded(false);
    } catch (error) { report(error); }
    finally { setBusy(false); }
  };
  // External documents draw the normal opaque pasteboard; only node documents punch through.
  const displayed = node ? shown && ready : ready;
  // A node document is only a layer over the canvas, so it has no reason to cover the app before the
  // first frame exists: keep the canvas visible and report progress on the node itself. The engine
  // load happens before the document entry exists, so the remembered node target also counts.
  const loading = !displayed && !session.recovery && !preview;
  const pending = loading && !session.error && (Boolean(node) || (!active && Boolean(session.pendingNode)));
  // While pending the canvas must stay fully usable (pan/zoom/marquee), so pass input through in the
  // markup as well: a missing stylesheet must not turn the overlay into a transparent click blocker.
  const passthrough = pending ? ({ pointerEvents: "none" } as const) : undefined;
  const loadingText = !session.engine ? "正在载入 PhotoCraft…" : session.opening ? "正在打开图片…" : "正在准备画布…";
  useEffect(() => {
    // 编辑器接管画面前（引擎/首帧未就绪）画布必须保持可滚动/平移：图片聚焦的滚轮与 Space 平移
    // 在没有聚焦取景目标时会被吞掉，这里显式告知宿主仍按普通画布处理。
    const runtime = page?.ctx.canvasRuntime;
    if (!runtime) return;
    runtime.setImageFocusPending(pending);
    return () => runtime.setImageFocusPending(false);
  }, [page, pending]);
  useEffect(() => {
    // The hidden loading canvas cannot receive focus. Restore only after reveal,
    // once per activation, leaving ordinary toolbar/text-field focus alone.
    if (displayed && !session.recovery && !closeId && !page?.ctx.dialogs.getSnapshot().isModalActive) session.engine?.focus();
  }, [session, displayed, session.activation, closeId, session.recovery]);
  return <div className={`photocraft-overlay${pending ? " photocraft-overlay--pending" : ""}`} data-photocraft-overlay="true"
    {...(historyPreview ? { "data-photocraft-history-preview": "true" } : {})} style={passthrough}>
    <header className={`photocraft-overlay__header${pending ? " photocraft-overlay__header--pending" : ""}`} style={pending ? { visibility: "hidden" } : undefined}>
      {!session.recovery ? <button onClick={() => void exit()}>返回画布</button> : null}
      {!session.recovery ? <label className="photocraft-overlay__open">打开文件<input type="file" hidden onChange={event => { const file = event.target.files?.[0]; if (file) void session.openFile(file).catch(report); event.target.value = ""; }} /></label> : null}
      <span className="photocraft-overlay__name">{state?.documentName ?? "PhotoCraft"}</span>
      <span className="photocraft-overlay__status">{session.recovery ? "本地恢复：仅可保存或关闭已有文档"
        : historyPreview ? "历史预览 · 只读"
        : active?.conflict ?? (session.opening ? "正在打开…" : "返回后保留文档 · 刷新前请保存工程")}</span>
      {node && !session.recovery ? <button className="photocraft-overlay__history" aria-pressed={historyOpen} data-photocraft-history="true"
        onClick={() => {
          if (!navigation) return;
          if (historyOpen) void navigation.requestCloseNodeHistory();
          else navigation.openNodeHistory({ nodeId: node.nodeId, kind: "image" });
        }}>历史</button> : null}
      {node && !session.recovery ? <button disabled={session.applying.has(active!.id) || Boolean(preview) || !page?.ctx.canvasSession.isWritable() || Boolean(active?.conflict)} onClick={() => void session.apply(active!.id).catch(report)}>{session.applying.has(active!.id) ? "正在应用…" : "应用到节点"}</button> : null}
      {active?.conflict && node && !session.recovery ? <button onClick={() => { setReload(true); setDownloaded(false); setCloseId(active.id); }}>重载来源</button> : null}
      {active ? <><button onClick={() => download(active.id)}>下载工程</button><button onClick={() => { setReload(false); setDownloaded(false); setCloseId(active.id); }}>关闭文档</button></> : null}
    </header>
    {session.recovery ? <div className="photocraft-overlay__recovery">
      <h2>{session.recovery === "identity" ? "身份已更换，请结算之前的本地文档" : "PhotoCraft 已停用，本地文档仍保留"}</h2>
      <p>下载完成后请确认文件已保存。关闭后会释放本地文档；刷新或关窗会丢失未保存内容。</p>
      {[...session.documents.values()].map(doc => <div key={doc.id}>
        <span>{state?.documents?.find(d => d.id === doc.id)?.name ?? doc.id}</span>
        <button onClick={() => download(doc.id)}>下载工程</button><button onClick={() => { setDownloaded(false); setCloseId(doc.id); }}>关闭文档</button>
      </div>)}
    </div> : null}
    <div ref={stage} className={`photocraft-overlay__stage${pending ? " photocraft-overlay__stage--pending" : ""}`} style={passthrough}>
      <svg width="0" height="0" style={{ position: "absolute" }}><defs>
        <mask id={maskId} maskUnits="objectBoundingBox" maskContentUnits="userSpaceOnUse" x="0" y="0" width="1" height="1" style={{ maskType: "luminance" }}>
          <rect width="100000" height="100000" fill="white" />
          {node && hole && validRect(hole) ? <rect x={hole[0]} y={hole[1]} width={hole[2]} height={hole[3]} fill="black" /> : null}
        </mask>
      </defs></svg>
      <canvas ref={canvas} tabIndex={0} className="photocraft-overlay__frame" style={{ visibility: displayed && !preview ? "visible" : "hidden",
        ...(node && hole && !preview ? { mask: `url(#${maskId})`, WebkitMask: `url(#${maskId})` } : {}) }} />
      {preview ? <img className="photocraft-overlay__preview" data-photocraft-history-media="true"
        src={resolvePublicUrl(preview.url)} alt="历史版本预览" draggable={false} /> : null}
      {pending ? <div className="photocraft-overlay__pending"><span className="photocraft-overlay__spinner" />{loadingText}</div>
        : loading ? <div className="photocraft-overlay__loading">{loadingText}</div> : null}
    </div>
    {session.error ? <div className="photocraft-overlay__error"><p>{session.error}</p>
      <button onClick={() => { session.error = null; session.publish(); if (!session.engine) setBoot(v => v + 1); else void session.retry().catch(report); }}>重试</button>
      <button onClick={() => void exit()}>返回画布</button>
      {session.fatal ? <button onClick={() => { if (window.confirm("重新加载会丢失本窗口所有未保存的 PhotoCraft 文档。确认放弃并重新加载？")) window.location.reload(); }}>放弃本地文档并重新加载</button> : null}
    </div> : null}
    {closeId ? <div className="photocraft-overlay__scrim"><div className="photocraft-overlay__confirm">
      <h2>{reload ? "重载" : "关闭"}“{engineDoc?.name ?? "文档"}”？</h2>
      <p>{downloaded ? "浏览器已启动下载。确认文件已实际保存后，再关闭文档。" : "关闭会丢弃此文档的图层和撤销记录。应用到节点只保存合成图片；保留图层请下载工程。"}</p>
      {closeDoc?.attempt ? <p>已发出的应用可能继续完成，关闭文档不会撤回已提交的修改。</p> : null}
      <div className="photocraft-overlay__actions">
        <button disabled={busy} onClick={() => setCloseId(null)}>取消</button>
        {closeDoc?.source.kind === "node" && !session.recovery && !closeDoc.conflict ? <button disabled={busy} onClick={() => void finishClose(true)}>应用到节点</button> : null}
        <button disabled={busy} onClick={() => download(closeId)}>下载工程</button>
        <button disabled={busy} onClick={() => void finishClose()}>{reload ? (downloaded ? "已保存，重载" : "不保存，重载") : downloaded ? "已保存，关闭" : "不保存，关闭"}</button>
      </div>
    </div></div> : null}
  </div>;
}
