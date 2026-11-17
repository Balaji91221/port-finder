#!/usr/bin/env python3
"""Port Finder helper.

Runs on your laptop, lists every listening TCP port with the app and the
project folder behind it, and serves that list as JSON to the Port Finder
web page.

    python3 port-helper.py --origin https://your-site.vercel.app

Safety: binds to 127.0.0.1 only, read-only (GET), and answers only the
origins you pass with --origin.
"""
import argparse
import json
import os
import socket
import ssl
import subprocess
from concurrent.futures import ThreadPoolExecutor
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

HELPER_PORT = 4999
HOME = os.path.expanduser("~")
# Never send test bytes to these: they are not web servers.
NO_PROBE_APPS = ("mysqld", "mongod", "postgres", "redis-server", "rapportd")
PROBE_TIMEOUT = 0.5

VERSION = "1.1"
# (text to find in the app name, label, group)
APP_RULES = (
    ("rapportd", "macOS sharing", "system"),
    ("controlcenter", "AirPlay Receiver", "system"),
    ("code helper", "VS Code", "system"),
    ("claude", "Claude Code", "system"),
    ("mongod", "MongoDB", "service"),
    ("mysqld", "MySQL", "service"),
    ("postgres", "PostgreSQL", "service"),
    ("redis-server", "Redis", "service"),
    ("minio", "MinIO", "service"),
    ("com.docker", "Docker", "service"),
    ("ollama", "Ollama", "service"),
)
# (text to find in the command line, label)
COMMAND_RULES = (
    ("next-server", "Next.js"),
    ("next dev", "Next.js"),
    ("vite", "Vite"),
    ("uvicorn", "Uvicorn"),
    ("gunicorn", "Gunicorn"),
    ("streamlit", "Streamlit"),
    ("flask", "Flask"),
    ("http.server", "Python http.server"),
    ("webpack", "Webpack"),
)
RUNTIME_RULES = (("node", "Node.js"), ("python", "Python"), ("java", "Java"), ("ruby", "Ruby"))

allowed_origins = set()
probe_cache = {}


def run(cmd):
    try:
        out = subprocess.run(cmd, capture_output=True, text=True, timeout=10)
        return out.stdout
    except (OSError, subprocess.SubprocessError):
        return ""


def listening_sockets():
    """Return {(pid, port): {"app", "hosts"}} from lsof."""
    out = run(["lsof", "-nP", "-iTCP", "-sTCP:LISTEN", "-F", "pcn"])
    found = {}
    pid = None
    app = ""
    for line in out.splitlines():
        tag, value = line[:1], line[1:]
        if tag == "p":
            pid = int(value)
        elif tag == "c":
            app = value
        elif tag == "n" and pid is not None:
            host, _, port = value.rpartition(":")
            if not port.isdigit():
                continue
            entry = found.setdefault((pid, int(port)), {"app": app, "hosts": set()})
            entry["hosts"].add(host)
    return found


def working_dirs(pids):
    """Return {pid: folder} for the given pids."""
    if not pids:
        return {}
    pid_list = ",".join(str(p) for p in pids)
    out = run(["lsof", "-a", "-d", "cwd", "-p", pid_list, "-F", "pn"])
    dirs = {}
    pid = None
    for line in out.splitlines():
        tag, value = line[:1], line[1:]
        if tag == "p":
            pid = int(value)
        elif tag == "n" and pid is not None:
            dirs[pid] = value
    return dirs


def etime_seconds(text):
    """Turn ps elapsed time ([[dd-]hh:]mm:ss) into seconds."""
    days, _, clock = text.rpartition("-")
    parts = [int(p) for p in clock.split(":") if p.isdigit()]
    seconds = 0
    for part in parts:
        seconds = seconds * 60 + part
    return seconds + (int(days) * 86400 if days.isdigit() else 0)


def processes(pids):
    """Return {pid: (uptime seconds, full command line)}."""
    if not pids:
        return {}
    pid_list = ",".join(str(p) for p in pids)
    out = run(["ps", "-o", "pid=,etime=,command=", "-p", pid_list])
    procs = {}
    for line in out.splitlines():
        parts = line.strip().split(None, 2)
        if len(parts) == 3 and parts[0].isdigit():
            procs[int(parts[0])] = (etime_seconds(parts[1]), parts[2])
    return procs


def describe(app, command, folder):
    """Return (label, group). Group is "project", "service" or "system"."""
    app_low = app.lower()
    for needle, label, group in APP_RULES:
        if needle in app_low:
            return label, group
    if not folder:
        return app, "system"
    group = "project"
    if not folder.startswith("~") or folder.startswith("~/Library"):
        group = "service"
    cmd_low = command.lower()
    for needle, label in COMMAND_RULES:
        if needle in cmd_low:
            return label, group
    for needle, label in RUNTIME_RULES:
        if app_low.startswith(needle):
            return label, group
    return app, group


def app_name(app, command):
    """lsof shows some apps as a version number (e.g. "2.1.325")."""
    app = app.replace("\\x20", " ")
    if app.replace(".", "").isdigit() and command:
        return os.path.basename(command.split()[0])
    return app


def pretty_folder(path):
    if not path or path == "/":
        return ""
    if path == HOME:
        return "~"
    if path.startswith(HOME + "/"):
        return "~" + path[len(HOME):]
    return path


