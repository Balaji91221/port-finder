import type { Prefs, Theme, View } from "./types";

const KEY = "port-finder";

export const DEFAULT_PREFS: Prefs = { view: "projects", showSystem: false, auto: false, theme: "" };

function isView(value: unknown): value is View {
  return value === "projects" || value === "table";
}

function isTheme(value: unknown): value is Theme {
  return value === "" || value === "light" || value === "dark";
}

export function parsePrefs(raw: unknown): Prefs {
  if (typeof raw !== "object" || raw === null) {
    return DEFAULT_PREFS;
  }
  const value: Record<string, unknown> = { ...raw };
  return {
    view: isView(value.view) ? value.view : DEFAULT_PREFS.view,
    showSystem: typeof value.showSystem === "boolean" ? value.showSystem : false,
    auto: typeof value.auto === "boolean" ? value.auto : false,
    theme: isTheme(value.theme) ? value.theme : "",
  };
}

export function loadPrefs(): Prefs {
  try {
    const text = localStorage.getItem(KEY);
    return text ? parsePrefs(JSON.parse(text)) : DEFAULT_PREFS;
  } catch {
    return DEFAULT_PREFS;
  }
}

export function savePrefs(prefs: Prefs): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(prefs));
  } catch {
    // Private window or blocked storage: keep working without saving.
  }
}

export function applyTheme(theme: Theme): void {
  if (theme) {
    document.documentElement.dataset.theme = theme;
  } else {
    delete document.documentElement.dataset.theme;
  }
}

/** Runs before first paint so a saved theme does not flash. */
export const THEME_BOOT_SCRIPT = `try{var t=JSON.parse(localStorage.getItem("${KEY}")||"{}").theme;if(t==="light"||t==="dark")document.documentElement.dataset.theme=t}catch(e){}`;
