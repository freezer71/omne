'use client';

import { useId, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/cn';
import { tpl } from '@/lib/tpl';
import type { JsonValue } from '@/lib/json/types';

type SortDir = 'asc' | 'desc';

type Messages = {
  searchPlaceholder: string;
  filterPlaceholder: string;
  prev: string;
  next: string;
  pageTemplate: string;
  rowsTemplate: string;
  empty: string;
};

type Props = {
  columns: string[];
  rows: Array<Record<string, JsonValue>>;
  messages: Messages;
  pageSize?: number;
  className?: string;
};

export function JsonTable({ columns, rows, messages, pageSize = 50, className }: Props) {
  const searchId = useId();
  const [sort, setSort] = useState<{ col: string; dir: SortDir } | null>(null);
  const [search, setSearch] = useState('');
  const [colFilters, setColFilters] = useState<Record<string, string>>({});
  const [page, setPage] = useState(0);

  const filtered = useMemo(() => {
    let r = rows;
    const q = search.trim().toLowerCase();
    if (q) {
      r = r.filter((row) => columns.some((c) => formatCell(row[c]).toLowerCase().includes(q)));
    }
    for (const [col, f] of Object.entries(colFilters)) {
      if (f) {
        const lf = f.toLowerCase();
        r = r.filter((row) => formatCell(row[col]).toLowerCase().includes(lf));
      }
    }
    return r;
  }, [rows, columns, search, colFilters]);

  const sorted = useMemo(() => {
    if (!sort) return filtered;
    const { col, dir } = sort;
    const factor: 1 | -1 = dir === 'asc' ? 1 : -1;
    return [...filtered].sort((a, b) => compareCells(a[col], b[col]) * factor);
  }, [filtered, sort]);

  const total = sorted.length;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, pageCount - 1);
  const start = safePage * pageSize;
  const visible = sorted.slice(start, start + pageSize);

  const toggleSort = (col: string) => {
    setSort((prev) => {
      if (!prev || prev.col !== col) return { col, dir: 'asc' };
      if (prev.dir === 'asc') return { col, dir: 'desc' };
      return null;
    });
  };

  return (
    <div className={cn('flex flex-col gap-3', className)}>
      <div className="flex flex-wrap items-center gap-3">
        <input
          id={searchId}
          type="search"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(0);
          }}
          placeholder={messages.searchPlaceholder}
          className="h-9 flex-1 min-w-[14rem] rounded-md border border-border bg-surface px-3 text-sm text-text-primary placeholder:text-text-faint focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
        />
        <span className="font-mono text-xs text-text-faint">
          {tpl(messages.rowsTemplate, { visible: visible.length, total })}
        </span>
      </div>

      <div className="overflow-x-auto rounded-md border border-border">
        <table className="w-full border-collapse text-xs">
          <thead className="bg-surface-hover">
            <tr>
              {columns.map((col) => {
                const isSorted = sort?.col === col;
                return (
                  <th
                    key={col}
                    scope="col"
                    className="border-b border-border px-3 py-2 text-left font-medium text-text-muted"
                  >
                    <button
                      type="button"
                      onClick={() => toggleSort(col)}
                      className="flex items-center gap-1 text-left text-text-primary hover:text-accent"
                    >
                      <span className="font-mono">{col}</span>
                      <span aria-hidden className="text-text-faint">
                        {isSorted ? (sort?.dir === 'asc' ? '▲' : '▼') : '⇅'}
                      </span>
                    </button>
                  </th>
                );
              })}
            </tr>
            <tr>
              {columns.map((col) => (
                <th key={col} className="border-b border-border bg-surface px-3 py-1.5">
                  <input
                    type="search"
                    aria-label={`${messages.filterPlaceholder} ${col}`}
                    value={colFilters[col] ?? ''}
                    onChange={(e) => {
                      setColFilters((f) => ({ ...f, [col]: e.target.value }));
                      setPage(0);
                    }}
                    placeholder={messages.filterPlaceholder}
                    className="h-7 w-full min-w-[6rem] rounded-md border border-border bg-surface-hover px-2 font-mono text-xs text-text-primary placeholder:text-text-faint focus:border-accent focus:outline-none"
                  />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visible.length === 0 ? (
              <tr>
                <td
                  colSpan={Math.max(1, columns.length)}
                  className="px-3 py-6 text-center text-sm text-text-faint"
                >
                  {messages.empty}
                </td>
              </tr>
            ) : (
              visible.map((row, i) => (
                <tr key={start + i} className="hover:bg-surface-hover">
                  {columns.map((col) => (
                    <td
                      key={col}
                      className="border-b border-border/60 px-3 py-1.5 align-top font-mono text-text-primary"
                    >
                      {renderCell(row[col])}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-end gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setPage((p) => Math.max(0, p - 1))}
          disabled={safePage === 0}
          type="button"
        >
          {messages.prev}
        </Button>
        <span className="font-mono text-xs text-text-faint">
          {tpl(messages.pageTemplate, { page: safePage + 1, total: pageCount })}
        </span>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
          disabled={safePage >= pageCount - 1}
          type="button"
        >
          {messages.next}
        </Button>
      </div>
    </div>
  );
}

function formatCell(value: JsonValue | undefined): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return JSON.stringify(value);
}

function renderCell(value: JsonValue | undefined): React.ReactNode {
  if (value === null) return <span className="text-text-faint">null</span>;
  if (value === undefined) return <span className="text-text-faint">—</span>;
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return <span className="text-emerald-700 dark:text-emerald-300">{value}</span>;
  if (typeof value === 'boolean') return <span className="text-amber-600 dark:text-amber-400">{String(value)}</span>;
  if (Array.isArray(value)) return <span className="text-text-muted">[{value.length}]</span>;
  return <span className="text-text-muted">{`{${Object.keys(value).length}}`}</span>;
}

function compareCells(a: JsonValue | undefined, b: JsonValue | undefined): number {
  if (a === b) return 0;
  if (a === null || a === undefined) return 1;
  if (b === null || b === undefined) return -1;
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  if (typeof a === 'boolean' && typeof b === 'boolean') return a === b ? 0 : a ? -1 : 1;
  return String(formatCell(a)).localeCompare(String(formatCell(b)));
}
