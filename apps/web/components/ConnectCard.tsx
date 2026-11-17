import { useSyncExternalStore } from "react";
import { helperCommand } from "@/lib/helper";

type ConnectCardProps = {
  onScan: () => void;
  onDemo: () => void;
  onCopy: (text: string, done: string) => void;
};

const noSubscribe = (): (() => void) => () => {};

/** The page's own address, known only in the browser. */
function useOrigin(): string {
  return useSyncExternalStore(noSubscribe, () => location.origin, () => "");
}

export function HelperCommand({ onCopy }: Pick<ConnectCardProps, "onCopy">) {
  const origin = useOrigin();
  const command = origin ? helperCommand(origin) : "";
  return (
    <div className="cmd">
      <code>{command || "…"}</code>
      <button type="button" className="btn small" disabled={!command} onClick={() => onCopy(command, "Command copied")}>
        Copy
      </button>
    </div>
  );
}

export function ConnectCard({ onScan, onDemo, onCopy }: ConnectCardProps) {
  return (
    <section className="card connect">
      <h2>See what is running on this laptop</h2>
      <p>
        A web page cannot read your ports by itself. Pick a quick scan right here in the
        browser, or run a small helper for the full picture.
      </p>
      <div className="choices">
        <div className="choice">
          <h3>Quick scan · no install</h3>
          <p>Your browser checks about 60 common dev ports, such as 3000, 5173 and 8000.</p>
          <ul>
            <li>Finds web servers only</li>
            <li>No app names or project folders</li>
            <li>Chrome may ask to allow local network access</li>
          </ul>
          <div className="push">
            <button type="button" className="btn primary" onClick={onScan}>Run quick scan</button>
          </div>
        </div>
        <div className="choice">
          <h3>Full details · one command</h3>
          <p>A read-only helper lists every port with its app, project folder and uptime.</p>
          <ul>
            <li>Every port, databases included</li>
            <li>Runs on 127.0.0.1 only, never leaves your laptop</li>
            <li>macOS with Python 3</li>
          </ul>
          <div className="push">
            <HelperCommand onCopy={onCopy} />
          </div>
        </div>
      </div>
      <p className="note">
        This page connects to the helper by itself within 3 seconds of it starting.{" "}
        <a href="/port-helper.py" download>Download port-helper.py</a> to read it first, or{" "}
        <button type="button" className="btn link" onClick={onDemo}>see a demo</button>.
      </p>
    </section>
  );
}
