#!/usr/bin/env python3
"""Port Finder helper.

Runs on your laptop, lists every listening TCP port with the app and the
project folder behind it, and serves that list as JSON to the Port Finder
web page.

    python3 port-helper.py --origin https://your-site.vercel.app

Safety: binds to 127.0.0.1 only and answers only the origins you pass with
--origin. Stopping a process is limited to a PID that is listening on the
given port right now, owned by you and not a system app. Start with
--read-only to turn stopping off. Logs are read only from the output file a
listening process already writes to; the page cannot name a file.
"""
import argparse
import json
import os
import re
import signal
import stat
import socket
import ssl
import subprocess
import time
from concurrent.futures import ThreadPoolExecutor
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, urlsplit

HELPER_PORT = 4999
HOME = os.path.expanduser("~")
# Never send test bytes to these: they are not web servers.
NO_PROBE_APPS = ("mysqld", "mongod", "postgres", "redis-server", "rapportd")
PROBE_TIMEOUT = 0.5

VERSION = "1.3"
STOP_WAIT_SECONDS = 3
MAX_BODY_BYTES = 1024
LOG_LINES_DEFAULT = 200
LOG_LINES_MAX = 1000
LOG_TAIL_BYTES = 64 * 1024
# Colour codes and terminal titles that dev servers print.
ANSI_RE = re.compile(r"\x1b\[[0-9;?]*[ -/]*[@-~]|\x1b\][^\x07]*\x07")
STREAMS = {"1": "stdout", "2": "stderr"}
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
settings = {"read_only": False}


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


def alive(pid):
    try:
        os.kill(pid, 0)
    except ProcessLookupError:
        return False
    except PermissionError:
        return True
    return True


def stop_process(pid, port, force):
    """Stop one process that listens on `port`. Returns (status, body)."""
    sockets = listening_sockets()
    if (pid, port) not in sockets:
        return 409, {"error": f"PID {pid} is not listening on port {port} any more"}
    if pid == os.getpid():
        return 403, {"error": "the helper cannot stop itself"}
    command = processes([pid]).get(pid, (0, ""))[1]
    app = app_name(sockets[(pid, port)]["app"], command)
    folder = pretty_folder(working_dirs([pid]).get(pid, ""))
    _, group = describe(app, command, folder)
    if group == "system":
        return 403, {"error": f"{app} is a system app, stop it from macOS instead"}

    try:
        os.kill(pid, signal.SIGKILL if force else signal.SIGTERM)
    except ProcessLookupError:
        return 200, {"stopped": True, "pid": pid, "port": port}
    except PermissionError:
        return 403, {"error": f"no permission to stop PID {pid} (owned by another user)"}

    deadline = time.monotonic() + STOP_WAIT_SECONDS
    while time.monotonic() < deadline:
        if not alive(pid):
            probe_cache.pop((pid, port), None)
            return 200, {"stopped": True, "pid": pid, "port": port}
        time.sleep(0.1)
    return 202, {"stopped": False, "pid": pid, "port": port,
                 "error": "still running after 3 s, try Force stop"}


def output_targets(pid):
    """Return [(stream, lsof type, name)] for the stdout and stderr of pid."""
    out = run(["lsof", "-a", "-p", str(pid), "-d", "1,2", "-F", "ftn"])
    targets = []
    stream = kind = ""
    for line in out.splitlines():
        tag, value = line[:1], line[1:]
        if tag == "f":
            stream, kind = STREAMS.get(value, ""), ""
        elif tag == "t":
            kind = value
        elif tag == "n" and stream:
            targets.append((stream, kind, value))
    return targets


def no_log_reason(targets):
    """Say in plain words why a process has no log file to show."""
    names = [name for _, _, name in targets]
    kinds = [kind for _, kind, _ in targets]
    terminal = next((n for n in names if n.startswith("/dev/tty")), "")
    if terminal:
        return f"Output goes to terminal {terminal[5:]} - read it in that window."
    if names and all(n == "/dev/null" for n in names):
        return "Output is thrown away (/dev/null), so there is nothing to show."
    if any(k in ("PIPE", "unix", "FIFO") for k in kinds):
        return "Output goes to a pipe owned by the app that started it."
    return "No output file found for this process."


def tail_lines(path, count):
    """Return (last `count` lines, file size). Reads at most LOG_TAIL_BYTES."""
    # O_NONBLOCK: never hang if the path was swapped for a pipe meanwhile.
    fd = os.open(path, os.O_RDONLY | os.O_NONBLOCK)
    with os.fdopen(fd, "rb") as fh:
        info = os.fstat(fd)
        if not stat.S_ISREG(info.st_mode):
            raise OSError("not a regular file")
        start = max(0, info.st_size - LOG_TAIL_BYTES)
        fh.seek(start)
        data = fh.read(LOG_TAIL_BYTES)
    text = ANSI_RE.sub("", data.decode("utf-8", "replace"))
    lines = [line.rsplit("\r", 1)[-1] for line in text.split("\n")]
    if start > 0:
        lines = lines[1:]
    if lines and lines[-1] == "":
        lines.pop()
    return lines[-count:], info.st_size


