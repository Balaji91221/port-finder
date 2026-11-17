import { PortGroup, type PortInfo } from "./types";

const GROUPS: readonly string[] = Object.values(PortGroup);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isGroup(value: unknown): value is PortGroup {
  return typeof value === "string" && GROUPS.includes(value);
}

function isPidList(value: unknown): value is number[] {
  return Array.isArray(value) && value.length > 0 && value.every(Number.isInteger);
}

function parsePort(value: unknown): PortInfo | null {
  if (!isRecord(value)) {
    return null;
  }
  const { port, pids, app, label, group, folder, command, uptime, url } = value;
  if (!Number.isInteger(port) || typeof port !== "number" || !isPidList(pids)) {
    return null;
  }
  if (typeof app !== "string" || typeof label !== "string" || !isGroup(group)) {
    return null;
  }
  if (typeof folder !== "string" || typeof command !== "string") {
    return null;
  }
  if (typeof uptime !== "number" || typeof url !== "string") {
    return null;
  }
  return { port, pids, app, label, group, folder, command, uptime, url };
}

export type HelperReply = { ports: PortInfo[]; canKill: boolean };

/**
 * Validate the helper's /ports reply. Rows with an unknown shape are dropped
 * so one odd process cannot break the whole page.
 */
export function parseHelperReply(value: unknown): HelperReply | null {
  if (!isRecord(value) || !Array.isArray(value.ports)) {
    return null;
  }
  const rows: PortInfo[] = [];
  for (const item of value.ports) {
    const row = parsePort(item);
    if (row) {
      rows.push(row);
    }
  }
  // Helpers before 1.2 cannot stop processes and send no canKill field.
  return { ports: rows, canKill: value.canKill === true };
}

/** Read the error text from a helper reply, if there is one. */
export function errorText(value: unknown): string {
  return isRecord(value) && typeof value.error === "string" ? value.error : "";
}
