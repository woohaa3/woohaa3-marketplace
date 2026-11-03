import { createElement, useState } from "react";
import {
  defineExtensionPlugin,
  type Context,
  type SlotsService
} from "@woohaa3/frontend/extension-api";
import { metadata } from "./metadata.js";
import { fetchNote } from "./remote.js";

type NoteContext = Context & { slots: SlotsService };

function NoteButton() {
  const [note, setNote] = useState("备注");
  return createElement(
    "button",
    { type: "button", onClick: () => { void fetchNote().then(setNote); } },
    note
  );
}

/** 把按钮登记到画布工具栏。卸载时 effect 撤下。 */
export function canvasNoteExtension() {
  return defineExtensionPlugin<NoteContext>((ctx) => {
    ctx.effect(
      () => ctx.slots.register("canvas.toolbar-status", {
        id: "canvas-note.status",
        owner: metadata.extensionId,
        priority: 10,
        wrapsStatus: true,
        render: NoteButton
      }),
      "canvas-note-status"
    );
  }, { name: metadata.extensionId, inject: ["slots"] });
}
