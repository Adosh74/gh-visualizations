import { describe, expect, it } from 'vitest';

import { foldAuthors } from './fold-authors';

const data = [
  { author: 'Ada', count: 5 },
  { author: 'Linus', count: 4 },
  { author: 'Grace', count: 3 },
  { author: 'Alan', count: 2 },
  { author: 'Barbara', count: 1 },
];

describe('foldAuthors', () => {
  it('leaves a short list untouched', () => {
    expect(foldAuthors(data, 8)).toEqual(data);
  });

  it('leaves a list exactly at the cap untouched', () => {
    expect(foldAuthors(data, 5)).toHaveLength(5);
    expect(foldAuthors(data, 5).some(row => row.author.startsWith('Other'))).toBe(false);
  });

  it('folds the tail into one labelled row', () => {
    const rows = foldAuthors(data, 3);

    expect(rows).toHaveLength(4);
    expect(rows.at(-1)).toEqual({ author: 'Other (2 authors)', count: 3 });
  });

  it('singularises a tail of one', () => {
    expect(foldAuthors(data, 4).at(-1)).toEqual({ author: 'Other (1 author)', count: 1 });
  });

  it('keeps the visible rows in their original order', () => {
    expect(foldAuthors(data, 2).map(row => row.author)).toEqual(['Ada', 'Linus', 'Other (3 authors)']);
  });

  it('preserves the grand total, so nothing is lost in the fold', () => {
    const total = data.reduce((sum, row) => sum + row.count, 0);
    const folded = foldAuthors(data, 2).reduce((sum, row) => sum + row.count, 0);

    expect(folded).toBe(total);
  });

  it('handles an empty list', () => {
    expect(foldAuthors([], 8)).toEqual([]);
  });
});
