import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrandLockup } from '@/components/brand-lockup';

const props = {
  locale: 'en' as const,
  koumaLabel: 'Kouma Labs — the studio behind omne',
  siteName: 'omne',
};

describe('BrandLockup', () => {
  it('links the Kouma tile to koumalabs.org in a new, isolated tab', () => {
    render(<BrandLockup {...props} />);
    const link = screen.getByRole('link', { name: props.koumaLabel });
    expect(link).toHaveAttribute('href', 'https://koumalabs.org');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link.getAttribute('rel')).toContain('noopener');
  });

  it('links the omne wordmark to the localized home', () => {
    render(<BrandLockup {...props} locale="fr" />);
    expect(screen.getByRole('link', { name: 'omne' })).toHaveAttribute('href', '/fr');
    expect(screen.getByText('omne')).toBeInTheDocument();
  });

  it('hides the tile and the separator from assistive tech', () => {
    const { container } = render(<BrandLockup {...props} />);
    const tile = container.querySelector('.kouma-tile');
    expect(tile).toHaveAttribute('aria-hidden');
    // The slash is decorative: the lockup already reads "Kouma Labs … / omne".
    const separator = screen.getByText('/');
    expect(separator).toHaveAttribute('aria-hidden');
  });

  it('keeps the tile and the slash out of the way until md when compact', () => {
    const { container } = render(<BrandLockup {...props} compact />);
    expect(container.querySelector('.kouma-tile')?.parentElement).toHaveClass(
      'hidden',
      'md:inline-flex',
    );
    expect(screen.getByText('/')).toHaveClass('hidden', 'md:inline');
    // The omne logo stays visible at every width.
    expect(screen.getByRole('link', { name: 'omne' })).not.toHaveClass('hidden');
  });

  it('sizes the tile on the brand-kit scale, xl by default', () => {
    const { container: def } = render(<BrandLockup {...props} />);
    expect(def.querySelector('.kouma-tile')).toHaveClass('size-10');

    const { container: sm } = render(<BrandLockup {...props} size="sm" />);
    expect(sm.querySelector('.kouma-tile')).toHaveClass('size-5');

    const { container: xxl } = render(<BrandLockup {...props} size="2xl" />);
    expect(xxl.querySelector('.kouma-tile')).toHaveClass('size-12');
  });
});
