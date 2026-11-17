# Port Finder

See every port running on your laptop, the app behind it, and the project it belongs to — and stop the ones you no longer need.

## How it works

| Mode | Install | What you see |
|---|---|---|
| **Quick scan** | none | Web servers on ~60 common dev ports (3000, 5173, 8000…). Browser only. |
| **Full details** | one command | Every listening port, app name, project folder, PID, uptime, **Stop** button. |
| **Demo** | none | Sample data, to try the UI. |

Full details need a small helper on your laptop (macOS, Python 3, no installs):

```
curl -fsSO https://YOUR-SITE/port-helper.py && python3 port-helper.py --origin https://YOUR-SITE
```

The page connects by itself within 3 seconds.

## Safety

- The helper listens on `127.0.0.1:4999` only, so other machines cannot reach it.
- It answers only the page addresses given with `--origin`.
- **Stop** asks first, sends SIGTERM, and offers Force stop (SIGKILL) only if the process is still running after 3 s.
- It only stops a PID that is listening on that port right now, owned by you, and not a system app.
- Start with `--read-only` to turn stopping off.

## Repo layout

```
apps/web/                 Next.js 16 app (deploy this folder)
apps/web/public/port-helper.py   the helper, served for the one-line install
```

## Develop

```
npm install
npm run dev          # http://localhost:3000
npm test             # unit tests
npm run lint && npm run typecheck
```

Local helper for development:

```
python3 apps/web/public/port-helper.py --origin http://localhost:3000
```

## Deploy (Vercel)

Project settings → **Root Directory** = `apps/web`. Framework is detected as Next.js.

## License

MIT
