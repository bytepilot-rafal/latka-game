#!/usr/bin/env python3
"""Tiny static server for the game (no caching, so edits show up on reload).

Usage:  python3 server.py [port]
"""
import http.server
import os
import sys

os.chdir(os.path.dirname(os.path.abspath(__file__)))


class Handler(http.server.SimpleHTTPRequestHandler):
    extensions_map = {
        **http.server.SimpleHTTPRequestHandler.extensions_map,
        ".js": "text/javascript",
        ".mjs": "text/javascript",
    }

    def end_headers(self):
        self.send_header("Cache-Control", "no-store, max-age=0")
        super().end_headers()

    def do_POST(self):
        # dev helper: the game can save a PNG render into ./renders (used for model previews)
        import base64, re, urllib.parse
        q = urllib.parse.urlparse(self.path)
        name = re.sub(r"[^a-z0-9_-]", "", urllib.parse.parse_qs(q.query).get("name", ["render"])[0].lower()) or "render"
        if q.path != "/save-render":
            self.send_error(404); return
        data = self.rfile.read(int(self.headers.get("Content-Length", 0))).decode()
        os.makedirs("renders", exist_ok=True)
        with open(os.path.join("renders", name + ".png"), "wb") as f:
            f.write(base64.b64decode(data.split(",", 1)[-1]))
        self.send_response(200); self.end_headers(); self.wfile.write(b"ok")

    def log_message(self, fmt, *args):
        pass


if __name__ == "__main__":
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 5173
    with http.server.ThreadingHTTPServer(("127.0.0.1", port), Handler) as httpd:
        print(f"Przygody zaginionej Latki -> http://localhost:{port}")
        httpd.serve_forever()
