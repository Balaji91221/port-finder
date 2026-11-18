import { describe, expect, it } from "vitest";
import { demoLogs } from "./demoLogs";
import { makePort } from "./fixtures";
import { fileSize } from "./format";
import { parseLogReply } from "./parse";

const FILE = { path: "~/code/shop/next.log", streams: ["stdout", "stderr"], size: 349, lines: ["ready"] };

describe("parseLogReply", () => {
  it("keeps a valid reply", () => {
    const reply = { pid: 1, port: 3000, files: [FILE], reason: "" };
    expect(parseLogReply(reply)).toEqual({ files: [FILE], reason: "" });
  });

  it("keeps a reply with no files and a reason", () => {
    const reply = { files: [], reason: "Output goes to terminal ttys001" };
    expect(parseLogReply(reply)).toEqual(reply);
  });

  it("rejects a reply with a bad file entry", () => {
    expect(parseLogReply({ files: [{ ...FILE, lines: [1, 2] }], reason: "" })).toBeNull();
    expect(parseLogReply({ files: [{ ...FILE, size: "1 KB" }], reason: "" })).toBeNull();
  });

  it("rejects an error reply", () => {
    expect(parseLogReply({ error: "origin not allowed" })).toBeNull();
    expect(parseLogReply(null)).toBeNull();
  });
});

describe("demoLogs", () => {
  it("ends at the given time and moves every 2 s", () => {
    const row = makePort();
    const now = Date.UTC(2026, 10, 18, 9, 30, 0);
    const first = demoLogs(row, now);
    const later = demoLogs(row, now + 2000);
    if (!first.ok || !later.ok) {
      throw new Error("demo logs should always load");
    }
    expect(first.files[0].lines).toHaveLength(40);
    expect(first.files[0].lines.at(-1)).toMatch(/^09:30:00 /);
    expect(later.files[0].lines.at(-1)).toMatch(/^09:30:02 /);
  });

  it("gives system apps a reason instead of a file", () => {
    const result = demoLogs(makePort({ group: "system" }));
    expect(result).toEqual({ ok: true, files: [], reason: expect.stringContaining("/dev/null") });
  });
});

describe("fileSize", () => {
  it("picks a readable unit", () => {
    expect(fileSize(349)).toBe("349 B");
    expect(fileSize(11504)).toBe("11 KB");
    expect(fileSize(5 * 1024 * 1024)).toBe("5.0 MB");
  });
});
