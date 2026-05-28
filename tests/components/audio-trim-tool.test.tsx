import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const trimAudio = vi.fn();
const downloadBlob = vi.fn();

vi.mock('@/lib/tools/implementations/audio-trim', async () => {
  const real = await vi.importActual<typeof import('@/lib/tools/implementations/audio-trim')>(
    '@/lib/tools/implementations/audio-trim',
  );
  return {
    ...real,
    trimAudio: (...args: unknown[]) => trimAudio(...args),
  };
});
vi.mock('@/lib/file-utils', async () => {
  const real = await vi.importActual<typeof import('@/lib/file-utils')>('@/lib/file-utils');
  return { ...real, downloadBlob: (...args: unknown[]) => downloadBlob(...args) };
});
// The Waveform component dynamically decodes audio via Web Audio API which is
// not available in jsdom. Stub it to a static element so the rest of the tool
// renders normally.
vi.mock('@/components/audio-waveform', () => ({
  Waveform: () => null,
}));

import { AudioTrimTool } from '@/components/tools/audio-trim-tool';

const messages = {
  selectButton: 'Select audio',
  empty: 'Drop an audio file here.',
  trimButton: 'Trim',
  startLabel: 'Start (seconds)',
  endLabel: 'End (seconds)',
  preciseLabel: 'Precise cut',
  preciseHint: '(re-encode)',
  busy: 'Trimming…',
  error: 'Could not trim that file.',
  removeFile: 'Remove',
  clipDurationLabel: 'Clip duration: {duration}s',
  largeFileWarning: 'Large file warning.',
  timelineLabel: 'Trim range',
  startHandleLabel: 'Trim start',
  endHandleLabel: 'Trim end',
  playLabel: 'Play',
  pauseLabel: 'Pause',
  muteLabel: 'Mute',
  unmuteLabel: 'Unmute',
};

function setAudioDuration(d: number) {
  const audio = document.querySelector('audio');
  if (!audio) throw new Error('No <audio> element in the DOM');
  Object.defineProperty(audio, 'duration', { value: d, configurable: true });
  fireEvent.loadedMetadata(audio);
  return audio;
}

const mp3 = (n = 'song.mp3') => new File([new Uint8Array([0])], n, { type: 'audio/mpeg' });
const mp4 = (n = 'screen.mp4') => new File([new Uint8Array([0])], n, { type: 'video/mp4' });

beforeEach(() => {
  trimAudio.mockReset();
  downloadBlob.mockReset();
});

describe('AudioTrimTool', () => {
  it('renders empty state with disabled Trim button', () => {
    render(<AudioTrimTool {...messages} />);
    expect(screen.getByText(messages.empty)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: messages.trimButton })).toBeDisabled();
  });

  it('exposes a visual selector with start/end handles after a file is picked', async () => {
    const user = userEvent.setup();
    render(<AudioTrimTool {...messages} />);
    await user.upload(screen.getByLabelText(messages.selectButton), mp3());
    setAudioDuration(4);
    expect(screen.getByRole('slider', { name: messages.startHandleLabel })).toBeInTheDocument();
    expect(screen.getByRole('slider', { name: messages.endHandleLabel })).toBeInTheDocument();
    expect(screen.getByRole('group', { name: messages.timelineLabel })).toBeInTheDocument();
  });

  it('moves the end handle by 0.1s with ArrowLeft', async () => {
    const user = userEvent.setup();
    render(<AudioTrimTool {...messages} />);
    await user.upload(screen.getByLabelText(messages.selectButton), mp3());
    setAudioDuration(10);
    const endHandle = screen.getByRole('slider', { name: messages.endHandleLabel });
    endHandle.focus();
    await user.keyboard('{ArrowLeft}');
    expect(screen.getByLabelText(messages.endLabel)).toHaveValue(9.9);
  });

  it('accepts an mp3 file and downloads a trimmed mp3', async () => {
    const user = userEvent.setup();
    trimAudio.mockResolvedValue(new Uint8Array([1, 2, 3]));
    render(<AudioTrimTool {...messages} />);
    await user.upload(screen.getByLabelText(messages.selectButton), mp3('foo.mp3'));
    setAudioDuration(4);
    await user.click(screen.getByRole('button', { name: messages.trimButton }));
    expect(trimAudio).toHaveBeenCalledOnce();
    expect(downloadBlob.mock.calls[0]![1]).toBe('trimmed-foo.mp3');
    const blob = downloadBlob.mock.calls[0]![0] as Blob;
    expect(blob.type).toBe('audio/mpeg');
  });

  it('accepts an mp4 file (video with audio) and downloads a trimmed .m4a', async () => {
    const user = userEvent.setup();
    trimAudio.mockResolvedValue(new Uint8Array([1, 2, 3]));
    render(<AudioTrimTool {...messages} />);
    await user.upload(screen.getByLabelText(messages.selectButton), mp4('cleanshot.mp4'));
    setAudioDuration(50);
    await user.click(screen.getByRole('button', { name: messages.trimButton }));
    expect(trimAudio).toHaveBeenCalledOnce();
    expect(downloadBlob.mock.calls[0]![1]).toBe('trimmed-cleanshot.m4a');
    const blob = downloadBlob.mock.calls[0]![0] as Blob;
    expect(blob.type).toBe('audio/mp4');
  });

  it('shows generic error and console.errors the underlying ffmpeg error on failure', async () => {
    const user = userEvent.setup();
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    trimAudio.mockRejectedValue(new Error('ffmpeg exploded'));
    render(<AudioTrimTool {...messages} />);
    await user.upload(screen.getByLabelText(messages.selectButton), mp3());
    setAudioDuration(3);
    await user.click(screen.getByRole('button', { name: messages.trimButton }));
    expect(await screen.findByRole('alert')).toHaveTextContent(messages.error);
    expect(consoleSpy).toHaveBeenCalledWith('[audio-trim]', expect.any(Error));
    consoleSpy.mockRestore();
  });
});
