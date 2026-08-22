import type { TimeSeriesPoint } from '../types';

const DAY_MS = 24 * 60 * 60 * 1000;

function toUtcDateKey(timestamp: number): string {
  return new Date(timestamp).toISOString().slice(0, 10);
}

/**
 * Expands a sparse per-day aggregate into one point per day, with explicit
 * zeros for quiet days. A chart fed only the non-empty days would compress its
 * axis and imply activity that never happened.
 *
 * @param points Sparse per-day counts, as returned by the datastore.
 * @param days Length of the window, ending today (UTC), inclusive.
 */
export function fillTimeSeries(points: TimeSeriesPoint[], days: number): TimeSeriesPoint[] {
  const counts = new Map(points.map(point => [point.date, point.count]));
  const today = Date.parse(`${toUtcDateKey(Date.now())}T00:00:00Z`);

  return Array.from({ length: days }, (_, index) => {
    const date = toUtcDateKey(today - (days - 1 - index) * DAY_MS);
    return { date, count: counts.get(date) ?? 0 };
  });
}
