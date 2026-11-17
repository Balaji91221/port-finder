"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { DEMO_PORTS } from "@/lib/demoData";
import { fetchHelper, stopProcess, type HelperResult } from "@/lib/helper";
import { COMMON_PORTS, quickScan } from "@/lib/quickScan";
import type { PortInfo, Source, StopResult } from "@/lib/types";

const OFFLINE_RETRY_MS = 3000;
const AUTO_REFRESH_MS = 5000;
const HELPER_TIMEOUT_MS = 4000;

export type PortSourceApi = {
  source: Source;
  busy: boolean;
  refresh: () => Promise<void>;
  startScan: () => void;
  stopScan: () => void;
  showDemo: () => void;
  leaveDemo: () => void;
  stopRow: (row: PortInfo, force: boolean) => Promise<StopResult>;
};

/**
 * Owns where the port list comes from: the local helper, the browser-only
 * quick scan, or demo data. While the helper is missing it keeps retrying,
 * so the page switches to full details as soon as the helper starts.
 */
export function usePortSource(autoRefresh: boolean): PortSourceApi {
  const [source, setSource] = useState<Source>({ kind: "connecting" });
  const [busy, setBusy] = useState(false);
  const scanAbort = useRef<AbortController | null>(null);
  const kind = source.kind;

  const apply = useCallback((result: HelperResult): void => {
    if (result.ok) {
      scanAbort.current?.abort();
      const { ports, canKill } = result;
      setSource({ kind: "helper", ports, canKill, checkedAt: new Date() });
      return;
    }
    // Keep a finished or running scan on screen; only leave the helper view.
    setSource((prev) => (prev.kind === "helper" || prev.kind === "connecting"
      ? { kind: "offline" }
      : prev));
  }, []);

  const refresh = useCallback(async (): Promise<void> => {
    setBusy(true);
    const result = await fetchHelper(AbortSignal.timeout(HELPER_TIMEOUT_MS));
    setBusy(false);
    apply(result);
  }, [apply]);

  const startScan = useCallback((): void => {
    scanAbort.current?.abort();
    const abort = new AbortController();
    scanAbort.current = abort;
    setSource({ kind: "scanning", progress: { done: 0, total: COMMON_PORTS.length }, hits: [] });
    const onProgress: Parameters<typeof quickScan>[0]["onProgress"] = (progress, hits) => {
      if (!abort.signal.aborted) {
        setSource({ kind: "scanning", progress, hits });
      }
    };
    void quickScan({ signal: abort.signal, onProgress }).then((hits) => {
      if (!abort.signal.aborted) {
        const scannedCount = COMMON_PORTS.length;
        setSource({ kind: "scanned", hits, scannedCount, checkedAt: new Date() });
      }
    });
  }, []);

  const stopScan = useCallback((): void => {
    scanAbort.current?.abort();
    setSource({ kind: "offline" });
  }, []);

  const showDemo = useCallback((): void => {
    scanAbort.current?.abort();
    setSource({ kind: "demo", ports: DEMO_PORTS });
  }, []);

  const leaveDemo = useCallback((): void => {
    setSource({ kind: "connecting" });
    void refresh();
  }, [refresh]);

  /** Stop every process on the row, one at a time; the first failure wins. */
  const stopRow = useCallback(async (row: PortInfo, force: boolean): Promise<StopResult> => {
    if (kind === "demo") {
      setSource((prev) => (prev.kind === "demo"
        ? { kind: "demo", ports: prev.ports.filter((r) => r !== row) }
        : prev));
      return { ok: true };
    }
    for (const pid of row.pids) {
      const result = await stopProcess({ pid, port: row.port, force });
      if (!result.ok) {
        return result;
      }
    }
    await refresh();
    return { ok: true };
  }, [kind, refresh]);

  // First check on load.
  useEffect(() => {
    void fetchHelper(AbortSignal.timeout(HELPER_TIMEOUT_MS)).then(apply);
    return () => scanAbort.current?.abort();
  }, [apply]);

  // Retry while offline, refresh on a timer when connected and asked to.
  useEffect(() => {
    const waiting = kind === "offline" || kind === "scanning" || kind === "scanned";
    const polling = kind === "helper" && autoRefresh;
    const delay = waiting ? OFFLINE_RETRY_MS : polling ? AUTO_REFRESH_MS : 0;
    if (!delay) {
      return;
    }
    const timer = setInterval(() => {
      if (!document.hidden) {
        void refresh();
      }
    }, delay);
    return () => clearInterval(timer);
  }, [kind, autoRefresh, refresh]);

  // Coming back to the tab shows fresh data right away.
  useEffect(() => {
    function onVisible(): void {
      if (!document.hidden && kind !== "demo") {
        void refresh();
      }
    }
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [kind, refresh]);

  return { source, busy, refresh, startScan, stopScan, showDemo, leaveDemo, stopRow };
}
