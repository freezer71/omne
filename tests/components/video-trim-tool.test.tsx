import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const trimVideo = vi.fn();
const downloadBlob = vi.fn();

vi.mock('@/lib/tools/implementations/video-trim', () => ({
  trimVideo: (...args: unknown[]) => trimVideo(...args),
}));
vi.mock('@/lib/file-utils', async () => {
  const real = await vi.importActual<typeof import('@/lib/file-utils')>('@/lib/file-utils');
  return { ...real, downloadBlob: (...args: unknown[]) => downloadBlob(...args) };
});

import { VideoTrimTool } from '@/components/tools/video-trim-tool';

const messages = {
  selectButton: 'Select a video',
  empty: 'Drop a video here.',
  trimButton: 'Trim',
  startLabel: 'Start (seconds)',
  endLabel: 'End (seconds)',
  clipDurationLabel: 'Clip duration: {duration}s',
  busy: 'Trimming…',
  error: 'Could not trim.',
  removeFile: 'Remove',
};

const mp4 = (n = 'clip.mp4') => new File([new Uint8Array([0])], n, { type: 'video/mp4' });

beforeEach(() => {
  trimVideo.mockReset();
  downloadBlob.mockReset();
});

describe('VideoTrimTool', () => {
  it('renders empty state with disabled Trim', () => {
    render(<VideoTrimTool {...messages} />);
    expect(screen.getByText(messages.empty)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: messages.trimButton })).toBeDisabled();
  });

  it('enables Trim when file selected and end > start', async () => {
    const user = userEvent.setup();
    render(<VideoTrimTool {...messages} />);
    await user.upload(screen.getByLabelText(messages.selectButton), mp4());
    await user.clear(screen.getByLabelText(messages.startLabel));
    await user.type(screen.getByLabelText(messages.startLabel), '0');
    await user.clear(screen.getByLabelText(messages.endLabel));
    await user.type(screen.getByLabelText(messages.endLabel), '2');
    expect(screen.getByRole('button', { name: messages.trimButton })).toBeEnabled();
  });

  it('calls trimVideo with start and end seconds, downloads output', async () => {
    const user = userEvent.setup();
    trimVideo.mockResolvedValue(new Uint8Array([0]));
    render(<VideoTrimTool {...messages} />);
    await user.upload(screen.getByLabelText(messages.selectButton), mp4('movie.mp4'));
    await user.clear(screen.getByLabelText(messages.startLabel));
    await user.type(screen.getByLabelText(messages.startLabel), '1');
    await user.clear(screen.getByLabelText(messages.endLabel));
    await user.type(screen.getByLabelText(messages.endLabel), '3');
    await user.click(screen.getByRole('button', { name: messages.trimButton }));
    expect(trimVideo).toHaveBeenCalledOnce();
    const opts = trimVideo.mock.calls[0]![1] as { startSec: number; endSec: number };
    expect(opts.startSec).toBe(1);
    expect(opts.endSec).toBe(3);
    expect(downloadBlob.mock.calls[0]![1]).toBe('trimmed-movie.mp4');
  });

  it('shows error on failure', async () => {
    const user = userEvent.setup();
    trimVideo.mockRejectedValue(new Error('boom'));
    render(<VideoTrimTool {...messages} />);
    await user.upload(screen.getByLabelText(messages.selectButton), mp4());
    await user.clear(screen.getByLabelText(messages.startLabel));
    await user.type(screen.getByLabelText(messages.startLabel), '0');
    await user.clear(screen.getByLabelText(messages.endLabel));
    await user.type(screen.getByLabelText(messages.endLabel), '2');
    await user.click(screen.getByRole('button', { name: messages.trimButton }));
    expect(await screen.findByRole('alert')).toHaveTextContent(messages.error);
  });
});
