# renidly-mcp

MCP server for the [Renidly](https://renidly.com) B2B professional data APIs. Gives any MCP client (Claude Desktop, Claude Code, Cursor, VS Code, Windsurf, …) tools to look up people, companies, institutions, skills, job changes, work emails and phone numbers, using your own Renidly API key and credits.

Runs locally over stdio. No install step: clients start it with `npx`.

## Setup

You need a Renidly API key (`rnd-…`) from https://renidly.com.

**Claude Code**

```sh
claude mcp add renidly -e RENIDLY_API_KEY=rnd-... -- npx -y renidly-mcp
```

**Claude Desktop / Cursor / Windsurf / VS Code** — add to the MCP config file:

```json
{
  "mcpServers": {
    "renidly": {
      "command": "npx",
      "args": ["-y", "renidly-mcp"],
      "env": { "RENIDLY_API_KEY": "rnd-..." }
    }
  }
}
```

## Tools

| Tool | Cost |
|---|---|
| `get_credits`, `get_route_costs` | free |
| `get_person`, `get_company`, `get_institution` | 1 credit |
| `search_people`, `search_companies`, `get_company_employees`, `search_institutions`, `get_institution_alumni`, `search_job_changes` | 1 credit per page |
| `get_skill`, `search_skills` | free |
| `verify_email` | 2 credits |
| `find_email` | 3 credits |
| `find_email_by_profile_url`, `reverse_email` | 5 credits |
| `get_domain_prospects` | 1 credit per email returned |
| `find_phone`, `reverse_phone` | 5 credits |
| `live_enrich_person`, `live_search_people`, `live_search_companies` | 1 credit (per page) |
| `live_enrich_people_bulk` | 1 credit per id, up to 100 ids in one call |
| `live_get_company` | 2 credits |

Every result ends with `[credits: consumed N, remaining M]` so the agent always knows what a call cost. Checking the balance with `get_credits` is free. Responses over 100,000 characters are truncated with a notice, so bulk tools should be called with small batches.

Billing is unchanged from the REST API: the server forwards each call with your key and the usual per-route costs apply. Current costs: https://renidly.com/api/panel/credits/routes/costs/

## Development

```sh
npm install
npm test          # in-memory MCP client against a mocked API
npm run build     # dist/index.js
RENIDLY_API_KEY=rnd-... node dist/index.js   # run manually (speaks MCP over stdio)
```

Releases: push a `vX.Y.Z` tag; GitHub Actions publishes to npm via Trusted Publishing.
