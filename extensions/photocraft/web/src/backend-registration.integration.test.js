import { it, expect } from "vitest";
import { cp, mkdtemp, mkdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createBackendService } from "../../../../../client/web/backend/src/composition.ts";
it("real installed hostPlugin activation registers the editable project format", async () => {
  const client = fileURLToPath(new URL("../../../../../client", import.meta.url));
  const dir = await mkdtemp(path.join(tmpdir(), "photocraft-host-registration-"));
  const extension = path.join(dir, "extensions/photocraft");
  await mkdir(extension, { recursive: true });
  for (const file of ["extension.json", "package.json", "dist", "browser-dist"]) {
    await cp(new URL(`../../extension/${file}`, import.meta.url), path.join(extension, file), { recursive: true });
  }
  const objects = /* @__PURE__ */ new Map();
  const events = [];
  const service = await createBackendService({
    env: {
      WOOHAA3_REPO_ROOT: client,
      WOOHAA3_EXTENSION_DIRS: [path.join(client, "web/extensions"), path.join(dir, "extensions")].join(","),
      WOOHAA3_CONFIG_FILE: path.join(dir, "config.yml"),
      WOOHAA3_SECRETS_FILE: path.join(dir, "secrets.yml"),
      WOOHAA3_TASK_STORE_PATH: path.join(dir, "task.sqlite"),
      WOOHAA3_CANVAS_STORAGE_BACKEND: "sqlite",
      WOOHAA3_CANVAS_STORAGE_SQLITE_PATH: path.join(dir, "canvas.sqlite"),
      WOOHAA3_APPLICATION_STORE_PATH: path.join(dir, "application.sqlite")
    },
    logger: (entry) => {
      events.push(entry);
    },
    modelsConfig: { version: 1, models: [] },
    enableYjsSync: false,
    mediaStorage: {
      put: async (key, bytes, contentType) => {
        objects.set(key, { bytes, contentType });
      },
      get: async (key) => objects.get(key),
      exists: async (key) => objects.has(key)
    }
  });
  try {
    await service.settled();
    expect(events).toContainEqual(expect.objectContaining({ event: "extension-activated", extensionId: "photocraft" }));
    const format = service.modules().media.formats.get("application/vnd.woohaa.photocraft-project");
    expect(format).toBeDefined();
    await expect(format.validate(new Uint8Array([1]), { maxBytes: 100 })).rejects.toThrow();
  } finally {
    await service.close();
    await rm(dir, { recursive: true, force: true });
  }
}, 3e4);
