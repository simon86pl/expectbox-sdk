# Expectbox Agents SDK

[Website](https://www.expectbox.com/) · [Expectbox Agents](https://www.expectbox.com/agents/) · [API documentation](https://www.expectbox.com/agent-sdk/README.md) · [Releases](https://github.com/simon86pl/expectbox-sdk/releases)

Official JavaScript/TypeScript and Python clients for [Expectbox Agents](https://www.expectbox.com/agents/).
This repository contains the clients, examples and API contract; the hosted mail service is separate.

## Install

Node.js 22+:

```sh
npm install expectbox-agents
```

Python 3.10+:

```sh
python -m pip install https://github.com/simon86pl/expectbox-sdk/releases/download/v0.1.1/expectbox_agents-0.1.1-py3-none-any.whl
```

JavaScript and TypeScript use the [npm package](https://www.npmjs.com/package/expectbox-agents). The Python command installs a versioned GitHub release artifact; PyPI publication is not enabled yet. See [release instructions](https://github.com/simon86pl/expectbox-sdk/blob/main/RELEASING.md).

## Before connecting

1. [Create an Agents account](https://www.expectbox.com/mail?product=agents&signup=1&view=agents) using your current external email, or sign in to an existing Expectbox account.
2. Verify the email code, then activate a separate Agents subscription or obtain admin-granted Agents access. Personal mailbox payment does not unlock Agents.
3. In Agents → Project API keys, create a key with the permissions you need. **Project keys (`exp_…`) belong on your backend. Individual agents receive scoped inbox keys (`exa_…`).**

Production provisioning also requires the operator to activate agent mail and DNS/DKIM. A disabled service returns HTTP 503; creating an account or installing this SDK does not enable mail delivery.

## Provision an agent (TypeScript / JavaScript)

```js
import { ExpectboxProject, ExpectboxAgent } from 'expectbox-agents';

const project = new ExpectboxProject({ apiKey: process.env.EXPECTBOX_PROJECT_API_KEY });
const inbox = await project.createInbox({
  name: 'Research assistant',
  username: 'research',
  mode: 'drafts',
  senderManagementMode: 'restricted',
  senderManagementAllow: ['updates.example.com'],
}, 'research-inbox-v1'); // Persist this key; reuse it only for the same operation.

const credential = await project.createInboxKey(inbox.id, {
  name: 'Research runtime',
  scopes: ['messages:read', 'drafts:write', 'events:read', 'senders:write'],
  days: 90,
});
// Store credential.key in your secret manager. It is returned only once.
const agent = new ExpectboxAgent({ apiKey: credential.key });
await agent.allowSender(inbox.id, {
  matchType: 'domain', matchValue: 'updates.example.com', reason: 'Requested research updates',
});
const page = await agent.messages(inbox.id, { limit: 20 });
console.log(page.items.length);
```

New inboxes default to read-only with no approved senders, no sending and no sender-management delegation. Setting a delegation does not itself allow incoming mail: call `allowSender` or approve it in the panel. Existing owner blocks always take priority.

## Python

```python
import os
from expectbox_agents import ExpectboxProject, ExpectboxAgent

project = ExpectboxProject(os.environ['EXPECTBOX_PROJECT_API_KEY'])
inbox = project.create_inbox({'name': 'Research assistant', 'username': 'research'}, 'research-inbox-v1')
credential = project.create_inbox_key(inbox['id'], 'Research runtime', ['messages:read', 'events:read'])
# Store credential['key'] in your secret manager; never print it.
agent = ExpectboxAgent(credential['key'])
page = agent.messages(inbox['id'], limit=20)
print(len(page['items']))
```

## API and guarantees

- Base URL: `https://www.expectbox.com/api/agents/v1`. Override `baseUrl` / `base_url` with an HTTPS origin for another deployment; HTTP is accepted only on localhost for tests.
- Project: `project()`, `inboxes()`, `createInbox()`, `createInboxKey()`, `revokeInboxKey()`; Python uses snake_case.
- Inbox: `inboxes()`, `messages()`, `message()`, `thread()`, `attachment()`, `draft()`, `editDraft()` / `edit_draft()`, `send()`, `reply()`, `events()`, `senders()`, `allowSender()` / `allow_sender()`.
- Messages use `items` and `next`. Pass `next.before` and `next.beforeId` to get the next page. Events return `items`, `cursor` and `retentionDays`; persist the cursor after processing.
- Delivery is queued, not guaranteed by a successful send response. Sending needs `messages:send`, inbox mode `send`, an approved recipient and available quota. Unknown incoming senders are rejected before storage.
- Inbox creation, sending and replies require your persisted idempotency key. Same key and content return the same result; changed content returns 409. Inbox keys are not idempotent: do not retry key creation blindly after a timeout; inspect/revoke unused keys in the panel.
- No automatic retries. Retry GETs with backoff; retry idempotent writes using the original key. Errors expose `.status` in JavaScript and standard `urllib.error.HTTPError.code` in Python.
- Timeouts default to 30 seconds. Configure `timeoutMs` (JS) or `timeout` in seconds (Python). Redirects are rejected so credentials cannot follow them to another origin.
- Keys expire and can be revoked. Project/inbox limits and paid access are checked by the server, not the SDK. Revoking a project key does not revoke inbox keys it issued; revoke those separately.
- Never include API keys in client-side apps, source control, logs or prompts. These clients do not execute email content or send messages automatically.

See [openapi.json](https://github.com/simon86pl/expectbox-sdk/blob/main/openapi.json) for the project management contract, TypeScript declarations for return types, and [examples](https://github.com/simon86pl/expectbox-sdk/tree/main/examples) for runnable entry points. The full inbox API is documented at [Expectbox](https://www.expectbox.com/agent-sdk/README.md).

## Contributing

No API key or external mail is needed for tests:

```sh
npm test
python -m unittest discover -s tests -p '*_test.py'
```

The two clients share the API contract and local HTTP contract tests. They are maintained explicitly, not generated. Changes to routes or payloads must update the contract, both clients and tests together.
