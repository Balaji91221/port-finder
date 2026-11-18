"use client";

import { useLayoutEffect, useRef } from "react";
import { LOG_POLL_MS, useLogFollow, type LogsFn } from "@/hooks/useLogFollow";
import { fileSize, plural } from "@/lib/format";
import type { LogFile, PortInfo } from "@/lib/types";

/** Within this many pixels of the bottom counts as "following". */
const STICK_PX = 24;

type CopyFn = (text: string, done: string) => void;

type LogPanelProps = {
  row: PortInfo;
  onLogs: LogsFn;
  onCopy: CopyFn;
  onClose: () => void;
};

function LogFileView({ file, onCopy }: { file: LogFile; onCopy: CopyFn }) {
  const ref = useRef<HTMLPreElement | null>(null);
  const stick = useRef(true);

  // Keep the newest line in view, unless the reader scrolled up.
  useLayoutEffect(() => {
    const el = ref.current;
    if (el && stick.current) {
      el.scrollTop = el.scrollHeight;
    }
  }, [file.lines]);

  function onScroll(): void {
    const el = ref.current;
    if (el) {
      stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < STICK_PX;
    }
  }

  const text = file.lines.join("\n");
  return (
    <div className="log-file">
      <div className="log-head">
        <code className="log-path" title={file.path}>{file.path}</code>
        <span className="log-meta">{file.streams.join(" + ")} · {fileSize(file.size)}</span>
        <button
          type="button"
          className="btn small"
          disabled={!text}
          onClick={() => onCopy(text, `Copied ${plural(file.lines.length, "line")}`)}
        >
          Copy
        </button>
      </div>
      <pre ref={ref} className="log-body" onScroll={onScroll} tabIndex={0}>
        {text || "The file is empty so far."}
      </pre>
    </div>
  );
}

/** Live tail of what the process on one port prints. */
export function LogPanel({ row, onLogs, onCopy, onClose }: LogPanelProps) {
  const state = useLogFollow(row, onLogs);

  function body() {
    switch (state.kind) {
      case "loading":
        return <p className="log-note">Loading logs…</p>;
      case "error":
        return <p className="log-note bad">{state.message}</p>;
      case "ready":
        return (
          <>
            {state.files.map((file) => <LogFileView key={file.path} file={file} onCopy={onCopy} />)}
            {state.reason ? <p className="log-note">{state.reason}</p> : null}
          </>
        );
      default: {
        const _exhaustive: never = state;
        throw new Error(`unhandled log state: ${JSON.stringify(_exhaustive)}`);
      }
    }
  }

  return (
    <div className="log-panel" role="region" aria-label={`Logs for port ${row.port}`}>
      <div className="log-bar">
        <span className="live">
          <span className="live-dot" aria-hidden="true" />
          Live · last lines, updates every {LOG_POLL_MS / 1000} s
        </span>
        <button type="button" className="btn small" onClick={onClose}>Close</button>
      </div>
      {body()}
    </div>
  );
}
