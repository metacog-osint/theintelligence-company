"""Serve site/ locally with the response headers from firebase.json (CSP included).

`firebase serve` skips the headers, so a page can work locally and break live under the CSP. This server applies
every matching header rule the way Firebase Hosting does, so CSP problems show up before a deploy.

Usage: python tools/serve.py [port]   (default 5055)
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


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *a, **kw):
        super().__init__(*a, directory=str(SITE), **kw)

    def end_headers(self):
        path = self.path.split("?", 1)[0].lstrip("/")
        for rx, headers in RULES:
            if rx.match(path):
                for h in headers:
                    self.send_header(h["key"], h["value"])
        super().end_headers()


if __name__ == "__main__":
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 5055
    print(f"Serving {SITE} on http://127.0.0.1:{port} with firebase.json headers", flush=True)
    http.server.ThreadingHTTPServer(("127.0.0.1", port), Handler).serve_forever()
