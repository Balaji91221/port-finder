import type { LogResult, PortInfo } from "./types";

const DEMO_LINES = 40;
/** One new demo line every 2 s, so the live panel visibly moves. */
const DEMO_TICK_MS = 2000;

const SAMPLES: Record<string, readonly string[]> = {
  "Next.js": [
    " GET / 200 in 41ms",
    " GET /products 200 in 88ms",
    " ✓ Compiled /cart in 312ms",
    " GET /api/cart 200 in 12ms",
  ],
  Vite: [
    "[vite] hmr update /src/App.tsx",
    "[vite] hmr update /src/pages/Orders.tsx",
    "[vite] page reload src/main.tsx",
  ],
  Uvicorn: [
    'INFO:     127.0.0.1:52144 - "GET /health HTTP/1.1" 200 OK',
    'INFO:     127.0.0.1:52151 - "POST /orders HTTP/1.1" 201 Created',
    'INFO:     127.0.0.1:52160 - "GET /orders/42 HTTP/1.1" 200 OK',
  ],
  PostgreSQL: [
    "LOG:  checkpoint starting: time",
    "LOG:  checkpoint complete: wrote 12 buffers (0.1%)",
  ],
  Redis: ["* 1 changes in 3600 seconds. Saving...", "* Background saving terminated with success"],
  Ollama: ['[GIN] 200 |  1.2s | 127.0.0.1 | POST "/api/chat"', '[GIN] 200 |  2ms | 127.0.0.1 | GET "/api/tags"'],
};
const FALLBACK = ["request handled in 9ms", "health check ok"];

function clock(ms: number): string {
  return new Date(ms).toISOString().slice(11, 19);
}

/** Made-up output for the demo view, ending at `now`. */
export function demoLogs(row: PortInfo, now: number = Date.now()): LogResult {
  if (row.group === "system") {
    return { ok: true, files: [], reason: "Output is thrown away (/dev/null), so there is nothing to show." };
  }
  const samples = SAMPLES[row.label] ?? FALLBACK;
  const lastTick = Math.floor(now / DEMO_TICK_MS);
  const lines: string[] = [];
  for (let tick = lastTick - DEMO_LINES + 1; tick <= lastTick; tick += 1) {
    lines.push(`${clock(tick * DEMO_TICK_MS)} ${samples[(tick + row.port) % samples.length]}`);
  }
  const folder = row.folder || "~/Library/Logs";
  const name = row.label.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  const file = { path: `${folder}/${name}.log`, streams: ["stdout", "stderr"], size: 48_000, lines };
  return { ok: true, files: [file], reason: "" };
}
