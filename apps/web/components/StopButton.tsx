"use client";

import { useState } from "react";
import type { PortInfo, StopResult } from "@/lib/types";

export type StopFn = (row: PortInfo, force: boolean) => Promise<StopResult>;

type StopState =
  | { kind: "idle" }
  | { kind: "confirm" }
  | { kind: "stopping" }
  | { kind: "stuck"; message: string };

type StopButtonProps = {
  row: PortInfo;
  onStop: StopFn;
  onToast: (text: string) => void;
};

/** Two-step stop: first click asks, second click sends SIGTERM. */
export function StopButton({ row, onStop, onToast }: StopButtonProps) {
  const [state, setState] = useState<StopState>({ kind: "idle" });
  const what = `${row.label} on port ${row.port}`;

  async function run(force: boolean): Promise<void> {
    setState({ kind: "stopping" });
    const result = await onStop(row, force);
    if (result.ok) {
      onToast(`Stopped ${what}`);
      setState({ kind: "idle" });
      return;
    }
    if (result.canForce) {
      setState({ kind: "stuck", message: result.message });
      return;
    }
    onToast(result.message);
    setState({ kind: "idle" });
  }

  switch (state.kind) {
    case "idle":
      return (
        <button
          type="button"
          className="btn small danger-ghost"
          title={`Stop ${what}`}
          onClick={() => setState({ kind: "confirm" })}
        >
          Stop
        </button>
      );
    case "confirm":
      return (
        <span className="confirm">
          <span>Stop?</span>
          <button type="button" className="btn small danger" onClick={() => void run(false)} autoFocus>
            Yes, stop
          </button>
          <button type="button" className="btn small" onClick={() => setState({ kind: "idle" })}>
            Cancel
          </button>
        </span>
      );
    case "stopping":
      return <button type="button" className="btn small" disabled>Stopping…</button>;
    case "stuck":
      return (
        <span className="confirm" title={state.message}>
          <span>Still running</span>
          <button type="button" className="btn small danger" onClick={() => void run(true)}>
            Force stop
          </button>
          <button type="button" className="btn small" onClick={() => setState({ kind: "idle" })}>
            Cancel
          </button>
        </span>
      );
    default: {
      const _exhaustive: never = state;
      throw new Error(`unhandled stop state: ${JSON.stringify(_exhaustive)}`);
    }
  }
}
