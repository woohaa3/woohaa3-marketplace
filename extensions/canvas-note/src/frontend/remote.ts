/** client 向 host 要备注。路径由宿主拼出来，插件只写相对路由 `note`。 */
export async function fetchNote(): Promise<string> {
  const response = await fetch("/api/extensions/canvas-note/handlers/note");
  if (!response.ok) throw new Error("备注接口失败：" + response.status);
  const body = (await response.json()) as { note: string };
  return body.note;
}
