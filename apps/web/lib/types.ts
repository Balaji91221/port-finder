export const PortGroup = { Project: "project", Service: "service", System: "system" } as const;
export type PortGroup = (typeof PortGroup)[keyof typeof PortGroup];

/** One listening port as reported by the local helper. */
export type PortInfo = {
  port: number;
  pids: number[];
  app: string;
  label: string;
  group: PortGroup;
  /** Project folder with the home folder shown as "~", or "" when unknown. */
  folder: string;
  command: string;
  /** Seconds since the oldest process on this port started. */
  uptime: number;
  /** "http://localhost:3000" when the port serves a web page, else "". */
  url: string;
};

/** One port found by the browser-only quick scan. */
export type ScanHit = {
  port: number;
  url: string;
  guess: string;
};

export type ScanProgress = { done: number; total: number };

export type Source =
  | { kind: "connecting" }
  | { kind: "helper"; ports: PortInfo[]; canKill: boolean; checkedAt: Date }
  | { kind: "demo"; ports: PortInfo[] }
  | { kind: "scanning"; progress: ScanProgress; hits: ScanHit[] }
  | { kind: "scanned"; hits: ScanHit[]; scannedCount: number; checkedAt: Date }
  | { kind: "offline" };

export type StopResult =
  | { ok: true }
  | { ok: false; canForce: boolean; message: string };

export type View = "projects" | "table";
export type Theme = "" | "light" | "dark";

export type Prefs = {
  view: View;
  showSystem: boolean;
  auto: boolean;
  theme: Theme;
};
