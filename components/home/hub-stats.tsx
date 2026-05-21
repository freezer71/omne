type Stat = {
  value: string;
  label: string;
};

type Props = {
  stats: readonly Stat[];
};

export function HubStats({ stats }: Props) {
  return (
    <section className="grid grid-cols-3 gap-px overflow-hidden rounded-lg border border-border bg-border">
      {stats.map((s) => (
        <div key={s.label} className="flex flex-col gap-0.5 sm:gap-1 bg-surface px-3 py-4 sm:px-6 sm:py-6">
          <span className="text-xl sm:text-3xl font-medium tracking-tight text-text-primary">
            {s.value}
          </span>
          <span className="text-[11px] sm:text-sm text-text-muted leading-tight">{s.label}</span>
        </div>
      ))}
    </section>
  );
}
