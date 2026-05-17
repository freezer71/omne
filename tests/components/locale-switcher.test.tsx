import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const push = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
  usePathname: () => mockPathname,
}));

let mockPathname = '/en';

import { LocaleSwitcher } from '@/components/locale-switcher';

describe('LocaleSwitcher', () => {
  beforeEach(() => {
    push.mockClear();
    mockPathname = '/en';
  });

  it('renders one button per supported locale', () => {
    render(<LocaleSwitcher currentLocale="en" labelEn="English" labelFr="Français" srLabel="Language" />);
    expect(screen.getByRole('button', { name: 'English' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Français' })).toBeInTheDocument();
  });

  it('marks the current locale as pressed', () => {
    render(<LocaleSwitcher currentLocale="en" labelEn="English" labelFr="Français" srLabel="Language" />);
    expect(screen.getByRole('button', { name: 'English' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Français' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('navigates to the same path under the new locale on click', async () => {
    mockPathname = '/en/pdf/merge';
    const user = userEvent.setup();
    render(<LocaleSwitcher currentLocale="en" labelEn="English" labelFr="Français" srLabel="Language" />);
    await user.click(screen.getByRole('button', { name: 'Français' }));
    expect(push).toHaveBeenCalledWith('/fr/pdf/merge');
  });

  it('handles the bare locale path (e.g. /en → /fr)', async () => {
    mockPathname = '/en';
    const user = userEvent.setup();
    render(<LocaleSwitcher currentLocale="en" labelEn="English" labelFr="Français" srLabel="Language" />);
    await user.click(screen.getByRole('button', { name: 'Français' }));
    expect(push).toHaveBeenCalledWith('/fr');
  });

  it('does nothing when clicking the active locale', async () => {
    const user = userEvent.setup();
    render(<LocaleSwitcher currentLocale="en" labelEn="English" labelFr="Français" srLabel="Language" />);
    await user.click(screen.getByRole('button', { name: 'English' }));
    expect(push).not.toHaveBeenCalled();
  });

  it('exposes the group label for screen readers', () => {
    render(<LocaleSwitcher currentLocale="en" labelEn="English" labelFr="Français" srLabel="Language" />);
    expect(screen.getByRole('group', { name: 'Language' })).toBeInTheDocument();
  });
});
