// U78 补充主线（任务 4.2 的剩余子能力）：工具栏**顺序**、工作区应用后的**真实面板几何**、
// **工具选项记忆**跨重载恢复、菜单隐藏的实际渲染效果、解绑后键位真的不再触发。
//
// 上一版主线只覆盖了「隐藏画笔」「保存工作区后存储字节不变」，没有验证：
//   - 工具栏顺序调整是否真的改变了渲染顺序；
//   - 应用工作区后侧栏宽度是否当场变化（而不是只写了一个键）；
//   - 画笔尺寸记忆是否在**重载后**真的恢复（不是只在同一会话内）。
//
// 用法：先启动 dev 宿主
//   pnpm -C photocraft/dev exec vite --port 4399 --strictPort
// 再在仓库 `web/` 下（那里能解析 @playwright/test）执行 `node <此文件>`。
// 截图写到 `$OUT`（缺省 /data/tmp/u78-extra）。
import { chromium } from "@playwright/test";

const URL = "http://localhost:4399/";
const OUT = process.env.OUT ?? "/data/tmp/u78-extra";
const STORAGE_KEY = "woohaa.image-editor.customization.v1";
const PANEL_KEY = "woohaa.image-editor.panels.v1";
const results = [];

function log(step, detail) {
  results.push({ step, detail });
  console.log(`[${step}] ${typeof detail === "string" ? detail : JSON.stringify(detail)}`);
}

async function importImage(page) {
  const bytes = await page.evaluate(async () => {
    const canvas = document.createElement("canvas");
    canvas.width = 200;
    canvas.height = 150;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#3366aa";
    ctx.fillRect(0, 0, 200, 150);
    ctx.fillStyle = "#ffcc00";
    ctx.fillRect(20, 20, 60, 40);
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
    return Array.from(new Uint8Array(await blob.arrayBuffer()));
  });
  await page.waitForSelector(".dev-empty", { timeout: 30000 });
  await page.locator('input[type="file"]').first().setInputFiles({
    name: "u78-extra.png",
    mimeType: "image/png",
    buffer: Buffer.from(bytes)
  });
  await page.waitForSelector("[data-canvas-viewport]", { timeout: 30000 });
  return bytes;
}

async function openPanel(page) {
  await page.getByRole("button", { name: /^窗口$/ }).first().click();
  await page.getByRole("menuitem", { name: /工作区、快捷键与命令搜索/ }).click();
  const panel = page.locator('[data-advanced-section="customization"]');
  await panel.waitFor({ state: "visible", timeout: 15000 });
  return panel;
}

/** 工具栏按钮顺序（只取可见工具按钮，过滤掉颜色/默认等尾部控件）。 */
async function toolOrder(page) {
  return await page.evaluate(() => {
    const rail = document.querySelector(".photo-editor__toolrail");
    if (!rail) return [];
    return [...rail.querySelectorAll('button[aria-label]')]
      .map((button) => button.getAttribute("aria-label"))
      .filter((label) => label && !/前背景色|恢复默认/.test(label));
  });
}

/** 侧栏实际渲染宽度（真实布局，不是存储里的数字）。 */
async function sidebarWidth(page) {
  return await page.evaluate(() => {
    const sidebar = document.querySelector(".photo-editor__sidebar");
    return sidebar ? Math.round(sidebar.getBoundingClientRect().width) : null;
  });
}

const browser = await chromium.launch({
  args: ["--no-sandbox", "--disable-dev-shm-usage", "--use-gl=swiftshader", "--enable-unsafe-swiftshader"]
});

