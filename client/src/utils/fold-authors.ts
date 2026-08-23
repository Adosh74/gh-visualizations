import type { AuthorStat } from '../types';

/**
 * Caps an author breakdown at `maxRows` visible rows, folding the remainder
 * into a single labelled "Other" row. A silently truncated top-N reads as
 * "these are all the authors", which is a different and wrong claim.
 */
export function foldAuthors(data: AuthorStat[], maxRows: number): AuthorStat[] {
  if (data.length <= maxRows)
    return data;

  const head = data.slice(0, maxRows);
  const tail = data.slice(maxRows);

  return [...head, {
    author: `Other (${tail.length} ${tail.length === 1 ? 'author' : 'authors'})`,
    count: tail.reduce((sum, entry) => sum + entry.count, 0),
  }];
}
