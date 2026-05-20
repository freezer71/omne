import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { SkillsBrowseTool } from '@/components/tools/skills-browse-tool';

const messages = {
  searchLabel: 'Search',
  searchPlaceholder: 'Type 2+ chars',
  searchHint: 'Type 2 or more chars.',
  loading: 'Searching…',
  searchError: "Couldn't reach skills.sh.",
  noResults: 'No results.',
  resultsLabel: 'Results',
  installsTemplate: '{n} installs',
  selectedLabel: 'Selected',
  selectedEmpty: 'Pick skills.',
  clearSelected: 'Clear',
  globalLabel: 'Global',
  globalHint: '-g',
  agentsLabel: 'Agents',
  agentClaudeCode: 'Claude Code',
  agentCursor: 'Cursor',
  agentCodex: 'Codex',
  agentGeminiCli: 'Gemini CLI',
  agentCopilot: 'Copilot',
  agentAll: 'All (*)',
  yesLabel: 'Skip prompts',
  yesHint: '-y',
  copyLabel: 'Copy (no symlink)',
  copyHint: '--copy',
  fullDepthLabel: 'Full depth',
  fullDepthHint: '--full-depth',
  styleLabel: 'Output style',
  styleMultiline: 'Multi-line',
  styleSingle: 'Single line',
  outputLabel: 'One-liner',
  copy: 'Copy',
  copied: 'Copied',
  download: 'Download .sh',
  empty: 'Select skills to generate.',
  commandsTemplate: '{n} selected',
  charsTemplate: '{n} chars',
  privacyNote: 'Proxied via omne server.',
  viewSkill: 'View',
  discoverHint: 'Discover popular skills',
  tabAllTime: 'All Time',
  tabTrending: 'Trending 24h',
  tabHot: 'Hot',
  feedLoading: 'Loading top skills…',
  feedError: 'Discovery is temporarily unavailable.',
  feedRetry: 'Try again',
  installsYesterdayTemplate: '{n} yesterday',
  changeTemplate: '+{n} since yesterday',
  officialBadge: 'Official',
};

const searchResponse = {
  query: 'ffmpeg',
  skills: [
    {
      id: 'digitalsamba/claude-code-video-toolkit/ffmpeg',
      skillId: 'ffmpeg',
      name: 'ffmpeg',
      installs: 3411,
      source: 'digitalsamba/claude-code-video-toolkit',
    },
    {
      id: 'sundial-org/awesome-openclaw-skills/ffmpeg-video-editor',
      skillId: 'ffmpeg-video-editor',
      name: 'ffmpeg-video-editor',
      installs: 958,
      source: 'sundial-org/awesome-openclaw-skills',
    },
  ],
  count: 2,
};

const feedAllTimeResponse = {
  type: 'all-time',
  skills: [
    {
      id: 'vercel-labs/skills/find-skills',
      skillId: 'find-skills',
      name: 'find-skills',
      installs: 1613157,
      source: 'vercel-labs/skills',
      isOfficial: true,
    },
    {
      id: 'anthropics/skills/frontend-design',
      skillId: 'frontend-design',
      name: 'frontend-design',
      installs: 437326,
      source: 'anthropics/skills',
      isOfficial: true,
    },
  ],
  count: 2,
};

const feedTrendingResponse = {
  type: 'trending',
  skills: [
    {
      id: 'skills-shell/skills/ai-image-generation',
      skillId: 'ai-image-generation',
      name: 'ai-image-generation',
      installs: 16567,
      source: 'skills-shell/skills',
    },
  ],
  count: 1,
};

const feedHotResponse = {
  type: 'hot',
  skills: [
    {
      id: 'skills-shell/skills/twitter-automation',
      skillId: 'twitter-automation',
      name: 'twitter-automation',
      installs: 62,
      installsYesterday: 0,
      change: 62,
      source: 'skills-shell/skills',
    },
  ],
  count: 1,
};

type FetchInit = { signal?: AbortSignal | null };

function makeFetchMock(opts: {
  feedAllTime?: unknown;
  feedTrending?: unknown;
  feedHot?: unknown;
  search?: unknown;
  feedStatus?: number;
} = {}) {
  return vi.fn(async (url: string, _init?: FetchInit) => {
    if (url.includes('/api/skills-feed')) {
      const status = opts.feedStatus ?? 200;
      if (status !== 200) {
        return {
          ok: false,
          status,
          json: async () => ({ error: 'feed_unavailable' }),
        };
      }
      let body: unknown = opts.feedAllTime ?? feedAllTimeResponse;
      if (url.includes('type=trending')) body = opts.feedTrending ?? feedTrendingResponse;
      else if (url.includes('type=hot')) body = opts.feedHot ?? feedHotResponse;
      return { ok: true, status: 200, json: async () => body };
    }
    if (url.includes('/api/skills-search')) {
      return { ok: true, status: 200, json: async () => opts.search ?? searchResponse };
    }
    return { ok: true, status: 200, json: async () => ({}) };
  });
}