def read_logs(pid, port, count):
    """Return (status, body) with the tail of the files pid writes output to."""
    if (pid, port) not in listening_sockets():
        return 409, {"error": f"PID {pid} is not listening on port {port} any more"}
    targets = output_targets(pid)
    files = {}
    for stream, kind, name in targets:
        if kind == "REG":
            files.setdefault(name, []).append(stream)
    body = {"pid": pid, "port": port, "files": [], "reason": ""}
    for name, streams in files.items():
        try:
            lines, size = tail_lines(name, count)
        except OSError as err:
            body["reason"] = f"Cannot read {pretty_folder(name)}: {err.strerror or err}"
            continue
        body["files"].append({
            "path": pretty_folder(name),
            "streams": streams,
            "size": size,
            "lines": lines,
        })
    if not files:
        body["reason"] = no_log_reason(targets)
    return 200, body


def parse_log_query(query):
    """Read pid, port and lines from "?pid=1&port=2&lines=3"."""
    params = parse_qs(query)
    try:
        pid = int(params["pid"][0])
        port = int(params["port"][0])
        count = int(params.get("lines", [LOG_LINES_DEFAULT])[0])
    except (KeyError, ValueError):
        return None
    if pid <= 0 or not 0 < port < 65536 or count <= 0:
        return None
    return pid, port, min(count, LOG_LINES_MAX)


def parse_stop_request(raw):
    try:
        body = json.loads(raw)
    except ValueError:
        return None
    if not isinstance(body, dict):
        return None
    pid, port, force = body.get("pid"), body.get("port"), body.get("force", False)
    valid = all(isinstance(v, int) and not isinstance(v, bool) and v > 0 for v in (pid, port))
    if not valid or not isinstance(force, bool):
        return None
    return pid, port, force


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
            self.send_header("Access-Control-Allow-Methods", "GET, POST")
            self.send_header("Access-Control-Allow-Headers", "Content-Type")

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
        url = urlsplit(self.path)
        if url.path == "/logs":
            self.send_logs(origin, url.query)
            return
        if url.path != "/ports":
            self.reply(404, {"error": "use /ports or /logs"})
            return
        can_kill = not settings["read_only"]
        self.reply(200, {"version": VERSION, "canKill": can_kill, "canLogs": True,
                         "ports": scan()})

    def send_logs(self, origin, query):
        # Logs can hold secrets: like /kill, a missing Origin is refused too.
        if origin is None:
            self.reply(403, {"error": "origin not allowed: None"})
            return
        request = parse_log_query(query)
        if request is None:
            self.reply(400, {"error": "use /logs?pid=N&port=N[&lines=N]"})
            return
        status, body = read_logs(*request)
        self.reply(status, body)

    def do_POST(self):
        if not self.host_ok():
            self.reply(403, {"error": "bad host"})
            return
        # Stopping needs an allowed page: a missing Origin is refused too.
        origin = self.headers.get("Origin")
        if origin not in allowed_origins:
            self.reply(403, {"error": f"origin not allowed: {origin}"})
            return
        if self.path.split("?")[0] != "/kill":
            self.reply(404, {"error": "use /kill"})
            return
        if settings["read_only"]:
            self.reply(403, {"error": "helper started with --read-only"})
            return
        if not self.headers.get("Content-Type", "").startswith("application/json"):
            self.reply(415, {"error": "send JSON"})
            return
        length = int(self.headers.get("Content-Length") or 0)
        if length <= 0 or length > MAX_BODY_BYTES:
            self.reply(400, {"error": "bad body size"})
            return
        request = parse_stop_request(self.rfile.read(length))
        if request is None:
            self.reply(400, {"error": "send {pid, port, force}"})
            return
        status, body = stop_process(*request)
        self.reply(status, body)

    def log_message(self, fmt, *args):
        pass


def main():
    global HELPER_PORT
    parser = argparse.ArgumentParser(description="Port Finder helper")
    parser.add_argument(
        "--origin",
        action="append",
        default=[],
        help="web page address allowed to read the list (repeatable)",
    )
    parser.add_argument(
        "--read-only",
        action="store_true",
        help="list ports only, never stop a process",
    )
    parser.add_argument("--port", type=int, default=HELPER_PORT, help=argparse.SUPPRESS)
    args = parser.parse_args()
    settings["read_only"] = args.read_only
    HELPER_PORT = args.port
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
