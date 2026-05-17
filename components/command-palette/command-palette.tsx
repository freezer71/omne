'use client';

import { Command } from 'cmdk';
import * as RadixDialog from '@radix-ui/react-dialog';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { usePalette } from './palette-context';
import { normalizeForSearch, type SearchableTool } from '@/lib/tools/search';
import type { Locale } from '@/lib/i18n/config';
import type { ToolCategory } from '@/lib/tools/types';

type PaletteMessages = {
  placeholder: string;
  empty: string;
};

type Props = {
  locale: Locale;
  tools: readonly SearchableTool[];
  categoryOrder: readonly ToolCategory[];
  categoryLabels: Record<ToolCategory, string>;
  messages: PaletteMessages;
};

function paletteFilter(value: string, search: string, keywords?: string[]): number {
  const q = normalizeForSearch(search.trim());
  if (!q) return 1;
  const haystack = normalizeForSearch(`${value} ${(keywords ?? []).join(' ')}`);
  const terms = q.split(/\s+/);
  return terms.every((term) => haystack.includes(term)) ? 1 : 0;
}

export function CommandPalette({
  locale,
  tools,
  categoryOrder,
  categoryLabels,
  messages,
}: Props) {
  const router = useRouter();
  const { open, setOpen, toggle } = usePalette();

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

  const grouped = categoryOrder
    .map((cat) => ({ cat, items: tools.filter((t) => t.category === cat) }))
    .filter((g) => g.items.length > 0);

  return (
    <Command.Dialog
      open={open}
      onOpenChange={setOpen}
      label={messages.placeholder}
      filter={paletteFilter}
      loop
      overlayClassName="fixed inset-0 z-40 bg-bg/70 backdrop-blur-sm data-[state=open]:animate-in data-[state=open]:fade-in-0"
      contentClassName="fixed left-1/2 top-[15vh] z-50 w-[min(640px,100vw-2rem)] -translate-x-1/2 overflow-hidden rounded-xl border border-border bg-surface-elevated shadow-2xl outline-none"
    >
      <RadixDialog.Title className="sr-only">{messages.placeholder}</RadixDialog.Title>
      <RadixDialog.Description className="sr-only">{messages.placeholder}</RadixDialog.Description>
      <div className="border-b border-border px-2">
        <Command.Input
          placeholder={messages.placeholder}
          className="h-12 w-full bg-transparent px-3 text-sm text-text-primary placeholder:text-text-faint outline-none"
        />
      </div>
      <Command.List className="max-h-[60vh] overflow-y-auto overscroll-contain p-2">
        <Command.Empty className="px-3 py-6 text-center text-sm text-text-muted">
          {messages.empty}
        </Command.Empty>
        {grouped.map(({ cat, items }) => (
          <Command.Group
            key={cat}
            heading={categoryLabels[cat]}
            className="px-1 pb-2 text-xs uppercase tracking-wider text-text-faint [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-2"
          >
            {items.map((tool) => {
              const isSoon = tool.status === 'soon';
              return (
                <Command.Item
                  key={`${tool.category}/${tool.id}`}
                  value={`${tool.name} ${tool.description}`}
                  keywords={[...tool.keywords, tool.category, tool.id]}
                  disabled={isSoon}
                  onSelect={() => {
                    if (isSoon) return;
                    setOpen(false);
                    router.push(`/${locale}${tool.href}`);
                  }}
                  className="flex cursor-pointer flex-col gap-0.5 rounded-md px-3 py-2 text-sm text-text-primary aria-selected:bg-surface-hover data-[disabled=true]:cursor-not-allowed data-[disabled=true]:opacity-50"
                >
                  <span className="truncate font-medium normal-case tracking-normal">{tool.name}</span>
                  <span className="truncate text-xs text-text-muted normal-case tracking-normal">
                    {tool.description}
                  </span>
                </Command.Item>
              );
            })}
          </Command.Group>
        ))}
      </Command.List>
    </Command.Dialog>
  );
}
