/**
 * `imageEdit` capability 适配（change: 2026-10-27-add-image-history-to-photocraft-focus，design D4）。
 *
 * 节点历史只依赖公共 `ImageEditService` 契约读取活动文档身份、草稿状态与只读历史预览；
 * 这里把宿主的调用转发到当前 PhotoCraft 工作区会话，不向宿主暴露 PhotoCraft 内部状态。
 * provider 缺失时（扩展停用/尚未加载）宿主按「不可用」降级。
 */
import type { ImageEditService } from "@woohaa3/frontend/extension-api";
import type { WorkspaceSession } from "./workspace-session.js";

export function createImageEditService(getSession: () => WorkspaceSession | null): ImageEditService {
  return {
    isActive: () => {
      const session = getSession();
      return Boolean(session && session.documents.size > 0);
    },
    nodeId: () => getSession()?.activeNodeId() ?? null,
    setHistoryOverride: (override, nodeId) => {
      getSession()?.setHistoryOverride(override, nodeId);
    },
    refreshFromCanonical: (revision) => {
      void getSession()?.refreshFromCanonical(revision);
    },
    draftState: () => getSession()?.draftState() ?? "saved"
  };
}
