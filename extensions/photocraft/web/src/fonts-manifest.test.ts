import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

// The font manifest is authored next to the app assets and copied to app/fonts/manifest.txt by
// build-app.sh; the font itself is reused from the public client (see patch/SOURCE.md).
const webRoot = path.resolve(fileURLToPath(new URL("..", import.meta.url)));
const manifestPath = path.join(webRoot, "src/app-assets/fonts/manifest.txt");
const fontDir = path.resolve(webRoot, "../../../../client/web/frontend/public/assets/fonts");
const fontPath = path.join(fontDir, "NotoSansSC-Regular.otf");
const licencePath = path.join(fontDir, "OFL-NotoSansSC.txt");

type Row = { family: string; style: string; file: string; scripts: string[]; licence: string; licenceFile: string; sha256: string };

function rows(text: string): Row[] {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith("#"))
    .map((line) => {
      const fields = line.split(" | ").map((field) => field.trim());
      return {
        family: fields[0] ?? "",
        style: fields[1] ?? "",
        file: fields[2] ?? "",
        scripts: (fields[3] ?? "").split(",").map((script) => script.trim()).filter(Boolean),
        licence: fields[4] ?? "",
        licenceFile: fields[5] ?? "",
        sha256: fields[6] ?? "",
      };
    });
}

/** The upstream served-font rules: a relative path that stays inside the site. */
function isRelativePath(file: string): boolean {
  if (!file || file.startsWith("/") || /[\\?#:]/.test(file)) return false;
  return file.split("/").every((segment) => segment.length > 0 && segment !== "." && segment !== "..");
}

function sha256(bytes: Buffer): string {
  return createHash("sha256").update(bytes).digest("hex");
}

describe("host font manifest", () => {
  it("lists exactly the reusable Noto Sans SC face for Hans, Hant and Jpan", () => {
    const text = readFileSync(manifestPath, "utf8");
    const [font, ...extra] = rows(text);
    expect(extra).toEqual([]);
    expect(font?.family).toBe("Noto Sans SC");
    expect(font?.style).toBe("Regular");
    expect(font?.file).toBe("fonts/NotoSansSC-Regular.otf");
    expect(font?.scripts).toEqual(["Hans", "Hant", "Jpan"]);
    expect(font?.licence).toBe("OFL-1.1");
    expect(font?.licenceFile).toBe("fonts/OFL-NotoSansSC.txt");
    for (const file of [font!.file, font!.licenceFile]) expect(isRelativePath(file), file).toBe(true);
  });

  it("records the SHA-256 of the exact font file and ships its OFL licence", () => {
    const [font] = rows(readFileSync(manifestPath, "utf8"));
    const bytes = readFileSync(fontPath);
    expect(sha256(bytes)).toBe(font!.sha256);
    expect(bytes.subarray(0, 4).toString("latin1")).toBe("OTTO");
    const licence = readFileSync(licencePath, "utf8");
    expect(licence).toContain("SIL Open Font License");
    expect(font!.licenceFile).toMatch(/OFL-NotoSansSC\.txt$/);
  });

  it("rejects a changed font byte and paths outside the site", () => {
    const [font] = rows(readFileSync(manifestPath, "utf8"));
    const changed = Buffer.from(readFileSync(fontPath));
    changed[changed.length - 1] ^= 0xff;
    expect(sha256(changed)).not.toBe(font!.sha256);
    for (const file of ["/fonts/a.otf", "../a.otf", "fonts/../../a.otf", "fonts//a.otf", "fonts\\a.otf", "https://example.org/a.otf", "fonts/a.otf?v=1"]) {
      expect(isRelativePath(file), file).toBe(false);
    }
  });

  it("matches the copies in a built app when one is present", () => {
    const built = path.join(webRoot, "app/fonts");
    if (!existsSync(path.join(built, "manifest.txt"))) return;
    expect(readFileSync(path.join(built, "manifest.txt"), "utf8")).toBe(readFileSync(manifestPath, "utf8"));
    expect(sha256(readFileSync(path.join(built, "NotoSansSC-Regular.otf")))).toBe(sha256(readFileSync(fontPath)));
    expect(existsSync(path.join(built, "OFL-NotoSansSC.txt"))).toBe(true);
  });
});
