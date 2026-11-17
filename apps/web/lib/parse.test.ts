import { describe, expect, it } from "vitest";
import { makePort } from "./fixtures";
import { parseHelperReply } from "./parse";

describe("parseHelperReply", () => {
  it("keeps valid rows", () => {
    const row = makePort();
    expect(parseHelperReply({ version: "1.1", ports: [row] })).toEqual({ ports: [row], canKill: false });
  });

  it("drops rows with a wrong shape and keeps the rest", () => {
    const good = makePort({ port: 5173 });
    const reply = { ports: [good, { ...makePort(), group: "alien" }, { port: "80" }, null] };
    expect(parseHelperReply(reply)?.ports).toEqual([good]);
  });

  it("rejects a reply without a ports list", () => {
    expect(parseHelperReply({ error: "bad host" })).toBeNull();
    expect(parseHelperReply("nope")).toBeNull();
    expect(parseHelperReply(null)).toBeNull();
  });

  it("rejects rows with no pids", () => {
    expect(parseHelperReply({ ports: [makePort({ pids: [] })] })?.ports).toEqual([]);
  });

  it("reads canKill only when it is exactly true", () => {
    expect(parseHelperReply({ canKill: true, ports: [] })?.canKill).toBe(true);
    expect(parseHelperReply({ canKill: "yes", ports: [] })?.canKill).toBe(false);
  });
});
