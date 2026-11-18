"use client";

import { useEffect, useRef, useState } from "react";
import type { LogFile, LogResult, PortInfo } from "@/lib/types";

export type LogsFn = (row: PortInfo, signal: AbortSignal) => Promise<LogResult>;

export const LOG_POLL_MS = 2000;

export type LogState =
  | { kind: "loading" }
  | { kind: "ready"; files: LogFile[]; reason: string }
  | { kind: "error"; message: string };

/**
 * Load a row's logs now and again every 2 s until the panel closes. The next
 * poll waits for the last one, and polls are skipped while the tab is hidden.
 */
export function useLogFollow(row: PortInfo, onLogs: LogsFn): LogState {
  const [state, setState] = useState<LogState>({ kind: "loading" });
  // Auto-refresh hands us a new row object every 5 s; only a new port or
  // process should restart the polling.
  const rowRef = useRef(row);
  const rowKey = `${row.port}:${row.pids.join(",")}`;

  useEffect(() => {
    rowRef.current = row;
  }, [row]);

  useEffect(() => {
    const abort = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;

    async function poll(): Promise<void> {
      if (!document.hidden) {
        const result = await onLogs(rowRef.current, abort.signal);
        if (abort.signal.aborted) {
          return;
        }
        setState(result.ok
          ? { kind: "ready", files: result.files, reason: result.reason }
          : { kind: "error", message: result.message });
      }
      timer = setTimeout(() => void poll(), LOG_POLL_MS);
    }

    void poll();
    return () => {
      abort.abort();
      clearTimeout(timer);
    };
  }, [rowKey, onLogs]);

  return state;
}
