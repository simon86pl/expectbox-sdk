import { test } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createServer } from "node:http";
import { once } from "node:events";
import { fileURLToPath } from "node:url";
import { readFile } from "node:fs/promises";

// Resolve from the imported SDK so the same tests also exercise the installed tarball.
const entry = new URL("./mcp.mjs", import.meta.resolve("expectbox-agents"));
const manifest = JSON.parse(
  await readFile(new URL("../package.json", entry), "utf8"),
);
const key = "exa_" + "a".repeat(43);
const inbox = "12345678-1234-1234-1234-123456789abc";
const init = [
  {
    jsonrpc: "2.0",
    id: 1,
    method: "initialize",
    params: {
      protocolVersion: "2025-11-25",
      capabilities: {},
      clientInfo: { name: "test", version: "1" },
    },
  },
  { jsonrpc: "2.0", method: "notifications/initialized" },
];
async function run(args = [], messages = [], overrides = {}) {
  const child = spawn(process.execPath, [fileURLToPath(entry), ...args], {
    env: {
      ...process.env,
      EXPECTBOX_AGENT_API_KEY: key,
      EXPECTBOX_AGENT_INBOX_ID: inbox,
      EXPECTBOX_AGENT_ORIGIN: "https://www.expectbox.com",
      EXPECTBOX_AGENT_ALLOW_SEND: "false",
      EXPECTBOX_AGENT_ALLOW_SENDERS: "false",
      ...overrides,
    },
    stdio: ["pipe", "pipe", "pipe"],
  });
  let stdout = "",
    stderr = "";
  child.stdout.on("data", (chunk) => (stdout += chunk));
  child.stderr.on("data", (chunk) => (stderr += chunk));
  // A CLI help/configuration error may exit before consuming stdin.
  child.stdin.on("error", (error) => {
    if (error.code !== "EPIPE") throw error;
  });
  const done = once(child, "close");
  const timer = setTimeout(() => child.kill(), 10000);
  try {
    child.stdin.end(
      messages.map(JSON.stringify).join("\n") + (messages.length ? "\n" : ""),
    );
    const [code] = await done;
    assert.ok(
      !stdout.includes(key) && !stderr.includes(key),
      "Never expose the API key",
    );
    return { code, stdout, stderr };
  } finally {
    clearTimeout(timer);
  }
}
const responses = (result) => result.stdout.trim().split("\n").map(JSON.parse);

test("npm MCP executable provides help/version without credentials and safe configuration errors", async () => {
  assert.equal(manifest.bin["expectbox-mcp"], "./js/mcp.mjs");
  assert.ok(
    (await readFile(entry, "utf8")).startsWith("#!/usr/bin/env node\n"),
  );
  for (const flag of ["--help", "--version"]) {
    const result = await run([flag], [], {
      EXPECTBOX_AGENT_API_KEY: "",
      EXPECTBOX_AGENT_INBOX_ID: "",
    });
    assert.equal(result.code, 0, result.stderr);
    assert.ok(result.stdout.includes(manifest.version));
    assert.equal(result.stderr, "");
  }
  for (const env of [
    { EXPECTBOX_AGENT_API_KEY: "" },
    { EXPECTBOX_AGENT_INBOX_ID: "invalid" },
    { EXPECTBOX_AGENT_ORIGIN: "https://private:secret@example.com" },
  ]) {
    const result = await run([], [], env);
    assert.equal(result.code, 1);
    assert.equal(result.stdout, "");
    assert.match(result.stderr, /configuration is invalid/);
    assert.doesNotMatch(result.stderr, /private:secret|Error:|at file:/);
  }
});

test("installed MCP negotiates stdio and keeps sending and enrollment opt-in", async () => {
  const result = await run(
    [],
    [
      ...init,
      { jsonrpc: "2.0", id: 2, method: "tools/list" },
      {
        jsonrpc: "2.0",
        id: 3,
        method: "tools/call",
        params: { name: "send_message", arguments: {} },
      },
    ],
  );
  assert.equal(result.code, 0, result.stderr);
  const [hello, list, denied] = responses(result);
  assert.equal(hello.result.protocolVersion, "2025-11-25");
  assert.equal(hello.result.serverInfo.version, manifest.version);
  assert.ok(list.result.tools.some((t) => t.name === "create_draft"));
  assert.ok(
    !list.result.tools.some((t) =>
      ["send_message", "allow_sender"].includes(t.name),
    ),
  );
  assert.equal(denied.error.code, -32602);
});

test("installed MCP preserves inbox scope and send idempotency against a local API", async (t) => {
  const received = [];
  const server = createServer(async (req, res) => {
    let body = "";
    for await (const chunk of req) body += chunk;
    received.push({ url: req.url, headers: req.headers, body });
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ id: inbox, status: "queued" }));
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  t.after(() => {
    server.closeAllConnections();
    server.close();
  });
  const send = {
    name: "send_message",
    arguments: {
      to: ["approved@example.com"],
      text: "Controlled test",
      requestKey: "stored-request-1",
    },
  };
  const result = await run(
    [],
    [
      ...init,
      {
        jsonrpc: "2.0",
        id: 2,
        method: "tools/call",
        params: { name: "list_messages", arguments: { limit: 2 } },
      },
      { jsonrpc: "2.0", id: 3, method: "tools/call", params: send },
      { jsonrpc: "2.0", id: 4, method: "tools/call", params: send },
      {
        jsonrpc: "2.0",
        id: 5,
        method: "tools/call",
        params: { name: "list_messages", arguments: { inbox: "other" } },
      },
    ],
    {
      EXPECTBOX_AGENT_ALLOW_SEND: "true",
      EXPECTBOX_AGENT_ORIGIN: `http://127.0.0.1:${server.address().port}`,
    },
  );
  assert.equal(result.code, 0, result.stderr);
  const messages = responses(result);
  assert.equal(messages.at(-1).error.code, -32602);
  assert.ok(messages.slice(1, -1).every((m) => !m.error && !m.result.isError));
  assert.equal(received.length, 3);
  assert.equal(
    received[0].url,
    `/api/agents/v1/inboxes/${inbox}/messages?limit=2`,
  );
  assert.equal(received[1].url, `/api/agents/v1/inboxes/${inbox}/send`);
  assert.equal(received[1].headers.authorization, `Bearer ${key}`);
  assert.equal(received[1].headers["idempotency-key"], "stored-request-1");
  assert.equal(received[1].body, received[2].body);
  assert.equal(
    received[1].headers["idempotency-key"],
    received[2].headers["idempotency-key"],
  );
});
