'use client';

import { Command } from 'cmdk';
import * as RadixDialog from '@radix-ui/react-dialog';
import { useRouter } from 'next/navigation';
import { useCallback, useDeferredValue, useEffect, useMemo, useState } from 'react';
import { usePalette } from './palette-context';
import { CategoryIcon } from './category-icons';
import { PaletteQuickActions, type QuickActionLabels } from './palette-quick-actions';
import { HighlightedText } from '@/components/ui/highlighted-text';
import { useRecentTools } from '@/components/use-recent-tools';
import { normalizeForSearch, searchTools, type SearchableTool } from '@/lib/tools/search';
import { getMatchRanges } from '@/lib/tools/highlight';
import type { Locale } from '@/lib/i18n/config';
import type { ToolCategory } from '@/lib/tools/types';

export type PaletteMessages = {
  placeholder: string;
  empty: string;
  recent: string;
  results: string;
  quickActions: QuickActionLabels;
  badgeBeta: string;
  badgeSoon: string;
  hintNavigate: string;
  hintSelect: string;
  hintClose: string;
};

type Props = {
  locale: Locale;
  tools: readonly SearchableTool[];
  categoryOrder: readonly ToolCategory[];
  categoryLabels: Record<ToolCategory, string>;
  messages: PaletteMessages;
};

export function CommandPalette({
  locale,
  tools,
  categoryOrder,
  categoryLabels,
  messages,
}: Props) {
  const router = useRouter();
  const { open, setOpen, toggle } = usePalette();
  const [query, setQuery] = useState('');
  const recent = useRecentTools(5);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        toggle();
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [toggle]);

  const handleOpenChange = useCallback(
    (next: boolean) => {
      setOpen(next);
      if (!next) setQuery('');
    },
    [setOpen],
  );

  const deferredQuery = useDeferredValue(query);
  const trimmed = deferredQuery.trim();
  const hasQuery = trimmed.length > 0;

  const ranked = useMemo(() => searchTools(tools, trimmed), [tools, trimmed]);

  const rankMap = useMemo(() => {
    const m = new Map<string, number>();
    ranked.forEach((r) => m.set(`tool:${r.tool.category}/${r.tool.id}`, r.score));
    return m;
  }, [ranked]);

  const filter = useCallback(
    (value: string, search: string, keywords?: string[]) => {
      if (value.startsWith('tool:')) {
        return rankMap.get(value) ?? 0;
      }
      const q = normalizeForSearch(search.trim());
      if (!q) return 1;
      const haystack = normalizeForSearch(`${value} ${(keywords ?? []).join(' ')}`);
      return q.split(/\s+/).every((t) => haystack.includes(t)) ? 1 : 0;
    },
    [rankMap],
  );

  const toolByKey = useMemo(() => {
    const m = new Map<string, SearchableTool>();
    for (const t of tools) m.set(`${t.category}/${t.id}`, t);
    return m;
  }, [tools]);

  const recentTools = useMemo(() => {
    if (hasQuery) return [];
    return recent
      .map((e) => toolByKey.get(`${e.category}/${e.id}`))
      .filter((t): t is SearchableTool => Boolean(t));
  }, [recent, toolByKey, hasQuery]);

  const goTo = useCallback(
    (path: string) => {
      setOpen(false);
      router.push(path);
    },
    [router, setOpen],
  );

  const selectTool = useCallback(
    (tool: SearchableTool) => {
      if (tool.status === 'soon') return;
      goTo(`/${locale}${tool.href}`);
    },
    [goTo, locale],
  );

  const groupedTools = useMemo(() => {
    return categoryOrder
      .map((cat) => ({
        cat,
        items: ranked.filter((r) => r.tool.category === cat),
      }))
      .filter((g) => g.items.length > 0);
  }, [ranked, categoryOrder]);

  return (
    <Command.Dialog
      open={open}
      onOpenChange={handleOpenChange}
      label={messages.placeholder}
      filter={filter}
      loop
      shouldFilter
      overlayClassName="fixed inset-0 z-40 bg-bg/70 backdrop-blur-sm data-[state=open]:animate-in data-[state=open]:fade-in-0"
      contentClassName="fixed left-1/2 top-[12vh] z-50 flex w-[min(640px,100vw-2rem)] -translate-x-1/2 flex-col overflow-hidden rounded-xl border border-border bg-surface-elevated shadow-2xl outline-none"
    >
      <RadixDialog.Title className="sr-only">{messages.placeholder}</RadixDialog.Title>
      <RadixDialog.Description className="sr-only">{messages.placeholder}</RadixDialog.Description>

      <div className="flex items-center gap-2 border-b border-border px-3">
        <svg
          aria-hidden
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-4 w-4 shrink-0 text-text-faint"
        >
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" />
        </svg>
        <Command.Input
          placeholder={messages.placeholder}
          value={query}
          onValueChange={setQuery}
          className="h-12 w-full bg-transparent text-sm text-text-primary placeholder:text-text-faint outline-none"
        />
        <kbd className="hidden sm:inline-flex items-center rounded border border-border bg-surface px-1.5 py-0.5 font-mono text-[10px] text-text-faint">
          Esc
        </kbd>
      </div>

      <Command.List className="max-h-[60vh] overflow-y-auto overscroll-contain p-2">
        <Command.Empty className="px-3 py-8 text-center text-sm text-text-muted">
          {messages.empty}
        </Command.Empty>

        {recentTools.length > 0 ? (
          <Command.Group
            heading={messages.recent}
            className="px-1 pb-2 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-2 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:text-text-faint"
          >
            {recentTools.map((tool) => (
              <ToolItem
                key={`recent:${tool.category}/${tool.id}`}
                value={`recent:${tool.category}/${tool.id}`}
                tool={tool}
                onSelect={() => selectTool(tool)}
                badgeBeta={messages.badgeBeta}
                badgeSoon={messages.badgeSoon}
              />
            ))}
          </Command.Group>
        ) : null}

        <PaletteQuickActions
          locale={locale}
          labels={messages.quickActions}
          onAction={() => setOpen(false)}
          onNavigate={goTo}
        />

        {hasQuery ? (
          <Command.Group
            heading={messages.results}
            className="px-1 pb-2 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-2 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:text-text-faint"
          >
            {ranked.map((r) => (
              <ToolItem
                key={`tool:${r.tool.category}/${r.tool.id}`}
                value={`tool:${r.tool.category}/${r.tool.id}`}
                tool={r.tool}
                query={trimmed}
                onSelect={() => selectTool(r.tool)}
                badgeBeta={messages.badgeBeta}
                badgeSoon={messages.badgeSoon}
              />
            ))}
          </Command.Group>
        ) : (
          groupedTools.map(({ cat, items }) => (
            <Command.Group
              key={cat}
              heading={categoryLabels[cat]}
              className="px-1 pb-2 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-2 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:text-text-faint"
            >
              {items.map((r) => (
                <ToolItem
                  key={`tool:${r.tool.category}/${r.tool.id}`}
                  value={`tool:${r.tool.category}/${r.tool.id}`}
                  tool={r.tool}
                  onSelect={() => selectTool(r.tool)}
                  badgeBeta={messages.badgeBeta}
                  badgeSoon={messages.badgeSoon}
                />
              ))}
            </Command.Group>
          ))
        )}
      </Command.List>

      <div className="flex items-center justify-end gap-4 border-t border-border bg-surface px-3 py-2 text-[11px] text-text-faint">
        <HintKey keys={['↑', '↓']} label={messages.hintNavigate} />
        <HintKey keys={['↵']} label={messages.hintSelect} />
        <HintKey keys={['Esc']} label={messages.hintClose} />
      </div>
    </Command.Dialog>
  );
}

