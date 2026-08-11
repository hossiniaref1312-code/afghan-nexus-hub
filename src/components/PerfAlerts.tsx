import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  ALERT_CRITICAL_MS,
  ALERT_SLOW_STREAK,
  SLOW_QUERY_MS,
  arePerfAlertsEnabled,
  subscribePerfAlerts,
} from "@/lib/perf";

/**
 * Surfaces automatic alerts when instrumented queries (e.g. /shop and
 * /shop/:slug) breach the slow-query thresholds. Console alerts always fire;
 * this adds a visible toast for whoever is watching the app.
 */
export function PerfAlerts() {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => setEnabled(arePerfAlertsEnabled()), []);

  useEffect(() => {
    if (!enabled) return;
    return subscribePerfAlerts((alert) => {
      const detail =
        alert.reason === "critical"
          ? `${alert.ms}ms (over ${ALERT_CRITICAL_MS}ms critical threshold)`
          : `${ALERT_SLOW_STREAK} fetches in a row over ${SLOW_QUERY_MS}ms — last ${alert.ms}ms`;
      const body = `${detail} · p95 ${alert.p95Ms}ms · ${alert.slowCount} slow total`;
      if (alert.severity === "critical") {
        toast.error(`Slow query: ${alert.name}`, { description: body, duration: 8000 });
      } else {
        toast.warning(`Slow query: ${alert.name}`, { description: body, duration: 6000 });
      }
    });
  }, [enabled]);

  return null;
}
