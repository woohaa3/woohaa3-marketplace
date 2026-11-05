import type { NativeEditorInputEvent } from "@woohaa3/contracts";

export type NativeImeSnapshot = {
  ime?: { enabled: boolean; cursor_rect: [number, number, number, number] } | null;
  copied_text?: string;
  clipboard_sequence?: number;
};
/** An actual platform text input owns composition. The native texture remains
 * the visual editor; this element supplies WKWebView's NSTextInputClient. */
export function installNativeIme(options: {
  canvas: HTMLElement;
  emit: (event: NativeEditorInputEvent) => void;
  enabled: () => boolean;
}) {
  const { canvas, emit, enabled } = options;
  const document = canvas.ownerDocument, view = document.defaultView!;
  const input = document.createElement("textarea");
  input.autocomplete = "off"; input.autocapitalize = "off"; input.spellcheck = false;
  input.dataset.photocraftNativeIme = "true";
  // A real, positioned edit control is needed for the OS candidate window.
  // It is not a semantic mirror of the texture or an alternative editor UI.
  Object.assign(input.style, { position: "fixed", opacity: "0", width: "1px", height: "18px", padding: "0", border: "0", margin: "0", resize: "none", overflow: "hidden", zIndex: "2147483646", pointerEvents: "none", fontSize: "16px" });
  document.body.append(input);
  let disposed = false, wantsText = false, composing = false, preedit = "";
  let suppressCommitInput: string | null = null, clipboardSequence = -1, copiedText = "";
  let caret: [number, number, number, number] = [0, 0, 1, 18];
  const removers: Array<() => void> = [];
  const active = () => !disposed && enabled();
  const modifiers = (event: KeyboardEvent) => ({ alt: event.altKey, control: event.ctrlKey, shift: event.shiftKey, meta: event.metaKey });
  const clear = () => { input.value = ""; input.setSelectionRange(0, 0); };
  const reset = (notify: boolean) => {
    if (notify && composing) emit({ kind: "ime-preedit", text: "", selection: null });
    composing = false; preedit = ""; suppressCommitInput = null; clear();
  };
  const sendPreedit = (text: string) => {
    if (preedit === text) return;
    preedit = text; emit({ kind: "ime-preedit", text, selection: null });
  };
  const focus = () => {
    if (!active() || !wantsText) return;
    const rect = canvas.getBoundingClientRect();
    input.style.left = `${rect.left + caret[0]}px`;
    input.style.top = `${rect.top + caret[1]}px`;
    input.style.height = `${Math.max(1, caret[3])}px`;
    if (document.activeElement !== input && (document.activeElement === canvas || document.activeElement === document.body)) input.focus({ preventScroll: true });
  };
  function on(target: EventTarget, type: string, listener: EventListener, config?: AddEventListenerOptions) {
    target.addEventListener(type, listener, config); removers.push(() => target.removeEventListener(type, listener, config));
  }
  for (const target of [canvas, input]) {
    for (const type of ["keydown", "keyup"]) on(target, type, raw => {
      const event = raw as KeyboardEvent;
      if (!active()) return;
      event.stopPropagation();
      // Composition keys belong to the platform input client. Printable text
      // comes solely from input/compositionend, never KeyboardEvent.key.
      if (event.isComposing || composing || event.keyCode === 229 || event.key === "Process") return;
      if (type === "keydown") suppressCommitInput = null;
      emit({ kind: "key", key: event.key, code: event.code, pressed: type === "keydown", repeat: event.repeat, modifiers: modifiers(event) });
      const shortcut = event.metaKey || event.ctrlKey;
      const nativeClipboard = shortcut && ["v", "c", "x"].includes(event.key.toLowerCase()) && target === input;
      const printable = event.key.length === 1 && !shortcut && !event.altKey;
      if (target === canvas || (!printable && !nativeClipboard)) event.preventDefault();
    });
  }
  on(input, "compositionstart", () => {
    if (!active()) return;
    composing = true; preedit = ""; suppressCommitInput = null;
    emit({ kind: "ime-preedit", text: "", selection: null });
  });
  on(input, "compositionupdate", raw => {
    if (active() && composing) sendPreedit((raw as CompositionEvent).data ?? "");
  });
  on(input, "compositionend", raw => {
    if (!active()) { reset(false); return; }
    if (!composing) return;
    const text = (raw as CompositionEvent).data ?? input.value;
    composing = false; preedit = "";
    emit({ kind: "ime-preedit", text: "", selection: null });
    if (text) emit({ kind: "ime-commit", text });
    suppressCommitInput = text; clear();
  });
  on(input, "input", raw => {
    const event = raw as InputEvent;
    if (!active()) { reset(false); return; }
    if (composing || event.isComposing) return;
    if (suppressCommitInput !== null && (event.data === suppressCommitInput || event.inputType === "insertFromComposition" || event.inputType === "insertCompositionText")) { suppressCommitInput = null; clear(); return; }
    suppressCommitInput = null;
    if (event.inputType.startsWith("insert") && event.inputType !== "insertFromPaste") {
      const text = event.data ?? input.value;
      if (text) emit({ kind: "ime-commit", text });
    }
    clear();
  });
  on(input, "paste", raw => {
    if (!active()) return;
    const event = raw as ClipboardEvent, text = event.clipboardData?.getData("text/plain");
    if (text !== undefined) { event.preventDefault(); reset(true); if (text) emit({ kind: "ime-commit", text }); }
  });
  for (const type of ["copy", "cut"]) on(input, type, raw => {
    if (!active() || !copiedText) return;
    const event = raw as ClipboardEvent;
    event.clipboardData?.setData("text/plain", copiedText); event.preventDefault();
  });
  on(canvas, "focus", focus);
  on(input, "blur", () => { reset(true); if (active()) emit({ kind: "blur" }); });
  on(view, "blur", () => { reset(true); if (active()) emit({ kind: "blur" }); });
  return {
    update(snapshot: NativeImeSnapshot | null | undefined) {
      if (disposed) return;
      const next = active() && snapshot?.ime?.enabled === true;
      if (snapshot?.ime?.cursor_rect?.every(Number.isFinite)) caret = snapshot.ime.cursor_rect;
      if (snapshot?.clipboard_sequence !== undefined && snapshot.clipboard_sequence !== clipboardSequence && typeof snapshot.copied_text === "string") {
        clipboardSequence = snapshot.clipboard_sequence; copiedText = snapshot.copied_text;
        // Clipboard writes run only for actual egui CopyText output. The DOM copy
        // event path above remains available when async clipboard is unavailable.
        void view.navigator.clipboard?.writeText(copiedText).catch(() => {});
      }
      const previouslyWantedText = wantsText; wantsText = next;
      if (previouslyWantedText && !next) { reset(true); if (document.activeElement === input) { input.blur(); if (active()) canvas.focus({ preventScroll: true }); } }
      if (wantsText) focus();
    },
    focus,
    dispose() { if (disposed) return; reset(true); disposed = true; for (const remove of removers) remove(); input.remove(); },
  };
}