type ToolItemProps = {
  value: string;
  tool: SearchableTool;
  query?: string;
  onSelect: () => void;
  badgeBeta: string;
  badgeSoon: string;
};

function ToolItem({ value, tool, query, onSelect, badgeBeta, badgeSoon }: ToolItemProps) {
  const isSoon = tool.status === 'soon';
  const isBeta = tool.status === 'beta';
  const nameRanges = query ? getMatchRanges(tool.name, query) : [];
  const descRanges = query ? getMatchRanges(tool.description, query) : [];

  return (
    <Command.Item
      value={value}
      keywords={[...tool.keywords, tool.category, tool.id, tool.name]}
      disabled={isSoon}
      onSelect={onSelect}
      className="flex cursor-pointer items-center gap-3 rounded-md px-3 py-2 text-sm text-text-primary aria-selected:bg-surface-hover data-[disabled=true]:cursor-not-allowed data-[disabled=true]:opacity-50"
    >
      <CategoryIcon category={tool.category as ToolCategory} className="h-4 w-4 shrink-0 text-text-faint" />
      <div className="flex min-w-0 flex-1 flex-col">
        <HighlightedText
          text={tool.name}
          ranges={nameRanges}
          className="truncate font-medium normal-case tracking-normal"
        />
        <HighlightedText
          text={tool.description}
          ranges={descRanges}
          className="truncate text-xs text-text-muted normal-case tracking-normal"
        />
      </div>
      {isBeta ? (
        <span className="ml-auto rounded border border-border px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-text-faint">
          {badgeBeta}
        </span>
      ) : null}
      {isSoon ? (
        <span className="ml-auto rounded border border-border px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-text-faint">
          {badgeSoon}
        </span>
      ) : null}
    </Command.Item>
  );
}

function HintKey({ keys, label }: { keys: readonly string[]; label: string }) {
  return (
    <span className="inline-flex items-center gap-1">
      {keys.map((k) => (
        <kbd
          key={k}
          className="inline-flex h-4 min-w-4 items-center justify-center rounded border border-border bg-surface-elevated px-1 font-mono text-[10px] text-text-muted"
        >
          {k}
        </kbd>
      ))}
      <span>{label}</span>
    </span>
  );
}
