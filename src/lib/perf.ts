/**
 * Lightweight client-side performance monitoring for data queries.
 *
 * Tracks, per logical query name:
 *  - number of times the query was requested (observations)
 *  - number of times the network/DB was actually hit (fetches = cache misses)
 *  - cache hit rate = 1 - fetches / observations
 *  - duration stats (last / avg / p95 / max) and slow-query occurrences
 *
 * Slow queries are logged to the console with `console.warn` so they show up in
 * the browser console and in Lovable's console-log capture.
 */

export const SLOW_QUERY_MS = 400;

export type QueryMetric = {
  name: string;
  observations: number;
  fetches: number;
  errors: number;
  slow: number;
  lastMs: number;
  maxMs: number;
  totalMs: number;
  durations: number[];
};

type Listener = () => void;

const metrics = new Map<string, QueryMetric>();
const listeners = new Set<Listener>();

function emit() {
  for (const l of listeners) l();
}

function ensure(name: string): QueryMetric {
  let m = metrics.get(name);
  if (!m) {
    m = {
      name,
      observations: 0,
      fetches: 0,
      errors: 0,
      slow: 0,
      lastMs: 0,
      maxMs: 0,
      totalMs: 0,
      durations: [],
    };
    metrics.set(name, m);
  }
  return m;
}

export function subscribePerf(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getPerfSnapshot(): Array<
  QueryMetric & { avgMs: number; p95Ms: number; hitRate: number }
> {
  return Array.from(metrics.values()).map((m) => {
    const sorted = [...m.durations].sort((a, b) => a - b);
    const p95 = sorted.length ? sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95))] : 0;
    return {
      ...m,
      avgMs: m.fetches ? m.totalMs / m.fetches : 0,
      p95Ms: p95,
      hitRate: m.observations ? 1 - m.fetches / m.observations : 0,
    };
  });
}

export function resetPerf() {
  metrics.clear();
  emit();
}

/** Record that a query result was consumed (from cache or network). */
export function recordObservation(name: string) {
  ensure(name).observations += 1;
  emit();
}

/** Wrap a query function so its duration is measured and slow runs are logged. */
export async function measureQuery<T>(name: string, fn: () => Promise<T>): Promise<T> {
  const started = typeof performance !== "undefined" ? performance.now() : Date.now();
  const m = ensure(name);
  m.fetches += 1;
  try {
    const result = await fn();
    finish(m, name, started, false);
    return result;
  } catch (err) {
    m.errors += 1;
    finish(m, name, started, true);
    throw err;
  }
}

function finish(m: QueryMetric, name: string, started: number, failed: boolean) {
  const now = typeof performance !== "undefined" ? performance.now() : Date.now();
  const ms = Math.round(now - started);
  m.lastMs = ms;
  m.totalMs += ms;
  m.maxMs = Math.max(m.maxMs, ms);
  m.durations.push(ms);
  if (m.durations.length > 100) m.durations.shift();
  if (ms >= SLOW_QUERY_MS) {
    m.slow += 1;
    console.warn(
      `[perf] slow query "${name}" took ${ms}ms${failed ? " (failed)" : ""} — threshold ${SLOW_QUERY_MS}ms`,
    );
  }
  emit();
}

export function isPerfOverlayEnabled(): boolean {
  if (typeof window === "undefined") return false;
  try {
    if (new URLSearchParams(window.location.search).get("perf") === "1") {
      window.localStorage.setItem("am_perf", "1");
      return true;
    }
    return window.localStorage.getItem("am_perf") === "1";
  } catch {
    return false;
  }
}
