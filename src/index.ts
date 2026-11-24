import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { Renidly } from "renidly";
import { createServer } from "./server.js";

const apiKey = process.env.RENIDLY_API_KEY;
if (!apiKey) {
  console.error("renidly-mcp: set RENIDLY_API_KEY (get a key at https://renidly.com).");
  process.exit(1);
}

await createServer(new Renidly(apiKey)).connect(new StdioServerTransport());
