'use client';

import { useCallback, useState } from 'react';
import { Button } from '@/components/ui/button';

type Props = {
  text: string;
  copyLabel: string;
  copiedLabel: string;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'primary' | 'subtle' | 'ghost';
};

export function CopyButton({
  text,
  copyLabel,
  copiedLabel,
  disabled,
  size = 'sm',
  variant = 'subtle',
}: Props) {
  const [copied, setCopied] = useState(false);

  const onClick = useCallback(() => {
    if (!text) return;
    void navigator.clipboard.writeText(text);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1200);
  }, [text]);

  return (
    <Button
      onClick={onClick}
      disabled={disabled || !text}
      size={size}
      variant={variant}
      type="button"
    >
      {copied ? copiedLabel : copyLabel}
    </Button>
  );
}
