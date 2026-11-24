import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { Renidly } from "renidly";
import { describe, expect, it } from "vitest";
import { createServer } from "../src/server.js";
import { MAX_CHARS } from "../src/reply.js";

function envelope(data: unknown, credits = { consumed: "1", balance: "99" }) {
  return new Response(JSON.stringify({ success: true, statusCode: 200, data }), {
    status: 200,
    headers: { "content-type": "application/json", "x-credits-consumed": credits.consumed, "x-credits-balance": credits.balance },
  });
}

async function connect(fetch: typeof globalThis.fetch) {
  const client = new Client({ name: "test", version: "0" });
  const [a, b] = InMemoryTransport.createLinkedPair();
  await createServer(new Renidly("rnd-test", { fetch, maxRetries: 0 })).connect(a);
  await client.connect(b);
  return client;
}

describe("renidly-mcp", () => {
  it("lists tools with credit costs", async () => {
    const c = await connect(() => Promise.reject(new Error("no network")));
    const { tools } = await c.listTools();
    expect(tools.map((t) => t.name)).toContain("live_enrich_people_bulk");
    expect(tools.find((t) => t.name === "get_credits")?.description).toMatch(/FREE/);
  });

  it("returns record JSON plus credits footer", async () => {
    const c = await connect(async (url) => {
      expect(String(url)).toContain("/people/profile?id=prsn_1");
      return envelope({ id: "prsn_1", headline: "CTO" });
    });
    const r = await c.callTool({ name: "get_person", arguments: { id: "prsn_1" } });
    const text = (r.content as { text: string }[])[0].text;
    expect(text).toContain('"headline": "CTO"');
    expect(text).toContain("[credits: consumed 1, remaining 99]");
  });

  it("maps API errors to isError without throwing", async () => {
    const c = await connect(async () =>
      new Response(JSON.stringify({ success: false, statusCode: 402, message: "Insufficient credits" }), { status: 402 }),
    );
    const r = await c.callTool({ name: "verify_email", arguments: { email: "a@b.co" } });
    expect(r.isError).toBe(true);
    expect((r.content as { text: string }[])[0].text).toMatch(/Insufficient credits/);
  });

  it("truncates oversized bulk responses", async () => {
    const c = await connect(async () => envelope({ profiles: [{ blob: "x".repeat(MAX_CHARS) }] }, { consumed: "1", balance: "9" }));
    const r = await c.callTool({ name: "live_enrich_people_bulk", arguments: { entityIds: ["e1"] } });
    const text = (r.content as { text: string }[])[0].text;
    expect(text).toMatch(/truncated/);
    expect(text.length).toBeLessThan(MAX_CHARS + 500);
  });
});
