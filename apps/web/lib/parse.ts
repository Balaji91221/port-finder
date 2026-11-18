import { PortGroup, type LogFile, type PortInfo } from "./types";

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

export type HelperReply = { ports: PortInfo[]; canKill: boolean; canLogs: boolean };

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
  // Helpers before 1.2 cannot stop processes, before 1.3 cannot read logs.
  return { ports: rows, canKill: value.canKill === true, canLogs: value.canLogs === true };
}

function isStringList(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function parseLogFile(value: unknown): LogFile | null {
  if (!isRecord(value)) {
    return null;
  }
  const { path, streams, size, lines } = value;
  if (typeof path !== "string" || typeof size !== "number") {
    return null;
  }
  if (!isStringList(streams) || !isStringList(lines)) {
    return null;
  }
  return { path, streams, size, lines };
}

export type LogReply = { files: LogFile[]; reason: string };

/** Validate the helper's /logs reply. One bad file entry rejects the reply. */
export function parseLogReply(value: unknown): LogReply | null {
  if (!isRecord(value) || !Array.isArray(value.files) || typeof value.reason !== "string") {
    return null;
  }
  const files: LogFile[] = [];
  for (const item of value.files) {
    const file = parseLogFile(item);
    if (!file) {
      return null;
    }
    files.push(file);
  }
  return { files, reason: value.reason };
}

/** Read the error text from a helper reply, if there is one. */
export function errorText(value: unknown): string {
  return isRecord(value) && typeof value.error === "string" ? value.error : "";
}
