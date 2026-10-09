#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Busywomen Cook Schedule - our own backend.

Python 3 standard library ONLY (no pip install, no third-party services).
One small process does four jobs:

  1. POST /api/feedback   stores visitor feedback in our own SQLite file and
                          e-mails it to the owner through the owner's own
                          mailbox (SMTP). The owner's address lives only in
                          backend/.env on the server - it is never sent to
                          the browser, never in the page source.
  2. POST /api/visit      counts anonymous unique visitors PER DAY (so the
                          footer can show a real "visitors today" number).
  3. POST /api/event      our own analytics (affiliate clicks, shares, ...).
  4. /api/admin/*         owner-only stats + feedback inbox (needs ADMIN_TOKEN).

It can also serve the website itself (SERVE_STATIC=1, the default) so the
whole app can run from one self-hosted process, e.g. on King Cloud.

Privacy: no cookies. Raw IP addresses and user agents are never stored; a
visitor is a salted one-way hash that changes every day, so nobody can be
followed from one day to the next.

Run:  python3 server.py        (settings come from backend/.env)
Test: python3 selftest.py
"""
import hashlib
import hmac
import json
import mimetypes
import os
import re
import secrets
import smtplib
import sqlite3
import ssl
import sys
import threading
import time
from contextlib import closing
from datetime import datetime, timedelta, timezone
from email.message import EmailMessage
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import unquote, urlparse, parse_qs

HERE = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(HERE)
IST = timezone(timedelta(hours=5, minutes=30))  # "today" means India time
QUIET = False  # the self-test switches request logging off

DEFAULT_ORIGINS = "https://masskingslin.github.io"  # GitHub Pages (origin = no path)

# Only these website files/folders are ever served. Everything else (this
# backend folder, the database, .env, the README...) is unreachable.
STATIC_FILES = {"index.html", "manifest.json", "sw.js", "robots.txt",
                "sitemap.xml", "og-image.png", "og-image.jpg", "favicon.ico"}
STATIC_DIRS = {"css", "js", "icons", "fonts"}

CONTENT_TYPES = {
    ".html": "text/html; charset=utf-8",
    ".js": "application/javascript; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".xml": "application/xml; charset=utf-8",
    ".txt": "text/plain; charset=utf-8",
    ".svg": "image/svg+xml",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".ico": "image/x-icon",
    ".woff2": "font/woff2",
}

BOT_RE = re.compile(
    r"bot|crawl|spider|slurp|curl|wget|headless|monitor|uptime|preview|"
    r"facebookexternalhit|python-requests|lighthouse|pingdom", re.I)
EVENT_NAME_RE = re.compile(r"^[a-z0-9_]{1,40}$")

SCHEMA = """
CREATE TABLE IF NOT EXISTS meta (k TEXT PRIMARY KEY, v TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS visits (
    day TEXT NOT NULL, vid TEXT NOT NULL, first_ts INTEGER NOT NULL,
    views INTEGER NOT NULL DEFAULT 1, PRIMARY KEY (day, vid));
CREATE TABLE IF NOT EXISTS events (
    id INTEGER PRIMARY KEY AUTOINCREMENT, ts INTEGER NOT NULL,
    name TEXT NOT NULL, props TEXT NOT NULL DEFAULT '{}');
CREATE INDEX IF NOT EXISTS idx_events_name_ts ON events (name, ts);
CREATE TABLE IF NOT EXISTS feedback (
    id INTEGER PRIMARY KEY AUTOINCREMENT, ts INTEGER NOT NULL,
    name TEXT NOT NULL DEFAULT '', message TEXT NOT NULL,
    mail_status TEXT NOT NULL DEFAULT 'pending');
"""


# --------------------------------------------------------------------------
# configuration
# --------------------------------------------------------------------------
def load_env_file(path):
    env = {}
    if os.path.isfile(path):
        with open(path, encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if not line or line.startswith("#") or "=" not in line:
                    continue
                key, val = line.split("=", 1)
                val = val.strip()
                if len(val) >= 2 and val[0] == val[-1] and val[0] in "\"'":
                    val = val[1:-1]
                env[key.strip()] = val
    return env


class Config:
    def __init__(self, env):
        def g(key, default=""):
            val = env.get(key)
            return default if val is None else str(val).strip()

        self.host = g("HOST", "127.0.0.1")
        self.port = int(g("PORT", "8090"))
        self.db_path = g("DB_PATH", os.path.join(HERE, "data", "app.db"))
        self.allowed_origins = {
            o.strip().rstrip("/")
            for o in g("ALLOWED_ORIGINS", DEFAULT_ORIGINS).split(",") if o.strip()}
        self.admin_token = g("ADMIN_TOKEN")
        self.notify_to = g("NOTIFY_TO")
        self.smtp_host = g("SMTP_HOST")
        self.smtp_port = int(g("SMTP_PORT", "465"))
        self.smtp_user = g("SMTP_USER")
        self.smtp_pass = g("SMTP_PASS")
        self.smtp_from = g("SMTP_FROM") or self.smtp_user
        self.smtp_security = g("SMTP_SECURITY", "ssl").lower()  # ssl|starttls|none
        self.serve_static = g("SERVE_STATIC", "1") == "1"
        self.static_root = g("STATIC_ROOT", PROJECT_ROOT)
        loopback = self.host in ("127.0.0.1", "localhost", "::1")
        self.trust_proxy = g("TRUST_PROXY", "1" if loopback else "0") == "1"
        self.csp = g("DISABLE_CSP", "0") != "1"

    @property
    def mail_configured(self):
        return bool(self.notify_to and self.smtp_host and self.smtp_user and self.smtp_pass)

    @property
    def admin_enabled(self):
        return len(self.admin_token) >= 16


# --------------------------------------------------------------------------
# storage
# --------------------------------------------------------------------------
class Store:
    def __init__(self, path):
        folder = os.path.dirname(path)
        if folder:
            os.makedirs(folder, exist_ok=True)
        self.path = path
        with closing(self._conn()) as c, c:
            c.executescript(SCHEMA)
        self.salt = self._get_salt()
        self.prune()

    def _conn(self):
        c = sqlite3.connect(self.path, timeout=10)
        c.row_factory = sqlite3.Row
        return c

    def _get_salt(self):
        with closing(self._conn()) as c, c:
            row = c.execute("SELECT v FROM meta WHERE k='salt'").fetchone()
            if row:
                return row["v"]
            salt = secrets.token_hex(32)
            c.execute("INSERT INTO meta (k, v) VALUES ('salt', ?)", (salt,))
            return salt

    def prune(self, keep_days=180):
        cutoff = int(time.time()) - keep_days * 86400
        with closing(self._conn()) as c, c:
            c.execute("DELETE FROM events WHERE ts < ?", (cutoff,))

    # -- visitors ----------------------------------------------------------
    def vid(self, day, ip, ua):
        raw = "|".join([self.salt, day, ip, ua]).encode("utf-8")
        return hashlib.sha256(raw).hexdigest()[:32]

    def record_visit(self, day, vid):
        with closing(self._conn()) as c, c:
            c.execute(
                "INSERT INTO visits (day, vid, first_ts, views) VALUES (?, ?, ?, 1) "
                "ON CONFLICT(day, vid) DO UPDATE SET views = views + 1",
                (day, vid, int(time.time())))

    def visit_stats(self, day):
        with closing(self._conn()) as c:
            today = c.execute("SELECT COUNT(*) AS n FROM visits WHERE day=?", (day,)).fetchone()["n"]
            row = c.execute("SELECT COUNT(*) AS n, COALESCE(SUM(views),0) AS v FROM visits").fetchone()
        return {"today": today, "total_visits": row["n"], "total_views": row["v"]}

    def daily_series(self, since_day):
        with closing(self._conn()) as c:
            rows = c.execute(
                "SELECT day, COUNT(*) AS visitors, SUM(views) AS views FROM visits "
                "WHERE day >= ? GROUP BY day ORDER BY day", (since_day,)).fetchall()
        return {r["day"]: {"visitors": r["visitors"], "views": r["views"]} for r in rows}

    # -- events ------------------------------------------------------------
    def add_event(self, name, props_json):
        with closing(self._conn()) as c, c:
            c.execute("INSERT INTO events (ts, name, props) VALUES (?, ?, ?)",
                      (int(time.time()), name, props_json))

    def event_counts(self, since_ts, limit=25):
        with closing(self._conn()) as c:
            rows = c.execute(
                "SELECT name, COUNT(*) AS n FROM events WHERE ts >= ? "
                "GROUP BY name ORDER BY n DESC LIMIT ?", (since_ts, limit)).fetchall()
        return [{"name": r["name"], "count": r["n"]} for r in rows]

    def affiliate_clicks(self, since_ts, limit=15):
        counts = {}
        with closing(self._conn()) as c:
            rows = c.execute(
                "SELECT props FROM events WHERE name='affiliate_click' AND ts >= ?",
                (since_ts,)).fetchall()
        for r in rows:
            try:
                p = json.loads(r["props"])
            except ValueError:
                continue
            key = (str(p.get("dish", ""))[:80], str(p.get("kind", ""))[:30])
            counts[key] = counts.get(key, 0) + 1
        top = sorted(counts.items(), key=lambda kv: -kv[1])[:limit]
        return [{"dish": k[0], "kind": k[1], "clicks": n} for k, n in top]

    # -- feedback ----------------------------------------------------------
    def add_feedback(self, name, message):
        with closing(self._conn()) as c, c:
            cur = c.execute("INSERT INTO feedback (ts, name, message) VALUES (?, ?, ?)",
                            (int(time.time()), name, message))
            return cur.lastrowid

    def set_mail_status(self, fid, status):
        with closing(self._conn()) as c, c:
            c.execute("UPDATE feedback SET mail_status=? WHERE id=?", (status[:120], fid))

    def feedback_list(self, limit=50):
        with closing(self._conn()) as c:
            rows = c.execute(
                "SELECT id, ts, name, message, mail_status FROM feedback "
                "ORDER BY id DESC LIMIT ?", (limit,)).fetchall()
            total = c.execute("SELECT COUNT(*) AS n FROM feedback").fetchone()["n"]
            unsent = c.execute(
                "SELECT COUNT(*) AS n FROM feedback WHERE mail_status != 'sent'").fetchone()["n"]
        items = [{"id": r["id"],
                  "time": datetime.fromtimestamp(r["ts"], IST).strftime("%Y-%m-%d %H:%M IST"),
                  "name": r["name"], "message": r["message"],
                  "mail_status": r["mail_status"]} for r in rows]
        return {"total": total, "not_emailed": unsent, "items": items}


# --------------------------------------------------------------------------
# small helpers
# --------------------------------------------------------------------------
class RateLimiter:
    """In-memory sliding window. Resets on restart, which is fine here."""

    def __init__(self):
        self._hits = {}
        self._lock = threading.Lock()

    def allow(self, bucket, key, limit, window_seconds):
        now = time.time()
        k = (bucket, key)
        with self._lock:
            hits = [t for t in self._hits.get(k, []) if now - t < window_seconds]
            if len(hits) >= limit:
                self._hits[k] = hits
                return False
            hits.append(now)
            self._hits[k] = hits
            if len(self._hits) > 5000:  # keep memory bounded
                for old in [kk for kk, v in self._hits.items() if not v or now - v[-1] > 3600]:
                    self._hits.pop(old, None)
            return True


class HttpError(Exception):
    def __init__(self, status, message):
        Exception.__init__(self, message)
        self.status = status
        self.message = message


def clean_line(text, limit):
    """Single-line, control-character-free text (safe for mail headers)."""
    return re.sub(r"[\x00-\x1f\x7f]+", " ", str(text)).strip()[:limit]


def clean_text(text, limit):
    """Multi-line text; strips control characters except newlines."""
    text = str(text).replace("\r\n", "\n").replace("\r", "\n")
    return re.sub(r"[\x00-\x09\x0b-\x1f\x7f]", "", text).strip()[:limit]


def today_ist():
    return datetime.now(IST).strftime("%Y-%m-%d")


def send_feedback_mail(cfg, fid, name, message):
    """E-mail one feedback to the owner via the owner's own SMTP mailbox."""
    if not cfg.mail_configured:
        return "not-configured"
    try:
        msg = EmailMessage()
        who = clean_line(name, 60)
        msg["Subject"] = "[Cook Schedule] Feedback" + (" from " + who if who else "")
        msg["From"] = cfg.smtp_from
        msg["To"] = cfg.notify_to
        stamp = datetime.now(IST).strftime("%Y-%m-%d %H:%M IST")
        msg.set_content("%s\n\n--\nFeedback #%d received %s\nFrom: %s\n"
                        % (message, fid, stamp, who or "(no name given)"))
        if cfg.smtp_security == "ssl":
            with smtplib.SMTP_SSL(cfg.smtp_host, cfg.smtp_port, timeout=25,
                                  context=ssl.create_default_context()) as s:
                s.login(cfg.smtp_user, cfg.smtp_pass)
                s.send_message(msg)
        else:
            with smtplib.SMTP(cfg.smtp_host, cfg.smtp_port, timeout=25) as s:
                if cfg.smtp_security == "starttls":
                    s.starttls(context=ssl.create_default_context())
                if cfg.smtp_security != "none":
                    s.login(cfg.smtp_user, cfg.smtp_pass)
                s.send_message(msg)
        return "sent"
    except Exception as e:  # never let a mail problem lose the feedback
        return "failed: " + type(e).__name__


def sanitize_props(props):
    if not isinstance(props, dict):
        return "{}"
    out = {}
    for k, v in list(props.items())[:10]:
        key = clean_line(k, 30)
        if not key:
            continue
        if isinstance(v, bool) or isinstance(v, (int, float)):
            out[key] = v
        else:
            out[key] = clean_line(v, 80)
    raw = json.dumps(out, ensure_ascii=False, separators=(",", ":"))
    return raw if len(raw) <= 600 else "{}"


def resolve_static(root, url_path):
    """Map a URL path to an allowed website file, or None."""
    p = unquote(url_path)
    if "\x00" in p or "\\" in p:
        return None
    parts = [x for x in p.split("/") if x != ""]
    if not parts:
        parts = ["index.html"]
    if any(x in (".", "..") or x.startswith(".") for x in parts):
        return None
    allowed = (len(parts) == 1 and parts[0] in STATIC_FILES) or \
              (len(parts) >= 2 and parts[0] in STATIC_DIRS)
    if not allowed:
        return None
    root_real = os.path.realpath(root)
    full = os.path.realpath(os.path.join(root_real, *parts))
    if not full.startswith(root_real + os.sep):
        return None
    if full.startswith(os.path.realpath(HERE) + os.sep):  # never serve the backend
        return None
    return full if os.path.isfile(full) else None


# --------------------------------------------------------------------------
# HTTP handler
# --------------------------------------------------------------------------
CSP = ("default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; "
       "script-src 'self'; font-src 'self'; connect-src 'self'; object-src 'none'; "
       "base-uri 'self'; form-action 'self'; frame-ancestors 'none'")


def make_handler(cfg, store, limiter):
    class Handler(BaseHTTPRequestHandler):
        protocol_version = "HTTP/1.1"
        server_version = "CookScheduleAPI"
        sys_version = ""

        # ---- plumbing ----------------------------------------------------
        def log_message(self, fmt, *args):
            if QUIET:
                return
            sys.stderr.write("%s %s\n" % (time.strftime("%H:%M:%S"), fmt % args))

        def ip(self):
            if cfg.trust_proxy:
                cf = self.headers.get("CF-Connecting-IP")
                if cf:
                    return cf.strip()[:64]
                xff = self.headers.get("X-Forwarded-For")
                if xff:
                    return xff.split(",")[0].strip()[:64]
            return self.client_address[0]

        def ua(self):
            return (self.headers.get("User-Agent") or "")[:300]

        def ip_key(self):
            return hashlib.sha256((store.salt + "|rl|" + self.ip()).encode()).hexdigest()[:20]

        def cors(self):
            origin = (self.headers.get("Origin") or "").rstrip("/")
            if origin and origin in cfg.allowed_origins:
                return {"Access-Control-Allow-Origin": origin, "Vary": "Origin"}
            return {"Vary": "Origin"}

        def common_headers(self):
            self.send_header("X-Content-Type-Options", "nosniff")
            self.send_header("Referrer-Policy", "strict-origin-when-cross-origin")
            self.send_header("Connection", "close")
            self.close_connection = True

        def send_bytes(self, status, body, ctype, extra=None):
            self.send_response(status)
            self.send_header("Content-Type", ctype)
            self.send_header("Content-Length", str(len(body)))
            for k, v in (extra or {}).items():
                self.send_header(k, v)
            self.common_headers()
            self.end_headers()
            if self.command != "HEAD":
                self.wfile.write(body)

        def send_json(self, status, obj, extra=None, cors=True):
            headers = {"Cache-Control": "no-store"}
            if cors:
                headers.update(self.cors())
            headers.update(extra or {})
            body = json.dumps(obj, ensure_ascii=False).encode("utf-8")
            self.send_bytes(status, body, "application/json; charset=utf-8", headers)

        def read_json(self, limit=8192):
            try:
                length = int(self.headers.get("Content-Length") or 0)
            except ValueError:
                raise HttpError(400, "bad content-length")
            if length < 0 or length > limit:
                raise HttpError(413, "request too large")
            raw = self.rfile.read(length) if length else b""
            if not raw:
                return {}
            try:
                data = json.loads(raw.decode("utf-8"))
            except (ValueError, UnicodeDecodeError):
                raise HttpError(400, "invalid json")
            if not isinstance(data, dict):
                raise HttpError(400, "expected a json object")
            return data

        def require_admin(self):
            if not cfg.admin_enabled:
                raise HttpError(503, "admin is disabled - set ADMIN_TOKEN (16+ characters) in backend/.env")
            if not limiter.allow("admin", self.ip_key(), 20, 60):
                raise HttpError(429, "too many attempts, slow down")
            auth = self.headers.get("Authorization", "")
            token = auth[7:] if auth.startswith("Bearer ") else ""
            if not hmac.compare_digest(token.encode("utf-8"), cfg.admin_token.encode("utf-8")):
                time.sleep(0.4)
                raise HttpError(401, "unauthorized")

        # ---- dispatch ----------------------------------------------------
        def dispatch(self):
            try:
                self.route()
            except HttpError as e:
                self.send_json(e.status, {"ok": False, "error": e.message})
            except Exception as e:  # pragma: no cover - last-resort guard
                sys.stderr.write("error: %r\n" % (e,))
                self.send_json(500, {"ok": False, "error": "server error"})

        do_GET = dispatch
        do_POST = dispatch
        do_HEAD = dispatch
        do_OPTIONS = dispatch

        def route(self):
            path = urlparse(self.path).path
            method = self.command

            if method == "OPTIONS":
                headers = self.cors()
                headers.update({"Access-Control-Allow-Methods": "GET, POST, OPTIONS",
                                "Access-Control-Allow-Headers": "Content-Type, Authorization",
                                "Access-Control-Max-Age": "600"})
                self.send_bytes(204, b"", "text/plain", headers)
                return

            if path == "/api/health" and method in ("GET", "HEAD"):
                self.send_json(200, {"ok": True, "mail_configured": cfg.mail_configured})
                return
            if path == "/api/visit":
                return self.api_visit(method)
            if path == "/api/event" and method == "POST":
                return self.api_event()
            if path == "/api/feedback" and method == "POST":
                return self.api_feedback()
            if path == "/api/admin/summary" and method == "GET":
                return self.api_admin_summary()
            if path == "/api/admin/feedback" and method == "GET":
                return self.api_admin_feedback()
            if path.startswith("/api/"):
                raise HttpError(404, "not found")

            if method not in ("GET", "HEAD"):
                raise HttpError(405, "method not allowed")
            if path in ("/admin", "/admin/"):
                return self.send_file(os.path.join(HERE, "admin.html"), admin=True)
            if path == "/admin/app.js":
                return self.send_file(os.path.join(HERE, "admin.js"), admin=True)
            if not cfg.serve_static:
                raise HttpError(404, "not found")
            full = resolve_static(cfg.static_root, path)
            if not full:
                raise HttpError(404, "not found")
            self.send_file(full)

        def send_file(self, full, admin=False):
            try:
                with open(full, "rb") as f:
                    body = f.read()
            except OSError:
                raise HttpError(404, "not found")
            ext = os.path.splitext(full)[1].lower()
            ctype = CONTENT_TYPES.get(ext) or mimetypes.guess_type(full)[0] or "application/octet-stream"
            headers = {"Cache-Control": "no-cache"}
            if cfg.csp:
                headers["Content-Security-Policy"] = CSP
            if admin:
                headers["X-Frame-Options"] = "DENY"
                headers["Cache-Control"] = "no-store"
            self.send_bytes(200, body, ctype, headers)

        # ---- public API --------------------------------------------------
        def api_visit(self, method):
            day = today_ist()
            if method == "POST":
                self.read_json(2048)  # body unused, but consume it
                ua = self.ua()
                if ua and not BOT_RE.search(ua) and limiter.allow("visit", self.ip_key(), 60, 3600):
                    store.record_visit(day, store.vid(day, self.ip(), ua))
            elif method != "GET":
                raise HttpError(405, "method not allowed")
            stats = store.visit_stats(day)
            stats["ok"] = True
            self.send_json(200, stats)

        def api_event(self):
            data = self.read_json(2048)
            name = str(data.get("name", ""))
            if not EVENT_NAME_RE.match(name):
                raise HttpError(400, "bad event name")
            if not limiter.allow("event", self.ip_key(), 120, 60):
                raise HttpError(429, "too many events")
            if self.ua() and not BOT_RE.search(self.ua()):
                store.add_event(name, sanitize_props(data.get("props")))
            self.send_bytes(204, b"", "text/plain", self.cors())

        def api_feedback(self):
            data = self.read_json(8192)
            if data.get("website"):  # honeypot: real people never fill this in
                self.send_json(200, {"ok": True})
                return
            message = clean_text(data.get("message", ""), 2000)
            name = clean_line(data.get("name", ""), 60)
            if len(message) < 3:
                raise HttpError(400, "please write a message")
            if not limiter.allow("feedback", self.ip_key(), 5, 3600):
                raise HttpError(429, "you have sent several already, please try later")
            fid = store.add_feedback(name, message)

            def deliver():
                store.set_mail_status(fid, send_feedback_mail(cfg, fid, name, message))
            threading.Thread(target=deliver, daemon=True).start()
            self.send_json(200, {"ok": True})

        # ---- admin API ---------------------------------------------------
        def api_admin_summary(self):
            self.require_admin()
            now = datetime.now(IST)
            days = [(now - timedelta(days=i)).strftime("%Y-%m-%d") for i in range(13, -1, -1)]
            series = store.daily_series(days[0])
            daily = [{"day": d,
                      "visitors": series.get(d, {}).get("visitors", 0),
                      "views": series.get(d, {}).get("views", 0)} for d in days]
            since = int(time.time()) - 30 * 86400
            out = store.visit_stats(today_ist())
            out.update({"ok": True, "daily": daily,
                        "events_30d": store.event_counts(since),
                        "top_affiliate_30d": store.affiliate_clicks(since),
                        "mail_configured": cfg.mail_configured})
            self.send_json(200, out, cors=False)

        def api_admin_feedback(self):
            self.require_admin()
            qs = parse_qs(urlparse(self.path).query)
            try:
                limit = max(1, min(200, int(qs.get("limit", ["50"])[0])))
            except ValueError:
                limit = 50
            out = store.feedback_list(limit)
            out["ok"] = True
            self.send_json(200, out, cors=False)

    return Handler


def create_server(cfg):
    store = Store(cfg.db_path)
    limiter = RateLimiter()
    httpd = ThreadingHTTPServer((cfg.host, cfg.port), make_handler(cfg, store, limiter))
    httpd.daemon_threads = True
    httpd.store = store
    return httpd


def main():
    env = dict(load_env_file(os.path.join(HERE, ".env")))
    env.update({k: v for k, v in os.environ.items()})  # real environment wins
    cfg = Config(env)
    if cfg.admin_token and not cfg.admin_enabled:
        print("! ADMIN_TOKEN is shorter than 16 characters - admin stays DISABLED.")
    httpd = create_server(cfg)
    print("Cook Schedule backend listening on http://%s:%d" % (cfg.host, cfg.port))
    print("  website : %s" % ("served from " + cfg.static_root if cfg.serve_static else "not served (API only)"))
    print("  feedback: %s" % ("e-mail to the owner is configured" if cfg.mail_configured
                              else "stored only (set NOTIFY_TO + SMTP_* in backend/.env to get e-mails)"))
    print("  admin   : %s" % ("enabled at /admin" if cfg.admin_enabled
                              else "disabled (set ADMIN_TOKEN, 16+ characters)"))
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nbye")


if __name__ == "__main__":
    main()
