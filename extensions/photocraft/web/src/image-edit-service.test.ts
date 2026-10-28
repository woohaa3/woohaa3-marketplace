import { describe, expect, it, vi } from "vitest";
import type { WorkspaceSession } from "./workspace-session.js";
import { createImageEditService } from "./image-edit-service.js";

function fakeSession(overrides: {
  active?: boolean;
  nodeId?: string | null;
  draft?: "saved" | "unsaved" | "saving" | "error";
} = {}) {
  const session = {
    documents: new Map(overrides.active === false ? [] : [["doc", {}]]),
    activeNodeId: () => overrides.nodeId ?? null,
    setHistoryOverride: vi.fn(),
    refreshFromCanonical: vi.fn().mockResolvedValue(undefined),
    draftState: () => overrides.draft ?? "saved"
  } as unknown as WorkspaceSession;
  return session;
}

describe("imageEdit capability adapter", () => {
  it("degrades to an inactive/saved service when no workspace session exists", () => {
    const service = createImageEditService(() => null);
    expect(service.isActive()).toBe(false);
    expect(service.nodeId()).toBeNull();
    expect(service.draftState()).toBe("saved");
    expect(() => service.setHistoryOverride({ url: "/preview" }, "n1")).not.toThrow();
    expect(() => service.refreshFromCanonical(3)).not.toThrow();
  });

  it("projects the active node document and forwards history intents to the session", () => {
    const session = fakeSession({ nodeId: "n1", draft: "unsaved" });
    const service = createImageEditService(() => session);
    expect(service.isActive()).toBe(true);
    expect(service.nodeId()).toBe("n1");
    expect(service.draftState()).toBe("unsaved");
    service.setHistoryOverride({ url: "/api/canvas-node-history/a/n1/e1/preview" }, "n1");
    service.setHistoryOverride(null, "n1");
    service.refreshFromCanonical(7);
    expect(session.setHistoryOverride).toHaveBeenNthCalledWith(1, { url: "/api/canvas-node-history/a/n1/e1/preview" }, "n1");
    expect(session.setHistoryOverride).toHaveBeenNthCalledWith(2, null, "n1");
    expect(session.refreshFromCanonical).toHaveBeenCalledWith(7);
  });

  it("treats a file-only workspace as active without a node identity", () => {
    const session = fakeSession({ nodeId: null, draft: "saved" });
    const service = createImageEditService(() => session);
    expect(service.isActive()).toBe(true);
    expect(service.nodeId()).toBeNull();
    expect(service.draftState()).toBe("saved");
  });
});
