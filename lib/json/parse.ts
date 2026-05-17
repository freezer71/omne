import type { JsonValue, ParseResult } from './types';

export function safeParse(text: string): ParseResult {
  if (!text.trim()) {
    return { ok: false, line: 1, col: 1, position: 0, message: 'Empty input' };
  }

  try {
    const value = JSON.parse(text) as JsonValue;
    return { ok: true, value };
  } catch (err) {
    const raw = err instanceof Error ? err.message : 'Invalid JSON';
    const { pos: position, line, col } = locateError(text);
    return { ok: false, line, col, position, message: cleanMessage(raw) };
  }
}

type ScanState = { pos: number; line: number; col: number };

function locateError(text: string): ScanState {
  const state: ScanState = { pos: 0, line: 1, col: 1 };
  parseValue(text, state);
  skipWhitespace(text, state);
  return state;
}

function advance(text: string, state: ScanState, n = 1): void {
  for (let i = 0; i < n; i++) {
    if (state.pos >= text.length) return;
    if (text.charCodeAt(state.pos) === 10) {
      state.line++;
      state.col = 1;
    } else {
      state.col++;
    }
    state.pos++;
  }
}

function skipWhitespace(text: string, state: ScanState): void {
  while (state.pos < text.length) {
    const c = text.charCodeAt(state.pos);
    if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) {
      advance(text, state);
    } else {
      break;
    }
  }
}

function peek(text: string, state: ScanState): string {
  return text.charAt(state.pos);
}

function startsWithAt(text: string, state: ScanState, needle: string): boolean {
  return text.startsWith(needle, state.pos);
}

function parseValue(text: string, state: ScanState): boolean {
  skipWhitespace(text, state);
  if (state.pos >= text.length) return false;
  const c = peek(text, state);
  if (c === '{') return parseObject(text, state);
  if (c === '[') return parseArray(text, state);
  if (c === '"') return parseString(text, state);
  if (c === '-' || (c >= '0' && c <= '9')) return parseNumber(text, state);
  if (startsWithAt(text, state, 'true')) {
    advance(text, state, 4);
    return true;
  }
  if (startsWithAt(text, state, 'false')) {
    advance(text, state, 5);
    return true;
  }
  if (startsWithAt(text, state, 'null')) {
    advance(text, state, 4);
    return true;
  }
  return false;
}

function parseString(text: string, state: ScanState): boolean {
  advance(text, state);
  while (state.pos < text.length) {
    const c = peek(text, state);
    if (c === '"') {
      advance(text, state);
      return true;
    }
    if (c === '\\') {
      advance(text, state, 2);
    } else if (c === '\n') {
      return false;
    } else {
      advance(text, state);
    }
  }
  return false;
}

function parseNumber(text: string, state: ScanState): boolean {
  const start = state.pos;
  if (peek(text, state) === '-') advance(text, state);
  while (state.pos < text.length) {
    const c = peek(text, state);
    if ((c >= '0' && c <= '9') || c === '.' || c === 'e' || c === 'E' || c === '+' || c === '-') {
      advance(text, state);
    } else {
      break;
    }
  }
  return state.pos > start;
}

function parseObject(text: string, state: ScanState): boolean {
  advance(text, state);
  skipWhitespace(text, state);
  if (peek(text, state) === '}') {
    advance(text, state);
    return true;
  }
  while (state.pos < text.length) {
    skipWhitespace(text, state);
    if (peek(text, state) !== '"') return false;
    if (!parseString(text, state)) return false;
    skipWhitespace(text, state);
    if (peek(text, state) !== ':') return false;
    advance(text, state);
    skipWhitespace(text, state);
    if (!parseValue(text, state)) return false;
    skipWhitespace(text, state);
    const next = peek(text, state);
    if (next === ',') {
      advance(text, state);
      continue;
    }
    if (next === '}') {
      advance(text, state);
      return true;
    }
    return false;
  }
  return false;
}

function parseArray(text: string, state: ScanState): boolean {
  advance(text, state);
  skipWhitespace(text, state);
  if (peek(text, state) === ']') {
    advance(text, state);
    return true;
  }
  while (state.pos < text.length) {
    skipWhitespace(text, state);
    if (!parseValue(text, state)) return false;
    skipWhitespace(text, state);
    const next = peek(text, state);
    if (next === ',') {
      advance(text, state);
      continue;
    }
    if (next === ']') {
      advance(text, state);
      return true;
    }
    return false;
  }
  return false;
}

function cleanMessage(message: string): string {
  return message
    .replace(/\s+at position \d+.*$/i, '')
    .replace(/\s+at line \d+ column \d+.*$/i, '')
    .replace(/\s*\(line \d+ column \d+\).*$/i, '')
    .replace(/,?\s*".*"\s+is not valid JSON\s*$/i, '')
    .replace(/^JSON\.parse:\s*/i, '')
    .replace(/^JSON Parse error:\s*/i, '')
    .trim();
}
