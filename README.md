# Renidly MCP Server

[![npm version](https://img.shields.io/npm/v/renidly-mcp.svg)](https://www.npmjs.com/package/renidly-mcp)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Node](https://img.shields.io/node/v/renidly-mcp.svg)](https://nodejs.org/)

A [Model Context Protocol](https://modelcontextprotocol.io) (MCP) server for the [Renidly](https://renidly.com) B2B professional data APIs. It lets AI agents and assistants such as Claude, Cursor, Windsurf and VS Code Copilot look up people, companies, universities, skills and job changes, find and verify work emails, and resolve phone numbers, using your own Renidly API key.

The server runs locally over stdio and is started with `npx`, so there is nothing to install or host. Every tool call is forwarded to the Renidly REST API through the official [`renidly`](https://www.npmjs.com/package/renidly) Node SDK. Your API key never leaves your machine except to reach `renidly.com`.

## What you can do with it

Ask your assistant, in plain language, to:

- Look up a person's professional profile by id or public handle.
- Search people by title, company, location, skills, seniority, tenure, education or recent job change.
- Pull a company record and list its current or former employees.
- Find who recently joined or left a set of companies.
- Find a person's work email from name and domain, or from a profile URL, and verify deliverability.
- Resolve the person and company behind a business email or a phone number.
- Get the freshest live snapshot of a person or company when the clean dataset isn't recent enough.
- Check the credit balance at any time, for free.

## Setup

You need a Renidly API key. Create one at [renidly.com](https://renidly.com); keys start with `rnd-`.

### Claude Code

```sh
claude mcp add renidly -e RENIDLY_API_KEY=rnd-... -- npx -y renidly-mcp
```

### Claude Desktop

Edit `claude_desktop_config.json` (Settings → Developer → Edit Config) and add:

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

### Cursor

Settings → MCP → Add new global MCP server, or create `.cursor/mcp.json` in your project with the same JSON block as above.

### VS Code (GitHub Copilot)

Create `.vscode/mcp.json`:

```json
{
  "servers": {
    "renidly": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "renidly-mcp"],
      "env": { "RENIDLY_API_KEY": "rnd-..." }
    }
  }
}
```

### Windsurf and other MCP clients

Any client that supports stdio MCP servers works with the same three values: command `npx`, args `-y renidly-mcp`, environment variable `RENIDLY_API_KEY`.

Requires Node.js 18 or newer.

## Tools

### Account

| Tool | Cost | Description |
|---|---|---|
| `get_credits` | free | Current credit balance, tier and per-minute rate limit. |
| `get_route_costs` | free | Per-route credit costs for the whole API. |

### People, companies, institutions, skills (Data API)

| Tool | Cost | Description |
|---|---|---|
| `get_person` | 1 | One professional record by stable `prsn_` id or public handle. |
| `search_people` | 1 per page | Filter people by name, title, company, industry, location, skills, education, tenure, experience, recent job change and more. |
| `get_company` | 1 | One organization by stable `org_` id or public slug. |
| `search_companies` | 1 per page | Filter organizations by name, website, industry, HQ, headcount, followers, founding year. |
| `get_company_employees` | 1 per page | Current or former employees of a company, filterable by title, location and start date. |
| `get_institution` | 1 | One educational institution by normalized name. |
| `search_institutions` | 1 per page | Search institutions by name. |
| `get_institution_alumni` | 1 per page | Alumni and current students of an institution, filterable by degree, field, years and location. |
| `get_skill` | free | One skill by `skl_` id. |
| `search_skills` | free | Search skills by name. |
| `search_job_changes` | 1 per page | Recent joins, departures and title changes, filterable by company, title, location and recency. |

### Emails (Email API)

| Tool | Cost | Description |
|---|---|---|
| `verify_email` | 2 | Deliverability check with catch-all, disposable and role-address flags. |
| `find_email` | 3 | Work email from first name, last name and company domain. |
| `find_email_by_profile_url` | 5 | Work email from a public professional profile URL. |
| `reverse_email` | 5 | The person and company behind a business email address. |
| `get_domain_prospects` | 1 per email returned | Known work emails for a company domain, all or verified only. |

### Phones (Phone API)

| Tool | Cost | Description |
|---|---|---|
| `find_phone` | 5 | A person's phone numbers from their profile URL or username. |
| `reverse_phone` | 5 | The people behind a phone number. |

### Live snapshots (Live API)

| Tool | Cost | Description |
|---|---|---|
| `live_enrich_person` | 1 | Freshest full profile of one person by entity id or handle. |
| `live_enrich_people_bulk` | 1 per id | Up to 100 full profiles in a single call, returned immediately. |
| `live_get_company` | 2 | Freshest full profile of one company by numeric id or slug. |
| `live_search_people` | 1 per page | Live discovery search for people by keyword and filters. |
| `live_search_companies` | 1 per page | Live discovery search for companies by keyword and filters. |

Costs are in credits and reflect the public price list at the time of writing. The authoritative list is `get_route_costs` or https://renidly.com/api/panel/credits/routes/costs/.

## Credits and billing

Billing is identical to calling the REST API directly. Each successful call is charged to the API key you configured, at the standard per-route cost. Failed requests, validation errors, rate-limit rejections and cache hits are not charged.

To keep agents from spending more than intended:

- Every tool description states its cost, so the model knows the price before it calls.
- Every result ends with `[credits: consumed N, remaining M]`, read from the API's response headers.
- `get_credits` is free and can be called at any time to check the balance.
- The server's instructions tell the model to prefer the cheaper Data API tools and to keep bulk live calls to small batches.
- Responses larger than 100,000 characters are truncated with a notice instead of flooding the model's context.

API errors such as insufficient credits, rate limits or validation failures are returned to the model as tool errors with the API's own message, so it can stop or correct instead of retrying blindly.

## Security

- The API key is read from the `RENIDLY_API_KEY` environment variable and is sent only to `https://renidly.com`.
- The server has no network listener; it communicates with the MCP client over stdin and stdout.
- No data is stored locally and no telemetry is collected.
- Treat the key like a password. If it is exposed, rotate it in the Renidly panel.

## Related

- [Renidly API documentation](https://renidly.com/docs)
- [`renidly` Node SDK](https://github.com/renidly/renidly-node)
- [`renidly` Python SDK](https://github.com/renidly/renidly-python)
- [Model Context Protocol](https://modelcontextprotocol.io)

## License

MIT
