import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { CommitsPerDayChart } from './commits-per-day-chart';

describe('commitsPerDayChart', () => {
  it('plots the days that had commits', () => {
    const { container } = render(
      <CommitsPerDayChart
        days={3}
        data={[
          { date: '2026-08-20', count: 0 },
          { date: '2026-08-21', count: 2 },
          { date: '2026-08-22', count: 1 },
        ]}
      />,
    );

    // A zero-count day contributes no visible bar, but still holds its slot on
    // the axis — which is why the API pads the series rather than dropping days.
    expect(container.querySelectorAll('.recharts-bar-rectangle')).toHaveLength(2);
  });

  it('renders month/day axis ticks rather than raw ISO dates', () => {
    const { container } = render(
      <CommitsPerDayChart
        days={3}
        data={[
          { date: '2026-08-20', count: 1 },
          { date: '2026-08-21', count: 2 },
          { date: '2026-08-22', count: 1 },
        ]}
      />,
    );

    const labels = [...container.querySelectorAll('text')].map(node => node.textContent);

    expect(labels).toContain('08/22');
    expect(labels).not.toContain('2026-08-22');
  });

  it('says so plainly when the whole window is empty', () => {
    const { container } = render(
      <CommitsPerDayChart days={7} data={[{ date: '2026-08-22', count: 0 }]} />,
    );

    expect(screen.getByText(/no commits in the last/i)).toBeInTheDocument();
    expect(container.querySelector('.recharts-wrapper')).toBeNull();
  });
});
