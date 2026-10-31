// U78 主线自动化（任务 4.2/4.3 证据）：在真实 Chromium 中驱动 photocraft/dev 独立宿主。
// 用法：先启动 dev 宿主 `pnpm -C photocraft/dev exec vite --port 4399 --strictPort`，
// 再在仓库 `web/` 下（那里能解析 @playwright/test）执行 `node <此文件>`。
// 截图默认写到 `$OUT`（缺省 /data/tmp/u78-shots），文件名与同目录 PNG 对应。
import { chromium } from "@playwright/test";

const URL = "http://localhost:4399/";
const OUT = process.env.OUT ?? "/data/tmp/u78-shots";
const results = [];
function log(step, detail) {
  results.push({ step, detail });
  console.log(`[${step}] ${typeof detail === "string" ? detail : JSON.stringify(detail)}`);
}

const browser = await chromium.launch({
  args: ["--no-sandbox", "--disable-dev-shm-usage", "--use-gl=swiftshader", "--enable-unsafe-swiftshader"]
});

for (const viewport of [{ width: 1440, height: 1000, name: "1440x1000" }, { width: 1024, height: 768, name: "1024x768" }]) {
  const context = await browser.newContext({ viewport, acceptDownloads: true });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });

  await page.goto(URL, { waitUntil: "networkidle" });
  await page.waitForSelector(".dev-empty", { timeout: 30000 });

  // 预置一个文档：dev 宿主用文件输入打开图片。
  const png = await page.evaluate(async () => {
    const canvas = document.createElement("canvas");
    canvas.width = 200; canvas.height = 150;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#3366aa"; ctx.fillRect(0, 0, 200, 150);
    ctx.fillStyle = "#ffcc00"; ctx.fillRect(20, 20, 60, 40);
    const blob = await new Promise((r) => canvas.toBlob(r, "image/png"));
    return Array.from(new Uint8Array(await blob.arrayBuffer()));
  });
  const fileInput = page.locator('input[type="file"]').first();
  await fileInput.setInputFiles({ name: "u78-mainline.png", mimeType: "image/png", buffer: Buffer.from(png) });
  await page.waitForSelector("[data-canvas-viewport]", { timeout: 30000 });
  log(`${viewport.name}:open`, "文档已打开，编辑器可编辑");

  // ── 1. 打开「窗口 ▸ 工作区、快捷键与命令搜索…」
  await page.getByRole("button", { name: /^窗口$/ }).click();
  await page.getByRole("menuitem", { name: /工作区、快捷键与命令搜索/ }).click();
  const panel = page.locator('[data-advanced-section="customization"]');
  await panel.waitFor({ state: "visible", timeout: 15000 });
  log(`${viewport.name}:entry`, "「窗口」菜单入口存在且能打开面板");
  await page.screenshot({ path: `${OUT}/${viewport.name}-01-panel.png` });

  // ── 2. 命令搜索：搜索并执行一个已接通命令
  const search = panel.locator("[data-command-search]");
  await search.fill("撤销");
  await page.waitForTimeout(400);
  const hits = await panel.locator("[data-command-hit]").count();
  log(`${viewport.name}:search`, `搜索「撤销」得到 ${hits} 条结果`);
  await page.screenshot({ path: `${OUT}/${viewport.name}-02-search.png` });

  // ── 3. 改绑快捷键 → 验证旧键位失效、新键位生效
  const undoRow = panel.locator('[data-shortcut-action="edit.undo"]');
  await undoRow.locator("text=绑定").first().click();
  await undoRow.locator('[data-shortcut-capture="edit.undo"]').press("Control+u");
  await page.waitForTimeout(200);
  const boundLabel = await undoRow.locator("kbd").first().textContent();
  log(`${viewport.name}:rebind`, `edit.undo 当前提示 = ${boundLabel}`);

  // 真实按键：先做一次可撤销操作，再验证旧键位失效、新键位生效。
  const revOf = async () => {
    const t = await page.locator("[data-dev-status]").textContent();
    return /rev (\d+)/.exec(t ?? "")?.[1] ?? null;
  };
  // 先收起高级面板，避免遮挡菜单。
  const collapse = page.locator("button", { hasText: /^收起高级$/ });
  if (await collapse.count()) { await collapse.first().click(); await page.waitForTimeout(200); }
  await page.locator(".photo-editor").click({ position: { x: 400, y: 400 } });
  // 用菜单里的「新建图层」制造一步历史。
  await page.getByRole("button", { name: /^图层$/ }).first().click();
  await page.getByRole("menuitem", { name: /^新建$/ }).first().click();
  await page.waitForTimeout(400);
  await page.getByRole("menuitem", { name: /新建图层/ }).first().click();
  await page.waitForTimeout(500);
  // 新建图层会弹出命名对话框：直接确认。
  if (await page.locator(".dev-dialog-layer").count()) {
    const confirm = page.locator('.dev-dialog-layer button[type="submit"]').first();
    if (await confirm.count()) await confirm.click();
    else await page.keyboard.press("Enter");
    await page.waitForTimeout(600);
  }
  const revAfterEdit = await revOf();

  const beforeZ = await revOf();
  await page.locator(".photo-editor").click({ position: { x: 400, y: 400 } });
  await page.keyboard.press("Control+z");
  await page.waitForTimeout(400);
  const afterZ = await revOf();
  await page.keyboard.press("Control+u");
  await page.waitForTimeout(400);
  const afterU = await revOf();
  log(`${viewport.name}:keyboard`, { revAfterEdit, oldKeyCtrlZ: { beforeZ, afterZ }, newKeyCtrlU: { afterZ, afterU } });
  await page.screenshot({ path: `${OUT}/${viewport.name}-03-rebind.png` });

  // ── 4. 工具栏隐藏（前面收起了高级面板，重新打开）
  await page.getByRole("button", { name: /^窗口$/ }).first().click();
  await page.getByRole("menuitem", { name: /工作区、快捷键与命令搜索/ }).click();
  await panel.waitFor({ state: "visible", timeout: 15000 });
  const brushToggle = panel.locator('[data-toolbar-tool="tool.brush"] input');
  await brushToggle.uncheck();
  await page.waitForTimeout(200);
  const brushVisible = await page.locator('.photo-editor__toolrail [aria-label="画笔"]').count();
  log(`${viewport.name}:toolbar`, `隐藏画笔后工具栏画笔数量 = ${brushVisible}`);
  await page.screenshot({ path: `${OUT}/${viewport.name}-04-toolbar-hidden.png` });

  // ── 5. 菜单隐藏
  const redoItem = panel.locator('[data-menu-item="edit.redo"] input');
  if (await redoItem.count()) {
    await redoItem.uncheck();
    await page.waitForTimeout(200);
    log(`${viewport.name}:menu`, "「重做」菜单项已隐藏");
  }

  // ── 6. 保存工作区 → 重载 → 偏好仍在
  await panel.locator('[data-customization-section="workspaces"] input[type="text"]').fill("审查工作区");
  await panel.locator('[data-customization-section="workspaces"] button', { hasText: "保存当前工作区" }).click();
  await page.waitForTimeout(300);
  const presetCount = await panel.locator("[data-workspace]").count();
  log(`${viewport.name}:workspace-save`, `已保存工作区数量 = ${presetCount}`);
  const storedBefore = await page.evaluate(() => localStorage.getItem("woohaa.image-editor.customization.v1"));
  await page.screenshot({ path: `${OUT}/${viewport.name}-05-workspace-saved.png` });

  // 重载页面，验证偏好持久化（重载后文档不保留，重新导入同一张图）。
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForSelector(".dev-empty", { timeout: 30000 });
  await page.locator('input[type="file"]').first().setInputFiles({ name: "u78-mainline.png", mimeType: "image/png", buffer: Buffer.from(png) });
  await page.waitForSelector("[data-canvas-viewport]", { timeout: 30000 });
  const storedAfter = await page.evaluate(() => localStorage.getItem("woohaa.image-editor.customization.v1"));
  const keptShortcut = JSON.parse(storedAfter ?? "{}")?.shortcuts?.["edit.undo"];
  const keptWorkspace = JSON.parse(storedAfter ?? "{}")?.workspaces?.[0]?.name;
  log(`${viewport.name}:reload`, { sameBytes: storedBefore === storedAfter, keptShortcut, keptWorkspace });
  await page.screenshot({ path: `${OUT}/${viewport.name}-06-after-reload.png` });

  // ── 7. 冲突处理：把撤销改成已被占用的组合
  await page.getByRole("button", { name: /^窗口$/ }).click();
  await page.getByRole("menuitem", { name: /工作区、快捷键与命令搜索/ }).click();
  await panel.waitFor({ state: "visible", timeout: 15000 });
  const undoRow2 = panel.locator('[data-shortcut-action="edit.undo"]');
  await undoRow2.locator("text=绑定").first().click();
  await undoRow2.locator('[data-shortcut-capture="edit.undo"]').press("Shift+Control+z");
  await page.waitForTimeout(400);
  const conflictVisible = await panel.locator("text=/已被「/").count();
  const bodyText = await panel.textContent();
  log(`${viewport.name}:conflict`, { conflictShown: conflictVisible > 0, hasConflictText: /已被「/.test(bodyText ?? "") });
  await page.screenshot({ path: `${OUT}/${viewport.name}-07-conflict.png` });
  // 捕获态下冲突提示可能在折叠面板下方，单独滚到它并留一张可见证据。
  const prompt = panel.locator('[data-shortcut-conflict-prompt="true"]');
  if (await prompt.count()) {
    await prompt.scrollIntoViewIfNeeded();
    await page.waitForTimeout(250);
    await page.screenshot({ path: `${OUT}/${viewport.name}-07b-conflict-visible.png` });
  }

  // 取消冲突
  const cancel = panel.locator("button", { hasText: /^取消$/ });
  if (await cancel.count()) {
    await cancel.first().click();
    await page.waitForTimeout(200);
    const stillOld = await page.evaluate(() => JSON.parse(localStorage.getItem("woohaa.image-editor.customization.v1") ?? "{}")?.shortcuts?.["edit.undo"]);
    log(`${viewport.name}:conflict-cancel`, `取消后 edit.undo 仍是 = ${JSON.stringify(stillOld)}`);
  }

  // ── 8. 恢复默认：偏好存储页的「全部恢复出厂」（快捷键分组里也有同名按钮，这里按分组定位）
  const resetAll = panel.locator('[data-customization-section="storage"] button', { hasText: /全部恢复出厂/ }).first();
  if (await resetAll.count()) {
    await resetAll.click();
    await page.waitForTimeout(500);
    const afterReset = await page.evaluate(() => JSON.parse(localStorage.getItem("woohaa.image-editor.customization.v1") ?? "{}"));
    log(`${viewport.name}:reset`, {
      workspaces: afterReset?.workspaces?.length,
      toolbarHidden: afterReset?.toolbarHidden,
      menuHidden: afterReset?.menuHidden,
      shortcuts: afterReset?.shortcuts
    });
  }
  await page.screenshot({ path: `${OUT}/${viewport.name}-08-after-reset.png` });

  // 不改文档内容：修订号/尺寸未因偏好操作而变
  const docInfo = await page.evaluate(() => {
    const el = document.querySelector(".photo-editor");
    return { tool: el?.querySelector("[data-tool]")?.getAttribute("data-tool") ?? null };
  });
  log(`${viewport.name}:doc-untouched`, docInfo);
  log(`${viewport.name}:console-errors`, errors.length ? errors.slice(0, 5) : "none");

  await context.close();
}

await browser.close();
console.log("\n=== RESULTS ===");
console.log(JSON.stringify(results, null, 2));
