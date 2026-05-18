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
        <div key={s.label} className="flex flex-col gap-1 bg-surface px-4 py-5 sm:px-6 sm:py-6">
          <span className="text-2xl sm:text-3xl font-medium tracking-tight text-text-primary">
            {s.value}
          </span>
          <span className="text-xs sm:text-sm text-text-muted">{s.label}</span>
        </div>
      ))}
    </section>
  );
}
