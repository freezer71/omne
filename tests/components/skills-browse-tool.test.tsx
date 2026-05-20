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
};

const sampleResponse = {
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

describe('SkillsBrowseTool', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => sampleResponse,
      }),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('renders the hint when the query is empty', () => {
    render(<SkillsBrowseTool {...messages} />);
    expect(screen.getByText('Type 2 or more chars.')).toBeInTheDocument();
    expect(screen.getByText('Pick skills.')).toBeInTheDocument();
  });

  it('searches via fetch after debounce and renders results', async () => {
    render(<SkillsBrowseTool {...messages} />);
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
      expect(screen.getByText('digitalsamba/claude-code-video-toolkit')).toBeInTheDocument();
    });
  });

  it('builds the one-liner when a skill is checked', async () => {
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

  it('renders a View link per result pointing to skills.sh/<id>', async () => {
    render(<SkillsBrowseTool {...messages} />);
    fireEvent.change(screen.getByPlaceholderText('Type 2+ chars'), {
      target: { value: 'ffmpeg' },
    });
    vi.advanceTimersByTime(350);

    await screen.findByText('ffmpeg-video-editor');

    const viewLinks = screen.getAllByRole('link', { name: 'View' });
    expect(viewLinks).toHaveLength(2);
    expect(viewLinks[0]).toHaveAttribute(
      'href',
      'https://skills.sh/digitalsamba/claude-code-video-toolkit/ffmpeg',
    );
    expect(viewLinks[0]).toHaveAttribute('target', '_blank');
    expect(viewLinks[0]).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('shows an error when the proxy responds non-2xx', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: false, status: 502, json: async () => ({}) }),
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
});
