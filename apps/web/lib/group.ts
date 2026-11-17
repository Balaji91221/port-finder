import { projectName } from "./format";
import type { PortInfo } from "./types";

export type PortCard = { key: string; title: string; path: string; rows: PortInfo[] };
export type PortSection = { title: string; cards: PortCard[] };

export const SECTION_TITLES = { service: "Databases & services", system: "System apps" } as const;

export function filterPorts(ports: PortInfo[], query: string, showSystem: boolean): PortInfo[] {
  const text = query.trim().toLowerCase();
  return ports.filter((row) => {
    if (row.group === "system" && !showSystem) {
      return false;
    }
    if (!text) {
      return true;
    }
    const hay = [row.port, row.label, row.app, row.folder, row.command].join(" ").toLowerCase();
    return hay.includes(text);
  });
}

function bucket(rows: PortInfo[], keyOf: (row: PortInfo) => string): Map<string, PortInfo[]> {
  const out = new Map<string, PortInfo[]>();
  for (const row of rows) {
    const key = keyOf(row);
    const list = out.get(key);
    if (list) {
      list.push(row);
    } else {
      out.set(key, [row]);
    }
  }
  return out;
}

/** Projects first (one card per folder), then services and system apps by label. */
export function groupPorts(rows: PortInfo[]): PortSection[] {
  const byFolder = bucket(rows.filter((r) => r.group === "project"), (r) => r.folder);
  const projectCards = [...byFolder.entries()]
    .map(([folder, list]) => ({
      key: `project:${folder}`,
      title: projectName(folder),
      path: folder,
      rows: list,
    }))
    .sort((a, b) => a.title.localeCompare(b.title));

  const sections: PortSection[] = [{ title: "", cards: projectCards }];
  for (const group of ["service", "system"] as const) {
    const byLabel = bucket(rows.filter((r) => r.group === group), (r) => r.label);
    if (byLabel.size === 0) {
      continue;
    }
    const cards = [...byLabel.entries()].map(([label, list]) => ({
      key: `${group}:${label}`,
      title: label,
      path: "",
      rows: list,
    }));
    sections.push({ title: SECTION_TITLES[group], cards });
  }
  return sections;
}

export type PortStats = { ports: number; projects: number; web: number; services: number };

export function portStats(ports: PortInfo[]): PortStats {
  const projectRows = ports.filter((r) => r.group === "project");
  return {
    ports: ports.length,
    projects: new Set(projectRows.map((r) => r.folder)).size,
    web: ports.filter((r) => r.url && r.group !== "system").length,
    services: ports.filter((r) => r.group === "service").length,
  };
}