def probe(host, port):
    """Return "https", "http" or "" for one port. TLS is tried first because
    a TLS port often answers plain HTTP with an error page."""
    try:
        ctx = ssl.create_default_context()
        ctx.check_hostname = False
        ctx.verify_mode = ssl.CERT_NONE
        with socket.create_connection((host, port), timeout=PROBE_TIMEOUT) as sock:
            sock.settimeout(PROBE_TIMEOUT)
            with ctx.wrap_socket(sock, server_hostname="localhost"):
                return "https"
    except (OSError, ssl.SSLError):
        pass
    try:
        with socket.create_connection((host, port), timeout=PROBE_TIMEOUT) as sock:
            sock.settimeout(PROBE_TIMEOUT)
            sock.sendall(b"GET / HTTP/1.0\r\nHost: localhost\r\n\r\n")
            if sock.recv(5).startswith(b"HTTP/"):
                return "http"
    except OSError:
        pass
    return ""


def web_kind(pid, port, app, hosts):
    if port == HELPER_PORT or app.startswith(NO_PROBE_APPS):
        return ""
    key = (pid, port)
    if key not in probe_cache:
        only_v6 = all(h.startswith("[") for h in hosts)
        probe_cache[key] = probe("::1" if only_v6 else "127.0.0.1", port)
    return probe_cache[key]


def scan():
    sockets = listening_sockets()
    pids = sorted({pid for pid, _ in sockets})
    dirs = working_dirs(pids)
    procs = processes(pids)

    for key in list(probe_cache):
        if key not in sockets:
            del probe_cache[key]

    with ThreadPoolExecutor(max_workers=32) as pool:
        kinds = list(pool.map(
            lambda item: web_kind(item[0][0], item[0][1], item[1]["app"], item[1]["hosts"]),
            sockets.items(),
        ))

    merged = {}
    for ((pid, port), info), kind in zip(sockets.items(), kinds):
        if port == HELPER_PORT and pid == os.getpid():
            continue
        uptime, command = procs.get(pid, (0, ""))
        app = app_name(info["app"], command)
        folder = pretty_folder(dirs.get(pid, ""))
        row = merged.get((port, app, folder))
        if row:
            row["pids"].append(pid)
            row["uptime"] = max(row["uptime"], uptime)
            row["url"] = row["url"] or web_url(kind, info["hosts"], port)
            continue
        label, group = describe(app, command, folder)
        merged[(port, app, folder)] = {
            "port": port,
            "pids": [pid],
            "app": app,
            "label": label,
            "group": group,
            "folder": folder,
            "command": command,
            "uptime": uptime,
            "url": web_url(kind, info["hosts"], port),
        }
    return sorted(merged.values(), key=lambda r: (r["port"], r["pids"][0]))


def web_url(kind, hosts, port):
    if not kind:
        return ""
    only_v6 = all(h.startswith("[") for h in hosts)
    return f"{kind}://{'[::1]' if only_v6 else 'localhost'}:{port}"


class Handler(BaseHTTPRequestHandler):
    def host_ok(self):
        host = self.headers.get("Host", "")
        return host in (f"127.0.0.1:{HELPER_PORT}", f"localhost:{HELPER_PORT}")

    def cors_headers(self):
        origin = self.headers.get("Origin", "")
        if origin in allowed_origins:
            self.send_header("Access-Control-Allow-Origin", origin)
            self.send_header("Vary", "Origin")
            self.send_header("Access-Control-Allow-Private-Network", "true")
            self.send_header("Access-Control-Allow-Methods", "GET")

    def reply(self, status, body):
        data = json.dumps(body).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(data)))
        self.send_header("Cache-Control", "no-store")
        self.cors_headers()
        self.end_headers()
        self.wfile.write(data)

    def do_OPTIONS(self):
        if not self.host_ok():
            self.reply(403, {"error": "bad host"})
            return
        self.send_response(204)
        self.cors_headers()
        self.send_header("Content-Length", "0")
        self.end_headers()

    def do_GET(self):
        if not self.host_ok():
            self.reply(403, {"error": "bad host"})
            return
        origin = self.headers.get("Origin")
        if origin is not None and origin not in allowed_origins:
            self.reply(403, {"error": f"origin not allowed: {origin}"})
            return
        if self.path.split("?")[0] != "/ports":
            self.reply(404, {"error": "use /ports"})
            return
        self.reply(200, {"version": VERSION, "ports": scan()})

    def log_message(self, fmt, *args):
        pass


def main():
    parser = argparse.ArgumentParser(description="Port Finder helper")
    parser.add_argument(
        "--origin",
        action="append",
        default=[],
        help="web page address allowed to read the list (repeatable)",
    )
    args = parser.parse_args()
    env_origins = os.environ.get("PORT_FINDER_ORIGINS", "").split(",")
    for origin in args.origin + env_origins:
        origin = origin.strip().rstrip("/")
        if origin:
            allowed_origins.add(origin)

    server = ThreadingHTTPServer(("127.0.0.1", HELPER_PORT), Handler)
    print(f"Port Finder helper running on http://127.0.0.1:{HELPER_PORT}/ports")
    if allowed_origins:
        print("Allowed pages: " + ", ".join(sorted(allowed_origins)))
    else:
        print("No --origin given: no web page can read the list yet.")
    print("Stop with Ctrl+C.")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print()


if __name__ == "__main__":
    main()
