type Props = {
  className?: string;
  size?: number;
};

export function LogoMark({ className, size = 18 }: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
      className={className}
    >
      <circle
        cx="12"
        cy="12"
        r="9"
        stroke="currentColor"
        strokeWidth="3"
      />
    </svg>
  );
}

export function Logo({
  className,
  markSize = 18,
}: {
  className?: string;
  /**
   * The mark's SVG box. Callers that sit the logo beside another brand's mark
   * pass a size that balances the pair — see components/brand-lockup.tsx.
   */
  markSize?: number;
}) {
  return (
    <span className={`inline-flex items-center gap-2 ${className ?? ''}`}>
      <LogoMark className="text-text-primary" size={markSize} />
      <span className="text-sm font-semibold tracking-tight text-text-primary">
        omne
      </span>
    </span>
  );
}
