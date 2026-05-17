import { cn } from '@/lib/cn';

type ProgressProps = {
  value: number;
  max?: number;
  label?: string;
  className?: string;
  indeterminate?: boolean;
};

export function Progress({ value, max = 100, label, className, indeterminate = false }: ProgressProps) {
  const pct = indeterminate ? 100 : Math.min(100, Math.max(0, (value / max) * 100));
  return (
    <div className={cn('w-full', className)}>
      {label && (
        <div className="mb-2 flex justify-between text-xs text-text-muted">
          <span>{label}</span>
          {!indeterminate && <span className="font-mono">{Math.round(pct)}%</span>}
        </div>
      )}
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuenow={indeterminate ? undefined : value}
        aria-label={label}
        className="h-1 w-full overflow-hidden rounded-full bg-surface"
      >
        <div
          className={cn(
            'h-full rounded-full bg-accent transition-all duration-200',
            indeterminate && 'animate-pulse',
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
