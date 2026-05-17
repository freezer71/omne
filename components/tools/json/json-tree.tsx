'use client';

import { useMemo, useState } from 'react';
import { cn } from '@/lib/cn';
import type { JsonValue } from '@/lib/json/types';

export type Highlight = 'add' | 'del' | 'change' | 'same' | null;

type Messages = {
  emptyObject: string;
  emptyArray: string;
  copyPath: string;
  copyValue: string;
};

type Props = {
  value: JsonValue;
  rootPath?: string;
  searchQuery?: string;
  highlight?: (path: string) => Highlight;
  onCopyPath?: (path: string) => void;
  onCopyValue?: (value: JsonValue) => void;
  initiallyExpandedToDepth?: number;
  showCopyButtons?: boolean;
  messages?: Partial<Messages>;
  className?: string;
};

const DEFAULTS: Messages = {
  emptyObject: '{}',
  emptyArray: '[]',
  copyPath: 'Copy path',
  copyValue: 'Copy value',
};

export function JsonTree({
  value,
  rootPath = '$',
  searchQuery,
  highlight,
  onCopyPath,
  onCopyValue,
  initiallyExpandedToDepth = 2,
  showCopyButtons = false,
  messages,
  className,
}: Props) {
  const m: Messages = { ...DEFAULTS, ...(messages ?? {}) };
  const matcher = useMemo(() => buildMatcher(searchQuery), [searchQuery]);

  return (
    <div
      className={cn(
        'rounded-md border border-border bg-surface p-3 font-mono text-xs leading-relaxed',
        className,
      )}
    >
      <Node
        value={value}
        path={rootPath}
        depth={0}
        initialDepth={initiallyExpandedToDepth}
        matcher={matcher}
        highlight={highlight}
        onCopyPath={onCopyPath}
        onCopyValue={onCopyValue}
        showCopyButtons={showCopyButtons}
        m={m}
      />
    </div>
  );
}

type NodeProps = {
  value: JsonValue;
  path: string;
  depth: number;
  initialDepth: number;
  matcher: (text: string) => boolean;
  highlight?: ((path: string) => Highlight) | undefined;
  onCopyPath?: ((path: string) => void) | undefined;
  onCopyValue?: ((value: JsonValue) => void) | undefined;
  showCopyButtons: boolean;
  m: Messages;
  parentKey?: string | number | undefined;
};

function Node({
  value,
  path,
  depth,
  initialDepth,
  matcher,
  highlight,
  onCopyPath,
  onCopyValue,
  showCopyButtons,
  m,
  parentKey,
}: NodeProps) {
  const hl = highlight?.(path) ?? null;
  const wrapperCls = highlightClass(hl);

  if (value === null) {
    return (
      <Leaf
        path={path}
        keyLabel={parentKey}
        valueLabel={<span className="text-text-faint">null</span>}
        matcher={matcher}
        wrapperCls={wrapperCls}
        onCopyPath={onCopyPath}
        onCopyValue={() => onCopyValue?.(null)}
        showCopyButtons={showCopyButtons}
        m={m}
      />
    );
  }
  if (typeof value === 'boolean') {
    return (
      <Leaf
        path={path}
        keyLabel={parentKey}
        valueLabel={<span className="text-amber-600 dark:text-amber-400">{String(value)}</span>}
        matcher={matcher}
        wrapperCls={wrapperCls}
        onCopyPath={onCopyPath}
        onCopyValue={() => onCopyValue?.(value)}
        showCopyButtons={showCopyButtons}
        m={m}
      />
    );
  }
  if (typeof value === 'number') {
    return (
      <Leaf
        path={path}
        keyLabel={parentKey}
        valueLabel={<span className="text-emerald-700 dark:text-emerald-300">{value}</span>}
        matcher={matcher}
        wrapperCls={wrapperCls}
        onCopyPath={onCopyPath}
        onCopyValue={() => onCopyValue?.(value)}
        showCopyButtons={showCopyButtons}
        m={m}
      />
    );
  }
  if (typeof value === 'string') {
    return (
      <Leaf
        path={path}
        keyLabel={parentKey}
        valueLabel={
          <span className="text-sky-700 dark:text-sky-300">
            "{matcher(value) ? <mark className="bg-yellow-300/40 px-0.5">{value}</mark> : value}"
          </span>
        }
        matcher={matcher}
        wrapperCls={wrapperCls}
        onCopyPath={onCopyPath}
        onCopyValue={() => onCopyValue?.(value)}
        showCopyButtons={showCopyButtons}
        m={m}
      />
    );
  }

  const isArray = Array.isArray(value);
  const entries: Array<[string | number, JsonValue]> = isArray
    ? (value as JsonValue[]).map((v, i) => [i, v])
    : Object.entries(value as Record<string, JsonValue>);

  return (
    <CollapsibleNode
      path={path}
      keyLabel={parentKey}
      isArray={isArray}
      entries={entries}
      depth={depth}
      initialDepth={initialDepth}
      matcher={matcher}
      highlight={highlight}
      onCopyPath={onCopyPath}
      onCopyValue={onCopyValue}
      showCopyButtons={showCopyButtons}
      m={m}
      wrapperCls={wrapperCls}
      fullValue={value}
    />
  );
}

type LeafProps = {
  path: string;
  keyLabel?: string | number | undefined;
  valueLabel: React.ReactNode;
  matcher: (text: string) => boolean;
  wrapperCls: string;
  onCopyPath?: ((path: string) => void) | undefined;
  onCopyValue?: (() => void) | undefined;
  showCopyButtons: boolean;
  m: Messages;
};

