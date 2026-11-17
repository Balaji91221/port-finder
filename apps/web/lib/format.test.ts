import { describe, expect, it } from "vitest";
import { makePort } from "./fixtures";
import { plural, processText, projectName, uptime } from "./format";

describe("uptime", () => {
  it.each([
    [30, "just started"],
    [60, "1m"],
    [3600 + 120, "1h 2m"],
    [86400 * 2 + 3600 * 5, "2d 5h"],
  ])("%i seconds -> %s", (seconds, text) => {
    expect(uptime(seconds)).toBe(text);
  });
});

describe("projectName", () => {
  it("uses the last folder", () => {
    expect(projectName("~/code/shop/api")).toBe("api");
  });

  it("names the home folder", () => {
    expect(projectName("~")).toBe("Home folder");
  });
});

describe("processText", () => {
  it("shows one PID or a process count", () => {
    expect(processText(makePort())).toBe("node · PID 100 · up 2m");
    expect(processText(makePort({ pids: [1, 2] }))).toBe("node · 2 processes · up 2m");
  });
});

it("pluralises", () => {
  expect(plural(1, "port")).toBe("1 port");
  expect(plural(3, "port")).toBe("3 ports");
});
