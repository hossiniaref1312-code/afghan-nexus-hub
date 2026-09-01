import { useEffect, useState, useSyncExternalStore } from "react";
import {
  getPerfDimensionSnapshot,
  getPerfSnapshot,
  isPerfOverlayEnabled,
  resetPerf,
  subscribePerf,
  SLOW_QUERY_MS,
  type PerfDimKind,
} from "@/lib/perf";

function useSnapshot() {
  return useSyncExternalStore(
    subscribePerf,
    () => JSON.stringify(getPerfSnapshot()),
    () => "[]",
  );
}

/**
 * Dev/ops overlay showing query timings and cache hit rates.
 * Enable with `?perf=1` (persists via localStorage key `am_perf`).
 */
export function PerfOverlay() {
  const [enabled, setEnabled] = useState(false);
  const [open, setOpen] = useState(true);
  const [view, setView] = useState<"query" | PerfDimKind>("query");
  const raw = useSnapshot();

  useEffect(() => setEnabled(isPerfOverlayEnabled()), []);
  if (!enabled) return null;

  void raw; // re-render trigger
  const rows = getPerfSnapshot();
  const dimRows = view === "query" ? [] : getPerfDimensionSnapshot(view);

  return (
    <div className="fixed bottom-20 left-2 z-[60] max-w-[95vw] rounded-lg border border-border bg-card/95 p-2 text-[11px] shadow-lg backdrop-blur md:bottom-4">
      <div className="flex items-center gap-2">
        <span className="font-semibold">Query perf</span>
        <button className="text-muted-foreground underline" onClick={() => setOpen((v) => !v)}>
          {open ? "hide" : "show"}
        </button>
        <button className="text-muted-foreground underline" onClick={resetPerf}>
          reset
        </button>
        <button
          className="text-muted-foreground underline"
          onClick={() => {
            try {
              window.localStorage.removeItem("am_perf");
            } catch {
              /* ignore */
            }
            setEnabled(false);
          }}
        >
          off
        </button>
      </div>
      {open && (
        <div className="mt-1 flex gap-1">
          {(["query", "shop", "category"] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`rounded px-1.5 py-0.5 ${
                view === v ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
              }`}
            >
              {v}
            </button>
          ))}
        </div>
      )}
      {open && view !== "query" && (
        <div className="mt-2 overflow-x-auto">
          {dimRows.length === 0 ? (
            <div className="text-muted-foreground">no {view} data yet</div>
          ) : (
            <table className="min-w-[560px] border-collapse">
              <thead className="text-muted-foreground">
                <tr>
                  <th className="px-1 text-start">{view}</th>
                  <th className="px-1 text-end">alert%</th>
                  <th className="px-1 text-end">alerts</th>
                  <th className="px-1 text-end">crit</th>
                  <th className="px-1 text-end">slow%</th>
                  <th className="px-1 text-end">hit%</th>
                  <th className="px-1 text-end">fetch</th>
                  <th className="px-1 text-end">avg</th>
                  <th className="px-1 text-end">p95</th>
                  <th className="px-1 text-end">max</th>
                </tr>
              </thead>
              <tbody>
                {dimRows.map((r) => (
                  <tr
                    key={`${r.kind}:${r.value}`}
                    className={
                      r.alertRate > 0
                        ? "text-destructive"
                        : r.p95Ms >= SLOW_QUERY_MS
                          ? "text-destructive/70"
                          : ""
                    }
                    title={r.queries.join(", ")}
                  >
                    <td className="max-w-[160px] truncate px-1">{r.value}</td>
                    <td className="px-1 text-end">{Math.round(r.alertRate * 100)}%</td>
                    <td className="px-1 text-end">{r.alerts}</td>
                    <td className="px-1 text-end">{r.criticalAlerts}</td>
                    <td className="px-1 text-end">{Math.round(r.slowRate * 100)}%</td>
                    <td className="px-1 text-end">{Math.round(r.hitRate * 100)}%</td>
                    <td className="px-1 text-end">{r.fetches}</td>
                    <td className="px-1 text-end">{Math.round(r.avgMs)}ms</td>
                    <td className="px-1 text-end">{r.p95Ms}ms</td>
                    <td className="px-1 text-end">{r.maxMs}ms</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
      {open && view === "query" && (
        <div className="mt-2 overflow-x-auto">
          {rows.length === 0 ? (
            <p className="text-muted-foreground">No queries recorded yet.</p>
          ) : (
            <table className="min-w-[520px] border-collapse">
              <thead className="text-muted-foreground">
                <tr>
                  <th className="px-1 text-start">query</th>
                  <th className="px-1 text-end">hit%</th>
                  <th className="px-1 text-end">obs</th>
                  <th className="px-1 text-end">fetch</th>
                  <th className="px-1 text-end">last</th>
                  <th className="px-1 text-end">avg</th>
                  <th className="px-1 text-end">p95</th>
                  <th className="px-1 text-end">max</th>
                  <th className="px-1 text-end">slow</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.name} className={r.p95Ms >= SLOW_QUERY_MS ? "text-destructive" : ""}>
                    <td className="px-1">{r.name}</td>
                    <td className="px-1 text-end">{Math.round(r.hitRate * 100)}%</td>
                    <td className="px-1 text-end">{r.observations}</td>
                    <td className="px-1 text-end">{r.fetches}</td>
                    <td className="px-1 text-end">{r.lastMs}ms</td>
                    <td className="px-1 text-end">{Math.round(r.avgMs)}ms</td>
                    <td className="px-1 text-end">{r.p95Ms}ms</td>
                    <td className="px-1 text-end">{r.maxMs}ms</td>
                    <td className="px-1 text-end">{r.slow}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
