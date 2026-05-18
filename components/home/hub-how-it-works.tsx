type Step = {
  title: string;
  body: string;
};

type Props = {
  title: string;
  subtitle: string;
  steps: readonly Step[];
};

export function HubHowItWorks({ title, subtitle, steps }: Props) {
  return (
    <section className="flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-medium text-text-primary">{title}</h2>
        <p className="text-sm text-text-muted">{subtitle}</p>
      </div>
      <ol className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {steps.map((step, i) => (
          <li
            key={i}
            className="flex flex-col gap-2 rounded-lg border border-border bg-surface p-5"
          >
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-border font-mono text-xs text-text-muted">
              {i + 1}
            </span>
            <h3 className="text-base font-medium text-text-primary">{step.title}</h3>
            <p className="text-sm text-text-muted leading-relaxed">{step.body}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
