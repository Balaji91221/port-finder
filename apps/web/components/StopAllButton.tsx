"use client";

import { useState } from "react";
import { plural } from "@/lib/format";
import type { PortInfo, StopAllResult } from "@/lib/types";

export type StopAllFn = (rows: PortInfo[]) => Promise<StopAllResult>;

type StopAllProps = {
  rows: PortInfo[];
  onStopAll: StopAllFn;
  onToast: (text: string) => void;
};

type Step = "idle" | "confirm" | "stopping";

function summary({ stopped, failed, firstError }: StopAllResult): string {
  const done = `Stopped ${plural(stopped, "port")}`;
  return failed ? `${done}, ${failed} failed — ${firstError}` : done;
}

/** Stops every listed port except system apps, after one confirm. */
export function StopAllButton({ rows, onStopAll, onToast }: StopAllProps) {
  const [step, setStep] = useState<Step>("idle");
  const targets = rows.filter((r) => r.group !== "system");
  const services = targets.filter((r) => r.group === "service").length;

  async function run(): Promise<void> {
    setStep("stopping");
    onToast(summary(await onStopAll(targets)));
    setStep("idle");
  }

  if (step === "stopping") {
    return <button type="button" className="btn" disabled>Stopping…</button>;
  }
  if (step === "confirm") {
    const extra = services ? ` (${services} databases & services)` : "";
    return (
      <span className="confirm">
        <span>Stop {plural(targets.length, "port")}{extra}?</span>
        <button type="button" className="btn small danger" onClick={() => void run()} autoFocus>
          Yes, stop all
        </button>
        <button type="button" className="btn small" onClick={() => setStep("idle")}>Cancel</button>
      </span>
    );
  }
  return (
    <button
      type="button"
      className="btn danger-ghost"
      disabled={!targets.length}
      title="Stop every port in this list except system apps"
      onClick={() => setStep("confirm")}
    >
      Stop all
    </button>
  );
}
