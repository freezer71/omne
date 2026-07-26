import { describe, it, expect } from 'vitest';
import { classifyMediaError, mediaErrorMessage } from '@/lib/media-errors';

const messages = { memory: 'Too big for this browser.', isolation: 'Reload the page.' };

describe('classifyMediaError', () => {
  it('recognises the isolation failure our own loader throws', () => {
    expect(
      classifyMediaError(
        new Error(
          'ffmpeg multi-thread requires cross-origin isolation. Check that COOP/COEP response headers are served.',
        ),
      ),
    ).toBe('isolation');
  });

  it('recognises a missing SharedArrayBuffer as the same cause', () => {
    expect(classifyMediaError(new Error('SharedArrayBuffer is not defined'))).toBe('isolation');
  });

  it('recognises the several shapes heap exhaustion takes', () => {
    for (const message of [
      'Aborted(OOM)',
      'out of memory',
      'memory access out of bounds',
      'Array buffer allocation failed',
    ]) {
      expect(classifyMediaError(new Error(message))).toBe('memory');
    }
  });

  it('treats a RangeError as heap exhaustion, since that is what it means here', () => {
    expect(classifyMediaError(new RangeError('Invalid typed array length'))).toBe('memory');
  });

  it('does not guess at anything else', () => {
    expect(classifyMediaError(new Error('Invalid data found when processing input'))).toBe('unknown');
    expect(classifyMediaError(new Error('Video compression failed: exit 1'))).toBe('unknown');
    expect(classifyMediaError('some string')).toBe('unknown');
    expect(classifyMediaError(undefined)).toBe('unknown');
  });

  it('does not fire on words that merely contain a marker', () => {
    // "oom" inside "boom" used to be read as an out-of-memory, which would send
    // the user off to shorten a file that was never the problem.
    for (const message of ['boom', 'zoom level unsupported', 'no room on the device']) {
      expect(classifyMediaError(new Error(message))).toBe('unknown');
    }
  });

  it('reads the error name as well as the message', () => {
    const err = new Error('something');
    err.name = 'RangeError';
    expect(classifyMediaError(err)).toBe('unknown');
  });
});

describe('mediaErrorMessage', () => {
  it('routes each identified cause to its own wording', () => {
    expect(
      mediaErrorMessage(new Error('requires cross-origin isolation'), 'generic', messages),
    ).toBe(messages.isolation);
    expect(mediaErrorMessage(new Error('Aborted(OOM)'), 'generic', messages)).toBe(messages.memory);
  });

  it("keeps the tool's own wording when the cause is not identifiable", () => {
    expect(mediaErrorMessage(new Error('who knows'), 'Could not crop that video.', messages)).toBe(
      'Could not crop that video.',
    );
  });
});
