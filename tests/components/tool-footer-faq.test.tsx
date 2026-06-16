import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ToolFooterSeo } from '@/components/tool-footer-seo';

describe('ToolFooterSeo — visible FAQ', () => {
  it('renders the FAQ questions and answers for a tool that has them', async () => {
    render(await ToolFooterSeo({ category: 'password', id: 'hash', locale: 'en' }));
    expect(screen.getByText('Frequently asked questions')).toBeInTheDocument();
    expect(
      screen.getByText(/Can I reverse a hash back to the original text\?/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/Cryptographic hashes are one-way/i)).toBeInTheDocument();
  });

  it('localizes the FAQ to French', async () => {
    render(await ToolFooterSeo({ category: 'password', id: 'hash', locale: 'fr' }));
    expect(screen.getByText('Questions fréquentes')).toBeInTheDocument();
  });

  it('omits the FAQ section for a tool without FAQ content', async () => {
    render(await ToolFooterSeo({ category: 'pdf', id: 'merge', locale: 'en' }));
    expect(screen.queryByText('Frequently asked questions')).not.toBeInTheDocument();
  });
});
