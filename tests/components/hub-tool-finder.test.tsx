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
  audio: 'Audio tools',
  image: 'Image tools',
  svg: 'SVG tools',
  password: 'Password tools',
  json: 'JSON tools',
  text: 'Text tools',
  encode: 'Encoding tools',
  qr: 'QR & barcodes',
  color: 'Color tools',
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
    expect(
      screen.getAllByText((_, el) => el?.textContent === 'Merge PDFs').length,
    ).toBeGreaterThan(0);
    expect(screen.queryByText('Resize image')).not.toBeInTheDocument();
    expect(screen.queryByText('Trim video')).not.toBeInTheDocument();
  });

  it('highlights the matched portion of the tool name', async () => {
    const user = userEvent.setup();
    renderFinder();
    await user.type(screen.getByPlaceholderText('Search tools…'), 'merge');
    const marks = document.querySelectorAll('mark');
    expect(marks.length).toBeGreaterThan(0);
    const hasMerge = Array.from(marks).some(
      (m) => m.textContent?.toLowerCase() === 'merge',
    );
    expect(hasMerge).toBe(true);
  });

  it('exposes a stable anchor for each rendered category section', () => {
    renderFinder();
    expect(document.querySelector('#cat-pdf')).not.toBeNull();
    expect(document.querySelector('#cat-image')).not.toBeNull();
    expect(document.querySelector('#cat-video')).not.toBeNull();
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
