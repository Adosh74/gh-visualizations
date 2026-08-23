interface Props {
  label: string;
  value: string | number;
  hint?: string;
}

export function StatTile({ label, value, hint }: Props) {
  return (
    <div className="stat">
      <p className="stat__label">{label}</p>
      <p className="stat__value">{value}</p>
      {hint ? <p className="stat__hint">{hint}</p> : null}
    </div>
  );
}
