# Security Policy

Port Finder's helper runs on your laptop and can stop processes, so we take security reports
seriously.

## Supported versions

| Version | Supported |
|---|---|
| Helper 1.2 (current `main`) | ✅ |
| Helper 1.1 and older | ❌ — please update |

## Reporting a vulnerability

**Please do not open a public issue.**

Report it privately through
[GitHub Security Advisories](https://github.com/Balaji91221/port-finder/security/advisories/new).
Include:

- what an attacker can do, and what they need first (e.g. "any website the user visits");
- steps to reproduce, with the helper version and browser;
- your suggested fix, if you have one.

You will get a first reply within 7 days. Once a fix is released, you will be credited in the
release notes unless you prefer not to be.

## What the helper is designed to prevent

- Requests from other machines — it binds to `127.0.0.1` only.
- Requests from websites you did not allow — it checks `Origin` against `--origin`.
- DNS-rebinding — it checks the `Host` header.
- Stopping the wrong process — the PID must listen on the given port at that moment, be
  owned by you and not be a system app.

Anything that gets around one of these is in scope.
