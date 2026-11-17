import type { ScanHit, ScanProgress } from "./types";

/** Common local dev ports and what usually runs there. */
export const COMMON_PORTS: ReadonlyArray<readonly [number, string]> = [
  [80, "Web server"],
  [443, "Web server (HTTPS)"],
  [1313, "Hugo"],
  [1420, "Tauri"],
  [2368, "Ghost"],
  [3000, "Next.js / React / Rails"],
  [3001, "Dev server"],
  [3002, "Dev server"],
  [3003, "Dev server"],
  [3030, "Dev server"],
  [3100, "Dev server"],
  [3200, "Dev server"],
  [3300, "Dev server"],
  [3333, "AdonisJS"],
  [3400, "Dev server"],
  [4000, "Gatsby / Phoenix"],
  [4173, "Vite preview"],
  [4200, "Angular"],
  [4321, "Astro"],
  [4400, "Dev server"],
  [4567, "Sinatra"],
  [5000, "Flask / AirPlay"],
  [5001, "Dev server"],
  [5050, "pgAdmin"],
  [5173, "Vite"],
  [5174, "Vite"],
  [5175, "Vite"],
  [5180, "Vite"],
  [5500, "Live Server"],
  [5555, "Prisma Studio"],
  [6006, "Storybook / TensorBoard"],
  [7000, "Dev server"],
  [7860, "Gradio"],
  [8000, "Django / Uvicorn"],
  [8001, "Dev server"],
  [8008, "Dev server"],
  [8010, "Dev server"],
  [8080, "Web server / Java"],
  [8081, "Metro (React Native)"],
  [8088, "Dev server"],
  [8090, "Dev server"],
  [8100, "Ionic"],
  [8443, "Web server (HTTPS)"],
  [8501, "Streamlit"],
  [8787, "Wrangler"],
  [8888, "Jupyter"],
  [8889, "Jupyter"],
  [9000, "MinIO / PHP-FPM"],
  [9001, "MinIO console"],
  [9090, "Prometheus"],
  [9200, "Elasticsearch"],
  [9229, "Node inspector"],
  [11434, "Ollama"],
  [15672, "RabbitMQ"],
  [19006, "Expo web"],
  [24678, "Vite HMR"],
];

const PROBE_TIMEOUT_MS = 1500;
const CONCURRENCY = 16;

// Chrome's Local Network Access flag; other browsers ignore unknown fields.
type LocalRequestInit = RequestInit & { targetAddressSpace?: "loopback" };

/**
 * A no-cors fetch resolves for any HTTP reply and rejects when nothing is
 * listening, so it tells "open" from "closed" without reading the body.
 */
async function isOpen(url: string, signal: AbortSignal): Promise<boolean> {
  const timeout = AbortSignal.timeout(PROBE_TIMEOUT_MS);
  const init: LocalRequestInit = {
    mode: "no-cors",
    cache: "no-store",
    credentials: "omit",
    signal: AbortSignal.any([signal, timeout]),
    targetAddressSpace: "loopback",
  };
  try {
    await fetch(url, init);
    return true;
  } catch {
    return false;
  }
}

type ScanOptions = {
  signal: AbortSignal;
  onProgress: (progress: ScanProgress, hits: ScanHit[]) => void;
};

export async function quickScan({ signal, onProgress }: ScanOptions): Promise<ScanHit[]> {
  const hits: ScanHit[] = [];
  const total = COMMON_PORTS.length;
  let next = 0;
  let done = 0;

  async function worker(): Promise<void> {
    while (next < total && !signal.aborted) {
      const [port, guess] = COMMON_PORTS[next];
      next += 1;
      const url = `http://localhost:${port}`;
      if (await isOpen(url, signal)) {
        hits.push({ port, url, guess });
        hits.sort((a, b) => a.port - b.port);
      }
      done += 1;
      onProgress({ done, total }, [...hits]);
    }
  }

  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  return hits;
}
