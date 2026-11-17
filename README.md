# Port Finder

See every port running on your laptop, the app behind it, and its project folder.

- `index.html` — the web page (deploy to Vercel, no build step).
- `port-helper.py` — small helper that runs on your laptop (Python 3, no installs).

## Use

1. Open the page. If the helper is not running, the page shows one command to copy.
2. Run that command in Terminal. It downloads `port-helper.py` and starts it:

   ```
   python3 port-helper.py --origin https://YOUR-SITE.vercel.app
   ```

3. The page connects by itself within 3 seconds.

## What you see

- Ports grouped by project folder, with a name for each app (Next.js, Vite, Uvicorn, MongoDB…).
- Uptime and process ID for each port.
- **Open** and **Copy** for ports that serve a web page.
- Search, a sortable table of all ports, auto-refresh every 5 s, light and dark theme.

## Safety

- The helper listens on `127.0.0.1:4999` only, so other machines cannot reach it.
- It is read-only: it lists ports and cannot stop anything.
- It answers only the page address given with `--origin`.

## Local test

```
python3 -m http.server 4998 --bind 127.0.0.1
python3 port-helper.py --origin http://localhost:4998
```

Then open http://localhost:4998.