for (const viewport of [{ width: 1440, height: 1000, name: "1440x1000" }, { width: 1024, height: 768, name: "1024x768" }]) {
  const context = await browser.newContext({ viewport });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(String(error)));
  page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });

  await page.goto(URL, { waitUntil: "networkidle" });
  const pngBytes = await importImage(page);

  // ── 0. 搜索执行真的改动文档（spec 核心场景），最近使用随之置顶
  const revOf = async () => {
    const text = await page.locator("[data-dev-status]").textContent();
    return /rev (\d+)/.exec(text ?? "")?.[1] ?? null;
  };
  const revBeforeSearch = await revOf();
  const panel0 = await openPanel(page);
  const search = panel0.locator("[data-command-search]");
  await search.fill("新建图层");
  await page.waitForTimeout(500);
  const searchHits = await panel0.locator("[data-command-hit]").evaluateAll((nodes) => nodes.map((node) => node.getAttribute("data-command-hit")));
  await panel0.locator('[data-command-hit="layer.new.layer"] button').first().click();
  await page.waitForTimeout(700);
  // 新建图层会弹命名对话框：直接确认。
  if (await page.locator(".dev-dialog-layer").count()) {
    await page.locator('.dev-dialog-layer button[type="submit"]').first().click();
    await page.waitForTimeout(700);
  }
  const revAfterSearch = await revOf();
  const executeNotice = await panel0.locator("[data-customization-notice]").textContent().catch(() => null);
  await search.fill("");
  await page.waitForTimeout(400);
  const recentFirst = await panel0.locator("[data-command-hit]").evaluateAll((nodes) => nodes.slice(0, 3).map((node) => node.getAttribute("data-command-hit")));
  log(`${viewport.name}:search-execute`, {
    hits: searchHits,
    revBefore: revBeforeSearch,
    revAfter: revAfterSearch,
    documentChanged: revBeforeSearch !== revAfterSearch,
    notice: (executeNotice ?? "").trim(),
    recentFirst
  });
  await page.screenshot({ path: `${OUT}/${viewport.name}-00-search-execute.png` });

  // ── 1. 工具栏顺序：把「画笔」上移一位，确认偏好真的改变
  const panel = await openPanel(page);
  const before = await toolOrder(page);
  log(`${viewport.name}:order-before`, before);

  // 设置面板按偏好顺序列出全部工具；找到画笔行并点上移。
  const brushRow = panel.locator('[data-toolbar-tool="tool.brush"]');
  await brushRow.scrollIntoViewIfNeeded();
  await brushRow.locator("button", { hasText: /^上移$/ }).click();
  await page.waitForTimeout(300);
  const after = await toolOrder(page);
  // 魔棒/快速选择、修复/修饰是共用按钮组，一个按钮占两个槽位，渲染顺序不一定逐个移动。
  // 偏好是否真的改变以存储的 toolbarOrder 为准，渲染顺序只作旁证。
  const storedOrder = await page.evaluate((key) => {
    const raw = JSON.parse(localStorage.getItem(key) ?? "null");
    return raw?.toolbarOrder ?? null;
  }, STORAGE_KEY);
  const idxBefore = storedOrder ? storedOrder.indexOf("tool.brush") : -1;
  log(`${viewport.name}:order-moved`, {
    renderedBefore: before,
    renderedAfter: after,
    storedOrder,
    brushAt: idxBefore,
    // 出厂顺序里 brush 在 wand/quick 之后；上移一位后应排在 tool.quick 之前。
    movedBeforeQuick: idxBefore >= 0 && storedOrder.indexOf("tool.quick") > idxBefore
  });
  await page.screenshot({ path: `${OUT}/${viewport.name}-01-order.png` });

  // ── 2. 工作区：先改侧栏宽度，再保存工作区，然后改回，最后应用工作区看是否当场恢复
  const widthBefore = await sidebarWidth(page);
  await page.evaluate((key) => {
    const raw = JSON.parse(localStorage.getItem(key) ?? "null");
    if (!raw) return;
    raw.width = 420;
    localStorage.setItem(key, JSON.stringify(raw));
  }, PANEL_KEY);
  await page.waitForTimeout(200);

  const nameInput = panel.locator('[data-customization-section="workspaces"] input[type="text"]');
  await nameInput.fill("几何工作区");
  await panel.locator('[data-customization-section="workspaces"] button', { hasText: /保存当前工作区/ }).click();
  await page.waitForTimeout(400);
  const savedLayout = await page.evaluate((key) => {
    const raw = JSON.parse(localStorage.getItem(key) ?? "null");
    const preset = raw?.workspaces?.[0];
    return preset ? { name: preset.name, panelLayout: preset.panelLayout } : null;
  }, STORAGE_KEY);
  log(`${viewport.name}:workspace-saved`, {
    widthBefore,
    savedName: savedLayout?.name ?? null,
    savedWidth: savedLayout?.panelLayout?.width ?? null
  });
  await page.screenshot({ path: `${OUT}/${viewport.name}-02-workspace-saved.png` });

  // 把侧栏宽度改回较窄的值，再应用工作区，验证是否**当场**变宽（而不是等重开）。
  await page.evaluate((key) => {
    const raw = JSON.parse(localStorage.getItem(key) ?? "null");
    if (!raw) return;
    raw.width = 280;
    localStorage.setItem(key, JSON.stringify(raw));
  }, PANEL_KEY);
  await page.waitForTimeout(200);
  const narrowed = await sidebarWidth(page);

  const applyButton = panel.locator('[data-workspace] button', { hasText: /^应用$/ }).first();
  await applyButton.click();
  await page.waitForTimeout(500);
  const appliedWidth = await sidebarWidth(page);
  const appliedNotice = await panel.locator('[data-customization-notice="true"]').textContent().catch(() => null);
  log(`${viewport.name}:workspace-applied`, {
    narrowed,
    appliedWidth,
    immediateRelayout: appliedWidth !== narrowed,
    notice: (appliedNotice ?? "").trim()
  });
  await page.screenshot({ path: `${OUT}/${viewport.name}-03-workspace-applied.png` });

  // ── 3. 工具选项记忆：把画笔尺寸改成 96，切到橡皮再切回，并重载后确认恢复
  await panel.locator("button", { hasText: /^收起高级$/ }).first().click().catch(() => {});
  await page.waitForTimeout(200);
  // 选中画笔工具
  await page.locator('.photo-editor__toolrail button[aria-label="画笔"]').click();
  await page.waitForTimeout(300);
  // 画笔参数栏：尺寸是 label 为「尺寸」的 number 输入（其余是 range）。
  const sizeInput = page.locator('.photo-editor__options-group label', { hasText: /^尺寸/ }).locator('input').first();
  let sizeSet = null;
  if (await sizeInput.count()) {
    await sizeInput.fill("96");
    await sizeInput.dispatchEvent("input");
    await sizeInput.blur();
    await page.waitForTimeout(500);
    sizeSet = await sizeInput.inputValue().catch(() => null);
  }
  log(`${viewport.name}:brush-size-set`, { sizeSet });

  // 切到橡皮再切回，验证同会话内记忆
  await page.locator('.photo-editor__toolrail button[aria-label="橡皮"]').click();
  await page.waitForTimeout(300);
  await page.locator('.photo-editor__toolrail button[aria-label="画笔"]').click();
  await page.waitForTimeout(400);
  const sameSessionSize = await page.locator('.photo-editor__options-group label', { hasText: /^尺寸/ }).locator('input').first().inputValue().catch(() => null);
  log(`${viewport.name}:brush-size-same-session`, { value: sameSessionSize });

  const storedOptions = await page.evaluate((key) => {
    const raw = JSON.parse(localStorage.getItem(key) ?? "null");
    return raw?.toolOptions ?? null;
  }, STORAGE_KEY);
  log(`${viewport.name}:tool-options-stored`, storedOptions);

  // 重载后重新导入同一张图，确认跨会话恢复
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForSelector(".dev-empty", { timeout: 30000 });
  await page.locator('input[type="file"]').first().setInputFiles({
    name: "u78-extra.png", mimeType: "image/png", buffer: Buffer.from(pngBytes)
  });
  await page.waitForSelector("[data-canvas-viewport]", { timeout: 30000 });
  await page.locator('.photo-editor__toolrail button[aria-label="画笔"]').click();
  await page.waitForTimeout(600);
  const reloadedSize = await page.locator('.photo-editor__options-group label', { hasText: /^尺寸/ }).locator('input').first().inputValue().catch(() => null);
  log(`${viewport.name}:brush-size-after-reload`, { value: reloadedSize });
  await page.screenshot({ path: `${OUT}/${viewport.name}-04-brush-restored.png` });

  // ── 4. 菜单隐藏：隐藏「重做」后，菜单里真的没有它
  const panel2 = await openPanel(page);
  const redoToggle = panel2.locator('[data-menu-item="edit.redo"] input');
  if (await redoToggle.count()) {
    await redoToggle.uncheck();
    await page.waitForTimeout(300);
  }
  await panel2.locator("button", { hasText: /^收起高级$/ }).first().click().catch(() => {});
  await page.waitForTimeout(200);
  await page.getByRole("button", { name: /^编辑$/ }).first().click();
  await page.waitForTimeout(400);
  const editMenuText = await page.locator('[role="menu"]').first().textContent().catch(() => "");
  log(`${viewport.name}:menu-hidden`, {
    redoHidden: !/重做/.test(editMenuText ?? ""),
    stillHasUndo: /撤销/.test(editMenuText ?? "")
  });
  await page.screenshot({ path: `${OUT}/${viewport.name}-05-menu-hidden.png` });
  await page.keyboard.press("Escape");

  // ── 5. 解绑：把工具字母键解绑后，真实按键不再切换工具
  const panel3 = await openPanel(page);
  const brushShortcutRow = panel3.locator('[data-shortcut-action="tool.brush"]');
  await brushShortcutRow.scrollIntoViewIfNeeded();
  const unbind = brushShortcutRow.locator("button", { hasText: /^解绑$/ }).first();
  if (await unbind.count()) {
    await unbind.click();
    await page.waitForTimeout(300);
  }
  await panel3.locator("button", { hasText: /^收起高级$/ }).first().click().catch(() => {});
  await page.waitForTimeout(200);
  // 先切到非画笔工具，再按 B，验证不再切到画笔。
  await page.locator('.photo-editor__toolrail button[aria-label="矩形选框"]').click();
  await page.waitForTimeout(200);
  await page.locator(".photo-editor").click({ position: { x: 500, y: 400 } });
  await page.keyboard.press("b");
  await page.waitForTimeout(400);
  const pressedTool = await page.evaluate(() => {
    const active = document.querySelector('.photo-editor__toolrail button[aria-pressed="true"]');
    return active?.getAttribute("aria-label") ?? null;
  });
  log(`${viewport.name}:unbind-tool-key`, { pressedTool, stillMarquee: /选框/.test(pressedTool ?? "") });
  await page.screenshot({ path: `${OUT}/${viewport.name}-06-unbound.png` });

  // ── 6. 共享按钮组：隐藏组首不带走整组，两个都隐藏才消失（最易写错的规则）
  const panelGroup = await openPanel(page);
  const wandToggle = panelGroup.locator('[data-toolbar-tool="tool.wand"] input');
  await wandToggle.scrollIntoViewIfNeeded();
  await wandToggle.uncheck();
  await page.waitForTimeout(400);
  const afterHideWand = await toolOrder(page);
  // 组首隐藏后按钮应仍然存在（改由组内可见成员代表），而不是整组消失。
  const groupSurvived = afterHideWand.some((label) => /快速选择|魔棒/.test(label ?? ""));
  await panelGroup.locator('[data-toolbar-tool="tool.quick"] input').uncheck();
  await page.waitForTimeout(400);
  const afterHideBoth = await toolOrder(page);
  const groupGone = !afterHideBoth.some((label) => /快速选择|魔棒/.test(label ?? ""));
  log(`${viewport.name}:shared-group`, {
    afterHideWand,
    groupSurvived,
    afterHideBoth,
    groupGone
  });
  // 复原，避免影响后续步骤。
  await panelGroup.locator('[data-toolbar-tool="tool.wand"] input').check();
  await panelGroup.locator('[data-toolbar-tool="tool.quick"] input').check();
  await page.waitForTimeout(300);

  // ── 7. 偏好往返与损坏恢复（spec 要求的失败/取消路径）
  const panel4 = await openPanel(page);
  // 导出：触发下载并读取内容，再用它导入回来。
  const [download] = await Promise.all([
    page.waitForEvent("download", { timeout: 15000 }),
    panel4.locator('[data-customization-section="storage"] button', { hasText: /导出 JSON/ }).click()
  ]);
  const exportPath = await download.path();
  const exportedText = exportPath ? await (await import("node:fs/promises")).readFile(exportPath, "utf8") : "";
  log(`${viewport.name}:export`, {
    filename: download.suggestedFilename(),
    bytes: exportedText.length,
    hasShortcuts: Object.keys(JSON.parse(exportedText || "{}").shortcuts ?? {}).length > 0
  });

  // 损坏的 JSON：必须整体拒绝，且保留原设置不丢。
  const beforeCorrupt = await page.evaluate((key) => localStorage.getItem(key), STORAGE_KEY);
  await panel4.locator('[data-customization-import="true"] input[type="file"]').setInputFiles({
    name: "broken.json", mimeType: "application/json", buffer: Buffer.from("{ this is not json")
  });
  await page.waitForTimeout(600);
  const afterCorrupt = await page.evaluate((key) => localStorage.getItem(key), STORAGE_KEY);
  const corruptMessage = await panel4.locator('[data-customization-message="true"]').textContent().catch(() => null);
  log(`${viewport.name}:import-broken`, {
    storageUnchanged: beforeCorrupt === afterCorrupt,
    message: (corruptMessage ?? "").trim().slice(0, 60)
  });

  // 版本失配：说明是版本问题，不是笼统「格式非法」。
  await panel4.locator('[data-customization-import="true"] input[type="file"]').setInputFiles({
    name: "wrong-version.json", mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify({ version: 99, shortcuts: {}, toolbarHidden: [], menuHidden: [], workspaces: [] }))
  });
  await page.waitForTimeout(600);
  const versionMessage = await panel4.locator('[data-customization-message="true"]').textContent().catch(() => null);
  log(`${viewport.name}:import-version`, { message: (versionMessage ?? "").trim().slice(0, 80) });

  // 合法文件导入成功后恢复设置。
  await panel4.locator('[data-customization-import="true"] input[type="file"]').setInputFiles({
    name: "prefs.json", mimeType: "application/json", buffer: Buffer.from(exportedText)
  });
  await page.waitForTimeout(700);
  const importedNotice = await panel4.locator('[data-customization-notice="true"]').textContent().catch(() => null);
  log(`${viewport.name}:import-ok`, { notice: (importedNotice ?? "").trim().slice(0, 40) });
  await page.screenshot({ path: `${OUT}/${viewport.name}-07-storage.png` });

  log(`${viewport.name}:console-errors`, errors.length ? errors.slice(0, 5) : "none");
  await context.close();
}

await browser.close();
console.log("\n=== RESULTS ===");
console.log(JSON.stringify(results, null, 2));
