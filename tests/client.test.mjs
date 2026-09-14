import { test } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { ExpectboxProject, ExpectboxAgent } from "expectbox-agents";
const id = "12345678-1234-1234-1234-123456789abc";
test("installed SDK separates credentials and preserves provisioning identity", async (t) => {
  const received = [];
  const server = createServer(async (req, res) => {
    let body = "";
    for await (const chunk of req) body += chunk;
    received.push({
      url: req.url,
      headers: req.headers,
      body,
      method: req.method,
    });
    if (req.url.endsWith("/project")) {
      res.writeHead(307, { Location: "/no" });
      res.end();
      return;
    }
    res.setHeader("Content-Type", "application/json");
    res.end(
      JSON.stringify({ id, email: "test@agent.example.com", name: "Test" }),
    );
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  t.after(() => {
    server.closeAllConnections();
    server.close();
  });
  const baseUrl = `http://127.0.0.1:${server.address().port}`,
    key = "exp_" + "p".repeat(43);
  const project = new ExpectboxProject({ apiKey: key, baseUrl });
  assert.throws(() => new ExpectboxAgent({ apiKey: key }), /key/i);
  assert.throws(
    () => new ExpectboxProject({ apiKey: "exa_" + "a".repeat(43) }),
    /key/i,
  );
  assert.ok(!JSON.stringify(project).includes(key));
  for (let n = 0; n < 2; n++)
    await project.createInbox({ name: "Test", username: "test" }, "saved-key");
  assert.equal(received[0].url, "/api/agents/v1/project/inboxes");
  assert.equal(received[0].headers["idempotency-key"], "saved-key");
  assert.equal(received[0].body, received[1].body);
  await project.createInboxKey(id, {
    name: "Runtime",
    scopes: ["messages:read"],
  });
  await project.revokeInboxKey(id, id);
  assert.equal(received[3].method, "DELETE");
  assert.throws(() => project.createInbox({}, ""), /idempotency/);
  assert.throws(() => project.createInboxKey("../../x", {}), /UUID/);
  await assert.rejects(project.project());
  assert.equal(received.length, 5);
  assert.ok(!received.some((r) => r.url === "/no"));
  for (const origin of [
    "http://example.com",
    "https://a:b@example.com",
    "https://example.com/api",
    "https://example.com/#x",
  ])
    assert.throws(() => new ExpectboxProject({ apiKey: key, baseUrl: origin }));
});
