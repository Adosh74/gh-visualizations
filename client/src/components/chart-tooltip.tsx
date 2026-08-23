interface Props {
  active?: boolean;
  payload?: { value?: number | string; payload?: Record<string, unknown> }[];
  label?: string | number;
  /** Renders the heading; defaults to the category label itself. */
  formatLabel?: (label: string) => string;
  unit: string;
}

/** Text stays in ink tokens — the mark beside it already carries the identity. */
export function ChartTooltip({ active, payload, label, formatLabel, unit }: Props) {
  if (!active || !payload?.length)
    return null;

  const value = Number(payload[0].value ?? 0);
  const heading = formatLabel ? formatLabel(String(label)) : String(label);

  return (
    <div className="tooltip">
      <p className="tooltip__label">{heading}</p>
      <p className="tooltip__value">
        {value}
        {' '}
        {value === 1 ? unit : `${unit}s`}
      </p>
    </div>
  );
}
