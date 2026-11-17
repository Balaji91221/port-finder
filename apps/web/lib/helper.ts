import { errorText, parseHelperReply, type HelperReply } from "./parse";
import type { StopResult } from "./types";

const HELPER_ORIGIN = "http://127.0.0.1:4999";
export const HELPER_URL = `${HELPER_ORIGIN}/ports`;
const STOP_URL = `${HELPER_ORIGIN}/kill`;
const STOP_TIMEOUT_MS = 8000;

export type HelperResult =
  | ({ ok: true } & HelperReply)
  | { ok: false; reason: "offline" | "bad-reply" };

async function readJson(res: Response): Promise<unknown> {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

export async function fetchHelper(signal: AbortSignal): Promise<HelperResult> {
  let res: Response;
  try {
    res = await fetch(HELPER_URL, { cache: "no-store", signal });
  } catch {
    return { ok: false, reason: "offline" };
  }
  if (!res.ok) {
    return { ok: false, reason: "offline" };
  }
  const reply = parseHelperReply(await readJson(res));
  return reply ? { ok: true, ...reply } : { ok: false, reason: "bad-reply" };
}

type StopRequest = { pid: number; port: number; force: boolean };

export async function stopProcess(request: StopRequest): Promise<StopResult> {
  let res: Response;
  try {
    res = await fetch(STOP_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
      signal: AbortSignal.timeout(STOP_TIMEOUT_MS),
    });
  } catch {
    return { ok: false, canForce: false, message: "Helper not reachable" };
  }
  const body = await readJson(res);
  if (res.status === 200) {
    return { ok: true };
  }
  // 202: the process got SIGTERM but is still running.
  const message = errorText(body) || `Helper answered ${res.status}`;
  return { ok: false, canForce: res.status === 202, message };
}

export function helperCommand(origin: string): string {
  return `curl -fsSO ${origin}/port-helper.py && python3 port-helper.py --origin ${origin}`;
}
