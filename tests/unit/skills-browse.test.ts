import { describe, it, expect } from 'vitest';
import { toCommands, type SkillResult } from '@/lib/tools/implementations/skills-browse';
import { buildOneLiner, type SkillsOptions } from '@/lib/tools/implementations/skills';

const defaults: SkillsOptions = {
  global: false,
  agents: ['claude-code'],
  yes: true,
  copy: false,
  fullDepth: false,
  style: 'multiline',
};

const ffmpeg: SkillResult = {
  id: 'digitalsamba/claude-code-video-toolkit/ffmpeg',
  skillId: 'ffmpeg',
  name: 'ffmpeg',
  installs: 3411,
  source: 'digitalsamba/claude-code-video-toolkit',
};

const reactBP: SkillResult = {
  id: 'vercel-labs/agent-skills/vercel-react-best-practices',
  skillId: 'vercel-react-best-practices',
  name: 'vercel-react-best-practices',
  installs: 1200,
  source: 'vercel-labs/agent-skills',
};

const reactNative: SkillResult = {
  id: 'vercel-labs/agent-skills/vercel-react-native-skills',
  skillId: 'vercel-react-native-skills',
  name: 'vercel-react-native-skills',
  installs: 800,
  source: 'vercel-labs/agent-skills',
};

describe('toCommands', () => {
  it('returns one ParsedCommand per selected skill', () => {
    const cmds = toCommands([ffmpeg, reactBP]);
    expect(cmds).toHaveLength(2);
    expect(cmds[0]).toEqual({
      source: 'digitalsamba/claude-code-video-toolkit',
      skills: ['ffmpeg'],
      extraFlags: [],
    });
    expect(cmds[1]).toEqual({
      source: 'vercel-labs/agent-skills',
      skills: ['vercel-react-best-practices'],
      extraFlags: [],
    });
  });

  it('keeps two skills from the same source as separate commands', () => {
    const cmds = toCommands([reactBP, reactNative]);
    expect(cmds).toHaveLength(2);
    expect(cmds.every((c) => c.source === 'vercel-labs/agent-skills')).toBe(true);
  });

  it('returns an empty array for no selection', () => {
    expect(toCommands([])).toEqual([]);
  });
});

describe('buildOneLiner with browse selections', () => {
  it('produces an installable one-liner with default agent claude-code and -y', () => {
    const out = buildOneLiner(toCommands([ffmpeg]), defaults);
    expect(out).toBe(
      'npx skills add digitalsamba/claude-code-video-toolkit --skill ffmpeg --agent claude-code -y',
    );
  });

  it('chains multiple skills with && \\\\\\n in multiline style', () => {
    const out = buildOneLiner(toCommands([ffmpeg, reactBP]), defaults);
    expect(out.split(' && \\\n')).toHaveLength(2);
    expect(out).toContain('--skill ffmpeg');
    expect(out).toContain('--skill vercel-react-best-practices');
  });
});
