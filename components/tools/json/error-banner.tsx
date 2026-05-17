import type { ParseResult } from '@/lib/json/types';
import { tpl } from '@/lib/tpl';

type Props = {
  parseResult: ParseResult | null;
  errorTemplate: string;
  className?: string;
};

export function ErrorBanner({ parseResult, errorTemplate, className }: Props) {
  if (!parseResult || parseResult.ok) return null;
  return (
    <span className={className ?? 'font-mono text-xs text-danger'} role="alert">
      {tpl(errorTemplate, {
        line: parseResult.line,
        col: parseResult.col,
        message: parseResult.message,
      })}
    </span>
  );
}
