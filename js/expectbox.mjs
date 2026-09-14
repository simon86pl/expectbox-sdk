class Client {
  constructor(
    { apiKey, baseUrl = "https://www.expectbox.com", timeoutMs = 30000 } = {},
    prefix,
  ) {
    const url = new URL(baseUrl);
    if (
      (url.protocol !== "https:" &&
        !(
          url.protocol === "http:" &&
          ["127.0.0.1", "localhost", "[::1]"].includes(url.hostname)
        )) ||
      url.username ||
      url.password ||
      url.search ||
      url.hash ||
      url.pathname !== "/"
    )
      throw new Error("Use an HTTPS origin or local test origin.");
    if (!new RegExp(`^${prefix}_[a-zA-Z0-9_-]{43}$`).test(apiKey || ""))
      throw new Error("Agent API key required.");
    this.baseUrl = url.origin;
    Object.defineProperty(this, "apiKey", { value: apiKey });
    if (!Number.isInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 300000)
      throw new Error("Invalid timeoutMs.");
    this.timeoutMs = timeoutMs;
  }
  id(value) {
    if (!/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(value || ""))
      throw new Error("Expected resource UUID.");
    return value;
  }
  async request(
    path,
    { method = "GET", body, idempotencyKey, binary = false } = {},
  ) {
    const res = await fetch(this.baseUrl + "/api/agents/v1" + path, {
      method,
      redirect: "error",
      signal: AbortSignal.timeout(this.timeoutMs),
      headers: {
        Authorization: "Bearer " + this.apiKey,
        "Content-Type": "application/json",
        ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {}),
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    if (!res.ok) {
      const error = new Error("Expectbox API " + res.status);
      error.status = res.status;
      try {
        error.message = (await res.json()).message || error.message;
      } catch {}
      throw error;
    }
    return binary ? new Uint8Array(await res.arrayBuffer()) : res.json();
  }
}
export class ExpectboxAgent extends Client {
  constructor(options) {
    super(options, "exa");
  }
  inboxes() {
    return this.request("/inboxes");
  }
  messages(inbox, query = {}) {
    return this.request(
      `/inboxes/${this.id(inbox)}/messages?` +
        new URLSearchParams(
          Object.entries(query).filter(([, v]) => v !== undefined),
        ),
    );
  }
  message(inbox, id) {
    return this.request(`/inboxes/${this.id(inbox)}/messages/${this.id(id)}`);
  }
  thread(inbox, id) {
    return this.request(`/inboxes/${this.id(inbox)}/threads/${this.id(id)}`);
  }
  attachment(inbox, id) {
    return this.request(
      `/inboxes/${this.id(inbox)}/attachments/${this.id(id)}`,
      { binary: true },
    );
  }
  draft(inbox, body) {
    return this.request(`/inboxes/${this.id(inbox)}/drafts`, {
      method: "POST",
      body,
    });
  }
  editDraft(inbox, id, body) {
    return this.request(`/inboxes/${this.id(inbox)}/drafts/${this.id(id)}`, {
      method: "PUT",
      body,
    });
  }
  send(inbox, body, idempotencyKey) {
    if (!idempotencyKey)
      throw new Error("Persist an idempotency key before sending.");
    return this.request(`/inboxes/${this.id(inbox)}/send`, {
      method: "POST",
      body,
      idempotencyKey,
    });
  }
  reply(inbox, id, body, idempotencyKey) {
    if (!idempotencyKey)
      throw new Error("Persist an idempotency key before replying.");
    return this.request(
      `/inboxes/${this.id(inbox)}/messages/${this.id(id)}/reply`,
      { method: "POST", body, idempotencyKey },
    );
  }
  events(cursor = "0") {
    return this.request("/events?" + new URLSearchParams({ cursor }));
  }
  senders(inbox) {
    return this.request(`/inboxes/${this.id(inbox)}/senders`);
  }
  allowSender(inbox, body) {
    return this.request(`/inboxes/${this.id(inbox)}/senders`, {
      method: "POST",
      body,
    });
  }
}

export class ExpectboxProject extends Client {
  constructor(options) {
    super(options, "exp");
  }
  project() {
    return this.request("/project");
  }
  inboxes() {
    return this.request("/project/inboxes");
  }
  createInbox(body, idempotencyKey) {
    if (!idempotencyKey)
      throw new Error("Persist an idempotency key before creating an inbox.");
    return this.request("/project/inboxes", {
      method: "POST",
      body,
      idempotencyKey,
    });
  }
  createInboxKey(inbox, body) {
    return this.request(`/project/inboxes/${this.id(inbox)}/keys`, {
      method: "POST",
      body,
    });
  }
  revokeInboxKey(inbox, key) {
    return this.request(
      `/project/inboxes/${this.id(inbox)}/keys/${this.id(key)}`,
      { method: "DELETE" },
    );
  }
}
