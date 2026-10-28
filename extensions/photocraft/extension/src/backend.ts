import { accessSync, constants } from "node:fs";
import { isAbsolute } from "node:path";
import { defineConfigSchema, type ExtensionPlugin } from "@woohaa3/contracts";
import { createNativeProjectVerifier, createProcessOnlyVerifier, photocraftMediaFormat } from "../../project-verifier/src/index.js";

/**
 * 站点扩展的 hostPlugin 入口：站点控制面激活时装载，停用时卸载。
 *
 * 站点 backend 与 Cordis 插件现在拿到同一组注册面：能力走 `ctx.capabilities`，媒体格式走
 * `ctx.mediaFormats`。不再需要 `backend` 定义工厂，扩展可以走 hostPlugin 的热换路径。
 */
export function createPhotocraftPlugin(): ExtensionPlugin {
  return {
    name: "photocraft",
    label: "PhotoCraft 图片编辑",
    configPrefix: "extensions.photocraft",
    inject: { optional: ["capabilities", "mediaFormats"] },
    Config: defineConfigSchema({}),
    apply(ctx) {
      if (!ctx.capabilities) throw new Error("宿主不支持能力注册");
      if (!ctx.mediaFormats) throw new Error("宿主不支持可编辑媒体格式");
      // 能力与格式都按 extensionId 记账；停用/回滚时由宿主注销。
      ctx.effect(() => ctx.capabilities!.register("photocraft.edit", { available: true }));
      const binaryPath = process.env.WOOHAA3_PROJECT_VERIFIER_PATH?.trim();
      if (binaryPath) {
        if (!isAbsolute(binaryPath)) throw new Error("核验工具必须为绝对路径");
        accessSync(binaryPath, constants.X_OK);
      }
      const verifier = binaryPath ? createNativeProjectVerifier({ binaryPath }) : createProcessOnlyVerifier();
      ctx.effect(() => () => verifier.dispose());
      ctx.effect(() => {
        const dispose = ctx.mediaFormats!.register(photocraftMediaFormat(verifier));
        return () => dispose();
      });
    }
  };
}
