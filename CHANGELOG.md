# Changelog

## 0.2.1

- Validate MCP argument types, ranges, enums and pagination cursors before calling the API; return actionable tool errors without exposing input values.
- Reject malformed initialization and request-shaped notifications without emitting incomplete JSON-RPC responses.
- Support folder filtering in local MCP and preserve full-precision message cursors.
- Add regression tests for invalid calls and valid pagination through the packaged executable. JavaScript and Python client APIs are unchanged.

## 0.2.0

- Include the local MCP server in the npm package, with the `expectbox-mcp` executable.
- Run MCP with `npx -y expectbox-agents@0.2.0`; no manual script downloads required.
- Add CLI help, version output and secret-safe configuration errors. Sending and sender enrollment remain opt-in and subject to server permissions.
- Document local npm and hosted OAuth connections. Python API behavior is unchanged.

## 0.1.1

- Publish the JavaScript/TypeScript SDK to npm as `expectbox-agents`.
- Link the Expectbox homepage prominently from the README and package metadata.
- Use absolute documentation links so they also work on the npm package page.

## 0.1.0

- JavaScript/TypeScript and Python clients for scoped agent inboxes.
- Separate project client: inspect limits, list/create inboxes, issue/revoke inbox keys.
- Explicit idempotency for inbox creation, sending and replies.
- Configurable timeouts, HTTPS origin validation and redirect isolation.
- Installable npm tarball, Python wheel/source distribution, local HTTP tests and release workflow.
