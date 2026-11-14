"""Serve site/ locally with the response headers from firebase.json (CSP included).

`firebase serve` skips the headers, so a page can work locally and break live under the CSP. This server applies
every matching header rule the way Firebase Hosting does, so CSP problems show up before a deploy. A missing path
gets site/404.html with status 404, as it does live.

Usage: python tools/serve.py [port]   (default 5055; 0 picks a free port and prints it)
"""
import http.server
import json
import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
CONFIG = json.loads((ROOT / "firebase.json").read_text(encoding="utf-8"))
HOSTING = CONFIG["hosting"][0] if isinstance(CONFIG["hosting"], list) else CONFIG["hosting"]
SITE = ROOT / HOSTING.get("public", "site")


def glob_to_regex(glob):
    """Firebase-style glob (with ** and @(a|b)) to a regex over the path without its leading slash."""
    g = glob.lstrip("/")
    out, i = "", 0
    while i < len(g):
        if g.startswith("**/", i):
            out += "(?:.*/)?"; i += 3
        elif g.startswith("**", i):
            out += ".*"; i += 2
        elif g[i] == "*":
            out += "[^/]*"; i += 1
        elif g.startswith("@(", i):
            j = g.index(")", i)
            out += "(?:" + "|".join(re.escape(p) for p in g[i + 2:j].split("|")) + ")"; i = j + 1
        else:
            out += re.escape(g[i]); i += 1
    return re.compile("^" + out + "$")


RULES = [(glob_to_regex(r["source"]), r["headers"]) for r in HOSTING.get("headers", [])]


NOT_FOUND = SITE / "404.html"


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *a, **kw):
        super().__init__(*a, directory=str(SITE), **kw)

    def send_head(self):
        # A folder without index.html is a missing page live (Firebase never lists a folder), so not a listing here.
        p = pathlib.Path(self.translate_path(self.path))
        if p.is_dir() and not (p / "index.html").is_file():
            self.send_error(404)
            return None
        return super().send_head()

    def send_error(self, code, message=None, explain=None):
        """A missing path gets site/404.html with status 404, as Firebase Hosting serves it, at any depth."""
        if code != 404 or not NOT_FOUND.is_file():
            return super().send_error(code, message, explain)
        body = NOT_FOUND.read_bytes()
        self.log_error("code 404, serving 404.html for %s", self.path)
        self.send_response(404)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        if self.command != "HEAD":
            self.wfile.write(body)

    def end_headers(self):
        path = self.path.split("?", 1)[0].lstrip("/")
        for rx, headers in RULES:
            if rx.match(path):
                for h in headers:
                    self.send_header(h["key"], h["value"])
        super().end_headers()


class Server(http.server.ThreadingHTTPServer):
    # Python's default listen backlog is 5. A browser opens several connections at once, and on Windows a connection
    # past the backlog is refused outright (net::ERR_CONNECTION_REFUSED), which failed browser tests under load.
    request_queue_size = 128
    daemon_threads = True


if __name__ == "__main__":
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 5055
    server = Server(("127.0.0.1", port), Handler)  # port 0 picks a free one (the tests do)
    print(f"Serving {SITE} on http://127.0.0.1:{server.server_address[1]} with firebase.json headers", flush=True)
    server.serve_forever()
