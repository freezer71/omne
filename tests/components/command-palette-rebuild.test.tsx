import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CommandPalette, type PaletteMessages } from '@/components/command-palette/command-palette';
import { PaletteProvider, usePalette } from '@/components/command-palette/palette-context';
import type { SearchableTool } from '@/lib/tools/search';
import type { ToolCategory } from '@/lib/tools/types';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
  usePathname: () => '/en',
}));

const messages: PaletteMessages = {
  placeholder: 'Search tools',
  empty: 'No match',
  recent: 'Recent',
  results: 'Results',
  badgeBeta: 'Beta',
  badgeSoon: 'Soon',
  hintNavigate: 'Navigate',
  hintSelect: 'Select',
  hintClose: 'Close',
  quickActions: {
    heading: 'Quick actions',
    toggleTheme: 'Toggle theme',
    changeLanguage: 'Change language',
    openPrivacy: 'Open privacy',
    browseAll: 'Browse all tools',
  },
};

const tools: SearchableTool[] = [
  {
    id: 'merge', category: 'pdf', href: '/pdf/merge',
    name: 'Merge PDFs', description: 'Combine multiple PDFs.',
    keywords: ['merge', 'combine', 'pdf'], status: 'stable', acceptedMime: ['application/pdf'],
  },
  {
    id: 'resize', category: 'image', href: '/image/resize',
    name: 'Resize image', description: 'Scale an image.',
    keywords: ['resize', 'image'], status: 'stable', acceptedMime: ['image/png'],
  },
  {
    id: 'remove-bg', category: 'image', href: '/image/remove-bg',
    name: 'Remove background', description: 'Detect and remove background.',
    keywords: ['remove', 'background', 'bg'], status: 'beta', acceptedMime: ['image/png'],
  },
];

const categoryOrder: ToolCategory[] = ['pdf', 'image'];
const categoryLabels = {
  pdf: 'PDF tools', image: 'Image tools',
  video: '', audio: '', svg: '', password: '', json: '', text: '',
  encode: '', qr: '', color: '', utility: '',
} as Record<ToolCategory, string>;

function OpenWrapper() {
  const { setOpen } = usePalette();
  return <button type="button" onClick={() => setOpen(true)}>open</button>;
}

function setup() {
  return render(
    <PaletteProvider>
      <OpenWrapper />
      <CommandPalette
        locale="en"
        tools={tools}
        categoryOrder={categoryOrder}
        categoryLabels={categoryLabels}
        messages={messages}
      />
    </PaletteProvider>,
  );
}

describe('CommandPalette rebuild', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.dataset['theme'] = 'dark';
  });

  it('shows quick actions and category groups when open with empty query', async () => {
    const user = userEvent.setup();
    setup();
    await user.click(screen.getByRole('button', { name: 'open' }));
    expect(screen.getByText('Quick actions')).toBeInTheDocument();
    expect(screen.getByText('Toggle theme')).toBeInTheDocument();
    expect(screen.getByText('PDF tools')).toBeInTheDocument();
    expect(screen.getByText('Image tools')).toBeInTheDocument();
  });

  it('ranks fuzzy match (merg → Merge) at the top of results', async () => {
    const user = userEvent.setup();
    setup();
    await user.click(screen.getByRole('button', { name: 'open' }));
    const input = screen.getByPlaceholderText('Search tools');
    await user.type(input, 'merg');
    expect(screen.getByText('Results')).toBeInTheDocument();
    expect(screen.getByText((_, el) => el?.textContent === 'Merge PDFs')).toBeInTheDocument();
  });

  it('shows the Beta badge for beta-status tools', async () => {
    const user = userEvent.setup();
    setup();
    await user.click(screen.getByRole('button', { name: 'open' }));
    await user.type(screen.getByPlaceholderText('Search tools'), 'background');
    expect(screen.getByText('Beta')).toBeInTheDocument();
  });

  it('toggles theme via the Toggle theme quick action', async () => {
    const user = userEvent.setup();
    setup();
    await user.click(screen.getByRole('button', { name: 'open' }));
    await user.click(screen.getByText('Toggle theme'));
    expect(document.documentElement.dataset['theme']).toBe('light');
  });

  it('shows keyboard hints in the footer', async () => {
    const user = userEvent.setup();
    setup();
    await user.click(screen.getByRole('button', { name: 'open' }));
    expect(screen.getByText('Navigate')).toBeInTheDocument();
    expect(screen.getByText('Select')).toBeInTheDocument();
    expect(screen.getByText('Close')).toBeInTheDocument();
  });
});
