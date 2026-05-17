import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeToggle } from '@/components/theme-toggle';

describe('ThemeToggle', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.dataset.theme = 'dark';
  });

  it('renders two buttons labeled Light and Dark', () => {
    render(<ThemeToggle labelLight="Light" labelDark="Dark" srLabel="Toggle theme" />);
    expect(screen.getByRole('button', { name: 'Light' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Dark' })).toBeInTheDocument();
  });

  it('marks the current theme as pressed via aria-pressed', () => {
    document.documentElement.dataset.theme = 'dark';
    render(<ThemeToggle labelLight="Light" labelDark="Dark" srLabel="Toggle theme" />);
    expect(screen.getByRole('button', { name: 'Dark' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Light' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('switches to light when the Light button is clicked', async () => {
    const user = userEvent.setup();
    render(<ThemeToggle labelLight="Light" labelDark="Dark" srLabel="Toggle theme" />);
    await user.click(screen.getByRole('button', { name: 'Light' }));
    expect(document.documentElement.dataset.theme).toBe('light');
    expect(localStorage.getItem('omne-theme')).toBe('light');
    expect(screen.getByRole('button', { name: 'Light' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Dark' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('switches back to dark when the Dark button is clicked', async () => {
    document.documentElement.dataset.theme = 'light';
    localStorage.setItem('omne-theme', 'light');
    const user = userEvent.setup();
    render(<ThemeToggle labelLight="Light" labelDark="Dark" srLabel="Toggle theme" />);
    await user.click(screen.getByRole('button', { name: 'Dark' }));
    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(localStorage.getItem('omne-theme')).toBe('dark');
  });

  it('reads the initial theme from document.documentElement.dataset.theme', () => {
    document.documentElement.dataset.theme = 'light';
    render(<ThemeToggle labelLight="Light" labelDark="Dark" srLabel="Toggle theme" />);
    expect(screen.getByRole('button', { name: 'Light' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('exposes the screen-reader group label', () => {
    render(<ThemeToggle labelLight="Light" labelDark="Dark" srLabel="Toggle theme" />);
    expect(screen.getByRole('group', { name: 'Toggle theme' })).toBeInTheDocument();
  });
});
