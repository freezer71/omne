import Link from 'next/link';
import { Logo } from '@/components/logo';
import type { Locale } from '@/lib/i18n/config';

const KOUMA_URL = 'https://koumalabs.org';

/** Same scale as the BrandLockup published in the Kouma Labs brand kit. */
const SIZES = {
  sm: 'size-5',
  md: 'size-6',
  lg: 'size-8',
  xl: 'size-10',
  '2xl': 'size-12',
} as const;

type Props = {
  locale: Locale;
  koumaLabel: string;
  siteName: string;
  size?: keyof typeof SIZES;
  /**
   * Drop the Kouma tile and the slash below `md`, keeping the omne logo alone.
   * The header has no room for them before that: it overflows at 360px, and it
   * already overflows on its own between `sm` and ~700px, where the Privacy and
   * GitHub links appear. The footer carries the co-branding at every width.
   */
  compact?: boolean;
};

/**
 * Co-branded lockup: Kouma Labs app-icon, a muted slash, then the omne logo —
 * the pattern published at koumalabs.org/brands to mark a product as belonging
 * to the studio. The tile is a background image swapped by [data-theme]; see
 * `.kouma-tile` in app/globals.css.
 */
export function BrandLockup({
  locale,
  koumaLabel,
  siteName,
  size = 'xl',
  compact = false,
}: Props) {
  return (
    <span className="inline-flex w-fit items-center gap-2">
      <a
        href={KOUMA_URL}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={koumaLabel}
        className={`${compact ? 'hidden md:inline-flex' : 'inline-flex'} transition-opacity hover:opacity-70`}
      >
        <span
          aria-hidden
          className={`kouma-tile block shrink-0 rounded-[22%] ${SIZES[size]}`}
        />
      </a>
      <span
        aria-hidden
        className={`${compact ? 'hidden md:inline' : ''} select-none text-lg font-extralight text-text-faint`}
      >
        /
      </span>
      <Link
        href={`/${locale}`}
        aria-label={siteName}
        className="transition-opacity hover:opacity-70"
      >
        <Logo />
      </Link>
    </span>
  );
}
