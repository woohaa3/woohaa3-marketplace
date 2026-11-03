import { defineConfigSchema, type ExtensionPlugin } from "@woohaa3/contracts";

const Config = defineConfigSchema({
  note: { kind: "string", reload: "hot", label: "备注", description: "画布工具栏上显示的文案" }
});

/**
 * host 入口。宿主读 `extensions.canvas-note`，校验后调用 apply。
 * 路由是相对的：对外是 `/api/extensions/canvas-note/note`。
 */
export function createCanvasNotePlugin(): ExtensionPlugin<typeof Config.fields> {
  return {
    name: "canvas-note",
    label: "画布备注",
    configPrefix: "extensions.canvas-note",
    inject: { required: ["log"], optional: ["webServer"] },
    Config,
    apply(ctx, config) {
      ctx.log.scope("canvas-note")({ event: "canvas-note-activated" });
      if (!ctx.webServer) return;
      ctx.webServer.registerHttp({
        route: "note",
        method: "GET",
        auth: "public",
        purpose: "read",
        handle: async (_req, res) => {
          const bytes = new TextEncoder().encode(
            JSON.stringify({ note: config.note ?? "还没有备注" })
          );
          res.setHeader("content-type", "application/json; charset=utf-8");
          res.setHeader("content-length", String(bytes.byteLength));
          res.writeHead(200);
          res.end(bytes);
        }
      });
    }
  };
}
