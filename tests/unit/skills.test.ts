import { describe, it, expect } from 'vitest';
import {
  buildOneLiner,
  buildScript,
  parseInput,
  type ParsedCommand,
  type SkillsOptions,
} from '@/lib/tools/implementations/skills';

const defaults: SkillsOptions = {
  global: false,
  agents: [],
  yes: false,
  copy: false,
  fullDepth: false,
  style: 'multiline',
  shell: 'bash',
};

describe('parseInput', () => {
  it('returns an empty list for empty input', () => {
    expect(parseInput('')).toEqual([]);
    expect(parseInput('   \n\n   ')).toEqual([]);
  });

  it('ignores blank lines and # comments', () => {
    const result = parseInput(`\n# comment\nanthropics/skills@frontend-design\n   # indented comment\n`);
    expect(result).toHaveLength(1);
    expect(result[0]!.source).toBe('anthropics/skills@frontend-design');
  });

  it('parses full npx skills add line with --skill', () => {
    const result = parseInput('npx skills add https://github.com/anthropics/skills --skill frontend-design');
    expect(result).toEqual<ParsedCommand[]>([
      { source: 'https://github.com/anthropics/skills', skills: ['frontend-design'], extraFlags: [] },
    ]);
  });

  it('accepts the shorthand owner/repo source', () => {
    const result = parseInput('anthropics/skills');
    expect(result).toEqual<ParsedCommand[]>([
      { source: 'anthropics/skills', skills: [], extraFlags: [] },
    ]);
  });

  it('accepts the owner/repo@skill compact form', () => {
    const result = parseInput('anthropics/skills@web-design');
    expect(result[0]!.source).toBe('anthropics/skills@web-design');
  });

  it('strips the npx prefix and the skills add subcommand', () => {
    const result = parseInput('npx skills add owner/repo --skill a');
    expect(result[0]!.source).toBe('owner/repo');
    expect(result[0]!.skills).toEqual(['a']);
  });

  it('collects multiple values for variadic --skill', () => {
    const result = parseInput('owner/repo --skill alpha beta gamma');
    expect(result[0]!.skills).toEqual(['alpha', 'beta', 'gamma']);
  });

  it('supports -s as a shorthand for --skill', () => {
    const result = parseInput('owner/repo -s alpha beta');
    expect(result[0]!.skills).toEqual(['alpha', 'beta']);
  });

  it('drops known UI-owned flags (global, yes, copy, full-depth, agent, list)', () => {
    const result = parseInput('owner/repo -g -y --copy --full-depth --agent claude-code cursor --list');
    expect(result[0]).toEqual<ParsedCommand>({
      source: 'owner/repo',
      skills: [],
      extraFlags: [],
    });
  });

  it('preserves unknown flags verbatim in extraFlags', () => {
    const result = parseInput('owner/repo --weird-flag value --boolean-flag');
    expect(result[0]!.extraFlags).toEqual(['--weird-flag', 'value', '--boolean-flag']);
  });

  it('deduplicates identical commands across order', () => {
    const result = parseInput([
      'owner/repo --skill a b',
      'owner/repo -s b a',
      'other/repo',
    ].join('\n'));
    expect(result).toHaveLength(2);
    expect(result[0]!.source).toBe('owner/repo');
    expect(result[1]!.source).toBe('other/repo');
  });

  it('strips surrounding quotes on quoted tokens', () => {
    const result = parseInput(`owner/repo --skill 'with-dash' "another"`);
    expect(result[0]!.skills).toEqual(['with-dash', 'another']);
  });
});

