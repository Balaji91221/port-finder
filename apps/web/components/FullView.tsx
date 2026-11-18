"use client";

import { useEffect, useRef, useState } from "react";
import { filterPorts, portStats } from "@/lib/group";
import type { PortInfo, Prefs } from "@/lib/types";
import type { LogsFn } from "@/hooks/useLogFollow";
import { SearchIcon } from "./icons";
import { ProjectView, TableView, type RowActions, type Sort, type SortKey } from "./PortList";
import { StopAllButton, type StopAllFn } from "./StopAllButton";
import type { StopFn } from "./StopButton";

type FullViewProps = {
  ports: PortInfo[];
  prefs: Prefs;
  busy: boolean;
  demo: boolean;
  onPrefs: (next: Partial<Prefs>) => void;
  onRefresh: () => void;
  onLeaveDemo: () => void;
  onCopy: (text: string, done: string) => void;
  onToast: (text: string) => void;
  /** Missing when the helper is read-only or too old to stop processes. */
  onStop?: StopFn;
  onStopAll?: StopAllFn;
  /** Missing when the helper is too old to read logs. */
  onLogs?: LogsFn;
};

function Stats({ ports }: { ports: PortInfo[] }) {
  const stats = portStats(ports);
  return (
    <section className="stats">
      <div className="stat"><b>{stats.ports}</b><span>Listening ports</span></div>
      <div className="stat"><b>{stats.projects}</b><span>Projects running</span></div>
      <div className="stat"><b>{stats.web}</b><span>Open in browser</span></div>
      <div className="stat"><b>{stats.services}</b><span>Databases &amp; services</span></div>
    </section>
  );
}

function useSlashFocus(): React.RefObject<HTMLInputElement | null> {
  const ref = useRef<HTMLInputElement | null>(null);
  useEffect(() => {
    function onKey(ev: KeyboardEvent): void {
      const input = ref.current;
      if (ev.key === "/" && input && document.activeElement !== input) {
        ev.preventDefault();
        input.focus();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);
  return ref;
}

export function FullView(props: FullViewProps) {
  const { ports, prefs, busy, demo, onPrefs, onRefresh, onLeaveDemo, onCopy, onToast } = props;
  const { onStop, onStopAll, onLogs } = props;
  const actions: RowActions = { onCopy, onToast, onStop, onLogs };
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<Sort>({ key: "port", desc: false });
  const searchRef = useSlashFocus();
  const rows = filterPorts(ports, query, prefs.showSystem);
  const urls = [...new Set(rows.filter((r) => r.url).map((r) => r.url))];

  function onSort(key: SortKey): void {
    setSort((prev) => ({ key, desc: prev.key === key ? !prev.desc : false }));
  }

  function openAll(): void {
    const blocked = urls.filter((url) => !window.open(url, "_blank", "noopener")).length;
    if (blocked) {
      onToast("Browser blocked some tabs — allow pop-ups for this site");
    }
  }

  return (
    <>
      {demo ? (
        <div className="banner">
          <p><strong>Demo data.</strong> These ports are examples, not from your laptop.</p>
          <button type="button" className="btn small" onClick={onLeaveDemo}>Leave demo</button>
        </div>
      ) : null}
      <Stats ports={ports} />
      <section className="toolbar">
        <label className="search">
          <SearchIcon />
          <input
            ref={searchRef}
            type="search"
            value={query}
            onChange={(ev: React.ChangeEvent<HTMLInputElement>) => setQuery(ev.target.value)}
            placeholder="Search port, app or project   ( / )"
            aria-label="Search"
          />
        </label>
        <div className="seg" role="group" aria-label="View">
          <button type="button" aria-pressed={prefs.view === "projects"} onClick={() => onPrefs({ view: "projects" })}>
            By project
          </button>
          <button type="button" aria-pressed={prefs.view === "table"} onClick={() => onPrefs({ view: "table" })}>
            All ports
          </button>
        </div>
        <label className="check">
          <input
            type="checkbox"
            checked={prefs.showSystem}
            onChange={(ev: React.ChangeEvent<HTMLInputElement>) => onPrefs({ showSystem: ev.target.checked })}
          />
          System apps
        </label>
        {demo ? null : (
          <label className="check">
            <input
              type="checkbox"
              checked={prefs.auto}
              onChange={(ev: React.ChangeEvent<HTMLInputElement>) => onPrefs({ auto: ev.target.checked })}
            />
            Auto-refresh
          </label>
        )}
        <button type="button" className="btn" disabled={!urls.length} onClick={openAll}>Open all</button>
        {onStopAll ? <StopAllButton rows={rows} onStopAll={onStopAll} onToast={onToast} /> : null}
        {demo ? null : (
          <button type="button" className="btn primary" disabled={busy} onClick={onRefresh}>Refresh</button>
        )}
      </section>
      {rows.length === 0 ? (
        <div className="card empty">
          {query ? "No port matches your search." : "No ports are listening right now."}
        </div>
      ) : prefs.view === "table" ? (
        <TableView rows={rows} sort={sort} onSort={onSort} actions={actions} />
      ) : (
        <ProjectView rows={rows} actions={actions} />
      )}
    </>
  );
}
