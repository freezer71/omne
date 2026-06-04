'use client';

import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { downloadBlob } from '@/lib/file-utils';
import { tpl } from '@/lib/tpl';
import { CopyButton } from '@/components/tools/json/copy-button';
import {
  AGENTS,
  SHELLS,
  SCRIPT_EXTENSIONS,
  buildOneLiner,
  buildScript,
  type Agent,
  type OutputStyle,
  type Shell,
  type SkillsOptions,
} from '@/lib/tools/implementations/skills';
import {
  toCommands,
  type SearchResponse,
  type SkillResult,
} from '@/lib/tools/implementations/skills-browse';
import {
  FEED_TYPES,
  type FeedResponse,
  type FeedSkill,
  type FeedType,
} from '@/lib/tools/implementations/skills-feed';

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
  shellLabel: string;
  shellBash: string;
  shellPowershell: string;
  shellCmd: string;
  outputLabel: string;
  copy: string;
  copied: string;
  download: string;
  empty: string;
  commandsTemplate: string;
  charsTemplate: string;
  privacyNote: string;
  viewSkill: string;
  discoverHint: string;
  tabAllTime: string;
  tabTrending: string;
  tabHot: string;
  feedLoading: string;
  feedError: string;
  feedRetry: string;
  installsYesterdayTemplate: string;
  changeTemplate: string;
  officialBadge: string;
};

function tabLabel(t: FeedType, m: Messages): string {
  switch (t) {
    case 'all-time': return m.tabAllTime;
    case 'trending': return m.tabTrending;
    case 'hot': return m.tabHot;
  }
}

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

