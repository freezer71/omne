import Link from 'next/link';
import { Logo } from '@/components/logo';
import type { Locale } from '@/lib/i18n/config';

const KOUMA_URL = 'https://koumalabs.org';

/**
 * Tile sizes are the scale published in the Kouma Labs brand kit; `mark` is the
 * omne logo's SVG box, derived from each of them rather than chosen.
 *
 * The omne circle is r=9 with a 3-wide stroke in a 24 viewBox, so its drawn ring
 * is only 0.875 of its box. Pairing the tile with a fixed 18px box put a 40px
 * tile beside a 15.75px hairline ring — two and a half times the size.
 *
 * The ring is now ~0.9 of its tile. That ratio is about contrast, not geometry:
 * the Kouma mark is a halftone of small dots, so it reads as a soft mid-grey
 * mass, while the omne ring is a solid high-contrast stroke. Matched pixel for
 * pixel the ring wins; the tile has to be the larger of the two to hold its
 * side. That texture also sets a floor — below roughly 24px the dots collapse
 * into a smudge and the K stops being a K, which is why the header takes `md`
 * rather than something smaller.
 */
const SIZES = {
  sm: { tile: 'size-5', mark: 21 }, // 20px tile · 18.4px ring
  md: { tile: 'size-6', mark: 25 }, // 24px tile · 21.9px ring
  lg: { tile: 'size-8', mark: 33 }, // 32px tile · 28.9px ring
  xl: { tile: 'size-10', mark: 41 }, // 40px tile · 35.9px ring
  '2xl': { tile: 'size-12', mark: 49 }, // 48px tile · 42.9px ring
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
  size = 'md',
  compact = false,
}: Props) {
  const { tile, mark } = SIZES[size];
  return (
    <span className="inline-flex w-fit items-center gap-2">
      <a
        href={KOUMA_URL}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={koumaLabel}
        className={`${compact ? 'hidden md:inline-flex' : 'inline-flex'} transition-opacity hover:opacity-70`}
      >
        <span aria-hidden className={`kouma-tile block shrink-0 rounded-[22%] ${tile}`} />
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
        <Logo markSize={mark} />
      </Link>
    </span>
  );
}
