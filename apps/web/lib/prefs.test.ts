import { expect, it } from "vitest";
import { DEFAULT_PREFS, parsePrefs } from "./prefs";

it("falls back to defaults for bad stored values", () => {
  expect(parsePrefs(null)).toEqual(DEFAULT_PREFS);
  expect(parsePrefs({ view: "grid", auto: "yes", theme: "blue" })).toEqual(DEFAULT_PREFS);
});

it("keeps valid stored values", () => {
  const saved = { view: "table", showSystem: true, auto: true, theme: "dark" };
  expect(parsePrefs(saved)).toEqual(saved);
});
