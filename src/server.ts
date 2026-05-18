import "dotenv/config";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createCampaignMcpServer } from "./mcp.js";

const server = createCampaignMcpServer();
const transport = new StdioServerTransport();

await server.connect(transport);
