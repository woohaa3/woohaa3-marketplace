/**
 * 市场示例插件（woohaa3-marketplace 仓库里的 demo）。
 *
 * 它只做一件事：在画布右下角状态气泡里放一条「来自 GitHub 市场」的读数。
 * 目的是验证**整条外部来源链路**——仓库 → Release 资产 → 客户端 github-release 来源
 * → 摘要/签名校验 → 受管安装 → 装配运行，而不是演示复杂业务。
 */
import { createElement } from "react";
import {
  defineExtensionPlugin,
  type Context,
  type ExtensionFrontendDescriptor,
  type SlotsService
} from "@woohaa3/frontend/extension-api";
import { metadata } from "./metadata.js";

/** 状态气泡里的读数；宿主注入的 props 一律不读，避免依赖 slot 的私有形状。 */
const Badge = () => createElement("span", { title: "由 woohaa3-marketplace 仓库发布" }, "市场 demo");

export const descriptor: ExtensionFrontendDescriptor = {
  ...metadata,
  plugin: () => defineExtensionPlugin<Context & { slots: SlotsService }>((ctx) => {
    ctx.effect(() => ctx.slots.register("canvas.toolbar-status", {
      id: "hello-marketplace.badge",
      owner: metadata.extensionId,
      priority: 10,
      wrapsStatus: true,
      render: () => createElement(Badge)
    }), "hello-marketplace-badge");
  }, { name: "hello-marketplace", inject: ["slots"] })
};
