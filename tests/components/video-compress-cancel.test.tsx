import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { resultMessages, mediaErrorMessages } from '@/tests/helpers/tool-result-messages';

const compressVideo = vi.fn();
const terminateFfmpeg = vi.fn();

vi.mock('@/lib/tools/implementations/video-compress', async () => {
  const real = await vi.importActual<typeof import('@/lib/tools/implementations/video-compress')>(
    '@/lib/tools/implementations/video-compress',
  );
  return { ...real, compressVideo: (...args: unknown[]) => compressVideo(...args) };
});
vi.mock('@/lib/ffmpeg-loader', async () => {
  const real = await vi.importActual<typeof import('@/lib/ffmpeg-loader')>('@/lib/ffmpeg-loader');
  return { ...real, terminateFfmpeg: () => terminateFfmpeg() };
});

import { VideoCompressTool } from '@/components/tools/video-compress-tool';

const messages = {
  selectButton: 'Choose a video',
  empty: 'Drop a video here.',
  compressButton: 'Compress',
  quality: 'Quality',
  qualityHigh: 'High',
  qualityMedium: 'Medium',
  qualityLow: 'Low',
  busy: 'Compressing…',
  error: 'Could not compress that video.',
  removeFile: 'Remove',
  etaLabel: 'About {remaining} left',
  etaCalculating: 'Estimating…',
  largeFileWarning: 'Large file warning.',
  estimateLabel: '~{size} after compression',
  estimateCalculating: 'Estimating size…',
  estimateHint: 'From a 2-second sample.',
  cancelLabel: 'Cancel',
  cancelledLabel: 'Cancelled. Nothing was changed.',
};

const mp4 = (n = 'clip.mp4') => new File([new Uint8Array([0])], n, { type: 'video/mp4' });

// The real terminate() rejects every in-flight call with this error.
const TERMINATED = new Error('called FFmpeg.terminate()');

// A run that hangs until the test decides how it ends, standing in for a
// multi-minute encode.
function pendingRun() {
  let settle!: { resolve: (v: Uint8Array) => void; reject: (e: unknown) => void };
  const promise = new Promise<Uint8Array>((resolve, reject) => { settle = { resolve, reject }; });
  compressVideo.mockReturnValue(promise);
  return settle;
}

async function startRun(user: ReturnType<typeof userEvent.setup>) {
  render(<VideoCompressTool {...messages} result={resultMessages} mediaError={mediaErrorMessages} />);
  await user.upload(screen.getByLabelText(messages.selectButton), mp4());
  await user.click(screen.getByRole('button', { name: messages.compressButton }));
}

beforeEach(() => {
  compressVideo.mockReset();
  terminateFfmpeg.mockReset();
});

describe('VideoCompressTool — cancelling a run', () => {
  it('offers no way out until a run is actually under way', async () => {
    const user = userEvent.setup();
    render(<VideoCompressTool {...messages} result={resultMessages} mediaError={mediaErrorMessages} />);
    await user.upload(screen.getByLabelText(messages.selectButton), mp4());
    expect(screen.queryByRole('button', { name: messages.cancelLabel })).not.toBeInTheDocument();
  });

  it('shows Cancel while busy and terminates the worker when clicked', async () => {
    const user = userEvent.setup();
    const settle = pendingRun();
    await startRun(user);

    const cancel = await screen.findByRole('button', { name: messages.cancelLabel });
    await user.click(cancel);
    expect(terminateFfmpeg).toHaveBeenCalledOnce();

    settle.reject(TERMINATED);
    await waitFor(() =>
      expect(screen.getByRole('button', { name: messages.compressButton })).toBeEnabled(),
    );
  });

  it('reports the cancellation instead of blaming the file', async () => {
    const user = userEvent.setup();
    const settle = pendingRun();
    await startRun(user);

    await user.click(await screen.findByRole('button', { name: messages.cancelLabel }));
    settle.reject(TERMINATED);

    expect(await screen.findByText(messages.cancelledLabel)).toBeInTheDocument();
    // The rejection came from our own terminate(); showing the failure message
    // would tell the user their video is broken when it is not.
    await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument());
  });

  it('still reports a genuine failure', async () => {
    const user = userEvent.setup();
    const settle = pendingRun();
    await startRun(user);
    settle.reject(new Error('unsupported codec'));

    expect(await screen.findByRole('alert')).toHaveTextContent(messages.error);
    expect(screen.queryByText(messages.cancelledLabel)).not.toBeInTheDocument();
  });

  it('clears the cancelled notice when the next run starts', async () => {
    const user = userEvent.setup();
    const first = pendingRun();
    await startRun(user);
    await user.click(await screen.findByRole('button', { name: messages.cancelLabel }));
    first.reject(TERMINATED);
    expect(await screen.findByText(messages.cancelledLabel)).toBeInTheDocument();

    pendingRun();
    await user.click(screen.getByRole('button', { name: messages.compressButton }));
    await waitFor(() =>
      expect(screen.queryByText(messages.cancelledLabel)).not.toBeInTheDocument(),
    );
  });

  it('guards the tab against navigation only while a run is in flight', async () => {
    const user = userEvent.setup();
    const addSpy = vi.spyOn(window, 'addEventListener');
    const removeSpy = vi.spyOn(window, 'removeEventListener');
    const settle = pendingRun();
    await startRun(user);

    await waitFor(() =>
      expect(addSpy.mock.calls.some(([type]) => type === 'beforeunload')).toBe(true),
    );

    settle.resolve(new Uint8Array([1, 2, 3]));
    await waitFor(() =>
      expect(removeSpy.mock.calls.some(([type]) => type === 'beforeunload')).toBe(true),
    );

    addSpy.mockRestore();
    removeSpy.mockRestore();
  });
});

describe('VideoCompressTool — telling the user why it failed', () => {
  it('names the real cause when the browser ran out of memory', async () => {
    const user = userEvent.setup();
    const settle = pendingRun();
    await startRun(user);
    settle.reject(new Error('Aborted(OOM)'));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(mediaErrorMessages.memory);
    // The generic "could not compress" would have sent them looking at the file.
    expect(alert).not.toHaveTextContent(messages.error);
  });

  it('says to reload when the page lost cross-origin isolation', async () => {
    const user = userEvent.setup();
    const settle = pendingRun();
    await startRun(user);
    settle.reject(new Error('ffmpeg multi-thread requires cross-origin isolation.'));

    expect(await screen.findByRole('alert')).toHaveTextContent(mediaErrorMessages.isolation);
  });

  it("keeps the tool's own wording when the cause is not identifiable", async () => {
    const user = userEvent.setup();
    const settle = pendingRun();
    await startRun(user);
    settle.reject(new Error('Invalid data found when processing input'));

    expect(await screen.findByRole('alert')).toHaveTextContent(messages.error);
  });
});
