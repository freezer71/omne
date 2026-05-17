import { cn } from '@/lib/cn';

type Validity = 'valid' | 'invalid';

type Props = {
  validity: Validity | null;
  validLabel: string;
  invalidLabel: string;
  className?: string;
};

export function ValidityBadge({ validity, validLabel, invalidLabel, className }: Props) {
  if (!validity) return null;
  const isValid = validity === 'valid';
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs',
        isValid
          ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
          : 'border-danger/30 bg-danger/10 text-danger',
        className,
      )}
    >
      <span className="size-1.5 rounded-full bg-current" aria-hidden />
      {isValid ? validLabel : invalidLabel}
    </span>
  );
}
