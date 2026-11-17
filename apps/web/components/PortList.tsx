import { uptime, plural, processText } from "@/lib/format";
import { groupPorts, type PortCard } from "@/lib/group";
import type { PortInfo } from "@/lib/types";
import { StopButton, type StopFn } from "./StopButton";

/** What a row can do. onStop is missing when the helper cannot stop processes. */
export type RowActions = {
  onCopy: (text: string, done: string) => void;
  onToast: (text: string) => void;
  onStop?: StopFn;
};

function tagClass(row: PortInfo): string {
  return row.group === "project" ? "tag" : "tag plain";
}

function ActionButtons({ row, actions }: { row: PortInfo; actions: RowActions }) {
  const { url } = row;
  const { onCopy, onStop, onToast } = actions;
  const canStop = onStop && row.group !== "system";
  return (
    <div className="actions">
      {url ? (
        <>
          <button type="button" className="btn small" title="Copy address" onClick={() => onCopy(url, `Copied ${url}`)}>
            Copy
          </button>
          <a className="btn small primary" href={url} target="_blank" rel="noopener">
            Open
          </a>
        </>
      ) : (
        <span className="none">not a web page</span>
      )}
      {canStop ? <StopButton row={row} onStop={onStop} onToast={onToast} /> : null}
    </div>
  );
}

function Card({ card, actions }: { card: PortCard; actions: RowActions }) {
  return (
    <div className="card">
      <div className="card-head">
        <h2>{card.title}</h2>
        {card.path ? <span className="path">{card.path}</span> : null}
        <span className="count">{plural(card.rows.length, "port")}</span>
      </div>
      {card.rows.map((row) => (
        <div className="row" key={`${row.port}:${row.pids[0]}`}>
          <span className="port">{row.port}</span>
          <span className={tagClass(row)}>{row.label}</span>
          <span className="meta" title={row.command}>{processText(row)}</span>
          <ActionButtons row={row} actions={actions} />
        </div>
      ))}
    </div>
  );
}

export function ProjectView({ rows, actions }: { rows: PortInfo[]; actions: RowActions }) {
  return (
    <>
      {groupPorts(rows).map((section) => (
        <section key={section.title || "projects"}>
          {section.title ? <div className="section-title">{section.title}</div> : null}
          {section.cards.map((card) => <Card key={card.key} card={card} actions={actions} />)}
        </section>
      ))}
    </>
  );
}

export type SortKey = "port" | "label" | "folder" | "uptime";
export type Sort = { key: SortKey; desc: boolean };

const COLUMNS: ReadonlyArray<{ key: SortKey; title: string; value: (r: PortInfo) => string | number }> = [
  { key: "port", title: "Port", value: (r) => r.port },
  { key: "label", title: "App", value: (r) => r.label.toLowerCase() },
  { key: "folder", title: "Project", value: (r) => r.folder.toLowerCase() },
  { key: "uptime", title: "Uptime", value: (r) => r.uptime },
];

export function sortRows(rows: PortInfo[], sort: Sort): PortInfo[] {
  const column = COLUMNS.find((c) => c.key === sort.key) ?? COLUMNS[0];
  return [...rows].sort((a, b) => {
    const x = column.value(a);
    const y = column.value(b);
    const order = x < y ? -1 : x > y ? 1 : a.port - b.port;
    return sort.desc ? -order : order;
  });
}

type TableViewProps = {
  rows: PortInfo[];
  sort: Sort;
  onSort: (key: SortKey) => void;
  actions: RowActions;
};

export function TableView({ rows, sort, onSort, actions }: TableViewProps) {
  return (
    <div className="card">
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              {COLUMNS.map((c) => (
                <th key={c.key} aria-sort={c.key === sort.key ? (sort.desc ? "descending" : "ascending") : "none"}>
                  <button type="button" onClick={() => onSort(c.key)}>
                    {c.title}
                    {c.key === sort.key ? (sort.desc ? " ↓" : " ↑") : ""}
                  </button>
                </th>
              ))}
              <th>PID</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {sortRows(rows, sort).map((row) => (
              <tr key={`${row.port}:${row.pids[0]}`}>
                <td><span className="port">{row.port}</span></td>
                <td><span className={tagClass(row)}>{row.label}</span></td>
                <td className="wrap-ok"><span className="path" title={row.command}>{row.folder || "—"}</span></td>
                <td>{uptime(row.uptime)}</td>
                <td>{row.pids.join(", ")}</td>
                <td><ActionButtons row={row} actions={actions} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
