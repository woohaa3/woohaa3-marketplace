/**
 * 滤镜域纯数据声明回归（U46–U49）。
 *
 * 守住三件事：
 * 1. 预算下限与原 `catalog.rs` 的 `MAX_*`、`catalogue().limits` 逐项相同（原 Rust 侧字面量与
 *    单测已随独立子项目移除，这里只保留协议侧字面量）；
 * 2. 明确排除项不进入能力清单，也不能被误当成「已交付」；
 * 3. 本域仍只声明既有的两个能力 id——新增 id 必须由集成负责人同时更新
 *    `fixtures/contract.json`，本域不自作主张。
 */
import { expect, it } from "vitest";
import {
  FILTER_WORKFLOW_KINDS,
  FILTER_WORKFLOW_LIMITS,
  FILTER_WORKFLOW_NON_GOALS,
  feature,
  isFilterWorkflowExcluded
} from "./index.js";

it("预算下限与内核常量逐项一致", () => {
  // 与原 editor-core/src/features/filters/catalog.rs 的 MAX_EFFECTS/MAX_PINS/MAX_PLANES/
  // MAX_PARAMS/MAX_RESOURCE_POINTS 以及 catalogue()["limits"]["seedMax"] 相同（该 Rust 文件
  // 已随独立子项目移除，这里保留为协议侧字面量）。
  expect(FILTER_WORKFLOW_LIMITS).toEqual({
    maxEffects: 32,
    maxPins: 16,
    maxPlanes: 8,
    maxParams: 96,
    maxResourcePoints: 64,
    seedMax: 4_294_967_295
  });
  for (const value of Object.values(FILTER_WORKFLOW_LIMITS)) {
    expect(Number.isSafeInteger(value)).toBe(true);
    expect(value).toBeGreaterThan(0);
  }
});

it("交互形态覆盖普通、随机、画廊、组合、模糊画廊、镜头、摄影与消失点", () => {
  expect([...FILTER_WORKFLOW_KINDS]).toEqual([
    "simple",
    "random",
    "gallery",
    "galleryStack",
    "blurGallery",
    "lens",
    "cameraRaw",
    "vanishingPoint"
  ]);
  expect(new Set(FILTER_WORKFLOW_KINDS).size).toBe(FILTER_WORKFLOW_KINDS.length);
});

it("明确排除项带原因且不进入能力清单", () => {
  for (const goal of FILTER_WORKFLOW_NON_GOALS) {
    expect(goal.reason.length).toBeGreaterThan(0);
    expect(isFilterWorkflowExcluded(goal.id)).toBe(true);
    expect(feature.capabilities.map((entry) => entry.id)).not.toContain(goal.id);
  }
  expect(isFilterWorkflowExcluded("filter.blur.gaussianBlur")).toBe(false);
  expect(FILTER_WORKFLOW_NON_GOALS.map((goal) => goal.id)).toEqual([
    "filter.liquify",
    "layer.smart-filter",
    "format.raw-decode",
    "modes.hdr",
    "filter.native-only"
  ]);
});

it("能力清单保持既有两项，新增命令只走命令白名单", () => {
  // 新增滤镜是**命令**（`feature.*/mod.rs` 的 CONTRIBUTION.commands），不是新能力 id；
  // 能力 id 由共享 fixture 钉住，改动属于集成负责人。
  expect(feature.capabilities.map((entry) => entry.id)).toEqual(["filter.blur-gaussian", "filter.sharpen-usm"]);
  expect(new Set(feature.capabilities.map((entry) => entry.order)).size).toBe(2);
  expect(feature.capabilities.every((entry) => entry.stage === "P6")).toBe(true);
});
