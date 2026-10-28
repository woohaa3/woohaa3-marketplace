#!/usr/bin/env bash
# Build the pinned PhotoCraft overlay runtime. Source: patch/SOURCE.md.
set -eu

cd "$(dirname "$0")"

PINNED_REV="e6d6fb45a40250f518d2e824236a8fdcaa4472c8"
PHOTOCRAFT_SRC="${PHOTOCRAFT_SRC:-}"
OUT="app"
# The host font is reused from the public client (allowed direction: parent depends on the open
# client). Override the directory to build from another copy; both files must be present.
FONT_DIR="${PHOTOCRAFT_FONT_DIR:-$(pwd)/../../../../client/web/frontend/public/assets/fonts}"
FONT_FILE="$FONT_DIR/NotoSansSC-Regular.otf"
FONT_LICENSE="$FONT_DIR/OFL-NotoSansSC.txt"
FONT_MANIFEST="src/app-assets/fonts/manifest.txt"
PATCH_HASH="$(node --input-type=commonjs -e 'process.stdout.write(require("node:crypto").createHash("sha256").update(require("node:fs").readFileSync("patch/0001-external-canvas-overlay.patch")).digest("hex"))')"
if ! command -v cargo >/dev/null 2>&1 && [ -d "${HOME}/.cargo/bin" ]; then
  export PATH="${HOME}/.cargo/bin:$PATH"
fi

require_font_assets() {
  [ -f "$FONT_FILE" ] || {
    echo "error: 缺少中文字体 $FONT_FILE" >&2
    echo "       设置 PHOTOCRAFT_FONT_DIR 指向包含 NotoSansSC-Regular.otf 与 OFL-NotoSansSC.txt 的目录（默认 $(pwd)/../../../../client/web/frontend/public/assets/fonts）" >&2
    exit 1
  }
  [ -f "$FONT_LICENSE" ] || { echo "error: 缺少字体许可证 $FONT_LICENSE（与 $FONT_FILE 同目录）" >&2; exit 1; }
  [ -f "$FONT_MANIFEST" ] || { echo "error: 缺少字体清单 $FONT_MANIFEST" >&2; exit 1; }
}

# Copied into app/fonts/ on both paths: the prebuilt extension must carry the font, manifest and
# licence (no runtime dependency on this repository or another network service).
copy_font_assets() {
  mkdir -p "$OUT/fonts"
  cp "$FONT_FILE" "$OUT/fonts/NotoSansSC-Regular.otf"
  cp "$FONT_LICENSE" "$OUT/fonts/OFL-NotoSansSC.txt"
  cp "$FONT_MANIFEST" "$OUT/fonts/manifest.txt"
}

require_font_assets

if [ "${1:-}" != "--rebuild" ]; then
  if [ -f "$OUT/photocraft-web_bg.wasm" ] && [ -f "$OUT/photocraft-web.js" ] && [ -f "$OUT/source.sha256" ] && [ "$(cat "$OUT/source.sha256")" = "$PATCH_HASH" ]; then
    cp src/app-assets/*.js src/app-assets/*.html "$OUT/"
    copy_font_assets
    echo "==> 使用已生成的 app/ 产物（$(du -h "$OUT/photocraft-web_bg.wasm" | cut -f1)）"
    echo "    需要重新编译时加 --rebuild"
    exit 0
  fi
  echo "==> app/ 尚无运行产物，从固定源码生成"
fi

if [ -z "$PHOTOCRAFT_SRC" ]; then
  PHOTOCRAFT_SRC="$(pwd)/../.local/photocraft-source/$PINNED_REV-$PATCH_HASH"
  if [ ! -d "$PHOTOCRAFT_SRC/.git" ]; then
    mkdir -p "$PHOTOCRAFT_SRC"
    git -C "$PHOTOCRAFT_SRC" init
    git -C "$PHOTOCRAFT_SRC" remote add origin https://github.com/storytold/photocraft.git
    git -C "$PHOTOCRAFT_SRC" fetch --depth 1 origin "$PINNED_REV"
    git -C "$PHOTOCRAFT_SRC" checkout --detach FETCH_HEAD
    git -C "$PHOTOCRAFT_SRC" apply "$(pwd)/patch/0001-external-canvas-overlay.patch"
  fi
fi
git -C "$PHOTOCRAFT_SRC" apply --reverse --check "$(pwd)/patch/0001-external-canvas-overlay.patch" || {
  echo "error: 源码未应用当前完整补丁；请使用默认固定源码缓存或先应用 patch" >&2; exit 1;
}
if [ "$(git -C "$PHOTOCRAFT_SRC" rev-parse HEAD)" != "$PINNED_REV" ]; then
  echo "error: PhotoCraft 源码必须固定在 $PINNED_REV" >&2; exit 1
fi

command -v cargo >/dev/null || { echo "error: 需要 cargo（rustup）" >&2; exit 1; }
BINDGEN="${PHOTOCRAFT_WASM_BINDGEN:-wasm-bindgen}"
if [ "$("$BINDGEN" --version 2>/dev/null || true)" != "wasm-bindgen 0.2.129" ]; then
  TOOL_ROOT="$(pwd)/../.local/photocraft-tools"
  BINDGEN="$TOOL_ROOT/bin/wasm-bindgen"
  if [ "$("$BINDGEN" --version 2>/dev/null || true)" != "wasm-bindgen 0.2.129" ]; then
    echo "==> 安装 PhotoCraft 专用 wasm-bindgen 0.2.129（不替换 Bevy 的 CLI）"
    (cd "$PHOTOCRAFT_SRC" && cargo install --locked wasm-bindgen-cli --version 0.2.129 --root "$TOOL_ROOT")
  fi
fi

echo "==> 编译 PhotoCraft wasm（首次约 7-10 分钟）"
(cd "$PHOTOCRAFT_SRC" && cargo build --locked -p photocraft-web --target wasm32-unknown-unknown --profile wasm-release)

TARGET_DIR="${CARGO_TARGET_DIR:-$PHOTOCRAFT_SRC/target}"
WASM="$TARGET_DIR/wasm32-unknown-unknown/wasm-release/photocraft-web.wasm"
[ -f "$WASM" ] || { echo "error: 找不到 $WASM" >&2; exit 1; }

echo "==> wasm-bindgen"
mkdir -p "$OUT"
# Rust's strip=debuginfo still leaves a large debugging name section. It is not
# needed by the browser runtime and must not consume the release download budget.
"$BINDGEN" --target web --out-dir "$OUT" --no-typescript --remove-name-section "$WASM"

# 桥接脚本与入口页由仓库提供，不要被覆盖。
cp "src/app-assets/host-bridge.js" "$OUT/host-bridge.js"
cp "src/app-assets/host-bridge-core.js" "$OUT/host-bridge-core.js"
cp "src/app-assets/index.html" "$OUT/index.html"
cp "src/app-assets/frame-channel.js" "$OUT/frame-channel.js"
cp "$PHOTOCRAFT_SRC/LICENSE-MIT" "$OUT/LICENSE-MIT"
cp "$PHOTOCRAFT_SRC/LICENSE-APACHE" "$OUT/LICENSE-APACHE"
copy_font_assets
printf '%s\n' "$PATCH_HASH" > "$OUT/source.sha256"

echo "==> 完成：$OUT（$(du -h "$OUT/photocraft-web_bg.wasm" | cut -f1)）"
