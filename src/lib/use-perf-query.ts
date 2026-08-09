import { useEffect, useRef } from "react";
import { useQuery, type UseQueryOptions, type QueryKey } from "@tanstack/react-query";
import { measureQuery, recordObservation } from "@/lib/perf";

/**
 * Drop-in replacement for `useQuery` that measures fetch duration (logging slow
 * queries) and records cache hit-rate for a named logical query.
 */
export function usePerfQuery<TData>(
  name: string,
  options: Omit<UseQueryOptions<TData, Error, TData, QueryKey>, "queryFn"> & {
    queryFn: () => Promise<TData>;
  },
) {
  const { queryFn, ...rest } = options;
  const result = useQuery<TData, Error, TData, QueryKey>({
    ...rest,
    queryFn: () => measureQuery(name, queryFn),
  });

  const keyId = JSON.stringify(rest.queryKey);
  const seen = useRef<string | null>(null);
  useEffect(() => {
    if (result.data === undefined) return;
    if (seen.current === keyId) return;
    seen.current = keyId;
    recordObservation(name);
  }, [keyId, name, result.data]);

  return result;
}
