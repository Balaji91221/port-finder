import { plural } from "@/lib/format";
import type { ScanHit, ScanProgress } from "@/lib/types";
import { HelperCommand } from "./ConnectCard";

type ScanResultsProps = {
  hits: ScanHit[];
  progress: ScanProgress | null;
  onRescan: () => void;
  onStop: () => void;
  onCopy: (text: string, done: string) => void;
};

export function ScanResults({ hits, progress, onRescan, onStop, onCopy }: ScanResultsProps) {
  const running = progress !== null;
  const percent = progress && progress.total ? Math.round((progress.done / progress.total) * 100) : 100;

  return (
    <>
      <div className="banner">
        <p>
          <strong>Quick scan</strong> shows web servers on common ports only. Run the helper to
          see every port with its app and project folder.
        </p>
      </div>
      <div className="card connect">
        <div className="toolbar">
          <h2 style={{ margin: 0, marginRight: "auto" }}>
            {running ? `Scanning… ${progress.done} of ${progress.total}` : `Found ${plural(hits.length, "web server")}`}
          </h2>
          {running ? (
            <button type="button" className="btn" onClick={onStop}>Stop</button>
          ) : (
            <button type="button" className="btn primary" onClick={onRescan}>Scan again</button>
          )}
        </div>
        {running ? (
          <div className="progress" role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100}>
            <span style={{ width: `${percent}%` }} />
          </div>
        ) : null}
        <HelperCommand onCopy={onCopy} />
      </div>
      {hits.length ? (
        <div className="card">
          {hits.map((hit) => (
            <div className="row" key={hit.port}>
              <span className="port">{hit.port}</span>
              <span className="tag plain">{hit.guess}</span>
              <span className="meta">usually {hit.guess} · app unknown without the helper</span>
              <div className="actions">
                <button type="button" className="btn small" onClick={() => onCopy(hit.url, `Copied ${hit.url}`)}>
                  Copy
                </button>
                <a className="btn small primary" href={hit.url} target="_blank" rel="noopener">Open</a>
              </div>
            </div>
          ))}
        </div>
      ) : running ? null : (
        <div className="card empty">
          No web server answered on the common ports. If Chrome asked about local network
          access, allow it and scan again.
        </div>
      )}
    </>
  );
}
