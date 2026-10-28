import { execFileSync } from "node:child_process";
import { cpSync, mkdirSync, rmSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { build } from "esbuild";
import { gzipSync } from "node:zlib";
const root = path.dirname(fileURLToPath(import.meta.url));
// marketplace/extensions/photocraft/extension → 仓库根；client 与该仓库同级（父仓里是子模块）。
const workspace = path.resolve(root, "..");
const repo = path.resolve(workspace, "../../..");
const run = (script, args = []) => execFileSync(process.execPath, [path.join(repo, script), ...args], { cwd: root, stdio: "inherit" });
// Sources are authoring dependencies only; the installable artifact contains all runtime code/assets.
execFileSync("bash", [path.join(workspace, "web/build-app.sh")], { cwd: root, stdio: "inherit" });
const publicDir = path.join(root, "public/photocraft");
rmSync(publicDir, { recursive: true, force: true }); mkdirSync(publicDir, { recursive: true });
cpSync(path.join(workspace, "web/app"), publicDir, { recursive: true });
if (!process.argv.includes("--browser")) {
  rmSync(path.join(root, "dist"), { recursive: true, force: true });
  await build({ entryPoints: [path.join(root, "src/backend.ts")], outfile: path.join(root, "dist/backend.js"), bundle: true, minify: true, sourcemap: false, platform: "node", format: "esm", target: "es2022" });
}
run("client/web/scripts/build-extension-browser.mjs", ["--cwd", root]);

const wasm = readFileSync(path.join(publicDir, "photocraft-web_bg.wasm"));
if (wasm.length > 30_000_000 || gzipSync(wasm).length > 13_000_000) throw new Error("PhotoCraft WASM exceeds its extension budget");
