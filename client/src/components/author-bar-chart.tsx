import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import type { AuthorStat } from '../types';

import { foldAuthors } from '../utils/fold-authors';
import { ChartTooltip } from './chart-tooltip';

interface Props {
  data: AuthorStat[];
  /** Which of the two validated series hues to paint the bars. */
  series: 'commits' | 'pulls';
  unit: string;
  emptyMessage: string;
  maxRows?: number;
}

const AXIS = { fill: 'var(--text-muted)', fontSize: 11 };

/**
 * Magnitude by identity, so a horizontal bar in a single hue — a categorical
 * palette here would imply the colors mean something. Values are labelled
 * directly at the bar ends.
 */
export function AuthorBarChart({ data, series, unit, emptyMessage, maxRows = 8 }: Props) {
  if (data.length === 0)
    return <p className="empty">{emptyMessage}</p>;

  // Never truncate silently: the tail is folded into a visible "Other" row.
  const rows = foldAuthors(data, maxRows);

  return (
    <div className="chart__surface">
      <ResponsiveContainer width="100%" height={Math.max(140, rows.length * 34 + 30)}>
        <BarChart
          data={rows}
          layout="vertical"
          margin={{ top: 4, right: 32, bottom: 4, left: 4 }}
        >
          <CartesianGrid stroke="var(--gridline)" horizontal={false} />
          <XAxis type="number" allowDecimals={false} tick={AXIS} tickLine={false} axisLine={false} />
          <YAxis
            type="category"
            dataKey="author"
            tick={AXIS}
            tickLine={false}
            axisLine={{ stroke: 'var(--baseline)' }}
            width={120}
          />
          <Tooltip
            cursor={{ fill: 'var(--gridline)', fillOpacity: 0.5 }}
            content={<ChartTooltip unit={unit} />}
          />
          <Bar
            isAnimationActive={false}
            dataKey="count"
            fill={`var(--series-${series})`}
            radius={[0, 4, 4, 0]}
            maxBarSize={20}
          >
            <LabelList
              dataKey="count"
              position="right"
              fill="var(--text-secondary)"
              fontSize={11}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
