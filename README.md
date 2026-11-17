# Port Finder

See every port running on your laptop, the app behind it, and its project folder.

- `index.html` — the web page (deploy to Vercel, no build step).
- `port-helper.py` — small helper that runs on your laptop (Python 3, no installs).

## Use

1. Start the helper, passing the address of the page:

   ```
   python3 port-helper.py --origin https://YOUR-SITE.vercel.app
   ```

2. Open the page and click **Check**.

The page shows the exact command if the helper is not running.

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
