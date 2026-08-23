import { describe, expect, it } from 'vitest';

import { relativeTime, shortDate, splitMessage } from './format';

describe('splitMessage', () => {
  it('treats the first line as the headline and the rest as the description', () => {
    expect(splitMessage('feat: a thing\n\nWhy the thing exists.')).toEqual({
      headline: 'feat: a thing',
      body: 'Why the thing exists.',
    });
  });

  it('leaves the body empty for a one-line message', () => {
    expect(splitMessage('chore: tidy up')).toEqual({ headline: 'chore: tidy up', body: '' });
  });
});

describe('relativeTime', () => {
  const now = Date.parse('2026-08-22T12:00:00Z');

  it('describes a moment hours back', () => {
    expect(relativeTime(now - 3 * 60 * 60 * 1000, now)).toContain('3 hours ago');
  });

  it('describes a moment days back', () => {
    expect(relativeTime(now - 2 * 24 * 60 * 60 * 1000, now)).toContain('2 days ago');
  });

  it('falls through to seconds for a very recent moment', () => {
    expect(relativeTime(now - 5000, now)).toContain('5 seconds ago');
  });
});

describe('shortDate', () => {
  it('reduces an ISO date to month/day for a dense axis', () => {
    expect(shortDate('2026-08-22')).toBe('08/22');
  });
});
