#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Self-test for the Cook Schedule backend. Run:  python3 selftest.py

It starts the real server on a random port with a throw-away database and a
fake mail server, then exercises every feature. It never touches your real
backend/.env, your real database or the internet.
"""
import http.client
import json
import os
import re
import socketserver
import sys
import tempfile
import threading
import time

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import server  # noqa: E402

server.QUIET = True

PASS, FAIL = [], []


def check(label, ok, detail=""):
    (PASS if ok else FAIL).append(label)
    print(("  ok    " if ok else "  FAIL  ") + label + ("" if ok else "   <- " + str(detail)))


# ---------------------------------------------------------------- fake SMTP
class FakeSMTP(socketserver.StreamRequestHandler):
    def handle(self):
        w = lambda s: self.wfile.write((s + "\r\n").encode())
        w("220 fake ready")
        data_mode, buf, mail = False, [], {"to": []}
        while True:
            line = self.rfile.readline()
            if not line:
                break
            text = line.decode("utf-8", "replace")
            if data_mode:
                if text.strip() == ".":
                    data_mode = False
                    mail["data"] = "".join(buf)
                    self.server.mails.append(mail)
                    w("250 queued")
                else:
                    buf.append(text)
                continue
            cmd = text.strip().upper()
            if cmd.startswith("EHLO") or cmd.startswith("HELO"):
                w("250 fake")
            elif cmd.startswith("MAIL FROM"):
                w("250 ok")
            elif cmd.startswith("RCPT TO"):
                mail["to"].append(text.strip()[8:])
                w("250 ok")
            elif cmd == "DATA":
                data_mode = True
                w("354 go")
            elif cmd == "QUIT":
                w("221 bye")
                break
            else:
                w("250 ok")


def start_fake_smtp():
    srv = socketserver.ThreadingTCPServer(("127.0.0.1", 0), FakeSMTP)
    srv.daemon_threads = True
    srv.allow_reuse_address = True
    srv.mails = []
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    return srv


# ------------------------------------------------------------------ helpers
def start_backend(extra):
    tmp = tempfile.mkdtemp(prefix="cook-selftest-")
    env = {"HOST": "127.0.0.1", "PORT": "0", "DB_PATH": os.path.join(tmp, "t.db"),
           "ALLOWED_ORIGINS": "https://good.example"}
    env.update(extra)
    httpd = server.create_server(server.Config(env))
    threading.Thread(target=httpd.serve_forever, daemon=True).start()
    return httpd, httpd.server_address[1]


def call(port, method, path, body=None, headers=None):
    conn = http.client.HTTPConnection("127.0.0.1", port, timeout=15)
    hdrs = dict(headers or {})
    hdrs.setdefault("User-Agent", "Mozilla/5.0 (SelfTest Phone)")
    data = None
    if body is not None:
        data = body if isinstance(body, (bytes, str)) else json.dumps(body)
        hdrs.setdefault("Content-Type", "application/json")
    conn.request(method, path, body=data, headers=hdrs)
    r = conn.getresponse()
    raw = r.read()
    heads = {k.lower(): v for k, v in r.getheaders()}
    try:
        parsed = json.loads(raw.decode("utf-8"))
    except Exception:
        parsed = raw
    conn.close()
    return r.status, parsed, heads


def wait_for(fn, seconds=6):
    end = time.time() + seconds
    while time.time() < end:
        v = fn()
        if v:
            return v
        time.sleep(0.1)
    return None


def main():
    smtp = start_fake_smtp()
    OWNER = "owner-secret@example.test"
    TOKEN = "t" * 32
    httpd, port = start_backend({
        "ADMIN_TOKEN": TOKEN, "NOTIFY_TO": OWNER, "SMTP_HOST": "127.0.0.1",
        "SMTP_PORT": str(smtp.server_address[1]), "SMTP_SECURITY": "none",
        "SMTP_USER": "sender@example.test", "SMTP_PASS": "x"})

    print("\nbasics")
    s, b, _ = call(port, "GET", "/api/health")
    check("health endpoint answers", s == 200 and b.get("ok") is True and b.get("mail_configured") is True, (s, b))

    print("\nvisitor counting (per day, anonymous)")
    ua1, ua2 = {"User-Agent": "Mozilla/5.0 PhoneA"}, {"User-Agent": "Mozilla/5.0 PhoneB"}
    s, b, _ = call(port, "POST", "/api/visit", {}, ua1)
    check("first visit counts as 1 visitor today", s == 200 and b["today"] == 1, b)
    s, b, _ = call(port, "POST", "/api/visit", {}, ua1)
    check("same visitor again is NOT a second visitor", b["today"] == 1 and b["total_views"] == 2, b)
    s, b, _ = call(port, "POST", "/api/visit", {}, ua2)
    check("a different visitor makes 2", b["today"] == 2 and b["total_visits"] == 2, b)
    s, b, _ = call(port, "POST", "/api/visit", {}, {"User-Agent": "Googlebot/2.1"})
    check("bots are not counted", b["today"] == 2, b)
    s, b, _ = call(port, "GET", "/api/visit", None, {"User-Agent": "Mozilla/5.0 PhoneC"})
    check("reading the count (GET) never changes it", b["today"] == 2, b)

    print("\nanalytics events")
    s, _, _ = call(port, "POST", "/api/event", {"name": "affiliate_click", "props": {"dish": "Poha", "kind": "readymade"}},
                   {"Content-Type": "text/plain;charset=UTF-8"})
    check("valid event accepted (text/plain, no CORS preflight needed)", s == 204, s)
    for _ in range(2):
        call(port, "POST", "/api/event", {"name": "affiliate_click", "props": {"dish": "Poha", "kind": "readymade"}})
    s, _, _ = call(port, "POST", "/api/event", {"name": "DROP TABLE;"})
    check("bad event name rejected", s == 400, s)
    s, _, _ = call(port, "POST", "/api/event", "x" * 5000)
    check("oversized body rejected", s == 413, s)

    print("\nfeedback")
    s, b, _ = call(port, "POST", "/api/feedback", {"name": "Priya", "message": "Loved the grocery list!"})
    check("feedback accepted", s == 200 and b.get("ok") is True, (s, b))
    sent = wait_for(lambda: [m for m in smtp.mails if "Loved the grocery list" in m.get("data", "")])
    check("feedback was e-mailed to the owner's address", bool(sent) and OWNER in sent[0]["to"][0], smtp.mails)
    if sent:
        body_only = sent[0]["data"].replace("\r\n", "\n").split("\n\n", 1)[-1]
        check("owner's address is NOT in the mail body", OWNER not in body_only, body_only)
    s, b, _ = call(port, "POST", "/api/feedback", {"message": "hi"})
    check("too-short message rejected", s == 400, (s, b))
    n_before = httpd.store.feedback_list(100)["total"]
    s, b, _ = call(port, "POST", "/api/feedback", {"message": "spam spam spam", "website": "http://spam"})
    check("honeypot bot gets a fake OK but nothing is stored",
          s == 200 and httpd.store.feedback_list(100)["total"] == n_before)
    s, b, _ = call(port, "POST", "/api/feedback",
                   {"name": "Eve\r\nBcc: evil@example.test", "message": "header injection attempt"})
    inj = wait_for(lambda: [m for m in smtp.mails if "header injection attempt" in m.get("data", "")])
    head = inj[0]["data"].replace("\r\n", "\n").split("\n\n", 1)[0] if inj else ""
    check("header-injection attempt does not create extra mail headers",
          s == 200 and bool(inj) and "\nBcc:" not in head and "evil@example.test" not in " ".join(inj[0]["to"]), head)
    codes = [call(port, "POST", "/api/feedback", {"message": "flood number %d" % i})[0] for i in range(8)]
    check("flooding is rate-limited (429 after the hourly limit)", 429 in codes, codes)

    print("\nowner dashboard")
    s, _, _ = call(port, "GET", "/api/admin/summary")
    check("no token -> 401", s == 401, s)
    s, _, _ = call(port, "GET", "/api/admin/summary", None, {"Authorization": "Bearer wrong"})
    check("wrong token -> 401", s == 401, s)
    auth = {"Authorization": "Bearer " + TOKEN}
    s, b, _ = call(port, "GET", "/api/admin/summary", None, auth)
    top = (b.get("top_affiliate_30d") or [{}])[0] if isinstance(b, dict) else {}
    check("right token shows visitors + top clicked product",
          s == 200 and b["today"] == 2 and top.get("dish") == "Poha" and top.get("clicks") == 3, (s, b))
    s, b, _ = call(port, "GET", "/api/admin/feedback", None, auth)
    check("feedback inbox lists the saved messages", s == 200 and b["total"] >= 2, (s, b))
    s, _, h = call(port, "GET", "/api/admin/summary", None, {**auth, "Origin": "https://good.example"})
    check("admin API is never opened to cross-site pages", "access-control-allow-origin" not in h, h)

    print("\nbrowser (CORS) rules")
    s, _, h = call(port, "POST", "/api/visit", {}, {"Origin": "https://good.example"})
    check("allowed website gets CORS permission", h.get("access-control-allow-origin") == "https://good.example", h)
    s, _, h = call(port, "POST", "/api/visit", {}, {"Origin": "https://evil.example"})
    check("other websites get no CORS permission", "access-control-allow-origin" not in h, h)
    s, _, h = call(port, "OPTIONS", "/api/feedback", None, {"Origin": "https://good.example"})
    check("preflight answered", s == 204 and "POST" in h.get("access-control-allow-methods", ""), (s, h))

    print("\nwebsite files")
    s, b, h = call(port, "GET", "/")
    check("home page is served", s == 200 and b"Busywomen" in b, s)
    check("security headers present (CSP, nosniff)",
          "content-security-policy" in h and h.get("x-content-type-options") == "nosniff", h)
    for p in ("/js/app.js", "/css/styles.css", "/css/fonts.css", "/manifest.json", "/sw.js",
              "/fonts/plus-jakarta-sans-latin-400-normal.woff2"):
        s, _, _ = call(port, "GET", p)
        check("serves " + p, s == 200, s)
    for p in ("/backend/server.py", "/backend/.env", "/backend/data/t.db", "/README.md",
              "/../backend/server.py", "/%2e%2e/backend/server.py", "/js/../backend/server.py",
              "/js/", "/.git/config", "/js/%2e%2e/%2e%2e/backend/.env"):
        s, _, _ = call(port, "GET", p)
        check("blocks " + p, s == 404, s)
    s, b, h = call(port, "GET", "/admin")
    check("admin page loads (token still required for data)", s == 200 and "x-frame-options" in h, (s, h))

    print("\nthe owner's address never reaches visitors")
    root = server.PROJECT_ROOT
    emailish = re.compile(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+\.[A-Za-z]{2,}")
    leaks = []
    for folder in ("js", "css"):
        for name in os.listdir(os.path.join(root, folder)):
            path = os.path.join(root, folder, name)
            if os.path.isfile(path) and name.endswith((".js", ".css")):
                leaks += [(name, m) for m in emailish.findall(open(path, encoding="utf-8").read())]
    for name in ("index.html", "manifest.json", "sw.js"):
        leaks += [(name, m) for m in emailish.findall(open(os.path.join(root, name), encoding="utf-8").read())]
    check("no e-mail address anywhere in the website files", not leaks, leaks)
    s, b, _ = call(port, "GET", "/api/admin/feedback", None, {"Authorization": "Bearer nope"})
    check("the address is not in any API error either", OWNER.encode() not in json.dumps(b).encode())

    print("\nwithout mail settings / admin token")
    httpd2, port2 = start_backend({})
    s, b, _ = call(port2, "POST", "/api/feedback", {"message": "stored even without mail setup"})
    st = wait_for(lambda: [f for f in httpd2.store.feedback_list(10)["items"]
                           if f["mail_status"] == "not-configured"])
    check("feedback is still saved when e-mail is not set up", s == 200 and bool(st))
    s, _, _ = call(port2, "GET", "/api/admin/summary", None, {"Authorization": "Bearer " + "a" * 32})
    check("admin stays disabled until ADMIN_TOKEN is set", s == 503, s)
    httpd3, port3 = start_backend({"ADMIN_TOKEN": "short"})
    s, _, _ = call(port3, "GET", "/api/admin/summary", None, {"Authorization": "Bearer short"})
    check("a too-short ADMIN_TOKEN is refused", s == 503, s)

    print("\n%d passed, %d failed" % (len(PASS), len(FAIL)))
    if FAIL:
        print("FAILED:", ", ".join(FAIL))
        sys.exit(1)


if __name__ == "__main__":
    main()
