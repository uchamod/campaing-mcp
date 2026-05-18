import "dotenv/config";
import { createMcpExpressApp } from "@modelcontextprotocol/sdk/server/express.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import type { Request, Response } from "express";
import { createCampaignMcpServer } from "./mcp.js";

const port = Number(process.env.PORT ?? 3000);
const host = process.env.HOST ?? "127.0.0.1";
const endpoint = process.env.MCP_HTTP_PATH ?? "/mcp";
const app = createMcpExpressApp();

app.post(endpoint, async (req: Request, res: Response) => {
  const server = createCampaignMcpServer();

  try {
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined
    });

    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);

    res.on("close", () => {
      transport.close();
      server.close();
    });
  } catch (error) {
    console.error("Error handling MCP request:", error);

    if (!res.headersSent) {
      res.status(500).json({
        jsonrpc: "2.0",
        error: {
          code: -32603,
          message: "Internal server error"
        },
        id: null
      });
    }
  }
});

app.get(endpoint, async (_req: Request, res: Response) => {
  res.writeHead(405).end(
    JSON.stringify({
      jsonrpc: "2.0",
      error: {
        code: -32000,
        message: "Method not allowed. Use POST for Streamable HTTP."
      },
      id: null
    })
  );
});

app.delete(endpoint, async (_req: Request, res: Response) => {
  res.writeHead(405).end(
    JSON.stringify({
      jsonrpc: "2.0",
      error: {
        code: -32000,
        message: "Method not allowed."
      },
      id: null
    })
  );
});

app.listen(port, host, (error?: Error) => {
  if (error) {
    console.error("Failed to start MCP HTTP server:", error);
    process.exit(1);
  }

  console.log(`Campaign RAG MCP Streamable HTTP server listening at http://${host}:${port}${endpoint}`);
});
