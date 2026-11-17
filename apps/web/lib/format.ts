import type { PortInfo } from "./types";

export function uptime(seconds: number): string {
  if (seconds < 60) {
    return "just started";
  }
  const mins = Math.floor(seconds / 60);
  if (mins < 60) {
    return `${mins}m`;
  }
  const hours = Math.floor(mins / 60);
  if (hours < 24) {
    return `${hours}h ${mins % 60}m`;
  }
  return `${Math.floor(hours / 24)}d ${hours % 24}h`;
}

export function projectName(folder: string): string {
  if (folder === "~") {
    return "Home folder";
  }
  return folder.split("/").filter(Boolean).pop() ?? folder;
}

export function plural(count: number, word: string): string {
  return `${count} ${word}${count === 1 ? "" : "s"}`;
}

export function processText(row: PortInfo): string {
  const [first] = row.pids;
  const pids = row.pids.length > 1 ? `${row.pids.length} processes` : `PID ${first}`;
  return `${row.app} · ${pids} · up ${uptime(row.uptime)}`;
}

export function clockTime(date: Date): string {
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}
