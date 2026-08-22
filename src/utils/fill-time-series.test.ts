import { fillTimeSeries } from './fill-time-series';

const DAY_MS = 24 * 60 * 60 * 1000;

function utcDay(offset: number): string {
  return new Date(Date.now() + offset * DAY_MS).toISOString().slice(0, 10);
}

describe('fillTimeSeries', () => {
  it('returns one point per day in the window', () => {
    expect(fillTimeSeries([], 7)).toHaveLength(7);
  });

  it('ends on today and starts days-1 back', () => {
    const series = fillTimeSeries([], 3);

    expect(series.map(p => p.date)).toEqual([utcDay(-2), utcDay(-1), utcDay(0)]);
  });

  it('pads quiet days with explicit zeros', () => {
    const series = fillTimeSeries([{ date: utcDay(-1), count: 4 }], 3);

    expect(series.map(p => p.count)).toEqual([0, 4, 0]);
  });

  it('keeps the points in ascending date order', () => {
    const series = fillTimeSeries(
      [{ date: utcDay(0), count: 1 }, { date: utcDay(-2), count: 2 }],
      3,
    );

    expect(series.map(p => p.count)).toEqual([2, 0, 1]);
  });

  it('ignores points that fall outside the window', () => {
    const series = fillTimeSeries([{ date: utcDay(-40), count: 9 }], 3);

    expect(series.every(p => p.count === 0)).toBe(true);
  });
});
