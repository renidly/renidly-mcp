# Renidly MCP Server

[![npm version](https://img.shields.io/npm/v/renidly-mcp.svg)](https://www.npmjs.com/package/renidly-mcp)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Node](https://img.shields.io/node/v/renidly-mcp.svg)](https://nodejs.org/)

A [Model Context Protocol](https://modelcontextprotocol.io) (MCP) server for the [Renidly](https://renidly.com) B2B professional data APIs. It lets AI assistants and coding agents such as Claude, Claude Code, Cursor, VS Code Copilot, Windsurf and Gemini CLI look up people, companies, universities, skills and job changes, find and verify work emails, and resolve phone numbers, using your own Renidly API key.

There are two ways to use it:

- **Hosted:** connect your AI tool to `https://mcp.renidly.com/mcp`. Nothing to install or run.
- **Local:** run it on your machine with `npx -y renidly-mcp`. Needs Node.js 18 or newer.

Both expose the same tools and bill the same way.

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

## Get an API key

[Sign up at renidly.com](https://renidly.com/signup) to get an API key and 100 free credits, no credit card required. Keys start with `rnd-`. You can create and rotate keys for your organization later; see [API keys](https://renidly.com/docs/api-keys).

## Connect to the hosted server

| Setting | Value |
|---|---|
| URL | `https://mcp.renidly.com/mcp` |
| Transport | Streamable HTTP |
| Auth header | `X-renidly-apikey: rnd-...` |

Clients that can only send a token instead of a custom header can use `Authorization: Bearer rnd-...` or put the key in their token field. The server accepts the key either way.

### Claude (web and Claude Desktop)

Custom connectors are available on all Claude plans; Free plans are limited to one.

1. Go to **Customize → Connectors**, click **+ Add**, then **Add custom connector**.
2. Name it `Renidly` and enter the URL `https://mcp.renidly.com/mcp`, then **Continue**.
3. Under **Authentication**, choose **No sign in**.
4. Under **Request headers**, add the header `X-renidly-apikey` with your API key as the value.
5. Click **Add**.

On Team and Enterprise plans, an Owner adds the connector under **Organization settings → Connectors**. Details: [Get started with custom connectors](https://support.claude.com/en/articles/11175166-getting-started-with-custom-connectors-using-remote-mcp).

### Claude Code

```sh
claude mcp add --transport http renidly https://mcp.renidly.com/mcp \
  --header "X-renidly-apikey: rnd-..."
```

Add `--scope user` to make it available in every project. Run `/mcp` inside Claude Code to check the connection.

### Cursor

Add to `~/.cursor/mcp.json` for all projects, or `.cursor/mcp.json` for one project. Cursor fills `${env:...}` from your environment, so the key stays out of the file:

```json
{
  "mcpServers": {
    "renidly": {
      "url": "https://mcp.renidly.com/mcp",
      "headers": { "X-renidly-apikey": "${env:RENIDLY_API_KEY}" }
    }
  }
}
```

Details: [Cursor MCP docs](https://cursor.com/docs/context/mcp).

### VS Code (GitHub Copilot)

Add to `~/.copilot/mcp-config.json` for your user, or `.mcp.json` at the workspace root to share it with your team. Header values can reference environment variables with `${NAME}`:

```json
{
  "mcpServers": {
    "renidly": {
      "type": "http",
      "url": "https://mcp.renidly.com/mcp",
      "headers": { "X-renidly-apikey": "${RENIDLY_API_KEY}" }
    }
  }
}
```

Details: [VS Code MCP configuration reference](https://code.visualstudio.com/docs/copilot/reference/mcp-configuration).

### Windsurf / Devin Local

Add to `~/.config/devin/mcp_config.json`, or `.devin/mcp_config.json` in a project:

```json
{
  "mcpServers": {
    "renidly": {
      "url": "https://mcp.renidly.com/mcp",
      "transport": "http",
      "headers": { "X-renidly-apikey": "rnd-..." }
    }
  }
}
```

Use `.devin/mcp_config.local.json` instead of the committed project file if you put the key inline. Details: [Devin Local MCP docs](https://docs.devin.ai/desktop/cascade/mcp).

### Gemini CLI

```sh
gemini mcp add --transport http --header "X-renidly-apikey: rnd-..." renidly https://mcp.renidly.com/mcp
```

Or in `settings.json`, using `httpUrl` for Streamable HTTP:

```json
{
  "mcpServers": {
    "renidly": {
      "httpUrl": "https://mcp.renidly.com/mcp",
      "headers": { "X-renidly-apikey": "rnd-..." }
    }
  }
}
```

Details: [Gemini CLI MCP docs](https://geminicli.com/docs/tools/mcp-server/).

### Claude API

Use the MCP connector and pass your Renidly key as `authorization_token`:

```sh
curl https://api.anthropic.com/v1/messages \
  -H "x-api-key: $ANTHROPIC_API_KEY" \
  -H "anthropic-version: 2026-10-21" \
  -H "anthropic-beta: mcp-client-2025-11-20" \
  -H "content-type: application/json" \
  -d '{
    "model": "claude-opus-5-5",
    "max_tokens": 4000,
    "messages": [{"role": "user", "content": "Find the CTO of Stripe and verify their work email."}],
    "mcp_servers": [{
      "type": "url",
      "url": "https://mcp.renidly.com/mcp",
      "name": "renidly",
      "authorization_token": "rnd-..."
    }],
    "tools": [{ "type": "mcp_toolset", "mcp_server_name": "renidly" }]
  }'
```

Details: [Claude MCP connector](https://platform.claude.com/docs/en/agents-and-tools/mcp-connector).

### OpenAI API (Responses)

Add Renidly as a remote MCP tool and pass your key in `authorization`:

```json
{
  "type": "mcp",
  "server_label": "renidly",
  "server_url": "https://mcp.renidly.com/mcp",
  "authorization": "rnd-...",
  "require_approval": "never"
}
```

OpenAI does not store the `authorization` value, so send it with every request. Details: [OpenAI remote MCP guide](https://developers.openai.com/api/docs/guides/tools-connectors-mcp).

### ChatGPT

Not supported yet. ChatGPT only connects to servers that offer an OAuth sign-in and cannot send an API key. Sign-in with your Renidly account is planned.

## Run it locally instead

The same server runs on your machine over stdio. Your MCP client starts it with `npx`.

**Claude Code**

```sh
claude mcp add renidly -e RENIDLY_API_KEY=rnd-... -- npx -y renidly-mcp
```

**Claude Desktop, Cursor and other clients with a JSON config**

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

For Claude Desktop, open Settings → Developer → Edit Config and paste this into `claude_desktop_config.json`.

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

Costs are in credits and reflect the price list at the time of writing. The current list is on [Endpoint costs](https://renidly.com/docs/endpoints-cost), and the `get_route_costs` tool returns it live.

## Credits and billing

Billing is identical to calling the REST API directly. Each successful call is charged to the organization that owns the API key, at the standard per-route cost. Failed requests, validation errors, rate-limit rejections and cache hits are not charged. See [Pricing](https://renidly.com/pricing) and [Account & credits](https://renidly.com/docs/account-credits).

To keep agents from spending more than intended:

- Every tool description states its cost, so the model knows the price before it calls.
- Every result ends with `[credits: consumed N, remaining M]`, read from the API's response headers.
- `get_credits` is free and can be called at any time to check the balance.
- The server's instructions tell the model to prefer the cheaper Data API tools and to keep bulk live calls to small batches.
- Responses larger than 100,000 characters are truncated with a notice instead of flooding the model's context.

API errors such as insufficient credits, rate limits or validation failures are returned to the model as tool errors with the API's own message, so it can stop or correct instead of retrying blindly.

## Security

- **Hosted:** your key travels over HTTPS to `mcp.renidly.com`, which uses it to call the Renidly API on your behalf. Each request gets its own server instance; keys are not stored, and request headers are not logged.
- **Local:** the key is read from `RENIDLY_API_KEY` and sent only to `https://renidly.com`. The server opens no network port; it talks to your MCP client over stdin and stdout.
- No telemetry is collected in either mode.
- Prefer environment variables over pasting the key into config files you commit. If a key is exposed, rotate it; see [API keys](https://renidly.com/docs/api-keys).

## Related

- [Renidly documentation](https://renidly.com/docs)
- [Node SDK](https://renidly.com/docs/sdks/node) · [GitHub](https://github.com/renidly/renidly-node)
- [Python SDK](https://renidly.com/docs/sdks/python) · [GitHub](https://github.com/renidly/renidly-python)
- [Model Context Protocol](https://modelcontextprotocol.io)

## License

MIT
