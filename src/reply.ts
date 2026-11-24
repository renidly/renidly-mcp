import { RenidlyError, RenidlyList, type ResponseMeta } from "renidly";

export type ToolResult = { content: { type: "text"; text: string }[]; isError?: boolean };

/** Max characters returned to the model per call; beyond that the JSON is cut. */
export const MAX_CHARS = 100_000;

function credits(meta?: ResponseMeta): string {
  if (!meta || meta.creditConsumed === undefined) return "";
  return `\n\n[credits: consumed ${meta.creditConsumed}, remaining ${meta.remainingBalance}]`;
}

function text(s: string, isError = false): ToolResult {
  return { content: [{ type: "text", text: s }], ...(isError ? { isError } : {}) };
}

/** Run an SDK call and turn its result (object, list, or null) into a tool reply. */
export async function reply(call: () => Promise<unknown>): Promise<ToolResult> {
  let res: unknown;
  try {
    res = await call();
  } catch (e) {
    if (e instanceof RenidlyError) {
      return text(`${e.name}${e.errorCode ? ` (${e.errorCode})` : ""}: ${e.message}`, true);
    }
    throw e;
  }
  if (res === null || res === undefined) return text("No record found.");

  let payload: unknown = res;
  if (res instanceof RenidlyList) {
    payload = { count: res.data.length, has_more: res.hasMore, next_cursor: res.nextCursor, data: res.data };
  }
  let json = JSON.stringify(payload, null, 1);
  if (json.length > MAX_CHARS) {
    json = json.slice(0, MAX_CHARS) + `\n…[truncated: response was ${json.length} chars; request fewer items or ids]`;
  }
  return text(json + credits((res as { meta?: ResponseMeta }).meta));
}
