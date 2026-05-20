'use client';

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { downloadBlob } from '@/lib/file-utils';
import { tpl } from '@/lib/tpl';
import { CopyButton } from '@/components/tools/json/copy-button';
import {
  AGENTS,
  buildOneLiner,
  type Agent,
  type OutputStyle,
  type SkillsOptions,
} from '@/lib/tools/implementations/skills';
import {
  toCommands,
  type SearchResponse,
  type SkillResult,
} from '@/lib/tools/implementations/skills-browse';

type Messages = {
  searchLabel: string;
  searchPlaceholder: string;
  searchHint: string;
  loading: string;
  searchError: string;
  noResults: string;
  resultsLabel: string;
  installsTemplate: string;
  selectedLabel: string;
  selectedEmpty: string;
  clearSelected: string;
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
  outputLabel: string;
  copy: string;
  copied: string;
  download: string;
  empty: string;
  commandsTemplate: string;
  charsTemplate: string;
  privacyNote: string;
  viewSkill: string;
};

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

function formatInstalls(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

export function SkillsBrowseTool(messages: Messages) {
  const searchId = useId();

  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [results, setResults] = useState<SkillResult[]>([]);
  const [selected, setSelected] = useState<SkillResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [global, setGlobal] = useState(false);
  const [agents, setAgents] = useState<Agent[]>(['claude-code']);
  const [yes, setYes] = useState(true);
  const [copy, setCopy] = useState(false);
  const [fullDepth, setFullDepth] = useState(false);
  const [style, setStyle] = useState<OutputStyle>('multiline');

  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const h = window.setTimeout(() => setDebouncedQuery(query.trim()), 300);
    return () => window.clearTimeout(h);
  }, [query]);

  useEffect(() => {
    abortRef.current?.abort();
    if (debouncedQuery.length < 2) {
      setResults([]);
      setLoading(false);
      setError(null);
      return;
    }
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setLoading(true);
    setError(null);
    fetch(`/api/skills-search?q=${encodeURIComponent(debouncedQuery)}&limit=50`, {
      signal: ctrl.signal,
    })
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return (await r.json()) as SearchResponse;
      })
      .then((data) => {
        if (ctrl.signal.aborted) return;
        setResults(Array.isArray(data.skills) ? data.skills : []);
        setLoading(false);
      })
      .catch((err) => {
        if (ctrl.signal.aborted || err?.name === 'AbortError') return;
        setError(messages.searchError);
        setLoading(false);
      });
    return () => ctrl.abort();
  }, [debouncedQuery, messages.searchError]);

  const opts: SkillsOptions = useMemo(
    () => ({ global, agents, yes, copy, fullDepth, style }),
    [global, agents, yes, copy, fullDepth, style],
  );

  const output = useMemo(() => buildOneLiner(toCommands(selected), opts), [selected, opts]);

  const isSelected = (s: SkillResult) => selected.some((x) => x.id === s.id);

  const toggleSkill = (s: SkillResult) => {
    setSelected((prev) =>
      prev.some((x) => x.id === s.id)
        ? prev.filter((x) => x.id !== s.id)
        : [...prev, s],
    );
  };

  const toggleAgent = (a: Agent) => {
    setAgents((prev) => {
      if (a === '*') return prev.includes('*') ? [] : ['*'];
      const without = prev.filter((x) => x !== '*');
      return without.includes(a)
        ? without.filter((x) => x !== a)
        : [...without, a];
    });
  };

  const onDownload = () => {
    if (!output) return;
    const content = output.endsWith('\n') ? output : `${output}\n`;
    downloadBlob(
      new Blob([`#!/usr/bin/env bash\nset -euo pipefail\n\n${content}`], { type: 'application/x-sh' }),
      'install-skills.sh',
    );
  };

  return (
    <div className="flex flex-col gap-4">
      <fieldset className="flex flex-wrap items-center gap-2">
        <legend className="px-1 pb-1 text-xs text-text-muted">{messages.agentsLabel}</legend>
        {AGENTS.map((a) => {
          const active = agents.includes(a);
          return (
            <label key={a} className={chipClass(active)}>
              <input type="checkbox" checked={active} onChange={() => toggleAgent(a)} className="sr-only" />
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
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="flex flex-col gap-2">
          <label htmlFor={searchId} className="text-xs text-text-muted">{messages.searchLabel}</label>
          <input
            id={searchId}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={messages.searchPlaceholder}
            autoComplete="off"
            spellCheck={false}
            className="rounded-md border border-border bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-faint hover:border-border-strong focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30 transition-colors"
          />
          <p className="text-[11px] text-text-faint">{messages.privacyNote}</p>

          <Card className="flex max-h-[26rem] min-h-[18rem] flex-col overflow-y-auto px-1 py-1">
            {loading ? (
              <div className="flex h-full min-h-[16rem] items-center justify-center text-sm text-text-faint">
                {messages.loading}
              </div>
            ) : error ? (
              <div role="alert" className="flex h-full min-h-[16rem] items-center justify-center px-3 text-sm text-text-muted">
                {error}
              </div>
            ) : debouncedQuery.length < 2 ? (
              <div className="flex h-full min-h-[16rem] items-center justify-center px-3 text-center text-sm text-text-faint">
                {messages.searchHint}
              </div>
            ) : results.length === 0 ? (
              <div className="flex h-full min-h-[16rem] items-center justify-center text-sm text-text-faint">
                {messages.noResults}
              </div>
            ) : (
              <ul className="flex flex-col">
                {results.map((s) => {
                  const checked = isSelected(s);
                  return (
                    <li
                      key={s.id}
                      className={`group flex items-center gap-2 rounded-md px-2 py-2 text-sm transition-colors ${
                        checked ? 'bg-surface-hover' : 'hover:bg-surface-hover'
                      }`}
                    >
                      <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-3">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleSkill(s)}
                          className="size-4 accent-accent"
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-mono text-sm text-text-primary">{s.name}</span>
                          <span className="block truncate text-xs text-text-faint">{s.source}</span>
                        </span>
                        <span className="shrink-0 font-mono text-xs text-text-muted">
                          {tpl(messages.installsTemplate, { n: formatInstalls(s.installs) })}
                        </span>
                      </label>
                      <a
                        href={`https://skills.sh/${s.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="shrink-0 rounded-md border border-border bg-surface px-2 py-1 text-xs text-text-muted opacity-0 transition-opacity hover:border-border-strong hover:bg-surface-hover hover:text-text-primary focus-visible:opacity-100 group-hover:opacity-100"
                        title={`skills.sh/${s.id}`}
                      >
                        {messages.viewSkill}
                      </a>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex items-baseline justify-between">
            <label className="text-xs text-text-muted">{messages.selectedLabel}</label>
            <span className="flex items-center gap-2">
              <span className="font-mono text-xs text-text-faint">
                {tpl(messages.commandsTemplate, { n: selected.length })}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelected([])}
                disabled={selected.length === 0}
                type="button"
              >
                {messages.clearSelected}
              </Button>
            </span>
          </div>
          {selected.length === 0 ? (
            <Card className="flex min-h-[6rem] items-center justify-center px-3 py-2 text-sm text-text-faint">
              {messages.selectedEmpty}
            </Card>
          ) : (
            <Card className="flex flex-wrap gap-1.5 px-2 py-2">
              {selected.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => toggleSkill(s)}
                  className="flex items-center gap-1.5 rounded-md border border-border bg-surface px-2 py-1 font-mono text-xs text-text-primary transition-colors hover:border-border-strong hover:bg-surface-hover"
                  title={s.source}
                >
                  <span>{s.name}</span>
                  <span aria-hidden className="text-text-faint">×</span>
                </button>
              ))}
            </Card>
          )}

          <div className="flex items-baseline justify-between pt-2">
            <label className="text-xs text-text-muted">{messages.outputLabel}</label>
            <span className="font-mono text-xs text-text-faint">
              {output ? tpl(messages.charsTemplate, { n: [...output].length }) : ''}
            </span>
          </div>
          {output ? (
            <Card className="min-h-[12rem] whitespace-pre-wrap break-all px-3 py-2 font-mono text-sm text-text-primary">{output}</Card>
          ) : (
            <Card className="flex min-h-[12rem] items-center justify-center px-3 py-2 text-sm text-text-faint">{messages.empty}</Card>
          )}

          <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
            <CopyButton text={output} copyLabel={messages.copy} copiedLabel={messages.copied} disabled={!output} />
            <Button size="sm" onClick={onDownload} disabled={!output} type="button">{messages.download}</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
