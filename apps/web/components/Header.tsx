import { Logo } from "./icons";

export type PillState = { mode: "on" | "partial" | "off" | ""; text: string; detail?: string };

type HeaderProps = {
  pill: PillState;
  onToggleTheme: () => void;
};

export const REPO_URL = "https://github.com/Balaji91221/port-finder";

export function Header({ pill, onToggleTheme }: HeaderProps) {
  return (
    <header className="site-header">
      <div className="wrap top">
        <div className="brand">
          <Logo />
          Port Finder
        </div>
        <div className={`pill ${pill.mode}`} role="status">
          <span className="dot" />
          <span>{pill.text}</span>
          {pill.detail ? <span className="long">· {pill.detail}</span> : null}
        </div>
        <a className="btn icon" href={REPO_URL} target="_blank" rel="noopener" title="Source on GitHub">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
            <path d="M8 0a8 8 0 0 0-2.53 15.59c.4.07.55-.17.55-.38v-1.33c-2.23.48-2.7-1.07-2.7-1.07-.36-.92-.89-1.17-.89-1.17-.73-.5.05-.49.05-.49.8.06 1.23.83 1.23.83.72 1.23 1.88.87 2.34.67.07-.52.28-.87.5-1.07-1.78-.2-3.65-.89-3.65-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82a7.6 7.6 0 0 1 4 0c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.28.82 2.15 0 3.07-1.87 3.75-3.66 3.95.29.25.54.73.54 1.48v2.2c0 .21.15.46.55.38A8 8 0 0 0 8 0Z" />
          </svg>
          <span className="sr-only">GitHub</span>
        </a>
        <button
          type="button"
          className="btn icon"
          onClick={onToggleTheme}
          title="Switch light / dark"
          aria-label="Switch light or dark theme"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
            <path d="M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1Zm0 12.5V2.5a5.5 5.5 0 0 1 0 11Z" />
          </svg>
        </button>
      </div>
    </header>
  );
}
