import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ToolCard } from '@/components/tool-card';
import type { ToolMeta } from '@/lib/tools/types';

vi.mock('next/link', () => ({
  default: ({ children, href, ...rest }: { children: React.ReactNode; href: string }) => (
    <a href={href} {...rest}>{children}</a>
  ),
}));

const baseTool: ToolMeta = {
  id: 'merge',
  category: 'pdf',
  href: '/pdf/merge',
  i18nKey: 'tools.pdf.merge',
  keywords: ['merge'],
  acceptedMime: ['application/pdf'],
  status: 'stable',
};

describe('ToolCard', () => {
  it('renders the tool name and description', () => {
    render(
      <ToolCard
        tool={baseTool}
        locale="en"
        name="Merge PDFs"
        description="Combine multiple PDFs into one."
        comingSoonLabel="Coming soon"
      />,
    );
    expect(screen.getByText('Merge PDFs')).toBeInTheDocument();
    expect(screen.getByText('Combine multiple PDFs into one.')).toBeInTheDocument();
  });

  it('renders a link to /<locale>/<href> when status is stable', () => {
    render(
      <ToolCard
        tool={baseTool}
        locale="en"
        name="Merge PDFs"
        description="X"
        comingSoonLabel="Coming soon"
      />,
    );
    expect(screen.getByRole('link')).toHaveAttribute('href', '/en/pdf/merge');
  });

  it('renders the French URL when locale is fr', () => {
    render(
      <ToolCard
        tool={baseTool}
        locale="fr"
        name="Fusionner"
        description="X"
        comingSoonLabel="Bientôt"
      />,
    );
    expect(screen.getByRole('link')).toHaveAttribute('href', '/fr/pdf/merge');
  });

  it('renders without a link when status is "soon" and shows the coming-soon label', () => {
    const soon: ToolMeta = { ...baseTool, id: 'ocr', status: 'soon' };
    render(
      <ToolCard
        tool={soon}
        locale="en"
        name="OCR"
        description="X"
        comingSoonLabel="Coming soon"
      />,
    );
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    expect(screen.getByText('Coming soon')).toBeInTheDocument();
  });

  it('marks "soon" tools with aria-disabled', () => {
    const soon: ToolMeta = { ...baseTool, id: 'ocr', status: 'soon' };
    render(
      <ToolCard
        tool={soon}
        locale="en"
        name="OCR"
        description="X"
        comingSoonLabel="Coming soon"
      />,
    );
    const card = screen.getByText('OCR').closest('[aria-disabled]');
    expect(card).toHaveAttribute('aria-disabled', 'true');
  });
});