describe('SkillsBrowseTool', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.stubGlobal('fetch', makeFetchMock());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('renders the discovery tabs and the All Time feed at init', async () => {
    render(<SkillsBrowseTool {...messages} />);
    expect(screen.getByRole('tab', { name: 'All Time' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: 'Trending 24h' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Hot' })).toBeInTheDocument();
    expect(screen.getByText('Pick skills.')).toBeInTheDocument();

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/skills-feed?type=all-time',
        expect.objectContaining({ signal: expect.anything() }),
      );
    });
    await waitFor(() => {
      expect(screen.getByText('find-skills')).toBeInTheDocument();
    });
  });

  it('switches the feed when the Trending tab is clicked', async () => {
    render(<SkillsBrowseTool {...messages} />);
    await screen.findByText('find-skills');

    fireEvent.click(screen.getByRole('tab', { name: 'Trending 24h' }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/skills-feed?type=trending',
        expect.objectContaining({ signal: expect.anything() }),
      );
    });
    await waitFor(() => {
      expect(screen.getByText('ai-image-generation')).toBeInTheDocument();
    });
    expect(screen.getByRole('tab', { name: 'Trending 24h' })).toHaveAttribute('aria-selected', 'true');
  });

  it('adds a feed skill to Selected when its checkbox is clicked', async () => {
    render(<SkillsBrowseTool {...messages} />);
    const findSkillsLabel = await screen.findByText('find-skills');
    const row = findSkillsLabel.closest('label');
    expect(row).not.toBeNull();
    fireEvent.click(row!.querySelector('input[type="checkbox"]')!);

    await waitFor(() => {
      const out = screen.getByText(/npx skills add/);
      expect(out.textContent).toContain('vercel-labs/skills');
      expect(out.textContent).toContain('--skill find-skills');
    });
  });

  it('shows installsYesterday delta on the Hot tab', async () => {
    render(<SkillsBrowseTool {...messages} />);
    fireEvent.click(screen.getByRole('tab', { name: 'Hot' }));

    await screen.findByText('twitter-automation');
    expect(screen.getByText('+62')).toBeInTheDocument();
  });

  it('renders an Official badge for official skills', async () => {
    render(<SkillsBrowseTool {...messages} />);
    await screen.findByText('find-skills');
    expect(screen.getAllByText('Official').length).toBeGreaterThan(0);
  });

  it('hides the discovery tabs and runs search when 2+ chars are typed', async () => {
    render(<SkillsBrowseTool {...messages} />);
    await screen.findByText('find-skills');

    fireEvent.change(screen.getByPlaceholderText('Type 2+ chars'), {
      target: { value: 'ffmpeg' },
    });
    vi.advanceTimersByTime(350);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/skills-search?q=ffmpeg&limit=50',
        expect.objectContaining({ signal: expect.anything() }),
      );
    });
    await waitFor(() => {
      expect(screen.getByText('ffmpeg-video-editor')).toBeInTheDocument();
    });
    expect(screen.queryByRole('tab', { name: 'All Time' })).not.toBeInTheDocument();
  });

  it('restores the discovery tabs when the search is cleared', async () => {
    render(<SkillsBrowseTool {...messages} />);
    fireEvent.change(screen.getByPlaceholderText('Type 2+ chars'), {
      target: { value: 'ffmpeg' },
    });
    vi.advanceTimersByTime(350);
    await screen.findByText('ffmpeg-video-editor');

    fireEvent.change(screen.getByPlaceholderText('Type 2+ chars'), {
      target: { value: '' },
    });
    vi.advanceTimersByTime(350);

    await waitFor(() => {
      expect(screen.getByRole('tab', { name: 'All Time' })).toBeInTheDocument();
    });
    await screen.findByText('find-skills');
  });

  it('builds the one-liner with --agent and -y when a search result is checked', async () => {
    render(<SkillsBrowseTool {...messages} />);
    fireEvent.change(screen.getByPlaceholderText('Type 2+ chars'), {
      target: { value: 'ffmpeg' },
    });
    vi.advanceTimersByTime(350);

    const ffmpegLabel = await screen.findByText('ffmpeg');
    fireEvent.click(ffmpegLabel.closest('label')!.querySelector('input[type="checkbox"]')!);

    await waitFor(() => {
      const out = screen.getByText(/npx skills add/);
      expect(out.textContent).toContain('digitalsamba/claude-code-video-toolkit');
      expect(out.textContent).toContain('--skill ffmpeg');
      expect(out.textContent).toContain('--agent claude-code');
      expect(out.textContent).toContain('-y');
    });
  });

  it('renders View links pointing to skills.sh for search results', async () => {
    render(<SkillsBrowseTool {...messages} />);
    fireEvent.change(screen.getByPlaceholderText('Type 2+ chars'), {
      target: { value: 'ffmpeg' },
    });
    vi.advanceTimersByTime(350);

    await screen.findByText('ffmpeg-video-editor');

    const viewLinks = screen.getAllByRole('link', { name: 'View' });
    expect(viewLinks.length).toBeGreaterThanOrEqual(2);
    const ffmpegLink = viewLinks.find(
      (a) => a.getAttribute('href') === 'https://skills.sh/digitalsamba/claude-code-video-toolkit/ffmpeg',
    );
    expect(ffmpegLink).toBeDefined();
    expect(ffmpegLink).toHaveAttribute('target', '_blank');
    expect(ffmpegLink).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('shows the search error alert when the proxy responds non-2xx', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => {
        if (url.includes('/api/skills-feed')) {
          return { ok: true, status: 200, json: async () => feedAllTimeResponse };
        }
        return { ok: false, status: 502, json: async () => ({}) };
      }),
    );
    render(<SkillsBrowseTool {...messages} />);
    fireEvent.change(screen.getByPlaceholderText('Type 2+ chars'), {
      target: { value: 'whatever' },
    });
    vi.advanceTimersByTime(350);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent("Couldn't reach skills.sh.");
    });
  });

  it('shows feed error + Try again button when /api/skills-feed returns 502', async () => {
    vi.stubGlobal('fetch', makeFetchMock({ feedStatus: 502 }));
    render(<SkillsBrowseTool {...messages} />);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Discovery is temporarily unavailable.');
    });
    const retry = screen.getByRole('button', { name: 'Try again' });
    expect(retry).toBeInTheDocument();

    vi.stubGlobal('fetch', makeFetchMock());
    fireEvent.click(retry);

    await screen.findByText('find-skills');
  });
});