function Leaf({
  path,
  keyLabel,
  valueLabel,
  matcher,
  wrapperCls,
  onCopyPath,
  onCopyValue,
  showCopyButtons,
  m,
}: LeafProps) {
  const keyHit = typeof keyLabel === 'string' && matcher(keyLabel);
  return (
    <div className={cn('group flex items-baseline gap-1 rounded px-1', wrapperCls)}>
      {keyLabel !== undefined ? (
        <span className={cn('text-text-muted', keyHit && 'bg-yellow-300/40')}>
          {typeof keyLabel === 'number' ? keyLabel : `"${keyLabel}"`}:
        </span>
      ) : null}
      <span>{valueLabel}</span>
      {showCopyButtons ? (
        <span className="ml-2 hidden gap-1 text-text-faint opacity-0 group-hover:flex group-hover:opacity-100">
          {onCopyPath ? (
            <button
              type="button"
              onClick={() => onCopyPath(path)}
              className="rounded px-1.5 py-0.5 hover:bg-surface-hover"
              title={m.copyPath}
            >
              ⎘
            </button>
          ) : null}
          {onCopyValue ? (
            <button
              type="button"
              onClick={() => onCopyValue()}
              className="rounded px-1.5 py-0.5 hover:bg-surface-hover"
              title={m.copyValue}
            >
              ⊕
            </button>
          ) : null}
        </span>
      ) : null}
    </div>
  );
}

type CollapsibleProps = {
  path: string;
  keyLabel?: string | number | undefined;
  isArray: boolean;
  entries: Array<[string | number, JsonValue]>;
  depth: number;
  initialDepth: number;
  matcher: (text: string) => boolean;
  highlight?: ((path: string) => Highlight) | undefined;
  onCopyPath?: ((path: string) => void) | undefined;
  onCopyValue?: ((value: JsonValue) => void) | undefined;
  showCopyButtons: boolean;
  m: Messages;
  wrapperCls: string;
  fullValue: JsonValue;
};

function CollapsibleNode({
  path,
  keyLabel,
  isArray,
  entries,
  depth,
  initialDepth,
  matcher,
  highlight,
  onCopyPath,
  onCopyValue,
  showCopyButtons,
  m,
  wrapperCls,
  fullValue,
}: CollapsibleProps) {
  const [expanded, setExpanded] = useState(depth < initialDepth);
  const count = entries.length;
  const empty = count === 0;
  const open = isArray ? '[' : '{';
  const close = isArray ? ']' : '}';
  const keyHit = typeof keyLabel === 'string' && matcher(keyLabel);

  return (
    <div className={cn('group rounded px-1', wrapperCls)}>
      <div className="flex items-baseline gap-1">
        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          disabled={empty}
          className={cn(
            'inline-flex h-4 w-4 items-center justify-center rounded text-text-faint',
            !empty && 'hover:bg-surface-hover',
            empty && 'opacity-30',
          )}
          aria-label={expanded ? 'Collapse' : 'Expand'}
          aria-expanded={expanded}
        >
          {empty ? '·' : expanded ? '▾' : '▸'}
        </button>
        {keyLabel !== undefined ? (
          <span className={cn('text-text-muted', keyHit && 'bg-yellow-300/40')}>
            {typeof keyLabel === 'number' ? keyLabel : `"${keyLabel}"`}:
          </span>
        ) : null}
        <span className="text-text-muted">
          {open}
          {empty ? close : ''}
        </span>
        {!empty ? (
          <span className="text-text-faint">
            {count} {isArray ? (count === 1 ? 'item' : 'items') : count === 1 ? 'key' : 'keys'}
          </span>
        ) : null}
        {!empty && !expanded ? <span className="text-text-muted">{close}</span> : null}
        {showCopyButtons ? (
          <span className="ml-2 hidden gap-1 text-text-faint opacity-0 group-hover:flex group-hover:opacity-100">
            {onCopyPath ? (
              <button
                type="button"
                onClick={() => onCopyPath(path)}
                className="rounded px-1.5 py-0.5 hover:bg-surface-hover"
                title={m.copyPath}
              >
                ⎘
              </button>
            ) : null}
            {onCopyValue ? (
              <button
                type="button"
                onClick={() => onCopyValue(fullValue)}
                className="rounded px-1.5 py-0.5 hover:bg-surface-hover"
                title={m.copyValue}
              >
                ⊕
              </button>
            ) : null}
          </span>
        ) : null}
      </div>
      {expanded && !empty ? (
        <>
          <div className="ml-4 border-l border-border/60 pl-3">
            {entries.map(([k, v]) => (
              <Node
                key={String(k)}
                value={v}
                path={isArray ? `${path}[${k}]` : `${path}.${k}`}
                depth={depth + 1}
                initialDepth={initialDepth}
                matcher={matcher}
                highlight={highlight}
                onCopyPath={onCopyPath}
                onCopyValue={onCopyValue}
                showCopyButtons={showCopyButtons}
                m={m}
                parentKey={k}
              />
            ))}
          </div>
          <div className="text-text-muted">{close}</div>
        </>
      ) : null}
    </div>
  );
}

function highlightClass(hl: Highlight): string {
  switch (hl) {
    case 'add':
      return 'bg-emerald-500/10 border-l-2 border-emerald-500/40';
    case 'del':
      return 'bg-danger/10 border-l-2 border-danger/40';
    case 'change':
      return 'bg-amber-500/10 border-l-2 border-amber-500/40';
    default:
      return '';
  }
}

function buildMatcher(query?: string): (text: string) => boolean {
  if (!query || !query.trim()) return () => false;
  const lower = query.toLowerCase();
  return (text: string) => text.toLowerCase().includes(lower);
}
