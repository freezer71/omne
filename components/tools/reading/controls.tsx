'use client';

import { useId } from 'react';
import { cn } from '@/lib/cn';
import { READING_TINTS, type ReadingTintKey } from '@/lib/tools/implementations/reading';

export function LabeledRange({
  label,
  value,
  min,
  max,
  step,
  onChange,
  format,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
  format?: (value: number) => string;
}) {
  const id = useId();
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between">
        <label htmlFor={id} className="text-xs text-text-muted">
          {label}
        </label>
        <span className="font-mono text-xs text-text-faint">{format ? format(value) : value}</span>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        aria-label={label}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-accent"
      />
    </div>
  );
}

export function OptionChips<T extends string>({
  legend,
  value,
  options,
  onChange,
}: {
  legend: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
}) {
  const name = useId();
  return (
    <fieldset className="flex flex-col gap-1.5">
      <legend className="text-xs text-text-muted">{legend}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => (
          <label
            key={opt.value}
            className={cn(
              'flex cursor-pointer items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs transition-colors',
              value === opt.value
                ? 'border-accent bg-surface-hover text-text-primary'
                : 'border-border bg-surface text-text-muted hover:border-border-strong',
            )}
          >
            <input
              type="radio"
              name={name}
              value={opt.value}
              checked={value === opt.value}
              onChange={() => onChange(opt.value)}
              className="sr-only"
            />
            {opt.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export function TintChips({
  legend,
  value,
  labels,
  onChange,
}: {
  legend: string;
  /** `null` when the current colours don't match any preset (custom colours). */
  value: ReadingTintKey | null;
  labels: Record<ReadingTintKey, string>;
  onChange: (value: ReadingTintKey) => void;
}) {
  return (
    <fieldset className="flex flex-col gap-1.5">
      <legend className="text-xs text-text-muted">{legend}</legend>
      <div className="flex flex-wrap gap-2">
        {(Object.keys(READING_TINTS) as ReadingTintKey[]).map((key) => {
          const tint = READING_TINTS[key];
          const selected = value === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => onChange(key)}
              title={labels[key]}
              aria-label={labels[key]}
              aria-pressed={selected}
              className={cn(
                'flex h-8 w-8 items-center justify-center rounded-md border-2 transition-colors',
                selected ? 'border-accent' : 'border-border hover:border-border-strong',
              )}
              style={{ background: tint.bg }}
            >
              <span className="text-[10px] font-bold" style={{ color: tint.fg }}>
                Aa
              </span>
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
