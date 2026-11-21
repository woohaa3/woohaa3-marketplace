import type { CanvasRuntimeService } from "@woohaa3/frontend/extension-api";
import type { DirectRuntime } from "./direct-runtime.js";

/**
 * Notifies the overlay that its renderer visit changed (canvas switch **and** same-canvas
 * renderer recreation). Before notifying, an in-flight Web capture is invalidated
 * synchronously, so a frame captured under the previous visit can neither be presented under the
 * new one nor be acked as accepted there.
 *
 * Legacy hosts expose neither `currentCanvasScope` nor `subscribeCanvasScope`; they keep the
 * previous behaviour (`scope` stays `null` and only a runtime instance swap is observed).
 */
export function watchFocusScope(service: CanvasRuntimeService, engine: DirectRuntime, changed: () => void): () => void {
  let observed: ReturnType<CanvasRuntimeService["runtime"]> = null;
  let scope: unknown = Symbol("unbound");
  let unsubscribeScope = () => {};
  let disposed = false;
  const refresh = () => {
    if (disposed) return;
    const next = service.runtime?.() ?? null;
    const runtimeChanged = next !== observed;
    if (runtimeChanged) {
      unsubscribeScope();
      observed = next;
      unsubscribeScope = next?.subscribeCanvasScope?.(refresh) ?? (() => {});
    }
    const current = next?.currentCanvasScope?.() ?? null;
    if (!runtimeChanged && scope === current) return;
    scope = current;
    engine.invalidateCapture?.();
    changed();
  };
  const unsubscribeRuntime = service.subscribe?.(refresh) ?? (() => {});
  refresh();
  return () => { disposed = true; unsubscribeRuntime(); unsubscribeScope(); };
}
