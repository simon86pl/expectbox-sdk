"""Expectbox agent client. Python 3.10+, standard library only."""
import json
import re
from urllib.request import Request, build_opener, HTTPRedirectHandler
from urllib.parse import urlparse, urlencode
from urllib.error import HTTPError


class _NoRedirect(HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


class _Client:
    def __init__(self, api_key, base_url="https://www.expectbox.com", timeout=30, prefix="exa"):
        u = urlparse(base_url)
        local = u.scheme == "http" and u.hostname in ("127.0.0.1", "localhost", "::1")
        if not u.hostname or (u.scheme != "https" and not local) or u.username or u.password or u.query or u.fragment or u.path not in ("", "/"):
            raise ValueError("Use an HTTPS origin or local test origin")
        if not re.fullmatch(prefix + r"_[a-zA-Z0-9_-]{43}", api_key or ""):
            raise ValueError("Agent API key required")
        self.base_url = base_url.rstrip("/")
        self.api_key = api_key
        if not isinstance(timeout, (int, float)) or not 0 < timeout <= 300:
            raise ValueError("Invalid timeout")
        self.timeout = timeout
        self.opener = build_opener(_NoRedirect())

    @staticmethod
    def _id(value):
        if not re.fullmatch(r"[a-fA-F0-9]{8}(?:-[a-fA-F0-9]{4}){3}-[a-fA-F0-9]{12}", value or ""):
            raise ValueError("Expected resource UUID")
        return value

    def _request(self, path, method="GET", body=None, key=None, binary=False):
        headers = {"Authorization": "Bearer " + self.api_key, "Content-Type": "application/json"}
        if key:
            headers["Idempotency-Key"] = key
        data = None if body is None else json.dumps(body).encode("utf-8")
        req = Request(self.base_url + "/api/agents/v1" + path, data=data, headers=headers, method=method)
        try:
            with self.opener.open(req, timeout=self.timeout) as response:
                result = response.read()
                return result if binary else json.loads(result)
        except HTTPError as error:
            error.close()
            raise


class ExpectboxAgent(_Client):
    def __init__(self, api_key, base_url="https://www.expectbox.com", timeout=30):
        super().__init__(api_key, base_url, timeout, prefix="exa")

    def inboxes(self):
        return self._request("/inboxes")

    def messages(self, inbox, **query):
        return self._request(f"/inboxes/{self._id(inbox)}/messages?" + urlencode(query))

    def message(self, inbox, message):
        return self._request(f"/inboxes/{self._id(inbox)}/messages/{self._id(message)}")

    def thread(self, inbox, thread):
        return self._request(f"/inboxes/{self._id(inbox)}/threads/{self._id(thread)}")

    def attachment(self, inbox, attachment):
        return self._request(f"/inboxes/{self._id(inbox)}/attachments/{self._id(attachment)}", binary=True)

    def draft(self, inbox, body):
        return self._request(f"/inboxes/{self._id(inbox)}/drafts", "POST", body)

    def edit_draft(self, inbox, draft, body):
        return self._request(f"/inboxes/{self._id(inbox)}/drafts/{self._id(draft)}", "PUT", body)

    def send(self, inbox, body, idempotency_key):
        if not idempotency_key:
            raise ValueError("Persist an idempotency key before sending")
        return self._request(f"/inboxes/{self._id(inbox)}/send", "POST", body, idempotency_key)

    def reply(self, inbox, message, body, idempotency_key):
        if not idempotency_key:
            raise ValueError("Persist an idempotency key before replying")
        return self._request(f"/inboxes/{self._id(inbox)}/messages/{self._id(message)}/reply", "POST", body, idempotency_key)

    def events(self, cursor="0"):
        return self._request("/events?" + urlencode({"cursor": cursor}))

    def senders(self, inbox):
        return self._request(f"/inboxes/{self._id(inbox)}/senders")

    def allow_sender(self, inbox, match_type, match_value, reason):
        return self._request(f"/inboxes/{self._id(inbox)}/senders", "POST", {"matchType": match_type, "matchValue": match_value, "reason": reason})


class ExpectboxProject(_Client):
    def __init__(self, api_key, base_url="https://www.expectbox.com", timeout=30):
        super().__init__(api_key, base_url, timeout, prefix="exp")

    def project(self):
        return self._request("/project")

    def inboxes(self):
        return self._request("/project/inboxes")

    def create_inbox(self, body, idempotency_key):
        if not idempotency_key:
            raise ValueError("Persist an idempotency key before creating an inbox")
        return self._request("/project/inboxes", "POST", body, idempotency_key)

    def create_inbox_key(self, inbox, name, scopes, days=90):
        return self._request(f"/project/inboxes/{self._id(inbox)}/keys", "POST", {"name": name, "scopes": scopes, "days": days})

    def revoke_inbox_key(self, inbox, key):
        return self._request(f"/project/inboxes/{self._id(inbox)}/keys/{self._id(key)}", "DELETE")
