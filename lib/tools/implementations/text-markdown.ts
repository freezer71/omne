function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderInline(text: string): string {
  let out = escapeHtml(text);
  out = out.replace(/`([^`]+)`/g, (_, c: string) => `<code>${c}</code>`);
  out = out.replace(/!\[([^\]]*)\]\(([^)\s]+)(?:\s+"([^"]*)")?\)/g, (_, alt: string, url: string) => `<img src="${url}" alt="${alt}" />`);
  out = out.replace(/\[([^\]]+)\]\(([^)\s]+)(?:\s+"([^"]*)")?\)/g, (_, label: string, url: string) => `<a href="${url}" rel="noopener noreferrer">${label}</a>`);
  out = out.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  out = out.replace(/__([^_]+)__/g, '<strong>$1</strong>');
  out = out.replace(/(^|[^*])\*([^*]+)\*/g, '$1<em>$2</em>');
  out = out.replace(/(^|[^_])_([^_]+)_/g, '$1<em>$2</em>');
  out = out.replace(/~~([^~]+)~~/g, '<del>$1</del>');
  return out;
}

function renderTable(rows: string[]): string {
  if (rows.length < 2) return '';
  const firstRow = rows[0] ?? '';
  const header = firstRow.slice(1, -1).split('|').map((c) => c.trim());
  const body = rows.slice(2).map((r) => r.slice(1, -1).split('|').map((c) => c.trim()));
  const thead = `<thead><tr>${header.map((h) => `<th>${renderInline(h)}</th>`).join('')}</tr></thead>`;
  const tbody = `<tbody>${body.map((row) => `<tr>${row.map((c) => `<td>${renderInline(c)}</td>`).join('')}</tr>`).join('')}</tbody>`;
  return `<table>${thead}${tbody}</table>`;
}

export function renderMarkdown(source: string): string {
  if (!source) return '';
  const lines = source.replace(/\r\n/g, '\n').split('\n');
  const html: string[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i] ?? '';

    if (line.startsWith('```')) {
      const lang = line.slice(3).trim();
      const code: string[] = [];
      i++;
      while (i < lines.length && !(lines[i] ?? '').startsWith('```')) {
        code.push(lines[i] ?? '');
        i++;
      }
      i++;
      const langClass = lang ? ` class="language-${escapeHtml(lang)}"` : '';
      html.push(`<pre><code${langClass}>${escapeHtml(code.join('\n'))}</code></pre>`);
      continue;
    }

    const heading = line.match(/^(#{1,6})\s+(.+)$/);
    if (heading) {
      const hashes = heading[1] ?? '#';
      const text = heading[2] ?? '';
      const level = hashes.length;
      html.push(`<h${level}>${renderInline(text)}</h${level}>`);
      i++;
      continue;
    }

    if (/^[-*_]{3,}\s*$/.test(line)) {
      html.push('<hr />');
      i++;
      continue;
    }

    if (line.startsWith('>')) {
      const quoteLines: string[] = [];
      while (i < lines.length && (lines[i] ?? '').startsWith('>')) {
        quoteLines.push((lines[i] ?? '').replace(/^>\s?/, ''));
        i++;
      }
      html.push(`<blockquote>${renderMarkdown(quoteLines.join('\n'))}</blockquote>`);
      continue;
    }

    const ulMatch = line.match(/^[*-]\s+(.+)$/);
    if (ulMatch) {
      const items: string[] = [];
      while (i < lines.length) {
        const m = (lines[i] ?? '').match(/^[*-]\s+(.+)$/);
        if (!m) break;
        items.push(`<li>${renderInline(m[1] ?? '')}</li>`);
        i++;
      }
      html.push(`<ul>${items.join('')}</ul>`);
      continue;
    }

    const olMatch = line.match(/^\d+\.\s+(.+)$/);
    if (olMatch) {
      const items: string[] = [];
      while (i < lines.length) {
        const m = (lines[i] ?? '').match(/^\d+\.\s+(.+)$/);
        if (!m) break;
        items.push(`<li>${renderInline(m[1] ?? '')}</li>`);
        i++;
      }
      html.push(`<ol>${items.join('')}</ol>`);
      continue;
    }

    if (/^\|.*\|$/.test(line) && i + 1 < lines.length && /^\|[\s:\-|]+\|$/.test(lines[i + 1] ?? '')) {
      const tableRows: string[] = [];
      while (i < lines.length && /^\|.*\|$/.test(lines[i] ?? '')) {
        tableRows.push(lines[i] ?? '');
        i++;
      }
      html.push(renderTable(tableRows));
      continue;
    }

    if (line.trim() === '') {
      i++;
      continue;
    }

    const paragraph: string[] = [];
    while (i < lines.length && (lines[i] ?? '').trim() !== '' && !((lines[i] ?? '').match(/^(#{1,6}\s|>|\d+\.\s|[*-]\s|\|.*\||```|[-*_]{3,}\s*$)/))) {
      paragraph.push(lines[i] ?? '');
      i++;
    }
    if (paragraph.length > 0) {
      html.push(`<p>${renderInline(paragraph.join('\n'))}</p>`);
    }
  }

  return html.join('\n');
}
