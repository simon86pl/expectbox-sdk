// npm install @modelcontextprotocol/sdk
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

const client = new Client({ name: "expectbox-example", version: "1.0.0" });
const transport = new StreamableHTTPClientTransport(
  new URL("https://www.expectbox.com/mcp"),
  {
    requestInit: {
      headers: {
        Authorization: `Bearer ${process.env.EXPECTBOX_AGENT_API_KEY}`,
      },
    },
  },
);
try {
  await client.connect(transport);
  console.log((await client.listTools()).tools.map((tool) => tool.name));
  console.log(await client.callTool({ name: "get_inbox", arguments: {} }));
} finally {
  await client.close();
}
