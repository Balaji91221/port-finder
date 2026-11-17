import type { PortInfo } from "./types";

export function makePort(overrides: Partial<PortInfo> = {}): PortInfo {
  return {
    port: 3000,
    pids: [100],
    app: "node",
    label: "Next.js",
    group: "project",
    folder: "~/code/shop",
    command: "node next dev",
    uptime: 120,
    url: "http://localhost:3000",
    ...overrides,
  };
}
