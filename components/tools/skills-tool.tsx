'use client';

import { useEffect, useId, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { downloadBlob } from '@/lib/file-utils';
import { tpl } from '@/lib/tpl';
import { CopyButton } from '@/components/tools/json/copy-button';
import {
  AGENTS,
  buildOneLiner,
  parseInput,
  type Agent,
  type OutputStyle,
  type SkillsOptions,
} from '@/lib/tools/implementations/skills';

type Messages = {
  optionsLabel: string;
  globalLabel: string;
  globalHint: string;
  agentsLabel: string;
  agentClaudeCode: string;
  agentCursor: string;
  agentCodex: string;
  agentGeminiCli: string;
  agentCopilot: string;
  agentAll: string;
  yesLabel: string;
  yesHint: string;
  copyLabel: string;
  copyHint: string;
  fullDepthLabel: string;
  fullDepthHint: string;
  styleLabel: string;
  styleMultiline: string;
  styleSingle: string;
  inputLabel: string;
  inputPlaceholder: string;
  outputLabel: string;
  copy: string;
  copied: string;
  download: string;
  clear: string;
  loadSample: string;
  empty: string;
  commandsTemplate: string;
  charsTemplate: string;
};

const SAMPLE = [
  'npx skills add https://github.com/anthropics/skills --skill frontend-design',
  'npx skills add https://github.com/vercel-labs/agent-skills --skill vercel-react-best-practices',
  '# Comments are ignored',
  'anthropics/skills@web-design',
].join('\n');

function agentLabel(agent: Agent, m: Messages): string {
  switch (agent) {
    case 'claude-code': return m.agentClaudeCode;
    case 'cursor': return m.agentCursor;
    case 'codex': return m.agentCodex;
    case 'gemini-cli': return m.agentGeminiCli;
    case 'copilot': return m.agentCopilot;
    case '*': return m.agentAll;
  }
}

const chipClass = (active: boolean) =>
  `flex cursor-pointer items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs transition-colors ${
    active
      ? 'border-accent bg-surface-hover text-text-primary'
      : 'border-border bg-surface text-text-muted hover:border-border-strong'
  }`;

export function SkillsTool(messages: Messages) {
  const inputId = useId();

  const [input, setInput] = useState('');
  const [debounced, setDebounced] = useState('');
  const [global, setGlobal] = useState(false);
  const [agents, setAgents] = useState<Agent[]>(['claude-code']);
  const [yes, setYes] = useState(true);
  const [copy, setCopy] = useState(false);
  const [fullDepth, setFullDepth] = useState(false);
  const [style, setStyle] = useState<OutputStyle>('multiline');

  useEffect(() => {
    const h = window.setTimeout(() => setDebounced(input), 200);
    return () => window.clearTimeout(h);
  }, [input]);

  const opts: SkillsOptions = useMemo(
    () => ({ global, agents, yes, copy, fullDepth, style }),
    [global, agents, yes, copy, fullDepth, style],
  );

  const parsed = useMemo(() => parseInput(debounced), [debounced]);
  const output = useMemo(() => buildOneLiner(parsed, opts), [parsed, opts]);

  const toggleAgent = (a: Agent) => {
    setAgents((prev) => {
      if (a === '*') {
        return prev.includes('*') ? [] : ['*'];
      }
      const without = prev.filter((x) => x !== '*');
      return without.includes(a)
        ? without.filter((x) => x !== a)
        : [...without, a];
    });
  };

  const onDownload = () => {
    if (!output) return;
    const content = output.endsWith('\n') ? output : `${output}\n`;
    downloadBlob(new Blob([`#!/usr/bin/env bash\nset -euo pipefail\n\n${content}`], { type: 'application/x-sh' }), 'install-skills.sh');
  };

  return (
    <div className="flex flex-col gap-4">
      <fieldset className="flex flex-wrap items-center gap-2">
        <legend className="px-1 pb-1 text-xs text-text-muted">{messages.agentsLabel}</legend>
        {AGENTS.map((a) => {
          const active = agents.includes(a);
          return (
            <label key={a} className={chipClass(active)}>
              <input
                type="checkbox"
                checked={active}
                onChange={() => toggleAgent(a)}
                className="sr-only"
              />
              {agentLabel(a, messages)}
            </label>
          );
        })}
      </fieldset>

      <div className="flex flex-wrap items-center gap-2">
        <label className={chipClass(global)}>
          <input type="checkbox" checked={global} onChange={(e) => setGlobal(e.target.checked)} className="sr-only" />
          {messages.globalLabel} <span className="text-text-faint">{messages.globalHint}</span>
        </label>
        <label className={chipClass(yes)}>
          <input type="checkbox" checked={yes} onChange={(e) => setYes(e.target.checked)} className="sr-only" />
          {messages.yesLabel} <span className="text-text-faint">{messages.yesHint}</span>
        </label>
        <label className={chipClass(copy)}>
          <input type="checkbox" checked={copy} onChange={(e) => setCopy(e.target.checked)} className="sr-only" />
          {messages.copyLabel} <span className="text-text-faint">{messages.copyHint}</span>
        </label>
        <label className={chipClass(fullDepth)}>
          <input type="checkbox" checked={fullDepth} onChange={(e) => setFullDepth(e.target.checked)} className="sr-only" />
          {messages.fullDepthLabel} <span className="text-text-faint">{messages.fullDepthHint}</span>
        </label>

        <fieldset className="flex items-center gap-2 text-xs">
          <legend className="px-1 text-text-muted">{messages.styleLabel}</legend>
          {(['multiline', 'single'] as const).map((value) => (
            <label key={value} className={chipClass(style === value)}>
              <input
                type="radio"
                name="output-style"
                value={value}
                checked={style === value}
                onChange={() => setStyle(value)}
                className="sr-only"
              />
              {value === 'multiline' ? messages.styleMultiline : messages.styleSingle}
            </label>
          ))}
        </fieldset>

        <span className="ml-auto flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => setInput(SAMPLE)} type="button">{messages.loadSample}</Button>
          <Button variant="ghost" size="sm" onClick={() => setInput('')} disabled={!input} type="button">{messages.clear}</Button>
        </span>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <div className="flex items-baseline justify-between">
            <label htmlFor={inputId} className="text-xs text-text-muted">{messages.inputLabel}</label>
            <span className="font-mono text-xs text-text-faint">{tpl(messages.commandsTemplate, { n: parsed.length })}</span>
          </div>
          <textarea
            id={inputId}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={messages.inputPlaceholder}
            rows={12}
            className="min-h-[20rem] resize-y rounded-md border border-border bg-surface px-3 py-2 font-mono text-sm text-text-primary placeholder:text-text-faint hover:border-border-strong focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30 transition-colors"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <div className="flex items-baseline justify-between">
            <label className="text-xs text-text-muted">{messages.outputLabel}</label>
            <span className="font-mono text-xs text-text-faint">{output ? tpl(messages.charsTemplate, { n: [...output].length }) : ''}</span>
          </div>
          {output ? (
            <Card className="min-h-[20rem] whitespace-pre-wrap break-all px-3 py-2 font-mono text-sm text-text-primary">{output}</Card>
          ) : (
            <Card className="flex min-h-[20rem] items-center justify-center px-3 py-2 text-sm text-text-faint">{messages.empty}</Card>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-end gap-2">
        <CopyButton text={output} copyLabel={messages.copy} copiedLabel={messages.copied} disabled={!output} />
        <Button size="sm" onClick={onDownload} disabled={!output} type="button">{messages.download}</Button>
      </div>
    </div>
  );
}
