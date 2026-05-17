import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HubToolFinder } from '@/components/hub-tool-finder';
import type { SearchableTool } from '@/lib/tools/search';
import { TOOL_CATEGORIES } from '@/lib/tools/types';

vi.mock('next/link', () => ({
  default: ({ children, href, ...rest }: { children: React.ReactNode; href: string }) => (
    <a href={href} {...rest}>{children}</a>
  ),
}));

const tools: SearchableTool[] = [
  {
    id: 'merge',
    category: 'pdf',
    href: '/pdf/merge',
    name: 'Merge PDFs',
    description: 'Combine multiple PDFs into one.',
    keywords: ['merge', 'fusion'],
    status: 'stable',
  },
  {
    id: 'resize',
    category: 'image',
    href: '/image/resize',
    name: 'Resize image',
    description: 'Change image dimensions.',
    keywords: ['resize', 'redimensionner'],
    status: 'stable',
  },
  {
    id: 'trim',
    category: 'video',
    href: '/video/trim',
    name: 'Trim video',
    description: 'Cut a clip out of a video.',
    keywords: ['trim', 'découper'],
    status: 'stable',
  },
];

const categoryLabels = {
  pdf: 'PDF tools',
  video: 'Video tools',
  image: 'Image tools',
  password: 'Password tools',
  json: 'JSON tools',
  text: 'Text tools',
  utility: 'Utilities',
} as const;

function renderFinder() {
  render(
    <HubToolFinder
      locale="en"
      tools={tools}
      categoryOrder={TOOL_CATEGORIES}
      categoryLabels={categoryLabels}
      comingSoonLabel="Coming soon"
      placeholder="Search tools…"
      emptyLabel="No tool matches your search."
    />,
  );
}

describe('HubToolFinder', () => {
  it('renders all tools grouped by category when the query is empty', () => {
    renderFinder();
    expect(screen.getByText('PDF tools')).toBeInTheDocument();
    expect(screen.getByText('Image tools')).toBeInTheDocument();
    expect(screen.getByText('Video tools')).toBeInTheDocument();
    expect(screen.getByText('Merge PDFs')).toBeInTheDocument();
    expect(screen.getByText('Resize image')).toBeInTheDocument();
    expect(screen.getByText('Trim video')).toBeInTheDocument();
  });

  it('filters tools as the user types', async () => {
    const user = userEvent.setup();
    renderFinder();
    const input = screen.getByPlaceholderText('Search tools…');
    await user.type(input, 'merge');
    expect(screen.getByText('Merge PDFs')).toBeInTheDocument();
    expect(screen.queryByText('Resize image')).not.toBeInTheDocument();
    expect(screen.queryByText('Trim video')).not.toBeInTheDocument();
  });

  it('matches accents-insensitively via French keywords', async () => {
    const user = userEvent.setup();
    renderFinder();
    const input = screen.getByPlaceholderText('Search tools…');
    await user.type(input, 'decouper');
    expect(screen.getByText('Trim video')).toBeInTheDocument();
    expect(screen.queryByText('Merge PDFs')).not.toBeInTheDocument();
  });

  it('shows the empty label when no tool matches', async () => {
    const user = userEvent.setup();
    renderFinder();
    const input = screen.getByPlaceholderText('Search tools…');
    await user.type(input, 'totallyabsentterm');
    expect(screen.getByText('No tool matches your search.')).toBeInTheDocument();
    expect(screen.queryByText('Merge PDFs')).not.toBeInTheDocument();
  });

  it('links each result to /<locale>/<href>', () => {
    renderFinder();
    expect(screen.getByRole('link', { name: /merge pdfs/i })).toHaveAttribute('href', '/en/pdf/merge');
  });
});