describe('buildOneLiner', () => {
  const oneCmd: ParsedCommand[] = [
    { source: 'anthropics/skills', skills: ['frontend-design'], extraFlags: [] },
  ];
  const twoCmds: ParsedCommand[] = [
    { source: 'anthropics/skills', skills: ['frontend-design'], extraFlags: [] },
    { source: 'vercel-labs/agent-skills', skills: ['vercel-react-best-practices'], extraFlags: [] },
  ];

  it('returns an empty string for no commands', () => {
    expect(buildOneLiner([], defaults)).toBe('');
  });

  it('builds a single command with no options', () => {
    expect(buildOneLiner(oneCmd, defaults)).toBe(
      'npx skills add anthropics/skills --skill frontend-design',
    );
  });

  it('appends -g when global is true', () => {
    expect(buildOneLiner(oneCmd, { ...defaults, global: true })).toContain(' -g');
  });

  it('appends --agent values when agents is non-empty', () => {
    const out = buildOneLiner(oneCmd, { ...defaults, agents: ['claude-code', 'cursor'] });
    expect(out).toContain('--agent claude-code cursor');
  });

  it("emits --agent '*' alone when agents includes '*'", () => {
    const out = buildOneLiner(oneCmd, { ...defaults, agents: ['*', 'claude-code'] });
    expect(out).toContain("--agent '*'");
    expect(out).not.toContain('claude-code');
  });

  it('appends -y, --copy, --full-depth when toggled', () => {
    const out = buildOneLiner(oneCmd, { ...defaults, yes: true, copy: true, fullDepth: true });
    expect(out).toContain(' -y');
    expect(out).toContain(' --copy');
    expect(out).toContain(' --full-depth');
  });

  it('preserves extraFlags in output', () => {
    const cmds: ParsedCommand[] = [
      { source: 'owner/repo', skills: [], extraFlags: ['--weird', 'value'] },
    ];
    expect(buildOneLiner(cmds, defaults)).toBe('npx skills add owner/repo --weird value');
  });

  it("joins multiple commands with ' && \\\\\\n' in multiline style", () => {
    const out = buildOneLiner(twoCmds, defaults);
    expect(out.split(' && \\\n')).toHaveLength(2);
  });

  it("joins multiple commands with ' && ' in single-line style", () => {
    const out = buildOneLiner(twoCmds, { ...defaults, style: 'single' });
    expect(out).not.toContain('\n');
    expect(out.split(' && ')).toHaveLength(2);
  });

  it('omits --skill when the parsed command has none', () => {
    const cmds: ParsedCommand[] = [{ source: 'owner/repo', skills: [], extraFlags: [] }];
    expect(buildOneLiner(cmds, defaults)).toBe('npx skills add owner/repo');
  });

  it("joins multiline powershell commands with a bare newline (no && in PS 5.1)", () => {
    const out = buildOneLiner(twoCmds, { ...defaults, shell: 'powershell' });
    expect(out.split('\n')).toHaveLength(2);
    expect(out).not.toContain('&&');
    expect(out).not.toContain('\\');
  });

  it("joins single-line powershell commands with '; '", () => {
    const out = buildOneLiner(twoCmds, { ...defaults, shell: 'powershell', style: 'single' });
    expect(out).not.toContain('\n');
    expect(out.split('; ')).toHaveLength(2);
    expect(out).not.toContain('&&');
  });

  it("joins multiline cmd commands with ' && ^\\n'", () => {
    const out = buildOneLiner(twoCmds, { ...defaults, shell: 'cmd' });
    expect(out.split(' && ^\n')).toHaveLength(2);
  });

  it("joins single-line cmd commands with ' && '", () => {
    const out = buildOneLiner(twoCmds, { ...defaults, shell: 'cmd', style: 'single' });
    expect(out).not.toContain('\n');
    expect(out.split(' && ')).toHaveLength(2);
  });

  it("double-quotes the * agent for cmd, single-quotes it elsewhere", () => {
    expect(buildOneLiner(oneCmd, { ...defaults, agents: ['*'], shell: 'cmd' })).toContain('--agent "*"');
    expect(buildOneLiner(oneCmd, { ...defaults, agents: ['*'], shell: 'powershell' })).toContain("--agent '*'");
    expect(buildOneLiner(oneCmd, { ...defaults, agents: ['*'] })).toContain("--agent '*'");
  });
});

describe('buildScript', () => {
  const twoCmds: ParsedCommand[] = [
    { source: 'anthropics/skills', skills: ['frontend-design'], extraFlags: [] },
    { source: 'vercel-labs/agent-skills', skills: ['vercel-react-best-practices'], extraFlags: [] },
  ];

  it('returns null for no commands', () => {
    expect(buildScript([], defaults)).toBeNull();
  });

  it('builds an install-skills.sh with set -euo pipefail for bash', () => {
    const script = buildScript(twoCmds, defaults)!;
    expect(script.filename).toBe('install-skills.sh');
    expect(script.content).toContain('#!/usr/bin/env bash');
    expect(script.content).toContain('set -euo pipefail');
    expect(script.content).toContain('npx skills add anthropics/skills --skill frontend-design');
    expect(script.content.endsWith('\n')).toBe(true);
  });

  it('builds an install-skills.ps1 with a $LASTEXITCODE guard per command', () => {
    const script = buildScript(twoCmds, { ...defaults, shell: 'powershell' })!;
    expect(script.filename).toBe('install-skills.ps1');
    expect(script.content).toContain("$ErrorActionPreference = 'Stop'");
    expect(script.content.match(/if \(\$LASTEXITCODE -ne 0\) \{ exit \$LASTEXITCODE \}/g)).toHaveLength(2);
  });

  it('builds an install-skills.cmd that calls npx (cmd shim) and exits on failure', () => {
    const script = buildScript(twoCmds, { ...defaults, shell: 'cmd' })!;
    expect(script.filename).toBe('install-skills.cmd');
    expect(script.content).toContain('@echo off');
    expect(script.content.match(/^call npx skills add .+ \|\| exit \/b 1$/gm)).toHaveLength(2);
  });
});
