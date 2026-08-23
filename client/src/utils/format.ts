const RELATIVE = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });

const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ['year', 365 * 24 * 60 * 60 * 1000],
  ['month', 30 * 24 * 60 * 60 * 1000],
  ['day', 24 * 60 * 60 * 1000],
  ['hour', 60 * 60 * 1000],
  ['minute', 60 * 1000],
];

/** "3 days ago" — the feed cares about recency, not exact timestamps. */
export function relativeTime(timestamp: number, now: number = Date.now()): string {
  const elapsed = timestamp - now;

  for (const [unit, size] of UNITS) {
    if (Math.abs(elapsed) >= size)
      return RELATIVE.format(Math.round(elapsed / size), unit);
  }

  return RELATIVE.format(Math.round(elapsed / 1000), 'second');
}

export function shortDate(isoDate: string): string {
  const [, month, day] = isoDate.split('-');
  return `${month}/${day}`;
}

/** A commit message's first line is its headline; the rest is the description. */
export function splitMessage(message: string): { headline: string; body: string } {
  const [headline, ...rest] = message.split('\n');
  return { headline, body: rest.join('\n').trim() };
}