function shellLabel(shell: Shell, m: Messages): string {
  switch (shell) {
    case 'bash': return m.shellBash;
    case 'powershell': return m.shellPowershell;
    case 'cmd': return m.shellCmd;
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
  const [shell, setShell] = useState<Shell>('bash');

  const [feedType, setFeedType] = useState<FeedType>('all-time');
  const [feedSkills, setFeedSkills] = useState<FeedSkill[]>([]);
  const [feedLoading, setFeedLoading] = useState(false);
  const [feedError, setFeedError] = useState<string | null>(null);
  const [feedRetryCount, setFeedRetryCount] = useState(0);

  const abortRef = useRef<AbortController | null>(null);
  const feedAbortRef = useRef<AbortController | null>(null);
  const tabRefs = useRef<Partial<Record<FeedType, HTMLButtonElement | null>>>({});
  const showDiscover = debouncedQuery.length < 2;

  const onTabsKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight' && e.key !== 'Home' && e.key !== 'End') return;
    e.preventDefault();
    const idx = FEED_TYPES.indexOf(feedType);
    let next = idx;
    if (e.key === 'ArrowLeft') next = (idx - 1 + FEED_TYPES.length) % FEED_TYPES.length;
    else if (e.key === 'ArrowRight') next = (idx + 1) % FEED_TYPES.length;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = FEED_TYPES.length - 1;
    const nextType = FEED_TYPES[next]!;
    setFeedType(nextType);
    requestAnimationFrame(() => tabRefs.current[nextType]?.focus());
  };

  useEffect(() => {
    const h = window.setTimeout(() => setDebouncedQuery(query.trim()), 300);
    return () => window.clearTimeout(h);
  }, [query]);

  // Reset search state synchronously when the debounced query changes —
  // either clearing results (query too short) or flipping into the loading
  // state before the fetch effect runs. Render-phase tracked state replaces
  // the inline setState-in-effect branches.
  const [trackedDebouncedQuery, setTrackedDebouncedQuery] = useState<string>(debouncedQuery);
  if (trackedDebouncedQuery !== debouncedQuery) {
    setTrackedDebouncedQuery(debouncedQuery);
    if (debouncedQuery.length < 2) {
      setResults([]);
      setLoading(false);
      setError(null);
    } else {
      setLoading(true);
      setError(null);
    }
  }

  useEffect(() => {
    abortRef.current?.abort();
    if (debouncedQuery.length < 2) return;
    const ctrl = new AbortController();
    abortRef.current = ctrl;
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

  // Same pattern for the discover feed: when the tab/retry/visibility
  // changes, set the loading/error state during render, then run the fetch
  // in a clean useEffect.
  const feedKey = `${showDiscover ? '1' : '0'}|${feedType}|${feedRetryCount}`;
  const [trackedFeedKey, setTrackedFeedKey] = useState<string>(feedKey);
  if (trackedFeedKey !== feedKey) {
    setTrackedFeedKey(feedKey);
    if (!showDiscover) {
      setFeedLoading(false);
    } else {
      setFeedLoading(true);
      setFeedError(null);
    }
  }

  useEffect(() => {
    feedAbortRef.current?.abort();
    if (!showDiscover) return;
    const ctrl = new AbortController();
    feedAbortRef.current = ctrl;
    fetch(`/api/skills-feed?type=${encodeURIComponent(feedType)}`, {
      signal: ctrl.signal,
    })
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return (await r.json()) as FeedResponse;
      })
      .then((data) => {
        if (ctrl.signal.aborted) return;
        setFeedSkills(Array.isArray(data.skills) ? data.skills : []);
        setFeedLoading(false);
      })
      .catch((err) => {
        if (ctrl.signal.aborted || err?.name === 'AbortError') return;
        setFeedSkills([]);
        setFeedError(messages.feedError);
        setFeedLoading(false);
      });
    return () => ctrl.abort();
  }, [showDiscover, feedType, feedRetryCount, messages.feedError]);

  const opts: SkillsOptions = useMemo(
    () => ({ global, agents, yes, copy, fullDepth, style, shell }),
    [global, agents, yes, copy, fullDepth, style, shell],
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
    const script = buildScript(toCommands(selected), opts);
    if (!script) return;
    downloadBlob(new Blob([script.content], { type: script.mime }), script.filename);
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

        <fieldset className="flex items-center gap-2 text-xs">
          <legend className="px-1 text-text-muted">{messages.shellLabel}</legend>
          {SHELLS.map((value) => (
            <label key={value} className={chipClass(shell === value)}>
              <input
                type="radio"
                name="shell"
                value={value}
                checked={shell === value}
                onChange={() => setShell(value)}
                className="sr-only"
              />
              {shellLabel(value, messages)}
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

          {showDiscover ? (
            <div
              role="tablist"
              aria-label={messages.discoverHint}
              className="flex flex-wrap gap-1"
              onKeyDown={onTabsKeyDown}
            >
              {FEED_TYPES.map((t) => {
                const active = feedType === t;
                return (
                  <button
                    key={t}
                    ref={(el) => {
                      tabRefs.current[t] = el;
                    }}
                    type="button"
                    role="tab"
                    id={`skills-feed-tab-${t}`}
                    aria-selected={active}
                    aria-controls="skills-feed-panel"
                    tabIndex={active ? 0 : -1}
                    onClick={() => setFeedType(t)}
                    className={`rounded-md border px-3 py-1.5 text-xs transition-colors ${
                      active
                        ? 'border-accent bg-surface-hover text-text-primary'
                        : 'border-border bg-surface text-text-muted hover:border-border-strong'
                    }`}
                  >
                    {tabLabel(t, messages)}
                  </button>
                );
              })}
            </div>
          ) : null}

          <Card
            id={showDiscover ? 'skills-feed-panel' : undefined}
            role={showDiscover ? 'tabpanel' : undefined}
            aria-labelledby={showDiscover ? `skills-feed-tab-${feedType}` : undefined}
            aria-live={showDiscover ? 'polite' : undefined}
            className="flex max-h-[26rem] min-h-[18rem] flex-col overflow-y-auto px-1 py-1"
          >
            {showDiscover ? (
              feedLoading ? (
                <div className="flex h-full min-h-[16rem] items-center justify-center text-sm text-text-faint">
                  {messages.feedLoading}
                </div>
              ) : feedError ? (
                <div role="alert" className="flex h-full min-h-[16rem] flex-col items-center justify-center gap-3 px-3 text-sm text-text-muted">
                  <span>{feedError}</span>
                  <Button
                    size="sm"
                    variant="ghost"
                    type="button"
                    onClick={() => setFeedRetryCount((n) => n + 1)}
                  >
                    {messages.feedRetry}
                  </Button>
                </div>
              ) : feedSkills.length === 0 ? (
                <div className="flex h-full min-h-[16rem] items-center justify-center text-sm text-text-faint">
                  {messages.noResults}
                </div>
              ) : (
                <ul className="flex flex-col">
                  {feedSkills.map((s) => {
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
                            <span className="flex items-center gap-2">
                              <span className="block truncate font-mono text-sm text-text-primary">{s.name}</span>
                              {s.isOfficial ? (
                                <span className="shrink-0 rounded border border-border bg-surface px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-text-muted">
                                  {messages.officialBadge}
                                </span>
                              ) : null}
                            </span>
                            <span className="block truncate text-xs text-text-faint">{s.source}</span>
                          </span>
                          <span className="flex shrink-0 flex-col items-end gap-0.5 font-mono text-xs text-text-muted">
                            <span>{tpl(messages.installsTemplate, { n: formatInstalls(s.installs) })}</span>
                            {feedType === 'hot' && typeof s.change === 'number' ? (
                              <span
                                aria-label={tpl(messages.changeTemplate, { n: formatInstalls(s.change) })}
                                className="text-[11px] text-accent"
                              >
                                +{formatInstalls(s.change)}
                              </span>
                            ) : null}
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
              )
            ) : loading ? (
              <div className="flex h-full min-h-[16rem] items-center justify-center text-sm text-text-faint">
                {messages.loading}
              </div>
            ) : error ? (
              <div role="alert" className="flex h-full min-h-[16rem] items-center justify-center px-3 text-sm text-text-muted">
                {error}
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
            <Card data-testid="skills-output" className="min-h-[12rem] whitespace-pre-wrap break-all px-3 py-2 font-mono text-sm text-text-primary">{output}</Card>
          ) : (
            <Card className="flex min-h-[12rem] items-center justify-center px-3 py-2 text-sm text-text-faint">{messages.empty}</Card>
          )}

          <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
            <CopyButton text={output} copyLabel={messages.copy} copiedLabel={messages.copied} disabled={!output} />
            <Button size="sm" onClick={onDownload} disabled={!output} type="button">
              {tpl(messages.download, { ext: SCRIPT_EXTENSIONS[shell] })}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
