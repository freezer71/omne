/** @vitest-environment jsdom */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  recordRecentTool,
  getRecentTools,
  clearRecentTools,
} from '@/lib/tools/recent';

describe('recent tools storage', () => {
  beforeEach(() => {
    clearRecentTools();
  });

  it('records a tool and reads it back', () => {
    recordRecentTool('pdf', 'merge');
    const recent = getRecentTools();
    expect(recent).toHaveLength(1);
    expect(recent[0]).toMatchObject({ category: 'pdf', id: 'merge' });
  });

  it('deduplicates and moves to top on re-record', () => {
    recordRecentTool('pdf', 'merge');
    recordRecentTool('image', 'resize');
    recordRecentTool('pdf', 'merge');
    const recent = getRecentTools();
    expect(recent).toHaveLength(2);
    expect(recent[0].id).toBe('merge');
    expect(recent[1].id).toBe('resize');
  });

  it('caps stored entries at 20', () => {
    for (let i = 0; i < 25; i++) recordRecentTool('text', `t${i}`);
    expect(getRecentTools(50)).toHaveLength(20);
  });

  it('respects the limit on read', () => {
    for (let i = 0; i < 6; i++) recordRecentTool('text', `t${i}`);
    expect(getRecentTools(3)).toHaveLength(3);
  });

  it('clears all entries', () => {
    recordRecentTool('pdf', 'merge');
    clearRecentTools();
    expect(getRecentTools()).toHaveLength(0);
  });
});
