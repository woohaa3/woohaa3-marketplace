import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isCompareNode, readCompareState, resolveInputs, type CanvasLike } from "../src/frontend/graph.ts";

function canvas(over: Partial<CanvasLike> & { edges?: Array<[string, string]> } = {}): CanvasLike {
  const nodes = [
    { id: "cmp", type: "image" },
    { id: "a", type: "image" },
    { id: "b", type: "image" },
    { id: "c", type: "image" },
    { id: "t", type: "text" }
  ];
  return {
    document: {
      nodes: over.document?.nodes ?? nodes,
      edges: over.document?.edges ?? (over.edges ?? [["a", "cmp"], ["b", "cmp"]]).map(([source, target]) => ({ source, target }))
    },
    nodeData: over.nodeData ?? {
      cmp: { imageCompare: { schemaVersion: 1 } },
      a: { outputAssetId: "asset-a", title: "猫A" },
      b: { outputAssetId: "asset-b" },
      c: { outputAssetId: "asset-c" }
    },
    assets: over.assets ?? [
      { id: "asset-a", mediaKind: "image", title: "a.png" },
      { id: "asset-b", mediaKind: "image", title: "b.png" },
      { id: "asset-c", mediaKind: "image", title: "c.png" }
    ]
  };
}

describe("readCompareState / isCompareNode", () => {
  it("only recognises a versioned marker", () => {
    assert.equal(readCompareState(undefined), null);
    assert.equal(readCompareState({ imageCompare: { schemaVersion: 2 } }), null);
    assert.equal(readCompareState({ imageCompare: [] }), null);
    assert.deepEqual(readCompareState({ imageCompare: { schemaVersion: 1, conclusion: "有差异" } }), {
      schemaVersion: 1,
      conclusion: "有差异"
    });
  });

  it("a plain image node is not a compare node", () => {
    const c = canvas();
    assert.equal(isCompareNode(c, "cmp"), true);
    assert.equal(isCompareNode(c, "a"), false);
    assert.equal(isCompareNode(c, "missing"), false);
  });

  it("the marker on a non-image node does not count", () => {
    const c = canvas({ nodeData: { t: { imageCompare: { schemaVersion: 1 } } } });
    assert.equal(isCompareNode(c, "t"), false);
  });
});

describe("resolveInputs", () => {
  it("takes the two connected images in edge order (A first)", () => {
    const r = resolveInputs(canvas({ edges: [["b", "cmp"], ["a", "cmp"]] }), "cmp");
    assert.ok(r.ok);
    assert.deepEqual(r.sources.map((s) => s.nodeId), ["b", "a"]);
  });

  it("prefers node title, falls back to asset title", () => {
    const r = resolveInputs(canvas(), "cmp");
    assert.ok(r.ok);
    assert.deepEqual(r.sources.map((s) => s.title), ["猫A", "b.png"]);
  });

  it("fewer than two inputs explains how many", () => {
    const r = resolveInputs(canvas({ edges: [["a", "cmp"]] }), "cmp");
    assert.deepEqual(r, { ok: false, reason: "需要连入两张图片（现在 1 张）" });
    assert.deepEqual(resolveInputs(canvas({ edges: [] }), "cmp"), { ok: false, reason: "需要连入两张图片（现在 0 张）" });
  });

  it("more than two inputs is refused rather than guessing", () => {
    const r = resolveInputs(canvas({ edges: [["a", "cmp"], ["b", "cmp"], ["c", "cmp"]] }), "cmp");
    assert.deepEqual(r, { ok: false, reason: "只能连入两张图片（现在 3 张）" });
  });

  it("ignores non-image sources, the node's own outputs and duplicate edges", () => {
    const r = resolveInputs(
      canvas({ edges: [["a", "cmp"], ["t", "cmp"], ["cmp", "t"], ["a", "cmp"], ["b", "cmp"]] }),
      "cmp"
    );
    assert.ok(r.ok);
    assert.deepEqual(r.sources.map((s) => s.nodeId), ["a", "b"]);
  });

  it("an input without an image asset names the offender", () => {
    const c = canvas();
    delete (c.nodeData as Record<string, unknown>).b;
    const r = resolveInputs(c, "cmp");
    assert.deepEqual(r, { ok: false, reason: "「b」还没有图片产物" });
  });

  it("an input whose asset is not an image is refused", () => {
    const r = resolveInputs(canvas({ assets: [{ id: "asset-a", mediaKind: "image" }, { id: "asset-b", mediaKind: "text" }] }), "cmp");
    assert.equal(r.ok, false);
  });
});
