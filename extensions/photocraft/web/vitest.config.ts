import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
    // 组件测试需要 DOM；focus-targets 是纯函数，但保持与宿主一致的默认环境。
    environment: "node"
  }
});
