import { describe, expect, it } from "vitest";
import { makePort } from "./fixtures";
import { filterPorts, groupPorts, portStats } from "./group";

const ports = [
  makePort({ port: 3000, folder: "~/code/shop" }),
  makePort({ port: 8000, folder: "~/code/shop", label: "Uvicorn", url: "" }),
  makePort({ port: 5173, folder: "~/code/admin", label: "Vite" }),
  makePort({ port: 5432, group: "service", label: "PostgreSQL", folder: "", url: "" }),
  makePort({ port: 5000, group: "system", label: "AirPlay Receiver", folder: "" }),
];

describe("filterPorts", () => {
  it("hides system apps unless asked", () => {
    expect(filterPorts(ports, "", false)).toHaveLength(4);
    expect(filterPorts(ports, "", true)).toHaveLength(5);
  });

  it("searches port, label and folder", () => {
    expect(filterPorts(ports, "5173", false).map((r) => r.port)).toEqual([5173]);
    expect(filterPorts(ports, "uvicorn", false).map((r) => r.port)).toEqual([8000]);
    expect(filterPorts(ports, "ADMIN", false).map((r) => r.port)).toEqual([5173]);
  });
});

describe("groupPorts", () => {
  it("puts projects first, sorted by name, then services and system apps", () => {
    const sections = groupPorts(ports);
    expect(sections.map((s) => s.title)).toEqual(["", "Databases & services", "System apps"]);
    expect(sections[0].cards.map((c) => [c.title, c.rows.length])).toEqual([
      ["admin", 1],
      ["shop", 2],
    ]);
  });
});

describe("portStats", () => {
  it("counts ports, projects, web pages and services", () => {
    expect(portStats(ports)).toEqual({ ports: 5, projects: 2, web: 2, services: 1 });
  });
});
