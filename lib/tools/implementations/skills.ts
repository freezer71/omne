export const AGENTS = ['claude-code', 'cursor', 'codex', 'gemini-cli', 'copilot', '*'] as const;
export type Agent = (typeof AGENTS)[number];
export type OutputStyle = 'multiline' | 'single';
export const SHELLS = ['bash', 'powershell', 'cmd'] as const;
export type Shell = (typeof SHELLS)[number];

export const SCRIPT_EXTENSIONS: Record<Shell, string> = {
  bash: '.sh',
  powershell: '.ps1',
  cmd: '.cmd',
};

export type ParsedCommand = {
  source: string;
  skills: string[];
  extraFlags: string[];
};

export type SkillsOptions = {
  global: boolean;
  agents: Agent[];
  yes: boolean;
  copy: boolean;
  fullDepth: boolean;
  style: OutputStyle;
  shell: Shell;
};

const KNOWN_BOOL_FLAGS = new Set(['-g', '--global', '-y', '--yes', '--copy', '--full-depth', '-l', '--list']);
const KNOWN_VARIADIC_FLAGS = new Set(['-s', '--skill', '-a', '--agent']);

function tokenize(line: string): string[] {
  const out: string[] = [];
  let i = 0;
  const n = line.length;
  while (i < n) {
    while (i < n && /\s/.test(line[i]!)) i++;
    if (i >= n) break;
    const c = line[i]!;
    if (c === '"' || c === "'") {
      const quote = c;
      i++;
      let buf = '';
      while (i < n && line[i] !== quote) {
        buf += line[i];
        i++;
      }
      if (i < n) i++;
      out.push(buf);
      continue;
    }
    let buf = '';
    while (i < n && !/\s/.test(line[i]!)) {
      buf += line[i];
      i++;
    }
    out.push(buf);
  }
  return out;
}

function parseLine(rawLine: string): ParsedCommand | null {
  const trimmed = rawLine.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith('#')) return null;

  let tokens = tokenize(trimmed);
  if (tokens.length === 0) return null;

  if (tokens[0] === 'npx') tokens = tokens.slice(1);
  if (tokens[0] === 'skills') tokens = tokens.slice(1);
  if (tokens[0] === 'add' || tokens[0] === 'a') tokens = tokens.slice(1);
  if (tokens.length === 0) return null;

  let source: string | null = null;
  const skills: string[] = [];
  const extraFlags: string[] = [];

  let i = 0;
  while (i < tokens.length) {
    const t = tokens[i]!;
    if (KNOWN_VARIADIC_FLAGS.has(t)) {
      const isSkill = t === '-s' || t === '--skill';
      const isAgent = t === '-a' || t === '--agent';
      i++;
      while (i < tokens.length && !tokens[i]!.startsWith('-')) {
        if (isSkill) skills.push(tokens[i]!);
        i++;
      }
      void isAgent;
      continue;
    }
    if (KNOWN_BOOL_FLAGS.has(t)) {
      i++;
      continue;
    }
    if (t.startsWith('-')) {
      extraFlags.push(t);
      const next = tokens[i + 1];
      if (next !== undefined && !next.startsWith('-')) {
        if (source === null) {
          i++;
          continue;
        }
        extraFlags.push(next);
        i += 2;
        continue;
      }
      i++;
      continue;
    }
    if (source === null) {
      source = t;
    } else {
      extraFlags.push(t);
    }
    i++;
  }

  if (!source) return null;
  return { source, skills, extraFlags };
}

export function parseInput(text: string): ParsedCommand[] {
  if (!text) return [];
  const lines = text.split(/\r?\n/);
  const parsed: ParsedCommand[] = [];
  const seen = new Set<string>();
  for (const line of lines) {
    const cmd = parseLine(line);
    if (!cmd) continue;
    const key = JSON.stringify([cmd.source, [...cmd.skills].sort(), cmd.extraFlags]);
    if (seen.has(key)) continue;
    seen.add(key);
    parsed.push(cmd);
  }
  return parsed;
}

function buildCommand(cmd: ParsedCommand, opts: SkillsOptions): string {
  const parts: string[] = ['npx', 'skills', 'add', cmd.source];
  if (cmd.skills.length > 0) {
    parts.push('--skill', ...cmd.skills);
  }
  if (opts.global) parts.push('-g');
  if (opts.agents.length > 0) {
    if (opts.agents.includes('*')) {
      // cmd.exe passes single quotes through literally — only double quotes are stripped.
      parts.push('--agent', opts.shell === 'cmd' ? '"*"' : "'*'");
    } else {
      parts.push('--agent', ...opts.agents);
    }
  }
  if (opts.yes) parts.push('-y');
  if (opts.copy) parts.push('--copy');
  if (opts.fullDepth) parts.push('--full-depth');
  if (cmd.extraFlags.length > 0) parts.push(...cmd.extraFlags);
  return parts.join(' ');
}

function joinerFor(opts: SkillsOptions): string {
  if (opts.style === 'single') {
    // Windows PowerShell 5.1 has no && operator; ; is the universal separator.
    return opts.shell === 'powershell' ? '; ' : ' && ';
  }
  switch (opts.shell) {
    case 'bash': return ' && \\\n';
    // A bare newline is a statement separator in every PowerShell version.
    case 'powershell': return '\n';
    // ^ escapes the newline in cmd.exe, keeping && short-circuit semantics.
    case 'cmd': return ' && ^\n';
  }
}

export function buildOneLiner(cmds: ParsedCommand[], opts: SkillsOptions): string {
  if (cmds.length === 0) return '';
  const built = cmds.map((cmd) => buildCommand(cmd, opts));
  return built.join(joinerFor(opts));
}

export type ScriptFile = {
  filename: string;
  content: string;
  mime: string;
};

export function buildScript(cmds: ParsedCommand[], opts: SkillsOptions): ScriptFile | null {
  if (cmds.length === 0) return null;
  const built = cmds.map((cmd) => buildCommand(cmd, opts));
  switch (opts.shell) {
    case 'bash':
      return {
        filename: 'install-skills.sh',
        content: `#!/usr/bin/env bash\nset -euo pipefail\n\n${built.join('\n')}\n`,
        mime: 'application/x-sh',
      };
    case 'powershell':
      // $ErrorActionPreference doesn't stop on native command failure —
      // the explicit $LASTEXITCODE check is what aborts on the first error.
      return {
        filename: 'install-skills.ps1',
        content: `$ErrorActionPreference = 'Stop'\n\n${built
          .map((c) => `${c}\nif ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }`)
          .join('\n')}\n`,
        mime: 'text/plain',
      };
    case 'cmd':
      // npx is npx.cmd on Windows: without `call`, the batch script would
      // hand control to the first npx and never run the following lines.
      return {
        filename: 'install-skills.cmd',
        content: `@echo off\n\n${built.map((c) => `call ${c} || exit /b 1`).join('\n')}\n`,
        mime: 'text/plain',
      };
  }
}
