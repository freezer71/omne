import { describe, it, expect, beforeEach, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { SkillsTool } from '@/components/tools/skills-tool';

const messages = {
  optionsLabel: 'Options',
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
  inputLabel: 'Paste lines',
  inputPlaceholder: 'npx skills add ...',
  outputLabel: 'One-liner',
  copy: 'Copy',
  copied: 'Copied',
  download: 'Download .sh',
  clear: 'Clear',
  loadSample: 'Load sample',
  empty: 'Paste some lines.',
  commandsTemplate: '{n} commands',
  charsTemplate: '{n} chars',
};

describe('SkillsTool', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  it('renders the empty state initially', () => {
    render(<SkillsTool {...messages} />);
    expect(screen.getByText('Paste some lines.')).toBeInTheDocument();
  });

  it('renders the one-liner after debounce when input is pasted', async () => {
    render(<SkillsTool {...messages} />);
    const input = screen.getByPlaceholderText('npx skills add ...') as HTMLTextAreaElement;
    fireEvent.change(input, {
      target: { value: 'npx skills add anthropics/skills --skill frontend-design' },
    });

    vi.advanceTimersByTime(250);

    await waitFor(() => {
      expect(
        screen.getByText('npx skills add anthropics/skills --skill frontend-design'),
      ).toBeInTheDocument();
    });
  });

  it('includes --agent claude-code and -y by default; adds another agent when toggled', async () => {
    render(<SkillsTool {...messages} />);
    fireEvent.change(screen.getByPlaceholderText('npx skills add ...'), {
      target: { value: 'anthropics/skills --skill frontend-design' },
    });
    vi.advanceTimersByTime(250);

    await waitFor(() => {
      const out = screen.getByText(/npx skills add/);
      expect(out.textContent).toContain('--agent claude-code');
      expect(out.textContent).toContain('-y');
    });

    fireEvent.click(screen.getByText('Cursor'));
    vi.advanceTimersByTime(50);

    await waitFor(() => {
      const out = screen.getByText(/npx skills add/);
      expect(out.textContent).toContain('--agent claude-code cursor');
    });
  });

  it('removes -y when Skip prompts is toggled off', async () => {
    render(<SkillsTool {...messages} />);
    fireEvent.change(screen.getByPlaceholderText('npx skills add ...'), {
      target: { value: 'anthropics/skills --skill frontend-design' },
    });
    vi.advanceTimersByTime(250);

    fireEvent.click(screen.getByText('Skip prompts'));
    vi.advanceTimersByTime(50);

    await waitFor(() => {
      expect(screen.getByText(/npx skills add/).textContent).not.toContain('-y');
    });
  });

  it('joins commands with multiline style by default and switches to single-line', async () => {
    render(<SkillsTool {...messages} />);
    fireEvent.change(screen.getByPlaceholderText('npx skills add ...'), {
      target: {
        value: 'a/b --skill x\nc/d --skill y',
      },
    });
    vi.advanceTimersByTime(250);

    await waitFor(() => {
      const out = screen.getByText(/npx skills add/);
      expect(out.textContent).toContain(' && \\');
    });

    fireEvent.click(screen.getByText('Single line'));
    vi.advanceTimersByTime(50);

    await waitFor(() => {
      const out = screen.getByText(/npx skills add/);
      expect(out.textContent).not.toContain(' && \\');
      expect(out.textContent).toMatch(/&&/);
    });
  });

  it('Load sample populates the input', () => {
    render(<SkillsTool {...messages} />);
    fireEvent.click(screen.getByText('Load sample'));
    const input = screen.getByPlaceholderText('npx skills add ...') as HTMLTextAreaElement;
    expect(input.value.length).toBeGreaterThan(0);
    expect(input.value).toMatch(/npx skills add/);
  });

  it('Clear empties the input and disables itself when empty', () => {
    render(<SkillsTool {...messages} />);
    fireEvent.change(screen.getByPlaceholderText('npx skills add ...'), {
      target: { value: 'anthropics/skills' },
    });
    fireEvent.click(screen.getByText('Clear'));
    expect(
      (screen.getByPlaceholderText('npx skills add ...') as HTMLTextAreaElement).value,
    ).toBe('');
    expect(screen.getByText('Clear')).toBeDisabled();
  });
});
