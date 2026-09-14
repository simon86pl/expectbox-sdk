import json
import threading
import unittest
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.error import HTTPError
from expectbox_agents import ExpectboxProject, ExpectboxAgent

KEY = 'exp_' + 'p' * 43
INBOX = '12345678-1234-1234-1234-123456789abc'

class ClientTest(unittest.TestCase):
    def test_contract(self):
        seen = []
        class Handler(BaseHTTPRequestHandler):
            def log_message(self, *args): pass
            def do_POST(self):
                seen.append((self.path, self.headers, self.rfile.read(int(self.headers['Content-Length']))))
                self.send_response(200); self.end_headers()
                self.wfile.write(json.dumps({'id': INBOX}).encode())
            def do_GET(self):
                seen.append((self.path, self.headers, None))
                self.send_response(307); self.send_header('Location', '/no'); self.end_headers()
        server = ThreadingHTTPServer(('127.0.0.1', 0), Handler)
        thread = threading.Thread(target=server.serve_forever, daemon=True); thread.start()
        try:
            client = ExpectboxProject(KEY, f'http://127.0.0.1:{server.server_port}')
            for _ in range(2): client.create_inbox({'name': 'Test', 'username': 'test'}, 'saved-key')
            self.assertEqual(seen[0][0], '/api/agents/v1/project/inboxes')
            self.assertEqual(seen[0][1]['Idempotency-Key'], 'saved-key')
            self.assertEqual(seen[0][2], seen[1][2])
            client.create_inbox_key(INBOX, 'Runtime', ['messages:read'])
            with self.assertRaises(HTTPError): client.project()
            self.assertEqual(len(seen), 4)
            with self.assertRaises(ValueError): client.create_inbox({}, '')
            with self.assertRaises(ValueError): client.create_inbox_key('../x', 'Runtime', ['messages:read'])
            with self.assertRaises(ValueError): ExpectboxAgent(KEY)
        finally:
            server.shutdown(); server.server_close(); thread.join()

if __name__ == '__main__': unittest.main()
