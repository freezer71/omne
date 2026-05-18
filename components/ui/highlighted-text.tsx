import { Fragment } from 'react';
import type { Range } from '@/lib/tools/highlight';
import { cn } from '@/lib/cn';

type Props = {
  text: string;
  ranges?: readonly Range[];
  className?: string;
  markClassName?: string;
};

export function HighlightedText({ text, ranges, className, markClassName }: Props) {
  if (!ranges || ranges.length === 0) {
    return <span className={className}>{text}</span>;
  }
  const parts: React.ReactNode[] = [];
  let cursor = 0;
  for (let i = 0; i < ranges.length; i++) {
    const [start, end] = ranges[i];
    if (start > cursor) parts.push(<Fragment key={`p${i}`}>{text.slice(cursor, start)}</Fragment>);
    parts.push(
      <mark
        key={`m${i}`}
        className={cn(
          'bg-accent/15 text-text-primary rounded-sm px-px',
          markClassName,
        )}
      >
        {text.slice(start, end)}
      </mark>,
    );
    cursor = end;
  }
  if (cursor < text.length) parts.push(<Fragment key="tail">{text.slice(cursor)}</Fragment>);
  return <span className={className}>{parts}</span>;
}
