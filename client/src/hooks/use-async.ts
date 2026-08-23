import { useCallback, useEffect, useState } from 'react';

export interface AsyncState<T> {
  data: T | undefined;
  error: string | undefined;
  loading: boolean;
  reload: () => void;
}

/**
 * Runs an async loader whenever its dependencies change, keeping the last
 * successful data on screen while a reload is in flight so the dashboard does
 * not flash empty on every refresh.
 */
export function useAsync<T>(loader: () => Promise<T>, deps: unknown[]): AsyncState<T> {
  const [data, setData] = useState<T>();
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(true);
  const [nonce, setNonce] = useState(0);

  // The loader is rebuilt on every render by callers; `deps` is the real key.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const run = useCallback(loader, deps);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    run()
      .then((result) => {
        if (cancelled)
          return;
        setData(result);
        setError(undefined);
      })
      .catch((err: Error) => {
        if (!cancelled)
          setError(err.message);
      })
      .finally(() => {
        if (!cancelled)
          setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [run, nonce]);

  const reload = useCallback(() => setNonce(value => value + 1), []);

  return { data, error, loading, reload };
}
