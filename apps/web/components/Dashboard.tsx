"use client";

import { useEffect, useState } from "react";
import { usePortSource } from "@/hooks/usePortSource";
import { copyText, useToast } from "@/hooks/useToast";
import { clockTime } from "@/lib/format";
import { applyTheme, DEFAULT_PREFS, loadPrefs, savePrefs } from "@/lib/prefs";
import type { Prefs, Source } from "@/lib/types";
import { ConnectCard } from "./ConnectCard";
import { FullView } from "./FullView";
import { Header, REPO_URL, type PillState } from "./Header";
import { ScanResults } from "./ScanResults";

function pillFor(source: Source): PillState {
  switch (source.kind) {
    case "connecting":
      return { mode: "", text: "Checking…" };
    case "helper":
      return { mode: "on", text: "Connected", detail: clockTime(source.checkedAt) };
    case "demo":
      return { mode: "partial", text: "Demo data" };
    case "scanning":
    case "scanned":
      return { mode: "partial", text: "Quick scan", detail: "helper not running" };
    case "offline":
      return { mode: "off", text: "Helper not running" };
    default: {
      const _exhaustive: never = source;
      throw new Error(`unhandled source: ${JSON.stringify(_exhaustive)}`);
    }
  }
}

export function Dashboard() {
  const [prefs, setPrefs] = useState<Prefs>(DEFAULT_PREFS);
  const port = usePortSource(prefs.auto);
  const toast = useToast();
  const { source } = port;

  // Saved prefs live in the browser only, so read them after mount.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time sync from storage
    setPrefs(loadPrefs());
  }, []);

  function updatePrefs(next: Partial<Prefs>): void {
    setPrefs((prev) => {
      const merged = { ...prev, ...next };
      savePrefs(merged);
      return merged;
    });
  }

  function toggleTheme(): void {
    const dark = prefs.theme ? prefs.theme === "dark" : matchMedia("(prefers-color-scheme: dark)").matches;
    const theme = dark ? "light" : "dark";
    applyTheme(theme);
    updatePrefs({ theme });
  }

  function copy(text: string, done: string): void {
    void copyText(text).then((ok) => toast.show(ok ? done : "Could not copy — select the text and copy it by hand"));
  }

  return (
    <>
      <Header pill={pillFor(source)} onToggleTheme={toggleTheme} />
      <main className="wrap">
        <section className="intro">
          <h1>What is running on this laptop?</h1>
          <p>Every listening port, the app behind it, and the project it belongs to.</p>
        </section>
        <Body source={source} prefs={prefs} port={port} onPrefs={updatePrefs} copy={copy} toast={toast.show} />
        <footer className="site-footer">
          <span>Stop always asks first and never touches system apps.</span>
          <span>Your port list stays on this laptop and is never sent to a server.</span>
          <a href={REPO_URL} target="_blank" rel="noopener">Open source · MIT</a>
        </footer>
      </main>
      <div className={`toast${toast.visible ? " show" : ""}`} role="status">{toast.message}</div>
    </>
  );
}

type BodyProps = {
  source: Source;
  prefs: Prefs;
  port: ReturnType<typeof usePortSource>;
  onPrefs: (next: Partial<Prefs>) => void;
  copy: (text: string, done: string) => void;
  toast: (text: string) => void;
};

function Body({ source, prefs, port, onPrefs, copy, toast }: BodyProps) {
  switch (source.kind) {
    case "connecting":
      return <div className="card empty">Looking for the Port Finder helper…</div>;
    case "offline":
      return <ConnectCard onScan={port.startScan} onDemo={port.showDemo} onCopy={copy} />;
    case "scanning":
    case "scanned":
      return (
        <ScanResults
          hits={source.hits}
          progress={source.kind === "scanning" ? source.progress : null}
          onRescan={port.startScan}
          onStop={port.stopScan}
          onCopy={copy}
        />
      );
    case "helper":
    case "demo":
      return (
        <FullView
          ports={source.ports}
          prefs={prefs}
          busy={port.busy}
          demo={source.kind === "demo"}
          onPrefs={onPrefs}
          onRefresh={() => void port.refresh()}
          onLeaveDemo={port.leaveDemo}
          onCopy={copy}
          onToast={toast}
          onStop={source.kind === "demo" || source.canKill ? port.stopRow : undefined}
        />
      );
    default: {
      const _exhaustive: never = source;
      throw new Error(`unhandled source: ${JSON.stringify(_exhaustive)}`);
    }
  }
}
