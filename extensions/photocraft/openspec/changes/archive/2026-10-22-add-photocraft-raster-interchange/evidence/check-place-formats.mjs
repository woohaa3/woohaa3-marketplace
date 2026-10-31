/**
 * 复跑前把 <repo> 与 <fixtures> 换成本机路径：<repo> = 本 worktree 根，
 * <fixtures> = 含 sample.png/sample.tif/… 的夹具目录（见 check-interchange-wasm.mjs 的生成方式）。
 */
/**
 * 复验「置入图片」的 accept 放宽是否诚实：内核真的能把新格式置入吗？
 * 逐格式（tiff/gif/bmp/tga/qoi/pnm/pcx/xpm/dds/ico/webp/jpg + 暂缓 exr）调用
 * inspect_place_asset + place_asset，确认真实结果，而不是只看文件选择器。
 */
import fs from "node:fs";
import path from "node:path";

const dir = "<repo>/photocraft/packages/editor/dist/wasm";
const mod = await import(dir + "/photocraft_editor.js");
mod.initSync({ module: fs.readFileSync(dir + "/photocraft_editor_bg.wasm") });
const editor = new mod.WasmEditor();

const FIX = "<fixtures>";
const base = new Uint8Array(fs.readFileSync(path.join(FIX, "sample.png")));
editor.openImage("base.png", "base", base);

const cases = [
  "sample.tif", "sample.gif", "sample.jpg", "sample.webp", "sample.bmp", "sample.tga",
  "sample.ico", "sample.qoi", "sample.pnm", "sample.pcx", "sample.xpm", "sample.dds",
  "sample.exr"
];

for (const name of cases) {
  const bytes = new Uint8Array(fs.readFileSync(path.join(FIX, name)));
  let inspect;
  try {
    inspect = JSON.parse(editor.inspectPlaceAsset(bytes));
  } catch (error) {
    console.log(`${name.padEnd(12)} inspect 失败: ${String(error).slice(0, 90)}`);
    continue;
  }
  let place;
  try {
    place = JSON.parse(editor.placeAsset(JSON.stringify({ name, assetId: `a-${name}` }), bytes));
  } catch (error) {
    console.log(`${name.padEnd(12)} 预检 ${inspect.format}/${inspect.width}x${inspect.height} → 置入失败: ${String(error).slice(0, 90)}`);
    continue;
  }
  console.log(`${name.padEnd(12)} 预检 ${inspect.format}/${inspect.width}x${inspect.height} → 置入成功 layer=${place.placedLayer} ${place.width}x${place.height}`);
}
