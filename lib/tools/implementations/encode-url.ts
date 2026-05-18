/**
 * URL encoder / decoder.
 *
 * Three flavors:
 *  - 'component' — `encodeURIComponent` / `decodeURIComponent`
 *      Encodes everything except: A-Z a-z 0-9 - _ . ! ~ * ' ( )
 *  - 'full'      — `encodeURI` / `decodeURI`
 *      Leaves reserved URI characters intact (`:/?#[]@!$&'()*+,;=`).
 *  - 'form'      — `application/x-www-form-urlencoded`
 *      Like component, but spaces -> '+' (and '+' -> ' ' on decode).
 */

export type UrlMode = 'encode' | 'decode';
export type UrlVariant = 'component' | 'full' | 'form';

export const URL_VARIANTS: readonly UrlVariant[] = ['component', 'full', 'form'] as const;

export function encodeUrl(input: string, variant: UrlVariant): string {
  if (!input) return '';
  switch (variant) {
    case 'component':
      return encodeURIComponent(input);
    case 'full':
      return encodeURI(input);
    case 'form':
      // URLSearchParams escapes per the form spec (`+` for spaces).
      // Wrapping in a single-key params object then stripping `k=` is the
      // canonical, dependency-free way.
      return new URLSearchParams({ v: input }).toString().slice(2);
    default: {
      const _exhaustive: never = variant;
      void _exhaustive;
      return input;
    }
  }
}

export function decodeUrl(input: string, variant: UrlVariant): string {
  if (!input) return '';
  try {
    switch (variant) {
      case 'component':
        return decodeURIComponent(input);
      case 'full':
        return decodeURI(input);
      case 'form': {
        // Replicate form-decoder: + -> space, then percent-decode.
        const swapped = input.replace(/\+/g, ' ');
        return decodeURIComponent(swapped);
      }
      default: {
        const _exhaustive: never = variant;
        void _exhaustive;
        return input;
      }
    }
  } catch {
    throw new Error('invalid percent-encoded input');
  }
}

export function transformUrl(input: string, mode: UrlMode, variant: UrlVariant): string {
  return mode === 'encode' ? encodeUrl(input, variant) : decodeUrl(input, variant);
}
