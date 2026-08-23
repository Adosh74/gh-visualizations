import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import type { TimeSeriesPoint } from '../types';

import { shortDate } from '../utils/format';
import { ChartTooltip } from './chart-tooltip';

interface Props {
  data: TimeSeriesPoint[];
  days: number;
}

const AXIS = { fill: 'var(--text-muted)', fontSize: 11 };

/**
 * One series, so no legend — the panel title names it. The series is dense
 * (the API pads quiet days with zeros), so the axis reflects real elapsed time
 * rather than compressing gaps.
 */
export function CommitsPerDayChart({ data, days }: Props) {
  const total = data.reduce((sum, point) => sum + point.count, 0);

  if (total === 0) {
    return (
      <p className="empty">
        No commits in the last
        {' '}
        {days}
        {' '}
        days.
      </p>
    );
  }

  return (
    <div className="chart__surface">
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
          <CartesianGrid stroke="var(--gridline)" vertical={false} />
          <XAxis
            dataKey="date"
            tickFormatter={shortDate}
            tick={AXIS}
            tickLine={false}
            axisLine={{ stroke: 'var(--baseline)' }}
            minTickGap={16}
          />
          <YAxis
            allowDecimals={false}
            tick={AXIS}
            tickLine={false}
            axisLine={false}
            width={40}
          />
          <Tooltip
            cursor={{ fill: 'var(--gridline)', fillOpacity: 0.5 }}
            content={<ChartTooltip unit="commit" />}
          />
          <Bar
            isAnimationActive={false}
            dataKey="count"
            fill="var(--series-commits)"
            radius={[4, 4, 0, 0]}
            maxBarSize={26}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
