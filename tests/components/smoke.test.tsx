import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';

describe('smoke: vitest component runner (jsdom env)', () => {
  it('runs in jsdom environment (window exists)', () => {
    expect(typeof window).toBe('object');
    expect(typeof document).toBe('object');
  });

  it('renders a React element via testing-library', () => {
    render(<h1>omne</h1>);
    expect(screen.getByRole('heading', { name: 'omne' })).toBeInTheDocument();
  });

  it('resolves the @/ alias', async () => {
    const mod = await import('@/tests/components/smoke-helper');
    expect(mod.SMOKE_VALUE).toBe('alias-works');
  });
});
