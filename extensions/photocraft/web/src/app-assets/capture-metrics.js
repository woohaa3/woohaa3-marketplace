/** Explicit diagnostic sink only. No pixels, names or document IDs leave this module. */
export function createCaptureMetrics(sink, clock = globalThis.performance) {
  const enabled = typeof sink === "function";
  let serial = 0;
  const record = (value) => {
    if (!enabled) return;
    try { sink({ scope: "image-edit", timeOrigin: clock.timeOrigin, ...value }); } catch {}
  };
  function begin(frame, stage) {
    if (!enabled) return null;
    const startMs = clock.now(), name = `image-edit:${++serial}:${stage}`;
    try { clock.mark(name); } catch {}
    return { frame, stage, startMs, name };
  }
  function end(token) {
    if (!token) return;
    const durationMs = clock.now() - token.startMs;
    try {
      clock.mark(`${token.name}:end`);
      clock.measure(token.name, token.name, `${token.name}:end`);
    } catch {} finally {
      try { clock.clearMarks(token.name); clock.clearMarks(`${token.name}:end`); clock.clearMeasures(token.name); } catch {}
    }
    record({ frame: token.frame, stage: token.stage, startMs: token.startMs, durationMs });
  }
  return {
    enabled, record, begin, end,
    measure(frame, stage, fn) { const token = begin(frame, stage); try { return fn(); } finally { end(token); } },
    async measureAsync(frame, stage, fn) { const token = begin(frame, stage); try { return await fn(); } finally { end(token); } },
  };
}
