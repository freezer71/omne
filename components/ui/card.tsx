import { forwardRef, type HTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

type CardProps = HTMLAttributes<HTMLDivElement> & {
  interactive?: boolean;
};

export const Card = forwardRef<HTMLDivElement, CardProps>(function Card(
  { className, interactive = false, ...rest },
  ref,
) {
  return (
    <div
      ref={ref}
      className={cn(
        'bg-surface border border-border rounded-lg',
        interactive && 'transition-colors duration-150 hover:bg-surface-hover hover:border-border-strong cursor-pointer',
        className,
      )}
      {...rest}
    />
  );
});
