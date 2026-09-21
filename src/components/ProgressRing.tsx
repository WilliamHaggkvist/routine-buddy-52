type Props = {
  done: number;
  total: number;
  size?: number;
  label?: string;
};

export function ProgressRing({ done, total, size = 176, label }: Props) {
  const pct = total === 0 ? 0 : Math.min(1, done / total);
  const stroke = 14;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const complete = total > 0 && done >= total;

  return (
    <div className="relative grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          className="stroke-secondary"
          strokeLinecap="round"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          className={complete ? "stroke-success" : "stroke-primary"}
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pct)}
          style={{ transition: "stroke-dashoffset 700ms cubic-bezier(0.22,1,0.36,1)" }}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="font-display text-4xl leading-none text-foreground">
          {done}
          <span className="text-2xl text-muted-foreground">/{total}</span>
        </span>
        <span className="mt-1 text-xs font-medium tracking-wide text-muted-foreground uppercase">
          {label ?? "klart idag"}
        </span>
      </div>
    </div>
  );
}
