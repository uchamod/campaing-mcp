# Campaign RAG MCP

This is a local MCP server for a campaign knowledge assistant. It exposes tools
that MCP clients such as Claude Desktop can call over stdio.

The server is designed for factual party information: purpose, agenda, history,
public activities, candidate biography, and approved messaging. It is not set up
for targeted voter persuasion or demographic profiling.

## Where to Put Your Agenda and Context

Add your approved context in Markdown files under:

```text
data/
```

Current starter files:

```text
data/agenda.md
data/history.md
```

You can add more files, for example:

```text
data/candidate-bio.md
data/manifesto-2026.md
data/speeches/2026-05-01-launch-speech.md
data/faqs.md
```

The MCP reloads these files each time a tool runs, so during development you can
edit the Markdown files and ask again without rebuilding.

## API Key and Model

Use a Gemini API key in this environment variable:

```text
GEMINI_API_KEY=your-gemini-api-key
```

Recommended model for this RAG assistant:

```text
GEMINI_MODEL=gemini-2.5-flash
```

Use `gemini-2.5-flash` for a good balance of quality, speed, and cost. Use a
stronger Gemini model if you want higher quality and are okay with higher cost.

## Install and Build

```bash
npm install
npm run build
```

For local development:

```bash
npm run dev
```

## Claude Desktop MCP Config

After running `npm install` and `npm run build`, add this to your Claude Desktop
MCP configuration.

Windows example:

```json
{
  "mcpServers": {
    "campaign-rag": {
      "command": "node",
      "args": [
        "C:\\Users\\USER\\Documents\\Codex\\2026-05-14\\hey-i-need-to-create-an\\dist\\server.js"
      ],
      "env": {
        "GEMINI_API_KEY": "AIzaSyBHbWPDBilmDDXoCjgRtYIlSxWk-8lhhGc",
        "GEMINI_MODEL": "gemini-2.5-flash",
        "CAMPAIGN_CONTEXT_DIR": "C:\\Users\\USER\\Documents\\Codex\\2026-05-14\\hey-i-need-to-create-an\\data"
      }
    }
  }
}
```

Restart Claude Desktop after editing the config.

## Streamable HTTP URL Connector

Use this mode when an MCP client can connect to a server by URL instead of
launching a local stdio command.

Start the HTTP server:

```bash
npm run start:http
```

By default it listens on:

```text
http://127.0.0.1:3000/mcp
```

If port `3000` is blocked, use another port:

```powershell
$env:PORT="8787"
npm.cmd run start:http
```

Then use this URL in your MCP client:

```text
http://127.0.0.1:8787/mcp
```

For a hosted connector, deploy this Node app to a server and expose the same
`/mcp` endpoint over HTTPS. The remote environment must include:

```text
GEMINI_API_KEY
GEMINI_MODEL
CAMPAIGN_CONTEXT_DIR
PORT
MCP_HTTP_PATH
```

Do not expose this publicly without authentication, rate limiting, and HTTPS.

## Available MCP Tools

`ask_party`

Answers a question using retrieved context and the configured LLM.

Input:

```json
{
  "question": "What is the party's purpose?",
  "tone": "friendly"
}
```

`search_party_context`

Returns matching source excerpts without calling the LLM. Use this to debug what
context the assistant is seeing.

Input:

```json
{
  "query": "education policy",
  "limit": 5
}
```

## Important Files

```text
src/server.ts   MCP tools and Gemini call
src/http.ts     Streamable HTTP MCP server
src/context.ts  Markdown loading, chunking, and retrieval
data/           Your campaign knowledge base
.env.example    Environment variable template
```

## Development Notes

- Keep facts, dates, and statistics inside `data/`.
- Put behavior rules in the system prompt inside `src/server.ts`.
- Do not put secrets in source code.
- Keep `GEMINI_API_KEY` only in your MCP client config or local environment.
