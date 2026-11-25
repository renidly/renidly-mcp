import { createMcpExpressApp } from "@modelcontextprotocol/sdk/server/express.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { Renidly } from "renidly";
import { createServer } from "./server.js";

const host = process.env.HOST ?? "127.0.0.1";
const port = Number(process.env.PORT ?? 3100);
const allowedHosts = (process.env.ALLOWED_HOSTS ?? "mcp.renidly.com").split(",");

function rpcError(res: any, status: number, message: string) {
  res.status(status).json({ jsonrpc: "2.0", error: { code: -32000, message }, id: null });
}

// The caller's own API key: X-renidly-apikey, or Authorization: Bearer for clients that only send a token.
function apiKey(req: any): string | undefined {
  const key = req.get("x-renidly-apikey") ?? req.get("authorization")?.replace(/^Bearer\s+/i, "");
  return key?.trim() || undefined;
}

const app = createMcpExpressApp({ host, allowedHosts });

// Stateless: a fresh server per request, so no session state to share or lose between restarts.
app.post("/mcp", async (req: any, res: any) => {
  const key = apiKey(req);
  if (!key) return rpcError(res, 401, "Missing API key: send X-renidly-apikey or Authorization: Bearer <key>");

  const server = createServer(new Renidly(key));
  const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
  res.on("close", () => {
    transport.close();
    server.close();
  });
  try {
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  } catch (e) {
    console.error(e);
    if (!res.headersSent) rpcError(res, 500, "Internal server error");
  }
});

app.all("/mcp", (_req: any, res: any) => rpcError(res, 405, "Method not allowed"));

app.listen(port, host, () => console.log(`renidly-mcp remote listening on http://${host}:${port}/mcp`));
