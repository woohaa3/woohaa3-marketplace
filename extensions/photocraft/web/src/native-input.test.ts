// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import type { NativeEditorInputEvent } from "@woohaa3/contracts";
import { installNativeIme } from "./native-input.js";
const disposers: Array<() => void> = [];
afterEach(() => { disposers.splice(0).forEach(dispose => dispose()); document.body.replaceChildren(); vi.restoreAllMocks(); });
function setup() {
  const canvas = document.createElement("div"); canvas.tabIndex = 0; document.body.append(canvas);
  vi.spyOn(canvas, "getBoundingClientRect").mockReturnValue({ left: 20, top: 30, x: 20, y: 30, width: 400, height: 300, right: 420, bottom: 330, toJSON() {} });
  const events: NativeEditorInputEvent[] = [];
  const agent = installNativeIme({ canvas, emit: event => events.push(event), enabled: () => true }); disposers.push(() => agent.dispose());
  canvas.focus(); agent.update({ ime: { enabled: true, cursor_rect: [12, 18, 2, 22] } });
  const input = document.querySelector<HTMLTextAreaElement>("[data-photocraft-native-ime]")!;
  return { canvas, events, agent, input };
}
it("positions a real text input at the native caret and returns focus when text ownership ends", () => {
  const { canvas, agent, input } = setup();
  expect(document.activeElement).toBe(input); expect(input.style.left).toBe("32px"); expect(input.style.top).toBe("48px");
  agent.update({ ime: null }); expect(document.activeElement).toBe(canvas);
});
it("commits an IME composition once despite update and trailing input events", () => {
  const { input, events } = setup();
  input.dispatchEvent(new CompositionEvent("compositionstart", { data: "" }));
  input.dispatchEvent(new KeyboardEvent("keydown", { key: "Process", isComposing: true }));
  for (let i = 0; i < 2; i++) input.dispatchEvent(new CompositionEvent("compositionupdate", { data: "你好" }));
  input.dispatchEvent(new InputEvent("input", { inputType: "insertCompositionText", data: "你好", isComposing: true }));
  input.dispatchEvent(new CompositionEvent("compositionend", { data: "你好" }));
  input.dispatchEvent(new InputEvent("input", { inputType: "insertFromComposition", data: "你好" }));
  expect(events.filter(e => e.kind === "ime-commit")).toEqual([{ kind: "ime-commit", text: "你好" }]);
  expect(events.filter(e => e.kind === "ime-preedit" && e.text === "你好")).toHaveLength(1);
  expect(events.some(e => e.kind === "key")).toBe(false);
});
it("printable keys use input text and do not manufacture duplicate text commits", () => {
  const { input, events } = setup();
  input.dispatchEvent(new KeyboardEvent("keydown", { key: "a", code: "KeyA", bubbles: true, cancelable: true }));
  expect(events.filter(e => e.kind === "ime-commit")).toHaveLength(0);
  input.dispatchEvent(new InputEvent("input", { inputType: "insertText", data: "a" }));
  expect(events.filter(e => e.kind === "ime-commit")).toEqual([{ kind: "ime-commit", text: "a" }]);
});
it("pastes once, forwards copy output once, and clears composition on window blur", async () => {
  const { input, events, agent } = setup();
  const writeText = vi.fn(async () => {}); Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText } });
  agent.update({ copied_text: "selected", clipboard_sequence: 1, ime: { enabled: true, cursor_rect: [0, 0, 1, 20] } });
  agent.update({ copied_text: "selected", clipboard_sequence: 1, ime: { enabled: true, cursor_rect: [0, 0, 1, 20] } });
  expect(writeText).toHaveBeenCalledTimes(1);
  const paste = new Event("paste", { cancelable: true }); Object.defineProperty(paste, "clipboardData", { value: { getData: () => "pasted" } }); input.dispatchEvent(paste);
  input.dispatchEvent(new InputEvent("input", { inputType: "insertFromPaste", data: "pasted" }));
  expect(events.filter(e => e.kind === "ime-commit")).toEqual([{ kind: "ime-commit", text: "pasted" }]);
  input.dispatchEvent(new CompositionEvent("compositionstart")); input.dispatchEvent(new CompositionEvent("compositionupdate", { data: "未完成" })); window.dispatchEvent(new Event("blur"));
  expect(events.at(-1)).toEqual({ kind: "blur" });
  agent.dispose(); expect(document.querySelector("[data-photocraft-native-ime]")).toBeNull();
});
it("keeps editor shortcuts and composition keys from also reaching canvas navigation", () => {
  const { canvas, input, events } = setup();
  const hostShortcut = vi.fn(); window.addEventListener("keydown", hostShortcut);
  try {
    canvas.dispatchEvent(new KeyboardEvent("keydown", { key:"z", code:"KeyZ", metaKey:true, bubbles:true, cancelable:true }));
    input.dispatchEvent(new KeyboardEvent("keydown", { key:"Process", isComposing:true, bubbles:true }));
    expect(hostShortcut).not.toHaveBeenCalled();
    expect(events.filter(event=>event.kind==="key")).toHaveLength(1);
  } finally { window.removeEventListener("keydown",hostShortcut); }
});
