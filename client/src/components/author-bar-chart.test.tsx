import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { AuthorBarChart } from './author-bar-chart';

function renderChart(data: { author: string; count: number }[], maxRows?: number) {
  return render(
    <AuthorBarChart
      data={data}
      series="commits"
      unit="commit"
      emptyMessage="No commits synced yet."
      maxRows={maxRows}
    />,
  );
}

/*
 * The row-folding rule is unit-tested against `foldAuthors`; these cover what
 * the component itself decides — whether to draw a chart at all, and how many
 * bars it hands to recharts.
 */
describe('authorBarChart', () => {
  it('draws one bar per author', () => {
    const { container } = renderChart([{ author: 'Ada', count: 2 }, { author: 'Linus', count: 1 }]);

    expect(container.querySelectorAll('.recharts-bar-rectangle')).toHaveLength(2);
  });

  it('draws the folded Other row as its own bar', () => {
    const data = Array.from({ length: 5 }, (_, index) => ({
      author: `author-${index}`,
      count: 5 - index,
    }));

    const { container } = renderChart(data, 3);

    // three visible authors plus one "Other" bar
    expect(container.querySelectorAll('.recharts-bar-rectangle')).toHaveLength(4);
  });

  it('shows the empty message instead of an axis with no bars', () => {
    const { container } = renderChart([]);

    expect(screen.getByText('No commits synced yet.')).toBeInTheDocument();
    expect(container.querySelector('.recharts-wrapper')).toBeNull();
  });
});
